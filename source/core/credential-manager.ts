/**
 * Credential Manager for secure API key storage and management
 */

import { createCipheriv, createDecipheriv, scrypt, randomBytes, timingSafeEqual, createHash } from 'crypto';
import { promisify } from 'util';
import { readFile, writeFile, mkdir, access, stat } from 'fs/promises';
import { dirname, join } from 'path';
import { EventEmitter } from 'events';
import type {
  CredentialConfig,
  CredentialEncryptionConfig,
  CredentialRotationConfig,
  APIProviderConfig,
  CustomProviderConfig,
  ConfigPaths
} from './configuration-types.js';
import { BadDecryptError, DataAuthenticationError, InvalidPasswordError } from './errors.js';

const scryptAsync = promisify(scrypt);

/**
 * Encrypted credential data structure
 */
interface EncryptedCredential {
  /** Encrypted data */
  data: string;
  /** Salt for key derivation */
  salt: string;
  /** Initialization vector */
  iv: string;
  /** Authentication tag */
  authTag: string;
  /** Key ID for validation */
  keyId: string;
  /** Timestamp when encrypted */
  timestamp: number;
  /** Encryption algorithm used */
  algorithm: string;
}

/**
 * Credential storage structure
 */
interface CredentialStorage {
  /** Version of the storage format */
  version: string;
  /** Encryption configuration used */
  encryptionConfig: CredentialEncryptionConfig;
  /** Encrypted credentials by provider */
  credentials: Record<string, EncryptedCredential>;
  /** Metadata */
  metadata: {
    created: number;
    updated: number;
    rotationHistory?: Array<{
      timestamp: number;
      provider: string;
      action: 'rotated' | 'backup' | 'restored';
    }>;
  };
}

/**
 * Events emitted by the CredentialManager
 */
export interface CredentialManagerEvents {
  credentialEncrypted: (provider: string, keyId: string) => void;
  credentialDecrypted: (provider: string, keyId: string) => void;
  credentialRotated: (provider: string, oldKeyId: string, newKeyId: string) => void;
  credentialError: (provider: string, error: Error) => void;
  storageCreated: (filePath: string) => void;
  storageUpdated: (filePath: string) => void;
  backupCreated: (provider: string, backupPath: string) => void;
  rotationScheduled: (provider: string, nextRotation: Date) => void;
}

/**
 * Credential manager for secure API key storage
 */
export class CredentialManager extends EventEmitter {
  private masterKey?: Buffer;
  private config: CredentialConfig;
  private configPaths: ConfigPaths;
  private rotationTimers = new Map<string, NodeJS.Timeout>();
  private credentialCache = new Map<string, { credential: string; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_VERSION = '1.0.0';

  constructor(config: CredentialConfig, configPaths: ConfigPaths) {
    super();
    this.config = config;
    this.configPaths = configPaths;
  }

  /**
   * Initialize the credential manager with a master key
   */
  async initialize(masterPassword: string): Promise<void> {
    try {
      // Derive master key from password
      this.masterKey = await this.deriveMasterKey(masterPassword);
      
      // Ensure credentials directory exists
      await this.ensureCredentialsDirectory();
      
      // Setup credential rotation if enabled
      if (this.config.rotation.enabled) {
        await this.setupCredentialRotation();
      }
      
      this.emit('storageCreated', this.configPaths.credentialsDir);
    } catch (error) {
      this.emit('credentialError', 'system', error as Error);
      throw new Error(`Failed to initialize credential manager: ${(error as Error).message}`);
    }
  }

  /**
   * Store an encrypted credential
   */
  async storeCredential(provider: string, credential: string, keyId?: string): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Credential manager not initialized');
    }

    try {
      const finalKeyId = keyId || this.generateKeyId(provider);
      const encrypted = await this.encryptCredential(credential, finalKeyId);
      
      // Load existing storage
      const storage = await this.loadCredentialStorage();
      
      // Store the encrypted credential
      storage.credentials[provider] = encrypted;
      storage.metadata.updated = Date.now();
      
      // Save updated storage
      await this.saveCredentialStorage(storage);
      
      // Update cache
      this.credentialCache.set(provider, {
        credential,
        timestamp: Date.now()
      });
      
      this.emit('credentialEncrypted', provider, finalKeyId);
    } catch (error) {
      this.emit('credentialError', provider, error as Error);
      throw new Error(`Failed to store credential for ${provider}: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve and decrypt a credential
   */
  async getCredential(provider: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Credential manager not initialized');
    }

    // Check cache first
    const cached = this.credentialCache.get(provider);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.credential;
    }

    try {
      const storage = await this.loadCredentialStorage();
      const encrypted = storage.credentials[provider];
      
      if (!encrypted) {
        throw new Error(`No credential found for provider: ${provider}`);
      }

      const credential = await this.decryptCredential(encrypted);
      
      // Update cache
      this.credentialCache.set(provider, {
        credential,
        timestamp: Date.now()
      });
      
      this.emit('credentialDecrypted', provider, encrypted.keyId);
      return credential;
    } catch (error) {
      this.emit('credentialError', provider, error as Error);
      throw new Error(`Failed to retrieve credential for ${provider}: ${(error as Error).message}`);
    }
  }

  /**
   * List all stored credential providers
   */
  async listProviders(): Promise<string[]> {
    try {
      const storage = await this.loadCredentialStorage();
      return Object.keys(storage.credentials);
    } catch (error) {
      // If storage doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Remove a credential
   */
  async removeCredential(provider: string): Promise<boolean> {
    try {
      const storage = await this.loadCredentialStorage();
      
      if (!storage.credentials[provider]) {
        return false;
      }

      delete storage.credentials[provider];
      storage.metadata.updated = Date.now();
      
      await this.saveCredentialStorage(storage);
      
      // Remove from cache
      this.credentialCache.delete(provider);
      
      // Cancel rotation timer if exists
      const timer = this.rotationTimers.get(provider);
      if (timer) {
        clearTimeout(timer);
        this.rotationTimers.delete(provider);
      }
      
      return true;
    } catch (error) {
      this.emit('credentialError', provider, error as Error);
      throw new Error(`Failed to remove credential for ${provider}: ${(error as Error).message}`);
    }
  }

  /**
   * Rotate a credential (generate new key, backup old one)
   */
  async rotateCredential(provider: string, newCredential: string): Promise<void> {
    if (!this.config.rotation.enabled) {
      throw new Error('Credential rotation is not enabled');
    }

    try {
      // Get current credential for backup
      const currentCredential = await this.getCredential(provider);
      
      // Create backup
      await this.createCredentialBackup(provider, currentCredential);
      
      // Store new credential
      const newKeyId = this.generateKeyId(provider);
      await this.storeCredential(provider, newCredential, newKeyId);
      
      // Update rotation history
      const storage = await this.loadCredentialStorage();
      if (!storage.metadata.rotationHistory) {
        storage.metadata.rotationHistory = [];
      }
      
      storage.metadata.rotationHistory.push({
        timestamp: Date.now(),
        provider,
        action: 'rotated'
      });
      
      await this.saveCredentialStorage(storage);
      
      this.emit('credentialRotated', provider, 'old-key', newKeyId);
    } catch (error) {
      this.emit('credentialError', provider, error as Error);
      throw new Error(`Failed to rotate credential for ${provider}: ${(error as Error).message}`);
    }
  }

  /**
   * Get credential statistics and health information
   */
  async getCredentialStats(): Promise<{
    totalProviders: number;
    encryptionAlgorithm: string;
    lastUpdated: Date;
    rotationEnabled: boolean;
    cacheHitRate: number;
    upcomingRotations: Array<{ provider: string; nextRotation: Date }>;
  }> {
    try {
      const storage = await this.loadCredentialStorage();
      const providers = Object.keys(storage.credentials);
      
      // Calculate cache hit rate (simplified)
      const cacheHits = this.credentialCache.size;
      const totalProviders = providers.length;
      const cacheHitRate = totalProviders > 0 ? cacheHits / totalProviders : 0;
      
      // Get upcoming rotations
      const upcomingRotations: Array<{ provider: string; nextRotation: Date }> = [];
      if (this.config.rotation.enabled) {
        for (const provider of providers) {
          const nextRotation = new Date(Date.now() + this.config.rotation.interval * 60 * 60 * 1000);
          upcomingRotations.push({ provider, nextRotation });
        }
      }
      
      return {
        totalProviders,
        encryptionAlgorithm: this.config.encryption.algorithm,
        lastUpdated: new Date(storage.metadata.updated),
        rotationEnabled: this.config.rotation.enabled,
        cacheHitRate,
        upcomingRotations
      };
    } catch (error) {
      throw new Error(`Failed to get credential stats: ${(error as Error).message}`);
    }
  }

  /**
   * Update credential configuration
   */
  updateConfig(newConfig: Partial<CredentialConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart rotation if configuration changed
    if (newConfig.rotation && this.config.rotation.enabled) {
      this.setupCredentialRotation();
    }
  }

  /**
   * Clear credential cache
   */
  clearCache(): void {
    this.credentialCache.clear();
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    // Clear master key
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = undefined;
    }
    
    // Clear cache
    this.clearCache();
    
    // Clear rotation timers
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }
    this.rotationTimers.clear();
    
    // Remove all listeners
    this.removeAllListeners();
  }

  /**
   * Encrypt a credential using the master key
   */
  private async encryptCredential(plaintext: string, keyId: string): Promise<EncryptedCredential> {
    if (!this.masterKey) {
      throw new Error('Master key not available');
    }

    const salt = randomBytes(16);
    const key = await scryptAsync(this.masterKey, salt, 32) as Buffer;
    
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(keyId));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      data: encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      keyId,
      timestamp: Date.now(),
      algorithm: this.config.encryption.algorithm
    };
  }

  /**
   * Decrypt a credential using the master key
   */
  private async decryptCredential(encrypted: EncryptedCredential): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not available');
    }

    try {
      const salt = Buffer.from(encrypted.salt, 'hex');
      const iv = Buffer.from(encrypted.iv, 'hex');
      const authTag = Buffer.from(encrypted.authTag, 'hex');
      
      const key = await scryptAsync(this.masterKey, salt, 32) as Buffer;
      
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAAD(Buffer.from(encrypted.keyId));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      // Check if this is a decryption/authentication error (wrong password)
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Unsupported state or unable to authenticate data') ||
          errorMessage.includes('Invalid authentication tag')) {
        throw new DataAuthenticationError('Unable to authenticate data - invalid master password or corrupted data');
      } else if (errorMessage.includes('bad decrypt')) {
        throw new BadDecryptError('Failed to decrypt credential - invalid master password');
      }
      
      // Re-throw other errors as-is
      throw error;
    }
  }

  /**
   * Derive master key from password
   */
  private async deriveMasterKey(password: string): Promise<Buffer> {
    const salt = Buffer.from('ai-code-platform-salt'); // In production, use a unique salt per installation
    const iterations = this.config.encryption.iterations;
    
    if (this.config.encryption.keyDerivation === 'scrypt') {
      return await scryptAsync(password, salt, 32) as Buffer;
    } else {
      // PBKDF2 implementation would go here
      throw new Error('PBKDF2 key derivation not implemented');
    }
  }

  /**
   * Generate a unique key ID for a provider
   */
  private generateKeyId(provider: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${provider}_${timestamp}_${random}`;
  }

  /**
   * Ensure the credentials directory exists
   */
  private async ensureCredentialsDirectory(): Promise<void> {
    try {
      await access(this.configPaths.credentialsDir);
    } catch {
      await mkdir(this.configPaths.credentialsDir, { recursive: true });
    }
  }

  /**
   * Load credential storage from disk
   */
  private async loadCredentialStorage(): Promise<CredentialStorage> {
    try {
      const filePath = this.configPaths.apiKeysFile;
      const data = await readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, return default storage
      return {
        version: this.STORAGE_VERSION,
        encryptionConfig: this.config.encryption,
        credentials: {},
        metadata: {
          created: Date.now(),
          updated: Date.now()
        }
      };
    }
  }

  /**
   * Save credential storage to disk
   */
  private async saveCredentialStorage(storage: CredentialStorage): Promise<void> {
    const filePath = this.configPaths.apiKeysFile;
    await writeFile(filePath, JSON.stringify(storage, null, 2), 'utf8');
    this.emit('storageUpdated', filePath);
  }

  /**
   * Create a backup of a credential
   */
  private async createCredentialBackup(provider: string, credential: string): Promise<void> {
    const backupDir = join(this.configPaths.credentialsDir, 'backups');
    
    try {
      await access(backupDir);
    } catch {
      await mkdir(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `${provider}_${timestamp}.backup`);
    
    // Encrypt the backup
    const keyId = this.generateKeyId(`${provider}_backup`);
    const encrypted = await this.encryptCredential(credential, keyId);
    
    await writeFile(backupPath, JSON.stringify(encrypted, null, 2), 'utf8');
    
    this.emit('backupCreated', provider, backupPath);
    
    // Clean up old backups
    await this.cleanupOldBackups(provider, backupDir);
  }

  /**
   * Clean up old credential backups
   */
  private async cleanupOldBackups(provider: string, backupDir: string): Promise<void> {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(backupDir);
      
      const backupFiles = files
        .filter(file => file.startsWith(`${provider}_`) && file.endsWith('.backup'))
        .map(async file => {
          const filePath = join(backupDir, file);
          const stats = await stat(filePath);
          return { file, path: filePath, mtime: stats.mtime };
        });
      
      const resolvedFiles = await Promise.all(backupFiles);
      
      // Sort by modification time (newest first)
      resolvedFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      // Remove excess backups
      const toDelete = resolvedFiles.slice(this.config.rotation.backupCount);
      for (const { path } of toDelete) {
        const { unlink } = await import('fs/promises');
        await unlink(path);
      }
    } catch (error) {
      // Ignore cleanup errors
      console.warn(`Failed to cleanup old backups for ${provider}:`, error);
    }
  }

  /**
   * Setup automatic credential rotation
   */
  private async setupCredentialRotation(): Promise<void> {
    if (!this.config.rotation.enabled) {
      return;
    }

    const providers = await this.listProviders();
    
    for (const provider of providers) {
      const intervalMs = this.config.rotation.interval * 60 * 60 * 1000; // Convert hours to ms
      
      const timer = setTimeout(async () => {
        try {
          // This would typically integrate with external credential rotation systems
          this.emit('rotationScheduled', provider, new Date(Date.now() + intervalMs));
        } catch (error) {
          this.emit('credentialError', provider, error as Error);
        }
      }, intervalMs);
      
      this.rotationTimers.set(provider, timer);
    }
  }
}

/**
 * Create a new credential manager with default configuration
 */
export function createCredentialManager(
  config: CredentialConfig,
  configPaths: ConfigPaths
): CredentialManager {
  return new CredentialManager(config, configPaths);
}
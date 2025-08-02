import fs from 'fs';
import path from 'path';
import os from 'os';
import { ApiKeyStorage } from './types';

export class FileApiKeyStorage implements ApiKeyStorage {
  private filePath: string;
  private apiKeys: Map<string, string> = new Map();

  constructor(fileName: string = '.api-keys.json') {
    // Store in user's home directory
    this.filePath = path.join(os.homedir(), fileName);
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(data);
        Object.entries(parsed).forEach(([key, value]) => {
          if (typeof value === 'string') {
            this.apiKeys.set(key, value);
          }
        });
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  }

  private saveToFile(): void {
    try {
      const data: Record<string, string> = {};
      this.apiKeys.forEach((value, key) => {
        data[key] = value;
      });
      
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving API keys:', error);
    }
  }

  getApiKey(providerId: string): string | undefined {
    return this.apiKeys.get(providerId);
  }

  setApiKey(providerId: string, apiKey: string): void {
    this.apiKeys.set(providerId, apiKey);
    this.saveToFile();
  }

  removeApiKey(providerId: string): void {
    this.apiKeys.delete(providerId);
    this.saveToFile();
  }
}

// Export a singleton instance
export const fileApiKeyStorage = new FileApiKeyStorage();
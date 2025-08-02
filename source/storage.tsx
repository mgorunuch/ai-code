// Simple in-memory storage for API keys
// In a real app, you'd want to persist this to a file or secure storage

import { ApiKeyStorage } from './types';

class InMemoryApiKeyStorage implements ApiKeyStorage {
  private apiKeys: Map<string, string> = new Map();

  getApiKey(providerId: string): string | undefined {
    return this.apiKeys.get(providerId);
  }

  setApiKey(providerId: string, apiKey: string): void {
    this.apiKeys.set(providerId, apiKey);
  }

  removeApiKey(providerId: string): void {
    this.apiKeys.delete(providerId);
  }

  // Helper method to get all stored keys (useful for debugging)
  getAllKeys(): Record<string, string> {
    const result: Record<string, string> = {};
    this.apiKeys.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}

// Export a singleton instance
export const apiKeyStorage = new InMemoryApiKeyStorage();
// Types for the settings menu
export interface Provider {
  id: string;
  name: string;
  apiKey?: string;
}

export interface ApiKeyStorage {
  getApiKey: (providerId: string) => string | undefined;
  setApiKey: (providerId: string, apiKey: string) => void;
  removeApiKey: (providerId: string) => void;
}
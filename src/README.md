# API Key Settings Menu

This implementation provides a simple settings menu for managing provider API keys. All components follow a flat file structure in the `src/` directory.

## Components

### Core Components

1. **Settings.tsx** - Main settings component for CLI (Ink)
2. **ProviderList.tsx** - Displays list of providers with navigation
3. **ApiKeyInput.tsx** - Input component for entering API keys
4. **WebSettings.tsx** - Standalone React component for web applications

### Supporting Files

- **types.tsx** - TypeScript interfaces and types
- **storage.tsx** - In-memory storage implementation
- **fileStorage.tsx** - File-based persistent storage
- **App.tsx** - Demo CLI application
- **demo.tsx** - CLI entry point

## Usage

### CLI Version (Ink)

```tsx
import { Settings } from './Settings';

// Use in your Ink app
<Settings onExit={() => console.log('Exited settings')} />
```

### Web Version (React)

```tsx
import { WebSettings } from './WebSettings';

// Use in your React app
<WebSettings />
```

## Features

- Navigate providers with arrow keys (CLI) or click (web)
- Secure API key input with show/hide functionality
- Save or cancel key entry
- Visual feedback for configured providers
- Keyboard shortcuts (CLI):
  - `Enter` - Select/Save
  - `Escape` - Cancel/Exit
  - `Ctrl+S` - Toggle show/hide key (CLI)

## Storage Options

1. **In-Memory Storage** (`storage.tsx`) - Data lost on restart
2. **File Storage** (`fileStorage.tsx`) - Persists to JSON file
3. **Web Storage** - Uses localStorage (in WebSettings.tsx)

## Customization

To add more providers, update the providers array in Settings.tsx:

```tsx
const [providers, setProviders] = useState<Provider[]>([
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'custom', name: 'Custom Provider' }
]);
```
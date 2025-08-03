#!/usr/bin/env node

/**
 * Test script to verify API key persistence
 * This script tests the credential storage and retrieval functionality
 */

import { CoreOrchestrator } from './dist/core/orchestrator.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rmSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testCredentialPersistence() {
  console.log('🧪 Testing API Key Persistence System...\n');

  // Clean up any existing .ai-code directory for clean test
  const testConfigDir = join(__dirname, '.ai-code');
  if (existsSync(testConfigDir)) {
    console.log('🧹 Cleaning up existing test configuration...');
    rmSync(testConfigDir, { recursive: true, force: true });
  }

  const testPassword = 'test-password-123';
  const testApiKey = 'test-api-key-abc123';
  
  try {
    // Step 1: Create orchestrator and initialize credentials
    console.log('1️⃣  Creating orchestrator instance...');
    const orchestrator = new CoreOrchestrator({
      agents: [],
      defaultPermissions: { requireExplicitToolGrants: false },
      logging: { level: 'info', logCommunications: false }
    });

    // Step 2: Initialize credentials with master password
    console.log('2️⃣  Initializing credential system with master password...');
    await orchestrator.initializeCredentialsForSettings(testPassword);
    console.log('✅ Credential system initialized successfully!');

    // Step 3: Store a test API key
    console.log('3️⃣  Storing test API key for OpenAI provider...');
    await orchestrator.storeCredential('openai', testApiKey);
    console.log('✅ API key stored successfully!');

    // Step 4: Retrieve the API key
    console.log('4️⃣  Retrieving stored API key...');
    const retrievedKey = await orchestrator.getCredential('openai');
    console.log(`✅ API key retrieved: ${retrievedKey.substring(0, 8)}...`);

    // Step 5: Verify the key matches
    if (retrievedKey === testApiKey) {
      console.log('✅ API key matches original value!');
    } else {
      throw new Error('API key does not match original value');
    }

    // Step 6: Destroy the first orchestrator instance
    console.log('5️⃣  Destroying orchestrator instance (simulating app restart)...');
    await orchestrator.destroy();

    // Step 7: Create a new orchestrator instance (simulating restart)
    console.log('6️⃣  Creating new orchestrator instance (simulating restart)...');
    const newOrchestrator = new CoreOrchestrator({
      agents: [],
      defaultPermissions: { requireExplicitToolGrants: false },
      logging: { level: 'info', logCommunications: false }
    });

    // Step 8: Initialize with the same master password
    console.log('7️⃣  Re-initializing credential system with same password...');
    await newOrchestrator.initializeCredentialsForSettings(testPassword);

    // Step 9: Try to retrieve the API key again
    console.log('8️⃣  Retrieving API key after restart...');
    const persistedKey = await newOrchestrator.getCredential('openai');
    console.log(`✅ Persisted API key retrieved: ${persistedKey.substring(0, 8)}...`);

    // Step 10: Verify persistence
    if (persistedKey === testApiKey) {
      console.log('🎉 SUCCESS: API key persisted correctly after restart!');
    } else {
      throw new Error('API key was not persisted correctly');
    }

    // Cleanup
    await newOrchestrator.destroy();
    
    console.log('\n🎯 Test Summary:');
    console.log('✅ Credential system initialization: PASSED');
    console.log('✅ API key storage: PASSED');
    console.log('✅ API key retrieval: PASSED');
    console.log('✅ API key persistence after restart: PASSED');
    console.log('\n🔒 The API key persistence system is working correctly!');
    
    // Verify files were created
    const credentialsFile = join(testConfigDir, 'credentials', 'api-keys.enc');
    if (existsSync(credentialsFile)) {
      console.log(`📁 Encrypted credentials file created: ${credentialsFile}`);
    } else {
      console.warn('⚠️  Warning: Credentials file not found where expected');
    }

  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testCredentialPersistence().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
/**
 * Custom error classes for the AI Code Platform
 */

/**
 * Base class for all authentication-related errors
 */
export class AuthenticationError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error thrown when master password is invalid
 */
export class InvalidPasswordError extends AuthenticationError {
  constructor(message = 'Invalid master password') {
    super(message, 'INVALID_PASSWORD');
    this.name = 'InvalidPasswordError';
    Object.setPrototypeOf(this, InvalidPasswordError.prototype);
  }
}

/**
 * Error thrown when decryption fails due to bad credentials
 */
export class BadDecryptError extends AuthenticationError {
  constructor(message = 'Failed to decrypt: bad decrypt or corrupted data') {
    super(message, 'BAD_DECRYPT');
    this.name = 'BadDecryptError';
    Object.setPrototypeOf(this, BadDecryptError.prototype);
  }
}

/**
 * Error thrown when credential verification fails
 */
export class VerificationError extends AuthenticationError {
  constructor(message = 'Credential verification failed') {
    super(message, 'VERIFICATION_FAILED');
    this.name = 'VerificationError';
    Object.setPrototypeOf(this, VerificationError.prototype);
  }
}

/**
 * Error thrown when password setup fails
 */
export class SetupError extends AuthenticationError {
  constructor(message = 'Password setup failed') {
    super(message, 'SETUP_FAILED');
    this.name = 'SetupError';
    Object.setPrototypeOf(this, SetupError.prototype);
  }
}

/**
 * Error thrown when data authentication fails
 */
export class DataAuthenticationError extends AuthenticationError {
  constructor(message = 'Unable to authenticate data') {
    super(message, 'DATA_AUTH_FAILED');
    this.name = 'DataAuthenticationError';
    Object.setPrototypeOf(this, DataAuthenticationError.prototype);
  }
}

/**
 * Type guard to check if an error is an authentication error
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard to check if an error is password-related
 */
export function isPasswordError(error: unknown): boolean {
  return error instanceof InvalidPasswordError ||
         error instanceof BadDecryptError ||
         error instanceof VerificationError ||
         error instanceof SetupError ||
         error instanceof DataAuthenticationError;
}

/**
 * Safely extracts error message from any error type
 */
export function getMessageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unknown error occurred';
}
// Secrets manager using keytar for OS keychain
// Falls back to in-memory storage if keytar is unavailable

let keytar: typeof import('keytar') | null = null;
let memorySecret: string | null = null;
let keytarAvailable = false;
let keytarInitialized = false;

const SERVICE_NAME = 'gtm-ops-console';
const ACCOUNT_NAME = 'webhook-secret';

// Initialize keytar on first use
async function initializeKeytar() {
  if (keytarInitialized) return;
  keytarInitialized = true;

  try {
    const keytarModule = await import('keytar') as any;
    keytar = keytarModule.default || keytarModule;
    keytarAvailable = true;
    console.log('✓ Keytar available - secrets will be stored in OS keychain');
  } catch (error) {
    console.warn('⚠ Keytar not available - secrets will be stored in memory only (session-only)');
    keytarAvailable = false;
  }
}

export async function storeSecret(secret: string): Promise<{ success: boolean; keytarAvailable: boolean }> {
  await initializeKeytar();

  if (keytarAvailable && keytar) {
    try {
      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, secret);
      return { success: true, keytarAvailable: true };
    } catch (error) {
      console.error('Failed to store secret in keychain:', error);
      // Fall back to memory
      memorySecret = secret;
      return { success: true, keytarAvailable: false };
    }
  } else {
    // Store in memory only
    memorySecret = secret;
    return { success: true, keytarAvailable: false };
  }
}

export async function getSecret(): Promise<{ secret: string | null; keytarAvailable: boolean }> {
  await initializeKeytar();

  if (keytarAvailable && keytar) {
    try {
      const secret = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      return { secret, keytarAvailable: true };
    } catch (error) {
      console.error('Failed to retrieve secret from keychain:', error);
      return { secret: memorySecret, keytarAvailable: false };
    }
  } else {
    return { secret: memorySecret, keytarAvailable: false };
  }
}

export async function clearSecret(): Promise<void> {
  await initializeKeytar();

  if (keytarAvailable && keytar) {
    try {
      await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (error) {
      console.error('Failed to clear secret from keychain:', error);
    }
  }
  memorySecret = null;
}

export function isKeytarAvailable(): boolean {
  return keytarAvailable;
}

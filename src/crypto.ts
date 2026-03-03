// Crypto utilities — Web Crypto API only (cross-platform: desktop + iOS)

const PBKDF2_ITERATIONS = 100_000;
const SALT = new TextEncoder().encode('vault-sync-salt-v1');

/**
 * Derive AES-256-GCM key from a user-provided code string via PBKDF2.
 */
export async function deriveKey(code: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * AES-256-GCM encrypt. Returns IV (12 bytes) prepended to ciphertext.
 */
export async function encrypt(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );

  // Prepend IV so the receiver can decrypt
  const result = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.byteLength);
  return result.buffer;
}

/**
 * AES-256-GCM decrypt. Expects IV (12 bytes) prepended to ciphertext.
 */
export async function decrypt(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(data);
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
}

/**
 * Compute SHA-256 hash of an ArrayBuffer, return hex string.
 */
export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Generate a random 6-digit numeric code string (e.g. "382104"). */
export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return n.toString().padStart(6, '0');
}

/** Generate a random 32-byte hex token for session auth. */
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

import { mnemonicToEntropy, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export interface NewRecoveryKey {
  code: string;
  key: CryptoKey;
}

export async function createRecoveryKey(): Promise<NewRecoveryKey> {
  const entropy = crypto.getRandomValues(new Uint8Array(32));
  const code = Array.from(entropy, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(entropy), 'AES-GCM', false, ['encrypt', 'decrypt']);
  entropy.fill(0);
  return { code, key };
}

export async function importRecoveryKey(codeInput: string): Promise<CryptoKey> {
  const input = codeInput.trim();
  const compactCode = input.replace(/\s+/gu, '').toLowerCase();
  let entropy: Uint8Array;

  if (/^[0-9a-f]{64}$/u.test(compactCode)) {
    entropy = Uint8Array.from({ length: 32 }, (_, index) =>
      Number.parseInt(compactCode.slice(index * 2, index * 2 + 2), 16),
    );
  } else {
    // Keep already-issued 24-word keys valid so existing archives remain unlockable.
    const legacyPhrase = input.toLowerCase().replace(/\s+/gu, ' ');
    if (!validateMnemonic(legacyPhrase, wordlist)) {
      throw new Error('Enter the 64-character recovery code. Existing 24-word recovery phrases also work.');
    }
    entropy = mnemonicToEntropy(legacyPhrase, wordlist);
  }
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(entropy), 'AES-GCM', false, ['encrypt', 'decrypt']);
  entropy.fill(0);
  return key;
}

export async function encryptSyncEnvelope(
  key: CryptoKey,
  envelope: unknown,
  associatedData: string,
): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(envelope));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce), additionalData: new TextEncoder().encode(associatedData) },
    key,
    toArrayBuffer(plaintext),
  );
  return `v1.${bytesToBase64Url(nonce)}.${bytesToBase64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptSyncEnvelope<T>(
  key: CryptoKey,
  encrypted: string,
  associatedData: string,
): Promise<T> {
  const [version, noncePart, ciphertextPart, extra] = encrypted.split('.');
  if (version !== 'v1' || !noncePart || !ciphertextPart || extra !== undefined) {
    throw new Error('This encrypted LOREKEEP record uses an unsupported format.');
  }
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(base64UrlToBytes(noncePart)),
      additionalData: new TextEncoder().encode(associatedData),
    },
    key,
    toArrayBuffer(base64UrlToBytes(ciphertextPart)),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

export async function fingerprint(value: unknown): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return bytesToBase64Url(new Uint8Array(hash));
}

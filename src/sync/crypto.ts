import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from '@scure/bip39';
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
  phrase: string;
  key: CryptoKey;
}

export async function createRecoveryKey(): Promise<NewRecoveryKey> {
  const entropy = crypto.getRandomValues(new Uint8Array(32));
  const phrase = entropyToMnemonic(entropy, wordlist);
  const key = await crypto.subtle.importKey('raw', entropy, 'AES-GCM', false, ['encrypt', 'decrypt']);
  entropy.fill(0);
  return { phrase, key };
}

export async function importRecoveryKey(phraseInput: string): Promise<CryptoKey> {
  const phrase = phraseInput.trim().toLowerCase().replace(/\s+/gu, ' ');
  if (!validateMnemonic(phrase, wordlist)) {
    throw new Error('The recovery phrase is not valid. Check the 24 English words and try again.');
  }
  const entropy = mnemonicToEntropy(phrase, wordlist);
  const key = await crypto.subtle.importKey('raw', entropy, 'AES-GCM', false, ['encrypt', 'decrypt']);
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

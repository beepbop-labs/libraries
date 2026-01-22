import { uint8ArrayToBase64Url } from "./utils/base64";
import { sha256 } from "./utils/sha256";

/**
 * Random bytes generator function type
 * Can return Buffer, Uint8Array, or ArrayBuffer
 */
export type RandomBytesGenerator = (length: number) => Uint8Array | ArrayBuffer | Buffer;

/**
 * Generates a random code verifier for PKCE
 * @param getRandomBytes - Function that generates cryptographically secure random bytes
 * @returns Base64url-encoded code verifier (43 characters)
 *
 * @example
 * // Node.js
 * import { randomBytes } from 'crypto';
 * const verifier = generateCodeVerifier(randomBytes);
 *
 * @example
 * // Expo
 * import * as Crypto from 'expo-crypto';
 * const verifier = generateCodeVerifier(Crypto.getRandomBytes);
 *
 * @example
 * // Browser
 * const verifier = generateCodeVerifier((length) => {
 *   const bytes = new Uint8Array(length);
 *   crypto.getRandomValues(bytes);
 *   return bytes;
 * });
 */
export function generateCodeVerifier(getRandomBytes: RandomBytesGenerator): string {
  // Generate 32 bytes (256 bits) of random data
  const randomBytes = getRandomBytes(32);

  // Ensure we have a Uint8Array
  const bytes = randomBytes instanceof Uint8Array ? randomBytes : new Uint8Array(randomBytes);

  // Convert to base64url encoding (RFC 4648)
  return uint8ArrayToBase64Url(bytes);
}

/**
 * Creates a code challenge from a code verifier using SHA-256
 * Uses pure JavaScript SHA-256 implementation
 * @param verifier - The code verifier to hash
 * @returns Base64url-encoded SHA-256 hash of the verifier (43 characters)
 */
export function createCodeChallenge(verifier: string): string {
  // Hash using pure JavaScript SHA-256
  const hash = sha256(verifier);

  // Convert to base64url encoding
  return uint8ArrayToBase64Url(hash);
}

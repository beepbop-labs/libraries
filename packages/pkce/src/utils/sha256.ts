/**
 * Pure JavaScript SHA-256 implementation
 * Based on FIPS 180-4 specification
 * Works in all JavaScript environments (Node.js, browsers, React Native, Expo)
 */

// SHA-256 constants (first 32 bits of the fractional parts of the cube roots of the first 64 primes)
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

// Right rotate
function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

// Convert string to UTF-8 bytes
function stringToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code > 127) {
      // Handle UTF-8 encoding for non-ASCII characters
      return new TextEncoder().encode(str);
    }
    bytes[i] = code;
  }
  return bytes;
}

/**
 * Computes SHA-256 hash of input data
 * @param data - Input string or byte array
 * @returns SHA-256 hash as Uint8Array (32 bytes)
 */
export function sha256(data: string | Uint8Array): Uint8Array {
  // Convert input to bytes
  const message = typeof data === 'string' ? stringToBytes(data) : data;

  // Pre-processing: adding padding bits
  const msgLength = message.length;
  const bitLength = msgLength * 8;

  // Calculate padding length (message + 1 bit + zeros + 64-bit length = multiple of 512 bits)
  const paddingLength = (msgLength + 9 + 63) & ~63; // Round up to nearest multiple of 64
  const padded = new Uint8Array(paddingLength);

  // Copy message
  padded.set(message);

  // Append '1' bit (0x80 = 10000000 in binary)
  padded[msgLength] = 0x80;

  // Append length in bits as 64-bit big-endian integer
  const view = new DataView(padded.buffer);
  view.setUint32(paddingLength - 4, bitLength >>> 0, false); // Low 32 bits

  // Initialize hash values (first 32 bits of the fractional parts of the square roots of the first 8 primes)
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]);

  // Process message in 512-bit (64-byte) chunks
  const w = new Uint32Array(64);

  for (let chunkStart = 0; chunkStart < padded.length; chunkStart += 64) {
    // Break chunk into sixteen 32-bit big-endian words
    for (let i = 0; i < 16; i++) {
      const offset = chunkStart + i * 4;
      w[i] = (padded[offset] << 24) | (padded[offset + 1] << 16) |
             (padded[offset + 2] << 8) | padded[offset + 3];
    }

    // Extend the sixteen 32-bit words into sixty-four 32-bit words
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    // Initialize working variables
    let a = h[0], b = h[1], c = h[2], d = h[3];
    let e = h[4], f = h[5], g = h[6], hh = h[7];

    // Main compression loop
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    // Add compressed chunk to current hash value
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  // Produce the final hash value (big-endian)
  const hash = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    hash[i * 4 + 0] = (h[i] >>> 24) & 0xff;
    hash[i * 4 + 1] = (h[i] >>> 16) & 0xff;
    hash[i * 4 + 2] = (h[i] >>> 8) & 0xff;
    hash[i * 4 + 3] = h[i] & 0xff;
  }

  return hash;
}

# @bb-labs/pkce

Zero-dependency PKCE library with pure JavaScript SHA-256 implementation. Bring your own crypto - provide a random bytes generator for maximum compatibility.

## Installation

```bash
npm install @bb-labs/pkce
```

## Usage

```typescript
import { generateCodeVerifier, createCodeChallenge } from "@bb-labs/pkce";

// Node.js
import { randomBytes } from "crypto";
const verifier = generateCodeVerifier(randomBytes);
const challenge = createCodeChallenge(verifier);

// Browser
const verifier = generateCodeVerifier((length) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
});
const challenge = createCodeChallenge(verifier);

// Expo
import * as Crypto from "expo-crypto";
const verifier = generateCodeVerifier(Crypto.getRandomBytes);
const challenge = createCodeChallenge(verifier);
```

## API

### `generateCodeVerifier(getRandomBytes): string`

Generates a cryptographically secure code verifier (43 chars, base64url encoded).

- `getRandomBytes`: Function returning random bytes (Uint8Array, ArrayBuffer, or Buffer)

### `createCodeChallenge(verifier): string`

Creates SHA-256 code challenge from verifier (43 chars, base64url encoded).

## Platform Support

Works in all JavaScript environments. Provide your platform's crypto random bytes function:

- **Node.js**: `crypto.randomBytes`
- **Browser**: `(length) => crypto.getRandomValues(new Uint8Array(length))`
- **Expo/React Native**: `expo-crypto.getRandomBytes`

## Implementation Details

- **SHA-256**: Pure JavaScript FIPS 180-4 implementation
- **Base64URL**: RFC 4648 compliant
- **Bundle size**: ~3KB minified
- **TypeScript**: Full type definitions included

## License

MIT

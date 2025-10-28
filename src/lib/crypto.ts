// Web Crypto helpers for passcode hashing/verification

export type VaultConfig = {
  saltB64: string;
  hashB64: string;
  iterations: number;
  algo: "PBKDF2-SHA256";
};

const enc = new TextEncoder();

export function randomBytes(length = 16): Uint8Array {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function derivePBKDF2(
  passcode: string,
  salt: Uint8Array,
  iterations = 150_000
): Promise<ArrayBuffer> {
  // Normalize to ArrayBuffer (copy into new ArrayBuffer)
  const saltBuf = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuf).set(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passcode),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuf, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
}

export async function hashPasscode(
  passcode: string,
  iterations = 150_000
): Promise<VaultConfig> {
  const salt = randomBytes(16);
  const bits = await derivePBKDF2(passcode, salt, iterations);
  return {
    saltB64: toBase64(salt),
    hashB64: toBase64(bits),
    iterations,
    algo: "PBKDF2-SHA256",
  };
}

export async function verifyPasscode(passcode: string, cfg: VaultConfig) {
  const salt = fromBase64(cfg.saltB64);
  const derived = await derivePBKDF2(passcode, salt, cfg.iterations);
  const ref = fromBase64(cfg.hashB64);
  return constantTimeEqual(new Uint8Array(derived), ref);
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

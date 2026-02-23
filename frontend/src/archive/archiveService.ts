
// AES-GCM encryption/decryption for archived tasks
// Same logic as old archive.worker.js but runs in main thread (React is fast enough for task payloads)

const SECRET_KEY = "archive-secret-key-v2";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getDerivedKey(): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", encoder.encode(SECRET_KEY));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export interface EncryptedPayload {
  iv: number[];
  payload: number[];
}

export async function encryptTask(data: object): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getDerivedKey();

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(data))
  );

  return {
    iv: Array.from(iv),
    payload: Array.from(new Uint8Array(encrypted)),
  };
}

export async function decryptTask<T = object>(record: EncryptedPayload): Promise<T> {
  const key = await getDerivedKey();

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(record.iv) },
    key,
    new Uint8Array(record.payload)
  );

  return JSON.parse(decoder.decode(decrypted)) as T;
}
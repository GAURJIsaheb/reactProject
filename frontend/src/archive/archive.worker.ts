const SECRET_KEY = "archive-secret-key-v2";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type EncryptedPayload = {
  iv: number[];
  payload: number[];
};

type EncryptMessage = {
  id: number;
  type: "encrypt";
  payload: object;
};

type DecryptMessage = {
  id: number;
  type: "decrypt";
  payload: EncryptedPayload;
};

type WorkerRequest = EncryptMessage | DecryptMessage;

let derivedKeyPromise: Promise<CryptoKey> | null = null;

function getDerivedKey() {
  if (!derivedKeyPromise) {
    derivedKeyPromise = crypto.subtle
      .digest("SHA-256", encoder.encode(SECRET_KEY))
      .then((raw) =>
        crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
          "encrypt",
          "decrypt",
        ])
      );
  }

  return derivedKeyPromise;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  try {
    const key = await getDerivedKey();

    if (message.type === "encrypt") {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoder.encode(JSON.stringify(message.payload))
      );

      self.postMessage({
        id: message.id,
        ok: true,
        result: {
          iv: Array.from(iv),
          payload: Array.from(new Uint8Array(encrypted)),
        },
      });
      return;
    }

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(message.payload.iv) },
      key,
      new Uint8Array(message.payload.payload)
    );

    self.postMessage({
      id: message.id,
      ok: true,
      result: JSON.parse(decoder.decode(decrypted)),
    });
  } catch (error) {
    self.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : "Archive worker failed",
    });
  }
};

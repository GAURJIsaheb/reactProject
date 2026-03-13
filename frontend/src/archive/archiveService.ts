type WorkerResponse<T> =
  | { id: number; ok: true; result: T }
  | { id: number; ok: false; error: string };

let workerPromise: Promise<Worker> | null = null;
let requestId = 0;
const pending = new Map<
  number,
  {
    resolve: (value: any) => void;
    reject: (reason?: unknown) => void;
  }
>();

function getArchiveWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = Promise.resolve(
      new Worker(new URL("./archive.worker.ts", import.meta.url), { type: "module" })
    );

    workerPromise.then((worker) => {
      worker.onmessage = (event: MessageEvent<WorkerResponse<unknown>>) => {
        const message = event.data;
        const request = pending.get(message.id);
        if (!request) return;

        pending.delete(message.id);
        if (message.ok) {
          request.resolve(message.result);
          return;
        }

        request.reject(new Error(message.error));
      };

      worker.onerror = (event) => {
        const error = new Error(event.message || "Archive worker crashed");
        for (const [id, request] of pending) {
          request.reject(error);
          pending.delete(id);
        }
      };
    });
  }

  return workerPromise;
}

async function runWorkerTask<T>(type: "encrypt" | "decrypt", payload: object | EncryptedPayload): Promise<T> {
  const worker = await getArchiveWorker();
  const id = ++requestId;

  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, payload });
  });
}

export interface EncryptedPayload {
  iv: number[];
  payload: number[];
}

export async function encryptTask(data: object): Promise<EncryptedPayload> {
  return runWorkerTask<EncryptedPayload>("encrypt", data);
}

export async function decryptTask<T = object>(record: EncryptedPayload): Promise<T> {
  return runWorkerTask<T>("decrypt", record);
}

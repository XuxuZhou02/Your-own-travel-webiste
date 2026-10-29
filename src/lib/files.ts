// Ticket and photo files live in IndexedDB on the device, so tickets open
// without a network. (In the Supabase version these are private, expiring
// storage links, with the device copy kept as an offline cache.)

const DB = "footnote-files";
const STORE = "files";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function putFile(id: string, blob: Blob): Promise<IDBValidKey> {
  return run("readwrite", (s) => s.put(blob, id));
}

export function getFile(id: string): Promise<Blob | undefined> {
  return run("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>);
}

export function clearFiles(): Promise<undefined> {
  return run("readwrite", (s) => s.clear() as IDBRequest<undefined>);
}

/**
 * Makes a browsing copy no wider than `maxSize` pixels. The original is kept
 * too (section 4.6), so this copy only saves space and bandwidth.
 */
export async function compressImage(file: Blob, maxSize = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap === "undefined") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality));
}

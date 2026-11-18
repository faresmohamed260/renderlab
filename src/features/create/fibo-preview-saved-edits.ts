// Preview-only, device-local storage. Never stores credentials or sends data to a service.
const limit = 96 * 1024 * 1024;
type SavedImage = { image_data: string; filename?: string; run?: { inputs: (File | undefined)[]; mask?: File } };

async function access<T>(account: string, update?: (rows: T[]) => T[]): Promise<T[]> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open("renderlab-fibo-preview-edits", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("accounts");
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction("accounts", update ? "readwrite" : "readonly");
      const store = tx.objectStore("accounts");
      const read = store.get(account);
      let rows: T[] = [];
      let cause: unknown;
      read.onsuccess = () => {
        try {
          rows = Array.isArray(read.result) ? read.result : [];
          if (update) {
            rows = update(rows);
            if (rows.length) store.put(rows, account);
            else store.delete(account);
          }
        } catch (error) { cause = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(rows);
      tx.onabort = () => reject(cause ?? tx.error);
    });
  } finally { db.close(); }
}

export function readFiboEdits<T>(account: string) { return access<T>(account); }
export function clearFiboEdits(account: string) { return access(account, () => []); }

export function saveFiboEdits<T extends SavedImage>(account: string, additions: T[]) {
  return access<T>(account, (rows) => {
    let bytes = 0;
    const seen = new Set<File>();
    const merged = [...additions, ...rows.filter(row => !additions.some(item => item.filename === row.filename))];
    const kept: T[] = [];
    for (const image of merged.slice(0, 8)) {
      const files = new Set([...(image.run?.inputs ?? []), image.run?.mask].filter((file): file is File => !!file));
      const extra = image.image_data.length + [...files].reduce((total, file) => total + (seen.has(file) ? 0 : file.size), 0);
      if (bytes + extra > limit) {
        if (kept.length < additions.length) throw new Error("This edit is too large to save on this device.");
        break;
      }
      bytes += extra;
      files.forEach(file => seen.add(file));
      kept.push(image);
    }
    return kept;
  });
}

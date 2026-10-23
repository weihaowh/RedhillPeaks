// The app's IndexedDB: uploaded files ('assets') and saved design presets ('presets').
// Both stores use out-of-line keys (the id is passed to put/get).

const DB_NAME = 'redhill-peaks-studio'
const DB_VERSION = 2
export type StoreName = 'assets' | 'presets'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      // v1 had only 'assets'; create whatever is missing.
      for (const name of ['assets', 'presets'] satisfies StoreName[]) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

export async function dbRequest<T>(store: StoreName, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const req = op(db.transaction(store, mode).objectStore(store))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

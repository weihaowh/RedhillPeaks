import { useEffect, useState } from 'react'

// Uploaded files (floor plan images) live in IndexedDB; plans only keep their asset id.

const DB_NAME = 'redhill-peaks-studio'
const STORE = 'assets'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const req = op(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

export async function putAsset(blob: Blob): Promise<string> {
  const id = `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  await run('readwrite', (s) => s.put(blob, id))
  return id
}

export function getAsset(id: string): Promise<Blob | undefined> {
  return run<Blob | undefined>('readonly', (s) => s.get(id))
}

/** Object URL for a stored asset, or undefined while loading / if it is missing. */
export function useAssetUrl(id?: string): string | undefined {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!id) {
      setUrl(undefined)
      return
    }
    let objectUrl: string | undefined
    let cancelled = false
    getAsset(id)
      .then((blob) => {
        if (cancelled || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => setUrl(undefined))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])

  return url
}

// Storage for FileSystemHandle using IndexedDB to preserve file directories across sessions
const DB_NAME = 'applet_file_handles_db';
const STORE_NAME = 'handles';

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getSavedHandle(key: string): Promise<any | null> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveHandle(key: string, handle: any): Promise<void> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(handle, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Graceful fallback
  }
}

export async function deleteSavedHandle(key: string): Promise<void> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Graceful fallback
  }
}

export async function pickFileWithSavedPath(options: {
  storageKey: string;
  cachedHandle?: any;
  types?: { description?: string; accept: Record<string, string[]> }[];
  onFilePicked: (file: File, handle: any) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('showOpenFilePicker' in window)) {
    return false;
  }

  try {
    let startInHandle = options.cachedHandle;
    if (!startInHandle) {
      startInHandle = await getSavedHandle(options.storageKey);
    }

    const pickerOptions: any = {
      multiple: false,
      excludeAcceptAllOption: false,
      ...(options.types ? { types: options.types } : {})
    };

    if (startInHandle) {
      pickerOptions.startIn = startInHandle;
    }

    const [handle] = await (window as any).showOpenFilePicker(pickerOptions);
    if (handle) {
      await saveHandle(options.storageKey, handle);
      const chosenFile = await handle.getFile();

      if (options.inputRef?.current) {
        try {
          const dt = new DataTransfer();
          dt.items.add(chosenFile);
          options.inputRef.current.files = dt.files;
        } catch {
          // Ignore DataTransfer errors if any
        }
      }

      options.onFilePicked(chosenFile, handle);
      return true;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return true;
    }
    console.warn('showOpenFilePicker error:', err);
    deleteSavedHandle(options.storageKey);
  }

  return false;
}

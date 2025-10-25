import { useState, useEffect, useCallback } from "react";

export interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video" | "other";
  format: "image" | "video" | "website" | "document" | "other";
  name: string;
  tags: string[];
  thumbnail?: string;
  createdAt: number;
  isHidden?: boolean;
}

function detectFormat(
  url: string,
  type: string
): "image" | "video" | "website" | "document" | "other" {
  const urlLower = url.toLowerCase();

  // Check for image extensions
  if (
    urlLower.endsWith(".jpg") ||
    urlLower.endsWith(".jpeg") ||
    urlLower.endsWith(".png") ||
    urlLower.endsWith(".gif") ||
    urlLower.endsWith(".webp") ||
    urlLower.endsWith(".svg") ||
    urlLower.endsWith(".bmp") ||
    urlLower.includes("image") ||
    urlLower.includes("format=webp") ||
    urlLower.includes("format=png")
  ) {
    return "image";
  }

  // Check for video extensions
  if (
    urlLower.endsWith(".mp4") ||
    urlLower.endsWith(".webm") ||
    urlLower.endsWith(".mov") ||
    urlLower.endsWith(".avi") ||
    urlLower.includes("youtube.com") ||
    urlLower.includes("youtu.be") ||
    urlLower.includes("vimeo.com") ||
    urlLower.includes("video")
  ) {
    return "video";
  }

  if (urlLower.endsWith(".pdf") || urlLower.includes("pdf")) {
    return "document";
  }

  if (urlLower.startsWith("http://") || urlLower.startsWith("https://")) {
    return "website";
  }

  return "other";
}

const DB_NAME = "PreviewBoardDB";
const STORE_NAME = "media";
const HIDDEN_STORE_NAME = "hidden";

export function useMediaStore() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [hiddenItems, setHiddenItems] = useState<MediaItem[]>([]);
  const [hiddenTags, setHiddenTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [db, setDb] = useState<IDBDatabase | null>(null);

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(HIDDEN_STORE_NAME)) {
            db.createObjectStore(HIDDEN_STORE_NAME, { keyPath: "id" });
          }
        };
      });
    };

    initDB()
      .then((database) => {
        setDb(database);
        loadItems(database);
        loadHiddenItems(database);
        loadHiddenTags();
      })
      .catch(console.error);
  }, []);

  const loadItems = useCallback((database: IDBDatabase) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      setItems(request.result.sort((a, b) => b.createdAt - a.createdAt));
      setIsLoading(false);
    };
  }, []);

  const loadHiddenItems = useCallback((database: IDBDatabase) => {
    const transaction = database.transaction(HIDDEN_STORE_NAME, "readonly");
    const store = transaction.objectStore(HIDDEN_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      setHiddenItems(request.result.sort((a, b) => b.createdAt - a.createdAt));
    };
  }, []);

  const loadHiddenTags = useCallback(() => {
    const tags = localStorage.getItem("hiddenTags");
    if (tags) {
      setHiddenTags(JSON.parse(tags));
    }
  }, []);

  const hideItem = useCallback(
    async (id: string) => {
      if (!db) return;

      const itemToHide = items.find((item) => item.id === id);
      if (!itemToHide) return;

      const hiddenItem = { ...itemToHide, isHidden: true };

      setItems((prev) => prev.filter((item) => item.id !== id));
      setHiddenItems((prev) => [hiddenItem, ...prev]);

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          [STORE_NAME, HIDDEN_STORE_NAME],
          "readwrite"
        );
        const store = transaction.objectStore(STORE_NAME);
        const hiddenStore = transaction.objectStore(HIDDEN_STORE_NAME);

        const deleteRequest = store.delete(id);
        const addRequest = hiddenStore.add(hiddenItem);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
          loadItems(db);
          loadHiddenItems(db);
          reject(transaction.error);
        };
      });
    },
    [db, items, loadItems, loadHiddenItems]
  );

  const unhideItem = useCallback(
    async (id: string) => {
      if (!db) return;

      const itemToUnhide = hiddenItems.find((item) => item.id === id);
      if (!itemToUnhide) return;

      const restoredItem = { ...itemToUnhide, isHidden: false };

      setHiddenItems((prev) => prev.filter((item) => item.id !== id));
      setItems((prev) => [restoredItem, ...prev]);

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          [STORE_NAME, HIDDEN_STORE_NAME],
          "readwrite"
        );
        const store = transaction.objectStore(STORE_NAME);
        const hiddenStore = transaction.objectStore(HIDDEN_STORE_NAME);

        const addRequest = store.add(restoredItem);
        const deleteRequest = hiddenStore.delete(id);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
          loadItems(db);
          loadHiddenItems(db);
          reject(transaction.error);
        };
      });
    },
    [db, hiddenItems, loadItems, loadHiddenItems]
  );

  const hideTag = useCallback((tag: string) => {
    setHiddenTags((prev) => {
      const updated = [...prev, tag];
      localStorage.setItem("hiddenTags", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const unhideTag = useCallback((tag: string) => {
    setHiddenTags((prev) => {
      const updated = prev.filter((t) => t !== tag);
      localStorage.setItem("hiddenTags", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addItem = useCallback(
    async (item: Omit<MediaItem, "id" | "createdAt" | "format">) => {
      if (!db) {
        return Promise.reject(new Error("Database not initialized"));
      }

      const format = detectFormat(item.url, item.type);

      const newItem: MediaItem = {
        ...item,
        format,
        id: Date.now().toString(),
        createdAt: Date.now(),
      };

      setItems((prev) => [newItem, ...prev]);

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(newItem);

        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          setItems((prev) => prev.filter((item) => item.id !== newItem.id));
          reject(request.error);
        };
      });
    },
    [db]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      if (!db) return;

      setItems((prev) => prev.filter((item) => item.id !== id));

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          loadItems(db);
          reject(request.error);
        };
      });
    },
    [db, loadItems]
  );

  const updateItem = useCallback(
    async (
      id: string,
      updates: Partial<Omit<MediaItem, "id" | "createdAt">>
    ) => {
      if (!db) return;

      const itemToUpdate = items.find((item) => item.id === id);
      if (!itemToUpdate) return;

      const updatedItem = { ...itemToUpdate, ...updates };
      setItems((prev) =>
        prev.map((item) => (item.id === id ? updatedItem : item))
      );

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(updatedItem);

        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          loadItems(db);
          reject(request.error);
        };
      });
    },
    [db, items, loadItems]
  );

  const allTags = Array.from(
    new Set(items.flatMap((item) => item.tags))
  ).sort();

  const allFormats = Array.from(
    new Set(items.map((item) => item.format))
  ).sort();

  return {
    items,
    hiddenItems,
    hiddenTags,
    isLoading,
    addItem,
    deleteItem,
    updateItem,
    hideItem,
    unhideItem,
    hideTag,
    unhideTag,
    allTags,
    allFormats,
  };
}

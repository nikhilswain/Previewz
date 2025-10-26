import { create } from "zustand";

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

const DB_NAME = "PreviewzDB";
const STORE_NAME = "media";
const HIDDEN_STORE_NAME = "hidden";
type MediaStore = {
  items: MediaItem[];
  hiddenItems: MediaItem[];
  hiddenTags: string[];
  isLoading: boolean;
  allTags: string[];
  allFormats: string[];
  // actions
  addItem: (
    item: Omit<MediaItem, "id" | "createdAt" | "format">
  ) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  updateItem: (
    id: string,
    updates: Partial<Omit<MediaItem, "id" | "createdAt">>
  ) => Promise<void>;
  hideItem: (id: string) => Promise<void>;
  unhideItem: (id: string) => Promise<void>;
  hideTag: (tag: string) => void;
  unhideTag: (tag: string) => void;
};

// Module-level DB singleton to avoid re-opening and re-running effects
let dbInstance: IDBDatabase | null = null;
let initializing = false;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (typeof window === "undefined")
    return Promise.reject(new Error("No window"));

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
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
}

async function loadFromDB(): Promise<{
  items: MediaItem[];
  hiddenItems: MediaItem[];
  hiddenTags: string[];
}> {
  const db = await openDB();
  const [items, hiddenItems] = await Promise.all([
    new Promise<MediaItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const result = (req.result as MediaItem[]).sort(
          (a, b) => b.createdAt - a.createdAt
        );
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    }),
    new Promise<MediaItem[]>((resolve, reject) => {
      const tx = db.transaction(HIDDEN_STORE_NAME, "readonly");
      const store = tx.objectStore(HIDDEN_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const result = (req.result as MediaItem[]).sort(
          (a, b) => b.createdAt - a.createdAt
        );
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    }),
  ]);

  const tagsRaw =
    typeof window !== "undefined" ? localStorage.getItem("hiddenTags") : null;
  const hiddenTags = tagsRaw ? (JSON.parse(tagsRaw) as string[]) : [];

  return { items, hiddenItems, hiddenTags };
}

function computeDerived(items: MediaItem[]) {
  const allTags = Array.from(new Set(items.flatMap((i) => i.tags))).sort();
  const allFormats = Array.from(new Set(items.map((i) => i.format))).sort();
  return { allTags, allFormats };
}

export const useMediaStore = create<MediaStore>((set, get) => {
  // kick off async init once in the browser
  if (typeof window !== "undefined" && !initializing && !dbInstance) {
    initializing = true;
    loadFromDB()
      .then(({ items, hiddenItems, hiddenTags }) => {
        const derived = computeDerived(items);
        set({ items, hiddenItems, hiddenTags, isLoading: false, ...derived });
      })
      .catch(() => set({ isLoading: false }))
      .finally(() => {
        initializing = false;
      });
  }

  return {
    items: [],
    hiddenItems: [],
    hiddenTags: [],
    isLoading: true,
    allTags: [],
    allFormats: [],

    addItem: async (item) => {
      const db = await openDB();
      const format = detectFormat(item.url, item.type);
      const newItem: MediaItem = {
        ...item,
        format,
        id: Date.now().toString(),
        createdAt: Date.now(),
      };

      // optimistic update
      const prevItems = get().items;
      const optimistic = [newItem, ...prevItems];
      set({ items: optimistic, ...computeDerived(optimistic) });

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(newItem);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }).catch((err) => {
        // rollback on failure
        const rolledBack = get().items.filter((i) => i.id !== newItem.id);
        set({ items: rolledBack, ...computeDerived(rolledBack) });
        throw err;
      });
    },

    deleteItem: async (id) => {
      const db = await openDB();
      const prev = get().items;
      const updated = prev.filter((i) => i.id !== id);
      set({ items: updated, ...computeDerived(updated) });

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }).catch((err) => {
        // reload from DB on failure
        loadFromDB()
          .then(({ items, hiddenItems, hiddenTags }) => {
            set({ items, hiddenItems, hiddenTags, ...computeDerived(items) });
          })
          .catch(() => {});
        throw err;
      });
    },

    updateItem: async (id, updates) => {
      const db = await openDB();
      const current = get().items;
      const target = current.find((i) => i.id === id);
      if (!target) return;

      const updatedItem: MediaItem = { ...target, ...updates };
      const next = current.map((i) => (i.id === id ? updatedItem : i));
      set({ items: next, ...computeDerived(next) });

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(updatedItem);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }).catch((err) => {
        loadFromDB()
          .then(({ items, hiddenItems, hiddenTags }) => {
            set({ items, hiddenItems, hiddenTags, ...computeDerived(items) });
          })
          .catch(() => {});
        throw err;
      });
    },

    hideItem: async (id) => {
      const db = await openDB();
      const state = get();
      const item = state.items.find((i) => i.id === id);
      if (!item) return;
      const hiddenItem: MediaItem = { ...item, isHidden: true };

      const newItems = state.items.filter((i) => i.id !== id);
      const newHidden = [hiddenItem, ...state.hiddenItems];
      set({
        items: newItems,
        hiddenItems: newHidden,
        ...computeDerived(newItems),
      });

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_NAME, HIDDEN_STORE_NAME], "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        tx.objectStore(HIDDEN_STORE_NAME).add(hiddenItem);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }).catch((err) => {
        // reload on failure
        loadFromDB()
          .then(({ items, hiddenItems, hiddenTags }) => {
            set({ items, hiddenItems, hiddenTags, ...computeDerived(items) });
          })
          .catch(() => {});
        throw err;
      });
    },

    unhideItem: async (id) => {
      const db = await openDB();
      const state = get();
      const item = state.hiddenItems.find((i) => i.id === id);
      if (!item) return;
      const unhidden: MediaItem = { ...item, isHidden: false };

      const newHidden = state.hiddenItems.filter((i) => i.id !== id);
      const newItems = [unhidden, ...state.items];
      set({
        items: newItems,
        hiddenItems: newHidden,
        ...computeDerived(newItems),
      });

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_NAME, HIDDEN_STORE_NAME], "readwrite");
        tx.objectStore(STORE_NAME).add(unhidden);
        tx.objectStore(HIDDEN_STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }).catch((err) => {
        loadFromDB()
          .then(({ items, hiddenItems, hiddenTags }) => {
            set({ items, hiddenItems, hiddenTags, ...computeDerived(items) });
          })
          .catch(() => {});
        throw err;
      });
    },

    hideTag: (tag: string) => {
      const updated = [...get().hiddenTags, tag];
      if (typeof window !== "undefined") {
        localStorage.setItem("hiddenTags", JSON.stringify(updated));
      }
      set({ hiddenTags: updated });
    },

    unhideTag: (tag: string) => {
      const updated = get().hiddenTags.filter((t) => t !== tag);
      if (typeof window !== "undefined") {
        localStorage.setItem("hiddenTags", JSON.stringify(updated));
      }
      set({ hiddenTags: updated });
    },
  };
});

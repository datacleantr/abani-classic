"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Favoriler: yalnızca ziyaretçinin tarayıcısında (localStorage) ürün kimliği listesi.
 * Veritabanı tablosu gerektirmez; hesaplar arası eşitleme sonraki fazdadır
 * (docs/GAP_REPORT.md). Sekmeler arasında `storage` olayıyla eşitlenir.
 */
const STORAGE_KEY = "abani-favorites-v1";
const MAX_FAVORITES = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFavorites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const ids = value.filter((item): item is string => typeof item === "string" && UUID.test(item));
    return [...new Set(ids)].slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export function toggleFavorite(ids: string[], productId: string): string[] {
  if (ids.includes(productId)) return ids.filter((id) => id !== productId);
  return [productId, ...ids].slice(0, MAX_FAVORITES);
}

type FavoritesContextValue = {
  /** En son eklenen başta. */
  ids: string[];
  count: number;
  /** localStorage okunana kadar false; sunucu render'ı ile uyumsuzluk yaşamamak için. */
  isReady: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readStored(): string[] {
  try {
    return parseFavorites(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeStored(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Gizli sekme / depolama kapalı: favoriler bu oturumla sınırlı kalır.
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tarayıcı deposundan ilk okuma
    setIds(readStored());
    setIsReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setIds(parseFavorites(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((next: (current: string[]) => string[]) => {
    setIds((current) => {
      const value = next(current);
      writeStored(value);
      return value;
    });
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      ids,
      count: ids.length,
      isReady,
      has: (productId) => ids.includes(productId),
      toggle: (productId) => update((current) => toggleFavorite(current, productId)),
      remove: (productId) => update((current) => current.filter((id) => id !== productId)),
    }),
    [ids, isReady, update],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites, FavoritesProvider içinde kullanılmalıdır.");
  return context;
}

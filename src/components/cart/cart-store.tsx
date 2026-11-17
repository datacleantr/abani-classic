"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  brandName: string;
  variantLabel: string;
  image: string;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
};

type CartState = { lines: CartLine[]; couponCode: string };

/** `addLine` sonucu: sepette oluşan adet ve stok sınırı nedeniyle kırpılıp kırpılmadığı. */
export type AddLineResult = {
  /** Satırın sepetteki yeni adedi. */
  quantity: number;
  /** Bu çağrıyla gerçekten eklenen adet (sınırdaysa 0 olabilir). */
  added: number;
  /** İstenen adet `maxQuantity` sınırına takıldıysa true. */
  limited: boolean;
  maxQuantity: number;
};

/**
 * Saf birleştirme: aynı varyant varsa adet artırılır; her durumda adet `maxQuantity`
 * (en az 1) ile sınırlanır ve sınıra takılma bildirilir.
 */
export function mergeCartLine(lines: CartLine[], line: CartLine): { lines: CartLine[]; result: AddLineResult } {
  const max = Math.max(1, Math.trunc(line.maxQuantity) || 0);
  const requested = Math.max(1, Math.trunc(line.quantity) || 0);
  const existing = lines.find((item) => item.variantId === line.variantId);
  const before = existing?.quantity ?? 0;
  const wanted = before + requested;
  const quantity = Math.min(wanted, Math.max(max, before));
  const result: AddLineResult = {
    quantity,
    added: Math.max(0, quantity - before),
    limited: wanted > max,
    maxQuantity: max,
  };
  if (existing) {
    return {
      lines: lines.map((item) =>
        item.variantId === line.variantId ? { ...item, quantity, maxQuantity: line.maxQuantity } : item,
      ),
      result,
    };
  }
  return { lines: [...lines, { ...line, quantity }], result };
}

/** Çekmece kapanınca odağın döneceği öğe yoksa (ör. kaldırıldıysa) header'daki sepet düğmesi. */
export const CART_TRIGGER_ATTRIBUTE = "data-cart-trigger";

type CartContextValue = {
  lines: CartLine[];
  couponCode: string;
  isReady: boolean;
  drawerOpen: boolean;
  /** Son eklemede stok sınırına takılındıysa çekmecede gösterilen not. */
  notice: string | null;
  itemCount: number;
  subtotal: number;
  /**
   * Satırı ekler ve sepet çekmecesini açar. `opener`: çekmece kapanınca odağın döneceği öğe
   * (verilmezse o anki odaklı öğe).
   */
  addLine: (line: CartLine, opener?: HTMLElement | null) => AddLineResult;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
  clear: () => void;
  setCouponCode: (code: string) => void;
  openDrawer: (opener?: HTMLElement | null) => void;
  /** `restoreFocus: false` — çekmecedeki bir bağlantıyla sayfa değişirken odak geri taşınmaz. */
  closeDrawer: (options?: { restoreFocus?: boolean }) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "abani-cart-v1";

function readStoredCart(): CartState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lines: [], couponCode: "" };
    const parsed = JSON.parse(raw) as CartState;
    if (!Array.isArray(parsed.lines)) return { lines: [], couponCode: "" };
    return {
      lines: parsed.lines.filter((line) => line.variantId && line.quantity > 0),
      couponCode: typeof parsed.couponCode === "string" ? parsed.couponCode : "",
    };
  } catch {
    return { lines: [], couponCode: "" };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>({ lines: [], couponCode: "" });
  const [isReady, setIsReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Hızlı art arda eklemelerde sonucu doğru hesaplamak için güncel satırların kopyası.
  const linesRef = useRef<CartLine[]>([]);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    linesRef.current = state.lines;
  }, [state.lines]);

  useEffect(() => {
    // Hydrate from localStorage after mount to avoid SSR mismatch; deferred to a
    // macrotask so the first client render matches the server HTML.
    const timer = window.setTimeout(() => {
      setState(readStoredCart());
      setIsReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, isReady]);

  const rememberOpener = useCallback((opener?: HTMLElement | null) => {
    const active = typeof document !== "undefined" ? document.activeElement : null;
    openerRef.current =
      opener ?? (active instanceof HTMLElement && active !== document.body ? active : null);
  }, []);

  const addLine = useCallback(
    (line: CartLine, opener?: HTMLElement | null) => {
      const { lines: next, result } = mergeCartLine(linesRef.current, line);
      linesRef.current = next;
      setState((current) => ({ ...current, lines: mergeCartLine(current.lines, line).lines }));
      rememberOpener(opener);
      setNotice(
        result.limited ? `${line.productName}: en fazla ${result.maxQuantity} adet eklenebilir.` : null,
      );
      setDrawerOpen(true);
      return result;
    },
    [rememberOpener],
  );

  const openDrawer = useCallback(
    (opener?: HTMLElement | null) => {
      rememberOpener(opener);
      setNotice(null);
      setDrawerOpen(true);
    },
    [rememberOpener],
  );

  const closeDrawer = useCallback((options?: { restoreFocus?: boolean }) => {
    setDrawerOpen(false);
    const target = openerRef.current;
    openerRef.current = null;
    if (options?.restoreFocus === false) return;
    // Çekmece kaldırıldıktan sonra odağı açan öğeye (DOM'dan çıktıysa header sepet düğmesine) taşı.
    window.requestAnimationFrame(() => {
      const fallback = document.querySelector<HTMLElement>(`[${CART_TRIGGER_ATTRIBUTE}]`);
      const destination = target?.isConnected ? target : fallback;
      destination?.focus();
    });
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setState((current) => ({
      ...current,
      lines: current.lines
        .map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: Math.max(0, Math.min(quantity, item.maxQuantity || 10)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    }));
  }, []);

  const removeLine = useCallback((variantId: string) => {
    setState((current) => ({
      ...current,
      lines: current.lines.filter((item) => item.variantId !== variantId),
    }));
  }, []);

  const clear = useCallback(() => {
    setState({ lines: [], couponCode: "" });
  }, []);

  const setCouponCode = useCallback((code: string) => {
    setState((current) => ({ ...current, couponCode: code }));
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = state.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    return {
      lines: state.lines,
      couponCode: state.couponCode,
      isReady,
      drawerOpen,
      notice,
      itemCount,
      subtotal,
      addLine,
      updateQuantity,
      removeLine,
      clear,
      setCouponCode,
      openDrawer,
      closeDrawer,
    };
  }, [state, isReady, drawerOpen, notice, addLine, updateQuantity, removeLine, clear, setCouponCode, openDrawer, closeDrawer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

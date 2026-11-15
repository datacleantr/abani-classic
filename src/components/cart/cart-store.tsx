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

type CartContextValue = {
  lines: CartLine[];
  couponCode: string;
  isReady: boolean;
  drawerOpen: boolean;
  itemCount: number;
  subtotal: number;
  addLine: (line: CartLine) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
  clear: () => void;
  setCouponCode: (code: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
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

  const addLine = useCallback((line: CartLine) => {
    setState((current) => {
      const existing = current.lines.find((item) => item.variantId === line.variantId);
      if (existing) {
        return {
          ...current,
          lines: current.lines.map((item) =>
            item.variantId === line.variantId
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + line.quantity, Math.max(1, line.maxQuantity)),
                }
              : item,
          ),
        };
      }
      return { ...current, lines: [...current.lines, line] };
    });
    setDrawerOpen(true);
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
      itemCount,
      subtotal,
      addLine,
      updateQuantity,
      removeLine,
      clear,
      setCouponCode,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
    };
  }, [state, isReady, drawerOpen, addLine, updateQuantity, removeLine, clear, setCouponCode]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

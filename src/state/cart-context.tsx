"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { OrderItemCustomizations } from "@/types/customizations";

export type CartItem = {
  productId: string;
  name: string;
  price: number; // in cents - final price after customizations
  quantity: number;
  imageUrl: string | null;
  categoryName: string;
  quantityAvailable: number;
  customizations?: OrderItemCustomizations; // Selected customizations
  // Unique cart ID to handle same product with different customizations
  cartItemId: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "sweet-angel-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        const parsedItems = JSON.parse(stored);
        // Migrate old cart items that don't have cartItemId
        const migratedItems = parsedItems.map((item: CartItem) => {
          if (!item.cartItemId) {
            // Old items without cartItemId - use productId as cartItemId
            return {
              ...item,
              cartItemId: item.productId,
            };
          }
          return item;
        });
        setItems(migratedItems);
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isHydrated]);

  function addItem(newItem: Omit<CartItem, "quantity">) {
    setItems((currentItems) => {
      // For products with customizations, use cartItemId to match
      // For products without, match by productId and no customizations
      const existingItem = currentItems.find(
        (item) => item.cartItemId === newItem.cartItemId
      );

      if (existingItem) {
        return currentItems.map((item) => {
          if (item.cartItemId === newItem.cartItemId) {
            // Cap at available quantity
            const newQuantity = Math.min(
              item.quantity + 1,
              newItem.quantityAvailable
            );
            return {
              ...item,
              quantity: newQuantity,
              quantityAvailable: newItem.quantityAvailable,
            };
          }
          return item;
        });
      }

      return [...currentItems, { ...newItem, quantity: 1 }];
    });
  }

  function removeItem(cartItemId: string) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.cartItemId !== cartItemId)
    );
  }

  function updateQuantity(cartItemId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.cartItemId === cartItemId) {
          // Cap quantity at available stock
          const cappedQuantity = Math.min(quantity, item.quantityAvailable);
          return { ...item, quantity: cappedQuantity };
        }
        return item;
      })
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchCartFromBackend, addProductToBackendCart } from "../lib/api";

export function useCart(userId: string | undefined) {
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 1. שליפת העגלה ברגע שיש משתמש מחובר (מוכן לעבודה מול שרת)
  useEffect(() => {
    async function loadCart() {
      if (!userId) {
        setCart([]); // אין משתמש? עגלה ריקה
        return;
      }

      setLoading(true);
      const backendCart = await fetchCartFromBackend(userId);
      if (backendCart) {
        setCart(backendCart);
      }
      setLoading(false);
    }

    loadCart();
  }, [userId]);

  // 2. פונקציית הוספה לעגלה (תומכת גם בלוקאלי וגם בבאקנד)
  const addToCart = async (product: any) => {
    let nextQty = 1;

    setCart((prev) => {
      const existingItemIdx = prev.findIndex(
        (item) => item.product_id === product.id || item.id === product.id,
      );

      if (existingItemIdx > -1) {
        const newCart = [...prev];
        nextQty = (newCart[existingItemIdx].quantity || 1) + 1;
        newCart[existingItemIdx].quantity = nextQty;
        return newCart;
      } else {
        nextQty = 1;
        return [...prev, { ...product, product_id: product.id, quantity: 1 }];
      }
    });

    toast.success(`הוספת את ${product.name} לסל`, {
      position: "bottom-right",
      duration: 2000,
    });

    if (userId) {
      // שולחים את הכמות הכוללת המעודכנת (nextQty) במקום תמיד 1
      addProductToBackendCart(userId, product.id, nextQty);
    }
  };

  // 3. פונקציה להסרת פריט (לוקאלי לספרינט הנוכחי)
  const removeFromCart = (indexToRemove: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // 4. פונקציה לניקוי כל העגלה (למשל אחרי הזמנה)
  const clearCart = () => {
    setCart([]);
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    loading,
  };
}

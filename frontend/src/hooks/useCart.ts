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
    // אופטימיזציה לוקאלית: מעדכנים מיד ב-State כדי שהמשתמש יראה תגובה מיידית ב-UI
    setCart((prev) => {
      const existingItemIdx = prev.findIndex(
        (item) => item.product_id === product.id || item.id === product.id,
      );

      if (existingItemIdx > -1) {
        // המוצר כבר קיים בעגלה לוקאלית -> נגדיל כמות
        const newCart = [...prev];
        newCart[existingItemIdx].quantity =
          (newCart[existingItemIdx].quantity || 1) + 1;
        return newCart;
      } else {
        // מוצר חדש -> נוסיף אותו עם כמות 1
        return [...prev, { ...product, product_id: product.id, quantity: 1 }];
      }
    });

    toast.success(`הוספת את ${product.name} לסל`, {
      position: "bottom-right",
      duration: 2000,
    });

    // סנכרון מול הבאקנד (ברגע שיהיה מוכן)
    if (userId) {
      // אנחנו לא מחכים לזה (Async ברקע) כדי לא לתקוע את ה-UI
      addProductToBackendCart(userId, product.id, 1);
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

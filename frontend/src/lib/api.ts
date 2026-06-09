/**
 * Utility to communicate with the FastAPI backend.
 * The backend is responsible for Supabase interactions.
 */

/** בפיתוח (npm run dev) משתמשים ב-Vite proxy — לא צריך לשנות .env */
const API_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

export type ChatTurn = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

export async function sendChatToBackend(messages: ChatTurn[]) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    let detail = 'שגיאה בשרת הצ׳אט';
    try {
      const errorData = await response.json();
      detail = typeof errorData.detail === 'string' ? errorData.detail : detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const data = (await response.json()) as { reply: string };
  return data.reply;
}

export type ProductDto = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  image_url: string | null;
  stock: number;
};

export type ProductSearchResult = {
  products: ProductDto[];
  count: number;
};

export async function fetchProducts(): Promise<ProductSearchResult> {
  const response = await fetch(`${API_URL}/api/products`);

  if (!response.ok) {
    let detail = 'שגיאה בטעינת מוצרים';
    try {
      const errorData = await response.json();
      detail = typeof errorData.detail === 'string' ? errorData.detail : detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  return (await response.json()) as ProductSearchResult;
}

export async function searchProducts(params: {
  q?: string;
  category?: string;
}): Promise<ProductSearchResult> {
  const searchParams = new URLSearchParams();
  if (params.q?.trim()) searchParams.set('q', params.q.trim());
  if (params.category?.trim()) searchParams.set('category', params.category.trim());

  if (!searchParams.toString()) {
    throw new Error('יש להזין מילת חיפוש');
  }

  const response = await fetch(`${API_URL}/api/products/search?${searchParams}`);

  if (!response.ok) {
    let detail = 'שגיאה בחיפוש מוצרים';
    try {
      const errorData = await response.json();
      detail = typeof errorData.detail === 'string' ? errorData.detail : detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  return (await response.json()) as ProductSearchResult;
}

export async function addSupabaseData(name: string, content: string) {
  try {
    const response = await fetch(`${API_URL}/add_data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, content }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Failed to add data to Supabase via Backend",
      );
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function fetchCartFromBackend(
  userId: string,
): Promise<any[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/cart?user_id=${userId}`);

    if (!response.ok) {
      // אם העגלה עדיין לא קיימת בשרת, נחזיר מערך ריק ולא נכשיל את ה-UI
      if (response.status === 404) return [];

      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to fetch cart");
    }

    const data = await response.json();
    // הבאקנד מחזיר אובייקט או מערך, נוודא שאנחנו מחזירים את רשימת הפריטים
    return Array.isArray(data) ? data : data.items || [];
  } catch (error) {
    console.error("Fetch cart API error:", error);
    return null;
  }
}

export async function addProductToBackendCart(
  userId: string,
  productId: string,
  quantity: number = 1,
): Promise<any> {
  try {
    const response = await fetch(`${API_URL}/api/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        product_id: productId,
        quantity: quantity,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to add product to cart");
    }

    return await response.json();
  } catch (error) {
    console.error("Add to cart API error:", error);
    throw error;
  }
}


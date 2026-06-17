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

export type AdminUserDto = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_admin: boolean;
  last_sign_in_at: string | null;
};

export async function fetchAdminUsers(accessToken: string): Promise<AdminUserDto[]> {
  const response = await fetch(`${API_URL}/api/admin/users`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let detail = 'שגיאה בטעינת משתמשים';
    try {
      const errorData = await response.json();
      detail = typeof errorData.detail === 'string' ? errorData.detail : detail;
    } catch {
      /* ignore */
    }

    if (response.status === 403) {
      throw new Error('אין לך הרשאות גישה לניהול משתמשים');
    }
    if (response.status === 401) {
      throw new Error('יש להתחבר מחדש כדי לצפות במשתמשים');
    }
    throw new Error(detail);
  }

  return (await response.json()) as AdminUserDto[];
}

export type AdminUserUpdatePayload = {
  first_name: string;
  last_name: string;
  phone: string;
  is_admin: boolean;
};

async function parseApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const errorData = await response.json();
    return typeof errorData.detail === 'string' ? errorData.detail : fallback;
  } catch {
    return fallback;
  }
}

export async function updateAdminUser(
  accessToken: string,
  userId: string,
  payload: AdminUserUpdatePayload,
): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await parseApiError(response, 'שגיאה בעדכון משתמש');
    if (response.status === 403) {
      throw new Error('אין לך הרשאות לעדכן משתמשים');
    }
    if (response.status === 401) {
      throw new Error('יש להתחבר מחדש');
    }
    throw new Error(detail);
  }
}

export async function deleteAdminUser(
  accessToken: string,
  userId: string,
): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const detail = await parseApiError(response, 'שגיאה במחיקת משתמש');
    if (response.status === 403) {
      throw new Error('אין לך הרשאות למחוק משתמשים');
    }
    if (response.status === 401) {
      throw new Error('יש להתחבר מחדש');
    }
    throw new Error(detail);
  }
}

export type AdminOrderDto = {
  order_id: string | number;
  created_at?: string | null;
  date?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  product_id?: string | null;
  quantity?: number | null;
  status: string;
};

export function normalizeOrderId(orderId: string | number): string {
  return String(orderId);
}

export function isValidAdminOrder(
  order: AdminOrderDto | null | undefined,
): order is AdminOrderDto {
  if (order == null) return false;
  const { order_id: id } = order;
  if (typeof id === 'number') return Number.isFinite(id);
  if (typeof id === 'string') return id.length > 0;
  return false;
}

// export async function fetchAdminOrders(
//   accessToken: string,
// ): Promise<AdminOrderDto[]> {
//   const response = await fetch(`${API_URL}/api/admin/orders`, {
//     headers: {
//       Authorization: `Bearer ${accessToken}`,
//     },
//   });

//   if (!response.ok) {
//     const detail = await parseApiError(response, 'שגיאה בטעינת הזמנות');
//     if (response.status === 403) {
//       throw new Error('אין לך הרשאות גישה לניהול הזמנות');
//     }
//     if (response.status === 401) {
//       throw new Error('יש להתחבר מחדש כדי לצפות בהזמנות');
//     }
//     throw new Error(detail);
//   }

//   const data = await response.json();
//   if (!Array.isArray(data)) return [];
//   return data.filter((order): order is AdminOrderDto => isValidAdminOrder(order));
// }

export async function fetchAdminOrders(
  accessToken: string,
): Promise<AdminOrderDto[]> {
  const response = await fetch(`${API_URL}/api/admin/orders`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const detail = await parseApiError(response, 'שגיאה בטעינת הזמנות');
    if (response.status === 403) {
      throw new Error('אין לך הרשאות גישה לניהול הזמנות');
    }
    if (response.status === 401) {
      throw new Error('יש להתחבר מחדש כדי לצפות בהזמנות');
    }
    throw new Error(detail);
  }

  // 1. קריאת המידע הגולמי האמיתי שחזר מהשרת
  const data = await response.json();
  console.log('🔍 [API] 1. RAW JSON FROM FETCH:', data);

  // 2. חילוץ המערך (למקרה שהשרת עטף אותו במילה data)
  const items = Array.isArray(data) ? data : (data?.data || []);
  console.log('🔍 [API] 2. EXTRACTED ITEMS:', items);

  // אם זה עדיין לא מערך אחרי החילוץ, נחזיר ריק
  if (!Array.isArray(items)) {
    console.error('🔍 [API] ERROR: Items is STILL not an array!', items);
    return [];
  }

  // 3. סינון לפי החוקים שלך
  const validItems = items.filter((order): order is AdminOrderDto => isValidAdminOrder(order));
  console.log('🔍 [API] 3. ITEMS AFTER VALIDATION FILTER:', validItems);

  return validItems;
}

export async function updateAdminOrderStatus(
  accessToken: string,
  orderId: string,
  status: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/admin/orders/${orderId}/status`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    const detail = await parseApiError(response, 'שגיאה בעדכון סטטוס הזמנה');
    if (response.status === 403) {
      throw new Error('אין לך הרשאות לעדכן הזמנות');
    }
    if (response.status === 401) {
      throw new Error('יש להתחבר מחדש');
    }
    throw new Error(detail);
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

export type CheckoutItemDto = {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
};

export type CheckoutParams = {
  userId: string;
  clientName: string;
  items: CheckoutItemDto[];
  totalPrice: number;
  paymentMethod?: string;
  cardTokenOrRaw: string;
};

export type CheckoutResponse = {
  status: string;
  message: string;
  order_id: string | null;
};

export async function sendCheckoutToBackend(params: CheckoutParams): Promise<CheckoutResponse> {
  try {
    const response = await fetch(`${API_URL}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: params.userId,
        client_name: params.clientName,
        items: params.items,
        total_price: params.totalPrice,
        payment_method: params.paymentMethod || 'credit_card',
        card_token_or_raw: params.cardTokenOrRaw,
      }),
    });

    if (!response.ok) {
      let detail = 'שגיאה בתהליך התשלום וההזמנה';
      try {
        const errorData = await response.json();
        detail = typeof errorData.detail === 'string' ? errorData.detail : detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }

    return (await response.json()) as CheckoutResponse;
  } catch (error) {
    console.error("Checkout API error:", error);
    throw error;
  }
}

export async function fetchUserOrdersFromBackend(userId: string): Promise<any[]> {
  try {
    const response = await fetch(`${API_URL}/api/orders?user_id=${userId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "נכשל בטעינת הזמנות");
    }

    return await response.json();
  } catch (error) {
    console.error("Fetch orders API error:", error);
    return []; // מחזירים מערך ריק כדי לא לשבור את ה-UI בשגיאה
  }
}
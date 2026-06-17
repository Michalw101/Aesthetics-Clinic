export type StoreProduct = {
  id?: string;
  name: string;
  brand: string;
  category?: string;
  price: number | string;
  img?: string;
  imageUrl?: string;
  stock?: number;
};

const IMAGE_FALLBACKS: Record<string, string> = {
  'סבון פנים עדין':
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&q=80&w=400',
  'מסכת זהב 24K':
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=400',
};

const DEFAULT_IMAGE = 'https://picsum.photos/seed/cosmetics/400/400';

export function getProductImage(product: StoreProduct): string {
  return (
    product.img ||
    product.imageUrl ||
    IMAGE_FALLBACKS[product.name] ||
    DEFAULT_IMAGE
  );
}

/** חיפוש לפי התחלת שם / מותג / קטגוריה (ס → סרום, לא מסכת) */
export function filterProducts(products: StoreProduct[], query: string): StoreProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;

  return products.filter(
    (p) =>
      p.name.toLowerCase().startsWith(q) ||
      p.brand.toLowerCase().startsWith(q) ||
      (p.category?.toLowerCase().startsWith(q) ?? false)
  );
}

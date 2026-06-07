import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import SearchBar from '../components/SearchBar';
import { fetchProducts, searchProducts, type ProductDto } from '../lib/api';
import { filterProducts, getProductImage, type StoreProduct } from '../lib/products';

export type { StoreProduct };

export type StorePageProps = {
  onAddToCart: (product: StoreProduct) => void;
  cartCount: number;
  onCheckout: () => void;
};

function mapApiProductToCard(p: ProductDto): StoreProduct {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    img: p.image_url ?? undefined,
    stock: p.stock,
  };
}

const SEARCH_DELAY_MS = 300;

export default function StorePage({
  onAddToCart,
  cartCount,
  onCheckout,
}: StorePageProps) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [displayProducts, setDisplayProducts] = useState<StoreProduct[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDbConnected, setIsDbConnected] = useState(false);

  const loadAllProducts = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { products: rows } = await fetchProducts();
      const mapped = rows.map(mapApiProductToCard);
      setProducts(mapped);
      setDisplayProducts(mapped);
      setIsDbConnected(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'לא ניתן לטעון מוצרים מהשרת';
      setLoadError(message);
      setProducts([]);
      setDisplayProducts([]);
      setIsDbConnected(false);
      toast.error(message, { position: 'top-center' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllProducts();
  }, [loadAllProducts]);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setDisplayProducts(products);
      setIsSearching(false);
      return;
    }

    // תגובה מיידית בזמן שהשרת מחפש
    setDisplayProducts(filterProducts(products, trimmed));

    if (!isDbConnected) return;

    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const { products: rows } = await searchProducts({ q: trimmed });
        setDisplayProducts(rows.map(mapApiProductToCard));
      } catch {
        setDisplayProducts(filterProducts(products, trimmed));
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [query, products, isDbConnected]);

  const trimmedQuery = query.trim();
  const showEmptySearch =
    trimmedQuery && displayProducts.length === 0 && !isSearching && !isLoading && !loadError;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-6 py-12 space-y-12"
    >
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-right space-y-2">
          <h2 className="text-4xl serif font-semibold">חנות מוצרים</h2>
          <p className="text-brand-dark/60">
            המוצרים הטובים ביותר לשגרת הטיפוח הביתית שלך
          </p>
          {isDbConnected && !isLoading && (
            <p className="text-xs text-brand-gold">מחובר למסד הנתונים המשותף</p>
          )}
        </div>
        {cartCount > 0 && (
          <button
            onClick={onCheckout}
            className="bg-brand-gold text-white px-8 py-3 rounded-full font-bold flex items-center gap-3 shadow-lg hover:scale-105 transition-transform"
          >
            <ShoppingBag size={20} />
            בצעי הזמנה ({cartCount})
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 w-full">
        <SearchBar onQueryChange={setQuery} isLoading={isLoading || isSearching} />
        {(isLoading || isSearching) && (
          <p className="text-xs text-brand-dark/50">
            {isLoading ? 'טוען מוצרים...' : 'מחפש...'}
          </p>
        )}
      </div>

      {loadError && (
        <div className="text-center space-y-4 py-8">
          <p className="text-brand-dark/70">{loadError}</p>
          <p className="text-sm text-brand-dark/50">
            ודאי שהבקאנד רץ על פורט 8000:
            <br />
            <code className="text-xs bg-white px-2 py-1 rounded">
              uvicorn main:app --reload --port 8000
            </code>
          </p>
          <button
            type="button"
            onClick={loadAllProducts}
            className="text-brand-gold font-semibold hover:underline"
          >
            נסי שוב
          </button>
        </div>
      )}

      {showEmptySearch && (
        <p className="text-center text-brand-dark/60 py-8">
          לא נמצאו מוצרים עבור &quot;{trimmedQuery}&quot;. נסי מילה אחרת או קטגוריה.
        </p>
      )}

      {!loadError && displayProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-3xl overflow-hidden border border-brand-gold/10 group"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={getProductImage(p)}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = 'https://picsum.photos/seed/cosmetics/400/400';
                  }}
                />
              </div>
              <div className="p-6 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">
                  {p.brand}
                </div>
                {p.category && (
                  <div className="text-[10px] text-brand-dark/50">{p.category}</div>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="flex justify-between items-center pt-4">
                  <span className="text-xl font-bold">
                    {typeof p.price === 'number' ? `₪${p.price}` : p.price}
                  </span>
                  <button
                    onClick={() => onAddToCart(p)}
                    className="bg-brand-dark text-white p-2 rounded-full hover:bg-brand-gold transition-colors"
                  >
                    <ShoppingBag size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

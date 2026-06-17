import { useState } from 'react';
import { Search } from 'lucide-react';

/**
 * @param {{
 *   onQueryChange: (query: string) => void,
 *   isLoading?: boolean,
 *   placeholder?: string,
 * }} props
 */
export default function SearchBar({
  onQueryChange,
  isLoading = false,
  placeholder = 'חפשי לפי שם מוצר, מותג או קטגוריה...',
}) {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    onQueryChange(value);
  };

  const clear = () => {
    setQuery('');
    onQueryChange('');
  };

  return (
    <div className="w-full max-w-2xl">
      <label htmlFor="product-search" className="sr-only">
        חיפוש מוצרים
      </label>
      <div className="relative flex-1">
        <Search
          className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-gold pointer-events-none"
          size={20}
          aria-hidden
        />
        <input
          id="product-search"
          type="search"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pr-12 pl-10 py-3.5 rounded-full border border-brand-gold/20 bg-white text-brand-dark placeholder:text-brand-dark/40 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold/40 transition-shadow disabled:opacity-60"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-dark text-sm"
            aria-label="ניקוי חיפוש"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

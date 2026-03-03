'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { AddressBook } from '@fleetos/shared';
import { Search, Loader2 } from 'lucide-react';

interface AddressSearchProps {
  onSelect: (entry: AddressBook) => void;
  filterType?: 'consignor' | 'consignee' | 'both';
  placeholder?: string;
}

/**
 * Reusable address book search component.
 * Uses pg_trgm trigram search via Supabase.
 * 3-character minimum trigger, 300ms debounce.
 */
export function AddressSearch({
  onSelect,
  filterType,
  placeholder = 'Search by name (min 3 chars)...',
}: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // 3-char minimum trigger
    if (query.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    // 300ms debounce
    debounceRef.current = setTimeout(async () => {
      setLoading(true);

      let q = supabase
        .from('address_book')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10);

      if (filterType && filterType !== 'both') {
        q = q.in('type', [filterType, 'both']);
      }

      const { data } = await q;
      setResults((data as AddressBook[]) || []);
      setOpen(true);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filterType]);

  function handleSelect(entry: AddressBook) {
    onSelect(entry);
    setQuery(entry.name);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => handleSelect(entry)}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50"
            >
              <div className="font-medium text-text-dark">{entry.name}</div>
              <div className="text-xs text-text-muted">
                {[entry.city, entry.state].filter(Boolean).join(', ')}
                {entry.gst_number && ` | GST: ${entry.gst_number}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 3 && results.length === 0 && !loading && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-text-muted shadow-lg">
          No results found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}

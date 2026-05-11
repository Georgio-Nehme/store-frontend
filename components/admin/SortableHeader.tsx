'use client';

export type SortDir = 'asc' | 'desc';

interface Props {
  label: string;
  column: string;
  sortCol: string;
  sortDir: SortDir;
  onSort: (col: string) => void;
  className?: string;
}

export default function SortableHeader({ label, column, sortCol, sortDir, onSort, className = '' }: Props) {
  const active = sortCol === column;
  return (
    <th
      className={`px-4 py-3 cursor-pointer select-none whitespace-nowrap group ${className}`}
      onClick={() => onSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-xs transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          {active && sortDir === 'asc' ? '↑' : '↓'}
        </span>
      </span>
    </th>
  );
}

export function useSortFilter<T>(
  items: T[],
  defaultCol: string,
  defaultDir: SortDir,
  getVal: (item: T, col: string) => string | number,
  filterFn: (item: T, q: string) => boolean,
) {
  const [sortCol, setSortCol] = useState(defaultCol);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);
  const [query, setQuery] = useState('');

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  const filtered = query.trim()
    ? items.filter(i => filterFn(i, query.toLowerCase()))
    : items;

  const sorted = [...filtered].sort((a, b) => {
    const av = getVal(a, sortCol);
    const bv = getVal(b, sortCol);
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return { sorted, sortCol, sortDir, handleSort, query, setQuery };
}

// Must be imported here since this is a client component using hooks
import { useState } from 'react';

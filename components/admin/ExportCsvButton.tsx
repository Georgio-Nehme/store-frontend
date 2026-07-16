'use client';

import { downloadCsv } from '@/lib/csv';

interface Column<T> {
  label: string;
  value: (item: T) => string | number | null | undefined;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  filename: string;
  className?: string;
}

export default function ExportCsvButton<T>({ data, columns, filename, className = '' }: Props<T>) {
  function handleExport() {
    downloadCsv(filename, columns.map(c => c.label), data.map(item => columns.map(c => c.value(item))));
  }

  return (
    <button
      onClick={handleExport}
      disabled={data.length === 0}
      className={`text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors ${className}`}
    >
      Export CSV
    </button>
  );
}

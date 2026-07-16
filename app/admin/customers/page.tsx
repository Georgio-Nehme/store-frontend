'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminGetCustomersWithStats } from '@/lib/api';
import { CustomerWithStats } from '@/lib/types';
import SortableHeader, { useSortFilter } from '@/components/admin/SortableHeader';
import TableStats from '@/components/admin/TableStats';
import ExportCsvButton from '@/components/admin/ExportCsvButton';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    setLoading(true); setError(null);
    try { setCustomers(await adminGetCustomersWithStats()); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const { sorted, sortCol, sortDir, handleSort, query, setQuery } = useSortFilter(
    customers, 'name', 'asc',
    (c, col) => {
      if (col === 'orders') return c.order_count;
      if (col === 'spent') return parseFloat(c.total_spent || '0');
      if (col === 'joined') return new Date(c.created_at).getTime();
      return (c.name || c.email || '').toLowerCase();
    },
    (c, q) => [c.name, c.email, c.phone, c.address].some(v => v?.toLowerCase().includes(q)),
  );

  const totalRevenue = sorted.reduce((sum, c) => sum + parseFloat(c.total_spent || '0'), 0);
  const avgSpent = sorted.length ? totalRevenue / sorted.length : 0;
  const thCls = 'text-left text-gray-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
        <div className="flex items-center gap-3">
          <ExportCsvButton
            data={sorted}
            filename="customers.csv"
            columns={[
              { label: 'Name', value: c => c.name || '' },
              { label: 'Email', value: c => c.email },
              { label: 'Phone', value: c => c.phone || '' },
              { label: 'Address', value: c => c.address || '' },
              { label: 'Orders', value: c => c.order_count },
              { label: 'Total Spent', value: c => parseFloat(c.total_spent || '0').toFixed(2) },
              { label: 'Joined', value: c => new Date(c.created_at).toLocaleDateString() },
            ]}
          />
          <button onClick={load} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
      </div>

      <TableStats stats={[
        { label: 'Customers', value: sorted.length },
        { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}` },
        { label: 'Avg Spent', value: `$${avgSpent.toFixed(2)}` },
      ]} />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, phone, or address…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {loading ? <div className="animate-pulse bg-white rounded-xl h-64" /> : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className={thCls}>
                <SortableHeader label="Name" column="name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Address</th>
                <SortableHeader label="Orders" column="orders" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right" />
                <SortableHeader label="Total Spent" column="spent" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right" />
                <SortableHeader label="Joined" column="joined" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/admin/customers/${c.id}`)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={c.address || ''}>{c.address || <span className="text-gray-300">No address</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${c.order_count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>{c.order_count}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">${parseFloat(c.total_spent || '0').toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/customers/${c.id}`} className="text-sm text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>View</Link>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-gray-400 text-center">{query ? 'No customers match your search' : 'No customers yet'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

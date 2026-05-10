'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { adminGetProducts, adminGetOrders, adminGetCustomers, adminGetAbandonedCarts, adminGetAnalytics } from '@/lib/api';
import { Product, Order, Customer, AbandonedCart, AnalyticsData } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  pending: '#fbbf24',
  confirmed: '#60a5fa',
  shipped: '#a78bfa',
  delivered: '#34d399',
  cancelled: '#f87171',
};

const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">No prior data</span>;
  const pos = pct >= 0;
  return (
    <span className={`text-xs font-medium ${pos ? 'text-green-600' : 'text-red-500'}`}>
      {pos ? '▲' : '▼'} {Math.abs(pct)}% vs prev period
    </span>
  );
}

function KpiCard({ label, value, sub, growth }: { label: string; value: string; sub?: string; growth?: number | null }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {growth !== undefined && <div className="mt-2"><GrowthBadge pct={growth ?? null} /></div>}
    </div>
  );
}

function fmt(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtShort(n: number) { return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`; }
function fmtDate(iso: unknown) {
  const d = new Date(String(iso));
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [isCustom, setIsCustom] = useState(false);
  const [customStart, setCustomStart] = useState(() => daysAgoStr(30));
  const [customEnd, setCustomEnd] = useState(() => todayStr());

  useEffect(() => {
    Promise.all([adminGetProducts(), adminGetOrders(), adminGetCustomers(), adminGetAbandonedCarts()])
      .then(([p, o, c, a]) => { setProducts(p); setOrders(o); setCustomers(c); setAbandonedCarts(a); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isCustom) {
      if (!customStart || !customEnd || customStart > customEnd) return;
      setAnalyticsLoading(true);
      adminGetAnalytics({ start_date: customStart, end_date: customEnd })
        .then(setAnalytics)
        .finally(() => setAnalyticsLoading(false));
    } else {
      setAnalyticsLoading(true);
      adminGetAnalytics({ days: period })
        .then(setAnalytics)
        .finally(() => setAnalyticsLoading(false));
    }
  }, [period, isCustom, customStart, customEnd]);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const statusPieData = analytics
    ? Object.entries(analytics.orders_by_status).map(([status, count]) => ({ name: status, value: count }))
    : [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Quick stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Products" value={products.length} />
          <StatCard label="All Orders" value={orders.length} />
          <StatCard label="Customers" value={customers.length} />
          <StatCard label="Abandoned Carts" value={abandonedCarts.length} highlight={abandonedCarts.length > 0} />
        </div>
      )}

      {/* Analytics section */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800 mr-2">Analytics</h2>

        {/* Preset + Custom toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setIsCustom(false); setPeriod(opt.value); }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                !isCustom && period === opt.value ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setIsCustom(true)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              isCustom ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Custom date pickers — visible only in custom mode */}
        {isCustom && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={e => setCustomStart(e.target.value)}
              className="text-sm text-gray-700 bg-transparent outline-none"
            />
            <span className="text-gray-400 text-sm">→</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={todayStr()}
              onChange={e => setCustomEnd(e.target.value)}
              className="text-sm text-gray-700 bg-transparent outline-none"
            />
          </div>
        )}
      </div>

      {/* KPI cards */}
      {analyticsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl h-28 animate-pulse" />)}
        </div>
      ) : analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Revenue"
            value={fmt(analytics.kpis.total_revenue)}
            sub={isCustom ? `${customStart} → ${customEnd} (excl. cancelled)` : `Last ${period} days (excl. cancelled)`}
            growth={analytics.kpis.revenue_growth}
          />
          <KpiCard
            label="Orders"
            value={analytics.kpis.total_orders.toLocaleString()}
            sub={isCustom ? `${customStart} → ${customEnd}` : `Last ${period} days`}
            growth={analytics.kpis.orders_growth}
          />
          <KpiCard
            label="Avg Order Value"
            value={fmt(analytics.kpis.avg_order_value)}
            sub="Per completed order"
            growth={analytics.kpis.aov_growth}
          />
          <KpiCard
            label="New Customers"
            value={analytics.kpis.new_customers.toLocaleString()}
            sub={isCustom ? `${customStart} → ${customEnd}` : `Last ${period} days`}
            growth={analytics.kpis.customers_growth}
          />
        </div>
      )}

      {/* Revenue + Orders time-series */}
      {!analyticsLoading && analytics && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Revenue & Orders over time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={analytics.daily_series} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#9ca3af' }} interval={Math.floor(analytics.daily_series.length / 7)} />
              <YAxis yAxisId="revenue" orientation="left" tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#9ca3af' }} width={48} />
              <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} width={32} />
              <Tooltip
                formatter={(value, name) => [name === 'Revenue' ? fmt(Number(value)) : value, name]}
                labelFormatter={fmtDate}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGradient)" dot={false} />
              <Bar yAxisId="orders" dataKey="orders" name="Orders" fill="#e0e7ff" radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* New customers time-series */}
      {!analyticsLoading && analytics && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">New customers over time</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={analytics.daily_series} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="custGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#9ca3af' }} interval={Math.floor(analytics.daily_series.length / 7)} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={32} allowDecimals={false} />
              <Tooltip labelFormatter={fmtDate} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Area type="monotone" dataKey="new_customers" name="New Customers" stroke="#10b981" strokeWidth={2} fill="url(#custGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Orders by status + Top products */}
      {!analyticsLoading && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Orders by status</h3>
            {statusPieData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No orders in this period</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                      {statusPieData.map(entry => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#d1d5db'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {statusPieData.map(entry => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: STATUS_COLORS[entry.name] || '#d1d5db' }} />
                      <span className="capitalize text-gray-600">{entry.name}</span>
                      <span className="ml-auto font-semibold text-gray-800">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Top products by revenue</h3>
            {analytics.top_products.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No sales in this period</p>
            ) : (
              <div className="space-y-3">
                {analytics.top_products.map((p, i) => {
                  const maxRev = analytics.top_products[0].revenue;
                  const pct = maxRev > 0 ? (p.revenue / maxRev) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate max-w-[60%]">{p.name}</span>
                        <div className="text-right shrink-0">
                          <span className="font-semibold text-gray-800">{fmt(p.revenue)}</span>
                          <span className="text-gray-400 text-xs ml-2">{p.units} units</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Abandoned carts */}
      {!loading && abandonedCarts.length > 0 && (
        <div className="bg-white rounded-xl shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛒</span>
              <h2 className="font-semibold text-gray-800">Abandoned Carts</h2>
              <span className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {abandonedCarts.length}
              </span>
            </div>
            <Link href="/admin/customers" className="text-sm text-blue-600 hover:underline">View all customers →</Link>
          </div>
          <div className="divide-y">
            {abandonedCarts.slice(0, 5).map(cart => (
              <div key={cart.id} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">{cart.customer_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500 truncate">{cart.customer_email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cart.items.map(item => (
                      <span key={item.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-1">
                        {item.product_name || 'Unknown'} <span className="text-gray-400">x{item.quantity}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(cart.updated_at).toLocaleDateString()} {new Date(cart.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <Link href={`/admin/customers/${cart.customer_id}`} className="text-xs text-blue-600 hover:underline mt-1 block">
                    View customer →
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {abandonedCarts.length > 5 && (
            <div className="px-6 py-3 border-t text-center">
              <Link href="/admin/customers" className="text-sm text-blue-600 hover:underline">
                +{abandonedCarts.length - 5} more — view all customers
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline">View all →</Link>
        </div>
        {loading ? <div className="animate-pulse h-32 bg-gray-100 rounded" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Order ID</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                  <td className="py-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium capitalize" style={{
                      background: (STATUS_COLORS[order.status] || '#d1d5db') + '22',
                      color: STATUS_COLORS[order.status] || '#6b7280',
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2 font-medium">${parseFloat(order.total_amount).toFixed(2)}</td>
                  <td className="py-2 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && <tr><td colSpan={4} className="py-4 text-gray-400 text-center">No orders yet</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl shadow p-5 ${highlight ? 'bg-amber-50 border border-amber-200' : 'bg-white'}`}>
      <p className={`text-sm ${highlight ? 'text-amber-600' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-3xl font-bold mt-1 ${highlight ? 'text-amber-700' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

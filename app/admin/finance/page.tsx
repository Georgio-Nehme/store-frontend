'use client';

import { useEffect, useState } from 'react';
import { adminGetFinanceReport } from '@/lib/api';
import { FinanceReport } from '@/lib/types';
import ExportCsvButton from '@/components/admin/ExportCsvButton';

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

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminFinancePage() {
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);
  const [isCustom, setIsCustom] = useState(false);
  const [customStart, setCustomStart] = useState(() => daysAgoStr(30));
  const [customEnd, setCustomEnd] = useState(() => todayStr());

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = isCustom ? { start_date: customStart, end_date: customEnd } : { days: period };
    adminGetFinanceReport(params)
      .then(setReport)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load finance report'))
      .finally(() => setLoading(false));
  }, [period, isCustom, customStart, customEnd]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Finance</h1>

      <div className="flex flex-wrap items-center gap-3">
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
        {isCustom && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
            <input type="date" value={customStart} max={customEnd} onChange={e => setCustomStart(e.target.value)} className="text-sm text-gray-700 bg-transparent outline-none" />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" value={customEnd} min={customStart} max={todayStr()} onChange={e => setCustomEnd(e.target.value)} className="text-sm text-gray-700 bg-transparent outline-none" />
          </div>
        )}
      </div>

      {error && <p className="text-red-600 p-3 bg-red-50 rounded-lg text-sm">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)}
        </div>
      ) : report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Gross Revenue" value={fmt(report.gross_revenue)} sub={`${report.period_start} → ${report.period_end}`} />
            <KpiCard label="Tax Collected" value={fmt(report.tax_collected)} />
            <KpiCard label="Refunds Issued" value={fmt(report.refunds_issued)} />
            <KpiCard label="Net Revenue" value={fmt(report.net_revenue)} sub="After refunds" />
            <KpiCard label="COGS" value={fmt(report.cogs)} />
            <KpiCard label="Gross Margin" value={fmt(report.gross_margin)} sub={report.gross_margin_pct !== null ? `${report.gross_margin_pct}% of product revenue` : undefined} />
            <KpiCard label="Discounts Given" value={fmt(report.discounts_given)} />
            <KpiCard label="Invoices Issued" value={String(report.invoice_count)} />
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">Top Products by Margin</h2>
              <ExportCsvButton
                data={report.top_products_by_margin}
                filename="product-margins.csv"
                columns={[
                  { label: 'Product', value: p => p.name },
                  { label: 'Revenue', value: p => p.revenue.toFixed(2) },
                  { label: 'COGS', value: p => p.cogs.toFixed(2) },
                  { label: 'Margin', value: p => p.margin.toFixed(2) },
                  { label: 'Margin %', value: p => p.margin_pct === null ? '' : p.margin_pct.toFixed(1) },
                ]}
              />
            </div>
            {report.top_products_by_margin.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No sales with cost data in this period</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b text-left text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="py-2 pr-2">Product</th>
                    <th className="py-2 pr-2 text-right">Revenue</th>
                    <th className="py-2 pr-2 text-right">COGS</th>
                    <th className="py-2 pr-2 text-right">Margin</th>
                    <th className="py-2 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {report.top_products_by_margin.map(p => (
                    <tr key={p.name} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-2">{p.name}</td>
                      <td className="py-2 pr-2 text-right">{fmt(p.revenue)}</td>
                      <td className="py-2 pr-2 text-right">{fmt(p.cogs)}</td>
                      <td className="py-2 pr-2 text-right">{fmt(p.margin)}</td>
                      <td className="py-2 text-right">{p.margin_pct === null ? '—' : `${p.margin_pct}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

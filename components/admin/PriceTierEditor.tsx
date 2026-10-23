'use client';

export interface PriceTierRow {
  min_quantity: number;
  discount_percent: string;
}

// Editor for quantity-break pricing rows (buy >= N units, get X% off every unit).
// Shared by the New and Edit product forms; the parent owns the array and passes
// it straight into adminCreateProduct/adminUpdateProduct as `price_tiers`.
export function PriceTierEditor({
  tiers,
  onChange,
}: {
  tiers: PriceTierRow[];
  onChange: (tiers: PriceTierRow[]) => void;
}) {
  function updateRow(index: number, patch: Partial<PriceTierRow>) {
    onChange(tiers.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const nextQty = tiers.length ? Math.max(...tiers.map(t => t.min_quantity)) + 1 : 2;
    onChange([...tiers, { min_quantity: nextQty, discount_percent: '' }]);
  }

  function removeRow(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  return (
    <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-700">Quantity Discounts</p>
        <p className="text-xs text-gray-500">
          Buy more, pay less. When a customer buys at least the quantity below, every unit in that
          line gets the discount. Quantity 1 is always the regular price.
        </p>
      </div>

      {tiers.length > 0 && (
        <div className="space-y-2">
          {tiers.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Buy</span>
              <input
                type="number"
                min={2}
                value={row.min_quantity}
                onChange={e => updateRow(index, { min_quantity: Math.max(2, parseInt(e.target.value) || 2) })}
                className="w-20 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500">+ units, get</span>
              <input
                type="number"
                min={0.01}
                max={100}
                step="0.01"
                value={row.discount_percent}
                onChange={e => updateRow(index, { discount_percent: e.target.value })}
                placeholder="%"
                className="w-24 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500">% off</span>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="ml-auto text-red-500 hover:text-red-700 text-sm"
                aria-label="Remove tier"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        + Add quantity discount
      </button>
    </div>
  );
}

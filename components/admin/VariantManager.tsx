'use client';

import { useEffect, useState } from 'react';
import {
  adminCreateVariant,
  adminDeleteProductImage,
  adminDeleteVariant,
  adminGetOptionTypes,
  adminGetProductImages,
  adminGetVariants,
  adminSetProductOptionTypes,
  adminUploadImage,
} from '@/lib/api';
import { OptionType, ProductImage, Variant } from '@/lib/types';

function formatMoney(value: string) {
  return `$${parseFloat(value || '0').toFixed(2)}`;
}

function sortByPosition<T extends { position: number }>(items: T[]) {
  return [...items].sort((a, b) => a.position - b.position);
}

export function VariantManager({
  productId,
  assignedOptionTypes,
  onRefreshProduct,
}: {
  productId: string;
  assignedOptionTypes: OptionType[];
  onRefreshProduct: () => Promise<void>;
}) {
  const [availableTypes, setAvailableTypes] = useState<OptionType[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>(assignedOptionTypes.map(type => type.id));
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [savingTypes, setSavingTypes] = useState(false);
  const [submittingVariant, setSubmittingVariant] = useState(false);
  const [uploadingVariantId, setUploadingVariantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    const [types, variantList, imageList] = await Promise.all([
      adminGetOptionTypes(),
      adminGetVariants(productId),
      adminGetProductImages(productId),
    ]);
    setAvailableTypes(sortByPosition(types));
    setVariants(sortByPosition(variantList));
    setImages(imageList);
  }

  useEffect(() => {
    setSelectedTypeIds(assignedOptionTypes.map(type => type.id));
  }, [assignedOptionTypes]);

  useEffect(() => {
    loadData().catch(() => setError('Failed to load variant data.'));
  }, [productId]);

  const selectedTypes = assignedOptionTypes;

  async function handleSaveAssignedTypes() {
    setSavingTypes(true);
    setError(null);
    try {
      await adminSetProductOptionTypes(productId, selectedTypeIds);
      await Promise.all([loadData(), onRefreshProduct()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save option types');
    } finally {
      setSavingTypes(false);
    }
  }

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault();
    if (selectedTypes.some(type => !formValues[type.id])) {
      setError('Select a value for each assigned option type.');
      return;
    }

    setSubmittingVariant(true);
    setError(null);
    try {
      await adminCreateVariant(productId, {
        sku: sku || undefined,
        price,
        compare_price: comparePrice || null,
        stock,
        is_active: isActive,
        option_value_ids: selectedTypes.map(type => formValues[type.id]),
      });
      setShowAddVariant(false);
      setFormValues({});
      setPrice('');
      setComparePrice('');
      setStock(0);
      setSku('');
      setIsActive(true);
      await Promise.all([loadData(), onRefreshProduct()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create variant');
    } finally {
      setSubmittingVariant(false);
    }
  }

  async function handleDeleteVariant(variantId: string) {
    if (!confirm('Delete this variant?')) return;
    try {
      await adminDeleteVariant(productId, variantId);
      await Promise.all([loadData(), onRefreshProduct()]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleVariantPhotoUpload(variantId: string, file: File) {
    setUploadingVariantId(variantId);
    setError(null);
    try {
      await adminUploadImage(productId, file, variantId);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploadingVariantId(null);
    }
  }

  async function handleDeleteVariantPhoto(imageId: string) {
    if (!confirm('Remove this photo?')) return;
    try {
      await adminDeleteProductImage(productId, imageId);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-gray-800">Variant Manager</h2>
        <p className="text-sm text-gray-500 mt-1">Assign store option types, then create concrete variants.</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Assigned Option Types</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {availableTypes.map(type => (
            <label key={type.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
              <input
                type="checkbox"
                checked={selectedTypeIds.includes(type.id)}
                onChange={e => setSelectedTypeIds(prev =>
                  e.target.checked ? [...prev, type.id] : prev.filter(id => id !== type.id),
                )}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-gray-800">{type.name}</p>
                <p className="text-xs text-gray-500 mt-1">{sortByPosition(type.values).map(value => value.display_value || value.value).join(', ') || 'No values yet'}</p>
              </div>
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSaveAssignedTypes}
          disabled={savingTypes}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 disabled:bg-gray-300"
        >
          {savingTypes ? 'Saving...' : 'Save Option Types'}
        </button>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h3 className="font-medium text-gray-800">Variants</h3>
          <button
            type="button"
            onClick={() => setShowAddVariant(prev => !prev)}
            disabled={selectedTypes.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 self-start sm:self-auto"
          >
            {showAddVariant ? 'Cancel' : 'Add Variant'}
          </button>
        </div>

        {selectedTypes.length === 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Assign at least one option type before creating variants.
          </p>
        )}

        {showAddVariant && selectedTypes.length > 0 && (
          <form onSubmit={handleAddVariant} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-4 mb-4">
            <div className="grid md:grid-cols-2 gap-4">
              {selectedTypes.map(type => (
                <div key={type.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{type.name}</label>
                  <select
                    value={formValues[type.id] || ''}
                    onChange={e => setFormValues(prev => ({ ...prev, [type.id]: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select value</option>
                    {sortByPosition(type.values).map(value => (
                      <option key={value.id} value={value.id}>{value.display_value || value.value}</option>
                    ))}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compare Price</label>
                <input type="number" step="0.01" min="0" value={comparePrice} onChange={e => setComparePrice(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <input type="number" min="0" value={stock} onChange={e => setStock(parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Active variant
            </label>
            <button type="submit" disabled={submittingVariant} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300">
              {submittingVariant ? 'Adding...' : 'Create Variant'}
            </button>
          </form>
        )}

        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Photo</th>
                <th className="px-4 py-3 text-left">Option Values</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">Active</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map(variant => {
                const variantPhoto = images.find(img => img.variant_id === variant.id && img.status === 'ready');
                return (
                  <tr key={variant.id} className="border-t">
                    <td className="px-4 py-3">
                      {variantPhoto ? (
                        <div className="relative w-10 h-10 rounded-lg border overflow-hidden bg-gray-50 group">
                          <img src={variantPhoto.small_url ?? ''} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleDeleteVariantPhoto(variantPhoto.id)}
                            className="absolute inset-0 bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            title="Remove photo"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <label className="flex w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 items-center justify-center text-gray-400 text-xs cursor-pointer hover:border-blue-400">
                          {uploadingVariantId === variant.id ? '…' : '+'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="sr-only"
                            disabled={uploadingVariantId === variant.id}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleVariantPhotoUpload(variant.id, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </td>
                    <td className="px-4 py-3">{variant.option_values.map(value => `${value.option_type_name}: ${value.value}`).join(' / ')}</td>
                    <td className="px-4 py-3">{formatMoney(variant.price)}</td>
                    <td className="px-4 py-3">{variant.stock}</td>
                    <td className="px-4 py-3 font-mono text-xs">{variant.sku || '—'}</td>
                    <td className="px-4 py-3">{variant.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDeleteVariant(variant.id)} className="text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                );
              })}
              {variants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No variants yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

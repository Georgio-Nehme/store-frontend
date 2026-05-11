'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProductPreviewPanel } from './ProductPreviewPanel';
import {
  adminAddOptionChoice,
  adminCreateOptionGroup,
  adminCreateVariant,
  adminDeleteOptionChoice,
  adminDeleteOptionGroup,
  adminDeleteVariant,
  adminGetCategories,
  adminGetOptionGroups,
  adminGetOptionTypes,
  adminGetProduct,
  adminGetProductImages,
  adminGetVariants,
  adminSetProductOptionTypes,
  adminUpdateProduct,
  adminUpdateProductImage,
  adminUpdateStock,
  adminUploadImage,
  adminDeleteProductImage,
} from '@/lib/api';
import { Category, InputType, OptionGroup, OptionType, Product, ProductImage, ProductType, Variant } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  ready: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
};

function formatMoney(value: string) {
  return `$${parseFloat(value || '0').toFixed(2)}`;
}

function sortByPosition<T extends { position: number }>(items: T[]) {
  return [...items].sort((a, b) => a.position - b.position);
}

function buildCategoryOptions(categories: Category[]) {
  const byParent = new Map<string | null, Category[]>();
  categories.forEach(category => {
    const current = byParent.get(category.parent_id) ?? [];
    current.push(category);
    byParent.set(category.parent_id, current);
  });

  const result: { id: string; label: string }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const items = [...(byParent.get(parentId) ?? [])].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    items.forEach(item => {
      result.push({ id: item.id, label: `${'— '.repeat(depth)}${item.name}` });
      walk(item.id, depth + 1);
    });
  };

  walk(null, 0);
  return result;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function ImageManager({ productId, onImagesChange }: { productId: string; onImagesChange?: (imgs: ProductImage[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Keep parent in sync whenever images change
  const onImagesChangeRef = useRef(onImagesChange);
  onImagesChangeRef.current = onImagesChange;
  useEffect(() => {
    onImagesChangeRef.current?.(images);
  }, [images]);

  function sortImages(imgs: ProductImage[]) {
    return [...imgs].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return a.position - b.position;
    });
  }

  async function loadImages() {
    try {
      const imgs = await adminGetProductImages(productId);
      setImages(sortImages(imgs));
    } catch {
      setImages([]);
    }
  }

  useEffect(() => {
    loadImages();
  }, [productId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed.');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const newImage = await adminUploadImage(productId, file);
      setImages(prev => sortImages([...prev, newImage]));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSetPrimary(imageId: string) {
    try {
      await adminUpdateProductImage(productId, imageId, { is_primary: true });
      await loadImages();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to set primary');
    }
  }

  async function handleDelete(imageId: string) {
    if (!confirm('Delete this image?')) return;
    try {
      await adminDeleteProductImage(productId, imageId);
      await loadImages();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold text-gray-700 mb-4">Product Images</h2>

      <label className={`inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        uploading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={uploading}
          onChange={handleUpload}
        />
        {uploading ? 'Uploading…' : '+ Upload Image'}
      </label>
      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP or GIF · max 10 MB</p>

      {uploadError && (
        <p className="text-red-600 text-sm mt-2 p-2 bg-red-50 rounded-lg">{uploadError}</p>
      )}

      {images.length === 0 ? (
        <p className="text-gray-400 text-sm mt-6 text-center py-8 border-2 border-dashed rounded-xl">
          No images yet. Upload one above.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map(img => (
            <div
              key={img.id}
              className={`relative rounded-xl overflow-hidden border-2 ${img.is_primary ? 'border-blue-500' : 'border-gray-200'} bg-gray-100`}
            >
              <div className="h-32 flex items-center justify-center">
                {img.status === 'ready' && img.small_url ? (
                  <img src={img.small_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 p-2 text-center">
                    <StatusBadge status={img.status} />
                    {img.status === 'failed' && img.error_message && (
                      <p className="text-xs text-red-500 mt-1 leading-tight line-clamp-2">{img.error_message}</p>
                    )}
                  </div>
                )}
              </div>

              {img.is_primary && (
                <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                  Primary
                </span>
              )}

              <div className="flex gap-1 p-1.5 bg-white border-t text-center">
                {img.status === 'ready' && !img.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(img.id)}
                    className="flex-1 text-xs text-blue-600 hover:underline"
                  >
                    Set primary
                  </button>
                )}
                <button
                  onClick={() => handleDelete(img.id)}
                  className="flex-1 text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VariantManager({
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
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    const [types, variantList] = await Promise.all([adminGetOptionTypes(), adminGetVariants(productId)]);
    setAvailableTypes(sortByPosition(types));
    setVariants(sortByPosition(variantList));
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

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-6">
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-800">Variants</h3>
          <button
            type="button"
            onClick={() => setShowAddVariant(prev => !prev)}
            disabled={selectedTypes.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300"
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
                <th className="px-4 py-3 text-left">Option Values</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">Active</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map(variant => (
                <tr key={variant.id} className="border-t">
                  <td className="px-4 py-3">{variant.option_values.map(value => `${value.option_type_name}: ${value.value}`).join(' / ')}</td>
                  <td className="px-4 py-3">{formatMoney(variant.price)}</td>
                  <td className="px-4 py-3">{variant.stock}</td>
                  <td className="px-4 py-3 font-mono text-xs">{variant.sku || '—'}</td>
                  <td className="px-4 py-3">{variant.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDeleteVariant(variant.id)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {variants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No variants yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OptionGroupManager({ productId, onRefreshProduct }: { productId: string; onRefreshProduct: () => Promise<void> }) {
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<InputType>('single');
  const [groupRequired, setGroupRequired] = useState(false);
  const [choiceForms, setChoiceForms] = useState<Record<string, { label: string; price_add_on: string; is_default: boolean }>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadGroups() {
    const nextGroups = await adminGetOptionGroups(productId);
    setGroups(sortByPosition(nextGroups).map(group => ({ ...group, choices: sortByPosition(group.choices) })));
  }

  useEffect(() => {
    loadGroups().catch(() => setError('Failed to load option groups.'));
  }, [productId]);

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await adminCreateOptionGroup(productId, {
        name: groupName,
        input_type: groupType,
        required: groupRequired,
      });
      setGroupName('');
      setGroupType('single');
      setGroupRequired(false);
      setShowAddGroup(false);
      await Promise.all([loadGroups(), onRefreshProduct()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create option group');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm('Delete this option group?')) return;
    try {
      await adminDeleteOptionGroup(productId, groupId);
      await Promise.all([loadGroups(), onRefreshProduct()]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleAddChoice(groupId: string) {
    const form = choiceForms[groupId];
    if (!form?.label) return;
    try {
      await adminAddOptionChoice(productId, groupId, {
        label: form.label,
        price_add_on: form.price_add_on || '0',
        is_default: form.is_default,
      });
      setChoiceForms(prev => ({ ...prev, [groupId]: { label: '', price_add_on: '0', is_default: false } }));
      await Promise.all([loadGroups(), onRefreshProduct()]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add choice');
    }
  }

  async function handleDeleteChoice(groupId: string, choiceId: string) {
    if (!confirm('Delete this choice?')) return;
    try {
      await adminDeleteOptionChoice(productId, groupId, choiceId);
      await Promise.all([loadGroups(), onRefreshProduct()]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800">Option Group Manager</h2>
          <p className="text-sm text-gray-500 mt-1">Create configurable add-ons and custom inputs.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddGroup(prev => !prev)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          {showAddGroup ? 'Cancel' : 'Add Group'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {showAddGroup && (
        <form onSubmit={handleAddGroup} className="border border-gray-200 rounded-xl p-4 bg-gray-50 grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
            <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Input Type</label>
            <select value={groupType} onChange={e => setGroupType(e.target.value as InputType)} className="w-full border rounded-lg px-3 py-2">
              <option value="single">Single choice</option>
              <option value="multi">Multiple choice</option>
              <option value="text">Text</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
            <input type="checkbox" checked={groupRequired} onChange={e => setGroupRequired(e.target.checked)} />
            Required
          </label>
          <div className="md:col-span-2">
            <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300">
              {submitting ? 'Saving...' : 'Create Group'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {groups.map(group => {
          const form = choiceForms[group.id] ?? { label: '', price_add_on: '0', is_default: false };
          return (
            <div key={group.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-800">{group.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{group.input_type} · {group.required ? 'Required' : 'Optional'}</p>
                </div>
                <button onClick={() => handleDeleteGroup(group.id)} className="text-red-500 text-sm hover:underline">Delete Group</button>
              </div>

              {group.input_type === 'text' ? (
                <p className="text-sm text-gray-500 mt-3">Customers enter free-form text for this option.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {group.choices.map(choice => (
                      <span key={choice.id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                        {choice.label} ({parseFloat(choice.price_add_on) > 0 ? `+${formatMoney(choice.price_add_on)}` : 'Included'})
                        {choice.is_default && <span className="text-xs text-blue-600">Default</span>}
                        <button onClick={() => handleDeleteChoice(group.id, choice.id)} className="text-red-500 hover:text-red-700">×</button>
                      </span>
                    ))}
                    {group.choices.length === 0 && <p className="text-sm text-gray-400">No choices yet.</p>}
                  </div>

                  <div className="grid md:grid-cols-[2fr_1fr_auto] gap-3 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Choice label</label>
                      <input
                        type="text"
                        value={form.label}
                        onChange={e => setChoiceForms(prev => ({ ...prev, [group.id]: { ...form, label: e.target.value } }))}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price add-on</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price_add_on}
                        onChange={e => setChoiceForms(prev => ({ ...prev, [group.id]: { ...form, price_add_on: e.target.value } }))}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <button type="button" onClick={() => handleAddChoice(group.id)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
                      Add Choice
                    </button>
                  </div>
                  {group.input_type === 'single' && (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.is_default}
                        onChange={e => setChoiceForms(prev => ({ ...prev, [group.id]: { ...form, is_default: e.target.checked } }))}
                      />
                      Default selection
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {groups.length === 0 && <p className="text-sm text-gray-400">No option groups yet.</p>}
      </div>
    </div>
  );
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [productType, setProductType] = useState<ProductType>('simple');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockChange, setStockChange] = useState(0);
  const [stockReason, setStockReason] = useState('');
  const [stockMsg, setStockMsg] = useState('');
  const [saved, setSaved] = useState(false);
  const [previewImages, setPreviewImages] = useState<ProductImage[]>([]);

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);

  async function loadProduct(populateForm = false) {
    const nextProduct = await adminGetProduct(id);
    setProduct(nextProduct);
    if (populateForm) {
      setName(nextProduct.name);
      setDescription(nextProduct.description || '');
      setPrice(nextProduct.price);
      setComparePrice(nextProduct.compare_price || '');
      setStock(nextProduct.stock);
      setSku(nextProduct.sku || '');
      setIsActive(nextProduct.is_active);
      setProductType(nextProduct.product_type);
      setCategoryId(nextProduct.category_id || '');
    }
  }

  useEffect(() => {
    Promise.all([
      adminGetCategories().then(setCategories),
      loadProduct(true),
    ]).catch(err => setError(err instanceof Error ? err.message : 'Failed to load product'));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const updated = await adminUpdateProduct(id, {
        name,
        description,
        price,
        compare_price: comparePrice || null,
        stock: productType === 'variable' ? undefined : stock,
        sku: sku || undefined,
        is_active: isActive,
        product_type: productType,
        category_id: categoryId || null,
      });
      setProduct(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  }

  async function handleStockAdjust(e: React.FormEvent) {
    e.preventDefault();
    try {
      const updated = await adminUpdateStock(id, stockChange, stockReason || undefined);
      setStock(updated.stock);
      setProduct(updated);
      setStockMsg('Stock updated to ' + updated.stock);
      setStockChange(0);
      setStockReason('');
      setTimeout(() => setStockMsg(''), 3000);
    } catch (err: unknown) {
      setStockMsg(err instanceof Error ? err.message : 'Failed');
    }
  }

  if (!product) return <div className="animate-pulse bg-white rounded-xl h-64 max-w-lg" />;

  return (
    <div>
      <Link href="/admin/products" className="text-blue-600 hover:underline text-sm mb-6 block">← Back</Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Product</h1>
      <div className="space-y-6 max-w-5xl">
        <div className="grid xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              {error && <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">{error}</p>}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {!product.can_change_type ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-medium text-amber-800 capitalize">Product Type: {product.product_type}</p>
                    <p className="text-xs text-amber-700 mt-1">Remove all variants or option groups to change type.</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                    <select value={productType} onChange={e => setProductType(e.target.value as ProductType)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="simple">Simple</option>
                      <option value="variable">Variable</option>
                      <option value="configurable">Configurable</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Uncategorized</option>
                    {categoryOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compare Price (original/was price)</label>
                  <input type="number" step="0.01" min="0" value={comparePrice} onChange={e => setComparePrice(e.target.value)} placeholder="Leave blank to remove sale badge" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {productType !== 'variable' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                    <input type="number" min="0" value={stock} onChange={e => setStock(parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Stock is managed via variants.
                  </p>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors">
                  {loading ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
                </button>
              </form>
            </div>

            {product.product_type !== 'variable' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="font-semibold text-gray-700 mb-4">Stock Adjustment (current: {stock})</h2>
                {stockMsg && <p className="text-sm mb-3 p-2 bg-blue-50 text-blue-700 rounded">{stockMsg}</p>}
                <form onSubmit={handleStockAdjust} className="flex flex-col gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Change (positive or negative)</label>
                    <input type="number" value={stockChange} onChange={e => setStockChange(parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                    <input type="text" value={stockReason} onChange={e => setStockReason(e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. restocking, damage..." />
                  </div>
                  <button type="submit" className="bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-800 font-medium transition-colors">
                    Apply Stock Change
                  </button>
                </form>
              </div>
            )}

            {product.product_type === 'variable' && (
              <VariantManager productId={id} assignedOptionTypes={product.option_types ?? []} onRefreshProduct={() => loadProduct(false)} />
            )}

            {product.product_type === 'configurable' && (
              <OptionGroupManager productId={id} onRefreshProduct={() => loadProduct(false)} />
            )}
          </div>

          <div className="space-y-6">
            <ProductPreviewPanel
              name={name}
              description={description}
              price={price}
              comparePrice={comparePrice}
              isActive={isActive}
              productType={productType}
              product={product}
              images={previewImages}
              categories={categories}
              categoryId={categoryId}
            />
            <ImageManager productId={id} onImagesChange={setPreviewImages} />
          </div>
        </div>
      </div>
    </div>
  );
}

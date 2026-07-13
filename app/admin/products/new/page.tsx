'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminCreateProduct, adminGetCategories, adminUploadImage } from '@/lib/api';
import { Category, ProductImage, ProductType } from '@/lib/types';
import { VariantManager } from '@/components/admin/VariantManager';

interface UploadedImageItem {
  image: ProductImage;
  previewUrl: string;
  name: string;
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

export default function NewProductPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [productType, setProductType] = useState<ProductType>('simple');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    adminGetCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const product = await adminCreateProduct({
        name,
        description,
        price,
        compare_price: comparePrice || undefined,
        stock: productType === 'variable' ? 0 : stock,
        sku: sku || undefined,
        is_active: isActive,
        product_type: productType,
        category_id: categoryId || null,
      });
      setCreatedProductId(product.id);
      setSuccessMsg('Product created! You can now upload images below.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!createdProductId || selectedFiles.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const nextItems: UploadedImageItem[] = [];
      for (const file of selectedFiles) {
        const image = await adminUploadImage(createdProductId, file);
        nextItems.push({
          image,
          previewUrl: image.small_url || URL.createObjectURL(file),
          name: file.name,
        });
      }
      setUploadedImages(prev => [...prev, ...nextItems]);
      setSelectedFiles([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Link href="/admin/products" className="text-blue-600 hover:underline text-sm mb-6 block">← Back</Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Product</h1>
      <div className="max-w-3xl space-y-6">
        <div className="bg-white rounded-xl shadow p-6 max-w-lg">
          {error && <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">{error}</p>}
          {successMsg && <p className="text-green-600 text-sm mb-4 p-3 bg-green-50 rounded-lg">{successMsg}</p>}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Name *">
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input" />
            </Field>
            <Field label="Description">
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="input" />
            </Field>
            <Field label="Product Type *">
              <select value={productType} onChange={e => setProductType(e.target.value as ProductType)} className="input">
                <option value="simple">Simple</option>
                <option value="variable">Variable</option>
                <option value="configurable">Configurable</option>
              </select>
            </Field>
            <Field label="Category">
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input">
                <option value="">Uncategorized</option>
                {categoryOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Price *">
              <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required className="input" />
            </Field>
            <Field label="Compare Price (original/was price)">
              <input type="number" step="0.01" min="0" value={comparePrice} onChange={e => setComparePrice(e.target.value)} placeholder="Leave blank for no sale badge" className="input" />
            </Field>
            {productType === 'variable' ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Stock is managed via variants.
              </p>
            ) : (
              <Field label="Stock">
                <input type="number" min="0" value={stock} onChange={e => setStock(parseInt(e.target.value) || 0)} className="input" />
              </Field>
            )}
            <Field label="SKU">
              <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="input" />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
            <button type="submit" disabled={loading || !!createdProductId} className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors">
              {loading ? 'Creating...' : createdProductId ? 'Product Created' : 'Create Product'}
            </button>
          </form>
        </div>

        {createdProductId && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Product Created! Now add images</h2>
            <p className="text-sm text-gray-500 mb-4">Upload one or more product images without leaving this page.</p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                className="bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-900 disabled:bg-gray-300 font-medium transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload Images'}
              </button>
            </div>

            {selectedFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">Selected: {selectedFiles.map(file => file.name).join(', ')}</p>
            )}

            {uploadedImages.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-700 mb-3">Uploaded Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uploadedImages.map(item => (
                    <div key={item.image.id} className="border rounded-xl overflow-hidden bg-gray-50">
                      <div className="aspect-square bg-white flex items-center justify-center overflow-hidden">
                        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-600 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.image.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push('/admin/products')}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Done - Go to Products List
              </button>
              <Link href="/admin/products" className="py-2 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-center">
                Go to Products
              </Link>
            </div>
          </div>
        )}

        {createdProductId && productType === 'variable' && (
          <VariantManager
            productId={createdProductId}
            assignedOptionTypes={[]}
            onRefreshProduct={async () => {}}
          />
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="[&_.input]:w-full [&_.input]:border [&_.input]:rounded-lg [&_.input]:px-3 [&_.input]:py-2 [&_.input]:focus:outline-none [&_.input]:focus:ring-2 [&_.input]:focus:ring-blue-500">
        {children}
      </div>
    </div>
  );
}

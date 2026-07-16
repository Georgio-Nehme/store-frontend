'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProductPreviewPanel } from './ProductPreviewPanel';
import { VariantManager } from '@/components/admin/VariantManager';
import { OptionGroupManager } from '@/components/admin/OptionGroupManager';
import {
  adminGetCategories,
  adminGetProduct,
  adminGetProductImages,
  adminUpdateProduct,
  adminUpdateProductImage,
  adminUpdateStock,
  adminUploadImage,
  adminDeleteProductImage,
  getStoreSettings,
} from '@/lib/api';
import { Category, Product, ProductImage, ProductType, StoreSettings } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  ready: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
};

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

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [productType, setProductType] = useState<ProductType>('simple');
  const [categoryId, setCategoryId] = useState('');
  const [moq, setMoq] = useState(1);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isLimitedTime, setIsLimitedTime] = useState(false);
  const [limitedTimeEndsAt, setLimitedTimeEndsAt] = useState('');
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockChange, setStockChange] = useState(0);
  const [stockReason, setStockReason] = useState('');
  const [stockMsg, setStockMsg] = useState('');
  const [saved, setSaved] = useState(false);
  const [previewImages, setPreviewImages] = useState<ProductImage[]>([]);
  const [switchingType, setSwitchingType] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);

  async function loadProduct(populateForm = false) {
    const nextProduct = await adminGetProduct(id);
    setProduct(nextProduct);
    if (populateForm) {
      setName(nextProduct.name);
      setDescription(nextProduct.description || '');
      setPrice(nextProduct.price);
      setComparePrice(nextProduct.compare_price || '');
      setCost(nextProduct.cost || '');
      setStock(nextProduct.stock);
      setSku(nextProduct.sku || '');
      setIsActive(nextProduct.is_active);
      setProductType(nextProduct.product_type);
      setCategoryId(nextProduct.category_id || '');
      setMoq(nextProduct.moq);
      setIsBestSeller(nextProduct.is_best_seller);
      setIsLimitedTime(nextProduct.is_limited_time);
      setLimitedTimeEndsAt(toDatetimeLocal(nextProduct.limited_time_ends_at));
    }
  }

  useEffect(() => {
    Promise.all([
      adminGetCategories().then(setCategories),
      getStoreSettings().then(setStoreSettings).catch(() => setStoreSettings(null)),
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
        cost: cost || null,
        stock: productType === 'variable' ? undefined : stock,
        sku: sku || undefined,
        is_active: isActive,
        product_type: productType,
        category_id: categoryId || null,
        moq,
        is_best_seller: isBestSeller,
        is_limited_time: isLimitedTime,
        limited_time_ends_at: isLimitedTime && limitedTimeEndsAt ? new Date(limitedTimeEndsAt).toISOString() : null,
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

  async function handleProductTypeChange(nextType: ProductType) {
    const previousType = productType;
    setProductType(nextType);
    if (!product || nextType === product.product_type) return;

    setTypeError(null);
    setSwitchingType(true);
    try {
      const updated = await adminUpdateProduct(id, { product_type: nextType });
      setProduct(updated);
    } catch (err: unknown) {
      setProductType(previousType);
      setTypeError(err instanceof Error ? err.message : 'Failed to switch product type');
    } finally {
      setSwitchingType(false);
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
                    <select
                      value={productType}
                      onChange={e => handleProductTypeChange(e.target.value as ProductType)}
                      disabled={switchingType}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="simple">Simple</option>
                      <option value="variable">Variable</option>
                      <option value="configurable">Configurable</option>
                    </select>
                    {switchingType && <p className="text-xs text-gray-500 mt-1">Switching product type…</p>}
                    {typeError && <p className="text-xs text-red-600 mt-1">{typeError}</p>}
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
                {storeSettings?.finance_plugin_enabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                    <input type="number" step="0.01" min="0" value={cost} onChange={e => setCost(e.target.value)} placeholder="Used for margin reporting" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Quantity</label>
                  <input type="number" min={1} value={moq} onChange={e => setMoq(Math.max(1, parseInt(e.target.value) || 1))} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                {storeSettings?.tag_best_seller_enabled && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isBestSeller} onChange={e => setIsBestSeller(e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm font-medium text-gray-700">Mark as Best Seller</span>
                  </label>
                )}
                {storeSettings?.tag_limited_time_enabled && (
                  <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isLimitedTime} onChange={e => setIsLimitedTime(e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm font-medium text-gray-700">Limited Time Only</span>
                    </label>
                    {isLimitedTime && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ends at (optional)</label>
                        <input
                          type="datetime-local"
                          value={limitedTimeEndsAt}
                          onChange={e => setLimitedTimeEndsAt(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}
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
              moq={moq}
              isBestSeller={isBestSeller}
              isLimitedTime={isLimitedTime}
              limitedTimeEndsAt={limitedTimeEndsAt}
              storeSettings={storeSettings}
            />
            <ImageManager productId={id} onImagesChange={setPreviewImages} />
          </div>
        </div>
      </div>
    </div>
  );
}

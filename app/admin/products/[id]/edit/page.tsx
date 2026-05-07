'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getProduct,
  adminUpdateProduct,
  adminUpdateStock,
  adminGetProductImages,
  adminPresignImage,
  uploadImageToS3,
  adminUpdateProductImage,
  adminDeleteProductImage,
} from '@/lib/api';
import { Product, ProductImage } from '@/lib/types';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  ready:      'bg-green-100 text-green-800',
  pending:    'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  failed:     'bg-red-100 text-red-800',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ─── Image manager ────────────────────────────────────────────────────────────

function ImageManager({ productId }: { productId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // silently ignore on background polls
    }
  }

  useEffect(() => {
    loadImages();
    // Auto-refresh every 15 s while any image is still processing
    pollRef.current = setInterval(() => {
      setImages(prev => {
        const hasPending = prev.some(i => i.status === 'pending' || i.status === 'processing');
        if (hasPending) loadImages();
        return prev;
      });
    }, 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const presign = await adminPresignImage(productId, file.name, file.type);
      await uploadImageToS3(presign.upload_url, file);
      await loadImages();
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
          {images.map((img) => (
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
                    {(img.status === 'pending' || img.status === 'processing') && (
                      <p className="text-xs text-gray-400 mt-1">Processing… refreshing every 15s</p>
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

// ─── Edit product page ────────────────────────────────────────────────────────

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockChange, setStockChange] = useState(0);
  const [stockReason, setStockReason] = useState('');
  const [stockMsg, setStockMsg] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProduct(id).then(p => {
      setProduct(p);
      setName(p.name);
      setDescription(p.description || '');
      setPrice(p.price);
      setComparePrice(p.compare_price || '');
      setStock(p.stock);
      setSku(p.sku || '');
      setIsActive(p.is_active);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await adminUpdateProduct(id, {
        name,
        description,
        price,
        compare_price: comparePrice || null,
        sku: sku || undefined,
        is_active: isActive,
      });
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
      <div className="max-w-lg space-y-6">

        {/* Product details */}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compare Price (original/was price)</label>
              <input type="number" step="0.01" min="0" value={comparePrice} onChange={e => setComparePrice(e.target.value)} placeholder="Leave blank to remove sale badge" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
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

        {/* Stock adjustment */}
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

        {/* Image manager */}
        <ImageManager productId={id} />
      </div>
    </div>
  );
}

'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { Category, OptionGroup, OptionType, Product, ProductImage, ProductTag, ProductType, StoreSettings, Variant } from '@/lib/types';
import ProductTags from '@/components/ProductTags';

function isHexColor(val: string | null | undefined): boolean {
  return !!val && /^#[0-9A-Fa-f]{3,8}$/.test(val.trim());
}

function formatMoney(value: string | number) {
  const n = typeof value === 'number' ? value : parseFloat(value || '0');
  return `$${n.toFixed(2)}`;
}

function sorted<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

interface Props {
  name: string;
  description: string;
  price: string;
  comparePrice: string;
  isActive: boolean;
  productType: ProductType;
  product: Product | null;
  images: ProductImage[];
  categories: Category[];
  categoryId: string;
  moq: number;
  isBestSeller: boolean;
  isLimitedTime: boolean;
  limitedTimeEndsAt: string;
  storeSettings: StoreSettings | null;
}

export function ProductPreviewPanel({
  name,
  description,
  price,
  comparePrice,
  isActive,
  productType,
  product,
  images,
  categories,
  categoryId,
  moq,
  isBestSeller,
  isLimitedTime,
  limitedTimeEndsAt,
  storeSettings,
}: Props) {
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const [groupSelections, setGroupSelections] = useState<Record<string, { ids: string[]; text: string }>>({});
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  // Reset selections when product type changes
  useEffect(() => {
    setSelectedValues({});
    setGroupSelections({});
  }, [productType]);

  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

  const category = categories.find(c => c.id === categoryId) ?? product?.category ?? null;

  const optionTypes: OptionType[] = product?.option_types ? sorted(product.option_types) : [];
  const optionGroups: OptionGroup[] = product?.option_groups ? sorted(product.option_groups) : [];
  const variants: Variant[] = product?.variants ? sorted(product.variants) : [];

  const selectedVariant = useMemo<Variant | null>(() => {
    if (productType !== 'variable') return null;
    if (!optionTypes.every(t => selectedValues[t.id])) return null;
    return variants.find(v =>
      v.is_active && optionTypes.every(t =>
        v.option_values.some(ov => ov.option_type_id === t.id && ov.option_value_id === selectedValues[t.id]),
      ),
    ) ?? null;
  }, [optionTypes, selectedValues, variants, productType]);

  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.position - b.position;
  });

  const displayImages = useMemo(() => {
    if (!selectedVariant) return sortedImages.filter(img => !img.variant_id);
    const variantImages = sortedImages.filter(img => img.variant_id === selectedVariant.id);
    return variantImages.length ? variantImages : sortedImages.filter(img => !img.variant_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, selectedVariant]);

  // Keep activeImgIdx in bounds when the displayed image set changes
  useEffect(() => {
    setActiveImgIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant?.id, images.length]);

  const activeImage = displayImages[activeImgIdx] ?? null;

  const livePrice = useMemo(() => {
    if (productType !== 'configurable') return price || '0';
    const addOn = optionGroups.reduce((sum, g) => {
      const sel = groupSelections[g.id];
      if (!sel) return sum;
      return sum + sel.ids.reduce((s, cid) => {
        const choice = g.choices.find(c => c.id === cid);
        return choice ? s + parseFloat(choice.price_add_on) : s;
      }, 0);
    }, 0);
    return (parseFloat(price || '0') + addOn).toFixed(2);
  }, [groupSelections, optionGroups, price, productType]);

  const displayedPrice = productType === 'variable' ? (selectedVariant?.price ?? price) : livePrice;

  const inStock = productType === 'variable'
    ? (selectedVariant ? selectedVariant.stock > 0 : false)
    : (product?.in_stock ?? false);

  const stockLabel = productType === 'variable'
    ? (selectedVariant ? `${selectedVariant.stock} in stock` : 'Select options to see availability')
    : (product?.in_stock ? `${product.stock} in stock` : 'Out of stock');

  const previewTags = useMemo<ProductTag[]>(() => {
    const tags: ProductTag[] = [];
    if (!storeSettings) return tags;
    if (isBestSeller && storeSettings.tag_best_seller_enabled) tags.push('best_seller');
    if (
      isLimitedTime &&
      storeSettings.tag_limited_time_enabled &&
      (!limitedTimeEndsAt || new Date(limitedTimeEndsAt) > new Date())
    ) {
      tags.push('limited_time');
    }
    if (storeSettings.tag_low_stock_enabled && inStock) {
      const stockForTag = productType === 'variable' ? (selectedVariant?.stock ?? 0) : (product?.stock ?? 0);
      if (stockForTag <= storeSettings.low_stock_threshold) tags.push('low_stock');
    }
    return tags;
  }, [storeSettings, isBestSeller, isLimitedTime, limitedTimeEndsAt, inStock, productType, selectedVariant, product]);

  return (
    <div className="bg-white rounded-xl shadow p-5 sticky top-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700 text-sm">Customer Preview</h2>
        {!isActive && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500 font-medium">Inactive</span>
        )}
      </div>

      {/* Hero image */}
      <div className="bg-gray-100 rounded-xl overflow-hidden h-52 flex items-center justify-center mb-3">
        {activeImage?.medium_url ? (
          <img src={activeImage.medium_url} alt={name} className="w-full h-full object-contain" />
        ) : (
          <span className="text-5xl font-bold text-gray-300">{initials}</span>
        )}
      </div>

      {/* Thumbnail strip */}
      {displayImages.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
          {displayImages.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveImgIdx(i)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                i === activeImgIdx ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
              }`}
            >
              {img.small_url ? (
                <img src={img.small_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400 font-bold">
                  {initials}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        {/* Category badge */}
        {category && (
          <span className="inline-flex w-fit px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
            {category.name}
          </span>
        )}

        <ProductTags tags={previewTags} />

        {/* Name */}
        <h3 className="font-bold text-gray-800 text-lg leading-tight">
          {name || <span className="text-gray-300 italic">Product name</span>}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-blue-600">{formatMoney(displayedPrice)}</p>
          {comparePrice && parseFloat(comparePrice) > parseFloat(displayedPrice || '0') && productType !== 'variable' && (
            <p className="text-sm text-gray-400 line-through">{formatMoney(comparePrice)}</p>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        )}

        {/* Variable: option type pickers */}
        {productType === 'variable' && optionTypes.length > 0 && (
          <div className="space-y-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
            {optionTypes.map(type => (
              <div key={type.id}>
                <p className="text-xs font-medium text-gray-600 mb-1.5">{type.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {sorted(type.values).map(val => {
                    const isSelected = selectedValues[type.id] === val.id;
                    if (isHexColor(val.display_value)) {
                      return (
                        <button
                          key={val.id}
                          type="button"
                          title={val.value}
                          onClick={() => setSelectedValues(prev => ({ ...prev, [type.id]: val.id }))}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${
                            isSelected
                              ? 'border-blue-600 scale-110 shadow-md ring-2 ring-blue-200'
                              : 'border-white shadow hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: val.display_value! }}
                        />
                      );
                    }
                    return (
                      <button
                        key={val.id}
                        type="button"
                        onClick={() => setSelectedValues(prev => ({ ...prev, [type.id]: val.id }))}
                        className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                        }`}
                      >
                        {val.display_value || val.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Configurable: option group pickers */}
        {productType === 'configurable' && optionGroups.length > 0 && (
          <div className="space-y-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
            {optionGroups.map(group => {
              const sel = groupSelections[group.id] ?? { ids: [], text: '' };
              return (
                <div key={group.id}>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">
                    {group.name}
                    {group.required && <span className="text-red-400 ml-1">*</span>}
                  </p>
                  {group.input_type === 'text' ? (
                    <input
                      type="text"
                      value={sel.text}
                      onChange={e => setGroupSelections(prev => ({ ...prev, [group.id]: { ...sel, text: e.target.value } }))}
                      className="w-full border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder={`Enter ${group.name.toLowerCase()}`}
                    />
                  ) : (
                    <div className="space-y-1">
                      {sorted(group.choices).map(choice => {
                        const checked = sel.ids.includes(choice.id);
                        return (
                          <label
                            key={choice.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs cursor-pointer hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type={group.input_type === 'single' ? 'radio' : 'checkbox'}
                                name={`preview-${group.id}`}
                                checked={checked}
                                onChange={() => {
                                  const ids = group.input_type === 'single'
                                    ? [choice.id]
                                    : checked
                                      ? sel.ids.filter(i => i !== choice.id)
                                      : [...sel.ids, choice.id];
                                  setGroupSelections(prev => ({ ...prev, [group.id]: { ...sel, ids } }));
                                }}
                              />
                              <span className="text-gray-700">{choice.label}</span>
                            </div>
                            <span className="text-gray-500 shrink-0">
                              {parseFloat(choice.price_add_on) > 0 ? `+${formatMoney(choice.price_add_on)}` : 'Included'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Stock status */}
        <p className={`text-xs font-medium ${inStock || (productType === 'variable' && !selectedVariant) ? 'text-green-600' : 'text-red-500'}`}>
          {stockLabel}
        </p>
        {moq > 1 && <p className="text-xs text-gray-500">Min. order: {moq}</p>}

        {/* Add to cart (visual only) */}
        <button
          disabled
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm opacity-50 cursor-not-allowed"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

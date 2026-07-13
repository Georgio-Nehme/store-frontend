'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProduct, getProductImages } from '@/lib/api';
import { CartConfigurationEntry, OptionChoice, OptionGroup, Product, ProductImage, Variant } from '@/lib/types';
import { useCart } from '@/lib/cart';

function formatMoney(value: string | number) {
  const amount = typeof value === 'number' ? value : parseFloat(value || '0');
  return `$${amount.toFixed(2)}`;
}

function isHexColor(val: string | null | undefined): boolean {
  return !!val && /^#[0-9A-Fa-f]{3,8}$/.test(val.trim());
}

function sortChoices<T extends { position: number }>(items: T[]) {
  return [...items].sort((a, b) => a.position - b.position);
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const [groupSelections, setGroupSelections] = useState<Record<string, { selectedChoiceIds: string[]; textValue: string }>>({});
  const { addItem } = useCart();

  useEffect(() => {
    setLoading(true);
    Promise.all([getProduct(id), getProductImages(id)])
      .then(([p, imgs]) => {
        setProduct(p);
        setQty(1);
        setSelectedValues({});

        const initialSelections: Record<string, { selectedChoiceIds: string[]; textValue: string }> = {};
        (p.option_groups ?? []).forEach(group => {
          initialSelections[group.id] = {
            selectedChoiceIds: group.input_type === 'single'
              ? group.choices.filter(choice => choice.is_default).map(choice => choice.id).slice(0, 1)
              : [],
            textValue: '',
          };
        });
        setGroupSelections(initialSelections);

        const sorted = [...imgs].sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return a.position - b.position;
        });
        setImages(sorted);
        setActiveIdx(0);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const optionTypes = product?.option_types ? sortChoices(product.option_types) : [];
  const optionGroups = product?.option_groups ? sortChoices(product.option_groups) : [];
  const variants = product?.variants ? sortChoices(product.variants) : [];

  const selectedVariant = useMemo(() => {
    if (!product || product.product_type !== 'variable') return null;
    if (!optionTypes.every(type => selectedValues[type.id])) return null;

    return variants.find(variant =>
      variant.is_active && optionTypes.every(type =>
        variant.option_values.some(
          optionValue =>
            optionValue.option_type_id === type.id &&
            optionValue.option_value_id === selectedValues[type.id],
        ),
      ),
    ) ?? null;
  }, [optionTypes, product, selectedValues, variants]);

  const displayImages = useMemo(() => {
    if (!selectedVariant) return images.filter(img => !img.variant_id);
    const variantImages = images.filter(img => img.variant_id === selectedVariant.id);
    return variantImages.length ? variantImages : images.filter(img => !img.variant_id);
  }, [images, selectedVariant]);

  useEffect(() => {
    setActiveIdx(0);
  }, [selectedVariant?.id]);

  const liveConfigPrice = useMemo(() => {
    if (!product || product.product_type !== 'configurable') return product?.price ?? '0';
    const addOnTotal = optionGroups.reduce((sum, group) => {
      const selection = groupSelections[group.id];
      if (!selection) return sum;
      return sum + selection.selectedChoiceIds.reduce((choiceSum, choiceId) => {
        const choice = group.choices.find(item => item.id === choiceId);
        return choice ? choiceSum + parseFloat(choice.price_add_on) : choiceSum;
      }, 0);
    }, 0);
    return (parseFloat(product.price) + addOnTotal).toFixed(2);
  }, [groupSelections, optionGroups, product]);

  const configHasMissingRequired = optionGroups.some(group => {
    if (!group.required) return false;
    const selection = groupSelections[group.id];
    if (!selection) return true;
    if (group.input_type === 'text') return !selection.textValue.trim();
    return selection.selectedChoiceIds.length === 0;
  });

  useEffect(() => {
    if (!product) return;

    if (product.product_type === 'variable') {
      if (!selectedVariant) {
        setQty(1);
        return;
      }
      setQty(current => Math.min(Math.max(current, 1), Math.max(selectedVariant.stock, 1)));
      return;
    }

    setQty(current => Math.min(Math.max(current, 1), Math.max(product.stock, 1)));
  }, [product, selectedVariant]);

  function handleAdded() {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function buildConfiguration(groups: OptionGroup[]): CartConfigurationEntry[] {
    return groups.map(group => ({
      group_id: group.id,
      group_name: group.name,
      input_type: group.input_type,
      selected_choices: (groupSelections[group.id]?.selectedChoiceIds ?? []).map(choiceId => {
        const choice = group.choices.find(item => item.id === choiceId) as OptionChoice;
        return {
          choice_id: choice.id,
          label: choice.label,
          price_add_on: choice.price_add_on,
        };
      }),
      text_value: group.input_type === 'text'
        ? groupSelections[group.id]?.textValue.trim() || null
        : null,
    }));
  }

  function handleAddToCart() {
    if (!product) return;

    if (product.product_type === 'variable') {
      if (!selectedVariant || !optionTypes.every(type => selectedValues[type.id]) || selectedVariant.stock <= 0) return;
      addItem({
        product_id: product.id,
        product_name: product.name,
        unit_price: selectedVariant.price,
        variant_id: selectedVariant.id,
        variant_label: selectedVariant.option_values.map(value => value.value).join(' / '),
      }, qty);
      handleAdded();
      return;
    }

    if (product.product_type === 'configurable') {
      if (configHasMissingRequired || !product.in_stock) return;
      addItem({
        product_id: product.id,
        product_name: product.name,
        unit_price: liveConfigPrice,
        configuration: buildConfiguration(optionGroups),
      }, qty);
      handleAdded();
      return;
    }

    addItem({ product_id: product.id, product_name: product.name, unit_price: product.price }, qty);
    handleAdded();
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="animate-pulse bg-gray-200 h-96 rounded-xl" />
    </div>
  );
  if (error) return <div className="max-w-3xl mx-auto px-4 py-12 text-red-600">{error}</div>;
  if (!product) return null;

  const initials = product.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const activeImage = displayImages[activeIdx] ?? null;
  const displayedPrice = product.product_type === 'variable'
    ? selectedVariant?.price ?? product.price
    : product.product_type === 'configurable'
      ? liveConfigPrice
      : product.price;
  const displayedStock = product.product_type === 'variable' ? selectedVariant?.stock ?? 0 : product.stock;
  const addDisabled = product.product_type === 'variable'
    ? !selectedVariant || !optionTypes.every(type => selectedValues[type.id]) || selectedVariant.stock <= 0
    : product.product_type === 'configurable'
      ? !product.in_stock || configHasMissingRequired
      : !product.in_stock;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="text-blue-600 hover:underline text-sm mb-6 block">← Back to Shop</Link>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-3">
          <div className="bg-gray-100 rounded-xl overflow-hidden h-80 flex items-center justify-center">
            {activeImage?.medium_url ? (
              <img
                src={activeImage.medium_url}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-6xl font-bold text-gray-400">{initials}</span>
            )}
          </div>

          {displayImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {displayImages.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveIdx(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeIdx ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
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
        </div>

        <div className="flex flex-col gap-4">
          {product.category && (
            <span className="inline-flex w-fit px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              {product.category.name}
            </span>
          )}
          <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
          {product.sku && product.product_type !== 'variable' && <p className="text-sm text-gray-500">SKU: {product.sku}</p>}
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-bold text-blue-600">{formatMoney(displayedPrice)}</p>
            {product.compare_price && parseFloat(product.compare_price) > parseFloat(displayedPrice) && product.product_type !== 'variable' && (
              <p className="text-lg text-gray-400 line-through">{formatMoney(product.compare_price)}</p>
            )}
          </div>
          {product.description && <p className="text-gray-600">{product.description}</p>}

          {product.product_type === 'variable' && optionTypes.length > 0 && (
            <div className="space-y-4 rounded-xl border border-gray-200 p-4 bg-gray-50">
              {optionTypes.map(type => (
                <div key={type.id}>
                  <p className="text-sm font-medium text-gray-700 mb-2">{type.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {sortChoices(type.values).map(value => {
                      const isSelected = selectedValues[type.id] === value.id;
                      if (isHexColor(value.display_value)) {
                        return (
                          <button
                            key={value.id}
                            type="button"
                            title={value.value}
                            onClick={() => setSelectedValues(prev => ({ ...prev, [type.id]: value.id }))}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              isSelected
                                ? 'border-blue-600 scale-110 shadow-md ring-2 ring-blue-200'
                                : 'border-white shadow hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: value.display_value! }}
                          />
                        );
                      }
                      return (
                        <button
                          key={value.id}
                          type="button"
                          onClick={() => setSelectedValues(prev => ({ ...prev, [type.id]: value.id }))}
                          className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                          }`}
                        >
                          {value.display_value || value.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {product.product_type === 'configurable' && optionGroups.length > 0 && (
            <div className="space-y-4 rounded-xl border border-gray-200 p-4 bg-gray-50">
              {optionGroups.map(group => {
                const selection = groupSelections[group.id] ?? { selectedChoiceIds: [], textValue: '' };
                return (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-700">{group.name}</p>
                      {group.required && <span className="text-xs text-red-500">Required</span>}
                    </div>

                    {group.input_type === 'text' ? (
                      <input
                        type="text"
                        value={selection.textValue}
                        onChange={e => setGroupSelections(prev => ({
                          ...prev,
                          [group.id]: { ...selection, textValue: e.target.value },
                        }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Enter ${group.name.toLowerCase()}`}
                      />
                    ) : (
                      <div className="space-y-2">
                        {sortChoices(group.choices).map(choice => {
                          const checked = selection.selectedChoiceIds.includes(choice.id);
                          return (
                            <label key={choice.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                              <div className="flex items-center gap-3">
                                <input
                                  type={group.input_type === 'single' ? 'radio' : 'checkbox'}
                                  name={group.id}
                                  checked={checked}
                                  onChange={() => {
                                    setGroupSelections(prev => {
                                      const current = prev[group.id] ?? { selectedChoiceIds: [], textValue: '' };
                                      const selectedChoiceIds = group.input_type === 'single'
                                        ? [choice.id]
                                        : checked
                                          ? current.selectedChoiceIds.filter(idValue => idValue != choice.id)
                                          : [...current.selectedChoiceIds, choice.id];
                                      return {
                                        ...prev,
                                        [group.id]: { ...current, selectedChoiceIds },
                                      };
                                    });
                                  }}
                                />
                                <span className="text-gray-700">{choice.label}</span>
                              </div>
                              <span className="text-gray-500">{parseFloat(choice.price_add_on) > 0 ? `+${formatMoney(choice.price_add_on)}` : 'Included'}</span>
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

          <p className={`text-sm font-medium ${displayedStock > 0 || (product.product_type === 'configurable' && product.in_stock) ? 'text-green-600' : 'text-red-500'}`}>
            {product.product_type === 'variable'
              ? selectedVariant
                ? `${selectedVariant.stock} in stock`
                : 'Select all options to see availability'
              : product.in_stock
                ? `${product.stock} in stock`
                : 'Out of Stock'}
          </p>

          {(product.product_type !== 'variable' || selectedVariant) && (product.product_type !== 'configurable' || product.in_stock) && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Quantity:</label>
              <input
                type="number"
                min={1}
                max={Math.max(displayedStock, 1)}
                value={qty}
                onChange={e => setQty(Math.min(Math.max(1, parseInt(e.target.value) || 1), Math.max(displayedStock, 1)))}
                className="border rounded-lg px-3 py-1 w-20 text-center"
              />
            </div>
          )}

          {product.product_type === 'variable' && selectedVariant && selectedVariant.sku && (
            <p className="text-sm text-gray-500">Variant SKU: {selectedVariant.sku}</p>
          )}

          <button
            onClick={handleAddToCart}
            disabled={addDisabled}
            className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {added ? '✓ Added!' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </main>
  );
}

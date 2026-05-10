'use client';

import { useEffect, useState } from 'react';
import {
  adminAddOptionValue,
  adminCreateOptionType,
  adminDeleteOptionType,
  adminDeleteOptionValue,
  adminGetOptionTypes,
} from '@/lib/api';
import { OptionType } from '@/lib/types';

export default function AdminOptionTypesPage() {
  const [optionTypes, setOptionTypes] = useState<OptionType[]>([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState(0);
  const [valueForms, setValueForms] = useState<Record<string, { value: string; display_value: string; position: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function loadOptionTypes() {
    setLoading(true);
    try {
      const data = await adminGetOptionTypes();
      setOptionTypes(data.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load option types');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOptionTypes();
  }, []);

  async function handleCreateType(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await adminCreateOptionType({ name, position });
      setName('');
      setPosition(0);
      await loadOptionTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create option type');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteType(id: string) {
    if (!confirm('Delete this option type?')) return;
    try {
      await adminDeleteOptionType(id);
      await loadOptionTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete option type');
    }
  }

  async function handleAddValue(typeId: string) {
    const form = valueForms[typeId];
    if (!form?.value) return;
    try {
      await adminAddOptionValue(typeId, {
        value: form.value,
        display_value: form.display_value || null,
        position: form.position,
      });
      setValueForms(prev => ({ ...prev, [typeId]: { value: '', display_value: '', position: 0 } }));
      await loadOptionTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add value');
    }
  }

  async function handleDeleteValue(typeId: string, valueId: string) {
    if (!confirm('Delete this option value?')) return;
    try {
      await adminDeleteOptionValue(typeId, valueId);
      await loadOptionTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete option value');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Option Types</h1>
        <p className="text-sm text-gray-500 mt-1">Manage store-level option types and their values for variable products.</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Create Option Type</h2>
        <form onSubmit={handleCreateType} className="grid md:grid-cols-[2fr_1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input type="number" value={position} onChange={e => setPosition(parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <button type="submit" disabled={creating} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
            {creating ? 'Creating...' : 'Add Type'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="animate-pulse bg-white rounded-xl h-48" />
      ) : (
        <div className="grid gap-4">
          {optionTypes.map(type => {
            const form = valueForms[type.id] ?? { value: '', display_value: '', position: 0 };
            return (
              <div key={type.id} className="bg-white rounded-xl shadow p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-800">{type.name}</h2>
                    <p className="text-sm text-gray-500">Position: {type.position}</p>
                  </div>
                  <button onClick={() => handleDeleteType(type.id)} className="text-red-500 text-sm hover:underline">Delete Type</button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {type.values.length > 0 ? type.values.map(value => (
                    <span key={value.id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                      {value.display_value || value.value}
                      <button onClick={() => handleDeleteValue(type.id, value.id)} className="text-red-500 hover:text-red-700">×</button>
                    </span>
                  )) : <p className="text-sm text-gray-400">No values yet.</p>}
                </div>

                <div className="grid md:grid-cols-[2fr_2fr_1fr_auto] gap-3 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <input
                      type="text"
                      value={form.value}
                      onChange={e => setValueForms(prev => ({ ...prev, [type.id]: { ...form, value: e.target.value } }))}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Value</label>
                    <input
                      type="text"
                      value={form.display_value}
                      onChange={e => setValueForms(prev => ({ ...prev, [type.id]: { ...form, display_value: e.target.value } }))}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <input
                      type="number"
                      value={form.position}
                      onChange={e => setValueForms(prev => ({ ...prev, [type.id]: { ...form, position: parseInt(e.target.value) || 0 } }))}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <button type="button" onClick={() => handleAddValue(type.id)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
                    Add Value
                  </button>
                </div>
              </div>
            );
          })}
          {optionTypes.length === 0 && <p className="text-sm text-gray-400">No option types found.</p>}
        </div>
      )}
    </div>
  );
}

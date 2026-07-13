'use client';

import { useEffect, useState } from 'react';
import {
  adminAddOptionChoice,
  adminCreateOptionGroup,
  adminDeleteOptionChoice,
  adminDeleteOptionGroup,
  adminGetOptionGroups,
} from '@/lib/api';
import { InputType, OptionGroup } from '@/lib/types';

function formatMoney(value: string) {
  return `$${parseFloat(value || '0').toFixed(2)}`;
}

function sortByPosition<T extends { position: number }>(items: T[]) {
  return [...items].sort((a, b) => a.position - b.position);
}

export function OptionGroupManager({ productId, onRefreshProduct }: { productId: string; onRefreshProduct: () => Promise<void> }) {
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
    <div className="bg-white rounded-xl shadow p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-800">Option Group Manager</h2>
          <p className="text-sm text-gray-500 mt-1">Create configurable add-ons and custom inputs.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddGroup(prev => !prev)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 self-start sm:self-auto"
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

'use client';

import { LEBANON_REGIONS, LebanonAddress } from '@/lib/lebanon';

interface Props {
  value: LebanonAddress;
  onChange: (addr: LebanonAddress) => void;
}

export default function LebanonAddressForm({ value, onChange }: Props) {
  const govData = LEBANON_REGIONS.find(g => g.name === value.governorate);
  const districtData = govData?.districts.find(d => d.name === value.district);

  function set(field: keyof LebanonAddress, val: string) {
    const next = { ...value, [field]: val };
    if (field === 'governorate') { next.district = ''; next.city = ''; }
    if (field === 'district') { next.city = ''; }
    onChange(next);
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className={labelCls}>Governorate <span className="text-red-500">*</span></label>
        <select value={value.governorate} onChange={e => set('governorate', e.target.value)} required className={inputCls}>
          <option value="">Select Governorate</option>
          {LEBANON_REGIONS.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>District / Judiciary <span className="text-red-500">*</span></label>
        <select value={value.district} onChange={e => set('district', e.target.value)} required disabled={!value.governorate} className={inputCls + (!value.governorate ? ' opacity-50' : '')}>
          <option value="">Select District</option>
          {govData?.districts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>City / Town <span className="text-red-500">*</span></label>
        <select value={value.city} onChange={e => set('city', e.target.value)} required disabled={!value.district} className={inputCls + (!value.district ? ' opacity-50' : '')}>
          <option value="">Select City</option>
          {districtData?.cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Street <span className="text-red-500">*</span></label>
        <input type="text" value={value.street} onChange={e => set('street', e.target.value)} required placeholder="e.g. Mar Elias Street" className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Building</label>
          <input type="text" value={value.building} onChange={e => set('building', e.target.value)} placeholder="Building name/no." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Floor</label>
          <input type="text" value={value.floor} onChange={e => set('floor', e.target.value)} placeholder="e.g. 3rd" className={inputCls} />
        </div>
      </div>
    </div>
  );
}

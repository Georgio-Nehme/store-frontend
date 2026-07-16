'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { adminSignOut } from '@/lib/auth';
import { getStoreSettings } from '@/lib/api';

const baseLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/option-types', label: 'Option Types' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/promo-codes', label: 'Promo Codes' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/account/password', label: 'Change Password' },
];

const financeLink = { href: '/admin/finance', label: 'Finance' };

export default function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [financeEnabled, setFinanceEnabled] = useState(false);

  useEffect(() => {
    getStoreSettings().then(s => setFinanceEnabled(s.finance_plugin_enabled)).catch(() => setFinanceEnabled(false));
  }, []);

  const links = financeEnabled
    ? [...baseLinks.slice(0, 7), financeLink, ...baseLinks.slice(7)]
    : baseLinks;

  async function handleLogout() {
    await adminSignOut();
    router.push('/admin/login');
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 min-h-screen bg-gray-900 text-white flex flex-col py-8 px-4 shrink-0 transform transition-transform duration-200 ease-in-out overflow-y-auto ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static`}
      >
        <h2 className="text-lg font-bold mb-8 text-white">Admin Panel</h2>
        <nav className="flex flex-col gap-2 flex-1">
          {links.map(link => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-4 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 text-left transition-colors"
        >
          Logout
        </button>
      </aside>
    </>
  );
}

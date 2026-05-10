'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/api';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/option-types', label: 'Option Types' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/promo-codes', label: 'Promo Codes' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push('/admin/login');
  }

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col py-8 px-4 shrink-0">
      <h2 className="text-lg font-bold mb-8 text-white">Admin Panel</h2>
      <nav className="flex flex-col gap-2 flex-1">
        {links.map(link => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
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
  );
}

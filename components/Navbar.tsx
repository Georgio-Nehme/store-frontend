'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { clearCustomerSession, getCustomerSession } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { branding } from '@/store.config/branding';
import { theme } from '@/lib/theme';

export default function Navbar() {
  const pathname = usePathname();
  const { items } = useCart();
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const session = getCustomerSession();
    setCustomerName(session?.name ?? session?.email ?? null);
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearCustomerSession();
    setCustomerName(null);
    setMenuOpen(false);
    router.push('/login');
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const storeName = branding.storeName;

  return (
    <nav className="bg-white shadow-md w-full sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-2 min-w-0">
          {theme.logoUrl && (
            <img src={theme.logoUrl} alt={storeName} className="w-9 h-9 rounded-lg object-cover shrink-0" />
          )}
          <span className={`text-lg sm:text-xl truncate transition-colors ${theme.classes.storeName}`}>{storeName}</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
          <Link href="/reviews" className="text-gray-600 hover:text-gray-900">Reviews</Link>
          <Link href="/cart" className="relative text-gray-600 hover:text-gray-900">
            Cart
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
          {customerName ? (
            <>
              <Link href="/orders" className="text-gray-600 hover:text-gray-900 text-sm">My Orders</Link>
              <span className="text-gray-600 text-sm">Hi, {customerName}</span>
              <button onClick={handleLogout} className="text-red-600 hover:text-red-800 text-sm">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1 shrink-0">
        <Link href="/cart" aria-label="Cart" className="relative p-2.5 text-gray-600 hover:text-gray-900">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {itemCount > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-brand-600 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Link>
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="relative p-2.5 -mr-2.5 text-gray-600 hover:text-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-2 flex flex-col">
          <Link href="/" className="py-3 text-gray-600 hover:text-gray-900">Home</Link>
          <Link href="/reviews" className="py-3 text-gray-600 hover:text-gray-900">Reviews</Link>
          <Link href="/cart" className="py-3 text-gray-600 hover:text-gray-900">
            Cart{itemCount > 0 ? ` (${itemCount})` : ''}
          </Link>
          {customerName ? (
            <>
              <Link href="/orders" className="py-3 text-gray-600 hover:text-gray-900">My Orders</Link>
              <span className="py-3 text-gray-500 text-sm truncate">Hi, {customerName}</span>
              <button onClick={handleLogout} className="py-3 text-red-600 hover:text-red-800 text-left">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="py-3 text-gray-600 hover:text-gray-900">Login</Link>
          )}
        </div>
      )}
    </nav>
  );
}

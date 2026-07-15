'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { clearCustomerSession, getCustomerSession } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { branding } from '@/store.config/branding';

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
    <nav className="bg-white shadow-md w-full">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-800 hover:text-gray-600">
          {storeName}
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
          <Link href="/reviews" className="text-gray-600 hover:text-gray-900">Reviews</Link>
          <Link href="/cart" className="relative text-gray-600 hover:text-gray-900">
            Cart
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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

        <button
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Toggle menu"
          className="md:hidden relative p-1.5 -mr-1.5 text-gray-600 hover:text-gray-900"
        >
          {itemCount > 0 && !menuOpen && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {itemCount}
            </span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-3 flex flex-col gap-3">
          <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
          <Link href="/reviews" className="text-gray-600 hover:text-gray-900">Reviews</Link>
          <Link href="/cart" className="text-gray-600 hover:text-gray-900">
            Cart{itemCount > 0 ? ` (${itemCount})` : ''}
          </Link>
          {customerName ? (
            <>
              <Link href="/orders" className="text-gray-600 hover:text-gray-900 text-sm">My Orders</Link>
              <span className="text-gray-600 text-sm">Hi, {customerName}</span>
              <button onClick={handleLogout} className="text-red-600 hover:text-red-800 text-sm text-left">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
          )}
        </div>
      )}
    </nav>
  );
}

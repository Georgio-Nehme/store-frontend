'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { clearCustomerSession, getCustomerSession } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const { items } = useCart();
  const [customerName, setCustomerName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const session = getCustomerSession();
    setCustomerName(session?.name ?? session?.email ?? null);
  }, [pathname]);

  function handleLogout() {
    clearCustomerSession();
    setCustomerName(null);
    router.push('/login');
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Store';

  return (
    <nav className="bg-white shadow-md w-full">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-800 hover:text-gray-600">
          {storeName}
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
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
      </div>
    </nav>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import NavbarWrapper from '@/components/NavbarWrapper';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_STORE_NAME || 'My Store',
  description: 'Online Store',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <CartProvider>
          <NavbarWrapper />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}

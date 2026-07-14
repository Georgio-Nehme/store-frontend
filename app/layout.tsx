import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import NavbarWrapper from '@/components/NavbarWrapper';
import { branding } from '@/store.config/branding';

export const metadata: Metadata = {
  title: branding.storeName,
  description: branding.metaDescription,
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

import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import NavbarWrapper from '@/components/NavbarWrapper';
import { branding } from '@/store.config/branding';
import { displayFont } from '@/store.config/fonts';
import { theme } from '@/lib/theme';

export const metadata: Metadata = {
  title: branding.storeName,
  description: branding.metaDescription,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={displayFont?.variable}>
      <body className={`${theme.classes.page} min-h-screen`}>
        <CartProvider>
          <NavbarWrapper />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}

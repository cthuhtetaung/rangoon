import { Manrope, Sora } from 'next/font/google';
import Header from '../components/Header';
import DevErrorFilter from '../components/DevErrorFilter';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Rangoon F&B - ERP POS System</title>
        <meta name="description" content="Myanmar All-in-One ERP POS System" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className={`${manrope.variable} ${sora.variable}`} suppressHydrationWarning>
        <LanguageProvider>
          <AuthProvider>
            <DevErrorFilter />
            <div id="root" className="min-h-screen">
              <Header />
              <main className="min-w-0 flex-1 lg:pl-64">{children}</main>
            </div>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

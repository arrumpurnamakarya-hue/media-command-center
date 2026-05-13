import './globals.css';
import { Inter, Roboto } from 'next/font/google';

// Mengatur font untuk antarmuka (UI)
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Mengatur font khusus untuk ketegasan angka (Metrik)
const roboto = Roboto({ 
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata = {
  title: 'Media Center - Command Center',
  description: 'Pusat Kendali Strategi dan Distribusi Konten',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${roboto.variable}`}>
      {/* Menggunakan font Inter sebagai standar dasar seluruh teks UI */}
      <body className="font-sans bg-[#0b0d10] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
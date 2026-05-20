import './globals.css';
import { Inter, Roboto } from 'next/font/google';
import { AuthProvider } from './contexts/AuthContext';
import PushSetup from './PushSetup';

// Inter untuk antarmuka teks biasa (UI)
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Roboto khusus untuk angka/metrik
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
    // Menyuntikkan kedua variabel CSS ke seluruh dokumen
    <html lang="id" className={`${inter.variable} ${roboto.variable}`}>
      {/* font-sans otomatis memicu Inter untuk semua teks standar */}
      <body className="font-sans bg-[#0b0d10] text-white antialiased">
        {/* MENYALAKAN MESIN NOTIFIKASI */}
        <PushSetup />
        
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
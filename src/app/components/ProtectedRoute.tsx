"use client";
import { useAuth } from '../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Perhatikan: Menghilangkan kata 'default' dan menggunakan named export
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0d10] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#008234]" size={40} />
      </div>
    );
  }

  return <>{children}</>;
}
"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/'); // Lempar ke dashboard jika sukses
    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Periksa email/password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-8">
        
        {/* Logo & Branding */}
        <div className="text-center space-y-4">
          {/* WADAH LOGO KOTAK */}
          <div className="mx-auto w-20 h-20 relative rounded-2xl overflow-hidden shadow-xl shadow-green-900/30 bg-[#008234]">
            <Image 
              src="/logo.png"         // ⬅️ GANTI dengan path logo Anda, contoh: /images/logo.png
              alt="Logo Resmi" 
              fill 
              className="object-contain p-1.5"
              priority                 // Prioritas load karena elemen pertama
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">Command Center</h1>
            <p className="text-xs text-gray-500 font-bold tracking-[0.2em] uppercase">Media Strategist Access</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#12151a] border border-gray-800 p-8 rounded-[35px] shadow-2xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Selamat Datang</h2>
            <p className="text-xs text-gray-400">Gunakan kredensial resmi untuk mengakses pusat kendali.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center space-x-3 text-red-500 animate-shake">
              <AlertCircle size={18} />
              <span className="text-[11px] font-bold">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Alamat Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#008234] transition-colors" size={16} />
                <input 
                  required 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mediacenter@pkbgarut.id"
                  className="w-full bg-gray-100 border border-gray-200 text-gray-900 pl-12 pr-6 py-4 rounded-2xl outline-none focus:border-[#008234] focus:ring-1 focus:ring-[#008234] transition-all font-bold text-sm placeholder:text-gray-400" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Kata Sandi</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#008234] transition-colors" size={16} />
                <input 
                  required 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-100 border border-gray-200 text-gray-900 pl-12 pr-6 py-4 rounded-2xl outline-none focus:border-[#008234] focus:ring-1 focus:ring-[#008234] transition-all font-bold text-sm placeholder:text-gray-400" 
                />
              </div>
            </div>

            <button 
              disabled={loading}
              type="submit" 
              className="w-full bg-[#008234] hover:bg-[#006b2a] text-white py-5 rounded-2xl font-black text-xs shadow-xl shadow-green-900/20 transition-all transform active:scale-95 flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><Sparkles size={16} /><span>MASUK KE SISTEM</span></>}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-gray-600 font-bold tracking-widest uppercase">
          &copy; 2026 Media Center Command System
        </p>
      </div>
    </div>
  );
}
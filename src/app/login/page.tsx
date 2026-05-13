'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Eye, EyeOff, ArrowLeft, Mail, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!fullName.trim()) throw new Error('Nama lengkap wajib diisi');
        await signUp(email, password, fullName);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      
      {/* Header Back Link */}
      <div className="px-6 py-4">
        <button 
          onClick={() => router.push('/')} 
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-[#008234] transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Kembali ke Website</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        
        {/* Logo Placeholder */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#008234] to-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg mx-auto mb-4">
            PKB
          </div>
          <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">Media Center</p>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-gray-900 mb-8">
          {isLogin ? 'Log In' : 'Daftar Akun'}
        </h1>

        {/* Error */}
        {error && (
          <div className="w-full max-w-sm bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs font-bold text-center mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          
          {/* Nama Lengkap (Hanya saat daftar) */}
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Nama Lengkap</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-[#008234] focus:bg-white transition-all text-sm"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-[#008234] focus:bg-white transition-all text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700">Password</label>
              {isLogin && (
                <button type="button" className="text-xs text-[#008234] font-bold hover:underline">
                  Lupa Sandi
                </button>
              )}
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-[#008234] focus:bg-white transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Tombol Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#008234] hover:bg-[#006b2a] text-white py-3.5 rounded-xl font-black text-sm shadow-lg shadow-green-700/20 transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2 mt-6"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <span>{isLogin ? 'LOG IN' : 'DAFTAR'}</span>
            )}
          </button>
        </form>

        {/* Toggle Login/Register */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-[#008234] font-bold hover:underline"
            >
              {isLogin ? 'Daftar akun' : 'Log In'}
            </button>
          </p>
        </div>

        {/* Footer Kontak */}
        <div className="mt-12 text-center space-y-3">
          <p className="text-xs text-gray-500 font-medium">Kontak kami:</p>
          <div className="flex items-center justify-center space-x-6 text-xs text-[#008234] font-semibold">
            <span className="flex items-center space-x-1">
              <Mail size={14} />
              <span>media@pkb.id</span>
            </span>
            <span className="flex items-center space-x-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span>Whatsapp</span>
            </span>
          </div>
          <p className="text-xs text-gray-400">Jam layanan: Senin - Jumat 08.00 - 17.00</p>
        </div>

      </div>
    </div>
  );
}
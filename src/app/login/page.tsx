"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Sparkles,
  User,
  Phone,
  ShieldCheck,
  Camera,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

const teamRoles = [
  'Koordinator',
  'Copywriter',
  'Designer',
  'Editor',
  'Admin Posting',
  'Approver',
  'Viewer',
];

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Viewer');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetFeedback = () => {
    setError(null);
    setNotice(null);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('File foto harus berupa gambar.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran foto maksimal 2MB.');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (userId: string) => {
    if (!avatarFile) return null;

    const fileExt = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setLoading(true);
    resetFeedback();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const userId = data.user?.id;

      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status, full_name')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile?.status && profile.status !== 'active') {
          await supabase.auth.signOut();

          setError(
            profile.status === 'pending'
              ? 'Akun Anda masih menunggu persetujuan admin/koordinator.'
              : 'Akun Anda belum aktif. Silakan hubungi koordinator.'
          );

          return;
        }
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Periksa email/password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    setLoading(true);
    resetFeedback();

    try {
      if (!fullName.trim()) {
        throw new Error('Nama lengkap wajib diisi.');
      }

      if (!phone.trim()) {
        throw new Error('Nomor WhatsApp wajib diisi.');
      }

      if (password.length < 6) {
        throw new Error('Kata sandi minimal 6 karakter.');
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role,
          },
        },
      });

      if (signUpError) throw signUpError;

      const userId = data.user?.id;

      let avatarUrl: string | null = null;

      if (userId) {
        avatarUrl = await uploadAvatar(userId);

        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            user_id: userId,
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            role,
            avatar_url: avatarUrl,
            status: 'pending',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

        if (profileError) throw profileError;
      }

      await supabase.auth.signOut();

      setNotice(
        'Pendaftaran berhasil. Akun Anda menunggu persetujuan admin/koordinator sebelum bisa masuk.'
      );

      setMode('login');
      setFullName('');
      setPhone('');
      setRole('Viewer');
      setAvatarFile(null);
      setAvatarPreview(null);
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftar. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-28 h-28 relative">
            <Image src="/logo.png" alt="Logo Resmi" fill unoptimized />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Command Center
            </h1>
            <p className="text-xs text-gray-500 font-bold tracking-[0.2em] uppercase">
              Media Strategist Access
            </p>
          </div>
        </div>

        <div className="bg-[#12151a] border border-gray-800 p-8 rounded-[35px] shadow-2xl space-y-6">
          <div className="flex items-center gap-2 rounded-2xl bg-[#0b0d10] border border-gray-800 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                resetFeedback();
              }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === 'login'
                  ? 'bg-[#008234] text-white shadow-lg shadow-green-900/20'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Masuk
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('register');
                resetFeedback();
              }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === 'register'
                  ? 'bg-[#008234] text-white shadow-lg shadow-green-900/20'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Daftar Tim
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">
              {mode === 'login' ? 'Selamat Datang' : 'Daftar Akun Tim'}
            </h2>
            <p className="text-xs text-gray-400">
              {mode === 'login'
                ? 'Gunakan kredensial resmi untuk mengakses pusat kendali.'
                : 'Isi data tim. Akun baru akan aktif setelah disetujui admin/koordinator.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center space-x-3 text-red-500 animate-shake">
              <AlertCircle size={18} />
              <span className="text-[11px] font-bold">{error}</span>
            </div>
          )}

          {notice && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center space-x-3 text-emerald-400">
              <CheckCircle2 size={18} />
              <span className="text-[11px] font-bold">{notice}</span>
            </div>
          )}

          <form
            onSubmit={mode === 'login' ? handleLogin : handleRegister}
            className="space-y-5"
          >
            {mode === 'register' && (
              <>
                <div className="flex items-center gap-4">
                  <label className="relative w-20 h-20 rounded-3xl border border-gray-800 bg-[#0b0d10] overflow-hidden flex items-center justify-center cursor-pointer group">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarPreview}
                        alt="Preview Foto Profil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="text-gray-500 group-hover:text-[#008234] transition-colors" size={24} />
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Foto Profil
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Opsional. Gunakan foto wajah agar mudah dikenali tim.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">
                    Nama Lengkap
                  </label>
                  <div className="relative group">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#008234] transition-colors"
                      size={16}
                    />
                    <input
                      required
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Faiz Shihab"
                      className="w-full bg-gray-100 border border-gray-200 text-gray-900 pl-12 pr-6 py-4 rounded-2xl outline-none focus:border-[#008234] focus:ring-1 focus:ring-[#008234] transition-all font-bold text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">
                    Nomor WhatsApp
                  </label>
                  <div className="relative group">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#008234] transition-colors"
                      size={16}
                    />
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full bg-gray-100 border border-gray-200 text-gray-900 pl-12 pr-6 py-4 rounded-2xl outline-none focus:border-[#008234] focus:ring-1 focus:ring-[#008234] transition-all font-bold text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">
                    Role / Jabatan
                  </label>
                  <div className="relative group">
                    <ShieldCheck
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#008234] transition-colors"
                      size={16}
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full appearance-none bg-gray-100 border border-gray-200 text-gray-900 pl-12 pr-6 py-4 rounded-2xl outline-none focus:border-[#008234] focus:ring-1 focus:ring-[#008234] transition-all font-bold text-sm"
                    >
                      {teamRoles.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">
                Alamat Email
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#008234] transition-colors"
                  size={16}
                />
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
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">
                Kata Sandi
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#008234] transition-colors"
                  size={16}
                />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full bg-gray-100 border border-gray-200 text-gray-900 pl-12 pr-6 py-4 rounded-2xl outline-none focus:border-[#008234] focus:ring-1 focus:ring-[#008234] transition-all font-bold text-sm placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-[#008234] hover:bg-[#006b2a] text-white py-5 rounded-2xl font-black text-xs shadow-xl shadow-green-900/20 transition-all transform active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : mode === 'login' ? (
                <>
                  <Sparkles size={16} />
                  <span>MASUK KE SISTEM</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>DAFTAR AKUN TIM</span>
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              resetFeedback();
            }}
            className="w-full text-center text-[11px] font-bold text-gray-500 hover:text-emerald-400 transition-colors flex items-center justify-center gap-2"
          >
            {mode === 'login' ? (
              <>Belum punya akun? Daftar sebagai tim redaksi</>
            ) : (
              <>
                <ArrowLeft size={14} />
                Sudah punya akun? Kembali ke login
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-600 font-bold tracking-widest uppercase">
          &copy; 2026 DPC PKB GARUT | Media Center Command System
        </p>
      </div>
    </div>
  );
}

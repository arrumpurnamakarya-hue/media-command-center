"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  BarChart3,
  Loader2,
  Save,
  Globe,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  SVG BRAND ICONS (Inline agar tidak perlu install library baru)     */
/* ------------------------------------------------------------------ */
const MetaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.99 3.66 9.13 8.44 9.88v-7.03h-2.54v-2.9h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57V12h2.77l-.44 2.9h-2.33v6.99c4.78-.75 8.44-4.89 8.44-9.88 0-5.5-4.46-9.96-9.96-9.96z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  TIPE DATA                                                          */
/* ------------------------------------------------------------------ */
interface RecapFormProps {
  isDarkMode?: boolean;
  onRecapSuccess?: () => Promise<void> | void;
}

interface ContentItem {
  id: string;
  title: string;
  publish_date?: string;
}

interface PlatformMetrics {
  views: number;
  engagement: number;
}

const PLATFORM_CONFIG = [
  {
    key: "meta" as const,
    label: "META (FB & IG)",
    icon: MetaIcon,
    iconColor: "text-blue-500",
  },
  {
    key: "tiktok" as const,
    label: "TIKTOK",
    icon: TikTokIcon,
    iconColor: "text-pink-500",
  },
  {
    key: "x_twitter" as const,
    label: "X (TWITTER)",
    icon: XIcon,
    iconColor: "text-white",
  },
  {
    key: "yt_shorts" as const,
    label: "YT SHORTS",
    icon: YoutubeIcon,
    iconColor: "text-red-500",
  },
];

export default function RecapForm({
  isDarkMode = true,
  onRecapSuccess,
}: RecapFormProps) {
  /* ----------------------- STATE ----------------------- */
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [metrics, setMetrics] = useState<
    Record<(typeof PLATFORM_CONFIG)[number]["key"], PlatformMetrics>
  >({
    meta: { views: 0, engagement: 0 },
    tiktok: { views: 0, engagement: 0 },
    x_twitter: { views: 0, engagement: 0 },
    yt_shorts: { views: 0, engagement: 0 },
  });

  /* ----------------------- THEME ----------------------- */
  const bgCard = isDarkMode
    ? "bg-[#12151a] border-gray-800"
    : "bg-white border-gray-200";
  const bgInput = isDarkMode
    ? "bg-[#0b0d10] border-gray-800 text-white"
    : "bg-gray-50 border-gray-300 text-gray-900";
  const textTitle = isDarkMode ? "text-white" : "text-gray-900";
  const subCardBg = isDarkMode
    ? "bg-[#0b0d10]/50 border-gray-800/80"
    : "bg-gray-50/50 border-gray-200";

  /* ----------------------- FETCH ----------------------- */
  useEffect(() => {
    const fetchContents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("contents")
        .select("id, title, publish_date")
        .order("publish_date", { ascending: false });
      if (!error && data) setContents(data as ContentItem[]);
      setLoading(false);
    };
    fetchContents();
  }, []);

  /* Jika konten dipilih, load metrik lama (opsional) */
  useEffect(() => {
    if (!selectedId) return;
    const fetchExisting = async () => {
      const { data } = await supabase
        .from("platform_metrics") // <-- GANTI jika nama tabel Anda beda
        .select("platform, views, engagement")
        .eq("content_id", selectedId);

      if (!data) return;
      const map: typeof metrics = {
        meta: { views: 0, engagement: 0 },
        tiktok: { views: 0, engagement: 0 },
        x_twitter: { views: 0, engagement: 0 },
        yt_shorts: { views: 0, engagement: 0 },
      };
      data.forEach((row: any) => {
        if (map[row.platform as keyof typeof map]) {
          map[row.platform as keyof typeof map] = {
            views: row.views || 0,
            engagement: row.engagement || 0,
          };
        }
      });
      setMetrics(map);
    };
    fetchExisting();
  }, [selectedId]);

  /* ----------------------- HANDLERS ----------------------- */
  const handleChange = (
    platform: keyof typeof metrics,
    field: keyof PlatformMetrics,
    value: string
  ) => {
    setMetrics((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: parseInt(value) || 0 },
    }));
  };

  const globalViews = useMemo(
    () => Object.values(metrics).reduce((s, p) => s + (p.views || 0), 0),
    [metrics]
  );
  const globalEngagement = useMemo(
    () => Object.values(metrics).reduce((s, p) => s + (p.engagement || 0), 0),
    [metrics]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setError("Pilih konten terlebih dahulu.");
      return;
    }
    setError(null);
    setSaving(true);

    const rows = PLATFORM_CONFIG.map((p) => ({
      content_id: selectedId,
      platform: p.key,
      views: metrics[p.key].views,
      engagement: metrics[p.key].engagement,
    }));

    const { error: upsertError } = await supabase
      .from("platform_metrics") // <-- GANTI jika nama tabel Anda beda
      .upsert(rows, { onConflict: "content_id,platform" });

    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
    } else {
      await onRecapSuccess?.(); // Trigger refresh di parent / dashboard
      // Optional: reset atau toast
    }
  };

  /* ----------------------- RENDER ----------------------- */
  return (
    <div className="max-w-5xl mx-auto p-4 animate-fadeIn">
      <div
        className={`border rounded-[30px] p-8 shadow-xl transition-all ${bgCard}`}
      >
        {/* HEADER */}
        <div className="text-center space-y-1 mb-10">
          <h2
            className={`text-2xl font-black tracking-tight uppercase ${textTitle}`}
          >
            Rekapitulasi Pasca-Tayang
          </h2>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-[0.2em]">
            Akumulasi Interaksi Riil Saluran Distribusi
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SELECT KONTEN */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">
              Pilih Naskah Mengudara
            </label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className={`w-full border p-4 pr-10 rounded-xl font-semibold outline-none focus:border-[#008234] transition-all text-sm appearance-none ${bgInput}`}
              >
                <option value="">-- Pilih Konten untuk Direkap --</option>
                {contents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.publish_date ? `(${c.publish_date})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                size={16}
              />
            </div>
          </div>

          {/* RINCIAN INTERAKSI PER PLATFORM */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-[#008234]" />
              <h3
                className={`text-[10px] font-black uppercase tracking-widest ${textTitle}`}
              >
                Rincian Interaksi Platform
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLATFORM_CONFIG.map((p) => {
                const Icon = p.icon;
                const data = metrics[p.key];
                return (
                  <div
                    key={p.key}
                    className={`p-5 rounded-2xl border space-y-4 ${subCardBg}`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${p.iconColor}`} />
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}
                        >
                          {p.label}
                        </span>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block ml-1">
                          Views
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={data.views || ""}
                          onChange={(e) =>
                            handleChange(p.key, "views", e.target.value)
                          }
                          placeholder="0"
                          className={`w-full border p-3 rounded-xl font-bold text-sm outline-none focus:border-[#008234] transition-all ${bgInput}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block ml-1">
                          Engagement
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={data.engagement || ""}
                          onChange={(e) =>
                            handleChange(p.key, "engagement", e.target.value)
                          }
                          placeholder="0"
                          className={`w-full border p-3 rounded-xl font-bold text-sm outline-none focus:border-[#008234] transition-all ${bgInput}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AKUMULASI GLOBAL (READ-ONLY) */}
          <div
            className={`p-5 rounded-2xl border space-y-4 ${subCardBg}`}
          >
            <h4 className="text-[10px] font-black text-[#008234] uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={14} />
              Akumulasi Global (Auto-sum)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Total Jangkauan (Views)
                </p>
                <p
                  className={`text-2xl font-black tracking-tight ${textTitle}`}
                >
                  {globalViews.toLocaleString("id-ID")}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Total Interaksi (Engagement)
                </p>
                <p
                  className={`text-2xl font-black tracking-tight ${textTitle}`}
                >
                  {globalEngagement.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-gray-500">
              * Angka di atas dihitung otomatis dari rincian platform. Tidak
              perlu diisi manual.
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500">
              <AlertCircle size={18} />
              <span className="text-xs font-bold">{error}</span>
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={saving || !selectedId}
            className="w-full bg-[#008234] hover:bg-[#006b2a] disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-2xl font-black text-xs shadow-xl shadow-green-900/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>MENYIMPAN METRIK...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>SIMPAN METRIK PLATFORM</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
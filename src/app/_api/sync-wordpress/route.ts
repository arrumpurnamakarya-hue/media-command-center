import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';
// --- TAMBAHAN 1: Memanggil Firebase ---
import admin from 'firebase-admin';

// --- TAMBAHAN 2: Menghidupkan Mesin Firebase Admin ---
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Gagal menginisialisasi Firebase Admin:', error);
  }
}


// =========================================================================
// INI ADALAH KODE LAMA ANDA (TIDAK ADA YANG DIUBAH SAMA SEKALI)
// =========================================================================
export async function GET() {
  try {
    const WP_API_URL = process.env.WP_API_URL;
    
    if (!WP_API_URL) {
      return NextResponse.json({ success: false, error: 'WP_API_URL belum diatur di .env.local' }, { status: 500 });
    }

    // Tarik data publik murni tanpa header Authorization (bebas ribet)
    const response = await fetch(`${WP_API_URL}?per_page=20&_embed`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Gagal terhubung ke WordPress (Status: ${response.status})`);
    }

    const posts = await response.json();

    if (!Array.isArray(posts)) {
      throw new Error('Format respons WordPress tidak valid.');
    }

    // Mapping data untuk dimasukkan ke Supabase
   // Mapping data untuk dimasukkan ke Supabase
    const articles = posts.map((post: any) => ({
      wp_id: post.id.toString(),
      title: post.title.rendered,
      url: post.link,             // <--- UBAH kata 'link' menjadi 'url' di baris ini
      published_at: post.date,
    }));
    // Simpan ke database menggunakan skema hindari duplikat (upsert)
    const { error } = await supabase
      .from('articles')
      .upsert(articles, { onConflict: 'wp_id' });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: `${articles.length} Artikel berhasil ditarik dari pkbgarut.id!`,
      data: articles 
    });

  } catch (error: any) {
    console.error('WordPress Sync Error:', error);
    // Dijamin mengembalikan JSON agar browser tidak memunculkan popup HTML error
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Kesalahan internal server saat sinkronisasi.' 
    }, { status: 500 });
  }
}
// =========================================================================


// --- TAMBAHAN 3: Fungsi POST untuk Mengirim Notifikasi ke Tim ---
export async function POST(request: Request) {
  try {
    // 1. Menerima Judul dan Isi pesan
    const { title, body } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Judul dan isi notifikasi wajib diisi' }, { status: 400 });
    }

    // 2. Mengambil semua alamat HP (Token) dari database
    const { data: rows, error: supabaseError } = await supabase
      .from('fcm_tokens')
      .select('token');

    if (supabaseError) {
      return NextResponse.json({ error: 'Gagal mengambil token dari database' }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: 'Belum ada perangkat tim yang terdaftar' }, { status: 200 });
    }

    const tokens = rows.map((row) => row.token);

    // 3. Menembakkan notifikasi via Firebase
    const payload = {
      notification: { title, body },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    
    console.log(`Broadcast selesai. Berhasil: ${response.successCount}, Gagal: ${response.failureCount}`);

    return NextResponse.json({ 
      success: true, 
      terkirim: response.successCount, 
      gagal: response.failureCount 
    });

  } catch (error: any) {
    console.error('Terjadi kesalahan pada server API Notifikasi:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
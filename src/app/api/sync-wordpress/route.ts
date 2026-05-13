import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';

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
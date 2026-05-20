import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

// 1. Hubungkan ke Database Anda (Supabase)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Hubungkan ke Server Google (Firebase)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace digunakan untuk memperbaiki format enter (\n) rawan rusak di Vercel
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), 
      }),
    });
  } catch (error) {
    console.error('Gagal inisialisasi Firebase Admin', error);
  }
}

export async function POST(request: Request) {
  try {
    // Tangkap data judul yang dikirim dari tombol Simpan
    const body = await request.json();
    const { title, body: messageBody } = body;

    // 3. Ambil daftar "Alamat HP" dari Supabase
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('token');

    if (error) throw error;
    
    // Jika belum ada HP yang mendaftar, hentikan tanpa error
    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: 'Tidak ada target HP' }, { status: 200 });
    }

    // Ubah format data menjadi daftar baris
    const tokenList = tokens.map((t) => t.token);

    // 4. Siapkan peluru notifikasinya
    const message = {
      notification: {
        title: title,
        body: messageBody,
      },
      tokens: tokenList, // Tembak ke semua HP yang ada di database
    };

    // 5. TEMBAK!
    const response = await admin.messaging().sendEachForMulticast(message);

    return NextResponse.json({
      success: true,
      terkirim: response.successCount,
      gagal: response.failureCount,
    });

  } catch (error: any) {
    console.error('Error saat menembak notifikasi:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
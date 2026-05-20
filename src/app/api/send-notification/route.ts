import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import serviceAccount from './serviceAccount.json';

export const runtime = 'nodejs';

type SendNotificationBody = {
  title?: unknown;
  message?: unknown;
  body?: unknown;
  token?: unknown;
  tokens?: unknown;
};

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

type FailedToken = {
  tokenIndex: number;
  errorCode?: string;
  errorMessage?: string;
};

const FIREBASE_APP_NAME = 'media-command-center-fcm';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL belum diisi di .env.local');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getFirebaseApp() {
  const existingApp = admin.apps.find((app) => app?.name === FIREBASE_APP_NAME);

  if (existingApp) {
    return existingApp;
  }

  const account = serviceAccount as ServiceAccountJson;

  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error(
      'serviceAccount.json belum valid. Pastikan berisi project_id, client_email, dan private_key.'
    );
  }

  console.log('Initializing Firebase Admin from serviceAccount.json:', {
    projectId: account.project_id,
    clientEmail: account.client_email,
  });

  return admin.initializeApp(
    {
      credential: admin.credential.cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key.replace(/\\n/g, '\n'),
      }),
    },
    FIREBASE_APP_NAME
  );
}

function getMessaging() {
  const app = getFirebaseApp();
  return admin.messaging(app);
}

function normalizeTokens(token: unknown, tokens: unknown) {
  const targetTokens: string[] = [];

  if (typeof token === 'string' && token.trim()) {
    targetTokens.push(token.trim());
  }

  if (typeof tokens === 'string' && tokens.trim()) {
    targetTokens.push(tokens.trim());
  }

  if (Array.isArray(tokens)) {
    targetTokens.push(
      ...tokens
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    );
  }

  return Array.from(new Set(targetTokens));
}

async function getStoredAndroidTokens() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('fcm_tokens')
    .select('token')
    .eq('platform', 'android');

  if (error) {
    throw error;
  }

  return Array.from(
    new Set(
      (data || [])
        .map((item) => {
          const value = item?.token;
          return typeof value === 'string' ? value.trim() : '';
        })
        .filter(Boolean)
    )
  );
}

async function sendMulticastNotifications(
  tokens: string[],
  title: string,
  message: string
) {
  const messaging = getMessaging();

  const chunkSize = 500;
  let successCount = 0;
  let failureCount = 0;

  const failedTokens: FailedToken[] = [];

  for (let start = 0; start < tokens.length; start += chunkSize) {
    const batchTokens = tokens.slice(start, start + chunkSize);

    const response = await messaging.sendEachForMulticast({
      tokens: batchTokens,
      notification: {
        title,
        body: message,
      },
      data: {
        title,
        message,
        source: 'media-command-center',
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((result, index) => {
      if (!result.success) {
        failedTokens.push({
          tokenIndex: start + index,
          errorCode: result.error?.code,
          errorMessage: result.error?.message,
        });
      }
    });

    console.log('FCM batch sent:', {
      batchTokens: batchTokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  }

  return {
    successCount,
    failureCount,
    failedTokens,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SendNotificationBody;

    console.log('BODY SEND NOTIFICATION:', {
      hasTitle: Boolean(body.title),
      hasMessage: Boolean(body.message || body.body),
      hasToken: Boolean(body.token),
      tokensType: Array.isArray(body.tokens) ? 'array' : typeof body.tokens,
    });

    const title = typeof body.title === 'string' ? body.title.trim() : '';

    const message =
      typeof body.message === 'string' && body.message.trim()
        ? body.message.trim()
        : typeof body.body === 'string'
          ? body.body.trim()
          : '';

    if (!title || !message) {
      return NextResponse.json(
        {
          success: false,
          error: 'title dan message wajib diisi',
        },
        { status: 400 }
      );
    }

    let targetTokens = normalizeTokens(body.token, body.tokens);

    if (targetTokens.length === 0) {
      console.log('No token supplied, loading Android FCM tokens from Supabase');
      targetTokens = await getStoredAndroidTokens();
    }

    console.log('SEND NOTIFICATION TARGET TOKENS:', {
      totalTokens: targetTokens.length,
    });

    if (targetTokens.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Belum ada token FCM Android yang tersimpan',
          totalTokens: 0,
          successCount: 0,
          failureCount: 0,
          failedTokens: [],
        },
        { status: 400 }
      );
    }

    const response = await sendMulticastNotifications(
      targetTokens,
      title,
      message
    );

    console.log('SEND NOTIFICATION RESULT:', {
      totalTokens: targetTokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return NextResponse.json({
      success: true,
      message: 'Notifikasi berhasil diproses',
      totalTokens: targetTokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens: response.failedTokens,
    });
  } catch (error) {
    console.error('SEND NOTIFICATION ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Gagal mengirim notifikasi',
      },
      { status: 500 }
    );
  }
}
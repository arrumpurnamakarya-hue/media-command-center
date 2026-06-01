import { analyzeContentAssets } from './assetAnalyzer';

export type PlatformReadinessContent = {
  id?: string | null;
  title?: string | null;
  caption?: string | null;
  hashtags?: string | null;
  format?: string | null;
  asset_url?: string | null;
  asset_path?: string | null;
  asset_type?: string | null;
};

export type PlatformReadinessAsset = {
  file_url?: string | null;
  file_path?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  asset_type?: string | null;
  mime_type?: string | null;
  width?: number | string | null;
  height?: number | string | null;
  duration_seconds?: number | string | null;
  aspect_ratio?: number | string | null;
  is_vertical_video?: boolean | null;
  is_short_video?: boolean | null;
  public_url?: string | null;
  slide_order?: number | null;
  is_cover?: boolean | null;
};

export type PlatformReadinessResult = {
  platform: string;
  ready_for_dry_run: boolean;
  ready_for_live: boolean;
  status: 'ready' | 'warning' | 'not_ready';
  reason: string;
  requirements: string[];
  variant_needed: boolean;
  suggested_asset_type: 'image' | 'carousel' | 'video_9_16' | 'text';
  suggested_caption_note?: string;
};

type PlatformReadinessOptions = {
  facebookLiveEnabled?: boolean;
  instagramLiveEnabled?: boolean;
};

function normalizePlatform(platform: string) {
  return platform.trim().toUpperCase();
}

function isVideoAsset(asset: PlatformReadinessAsset) {
  if ((asset.asset_type || '').toLowerCase() === 'video') return true;
  if ((asset.mime_type || '').toLowerCase().startsWith('video/')) return true;
  if ((asset.file_type || '').toLowerCase().startsWith('video/')) return true;

  const fileReference = `${asset.file_url || ''} ${asset.file_path || ''} ${asset.file_name || ''}`.toLowerCase();
  return ['.mp4', '.mov', '.m4v', '.webm', '.avi'].some(extension => fileReference.includes(extension));
}

function isImageAsset(asset: PlatformReadinessAsset) {
  if ((asset.asset_type || '').toLowerCase() === 'image') return true;
  if ((asset.mime_type || '').toLowerCase().startsWith('image/')) return true;
  if ((asset.file_type || '').toLowerCase().startsWith('image/')) return true;

  const fileReference = `${asset.file_url || ''} ${asset.file_path || ''} ${asset.file_name || ''}`.toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(extension => fileReference.includes(extension));
}

function hasHttpsPublicUrl(asset: PlatformReadinessAsset) {
  return Boolean(asset.file_url && asset.file_url.startsWith('https://'));
}

function getEffectiveAssets(content: PlatformReadinessContent, assets: PlatformReadinessAsset[]) {
  const sortedAssets = [...assets]
    .filter(asset => asset.file_url || asset.file_path)
    .sort((a, b) => Number(a.slide_order || 0) - Number(b.slide_order || 0));

  if (sortedAssets.length > 0) return sortedAssets;
  if (!content.asset_url && !content.asset_path) return [];

  return [{
    file_url: content.asset_url || null,
    file_path: content.asset_path || null,
    file_type: content.asset_type || null,
    file_name: content.title || 'cover',
    slide_order: 1,
    is_cover: true,
  }];
}

function getCaption(content: PlatformReadinessContent) {
  return [
    content.caption?.trim(),
    content.hashtags?.trim(),
  ].filter(Boolean).join('\n\n');
}

function buildResult(
  platform: string,
  result: Omit<PlatformReadinessResult, 'platform'>,
): PlatformReadinessResult {
  return {
    platform: normalizePlatform(platform),
    ...result,
  };
}

export function checkPlatformReadiness(
  content: PlatformReadinessContent,
  assets: PlatformReadinessAsset[],
  platform: string,
  options: PlatformReadinessOptions = {},
): PlatformReadinessResult {
  const normalizedPlatform = normalizePlatform(platform);
  const effectiveAssets = getEffectiveAssets(content, assets);
  const assetAnalysis = analyzeContentAssets(effectiveAssets);
  const assetCount = effectiveAssets.length;
  const hasVideo = effectiveAssets.some(isVideoAsset);
  const hasImage = effectiveAssets.some(isImageAsset);
  const isTextOnly = assetCount === 0;
  const isSingleImage = assetCount === 1 && hasImage && !hasVideo;
  const isMultipleMedia = assetCount > 1;
  const allAssetsAreImages = assetCount > 0 && effectiveAssets.every(asset => isImageAsset(asset) && !isVideoAsset(asset));
  const allAssetsHaveHttpsUrl = assetCount > 0 && effectiveAssets.every(hasHttpsPublicUrl);
  const captionLength = getCaption(content).length;
  const firstAsset = effectiveAssets[0];
  const hasIncompleteVideoMetadata = assetAnalysis.reasons.some(reason => reason.includes('Metadata video belum lengkap'));
  const facebookLiveEnabled = typeof options.facebookLiveEnabled === 'boolean'
    ? options.facebookLiveEnabled
    : typeof process !== 'undefined' && process.env?.FACEBOOK_LIVE_PUBLISH_ENABLED === 'true';
  const instagramLiveEnabled = typeof options.instagramLiveEnabled === 'boolean'
    ? options.instagramLiveEnabled
    : typeof process !== 'undefined' && process.env?.INSTAGRAM_LIVE_PUBLISH_ENABLED === 'true';

  if (normalizedPlatform === 'FB') {
    if (isTextOnly) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: facebookLiveEnabled,
        status: 'ready',
        reason: facebookLiveEnabled ? 'Facebook text post siap live.' : 'Facebook live publish belum diaktifkan.',
        requirements: [],
        variant_needed: false,
        suggested_asset_type: 'text',
      });
    }

    if (hasVideo || (assetCount > 0 && !allAssetsAreImages)) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'warning',
        reason: assetAnalysis.is_single_video && assetAnalysis.vertical_video_ready
          ? 'Facebook Reels/video live belum diaktifkan.'
          : 'Facebook video live belum diaktifkan.',
        requirements: assetAnalysis.is_single_video && assetAnalysis.vertical_video_ready
          ? ['Live video belum aktif']
          : ['Need Image'],
        variant_needed: true,
        suggested_asset_type: assetAnalysis.is_single_video ? 'video_9_16' : 'image',
      });
    }

    if (assetCount > 10) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'warning',
        reason: 'Facebook multi-image maksimal 10 gambar.',
        requirements: ['Maksimal 10 gambar'],
        variant_needed: true,
        suggested_asset_type: 'carousel',
      });
    }

    if (!firstAsset || !allAssetsHaveHttpsUrl) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'warning',
        reason: 'Asset belum memiliki public URL HTTPS.',
        requirements: ['Public HTTPS URL wajib tersedia'],
        variant_needed: false,
        suggested_asset_type: isMultipleMedia ? 'carousel' : 'image',
      });
    }

    return buildResult(normalizedPlatform, {
      ready_for_dry_run: true,
      ready_for_live: facebookLiveEnabled,
      status: 'ready',
      reason: facebookLiveEnabled
        ? isMultipleMedia ? 'Facebook multi-image siap live.' : 'Facebook single image siap live.'
        : 'Facebook live publish belum diaktifkan.',
      requirements: [],
      variant_needed: false,
      suggested_asset_type: isMultipleMedia ? 'carousel' : 'image',
    });
  }

  if (normalizedPlatform === 'IG') {
    if (hasVideo || (assetCount > 0 && !allAssetsAreImages)) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'warning',
        reason: assetAnalysis.is_single_video && assetAnalysis.vertical_video_ready
          ? 'Instagram Reels live belum diaktifkan.'
          : 'Instagram video/reels live belum diaktifkan.',
        requirements: assetAnalysis.is_single_video && assetAnalysis.vertical_video_ready
          ? ['Live Reels belum aktif']
          : ['Need Single Image'],
        variant_needed: true,
        suggested_asset_type: assetAnalysis.is_single_video ? 'video_9_16' : 'image',
      });
    }

    if (assetCount > 10) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'warning',
        reason: 'Instagram carousel maksimal 10 slide.',
        requirements: ['Maksimal 10 slide'],
        variant_needed: true,
        suggested_asset_type: 'carousel',
      });
    }

    if (!isSingleImage && !isMultipleMedia) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'warning',
        reason: 'Instagram live tahap ini membutuhkan single image atau carousel image.',
        requirements: ['Need Image'],
        variant_needed: true,
        suggested_asset_type: 'image',
      });
    }

    if (!firstAsset || !allAssetsHaveHttpsUrl) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'warning',
        reason: 'Asset belum memiliki public URL HTTPS.',
        requirements: ['Public HTTPS URL wajib tersedia'],
        variant_needed: false,
        suggested_asset_type: 'image',
      });
    }

    if (!instagramLiveEnabled) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'ready',
        reason: 'Instagram live publish belum diaktifkan.',
        requirements: [],
        variant_needed: false,
        suggested_asset_type: isMultipleMedia ? 'carousel' : 'image',
      });
    }

    return buildResult(normalizedPlatform, {
      ready_for_dry_run: true,
      ready_for_live: true,
      status: 'ready',
      reason: isMultipleMedia ? 'Instagram carousel image siap live.' : 'Instagram single image siap live.',
      requirements: [],
      variant_needed: false,
      suggested_asset_type: isMultipleMedia ? 'carousel' : 'image',
    });
  }

  if (normalizedPlatform === 'TIKTOK') {
    if (!assetAnalysis.is_single_video) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'not_ready',
        reason: 'TikTok membutuhkan video vertical 9:16.',
        requirements: ['Need Video 9:16'],
        variant_needed: true,
        suggested_asset_type: 'video_9_16',
      });
    }

    if (hasIncompleteVideoMetadata) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'warning',
        reason: 'Metadata video belum lengkap. Periksa manual sebelum publish.',
        requirements: ['Periksa rasio 9:16 dan durasi <= 60 detik'],
        variant_needed: false,
        suggested_asset_type: 'video_9_16',
      });
    }

    if (!assetAnalysis.vertical_video_ready) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'not_ready',
        reason: 'TikTok membutuhkan video vertical 9:16.',
        requirements: ['Need Video 9:16'],
        variant_needed: true,
        suggested_asset_type: 'video_9_16',
      });
    }

    if (!assetAnalysis.short_video_ready) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'not_ready',
        reason: 'Durasi video terlalu panjang untuk format short.',
        requirements: ['Durasi maksimal 60 detik'],
        variant_needed: true,
        suggested_asset_type: 'video_9_16',
      });
    }

    return buildResult(normalizedPlatform, {
      ready_for_dry_run: true,
      ready_for_live: false,
      status: 'warning',
      reason: 'TikTok video siap secara format, live publish belum diaktifkan.',
      requirements: ['Live TikTok belum aktif'],
      variant_needed: false,
      suggested_asset_type: 'video_9_16',
    });
  }

  if (normalizedPlatform === 'X') {
    if (hasVideo) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'warning',
        reason: 'X video live belum diaktifkan.',
        requirements: ['Live video X belum aktif'],
        variant_needed: false,
        suggested_asset_type: 'video_9_16',
        suggested_caption_note: 'Caption X maksimal 280 karakter',
      });
    }

    if (captionLength > 280) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'warning',
        reason: 'Caption X/Twitter lebih dari 280 karakter; siapkan versi pendek.',
        requirements: ['Caption maksimal 280 karakter'],
        variant_needed: true,
        suggested_asset_type: isTextOnly ? 'text' : isMultipleMedia ? 'carousel' : 'image',
        suggested_caption_note: 'Caption X maksimal 280 karakter',
      });
    }

    return buildResult(normalizedPlatform, {
      ready_for_dry_run: true,
      ready_for_live: false,
      status: 'ready',
      reason: 'X/Twitter dry-run siap. Live publish belum diaktifkan.',
      requirements: [],
      variant_needed: false,
      suggested_asset_type: isTextOnly ? 'text' : isMultipleMedia ? 'carousel' : 'image',
      suggested_caption_note: 'Caption X maksimal 280 karakter',
    });
  }

  if (normalizedPlatform === 'YT') {
    if (!assetAnalysis.is_single_video) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'not_ready',
        reason: 'YouTube Shorts membutuhkan video vertical 9:16.',
        requirements: ['Need Video 9:16'],
        variant_needed: true,
        suggested_asset_type: 'video_9_16',
      });
    }

    if (hasIncompleteVideoMetadata) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'warning',
        reason: 'Metadata video belum lengkap. Periksa manual sebelum publish.',
        requirements: ['Periksa rasio 9:16 dan durasi <= 60 detik'],
        variant_needed: false,
        suggested_asset_type: 'video_9_16',
      });
    }

    if (!assetAnalysis.vertical_video_ready) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'not_ready',
        reason: 'YouTube Shorts membutuhkan video vertical 9:16.',
        requirements: ['Need Video 9:16'],
        variant_needed: true,
        suggested_asset_type: 'video_9_16',
      });
    }

    if (!assetAnalysis.short_video_ready) {
      return buildResult(normalizedPlatform, {
        ready_for_dry_run: true,
        ready_for_live: false,
        status: 'not_ready',
        reason: 'Durasi video Shorts maksimal 60 detik untuk tahap ini.',
        requirements: ['Durasi maksimal 60 detik'],
        variant_needed: true,
        suggested_asset_type: 'video_9_16',
      });
    }

    return buildResult(normalizedPlatform, {
      ready_for_dry_run: true,
      ready_for_live: false,
      status: 'warning',
      reason: 'YouTube Shorts siap secara format, live publish belum diaktifkan.',
      requirements: ['Live YouTube Shorts belum aktif'],
      variant_needed: false,
      suggested_asset_type: 'video_9_16',
    });
  }

  return buildResult(normalizedPlatform, {
    ready_for_dry_run: false,
    ready_for_live: false,
    status: 'not_ready',
    reason: 'Platform belum didukung.',
    requirements: ['Platform belum didukung'],
    variant_needed: true,
    suggested_asset_type: 'text',
  });
}

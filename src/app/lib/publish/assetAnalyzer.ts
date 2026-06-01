export type AnalyzableAsset = {
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
};

export type AssetAnalysisResult = {
  total_assets: number;
  image_count: number;
  video_count: number;
  has_video: boolean;
  has_image: boolean;
  is_single_image: boolean;
  is_carousel_image: boolean;
  is_single_video: boolean;
  has_mixed_media: boolean;
  vertical_video_ready: boolean;
  short_video_ready: boolean;
  reasons: string[];
  video_width: number | null;
  video_height: number | null;
  video_duration_seconds: number | null;
  video_aspect_ratio: number | null;
};

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isVideoAsset(asset: AnalyzableAsset) {
  const assetType = (asset.asset_type || '').toLowerCase();
  if (assetType === 'video') return true;
  if ((asset.mime_type || asset.file_type || '').toLowerCase().startsWith('video/')) return true;

  const fileReference = `${asset.file_url || ''} ${asset.file_path || ''} ${asset.file_name || ''}`.toLowerCase();
  return ['.mp4', '.mov', '.m4v', '.webm', '.avi'].some(extension => fileReference.includes(extension));
}

function isImageAsset(asset: AnalyzableAsset) {
  const assetType = (asset.asset_type || '').toLowerCase();
  if (assetType === 'image') return true;
  if ((asset.mime_type || asset.file_type || '').toLowerCase().startsWith('image/')) return true;

  const fileReference = `${asset.file_url || ''} ${asset.file_path || ''} ${asset.file_name || ''}`.toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(extension => fileReference.includes(extension));
}

function isNineBySixteen(width: number, height: number) {
  if (!width || !height || height <= width) return false;
  const ratio = width / height;
  return ratio >= 0.52 && ratio <= 0.60;
}

export function analyzeContentAssets(assets: AnalyzableAsset[]): AssetAnalysisResult {
  const totalAssets = assets.length;
  const imageAssets = assets.filter(isImageAsset);
  const videoAssets = assets.filter(isVideoAsset);
  const singleVideo = videoAssets.length === 1 && totalAssets === 1 ? videoAssets[0] : null;
  const width = singleVideo ? numberValue(singleVideo.width) : null;
  const height = singleVideo ? numberValue(singleVideo.height) : null;
  const duration = singleVideo ? numberValue(singleVideo.duration_seconds) : null;
  const explicitAspectRatio = singleVideo ? numberValue(singleVideo.aspect_ratio) : null;
  const aspectRatio = explicitAspectRatio || (width && height ? Number((width / height).toFixed(4)) : null);
  const explicitVertical = singleVideo?.is_vertical_video;
  const explicitShort = singleVideo?.is_short_video;
  const verticalVideoReady = Boolean(
    singleVideo &&
    (
      explicitVertical === true ||
      (width !== null && height !== null && isNineBySixteen(width, height))
    ),
  );
  const shortVideoReady = Boolean(
    singleVideo &&
    (
      explicitShort === true ||
      (duration !== null && duration <= 60)
    ),
  );
  const reasons: string[] = [];

  if (imageAssets.length > 0 && videoAssets.length > 0) {
    reasons.push('Konten campuran image dan video belum didukung untuk live publish.');
  }

  if (singleVideo && (width === null || height === null || duration === null)) {
    reasons.push('Metadata video belum lengkap. Periksa manual sebelum publish.');
  }

  if (singleVideo && width !== null && height !== null && !verticalVideoReady) {
    reasons.push('Video belum terdeteksi sebagai vertical 9:16.');
  }

  if (singleVideo && duration !== null && duration > 60) {
    reasons.push('Durasi video terlalu panjang untuk format short.');
  }

  return {
    total_assets: totalAssets,
    image_count: imageAssets.length,
    video_count: videoAssets.length,
    has_video: videoAssets.length > 0,
    has_image: imageAssets.length > 0,
    is_single_image: imageAssets.length === 1 && totalAssets === 1,
    is_carousel_image: imageAssets.length > 1 && videoAssets.length === 0,
    is_single_video: Boolean(singleVideo),
    has_mixed_media: imageAssets.length > 0 && videoAssets.length > 0,
    vertical_video_ready: verticalVideoReady,
    short_video_ready: shortVideoReady,
    reasons,
    video_width: width,
    video_height: height,
    video_duration_seconds: duration,
    video_aspect_ratio: aspectRatio,
  };
}

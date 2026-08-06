// Platform constraints for social media uploads.
// Values are conservative (feed/main format for each platform).
// Enforced client-side; if user is upset, we still POST since backend accepts.

export const PLATFORM_LIMITS = {
  instagram: {
    label: "Instagram",
    image: { maxMB: 30, maxWidth: 1080, minWidth: 320, aspects: ["1:1", "4:5", "1.91:1"] },
    video: { maxMB: 100, maxSeconds: 90, aspects: ["9:16", "1:1", "4:5"] }, // Reels 90s, Feed 60s but combined 90s ok
    notes: "Reels ≤ 90s · Feed video ≤ 60s · Aspect 9:16 for Reels",
  },
  tiktok: {
    label: "TikTok",
    image: { maxMB: 20, maxWidth: 1080, minWidth: 320, aspects: ["9:16", "1:1"] },
    video: { maxMB: 287, maxSeconds: 600, aspects: ["9:16"] }, // 10 min max
    notes: "Video ≤ 10 min · Vertical 9:16 preferred · Max 287MB",
  },
  snapchat: {
    label: "Snapchat",
    image: { maxMB: 5, maxWidth: 1080, minWidth: 320, aspects: ["9:16"] },
    video: { maxMB: 32, maxSeconds: 60, aspects: ["9:16"] },
    notes: "Snap ≤ 60s · Vertical 9:16 · Max 32MB",
  },
  x: {
    label: "X (Twitter)",
    image: { maxMB: 5, maxWidth: 4096, minWidth: 320, aspects: ["16:9", "1:1", "4:5"] },
    video: { maxMB: 512, maxSeconds: 140, aspects: ["16:9", "1:1"] }, // 2:20
    notes: "Video ≤ 2m 20s · Max 512MB · MP4/MOV",
  },
};

/**
 * Validate a file against a platform's constraints.
 * Returns { ok: true } or { ok: false, error: string, hint?: string }.
 * For videos it inspects the actual duration via a temporary <video> element.
 */
export async function validateForPlatform(file, platform) {
  const cfg = PLATFORM_LIMITS[platform];
  if (!cfg) return { ok: true };
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) {
    return { ok: false, error: "Only image or video files are allowed" };
  }
  const limits = isVideo ? cfg.video : cfg.image;
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > limits.maxMB) {
    return {
      ok: false,
      error: `الملف كبير: ${sizeMB.toFixed(1)}MB. الحد الأقصى لـ ${cfg.label}: ${limits.maxMB}MB`,
      hint: cfg.notes,
    };
  }
  if (isVideo) {
    const dur = await getVideoDuration(file);
    if (dur > limits.maxSeconds) {
      return {
        ok: false,
        error: `المقطع طويل: ${Math.round(dur)}ث. الحد الأقصى لـ ${cfg.label}: ${limits.maxSeconds}ث`,
        hint: cfg.notes,
      };
    }
  }
  return { ok: true };
}

function getVideoDuration(file) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { const d = v.duration; URL.revokeObjectURL(v.src); resolve(d); };
    v.onerror = () => { URL.revokeObjectURL(v.src); resolve(0); };
    v.src = URL.createObjectURL(file);
  });
}

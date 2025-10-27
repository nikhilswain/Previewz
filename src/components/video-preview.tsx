import React from "react";

// Simple detectors
const DIRECT_VIDEO_RE = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;
const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/i;
const DAILYMOTION_RE = /dailymotion\.com\/(?:video|hub)\/([\w-]+)/i;
const LOOM_RE = /loom\.com\/(?:share|embed)\/([\w-]+)/i;
const WISTIA_RE = /wistia\.(?:com|net)\/(?:medias|embed)\/([\w-]+)/i;

function isDirectVideo(url: string) {
  return DIRECT_VIDEO_RE.test(url);
}

function getYouTubeId(url: string): string | null {
  const match = url.match(YOUTUBE_RE);
  if (match) return match[1];
  // support regular youtube watch urls without regex group
  try {
    const u = new URL(url);
    if (
      (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") &&
      u.searchParams.get("v")
    ) {
      return u.searchParams.get("v");
    }
  } catch {}
  return null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(VIMEO_RE);
  return match ? match[1] : null;
}

function getDailymotionId(url: string): string | null {
  const match = url.match(DAILYMOTION_RE);
  return match ? match[1] : null;
}

function getLoomId(url: string): string | null {
  const match = url.match(LOOM_RE);
  return match ? match[1] : null;
}

function getWistiaId(url: string): string | null {
  const match = url.match(WISTIA_RE);
  return match ? match[1] : null;
}

export type VideoProps = {
  src: string;
  title?: string;
  className?: string;
};

/**
 * Renders a direct <video> tag for file URLs, or platform embeds for URLs from
 * YouTube, Vimeo, Dailymotion, Loom, and Wistia using sandboxed iframes.
 */
export function Video({
  src,
  title = "Video preview",
  className = "",
}: VideoProps) {
  // 1) Direct file
  if (isDirectVideo(src)) {
    return (
      <video src={src} controls className={className}>
        Your browser does not support the video tag.
      </video>
    );
  }

  // 2) YouTube
  const yt = getYouTubeId(src);
  if (yt) {
    const embed = `https://www.youtube.com/embed/${yt}`;
    return (
      <iframe
        src={embed}
        title={title}
        className={className}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
      />
    );
  }

  // 3) Vimeo
  const vimeo = getVimeoId(src);
  if (vimeo) {
    const embed = `https://player.vimeo.com/video/${vimeo}`;
    return (
      <iframe
        src={embed}
        title={title}
        className={className}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
      />
    );
  }

  // 4) Dailymotion
  const dm = getDailymotionId(src);
  if (dm) {
    const embed = `https://www.dailymotion.com/embed/video/${dm}`;
    return (
      <iframe
        src={embed}
        title={title}
        className={className}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
      />
    );
  }

  // 5) Loom
  const loom = getLoomId(src);
  if (loom) {
    const embed = `https://www.loom.com/embed/${loom}`;
    return (
      <iframe
        src={embed}
        title={title}
        className={className}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
      />
    );
  }

  // 6) Wistia
  const wistia = getWistiaId(src);
  if (wistia) {
    const embed = `https://fast.wistia.net/embed/iframe/${wistia}`;
    return (
      <iframe
        src={embed}
        title={title}
        className={className}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
      />
    );
  }

  // Fallback: try to render in an iframe when it's likely a streaming provider
  return (
    <div className="w-full space-y-2">
      <div className="text-sm text-muted-foreground font-medium">(embed)</div>
      <iframe
        src={src}
        title={title}
        className={className}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
}

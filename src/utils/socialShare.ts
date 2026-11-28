import { safeUrl } from "./analytics";

export const DEFAULT_OG_COVER_PATH = "/og-cover.jpg";

export type SocialPlatformId =
  | "x"
  | "linkedin"
  | "whatsapp"
  | "telegram"
  | "facebook"
  | "email";

export interface SocialShareLink {
  id: SocialPlatformId;
  label: { en: string; ar: string };
  href: string;
}

export function resolveAbsoluteShareUrl(domain: string | undefined, hashPath: string): string {
  const cleanDomain = (domain || "https://abdokamelayed.github.io").trim().replace(/\/+$/, "");
  const cleanHash = (hashPath || "#/").trim();
  if (!cleanHash || cleanHash === "#" || cleanHash === "#/") {
    return `${cleanDomain}/`;
  }
  const normalizedHash = cleanHash.startsWith("#")
    ? cleanHash
    : `#/${cleanHash.replace(/^\/+/, "")}`;
  return `${cleanDomain}/${normalizedHash}`;
}

/**
 * Resolves a local or remote asset URL to an absolute https:// URL suitable for
 * OpenGraph (`og:image`) and Twitter (`twitter:image`) preview cards, plus a local
 * browser-renderable preview URL.
 */
export function resolveLinkPreviewImage(
  candidate: string | null | undefined,
  fallbackCandidate: string | null | undefined,
  baseDomain: string | undefined
): { absoluteUrl: string; displaySrc: string } {
  const cleanDomain = (baseDomain || "https://abdokamelayed.github.io").trim().replace(/\/+$/, "");
  const picked =
    safeUrl(candidate) ||
    safeUrl(fallbackCandidate) ||
    DEFAULT_OG_COVER_PATH;

  if (/^https?:\/\//i.test(picked)) {
    return { absoluteUrl: picked, displaySrc: picked };
  }

  const normalizedRel = picked.startsWith("./")
    ? `/${picked.slice(2)}`
    : picked.startsWith("/")
    ? picked
    : `/${picked}`;

  return {
    absoluteUrl: `${cleanDomain}${normalizedRel}`,
    displaySrc: normalizedRel,
  };
}

export function buildSocialShareLinks(params: {
  url: string;
  title: string;
  summary?: string;
  tags?: string[];
}): SocialShareLink[] {
  const shareUrl = params.url.trim();
  const title = params.title.trim();
  const summary = (params.summary || "").trim();
  const hashtags = (params.tags || [])
    .slice(0, 3)
    .map((t) => t.replace(/[^A-Za-z0-9_]/g, ""))
    .filter(Boolean)
    .join(",");

  const xParams = new URLSearchParams({
    text: title,
    url: shareUrl,
  });
  if (hashtags) {
    xParams.set("hashtags", hashtags);
  }

  const whatsappText = summary ? `${title}\n${summary}\n${shareUrl}` : `${title}\n${shareUrl}`;
  const telegramParams = new URLSearchParams({
    url: shareUrl,
    text: title,
  });
  const linkedInParams = new URLSearchParams({
    url: shareUrl,
  });
  const facebookParams = new URLSearchParams({
    u: shareUrl,
  });
  const emailSubject = encodeURIComponent(title);
  const emailBody = encodeURIComponent(
    summary ? `${summary}\n\nRead more: ${shareUrl}` : shareUrl
  );

  return [
    {
      id: "x",
      label: { en: "X / Twitter", ar: "X / تويتر" },
      href: `https://twitter.com/intent/tweet?${xParams.toString()}`,
    },
    {
      id: "linkedin",
      label: { en: "LinkedIn", ar: "لينكدإن" },
      href: `https://www.linkedin.com/sharing/share-offsite/?${linkedInParams.toString()}`,
    },
    {
      id: "whatsapp",
      label: { en: "WhatsApp", ar: "واتساب" },
      href: `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
    },
    {
      id: "telegram",
      label: { en: "Telegram", ar: "تيليجرام" },
      href: `https://t.me/share/url?${telegramParams.toString()}`,
    },
    {
      id: "facebook",
      label: { en: "Facebook", ar: "فيسبوك" },
      href: `https://www.facebook.com/sharer/sharer.php?${facebookParams.toString()}`,
    },
    {
      id: "email",
      label: { en: "Email", ar: "البريد" },
      href: `mailto:?subject=${emailSubject}&body=${emailBody}`,
    },
  ];
}

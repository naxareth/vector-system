import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_COURSE_HOSTS = [
  'udemy.com',
  'coursera.org',
  'edx.org',
  'freecodecamp.org',
  'academy.hubspot.com',
  'linkedin.com',
  'learning.linkedin.com',
  'microsoft.com',
  'learn.microsoft.com',
  'grow.google',
  'skillshop.withgoogle.com',
  'developers.google.com',
];

const PROVIDER_COLORS: Record<string, { start: string; end: string }> = {
  udemy: { start: '#7c3aed', end: '#5b21b6' },
  coursera: { start: '#2563eb', end: '#1d4ed8' },
  edx: { start: '#475569', end: '#1e293b' },
  freecodecamp: { start: '#16a34a', end: '#15803d' },
  hubspot: { start: '#f97316', end: '#ea580c' },
  linkedin: { start: '#0ea5e9', end: '#0284c7' },
  default: { start: '#06B4C9', end: '#0f766e' },
};

function isAllowedCourseUrl(rawUrl: string | null): URL | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    const hostname = url.hostname.toLowerCase();
    const isAllowed = ALLOWED_COURSE_HOSTS.some(
      allowed => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );

    return isAllowed ? url : null;
  } catch {
    return null;
  }
}

function readTagAttribute(tag: string, attr: string): string | null {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match?.[1] ?? null;
}

function decodeHtmlValue(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function resolveAbsoluteUrl(candidate: string | null, pageUrl: URL): string | null {
  if (!candidate) return null;

  try {
    return new URL(decodeHtmlValue(candidate), pageUrl).toString();
  } catch {
    return null;
  }
}

function extractMetaImage(html: string, pageUrl: URL): string | null {
  const preferredKeys = new Set(['og:image', 'twitter:image', 'twitter:image:src', 'image']);

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = (readTagAttribute(tag, 'property') || readTagAttribute(tag, 'name') || '').toLowerCase();
    const content = readTagAttribute(tag, 'content');

    if (preferredKeys.has(key)) {
      const absolute = resolveAbsoluteUrl(content, pageUrl);
      if (absolute) return absolute;
    }
  }

  return null;
}

function findImageInJsonLd(payload: unknown): string | null {
  if (!payload) return null;

  if (typeof payload === 'string') {
    return payload.startsWith('http://') || payload.startsWith('https://') ? payload : null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findImageInJsonLd(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    if (record.image) {
      const found = findImageInJsonLd(record.image);
      if (found) return found;
    }

    for (const value of Object.values(record)) {
      const found = findImageInJsonLd(value);
      if (found) return found;
    }
  }

  return null;
}

function extractJsonLdImage(html: string, pageUrl: URL): string | null {
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const scriptBody = match[1]?.trim();
    if (!scriptBody) continue;

    try {
      const parsed = JSON.parse(scriptBody);
      const image = findImageInJsonLd(parsed);
      const absolute = resolveAbsoluteUrl(image, pageUrl);
      if (absolute) return absolute;
    } catch {
      continue;
    }
  }

  return null;
}

function extractUdemySpecificImage(html: string, pageUrl: URL): string | null {
  const patterns = [
    /"image_750x422"\s*:\s*"([^"]+)"/i,
    /"image_480x270"\s*:\s*"([^"]+)"/i,
    /"image_240x135"\s*:\s*"([^"]+)"/i,
    /"thumbnail_url"\s*:\s*"([^"]+)"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const absolute = resolveAbsoluteUrl(match[1], pageUrl);
      if (absolute) return absolute;
    }
  }

  return null;
}

function extractPreviewImage(html: string, pageUrl: URL): string | null {
  const strategies = [
    () => extractUdemySpecificImage(html, pageUrl),
    () => extractMetaImage(html, pageUrl),
    () => extractJsonLdImage(html, pageUrl),
  ];

  for (const getImage of strategies) {
    const image = getImage();
    if (image) return image;
  }

  return null;
}

function svgEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPlaceholderSvg(title: string, provider: string | null): string {
  const label = provider?.trim() || 'Course';
  const colors = PROVIDER_COLORS[(provider || '').toLowerCase()] || PROVIDER_COLORS.default;
  const titleText = title.trim() || 'Recommended course';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180" fill="none">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${colors.start}"/>
          <stop offset="100%" stop-color="${colors.end}"/>
        </linearGradient>
      </defs>
      <rect width="320" height="180" rx="18" fill="url(#g)"/>
      <circle cx="270" cy="42" r="42" fill="white" fill-opacity="0.10"/>
      <circle cx="292" cy="20" r="22" fill="white" fill-opacity="0.12"/>
      <rect x="22" y="28" width="82" height="24" rx="12" fill="white" fill-opacity="0.16"/>
      <text x="32" y="44" fill="white" font-size="13" font-family="Arial, sans-serif" font-weight="700">${svgEscape(label)}</text>
      <path d="M49 112.5V71.5C49 69.567 50.567 68 52.5 68H132.5C134.433 68 136 69.567 136 71.5V123.5C136 125.433 134.433 127 132.5 127H62.5C60.567 127 59 125.433 59 123.5V82.5" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M65 83H118" stroke="white" stroke-width="7" stroke-linecap="round"/>
      <path d="M65 98H118" stroke="white" stroke-width="7" stroke-linecap="round"/>
      <text x="22" y="148" fill="white" font-size="17" font-family="Arial, sans-serif" font-weight="700">${svgEscape(titleText.slice(0, 34))}</text>
    </svg>
  `.trim();
}

function placeholderResponse(title: string, provider: string | null): NextResponse {
  return new NextResponse(buildPlaceholderSvg(title, provider), {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=21600',
    },
  });
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VECTORBot/1.0; +https://vector.local)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 21600 },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    return response.text();
  } catch {
    return null;
  }
}

async function fetchImageResponse(imageUrl: string): Promise<NextResponse | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; VECTORBot/1.0; +https://vector.local)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 21600 },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=21600',
      },
    });
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const rawUrl = searchParams.get('url');
  const provider = searchParams.get('provider');
  const title = searchParams.get('title') || 'Recommended course';

  const courseUrl = isAllowedCourseUrl(rawUrl);
  if (!courseUrl) {
    return placeholderResponse(title, provider);
  }

  const html = await fetchText(courseUrl.toString());
  if (!html) {
    return placeholderResponse(title, provider);
  }

  const previewImage = extractPreviewImage(html, courseUrl);
  if (!previewImage) {
    return placeholderResponse(title, provider);
  }

  const proxiedImage = await fetchImageResponse(previewImage);
  return proxiedImage ?? placeholderResponse(title, provider);
}

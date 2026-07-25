import type { NextConfig } from "next";

// CSP is a fully static string (no nonce, nothing request-dependent), so it is
// served as a CDN header here instead of from middleware. That removes a
// serverless middleware invocation from every single request.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  // https: allows user-provided image URLs (product cards, image blocks, avatars)
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "connect-src 'self' https://*.supabase.co https://api.telegram.org https://api.groq.com https://mc.yandex.ru https://*.google-analytics.com",
  "font-src 'self'",
  "frame-src https://www.youtube.com https://www.tiktok.com",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Block MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limit referrer info sent to external sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable unused browser features
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Enforce HTTPS for 1 year (Vercel already uses HTTPS, this tells browsers to remember)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
        destination: 'https://tapni.kz/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // /tapni.kz/{alias} only ever answers with a redirect or a 404 — it
        // never serves content, so there is nothing here worth indexing.
        // Saying so explicitly keeps these URLs out of search results and off
        // the crawl budget. Deliberately NOT a robots.txt Disallow: crawlers
        // should still be free to follow the redirect through to its target.
        source: '/tapni.kz/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
      },
    ]
  },
};

export default nextConfig;

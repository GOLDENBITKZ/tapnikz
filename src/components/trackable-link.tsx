'use client'

import { useRef } from 'react'

// Native app icon types — on mobile, navigating in the same WebView window
// (via JS interception) is faster than _blank which may launch an external browser.
const NATIVE_APP_ICONS = new Set([
  'whatsapp', 'telegram', 'kaspi_pay', 'kaspi_shop', 'kaspi',
  'tiktok', 'phone', 'email', 'twogis', 'youtube',
  'vk', 'facebook', 'android', 'ios',
])

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  id: string
  url: string
  iconType?: string
  needsDeepLink?: boolean
}

export function TrackableLink({
  id, url, iconType, needsDeepLink,
  children, style, className, ...props
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null)

  function onTouchStart() {
    const el = ref.current
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = 'scale(0.95)'
    el.style.opacity = '0.88'
  }

  function onRelease() {
    const el = ref.current
    if (!el) return
    el.style.transition = 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 120ms ease-out'
    el.style.transform = ''
    el.style.opacity = ''
  }

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // When needsDeepLink=true navigation goes to /api/click which already tracks.
    // Don't double-count by also firing beacon.
    if (!needsDeepLink) {
      try {
        navigator.sendBeacon(
          '/api/click-beacon',
          new Blob([JSON.stringify({ id })], { type: 'application/json' }),
        )
      } catch { /* old browser — skip */ }
    }

    // On mobile, navigate in same window for native app links (avoids external browser launch).
    // Computed at click time to avoid SSR/hydration mismatch from reading navigator at render.
    if (!needsDeepLink && iconType && NATIVE_APP_ICONS.has(iconType)) {
      const ua = navigator.userAgent
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua)
      if (isMobile) {
        e.preventDefault()
        // Android: use Intent URL to force-open Kaspi app directly, bypassing WebView/browser.
        // Without this, Instagram/TikTok in-app browsers intercept Universal Links and open
        // the pay.kaspi.kz website instead of the native app.
        if (iconType === 'kaspi_pay' && /Android/i.test(ua)) {
          try {
            const { hostname, pathname } = new URL(url)
            const fallback = encodeURIComponent(url)
            window.location.href = `intent://${hostname}${pathname}#Intent;scheme=https;package=kz.kaspi.mobile;S.browser_fallback_url=${fallback};end`
            return
          } catch { /* malformed url — fall through */ }
        }
        window.location.href = url
      }
    }
  }

  return (
    <a
      ref={ref}
      href={needsDeepLink ? `/api/click?id=${id}` : url}
      target="_blank"
      rel="noopener noreferrer"
      onTouchStart={onTouchStart}
      onTouchEnd={onRelease}
      onTouchCancel={onRelease}
      onClick={onClick}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        willChange: 'transform',
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </a>
  )
}

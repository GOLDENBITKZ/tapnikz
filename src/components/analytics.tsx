'use client'

// Yandex Metrica + Google Analytics 4
// Set NEXT_PUBLIC_YM_ID and/or NEXT_PUBLIC_GA_ID in .env.local to activate.
// Both are optional and independent — the component renders nothing if neither is set.

import Script from 'next/script'

const YM_ID = process.env.NEXT_PUBLIC_YM_ID
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export function Analytics() {
  if (!YM_ID && !GA_ID) return null

  return (
    <>
      {YM_ID && (
        <>
          <Script id="ym-init" strategy="afterInteractive">{`
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
            ym(${YM_ID},'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
          `}</Script>
          <noscript>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://mc.yandex.ru/watch/${YM_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="" />
            </div>
          </noscript>
        </>
      )}
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer=window.dataLayer||[];
            function gtag(){dataLayer.push(arguments);}
            gtag('js',new Date());
            gtag('config','${GA_ID}',{page_path:window.location.pathname});
          `}</Script>
        </>
      )}
    </>
  )
}

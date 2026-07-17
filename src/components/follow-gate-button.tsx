'use client'

import { useState } from 'react'
import { X, Lock, CheckCircle2, ExternalLink } from 'lucide-react'

interface Props {
  linkId: string
  title: string
  igHandle: string
  contentUrl: string
  themeCard: string
  themeText: string
  themeSubtext: string
  themeBg: string
}

export function FollowGateButton({ title, igHandle, contentUrl, themeCard, themeText, themeSubtext, themeBg }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [goClicked, setGoClicked] = useState(false)

  function closeModal() {
    setOpen(false)
    setTimeout(() => { setStep(1); setGoClicked(false) }, 300)
  }

  function handleGoToInstagram() {
    window.open(`https://instagram.com/${igHandle.replace(/^@/, '')}`, '_blank')
    setGoClicked(true)
  }

  function handleConfirm() {
    setStep(2)
  }

  function handleGetContent() {
    const url = contentUrl.startsWith('http') ? contentUrl : `https://${contentUrl}`
    window.open(url, '_blank')
    closeModal()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-4 rounded-2xl border border-violet-500/30 bg-violet-600/15 px-5 py-4 text-violet-300 transition-all duration-150 active:scale-[0.98] hover:scale-[1.01] hover:bg-violet-600/25"
        style={{ boxShadow: '0 6px 24px rgba(124,58,237,0.25)' }}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600/30">
          <Lock className="h-5 w-5 text-violet-300" />
        </div>
        <span className="flex-1 text-left text-sm font-bold leading-tight">{title}</span>
        <svg className="h-4 w-4 opacity-40" viewBox="0 0 16 16" fill="none">
          <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 backdrop-blur-sm sm:items-center"
          onClick={closeModal}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border border-white/[0.08] ${themeBg} p-6 shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className={`text-base font-bold ${themeText}`}>{title}</p>
                <p className={`text-xs ${themeSubtext} opacity-70`}>
                  {step === 1 ? `Подпишитесь на @${igHandle.replace(/^@/, '')}` : 'Доступ открыт!'}
                </p>
              </div>
              <button
                onClick={closeModal}
                aria-label="Закрыть"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-gray-400 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {step === 1 ? (
              <div className="space-y-3">
                {/* Instagram profile card */}
                <div className={`flex items-center gap-3 rounded-2xl border ${themeCard} px-4 py-3`}>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white" aria-hidden>
                      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 3.252.148 4.771 1.691 4.919 4.919.049 1.265.064 1.645.064 4.849 0 3.205-.015 3.585-.074 4.85-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.071 4.849-.071zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${themeText}`}>@{igHandle.replace(/^@/, '')}</p>
                    <p className={`text-xs ${themeSubtext} opacity-60`}>Instagram</p>
                  </div>
                </div>

                <button
                  onClick={handleGoToInstagram}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] py-3.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Открыть Instagram и подписаться
                </button>

                {goClicked && (
                  <button
                    onClick={handleConfirm}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3.5 text-sm font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-[0.98]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Я подписался — открыть материал
                  </button>
                )}

                <p className={`text-center text-[11px] ${themeSubtext} opacity-40`}>
                  Подпишитесь и нажмите «Я подписался»
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20">
                  <CheckCircle2 className="h-9 w-9 text-emerald-400" />
                </div>
                <p className={`text-base font-bold ${themeText}`}>Доступ открыт! 🎉</p>
                <p className={`text-xs ${themeSubtext} opacity-70`}>Спасибо за подписку! Нажмите кнопку ниже чтобы получить материал.</p>
                <button
                  onClick={handleGetContent}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-violet-500 active:scale-[0.98]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Получить материал →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

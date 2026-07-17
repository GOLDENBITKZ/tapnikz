'use client'

import { QRCodeCanvas } from 'qrcode.react'

export function DemoQR({ url }: { url: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-lg shadow-black/40">
      <QRCodeCanvas
        value={url}
        size={140}
        level="H"
        imageSettings={{
          src: '/brand-logo.jpeg',
          height: 32,
          width: 32,
          excavate: true,
        }}
      />
    </div>
  )
}

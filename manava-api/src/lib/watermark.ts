// Watermark preview editor. Tidak pakai dependensi image processing native —
// server membungkus data URL gambar asli ke dalam SVG dengan overlay teks
// diagonal berulang. Data URL SVG hasil disimpan sebagai attachment message,
// sehingga klien menerima gambar yang sudah bertampilan bertanda.
//
// Catatan keamanan: ini watermark visual, bukan DRM. Klien yang membedah data
// URL SVG dapat mengekstrak base64 gambar aslinya. Untuk keperluan bukti hasil
// kerja dan hambatan pencurian aset yang wajar, kami menganggap ini cukup.

const XML_ESCAPES: Record<string, string> = {
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}
function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, c => XML_ESCAPES[c]!)
}

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/

export function isImageDataUrl(value: string): boolean {
  return DATA_URL_RE.test(value)
}

interface WatermarkOptions {
  imageDataUrl: string
  width: number
  height: number
  label: string        // teks watermark utama, mis. "Manava · Rudi Hartono"
  sublabel?: string    // baris kedua kecil, mis. tanggal atau nama proyek
}

/**
 * Bungkus gambar (data URL) ke SVG data URL dengan watermark diagonal berulang.
 * Dimensi viewBox diambil dari input agar rasio asli terpelihara.
 */
export function watermarkImageDataUrl(opts: WatermarkOptions): string {
  const w = Math.max(200, Math.min(6000, Math.round(opts.width)))
  const h = Math.max(200, Math.min(6000, Math.round(opts.height)))
  const label = escapeXml(opts.label.trim() || 'PREVIEW · MANAVA')
  const sublabel = opts.sublabel ? escapeXml(opts.sublabel) : ''

  // Ukuran font mengikuti sisi terpendek supaya konsisten baik landscape maupun
  // potret; jarak pattern juga proporsional.
  const short = Math.min(w, h)
  const fontMain = Math.max(24, Math.round(short / 22))
  const fontSub = Math.max(14, Math.round(fontMain * 0.55))
  const patternW = Math.round(short / 1.6)
  const patternH = Math.round(patternW * 0.55)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <image xlink:href="${opts.imageDataUrl}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>
  <defs>
    <pattern id="mv-wm" width="${patternW}" height="${patternH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
      <g fill="#ffffff" fill-opacity="0.38" font-family="'Inter Display', Inter, system-ui, sans-serif" font-weight="700" letter-spacing="2">
        <text x="0" y="${Math.round(patternH * 0.55)}" font-size="${fontMain}">${label}</text>
        ${sublabel ? `<text x="0" y="${Math.round(patternH * 0.55) + fontMain + 4}" font-size="${fontSub}" font-weight="500">${sublabel}</text>` : ''}
      </g>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#mv-wm)"/>
  <g font-family="'Inter Display', Inter, system-ui, sans-serif" fill="#ffffff" fill-opacity="0.85">
    <rect x="${w - Math.round(short / 3.2)}" y="${h - Math.round(short / 12)}" width="${Math.round(short / 3.2) - 8}" height="${Math.round(short / 20)}" fill="#000000" fill-opacity="0.55" rx="6"/>
    <text x="${w - Math.round(short / 3.2) + 12}" y="${h - Math.round(short / 12) + Math.round(short / 32)}" font-size="${Math.max(12, Math.round(short / 55))}" font-weight="600">PREVIEW · ${label}</text>
  </g>
</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
}

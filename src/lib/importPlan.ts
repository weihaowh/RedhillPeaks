// Turns an uploaded floor plan (image or PDF) into a PNG/JPEG blob plus its pixel size.

export interface ImportedImage {
  blob: Blob
  width: number
  height: number
}

const PDF_RENDER_WIDTH = 2400

export async function importPlanFile(file: File): Promise<ImportedImage> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return renderPdf(file)
  if (!file.type.startsWith('image/')) throw new Error('Please choose a PNG, JPG or PDF file.')
  const bitmap = await createImageBitmap(file)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return { blob: file, ...size }
}

async function renderPdf(file: File): Promise<ImportedImage> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  try {
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: PDF_RENDER_WIDTH / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render the PDF.'))), 'image/png'),
    )
    return { blob, width: canvas.width, height: canvas.height }
  } finally {
    await doc.destroy()
  }
}

import PDFDocument from 'pdfkit'

export interface DebitNoteData {
  correlative: string
  issueDate: string
  period: { label: string; periodLabel: string; start: string; end: string; year: number; month: number }
  issuer: { name: string; nit: string; address: string }
  client: { id: string; name: string; email: string | null; phone: string | null; documentType: string | null; documentNumber: string | null; address: string | null }
  summary: {
    txCount: number
    totalGross: number
    baseRate: number
    discountRate: number
    discountThreshold: number
    hasDiscount: boolean
    isDirect?: boolean
    collectionType?: string
    qualifiesForDiscount: boolean
    effectiveRate: number
    avgCommissionPercent: number
    totalCommission: number
    netAmount: number
    firstTx: string | null
    lastTx: string | null
  }
  concept: string
  currency: string
  payment?: { qrDataUrl?: string | null; paymentUrl?: string | null; amount?: number; currency?: string }
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
}

export async function generateDebitNotePdf(data: DebitNoteData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `Nota de debito ${data.correlative}`, Author: 'PAGUI' } })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = 595.28
    const H = 841.89
    const M = 42

    const cSlate900 = '#1e293b'
    const cSlate600 = '#475569'
    const cSlate500 = '#64748b'
    const cSlate400 = '#94a3b8'
    const cSlate300 = '#cbd5e1'
    const cSlate200 = '#e2e8f0'
    const cSlate100 = '#f1f5f9'
    const cSlate50 = '#f8fafc'

    // Top thin line
    doc.save().rect(0, 0, W, 1.5).fill(cSlate200).restore()

    // Header - left brand
    let y = 38
    doc.fillColor(cSlate900).font('Helvetica-Bold').fontSize(20).text('PAGUI', M, y, { lineBreak: false })
    doc.fillColor(cSlate500).font('Helvetica').fontSize(7).text('IATHINGS  ·  Plataforma de recaudación', M, y + 18, { lineBreak: false })
    doc.fillColor(cSlate400).font('Helvetica').fontSize(6).text(data.issuer.address, M, y + 28, { lineBreak: false })

    // Header - right doc meta (fixed width, no overflow)
    const metaW = 180
    const metaX = W - M - metaW
    doc.fillColor(cSlate500).font('Helvetica-Bold').fontSize(6).text('NOTA DE DÉBITO', metaX, y, { width: metaW, align: 'right' })
    doc.fillColor(cSlate900).font('Helvetica-Bold').fontSize(12).text(data.correlative, metaX, y + 10, { width: metaW, align: 'right' })
    const issueDateStr = new Date(data.issueDate).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })
    doc.fillColor(cSlate400).font('Helvetica').fontSize(7).text(`${issueDateStr}  ·  ${data.period.periodLabel}`, metaX, y + 26, { width: metaW, align: 'right' })

    // Divider
    y = 72
    doc.save().moveTo(M, y).lineTo(W - M, y).strokeColor(cSlate100).lineWidth(1).stroke().restore()

    // Client card - clean, no rounded rect overflow, just bordered rect with header
    y = 82
    const cardX = M
    const cardW = W - M * 2
    const cardHeadH = 18
    const cardH = 62
    // Outer
    doc.save().roundedRect(cardX, y, cardW, cardH, 6).strokeColor(cSlate200).lineWidth(0.7).stroke().restore()
    // Head bg
    doc.save().roundedRect(cardX, y, cardW, cardHeadH, 6).fill(cSlate50).restore()
    doc.save().rect(cardX, y + 10, cardW, 8).fill(cSlate50).restore()
    doc.save().moveTo(cardX, y + cardHeadH).lineTo(cardX + cardW, y + cardHeadH).strokeColor(cSlate200).lineWidth(0.5).stroke().restore()
    doc.fillColor(cSlate600).font('Helvetica-Bold').fontSize(6).text('CLIENTE', cardX + 10, y + 7, { lineBreak: false })
    doc.fillColor(cSlate500).font('Helvetica').fontSize(6).text(`${data.period.label}  ·  ${data.summary.txCount} transacciones`, cardX, y + 7, { width: cardW - 10, align: 'right' })

    const col1X = cardX + 12
    const col2X = cardX + cardW / 2 + 8
    const field = (label: string, value: string, x: number, yy: number) => {
      doc.fillColor(cSlate400).font('Helvetica-Bold').fontSize(5.5).text(label, x, yy, { lineBreak: false })
      doc.fillColor(cSlate900).font('Helvetica').fontSize(8).text(value, x, yy + 8, { width: cardW / 2 - 20, lineBreak: false, ellipsis: true })
    }
    let ry = y + 24
    field('EMPRESA', data.client.name, col1X, ry)
    field('NIT / DOCUMENTO', (data.client.documentNumber || '—') + (data.client.documentType ? ` (${data.client.documentType})` : ''), col2X, ry)
    ry += 18
    const periodStr = `${data.period.start.slice(0, 10)} - ${new Date(new Date(data.period.end).getTime() - 86400000).toISOString().slice(0, 10)}`
    field('TELÉFONO', data.client.phone || '—', col1X, ry)
    field('PERIODO', periodStr, col2X, ry)

    // Concept - minimal, no pill overlapping
    y = 152
    const conceptH = 36
    doc.save().roundedRect(cardX, y, cardW, conceptH, 6).fillAndStroke(cSlate50, cSlate200).restore()
    doc.fillColor(cSlate400).font('Helvetica-Bold').fontSize(5.5).text('CONCEPTO', cardX + 12, y + 8, { lineBreak: false })
    const rateText = data.summary.hasDiscount
      ? (data.summary.qualifiesForDiscount ? `0.05% aplicado` : `0.10% -> 0.05% si > Bs ${Number(data.summary.discountThreshold).toLocaleString('es-BO')}`)
      : '0.10% fijo'
    doc.fillColor(cSlate900).font('Helvetica-Bold').fontSize(8).text(`Comisión por servicio de recaudación  ·  ${data.summary.avgCommissionPercent.toFixed(2)}%`, cardX + 12, y + 18, { lineBreak: false })
    doc.fillColor(cSlate500).font('Helvetica').fontSize(6).text(rateText, cardX + 12 + doc.widthOfString(`Comisión por servicio de recaudación  ·  ${data.summary.avgCommissionPercent.toFixed(2)}% `) , y + 18.5, { lineBreak: false })
    doc.fillColor(cSlate500).font('Helvetica').fontSize(6.5).text(`${data.summary.txCount} transacciones por Bs ${fmt(data.summary.totalGross)}  ·  ${data.period.periodLabel}`, cardX + 12, y + 27, { lineBreak: false })

    // Table - minimal, no overlapping, fixed col widths
    y = 200
    const thH = 16
    const colDet = cardW - 130
    const colAmt = 130
    // Header
    doc.save().rect(cardX, y, cardW, thH).fill(cSlate50).restore()
    doc.save().moveTo(cardX, y).lineTo(cardX + cardW, y).strokeColor(cSlate200).lineWidth(0.5).stroke().restore()
    doc.save().moveTo(cardX, y + thH).lineTo(cardX + cardW, y + thH).strokeColor(cSlate200).lineWidth(0.5).stroke().restore()
    doc.save().moveTo(cardX + colDet, y).lineTo(cardX + colDet, y + thH).strokeColor(cSlate200).lineWidth(0.5).stroke().restore()
    doc.fillColor(cSlate500).font('Helvetica-Bold').fontSize(6).text('DETALLE', cardX + 8, y + 6, { width: colDet - 16, lineBreak: false })
    doc.fillColor(cSlate500).font('Helvetica-Bold').fontSize(6).text('IMPORTE (BOB)', cardX + colDet, y + 6, { width: colAmt - 8, align: 'right' })

    let ty = y + thH
    const isDirect = !!(data.summary as any).isDirect
    const rows: Array<{ label: string; sub?: string; value: string; bold?: boolean; isNet?: boolean }> = [
      { label: 'Bruto recaudado', sub: `${data.summary.txCount} ops`, value: `Bs ${fmt(data.summary.totalGross)}` },
      { label: `Comisión ${data.summary.avgCommissionPercent.toFixed(2)}%`, sub: data.summary.hasDiscount ? `Base ${(data.summary.baseRate * 100).toFixed(2)}% -> ${(data.summary.discountRate * 100).toFixed(2)}%` : undefined, value: `Bs ${fmt(data.summary.totalCommission)}`, bold: true },
      { label: isDirect ? 'Neto a liquidar (directo)' : 'Neto a liquidar a empresa', sub: isDirect ? '0 — fondos directo a cuenta propia, solo comisión' : undefined, value: `Bs ${fmt(data.summary.netAmount)}`, bold: true, isNet: true },
    ]
    for (const r of rows) {
      const h = r.sub ? 22 : 16
      if (r.isNet) {
        doc.save().roundedRect(cardX, ty, cardW, h, 4).fill(cSlate50).restore()
      }
      doc.fillColor(cSlate900).font(r.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).text(r.label, cardX + 8, ty + 6, { width: colDet - 16, lineBreak: false })
      if (r.sub) {
        doc.fillColor(cSlate500).font('Helvetica').fontSize(5.5).text(r.sub, cardX + 8, ty + 14, { width: colDet - 16, lineBreak: false })
      }
      doc.fillColor(cSlate900).font(r.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).text(r.value, cardX + colDet, ty + 6, { width: colAmt - 8, align: 'right' })
      doc.save().moveTo(cardX, ty + h).lineTo(cardX + cardW, ty + h).strokeColor(cSlate100).lineWidth(0.5).stroke().restore()
      ty += h
    }

    // QR para pago (si existe)
    const qr = (data as any).payment?.qrDataUrl as string | null
    if (qr) {
      try {
        const b64 = qr.includes(',') ? qr.split(',')[1] : qr
        const buf = Buffer.from(b64, 'base64')
        const qrSize = 145
        const qrX = cardX + cardW - qrSize - 6
        const qrY = ty + 2
        doc.image(buf, qrX, qrY, { width: qrSize, height: qrSize })
        doc.fillColor(cSlate500).font('Helvetica').fontSize(5).text('Escanea para pagar', qrX, qrY + qrSize + 2, { width: qrSize, align: 'center' })
        doc.fillColor(cSlate400).font('Helvetica').fontSize(4.5).text('Pasarela PAGUI', qrX, qrY + qrSize + 8, { width: qrSize, align: 'center' })
        // Ajustar meta para no solapar con QR
        ty += 6
      } catch {}
    }

    // Meta — sin mencionar factura, es para pago del cliente (no solapa con QR)
    ty += 8
    const infoW = qr ? cardW - 160 : cardW
    doc.fillColor(cSlate600).font('Helvetica').fontSize(6).text(`Moneda: ${data.currency}  ·  Escanea el QR para pagar esta comisión via PAGUI. Una vez recibido el pago, esta nota se marcará automáticamente como pagada.`, cardX, ty, { width: infoW, lineBreak: false })
    ty += 12
    doc.fillColor(cSlate400).font('Helvetica').fontSize(5.5).text(`Emitido ${new Date(data.issueDate).toLocaleString('es-BO')}  ·  Correlativo ${data.correlative}  ·  ID ${data.client.id}  ·  ${data.period.periodLabel}`, cardX, ty, { width: infoW, lineBreak: false })

    // Firmas
    const sigY = H - 88
    const sigW = 150
    const sigLeftX = cardX + 20
    const sigRightX = cardX + cardW - 20 - sigW
    doc.save().moveTo(sigLeftX, sigY).lineTo(sigLeftX + sigW, sigY).strokeColor(cSlate300).lineWidth(0.6).stroke().restore()
    doc.fillColor(cSlate500).font('Helvetica').fontSize(6).text('PAGUI — Administración', sigLeftX, sigY + 6, { width: sigW, align: 'center' })
    doc.save().moveTo(sigRightX, sigY).lineTo(sigRightX + sigW, sigY).strokeColor(cSlate300).lineWidth(0.6).stroke().restore()
    doc.fillColor(cSlate500).font('Helvetica').fontSize(6).text(data.client.name, sigRightX, sigY + 6, { width: sigW, align: 'center' })

    // Footer
    const fy = 28
    doc.save().moveTo(M, fy + 12).lineTo(W - M, fy + 12).strokeColor(cSlate100).lineWidth(0.5).stroke().restore()
    doc.fillColor(cSlate500).font('Helvetica').fontSize(6).text('PAGUI  ·  Banco Económico  ·  IATHINGS', M, fy, { lineBreak: false })
    doc.fillColor(cSlate400).font('Helvetica').fontSize(6).text(`${data.period.label}  ·  ${data.correlative}`, W - M, fy, { width: 200, align: 'right' })

    doc.end()
  })
}

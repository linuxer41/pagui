/**
 * KYC ML Worker — Node child process
 *
 * Runs heavy ML (tesseract OCR + ONNX face verification) under plain Node,
 * because those libs (worker_threads + native addons) fail under Bun.
 *
 * Protocol: read a single JSON line from stdin, print a single JSON line to stdout.
 *   { action: 'ocr',    image: <base64> }                          -> { text, confidence, fields }
 *   { action: 'verify', selfie: <base64>, document: <base64> }     -> { detected, similarity, match }
 */
import { createWorker } from 'tesseract.js'
import ort from 'onnxruntime-node'
import { PNG } from 'pngjs'
import * as jpeg from 'jpeg-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MODELS_DIR = join(__dirname, '..', '..', '..', '..', 'models')
const TESSDATA_DIR = join(__dirname, '..', '..', '..', '..', 'models', 'tessdata')
const YUNET_PATH = join(MODELS_DIR, 'yunet.onnx')
const FACEX_PATH = join(MODELS_DIR, 'facex_nano.onnx')

// YuNet decode constants (OpenCV FaceDetectorYN)
const STRIDES = [8, 16, 32]
const CONF_THRESHOLD = 0.5
const NMS_THRESHOLD = 0.3

// ArcFace 112x112 5-point template (order: left eye, right eye, nose, left mouth, right mouth)
const ARCFACE_TEMPLATE = [
  [38.2946, 51.6963],
  [73.5318, 51.5014],
  [56.0252, 71.7366],
  [41.5493, 92.3655],
  [70.7299, 92.2041],
]

// YuNet landmark order (subject's right/left): right eye, left eye, nose tip, right mouth corner, left mouth corner.
// ArcFace template order (image right/left): [left eye(im-right), right eye(im-left), nose, left mouth(im-right), right mouth(im-left)]
// In image coords, subject's right = image left, so the mapping is identity: YuNet[re,le,nt,rcm,lcm] -> ArcFace[0..4].
const LANDMARK_REORDER = [0, 1, 2, 3, 4]

let _worker = null
let _yuNet = null
let _facex = null

/* ---------------- image decode ---------------- */

function decodeImage(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    const d = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true })
    return { rgba: d.data, width: d.width, height: d.height }
  }
  const d = PNG.sync.read(buffer)
  return { rgba: d.data, width: d.width, height: d.height }
}

function rgbaToBgrFloat(rgba, width, height) {
  const out = new Float32Array(width * height * 3)
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    out[j] = rgba[i + 2]
    out[j + 1] = rgba[i + 1]
    out[j + 2] = rgba[i]
  }
  return out
}

/* ---------------- YuNet face detection ---------------- */

async function getYuNet() {
  if (!_yuNet) _yuNet = await ort.InferenceSession.create(YUNET_PATH)
  return _yuNet
}

/**
 * Letterbox-resize an HWC BGR float image to target WxT (aspect preserved with padding).
 * Returns a PLANAR NCHW BGR float array (ONNX layout) plus scale + pad offsets.
 */
function letterbox(bgrFloat, width, height, targetSize = 640) {
  const scale = Math.min(targetSize / width, targetSize / height)
  const nw = Math.round(width * scale)
  const nh = Math.round(height * scale)
  const padX = Math.floor((targetSize - nw) / 2)
  const padY = Math.floor((targetSize - nh) / 2)

  const out = new Float32Array(targetSize * targetSize * 3)
  const plane = targetSize * targetSize
  // nearest-neighbor resize for speed; enough for detection
  for (let y = 0; y < nh; y++) {
    const srcY = Math.min(height - 1, Math.round(y / scale))
    for (let x = 0; x < nw; x++) {
      const srcX = Math.min(width - 1, Math.round(x / scale))
      const sIdx = (srcY * width + srcX) * 3
      const gy = y + padY, gx = x + padX
      const gi = gy * targetSize + gx
      out[gi] = bgrFloat[sIdx]        // B plane
      out[plane + gi] = bgrFloat[sIdx + 1] // G plane
      out[2 * plane + gi] = bgrFloat[sIdx + 2] // R plane
    }
  }
  return { resized: out, scale, padX, padY }
}

function iou(a, b) {
  const ax1 = a[0], ay1 = a[1], ax2 = a[0] + a[2], ay2 = a[1] + a[3]
  const bx1 = b[0], by1 = b[1], bx2 = b[0] + b[2], by2 = b[1] + b[3]
  const ix1 = Math.max(ax1, bx1), iy1 = Math.max(ay1, by1)
  const ix2 = Math.min(ax2, bx2), iy2 = Math.min(ay2, by2)
  const iw = Math.max(0, ix2 - ix1), ih = Math.max(0, iy2 - iy1)
  const inter = iw * ih
  const areaA = a[2] * a[3], areaB = b[2] * b[3]
  return inter / (areaA + areaB - inter)
}

function nms(boxes, scores, threshold) {
  const order = scores.map((s, i) => i).sort((a, b) => scores[b] - scores[a])
  const keep = []
  while (order.length) {
    const i = order.shift()
    keep.push(i)
    const remaining = []
    for (const j of order) {
      if (iou(boxes[i], boxes[j]) <= threshold) remaining.push(j)
    }
    order.length = 0
    order.push(...remaining)
  }
  return keep
}

/**
 * Decode YuNet ONNX outputs. This export uses layout [1, N, C] with one anchor
 * per grid cell (N = feat_h*feat_w). Returns faces:
 * { box: [x,y,w,h] (in image coords), landmarks: [[x,y]x5 in ArcFace order], score }
 */
async function detectFaces(bgrFloat, width, height) {
  const session = await getYuNet()
  const { resized, scale, padX, padY } = letterbox(bgrFloat, width, height, 640)
  const tensor = new ort.Tensor('float32', resized, [1, 3, 640, 640])
  const out = await session.run({ input: tensor })

  const boxes = [], scores = [], landmarks = []

  for (const stride of STRIDES) {
    const clsName = `cls_${stride}`, objName = `obj_${stride}`,
      bboxName = `bbox_${stride}`, kpsName = `kps_${stride}`
    if (!out[clsName]) continue
    const cls = out[clsName].data
    const obj = out[objName].data
    const bbox = out[bboxName].data
    const kps = out[kpsName].data

    const featW = 640 / stride
    const featH = 640 / stride
    const cells = featH * featW

    for (let idx = 0; idx < cells; idx++) {
      const cIdx = idx // cls[:, 0] is face class
      const oIdx = idx
      const score = Math.sqrt(Math.max(0, cls[cIdx]) * Math.max(0, obj[oIdx]))
      if (score < CONF_THRESHOLD) continue

      const col = idx % featW
      const row = Math.floor(idx / featW)

      const b0 = bbox[idx * 4 + 0]
      const b1 = bbox[idx * 4 + 1]
      const b2 = bbox[idx * 4 + 2]
      const b3 = bbox[idx * 4 + 3]

      const cx = (col + b0) * stride
      const cy = (row + b1) * stride
      const w = Math.exp(b2) * stride
      const h = Math.exp(b3) * stride

      // landmarks: 5 points x 2 coords
      const pts = []
      for (let k = 0; k < 5; k++) {
        const kx = (col + kps[idx * 10 + k * 2]) * stride
        const ky = (row + kps[idx * 10 + k * 2 + 1]) * stride
        pts.push([kx, ky])
      }

      // map back to original image coords (inverse letterbox)
      const invScale = 1 / scale
      const box = [
        (cx - w / 2 - padX) * invScale,
        (cy - h / 2 - padY) * invScale,
        w * invScale,
        h * invScale,
      ]
      const lm = pts.map(([px, py]) => [(px - padX) * invScale, (py - padY) * invScale])
      // reorder to ArcFace order
      const reordered = LANDMARK_REORDER.map((i) => lm[i])

      boxes.push(box)
      scores.push(score)
      landmarks.push(reordered)
    }
  }

  const keep = nms(boxes, scores, NMS_THRESHOLD)
  const faces = keep.map((i) => ({ box: boxes[i], landmarks: landmarks[i], score: scores[i] }))
  // sort by area desc so the biggest face (document portrait) is first
  faces.sort((a, b) => (b.box[2] * b.box[3]) - (a.box[2] * a.box[3]))
  return faces
}

/* ---------------- 5-point alignment + embedding ---------------- */

/** 2x2 SVD via polar decomposition (standard closed form). Returns U, S, V. */
function svd2(m) {
  const a = m[0], b = m[1], c = m[2], d = m[3]
  const E = (a + d) / 2, F = (a - d) / 2, G = (b + c) / 2, H = (b - c) / 2
  const Q = Math.sqrt(E * E + H * H)
  const R = Math.sqrt(F * F + G * G)
  const sx = Q + R, sy = Q - R
  const a1 = Math.atan2(G, F)
  const a2 = Math.atan2(H, E)
  const theta = (a2 - a1) / 2
  const phi = (a2 + a1) / 2
  const U = [Math.cos(phi), -Math.sin(phi), Math.sin(phi), Math.cos(phi)]
  const V = [Math.cos(theta), Math.sin(theta), -Math.sin(theta), Math.cos(theta)]
  return { U, S: [sx, sy], V }
}

/**
 * Umeyama / dlib-style similarity transform (uniform scale + rotation + translation)
 * mapping srcPoints -> dstPoints. Returns { a, b, tx, ty } where dst = M*src + t with
 * M = scale * [a -b; b a].
 */
function similarityTransform(srcPoints, dstPoints) {
  const n = srcPoints.length
  const c1 = [0, 0], c2 = [0, 0]
  for (let i = 0; i < n; i++) { c1[0] += srcPoints[i][0]; c1[1] += srcPoints[i][1]; c2[0] += dstPoints[i][0]; c2[1] += dstPoints[i][1] }
  c1[0] /= n; c1[1] /= n; c2[0] /= n; c2[1] /= n

  let s1 = 0, s2 = 0
  const p1 = [], p2 = []
  for (let i = 0; i < n; i++) {
    const x1 = srcPoints[i][0] - c1[0], y1 = srcPoints[i][1] - c1[1]
    const x2 = dstPoints[i][0] - c2[0], y2 = dstPoints[i][1] - c2[1]
    p1.push([x1, y1]); p2.push([x2, y2])
    s1 += x1 * x1 + y1 * y1
    s2 += x2 * x2 + y2 * y2
  }
  s1 = Math.sqrt(s1 / n); s2 = Math.sqrt(s2 / n)
  for (let i = 0; i < n; i++) { p1[i][0] /= s1; p1[i][1] /= s1; p2[i][0] /= s2; p2[i][1] /= s2 }

  // M = sum over i of p2[i] * p1[i]^T  (2x2)
  let M = [0, 0, 0, 0]
  for (let i = 0; i < n; i++) {
    M[0] += p2[i][0] * p1[i][0]
    M[1] += p2[i][0] * p1[i][1]
    M[2] += p2[i][1] * p1[i][0]
    M[3] += p2[i][1] * p1[i][1]
  }
  const { U, S, V } = svd2(M)
  // R = U * V^T, with sign correction for reflection
  let R = [
    U[0] * V[0] + U[1] * V[2], // R00 = U0*V0 + U1*V2  (V^T)
    U[0] * V[1] + U[1] * V[3],
    U[2] * V[0] + U[3] * V[2],
    U[2] * V[1] + U[3] * V[3],
  ]
  // det(R) sign fix
  const detR = R[0] * R[3] - R[1] * R[2]
  if (detR < 0) {
    const Vfix = [-V[0], -V[1], -V[2], -V[3]]
    R = [
      U[0] * Vfix[0] + U[1] * Vfix[2],
      U[0] * Vfix[1] + U[1] * Vfix[3],
      U[2] * Vfix[0] + U[3] * Vfix[2],
      U[2] * Vfix[1] + U[3] * Vfix[3],
    ]
  }
  const scale = (s2 / s1) * (S[0] + S[1]) / 2

  // compose affine: dst = scale * R * src + t
  const a = scale * R[0], b = scale * R[1], c = scale * R[2], d = scale * R[3]
  const tx = c2[0] - (a * c1[0] + b * c1[1])
  const ty = c2[1] - (c * c1[0] + d * c1[1])
  return { a, b, c, d, tx, ty }
}

/**
 * Warp the source image (RGB float, not BGR) to 112x112 ArcFace template using
 * the inverse of the affine transform. Returns PLANAR NCHW RGB float32 (for facex).
 */
function warpCrop(rgbFloat, width, height, transform, outSize = 112) {
  const { a, b, c, d, tx, ty } = transform
  const out = new Float32Array(outSize * outSize * 3)
  const plane = outSize * outSize
  const det = a * d - b * c
  // inverse affine: src = A^-1 (dst - t)
  const ia = d / det, ib = -b / det, ic = -c / det, id = a / det
  for (let y = 0; y < outSize; y++) {
    for (let x = 0; x < outSize; x++) {
      const dx = x - tx, dy = y - ty
      const sx = ia * dx + ib * dy
      const sy = ic * dx + id * dy
      const ix = Math.round(sx), iy = Math.round(sy)
      if (ix >= 0 && iy >= 0 && ix < width && iy < height) {
        const sIdx = (iy * width + ix) * 3
        const gi = y * outSize + x
        out[gi] = rgbFloat[sIdx]        // R plane
        out[plane + gi] = rgbFloat[sIdx + 1] // G plane
        out[2 * plane + gi] = rgbFloat[sIdx + 2] // B plane
      }
    }
  }
  return out
}

/** Convert BGR float (for YuNet) to RGB float (for facex). */
function bgrToRgb(bgr, n) {
  const out = new Float32Array(n)
  for (let i = 0, j = 0; i < n; i += 3, j++) {
    out[i] = bgr[i + 2]
    out[i + 1] = bgr[i + 1]
    out[i + 2] = bgr[i]
  }
  return out
}

async function getFacex() {
  if (!_facex) _facex = await ort.InferenceSession.create(FACEX_PATH)
  return _facex
}

/**
 * Produce a 256-d embedding for the best face in an image.
 * Returns null if no face found.
 */
async function embedBestFace(bgrFloat, width, height) {
  const faces = await detectFaces(bgrFloat, width, height)
  if (faces.length === 0) return null
  const best = faces[0]

  // align landmarks (ArcFace order) to template
  const transform = similarityTransform(best.landmarks, ARCFACE_TEMPLATE)
  const rgbFloat = bgrToRgb(bgrFloat, width * height * 3)
  const aligned = warpCrop(rgbFloat, width, height, transform, 112)

  // normalize to [-1, 1]
  for (let i = 0; i < aligned.length; i++) aligned[i] = (aligned[i] - 127.5) / 128

  const session = await getFacex()
  const tensor = new ort.Tensor('float32', aligned, [1, 3, 112, 112])
  const out = await session.run({ input: tensor })
  return Array.from(out.embedding.data)
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9)
}

/* ---------------- OCR ---------------- */

async function getTesseractWorker() {
  if (!_worker) {
    const langPath = existsSync(join(TESSDATA_DIR, 'spa.traineddata.gz'))
      ? TESSDATA_DIR
      : undefined
    _worker = await createWorker(['spa', 'eng'], 1, {
      logger: () => {},
      langPath,
      cacheMethod: 'none',
    })
    await _worker.setParameters({ tessedit_pageseg_mode: '6' })
  }
  return _worker
}

function extractFields(text) {
  const norm = text.replace(/\r/g, '').split('\n')
  const fields = { fullName: null, documentNumber: null, birthDate: null, nationality: null }
  const joined = norm.join(' ')

  const nameMatch = joined.match(/(?:NOMBRES?|NOMBRE)\s*:?\s*([A-ZÁÉÍÓÚÑÜ' ]{3,50})/i)
  if (nameMatch) fields.fullName = nameMatch[1].trim()
  const ciMatch = joined.match(/\b(?:C\.?I\.?|CÉDULA|CÉDULA DE IDENTIDAD)\s*[:#]?\s*([0-9]{4,10})\b/i)
  if (ciMatch) fields.documentNumber = ciMatch[1]
  const ciMatch2 = joined.match(/\b([0-9]{5,9}[0-9])\b/)
  if (!fields.documentNumber && ciMatch2) fields.documentNumber = ciMatch2[1]
  const dateMatch = joined.match(/\b(0?[1-9]|[12][0-9]|3[01])\s*[/-]\s*(0?[1-9]|1[0-2])\s*[/-]\s*([0-9]{4})\b/)
  if (dateMatch) fields.birthDate = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
  const natMatch = joined.match(/(?:NACIONALIDAD|NAC\.)\s*:?\s*([A-ZÁÉÍÓÚÑÜ]+)\b/i)
  if (natMatch) fields.nationality = natMatch[1]

  return fields
}

/* ---------------- actions ---------------- */

async function actionOcr({ image }) {
  const worker = await getTesseractWorker()
  const buffer = Buffer.from(image, 'base64')
  const { data } = await worker.recognize(buffer)
  const text = data.text || ''
  const confidence = data.confidence || 0
  return { text, confidence, fields: extractFields(text) }
}

async function actionVerify({ selfie, document }) {
  const selfieBuf = Buffer.from(selfie, 'base64')
  const docBuf = Buffer.from(document, 'base64')
  const selfieImg = decodeImage(selfieBuf)
  const docImg = decodeImage(docBuf)

  const selfieBgr = rgbaToBgrFloat(selfieImg.rgba, selfieImg.width, selfieImg.height)
  const docBgr = rgbaToBgrFloat(docImg.rgba, docImg.width, docImg.height)

  const selfieEmb = await embedBestFace(selfieBgr, selfieImg.width, selfieImg.height)
  const docEmb = await embedBestFace(docBgr, docImg.width, docImg.height)

  if (!selfieEmb || !docEmb) {
    return { detected: !!selfieEmb && !!docEmb, similarity: null, match: false }
  }
  const similarity = cosineSim(selfieEmb, docEmb)
  const match = similarity >= 0.36
  return { detected: true, similarity: Math.round(similarity * 10000) / 10000, match }
}

/* ---------------- main loop ---------------- */

async function handleLine(line) {
  let payload
  try {
    payload = JSON.parse(line)
  } catch {
    return JSON.stringify({ ok: false, error: 'invalid JSON' })
  }
  try {
    let result
    if (payload.action === 'ocr') result = await actionOcr(payload)
    else if (payload.action === 'verify') result = await actionVerify(payload)
    else result = { error: `unknown action ${payload.action}` }
    return JSON.stringify({ ok: true, ...result })
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e && e.message || e), stack: e && e.stack })
  }
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
  rl.on('line', async (line) => {
    if (!line.trim()) return
    const out = await handleLine(line)
    process.stdout.write(out + '\n')
  })
  rl.on('close', () => process.exit(0))
}

main()
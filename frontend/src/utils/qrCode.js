/**
 * Lightweight, zero-dependency pure JavaScript QR Code Generator
 * Generates standards-compliant SVG QR codes for shop UPI & payment links.
 */

// Galois Field GF(256) tables for Reed-Solomon encoding
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
for (let i = 0, x = 1; i < 255; i++) {
  GF_EXP[i] = x
  GF_EXP[i + 255] = x
  GF_LOG[x] = i
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0)
}
GF_LOG[0] = 0

function gfMul(x, y) {
  return x === 0 || y === 0 ? 0 : GF_EXP[GF_LOG[x] + GF_LOG[y]]
}

function rsComputePoly(ecLen) {
  let poly = [1]
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], GF_EXP[i])
      next[j + 1] ^= poly[j]
    }
    poly = next
  }
  return poly
}

function rsEncode(data, ecLen) {
  const poly = rsComputePoly(ecLen)
  const res = new Uint8Array(data.length + ecLen)
  res.set(data, 0)
  for (let i = 0; i < data.length; i++) {
    const factor = res[i]
    if (factor !== 0) {
      for (let j = 0; j < poly.length; j++) {
        res[i + j] ^= gfMul(poly[j], factor)
      }
    }
  }
  return res.slice(data.length)
}

// Version table constants for QR Version 3 (29x29) and Version 4 (33x33)
const VERSIONS = [
  null,
  // v1 (21x21): total 26 bytes, data 19 (ECC-L 7)
  { version: 1, size: 21, totalBytes: 26, dataBytes: 19, ecBytes: 7, align: [] },
  // v2 (25x25): total 44 bytes, data 34 (ECC-L 10)
  { version: 2, size: 25, totalBytes: 44, dataBytes: 34, ecBytes: 10, align: [6, 18] },
  // v3 (29x29): total 70 bytes, data 55 (ECC-L 15)
  { version: 3, size: 29, totalBytes: 70, dataBytes: 55, ecBytes: 15, align: [6, 22] },
  // v4 (33x33): total 100 bytes, data 80 (ECC-L 20)
  { version: 4, size: 33, totalBytes: 100, dataBytes: 80, ecBytes: 20, align: [6, 26] },
  // v5 (37x37): total 134 bytes, data 108 (ECC-L 26)
  { version: 5, size: 37, totalBytes: 134, dataBytes: 108, ecBytes: 26, align: [6, 30] },
]

export function generateQrMatrix(text) {
  const enc = new TextEncoder()
  const rawBytes = enc.encode(text)
  const len = rawBytes.length

  // Select suitable version
  let vInfo = VERSIONS[1]
  for (let v = 1; v <= 5; v++) {
    if (VERSIONS[v].dataBytes >= len + 3) {
      vInfo = VERSIONS[v]
      break
    }
  }

  const { size, dataBytes, ecBytes, align } = vInfo

  // Build data bitstream (Byte mode: mode 0100 + char count indicator)
  const bitstream = []
  const pushBits = (val, count) => {
    for (let i = count - 1; i >= 0; i--) {
      bitstream.push((val >> i) & 1)
    }
  }

  // Mode: 0100 (Byte mode)
  pushBits(4, 4)
  // Character count (8 bits for v1-v9 byte mode)
  pushBits(len, 8)
  for (let i = 0; i < len; i++) {
    pushBits(rawBytes[i], 8)
  }

  // Terminator (up to 4 zeroes)
  const capacityBits = dataBytes * 8
  const termLen = Math.min(4, capacityBits - bitstream.length)
  pushBits(0, termLen)

  // Align to byte boundary
  while (bitstream.length % 8 !== 0) {
    bitstream.push(0)
  }

  // Pad with 0xEC and 0x11
  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (bitstream.length < capacityBits) {
    pushBits(padBytes[padIdx % 2], 8)
    padIdx++
  }

  // Convert bits to byte array
  const data = new Uint8Array(dataBytes)
  for (let i = 0; i < dataBytes; i++) {
    let byteVal = 0
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitstream[i * 8 + b]
    }
    data[i] = byteVal
  }

  // Compute error correction bytes
  const ecData = rsEncode(data, ecBytes)

  // Combined bytes
  const finalBytes = new Uint8Array(dataBytes + ecBytes)
  finalBytes.set(data, 0)
  finalBytes.set(ecData, dataBytes)

  // Initialize Matrix
  const matrix = Array.from({ length: size }, () => new Array(size).fill(null))

  // 1. Finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (r, c) => {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const nr = r + i
        const nc = c + j
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (
            (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
            (j >= 0 && j <= 6 && (i === 0 || i === 6)) ||
            (i >= 2 && i <= 4 && j >= 2 && j <= 4)
          ) {
            matrix[nr][nc] = true
          } else {
            matrix[nr][nc] = false
          }
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0
  }

  // 3. Alignment patterns if applicable
  if (align.length >= 2) {
    for (const ar of align) {
      for (const ac of align) {
        if (matrix[ar][ac] !== null) continue
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            const isBorder = Math.abs(i) === 2 || Math.abs(j) === 2
            const isCenter = i === 0 && j === 0
            matrix[ar + i][ac + j] = isBorder || isCenter
          }
        }
      }
    }
  }

  // 4. Dark module
  matrix[4 * vInfo.version + 9][8] = true

  // 5. Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false
    if (matrix[i][8] === null) matrix[i][8] = false
  }
  for (let i = 0; i < 8; i++) {
    if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = false
    if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = false
  }

  // 6. Fill Data bits in zigzag
  let bitIdx = 0
  const allBits = []
  for (let i = 0; i < finalBytes.length; i++) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((finalBytes[i] >> b) & 1)
    }
  }

  let upward = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col-- // Skip vertical timing column
    const rows = []
    for (let r = 0; r < size; r++) rows.push(upward ? size - 1 - r : r)

    for (const row of rows) {
      for (let cOffset = 0; cOffset < 2; cOffset++) {
        const c = col - cOffset
        if (matrix[row][c] === null) {
          const bitVal = bitIdx < allBits.length ? allBits[bitIdx] : 0
          // Apply mask 0: (row + col) % 2 === 0
          const mask = (row + c) % 2 === 0
          matrix[row][c] = (bitVal ^ (mask ? 1 : 0)) === 1
          bitIdx++
        }
      }
    }
    upward = !upward
  }

  // 7. Write Format Information (ECC Level L + Mask 0 = 0b111011111000100)
  const formatInfo = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0]
  // Top-left
  const formatPos1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ]
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatPos1[i]
    matrix[r][c] = formatInfo[i] === 1
  }
  // Bottom-left and Top-right
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatInfo[i] === 1
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = formatInfo[7 + i] === 1
  }

  return matrix
}

export function generateQrSvg(text, { size = 240, color = '#0f172a', bg = '#ffffff' } = {}) {
  try {
    const matrix = generateQrMatrix(text)
    const n = matrix.length
    const cellSize = size / (n + 4) // 2 modules padding
    let rects = ''

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          const x = (c + 2) * cellSize
          const y = (r + 2) * cellSize
          rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${color}" />`
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}" rx="12" />${rects}</svg>`
  } catch (err) {
    console.warn('QR code generation error:', err)
    return null
  }
}

/**
 * Safely compute a clean, single-character uppercase avatar initial.
 * Transliterates Devanagari and Kannada initial characters to standard Latin letters (A-Z)
 * to prevent browser auto-translation (e.g. Google Translate translating "आ" to
 * "The second vowel of the Devanagari syllabary").
 */
const DEVANAGARI_INITIAL_MAP = {
  'अ': 'A', 'आ': 'A', 'इ': 'I', 'ई': 'I', 'उ': 'U', 'ऊ': 'U', 'ऋ': 'R',
  'ए': 'E', 'ऐ': 'E', 'ओ': 'O', 'औ': 'O', 'अं': 'A', 'अः': 'A',
  'क': 'K', 'ख': 'K', 'ग': 'G', 'घ': 'G', 'ङ': 'N',
  'च': 'C', 'छ': 'C', 'ज': 'J', 'झ': 'J', 'ञ': 'N',
  'ट': 'T', 'ठ': 'T', 'ड': 'D', 'ढ': 'D', 'ण': 'N',
  'त': 'T', 'थ': 'T', 'द': 'D', 'ध': 'D', 'न': 'N',
  'प': 'P', 'फ': 'P', 'ब': 'B', 'भ': 'B', 'म': 'M',
  'य': 'Y', 'र': 'R', 'ल': 'L', 'व': 'V', 'श': 'S',
  'ष': 'S', 'स': 'S', 'ह': 'H', 'क्ष': 'K', 'त्र': 'T', 'ज्ञ': 'G'
}

const KANNADA_INITIAL_MAP = {
  'ಅ': 'A', 'ಆ': 'A', 'ಇ': 'I', 'ಈ': 'I', 'ಉ': 'U', 'ಊ': 'U', 'ಋ': 'R',
  'ಎ': 'E', 'ಏ': 'E', 'ಐ': 'A', 'ಒ': 'O', 'ಓ': 'O', 'ಔ': 'A',
  'ಕ': 'K', 'ಖ': 'K', 'ಗ': 'G', 'ಘ': 'G', 'ಙ': 'N',
  'ಚ': 'C', 'ಛ': 'C', 'ಜ': 'J', 'ಝ': 'J', 'ಞ': 'N',
  'ಟ': 'T', 'ಠ': 'T', 'ಡ': 'D', 'ಢ': 'D', 'ಣ': 'N',
  'ತ': 'T', 'ಥ': 'T', 'ದ': 'D', 'ಧ': 'D', 'ನ': 'N',
  'ಪ': 'P', 'ಫ': 'P', 'ಬ': 'B', 'ಭ': 'B', 'ಮ': 'M',
  'ಯ': 'Y', 'ರ': 'R', 'ಲ': 'L', 'ವ': 'V', 'ಶ': 'S',
  'ಷ': 'S', 'ಸ': 'S', 'ಹ': 'H', 'ಳ': 'L'
}

export function getInitial(name, fallback = '👤') {
  if (!name || typeof name !== 'string') return fallback
  const trimmed = name.trim()
  if (!trimmed) return fallback

  const firstChar = trimmed[0]
  if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase()
  }

  if (DEVANAGARI_INITIAL_MAP[firstChar]) {
    return DEVANAGARI_INITIAL_MAP[firstChar]
  }

  if (KANNADA_INITIAL_MAP[firstChar]) {
    return KANNADA_INITIAL_MAP[firstChar]
  }

  // Fallback to first Latin char if any
  const latinCleaned = trimmed.replace(/[^\w]/g, '')
  if (latinCleaned.length > 0) {
    return latinCleaned.charAt(0).toUpperCase()
  }

  return 'A'
}

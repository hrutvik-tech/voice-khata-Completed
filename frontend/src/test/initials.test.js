import { describe, it, expect } from 'vitest'
import { getInitial } from '../utils/initials'

describe('getInitial utility', () => {
  it('handles Latin English names', () => {
    expect(getInitial('Suresh')).toBe('S')
    expect(getInitial('ramesh')).toBe('R')
    expect(getInitial('Aayushi')).toBe('A')
  })

  it('safely transliterates Devanagari vowels to avoid auto-translate glossary issues', () => {
    // "आयुषी" was being translated to "The second vowel of the Devanagari syllabary"
    expect(getInitial('आयुषी')).toBe('A')
    expect(getInitial('अमित')).toBe('A')
    expect(getInitial('इरफ़ान')).toBe('I')
    expect(getInitial('ओमकार')).toBe('O')
  })

  it('safely transliterates Devanagari consonants', () => {
    expect(getInitial('रमेश')).toBe('R')
    expect(getInitial('सुरेश')).toBe('S')
    expect(getInitial('विकास')).toBe('V')
    expect(getInitial('प्रमोद')).toBe('P')
  })

  it('handles Kannada characters', () => {
    expect(getInitial('ಆಯುಷಿ')).toBe('A')
    expect(getInitial('ಸುರೇಶ್')).toBe('S')
  })

  it('handles empty or missing names gracefully', () => {
    expect(getInitial('')).toBe('👤')
    expect(getInitial(null)).toBe('👤')
    expect(getInitial(undefined, 'G')).toBe('G')
  })
})

/**
 * Profanity Filter Utility
 * Detects and filters inappropriate language in user-generated content
 */

// Comprehensive list of profane words (expandable)
const PROFANITY_LIST = [
  // Common profanity
  'fuck', 'shit', 'bitch', 'ass', 'bastard', 'damn', 'crap', 'piss',
  'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut', 'fag', 'nigger',
  'retard', 'idiot', 'moron', 'stupid', 'dumb', 'kill yourself',

  // Variations and common misspellings
  'f*ck', 'f**k', 'sh*t', 'sh!t', 'b*tch', 'b!tch', 'a**', 'a$$',
  'fck', 'fuk', 'shyt', 'biatch', 'azz', 'wtf', 'stfu',

  // Additional offensive terms
  'motherfucker', 'asshole', 'dickhead', 'douchebag', 'twat',
  'prick', 'wanker', 'bollocks', 'bullshit', 'horseshit',
]

// Create regex pattern for profanity detection
const createProfanityRegex = () => {
  const escapedWords = PROFANITY_LIST.map(word =>
    word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  return new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi')
}

const PROFANITY_REGEX = createProfanityRegex()

/**
 * Check if text contains profanity
 * @param text - The text to check
 * @returns boolean - true if profanity detected
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false

  const normalizedText = text.toLowerCase()
  return PROFANITY_REGEX.test(normalizedText)
}

/**
 * Get list of profane words found in text
 * @param text - The text to analyze
 * @returns string[] - Array of profane words found
 */
export function findProfanity(text: string): string[] {
  if (!text) return []

  const normalizedText = text.toLowerCase()
  const matches = normalizedText.match(PROFANITY_REGEX)
  return matches ? [...new Set(matches)] : []
}

/**
 * Filter profanity from text by replacing with asterisks
 * @param text - The text to filter
 * @param replacement - Optional custom replacement string (default: '***')
 * @returns string - Filtered text
 */
export function filterProfanity(text: string, replacement: string = '***'): string {
  if (!text) return text

  return text.replace(PROFANITY_REGEX, replacement)
}

/**
 * Validate review text for profanity
 * @param reviewText - The review text to validate
 * @returns object - {isValid: boolean, message?: string, foundWords?: string[]}
 */
export function validateReviewText(reviewText: string): {
  isValid: boolean
  message?: string
  foundWords?: string[]
} {
  if (!reviewText || reviewText.trim().length === 0) {
    return { isValid: true }
  }

  const foundWords = findProfanity(reviewText)

  if (foundWords.length > 0) {
    return {
      isValid: false,
      message: 'Your review contains inappropriate language. Please edit it before submitting.',
      foundWords,
    }
  }

  // Additional validation: minimum length
  if (reviewText.trim().length < 10 && reviewText.trim().length > 0) {
    return {
      isValid: false,
      message: 'Review must be at least 10 characters long if provided.',
    }
  }

  // Additional validation: maximum length
  if (reviewText.length > 1000) {
    return {
      isValid: false,
      message: 'Review cannot exceed 1000 characters.',
    }
  }

  return { isValid: true }
}

/**
 * Sanitize review text by removing HTML tags and excessive whitespace
 * @param text - The text to sanitize
 * @returns string - Sanitized text
 */
export function sanitizeReviewText(text: string): string {
  if (!text) return ''

  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '')

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  return sanitized
}

/**
 * Complete validation for review submission
 * @param rating - Star rating (1-5)
 * @param reviewText - Optional review text
 * @returns object - Validation result with errors
 */
export function validateReview(rating: number, reviewText?: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate rating
  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    errors.push('Rating must be a whole number between 1 and 5.')
  }

  // Validate review text if provided
  if (reviewText && reviewText.trim().length > 0) {
    const sanitized = sanitizeReviewText(reviewText)
    const textValidation = validateReviewText(sanitized)

    if (!textValidation.isValid) {
      errors.push(textValidation.message!)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Add custom profane words to the filter
 * @param words - Array of words to add
 */
export function addProfaneWords(words: string[]): void {
  PROFANITY_LIST.push(...words)
}

/**
 * Bilingual Search Utility
 *
 * This file provides mappings between English and Portuguese category/industry terms
 * to enable cross-language search. When a user searches for "Architect", it will also
 * find professionals with "Arquiteto" in their profile, and vice versa.
 */

// Profession mappings: English -> Portuguese
export const professionMap: Record<string, string> = {
  // Popular Professions
  'plumber': 'encanador',
  'electrician': 'eletricista',
  'gas engineer': 'técnico de gás',
  'builder': 'pedreiro',
  'programmer': 'programador',
  'nurse': 'enfermeiro',
  'delivery': 'entregador',
  'driver': 'motorista',
  'cleaner': 'faxineiro',
  'gardener': 'jardineiro',
  'carpenter': 'carpinteiro',
  'painter': 'pintor',
  'chef': 'chef',
  'barber': 'barbeiro',
  'mechanic': 'mecânico',
  'administrator': 'administrador',
  'teacher': 'professor',
  'doctor': 'médico',
  'accountant': 'contador',
  'receptionist': 'recepcionista',
  'security guard': 'segurança',
  'security': 'segurança',
  'pharmacist': 'farmacêutico',
  'photographer': 'fotógrafo',
  'writer': 'escritor',
  'translator': 'tradutor',
  'salesperson': 'vendedor',
  'architect': 'arquiteto',
  'florist': 'florista',
  'tailor': 'alfaiate',
  'hairdresser': 'cabeleireiro',
  'dentist': 'dentista',
  'scientist': 'cientista',
}

// Industry mappings: English -> Portuguese
export const industryMap: Record<string, string> = {
  'plumbing & heating': 'encanamento & aquecimento',
  'plumbing and heating': 'encanamento e aquecimento',
  'construction': 'construção',
  'healthcare & medical': 'saúde & medicina',
  'healthcare and medical': 'saúde e medicina',
  'technology & it': 'tecnologia & ti',
  'technology and it': 'tecnologia e ti',
  'transportation & logistics': 'transporte & logística',
  'transportation and logistics': 'transporte e logística',
  'cleaning & maintenance': 'limpeza & manutenção',
  'cleaning and maintenance': 'limpeza e manutenção',
  'landscaping & gardening': 'paisagismo & jardinagem',
  'landscaping and gardening': 'paisagismo e jardinagem',
  'hospitality & catering': 'hospitalidade & gastronomia',
  'hospitality and catering': 'hospitalidade e gastronomia',
  'professional services': 'serviços profissionais',
  'creative & design': 'criativo & design',
  'creative and design': 'criativo e design',
  'education & training': 'educação & treinamento',
  'education and training': 'educação e treinamento',
  'security & safety': 'segurança & proteção',
  'security and safety': 'segurança e proteção',
  'automotive & mechanical': 'automotivo & mecânico',
  'automotive and mechanical': 'automotivo e mecânico',
  'legal & finance': 'jurídico & finanças',
  'legal and finance': 'jurídico e finanças',
  'sales & marketing': 'vendas & marketing',
  'sales and marketing': 'vendas e marketing',
  'real estate & property': 'imobiliário & propriedades',
  'real estate and property': 'imobiliário e propriedades',
}

// Create reverse mappings (Portuguese -> English)
const reverseProfessionMap: Record<string, string> = Object.fromEntries(
  Object.entries(professionMap).map(([en, pt]) => [pt, en])
)

const reverseIndustryMap: Record<string, string> = Object.fromEntries(
  Object.entries(industryMap).map(([en, pt]) => [pt, en])
)

/**
 * Get all language variants for a search term
 *
 * @param searchTerm - The search term (can be in English or Portuguese)
 * @returns Array of search terms in both languages
 *
 * @example
 * getBilingualSearchTerms('architect') // Returns ['architect', 'arquiteto']
 * getBilingualSearchTerms('arquiteto') // Returns ['arquiteto', 'architect']
 */
export function getBilingualSearchTerms(searchTerm: string): string[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return []
  }

  const normalizedTerm = searchTerm.toLowerCase().trim()
  const variants = new Set<string>()

  // Always include the original term
  variants.add(normalizedTerm)

  // Check professions
  if (professionMap[normalizedTerm]) {
    variants.add(professionMap[normalizedTerm])
  }
  if (reverseProfessionMap[normalizedTerm]) {
    variants.add(reverseProfessionMap[normalizedTerm])
  }

  // Check industries
  if (industryMap[normalizedTerm]) {
    variants.add(industryMap[normalizedTerm])
  }
  if (reverseIndustryMap[normalizedTerm]) {
    variants.add(reverseIndustryMap[normalizedTerm])
  }

  return Array.from(variants)
}

/**
 * Build a PostgreSQL text search query that includes all language variants
 *
 * @param searchTerm - The search term
 * @returns A formatted search query string for use with Supabase text search
 *
 * @example
 * buildBilingualSearchQuery('architect') // Returns 'architect | arquiteto'
 */
export function buildBilingualSearchQuery(searchTerm: string): string {
  const variants = getBilingualSearchTerms(searchTerm)
  return variants.join(' | ')  // PostgreSQL text search OR operator
}

/**
 * Check if a text contains any of the bilingual variants of a search term
 * Used for client-side filtering when needed
 *
 * @param text - The text to search in
 * @param searchTerm - The search term
 * @returns true if any variant is found
 */
export function containsBilingualTerm(text: string, searchTerm: string): boolean {
  if (!text || !searchTerm) return false

  const normalizedText = text.toLowerCase()
  const variants = getBilingualSearchTerms(searchTerm)

  return variants.some(variant => normalizedText.includes(variant))
}

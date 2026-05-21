/**
 * Hardcoded product categories available across the platform
 * All products must be categorized from this predefined list
 */
export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Fashion & Apparel',
  'Home & Garden',
  'Sports & Outdoors',
  'Health & Beauty',
  'Food & Groceries',
  'Books & Media',
  'Toys & Games',
  'Automotive',
  'Office Supplies',
  'Computing',
  'Mobile & Accessories',
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

/**
 * Get formatted category display name
 */
export function getCategoryLabel(category: string): string {
  return PRODUCT_CATEGORIES.find(
    (c) => c.toLowerCase() === category.toLowerCase()
  ) || category
}

/**
 * Check if a category is valid
 */
export function isValidCategory(category: string): boolean {
  return PRODUCT_CATEGORIES.some((c) => c.toLowerCase() === category.toLowerCase())
}

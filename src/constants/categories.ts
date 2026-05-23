/**
 * Hardcoded product categories available across the platform
 * All products must be categorized from this predefined list
 */
import type { ProductType } from '@/types'

export const PRODUCT_CATEGORIES_BY_TYPE: Record<ProductType, readonly string[]> = {
  physical: [
    'Electronics',
    'Fashion & Apparel',
    'Home & Garden',
    'Sports & Outdoors',
    'Health & Beauty',
    'Food & Groceries',
    'Toys & Games',
    'Automotive',
    'Office Supplies',
    'Computing',
    'Mobile & Accessories',
  ],
  service: [
    'Consulting',
    'Design Services',
    'Development Services',
    'Repairs & Maintenance',
    'Coaching & Training',
    'Home Services',
    'Business Services',
    'Creative Services',
  ],
  downloadable: [
    'E-books & Guides',
    'Templates',
    'Design Assets',
    'Software & Plugins',
    'Courses & Tutorials',
    'Audio & Music',
    'Video Assets',
    'Documents & Forms',
  ],
}

export const PRODUCT_CATEGORIES = Array.from(
  new Set(Object.values(PRODUCT_CATEGORIES_BY_TYPE).flat())
) as readonly string[]

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

/**
 * Get formatted category display name
 */
export function getCategoryLabel(category: string): string {
  return PRODUCT_CATEGORIES.find(
    (c) => c.toLowerCase() === category.toLowerCase()
  ) || category
}

export function getCategoriesForProductType(productType: ProductType): readonly string[] {
  return PRODUCT_CATEGORIES_BY_TYPE[productType]
}

/**
 * Check if a category is valid
 */
export function isValidCategory(category: string): boolean {
  return PRODUCT_CATEGORIES.some((c) => c.toLowerCase() === category.toLowerCase())
}

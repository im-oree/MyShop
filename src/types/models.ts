/**
 * This file serves as the entry point for all type definitions
 * Re-exports from the backend types for consistency
 */

export type AccessLevel = 'none' | 'read' | 'write'

export interface EmployeePermissions {
  products: AccessLevel
  orders: AccessLevel
  analytics: AccessLevel
  notifications: AccessLevel
  messages: AccessLevel
  employees: AccessLevel
}

export type EmployeeRoleTemplate = 'cashier' | 'sales_rep' | 'support_agent' | 'operations_manager' | 'custom'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: 'user' | 'admin' | 'manager' | 'employee' // role-based access for customers and staff
  // Deprecated marketplace fields retained for compatibility with older UI code.
  sellerProfile?: {
    shopName: string
    shopDescription: string
    rating: number
    totalReviews: number
    followers: number
  }
  appliedAsSeller?: boolean
  sellerApproved?: boolean
  employeeTitle?: string
  employeeRoleTemplate?: EmployeeRoleTemplate
  employeePermissions?: EmployeePermissions
  createdAt: Date
  updatedAt: Date
  addresses?: Address[]
}

export interface Address {
  id: string
  userId: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  isDefault: boolean
  phone: string
  whatsapp?: string
}

export interface Product {
  id: string
  name: string
  description: string
  productType?: ProductType
  price: number
  currency: string
  images: string[]
  category: string
  tags: string[]
  stock: number
  ownerId?: string
  sellerName?: string
  sellerId?: string
  discount?: number
  salePrice?: number
  featured: boolean
  features?: string[]
  specs?: Record<string, string>
  serviceDetails?: ProductServiceDetails
  downloadableDetails?: ProductDownloadableDetails
  createdAt: Date
  updatedAt: Date
}

export type ProductType = 'physical' | 'service' | 'downloadable'

export interface ProductServiceDetails {
  deliveryMode?: 'online' | 'onsite' | 'hybrid'
  duration?: string
  turnaround?: string
  bookingNotes?: string
}

export interface ProductDownloadableDetails {
  downloadUrl?: string
  fileFormat?: string
  fileSizeMb?: number
  licenseInfo?: string
}

export interface CartItem {
  productId: string
  productName?: string
  productImage?: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  totalAmount: number
  currency: string
  status: string
  paymentStatus: string
  shippingAddress: Address
  paymentMethod: string
  paymentRef?: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  productId: string
  productName: string
  price: number
  quantity: number
}

export type NotificationPriority = 'low' | 'normal' | 'important'

export type NotificationType = 'order_created' | 'payment_confirmed' | 'order_status_updated' | 'order_ready' | 'general'

export interface NotificationItem {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  link?: string
  metadata?: Record<string, unknown>
  readAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface BusinessConfig {
  id: string
  ownerName: string
  ownerEmail: string
  businessName: string
  businessLogo?: string
  businessDescription: string
  businessPhone: string
  businessAddress: string
  businessWebsite?: string
  socialLinks?: Record<string, string>
  colors?: {
    primary: string
    secondary: string
    accent: string
  }
  features?: {
    showAboutPage: boolean
    showContactPage: boolean
    enableNotifications: boolean
  }
  createdAt: Date
  updatedAt: Date
}

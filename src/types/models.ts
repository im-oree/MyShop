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
  price: number
  currency: string
  images: string[]
  category: string
  tags: string[]
  stock: number
  discount?: number
  salePrice?: number
  featured: boolean
  features?: string[]
  specs?: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

export interface CartItem {
  productId: string
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

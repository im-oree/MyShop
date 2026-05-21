// User Types
export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: 'user' | 'seller' | 'admin' | 'moderator' | 'employee'
  sellerProfile?: {
    shopName: string
    shopDescription: string
    rating: number
    totalReviews: number
    followers: number
  }
  appliedAsSeller?: boolean
  sellerApproved?: boolean
  createdAt: Date
  updatedAt: Date
  addresses?: Address[]
  fcmTokens?: string[]
  employeeOfSellerId?: string
  employeeTitle?: string
  employeeRoleTemplate?: EmployeeRoleTemplate
  employeePermissions?: EmployeePermissions
}

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

// Product Types
export interface Product {
  id: string
  name: string
  sellerName?: string
  sellerId?: string
  description: string
  price: number // stored in kobo
  currency: Currency
  images: string[]
  category: string
  tags: string[]
  stock: number
  discount?: number // percentage
  salePrice?: number // stored in kobo
  featured: boolean
  features?: string[]
  specs?: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
}

// Cart Types
export interface CartItem {
  productId: string
  quantity: number
  price: number // stored in kobo
}

export interface Cart {
  userId?: string
  items: CartItem[]
  createdAt: Date
  updatedAt: Date
}

// Order Types
export enum OrderStatus {
  NOTED = 'noted',       // initial stage after payment is confirmed
  PROCESSING = 'processing',
  IN_TRANSIT = 'in_transit',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  totalAmount: number // stored in kobo
  currency: Currency
  status: OrderStatus
  paymentStatus: PaymentStatus
  shippingAddress: Address
  billingAddress?: Address
  paymentMethod: PaymentMethod
  paymentRef?: string
  createdAt: Date
  updatedAt: Date
  notes?: string
}

export interface OrderItem {
  productId: string
  productName: string
  price: number // stored in kobo
  quantity: number
}

export type NotificationPriority = 'low' | 'normal' | 'important'

export type NotificationType = 'order_created' | 'payment_confirmed' | 'order_status_updated' | 'seller_order_received' | 'general'

export interface Notification {
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

export interface Conversation {
  id: string
  participants: string[]
  participantMeta?: Array<{ userId: string; name: string; role: string }>
  sellerId?: string
  contextType: 'general' | 'product' | 'order'
  contextId?: string
  lastMessage?: string
  lastMessageAt?: Date
  lastMessageBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: Date
  updatedAt: Date
}

// Payment Types
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export type PaymentMethod = 'paystack' | 'stripe' | 'flutterwave' | 'paypal'

export enum Currency {
  NGN = 'NGN',
  USD = 'USD',
  GBP = 'GBP',
  EUR = 'EUR',
}

export interface PaymentInitiation {
  orderId: string
  amount: number
  currency: Currency
  email: string
  metadata?: Record<string, unknown>
}

export interface PaymentVerification {
  reference: string
  amount: number
  currency: Currency
}

export interface PaymentResponse {
  success: boolean
  message: string
  reference?: string
  authorizationUrl?: string
}

// Admin Types
export interface AdminStats {
  totalOrders: number
  totalRevenue: number
  totalProducts: number
  totalUsers: number
  recentOrders: Order[]
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

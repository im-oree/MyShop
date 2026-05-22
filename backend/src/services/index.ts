import { ProductService, CategoryService } from './ProductService.js'
import { OrderService } from './OrderService.js'
import { UserService } from './UserService.js'
import { PaymentService } from './PaymentService.js'
import { CartService } from './CartService.js'
import { EmailService, emailService } from './EmailService.js'
import { NotificationService, notificationService } from './NotificationService.js'
import { BusinessConfigService } from './BusinessConfigService.js'

export const productService = new ProductService()
export const categoryService = new CategoryService()
export const orderService = new OrderService()
export const userService = new UserService()
export const paymentService = new PaymentService()
export const cartService = new CartService()
export const businessConfigService = new BusinessConfigService()

export { ProductService, CategoryService, OrderService, UserService, PaymentService, CartService, EmailService, emailService, NotificationService, notificationService, BusinessConfigService }

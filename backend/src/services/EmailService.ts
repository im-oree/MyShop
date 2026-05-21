import axios from 'axios'
import { Order, Product } from '../types/index.js'

export class EmailService {
  private brevoApiKey = process.env.BREVO_API_KEY
  private brevoApiUrl = 'https://api.brevo.com/v3/smtp/email'
  private senderEmail = process.env.SENDER_EMAIL || 'noreply@battershop.com'
  private senderName = process.env.SENDER_NAME || 'eShop'

  /**
   * Send order confirmation to buyer
   */
  async sendOrderConfirmationToBuyer(order: Order, buyerEmail: string, buyerName: string): Promise<boolean> {
    if (!this.brevoApiKey) {
      console.warn('Brevo API key not configured; skipping buyer email')
      return false
    }

    try {
      const itemsList = order.items
        .map(item => `- ${item.productName} (Qty: ${item.quantity}) - ₦${(item.price / 100).toFixed(2)}`)
        .join('\n')

      const htmlContent = `
        <h2>Order Confirmation</h2>
        <p>Hi ${buyerName},</p>
        <p>Thank you for your purchase! Your order has been received and is being processed.</p>
        <h3>Order Details:</h3>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Total Amount:</strong> ₦${(order.totalAmount / 100).toFixed(2)}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <h3>Items:</h3>
        <pre>${itemsList}</pre>
        <h3>Shipping Address:</h3>
        <p>${order.shippingAddress.street}</p>
        <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
        <p>Phone: ${order.shippingAddress.phone}</p>
        ${order.shippingAddress.whatsapp ? `<p>WhatsApp: ${order.shippingAddress.whatsapp}</p>` : ''}
        <p>We will contact you soon with shipping details.</p>
        <p>Best regards,<br/>eShop Team</p>
      `

      await axios.post(
        this.brevoApiUrl,
        {
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: buyerEmail, name: buyerName }],
          subject: `Order Confirmation - #${order.id}`,
          htmlContent,
        },
        {
          headers: {
            'api-key': this.brevoApiKey,
            'Content-Type': 'application/json',
          },
        }
      )

      console.log(`Order confirmation sent to ${buyerEmail}`)
      return true
    } catch (error) {
      console.error('Failed to send buyer email:', error)
      return false
    }
  }

  /**
   * Send order notification to seller(s)
   */
  async sendOrderNotificationToSeller(
    order: Order,
    sellerEmail: string,
    sellerName: string,
    sellerProducts: Product[]
  ): Promise<boolean> {
    if (!this.brevoApiKey) {
      console.warn('Brevo API key not configured; skipping seller email')
      return false
    }

    try {
      const sellerItems = order.items.filter(item =>
        sellerProducts.some(p => p.id === item.productId)
      )

      if (sellerItems.length === 0) {
        return true // No items from this seller, skip
      }

      const itemsList = sellerItems
        .map(item => `- ${item.productName} (Qty: ${item.quantity}) - ₦${(item.price / 100).toFixed(2)}`)
        .join('\n')

      const totalRevenue = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

      const htmlContent = `
        <h2>New Order Received</h2>
        <p>Hi ${sellerName},</p>
        <p>A new order has been placed with items from your shop!</p>
        <h3>Order Details:</h3>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Buyer Phone:</strong> ${order.shippingAddress.phone}</p>
        ${order.shippingAddress.whatsapp ? `<p><strong>Buyer WhatsApp:</strong> ${order.shippingAddress.whatsapp}</p>` : ''}
        <h3>Items Ordered:</h3>
        <pre>${itemsList}</pre>
        <p><strong>Total Revenue from this order:</strong> ₦${(totalRevenue / 100).toFixed(2)}</p>
        <h3>Shipping Address:</h3>
        <p>${order.shippingAddress.street}</p>
        <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
        <p>Please prepare and ship the items as soon as possible. You will receive payment once the order is delivered.</p>
        <p>Best regards,<br/>eShop Team</p>
      `

      await axios.post(
        this.brevoApiUrl,
        {
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: sellerEmail, name: sellerName }],
          subject: `New Order Received - #${order.id}`,
          htmlContent,
        },
        {
          headers: {
            'api-key': this.brevoApiKey,
            'Content-Type': 'application/json',
          },
        }
      )

      console.log(`Order notification sent to seller ${sellerEmail}`)
      return true
    } catch (error) {
      console.error('Failed to send seller email:', error)
      return false
    }
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(
    orderData: any,
    buyerEmail: string,
    buyerName: string
  ): Promise<boolean> {
    if (!this.brevoApiKey) {
      console.warn('Brevo API key not configured; skipping payment email')
      return false
    }

    try {
      const htmlContent = `
        <h2>Payment Confirmed</h2>
        <p>Hi ${buyerName},</p>
        <p>Your payment has been successfully processed!</p>
        <p><strong>Order ID:</strong> ${orderData.id}</p>
        <p><strong>Amount Paid:</strong> ₦${(orderData.totalAmount / 100).toFixed(2)}</p>
        <p>Your order will be processed and you will receive tracking information soon.</p>
        <p>Thank you for shopping with us!</p>
        <p>Best regards,<br/>eShop Team</p>
      `

      await axios.post(
        this.brevoApiUrl,
        {
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: buyerEmail, name: buyerName }],
          subject: 'Payment Confirmed',
          htmlContent,
        },
        {
          headers: {
            'api-key': this.brevoApiKey,
            'Content-Type': 'application/json',
          },
        }
      )

      console.log(`Payment confirmation sent to ${buyerEmail}`)
      return true
    } catch (error) {
      console.error('Failed to send payment confirmation email:', error)
      return false
    }
  }
}

export const emailService = new EmailService()

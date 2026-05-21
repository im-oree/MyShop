import axios from 'axios'
import { IPaymentProvider } from './PaymentProvider.js'
import { config } from '../config/index.js'
import { PaymentInitiation, PaymentResponse, PaymentVerification, Currency } from '../types/index.js'

/**
 * Paystack Payment Provider Implementation
 */
export class PaystackProvider implements IPaymentProvider {
  private baseUrl = 'https://api.paystack.co'
  private secretKey: string
  
  constructor() {
    this.secretKey = config.paystack.secretKey
  }
  
  isEnabled(): boolean {
    return !!this.secretKey
  }
  
  async initializePayment(data: PaymentInitiation): Promise<PaymentResponse> {
    try {
      // Paystack expects amount in kobo
      const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/verified`
      
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email: data.email,
          amount: data.amount,
          currency: this.getCurrency(data.currency),
          callback_url: callbackUrl,
          metadata: {
            orderId: data.orderId,
            ...data.metadata,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      )
      
      if (!response.data.status) {
        return {
          success: false,
          message: response.data.message || 'Payment initialization failed',
        }
      }
      
      return {
        success: true,
        message: 'Payment initialized',
        reference: response.data.data.reference,
        authorizationUrl: response.data.data.authorization_url,
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : String(error)
      
      return {
        success: false,
        message: `Payment initialization failed: ${message}`,
      }
    }
  }
  
  async verifyPayment(data: PaymentVerification): Promise<PaymentResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${data.reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      )
      
      if (!response.data.status || response.data.data.status !== 'success') {
        return {
          success: false,
          message: 'Payment verification failed',
        }
      }
      
      // Verify amount matches
      if (response.data.data.amount !== data.amount) {
        return {
          success: false,
          message: 'Payment amount mismatch',
        }
      }
      
      return {
        success: true,
        message: 'Payment verified successfully',
        reference: data.reference,
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : String(error)
      
      return {
        success: false,
        message: `Payment verification failed: ${message}`,
      }
    }
  }
  
  async refundPayment(reference: string, amount: number): Promise<PaymentResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/refund`,
        {
          transaction: reference,
          amount,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      )
      
      if (!response.data.status) {
        return {
          success: false,
          message: response.data.message || 'Refund failed',
        }
      }
      
      return {
        success: true,
        message: 'Refund processed successfully',
        reference: response.data.data.reference,
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : String(error)
      
      return {
        success: false,
        message: `Refund failed: ${message}`,
      }
    }
  }
  
  /**
   * Convert internal currency codes to Paystack format
   */
  private getCurrency(currency: Currency): string {
    const currencyMap: Record<Currency, string> = {
      [Currency.NGN]: 'NGN',
      [Currency.USD]: 'USD',
      [Currency.GBP]: 'GBP',
      [Currency.EUR]: 'EUR',
    }
    return currencyMap[currency] || 'NGN'
  }
}

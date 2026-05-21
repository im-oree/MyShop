import { IPaymentProvider } from './PaymentProvider.js'
import { PaymentInitiation, PaymentResponse, PaymentVerification } from '../types/index.js'

/**
 * Stripe Payment Provider Implementation (Placeholder)
 * Full implementation to be added when Stripe integration is enabled
 */
export class StripeProvider implements IPaymentProvider {
  private secretKey: string
  
  constructor(secretKey?: string) {
    this.secretKey = secretKey || ''
  }
  
  isEnabled(): boolean {
    return !!this.secretKey && process.env.ENABLE_STRIPE === 'true'
  }
  
  async initializePayment(_data: PaymentInitiation): Promise<PaymentResponse> {
    // TODO: Implement Stripe payment initialization
    return {
      success: false,
      message: 'Stripe integration not yet implemented',
    }
  }
  
  async verifyPayment(_data: PaymentVerification): Promise<PaymentResponse> {
    // TODO: Implement Stripe payment verification
    return {
      success: false,
      message: 'Stripe integration not yet implemented',
    }
  }
  
  async refundPayment(_reference: string, _amount: number): Promise<PaymentResponse> {
    // TODO: Implement Stripe refund
    return {
      success: false,
      message: 'Stripe integration not yet implemented',
    }
  }
}

/**
 * Flutterwave Payment Provider Implementation (Placeholder)
 */
export class FlutterwaveProvider implements IPaymentProvider {
  private secretKey: string
  
  constructor(secretKey?: string) {
    this.secretKey = secretKey || ''
  }
  
  isEnabled(): boolean {
    return !!this.secretKey && process.env.ENABLE_FLUTTERWAVE === 'true'
  }
  
  async initializePayment(_data: PaymentInitiation): Promise<PaymentResponse> {
    // TODO: Implement Flutterwave payment initialization
    return {
      success: false,
      message: 'Flutterwave integration not yet implemented',
    }
  }
  
  async verifyPayment(_data: PaymentVerification): Promise<PaymentResponse> {
    // TODO: Implement Flutterwave payment verification
    return {
      success: false,
      message: 'Flutterwave integration not yet implemented',
    }
  }
  
  async refundPayment(_reference: string, _amount: number): Promise<PaymentResponse> {
    // TODO: Implement Flutterwave refund
    return {
      success: false,
      message: 'Flutterwave integration not yet implemented',
    }
  }
}

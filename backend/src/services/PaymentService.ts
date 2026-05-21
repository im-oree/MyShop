import { IPaymentProvider, PaymentServiceFactory } from '../providers/PaymentProvider.js'
import { PaystackProvider } from '../providers/PaystackProvider.js'
import { StripeProvider, FlutterwaveProvider } from '../providers/OtherProviders.js'
import { PaymentInitiation, PaymentResponse, PaymentVerification } from '../types/index.js'

let initialized = false

/**
 * Initialize payment providers
 */
function initializeProviders(): void {
  if (initialized) return
  
  PaymentServiceFactory.registerProvider('paystack', new PaystackProvider())
  PaymentServiceFactory.registerProvider('stripe', new StripeProvider(process.env.STRIPE_SECRET_KEY))
  PaymentServiceFactory.registerProvider('flutterwave', new FlutterwaveProvider(process.env.FLUTTERWAVE_SECRET_KEY))
  
  initialized = true
}

/**
 * Payment Service
 */
export class PaymentService {
  private provider: IPaymentProvider
  
  constructor(providerName: string = 'paystack') {
    initializeProviders()
    this.provider = PaymentServiceFactory.getProvider(providerName)
  }
  
  /**
   * Initialize payment
   */
  async initializePayment(data: PaymentInitiation): Promise<PaymentResponse> {
    return this.provider.initializePayment(data)
  }
  
  /**
   * Verify payment
   */
  async verifyPayment(data: PaymentVerification): Promise<PaymentResponse> {
    return this.provider.verifyPayment(data)
  }
  
  /**
   * Process refund
   */
  async refundPayment(reference: string, amount: number): Promise<PaymentResponse> {
    return this.provider.refundPayment(reference, amount)
  }
  
  /**
   * Get enabled payment methods
   */
  static getEnabledMethods(): string[] {
    initializeProviders()
    return PaymentServiceFactory.getEnabledProviders()
  }
}

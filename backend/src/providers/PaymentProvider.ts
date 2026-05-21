import { PaymentInitiation, PaymentResponse, PaymentVerification } from '../types/index.js'

/**
 * Payment Provider Interface
 * All payment providers must implement this interface
 */
export interface IPaymentProvider {
  /**
   * Initialize a payment
   */
  initializePayment(data: PaymentInitiation): Promise<PaymentResponse>
  
  /**
   * Verify a payment
   */
  verifyPayment(data: PaymentVerification): Promise<PaymentResponse>
  
  /**
   * Process a refund
   */
  refundPayment(reference: string, amount: number): Promise<PaymentResponse>
  
  /**
   * Check if provider is enabled
   */
  isEnabled(): boolean
}

/**
 * Payment Service Factory
 */
export class PaymentServiceFactory {
  private static providers = new Map<string, IPaymentProvider>()
  
  static registerProvider(name: string, provider: IPaymentProvider): void {
    this.providers.set(name, provider)
  }
  
  static getProvider(name: string): IPaymentProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Payment provider "${name}" not found`)
    }
    if (!provider.isEnabled()) {
      throw new Error(`Payment provider "${name}" is not enabled`)
    }
    return provider
  }
  
  static getEnabledProviders(): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isEnabled())
      .map(([name]) => name)
  }
}

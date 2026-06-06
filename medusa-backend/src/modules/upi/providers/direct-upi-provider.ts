import { AbstractPaymentProvider, MedusaError } from "@medusajs/framework/utils";
import {
  PaymentProviderError,
  PaymentProviderSessionResponse,
  PaymentSessionStatus,
  CreatePaymentProviderSession,
  UpdatePaymentProviderSession,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types";

type UpiPaymentData = {
  cart_id: string;
  merchant_upi_id: string;
  merchant_upi_name: string;
  merchant_amount: number;
  rider_upi_id?: string;
  rider_upi_name?: string;
  rider_amount?: number;
  requires_delivery: boolean;
  merchant_intent: string;
  rider_intent?: string;
};

class DirectUpiProviderService extends AbstractPaymentProvider {
  static identifier = "pp_direct_upi";

  constructor(container: any, options: any) {
    super(container, options);
  }

  async initiatePayment(
    data: CreatePaymentProviderSession
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    const context = data.context as any;
    const cart_id = context?.cart_id || "unknown";
    const merchant_upi_id = process.env.MERCHANT_UPI_ID || "merchant@upi";
    const merchant_upi_name = process.env.MERCHANT_UPI_NAME || "Digital Rohtak";
    const requires_delivery = context?.requires_delivery ?? false;
    const merchant_amount = Number(((data.amount || 0) / 100).toFixed(2));
    const rider_amount = requires_delivery
      ? Number(((context?.shipping_total || 0) / 100).toFixed(2))
      : 0;

    const merchant_intent = `upi://pay?pa=${merchant_upi_id}&pn=${encodeURIComponent(merchant_upi_name)}&am=${merchant_amount}&tr=${cart_id}_M&cu=INR`;
    const rider_intent =
      requires_delivery && context?.rider_upi_id
        ? `upi://pay?pa=${context.rider_upi_id}&pn=${encodeURIComponent(context.rider_upi_name || "Rider")}&am=${rider_amount}&tr=${cart_id}_R&cu=INR`
        : undefined;

    const paymentData: UpiPaymentData = {
      cart_id,
      merchant_upi_id,
      merchant_upi_name,
      merchant_amount,
      rider_upi_id: context?.rider_upi_id,
      rider_upi_name: context?.rider_upi_name,
      rider_amount: rider_amount || undefined,
      requires_delivery,
      merchant_intent,
      rider_intent,
    };

    return { data: paymentData };
  }

  async updatePayment(
    data: UpdatePaymentProviderSession
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    return this.initiatePayment(data as any);
  }

  async getPaymentStatus(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentSessionStatus> {
    const status = (paymentSessionData as any)?.status;
    if (status === "captured") return PaymentSessionStatus.AUTHORIZED;
    return PaymentSessionStatus.PENDING;
  }

  async authorizePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | { status: PaymentSessionStatus; data: Record<string, unknown> }> {
    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: { ...paymentSessionData, status: "captured" },
    };
  }

  async capturePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | Record<string, unknown>> {
    return { ...paymentSessionData, status: "captured" };
  }

  async cancelPayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | Record<string, unknown>> {
    return { ...paymentSessionData, status: "cancelled" };
  }

  async refundPayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | Record<string, unknown>> {
    return { ...paymentSessionData, status: "refunded" };
  }

  async retrievePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | Record<string, unknown>> {
    return paymentSessionData;
  }

  async deletePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | Record<string, unknown>> {
    return paymentSessionData;
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: "not_supported" };
  }
}

export default DirectUpiProviderService;

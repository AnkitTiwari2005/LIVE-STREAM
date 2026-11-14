import * as crypto from 'crypto';
import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { isProductionLike } from './runtime-mode';

export const isProd = (): boolean => isProductionLike();

const basicAuth = (): string =>
  'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const x = Buffer.from(a, 'hex');
    const y = Buffer.from(b, 'hex');
    return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
  } catch {
    return false;
  }
}

export function razorpaySignature(orderId: string, paymentId: string): string {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

export async function createRazorpayOrder(amountPaise: number, receipt: string, notes: Record<string, any>) {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: basicAuth() },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new BadGatewayException(`Payment gateway order creation failed: ${res.statusText} ${errText}`);
  }
  return res.json();
}

export async function assertCaptured(paymentId: string, orderId: string, amountPaise: number) {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: basicAuth() },
  });
  const p: any = await res.json();
  // H-03: Removed 'authorized' — only 'captured' means Razorpay has settled funds.
  // 'authorized' means card hold only; it can still be declined at capture time.
  if (!res.ok || p.order_id !== orderId || p.amount !== amountPaise || p.status !== 'captured') {
    throw new BadRequestException('Payment not captured or amount mismatch on gateway');
  }
}

import { createHmac } from 'crypto'

// Trim to guard against copy-paste whitespace/newlines in .env
const BASE_URL = (process.env.TAPTAP_BASE_URL ?? 'https://taptapup.xyz/api/v1').trim()
const MERCHANT_ID = (process.env.TAPTAP_MERCHANT_ID ?? '').trim()
const SHARED_SECRET = (process.env.TAPTAP_SHARED_SECRET ?? '').trim()

// ── Product ID mapping ───────────────────────────────────────
export const PRODUCT_IDS = {
  cashapp: 307452,
  googlepay: 307444,
  applepay: 307444,
} as const

export type PaymentMethod = keyof typeof PRODUCT_IDS

// ── HMAC signing ─────────────────────────────────────────────
// Signs exactly: HMAC-SHA256(timestamp + rawBody, sharedSecret)
// The rawBody string passed in must be the EXACT same bytes sent as the fetch body.
function sign(timestamp: string, rawBody: string): string {
  return createHmac('sha256', SHARED_SECRET)
    .update(timestamp + rawBody, 'utf8')
    .digest('hex')
}

function buildHeaders(rawBody: string): Record<string, string> & { _timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  return {
    'Content-Type': 'application/json',
    'X-Merchant-ID': MERCHANT_ID,
    'X-Timestamp': timestamp,
    'X-Signature': sign(timestamp, rawBody),
    _timestamp: timestamp,
  }
}

// ── Types ────────────────────────────────────────────────────
export interface InitiatePaymentParams {
  paymentMethod: PaymentMethod
  amount: number
  email: string
  merchantReference: string
  returnUrl: string
  webhookUrl?: string
}

export interface InitiatePaymentResult {
  success: true
  // Top-level shape (documented)
  redirect_url?: string
  token?: string
  expires_in?: number
  message?: string
  requested_amount?: number
  final_amount?: number
  // Nested shape (actual API response)
  data?: {
    redirect_url?: string
    token?: string
    expires_in?: number
    message?: string
    requested_amount?: number
    final_amount?: number
  }
}

export interface VerifyTokenResult {
  success: true
  token: string
  status: 'pending' | 'processing' | 'completed' | 'expired'
  order_id: number
  amount: number
  email: string
}

export interface StatusCheckResult {
  success: true
  status: 'pending' | 'processing' | 'completed' | 'expired'
  order_id: number
}

export interface TapTapError {
  success: false
  error: string
  message: string
  code: number
}

type TapTapResponse<T> = T | TapTapError

// ── API calls ────────────────────────────────────────────────

export async function initiatePayment(
  params: InitiatePaymentParams
): Promise<TapTapResponse<InitiatePaymentResult>> {
  const productId = PRODUCT_IDS[params.paymentMethod]
  // TapTap strictly requires whole number amounts
  const roundedAmount = Math.round(Number(params.amount))

  // Build the raw JSON body string ONCE — same bytes used for signing AND sending
  const rawBody = JSON.stringify({
    product_id: productId,
    amount: roundedAmount,
    email: params.email,
    merchant_reference: params.merchantReference,
    return_url: params.returnUrl,
    ...(params.webhookUrl ? { webhook_url: params.webhookUrl } : {}),
  })

  const headers = buildHeaders(rawBody)
  // Remove internal _timestamp helper key before sending
  const { _timestamp, ...fetchHeaders } = headers

  const res = await fetch(`${BASE_URL}/initiate-payment`, {
    method: 'POST',
    headers: fetchHeaders,
    body: rawBody,      // ← exact same string that was signed
  })

  const rawText = await res.text()

  if (!res.ok) {
    console.error(`[taptap] initiatePayment HTTP ${res.status}:`, rawText.slice(0, 200))
  }

  try {
    return JSON.parse(rawText)
  } catch {
    return { success: false, error: 'parse_error', message: rawText, code: res.status }
  }
}

export async function verifyToken(
  token: string
): Promise<TapTapResponse<VerifyTokenResult>> {
  const rawBody = JSON.stringify({ token })
  const headers = buildHeaders(rawBody)
  const { _timestamp, ...fetchHeaders } = headers

  const res = await fetch(`${BASE_URL}/verify-token`, {
    method: 'POST',
    headers: fetchHeaders,
    body: rawBody,
  })

  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { success: false, error: 'parse_error', message: text, code: res.status }
  }
}

export async function checkStatus(
  token: string
): Promise<TapTapResponse<StatusCheckResult>> {
  const rawBody = ''
  const headers = buildHeaders(rawBody)
  const { _timestamp, ...fetchHeaders } = headers

  const res = await fetch(`${BASE_URL}/status/${token}`, {
    method: 'GET',
    headers: fetchHeaders,
  })

  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { success: false, error: 'parse_error', message: text, code: res.status }
  }
}

// ── Response field extractor ─────────────────────────────────
// TapTap sometimes wraps fields inside a `data` object.
// This resolves a field from either location.
export function extractField<T>(
  result: InitiatePaymentResult,
  field: keyof NonNullable<InitiatePaymentResult['data']>
): T | undefined {
  return (result[field as keyof InitiatePaymentResult] ??
    result.data?.[field]) as T | undefined
}

// ── Unique reference generator ───────────────────────────────
export function generateMerchantReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `TXN-${timestamp}-${random}`
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Only these statuses are permitted — unknown values are discarded
const VALID_STATUSES = new Set(['pending', 'processing', 'completed', 'expired', 'failed'])

// Statuses that are terminal — once reached, no further updates are allowed
const TERMINAL_STATUSES = new Set(['completed', 'expired', 'failed'])

interface TapTapWebhookPayload {
  event: string
  merchant_reference: string
  order_id: number
  status: string
  amount: number
  email: string
  product_id: number
  transaction_id: string
  completed_at: string
  order_number: string
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Validate required headers ─────────────────────────
    const event = req.headers.get('x-taptapup-event')
    const headerMerchantRef = req.headers.get('x-merchant-reference')

    if (!event || !headerMerchantRef) {
      return NextResponse.json({ received: false, reason: 'missing_headers' }, { status: 400 })
    }

    // ── 2. Parse payload ──────────────────────────────────────
    const payload: TapTapWebhookPayload = await req.json()

    if (!payload.merchant_reference) {
      return NextResponse.json({ received: false, reason: 'missing_reference' }, { status: 400 })
    }

    // ── 3. Header/body reference must agree ───────────────────
    if (payload.merchant_reference !== headerMerchantRef) {
      console.warn('[webhook] reference mismatch — header vs body', {
        header: headerMerchantRef,
        body: payload.merchant_reference,
      })
      return NextResponse.json({ received: false, reason: 'reference_mismatch' }, { status: 400 })
    }

    // ── 4. Validate incoming status ───────────────────────────
    if (!VALID_STATUSES.has(payload.status)) {
      console.warn('[webhook] unknown status received:', payload.status)
      // Acknowledge so TapTap doesn't retry endlessly, but don't update DB
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const supabase = createServiceClient()

    // ── 5. Idempotency — fetch current row ────────────────────
    const { data: existing } = await supabase
      .from('transactions')
      .select('status')
      .eq('merchant_reference', payload.merchant_reference)
      .single()

    if (!existing) {
      // Unknown reference — return 200 so TapTap doesn't retry
      console.warn('[webhook] unknown merchant_reference:', payload.merchant_reference)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // If the row is already in a terminal state, do not overwrite it
    if (TERMINAL_STATUSES.has(existing.status)) {
      return NextResponse.json({ received: true, idempotent: true }, { status: 200 })
    }

    // ── 6. Update transaction ─────────────────────────────────
    const { error } = await supabase
      .from('transactions')
      .update({
        status: payload.status as 'pending' | 'processing' | 'completed' | 'expired' | 'failed',
        taptap_order_id: payload.order_id ? String(payload.order_id) : null,
      })
      .eq('merchant_reference', payload.merchant_reference)

    if (error) {
      console.error('[webhook] DB update error:', error)
      return NextResponse.json({ received: false }, { status: 500 })
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('[webhook] error:', err)
    return NextResponse.json({ received: false }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  initiatePayment,
  extractField,
  generateMerchantReference,
  PRODUCT_IDS,
  PaymentMethod,
} from '@/lib/taptap'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vendorId, email, amount, paymentMethod } = body as {
      vendorId: string
      email: string
      amount: string | number
      paymentMethod: PaymentMethod
    }

    if (!vendorId || !email || !amount || !paymentMethod) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields.' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address.' },
        { status: 400 }
      )
    }

    // Validate payment method
    const validMethods = ['cashapp', 'googlepay', 'applepay']
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment method.' },
        { status: 400 }
      )
    }

    // TapTap strictly requires whole number amounts — validate before sending
    const roundedAmount = Math.round(Number(amount))
    if (!roundedAmount || !Number.isFinite(roundedAmount) || roundedAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid amount.' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      console.error('[api/pay] NEXT_PUBLIC_APP_URL is not set — cannot build webhook/return URLs')
      return NextResponse.json(
        { success: false, message: 'Server configuration error.' },
        { status: 500 }
      )
    }
    const merchantReference = generateMerchantReference()

    // Fetch the vendor's link_slug to build return URL
    const supabase = createServiceClient()
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, link_slug')
      .eq('id', vendorId)
      .single()

    if (vendorError || !vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found.' },
        { status: 404 }
      )
    }

    const returnUrl = `${appUrl}/pay/${vendor.link_slug}/return`
    const webhookUrl = `${appUrl}/api/webhook/taptap`

    const taptapResult = await initiatePayment({
      paymentMethod,
      amount: roundedAmount,
      email,
      merchantReference,
      returnUrl,
      webhookUrl,
    })

    if (!taptapResult.success) {
      const errMsg = (taptapResult as { message?: string }).message
        ?? 'Payment initiation failed.'
      return NextResponse.json(
        { success: false, message: errMsg },
        { status: 422 }
      )
    }

    // Extract fields from either top-level or nested `data` object
    const redirectUrl = extractField<string>(taptapResult, 'redirect_url')
    const taptapToken = extractField<string>(taptapResult, 'token')

    if (!redirectUrl) {
      console.error('TapTap response missing redirect_url:', JSON.stringify(taptapResult))
      return NextResponse.json(
        { success: false, message: 'Payment gateway did not return a redirect URL.' },
        { status: 502 }
      )
    }

    // Persist the transaction row via service role (bypasses RLS)
    const { error: insertError } = await supabase.from('transactions').insert({
      vendor_id: vendorId,
      customer_email: email,
      amount: roundedAmount,
      payment_method: paymentMethod,
      status: 'pending',
      merchant_reference: merchantReference,
      taptap_token: taptapToken ?? null,
      product_id: PRODUCT_IDS[paymentMethod],
    })

    if (insertError) {
      console.error('Transaction insert error:', insertError)
      // Don't block the user redirect — log only
    }

    return NextResponse.json({
      success: true,
      redirect_url: redirectUrl,
    })
  } catch (err) {
    console.error('POST /api/pay error:', err)
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    )
  }
}

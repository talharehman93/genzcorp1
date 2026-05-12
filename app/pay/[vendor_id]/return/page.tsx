import { CheckCircle, XCircle, Clock, ArrowLeft, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ vendor_id: string }>
  searchParams: Promise<{ order_id?: string }>
}

// ── Dummy data for UI preview (?order_id=test-ui) ────────────
const PREVIEW_DATA = {
  status: 'completed',
  amount: 4.99,
  paymentMethod: 'Cash App',
  customerEmail: 'test@example.com',
  orderId: 'TXN-TEST-123456',
  vendorName: 'Demo Vendor',
}

export default async function ReturnPage({ params, searchParams }: Props) {
  const { vendor_id } = await params
  const { order_id } = await searchParams

  // ── UI Preview bypass ──────────────────────────────────────
  const isPreview = order_id === 'test-ui'

  if (isPreview) {
    return <ReturnUI
      status="completed"
      vendorName={PREVIEW_DATA.vendorName}
      vendorSlug={vendor_id}
      orderId={PREVIEW_DATA.orderId}
      amount={PREVIEW_DATA.amount}
      paymentMethod={PREVIEW_DATA.paymentMethod}
      customerEmail={PREVIEW_DATA.customerEmail}
    />
  }

  // ── Live path ──────────────────────────────────────────────
  const supabase = createServiceClient()
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, name, link_slug')
    .eq('link_slug', vendor_id)
    .single()

  let status: string | null = null
  let txnAmount: number | null = null
  let txnMethod: string | null = null
  let txnEmail: string | null = null

  if (order_id) {
    const { data: txn } = await supabase
      .from('transactions')
      .select('status, amount, payment_method, customer_email')
      .eq('taptap_order_id', order_id)
      .maybeSingle()

    status = txn?.status ?? null
    txnAmount = txn?.amount ?? null
    txnMethod = txn?.payment_method ?? null
    txnEmail = txn?.customer_email ?? null
  }

  const methodLabel: Record<string, string> = {
    cashapp: 'Cash App',
    googlepay: 'Google Pay',
    applepay: 'Apple Pay',
  }

  return <ReturnUI
    status={status}
    vendorName={vendor?.name ?? null}
    vendorSlug={vendor?.link_slug ?? vendor_id}
    orderId={order_id ?? null}
    amount={txnAmount}
    paymentMethod={txnMethod ? (methodLabel[txnMethod] ?? txnMethod) : null}
    customerEmail={txnEmail}
  />
}

// ── Shared UI component ──────────────────────────────────────
function ReturnUI({
  status,
  vendorName,
  vendorSlug,
  orderId,
  amount,
  paymentMethod,
  customerEmail,
}: {
  status: string | null
  vendorName: string | null
  vendorSlug: string
  orderId: string | null
  amount: number | null
  paymentMethod: string | null
  customerEmail: string | null
}) {
  const isSuccess = status === 'completed'
  const isPending = !status || status === 'pending' || status === 'processing'
  const isFailed = !isSuccess && !isPending

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="text-sm font-semibold text-slate-700">CashHox</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Status banner */}
          <div className={`px-6 pt-8 pb-6 text-center border-b border-slate-100 ${
            isSuccess ? 'bg-emerald-50/40' : isPending ? 'bg-amber-50/40' : 'bg-red-50/40'
          }`}>
            {/* Icon */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isSuccess ? 'bg-emerald-100' : isPending ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              {isSuccess ? (
                <CheckCircle className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
              ) : isPending ? (
                <Clock className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
              ) : (
                <XCircle className="w-8 h-8 text-red-500" strokeWidth={1.5} />
              )}
            </div>

            {/* Title */}
            <h1 className={`text-xl font-semibold mb-1 ${
              isSuccess ? 'text-emerald-700' : isPending ? 'text-amber-700' : 'text-red-700'
            }`}>
              {isSuccess ? 'Payment Successful' : isPending ? 'Payment Processing' : 'Payment Failed'}
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-slate-500">
              {isSuccess
                ? 'Your payment was received successfully.'
                : isPending
                ? "Your payment is being processed. You'll receive a confirmation shortly."
                : 'Something went wrong with your payment. Please try again.'}
            </p>
          </div>

          {/* Details */}
          {(amount != null || paymentMethod || customerEmail || orderId) && (
            <div className="px-6 py-5 space-y-3">
              {amount != null && (
                <DetailRow
                  label="Amount"
                  value={
                    <span className="font-semibold text-slate-900 text-sm">
                      ${Number(amount).toFixed(2)}
                    </span>
                  }
                />
              )}
              {paymentMethod && (
                <DetailRow label="Payment Method" value={paymentMethod} />
              )}
              {customerEmail && (
                <DetailRow label="Email" value={customerEmail} />
              )}
              {orderId && (
                <DetailRow
                  label="Order ID"
                  value={
                    <span className="font-mono text-xs text-slate-500">{orderId}</span>
                  }
                />
              )}
            </div>
          )}

          {/* CTA */}
          <div className="px-6 pb-6 pt-2">
            {isSuccess ? (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Secured by CashHox · 256-bit encryption</span>
              </div>
            ) : (
              <Link
                href={`/pay/${vendorSlug}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Try again
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className="text-sm text-slate-700">{value}</span>
    </div>
  )
}

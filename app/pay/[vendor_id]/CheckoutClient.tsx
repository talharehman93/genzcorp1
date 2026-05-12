'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Lock, ShieldCheck, ChevronDown } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  link_slug: string
}

interface Props {
  vendor: Vendor
}

type PaymentMethod = 'cashapp' | 'googlepay' | 'applepay'

// ── Amount options per payment method ────────────────────────────
const CASHAPP_AMOUNTS = [
  4.99, 5.99, 6.99, 7.99, 8.99, 9.99, 10.99, 11.99, 12.99, 13.99,
  14.99, 15.99, 17.99, 19.99, 24.99, 29.99, 30.99, 39.99, 49.99,
  59.99, 99.99, 124.99, 129.99, 149.99, 199.99, 300, 400, 500,
]

const CARD_AMOUNTS = [
  9.99, 14.99, 17.99, 19.99, 24.99, 29.99, 30.99, 39.99, 49.99, 59.99, 99.99,
]

function getAmounts(method: PaymentMethod): number[] {
  return method === 'cashapp' ? CASHAPP_AMOUNTS : CARD_AMOUNTS
}

function formatAmount(val: number): string {
  return val % 1 === 0 ? `$${val}` : `$${val.toFixed(2)}`
}

export default function CheckoutClient({ vendor }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('cashapp')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState<number>(CASHAPP_AMOUNTS[0])
  const [loading, setLoading] = useState(false)

  function handleMethodChange(newMethod: PaymentMethod) {
    setMethod(newMethod)
    setAmount(getAmounts(newMethod)[0])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: vendor.id,
          email,
          amount: Math.round(Number(amount)),
          paymentMethod: method,
        }),
      })

      const result = await res.json()
      const redirectUrl: string | undefined =
        result.redirect_url ?? result.data?.redirect_url

      if (!result.success || !redirectUrl) {
        toast.error(result.message ?? result.data?.message ?? 'Payment could not be initiated.')
        setLoading(false)
        return
      }

      window.location.href = redirectUrl
    } catch {
      toast.error('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const amounts = getAmounts(method)

  return (
    /*
     * On mobile: start at the top with comfortable top padding.
     * On sm+ (≥640 px): vertically center in viewport.
     */
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-start sm:justify-center px-4 pt-10 pb-8 sm:pt-0 sm:pb-0">
      <div className="w-full max-w-md mx-auto">

        {/* ── Brand header ─────────────────────────────────────── */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="text-sm font-semibold text-slate-800">CashHox</span>
          </div>
          {/* Title scales down on very small screens so it never wraps awkwardly */}
          <h1 className="text-[1.35rem] sm:text-2xl font-semibold text-slate-900 leading-tight">
            Complete your payment
          </h1>
          <p className="text-sm text-slate-500 mt-1">Secure · Fast · Encrypted</p>
        </div>

        {/* ── Card ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Payment method selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Payment Method
              </label>

              {/*
               * 3-column grid on ≥360 px (all modern phones).
               * Falls back to single column on very small (< 360 px) devices.
               */}
              <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2.5">
                <PaymentButton
                  id="cashapp"
                  selected={method === 'cashapp'}
                  onClick={() => handleMethodChange('cashapp')}
                >
                  <CashAppIcon />
                </PaymentButton>
                <PaymentButton
                  id="googlepay"
                  selected={method === 'googlepay'}
                  onClick={() => handleMethodChange('googlepay')}
                >
                  <GooglePayIcon />
                </PaymentButton>
                <PaymentButton
                  id="applepay"
                  selected={method === 'applepay'}
                  onClick={() => handleMethodChange('applepay')}
                >
                  <ApplePayIcon />
                </PaymentButton>
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Amount dropdown */}
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Amount (USD)
              </label>
              <div className="relative">
                <select
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full appearance-none px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition cursor-pointer pr-10"
                >
                  {amounts.map((val) => (
                    <option key={val} value={val}>
                      {formatAmount(val)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Submit — large, prominent, with active press effect */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3.5 px-4 rounded-xl bg-black text-white
                text-[15px] font-semibold
                flex items-center justify-center gap-2
                hover:bg-slate-800
                active:scale-[0.97] active:bg-slate-900
                transition-all duration-100
                disabled:opacity-50 disabled:cursor-not-allowed
                mt-1
                min-h-[52px]
              "
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to payment…
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Pay {formatAmount(amount)}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Trust badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 pb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span>Secured by CashHox · 256-bit encryption</span>
        </div>

      </div>
    </div>
  )
}

// ── Payment method button ─────────────────────────────────────────
function PaymentButton({
  id,
  selected,
  onClick,
  children,
}: {
  id: string
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className={`
        relative flex items-center justify-center
        h-12 min-[360px]:h-14
        rounded-xl cursor-pointer select-none overflow-hidden
        transition-all duration-150
        active:scale-[0.96]
        ${
          selected
            ? 'ring-2 ring-blue-600 ring-offset-2 border-transparent shadow-sm'
            : 'border border-slate-200 hover:border-slate-300 hover:shadow-sm'
        }
      `}
    >
      {children}
    </button>
  )
}

// ── Inline SVG icons ──────────────────────────────────────────────
function CashAppIcon() {
  return (
    <div className="flex items-center justify-center w-full h-full rounded-xl bg-[#34C759] gap-1.5 px-2 sm:px-3">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <text
          x="8"
          y="12"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          $
        </text>
      </svg>
      <span className="text-white text-[11px] sm:text-xs font-bold tracking-tight whitespace-nowrap">
        Cash App
      </span>
    </div>
  )
}

function GooglePayIcon() {
  return (
    <div className="flex items-center justify-center w-full h-full rounded-xl bg-white gap-1.5 px-2 sm:px-3">
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <path
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
          fill="#34A853"
        />
        <path
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
          fill="#EA4335"
        />
      </svg>
      <span className="text-slate-700 text-[11px] sm:text-xs font-semibold tracking-tight whitespace-nowrap">
        G Pay
      </span>
    </div>
  )
}

function ApplePayIcon() {
  return (
    <div className="flex items-center justify-center w-full h-full rounded-xl bg-white gap-1.5 px-2 sm:px-3">
      <svg
        width="16"
        height="18"
        viewBox="0 0 16 18"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        fill="#1d1d1f"
        className="flex-shrink-0"
      >
        <path d="M13.173 9.42c-.02-2.2 1.8-3.262 1.88-3.315-1.024-1.496-2.617-1.702-3.186-1.722-1.353-.138-2.646.8-3.333.8-.687 0-1.75-.78-2.877-.758C4.14 4.447 2.6 5.315 1.754 6.715c-1.716 2.97-.44 7.36 1.232 9.764.82 1.176 1.794 2.494 3.072 2.447 1.236-.05 1.7-.792 3.195-.792 1.494 0 1.918.792 3.224.764 1.327-.022 2.165-1.196 2.975-2.378a11.59 11.59 0 0 0 1.352-2.742c-.031-.013-2.587-1-2.61-3.958zM10.93 2.94C11.61 2.11 12.07.99 11.94.003c-.87.05-1.935.59-2.563 1.408-.565.73-1.063 1.897-.93 3.013.972.076 1.967-.504 2.483-1.485z" />
      </svg>
      <span className="text-slate-700 text-[11px] sm:text-xs font-semibold tracking-tight whitespace-nowrap">
        Apple Pay
      </span>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldOff, ArrowLeft } from 'lucide-react'

export default function SuspendedPage() {
  const router = useRouter()

  // Sign the user out so they can't manually navigate back into the app
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.signOut()
  }, [])

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-8 h-8 text-red-500" />
        </div>

        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-6 h-6 rounded-md bg-black flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">C</span>
          </div>
          <span className="text-sm font-semibold text-slate-700">CashHox</span>
        </div>

        {/* Message */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7 space-y-3">
          <h1 className="text-lg font-semibold text-slate-900">Account Suspended</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your account has been suspended and you no longer have access to the
            CashHox platform. Please contact our support team to resolve this.
          </p>

          {/* Support contact */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mt-2">
            <p className="text-xs text-slate-400 mb-0.5">Support</p>
            <p className="text-sm font-medium text-slate-700">support@cashhox.com</p>
          </div>
        </div>

        {/* Back to login */}
        <button
          onClick={() => router.push('/login')}
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </button>

      </div>
    </div>
  )
}

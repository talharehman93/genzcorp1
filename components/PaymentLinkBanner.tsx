'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  slug: string
}

export default function PaymentLinkBanner({ slug }: Props) {
  const [copied, setCopied] = useState(false)
  // Prefer the env var; fall back to the browser's own origin at runtime
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  const link = `${appUrl}/pay/${slug}`

  async function copy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-0.5">
          Your Unique Payment Link
        </p>
        <p className="text-sm font-medium text-blue-900 truncate">{link}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-100 transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </a>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

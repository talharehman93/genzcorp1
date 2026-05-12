'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', onKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    /*
     * Mobile  → items-end  (panel anchors to bottom, slides up)
     * Desktop → items-center justify-center (panel floats in center)
     */
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel ─ bottom sheet on mobile, centered card on desktop */}
      <div
        className={cn(
          // Base
          'relative bg-white w-full overflow-y-auto',
          // Mobile: full-width bottom sheet, rounded top, slide up
          'rounded-t-3xl max-h-[92vh] animate-slide-up',
          // Desktop: centered card, all rounded, fade-in, constrained width
          'md:rounded-2xl md:animate-fade-scale md:max-h-[90vh] md:shadow-xl md:border md:border-slate-100 md:max-w-2xl',
          className
        )}
      >
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-3.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition tap-scale"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 pb-safe">{children}</div>
      </div>
    </div>
  )
}

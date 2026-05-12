'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, Filter, CheckCircle2, X, Pencil, Check, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { TransactionWithVendor } from './page'

type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
type FilterMethod = 'all' | 'cashapp' | 'googlepay' | 'applepay'

interface Props {
  transactions: TransactionWithVendor[]
  isAdmin: boolean
}

const METHOD_LABELS: Record<string, string> = {
  cashapp: 'Cash App',
  googlepay: 'Google Pay',
  applepay: 'Apple Pay',
}

export default function PaymentsClient({ transactions: initial, isAdmin }: Props) {
  const [transactions, setTransactions] = useState<TransactionWithVendor[]>(initial)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [methodFilter, setMethodFilter] = useState<FilterMethod>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedTxn, setSelectedTxn] = useState<TransactionWithVendor | null>(null)
  const [saving, setSaving] = useState(false)

  // Inline label edit state: tracks which row is being edited
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editingLabelValue, setEditingLabelValue] = useState('')
  const labelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingLabelId && labelInputRef.current) {
      labelInputRef.current.focus()
    }
  }, [editingLabelId])

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const q = search.toLowerCase()
      if (q && !t.customer_email.toLowerCase().includes(q) &&
          !t.merchant_reference.toLowerCase().includes(q) &&
          !(t.vendor_name ?? '').toLowerCase().includes(q) &&
          !(t.custom_label ?? '').toLowerCase().includes(q)) return false
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (methodFilter !== 'all' && t.payment_method !== methodFilter) return false
      if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false
      if (dateTo && new Date(t.created_at) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [transactions, search, statusFilter, methodFilter, dateFrom, dateTo])

  function startEditLabel(txn: TransactionWithVendor, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingLabelId(txn.id)
    setEditingLabelValue(txn.custom_label ?? '')
  }

  async function commitLabel(txnId: string) {
    const txn = transactions.find((t) => t.id === txnId)
    if (!txn) return
    const newLabel = editingLabelValue.trim() || null
    if (newLabel === txn.custom_label) {
      setEditingLabelId(null)
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .update({ custom_label: newLabel })
      .eq('id', txnId)

    if (error) {
      toast.error('Failed to save label')
    } else {
      setTransactions((prev) =>
        prev.map((t) => t.id === txnId ? { ...t, custom_label: newLabel } : t)
      )
      // Update open modal too
      setSelectedTxn((prev) => prev?.id === txnId ? { ...prev, custom_label: newLabel } : prev)
      if (newLabel) toast.success('Label saved')
    }

    setEditingLabelId(null)
    setSaving(false)
  }

  async function toggleVerified(txn: TransactionWithVendor, e: React.MouseEvent) {
    e.stopPropagation()
    const newVal = !txn.is_verified
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .update({ is_verified: newVal })
      .eq('id', txn.id)

    if (error) {
      toast.error('Failed to update verification')
    } else {
      setTransactions((prev) =>
        prev.map((t) => t.id === txn.id ? { ...t, is_verified: newVal } : t)
      )
      setSelectedTxn((prev) =>
        prev?.id === txn.id ? { ...prev, is_verified: newVal } : prev
      )
      toast.success(newVal ? 'Marked as verified' : 'Verification removed')
    }
    setSaving(false)
  }

  const hasActiveFilters = statusFilter !== 'all' || methodFilter !== 'all' || dateFrom || dateTo

  // Column list driven by role
  const columns = [
    'Date',
    ...(isAdmin ? ['Vendor'] : []),
    'Customer',
    'Amount',
    'Method',
    'Reference',
    'Status',
    'Label',
    '',
  ]

  return (
    <div className="px-4 py-5 md:p-6 max-w-[1400px] mx-auto space-y-4 md:space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {filtered.length} of {transactions.length} transactions
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 md:p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search email, reference, label…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as FilterMethod)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All methods</option>
            <option value="cashapp">Cash App</option>
            <option value="googlepay">Google Pay</option>
            <option value="applepay">Apple Pay</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {hasActiveFilters && (
            <button
              onClick={() => { setStatusFilter('all'); setMethodFilter('all'); setDateFrom(''); setDateTo('') }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── MOBILE CARD VIEW (hidden on md+) ────────────────────── */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-12 text-center text-sm text-slate-400">
            No transactions match your filters
          </div>
        )}
        {filtered.map((txn) => (
          <div
            key={txn.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 active:bg-slate-50 transition tap-scale"
            onClick={() => setSelectedTxn(txn)}
          >
            {/* Row 1: date + status */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{formatDate(txn.created_at)}</span>
              <Badge status={txn.status}>
                {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
              </Badge>
            </div>

            {/* Row 2: amount + method */}
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-slate-900">{formatCurrency(txn.amount)}</span>
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {METHOD_LABELS[txn.payment_method] ?? txn.payment_method}
              </span>
            </div>

            {/* Row 3: customer + vendor (admin) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-700 font-medium truncate flex-1 min-w-0">
                {txn.customer_email}
              </span>
              {isAdmin && txn.vendor_name && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0">
                  {txn.vendor_name}
                </span>
              )}
            </div>

            {/* Row 4: reference */}
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-mono text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg flex-1 truncate">
                {txn.merchant_reference}
              </span>
              {txn.is_verified && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              )}
            </div>

            {/* Row 5: label + actions */}
            <div
              className="flex items-center gap-2 pt-1 border-t border-slate-50"
              onClick={(e) => e.stopPropagation()}
            >
              {editingLabelId === `m-${txn.id}` ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    ref={labelInputRef}
                    value={editingLabelValue}
                    onChange={(e) => setEditingLabelValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { commitLabel(txn.id); setEditingLabelId(null) }
                      if (e.key === 'Escape') setEditingLabelId(null)
                    }}
                    onBlur={() => { commitLabel(txn.id); }}
                    autoFocus
                    placeholder="Add label…"
                    className="flex-1 text-sm px-3 py-2 rounded-xl border border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onMouseDown={(e) => { e.preventDefault(); commitLabel(txn.id); setEditingLabelId(null) }}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-600"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingLabelId(`m-${txn.id}`)
                    setEditingLabelValue(txn.custom_label ?? '')
                  }}
                  className={`flex-1 flex items-center gap-2 text-sm rounded-xl px-3 py-2 text-left transition ${
                    txn.custom_label
                      ? 'text-slate-700 bg-slate-50 border border-slate-100'
                      : 'text-slate-400 bg-slate-50 border border-dashed border-slate-200'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  <span className="truncate">{txn.custom_label ?? 'Add label…'}</span>
                </button>
              )}

              <button
                onClick={(e) => toggleVerified(txn, e)}
                className={`flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 transition tap-scale ${
                  txn.is_verified
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-slate-100 text-slate-400'
                }`}
                title={txn.is_verified ? 'Unverify' : 'Verify'}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── DESKTOP TABLE VIEW (hidden on mobile) ───────────────── */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {columns.map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-slate-400">
                    No transactions match your filters
                  </td>
                </tr>
              )}
              {filtered.map((txn) => (
                <tr
                  key={txn.id}
                  className="hover:bg-slate-50/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedTxn(txn)}
                >
                  {/* Date */}
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                    {formatDate(txn.created_at)}
                  </td>

                  {/* Vendor (admin only) */}
                  {isAdmin && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {txn.vendor_name ?? '—'}
                      </span>
                    </td>
                  )}

                  {/* Customer */}
                  <td className="px-4 py-3 text-slate-700 font-medium max-w-[160px] truncate text-xs">
                    {txn.customer_email}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    {formatCurrency(txn.amount)}
                  </td>

                  {/* Method */}
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                    {METHOD_LABELS[txn.payment_method] ?? txn.payment_method}
                  </td>

                  {/* Reference */}
                  <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <span className="font-mono text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                      {txn.merchant_reference}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge status={txn.status}>
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </Badge>
                  </td>

                  {/* Label — inline click-to-edit */}
                  <td
                    className="px-4 py-3 min-w-[140px] max-w-[180px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingLabelId === txn.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={labelInputRef}
                          value={editingLabelValue}
                          onChange={(e) => setEditingLabelValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitLabel(txn.id)
                            if (e.key === 'Escape') setEditingLabelId(null)
                          }}
                          onBlur={() => commitLabel(txn.id)}
                          placeholder="Add label…"
                          className="w-full text-xs px-2 py-1 rounded-lg border border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onMouseDown={(e) => { e.preventDefault(); commitLabel(txn.id) }}
                          className="p-1 rounded text-emerald-600 hover:bg-emerald-50 flex-shrink-0"
                        >
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => startEditLabel(txn, e)}
                        className={`group flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 w-full text-left transition ${
                          txn.custom_label
                            ? 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-100'
                            : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50 border border-dashed border-slate-200'
                        }`}
                        title="Click to edit label"
                      >
                        <span className="truncate flex-1">
                          {txn.custom_label ?? 'Add label…'}
                        </span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 flex-shrink-0 transition" />
                      </button>
                    )}
                  </td>

                  {/* Verified badge */}
                  <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleVerified(txn, e)}
                      className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition ${
                        txn.is_verified
                          ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'
                      }`}
                      title={txn.is_verified ? 'Click to unverify' : 'Click to verify'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {txn.is_verified ? 'Verified' : ''}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction detail modal */}
      <Modal
        open={!!selectedTxn}
        onClose={() => setSelectedTxn(null)}
        title="Transaction Details"
      >
        {selectedTxn && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Date', formatDate(selectedTxn.created_at)],
                ['Amount', formatCurrency(selectedTxn.amount)],
                ['Customer', selectedTxn.customer_email],
                ['Method', METHOD_LABELS[selectedTxn.payment_method]],
                ...(isAdmin ? [['Vendor', selectedTxn.vendor_name ?? '—']] : []),
                ['Status', null],
                ['Reference', selectedTxn.merchant_reference],
                ['Order ID', selectedTxn.taptap_order_id ?? '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
                  {label === 'Status' ? (
                    <Badge status={selectedTxn.status}>
                      {selectedTxn.status.charAt(0).toUpperCase() + selectedTxn.status.slice(1)}
                    </Badge>
                  ) : (
                    <p className="text-slate-800 font-medium text-xs break-all">{value as string}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Label + Verified (available to both admin and vendor) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Custom Label
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={
                      editingLabelId === `modal-${selectedTxn.id}`
                        ? editingLabelValue
                        : selectedTxn.custom_label ?? ''
                    }
                    onFocus={() => {
                      setEditingLabelId(`modal-${selectedTxn.id}`)
                      setEditingLabelValue(selectedTxn.custom_label ?? '')
                    }}
                    onChange={(e) => setEditingLabelValue(e.target.value)}
                    placeholder='e.g. "Sent by Usman"'
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={async () => {
                      const newLabel = editingLabelValue.trim() || null
                      setSaving(true)
                      const supabase = createClient()
                      const { error } = await supabase
                        .from('transactions')
                        .update({ custom_label: newLabel })
                        .eq('id', selectedTxn.id)
                      if (error) {
                        toast.error('Failed to save label')
                      } else {
                        setTransactions((prev) =>
                          prev.map((t) => t.id === selectedTxn.id ? { ...t, custom_label: newLabel } : t)
                        )
                        setSelectedTxn((prev) => prev ? { ...prev, custom_label: newLabel } : null)
                        setEditingLabelId(null)
                        toast.success('Label saved')
                      }
                      setSaving(false)
                    }}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-800">Verification</p>
                  <p className="text-xs text-slate-500 mt-0.5">Mark as manually verified</p>
                </div>
                <button
                  onClick={(e) => toggleVerified(selectedTxn, e)}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                    selectedTxn.is_verified
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {selectedTxn.is_verified ? 'Verified' : 'Mark as Verified'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

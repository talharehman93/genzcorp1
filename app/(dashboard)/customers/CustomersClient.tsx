'use client'

import { useState } from 'react'
import { Search, TrendingUp } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { CustomerStats, Transaction } from '@/lib/supabase/types'

interface Props {
  stats: CustomerStats[]
  isAdmin: boolean
}

const METHOD_LABELS: Record<string, string> = {
  cashapp: 'Cash App',
  googlepay: 'Google Pay',
  applepay: 'Apple Pay',
}

export default function CustomersClient({ stats, isAdmin }: Props) {
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStats | null>(null)
  const [history, setHistory] = useState<Transaction[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const filtered = stats.filter((s) =>
    !search || s.customer_email?.toLowerCase().includes(search.toLowerCase())
  )

  async function openCustomer(customer: CustomerStats) {
    setSelectedCustomer(customer)
    setHistory([])
    setLoadingHistory(true)

    const supabase = createClient()
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('customer_email', customer.customer_email ?? '')
      .order('created_at', { ascending: false })

    if (!isAdmin && customer.vendor_id) {
      query = query.eq('vendor_id', customer.vendor_id)
    }

    const { data } = await query
    setHistory(data ?? [])
    setLoadingHistory(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {filtered.length} unique customer{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Customer', 'Total Paid', 'Transactions', 'Success', 'Failed', 'Last Activity'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                    No customers found
                  </td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr
                  key={`${s.vendor_id}-${s.customer_email}`}
                  className="hover:bg-slate-50/60 cursor-pointer transition"
                  onClick={() => openCustomer(s)}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {s.customer_email}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    {formatCurrency(s.lifetime_value)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {s.total_transactions ?? 0}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-emerald-600 font-medium">
                      {s.success_count ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-red-500 font-medium">{s.failed_count ?? 0}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                    {formatDate(s.last_transaction_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer profile modal */}
      <Modal
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.customer_email ?? 'Customer Profile'}
        className="max-w-3xl"
      >
        {selectedCustomer && (
          <div className="space-y-5">
            {/* LTV cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: 'Lifetime Value',
                  value: formatCurrency(selectedCustomer.lifetime_value),
                  icon: <TrendingUp className="w-3.5 h-3.5" />,
                  color: 'text-blue-600 bg-blue-50',
                },
                {
                  label: 'Total',
                  value: String(selectedCustomer.total_transactions ?? 0),
                  color: 'text-slate-600 bg-slate-50',
                },
                {
                  label: 'Success',
                  value: String(selectedCustomer.success_count ?? 0),
                  color: 'text-emerald-600 bg-emerald-50',
                },
                {
                  label: 'Failed',
                  value: String(selectedCustomer.failed_count ?? 0),
                  color: 'text-red-500 bg-red-50',
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl bg-slate-50 p-3 text-center"
                >
                  <p className="text-xs text-slate-400 mb-1">{card.label}</p>
                  <p className={`text-lg font-semibold ${card.color.split(' ')[0]}`}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Transaction history */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Transaction History</h3>
              {loadingHistory ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No transactions</p>
              ) : (
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Date', 'Amount', 'Method', 'Status'].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-2.5 font-semibold text-slate-400 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {history.map((txn) => (
                        <tr key={txn.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                            {formatDate(txn.created_at)}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            {formatCurrency(txn.amount)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {METHOD_LABELS[txn.payment_method] ?? txn.payment_method}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge status={txn.status}>
                              {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

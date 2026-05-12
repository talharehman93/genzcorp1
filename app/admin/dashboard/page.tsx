import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import { MetricCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // All transactions
  const { data: txns } = await supabase
    .from('transactions')
    .select('amount, status')

  const all = txns ?? []
  const completed = all.filter((t) => t.status === 'completed')
  const pending = all.filter((t) => t.status === 'pending' || t.status === 'processing')
  const totalRevenue = completed.reduce((s, t) => s + Number(t.amount), 0)
  const successRate =
    all.length > 0 ? Math.round((completed.length / all.length) * 100) : 0

  const { data: recentRaw } = await supabase
    .from('transactions')
    .select('id, customer_email, amount, payment_method, status, created_at, vendor_id')
    .order('created_at', { ascending: false })
    .limit(15)

  // Fetch vendor names separately to avoid join type complexity
  const { data: allVendors } = await supabase
    .from('vendors')
    .select('id, name')

  const vendorMap = Object.fromEntries(
    (allVendors ?? []).map((v) => [v.id, v.name])
  )

  const recent = (recentRaw ?? []).map((t) => ({
    ...t,
    vendor_name: vendorMap[t.vendor_id] ?? '—',
  }))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">All vendors · Global view</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <MetricCard
          title="Transactions"
          value={all.length.toString()}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <MetricCard
          title="Pending"
          value={pending.length.toString()}
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date', 'Vendor', 'Customer', 'Amount', 'Method', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(recent ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                    No transactions yet
                  </td>
                </tr>
              )}
              {(recent ?? []).map((txn) => {
                return (
                  <tr key={txn.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                      {formatDate(txn.created_at)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium">
                      {txn.vendor_name}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">{txn.customer_email}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 capitalize">
                      {txn.payment_method === 'cashapp'
                        ? 'Cash App'
                        : txn.payment_method === 'googlepay'
                        ? 'Google Pay'
                        : 'Apple Pay'}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge status={txn.status}>
                        {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

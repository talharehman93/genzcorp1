import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import { MetricCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import PaymentLinkBanner from '@/components/PaymentLinkBanner'

export default async function VendorDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, vendor_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'super_admin') redirect('/admin/dashboard')

  const vendorId = profile.vendor_id

  // A vendor account must always have a vendor_id — if missing the account is misconfigured
  if (!vendorId) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold text-slate-700 mb-1">Account setup incomplete</p>
          <p className="text-xs text-slate-400">
            Your vendor profile has not been fully configured. Please contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('name, link_slug')
    .eq('id', vendorId)
    .single()

  // Metrics
  const { data: txns } = await supabase
    .from('transactions')
    .select('amount, status, created_at')
    .eq('vendor_id', vendorId)

  const all = txns ?? []
  const completed = all.filter((t) => t.status === 'completed')
  const pending = all.filter((t) => t.status === 'pending' || t.status === 'processing')
  const totalRevenue = completed.reduce((s, t) => s + Number(t.amount), 0)
  const successRate =
    all.length > 0 ? Math.round((completed.length / all.length) * 100) : 0

  // Recent transactions
  const { data: recent } = await supabase
    .from('transactions')
    .select('id, customer_email, amount, payment_method, status, created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Welcome back{vendor?.name ? `, ${vendor.name}` : ''}
        </p>
      </div>

      {/* Payment link banner */}
      {vendor?.link_slug && <PaymentLinkBanner slug={vendor.link_slug} />}

      {/* Metric cards */}
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

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Method
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(recent ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                    No transactions yet
                  </td>
                </tr>
              )}
              {(recent ?? []).map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                    {formatDate(txn.created_at)}
                  </td>
                  <td className="px-6 py-3.5 text-slate-700 font-medium">
                    {txn.customer_email}
                  </td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaymentsClient from './PaymentsClient'
import type { Transaction } from '@/lib/supabase/types'

export type TransactionWithVendor = Transaction & { vendor_name: string | null }

export default async function PaymentsPage() {
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

  const isAdmin = profile.role === 'super_admin'

  // Fetch transactions
  let txnQuery = supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)

  if (!isAdmin && profile.vendor_id) {
    txnQuery = txnQuery.eq('vendor_id', profile.vendor_id)
  }

  const { data: transactions } = await txnQuery

  // Fetch vendor name map (admin sees all; vendor fetches their own)
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')

  const vendorMap = Object.fromEntries(
    (vendors ?? []).map((v) => [v.id, v.name])
  )

  const enriched: TransactionWithVendor[] = (transactions ?? []).map((t) => ({
    ...t,
    vendor_name: vendorMap[t.vendor_id] ?? null,
  }))

  return (
    <PaymentsClient
      transactions={enriched}
      isAdmin={isAdmin}
    />
  )
}

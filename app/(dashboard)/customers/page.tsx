import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
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

  let statsQuery = supabase
    .from('customer_stats')
    .select('*')
    .order('lifetime_value', { ascending: false })

  if (profile.role === 'vendor' && profile.vendor_id) {
    statsQuery = statsQuery.eq('vendor_id', profile.vendor_id)
  }

  const { data: stats } = await statsQuery

  return <CustomersClient stats={stats ?? []} isAdmin={profile.role === 'super_admin'} />
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SubVendorsClient from './SubVendorsClient'
import type { Vendor } from '@/lib/supabase/types'

export type VendorWithStatus = Vendor & {
  is_suspended: boolean
  profile_role: 'super_admin' | 'vendor'
}

export default async function SubVendorsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: settlements } = await supabase
    .from('vendor_settlements')
    .select('*')

  // Fetch suspension status for all vendor profiles
  const vendorIds = (vendors ?? []).map((v) => v.id)
  const { data: vendorProfiles } = vendorIds.length
    ? await supabase
        .from('profiles')
        .select('vendor_id, is_suspended, role')
        .in('vendor_id', vendorIds)
    : { data: [] }

  const profileMap: Record<string, { is_suspended: boolean; role: 'super_admin' | 'vendor' }> = {}
  for (const p of vendorProfiles ?? []) {
    if (p.vendor_id) {
      profileMap[p.vendor_id] = {
        is_suspended: p.is_suspended ?? false,
        role: (p.role as 'super_admin' | 'vendor') ?? 'vendor',
      }
    }
  }

  const enrichedVendors: VendorWithStatus[] = (vendors ?? []).map((v) => ({
    ...v,
    is_suspended: profileMap[v.id]?.is_suspended ?? false,
    profile_role: profileMap[v.id]?.role ?? 'vendor',
  }))

  return (
    <SubVendorsClient
      vendors={enrichedVendors}
      settlements={settlements ?? []}
      adminUserId={user.id}
    />
  )
}

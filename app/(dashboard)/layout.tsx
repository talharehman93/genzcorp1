import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { Toaster } from 'sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, vendor_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  let vendorName: string | undefined
  if (profile.role === 'vendor' && profile.vendor_id) {
    const { data: vendor } = await supabase
      .from('vendors')
      .select('name')
      .eq('id', profile.vendor_id)
      .single()
    vendorName = vendor?.name
  }

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      <Sidebar
        role={profile.role as 'super_admin' | 'vendor'}
        vendorName={vendorName ?? profile.full_name ?? undefined}
      />
      {/* pb-20 reserves space for the mobile bottom nav bar; removed on md+ */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
      <Toaster richColors position="top-right" />
    </div>
  )
}

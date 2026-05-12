import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import CheckoutClient from './CheckoutClient'

interface Props {
  params: Promise<{ vendor_id: string }>
}

export default async function CheckoutPage({ params }: Props) {
  const { vendor_id } = await params
  const supabase = createServiceClient()

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, name, link_slug')
    .eq('link_slug', vendor_id)
    .single()

  if (!vendor) notFound()

  return <CheckoutClient vendor={vendor} />
}

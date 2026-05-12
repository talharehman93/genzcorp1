'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let slug = ''
  for (let i = 0; i < 9; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)]
  }
  return slug
}

export async function createVendorAction(formData: {
  name: string
  email: string
  password: string
}) {
  const supabaseServer = await createClient()
  const { data: { user: adminUser } } = await supabaseServer.auth.getUser()
  if (!adminUser) return { error: 'Not authenticated' }

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', adminUser.id)
    .single()
  if (profile?.role !== 'super_admin') return { error: 'Unauthorized' }

  const service = createServiceClient()
  const slug = generateSlug()

  // Step 1: Create the auth user with service role (bypasses email confirmation)
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Failed to create auth user' }
  }

  const newUserId = authData.user.id

  // Step 2: Create the vendor row
  const { data: vendor, error: vendorError } = await service
    .from('vendors')
    .insert({
      name: formData.name,
      email: formData.email,
      link_slug: slug,
      created_by: adminUser.id,
    })
    .select()
    .single()

  if (vendorError || !vendor) {
    // Rollback auth user
    await service.auth.admin.deleteUser(newUserId)
    return { error: vendorError?.message ?? 'Failed to create vendor record' }
  }

  // Step 3: Link the auth user's profile to this vendor
  const { error: profileError } = await service
    .from('profiles')
    .update({ vendor_id: vendor.id, role: 'vendor', full_name: formData.name })
    .eq('id', newUserId)

  if (profileError) {
    // Non-fatal — vendor row exists, profile link failed
    console.error('Profile link error:', profileError.message)
  }

  revalidatePath('/admin/sub-vendors')
  return { success: true, vendor, slug }
}

export async function deleteVendorAction(vendorId: string) {
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'super_admin') return { error: 'Unauthorized' }

  const service = createServiceClient()

  // Find the vendor's auth user by looking up their profile
  const { data: vendorProfile } = await service
    .from('profiles')
    .select('id')
    .eq('vendor_id', vendorId)
    .single()

  // Delete vendor row (transactions constrained — soft delete approach)
  const { error } = await service
    .from('vendors')
    .delete()
    .eq('id', vendorId)

  if (error) return { error: error.message }

  // Delete auth user if found
  if (vendorProfile?.id) {
    await service.auth.admin.deleteUser(vendorProfile.id)
  }

  revalidatePath('/admin/sub-vendors')
  return { success: true }
}

export async function sendPasswordResetAction(email: string) {
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { error } = await supabaseServer.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/login`,
  })

  if (error) return { error: error.message }
  return { success: true }
}

/**
 * Promotes a vendor to super_admin or demotes a super_admin back to vendor.
 * - Only callable by an existing super_admin.
 * - A super_admin cannot change their own role (self-lockout prevention).
 */
export async function updateUserRoleAction(
  vendorId: string,
  newRole: 'super_admin' | 'vendor'
) {
  // ── 1. Verify the caller is super_admin ──────────────────────
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: callerProfile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'super_admin') return { error: 'Unauthorized' }

  // ── 2. Resolve the target user's profile via vendor_id ───────
  const service = createServiceClient()
  const { data: targetProfile, error: lookupError } = await service
    .from('profiles')
    .select('id, role')
    .eq('vendor_id', vendorId)
    .single()

  if (lookupError || !targetProfile) {
    return { error: 'Could not find the target user\'s account' }
  }

  // ── 3. Block self-role change ─────────────────────────────────
  if (targetProfile.id === user.id) {
    return { error: 'You cannot change your own role' }
  }

  // ── 4. Update role ────────────────────────────────────────────
  const { error: updateError } = await service
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetProfile.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/admin/sub-vendors')
  return { success: true }
}

/**
 * Suspends or unsuspends a vendor by toggling is_suspended on their profile row.
 * Only callable by super_admin.
 */
export async function toggleVendorSuspensionAction(vendorId: string, suspend: boolean) {
  // ── 1. Verify caller is super_admin ──────────────────────────
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: callerProfile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'super_admin') return { error: 'Unauthorized' }

  // ── 2. Update the vendor's profile row ───────────────────────
  const service = createServiceClient()
  const { error } = await service
    .from('profiles')
    .update({ is_suspended: suspend })
    .eq('vendor_id', vendorId)

  if (error) return { error: error.message }

  revalidatePath('/admin/sub-vendors')
  return { success: true }
}

/**
 * Directly sets a new password for a vendor without sending an email.
 * Requires the caller to be a super_admin.
 * Uses the service-role key so it bypasses all RLS / email-confirm flows.
 */
export async function setVendorPasswordAction(vendorId: string, newPassword: string) {
  // ── 1. Verify the caller is super_admin ──────────────────────
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'super_admin') return { error: 'Unauthorized' }

  // ── 2. Resolve the vendor's auth user ID via profiles ────────
  const service = createServiceClient()
  const { data: vendorProfile, error: lookupError } = await service
    .from('profiles')
    .select('id')
    .eq('vendor_id', vendorId)
    .single()

  if (lookupError || !vendorProfile?.id) {
    return { error: 'Could not locate the vendor\'s account' }
  }

  // ── 3. Update password with admin API ────────────────────────
  const { error: updateError } = await service.auth.admin.updateUserById(
    vendorProfile.id,
    { password: newPassword }
  )

  if (updateError) return { error: updateError.message }
  return { success: true }
}

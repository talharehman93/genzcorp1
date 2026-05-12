'use client'

import { useState, useMemo, useTransition } from 'react'
import {
  Plus,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Filter,
  Store,
  DollarSign,
  Trash2,
  Eye,
  EyeOff,
  X,
  ChevronRight,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  createVendorAction,
  deleteVendorAction,
  sendPasswordResetAction,
  setVendorPasswordAction,
  toggleVendorSuspensionAction,
  updateUserRoleAction,
} from './actions'
import type { VendorSettlement } from '@/lib/supabase/types'
import type { VendorWithStatus } from './page'

interface Props {
  vendors: VendorWithStatus[]
  settlements: VendorSettlement[]
  adminUserId: string
}

type Tab = 'vendors' | 'settlements'

export default function SubVendorsClient({ vendors: initial, settlements, adminUserId }: Props) {
  const [vendors, setVendors] = useState<VendorWithStatus[]>(initial)
  const [activeTab, setActiveTab] = useState<Tab>('vendors')
  const [isPending, startTransition] = useTransition()

  // Create vendor modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [creating, setCreating] = useState(false)

  // Email-based reset modal (header button)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetting, setResetting] = useState(false)

  // Direct password-set modal (per-row button)
  const [setPwdTarget, setSetPwdTarget] = useState<VendorWithStatus | null>(null)
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [settingPwd, setSettingPwd] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<VendorWithStatus | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Suspension toggle loading state (tracks which vendor id is in-flight)
  const [suspendingId, setSuspendingId] = useState<string | null>(null)

  // Role change confirmation
  const [roleTarget, setRoleTarget] = useState<{ vendor: VendorWithStatus; newRole: 'super_admin' | 'vendor' } | null>(null)
  const [changingRole, setChangingRole] = useState(false)

  // Copied state per vendor id
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Settlement date filters
  const [settleDateFrom, setSettleDateFrom] = useState('')
  const [settleDateTo, setSettleDateTo] = useState('')

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  function previewSlug(): string {
    return 'xK92bM7zA'  // example of the random 9-char format
  }

  async function handleCreateVendor() {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('All fields are required')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setCreating(true)
    const result = await createVendorAction({
      name: newName.trim(),
      email: newEmail.trim(),
      password: newPassword,
    })

    if (result.error) {
      toast.error(result.error)
      setCreating(false)
      return
    }

    setVendors((prev) => [result.vendor!, ...prev])
    toast.success(`Vendor "${newName}" created! Payment link: /pay/${result.slug}`)
    setNewName('')
    setNewEmail('')
    setNewPassword('')
    setCreateOpen(false)
    setCreating(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteVendorAction(deleteTarget.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      setVendors((prev) => prev.filter((v) => v.id !== deleteTarget.id))
      toast.success(`Vendor "${deleteTarget.name}" deleted`)
    }
    setDeleteTarget(null)
    setDeleting(false)
  }

  async function handleResetPassword() {
    if (!resetEmail.trim()) return
    setResetting(true)
    const result = await sendPasswordResetAction(resetEmail.trim())
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Password reset email sent to ${resetEmail}`)
      setResetOpen(false)
      setResetEmail('')
    }
    setResetting(false)
  }

  async function handleSetPassword() {
    if (!setPwdTarget) return
    if (newPwd.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPwd !== confirmPwd) {
      toast.error('Passwords do not match')
      return
    }

    setSettingPwd(true)
    const result = await setVendorPasswordAction(setPwdTarget.id, newPwd)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Password updated for ${setPwdTarget.name}`)
      setSetPwdTarget(null)
      setNewPwd('')
      setConfirmPwd('')
    }
    setSettingPwd(false)
  }

  async function handleToggleSuspend(vendor: VendorWithStatus) {
    const newState = !vendor.is_suspended
    setSuspendingId(vendor.id)
    const result = await toggleVendorSuspensionAction(vendor.id, newState)
    if (result.error) {
      toast.error(result.error)
    } else {
      setVendors((prev) =>
        prev.map((v) => v.id === vendor.id ? { ...v, is_suspended: newState } : v)
      )
      toast.success(newState ? `${vendor.name} suspended` : `${vendor.name} unsuspended`)
    }
    setSuspendingId(null)
  }

  async function handleRoleChange() {
    if (!roleTarget) return
    setChangingRole(true)
    const result = await updateUserRoleAction(roleTarget.vendor.id, roleTarget.newRole)
    if (result.error) {
      toast.error(result.error)
    } else {
      setVendors((prev) =>
        prev.map((v) =>
          v.id === roleTarget.vendor.id ? { ...v, profile_role: roleTarget.newRole } : v
        )
      )
      toast.success(
        roleTarget.newRole === 'super_admin'
          ? `${roleTarget.vendor.name} promoted to Super Admin`
          : `${roleTarget.vendor.name} demoted to Vendor`
      )
    }
    setRoleTarget(null)
    setChangingRole(false)
  }

  async function copyLink(vendor: VendorWithStatus) {
    const link = `${appUrl}/pay/${vendor.link_slug}`
    await navigator.clipboard.writeText(link)
    setCopiedId(vendor.id)
    toast.success('Payment link copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredSettlements = useMemo(() => settlements, [settlements])

  const totalReceived = filteredSettlements.reduce(
    (s, r) => s + Number(r.total_received ?? 0), 0
  )

  return (
    <div className="px-4 py-5 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sub-Vendors</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => {
              setResetEmail('')
              setResetOpen(true)
            }}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition tap-scale"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Password
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:bg-slate-800 transition tap-scale"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Vendor</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['vendors', 'settlements'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'vendors' ? (
              <Store className="w-3.5 h-3.5" />
            ) : (
              <DollarSign className="w-3.5 h-3.5" />
            )}
            {tab === 'vendors' ? 'Vendors' : 'Pay Vendors'}
          </button>
        ))}
      </div>

      {/* ── VENDORS — MOBILE CARDS (hidden on md+) ─────────────── */}
      {activeTab === 'vendors' && (
        <div className="md:hidden space-y-3">
          {vendors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-14 text-center">
              <Store className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No vendors yet</p>
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-4 flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-black text-white text-sm font-semibold mx-auto tap-scale"
              >
                <Plus className="w-4 h-4" /> Create Vendor
              </button>
            </div>
          ) : (
            vendors.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                {/* Header: avatar + name + badges */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-slate-600">
                      {v.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{v.name}</p>
                      {v.profile_role === 'super_admin' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{v.email}</p>
                  </div>
                  {v.is_suspended ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  )}
                </div>

                {/* Payment link */}
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                  <code className="text-xs text-slate-500 font-mono flex-1 truncate">
                    /pay/{v.link_slug}
                  </code>
                  <button
                    onClick={() => copyLink(v)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition flex-shrink-0 tap-scale"
                  >
                    {copiedId === v.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={`${appUrl}/pay/${v.link_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition flex-shrink-0 tap-scale"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-slate-50">
                  <button
                    onClick={() => {
                      setSetPwdTarget(v)
                      setNewPwd('')
                      setConfirmPwd('')
                      setShowNewPwd(false)
                      setShowConfirmPwd(false)
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition tap-scale"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Set Password
                  </button>
                  <button
                    onClick={() => handleToggleSuspend(v)}
                    disabled={suspendingId === v.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-xs font-medium transition tap-scale disabled:opacity-40 ${
                      v.is_suspended
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}
                  >
                    {suspendingId === v.id ? (
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : (
                      v.is_suspended ? '▶ Unsuspend' : '⏸ Suspend'
                    )}
                  </button>
                  {v.id !== adminUserId && (
                    <button
                      onClick={() =>
                        setRoleTarget({
                          vendor: v,
                          newRole: v.profile_role === 'super_admin' ? 'vendor' : 'super_admin',
                        })
                      }
                      className={`w-11 h-11 flex items-center justify-center rounded-xl border transition tap-scale flex-shrink-0 ${
                        v.profile_role === 'super_admin'
                          ? 'bg-slate-50 text-slate-500 border-slate-200'
                          : 'bg-violet-50 text-violet-600 border-violet-100'
                      }`}
                      title={v.profile_role === 'super_admin' ? 'Demote to Vendor' : 'Promote to Admin'}
                    >
                      {v.profile_role === 'super_admin' ? (
                        <ShieldOff className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(v)}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 transition tap-scale flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── VENDORS TABLE (desktop, hidden on mobile) ───────────── */}
      {activeTab === 'vendors' && (
        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Vendor Name', 'Email', 'Status', 'Payment Link', 'Created', 'Actions'].map((h) => (
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
                {vendors.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <Store className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-600">No vendors yet</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Click "New Vendor" to create your first sub-vendor
                          </p>
                        </div>
                        <button
                          onClick={() => setCreateOpen(true)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:bg-slate-800 transition mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create Vendor
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{v.name}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-sm">{v.email}</td>

                    {/* Status badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {v.is_suspended ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Active
                          </span>
                        )}
                        {v.profile_role === 'super_admin' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full w-fit">
                            <ShieldCheck className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-mono whitespace-nowrap">
                          /pay/{v.link_slug}
                        </code>
                        <button
                          onClick={() => copyLink(v)}
                          title="Copy link"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          {copiedId === v.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={`${appUrl}/pay/${v.link_slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open checkout page"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(v.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSetPwdTarget(v)
                            setNewPwd('')
                            setConfirmPwd('')
                            setShowNewPwd(false)
                            setShowConfirmPwd(false)
                          }}
                          title="Set new password"
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition font-medium px-2 py-1 rounded-lg hover:bg-blue-50"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Set Password
                        </button>
                        <button
                          onClick={() => handleToggleSuspend(v)}
                          disabled={suspendingId === v.id}
                          title={v.is_suspended ? 'Unsuspend vendor' : 'Suspend vendor'}
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition disabled:opacity-40 ${
                            v.is_suspended
                              ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          {suspendingId === v.id ? (
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                          ) : (
                            v.is_suspended ? '▶ Unsuspend' : '⏸ Suspend'
                          )}
                        </button>
                        {/* Promote / Demote — cannot target self */}
                        {v.id !== adminUserId && (
                          <button
                            onClick={() =>
                              setRoleTarget({
                                vendor: v,
                                newRole: v.profile_role === 'super_admin' ? 'vendor' : 'super_admin',
                              })
                            }
                            title={v.profile_role === 'super_admin' ? 'Demote to Vendor' : 'Promote to Admin'}
                            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition ${
                              v.profile_role === 'super_admin'
                                ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                : 'text-violet-600 hover:text-violet-700 hover:bg-violet-50'
                            }`}
                          >
                            {v.profile_role === 'super_admin' ? (
                              <ShieldOff className="w-3 h-3" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            {v.profile_role === 'super_admin' ? 'Demote' : 'Promote'}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(v)}
                          title="Delete vendor"
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 transition font-medium px-2 py-1 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PAY VENDORS (SETTLEMENTS) TABLE ── */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          {/* Date filter */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-600 font-medium">Filter by date:</span>
              <input
                type="date"
                value={settleDateFrom}
                onChange={(e) => setSettleDateFrom(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={settleDateTo}
                onChange={(e) => setSettleDateTo(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(settleDateFrom || settleDateTo) && (
                <button
                  onClick={() => { setSettleDateFrom(''); setSettleDateTo('') }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Vendor Name', 'Email', 'Total', 'Success', 'Failed', 'Pending', 'Total Received'].map((h) => (
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
                  {filteredSettlements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <DollarSign className="w-8 h-8 text-slate-200" />
                          <p className="text-sm text-slate-400">No settlement data yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSettlements.map((s) => (
                      <tr key={s.vendor_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {s.vendor_name}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">{s.vendor_email}</td>
                        <td className="px-5 py-3.5 text-slate-600 font-medium">
                          {s.total_transactions ?? 0}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-emerald-600 font-semibold">
                            {s.success_count ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-red-500 font-semibold">
                            {s.failed_count ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-amber-600 font-semibold">
                            {s.pending_count ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {formatCurrency(s.total_received)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredSettlements.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={2} className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Grand Total
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-800">
                        {filteredSettlements.reduce((s, r) => s + (r.total_transactions ?? 0), 0)}
                      </td>
                      <td className="px-5 py-3 font-bold text-emerald-600">
                        {filteredSettlements.reduce((s, r) => s + (r.success_count ?? 0), 0)}
                      </td>
                      <td className="px-5 py-3 font-bold text-red-500">
                        {filteredSettlements.reduce((s, r) => s + (r.failed_count ?? 0), 0)}
                      </td>
                      <td className="px-5 py-3 font-bold text-amber-600">
                        {filteredSettlements.reduce((s, r) => s + (r.pending_count ?? 0), 0)}
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-900">
                        {formatCurrency(totalReceived)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE VENDOR MODAL ── */}
      <Modal
        open={createOpen}
        onClose={() => {
          if (!creating) {
            setCreateOpen(false)
            setNewName('')
            setNewEmail('')
            setNewPassword('')
          }
        }}
        title="Create New Vendor"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Vendor Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Usman Store"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="vendor@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Temporary Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Share this with the vendor — they can change it after login.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
            <p className="text-xs font-semibold text-blue-500 mb-1">Payment link format</p>
            <code className="text-xs text-blue-800 font-mono break-all">
              /pay/{previewSlug()} <span className="text-blue-400">(random · generated on save)</span>
            </code>
          </div>

          <button
            onClick={handleCreateVendor}
            disabled={creating || !newName.trim() || !newEmail.trim() || !newPassword.trim()}
            className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Creating vendor…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Vendor
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* ── RESET PASSWORD MODAL ── */}
      <Modal
        open={resetOpen}
        onClose={() => {
          if (!resetting) {
            setResetOpen(false)
            setResetEmail('')
          }
        }}
        title="Reset Vendor Password"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            A password reset link will be emailed to the vendor.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Vendor Email
            </label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="vendor@example.com"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleResetPassword}
            disabled={resetting || !resetEmail.trim()}
            className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resetting ? 'Sending…' : 'Send Reset Email'}
          </button>
        </div>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        title="Delete Vendor"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? Their login
            account will also be removed. This action cannot be undone.
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete Vendor'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── ROLE CHANGE CONFIRMATION MODAL ── */}
      <Modal
        open={!!roleTarget}
        onClose={() => { if (!changingRole) setRoleTarget(null) }}
        title={roleTarget?.newRole === 'super_admin' ? 'Promote to Super Admin' : 'Demote to Vendor'}
        className="max-w-sm"
      >
        {roleTarget && (
          <div className="space-y-4">
            {/* Target vendor pill */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-600">
                  {roleTarget.vendor.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{roleTarget.vendor.name}</p>
                <p className="text-xs text-slate-400 truncate">{roleTarget.vendor.email}</p>
              </div>
            </div>

            {/* Warning message */}
            {roleTarget.newRole === 'super_admin' ? (
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-sm text-violet-800 leading-relaxed">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Grant Super Admin access?
                </p>
                <p className="text-violet-700">
                  <strong>{roleTarget.vendor.name}</strong> will have{' '}
                  <strong>full control</strong> over the platform — including access to all
                  vendors, transactions, and admin settings.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 leading-relaxed">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <ShieldOff className="w-4 h-4" />
                  Remove Admin access?
                </p>
                <p className="text-amber-700">
                  <strong>{roleTarget.vendor.name}</strong> will lose all Super Admin
                  privileges and be restricted to vendor-only access.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setRoleTarget(null)}
                disabled={changingRole}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={changingRole}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                  roleTarget.newRole === 'super_admin'
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {changingRole ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : roleTarget.newRole === 'super_admin' ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Promote
                  </>
                ) : (
                  <>
                    <ShieldOff className="w-4 h-4" />
                    Demote
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── SET PASSWORD MODAL ── */}
      <Modal
        open={!!setPwdTarget}
        onClose={() => {
          if (!settingPwd) {
            setSetPwdTarget(null)
            setNewPwd('')
            setConfirmPwd('')
          }
        }}
        title="Set New Password"
        className="max-w-sm"
      >
        {setPwdTarget && (
          <div className="space-y-4">
            {/* Vendor identity pill */}
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-slate-600">
                  {setPwdTarget.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{setPwdTarget.name}</p>
                <p className="text-xs text-slate-400 truncate">{setPwdTarget.email}</p>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                New Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoFocus
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPwd.length > 0 && newPwd.length < 8 && (
                <p className="text-xs text-red-400 mt-1">Must be at least 8 characters</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Re-enter password"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSetPassword() }}
                  className={`w-full px-4 py-2.5 pr-10 rounded-xl border bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition ${
                    confirmPwd && confirmPwd !== newPwd
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-slate-200 focus:ring-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPwd && confirmPwd !== newPwd && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
              {confirmPwd && confirmPwd === newPwd && newPwd.length >= 8 && (
                <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setSetPwdTarget(null); setNewPwd(''); setConfirmPwd('') }}
                disabled={settingPwd}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSetPassword}
                disabled={
                  settingPwd ||
                  newPwd.length < 8 ||
                  newPwd !== confirmPwd
                }
                className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {settingPwd ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Updating…
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

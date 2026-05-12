'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Store,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  mobileIcon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    mobileIcon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'Payments',
    href: '/payments',
    icon: <CreditCard className="w-4 h-4" />,
    mobileIcon: <CreditCard className="w-5 h-5" />,
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: <Users className="w-4 h-4" />,
    mobileIcon: <Users className="w-5 h-5" />,
  },
  {
    label: 'Sub-Vendors',
    href: '/admin/sub-vendors',
    icon: <Store className="w-4 h-4" />,
    mobileIcon: <Store className="w-5 h-5" />,
  },
]

interface SidebarProps {
  role: 'super_admin' | 'vendor'
  vendorName?: string
}

export default function Sidebar({ role, vendorName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  const filteredItems = navItems.filter(
    (item) => item.href !== '/admin/sub-vendors' || role === 'super_admin'
  )

  const overviewHref = role === 'super_admin' ? '/admin/dashboard' : '/dashboard'

  function resolveHref(item: NavItem) {
    return item.label === 'Overview' ? overviewHref : item.href
  }

  function isActive(item: NavItem) {
    const href = resolveHref(item)
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ──────────────────── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-white border-r border-slate-100 h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-none">CashHox</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none capitalize">
                {role === 'super_admin' ? 'Super Admin' : vendorName ?? 'Vendor'}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredItems.map((item) => {
            const href = resolveHref(item)
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all group',
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <span className={cn(active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600')}>
                  {item.icon}
                </span>
                {item.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom navigation bar ───────────────────────── */}
      <nav
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-40',
          'bg-white/80 backdrop-blur-xl',
          'border-t border-white/60 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]'
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch">
          {filteredItems.map((item) => {
            const href = resolveHref(item)
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] tap-scale transition-colors',
                  active ? 'text-slate-900' : 'text-slate-400'
                )}
              >
                <span className={cn(
                  'transition-transform',
                  active && 'scale-110'
                )}>
                  {item.mobileIcon}
                </span>
                <span className={cn(
                  'text-[10px] font-medium leading-none',
                  active ? 'text-slate-900' : 'text-slate-400'
                )}>
                  {item.label === 'Sub-Vendors' ? 'Vendors' : item.label}
                </span>
                {/* Active indicator dot */}
                {active && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-slate-900" />
                )}
              </Link>
            )
          })}

          {/* Sign out tab */}
          <button
            onClick={handleLogout}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-slate-400 tap-scale"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">Sign out</span>
          </button>
        </div>
      </nav>
    </>
  )
}

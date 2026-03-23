'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    LayoutDashboard, Calendar, Settings, Webhook, Bell, BarChart3,
    Users, ChevronLeft, ChevronRight, LogOut, Building2, Clock,
    CalendarX, Home, UserCog, Menu, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PushNotificationToggle from './PushNotificationToggle'

interface NavItem {
    icon: React.ReactNode
    label: string
    href: string
    group?: string
}

interface AdminSidebarProps {
    unitId?: string
    unitName?: string
}

export default function AdminSidebar({ unitId, unitName }: AdminSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    const closeMobileMenu = () => setMobileOpen(false)

    const handleLogout = async () => {
        closeMobileMenu()
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/admin/login')
    }

    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth > 768) {
                setMobileOpen(false)
            }
        }

        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    const baseItems: NavItem[] = [
        { icon: <LayoutDashboard size={18} />, label: 'Dashboard', href: '/admin/dashboard', group: 'Visão Geral' },
        { icon: <UserCog size={18} />, label: 'Usuários', href: '/admin/dashboard/usuarios', group: 'Visão Geral' },
    ]

    const unitItems: NavItem[] = unitId ? [
        { icon: <Calendar size={18} />, label: 'Reservas', href: `/admin/unidades/${unitId}/reservas`, group: 'Unidade' },
        { icon: <Home size={18} />, label: 'Painel Operacional', href: `/admin/unidades/${unitId}/painel`, group: 'Unidade' },
        { icon: <BarChart3 size={18} />, label: 'Relatórios', href: `/admin/unidades/${unitId}/relatorios`, group: 'Unidade' },
        { icon: <Clock size={18} />, label: 'Horários', href: `/admin/unidades/${unitId}/configuracoes/horarios`, group: 'Configurações' },
        { icon: <Settings size={18} />, label: 'Regras', href: `/admin/unidades/${unitId}/configuracoes/regras`, group: 'Configurações' },
        { icon: <CalendarX size={18} />, label: 'Bloqueios', href: `/admin/unidades/${unitId}/configuracoes/bloqueios`, group: 'Configurações' },
        { icon: <Building2 size={18} />, label: 'Ambientes', href: `/admin/unidades/${unitId}/configuracoes/ambientes`, group: 'Configurações' },
        { icon: <Webhook size={18} />, label: 'Webhooks', href: `/admin/unidades/${unitId}/webhooks`, group: 'Integrações' },
        { icon: <Bell size={18} />, label: 'Follow-ups', href: `/admin/unidades/${unitId}/followups`, group: 'Integrações' },
        { icon: <Users size={18} />, label: 'Usuários', href: `/admin/unidades/${unitId}/usuarios`, group: 'Integrações' },
    ] : []

    const allItems = [...baseItems, ...unitItems]

    // Group items
    const groups: Record<string, NavItem[]> = {}
    for (const item of allItems) {
        const g = item.group || 'Outros'
        if (!groups[g]) groups[g] = []
        groups[g].push(item)
    }

    return (
        <>
            <div className="admin-mobile-bar">
                <button
                    type="button"
                    className="admin-mobile-trigger"
                    onClick={() => setMobileOpen((open) => !open)}
                    aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
                >
                    {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                </button>

                <div style={{ minWidth: 0 }}>
                    <div className="admin-mobile-title">
                        {unitName || 'Full House Admin'}
                    </div>
                    <div className="admin-mobile-subtitle">
                        {unitId ? 'Menu da unidade' : 'Menu principal'}
                    </div>
                </div>
            </div>

            {mobileOpen && (
                <button
                    type="button"
                    className="admin-mobile-overlay"
                    aria-label="Fechar menu"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
                style={{ overflowX: 'hidden' }}
            >
                {/* Logo */}
                <div style={{
                    padding: '8px 4px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    overflow: 'hidden',
                }}>
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: [0, -2, 2, 0] }}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 10px rgba(244,121,32,.2)',
                            overflow: 'hidden',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            closeMobileMenu()
                            router.push('/admin/dashboard')
                        }}
                    >
                        <Image src="/fullhouse-logo.jpg" alt="Logo" width={36} height={36} style={{ objectFit: 'cover' }} />
                    </motion.div>
                    {!collapsed && (
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>Full House</div>
                            {unitName && (
                                <div style={{ fontSize: '11px', color: 'var(--brand-orange)', marginTop: '1px', fontWeight: 600 }}>{unitName}</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Nav groups */}
                {Object.entries(groups).map(([groupName, items]) => (
                    <div key={groupName}>
                        {!collapsed && (
                            <div className="sidebar-group-label">{groupName}</div>
                        )}
                        {items.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                                    title={collapsed ? item.label : undefined}
                                    onClick={closeMobileMenu}
                                >
                                    <span style={{ flexShrink: 0 }}>{item.icon}</span>
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            )
                        })}
                    </div>
                ))}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Bottom actions */}
                <div style={{ borderTop: '1px solid var(--brand-border)', paddingTop: '12px' }}>
                    <PushNotificationToggle collapsed={collapsed} />
                    <button
                        className="sidebar-item"
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}
                        onClick={handleLogout}
                        title={collapsed ? 'Sair' : undefined}
                    >
                        <LogOut size={18} />
                        {!collapsed && <span>Sair</span>}
                    </button>
                </div>

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(c => !c)}
                    className="admin-collapse-toggle"
                    style={{
                        position: 'absolute',
                        top: '24px',
                        right: '-12px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--brand-surface-3)',
                        border: '1px solid var(--brand-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                    }}
                >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                </button>
            </aside>

            {/* Content offset div */}
            <style>{`
        .admin-content { margin-left: ${collapsed ? '64px' : '240px'}; transition: margin-left 0.25s ease; }
      `}</style>
        </>
    )
}

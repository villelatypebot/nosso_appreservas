'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, Send } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

interface PushNotificationToggleProps {
    collapsed?: boolean
}

export default function PushNotificationToggle({ collapsed = false }: PushNotificationToggleProps) {
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
        if (typeof window === 'undefined') return 'default'
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
        return Notification.permission
    })
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(false)
    const [testLoading, setTestLoading] = useState(false)
    const [feedback, setFeedback] = useState<string | null>(null)

    useEffect(() => {
        if (permission === 'unsupported') return

        // Check if already subscribed
        navigator.serviceWorker.getRegistration().then(async (registration) => {
            if (!registration) return
            const subscription = await registration.pushManager.getSubscription()
            setIsSubscribed(!!subscription)
        }).catch((err) => {
            console.error('Push registration check error:', err)
        })
    }, [permission])

    const subscribe = async () => {
        setLoading(true)
        setFeedback(null)
        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register('/sw.js')
            await navigator.serviceWorker.ready

            // Request permission
            const perm = await Notification.requestPermission()
            setPermission(perm)

            if (perm !== 'granted') {
                setLoading(false)
                return
            }

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
                ),
            })

            // Send subscription to server
            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: subscription.toJSON() }),
            })

            if (res.ok) {
                setIsSubscribed(true)
                setFeedback('Notificações ativadas neste dispositivo.')
            } else {
                const data = await res.json().catch(() => null)
                setFeedback(data?.error || 'Não foi possível salvar a inscrição do push.')
            }
        } catch (err) {
            console.error('Push subscribe error:', err)
            setFeedback('Não foi possível ativar as notificações.')
        }
        setLoading(false)
    }

    const unsubscribe = async () => {
        setLoading(true)
        setFeedback(null)
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()

            if (subscription) {
                // Unsubscribe from push
                await subscription.unsubscribe()

                // Remove from server
                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                })
            }

            setIsSubscribed(false)
            setFeedback('Notificações desativadas neste dispositivo.')
        } catch (err) {
            console.error('Push unsubscribe error:', err)
            setFeedback('Não foi possível desativar as notificações.')
        }
        setLoading(false)
    }

    const testPush = async () => {
        setTestLoading(true)
        setFeedback(null)

        try {
            const response = await fetch('/api/push/test', { method: 'POST' })
            const data = await response.json()

            if (!response.ok) {
                setFeedback(data?.error || 'Falha ao disparar o teste de push.')
                return
            }

            if (data.sent > 0) {
                setFeedback(`Teste enviado para ${data.sent} dispositivo(s).`)
                return
            }

            if (data.reason === 'no_subscriptions') {
                setFeedback('Nenhum dispositivo inscrito para receber push.')
                return
            }

            if (data.reason === 'missing_vapid') {
                setFeedback('As chaves de push não estão configuradas no deploy.')
                return
            }

            setFeedback('O teste foi disparado, mas não houve entrega confirmada.')
        } catch (err) {
            console.error('Push test error:', err)
            setFeedback('Falha ao testar a notificação push.')
        } finally {
            setTestLoading(false)
        }
    }

    return (
        <div style={{ display: 'grid', gap: collapsed ? '0' : '8px' }}>
            <button
                className="sidebar-item"
                style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: loading ? 'wait' : permission === 'unsupported' ? 'not-allowed' : 'pointer',
                    color: permission === 'unsupported'
                        ? 'rgba(255,255,255,0.28)'
                        : isSubscribed ? 'var(--color-success)' : 'var(--text-muted)',
                    fontSize: '13px',
                    transition: 'color 0.2s',
                }}
                onClick={permission === 'unsupported' ? undefined : isSubscribed ? unsubscribe : subscribe}
                disabled={loading || permission === 'unsupported'}
                title={
                    permission === 'unsupported'
                        ? 'Este dispositivo ou navegador ainda não suporta notificações push.'
                        : isSubscribed ? 'Desativar notificações' : 'Ativar notificações'
                }
            >
                {loading ? (
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : isSubscribed ? (
                    <Bell size={18} />
                ) : (
                    <BellOff size={18} />
                )}
                <span>
                    {permission === 'unsupported'
                        ? 'Notificações indisponíveis'
                        : isSubscribed ? 'Notificações ON' : 'Notificações OFF'}
                </span>
            </button>

            {!collapsed && permission !== 'unsupported' && isSubscribed && (
                <button
                    className="sidebar-item"
                    type="button"
                    onClick={testPush}
                    disabled={testLoading}
                    style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--brand-border)',
                        cursor: testLoading ? 'wait' : 'pointer',
                        color: 'var(--brand-orange-light)',
                    }}
                >
                    {testLoading ? (
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                        <Send size={18} />
                    )}
                    <span>Testar push</span>
                </button>
            )}

            {!collapsed && feedback && (
                <p style={{
                    fontSize: '11px',
                    lineHeight: 1.5,
                    color: 'var(--text-muted)',
                    padding: '0 10px',
                }}>
                    {feedback}
                </p>
            )}
        </div>
    )
}

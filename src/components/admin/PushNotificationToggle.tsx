'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

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

export default function PushNotificationToggle() {
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
        if (typeof window === 'undefined') return 'default'
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
        return Notification.permission
    })
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (permission === 'unsupported') return

        // Check if already subscribed
        navigator.serviceWorker.ready.then(async (registration) => {
            const subscription = await registration.pushManager.getSubscription()
            setIsSubscribed(!!subscription)
        })
    }, [permission])

    const subscribe = async () => {
        setLoading(true)
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
            }
        } catch (err) {
            console.error('Push subscribe error:', err)
        }
        setLoading(false)
    }

    const unsubscribe = async () => {
        setLoading(true)
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
        } catch (err) {
            console.error('Push unsubscribe error:', err)
        }
        setLoading(false)
    }

    return (
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
    )
}

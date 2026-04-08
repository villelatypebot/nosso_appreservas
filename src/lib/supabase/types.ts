export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'no_show' | 'cancelled'

export interface Database {
    public: {
        Tables: {
            units: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    address: string | null
                    phone: string | null
                    image_url: string | null
                    is_active: boolean
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['units']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['units']['Insert']>
                Relationships: []
            }
            business_settings: {
                Row: {
                    id: string
                    brand_name: string
                    short_name: string
                    tagline: string | null
                    description: string | null
                    support_phone: string | null
                    support_email: string | null
                    whatsapp_phone: string | null
                    logo_url: string | null
                    primary_color: string
                    secondary_color: string
                    reservation_code_prefix: string
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['business_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['business_settings']['Insert']>
                Relationships: []
            }
            environments: {
                Row: {
                    id: string
                    unit_id: string
                    name: string
                    capacity?: number | null
                    max_capacity?: number | null
                    is_active: boolean
                }
                Insert: Omit<Database['public']['Tables']['environments']['Row'], 'id'>
                Update: Partial<Database['public']['Tables']['environments']['Insert']>
                Relationships: []
            }
            time_slots: {
                Row: {
                    id: string
                    unit_id: string
                    day_of_week: number
                    open_time: string
                    close_time: string
                    slot_interval_minutes: number
                    max_pax_per_slot: number
                    is_active: boolean
                }
                Insert: Omit<Database['public']['Tables']['time_slots']['Row'], 'id'>
                Update: Partial<Database['public']['Tables']['time_slots']['Insert']>
                Relationships: []
            }
            reservation_rules: {
                Row: {
                    id: string
                    unit_id: string
                    min_advance_hours: number
                    max_advance_days: number
                    tolerance_minutes: number
                    min_pax: number
                    max_pax: number
                    custom_fields: Json
                    cancellation_policy: string | null
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['reservation_rules']['Row'], 'id' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['reservation_rules']['Insert']>
                Relationships: []
            }
            date_blocks: {
                Row: {
                    id: string
                    unit_id: string
                    block_date: string
                    start_time: string | null
                    end_time: string | null
                    reason: string | null
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['date_blocks']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['date_blocks']['Insert']>
                Relationships: []
            }
            customers: {
                Row: {
                    id: string
                    name: string
                    email: string | null
                    phone: string
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['customers']['Insert']>
                Relationships: []
            }
            reservations: {
                Row: {
                    id: string
                    unit_id: string
                    environment_id: string | null
                    customer_id: string
                    reservation_date: string
                    reservation_time: string
                    pax: number
                    status: ReservationStatus
                    custom_data: Json
                    confirmation_code: string
                    notes: string | null
                    source: string
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['reservations']['Row'], 'id' | 'created_at' | 'updated_at' | 'confirmation_code'>
                Update: Partial<Database['public']['Tables']['reservations']['Insert']>
                Relationships: []
            }
            webhooks: {
                Row: {
                    id: string
                    unit_id: string
                    name: string
                    url: string
                    secret: string | null
                    events: string[]
                    is_active: boolean
                    last_status: number | null
                    last_triggered_at: string | null
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['webhooks']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['webhooks']['Insert']>
                Relationships: []
            }
            webhook_logs: {
                Row: {
                    id: string
                    webhook_id: string
                    reservation_id: string | null
                    event: string
                    payload: Json
                    response_status: number | null
                    response_body: string | null
                    triggered_at: string
                }
                Insert: Omit<Database['public']['Tables']['webhook_logs']['Row'], 'id' | 'triggered_at'>
                Update: never
                Relationships: []
            }
            follow_up_rules: {
                Row: {
                    id: string
                    unit_id: string
                    name: string
                    trigger_event: string
                    offset_minutes: number
                    channel: string
                    message_template: string
                    is_active: boolean
                }
                Insert: Omit<Database['public']['Tables']['follow_up_rules']['Row'], 'id'>
                Update: Partial<Database['public']['Tables']['follow_up_rules']['Insert']>
                Relationships: []
            }
            reminder_logs: {
                Row: {
                    id: string
                    reservation_id: string
                    rule_id: string
                    channel: string | null
                    status: string | null
                    sent_at: string
                }
                Insert: Omit<Database['public']['Tables']['reminder_logs']['Row'], 'id' | 'sent_at'>
                Update: never
                Relationships: []
            }
            push_subscriptions: {
                Row: {
                    id: string
                    admin_user_id: string | null
                    endpoint: string
                    p256dh: string
                    auth: string
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['push_subscriptions']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
                Relationships: []
            }
            admin_users: {
                Row: {
                    id: string
                    name: string
                    role: 'admin' | 'manager' | 'operator'
                    unit_ids: string[] | null
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'created_at'>
                Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
                Relationships: []
            }
        }
        Views: Record<string, never>
        Functions: Record<string, never>
        Enums: Record<string, never>
        CompositeTypes: Record<string, never>
    }
}

// Derived convenient types
export type Unit = Database['public']['Tables']['units']['Row']
export type BusinessSettings = Database['public']['Tables']['business_settings']['Row']
export type Environment = Database['public']['Tables']['environments']['Row']
export type TimeSlot = Database['public']['Tables']['time_slots']['Row']
export type ReservationRule = Database['public']['Tables']['reservation_rules']['Row']
export type DateBlock = Database['public']['Tables']['date_blocks']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Reservation = Database['public']['Tables']['reservations']['Row']
export type Webhook = Database['public']['Tables']['webhooks']['Row']
export type WebhookLog = Database['public']['Tables']['webhook_logs']['Row']
export type FollowUpRule = Database['public']['Tables']['follow_up_rules']['Row']
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row']
export type AdminUser = Database['public']['Tables']['admin_users']['Row']

export type ReservationWithDetails = Reservation & {
    units?: Unit
    environments?: Environment | null
    customers?: Customer
}

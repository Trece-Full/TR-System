import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)
// El usuario escribe "admin"; internamente Supabase Auth usa usuario@trsystem.local
export const emailDe = (u) => `${u.trim().toLowerCase()}@trsystem.local`
export const money = (n) => Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'})
export const fecha = (d) => d ? new Date(d).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'}) : '—'

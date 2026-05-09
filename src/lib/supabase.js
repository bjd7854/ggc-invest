import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('[Supabase] .env 파일에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 설정해주세요.')
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, autoRefreshToken: true }
})

export const formatKRW = (n) => (Number(n) || 0).toLocaleString('ko-KR') + '원'
export const changeRate = (cur, prev) => !prev ? 0 : ((cur - prev) / prev) * 100

export const fmtDateTime = (d) => {
  if (!d) return '-'
  const dt = new Date(d)
  return `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
}

export const fmtDate = (d) => {
  if (!d) return '-'
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}

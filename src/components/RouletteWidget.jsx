import { useState, useEffect } from 'react'
import { supabase, formatKRW } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function RouletteWidget() {
  const { profile, participantMoney, refreshParticipant } = useAuth()
  const [event, setEvent] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [highlightSlot, setHighlightSlot] = useState(null)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)

  const loadActive = async () => {
    const { data, error } = await supabase.rpc('get_active_roulette')
    if (error) {
      console.warn('룰렛 조회 실패:', error)
      setEvent(null)
      return
    }
    setEvent(data?.[0] || null)
  }

  useEffect(() => {
    loadActive()
    const interval = setInterval(loadActive, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!event) return
    const tick = () => {
      const ms = new Date(event.ends_at).getTime() - Date.now()
      if (ms <= 0) {
        setTimeLeft(0)
        setEvent(null)
      } else {
        setTimeLeft(Math.floor(ms / 1000))
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [event])

  if (!event) return null
  
  if (event.my_remaining_spins <= 0 && !result) {
    return (
      <div className="card p-4 bg-stone-50 border-stone-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">🎰 룰렛 이벤트</div>
            <div className="text-xs text-stone mt-1">참여 완료! (남은 시간 {formatTime(timeLeft)})</div>
          </div>
          <span className="text-xs px-2 py-1 bg-stone-100 rounded text-stone">참여 완료</span>
        </div>
      </div>
    )
  }

  const slots = [
    { num: 1, prize: event.prize_1 },
    { num: 2, prize: event.prize_2 },
    { num: 3, prize: event.prize_3 },
    { num: 4, prize: event.prize_4 }
  ]

  const spin = async () => {
    if (spinning) return
    setError('')
    setResult(null)
    
    if (event.entry_cost > 0 && participantMoney < event.entry_cost) {
      setError('잔액이 부족해요!')
      return
    }
    
    if (event.entry_cost > 0) {
      if (!confirm(`참여 비용 ${formatKRW(event.entry_cost)}원을 사용해서 룰렛을 돌릴까요?`)) return
    }
    
    setSpinning(true)
    
    try {
      const animationDuration = 3000
      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        if (elapsed >= animationDuration) return
        const progress = elapsed / animationDuration
        const speed = 50 + progress * progress * 300
        const slot = (Math.floor(elapsed / speed) % 4) + 1
        setHighlightSlot(slot)
        setTimeout(animate, speed)
      }
      animate()
      
      const spinPromise = supabase.rpc('spin_roulette', { p_event_id: event.id })
      
      const [spinResult] = await Promise.all([
        spinPromise,
        new Promise(r => setTimeout(r, animationDuration))
      ])
      
      const { data, error: rpcError } = spinResult
      if (rpcError) throw rpcError
      
      setHighlightSlot(data.result_slot)
      setResult(data)
      
      if (refreshParticipant) refreshParticipant()
      
      setTimeout(loadActive, 1500)
    } catch (e) {
      setError(e.message || '오류 발생')
    } finally {
      setSpinning(false)
    }
  }

  return (
    <div className="card p-4 sm:p-5 bg-gradient-to-br from-gold-50/70 to-amber-50/50 border-2 border-gold-500/40 shadow-gold">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-display text-base sm:text-lg">{event.title}</div>
          <div className="text-xs text-stone mt-1">
            남은 시간: {formatTime(timeLeft)} · 참여 가능: {event.my_remaining_spins}회
            {event.entry_cost > 0 && ` · 비용 ${formatKRW(event.entry_cost)}원`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {slots.map(slot => (
          <div
            key={slot.num}
            className={`
              py-3 px-2 rounded-lg text-center transition-all duration-150
              ${highlightSlot === slot.num
                ? 'bg-gold-500 text-white scale-110 shadow-lg'
                : 'bg-white border border-gold-500/30'
              }
            `}
          >
            <div className="text-[10px] opacity-70">{slot.num}번</div>
            <div className="num-display font-bold text-sm sm:text-base">
              {formatKRW(slot.prize)}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className={`
          w-full py-3 rounded-lg font-bold text-sm transition-all
          ${spinning
            ? 'bg-stone-200 text-stone cursor-not-allowed'
            : 'bg-gradient-to-r from-gold-500 to-amber-500 text-white hover:shadow-lg active:scale-95'
          }
        `}
      >
        {spinning ? '🎰 돌리는 중...' : '🎰 룰렛 돌리기'}
      </button>

      {result && (
        <div 
          className="mt-3 p-3 rounded-lg bg-gradient-to-r from-gold-500 to-amber-500 text-white text-center"
          style={{ animation: 'bounceIn 0.5s ease-out' }}
        >
          <div className="text-sm font-semibold">
            🎉 축하합니다! {result.result_slot}번 칸 당첨
          </div>
          <div className="num-display text-2xl font-bold mt-1">
            +{formatKRW(result.prize)}
          </div>
          {result.cost > 0 && (
            <div className="text-[11px] opacity-90 mt-1">
              참여비 {formatKRW(result.cost)} 차감 · 순이익 {result.net_gain >= 0 ? '+' : ''}{formatKRW(result.net_gain)}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-up bg-red-50 px-2 py-1 rounded">
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}

function formatTime(seconds) {
  if (seconds <= 0) return '종료'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}분 ${s.toString().padStart(2, '0')}초`
}

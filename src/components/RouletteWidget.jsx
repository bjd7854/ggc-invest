import { useState, useEffect } from 'react'
import { supabase, formatKRW } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function RouletteWidget() {
  const { profile, participantMoney, refreshParticipant } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [highlightSlot, setHighlightSlot] = useState(null)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [showResult, setShowResult] = useState(false)

  // 활성 룰렛 가져오기
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
    const interval = setInterval(loadActive, 15000)  // 15초마다 체크
    return () => clearInterval(interval)
  }, [])

  // 남은 시간 카운트다운
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
    
    if (event.entry_cost > 0 && participantMoney < event.entry_cost) {
      setError('잔액이 부족해요!')
      return
    }
    
    if (event.entry_cost > 0) {
      if (!confirm(`참여 비용 ${formatKRW(event.entry_cost)}원을 사용해서 룰렛을 돌릴까요?`)) return
    }
    
    setSpinning(true)
    setResult(null)
    setShowResult(false)
    
    try {
      // 시작 애니메이션 (각 칸 빠르게 하이라이트)
      const animationDuration = 3000
      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        if (elapsed >= animationDuration) return
        const progress = elapsed / animationDuration
        // 처음에는 빠르게, 끝으로 갈수록 느리게
        const speed = 50 + progress * progress * 300
        const slot = (Math.floor(elapsed / speed) % 4) + 1
        setHighlightSlot(slot)
        setTimeout(animate, speed)
      }
      animate()
      
      // 백엔드에 결과 받기
      const spinPromise = supabase.rpc('spin_roulette', { p_event_id: event.id })
      
      // 최소 3초 애니메이션 보장
      const [spinResult] = await Promise.all([
        spinPromise,
        new Promise(r => setTimeout(r, animationDuration))
      ])
      
      const { data, error: rpcError } = spinResult
      if (rpcError) throw rpcError
      
      // 결과 칸에 멈춤
      setHighlightSlot(data.result_slot)
      setResult(data)
      
      // 잠시 후 결과 모달
      setTimeout(() => setShowResult(true), 500)
      
      // 잔액 새로고침
      if (refreshParticipant) refreshParticipant()
      
      // 룰렛 정보 새로고침
      setTimeout(loadActive, 1500)
    } catch (e) {
      setError(e.message || '오류 발생')
    } finally {
      setSpinning(false)
    }
  }

  const closeResult = () => {
    setShowResult(false)
    setResult(null)
    setHighlightSlot(null)
  }

  return (
    <>
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

        {/* 4칸 룰렛 */}
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

        {error && (
          <div className="mt-2 text-xs text-up bg-red-50 px-2 py-1 rounded">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* 결과 모달 */}
      {showResult && result && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          onClick={closeResult}
        >
          <div 
            className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'bounceIn 0.5s ease-out' }}
          >
            <div className="text-6xl sm:text-7xl mb-3">
              {result.result_slot === 4 ? '🎉' : result.prize >= 100000 ? '✨' : '🎊'}
            </div>
            <div className="text-2xl sm:text-3xl font-display text-charcoal mb-2">
              축하합니다!
            </div>
            <div className="text-xs text-stone mb-3">
              {result.result_slot}번 칸 당첨!
            </div>
            <div className="num-display text-4xl sm:text-5xl font-bold text-gold-700 mb-4">
              +{formatKRW(result.prize)}원
            </div>
            {result.cost > 0 && (
              <div className="text-xs text-stone mb-3">
                (참여비 {formatKRW(result.cost)}원 차감, 순이익 {result.net_gain >= 0 ? '+' : ''}{formatKRW(result.net_gain)}원)
              </div>
            )}
            <div className="text-xs text-stone mb-5">
              잔액에 자동 추가되었어요
            </div>
            <button
              onClick={closeResult}
              className="btn-gold px-8 py-2 rounded-lg font-semibold text-sm"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function formatTime(seconds) {
  if (seconds <= 0) return '종료'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}분 ${s.toString().padStart(2, '0')}초`
}

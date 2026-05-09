import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * 학생 브라우저가 주기적으로 가격 변동을 트리거하는 훅
 * 
 * 작동 방식:
 * - 페이지 진입 시 즉시 1회 호출
 * - 이후 30초마다 호출
 * - 서버에서는 50초 락을 두어 중복 실행 방지 (여러 학생 동시 호출 안전)
 * - 백그라운드 탭에서는 멈춤 (배터리 절약)
 * 
 * 결과:
 * - 학생 1명만 접속해 있어도 가격 변동 작동
 * - pg_cron 의존성 없음
 * - 모든 학생이 Realtime 으로 같은 가격 보게 됨
 */
export function usePriceTick(enabled = true) {
  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      try {
        const { error } = await supabase.rpc('trigger_price_tick')
        if (error && !cancelled) {
          console.warn('[PriceTick]', error.message)
        }
      } catch (e) {
        // 네트워크 에러 등은 무시 (다음 30초에 재시도)
      }
    }

    // 즉시 1회 호출
    tick()

    // 30초마다 호출
    const interval = setInterval(tick, 30 * 1000)

    // 페이지가 다시 보일 때 즉시 호출 (탭 전환 후 돌아왔을 때)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [enabled])
}

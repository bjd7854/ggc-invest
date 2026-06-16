import { useEffect, useState } from 'react'
import { supabase, formatKRW } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// 종료된 대회의 최종 순위를 팝업으로 보여줌.
// 학생이 한 번 닫으면 그 대회 팝업은 다시 안 뜸(브라우저 기억).
export default function FinalRankingModal() {
  const { profile, currentTournamentId, currentTournament } = useAuth()
  const [rows, setRows] = useState([])
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!currentTournamentId || !currentTournament) return
    // 대회가 종료 상태일 때만
    if (currentTournament.status !== 'ended') return

    // 이미 이 대회 결과를 본 적 있으면 안 띄움
    const seenKey = `final_seen_${currentTournamentId}`
    let seen = false
    try { seen = sessionStorage.getItem(seenKey) === '1' } catch (e) {}
    if (seen) return

    supabase.rpc('get_final_ranking', { p_tournament_id: currentTournamentId })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return
        setRows(data)
        setShow(true)
      })
  }, [currentTournamentId, currentTournament])

  if (!show) return null

  const myRow = rows.find(r => r.user_id === profile?.id)

  const close = () => {
    try { sessionStorage.setItem(`final_seen_${currentTournamentId}`, '1') } catch (e) {}
    setShow(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
         onClick={close}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl"
           onClick={e => e.stopPropagation()}
           style={{ animation: 'bounceIn 0.5s ease-out' }}>
        {/* 헤더 */}
        <div className="text-center p-5 border-b border-gold-500/20">
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="font-display text-2xl text-charcoal">대회 종료!</h2>
          <p className="text-sm text-stone mt-1">{currentTournament?.name} 최종 순위</p>
        </div>

        {/* 내 순위 강조 */}
        {myRow && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-white text-center">
            <div className="text-xs opacity-90">내 최종 순위</div>
            <div className="text-2xl font-bold mt-0.5">
              {myRow.rank}등 · {formatKRW(myRow.total_assets)}
            </div>
          </div>
        )}

        {/* 전체 순위 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {rows.map(r => {
            const isMe = r.user_id === profile?.id
            const medal = r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank - 1] : null
            return (
              <div key={r.user_id}
                className={`flex items-center gap-2 p-2.5 rounded-lg ${
                  isMe ? 'bg-gold-50 border border-gold-500/30' : 'bg-stone-50/50'
                }`}>
                <div className="w-8 text-center font-semibold num-display">
                  {medal || r.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {r.name} {isMe && <span className="text-gold-700 text-xs">(나)</span>}
                  </div>
                  <div className="text-[11px] text-stone">{r.class_name}</div>
                </div>
                <div className="num-display font-bold text-sm text-gold-700">
                  {formatKRW(r.total_assets)}
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-gold-500/20">
          <button onClick={close} className="btn-gold w-full py-3 rounded-lg font-semibold">
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

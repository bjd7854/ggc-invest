import { useEffect, useState } from 'react'
import { supabase, formatKRW } from '../../lib/supabase'

export default function RankingAdmin() {
  const [tournaments, setTournaments] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // 대회 목록 로드
  useEffect(() => {
    supabase.from('tournaments')
      .select('id, name, status')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = data || []
        setTournaments(list)
        // 진행 중인 대회를 기본 선택
        const active = list.find(t => t.status === 'active')
        setSelectedId(active?.id || list[0]?.id || '')
      })
  }, [])

  // 선택한 대회의 순위 로드 (10초마다 자동 갱신)
  const loadRanking = (tid) => {
    if (!tid) return
    setLoading(true)
    supabase.from('tournament_ranking_view')
      .select('*')
      .eq('tournament_id', tid)
      .order('total_assets', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }

  useEffect(() => {
    if (!selectedId) return
    loadRanking(selectedId)
    const interval = setInterval(() => loadRanking(selectedId), 10000)
    return () => clearInterval(interval)
  }, [selectedId])

  const selectedTournament = tournaments.find(t => t.id === selectedId)
  const totalAssets = rows.reduce((sum, r) => sum + (r.total_assets || 0), 0)
  const avgAssets = rows.length ? Math.round(totalAssets / rows.length) : 0

  return (
    <div className="space-y-4">
      {/* 대회 선택 + 새로고침 */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="input-field flex-1 min-w-[200px]"
        >
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.status === 'active' ? '진행중' : t.status === 'upcoming' ? '예정' : '종료'})
            </option>
          ))}
        </select>
        <button
          onClick={() => loadRanking(selectedId)}
          className="px-3 py-2 rounded-lg bg-gold-50 hover:bg-gold-100 text-gold-700 text-sm font-semibold border border-gold-500/30 whitespace-nowrap"
        >
          🔄 새로고침
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <div className="text-[10px] text-stone uppercase">참가 학생</div>
          <div className="num-display text-lg font-bold">{rows.length}명</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-[10px] text-stone uppercase">평균 자산</div>
          <div className="num-display text-lg font-bold text-gold-700">{formatKRW(avgAssets)}</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-[10px] text-stone uppercase">1등 자산</div>
          <div className="num-display text-lg font-bold text-gold-700">
            {rows[0] ? formatKRW(rows[0].total_assets) : '-'}
          </div>
        </div>
      </div>

      {/* 순위 표 */}
      {loading && rows.length === 0 ? (
        <div className="card p-12 text-center text-stone">집계 중…</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center text-stone">
          <div className="text-4xl mb-2">📊</div>
          참가한 학생이 없습니다
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between p-3 border-b border-gold-500/15">
            <span className="font-display text-sm">
              {selectedTournament?.name} 실시간 순위
            </span>
            <span className="badge-live text-[9px]">10초마다 갱신</span>
          </div>
          <div className="table-wrap">
            <table className="table-basic w-full">
              <thead>
                <tr>
                  <th className="w-12">#</th><th>학생</th><th>반</th>
                  <th className="text-right">현금</th>
                  <th className="text-right">주식</th>
                  <th className="text-right">총자산</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const medal = i < 3 ? ['🥇','🥈','🥉'][i] : null
                  return (
                    <tr key={r.user_id}>
                      <td>
                        <div className="flex items-center gap-1">
                          {medal && <span>{medal}</span>}
                          <span className="num-display font-semibold text-sm">{i + 1}</span>
                        </div>
                      </td>
                      <td className="font-semibold text-sm">{r.name}</td>
                      <td className="text-stone text-xs">{r.class_name}</td>
                      <td className="num-display text-right text-sm">{formatKRW(r.cash)}</td>
                      <td className="num-display text-right text-sm">{formatKRW(r.stock_value)}</td>
                      <td className="num-display text-right font-semibold text-gold-700 text-sm">{formatKRW(r.total_assets)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

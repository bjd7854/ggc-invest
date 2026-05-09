import { useEffect, useMemo, useState } from 'react'
import { supabase, formatKRW } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Character from '../components/Character'

export default function Ranking() {
  const { profile, currentTournamentId, currentTournament } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSchool, setFilterSchool] = useState('all')

  useEffect(() => {
    if (!currentTournamentId) return
    supabase.from('tournament_ranking_view').select('*')
      .eq('tournament_id', currentTournamentId)
      .order('total_assets', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [currentTournamentId])

  const schools = useMemo(() => ['all', ...new Set(rows.map(r => r.school))], [rows])
  const filtered = filterSchool === 'all' ? rows : rows.filter(r => r.school === filterSchool)
  const top1 = filtered[0]

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase">Leaderboard</div>
        <h1 className="font-display text-3xl sm:text-4xl mt-2">실시간 순위표</h1>
        <p className="text-stone text-xs sm:text-sm mt-2">{currentTournament?.name} · 총자산 = 현금 + 주식 평가액</p>
      </div>

      {top1 && (
        <div className="card p-4 sm:p-6 bg-gradient-to-br from-gold-50 to-white border-gold-500/40 flex items-center gap-4 sm:gap-6">
          <Character name="heart" size="lg" className="sm:hidden shrink-0" />
          <Character name="heart" size="xl" className="hidden sm:block shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs tracking-[0.3em] text-gold-600 uppercase mb-1">🥇 1등 축하해요!</div>
            <div className="font-display text-2xl sm:text-3xl text-gold-700 truncate">{top1.name}</div>
            <div className="text-xs sm:text-sm text-stone mt-1">{top1.school} · {top1.class_name}반</div>
            <div className="num-display text-xl sm:text-2xl font-semibold text-gold-700 mt-2">{formatKRW(top1.total_assets)}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {schools.map(s => (
          <button key={s} onClick={() => setFilterSchool(s)}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm border transition ${
                    filterSchool === s
                      ? 'border-gold-500 bg-gold-50 text-gold-700 font-semibold'
                      : 'border-gold-500/20 text-stone hover:border-gold-500/50'
                  }`}>
            {s === 'all' ? '전체' : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-12 text-center text-stone">집계 중…</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table-basic w-full">
              <thead>
                <tr>
                  <th className="w-12">#</th><th>학생</th><th>학교</th><th>반</th>
                  <th className="text-right">현금</th><th className="text-right">주식</th><th className="text-right">총자산</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const isMe = r.user_id === profile?.id
                  const medal = i < 3 ? ['🥇','🥈','🥉'][i] : null
                  return (
                    <tr key={r.user_id} className={isMe ? 'bg-gold-50/40' : ''}>
                      <td>
                        <div className="flex items-center gap-1">
                          {medal && <span>{medal}</span>}
                          <span className="num-display font-semibold text-sm">{i + 1}</span>
                        </div>
                      </td>
                      <td className="font-semibold text-sm">
                        {r.name}
                        {isMe && <span className="ml-2 text-[9px] bg-gold-500 text-white px-1.5 py-0.5 rounded tracking-wider">ME</span>}
                      </td>
                      <td className="text-stone text-xs">{r.school}</td>
                      <td className="text-stone text-xs">{r.class_name}</td>
                      <td className="num-display text-right text-sm">{formatKRW(r.cash)}</td>
                      <td className="num-display text-right text-sm">{formatKRW(r.stock_value)}</td>
                      <td className="num-display text-right font-semibold text-gold-700 text-sm">{formatKRW(r.total_assets)}</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan="7" className="text-center p-10 text-stone">표시할 학생이 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

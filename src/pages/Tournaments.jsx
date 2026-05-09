import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, fmtDateTime, formatKRW } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Character from '../components/Character'

export default function Tournaments() {
  const { profile, setTournament, isAdmin } = useAuth()
  const nav = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [myParticipations, setMyParticipations] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  const load = async () => {
    const [tRes, pRes] = await Promise.all([
      supabase.from('tournaments').select('*')
        .in('status', ['upcoming', 'active'])
        .order('start_at', { ascending: true }),
      supabase.from('tournament_participants').select('*').eq('user_id', profile.id)
    ])
    setTournaments(tRes.data || [])
    setMyParticipations(Object.fromEntries((pRes.data || []).map(p => [p.tournament_id, p])))
    setLoading(false)
  }
  useEffect(() => { if (profile) load() }, [profile])

  const enter = async (t) => {
    setBusy(t.id)
    try {
      if (!myParticipations[t.id]) {
        const { error } = await supabase.rpc('join_tournament', { p_tournament_id: t.id })
        if (error) throw error
      }
      setTournament(t.id)
      nav('/')
    } catch (e) {
      alert(e.message || '참가에 실패했습니다')
    } finally { setBusy(null) }
  }

  const activeOnes = tournaments.filter(t => t.status === 'active')
  const upcomingOnes = tournaments.filter(t => t.status === 'upcoming')

  return (
    <div className="space-y-10">
      <div className="text-center">
        <Character name="greet" size="xl" className="mx-auto mb-4" float />
        <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase">Choose Your Tournament</div>
        <h1 className="font-display text-4xl text-ink mt-2">참가할 대회를 골라주세요!</h1>
        <p className="text-stone text-sm mt-2">유경심이가 도와드릴게요 ✨</p>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-stone">불러오는 중…</div>
      ) : tournaments.length === 0 ? (
        <div className="card p-12 text-center space-y-4">
          <Character name="confused" size="lg" className="mx-auto" />
          <p className="text-lg font-semibold">아직 열린 대회가 없어요</p>
          <p className="text-sm text-stone">
            {isAdmin ? '관리자 페이지에서 대회를 만들어주세요' : '선생님이 대회를 열 때까지 기다려주세요'}
          </p>
          {isAdmin && (
            <button onClick={() => nav('/admin')} className="btn-gold px-6 py-2 rounded">
              관리자 페이지로
            </button>
          )}
        </div>
      ) : (
        <>
          {activeOnes.length > 0 && (
            <section>
              <h2 className="font-display text-2xl mb-4 flex items-center gap-3">
                <span className="badge-live">LIVE</span> 진행 중
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeOnes.map(t => (
                  <TournamentCard key={t.id} t={t} participant={myParticipations[t.id]}
                                  onEnter={() => enter(t)} busy={busy === t.id} />
                ))}
              </div>
            </section>
          )}

          {upcomingOnes.length > 0 && (
            <section>
              <h2 className="font-display text-2xl mb-4 text-stone">시작 예정</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingOnes.map(t => (
                  <TournamentCard key={t.id} t={t} participant={myParticipations[t.id]}
                                  onEnter={() => enter(t)} busy={busy === t.id} upcoming />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function TournamentCard({ t, participant, onEnter, busy, upcoming }) {
  const joined = !!participant
  const typeLabel = t.type === 'short' ? '⏰ 하루 대회' : '📅 한달 대회'

  return (
    <div className={`card p-6 ${upcoming ? 'opacity-70' : 'hover:shadow-gold transition-shadow'}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs bg-gold-50 text-gold-700 px-3 py-1 rounded-full tracking-wider">
          {typeLabel}
        </span>
        {joined && (
          <span className="text-xs bg-gold-500 text-white px-2 py-1 rounded tracking-wider uppercase">참가 중</span>
        )}
      </div>

      <h3 className="font-display text-xl text-ink mb-1">{t.name}</h3>
      {t.description && <p className="text-sm text-stone mb-4">{t.description}</p>}

      <div className="gold-rule-solid my-3"></div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-stone">시작</span>
          <span className="num-display">{fmtDateTime(t.start_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone">종료</span>
          <span className="num-display">{fmtDateTime(t.end_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone">초기 자금</span>
          <span className="num-display font-semibold text-gold-700">{formatKRW(t.initial_money)}</span>
        </div>
        {joined && (
          <div className="flex justify-between">
            <span className="text-stone">내 현금</span>
            <span className="num-display font-semibold">{formatKRW(participant.virtual_money)}</span>
          </div>
        )}
      </div>

      <button onClick={onEnter} disabled={busy || upcoming}
              className={`w-full mt-5 py-2.5 rounded ${
                upcoming ? 'btn-ghost border border-stone/20 cursor-not-allowed' : 'btn-gold'
              }`}>
        {busy ? '처리 중…' : upcoming ? '시작 대기중' : joined ? '이어하기 →' : '참가하기 →'}
      </button>
    </div>
  )
}

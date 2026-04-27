import { useEffect, useState } from 'react'
import { supabase, formatKRW } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Character from '../components/Character'

export default function Quiz() {
  const { profile, currentTournamentId, refreshParticipant } = useAuth()
  const [quizzes, setQuizzes] = useState([])
  const [attempts, setAttempts] = useState({})
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)

  const load = async () => {
    const [q, a] = await Promise.all([
      supabase.from('quizzes').select('*').eq('is_active', true).order('week_number', { ascending: false }),
      supabase.from('quiz_attempts').select('*').eq('user_id', profile.id).eq('tournament_id', currentTournamentId)
    ])
    setQuizzes(q.data || [])
    setAttempts(Object.fromEntries((a.data || []).map(x => [x.quiz_id, x])))
    setLoading(false)
  }
  useEffect(() => { if (profile && currentTournamentId) load() }, [profile, currentTournamentId])

  const byWeek = quizzes.reduce((acc, q) => { (acc[q.week_number] ||= []).push(q); return acc }, {})

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase">Weekly Challenge</div>
        <h1 className="font-display text-3xl sm:text-4xl mt-2">투자 퀴즈</h1>
        <p className="text-stone text-sm mt-2">정답을 맞추면 가상머니 보상이 지급됩니다 ✨</p>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-stone">불러오는 중…</div>
      ) : Object.keys(byWeek).length === 0 ? (
        <div className="card p-12 text-center">
          <Character name="confused" size="lg" className="mx-auto mb-3" />
          <p className="text-stone">아직 등록된 퀴즈가 없습니다.</p>
        </div>
      ) : (
        Object.entries(byWeek).sort((a,b) => b[0]-a[0]).map(([week, qs]) => (
          <section key={week}>
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="font-display text-xl sm:text-2xl">{week}주차</h2>
              <span className="text-xs text-stone">{qs.length}문항</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {qs.map(q => {
                const att = attempts[q.id]
                return (
                  <div key={q.id} onClick={() => !att && setActive(q)}
                       className={`card p-4 sm:p-5 transition ${att ? 'opacity-80' : 'cursor-pointer hover:shadow-gold'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold leading-relaxed flex-1 text-sm sm:text-base">{q.question}</p>
                      {att ? (
                        <span className={`text-[10px] px-2 py-1 rounded tracking-wider uppercase whitespace-nowrap ${
                          att.is_correct ? 'bg-gold-100 text-gold-700' : 'bg-stone-100 text-stone'
                        }`}>
                          {att.is_correct ? `+${formatKRW(att.reward_earned)}` : '오답'}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-gold-50 text-gold-700 px-2 py-1 rounded tracking-wider uppercase whitespace-nowrap">
                          +{formatKRW(q.reward)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      {active && (
        <QuizModal quiz={active} tournamentId={currentTournamentId}
          onClose={() => setActive(null)}
          onDone={() => { setActive(null); load(); refreshParticipant() }} />
      )}
    </div>
  )
}

function QuizModal({ quiz, tournamentId, onClose, onDone }) {
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!selected) return
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('submit_quiz', {
        p_tournament_id: tournamentId, p_quiz_id: quiz.id, p_answer: selected
      })
      if (error) throw error
      setResult(data)
    } catch (e) { alert(e.message) } finally { setBusy(false) }
  }

  const options = [quiz.option1, quiz.option2, quiz.option3, quiz.option4]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell wide fade-up" onClick={e => e.stopPropagation()}>
        {!result ? (
          <>
            <div className="modal-header">
              <div>
                <div className="text-xs tracking-[0.3em] text-gold-600 uppercase">{quiz.week_number}주차 퀴즈</div>
                <h3 className="font-display text-lg sm:text-xl mt-1">문제</h3>
              </div>
              <button onClick={onClose} className="btn-ghost px-2 py-0.5 rounded text-2xl leading-none">×</button>
            </div>
            <div className="modal-body space-y-4">
              <p className="font-display text-lg leading-relaxed">{quiz.question}</p>
              <div className="space-y-2">
                {options.map((op, i) => {
                  const val = i + 1
                  return (
                    <label key={val}
                           className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition ${
                             selected === val ? 'border-gold-500 bg-gold-50' : 'border-gold-500/20 hover:border-gold-500/50'
                           }`}>
                      <input type="radio" name="opt" checked={selected === val}
                             onChange={() => setSelected(val)} className="accent-gold-600" />
                      <span className="text-sm">{op}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={onClose} className="btn-ghost flex-1 py-3 rounded border border-gold-500/20">취소</button>
              <button onClick={submit} disabled={!selected || busy} className="btn-gold flex-1 py-3 rounded">
                {busy ? '제출 중…' : '제출하기'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              <div className="text-center py-4 bounce-in">
                <Character name={result.is_correct ? 'wave' : 'confused'} size="2xl" className="mx-auto mb-3" />
                <div className={`font-display text-4xl sm:text-5xl ${result.is_correct ? 'text-gold-700' : 'text-stone'}`}>
                  {result.is_correct ? '정답!' : '오답'}
                </div>
                {result.is_correct && (
                  <div className="num-display mt-3 text-lg text-gold-700 font-semibold">+ {formatKRW(result.reward)} 획득!</div>
                )}
              </div>
              {result.explanation && (
                <div className="bg-gold-50 border border-gold-500/20 rounded p-4 my-4">
                  <div className="text-xs tracking-wider text-gold-700 uppercase mb-2">해설</div>
                  <p className="text-sm leading-relaxed">{result.explanation}</p>
                </div>
              )}
              {!result.is_correct && (
                <p className="text-sm text-stone text-center mb-2">정답: {result.correct_answer}번</p>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={onDone} className="btn-gold w-full py-3 rounded">확인</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import NumberInput from '../../components/NumberInput'

export default function QuizEdit() {
  const { quizId } = useParams()
  const nav = useNavigate()
  const isNew = !quizId

  const [week, setWeek] = useState(1)
  const [question, setQuestion] = useState('')
  const [opt1, setOpt1] = useState('')
  const [opt2, setOpt2] = useState('')
  const [opt3, setOpt3] = useState('')
  const [opt4, setOpt4] = useState('')
  const [correct, setCorrect] = useState(1)
  const [reward, setReward] = useState(50000)
  const [explanation, setExplanation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    if (!quizId) return
    supabase.from('quizzes').select('*').eq('id', quizId).single()
      .then(({ data }) => {
        if (data) {
          setWeek(data.week_number || 1)
          setQuestion(data.question || '')
          setOpt1(data.option1 || '')
          setOpt2(data.option2 || '')
          setOpt3(data.option3 || '')
          setOpt4(data.option4 || '')
          setCorrect(data.correct_answer || 1)
          setReward(data.reward || 50000)
          setExplanation(data.explanation || '')
        }
        setLoading(false)
      })
  }, [quizId])

  const save = async () => {
    setError('')

    if (!question.trim()) {
      setError('문제 내용을 입력해주세요')
      return
    }
    if (!opt1.trim() || !opt2.trim() || !opt3.trim() || !opt4.trim()) {
      setError('4개 선택지를 모두 입력해주세요')
      return
    }
    if (correct < 1 || correct > 4) {
      setError('정답은 1~4번 중에서 선택해주세요')
      return
    }

    setBusy(true)
    try {
      const payload = {
        week_number: Number(week) || 1,
        question,
        option1: opt1,
        option2: opt2,
        option3: opt3,
        option4: opt4,
        correct_answer: Number(correct),
        reward: Number(reward) || 50000,
        explanation: explanation || '',
        is_active: true
      }

      const r = quizId
        ? await supabase.from('quizzes').update(payload).eq('id', quizId)
        : await supabase.from('quizzes').insert(payload)

      if (r.error) throw r.error

      alert('✅ 저장되었습니다!')
      nav('/admin')
    } catch (e) {
      setError(e.message || '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="card p-12 text-center text-stone">불러오는 중…</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/admin')} className="btn-ghost px-3 py-1.5 rounded">← 뒤로</button>
        <div>
          <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase">Quiz Editor</div>
          <h1 className="font-display text-3xl sm:text-4xl mt-1">
            {isNew ? '📝 퀴즈 추가' : '📝 퀴즈 수정'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="card p-4 bg-red-50 border-red-200 text-up font-semibold">
          ⚠️ {error}
        </div>
      )}

      <div className="card p-6 space-y-5">
        <h3 className="font-display text-lg">📌 기본 정보</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2">주차</label>
            <input
              type="number"
              min="1"
              value={week}
              onChange={e => setWeek(e.target.value)}
              className="input-field num-display"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2">정답 (1~4)</label>
            <input
              type="number"
              min="1"
              max="4"
              value={correct}
              onChange={e => setCorrect(e.target.value)}
              className="input-field num-display"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2">보상 (원)</label>
            <NumberInput
              value={reward}
              onChange={(v) => setReward(v)}
              suffix={true}
            />
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <h3 className="font-display text-lg">❓ 문제</h3>

        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">
            문제 내용 <span className="text-up">*</span>
          </label>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="input-field"
            rows="3"
            placeholder="예: 주식투자에서 '분산투자'가 중요한 이유는?"
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              Number(correct) === 1 ? 'bg-gold-500 text-white' : 'bg-stone-100 text-stone'
            }`}>1</span>
            <input
              value={opt1}
              onChange={e => setOpt1(e.target.value)}
              className="input-field flex-1"
              placeholder="1번 선택지"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              Number(correct) === 2 ? 'bg-gold-500 text-white' : 'bg-stone-100 text-stone'
            }`}>2</span>
            <input
              value={opt2}
              onChange={e => setOpt2(e.target.value)}
              className="input-field flex-1"
              placeholder="2번 선택지"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              Number(correct) === 3 ? 'bg-gold-500 text-white' : 'bg-stone-100 text-stone'
            }`}>3</span>
            <input
              value={opt3}
              onChange={e => setOpt3(e.target.value)}
              className="input-field flex-1"
              placeholder="3번 선택지"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              Number(correct) === 4 ? 'bg-gold-500 text-white' : 'bg-stone-100 text-stone'
            }`}>4</span>
            <input
              value={opt4}
              onChange={e => setOpt4(e.target.value)}
              className="input-field flex-1"
              placeholder="4번 선택지"
            />
          </div>
        </div>

        <p className="text-xs text-stone">
          💡 "정답" 번호를 바꾸면 위에서 금색으로 표시되는 선택지가 바뀝니다
        </p>
      </div>

      <div className="card p-6 space-y-4">
        <h3 className="font-display text-lg">💡 해설 (선택)</h3>
        <textarea
          value={explanation}
          onChange={e => setExplanation(e.target.value)}
          className="input-field"
          rows="3"
          placeholder="학생이 정답을 맞추거나 틀렸을 때 보여줄 해설을 작성하세요"
        />
      </div>

      <div className="flex gap-3 sticky bottom-4 bg-ivory/90 backdrop-blur-sm p-3 rounded-lg border border-gold-500/20">
        <button
          onClick={() => nav('/admin')}
          className="btn-ghost flex-1 py-3 rounded border border-gold-500/20"
        >
          취소
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="btn-gold flex-[2] py-3 rounded text-base"
        >
          {busy ? '저장 중…' : '💾 저장'}
        </button>
      </div>
    </div>
  )
}

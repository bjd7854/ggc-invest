import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Character from '../components/Character'

export default function Login() {
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn({ email, password })
      nav('/tournaments')
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full fade-up">
        <div className="text-center mb-8">
          <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase mb-3">광주여상 모의투자 퀴즈대회</div>

          <div className="flex justify-center my-6">
            <Character name="main" size="2xl" float />
          </div>

          <h1 className="font-display text-3xl text-ink">로그인</h1>
          <div className="gold-rule w-32 mx-auto mt-5"></div>
        </div>

        <form onSubmit={onSubmit} className="card p-8 space-y-5">
          <div>
            <label className="block text-xs tracking-wider text-stone mb-2 uppercase">이메일</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                   className="input-field" placeholder="example@naver.com" />
          </div>
          <div>
            <label className="block text-xs tracking-wider text-stone mb-2 uppercase">비밀번호</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                   className="input-field" placeholder="••••••••" />
          </div>

          {error && <div className="text-sm text-up bg-red-50/60 border border-red-200 px-3 py-2 rounded">{error}</div>}

          <button type="submit" disabled={loading} className="btn-gold w-full py-3 rounded">
            {loading ? '확인 중…' : '로그인'}
          </button>

          <div className="text-center text-sm text-stone pt-2">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="text-gold-700 font-semibold hover:underline">회원가입</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

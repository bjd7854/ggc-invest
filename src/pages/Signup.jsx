import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ⭐ 학교 목록 - 여기만 수정해서 추가/제거 가능
const SCHOOLS = {
  '광주광역시': [
    '각화중학교','고려중학교','고실중학교','광덕중학교','광산중학교',
    '광주경신중학교','광주동명중학교','광주동성여자중학교','광주동성중학교',
    '광주동신여자중학교','광주동신중학교','광주무진중학교','광주북성중학교',
    '광주서광중학교','광주서석중학교','광주송원중학교','광주수피아여자중학교',
    '광주숭일중학교','광주예술중학교','광주중학교','광주진흥중학교',
    '광주체육중학교','광주충장중학교','광주화정중학교','광주효광중학교',
    '금구중학교','금당중학교','금호중앙중학교','금호중학교',
    '대성여자중학교','대자중학교','대촌중학교','동아여자중학교','두암중학교',
    '무등중학교','문산중학교','문성중학교','문화중학교','문흥중학교',
    '산정중학교','살레시오여자중학교','살레시오중학교','상무중학교','상일중학교',
    '서강중학교','선운중학교','성덕중학교','송광중학교','송정중학교',
    '수완중학교','수완하나중학교','숭의중학교',
    '신가중학교','신광중학교','신용중학교','신창중학교',
    '양산중학교','영천중학교','용두중학교','용봉중학교','우산중학교',
    '운남중학교','운리중학교','운림중학교','운암중학교',
    '월계중학교','월곡중학교','월봉중학교','유덕중학교',
    '일곡중학교','일동중학교','일신중학교','임곡중학교',
    '장덕중학교','전남대학교 사범대학 부설중학교','전남중학교','정광중학교',
    '조선대학교 부속중학교','조선대학교 여자중학교','주월중학교','지산중학교','진남중학교'
  ],
  '나주시': [
    '나주중학교','나주여자중학교','빛가람중학교','영산중학교','영산포중학교',
    '노안중학교','세지중학교','남평중학교','공산중학교','다시중학교',
    '반남중학교','왕곡중학교','금천중학교','산포중학교','동수중학교','봉황중학교'
  ],
  '화순군': [
    '화순중학교','화순제일중학교','능주중학교','이양중학교','동복중학교',
    '북면중학교','도곡중학교','춘양중학교','청풍중학교','한천중학교'
  ],
  '담양군': [
    '담양중학교','담양여자중학교','창평중학교','대전중학교','금성중학교',
    '용면중학교','수북중학교','무정중학교','월산중학교','고서중학교','대덕중학교'
  ]
}

export default function Signup() {
  const { signUp } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({
    email: '', password: '', confirm: '',
    name: '', grade: '', classNum: '', number: '',
    contact: '', school: '', customSchool: ''
  })
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const finalSchool = form.school === '__other__' ? form.customSchool : form.school

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!agreed) return setError('개인정보 수집·이용에 동의해주세요')
    if (form.password.length < 6) return setError('비밀번호는 6자 이상이어야 합니다')
    if (form.password !== form.confirm) return setError('비밀번호가 일치하지 않습니다')
    if (!finalSchool) return setError('학교를 선택해주세요')

    setLoading(true)
    try {
      await signUp({
        email: form.email,
        password: form.password,
        name: form.name,
        studentNumber: form.number,
        className: `${form.grade}-${form.classNum}`,
        contact: form.contact,
        school: finalSchool
      })
      nav('/tournaments')
    } catch (err) {
      setError(err.message || '회원가입에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full fade-up">
        <div className="text-center mb-8">
          <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase mb-2">2026 Invention Contest</div>
          <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">
            광주여상 발명<br/>모의 투자 대회
          </h1>
          <div className="gold-rule w-32 mx-auto mt-5"></div>
          <p className="text-sm text-stone mt-5">학생 회원가입</p>
        </div>

        <form onSubmit={onSubmit} className="card p-8 space-y-5">
          <Field label="이름">
            <input value={form.name} onChange={onChange('name')} required className="input-field" placeholder="홍길동" />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="학년">
              <input value={form.grade} onChange={onChange('grade')} required className="input-field" placeholder="2" />
            </Field>
            <Field label="반">
              <input value={form.classNum} onChange={onChange('classNum')} required className="input-field" placeholder="5" />
            </Field>
            <Field label="번호">
              <input value={form.number} onChange={onChange('number')} required className="input-field" placeholder="13" />
            </Field>
          </div>

          <Field label="학교">
            <select value={form.school} onChange={onChange('school')} required className="input-field">
              <option value="">-- 학교를 선택해주세요 --</option>
              {Object.entries(SCHOOLS).map(([region, schools]) => (
                <optgroup key={region} label={region}>
                  {schools.map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
              ))}
              <option value="__other__">기타 (직접 입력)</option>
            </select>
            {form.school === '__other__' && (
              <input value={form.customSchool} onChange={onChange('customSchool')} required
                     placeholder="학교 이름을 정확히 입력해주세요"
                     className="input-field mt-2" />
            )}
          </Field>

          <Field label="연락처">
            <input value={form.contact} onChange={onChange('contact')} className="input-field" placeholder="010-1234-5678" />
          </Field>

          <div className="gold-rule-solid my-2"></div>

          <Field label="이메일">
            <input type="email" value={form.email} onChange={onChange('email')} required className="input-field" placeholder="example@naver.com" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="비밀번호">
              <input type="password" value={form.password} onChange={onChange('password')} required className="input-field" placeholder="6자 이상" />
            </Field>
            <Field label="비밀번호 확인">
              <input type="password" value={form.confirm} onChange={onChange('confirm')} required className="input-field" />
            </Field>
          </div>

          <div className="bg-gold-50/60 border border-gold-500/20 rounded p-4 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                     className="mt-1 accent-gold-600 w-4 h-4" />
              <div className="flex-1">
                <span className="text-sm font-semibold">
                  <span className="text-up">[필수]</span> 개인정보 수집·이용에 동의합니다
                </span>
                <button type="button" onClick={() => setShowTerms(!showTerms)}
                        className="ml-2 text-xs text-gold-700 underline">
                  {showTerms ? '접기' : '자세히 보기'}
                </button>
              </div>
            </label>
            {showTerms && (
              <div className="text-xs text-stone leading-relaxed pl-6 pt-2 border-t border-gold-500/15">
                <p className="font-semibold text-charcoal mb-1">수집 항목</p>
                <p className="mb-2">이름, 학년·반·번호, 연락처, 이메일, 학교</p>
                <p className="font-semibold text-charcoal mb-1">수집 목적</p>
                <p className="mb-2">모의투자 대회 참가자 식별, 순위 산정, 대회 운영 및 수상자 안내</p>
                <p className="font-semibold text-charcoal mb-1">보유 기간</p>
                <p className="mb-2">대회 종료 후 3개월 이내 파기</p>
                <p className="italic">동의를 거부할 권리가 있으나, 거부 시 대회 참가가 제한됩니다.</p>
              </div>
            )}
          </div>

          {error && <div className="text-sm text-up bg-red-50/60 border border-red-200 px-3 py-2 rounded">{error}</div>}

          <button type="submit" disabled={loading} className="btn-gold w-full py-3 rounded">
            {loading ? '가입 중…' : '가입하고 대회 참가하기'}
          </button>

          <div className="text-center text-sm text-stone pt-2">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-gold-700 font-semibold hover:underline">로그인</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs tracking-wider text-stone mb-2 uppercase">{label}</label>
      {children}
    </div>
  )
}

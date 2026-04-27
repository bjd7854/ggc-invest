import { useState, useEffect } from 'react'

/**
 * 천 단위 콤마가 자동으로 들어가는 숫자 입력 필드
 * 사용자는 콤마 있는 숫자를 보고, 내부적으로는 number 값으로 저장
 * 
 * @param {number} value - 현재 값 (숫자)
 * @param {function} onChange - 값 변경 콜백 (number 인자)
 * @param {string} className - 추가 CSS 클래스
 * @param {string} placeholder
 * @param {boolean} suffix - 끝에 "원" 표시 여부
 */
export default function NumberInput({ 
  value, 
  onChange, 
  className = '', 
  placeholder, 
  suffix = false,
  ...rest 
}) {
  const [display, setDisplay] = useState('')

  // 외부 value 변경 시 화면도 업데이트
  useEffect(() => {
    if (value === undefined || value === null || value === '') {
      setDisplay('')
    } else {
      const num = Number(value)
      if (!isNaN(num)) {
        setDisplay(num.toLocaleString('ko-KR'))
      }
    }
  }, [value])

  const handleChange = (e) => {
    const raw = e.target.value
    // 숫자와 콤마만 허용, 콤마 제거 후 숫자만 추출
    const numericOnly = raw.replace(/[^\d-]/g, '')
    
    if (numericOnly === '' || numericOnly === '-') {
      setDisplay(numericOnly)
      onChange?.(numericOnly === '' ? '' : 0)
      return
    }

    const num = Number(numericOnly)
    if (!isNaN(num)) {
      setDisplay(num.toLocaleString('ko-KR'))
      onChange?.(num)
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className={`input-field num-display ${suffix ? 'pr-10' : ''} ${className}`}
        {...rest}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone text-sm pointer-events-none">
          원
        </span>
      )}
    </div>
  )
}

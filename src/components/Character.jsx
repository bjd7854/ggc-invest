/**
 * 유경심 캐릭터 표시 컴포넌트
 * 사용 예: <Character name="greet" size="lg" />
 */
const SIZES = {
  xs: 'w-12 h-12',
  sm: 'w-20 h-20',
  md: 'w-28 h-28',
  lg: 'w-36 h-36',
  xl: 'w-48 h-48',
  '2xl': 'w-64 h-64',
}

const NAMES = {
  main: '유경심',
  greet: '유경심이 인사해요',
  wave: '유경심',
  money: '유경심이 좋아해요',
  calculator: '유경심이 계산 중',
  heart: '유경심',
  sad: '유경심',
  confused: '유경심',
  face: '유경심',
  back: '유경심', side: '유경심', run: '유경심',
  surprised: '유경심', wink: '유경심', point: '유경심',
  peace: '유경심', bashful: '유경심',
}

export default function Character({ name = 'main', size = 'md', className = '', float = false }) {
  const sizeClass = SIZES[size] || SIZES.md
  const animClass = float ? 'animate-float' : ''
  return (
    <img
      src={`/kyungsim/${name}.png`}
      alt={NAMES[name] || '유경심 캐릭터'}
      className={`${sizeClass} object-contain ${animClass} ${className}`}
      draggable={false}
    />
  )
}

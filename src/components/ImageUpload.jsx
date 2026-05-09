import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function ImageUpload({ value, onChange, bucket = 'quiz-images', label = '사진 추가 (선택)' }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          let width = img.width
          let height = img.height
          const MAX = 1600
          
          if (width > MAX || height > MAX) {
            if (width > height) {
              height = Math.round(height * MAX / width)
              width = MAX
            } else {
              width = Math.round(width * MAX / height)
              height = MAX
            }
          }
          
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('압축 실패')),
            'image/jpeg',
            0.8
          )
        }
        img.onerror = reject
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const upload = async (file) => {
    setError('')
    
    if (file.size > 5 * 1024 * 1024) {
      setError('파일이 너무 커요 (최대 5MB)')
      return
    }
    
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다')
      return
    }
    
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const fileName = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressed, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)
      
      onChange(publicUrl)
    } catch (e) {
      setError('업로드 실패: ' + (e.message || '오류'))
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) upload(file)
  }

  const handleRemove = async () => {
    if (!value) return
    if (!confirm('사진을 제거하시겠어요?')) return
    
    try {
      await supabase.rpc('delete_quiz_image', { p_image_url: value })
    } catch (e) {
      console.warn('Storage 삭제 실패:', e)
    }
    onChange('')
  }

  if (value) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-charcoal">{label}</label>
        <div className="relative inline-block w-full max-w-md">
          <img 
            src={value} 
            alt="업로드된 이미지" 
            className="w-full rounded-lg border-2 border-gold-500/30 shadow-sm"
            style={{ maxHeight: '300px', objectFit: 'contain', background: '#FDFAF2' }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm hover:bg-red-50 rounded-full px-3 py-1 text-sm font-semibold border border-red-200 text-up shadow-md"
          >
            ✕ 제거
          </button>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-gold-700 hover:underline"
        >
          🔄 다른 사진으로 변경
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-charcoal">{label}</label>
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-all
          ${dragOver 
            ? 'border-gold-500 bg-gold-50/60' 
            : 'border-gold-500/30 hover:border-gold-500/60 hover:bg-gold-50/30'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {uploading ? (
          <div className="space-y-2">
            <div className="text-3xl">⏳</div>
            <div className="text-sm text-stone">업로드 중...</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📸</div>
            <div className="text-sm font-semibold text-charcoal">
              클릭하거나 사진을 끌어 놓으세요
            </div>
            <div className="text-xs text-stone">
              JPG, PNG, WebP · 최대 5MB
            </div>
            <div className="text-[10px] text-stone mt-1">
              📱 휴대폰: 앨범 또는 카메라에서 선택 가능
            </div>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      {error && (
        <div className="text-xs text-up bg-red-50 px-2 py-1 rounded">
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}

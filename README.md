# 광주여상 발명 모의 투자 대회 v19 🎊

v18 (1분 변동, 종목 CRUD) + v19 (PWA, 5분 차트, 퀴즈 사진, 가로 카드)
**완전 통합본!**

---

## ✨ v19 의 모든 기능

### 🎨 디자인 & UX
- 광주여상 발명 모의 투자 대회 (제목)
- 금색 + 아이보리 테마, 유경심 캐릭터 17종
- PC + 모바일 반응형
- 인라인 매매창
- 천 단위 콤마 (1,000,000)
- **🆕 보유 종목 가로 카드 디자인** (한눈에 보임)

### 📊 대회 시스템
- 대회 시간 자유 설정
- 뉴스 자동 스케줄

### ⚡ 1분 변동 시스템 (v18)
- **시스템 자동 1분 변동** (학생 접속 무관)
- 변동폭 ±1~5% 슬라이더 조절
- ⏸️ 일시정지 / ⚡ 즉시 변동
- 가격 10원 단위

### 📊 종목 관리 (v18)
- 종목 가격 수정
- 종목 정보 수정 (이름, 코드, 섹터)
- 새 종목 만들기
- 종목 삭제 (보유자 없을 때만)

### 🛠️ 관리자 기능
- 모든 폼 전체 페이지
- 현황 카드 6개
- 시스템 설정 카드
- 깜짝 이벤트 발동
- 학생 삭제

### 🎯 광주 종목 12개
GGCB, GGED, YAYL, BANG, JINW, KIAM, DASH, HALL, GOGO, MUDB, SOLR, NEOM

### 📰 추론형 뉴스 36개
종목별 호재/악재/중립

### 📈 5분 단위 차트 🆕
- 깔끔한 5분 봉 차트
- "5분 단위" 배지
- 빽빽한 1분 차트보다 보기 좋음

### 📸 퀴즈 사진 🆕
- 사진 첨부 가능 (드래그 / 클릭 / 카메라)
- 자동 압축 (5MB → 200KB)
- Storage 안전 저장

### 📱 PWA (앱처럼) 🆕
- 홈 화면 아이콘 추가
- 풀스크린 앱처럼 작동
- Service Worker 캐싱
- 자동 설치 안내

---

## 🚀 적용 방법 (v18 적용 후 한 번에!)

### Step 1: 백업
바탕화면 `investclass-app` (현재) → `investclass-app-backup` 으로 이름 변경

### Step 2: v19 압축 풀기
`investclass-app-v19.zip` → 바탕화면에 압축 해제

### Step 3: .env 복사 ⭐
- `investclass-app-backup/.env` → `investclass-app-v19/.env`

### Step 4: 패키지 설치
```
cd Desktop\investclass-app-v19
npm install
```

### Step 5: Supabase SQL ⭐⭐⭐ 가장 중요!

> ✅ 안전: 종목/뉴스/거래 데이터 그대로 유지

#### 5-1. 이미 v18 SQL 적용했으면 (1분 변동 작동 중)
- `supabase/migration_v19.sql` 만 실행
- → Storage 버킷 + 5분 차트 view 추가

#### 5-2. v18 SQL 안 했으면 (1분 변동 안 됨)
- 먼저 `supabase/migration_v12.sql` 다음 `supabase/migration_v19.sql`

> 💡 둘 다 안전하게 재실행 가능

### Step 6: Git push
```
cd Desktop\investclass-app-v19
git init
git branch -M main
git remote add origin https://github.com/bjd7854/ggc-invest.git
git add .
git commit -m "v19 통합 (PWA + 차트 + 사진 + 가로카드)"
git push -f origin main
```

⚠️ **마지막 명령에 `-f` 꼭!**

### Step 7: Vercel 자동 배포 1~2분 대기
`ggc-invest.vercel.app` → **Ctrl+Shift+R**

---

## ✅ 작동 확인

### ① 📱 PWA (안드로이드/PC 크롬)
1. 접속 후 3~5초 기다리기
2. **자동 팝업**: "📱 앱처럼 빠르게 사용하세요!"
3. **[홈 화면에 추가]** 클릭

### ② 📈 5분 차트
1. 거래소 → 종목 클릭
2. 차트 우측 위 **"5분 단위"** 배지

### ③ 📊 가로 카드 (대시보드)
1. 대시보드 접속
2. 보유 종목이 **카드 형태** (PC: 3열, 태블릿: 2열, 모바일: 1열)

### ④ 📸 퀴즈 사진 (관리자)
1. 관리자 → 📚 퀴즈 → 새 퀴즈
2. 문제 입력 후 **📸 사진 (선택)** 영역
3. 클릭 → 휴대폰 앨범 → 사진 업로드

### ⑤ ⚡ 1분 변동 시스템 (v18)
1. 관리자 → 📊 종목가
2. **⚡ 1분 변동 시스템** 카드
3. 변동폭 슬라이더 + 빠른 버튼

---

## 🆘 문제 해결

### Vercel 빌드 실패
- npm install 다시 시도
- node_modules 폴더 삭제 후 재설치

### Git push 에러
```
git remote remove origin
git remote add origin https://github.com/bjd7854/ggc-invest.git
git push -f origin main
```

### PWA 설치 안내 안 뜸
- 시크릿 창 (Ctrl+Shift+N) 으로 다시 보기
- 또는 콘솔: `localStorage.removeItem('pwa-prompt-dismissed')`

### 사진 업로드 실패
- migration_v19.sql 다시 실행
- Supabase → Storage → quiz-images 버킷 확인

### 5분 차트 비어있음
- migration_v19.sql 의 view 가 잘 생성됐는지 확인
- 가격 변동이 충분히 쌓여야 (몇 분 후 다시 확인)

### 1분 변동 안 됨
v18 SQL 함수들이 다 만들어졌는지 확인:
```sql
select proname from pg_proc 
where proname in (
  'small_fluctuate_untouched',
  'admin_force_tick',
  'set_global_volatility',
  'toggle_fluctuation'
);
```
→ 4개 다 보여야 함

---

## 📁 환경
- GitHub: `bjd7854/ggc-invest`
- Vercel: `ggc-invest.vercel.app`
- Supabase: 기존 DB 유지

---

## 🎯 v19 의 의미

이번 한 번으로:
- ✅ 학생들 앱처럼 사용 (PWA)
- ✅ 깔끔한 5분 차트
- ✅ 가로 카드 (한눈에)
- ✅ 사진 있는 퀴즈
- ✅ 시스템 1분 변동 + 종목 CRUD (v18)

**중학생 시험 운영 완벽 준비!** 🎊

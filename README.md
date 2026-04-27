# 광주여상 발명 모의 투자 대회 v12 🎊

v1~v11 의 모든 기능 + 학생 삭제 + 1분 변동 100% 보장!

---

## ✨ v12 의 모든 기능

### 🎨 디자인 & UX
- 광주여상 발명 모의 투자 대회 (제목)
- 금색 + 아이보리 테마, 유경심 캐릭터 17종
- PC + 모바일 반응형
- 인라인 매매창 (카드 안에서 펼쳐짐)
- 천 단위 콤마 (1,000,000)

### 📊 대회 시스템
- 대회 시간 자유 설정
- 뉴스 자동 스케줄
- 대회별 변동 주기/변동폭 설정
- **하이브리드 변동 (1분 + cron 백업)**

### ⚡ 실시간 시스템
- 실시간 가격 갱신 (새로고침 X)
- 실시간 뉴스 알림
- 실시간 알림 띠 (우측 상단)

### 🛠️ 관리자 기능
- 모든 폼 전체 페이지
- 현황 카드 6개
- 시스템 설정 카드
- 깜짝 이벤트 발동
- **🆕 학생 삭제 기능 (안전장치 포함)**
- 학생 자산 정렬 + 메달
- 엑셀 다운로드

### 🎯 광주 종목 12개
GGCB, GGED, YAYL, BANG, JINW, KIAM, DASH, HALL, GOGO, MUDB, SOLR, NEOM

### 📰 추론형 뉴스 36개
종목별 호재/악재/중립 (산업 트렌드로 우회)

---

## 🚀 설치 방법 (v10 백업 이미 있다면 더 간단!)

### Step 1: 백업
바탕화면에서 `investclass-app-v10` → `investclass-app-v10-backup`

### Step 2: v12 압축 풀기
- `investclass-app-v12.zip` → 바탕화면에 압축 해제

### Step 3: .env 복사
- `investclass-app-v10-backup/.env` → `investclass-app-v12/.env`

### Step 4: 패키지 설치
```
cd Desktop\investclass-app-v12
```
```
npm install
```

### Step 5: Supabase SQL ⭐⭐⭐ 가장 중요!

> ✅ 안전: 종목/뉴스 데이터는 그대로 유지! (v10 SQL 과 다름)
> 단, 시스템 함수만 새로 만들어서 1분 변동 보장

1. https://supabase.com → 프로젝트 → SQL Editor → **+ New query**
2. `supabase/migration_v12.sql` 메모장으로 열기
3. **Ctrl+A → Ctrl+C** (전체 복사)
4. SQL Editor 에 **Ctrl+V** (붙여넣기)
5. **Run** 클릭
6. 마지막 결과 확인:
```json
{
  "random_done": true,
  "news_done": true,
  "idle_interval": 10
}
```
이렇게 나오면 ✅ 성공!

### Step 6: Git push (가장 안전한 방법)
```
cd Desktop\investclass-app-v12
git init
git branch -M main
git remote add origin https://github.com/bjd7854/ggc-invest.git
git add .
git commit -m "v12 완전판"
git push -f origin main
```

### Step 7: Vercel 자동 배포 1~2분 대기
`ggc-invest.vercel.app` → **Ctrl+Shift+R**

---

## ✅ 작동 확인

### ① 종목 12개 (그대로 유지)
- 거래소 → 광주여상홀딩스, 양림소셜 등 12개 보임

### ② 뉴스 36개 (그대로 유지)  
- 관리자 → 📋 뉴스 풀 → 36개 템플릿

### ③ 1분 자동 변동 ⭐ (이번에 보장!)
1. 학생으로 로그인
2. 거래소 페이지 진입
3. **2분 정도 가만히** 보고 있기
4. 가격이 1분 단위로 살짝씩 변동되면 ✅

### ④ 학생 삭제 ⭐ (NEW!)
1. 관리자 → 👥 학생 탭
2. 각 학생 우측에 **🗑️ 삭제** 버튼
3. 클릭 → 확인창 → 삭제 완료

---

## 🆘 문제 해결

### Vercel 빌드 실패
- npm install 다시 실행
- node_modules 폴더 삭제 후 npm install
- 만약 여전히 실패 → 에러 메시지 알려주세요

### 1분 변동 안 됨
1. SQL 실행 확인:
```sql
select public.trigger_price_tick();
```
→ random_done: true 면 정상

2. 학생이 정말 접속 중인지:
```sql
select extract(epoch from (now() - last_random_at))::int as 트리거_경과초
from system_settings;
```
→ 90초 이내면 트리거 호출되는 중

### 학생 삭제 안 됨
- "관리자만 가능" 에러: 본인이 관리자인지 확인
- "본인 계정은 삭제 불가": 다른 학생 선택

---

## 📁 환경 (그대로)

- GitHub: `bjd7854/ggc-invest`
- Vercel: `ggc-invest.vercel.app`
- Supabase: 기존 DB 유지

---

## 🎯 v12 의 의미

이전까지 자꾸 부분 패치로 보내드려서 충돌이 생긴 거 같아요.
v12 는 처음부터 끝까지 **완전한 패키지**라 깔끔합니다!

- ✅ 모든 함수 한 번에 재정의 (충돌 없음)
- ✅ 가격 변동 함수 단순화 (무조건 변동)
- ✅ 학생 삭제 통합
- ✅ Vercel 빌드 안정성 검증

# 더불어행복한교회 홈페이지

전도와 교제를 위한 교회 공개 홈페이지입니다.
정적 사이트(HTML/CSS/JS) + **Firebase**(문의·게시글 저장, 관리자 로그인)로 만들어졌어요.
누구나 로그인 없이 볼 수 있고, 문의는 사이트 안에 저장되며, 관리자만 어드민 페이지에서 관리합니다.

---

## 📁 파일 구조

| 파일 | 설명 |
|---|---|
| `index.html` | 메인 페이지 (교회소개·예배·오시는 길·설교영상·처음 오시는 분·문의) |
| `sermons.html` | 설교·주보·목회칼럼 목록 (+유튜브 설교) |
| `admin.html` / `admin.js` | **관리자 페이지** — 게시글 등록·수정·삭제, 문의 확인·답변처리 |
| `app.js` | 공개 페이지 로직 (소식 불러오기, 문의 접수, 답변 조회) |
| `style.css` | 디자인 (로고 색상 팔레트) |
| `firebase-config.js` | **Firebase 연결 설정 (직접 채워야 함)** |
| `firestore.rules` / `storage.rules` | 데이터 보안 규칙 |
| `images/` | 로고, 목회자 사진, 파비콘 |

---

## 🚀 처음 설정하기 (딱 한 번만)

### 1단계 — Firebase 프로젝트 만들기
1. https://console.firebase.google.com 접속 → **프로젝트 추가** → 이름 `더불어행복한교회`
2. 만든 프로젝트에서 **빌드(Build)** 메뉴로 아래 3가지를 켭니다.
   - **Authentication** → 시작하기 → **Google** 로그인 사용 설정
   - **Firestore Database** → 데이터베이스 만들기 → *프로덕션 모드* 로 시작
   - **Storage** → 시작하기 (게시글 이미지·주보 업로드용)

### 2단계 — 웹 앱 등록 & 설정값 복사
1. 프로젝트 설정(⚙️) → 일반 → **내 앱** → 웹 앱(`</>`) 추가
2. 화면에 나오는 `firebaseConfig` 값을 복사해서 **`firebase-config.js`** 의 `FIREBASE_CONFIG` 를 통째로 교체
   > 이 값들은 웹에 공개돼도 안전합니다. 실제 보안은 규칙(rules)이 담당해요.

### 3단계 — 관리자 이메일 지정 (⭐가장 중요, 3곳 목록을 동일하게)
관리자로 쓸 **구글 계정 이메일 목록**을 아래 3개 파일에 똑같이 유지하세요.
현재 등록된 관리자: `iholyhands@gmail.com`, `sunlike.chloe@gmail.com`
- `firebase-config.js` → `ADMIN_EMAILS` 배열
- `firestore.rules` → `isAdmin()` 안의 이메일 목록
- `storage.rules` → 이메일 목록

관리자를 추가/삭제하려면 위 3곳의 목록에 이메일을 함께 넣거나 빼면 됩니다.

> 이 목록의 구글 계정으로 `admin.html` 에 로그인해야만 게시글/문의를 관리할 수 있어요.

### 4단계 — 보안 규칙 올리기
가장 쉬운 방법(콘솔에 복사·붙여넣기):
- Firestore Database → **규칙(Rules)** 탭 → `firestore.rules` 내용 붙여넣기 → **게시**
- Storage → **규칙(Rules)** 탭 → `storage.rules` 내용 붙여넣기 → **게시**

(터미널에 익숙하면 `firebase deploy --only firestore:rules,storage` 도 가능)

### 5단계 — 배포하기
GitHub + Netlify(나그네방과 동일) 또는 Vercel 어디든 됩니다. 별도 빌드 과정이 없어요.
- **Netlify**: 새 사이트 → GitHub 저장소 연결 (설정은 `netlify.toml` 에 이미 들어있음) → 배포
- **Vercel**: 저장소 import → Framework `Other` → 그대로 배포
- 배포 후 Firebase 콘솔 → Authentication → **설정 → 승인된 도메인**에 배포된 주소(예: `xxx.netlify.app`)를 추가해야 구글 로그인이 됩니다.

---

## 👩‍💼 관리자 사용법 (`/admin.html`)

1. 홈페이지 맨 아래 **관리자** 링크 → 구글 로그인
2. **게시글 관리** 탭
   - 분류(주일설교/주보/목회칼럼/교회소식) 선택 → 제목·날짜·내용 입력 → 등록
   - 대표 이미지나 주보 파일(PDF/이미지)을 첨부할 수 있어요
   - 등록한 글은 홈 화면과 `설교·주보` 페이지에 자동으로 나타납니다
3. **문의 관리** 탭
   - 새 문의는 빨간 배지로 표시돼요
   - 답변 내용을 적고 **‘답변 저장 & 완료 처리’** → 문의하신 분이 받은 *조회번호*로 답변을 확인할 수 있어요
   - 알려주신 연락처(전화·이메일·카카오)로 직접 연락도 가능합니다

---

## 🎬 설교 영상(유튜브) 업데이트

메인/설교 페이지의 유튜브 썸네일은 현재 최신 영상 4개가 들어가 있어요.
새 영상으로 바꾸려면 `index.html` · `sermons.html` 의 `yt-card` 부분에서
- 링크의 `watch?v=` 뒤 **영상 ID**
- 썸네일 주소 `i.ytimg.com/vi/영상ID/hqdefault.jpg`
- 제목·재생시간

을 새 영상 것으로 바꾸면 됩니다. (또는 관리자에서 ‘주일설교’ 게시글로 유튜브 링크를 등록해도 목록에 쌓여요.)

유튜브 채널: https://youtube.com/channel/UCfoa7YxogvQ-zwMg6psK59A

---

## 🖼️ 사진 추가하기

교회 예배 현장·공간·공동체 사진이 있으면 `images/` 폴더에 넣고,
알려주시면 갤러리 섹션이나 각 섹션에 자연스럽게 배치해 드릴 수 있어요.
(현재는 로고 색상·엠블럼 중심으로 사진 없이도 따뜻하게 보이도록 디자인했습니다.)

---

## 📊 방문 통계 (Google Analytics 4)

1. https://analytics.google.com 에서 계정·속성 생성 → **웹 데이터 스트림** 추가
2. 발급된 **측정 ID(`G-XXXXXXXXXX`)** 를 `firebase-config.js` 의 `window.GA4_MEASUREMENT_ID` 에 입력
3. 배포하면 자동 수집됩니다:
   - **일일 방문자 수** (보고서 > 실시간 / 획득)
   - **주요 클릭** (`content_click` 이벤트 — 어떤 메뉴·버튼·글을 눌렀는지)
   - **유입 경로** (보고서 > 획득 — 검색/직접/SNS/추천)
4. 관리자 페이지 상단 **‘방문 통계 보기’** 버튼으로 GA 대시보드로 이동합니다.

## ✉️ 문의 알림 메일 (EmailJS)

문의가 접수되면 **iholyhands@gmail.com** 으로 알림 메일이 자동 발송됩니다.

1. https://dashboard.emailjs.com 무료 가입
2. **Email Service** 연결(예: Gmail) → `service_id` 확인
3. **Email Template** 생성 → 아래 변수를 본문에 넣기:
   `{{inquiry_type}}`, `{{name}}`, `{{contact}}`, `{{message}}`, `{{ref_code}}`, `{{submitted_at}}`
   - 받는사람(To)에는 `{{to_email}}` 또는 직접 `iholyhands@gmail.com`
4. **Account > General** 에서 `Public Key` 확인
5. `firebase-config.js` 의 `window.EMAILJS` 에 `serviceId / templateId / publicKey` 입력,
   받는 주소는 `window.NOTIFY_EMAIL` 로 조정 가능

> 세 값이 비어 있으면 메일은 발송되지 않고, 문의는 사이트(어드민)에만 저장됩니다.

## 🎨 교회 브랜드 색상 (로고에서 추출)

| 이름 | 색상값 |
|---|---|
| 메인 블루 | `#0E6EB8` |
| 청록 | `#18A59C` |
| 주황 | `#F19116` |
| 십자가 레드 | `#E83227` |
| 라임 / 딥그린 | `#88B72B` / `#126539` |

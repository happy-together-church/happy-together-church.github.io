// ─── Firebase 설정 ───────────────────────────────────────────
// 1) https://console.firebase.google.com 에서 "더불어행복한교회" 프로젝트 생성
// 2) 프로젝트 설정 > 일반 > 내 앱 > 웹 앱(</>) 추가
// 3) 나오는 firebaseConfig 값으로 아래를 통째로 교체하세요.
//    (이 값들은 웹에 공개되어도 안전합니다 — 보안은 firestore.rules 가 담당합니다.)
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ─── 관리자 구글 계정 ─────────────────────────────────────────
// 이 구글 계정으로 로그인해야 admin.html 에서 게시글 등록·문의 관리를 할 수 있습니다.
// 아래 이메일을 교회 대표(관리자) 구글 계정으로 바꾸고,
// firestore.rules 안의 이메일도 똑같이 바꿔주세요.
const ADMIN_EMAIL = "여기에-관리자-구글이메일@gmail.com";

// ─── (선택) 네이버 지도 API ───────────────────────────────────
// 네이버 지도는 iframe 임베드가 막혀 있어, 실제 지도를 넣으려면
// 네이버 클라우드 플랫폼(https://www.ncloud.com) → AI·NAVER API →
// Maps 신청 후 발급받은 Client ID 를 아래에 넣어주세요.
// 비워두면 '오시는 길' 안내 카드(길찾기 버튼)가 표시됩니다.
window.NAVER_MAP_CLIENT_ID = "";

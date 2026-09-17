// ─── Firebase 설정 ───────────────────────────────────────────
// 1) https://console.firebase.google.com 에서 "더불어행복한교회" 프로젝트 생성
// 2) 프로젝트 설정 > 일반 > 내 앱 > 웹 앱(</>) 추가
// 3) 나오는 firebaseConfig 값으로 아래를 통째로 교체하세요.
//    (이 값들은 웹에 공개되어도 안전합니다 — 보안은 firestore.rules 가 담당합니다.)
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyC_zHbVrC2Hqvh5EOXlXko6ssFku82meJA",
  authDomain:        "happy-together-church.firebaseapp.com",
  projectId:         "happy-together-church",
  storageBucket:     "happy-together-church.firebasestorage.app",
  messagingSenderId: "385351672770",
  appId:             "1:385351672770:web:f68ca76267a93a89abec5b",
  measurementId:     "G-DN8NWTSCDQ"
};

// ─── 관리자 구글 계정 ─────────────────────────────────────────
// 아래 목록에 있는 구글 계정으로 로그인해야 admin.html 에서
// 게시글 등록·문의 관리를 할 수 있습니다.
// (firestore.rules / storage.rules 의 이메일 목록도 동일하게 맞춰주세요.)
const ADMIN_EMAILS = [
  "iholyhands@gmail.com",
  "sunlike.chloe@gmail.com"
];

// ─── (선택) Google Analytics 4 — 방문 통계 ────────────────────
// analytics.google.com 에서 GA4 속성 생성 → 측정 ID(G-XXXXXXXXXX)를 넣으세요.
// 넣으면 일일 방문자 수 · 클릭 · 유입 경로가 자동 수집됩니다. (비우면 통계 미수집)
window.GA4_MEASUREMENT_ID = "G-DN8NWTSCDQ";

// ─── (선택) 문의 알림 메일 — EmailJS ──────────────────────────
// https://dashboard.emailjs.com 에서 무료 가입 후 아래 3개 값을 넣으세요.
// 문의가 접수되면 NOTIFY_EMAIL 로 알림 메일이 발송됩니다. (비우면 메일 미발송)
window.NOTIFY_EMAIL = "iholyhands@gmail.com";
window.EMAILJS = {
  serviceId:  "",   // 예: "service_xxxxxxx"
  templateId: "",   // 예: "template_xxxxxxx"
  publicKey:  ""    // 예: "xxxxxxxxxxxxxxxx"
};

// ─── (선택) 네이버 지도 API ───────────────────────────────────
// 네이버 지도는 iframe 임베드가 막혀 있어, 실제 지도를 넣으려면
// 네이버 클라우드 플랫폼(https://www.ncloud.com) → AI·NAVER API →
// Maps 신청 후 발급받은 Client ID 를 아래에 넣어주세요.
// 비워두면 '오시는 길' 안내 카드(길찾기 버튼)가 표시됩니다.
window.NAVER_MAP_CLIENT_ID = "";

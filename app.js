/* ============================================================
   더불어행복한교회 — 공개 페이지 스크립트
   (index.html / sermons.html 공용)
   ============================================================ */

/* ---------- 공통 유틸 ---------- */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function showToast(msg, isError) {
  const t = document.getElementById('toast');
  if (!t) { alert(msg); return; }
  t.textContent = msg;
  t.classList.toggle('error', !!isError);
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 3800);
}
function fmtDate(v) {
  if (!v) return '';
  let d;
  if (typeof v === 'string') { d = new Date(v); if (isNaN(d)) return v; }
  else if (v.toDate) d = v.toDate();
  else d = new Date(v);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}

/* 게시글 카테고리 정의 */
const CATEGORIES = {
  sermon:   { label: '주일설교', cls: 'cat-sermon' },
  bulletin: { label: '주보',     cls: 'cat-bulletin' },
  column:   { label: '목회칼럼', cls: 'cat-column' },
  news:     { label: '교회소식', cls: 'cat-news' },
};
function catMeta(c) { return CATEGORIES[c] || { label: '소식', cls: 'cat-news' }; }

/* ---------- 기본 UI (Firebase 없이도 동작) ---------- */
(function initUI() {
  // 연도
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // 모바일 네비 토글
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open')));
  }

  // FAQ 아코디언
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : '0';
    });
  });

  // 스크롤 등장
  const reveals = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  reveals.forEach(el => io.observe(el));
  // 안전장치: 어떤 이유로든 관찰이 실패해도 콘텐츠가 영영 숨지 않도록
  setTimeout(() => reveals.forEach(el => el.classList.add('in')), 2500);
})();

/* ---------- Firebase ---------- */
let db = null, auth = null;
(function initFirebase() {
  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
    console.warn('[더불어행복한교회] firebase-config.js 설정이 필요합니다. (README 참고)');
    renderConfigNeeded();
    return;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    auth = firebase.auth();
  } catch (err) {
    console.error('Firebase 초기화 오류:', err);
  }
})();

/* ---------- Google Analytics 4 (방문 통계) ---------- */
function gaEvent(name, params) { try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) {} }
(function initGA() {
  const id = window.GA4_MEASUREMENT_ID;
  if (!id) return;
  const s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id);
})();

/* 주요 클릭 추적 — 방문자가 어떤 정보를 클릭하는지 */
document.addEventListener('click', (e) => {
  const t = e.target.closest('.nav-links a, .btn, .post-card, .yt-card, .type-chip, .filter-tab, a[href]');
  if (!t) return;
  const label = (t.getAttribute('aria-label') || t.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const sec = t.closest('section[id], header[id]');
  let section = sec ? sec.id : 'other';
  if (t.classList.contains('yt-card')) section = 'youtube_설교';
  if (label) gaEvent('content_click', { link_text: label, section: section });
});

/* ---------- 문의 알림 메일 (EmailJS) ---------- */
function sendInquiryEmail(d) {
  try {
    const cfg = window.EMAILJS || {};
    if (!window.emailjs || !cfg.serviceId || !cfg.templateId || !cfg.publicKey) return;
    window.emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email: window.NOTIFY_EMAIL || '',
      inquiry_type: d.type, name: d.name, contact: d.contact,
      message: d.message, ref_code: d.ref,
      submitted_at: new Date().toLocaleString('ko-KR')
    }, cfg.publicKey).catch((err) => console.warn('알림 메일 발송 실패:', err));
  } catch (e) { console.warn(e); }
}

function renderConfigNeeded() { /* 시드 데이터로 대체 렌더링되므로 별도 처리 없음 */ }

/* 게시글 조회용 인덱스 (모달에서 사용) */
const POSTS_INDEX = {};
function getSeedPosts() { return Array.isArray(window.SEED_POSTS) ? window.SEED_POSTS.slice() : []; }
function indexPosts(items) { items.forEach(x => { POSTS_INDEX[x.id] = x.d; }); }

/* 게시글 로드: Firestore 우선, 비어있거나 미설정이면 시드(seed) 사용 */
function loadPosts() {
  return new Promise((resolve) => {
    const seed = () => getSeedPosts().map(d => ({ id: d.id, d }));
    if (!db) { resolve(seed()); return; }
    db.collection('posts').orderBy('createdAt', 'desc').get()
      .then(snap => resolve(snap.empty ? seed() : snap.docs.map(doc => ({ id: doc.id, d: doc.data() }))))
      .catch(err => { console.error(err); resolve(seed()); });
  });
}

/* ---------- 홈: 최근 게시글 3개 ---------- */
(function homePosts() {
  const grid = document.getElementById('homePosts');
  if (!grid) return;
  loadPosts().then(items => {
    indexPosts(items);
    if (!items.length) { grid.innerHTML = '<p class="empty-note">따뜻한 소식을 준비하고 있어요. 조금만 기다려 주세요.</p>'; return; }
    grid.innerHTML = items.slice(0, 3).map(x => postCard(x.id, x.d)).join('');
  });
})();

function postCard(id, d) {
  const meta = catMeta(d.category);
  const thumb = d.imageUrl
    ? `<div class="post-thumb"><img src="${esc(d.imageUrl)}" alt="${esc(d.title)}" loading="lazy" /></div>`
    : `<div class="post-thumb placeholder"><img src="images/emblem.png" alt="" /></div>`;
  const excerpt = d.body ? `<p class="post-excerpt">${esc(d.body)}</p>` : '';
  const dateStr = fmtDate(d.date || d.createdAt);
  const tail = d.link ? '영상' : (d.fileUrl ? '첨부' : '');
  const metaLine = (dateStr || tail)
    ? `<div class="post-date">${dateStr}${dateStr && tail ? ' · ' : ''}${tail}</div>` : '';
  return `<article class="post-card" data-postid="${esc(id)}" tabindex="0" role="button" aria-label="${esc(d.title)} 자세히 보기">
    ${thumb}
    <div class="post-body">
      <span class="post-cat ${meta.cls}">${meta.label}</span>
      <h3>${esc(d.title)}</h3>
      ${excerpt}
      ${metaLine}
    </div>
  </article>`;
}

/* ---------- sermons.html: 전체 목록 + 카테고리 필터 ---------- */
(function sermonList() {
  const list = document.getElementById('sermonList');
  if (!list) return;
  let currentCat = 'all';
  let allItems = [];

  const tabs = document.querySelectorAll('.filter-tab[data-cat]');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    currentCat = tab.dataset.cat;
    tabs.forEach(t => t.classList.toggle('active', t === tab));
    render();
  }));

  function render() {
    const items = currentCat === 'all' ? allItems : allItems.filter(x => x.d.category === currentCat);
    if (!items.length) { list.innerHTML = '<p class="empty-note">아직 등록된 글이 없어요. 곧 나눌게요.</p>'; return; }
    list.innerHTML = items.map(x => postCard(x.id, x.d)).join('');
  }

  list.innerHTML = '<p class="empty-note">불러오는 중이에요…</p>';
  loadPosts().then(items => { allItems = items; indexPosts(items); render(); });
})();

/* ---------- 네이버 지도 (Client ID 있을 때만) ---------- */
(function initNaverMap() {
  const el = document.getElementById('naverMap');
  const fb = document.getElementById('mapFallback');
  if (!el) return;
  const cid = window.NAVER_MAP_CLIENT_ID;
  if (!cid) return; // 키가 없으면 안내 카드 유지
  const script = document.createElement('script');
  script.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=' + encodeURIComponent(cid) + '&submodules=geocoder';
  script.onload = () => {
    try {
      const draw = (center) => {
        el.hidden = false;
        if (fb) fb.hidden = true;
        const map = new naver.maps.Map(el, { center, zoom: 16 });
        new naver.maps.Marker({ position: center, map });
      };
      naver.maps.Service.geocode({ query: '경기도 광주시 고불로 58-4' }, (status, res) => {
        if (status === naver.maps.Service.Status.OK && res.v2.addresses.length) {
          const a = res.v2.addresses[0];
          draw(new naver.maps.LatLng(Number(a.y), Number(a.x)));
        } else {
          draw(new naver.maps.LatLng(37.4092, 127.2568)); // 광주시 대략 좌표
        }
      });
    } catch (e) { console.error('네이버 지도 오류:', e); }
  };
  script.onerror = () => console.warn('네이버 지도 스크립트를 불러오지 못했습니다.');
  document.head.appendChild(script);
})();

/* ---------- 게시글 상세 모달 ---------- */
function openPostModal(id) {
  const d = POSTS_INDEX[id];
  if (!d) return;
  let modal = document.getElementById('postModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'postModal';
    modal.className = 'modal-overlay';
    modal.hidden = true;
    modal.innerHTML = `<div class="modal-panel post-modal-panel"><button class="modal-close" aria-label="닫기">✕</button><div id="postModalContent"></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closePostModal(); });
    modal.querySelector('.modal-close').addEventListener('click', closePostModal);
  }
  const meta = catMeta(d.category);
  const dateStr = fmtDate(d.date || d.createdAt);
  const img = d.imageUrl ? `<img class="pm-img" src="${esc(d.imageUrl)}" alt="${esc(d.title)}" />` : '';
  const bodyHtml = d.body ? d.body.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br />')}</p>`).join('') : '';
  const linkBtn = d.link ? `<a href="${esc(d.link)}" target="_blank" rel="noopener" class="btn btn-primary">영상 보기</a>` : '';
  const fileBtn = d.fileUrl ? `<a href="${esc(d.fileUrl)}" target="_blank" rel="noopener" class="btn btn-ghost">원본 보기</a>` : '';
  const actions = (linkBtn || fileBtn) ? `<div class="pm-actions">${linkBtn}${fileBtn}</div>` : '';
  document.getElementById('postModalContent').innerHTML =
    `<span class="post-cat ${meta.cls}">${meta.label}</span>
     <h2 class="pm-title">${esc(d.title)}</h2>
     ${dateStr ? `<div class="pm-date">${dateStr}</div>` : ''}
     ${img}
     <div class="pm-body">${bodyHtml}</div>
     ${actions}`;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const panel = modal.querySelector('.modal-panel');
  if (panel) panel.scrollTop = 0;
}
function closePostModal() {
  const m = document.getElementById('postModal');
  if (m) m.hidden = true;
  document.body.style.overflow = '';
}
document.addEventListener('click', (e) => {
  const card = e.target.closest('[data-postid]');
  if (card) openPostModal(card.getAttribute('data-postid'));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePostModal();
  const el = document.activeElement;
  if ((e.key === 'Enter' || e.key === ' ') && el && el.matches && el.matches('[data-postid]')) {
    e.preventDefault(); openPostModal(el.getAttribute('data-postid'));
  }
});

/* ---------- 문의 접수 ---------- */
(function inquiryForm() {
  const form = document.getElementById('inquiryForm');
  if (!form) return;
  const submitBtn = document.getElementById('inqSubmit');
  const refBox = document.getElementById('refBox');
  const refCode = document.getElementById('refCode');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!db) { showToast('아직 문의 접수 준비가 끝나지 않았어요. 잠시 후 다시 시도해 주세요.', true); return; }

    const type = (form.querySelector('input[name="type"]:checked') || {}).value || '기타 문의';
    const name = form.name.value.trim();
    const contact = form.contact.value.trim();
    const message = form.message.value.trim();
    const consent = document.getElementById('inqConsent').checked;
    if (!name || !contact || !message) { showToast('필수 항목을 모두 입력해 주세요.', true); return; }
    if (!consent) { showToast('개인정보 수집·이용에 동의해 주세요.', true); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '보내는 중…';
    try {
      const ref = await db.collection('inquiries').add({
        type, name, contact, message,
        status: 'received',   // received → answered
        reply: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      sendInquiryEmail({ type, name, contact, message, ref: ref.id });
      gaEvent('inquiry_submit', { inquiry_type: type });
      form.reset();
      if (refCode) refCode.textContent = ref.id;
      if (refBox) { refBox.hidden = false; refBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      showToast('문의가 따뜻하게 접수되었어요.');
    } catch (err) {
      console.error(err);
      showToast('문제가 생겼어요. 잠시 후 다시 시도해 주세요.', true);
    }
    submitBtn.disabled = false;
    submitBtn.textContent = '문의 보내기';
  });
})();

/* ---------- 문의 답변 조회 ---------- */
(function lookup() {
  const modal = document.getElementById('lookupModal');
  if (!modal) return;
  const open = document.getElementById('lookupOpen');
  const close = document.getElementById('lookupClose');
  const btn = document.getElementById('lookupBtn');
  const input = document.getElementById('lookupInput');
  const result = document.getElementById('lookupResult');

  const show = () => { modal.hidden = false; setTimeout(() => input && input.focus(), 100); };
  const hide = () => { modal.hidden = true; result.innerHTML = ''; if (input) input.value = ''; };

  if (open) open.addEventListener('click', (e) => { e.preventDefault(); show(); });
  if (close) close.addEventListener('click', hide);
  modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });

  if (btn) btn.addEventListener('click', async () => {
    const code = (input.value || '').trim();
    if (!code) { showToast('조회번호를 입력해 주세요.', true); return; }
    if (!db) { showToast('조회 준비가 끝나지 않았어요.', true); return; }
    result.innerHTML = '<p style="color:var(--ink-faint); font-size:14px;">확인 중이에요…</p>';
    try {
      const doc = await db.collection('inquiries').doc(code).get();
      if (!doc.exists) { result.innerHTML = '<p style="color:var(--red); font-size:14px;">해당 조회번호를 찾을 수 없어요. 번호를 다시 확인해 주세요.</p>'; return; }
      const d = doc.data();
      if (d.status === 'answered' && d.reply) {
        result.innerHTML = `<div class="lookup-answer">
          <div class="la-status">답변이 도착했어요</div>
          <div class="la-reply">${esc(d.reply)}</div>
        </div>`;
      } else {
        result.innerHTML = `<div class="lookup-answer pending">
          <div class="la-status">접수되어 확인 중이에요</div>
          <div class="la-reply">정성껏 살펴보고 알려주신 연락처로 답을 드릴게요. 조금만 기다려 주세요.</div>
        </div>`;
      }
    } catch (err) {
      console.error(err);
      result.innerHTML = '<p style="color:var(--red); font-size:14px;">조회 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.</p>';
    }
  });
})();

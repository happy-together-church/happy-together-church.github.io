/* ============================================================
   더불어행복한교회 — 관리자 스크립트
   구글 로그인(ADMIN_EMAIL) → 게시글 관리 + 문의 관리
   ============================================================ */

/* ---------- 유틸 ---------- */
function esc(s) {
  return String(s ?? '')
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
function fmtDateTime(v) {
  if (!v) return '';
  const d = v.toDate ? v.toDate() : new Date(v);
  if (isNaN(d)) return typeof v === 'string' ? v : '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}. ${p(d.getMonth() + 1)}. ${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtDate(v) {
  if (!v) return '';
  const d = v.toDate ? v.toDate() : new Date(v);
  if (isNaN(d)) return typeof v === 'string' ? v : '';
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}
const CATEGORIES = {
  sermon:   { label: '주일설교', cls: 'cat-sermon' },
  bulletin: { label: '주보',     cls: 'cat-bulletin' },
  column:   { label: '목회칼럼', cls: 'cat-column' },
  news:     { label: '교회소식', cls: 'cat-news' },
};

/* ---------- Firebase ---------- */
let db, auth, storage;
const configReady = typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';

if (!configReady) {
  window.addEventListener('DOMContentLoaded', () => {
    const err = document.getElementById('loginErr');
    if (err) { err.hidden = false; err.textContent = 'firebase-config.js 설정이 필요합니다. (README 참고)'; }
    const btn = document.getElementById('loginBtn');
    if (btn) btn.disabled = true;
  });
} else {
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();

  const googleProvider = new firebase.auth.GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  const loginScreen = document.getElementById('loginScreen');
  const adminShell  = document.getElementById('adminShell');
  const loginErr    = document.getElementById('loginErr');

  /* 로그인 */
  document.getElementById('loginBtn').addEventListener('click', () => {
    auth.signInWithPopup(googleProvider).catch(err => {
      if (err.code === 'auth/popup-blocked') auth.signInWithRedirect(googleProvider);
      else showToast('로그인 실패: ' + (err.code || err.message), true);
    });
  });
  document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

  /* 인증 상태 */
  auth.onAuthStateChanged(user => {
    if (!user) {
      loginScreen.style.display = 'grid';
      adminShell.style.display = 'none';
      return;
    }
    if (user.email !== ADMIN_EMAIL) {
      loginErr.hidden = false;
      loginErr.textContent = '관리자 권한이 없는 계정이에요. (' + user.email + ')';
      auth.signOut();
      return;
    }
    // 관리자 확인 완료
    loginScreen.style.display = 'none';
    adminShell.style.display = 'block';
    document.getElementById('auName').textContent = user.displayName || user.email;
    const photo = document.getElementById('auPhoto');
    if (user.photoURL) photo.src = user.photoURL; else photo.style.visibility = 'hidden';
    startPosts();
    startInquiries();
  });

  /* 탭 전환 */
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.panel;
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + key));
    });
  });

  /* ══════════ 게시글 관리 ══════════ */
  const postForm    = document.getElementById('postForm');
  const postList    = document.getElementById('postList');
  const postSubmit  = document.getElementById('postSubmit');
  const postCancel  = document.getElementById('postCancel');
  const postFormTitle = document.getElementById('postFormTitle');
  let editing = { imageUrl: '', fileUrl: '' };

  async function uploadFile(file, folder) {
    const safe = file.name.replace(/[^\w.\-]/g, '_');
    const ref = storage.ref().child(`${folder}/${Date.now()}_${safe}`);
    await ref.put(file);
    return ref.getDownloadURL();
  }

  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('postId').value;
    const category = (postForm.querySelector('input[name="pcat"]:checked') || {}).value || 'news';
    const title = document.getElementById('pTitle').value.trim();
    const date  = document.getElementById('pDate').value;
    const body  = document.getElementById('pBody').value.trim();
    const link  = document.getElementById('pLink').value.trim();
    const imgFile  = document.getElementById('pImage').files[0];
    const fileFile = document.getElementById('pFile').files[0];
    if (!title || !date) { showToast('제목과 날짜는 꼭 입력해 주세요.', true); return; }

    postSubmit.disabled = true;
    postSubmit.textContent = '저장 중…';
    try {
      let imageUrl = editing.imageUrl || '';
      let fileUrl  = editing.fileUrl || '';
      if (imgFile)  imageUrl = await uploadFile(imgFile, 'posts/images');
      if (fileFile) fileUrl  = await uploadFile(fileFile, 'posts/files');

      const data = { category, title, date, body, link, imageUrl, fileUrl };
      if (id) {
        await db.collection('posts').doc(id).update(data);
        showToast('게시글이 수정되었어요.');
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('posts').add(data);
        showToast('게시글이 등록되었어요.');
      }
      resetPostForm();
    } catch (err) {
      console.error(err);
      showToast('저장에 실패했어요. 잠시 후 다시 시도해 주세요.', true);
    }
    postSubmit.disabled = false;
    postSubmit.textContent = id ? '수정 저장' : '게시글 등록';
  });

  postCancel.addEventListener('click', resetPostForm);

  function resetPostForm() {
    postForm.reset();
    document.getElementById('postId').value = '';
    editing = { imageUrl: '', fileUrl: '' };
    postCancel.hidden = true;
    postSubmit.textContent = '게시글 등록';
    postFormTitle.textContent = '새 게시글 등록';
    document.querySelector('input[name="pcat"][value="sermon"]').checked = true;
  }

  window.__editPost = function (id) {
    db.collection('posts').doc(id).get().then(doc => {
      if (!doc.exists) return;
      const d = doc.data();
      document.getElementById('postId').value = id;
      document.getElementById('pTitle').value = d.title || '';
      document.getElementById('pDate').value = d.date || '';
      document.getElementById('pBody').value = d.body || '';
      document.getElementById('pLink').value = d.link || '';
      const radio = document.querySelector(`input[name="pcat"][value="${d.category}"]`);
      if (radio) radio.checked = true;
      editing = { imageUrl: d.imageUrl || '', fileUrl: d.fileUrl || '' };
      postCancel.hidden = false;
      postSubmit.textContent = '수정 저장';
      postFormTitle.textContent = '게시글 수정';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  window.__deletePost = function (id) {
    if (!confirm('이 게시글을 삭제할까요? 되돌릴 수 없어요.')) return;
    db.collection('posts').doc(id).delete()
      .then(() => showToast('게시글을 삭제했어요.'))
      .catch(() => showToast('삭제에 실패했어요.', true));
  };

  function startPosts() {
    db.collection('posts').orderBy('createdAt', 'desc').onSnapshot(snap => {
      document.getElementById('postCount').textContent = snap.size;
      if (snap.empty) { postList.innerHTML = '<p class="empty">아직 등록된 게시글이 없어요. 첫 소식을 남겨보세요!</p>'; return; }
      postList.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        const meta = CATEGORIES[d.category] || { label: '소식', cls: 'cat-news' };
        const thumb = d.imageUrl
          ? `<img class="row-thumb" src="${esc(d.imageUrl)}" alt="" />`
          : `<img class="row-thumb" src="images/emblem.png" alt="" style="object-fit:contain; padding:8px;" />`;
        return `<div class="row-item">
          ${thumb}
          <div class="row-main">
            <div class="rm-title"><span class="post-cat ${meta.cls}" style="margin-right:8px;">${meta.label}</span>${esc(d.title)}</div>
            <div class="rm-meta">${esc(fmtDate(d.date))}${d.link ? ' · 링크' : ''}${d.fileUrl ? ' · 첨부' : ''}</div>
          </div>
          <div class="row-actions">
            <button class="mini-btn" onclick="__editPost('${doc.id}')">수정</button>
            <button class="mini-btn danger" onclick="__deletePost('${doc.id}')">삭제</button>
          </div>
        </div>`;
      }).join('');
    }, err => {
      console.error(err);
      postList.innerHTML = '<p class="empty">목록을 불러오지 못했어요.</p>';
    });
  }

  /* ══════════ 문의 관리 ══════════ */
  const inqList = document.getElementById('inqList');
  let inqFilter = 'all';
  let inqDocs = [];

  document.querySelectorAll('.filter-tab[data-inq]').forEach(tab => {
    tab.addEventListener('click', () => {
      inqFilter = tab.dataset.inq;
      document.querySelectorAll('.filter-tab[data-inq]').forEach(t => t.classList.toggle('active', t === tab));
      renderInquiries();
    });
  });

  function startInquiries() {
    db.collection('inquiries').orderBy('createdAt', 'desc').onSnapshot(snap => {
      inqDocs = snap.docs.map(doc => ({ id: doc.id, d: doc.data() }));
      const newCount = inqDocs.filter(x => x.d.status !== 'answered').length;
      const badge = document.getElementById('newInqBadge');
      badge.textContent = newCount;
      badge.classList.toggle('zero', newCount === 0);
      renderInquiries();
    }, err => {
      console.error(err);
      inqList.innerHTML = '<p class="empty">문의를 불러오지 못했어요.</p>';
    });
  }

  function renderInquiries() {
    let docs = inqDocs;
    if (inqFilter === 'received') docs = inqDocs.filter(x => x.d.status !== 'answered');
    else if (inqFilter === 'answered') docs = inqDocs.filter(x => x.d.status === 'answered');
    if (!docs.length) { inqList.innerHTML = '<p class="empty">해당하는 문의가 없어요.</p>'; return; }

    inqList.innerHTML = docs.map(({ id, d }) => {
      const answered = d.status === 'answered';
      return `<div class="inq-card ${answered ? 'answered' : ''}">
        <div class="inq-top">
          <div class="inq-badges">
            <span class="inq-type">${esc(d.type || '문의')}</span>
            <span class="inq-status ${answered ? 'st-answered' : 'st-received'}">${answered ? '답변 완료' : '확인 대기'}</span>
          </div>
          <span class="inq-date">${esc(fmtDateTime(d.createdAt))}</span>
        </div>
        <div class="inq-who">보내신 분: <b>${esc(d.name)}</b></div>
        <div class="inq-contact">${esc(d.contact)}</div>
        <div class="inq-message">${esc(d.message)}</div>
        <div class="inq-ref">조회번호: ${esc(id)}</div>
        <div class="inq-reply-box">
          <textarea id="reply-${id}" placeholder="답변 내용을 적어 주세요. (문의하신 분이 조회번호로 확인할 수 있어요)">${esc(d.reply || '')}</textarea>
          <div class="inq-reply-actions">
            <button class="btn btn-primary" style="padding:10px 20px; font-size:14.5px;" onclick="__saveReply('${id}')">답변 저장 &amp; 완료 처리</button>
            ${answered ? `<button class="mini-btn" onclick="__reopen('${id}')">대기로 되돌리기</button>` : ''}
            <button class="mini-btn danger" onclick="__deleteInq('${id}')">삭제</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  window.__saveReply = function (id) {
    const reply = document.getElementById('reply-' + id).value.trim();
    db.collection('inquiries').doc(id).update({
      reply, status: 'answered',
      answeredAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).then(() => showToast('답변을 저장하고 완료 처리했어요.'))
      .catch(() => showToast('저장에 실패했어요.', true));
  };
  window.__reopen = function (id) {
    db.collection('inquiries').doc(id).update({ status: 'received' })
      .then(() => showToast('확인 대기 상태로 되돌렸어요.'))
      .catch(() => showToast('처리에 실패했어요.', true));
  };
  window.__deleteInq = function (id) {
    if (!confirm('이 문의를 삭제할까요? 되돌릴 수 없어요.')) return;
    db.collection('inquiries').doc(id).delete()
      .then(() => showToast('문의를 삭제했어요.'))
      .catch(() => showToast('삭제에 실패했어요.', true));
  };
}

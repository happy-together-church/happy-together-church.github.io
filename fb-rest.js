/* ============================================================
   Firestore REST API 통신 모듈
   - Firestore 실시간 SDK(스트리밍) 연결이 일부 네트워크에서
     조용히 멈추는 문제를 피하기 위해, 일반 HTTPS(fetch)로 통신.
   - FIREBASE_CONFIG (firebase-config.js) 가 먼저 로드되어 있어야 함.
   ============================================================ */
(function () {
  if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.projectId || FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
    window.FB = null;
    return;
  }
  const PROJECT = FIREBASE_CONFIG.projectId;
  const KEY = FIREBASE_CONFIG.apiKey;
  const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const TS_FIELDS = ['createdAt', 'answeredAt']; // 타임스탬프로 저장할 필드

  // ---- Firestore 타입 값 → JS 값 ----
  function fromVal(v) {
    if (v == null) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue; // ISO 문자열
    if ('nullValue' in v) return null;
    if ('mapValue' in v) {
      const o = {}; const f = (v.mapValue && v.mapValue.fields) || {};
      for (const k in f) o[k] = fromVal(f[k]);
      return o;
    }
    if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(fromVal);
    return null;
  }
  // ---- Firestore 문서 → {id, ...fields} ----
  function docToObj(doc) {
    const o = { id: doc.name.split('/').pop() };
    const f = doc.fields || {};
    for (const k in f) o[k] = fromVal(f[k]);
    return o;
  }
  // ---- JS 객체 → Firestore fields ----
  function toFields(obj) {
    const fields = {};
    for (const k in obj) {
      const val = obj[k];
      if (TS_FIELDS.includes(k)) {
        fields[k] = { timestampValue: val || new Date().toISOString() };
      } else if (val === null || val === undefined) {
        fields[k] = { nullValue: null };
      } else if (typeof val === 'string') {
        fields[k] = { stringValue: val };
      } else if (typeof val === 'boolean') {
        fields[k] = { booleanValue: val };
      } else if (typeof val === 'number') {
        fields[k] = Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
      } else {
        fields[k] = { stringValue: String(val) };
      }
    }
    return fields;
  }

  async function req(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error?.message || ''; } catch (e) {}
      const err = new Error('HTTP ' + res.status + (detail ? ' · ' + detail : ''));
      err.status = res.status;
      throw err;
    }
    return res;
  }

  window.FB = {
    // 컬렉션 전체 읽기 → [{id, ...}]
    async list(collection, token) {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const res = await req(`${BASE}/${collection}?key=${KEY}&pageSize=300`, { headers });
      const data = await res.json();
      return (data.documents || []).map(docToObj);
    },
    // 문서 1개 읽기 → {id, ...} 또는 null
    async get(collection, id, token) {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      try {
        const res = await req(`${BASE}/${collection}/${encodeURIComponent(id)}?key=${KEY}`, { headers });
        return docToObj(await res.json());
      } catch (e) { if (e.status === 404) return null; throw e; }
    },
    // 생성 (자동 ID) → {id, ...}
    async create(collection, obj, token) {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = 'Bearer ' + token;
      const res = await req(`${BASE}/${collection}?key=${KEY}`, {
        method: 'POST', headers, body: JSON.stringify({ fields: toFields(obj) })
      });
      return docToObj(await res.json());
    },
    // 수정 (지정 필드만) → {id, ...}
    async update(collection, id, obj, token) {
      const mask = Object.keys(obj).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = 'Bearer ' + token;
      const res = await req(`${BASE}/${collection}/${encodeURIComponent(id)}?key=${KEY}&${mask}`, {
        method: 'PATCH', headers, body: JSON.stringify({ fields: toFields(obj) })
      });
      return docToObj(await res.json());
    },
    // 삭제
    async remove(collection, id, token) {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      await req(`${BASE}/${collection}/${encodeURIComponent(id)}?key=${KEY}`, { method: 'DELETE', headers });
    },
    nowISO() { return new Date().toISOString(); }
  };
})();

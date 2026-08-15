// ---------- ストレージ ----------
const LS_KEYS = { people: 'enlogApp_people' };

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

let people = loadJSON(LS_KEYS.people, []);

function savePeople() {
  try {
    localStorage.setItem(LS_KEYS.people, JSON.stringify(people));
    return true;
  } catch {
    toast('保存容量の上限に達しました。写真を減らすかサイズを小さくしてください。', 3500);
    return false;
  }
}

// ---------- 関係性の定義 ----------
const RELATIONS = [
  { key: 'friend', label: '友人', icon: '👬' },
  { key: 'lover', label: '恋人', icon: '💑' },
  { key: 'family', label: '家族', icon: '👪' },
  { key: 'acquaintance', label: '知人', icon: '🙂' },
  { key: 'work', label: '仕事', icon: '💼' },
  { key: 'other', label: 'その他', icon: '⭐' },
];

// ---------- ユーティリティ ----------
const $ = (sel) => document.querySelector(sel);

function toast(msg, ms = 2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, ms);
}

function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderChipList(sel, items) {
  const el = $(sel);
  el.innerHTML = '';
  if (!items || items.length === 0) {
    el.innerHTML = '<span class="hint">未登録</span>';
    return;
  }
  items.forEach((t) => {
    const s = document.createElement('span');
    s.className = 'chip';
    s.textContent = t;
    el.appendChild(s);
  });
}

function avatarPlaceholder(person) {
  const rel = RELATIONS.find((r) => r.key === person.relation) || RELATIONS[RELATIONS.length - 1];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="50" fill="#e5e7eb"/><text x="50" y="63" font-size="46" text-anchor="middle">${rel.icon}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

async function resizeImage(file, maxWidth, quality) {
  if (window.createImageBitmap) {
    try {
      const probe = await createImageBitmap(file);
      const scale = Math.min(1, maxWidth / probe.width);
      const w = Math.round(probe.width * scale);
      const h = Math.round(probe.height * scale);
      probe.close();
      const bitmap = await createImageBitmap(file, { resizeWidth: w, resizeHeight: h, resizeQuality: 'medium' });
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      return canvas.toDataURL('image/jpeg', quality);
    } catch {
      // フォールバックへ
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
    reader.onload = () => {
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました。解像度が大きすぎる可能性があります。'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- 日付ユーティリティ ----------
function parseDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function formatMD(dateStr) {
  const p = parseDate(dateStr);
  return p ? `${p.m}月${p.d}日` : '';
}

function nextOccurrence(dateStr) {
  const p = parseDate(dateStr);
  if (!p) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let next = new Date(now.getFullYear(), p.m - 1, p.d);
  if (next < now) next = new Date(now.getFullYear() + 1, p.m - 1, p.d);
  const days = Math.round((next - now) / 86400000);
  return { next, days };
}

function calcAge(dateStr) {
  const p = parseDate(dateStr);
  if (!p) return null;
  const now = new Date();
  let age = now.getFullYear() - p.y;
  const hadBirthday = (now.getMonth() + 1 > p.m) || (now.getMonth() + 1 === p.m && now.getDate() >= p.d);
  if (!hadBirthday) age--;
  return age >= 0 ? age : null;
}

function yearsSince(dateStr) {
  const p = parseDate(dateStr);
  if (!p) return null;
  const now = new Date();
  let years = now.getFullYear() - p.y;
  const passed = (now.getMonth() + 1 > p.m) || (now.getMonth() + 1 === p.m && now.getDate() >= p.d);
  if (!passed) years--;
  return years;
}

// ---------- タブ切り替え ----------
function switchView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  $(`#view-${name}`).classList.add('active');
  document.querySelector(`.tab-btn[data-view="${name}"]`).classList.add('active');
}
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// ---------- オーバーレイ ----------
function openOverlay(id) { $(`#${id}`).hidden = false; }
function closeOverlay(id) { $(`#${id}`).hidden = true; }

// ---------- 一覧・検索・絞り込み ----------
let selectedRelationFilter = 'all';
let searchQuery = '';

function renderRelationFilterChips() {
  const el = $('#relation-filter');
  el.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'chip-filter-btn' + (selectedRelationFilter === 'all' ? ' active' : '');
  allBtn.textContent = 'すべて';
  allBtn.addEventListener('click', () => { selectedRelationFilter = 'all'; renderRelationFilterChips(); renderPeopleList(); });
  el.appendChild(allBtn);
  RELATIONS.forEach((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-filter-btn' + (selectedRelationFilter === r.key ? ' active' : '');
    b.textContent = `${r.icon} ${r.label}`;
    b.addEventListener('click', () => { selectedRelationFilter = r.key; renderRelationFilterChips(); renderPeopleList(); });
    el.appendChild(b);
  });
}

function getFilteredPeople() {
  return people.filter((p) => {
    if (selectedRelationFilter !== 'all' && p.relation !== selectedRelationFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hay = [p.name, p.kana, p.memo, ...(p.tags || []), ...(p.foodLike || []), ...(p.foodDislike || []), ...(p.hobbies || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (a.kana || a.name).localeCompare(b.kana || b.name, 'ja'));
}

function renderPeopleList() {
  const container = $('#people-list');
  container.innerHTML = '';
  const filtered = getFilteredPeople();
  $('#people-empty-hint').hidden = filtered.length > 0;
  filtered.forEach((p) => {
    const rel = RELATIONS.find((r) => r.key === p.relation) || RELATIONS[RELATIONS.length - 1];
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
      <img class="entry-thumb round" src="${p.photo || avatarPlaceholder(p)}" alt="">
      <div class="entry-main">
        <div class="entry-name">${escapeHtml(p.name)}</div>
        <div class="entry-sub">
          <span class="badge" data-relation="${p.relation}">${rel.icon} ${escapeHtml(rel.label)}</span>
          ${p.birthday ? `🎂 ${escapeHtml(formatMD(p.birthday))}` : ''}
        </div>
      </div>`;
    div.addEventListener('click', () => openDetail(p.id));
    container.appendChild(div);
  });
}

$('#search-input').addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  renderPeopleList();
});

// ---------- ホーム ----------
function renderHome() {
  const events = [];
  people.forEach((p) => {
    if (p.birthday) {
      const occ = nextOccurrence(p.birthday);
      if (occ) events.push({ person: p, label: '🎂 誕生日', days: occ.days });
    }
    (p.anniversaries || []).forEach((a) => {
      const occ = nextOccurrence(a.date);
      if (occ) events.push({ person: p, label: `🎉 ${a.label || '記念日'}`, days: occ.days });
    });
  });
  events.sort((a, b) => a.days - b.days);
  const upcoming = events.filter((e) => e.days <= 60);

  const upEl = $('#upcoming-list');
  upEl.innerHTML = '';
  $('#upcoming-empty-hint').hidden = upcoming.length > 0;
  upcoming.slice(0, 20).forEach((e) => {
    const daysLabel = e.days === 0 ? '🎊 今日！' : `${e.days}日後`;
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
      <img class="entry-thumb round" src="${e.person.photo || avatarPlaceholder(e.person)}" alt="">
      <div class="entry-main">
        <div class="entry-name">${escapeHtml(e.person.name)}</div>
        <div class="entry-sub">${escapeHtml(e.label)}</div>
      </div>
      <div class="entry-cal">${daysLabel}</div>`;
    div.addEventListener('click', () => openDetail(e.person.id));
    upEl.appendChild(div);
  });

  const recent = [...people].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  const recEl = $('#recent-list');
  recEl.innerHTML = '';
  $('#recent-empty-hint').hidden = recent.length > 0;
  recent.forEach((p) => {
    const rel = RELATIONS.find((r) => r.key === p.relation) || RELATIONS[RELATIONS.length - 1];
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
      <img class="entry-thumb round" src="${p.photo || avatarPlaceholder(p)}" alt="">
      <div class="entry-main">
        <div class="entry-name">${escapeHtml(p.name)}</div>
        <div class="entry-sub"><span class="badge" data-relation="${p.relation}">${rel.icon} ${escapeHtml(rel.label)}</span></div>
      </div>`;
    div.addEventListener('click', () => openDetail(p.id));
    recEl.appendChild(div);
  });

  $('#header-count').textContent = people.length > 0 ? `${people.length}人` : '';
}

function renderAll() {
  renderHome();
  renderPeopleList();
}

// ---------- 人物詳細 ----------
let currentDetailId = null;

function openDetail(id) {
  currentDetailId = id;
  const p = people.find((x) => x.id === id);
  if (!p) return;
  renderDetail(p);
  openOverlay('overlay-detail');
}

function renderDetail(p) {
  $('#detail-name').textContent = p.name;
  $('#detail-kana').textContent = p.kana || '';
  const rel = RELATIONS.find((r) => r.key === p.relation) || RELATIONS[RELATIONS.length - 1];
  const badge = $('#detail-relation');
  badge.textContent = `${rel.icon} ${rel.label}${p.relation === 'other' && p.relationOther ? `（${p.relationOther}）` : ''}`;
  badge.dataset.relation = p.relation;
  $('#detail-photo').src = p.photo || avatarPlaceholder(p);

  const tagsEl = $('#detail-tags');
  tagsEl.innerHTML = '';
  (p.tags || []).forEach((t) => {
    const s = document.createElement('span');
    s.className = 'chip';
    s.textContent = t;
    tagsEl.appendChild(s);
  });

  const dateItems = [];
  if (p.birthday) {
    const age = calcAge(p.birthday);
    dateItems.push({ label: '🎂 誕生日', date: p.birthday, extra: age != null ? `${age}歳` : '' });
  }
  (p.anniversaries || []).forEach((a) => {
    const y = yearsSince(a.date);
    dateItems.push({ label: `🎉 ${a.label || '記念日'}`, date: a.date, extra: (y != null && y >= 0) ? `${y}年目` : '' });
  });
  const datesEl = $('#detail-dates');
  datesEl.innerHTML = '';
  if (dateItems.length === 0) {
    datesEl.innerHTML = '<p class="hint">登録されていません。</p>';
  } else {
    dateItems.forEach((d) => {
      const occ = nextOccurrence(d.date);
      const div = document.createElement('div');
      div.className = 'date-item';
      div.innerHTML = `
        <div>
          <div class="date-item-label">${escapeHtml(d.label)}</div>
          <div class="date-item-value">${escapeHtml(formatMD(d.date))}${d.extra ? `（${escapeHtml(d.extra)}）` : ''}</div>
        </div>
        <span class="date-item-days">${occ ? (occ.days === 0 ? '今日' : occ.days + '日後') : ''}</span>`;
      datesEl.appendChild(div);
    });
  }

  renderChipList('#detail-food-like', p.foodLike);
  renderChipList('#detail-food-dislike', p.foodDislike);
  renderChipList('#detail-hobbies', p.hobbies);

  $('#detail-memo').textContent = p.memo || '（メモはありません）';

  $('#interaction-date').value = todayISO();
  $('#interaction-text').value = '';
  renderInteractions(p);
}

$('#btn-detail-back').addEventListener('click', () => closeOverlay('overlay-detail'));
$('#btn-detail-edit').addEventListener('click', () => {
  const id = currentDetailId;
  closeOverlay('overlay-detail');
  openForm(id);
});
$('#btn-detail-delete').addEventListener('click', () => {
  const p = people.find((x) => x.id === currentDetailId);
  if (!p) return;
  if (!confirm(`${p.name}さんを削除しますか？この操作は取り消せません。`)) return;
  people = people.filter((x) => x.id !== currentDetailId);
  savePeople();
  closeOverlay('overlay-detail');
  renderAll();
  toast('削除しました');
});

// ---------- やりとり履歴 ----------
function renderInteractions(p) {
  const list = $('#interaction-list');
  list.innerHTML = '';
  const items = [...(p.interactions || [])].sort((a, b) => b.date.localeCompare(a.date));
  $('#interaction-empty-hint').hidden = items.length > 0;
  items.forEach((it) => {
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
      <div class="entry-main">
        <div class="entry-name">${escapeHtml(formatMD(it.date))}</div>
        <div class="entry-sub" style="display:block">${escapeHtml(it.text)}</div>
      </div>
      <button class="entry-del" data-id="${it.id}" aria-label="削除">🗑️</button>`;
    list.appendChild(div);
  });
  list.querySelectorAll('.entry-del').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p2 = people.find((x) => x.id === currentDetailId);
      p2.interactions = (p2.interactions || []).filter((x) => x.id !== btn.dataset.id);
      p2.updatedAt = Date.now();
      savePeople();
      renderDetail(p2);
      renderAll();
    });
  });
}

$('#btn-add-interaction').addEventListener('click', () => {
  const date = $('#interaction-date').value || todayISO();
  const text = $('#interaction-text').value.trim();
  if (!text) { toast('内容を入力してください'); return; }
  const p = people.find((x) => x.id === currentDetailId);
  p.interactions = p.interactions || [];
  p.interactions.push({ id: uid(), date, text });
  p.updatedAt = Date.now();
  savePeople();
  $('#interaction-text').value = '';
  renderDetail(p);
  renderAll();
  toast('追加しました');
});

// ---------- 追加・編集フォーム ----------
let editingPersonId = null;
let formPhotoDataUrl = null;
let formAnniversaries = [];

function renderRelationSelect() {
  const el = $('#f-relation');
  el.innerHTML = '';
  RELATIONS.forEach((r) => {
    const opt = document.createElement('option');
    opt.value = r.key;
    opt.textContent = `${r.icon} ${r.label}`;
    el.appendChild(opt);
  });
}

function toggleRelationOtherField() {
  $('#f-relation-other-wrap').hidden = $('#f-relation').value !== 'other';
}
$('#f-relation').addEventListener('change', toggleRelationOtherField);

function openForm(id) {
  editingPersonId = id || null;
  const p = id ? people.find((x) => x.id === id) : null;
  $('#form-title').textContent = p ? '人を編集' : '人を追加';
  $('#f-name').value = p?.name || '';
  $('#f-kana').value = p?.kana || '';
  $('#f-relation').value = p?.relation || 'friend';
  toggleRelationOtherField();
  $('#f-relation-other').value = p?.relationOther || '';
  $('#f-tags').value = (p?.tags || []).join(', ');
  $('#f-birthday').value = p?.birthday || '';
  $('#f-memo').value = p?.memo || '';
  $('#f-food-like').value = (p?.foodLike || []).join(', ');
  $('#f-food-dislike').value = (p?.foodDislike || []).join(', ');
  $('#f-hobby').value = (p?.hobbies || []).join(', ');
  formAnniversaries = p ? [...(p.anniversaries || [])] : [];
  formPhotoDataUrl = p?.photo || null;
  $('#f-anniv-label').value = '';
  $('#f-anniv-date').value = '';
  updateFormPhotoPreview();
  renderFormAnniversaries();
  openOverlay('overlay-form');
}

$('#btn-add-person').addEventListener('click', () => openForm(null));
$('#btn-form-cancel').addEventListener('click', () => closeOverlay('overlay-form'));

// 写真
async function handleFormPhotoInput(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    formPhotoDataUrl = await resizeImage(file, 640, 0.82);
    updateFormPhotoPreview();
  } catch (err) {
    toast(err.message || '写真の読み込みに失敗しました');
  }
  e.target.value = '';
}
$('#form-photo-camera').addEventListener('change', handleFormPhotoInput);
$('#form-photo-gallery').addEventListener('change', handleFormPhotoInput);
$('#btn-form-remove-photo').addEventListener('click', () => {
  formPhotoDataUrl = null;
  updateFormPhotoPreview();
});
function updateFormPhotoPreview() {
  const img = $('#form-photo-preview');
  const ph = $('#form-photo-placeholder');
  const rm = $('#btn-form-remove-photo');
  if (formPhotoDataUrl) {
    img.src = formPhotoDataUrl;
    img.hidden = false;
    ph.hidden = true;
    rm.hidden = false;
  } else {
    img.hidden = true;
    ph.hidden = false;
    rm.hidden = true;
  }
}

// 記念日
$('#btn-add-anniv').addEventListener('click', () => {
  const label = $('#f-anniv-label').value.trim();
  const date = $('#f-anniv-date').value;
  if (!date) { toast('日付を入力してください'); return; }
  formAnniversaries.push({ id: uid(), label: label || '記念日', date });
  $('#f-anniv-label').value = '';
  $('#f-anniv-date').value = '';
  renderFormAnniversaries();
});
function renderFormAnniversaries() {
  const el = $('#form-anniversaries');
  el.innerHTML = '';
  if (formAnniversaries.length === 0) {
    el.innerHTML = '<p class="hint">まだ追加されていません。</p>';
    return;
  }
  formAnniversaries.forEach((a) => {
    const div = document.createElement('div');
    div.className = 'repeatable-item';
    div.innerHTML = `<span>${escapeHtml(a.label)}: ${escapeHtml(formatMD(a.date))}</span><button type="button" class="repeatable-del" data-id="${a.id}" aria-label="削除">✕</button>`;
    el.appendChild(div);
  });
  el.querySelectorAll('.repeatable-del').forEach((btn) => {
    btn.addEventListener('click', () => {
      formAnniversaries = formAnniversaries.filter((x) => x.id !== btn.dataset.id);
      renderFormAnniversaries();
    });
  });
}

// 保存
$('#btn-save-person').addEventListener('click', () => {
  const name = $('#f-name').value.trim();
  if (!name) { toast('名前を入力してください'); return; }
  const relation = $('#f-relation').value;
  const relationOther = $('#f-relation-other').value.trim();
  const tags = $('#f-tags').value.split(',').map((t) => t.trim()).filter(Boolean);
  const birthday = $('#f-birthday').value;
  const kana = $('#f-kana').value.trim();
  const memo = $('#f-memo').value.trim();
  const foodLike = $('#f-food-like').value.split(',').map((t) => t.trim()).filter(Boolean);
  const foodDislike = $('#f-food-dislike').value.split(',').map((t) => t.trim()).filter(Boolean);
  const hobbies = $('#f-hobby').value.split(',').map((t) => t.trim()).filter(Boolean);
  const now = Date.now();

  if (editingPersonId) {
    const p = people.find((x) => x.id === editingPersonId);
    Object.assign(p, {
      name, kana, relation, relationOther, tags, birthday, memo, foodLike, foodDislike, hobbies,
      anniversaries: [...formAnniversaries],
      photo: formPhotoDataUrl,
      updatedAt: now,
    });
  } else {
    people.push({
      id: uid(), name, kana, relation, relationOther, tags, birthday, memo, foodLike, foodDislike, hobbies,
      anniversaries: [...formAnniversaries],
      photo: formPhotoDataUrl,
      interactions: [],
      createdAt: now,
      updatedAt: now,
    });
  }
  if (savePeople() === false) return;
  closeOverlay('overlay-form');
  renderAll();
  toast('保存しました');
});

// ---------- 設定: エクスポート・インポート・削除 ----------
$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ people }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `enlog_backup_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('エクスポートしました');
});

$('#btn-import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.people)) throw new Error('invalid');
      if (!confirm(`${data.people.length}人分のデータをインポートします。現在のデータは上書きされます。よろしいですか？`)) return;
      people = data.people;
      savePeople();
      renderAll();
      toast('インポートしました');
    } catch {
      toast('ファイルの形式が正しくありません');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

$('#btn-clear').addEventListener('click', () => {
  if (!confirm('全てのデータを削除します。この操作は取り消せません。よろしいですか？')) return;
  people = [];
  savePeople();
  renderAll();
  toast('削除しました');
});

// ---------- 初期化 ----------
renderRelationSelect();
renderRelationFilterChips();
renderAll();

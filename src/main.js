import ePub from 'epubjs';
import { get, set, del, keys } from 'idb-keyval';
import { createIcons, BookOpen, Headphones, Plus, Library, Bookmark, Settings2, Menu, ChevronLeft, ChevronRight, Play, Pause, X, Upload, ArrowUpRight, Volume2, SkipBack, SkipForward, Moon, Search, Trash2, List, Check, Leaf, Download, LoaderCircle } from 'lucide';
import { indexText, phraseRange, textPoint, domRange, charAtTime, offsetOf } from './text.js';
import { demoBook } from './demo.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icons = { BookOpen, Headphones, Plus, Library, Bookmark, Settings2, Menu, ChevronLeft, ChevronRight, Play, Pause, X, Upload, ArrowUpRight, Volume2, SkipBack, SkipForward, Moon, Search, Trash2, List, Check, Leaf, Download, LoaderCircle };
const icon = (name, cls = '') => `<i data-lucide="${name}" class="${cls}"></i>`;
const drawIcons = () => createIcons({ icons, attrs: { 'stroke-width': 1.6 } });
let prefs;
try { prefs = JSON.parse(localStorage.getItem('epubaudio-prefs') || '{}'); } catch { prefs = {}; }
prefs = { theme: 'original', font: '', size: 19, line: 1.8, rate: 1, volume: 1, provider: 'ai', follow: true, auto: true, ...prefs };
if(prefs.voiceCatalogVersion!==1){prefs.voice='';prefs.voiceName='';prefs.voiceCatalogVersion=1;}
const state = { library: [], current: null, book: null, rendition: null, chapter: 0, toc: [], playing: false, busy: false, token: 0, offset: 0, speechText: '', base: 0, key: '', serviceReady: false, voices: [], voicePage: 0, voiceSearch: '', audio: null, audioUrl: null, alignment: null, highlighted: '', selection: null, cached: null };
let sleepTimer, toastTimer, saveTimer, previewAudio;
const objectUrls = new Set();
const urlFor = blob => { const url = URL.createObjectURL(blob); objectUrls.add(url); return url; };

$('app').innerHTML = `
<aside class="sidebar">
  <a class="brand" href="#" id="brand"><span class="brand-mark">${icon('book-open')}</span><span>Epub<span class="brand-light">Audio</span></span></a>
  <div class="sidebar-label">KHÔNG GIAN CỦA BẠN</div>
  <nav><button class="nav-item active" id="nav-library">${icon('library')}<span>Thư viện</span><span class="count" id="book-count">0</span></button><button class="nav-item" id="nav-bookmarks">${icon('bookmark')}<span>Dấu trang</span></button><button class="nav-item" id="nav-voices">${icon('headphones')}<span>Giọng đọc AI</span><span class="tiny-dot"></span></button></nav>
  <div class="sidebar-bottom"><div class="quiet-card">${icon('leaf')}<p>Một trang sách.<br>Một khoảng lặng.</p><span>Dành chút thời gian cho mình.</span></div><button class="nav-item" id="nav-settings">${icon('settings-2')}<span>Tùy chỉnh đọc</span></button><div class="local-note"><span class="tiny-dot"></span> Sách lưu trên thiết bị của bạn</div></div>
</aside>
<button id="sidebar-backdrop" aria-label="Đóng thanh bên" hidden></button>
<main>
  <section id="library-view">
    <header class="topbar"><span>THƯ VIỆN CÁ NHÂN</span><div class="top-actions"><span class="local-chip">${icon('check')} Riêng tư trên thiết bị</span><button class="button primary" id="import-top">${icon('plus')} Thêm sách</button></div></header>
    <div class="library-content">
      <div class="greeting"><div><div class="eyebrow">ĐỌC CHẬM, NGHE SÂU</div><h1>Những trang sách,<br><em>theo nhịp của bạn.</em></h1><p>Mở một cuốn sách. Chọn một giọng đọc.<br>Để câu chuyện đưa bạn đến một nơi khác.</p><button class="text-button" id="demo">Khám phá với sách mẫu ${icon('arrow-up-right')}</button></div><div class="hero-art" aria-hidden="true"><div class="orb"></div><div class="book-art"><span>THE ART<br>OF<br><em>listening.</em></span><div class="book-lines"></div><small>EPUB AUDIO / VOL. 01</small></div><div class="sound-pill">${icon('headphones')}<div class="wave"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></div></div><div class="art-caption">Đọc bằng mắt. Cảm bằng tai.</div></div></div>
      <div id="continue-card"></div>
      <div class="shelf-header"><div><h2>Giá sách của bạn <span id="shelf-count">0 cuốn</span></h2><p>Những câu chuyện đang chờ được mở ra.</p></div><div class="shelf-tools"><label class="search-field">${icon('search')}<input id="search" placeholder="Tìm sách, tác giả…" aria-label="Tìm sách, tác giả" /></label><select id="sort" aria-label="Sắp xếp sách"><option value="recent">Gần đây nhất</option><option value="title">Tên sách A–Z</option></select></div></div>
      <div id="shelf" class="shelf"></div>
      <div class="library-footer"><span>EPUB · GIỮ NGUYÊN TRANG SÁCH</span><span>Đọc tiếp từ nơi bạn đã dừng.</span></div>
    </div>
  </section>
  <section id="reader-view" hidden>
    <header class="reader-top"><button class="icon-button" id="toggle-sidebar" aria-label="Mở thanh bên" aria-expanded="false">${icon('menu')}</button><button class="icon-button" id="back-library" aria-label="Về thư viện">${icon('chevron-left')}</button><div class="reader-title"><strong id="reader-title"></strong><span id="chapter-title"></span></div><div class="reader-actions"><button class="icon-button" id="toc-button" aria-label="Mục lục">${icon('list')}</button><button class="icon-button" id="bookmark-button" aria-label="Thêm dấu trang">${icon('bookmark')}</button><button class="icon-button" id="reader-settings" aria-label="Tùy chỉnh đọc">${icon('settings-2')}</button></div></header>
    <div class="reading-area"><button class="page-turn prev" id="prev-page" aria-label="Trang trước">${icon('chevron-left')}</button><div id="viewer"></div><button class="page-turn next" id="next-page" aria-label="Trang sau">${icon('chevron-right')}</button><div class="reading-status"><span id="page-info"></span><span id="read-progress">0%</span></div></div>
    <div class="player"><div class="player-voice"><span class="player-avatar">${icon('headphones')}</span><div><strong id="player-voice-name">Giọng đọc AI</strong><button id="change-voice">Chọn giọng đọc ${icon('chevron-right')}</button></div></div><div class="player-main"><div class="player-controls"><button class="icon-button" id="prev-chapter" aria-label="Chương trước">${icon('skip-back')}</button><button class="play-button" id="play" aria-label="Bắt đầu nghe">${icon('play')}</button><button class="icon-button" id="next-chapter" aria-label="Chương sau">${icon('skip-forward')}</button><button class="rate-button" id="cycle-rate">1×</button></div><div class="audio-timeline"><span id="elapsed">0:00</span><input type="range" id="seek" min="0" max="100" value="0" step="0.1" aria-label="Vị trí audio" disabled/><span id="duration">--:--</span></div><div class="player-message" id="player-message">Nghe nguyên chương · Không thay đổi bố cục EPUB</div></div><div class="player-extras"><button class="icon-button" id="sleep-button" aria-label="Hẹn giờ ngủ">${icon('moon')}</button><label class="volume-control">${icon('volume-2')}<input type="range" id="volume" min="0" max="1" step="0.05" value="${prefs.volume}" aria-label="Âm lượng"/></label></div></div>
  </section>
</main>
<input id="file-input" type="file" accept=".epub,application/epub+zip" multiple hidden />
<dialog id="panel"><div class="panel-head"><div><div class="eyebrow" id="panel-eyebrow">EPUB AUDIO</div><h2 id="panel-title"></h2></div><button class="icon-button" id="close-panel" aria-label="Đóng">${icon('x')}</button></div><div id="panel-body"></div></dialog>
<div id="toast" role="status" aria-live="polite" hidden></div>
<div id="drop-overlay" hidden>${icon('upload')}<h2>Thả sách vào đây</h2><p>Thêm EPUB vào thư viện của bạn</p></div>`;

function notify(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6500); }
function fail(error) { console.error(error); notify(error?.message || 'Có lỗi xảy ra. Hãy thử lại.'); }
function safely(fn) { return (...args) => Promise.resolve().then(() => fn(...args)).catch(fail); }
function persistPrefs() { localStorage.setItem('epubaudio-prefs', JSON.stringify(prefs)); }
function openPanel(title, html, eyebrow = 'KHÔNG GIAN CỦA BẠN') { setSidebar(false); $('panel-title').textContent = title; $('panel-eyebrow').textContent = eyebrow; $('panel-body').innerHTML = html; if (!$('panel').open) $('panel').showModal(); drawIcons(); }
function saveBook() { if (!state.current) return; clearTimeout(saveTimer); const record = state.current; saveTimer = setTimeout(() => set(`book:${record.id}`, record).catch(fail), 300); }

async function refreshLibrary() {
  state.library = (await Promise.all((await keys()).filter(k => typeof k === 'string' && k.startsWith('book:')).map(k => get(k)))).filter(Boolean);
  renderShelf();
}
function cover(record, cls = '') {
  if (record.cover && !record.coverUrl) record.coverUrl = urlFor(record.cover);
  return record.coverUrl ? `<div class="book-cover ${cls}"><img src="${esc(record.coverUrl)}" alt="Bìa ${esc(record.title)}" /></div>` : `<div class="book-cover generated-cover ${cls}" style="--cover:${['#485e50','#8a6d51','#555e7b','#916957'][parseInt(record.id.slice(0, 2), 16) % 4]}"><small>EPUB AUDIO</small><span>${esc(record.title)}</span><div class="cover-emblem">${icon('leaf')}</div><small>${esc(record.author)}</small></div>`;
}
function renderShelf() {
  const query = $('search').value.toLocaleLowerCase('vi');
  const books = state.library.filter(b => `${b.title} ${b.author}`.toLocaleLowerCase('vi').includes(query)).sort($('sort').value === 'title' ? (a,b) => a.title.localeCompare(b.title, 'vi') : (a,b) => b.updated - a.updated);
  $('book-count').textContent = state.library.length; $('shelf-count').textContent = `${state.library.length} cuốn`;
  const recent = state.library.filter(b => b.cfi).sort((a,b) => b.updated - a.updated)[0];
  $('continue-card').innerHTML = recent ? `<button class="continue-card" data-open="${esc(recent.id)}"><span class="continue-icon">${icon('book-open')}</span><div><small>TIẾP TỤC CÂU CHUYỆN</small><strong>${esc(recent.title)}</strong><span>${esc(recent.author)} · ${Math.round((recent.progress || 0) * 100)}% đã đọc</span></div><span class="continue-cta">Đọc tiếp ${icon('arrow-up-right')}</span></button>` : '';
  $('shelf').innerHTML = books.map(b => `<article class="book-card"><button class="book-open" data-open="${esc(b.id)}" aria-label="Đọc ${esc(b.title)}">${cover(b)}<h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><div class="book-progress"><span style="width:${Math.round((b.progress || 0) * 100)}%"></span></div><div class="book-meta"><span>${b.cfi ? `${Math.round((b.progress || 0) * 100)}% đã đọc` : 'Chưa đọc'}</span><span>EPUB</span></div></button><button class="delete-book icon-button" data-delete="${esc(b.id)}" aria-label="Xóa ${esc(b.title)}">${icon('trash-2')}</button></article>`).join('') + `<button class="import-card" id="import-card">${icon('plus')}<strong>Thêm một câu chuyện</strong><span>Chọn hoặc kéo thả file EPUB</span><small>Sách của bạn, không gian của bạn.</small></button>`;
  if (query && !books.length) $('shelf').insertAdjacentHTML('afterbegin', '<p class="no-results">Không tìm thấy sách phù hợp.</p>');
  $('import-card').onclick = () => $('file-input').click();
  document.querySelectorAll('[data-open]').forEach(el => el.onclick = safely(() => openBook(el.dataset.open)));
  document.querySelectorAll('[data-delete]').forEach(el => el.onclick = () => deleteBook(el.dataset.delete));
  drawIcons();
}
function deleteBook(id) {
  const record = state.library.find(b => b.id === id);
  openPanel('Xóa khỏi thư viện?', `<p>“${esc(record.title)}” cùng tiến độ và dấu trang sẽ bị xóa trên thiết bị này.</p><div class="dialog-actions"><button class="button" id="cancel-delete">Giữ sách</button><button class="button danger" id="confirm-delete">Xóa sách</button></div>`);
  $('cancel-delete').onclick = () => $('panel').close();
  $('confirm-delete').onclick = safely(async () => {
    await del(`book:${id}`);
    for (const k of await keys()) if (typeof k === 'string' && k.startsWith(`audio:${id}:`)) await del(k);
    $('panel').close(); await refreshLibrary(); notify('Đã xóa sách và audio lưu của sách.');
  });
}
async function importBooks(files) {
  let firstId;
  $('import-top').disabled = true;
  try {
    for (const file of files) {
      if (!/\.epub$/i.test(file.name)) { notify('Chỉ hỗ trợ sách EPUB.'); continue; }
      if (file.size > 100 * 1024 * 1024) { notify('Sách quá lớn. Vui lòng chọn EPUB dưới 100 MB.'); continue; }
      notify(`Đang thêm ${file.name}…`);
      const buffer = await file.arrayBuffer();
      const id = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))].map(b => b.toString(16).padStart(2, '0')).join('');
      if (await get(`book:${id}`)) { firstId ??= id; notify('Sách đã có trong thư viện.'); continue; }
      let book;
      try {
        book = ePub(buffer); await Promise.race([book.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Không đọc được EPUB. Hãy kiểm tra file và bảo vệ DRM.')), 20000))]);
        const metadata = await book.loaded.metadata; let image = null;
        try { const coverUrl = await book.coverUrl(); if (coverUrl) image = await (await fetch(coverUrl)).blob(); } catch { /* Optional cover. */ }
        const record = { id, title: metadata.title || file.name.replace(/\.epub$/i, ''), author: metadata.creator || 'Chưa rõ tác giả', buffer, cover: image, updated: Date.now(), progress: 0, bookmarks: [] };
        await set(`book:${id}`, record); firstId ??= id;
      } finally { book?.destroy(); }
    }
    await refreshLibrary(); if (firstId && files.length === 1) await openBook(firstId);
  } finally { $('import-top').disabled = false; $('file-input').value = ''; }
}

async function openBook(id) {
  stopPlayback(); await flushRecord();
  state.rendition?.destroy(); state.book?.destroy(); state.current = await get(`book:${id}`);
  if (!state.current) throw new Error('Không tìm thấy sách trên thiết bị.');
  state.book = ePub(state.current.buffer.slice(0)); await state.book.ready;
  state.toc = (await state.book.loaded.navigation).toc;
  $('library-view').hidden = true; $('reader-view').hidden = false; document.body.classList.add('reading');
  $('reader-title').textContent = state.current.title;
  state.rendition = state.book.renderTo('viewer', { width: '100%', height: '100%', spread: 'auto', minSpreadWidth: 900, flow: 'paginated', allowScriptedContent: false, allowPopups: false });
  state.rendition.hooks.content.register(contents => {
    const style = contents.document.createElement('style'); style.textContent = '::highlight(epubaudio){background:#d5e3b4;color:inherit;text-decoration:underline;text-decoration-color:#8ca95e;text-decoration-thickness:2px}'; contents.document.head.appendChild(style);
    contents.document.addEventListener('keydown', keyboard);
    let lastDoubleClick=0;
    const readAtClick=safely(async event=>{
      if(event.button!==0 || event.target.closest?.('a,button,input,textarea,select'))return;
      if(performance.now()-lastDoubleClick<250)return;
      lastDoubleClick=performance.now();
      const doc=contents.document, index=indexText(doc);
      const point=textPoint(doc,index.entries,event.clientX,event.clientY,event.target);
      if(point==null)return notify('Hãy nhấp đúp trực tiếp lên chữ trong sách để đọc từ cụm đó.');
      const [start] = phraseRange(index.text, point);
      const end = index.text.length;
      stopPlayback(); state.chapter = contents.sectionIndex;
      state.selection = { start, end, chapter: contents.sectionIndex, continueReading: true };
      contents.window.getSelection()?.removeAllRanges();
      state.speechChapter=contents.sectionIndex; highlight(start);
      notify('Đã chọn cụm: '+index.text.slice(start,phraseRange(index.text,start)[1]));
      $('player-message').textContent = 'Đang đọc từ cụm vừa nhấn đúp…';
      await togglePlayback();
    });
    contents.document.addEventListener('dblclick',readAtClick);
    contents.document.addEventListener('click',event=>{
      if(event.detail===2){readAtClick(event);return;}
      const selection = contents.window.getSelection();
      if (!selection?.isCollapsed && selection?.rangeCount) {
        const range = selection.getRangeAt(0); const index = indexText(contents.document);
        const start = offsetOf(index.entries, range.startContainer, range.startOffset);
        const end = offsetOf(index.entries, range.endContainer, range.endOffset);
        if (end > start) { state.selection = { start, end, chapter: contents.sectionIndex }; $('player-message').textContent = `Đã chọn ${end - start} ký tự · Nhấn phát để nghe đoạn này`; }
      }
    });
  });
  state.rendition.on('relocated', location => {
    const previous = state.chapter; state.chapter = location.start.index;
    if (previous !== state.chapter && !state.following) { stopPlayback(); state.selection = null; }
    state.current.cfi = location.start.cfi; state.current.updated = Date.now();
    const percent = state.book.locations.length() ? state.book.locations.percentageFromCfi(location.start.cfi) : location.start.index / Math.max(1, state.book.spine.length);
    state.current.progress = Math.max(0, Math.min(1, percent)); saveBook();
    const section = state.book.spine.get(location.start.index); const label = findToc(state.toc, section.href)?.label || `Chương ${location.start.index + 1}`;
    $('chapter-title').textContent = label; $('read-progress').textContent = `${Math.round(state.current.progress * 100)}%`;
    $('page-info').textContent = `Chương ${location.start.index + 1} / ${state.book.spine.length} · Trang ${location.start.displayed.page} / ${location.start.displayed.total}`;
  });
  applyTheme();
  try { await state.rendition.display(state.current.cfi || undefined); } catch { await state.rendition.display(); }
  state.book.locations.generate(1600).then(() => { if (state.rendition && state.current?.id === id) state.rendition.reportLocation(); }).catch(() => {});
  updateVoiceLabel();
}
function findToc(items, href) { for (const item of items) { if (item.href?.split('#')[0] === href?.split('#')[0]) return item; const found = findToc(item.subitems || [], href); if (found) return found; } }
async function flushRecord() { clearTimeout(saveTimer); if (state.current) await set(`book:${state.current.id}`, state.current); }
async function goLibrary() { stopPlayback(); await flushRecord(); $('reader-view').hidden = true; $('library-view').hidden = false; document.body.classList.remove('reading'); setSidebar(false); state.rendition?.destroy(); state.book?.destroy(); state.rendition = null; state.book = null; state.current = null; await refreshLibrary(); }
function applyTheme() {
  document.body.dataset.theme = prefs.theme;
  if (!state.rendition) return;
  const colors = { original: null, paper: ['#faf8f1','#343a32'], light: ['#ffffff','#2e332e'], dark: ['#222822','#dedfd4'] }[prefs.theme];
  state.rendition.themes.registerCss('default', colors ? `body{background:${colors[0]} !important;color:${colors[1]} !important}p,span,h1,h2,h3,h4,li,blockquote{color:inherit !important}` : '/* Original EPUB theme */');
  if (prefs.font) state.rendition.themes.font(prefs.font); else state.rendition.themes.removeOverride('font-family');
  if (prefs.customSize) state.rendition.themes.fontSize(`${prefs.size}px`); else state.rendition.themes.removeOverride('font-size');
  if (prefs.customLine) state.rendition.themes.override('line-height', String(prefs.line)); else state.rendition.themes.removeOverride('line-height');
}
function settingsPanel() {
  openPanel('Trang sách theo ý bạn', `<p class="panel-intro">Bố cục EPUB được giữ nguyên. Font gốc là mặc định; bạn có thể tùy chỉnh khi muốn.</p><label class="field-label">NỀN TRANG</label><div class="theme-options">${[['original','Gốc'],['paper','Giấy ngà'],['light','Sáng'],['dark','Tối']].map(([value,label]) => `<button class="theme-option ${prefs.theme === value ? 'selected' : ''}" data-theme="${value}"><span class="theme-swatch ${value}">Aa</span>${label}</button>`).join('')}</div><label class="field-label" for="font">FONT CHỮ</label><select id="font" class="full-width"><option value="">Giữ font gốc của EPUB</option><option value="Georgia, serif">Georgia · có chân</option><option value="Arial, sans-serif">Arial · không chân</option><option value="Verdana, sans-serif">Verdana · dễ đọc</option></select><div class="range-field"><label for="font-size">Cỡ chữ <span id="size-label">${prefs.size}px</span></label><input id="font-size" type="range" min="14" max="32" value="${prefs.size}"/></div><div class="range-field"><label for="line-height">Giãn dòng <span id="line-label">${prefs.line}</span></label><input id="line-height" type="range" min="1.2" max="2.4" step="0.1" value="${prefs.line}"/></div><label class="toggle-row"><span>Theo vết và tự chuyển trang</span><input id="follow" type="checkbox" ${prefs.follow ? 'checked' : ''}/></label><label class="toggle-row"><span>Tự nghe chương tiếp theo</span><input id="auto-chapter" type="checkbox" ${prefs.auto ? 'checked' : ''}/></label><p class="small-note">EPUB bố cục cố định có thể không cho phép đổi font. Audio được lưu trên thiết bị để nghe lại.</p><button class="button full-width" id="restore-original">Khôi phục giao diện EPUB gốc</button><button class="button full-width" id="clear-audio" style="margin-top:10px">Xóa audio đã lưu trên thiết bị</button>`);
  $('font').value = prefs.font;
  document.querySelectorAll('.theme-option[data-theme]').forEach(el => el.onclick = () => { prefs.theme = el.dataset.theme; persistPrefs(); applyTheme(); settingsPanel(); });
  $('font').onchange = e => { prefs.font = e.target.value; persistPrefs(); applyTheme(); };
  $('font-size').oninput = e => { prefs.customSize = true; prefs.size = +e.target.value; $('size-label').textContent = `${prefs.size}px`; persistPrefs(); applyTheme(); };
  $('line-height').oninput = e => { prefs.customLine = true; prefs.line = +e.target.value; $('line-label').textContent = prefs.line; persistPrefs(); applyTheme(); };
  $('follow').onchange = e => { prefs.follow = e.target.checked; persistPrefs(); };
  $('auto-chapter').onchange = e => { prefs.auto = e.target.checked; persistPrefs(); };
  $('restore-original').onclick = () => { prefs.font = ''; prefs.customSize = false; prefs.customLine = false; prefs.theme = 'original'; persistPrefs(); applyTheme(); settingsPanel(); };
  $('clear-audio').onclick = safely(async () => { for (const key of await keys()) if (typeof key === 'string' && key.startsWith('audio:')) await del(key); notify('Đã xóa audio lưu. Sách và tiến độ vẫn được giữ.'); });
}

function tocPanel() {
  if (!state.book) return notify('Hãy mở một cuốn sách trước.');
  const items = (list) => list.map(item => `<li><button class="toc-link" data-href="${esc(item.href)}">${esc(item.label)}</button>${item.subitems?.length ? `<ul>${items(item.subitems)}</ul>` : ''}</li>`).join('');
  openPanel('Mục lục', `<p class="panel-intro">${esc(state.current.title)}</p><ul class="toc-list">${items(state.toc)}</ul>`);
  document.querySelectorAll('[data-href]').forEach(el => el.onclick = safely(async () => { stopPlayback(); state.current.listen = null; state.selection = null; await state.rendition.display(el.dataset.href); $('panel').close(); }));
}
async function addBookmark() {
  if (!state.current?.cfi) return;
  const record = state.current;
  if (record.bookmarks.some(b => b.cfi === record.cfi)) return notify('Trang này đã được đánh dấu.');
  record.bookmarks.push({ cfi: record.cfi, label: $('chapter-title').textContent, time: Date.now(), progress: record.progress });
  await flushRecord(); notify('Đã lưu dấu trang.');
}
async function bookmarksPanel() {
  await flushRecord(); await refreshLibrary();
  const entries = state.library.flatMap(book => (book.bookmarks || []).map(mark => ({ book, mark })));
  openPanel('Những trang muốn trở lại', entries.length ? `<div class="bookmark-list">${entries.map(({book,mark},i) => `<div class="bookmark-entry"><button data-mark="${i}"><strong>${esc(book.title)}</strong><span>${esc(mark.label)} · ${Math.round((mark.progress || 0) * 100)}%</span></button><button class="icon-button" data-unmark="${i}" aria-label="Xóa dấu trang">${icon('x')}</button></div>`).join('')}</div>` : `<div class="panel-empty">${icon('bookmark')}<p>Chưa có dấu trang.</p><span>Nhấn biểu tượng dấu trang khi đang đọc để lưu lại.</span></div>`);
  document.querySelectorAll('[data-mark]').forEach(el => el.onclick = safely(async () => { const { book, mark } = entries[+el.dataset.mark]; $('panel').close(); if (state.current?.id !== book.id) await openBook(book.id); stopPlayback(); await state.rendition.display(mark.cfi); }));
  document.querySelectorAll('[data-unmark]').forEach(el => el.onclick = safely(async () => { const { book, mark } = entries[+el.dataset.unmark]; book.bookmarks = book.bookmarks.filter(b => b.cfi !== mark.cfi); await set(`book:${book.id}`, book); if (state.current?.id === book.id) state.current.bookmarks = book.bookmarks; await bookmarksPanel(); }));
}

function voicesPanel() {
  openPanel('Kho giọng tiếng Việt', `<p class="panel-intro">Chỉ hiển thị giọng tiếng Việt trong ElevenLabs Voice Library. Nhấn chọn để thêm giọng vào tài khoản; có thể nghe mẫu trước. Gói miễn phí không hỗ trợ Voice Library qua API.</p><div class="provider-options"><button id="choose-ai" class="button ${prefs.provider === 'ai' ? 'primary' : ''}">${icon('headphones')} Giọng AI</button><button id="choose-device" class="button ${prefs.provider === 'device' ? 'primary' : ''}">Giọng thiết bị</button></div>${prefs.provider === 'ai' ? `<details ${state.serviceReady ? '' : 'open'}><summary>${state.serviceReady ? 'Đã cấu hình dịch vụ · đổi khóa cá nhân' : 'Kết nối ElevenLabs một lần'}</summary><label class="field-label" for="api-key">KHÓA ELEVENLABS CÁ NHÂN</label><div class="key-row"><input id="api-key" type="password" autocomplete="off" placeholder="Nhập khóa API của bạn" value="${esc(state.key)}"/><button class="button primary" id="connect-voices">Kết nối</button></div><p class="small-note">Khóa chỉ giữ trong bộ nhớ của phiên này, không lưu vào thư viện. Văn bản được gửi qua máy chủ EpubAudio tới ElevenLabs khi tạo audio và tính phí vào tài khoản của bạn. <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer">Lấy khóa API ↗</a></p></details><form id="voice-search-form" class="key-row"><input id="voice-search" placeholder="Tìm giọng tiếng Việt" value="${esc(state.voiceSearch)}"/><button class="button">Tìm</button></form><div id="voice-list" class="voice-list">${state.voices.length ? voiceCards() : '<div class="connection-empty">Kết nối để tải kho giọng tiếng Việt.</div>'}</div><button id="more-voices" class="button full-width" hidden>Xem thêm giọng Việt</button><div class="range-field"><label for="stability">Độ ổn định giọng <span id="stability-label">${Math.round((prefs.stability ?? 0.5) * 100)}%</span></label><input id="stability" type="range" min="0" max="1" step="0.05" value="${prefs.stability ?? 0.5}"/></div>` : `<label class="field-label" for="device-voice">GIỌNG CÓ TRÊN THIẾT BỊ</label><select id="device-voice" class="full-width"></select><p class="small-note">Chất lượng và theo vết phụ thuộc trình duyệt. Không có phí API.</p><button class="button full-width" id="test-device">${icon('play')} Nghe thử</button>`}<div class="range-field"><label for="speech-rate">Tốc độ đọc <span id="rate-label">${prefs.rate}×</span></label><input id="speech-rate" type="range" min="0.5" max="2" step="0.1" value="${prefs.rate}"/></div><p class="small-note">Giữ nguyên dấu câu và chương EPUB. Giọng AI hỗ trợ tối đa 40.000 ký tự mỗi lần; không tự chia chương.</p>`,'ĐỌC BẰNG MẮT · CẢM BẰNG TAI');
  $('choose-ai').onclick = () => { stopPlayback(); prefs.provider = 'ai'; persistPrefs(); updateVoiceLabel(); voicesPanel(); };
  $('choose-device').onclick = () => { stopPlayback(); prefs.provider = 'device'; persistPrefs(); updateVoiceLabel(); voicesPanel(); };
  $('speech-rate').oninput = e => { prefs.rate = +e.target.value; $('rate-label').textContent = `${prefs.rate}×`; setRate(); };
  if (prefs.provider === 'ai') {
    $('api-key').oninput = e => { state.key = e.target.value.trim(); };
    const loadVoices=async (more=false) => {
      $('connect-voices').disabled=true;
      try {
        const page=more?state.voicePage+1:0;
        const data=await api(`/api/voices?page=${page}&search=${encodeURIComponent(state.voiceSearch)}`,{headers:{'x-elevenlabs-key':state.key}});
        state.voices=more?[...state.voices,...data.voices]:data.voices;state.voicePage=page;
        if(!$('voice-list'))return;
        $('voice-list').innerHTML=state.voices.length?voiceCards():'<p>Không tìm thấy giọng tiếng Việt. Thử từ khóa khác.</p>';
        $('more-voices').hidden=!data.hasMore;bindVoiceCards();drawIcons();updateVoiceLabel();
      } finally {if($('connect-voices'))$('connect-voices').disabled=false;}
    };
    $('connect-voices').onclick=safely(()=>loadVoices());
    $('voice-search-form').onsubmit=safely(async e=>{e.preventDefault();state.voiceSearch=$('voice-search').value.trim();await loadVoices();});
    $('more-voices').onclick=safely(()=>loadVoices(true));
    if(state.serviceReady || state.key)loadVoices().catch(fail);
    $('stability').oninput = e => { prefs.stability = +e.target.value; $('stability-label').textContent = `${Math.round(prefs.stability * 100)}%`; persistPrefs(); };
    bindVoiceCards();
  } else {
    const list = speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('vi'));
    $('device-voice').innerHTML = list.length ? list.map(v => `<option value="${esc(v.voiceURI)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join('') : '<option value="">Thiết bị chưa có giọng tiếng Việt</option>';
    $('device-voice').value = prefs.deviceVoice || list.find(v => v.lang.startsWith('vi'))?.voiceURI || list[0]?.voiceURI || '';
    prefs.deviceVoice = $('device-voice').value;
    $('device-voice').onchange = e => { stopPlayback(); prefs.deviceVoice = e.target.value; persistPrefs(); updateVoiceLabel(); };
    $('test-device').onclick = () => { if(!list.length)return notify('Thiết bị chưa có giọng tiếng Việt. Hãy chọn giọng AI.'); stopPlayback(); const utter = new SpeechSynthesisUtterance('Một trang sách, một khoảng lặng. Chào mừng bạn đến với EpubAudio.'); utter.voice = list.find(v => v.voiceURI === prefs.deviceVoice); utter.rate = prefs.rate; speechSynthesis.speak(utter); };
  }
}
function voiceCards() { return state.voices.map(v => `<div class="voice-card ${prefs.voice === v.id ? 'selected' : ''}"><button data-voice="${esc(v.id)}"><span class="voice-avatar">${icon('headphones')}</span><div><strong>${esc(v.name)}</strong><small>${esc([v.labels.language, v.labels.gender, v.labels.accent].filter(Boolean).join(' · ') || 'Tiếng Việt')}</small></div>${prefs.voice === v.id ? icon('check') : ''}</button>${v.preview ? `<button class="icon-button" data-preview="${esc(v.id)}" aria-label="Nghe mẫu ${esc(v.name)}">${icon('play')}</button>` : ''}</div>`).join(''); }
function bindVoiceCards() {
  document.querySelectorAll('[data-voice]').forEach(el => el.onclick = safely(async () => { stopPlayback(); const selected=state.voices.find(v=>v.id===el.dataset.voice); let id=selected.id; if(selected.owner){el.disabled=true;try{const added=await api('/api/add-voice',{method:'POST',headers:{'Content-Type':'application/json','x-elevenlabs-key':state.key},body:JSON.stringify({owner:selected.owner,voice:selected.id,name:selected.name})});id=added.id;}finally{el.disabled=false;}} prefs.voice=id; selected.id=id; prefs.voiceName=selected.name; persistPrefs(); updateVoiceLabel(); $('voice-list').innerHTML = voiceCards(); bindVoiceCards(); drawIcons(); notify('Đã chọn giọng tiếng Việt.'); }));
  document.querySelectorAll('[data-preview]').forEach(el => el.onclick = safely(async () => { stopPlayback(); previewAudio?.pause(); previewAudio = new Audio(state.voices.find(v => v.id === el.dataset.preview).preview); await previewAudio.play(); }));
}
function updateVoiceLabel() { $('player-voice-name').textContent = prefs.provider === 'ai' ? state.voices.find(v => v.id === prefs.voice)?.name || prefs.voiceName || 'Chọn giọng tiếng Việt' : 'Giọng thiết bị'; }
async function api(url, options = {}) {
  const response = await fetch(url, options); let data;
  try { data = await response.json(); } catch { throw new Error('API giọng đọc chưa khả dụng. Chạy trên Vercel để dùng giọng AI.'); }
  if (!response.ok) throw new Error(data.error || 'Dịch vụ giọng đọc gặp lỗi.'); return data;
}

function setRate() { persistPrefs(); $('cycle-rate').textContent = `${prefs.rate}×`; if (state.audio) state.audio.playbackRate = prefs.rate; }
function playerState(playing, busy = false) { state.playing = playing; state.busy = busy; $('play').innerHTML = icon(busy ? 'loader-circle' : playing ? 'pause' : 'play', busy ? 'spin' : ''); $('play').setAttribute('aria-label', busy ? 'Hủy tạo audio' : playing ? 'Tạm dừng' : 'Bắt đầu nghe'); drawIcons(); }
function stopPlayback() {
  state.token++; state.controller?.abort(); state.controller = null; previewAudio?.pause(); state.audio?.pause();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  state.audio = null; state.alignment = null; state.cached = null; state.highlighted = ''; state.selection = null;
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl); state.audioUrl = null;
  state.rendition?.getContents().forEach(c => { c.window.CSS?.highlights?.delete('epubaudio'); });
  $('seek').disabled = true; playerState(false);
}
function formatTime(seconds = 0) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
async function chapterIndex() {
  const contents = state.rendition.getContents().find(c => c.sectionIndex === state.chapter) || state.rendition.getContents()[0];
  if (!contents) throw new Error('Chương chưa tải xong. Hãy thử lại.');
  return { contents, ...indexText(contents.document) };
}
function highlight(position) {
  if (!state.rendition || !prefs.follow) return;
  const contents = state.rendition.getContents().find(c => c.sectionIndex === state.speechChapter); if (!contents) return;
  const index = indexText(contents.document); const [start,end] = phraseRange(index.text, position);
  const marker = `${state.speechChapter}:${start}`; const repaint = state.highlighted !== marker; state.highlighted = marker;
  const range = domRange(contents.document, index.entries, start, end); if (!range) return;
  if (repaint && contents.window.Highlight && contents.window.CSS?.highlights) contents.window.CSS.highlights.set('epubaudio', new contents.window.Highlight(range));
  else if (repaint) { const cfi = contents.cfiFromRange(range); if (state.lastAnnotation) state.rendition.annotations.remove(state.lastAnnotation, 'highlight'); state.rendition.annotations.highlight(cfi, {}, null, 'audio-follow', { fill: '#c5d69b', 'fill-opacity': '0.55' }); state.lastAnnotation = cfi; }
  state.current.listen = { chapter: state.speechChapter, offset: position }; saveBook();
  const location = state.rendition.currentLocation(); const point = domRange(contents.document, index.entries, position, Math.min(position + 1, index.text.length)); if (!point) return; const cfi = contents.cfiFromRange(point);
  if (location?.start && !state.following && (state.rendition.epubcfi.compare(cfi, location.start.cfi) < 0 || state.rendition.epubcfi.compare(cfi, location.end.cfi) > 0)) {
    state.following = true; state.rendition.display(cfi).catch(() => {}).finally(() => { state.following = false; });
  }
}
async function togglePlayback() {
  if (!state.current) return;
  if (state.busy) { stopPlayback(); $('player-message').textContent = 'Đã hủy chờ audio. Dịch vụ có thể đã tính phí nếu yêu cầu được xử lý.'; return; }
  if (state.playing) { state.audio ? state.audio.pause() : speechSynthesis.pause(); playerState(false); return; }
  if (state.audio) { await state.audio.play(); playerState(true); return; }
  if (prefs.provider === 'device' && speechSynthesis.paused && (speechSynthesis.pending || speechSynthesis.speaking)) { speechSynthesis.resume(); playerState(true); return; }
  if (prefs.provider === 'ai' && !prefs.voice) { voicesPanel(); return notify('Kết nối ElevenLabs và chọn giọng để bắt đầu nghe.'); }
  const { contents, text, entries } = await chapterIndex();
  let start = 0, end = text.length;
  if (state.selection?.chapter === state.chapter) { start = state.selection.start; end = state.selection.end; }
  else {
    try { const range = state.book.getRange ? await state.book.getRange(state.current.cfi) : null; if (range) { const visibleEntry = entries.find(x => x.node === range.startContainer); if (visibleEntry) start = visibleEntry.start + range.startOffset; else { const visible = state.rendition.getRange(state.current.cfi); if (visible) start = offsetOf(entries, visible.startContainer, visible.startOffset); } } } catch { /* Start of chapter. */ }
    if (state.current.listen?.chapter === state.chapter && state.current.listen.offset >= start) start = state.current.listen.offset;
  }
  const selectionOnly = !!state.selection && !state.selection.continueReading;
  if (!text.slice(start,end).trim()) return notify('Trang này không có văn bản có thể đọc. Hãy chuyển chương.');
  state.base = prefs.provider === 'ai' && !state.selection ? 0 : start; state.speechText = text.slice(state.base,end); state.speechChapter = contents.sectionIndex; const resumeOffset = start - state.base;
  const token = ++state.token; playerState(false, true);
  try {
    if (prefs.provider === 'ai') {
      if (state.speechText.length > 40000) throw new Error('Chương vượt 40.000 ký tự. Web không tự chia chương; bạn có thể chọn một đoạn để nghe.');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${prefs.voice}:${prefs.stability ?? .5}:${state.speechText}`));
      const cacheKey = `audio:${state.current.id}:${[...new Uint8Array(digest)].map(x => x.toString(16).padStart(2,'0')).join('')}`;
      let data = await get(cacheKey);
      if (!data) {
        if(!state.key && !state.serviceReady)throw new Error('Hãy cấu hình ELEVENLABS_API_KEY trên Vercel hoặc nhập khóa trong phần Giọng đọc.');
        $('player-message').textContent = `Đang tạo ${state.speechText.length.toLocaleString('vi')} ký tự · Tính phí vào ElevenLabs của bạn`;
        state.controller = new AbortController();
        data = await api('/api/speech', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-elevenlabs-key': state.key }, body: JSON.stringify({ text: state.speechText, voice: prefs.voice, stability: prefs.stability ?? .5 }), signal: state.controller.signal });
        if (token !== state.token) return;
        try { await set(cacheKey, data); } catch { notify('Không đủ dung lượng lưu audio. Bạn vẫn có thể nghe phiên này.'); }
      }
      if (token !== state.token) return;
      state.cached = data; state.alignment = data.alignment;
      const binary = atob(data.audio_base64); state.audioUrl = URL.createObjectURL(new Blob([Uint8Array.from(binary, c => c.charCodeAt(0))], { type: 'audio/mpeg' }));
      const audio = new Audio(state.audioUrl); state.audio = audio; audio.playbackRate = prefs.rate; audio.volume = prefs.volume;
      const offsets = [0]; for (const character of state.alignment.characters) offsets.push(offsets.at(-1) + character.length);
      audio.ontimeupdate = () => {
        if (token !== state.token) return;
        const index = charAtTime(state.alignment.character_start_times_seconds, audio.currentTime);
        const position = state.base + offsets[index]; highlight(position); state.current.listen = { chapter: state.speechChapter, offset: position }; saveBook();
        $('elapsed').textContent = formatTime(audio.currentTime); $('duration').textContent = formatTime(audio.duration || 0); $('seek').value = Number.isFinite(audio.duration) ? audio.currentTime / audio.duration * 100 : 0;
      };
      audio.onloadedmetadata = () => { $('seek').disabled = false; $('duration').textContent = formatTime(audio.duration); if (resumeOffset > 0) { const character = offsets.findIndex(offset => offset >= resumeOffset); audio.currentTime = state.alignment.character_start_times_seconds[Math.max(0, character)] || 0; } };
      audio.onended = safely(() => completeChapter(token, selectionOnly));
      audio.onerror = () => { stopPlayback(); notify('Không phát được audio. Hãy thử lại.'); };
      await audio.play();
      if (token !== state.token) { audio.pause(); return; }
      playerState(true); $('player-message').textContent = 'Giọng AI · Audio được lưu trên thiết bị · Theo vết theo cụm dấu câu';
    } else {
      if (!('speechSynthesis' in window)) throw new Error('Trình duyệt không hỗ trợ giọng thiết bị.');
      const voice=speechSynthesis.getVoices().find(v=>v.voiceURI===prefs.deviceVoice && v.lang.toLowerCase().startsWith('vi')) || speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('vi')); if(!voice)throw new Error('Thiết bị chưa có giọng tiếng Việt. Hãy chọn giọng AI.');
      const utter = new SpeechSynthesisUtterance(state.speechText); utter.voice = voice; utter.lang = utter.voice?.lang || 'vi-VN'; utter.rate = prefs.rate; utter.volume = prefs.volume;
      utter.onboundary = e => { if (token === state.token) { highlight(state.base + e.charIndex); state.current.listen = { chapter: state.speechChapter, offset: state.base + e.charIndex }; saveBook(); } };
      utter.onend = safely(() => completeChapter(token, selectionOnly)); utter.onerror = e => { if (token === state.token && !['canceled','interrupted'].includes(e.error)) { stopPlayback(); notify('Giọng thiết bị bị gián đoạn. Bạn có thể dùng giọng AI.'); } };
      utter.onstart = () => { if (token === state.token) playerState(true); };
      speechSynthesis.speak(utter); playerState(true); $('player-message').textContent = 'Giọng thiết bị · Theo vết khi trình duyệt cung cấp mốc đọc';
    }
  } catch (error) { if (token === state.token) { stopPlayback(); $('player-message').textContent = 'Chưa phát audio'; if (error.name !== 'AbortError') throw error; } }
}
async function completeChapter(token, selectionOnly) {
  if (token !== state.token) return;
  const next = state.book.spine.get(state.speechChapter + 1); state.current.listen = null; await flushRecord(); stopPlayback();
  if (prefs.auto && !selectionOnly && next) { state.chapter = next.index; await state.rendition.display(next.href); const location = state.rendition.currentLocation(); if (location?.start) state.current.cfi = location.start.cfi; await togglePlayback(); }
  else $('player-message').textContent = selectionOnly ? 'Đã nghe xong đoạn được chọn.' : 'Đã nghe xong chương.';
}
async function changeChapter(direction) { stopPlayback(); const next = state.book.spine.get(state.chapter + direction); if (next) { state.current.listen = null; state.chapter = next.index; await state.rendition.display(next.href); } else notify(direction > 0 ? 'Bạn đang ở chương cuối.' : 'Bạn đang ở chương đầu.'); }
function sleepPanel() {
  openPanel('Hẹn giờ ngủ', `<p class="panel-intro">Để câu chuyện khép lại cùng một giấc ngủ nhẹ.</p><div class="sleep-options">${[15,30,45,60].map(n => `<button class="button" data-sleep="${n}">${n} phút</button>`).join('')}</div><button class="button full-width" id="cancel-sleep">Tắt hẹn giờ</button><p class="small-note">Hẹn giờ hoạt động khi trang đang mở. Trình duyệt có thể tạm dừng audio khi khóa màn hình.</p>`);
  document.querySelectorAll('[data-sleep]').forEach(el => el.onclick = () => { clearTimeout(sleepTimer); const minutes = +el.dataset.sleep; sleepTimer = setTimeout(() => { stopPlayback(); notify('Đã dừng audio theo hẹn giờ.'); }, minutes * 60000); $('panel').close(); $('sleep-button').classList.add('active'); notify(`Audio sẽ dừng sau ${minutes} phút.`); });
  $('cancel-sleep').onclick = () => { clearTimeout(sleepTimer); $('sleep-button').classList.remove('active'); $('panel').close(); notify('Đã tắt hẹn giờ.'); };
}
function keyboard(e) { if ($('panel').open || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || !state.rendition) return; if (e.code === 'Space') { e.preventDefault(); safely(togglePlayback)(); } if (e.code === 'ArrowRight') safely(async () => { stopPlayback(); state.current.listen = null; await state.rendition.next(); })(); if (e.code === 'ArrowLeft') safely(async () => { stopPlayback(); state.current.listen = null; await state.rendition.prev(); })(); }

function setSidebar(open) { document.body.classList.toggle('sidebar-open', open); $('sidebar-backdrop').hidden = !open; $('toggle-sidebar').setAttribute('aria-expanded', String(open)); $('toggle-sidebar').setAttribute('aria-label', open ? 'Đóng thanh bên' : 'Mở thanh bên'); }
$('toggle-sidebar').onclick = () => setSidebar(!document.body.classList.contains('sidebar-open'));
$('sidebar-backdrop').onclick = () => setSidebar(false);
window.addEventListener('keydown', event => { if (event.key === 'Escape') setSidebar(false); });
$('brand').onclick = e => { e.preventDefault(); if (state.current) safely(goLibrary)(); };
$('nav-library').onclick = () => { if (state.current) safely(goLibrary)(); };
$('back-library').onclick = safely(goLibrary);
$('nav-bookmarks').onclick = safely(bookmarksPanel);
$('nav-voices').onclick = voicesPanel; $('change-voice').onclick = voicesPanel;
$('nav-settings').onclick = settingsPanel; $('reader-settings').onclick = settingsPanel;
$('toc-button').onclick = tocPanel; $('bookmark-button').onclick = safely(addBookmark);
$('import-top').onclick = () => $('file-input').click();
$('file-input').onchange = safely(e => importBooks([...e.target.files]));
$('search').oninput = renderShelf; $('sort').onchange = renderShelf;
$('demo').onclick = safely(async () => { $('demo').disabled = true; try { await importBooks([await demoBook()]); } finally { $('demo').disabled = false; } });
$('play').onclick = safely(togglePlayback);
$('prev-page').onclick = safely(async () => { stopPlayback(); state.current.listen = null; await state.rendition.prev(); });
$('next-page').onclick = safely(async () => { stopPlayback(); state.current.listen = null; await state.rendition.next(); });
$('prev-chapter').onclick = safely(() => changeChapter(-1)); $('next-chapter').onclick = safely(() => changeChapter(1));
$('cycle-rate').onclick = () => { const speeds = [.75,1,1.25,1.5,1.75,2]; prefs.rate = speeds[(speeds.indexOf(prefs.rate) + 1) % speeds.length]; setRate(); };
$('volume').oninput = e => { prefs.volume = +e.target.value; persistPrefs(); if (state.audio) state.audio.volume = prefs.volume; };
$('seek').oninput = e => { if (state.audio && Number.isFinite(state.audio.duration)) state.audio.currentTime = +e.target.value / 100 * state.audio.duration; };
$('sleep-button').onclick = sleepPanel;
$('close-panel').onclick = () => { previewAudio?.pause(); $('panel').close(); };
$('panel').addEventListener('click', e => { if (e.target === $('panel')) { const rect = $('panel').getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) $('panel').close(); } });
$('panel').addEventListener('close', () => previewAudio?.pause());
window.addEventListener('keydown', keyboard);
let dragDepth = 0;
document.addEventListener('dragenter', e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); dragDepth++; $('drop-overlay').hidden = false; } });
document.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
document.addEventListener('dragleave', () => { dragDepth--; if (dragDepth <= 0) $('drop-overlay').hidden = true; });
document.addEventListener('drop', safely(async e => { e.preventDefault(); dragDepth = 0; $('drop-overlay').hidden = true; if (e.dataTransfer.files.length) await importBooks([...e.dataTransfer.files]); }));
window.addEventListener('pagehide', () => { previewAudio?.pause(); state.audio?.pause(); if ('speechSynthesis' in window) speechSynthesis.cancel(); flushRecord().catch(() => {}); });
applyTheme(); setRate(); drawIcons(); refreshLibrary().catch(error => { fail(error); $('shelf').innerHTML = '<p>Không truy cập được bộ nhớ. Hãy bật lưu trữ cho trang này rồi tải lại.</p>'; });
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { if ($('panel').open && $('device-voice')) voicesPanel(); };

api('/api/config').then(data=>{state.serviceReady=data.elevenReady;}).catch(()=>{});

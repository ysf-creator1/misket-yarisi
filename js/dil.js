/* Misket Yarışı — dil seçimi (Türkçe / İngilizce)
 * Oyunun metinleri Türkçe yazılır; İngilizce seçilince ekrandaki metinler js/dil-en.js sözlüğüyle çevrilir.
 * Sözlükte düz metinler ve kalıplar var: {0} her şey, {0#} sayı. Kalıbın içindeki parça (ör. parkur adı) de ayrıca çevrilir.
 * Baştaki emoji/simge ayrılıp metin çevrilir ("🏁 Yarış" → "🏁 Race"). Dil değişince sayfa yenilenir.
 */
(function () {
  'use strict';
  const KEY = 'misket-dil';
  let lang = null;
  try { lang = localStorage.getItem(KEY); } catch (e) { }
  // ilk açılış: tarayıcının dil listesinde Türkçe/İngilizce'den önce geleni; ikisi de yoksa ya da bilinmiyorsa Türkçe
  if (lang !== 'tr' && lang !== 'en') {
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']).map(x => String(x || '').toLowerCase());
    const first = list.map(x => x.split('-')[0]).find(x => x === 'tr' || x === 'en');
    lang = first || 'tr';
  }
  const Dil = window.Dil = {
    lang, t: s => s,
    set(l) { try { localStorage.setItem(KEY, l); } catch (e) { } location.reload(); },
  };
  if (lang !== 'en') return;
  document.documentElement.lang = 'en';

  const EN = window.DIL_EN || {};
  const exact = new Map(), pats = [];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const k in EN) {
    if (!/\{\d+#?\}/.test(k)) { exact.set(k, EN[k]); continue; }
    const idx = []; let re = '^';
    for (const part of k.split(/(\{\d+#?\})/)) {
      const m = /^\{(\d+)(#?)\}$/.exec(part);
      if (m) { idx.push(+m[1]); re += m[2] ? '(-?\\d+(?:[.,]\\d+)?)' : '([\\s\\S]+?)'; } else re += esc(part);
    }
    pats.push({ re: new RegExp(re + '$'), idx, v: EN[k], len: k.replace(/\{\d+#?\}/g, '').length });
  }
  pats.sort((a, b) => b.len - a.len); // en belirgin kalıp önce

  const cache = new Map();
  function core(s) {
    if (exact.has(s)) return exact.get(s);
    for (const p of pats) {
      const m = p.re.exec(s); if (!m) continue;
      const vals = {}; p.idx.forEach((ix, j) => { vals[ix] = core(m[j + 1]); });
      return p.v.replace(/\{(\d+)#?\}/g, (_, n) => vals[n] != null ? vals[n] : '');
    }
    const pm = /^([^\p{L}\p{N}"'(]+)(\p{L}[\s\S]*)$/u.exec(s); // baştaki emoji/simge
    if (pm) { const r = core(pm[2]); if (r !== pm[2]) return pm[1] + r; }
    return s;
  }
  function tr(s) {
    if (!s || !/\p{L}/u.test(s)) return s;
    const c = cache.get(s); if (c !== undefined) return c;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    const r = m[1] + core(m[2]) + m[3];
    if (cache.size < 20000) cache.set(s, r);
    return r;
  }
  Dil.t = tr;

  // ---- ekrandaki metinler ----
  const ATTR = ['placeholder', 'title', 'aria-label', 'data-k'];
  function walk(n) {
    if (n.nodeType === 3) { const v = n.nodeValue, t = tr(v); if (t !== v) n.nodeValue = t; return; }
    if (n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
    for (const a of ATTR) if (n.hasAttribute(a)) { const v = n.getAttribute(a), t = tr(v); if (t !== v) n.setAttribute(a, t); }
    for (const c of n.childNodes) walk(c);
  }
  const obs = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') { const v = m.target.nodeValue, t = tr(v); if (t !== v) m.target.nodeValue = t; }
      else if (m.type === 'attributes') { const v = m.target.getAttribute(m.attributeName); const t = tr(v); if (v != null && t !== v) m.target.setAttribute(m.attributeName, t); }
      else m.addedNodes.forEach(walk);
    }
  });
  function start() {
    walk(document.body); document.title = tr(document.title);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  // açılır pencereler
  for (const f of ['alert', 'confirm', 'prompt']) { const o = window[f].bind(window); window[f] = (msg, ...a) => o(tr(String(msg == null ? '' : msg)), ...a); }
})();

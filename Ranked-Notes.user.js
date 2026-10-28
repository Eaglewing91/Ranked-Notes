// ==UserScript==
// @name         Ranked Notes
// @namespace    https://github.com/Eaglewing91
// @version      2.2.0
// @author       Eaglewing [571041]
// @license      MIT
// @homepageURL  https://github.com/Eaglewing91/Ranked-Notes
// @supportURL   https://github.com/Eaglewing91/Ranked-Notes/issues
// @updateURL    https://raw.githubusercontent.com/Eaglewing91/Ranked-Notes/main/Ranked-Notes.user.js
// @downloadURL  https://raw.githubusercontent.com/Eaglewing91/Ranked-Notes/main/Ranked-Notes.user.js
// @description  Adds a small + button to ranked war items (yellow, orange and red weapons and armour) when you open them in the armoury, Items, auction house, Item Market, bazaars, display cases and trades. Attach a note to that exact item; it comes back wherever that item appears. Notes stay in your browser. Makes no requests and sends nothing anywhere.
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/item.php*
// @match        https://www.torn.com/amarket.php*
// @match        https://www.torn.com/page.php?sid=ItemMarket*
// @match        https://www.torn.com/bazaar.php*
// @match        https://www.torn.com/displaycase.php*
// @match        https://www.torn.com/trade.php*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

// Ranked Notes — Copyright (c) 2026 Eaglewing [571041]. Released under the MIT License (see LICENSE).

/*
 * HOW IT WORKS (and why it's within Torn's scripting rules)
 *  - Ranked war (RW) items are found the same way as the TORN Auction Price Checker does:
 *    by the yellow / orange / red rarity shown in the item's info panel on the page you
 *    are viewing. (Credit: page-structure approach from TORN Auction Price Checker.)
 *  - Each note is linked to that ONE item using its exact stats: name, damage, accuracy or
 *    armour, quality and bonus values. Every RW item rolls its own stats, so two items
 *    practically never match, and the same item is recognised on every page.
 *    These details are only used behind the scenes as the note's key. If the stats can't be
 *    read, the weapon's unique ID (UID) on the page is used instead, when Torn shows one.
 *  - The + appears at the end of the item's first description line once you open it.
 *    Clicking + only opens a note box; the click is stopped so it never reaches Torn's
 *    own buttons.
 *  - Nothing is ever requested or sent: no Torn pages, no API, no other websites.
 *    The script only reads the page you're already viewing.
 *
 * Terms of Service
 * | Data Storage          | Only locally (your notes, in your browser's localStorage)  |
 * | Data Sharing          | Nobody                                                     |
 * | Purpose of Use        | Other: personal notes on ranked war items                  |
 * | Key Storage & Sharing | Not stored / Not shared (no API key is used)               |
 * | Key Access Level      | None required                                              |
 */

(function () {
  'use strict';

  const MAX_LEN = 300;
  const RW_RARITY = /\b(yellow|orange|red)\b/i;        // for sentences like "122.17% Yellow"
  const RW_CLASS = /yellow|orange|red/i;               // Torn's hashed classes, e.g. yellow___Ab3kQ (no word boundary!)

  /* ---------------- notes storage (local only) ---------------- */
  const KEY = 'twn-notes-v2';
  const loadNotes = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
  let notes = loadNotes();
  const saveNotes = () => { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch { /* storage blocked */ } };
  const noteOf = (id) => (notes[id] && notes[id].t) || '';

  function setNote(id, text, name) {
    text = String(text || '').trim().slice(0, MAX_LEN);
    if (text) notes[id] = { t: text, n: name, ts: Date.now() };
    else delete notes[id];
    saveNotes();
    document.querySelectorAll('.twn-wrap').forEach((w) => { if (w.twnId === id) paint(w); });
  }

  /* ---------------- reading the page (same structure the Price Checker uses) ---------------- */
  // Torn uses CSS modules: the class prefix is stable, the hash after ___ changes.
  const mod = (name, el = '') => `${el}[class^="${name}___"], ${el}[class*=" ${name}___"]`;
  const q = (root, name, el) => root.querySelector(mod(name, el));
  const qa = (root, name, el) => root.querySelectorAll(mod(name, el));
  const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const num = (s) => { const m = String(s || '').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]).toFixed(2) : ''; };

  function isRwPanel(container) {
    const r = q(container, 'rarity');
    if (r && (RW_CLASS.test(String(r.className)) || RW_RARITY.test(r.textContent))) return true;
    // Some layouts put the colour on another element: look for a class that names it
    if (container.querySelector('[class*="yellow"], [class*="orange"], [class*="Yellow"], [class*="Orange"], [class*="rarity-red"], [class*="red___"]')) return true;
    const ql = container.querySelector('[aria-label*="Quality"]');
    return !!(ql && RW_RARITY.test(ql.getAttribute('aria-label') || ''));
  }

  function panelName(container) {
    const desc = q(container, 'description');
    let name = squash((desc && desc.querySelector('.bold')) ? desc.querySelector('.bold').textContent
      : container.querySelector('.bold')?.textContent);
    if (!name) name = squash(container.querySelector('img[alt]')?.getAttribute('alt'));
    // Auction house / Items: the name may sit on the listing row next to the panel, not inside it
    if (!name) {
      const near = [container.previousElementSibling, container.parentElement?.closest('li'), container.closest('li')?.previousElementSibling];
      for (const n of near) {
        if (!n) continue;
        name = squash(n.querySelector('.item-name, .name, .bold, [class*="name___"], [class*="title___"]')?.textContent || n.querySelector('img[alt]')?.getAttribute('alt'));
        if (name) break;
      }
    }
    return name.replace(/^The\s+/i, '').replace(/\s*\[\d+\]\s*$/, '');
  }

  // Build the item's identity from the stats in its info panel.
  function panelIdentity(container) {
    const name = panelName(container);
    const stats = {};
    const bonuses = [];
    for (const prop of qa(container, 'propertyWrapper', 'li')) {
      const titleEl = q(prop, 'title') || prop.querySelector('[class*="title"]');
      const title = squash(titleEl?.textContent).replace(/:$/, '').toLowerCase();
      const values = [...qa(prop, 'valueWrapper')].map((v) => v.getAttribute('aria-label') || v.textContent);
      if (!values.length) values.push(squash(prop.textContent).replace(squash(titleEl?.textContent), ''));
      if (['damage', 'accuracy', 'armor', 'armour', 'quality'].includes(title)) {
        stats[title.replace('armour', 'armor')] = num(values[0]);
      } else if (title === 'bonus') {
        for (const v of values) {
          const b = squash(v).replace(/^Bonus:\s*/i, '');
          const m = b.match(/^(-?\d+(?:\.\d+)?)\s*(?:%|T)?\s+(.+)$/i);
          if (m) bonuses.push(`${m[2].toLowerCase()}:${Number(m[1]).toFixed(2)}`);
          else if (b) bonuses.push(b.toLowerCase());
        }
      }
    }
    // Fallbacks: some tabs only expose stats through the labels Torn attaches to them
    const byLabel = (word) => {
      const el = container.querySelector(`[aria-label*="${word}"]`);
      return el ? num((el.getAttribute('aria-label') || '').replace(new RegExp(`^.*?${word}:?`, 'i'), '')) || num(el.textContent) : '';
    };
    stats.quality = stats.quality || byLabel('Quality');
    stats.damage = stats.damage || byLabel('Damage');
    stats.accuracy = stats.accuracy || byLabel('Accuracy');
    stats.armor = stats.armor || byLabel('Armor') || byLabel('Armour');
    if (!bonuses.length) {
      for (const el of container.querySelectorAll('[aria-label*="Bonus"]')) {
        const b = squash(el.getAttribute('aria-label')).replace(/^Bonus:\s*/i, '');
        const m = b.match(/^(-?\d+(?:\.\d+)?)\s*(?:%|T)?\s+(.+)$/i);
        const key = m ? `${m[2].toLowerCase()}:${Number(m[1]).toFixed(2)}` : b.toLowerCase();
        if (key && !bonuses.includes(key)) bonuses.push(key);
      }
    }
    const byStats = makeId(name, stats, bonuses);
    if (byStats) return byStats;
    const uid = uidNear(container);
    if (uid) return { id: `uid:${uid}`, name: name || 'Item' };
    return lastResortId(container, name || 'Item');
  }

  // Weapon UID, if Torn put one on the panel or its row (same attributes the UID Finder reads)
  const UID_ATTRS = ['data-armoryid', 'data-armouryid', 'data-armory-id', 'data-armoury-id', 'data-uid', 'data-item-uid', 'data-itemuid', 'data-armoryuid'];
  function uidNear(container) {
    const spots = [container, container.previousElementSibling, container.closest('li'), container.parentElement?.closest('li')];
    for (const el of spots) {
      if (!el) continue;
      for (const a of UID_ATTRS) {
        const v = el.getAttribute?.(a); if (/^\d{6,}$/.test(String(v || '').trim())) return v.trim();
        const inner = el.querySelector?.(`[${a}]`); const iv = inner?.getAttribute(a); if (/^\d{6,}$/.test(String(iv || '').trim())) return iv.trim();
      }
    }
    return null;
  }

  // If the stats are laid out in a way we don't recognise, use the name plus every decimal
  // value shown in the panel (damage, accuracy, quality... are all decimals unique to the item).
  function lastResortId(container, name) {
    if (!name) return null;
    const copy = container.cloneNode(true);
    copy.querySelectorAll('.twn-wrap, button, script, style').forEach((n) => n.remove());
    const labels = [...copy.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ');
    const nums = ((copy.textContent + ' ' + labels).match(/\d+\.\d+/g) || []).map((n) => Number(n).toFixed(2));
    const uniq = [...new Set(nums)].slice(0, 10);
    // Nothing numeric at all: fall back to the panel's text so a + still appears
    const key = uniq.length ? `n:${uniq.join(',')}` : `t:${squash(copy.textContent).toLowerCase().slice(0, 120)}`;
    return { id: `${name.toLowerCase()}|${key}`, name };
  }

  // Weapons and armour show these stats; plain items (plushies, drugs...) don't.
  const hasGearStats = (c) => /\b(Damage|Accuracy|Armou?r|Quality)\b/i.test(c.textContent + ' ' +
    [...c.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' '));

  // Trade page: details live in the item's tooltip (cached, because hovering removes it).
  const tipCache = new WeakMap();
  function tradeIdentity(row) {
    const nameEl = row.querySelector('.name:not(.inactive)');
    if (!nameEl) return null;
    let name = [...nameEl.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
    name = squash(name).replace(/^\d+\s*[x×]\s*/i, '').replace(/^The\s+/i, '');
    const icon = nameEl.querySelector('.networth-info-icon');
    const html = icon?.getAttribute('title') || icon?.getAttribute('data-original-title') || '';
    if (!html.trim()) return icon ? tipCache.get(icon) || null : null;

    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const d = tpl.content;
    const val = (sel) => num(d.querySelector(sel)?.closest('li')?.querySelector('span')?.textContent);
    const qualityText = d.querySelector('i[class*="item-rarity-bonus"], i[class*="item-quality-bonus"]')
      ?.closest('li')?.querySelector('span')?.textContent || '';
    if (!RW_RARITY.test(qualityText)) { if (icon) tipCache.set(icon, null); return null; }

    const stats = {
      damage: val('i[class*="item-damage-bonus"]'),
      accuracy: val('i[class*="item-accuracy-bonus"]'),
      armor: val('i[class*="item-armor-bonus"], i[class*="item-armour-bonus"], i[class*="item-defense-bonus"]'),
      quality: num(qualityText),
    };
    const bonuses = [];
    for (const b of d.querySelectorAll('.t-overflow b')) {
      let desc = '';
      for (let n = b.nextSibling; n && !(n.nodeType === 1 && n.tagName === 'B'); n = n.nextSibling) desc += ' ' + (n.textContent || '');
      const m = desc.match(/(\d+(?:\.\d+)?)\s*(?:%|T)/i);
      bonuses.push(m ? `${squash(b.textContent).toLowerCase()}:${Number(m[1]).toFixed(2)}` : squash(b.textContent).toLowerCase());
    }
    const result = makeId(name, stats, bonuses);
    if (icon) tipCache.set(icon, result);
    return result;
  }

  function makeId(name, stats, bonuses) {
    // Need a name, quality and a main stat to identify the item reliably.
    // Every ranked item rolls its own quality, damage/armour and bonus values, so any one of
    // these alongside the name is enough to tell items apart.
    if (!name || !(stats.quality || stats.damage || stats.armor || bonuses.length)) return null;
    const parts = [name.toLowerCase(), `d${stats.damage || ''}`, `a${stats.accuracy || ''}`,
      `r${stats.armor || ''}`, `q${stats.quality}`, ...bonuses.sort()];
    return { id: parts.join('|'), name };
  }

  /* ---------------- the + / note widget ---------------- */
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); };

  function makeWidget(id, name) {
    const wrap = document.createElement('span');
    wrap.className = 'twn-wrap';
    wrap.twnId = id;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'twn-btn';
    btn.textContent = '+';
    for (const ev of ['pointerdown', 'mousedown', 'mouseup', 'touchstart', 'dblclick']) btn.addEventListener(ev, stop, true);
    btn.addEventListener('click', (e) => { stop(e); openEditor(wrap.twnId, name, btn); }, true);
    wrap.append(btn);
    paint(wrap);
    return wrap;
  }

  function paint(wrap) {
    const text = noteOf(wrap.twnId);
    const btn = wrap.querySelector('.twn-btn');
    btn.classList.toggle('has-note', !!text);   // filled + when this item has a note
    btn.setAttribute('aria-label', text ? 'Edit note' : 'Add a note to this item');
  }

  // Put (or update) the widget in a container for the given identity.
  function place(container, ident, target, before) {
    let w = container.querySelector(':scope .twn-wrap');
    if (!ident) { if (w) w.remove(); return; }
    if (w && w.twnId === ident.id) return;
    if (w) w.remove();
    w = makeWidget(ident.id, ident.name);
    if (before && before.parentNode === target) target.insertBefore(w, before);
    else target.appendChild(w);
  }

  /* ---------------- where info panels live on each page ---------------- */
  function panels() {
    const p = location.pathname, href = location.href;
    if (p === '/amarket.php') {
      return [...document.querySelectorAll('li .show-item-info')].filter((el) => el.parentElement?.closest('li')?.querySelector('.item-cont-wrap'));
    }
    if (href.includes('sid=ItemMarket')) return [...document.querySelectorAll(`${mod('itemInfoWrapper')}, ${mod('itemInfo')}`)]
      .filter((el, _, all) => !all.some((o) => o !== el && o.contains(el)));
    if (p === '/item.php' || p === '/displaycase.php') return [...document.querySelectorAll('li.show-item-info')];
    if (p === '/bazaar.php') return [...document.querySelectorAll('div.show-item-info, [class^="info___"].show-item-info, [class*=" info___"].show-item-info')];
    if (p === '/factions.php') return [...document.querySelectorAll('div.view-item-info')];
    return [];
  }

  function placeInPanels() {
    for (const c of panels()) {
      if (c.style.display === 'none' || c.closest('#twn-editor')) continue;
      // Auction house only lists ranked gear, so (like the Price Checker) any weapon or armour counts there.
      const eligible = isRwPanel(c) || (location.pathname === '/amarket.php' && hasGearStats(c));
      const ident = eligible ? panelIdentity(c) : null;
      // Put the + at the end of the first sentence ("The SIG 552 is a Rifle Weapon. [+]"), which is
      // the line holding the item name, so it can't be clipped by Torn's description box.
      const nameEl = c.querySelector('.bold');
      if (nameEl) place(c, ident, nameEl.parentElement, null);
      else {
        const target = q(c, 'description') || q(c, 'descriptionWrapper') || q(c, 'itemInfo') || c;
        place(c, ident, target, target.firstChild);
      }
    }
  }

  function placeInTrade() {
    if (location.pathname !== '/trade.php') return;
    const rows = document.querySelectorAll(
      '.trade-cont .user ul.cont > li.color2 > ul.desc > li, .trade-cont .user ul.cont > li:nth-child(2) > ul.desc > li');
    for (const row of rows) {
      const nameEl = row.querySelector('.name:not(.inactive)');
      if (!nameEl) continue;
      place(nameEl, tradeIdentity(row), nameEl, nameEl.querySelector('.networth-info-icon'));
    }
  }

  /* ---------------- note editor ---------------- */
  let editor = null;
  function closeEditor() { if (editor) { editor.remove(); editor = null; } }

  function openEditor(id, name, btn) {
    closeEditor();
    editor = document.createElement('div');
    editor.id = 'twn-editor';
    editor.setAttribute('role', 'dialog');
    editor.innerHTML =
      '<div class="twn-head"><b></b><button type="button" class="twn-x" aria-label="Close">×</button></div>' +
      `<textarea maxlength="${MAX_LEN}" rows="4"></textarea>` +
      '<div class="twn-foot"><span class="twn-count"></span>' +
      '<button type="button" class="twn-del">Delete</button><button type="button" class="twn-save">Save</button></div>';
    editor.querySelector('b').textContent = name;
    const ta = editor.querySelector('textarea');
    const count = editor.querySelector('.twn-count');
    ta.value = noteOf(id);
    const upd = () => { count.textContent = `${ta.value.length}/${MAX_LEN}`; };
    upd();
    ta.addEventListener('input', upd);
    const save = () => { setNote(id, ta.value, name); closeEditor(); };
    editor.querySelector('.twn-save').addEventListener('click', save);
    editor.querySelector('.twn-del').addEventListener('click', () => { setNote(id, '', name); closeEditor(); });
    editor.querySelector('.twn-x').addEventListener('click', closeEditor);
    editor.querySelector('.twn-del').style.display = noteOf(id) ? '' : 'none';
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeEditor(); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
      e.stopPropagation();
    });
    for (const ev of ['pointerdown', 'mousedown', 'click', 'touchstart']) editor.addEventListener(ev, (e) => e.stopPropagation());

    document.body.appendChild(editor);
    const r = btn.getBoundingClientRect();
    const w = editor.offsetWidth, h = editor.offsetHeight;
    editor.style.left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8) + 'px';
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    editor.style.top = top + 'px';
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  document.addEventListener('pointerdown', (e) => {
    if (editor && !editor.contains(e.target) && !e.target.closest?.('.twn-wrap')) closeEditor();
  }, true);
  window.addEventListener('resize', closeEditor);

  /* ---------------- styles ---------------- */
  function addStyles() {
    if (document.getElementById('twn-css')) return;
    const css = document.createElement('style');
    css.id = 'twn-css';
    css.textContent = `
      .twn-wrap{display:inline-flex;align-items:center;margin:0 4px 0 6px;vertical-align:middle;position:relative;z-index:5}
      .twn-btn{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:20px;padding:0 5px;
        border:1px solid #ff7518;border-radius:4px;background:#2b1a0a;color:#ffb070;font:bold 13px/1 Arial,sans-serif;cursor:pointer}
      .twn-btn:hover,.twn-btn:focus-visible{background:#ff7518;color:#111;outline:none}
      .twn-btn.has-note{background:#ff7518;color:#111}
      #twn-editor{position:fixed;z-index:2147483647;width:min(300px,calc(100vw - 16px));background:#1f1f1f;color:#eee;
        border:1px solid #ff7518;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.6);font:13px/1.4 Arial,sans-serif;padding:10px}
      #twn-editor .twn-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
      #twn-editor .twn-head b{color:#ffb070;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #twn-editor .twn-x{background:none;border:0;color:#bbb;font-size:20px;line-height:1;cursor:pointer;padding:0 4px}
      #twn-editor textarea{width:100%;box-sizing:border-box;resize:vertical;background:#111;color:#eee;border:1px solid #444;
        border-radius:6px;padding:6px 8px;font:14px/1.4 Arial,sans-serif}
      #twn-editor textarea:focus{outline:none;border-color:#ff7518}
      #twn-editor .twn-foot{display:flex;align-items:center;gap:8px;margin-top:8px}
      #twn-editor .twn-count{flex:1;color:#888;font-size:11px}
      #twn-editor .twn-foot button{border-radius:5px;padding:5px 12px;cursor:pointer;font:bold 12px Arial,sans-serif}
      #twn-editor .twn-save{background:#ff7518;border:1px solid #ff7518;color:#111}
      #twn-editor .twn-del{background:none;border:1px solid #774;color:#e9a}
      @media (max-width:600px){ .twn-btn{min-width:28px;height:26px} #twn-editor textarea{font-size:16px} }`;
    document.head.appendChild(css);
  }

  /* ---------------- run, and re-run as Torn opens panels ---------------- */
  let timer = null;
  function schedule() { if (!timer) timer = setTimeout(() => { timer = null; run(); }, 300); }
  function run() {
    if (!document.body) return;
    addStyles();
    placeInPanels();
    placeInTrade();
  }

  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    notes = loadNotes();
    document.querySelectorAll('.twn-wrap').forEach(paint);
  });

  const ours = (n) => n.nodeType === 1 && (n.closest?.('.twn-wrap, #twn-editor') || n.id === 'twn-css');
  const start = () => {
    new MutationObserver((muts) => {
      if (muts.every((m) => [...m.addedNodes, ...m.removedNodes].every(ours) || ours(m.target))) return;
      schedule();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'title', 'class'] });
    run();
    setInterval(run, 2000); // safety net, like the Price Checker (reads the page only; no requests)
  };
  // Wait for the page body (Torn PDA can start scripts before it exists)
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();

/**
 * JanMitra Language Switcher — powered by Amazon Translate
 * Injects a language picker into every page nav and translates page content
 * via the /api/translate/batch endpoint (backed by Amazon Translate).
 * Add to any page with:
 *   <script src="js/lang-switcher.js"></script>
 */
(function () {
  /* ── Languages ─────────────────────────────────────────── */
  const LANGS = [
    { code: 'en', label: 'English',    native: 'EN'  },
    { code: 'hi', label: 'हिंदी',       native: 'हिं'  },
    { code: 'gu', label: 'ગુજરાતી',    native: 'ગુ'  },
    { code: 'ta', label: 'தமிழ்',      native: 'தமி' },
    { code: 'te', label: 'తెలుగు',     native: 'తె'  },
    { code: 'bn', label: 'বাংলা',      native: 'বাং' },
    { code: 'mr', label: 'मराठी',      native: 'मरा' },
    { code: 'kn', label: 'ಕನ್ನಡ',     native: 'ಕನ್' },
    { code: 'ml', label: 'മലയാളം',    native: 'മല'  },
    { code: 'pa', label: 'ਪੰਜਾਬੀ',    native: 'ਪੰ'  },
    { code: 'ur', label: 'اردو',       native: 'اردو' },
  ];

  /* ── Styles ─────────────────────────────────────────────── */
  const CSS = `
    /* ── Language picker wrapper ─────────────────── */
    #jm-lang-wrap {
      position: relative;
      flex-shrink: 0;
    }

    /* Button */
    #jm-lang-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 11px; border-radius: 6px;
      border: 1.5px solid rgba(12,35,64,.18);
      background: white; cursor: pointer;
      font-family: 'DM Sans', Arial, sans-serif;
      font-size: 12px; font-weight: 700; color: #0C2340;
      transition: border-color .2s, color .2s;
      letter-spacing: .2px; white-space: nowrap;
      user-select: none;
    }
    #jm-lang-btn:hover,
    #jm-lang-btn.open { border-color: #D4611A; color: #D4611A; }
    #jm-lang-btn svg { flex-shrink: 0; transition: transform .2s; }
    #jm-lang-btn.open svg:last-child { transform: rotate(180deg); }

    /* Dropdown */
    #jm-lang-dropdown {
      display: none;
      position: absolute; top: calc(100% + 10px); right: 0;
      background: white;
      border: 1.5px solid rgba(12,35,64,.12);
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(12,35,64,.16);
      padding: 6px;
      min-width: 190px;
      flex-direction: column; gap: 1px;
      z-index: 99999;
    }
    #jm-lang-dropdown.open { display: flex; }

    /* Dropdown header */
    .jm-lang-hd {
      font-family: 'DM Sans', Arial, sans-serif;
      font-size: 10px; font-weight: 700;
      letter-spacing: 1.5px; text-transform: uppercase;
      color: #7A8E9A; padding: 6px 10px 4px;
    }

    /* Each language row */
    .jm-lang-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: 7px; cursor: pointer;
      font-family: 'DM Sans', Arial, sans-serif;
      font-size: 13px; font-weight: 500; color: #3A4F5E;
      transition: background .12s; border: none; background: none;
      width: 100%; text-align: left;
    }
    .jm-lang-item:hover { background: #FAF6F0; color: #0C2340; }
    .jm-lang-item.active { background: rgba(12,35,64,.07); color: #0C2340; font-weight: 700; }
    .jm-lang-native {
      font-size: 13px; width: 26px; flex-shrink: 0;
      text-align: center; color: #D4611A;
    }
    .jm-lang-item.active .jm-lang-native { color: #0C2340; }
    .jm-lang-check { margin-left: auto; color: #127A10; font-size: 13px; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ── Amazon Translate page translation ──────────────────── */
  let _originals = null; // [{node, text}] — set when page is translated

  function collectTextNodes(root) {
    const nodes = [];
    const blocked = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'CODE', 'PRE', 'svg', 'SVG']);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || blocked.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        // Skip anything inside the language picker
        if (p.closest('#jm-lang-wrap')) return NodeFilter.FILTER_REJECT;
        const t = node.textContent.trim();
        if (!t) return NodeFilter.FILTER_SKIP;
        // Skip pure numbers, punctuation-only, or single characters — not worth translating
        if (/^[\d\s.,;:!?%₹$€£\-+/|\\@#^*()[\]{}<>'"~`_=]+$/.test(t)) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  function showOverlay() {
    let el = document.getElementById('jm-translate-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'jm-translate-overlay';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,.78);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:DM Sans,Arial,sans-serif;font-size:15px;font-weight:600;color:#0C2340;letter-spacing:.3px;gap:10px';
      el.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4611A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5C5 12.5 5.5 7 12 7c4.5 0 7 3 7 5.5"/><path d="M19 11.5C19 11.5 18.5 17 12 17c-4.5 0-7-3-7-5.5"/><polyline points="9 7 5 7 5 3"/><polyline points="15 17 19 17 19 21"/></svg>Translating…';
      document.body.appendChild(el);
    }
    return el;
  }

  function showError(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#b91c1c;color:white;padding:11px 20px;border-radius:8px;font-family:DM Sans,Arial,sans-serif;font-size:14px;font-weight:600;z-index:999999;box-shadow:0 4px 16px rgba(0,0,0,.2)';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  async function translatePage(langCode) {
    const overlay = showOverlay();
    try {
      const nodes = collectTextNodes(document.body);
      if (nodes.length === 0) return;
      const texts = nodes.map(n => n.textContent);

      const resp = await fetch('/api/translate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, targetLang: langCode, sourceLang: 'en' })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.details || err.error || `HTTP ${resp.status}`);
      }

      const { translatedTexts } = await resp.json();

      // Snapshot originals (only once — before first translation), then apply
      if (!_originals) _originals = nodes.map((node, i) => ({ node, text: texts[i] }));
      nodes.forEach((node, i) => {
        if (translatedTexts[i] && translatedTexts[i].trim()) node.textContent = translatedTexts[i];
      });
    } catch (e) {
      console.error('Amazon Translate error:', e);
      showError('Translation failed: ' + e.message + '. Check AWS credentials.');
    } finally {
      overlay.remove();
    }
  }

  function restoreEnglish() {
    if (_originals) {
      _originals.forEach(({ node, text }) => { node.textContent = text; });
      _originals = null;
    }
  }

  /* ── Language state ──────────────────────────────────────── */
  function getCurrentLang() {
    return localStorage.getItem('jm_lang') || 'en';
  }

  function setLanguage(code) {
    if (code === 'en') {
      restoreEnglish();
      localStorage.setItem('jm_lang', 'en');
    } else {
      translatePage(code).then(() => localStorage.setItem('jm_lang', code));
    }
    updatePickerUI(code);
  }

  function updatePickerUI(code) {
    const lang = LANGS.find(l => l.code === code) || LANGS[0];
    const curEl = document.getElementById('jm-lang-cur');
    if (curEl) curEl.textContent = lang.native;
    document.querySelectorAll('.jm-lang-item').forEach(item => {
      const isActive = item.dataset.code === code;
      item.classList.toggle('active', isActive);
      const check = item.querySelector('.jm-lang-check');
      if (check) check.remove();
      if (isActive) {
        const span = document.createElement('span');
        span.className = 'jm-lang-check';
        span.textContent = '✓';
        item.appendChild(span);
      }
    });
  }

  /* ── Build & inject picker ───────────────────────────────── */
  function injectPicker() {
    const nav = document.querySelector('nav');
    if (!nav || document.getElementById('jm-lang-wrap')) return;

    const curCode = getCurrentLang();
    const curLang = LANGS.find(l => l.code === curCode) || LANGS[0];

    /* Wrapper */
    const wrap = document.createElement('div');
    wrap.id = 'jm-lang-wrap';

    /* Button */
    const btn = document.createElement('button');
    btn.id = 'jm-lang-btn';
    btn.setAttribute('aria-label', 'Switch language / भाषा बदलें');
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      <span id="jm-lang-cur">${curLang.native}</span>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9"/>
      </svg>`;

    /* Dropdown */
    const dd = document.createElement('div');
    dd.id = 'jm-lang-dropdown';

    const hd = document.createElement('div');
    hd.className = 'jm-lang-hd';
    hd.textContent = 'Choose language';
    dd.appendChild(hd);

    LANGS.forEach(lang => {
      const item = document.createElement('button');
      item.className = 'jm-lang-item' + (lang.code === curCode ? ' active' : '');
      item.dataset.code = lang.code;
      item.innerHTML = `<span class="jm-lang-native">${lang.native}</span>${lang.label}` +
        (lang.code === curCode ? '<span class="jm-lang-check">✓</span>' : '');
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        dd.classList.remove('open');
        btn.classList.remove('open');
        setLanguage(lang.code);
      });
      dd.appendChild(item);
    });

    wrap.appendChild(btn);
    wrap.appendChild(dd);

    /* Toggle */
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = dd.classList.toggle('open');
      btn.classList.toggle('open', isOpen);
    });
    document.addEventListener('click', function () {
      dd.classList.remove('open');
      btn.classList.remove('open');
    });

    /* ── Insert position ─────────────────────────────────── */
    // index.html has .ltg fake picker — replace it
    const ltg = nav.querySelector('.ltg');
    if (ltg) {
      ltg.replaceWith(wrap);
      return;
    }
    // All other pages: insert before the last nav child (CTA / nav-r)
    const children = Array.from(nav.children);
    const last = children[children.length - 1];
    nav.insertBefore(wrap, last);
  }

  /* ── Auto-translate on page load if language was previously set ── */
  function autoTranslateOnLoad() {
    const saved = localStorage.getItem('jm_lang');
    if (saved && saved !== 'en') {
      translatePage(saved);
    }
  }

  /* ── Run ─────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectPicker();
      autoTranslateOnLoad();
    });
  } else {
    injectPicker();
    autoTranslateOnLoad();
  }
})();

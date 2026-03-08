/*!
 * JanMitra Auth Gate
 * Shows a polished login-required modal when an unauthenticated user tries to
 * use a protected feature. Call window.requireAuth(featureName, [subText], callback).
 * If already logged in the callback runs immediately; otherwise the modal appears.
 */
(function () {
  const ID = 'jm-auth-gate-modal';

  function inject() {
    if (document.getElementById(ID)) return;

    const style = document.createElement('style');
    style.textContent = `
      #jm-auth-gate-modal{display:none;position:fixed;inset:0;z-index:9000;align-items:center;justify-content:center;padding:20px}
      #jm-auth-gate-modal.open{display:flex}
      #jm-auth-gate-modal .ag-bd{position:absolute;inset:0;background:rgba(12,35,64,.55);backdrop-filter:blur(5px);cursor:pointer}
      #jm-auth-gate-modal .ag-card{position:relative;background:#fff;border-radius:20px;padding:40px 32px 32px;max-width:420px;width:100%;box-shadow:0 28px 70px rgba(12,35,64,.24);text-align:center;animation:agUp .3s cubic-bezier(.16,1,.3,1)}
      @keyframes agUp{from{opacity:0;transform:translateY(28px) scale(.95)}to{opacity:1;transform:none}}
      #jm-auth-gate-modal .ag-close{position:absolute;top:14px;right:16px;background:none;border:none;font-size:20px;color:#7A8E9A;cursor:pointer;line-height:1;padding:4px 6px;border-radius:6px;transition:all .18s}
      #jm-auth-gate-modal .ag-close:hover{background:#FAF6F0;color:#0C2340}
      #jm-auth-gate-modal .ag-icon{font-size:52px;display:block;margin-bottom:16px;animation:agBounce .5s .2s both}
      @keyframes agBounce{0%{transform:scale(0) rotate(-10deg)}70%{transform:scale(1.15) rotate(4deg)}100%{transform:scale(1) rotate(0)}}
      #jm-auth-gate-modal .ag-title{font-family:'Playfair Display',serif;font-weight:900;font-size:23px;color:#0C2340;margin-bottom:8px;line-height:1.25}
      #jm-auth-gate-modal .ag-title em{color:#D4611A;font-style:normal}
      #jm-auth-gate-modal .ag-sub{font-family:'DM Sans',sans-serif;font-size:14px;color:#7A8E9A;margin-bottom:26px;line-height:1.65}
      #jm-auth-gate-modal .ag-btns{display:flex;flex-direction:column;gap:10px}
      #jm-auth-gate-modal .ag-primary{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;background:#D4611A;color:#fff;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;transition:all .22s}
      #jm-auth-gate-modal .ag-primary:hover{background:#0C2340;transform:translateY(-2px);box-shadow:0 6px 20px rgba(212,97,26,.35)}
      #jm-auth-gate-modal .ag-secondary{display:flex;align-items:center;justify-content:center;padding:13px 20px;background:transparent;color:#0C2340;border:1.5px solid rgba(12,35,64,.15);border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .22s}
      #jm-auth-gate-modal .ag-secondary:hover{border-color:#0C2340;background:#FAF6F0}
      #jm-auth-gate-modal .ag-divider{display:flex;align-items:center;gap:10px;margin:6px 0;color:#7A8E9A;font-family:'DM Sans',sans-serif;font-size:12px}
      #jm-auth-gate-modal .ag-divider::before,#jm-auth-gate-modal .ag-divider::after{content:'';flex:1;height:1px;background:rgba(12,35,64,.1)}
      #jm-auth-gate-modal .ag-later{display:block;margin-top:16px;font-family:'DM Sans',sans-serif;font-size:12.5px;color:#7A8E9A;cursor:pointer;transition:color .18s;background:none;border:none;width:100%;text-align:center}
      #jm-auth-gate-modal .ag-later:hover{color:#0C2340}
      #jm-auth-gate-modal .ag-trust{display:flex;justify-content:center;gap:16px;margin-top:18px;padding-top:16px;border-top:1px solid rgba(12,35,64,.07)}
      #jm-auth-gate-modal .ag-trust span{font-family:'DM Sans',sans-serif;font-size:11px;color:#7A8E9A}
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = ID;
    wrap.innerHTML = `
      <div class="ag-bd" id="jm-ag-bd"></div>
      <div class="ag-card" role="dialog" aria-modal="true" aria-labelledby="jm-ag-title">
        <button class="ag-close" id="jm-ag-close" aria-label="Close">✕</button>
        <span class="ag-icon" id="jm-ag-icon">🔐</span>
        <div class="ag-title" id="jm-ag-title">Sign in to <em id="jm-ag-feature">use this feature</em></div>
        <p class="ag-sub" id="jm-ag-sub">Create your free JanMitra account to save your progress and get personalised government scheme recommendations.</p>
        <div class="ag-btns">
          <a href="login.html" class="ag-primary" id="jm-ag-signin">🔑 Sign In to JanMitra</a>
          <div class="ag-divider">or</div>
          <a href="login.html" class="ag-secondary" id="jm-ag-register">Create Free Account</a>
        </div>
        <button class="ag-later" id="jm-ag-later">Maybe later</button>
        <div class="ag-trust">
          <span>🔒 SSL Secured</span>
          <span>🇮🇳 Govt. Scheme Data</span>
          <span>🛡️ No Data Sharing</span>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    function close() { wrap.classList.remove('open'); }
    document.getElementById('jm-ag-bd').addEventListener('click', close);
    document.getElementById('jm-ag-close').addEventListener('click', close);
    document.getElementById('jm-ag-later').addEventListener('click', close);
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') close(); });
  }

  function isAuthenticated() {
    var token = localStorage.getItem('jm_token');
    if (!token) return false;
    try {
      var payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('jm_token');
        localStorage.removeItem('jm_user');
        return false;
      }
      return true;
    } catch (e) { return false; }
  }

  /**
   * requireAuth(featureName, [subText], [icon], callback)
   *
   * Signatures supported:
   *   requireAuth('save schemes', callback)
   *   requireAuth('save schemes', 'Custom sub text', callback)
   */
  window.requireAuth = function (featureName, subOrCallback, callbackOrUndefined) {
    var subText  = typeof subOrCallback === 'string' ? subOrCallback : null;
    var callback = typeof subOrCallback === 'function' ? subOrCallback : callbackOrUndefined;

    if (isAuthenticated()) { if (callback) callback(); return; }

    inject();

    /* Update modal content */
    document.getElementById('jm-ag-feature').textContent = featureName;
    if (subText) document.getElementById('jm-ag-sub').textContent = subText;

    /* Build return URL so login sends the user back here */
    var returnUrl = encodeURIComponent(window.location.href);
    document.getElementById('jm-ag-signin').href   = 'login.html?return=' + returnUrl;
    document.getElementById('jm-ag-register').href = 'login.html?mode=create&return=' + returnUrl;

    document.getElementById(ID).classList.add('open');
  };

  /* Inject eagerly so the modal DOM is ready before any interaction */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

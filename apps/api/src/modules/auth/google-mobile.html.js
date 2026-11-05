/**
 * Mobile Google Sign-In bridge.
 *
 * Primary path: OAuth redirect (id_token) → /api/v1/auth/google/mobile-callback
 *   Google Console → Web client → Authorized redirect URIs:
 *     https://project1-api.vercel.app/api/v1/auth/google/mobile-callback
 *
 * Fallback: GIS button (needs Authorized JavaScript origins):
 *     https://project1-api.vercel.app
 *
 * OAuth consent → Testing: add your Gmail as a Test user.
 */
export function renderGoogleMobileHtml({
  clientId,
  redirectScheme = 'lifelink',
  origin = '',
  returnUrl = '',
}) {
  const safeClientId = String(clientId || '').replace(/"/g, '');
  const safeScheme = String(redirectScheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '');
  const safeOrigin = String(origin || 'https://project1-api.vercel.app').replace(/\/$/, '').replace(/"/g, '');
  const safeReturn = String(returnUrl || '').replace(/"/g, '');
  const redirectUri = `${safeOrigin}/api/v1/auth/google/mobile-callback`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <title>LifeLink · Sign in with Google</title>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; font-family: "Segoe UI", system-ui, sans-serif;
      background: linear-gradient(165deg, #f8fafc 0%, #e8eef5 100%);
      color: #0f172a; display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .card {
      width: 100%; max-width: 400px; background: #fff; border: 1px solid #e2e8f0;
      border-radius: 28px; padding: 28px 24px; box-shadow: 0 18px 40px rgba(15,23,42,.08);
    }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .logo {
      width: 44px; height: 44px; border-radius: 16px; background: #0f172a; color: #fff;
      display: grid; place-items: center; font-weight: 800; font-size: 14px;
    }
    h1 { margin: 0; font-size: 22px; letter-spacing: -0.03em; }
    p { margin: 8px 0 0; font-size: 13px; line-height: 1.5; color: #64748b; }
    .cta {
      margin-top: 20px; width: 100%; height: 52px; border: none; border-radius: 999px;
      background: #0f172a; color: #fff; font-weight: 800; font-size: 15px; cursor: pointer;
    }
    .cta:active { opacity: 0.9; }
    #google-btn { margin-top: 14px; display: flex; justify-content: center; min-height: 44px; }
    .hint { margin-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.45; }
    .err {
      display: none; margin-top: 14px; padding: 10px 12px; border-radius: 14px;
      background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 12px; line-height: 1.45;
    }
    .ok {
      display: none; margin-top: 14px; padding: 10px 12px; border-radius: 14px;
      background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 12px;
    }
    .setup {
      margin-top: 14px; padding: 10px 12px; border-radius: 14px; background: #eff6ff;
      border: 1px solid #bfdbfe; color: #1e3a8a; font-size: 11px; line-height: 1.45;
    }
    code { font-size: 10px; word-break: break-all; }
  </style>
</head>
<body>
  <main class="card">
    <div class="brand">
      <div class="logo">LL</div>
      <div>
        <h1>LifeLink</h1>
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b">Patient sign-in</p>
      </div>
    </div>
    <p>Continue with Google. You will return to the LifeLink app automatically.</p>
    <button type="button" class="cta" id="oauth-btn">Continue with Google</button>
    <div id="google-btn"></div>
    <div id="ok" class="ok">Signed in — returning to LifeLink…</div>
    <div id="err" class="err"></div>
    <div class="setup">
      <b>If Google shows Access blocked</b>:<br/>
      1) OAuth consent → <b>Testing</b> → add your Gmail as a <b>Test user</b><br/>
      2) Web client → Authorized <b>redirect URIs</b> add:<br/>
      <code>${redirectUri}</code><br/>
      3) Authorized <b>JavaScript origins</b> add:<br/>
      <code>${safeOrigin}</code>
    </div>
    <p class="hint">OAuth redirect on Vercel · no LAN IP · ABDM-ready</p>
  </main>
  <script>
    (function () {
      var CLIENT_ID = "${safeClientId}";
      var SCHEME = "${safeScheme}";
      var RETURN_URL = "${safeReturn}";
      var REDIRECT_URI = "${redirectUri}";
      var errEl = document.getElementById('err');
      var okEl = document.getElementById('ok');

      function showError(msg) {
        errEl.style.display = 'block';
        errEl.innerHTML = msg || 'Google sign-in failed';
        okEl.style.display = 'none';
      }

      function buildDeepLink(idToken) {
        var token = encodeURIComponent(idToken);
        if (RETURN_URL) {
          var join = RETURN_URL.indexOf('?') >= 0 ? '&' : '?';
          return RETURN_URL + join + 'id_token=' + token;
        }
        return SCHEME + '://oauth?id_token=' + token;
      }

      function finish(idToken) {
        if (!idToken) {
          showError('No Google credential returned. Try again.');
          return;
        }
        okEl.style.display = 'block';
        errEl.style.display = 'none';
        var url = buildDeepLink(idToken);
        try { window.location.href = url; } catch (e) {}
        setTimeout(function () { try { window.location.replace(url); } catch (e) {} }, 200);
      }

      function randomNonce() {
        var bytes = new Uint8Array(16);
        (window.crypto || window.msCrypto).getRandomValues(bytes);
        return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      }

      function startOauthRedirect() {
        if (!CLIENT_ID) {
          showError('Google client ID is not configured on the API.');
          return;
        }
        var statePayload = btoa(unescape(encodeURIComponent(JSON.stringify({
          return_url: RETURN_URL,
          scheme: SCHEME
        }))));
        var url = 'https://accounts.google.com/o/oauth2/v2/auth'
          + '?client_id=' + encodeURIComponent(CLIENT_ID)
          + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI)
          + '&response_type=id_token'
          + '&scope=' + encodeURIComponent('openid email profile')
          + '&nonce=' + encodeURIComponent(randomNonce())
          + '&state=' + encodeURIComponent(statePayload)
          + '&prompt=select_account';
        window.location.href = url;
      }

      document.getElementById('oauth-btn').addEventListener('click', startOauthRedirect);

      // Auto-start OAuth (most reliable in Chrome Custom Tabs)
      setTimeout(startOauthRedirect, 350);

      // GIS button as secondary option (if JS origin is configured)
      function bootGis() {
        if (!window.google || !google.accounts || !google.accounts.id) {
          setTimeout(bootGis, 150);
          return;
        }
        try {
          google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: function (response) { finish(response && response.credential); },
            use_fedcm_for_prompt: false,
            auto_select: false
          });
          var host = document.getElementById('google-btn');
          host.innerHTML = '';
          google.accounts.id.renderButton(host, {
            theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 320
          });
        } catch (e) { /* GIS optional */ }
      }
      bootGis();
    })();
  </script>
</body>
</html>`;
}

export function renderGoogleMobileCallbackHtml({
  redirectScheme = 'lifelink',
  idToken = '',
  returnUrl = '',
  state = '',
}) {
  const safeScheme = String(redirectScheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '');
  const token = String(idToken || '').replace(/"/g, '');
  let safeReturn = String(returnUrl || '').replace(/"/g, '');
  // Recover return_url from OAuth state if needed
  if (!safeReturn && state) {
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(String(state)))));
      if (parsed?.return_url) safeReturn = String(parsed.return_url).replace(/"/g, '');
      if (parsed?.scheme) {
        // scheme already in safeScheme default
      }
    } catch {
      /* ignore */
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Returning to LifeLink…</title>
  <style>
    body { font-family: system-ui, sans-serif; display:grid; place-items:center; min-height:100vh; margin:0; background:#f8fafc; color:#0f172a; }
    p { font-size: 14px; color:#64748b; text-align:center; padding: 0 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <p id="msg">Signing you in…</p>
  <script>
    (function () {
      var SCHEME = "${safeScheme}";
      var RETURN_URL = "${safeReturn}";
      var preset = "${token}";
      var hash = window.location.hash ? window.location.hash.substring(1) : '';
      var query = window.location.search ? window.location.search.substring(1) : '';
      var params = new URLSearchParams(hash || query);
      // Also merge query if hash present
      if (hash && query) {
        var qParams = new URLSearchParams(query);
        qParams.forEach(function (v, k) { if (!params.has(k)) params.set(k, v); });
      }
      var idToken = preset || params.get('id_token') || params.get('credential');
      var error = params.get('error');
      var state = params.get('state') || '';
      if (!RETURN_URL && state) {
        try {
          var st = JSON.parse(decodeURIComponent(escape(atob(state))));
          if (st && st.return_url) RETURN_URL = st.return_url;
          if (st && st.scheme) SCHEME = st.scheme;
        } catch (e) {}
      }
      var msg = document.getElementById('msg');
      if (error) {
        msg.innerHTML = 'Google blocked or cancelled sign-in (<b>' + error + '</b>).<br/>Add redirect URI + Test user in Google Cloud, then try again.';
        return;
      }
      if (!idToken) {
        msg.textContent = 'No Google credential found. Close and try again.';
        return;
      }
      var token = encodeURIComponent(idToken);
      var url = RETURN_URL
        ? (RETURN_URL + (RETURN_URL.indexOf('?') >= 0 ? '&' : '?') + 'id_token=' + token)
        : (SCHEME + '://oauth?id_token=' + token);
      msg.textContent = 'Success — returning to LifeLink…';
      window.location.href = url;
      setTimeout(function () { window.location.replace(url); }, 250);
      setTimeout(function () {
        var a = document.createElement('a');
        a.href = url;
        a.click();
      }, 500);
    })();
  </script>
</body>
</html>`;
}

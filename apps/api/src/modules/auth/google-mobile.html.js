/**
 * Expo Go Google Sign-In bridge (HTTPS on project1-api.vercel.app).
 *
 * Primary: GIS button (needs JS origin https://project1-api.vercel.app)
 * Secondary: Auth-code + PKCE (needs redirect URI + GOOGLE_CLIENT_SECRET on Vercel)
 *
 * Google Cloud → Web client:
 *   JS origins: https://project1-api.vercel.app
 *   Redirect URI: https://project1-api.vercel.app/api/v1/auth/google/mobile-callback
 *   Consent → Testing → add your Gmail as Test user
 * Vercel env: GOOGLE_CLIENT_SECRET = Web client secret
 */
export function renderGoogleMobileHtml({
  clientId,
  redirectScheme = 'lifelink',
  origin = 'https://project1-api.vercel.app',
  returnUrl = '',
  autoStart = false,
  hasClientSecret = false,
}) {
  const safeClientId = String(clientId || '').replace(/"/g, '');
  const safeScheme = String(redirectScheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '');
  const safeOrigin = 'https://project1-api.vercel.app';
  const safeReturn = String(returnUrl || '').replace(/"/g, '');
  const redirectUri = `${safeOrigin}/api/v1/auth/google/mobile-callback`;
  const auto = autoStart ? '1' : '0';
  const secretReady = hasClientSecret ? '1' : '0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <title>LifeLink · Sign in</title>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh;
      font-family: "Segoe UI", system-ui, sans-serif;
      background:
        radial-gradient(1000px 500px at 0% 0%, #dbeafe 0%, transparent 55%),
        radial-gradient(800px 400px at 100% 0%, #ecfccb 0%, transparent 50%),
        #f8fafc;
      color: #0f172a;
      display: flex; align-items: center; justify-content: center;
      padding: 28px 20px;
    }
    .card {
      width: 100%; max-width: 420px; background: #fff;
      border: 1px solid #e2e8f0; border-radius: 32px; padding: 32px 28px;
      box-shadow: 0 24px 60px rgba(15,23,42,.08);
    }
    .logo {
      width: 52px; height: 52px; border-radius: 18px; background: #0f172a; color: #fff;
      display: grid; place-items: center; font-weight: 800; font-size: 15px;
    }
    .brand { margin-top: 18px; font-size: 28px; font-weight: 800; letter-spacing: -0.04em; }
    .sub { margin-top: 6px; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #64748b; }
    .copy { margin-top: 14px; font-size: 14px; line-height: 1.55; color: #64748b; }
    #google-btn { margin-top: 22px; display: flex; justify-content: center; min-height: 44px; }
    .cta {
      margin-top: 12px; width: 100%; height: 52px; border: 0; border-radius: 999px;
      background: #0f172a; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer;
    }
    .ghost {
      margin-top: 10px; width: 100%; height: 48px; border-radius: 999px;
      border: 1px solid #e2e8f0; background: #fff; color: #0f172a;
      font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .status { display: none; margin-top: 14px; padding: 12px 14px; border-radius: 16px; font-size: 12px; line-height: 1.45; }
    .ok { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
    .err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
    .setup {
      margin-top: 16px; padding: 12px 14px; border-radius: 16px;
      background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; font-size: 11px; line-height: 1.5;
    }
    code { font-size: 10px; word-break: break-all; color: #0f172a; font-weight: 700; }
    .hint { margin-top: 14px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <main class="card">
    <div class="logo">LL</div>
    <div class="brand">LifeLink</div>
    <div class="sub">Patient sign-in · Expo Go</div>
    <p class="copy">Tap the Google button below. After Google confirms, you return to LifeLink automatically.</p>
    <div id="google-btn"></div>
    <button type="button" class="cta" id="oauth-btn">Continue with Google (browser)</button>
    <button type="button" class="ghost" id="retry-btn" style="display:none">Try again</button>
    <div id="ok" class="status ok">Signed in — returning to LifeLink…</div>
    <div id="err" class="status err"></div>
    <div class="setup">
      <b>If you see Access blocked</b><br/>
      1) Google Cloud → Web client → <b>JavaScript origins</b>:<br/>
      <code>${safeOrigin}</code><br/>
      2) <b>Redirect URI</b>:<br/>
      <code>${redirectUri}</code><br/>
      3) Consent → Testing → add your Gmail as <b>Test user</b><br/>
      4) Vercel env <code>GOOGLE_CLIENT_SECRET</code> = Web client secret
      ${secretReady === '1' ? '' : '<br/><b style="color:#b91c1c">Client secret not detected on API yet.</b>'}
    </div>
    <p class="hint">GIS + PKCE · ${safeOrigin}</p>
  </main>
  <script>
    (function () {
      var CLIENT_ID = "${safeClientId}";
      var SCHEME = "${safeScheme}";
      var RETURN_URL = "${safeReturn}";
      var REDIRECT_URI = "${redirectUri}";
      var AUTO = "${auto}" === "1";
      var btn = document.getElementById('oauth-btn');
      var retry = document.getElementById('retry-btn');
      var okEl = document.getElementById('ok');
      var errEl = document.getElementById('err');

      function showErr(msg) {
        errEl.style.display = 'block';
        errEl.innerHTML = msg || 'Could not start Google sign-in';
        okEl.style.display = 'none';
        btn.disabled = false;
        retry.style.display = 'block';
      }

      function finish(idToken) {
        if (!idToken) { showErr('No Google credential returned.'); return; }
        okEl.style.display = 'block';
        errEl.style.display = 'none';
        var url = RETURN_URL
          ? (RETURN_URL + (RETURN_URL.indexOf('?') >= 0 ? '&' : '?') + 'id_token=' + encodeURIComponent(idToken))
          : (SCHEME + '://oauth?id_token=' + encodeURIComponent(idToken));
        try { window.location.href = url; } catch (e) {}
        setTimeout(function () { try { window.location.replace(url); } catch (e) {} }, 200);
      }

      function b64url(bytes) {
        var str = '';
        bytes.forEach(function (b) { str += String.fromCharCode(b); });
        return btoa(str).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');
      }
      function randomBytes(n) {
        var a = new Uint8Array(n);
        crypto.getRandomValues(a);
        return a;
      }
      function sha256(plain) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain)).then(function (buf) {
          return b64url(new Uint8Array(buf));
        });
      }

      function startOauth() {
        if (!CLIENT_ID) { showErr('Google client ID missing on API.'); return; }
        btn.disabled = true;
        okEl.style.display = 'block';
        okEl.textContent = 'Opening Google securely…';
        errEl.style.display = 'none';
        var verifier = b64url(randomBytes(32));
        sha256(verifier).then(function (challenge) {
          var stateObj = { return_url: RETURN_URL, scheme: SCHEME, code_verifier: verifier, v: 2 };
          var state = btoa(unescape(encodeURIComponent(JSON.stringify(stateObj))))
            .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');
          var url = 'https://accounts.google.com/o/oauth2/v2/auth'
            + '?client_id=' + encodeURIComponent(CLIENT_ID)
            + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI)
            + '&response_type=code'
            + '&scope=' + encodeURIComponent('openid email profile')
            + '&code_challenge=' + encodeURIComponent(challenge)
            + '&code_challenge_method=S256'
            + '&state=' + encodeURIComponent(state)
            + '&prompt=select_account';
          window.location.href = url;
        }).catch(function (e) {
          showErr((e && e.message) || 'Could not start secure Google login.');
        });
      }

      function bootGis() {
        if (!window.google || !google.accounts || !google.accounts.id) {
          setTimeout(bootGis, 120);
          return;
        }
        try {
          google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: function (res) { finish(res && res.credential); },
            use_fedcm_for_prompt: false,
            auto_select: false,
            itp_support: true
          });
          var host = document.getElementById('google-btn');
          host.innerHTML = '';
          google.accounts.id.renderButton(host, {
            theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 320
          });
        } catch (e) {
          showErr('Google button failed to load. Use “Continue with Google (browser)”.');
        }
      }

      btn.addEventListener('click', startOauth);
      retry.addEventListener('click', startOauth);
      bootGis();
      if (AUTO) setTimeout(startOauth, 500);
    })();
  </script>
</body>
</html>`;
}

export function renderGoogleMobileCallbackHtml({
  redirectScheme = 'lifelink',
  idToken = '',
  returnUrl = '',
  error = '',
  errorDetail = '',
}) {
  const safeScheme = String(redirectScheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '');
  const token = String(idToken || '').replace(/"/g, '');
  const safeReturn = String(returnUrl || '').replace(/"/g, '');
  const err = String(error || '').replace(/"/g, '');
  const detail = String(errorDetail || '').replace(/"/g, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Returning to LifeLink…</title>
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center; background:#f8fafc; font-family:system-ui,sans-serif; color:#0f172a; }
    .box { max-width: 360px; padding: 24px; text-align:center; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p { font-size: 13px; color:#64748b; line-height:1.5; margin:0; }
    .err { color:#b91c1c; }
  </style>
</head>
<body>
  <div class="box">
    <h1 id="title">Signing you in…</h1>
    <p id="msg">Returning to the LifeLink app.</p>
  </div>
  <script>
    (function () {
      var SCHEME = "${safeScheme}";
      var RETURN_URL = "${safeReturn}";
      var idToken = "${token}";
      var error = "${err}";
      var detail = "${detail}";
      var title = document.getElementById('title');
      var msg = document.getElementById('msg');
      if (error) {
        title.textContent = 'Google sign-in blocked';
        title.className = 'err';
        msg.innerHTML = (detail || error) + '<br/><br/>Add JS origin + redirect URI + Test user in Google Cloud, then retry.';
        return;
      }
      if (!idToken) {
        title.textContent = 'No credential';
        msg.textContent = 'Close this tab and try again from the app.';
        return;
      }
      var deep = RETURN_URL
        ? (RETURN_URL + (RETURN_URL.indexOf('?') >= 0 ? '&' : '?') + 'id_token=' + encodeURIComponent(idToken))
        : (SCHEME + '://oauth?id_token=' + encodeURIComponent(idToken));
      title.textContent = 'Success';
      msg.textContent = 'Opening LifeLink…';
      window.location.href = deep;
      setTimeout(function () { window.location.replace(deep); }, 250);
    })();
  </script>
</body>
</html>`;
}

export function decodeGoogleMobileState(state) {
  if (!state) return null;
  try {
    let s = String(state).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return JSON.parse(decodeURIComponent(escape(Buffer.from(s, 'base64').toString('utf8'))));
  } catch {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(String(state)))));
    } catch {
      return null;
    }
  }
}

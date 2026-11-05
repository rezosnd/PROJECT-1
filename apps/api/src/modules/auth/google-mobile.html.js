/**
 * Mobile Google Sign-In bridge for Expo.
 *
 * Prefer Chrome Custom Tabs / SFSafariViewController (not an embedded WebView).
 * GIS button with JavaScript origins — add your API origin under Authorized JavaScript origins.
 *
 * Google no longer accepts LAN IPs (10.x / 192.168.x) as JavaScript origins.
 * Use localhost (desktop) or a public HTTPS tunnel (phone):
 *   http://localhost:5000
 *   http://127.0.0.1:5000
 *   https://YOUR-SUBDOMAIN.trycloudflare.com
 *
 * OAuth consent → Testing: add the Gmail you sign in with as a Test user.
 */
export function renderGoogleMobileHtml({
  clientId,
  redirectScheme = 'lifelink',
  origin = '',
  returnUrl = '',
}) {
  const safeClientId = String(clientId || '').replace(/"/g, '');
  const safeScheme = String(redirectScheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '');
  const safeOrigin = String(origin || '').replace(/"/g, '');
  const safeReturn = String(returnUrl || '').replace(/"/g, '');

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
      background: linear-gradient(165deg, #f8fafc 0%, #eef2f6 100%);
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
    #google-btn { margin-top: 20px; display: flex; justify-content: center; min-height: 44px; }
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
    .manual {
      margin-top: 12px; width: 100%; height: 44px; border-radius: 999px; border: 1px solid #e2e8f0;
      background: #0f172a; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer;
      display: none;
    }
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
    <p>Tap Continue with Google. When Google confirms, you return to the LifeLink app automatically.</p>
    <div id="google-btn"></div>
    <button type="button" id="manual" class="manual">Retry Google Sign-In</button>
    <div id="ok" class="ok">Signed in — returning to LifeLink…</div>
    <div id="err" class="err"></div>
    <div class="setup">
      <b>Google origin rules</b>:<br/>
      LAN IPs like <code>http://10.x.x.x:5000</code> are <b>rejected</b> (“must end with a public TLD”).<br/>
      Add a <b>localhost</b> or <b>HTTPS tunnel</b> origin instead, e.g.<br/>
      <code>${safeOrigin || 'https://YOUR-TUNNEL.trycloudflare.com'}</code><br/>
      Also add your Gmail as an OAuth <b>Test user</b>.
    </div>
    <p class="hint">GIS callback · JS origin only · ABDM-ready</p>
  </main>
  <script>
    (function () {
      var CLIENT_ID = "${safeClientId}";
      var SCHEME = "${safeScheme}";
      var RETURN_URL = "${safeReturn}";
      var errEl = document.getElementById('err');
      var okEl = document.getElementById('ok');
      var manualBtn = document.getElementById('manual');

      function showError(msg) {
        errEl.style.display = 'block';
        errEl.innerHTML = msg || 'Google sign-in failed';
        okEl.style.display = 'none';
        manualBtn.style.display = 'block';
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
        setTimeout(function () {
          try { window.location.replace(url); } catch (e) {}
        }, 250);
        setTimeout(function () {
          var a = document.createElement('a');
          a.href = url;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
        }, 500);
      }

      function initGis() {
        if (!CLIENT_ID) {
          showError('Google client ID is not configured on the API server.');
          return;
        }
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false,
          itp_support: true,
          callback: function (response) {
            finish(response && response.credential);
          },
          error_callback: function (err) {
            var detail = (err && (err.message || err.type || err.reason)) || 'unknown';
            showError(
              'Google blocked this sign-in (' + detail + '). ' +
              'Add your Gmail as an OAuth <b>Test user</b> and ensure JS origin <code>${safeOrigin}</code> is listed.'
            );
          }
        });

        var host = document.getElementById('google-btn');
        host.innerHTML = '';
        google.accounts.id.renderButton(host, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 320,
          logo_alignment: 'left'
        });
      }

      function boot() {
        if (!window.google || !google.accounts || !google.accounts.id) {
          setTimeout(boot, 120);
          return;
        }
        try {
          initGis();
        } catch (e) {
          showError((e && e.message) || 'Could not start Google Sign-In');
        }
      }

      manualBtn.addEventListener('click', function () {
        errEl.style.display = 'none';
        boot();
      });

      boot();
    })();
  </script>
</body>
</html>`;
}

export function renderGoogleMobileCallbackHtml({ redirectScheme = 'lifelink', idToken = '', returnUrl = '' }) {
  const safeScheme = String(redirectScheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '');
  const token = String(idToken || '').replace(/"/g, '');
  const safeReturn = String(returnUrl || '').replace(/"/g, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Returning to LifeLink…</title>
  <style>
    body { font-family: system-ui, sans-serif; display:grid; place-items:center; min-height:100vh; margin:0; background:#f8fafc; color:#0f172a; }
    p { font-size: 14px; color:#64748b; text-align:center; padding: 0 24px; }
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
      var idToken = preset || params.get('id_token') || params.get('credential');
      var error = params.get('error');
      var msg = document.getElementById('msg');
      if (error) {
        msg.textContent = 'Google sign-in was cancelled or blocked (' + error + '). Close and try again.';
        return;
      }
      if (!idToken) {
        msg.textContent = 'No Google credential found. Close this window and try again.';
        return;
      }
      var token = encodeURIComponent(idToken);
      var url = RETURN_URL
        ? (RETURN_URL + (RETURN_URL.indexOf('?') >= 0 ? '&' : '?') + 'id_token=' + token)
        : (SCHEME + '://oauth?id_token=' + token);
      msg.textContent = 'Success — returning to LifeLink…';
      window.location.href = url;
      setTimeout(function () { window.location.replace(url); }, 300);
    })();
  </script>
</body>
</html>`;
}

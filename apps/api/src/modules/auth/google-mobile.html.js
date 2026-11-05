/**
 * Expo Go Google Sign-In bridge (HTTPS on project1-api.vercel.app).
 *
 * Preferred path: /google/mobile-start (server PKCE) → Google → mobile-callback → short ticket.
 * GIS button is a backup that only needs JS origin (no client secret).
 */
export function renderGoogleMobileHtml({
  clientId,
  redirectScheme = 'lifelink',
  origin = 'https://project1-api.vercel.app',
  returnUrl = '',
  autoStart = false,
  hasClientSecret = false,
  startUrl = '',
}) {
  const safeClientId = String(clientId || '').replace(/"/g, '');
  const safeScheme = String(redirectScheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '');
  const safeOrigin = 'https://project1-api.vercel.app';
  const safeReturn = String(returnUrl || '').replace(/"/g, '');
  const redirectUri = `${safeOrigin}/api/v1/auth/google/mobile-callback`;
  const ticketApi = `${safeOrigin}/api/v1/auth/google/mobile-ticket`;
  const safeStart =
    String(startUrl || `${safeOrigin}/api/v1/auth/google/mobile-start`).replace(/"/g, '') ||
    `${safeOrigin}/api/v1/auth/google/mobile-start`;
  const auto = autoStart ? '1' : '0';
  const secretReady = hasClientSecret ? '1' : '0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <title>GetMyHospital · Sign in</title>
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
    .logo-img {
      width: 100%; max-width: 280px; height: auto; background: transparent;
      display: block; margin: 0 auto;
    }
    .brand { margin-top: 18px; font-size: 22px; font-weight: 800; letter-spacing: -0.04em; text-align:center; }
    .brand span.g { color: #0B3D1A; } .brand span.h { color: #6B9A0A; }
    .sub { margin-top: 6px; font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #64748b; text-align:center; }
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
    <img class="logo-img" src="${safeOrigin}/brand/logo.png" alt="GetMyHospital" />
    <div class="brand"><span class="g">GetMy</span><span class="h">Hospital</span></div>
    <div class="sub">FIND BEDS · BOOK CARE · SAVE LIVES</div>
    <p class="copy">Tap Continue with Google. After Google confirms, you return to GetMyHospital automatically.</p>
    <div id="google-btn"></div>
    <button type="button" class="cta" id="oauth-btn">Continue with Google</button>
    <button type="button" class="ghost" id="retry-btn" style="display:none">Try again</button>
    <div id="ok" class="status ok">Signed in — returning to GetMyHospital…</div>
    <div id="err" class="status err"></div>
    <div class="setup">
      <b>Still blocked?</b><br/>
      Web OAuth client only. Add exactly:<br/>
      Origin <code>${safeOrigin}</code><br/>
      Redirect <code>${redirectUri}</code><br/>
      Test user = your Gmail · Vercel needs <code>GOOGLE_CLIENT_SECRET</code>
      ${secretReady === '1' ? '' : '<br/><br/><b style="color:#b91c1c">Client secret not detected on API yet.</b>'}
    </div>
    <p class="hint">Secure server PKCE · Expo Go</p>
  </main>
  <script>
    (function () {
      var CLIENT_ID = "${safeClientId}";
      var SCHEME = "${safeScheme}";
      var RETURN_URL = "${safeReturn}";
      var TICKET_API = "${ticketApi}";
      var START_URL = "${safeStart}";
      var AUTO = "${auto}" === "1";
      var SECRET_READY = "${secretReady}" === "1";
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

      function openApp(ticket) {
        var q = 'ticket=' + encodeURIComponent(ticket);
        var links = [];
        if (RETURN_URL) links.push(RETURN_URL + (RETURN_URL.indexOf('?') >= 0 ? '&' : '?') + q);
        links.push(SCHEME + '://oauth?' + q);
        var i = 0;
        function go() {
          if (i >= links.length) return;
          var url = links[i++];
          try { window.location.href = url; } catch (e) {}
          setTimeout(go, 400);
        }
        go();
      }

      function finish(idToken) {
        if (!idToken) { showErr('No Google credential returned.'); return; }
        okEl.style.display = 'block';
        okEl.textContent = 'Signed in — opening GetMyHospital…';
        errEl.style.display = 'none';
        fetch(TICKET_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken, return_url: RETURN_URL, scheme: SCHEME })
        }).then(function (r) { return r.json(); }).then(function (data) {
          var ticket = data && data.data && data.data.ticket;
          if (!ticket) throw new Error((data && data.error && data.error.message) || 'No ticket');
          if (data.data.open_url) {
            try { window.location.href = data.data.open_url; } catch (e) {}
            setTimeout(function () { openApp(ticket); }, 300);
          } else {
            openApp(ticket);
          }
        }).catch(function (e) {
          showErr((e && e.message) || 'Could not finish sign-in handoff.');
        });
      }

      function startOauth() {
        if (!CLIENT_ID) { showErr('Google client ID missing on API.'); return; }
        if (!SECRET_READY) {
          showErr('GOOGLE_CLIENT_SECRET missing on API. Set it on Vercel (Web client secret), redeploy, then retry. Or use the Google button above if it loads.');
          return;
        }
        btn.disabled = true;
        okEl.style.display = 'block';
        okEl.textContent = 'Opening Google securely…';
        errEl.style.display = 'none';
        var url = START_URL
          + (START_URL.indexOf('?') >= 0 ? '&' : '?')
          + 'scheme=' + encodeURIComponent(SCHEME)
          + '&return_url=' + encodeURIComponent(RETURN_URL);
        window.location.href = url;
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
          /* GIS optional — server PKCE button still works */
        }
      }

      btn.addEventListener('click', startOauth);
      retry.addEventListener('click', startOauth);
      bootGis();
      if (AUTO) setTimeout(startOauth, 300);
    })();
  </script>
</body>
</html>`;
}

export function renderGoogleMobileCallbackHtml({
  redirectScheme = 'lifelink',
  ticket = '',
  deepLinks = [],
  returnUrl = '',
  error = '',
  errorDetail = '',
}) {
  const safeScheme = String(redirectScheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '');
  const safeTicket = String(ticket || '').replace(/[^a-f0-9]/gi, '');
  const safeReturn = String(returnUrl || '').replace(/"/g, '');
  const err = String(error || '').replace(/"/g, '');
  const detail = String(errorDetail || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
  const links = Array.isArray(deepLinks) ? deepLinks.filter(Boolean) : [];
  if (safeTicket && !links.length) {
    const q = `ticket=${safeTicket}`;
    if (safeReturn) links.push(safeReturn + (safeReturn.includes('?') ? '&' : '?') + q);
    links.push(`${safeScheme}://oauth?${q}`);
  }
  const primary = links[0] || '';
  const linksJson = JSON.stringify(links).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Returning to GetMyHospital…</title>
  ${primary && !err ? `<meta http-equiv="refresh" content="0;url=${primary.replace(/"/g, '').replace(/&/g, '&amp;')}" />` : ''}
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center; background:#f8fafc; font-family:system-ui,sans-serif; color:#0f172a; padding:24px; }
    .box { max-width: 380px; width:100%; padding: 28px 22px; text-align:center; background:#fff; border:1px solid #e2e8f0; border-radius:28px; box-shadow:0 18px 50px rgba(15,23,42,.08); }
    h1 { font-size: 20px; margin: 0 0 8px; letter-spacing:-0.02em; }
    p { font-size: 13px; color:#64748b; line-height:1.5; margin:0; }
    .err { color:#b91c1c; }
    .btn {
      display:block; margin-top:20px; height:52px; line-height:52px; border-radius:999px;
      background:#0f172a; color:#fff !important; font-size:15px; font-weight:800; text-decoration:none;
    }
    .ghost {
      display:block; margin-top:10px; height:48px; line-height:48px; border-radius:999px;
      border:1px solid #e2e8f0; background:#fff; color:#0f172a !important; font-size:13px; font-weight:700; text-decoration:none;
    }
    .hint { margin-top:14px; font-size:11px; color:#94a3b8; }
  </style>
</head>
<body>
  <div class="box">
    <h1 id="title">Signing you in…</h1>
    <p id="msg">Returning to the GetMyHospital app.</p>
    <a id="open" class="btn" href="${primary.replace(/"/g, '')}" style="display:none">Open GetMyHospital</a>
    <a id="alt" class="ghost" href="#" style="display:none">Try alternate link</a>
    <p class="hint" id="hint" style="display:none">If nothing happens, tap the button above. Keep Expo Go in recent apps.</p>
  </div>
  <script>
    (function () {
      var links = ${linksJson};
      var ticket = "${safeTicket}";
      var error = "${err}";
      var detail = "${detail}";
      var title = document.getElementById('title');
      var msg = document.getElementById('msg');
      var openBtn = document.getElementById('open');
      var altBtn = document.getElementById('alt');
      var hint = document.getElementById('hint');

      if (error) {
        title.textContent = 'Google sign-in failed';
        title.className = 'err';
        msg.innerHTML = detail || error;
        return;
      }
      if (!ticket || !links.length) {
        title.textContent = 'No credential';
        msg.textContent = 'Close this tab and try again from the app.';
        return;
      }

      title.textContent = 'Success';
      msg.textContent = 'Opening GetMyHospital…';
      openBtn.href = links[0];
      openBtn.style.display = 'block';
      hint.style.display = 'block';
      if (links[1]) {
        altBtn.href = links[1];
        altBtn.style.display = 'block';
      }

      var i = 0;
      function tryNext() {
        if (i >= links.length) return;
        var url = links[i++];
        openBtn.href = url;
        try { window.location.href = url; } catch (e) {}
        setTimeout(tryNext, 500);
      }
      tryNext();
      setTimeout(function () {
        title.textContent = 'Almost done';
        msg.textContent = 'Tap the button to return to Expo Go / GetMyHospital.';
      }, 1200);
    })();
  </script>
</body>
</html>`;
}

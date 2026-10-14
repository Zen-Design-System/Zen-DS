'use strict';

/**
 * The browser page `npm login` opens: sign in to Zen with Google (the only way offered) through the PocketBase JS SDK,
 * then hand the PocketBase token to the registry, which checks the seat and finishes the npm login.
 */

const SDK = 'https://cdn.jsdelivr.net/npm/pocketbase@0.28.1/dist/pocketbase.umd.js';

const escapeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

function loginPage({ storeUrl, expired }) {
  const body = expired
    ? `<h1>Sign-in link expired</h1>
  <p>This link was already used or is more than 10 minutes old. Run <code>npm login</code> again in your terminal.</p>`
    : `<h1>Sign in to the Zen DS registry</h1>
  <p class="lead">Your terminal ran <code>npm login</code>. Sign in with the Google account of your Zen account; your licence must have a free seat for you.
  Only continue if you started this sign-in yourself.</p>
  <section id="choose">
    <button id="google" class="primary" type="button">Continue with Google</button>
  </section>
  <p id="status" role="status" aria-live="polite"></p>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Zen DS registry sign-in</title>
<style>
  :root { color-scheme: light dark; --bg: #f6f7f9; --card: #fff; --text: #14161a; --muted: #5b6270; --line: #d9dde3;
    --accent: #2f5bea; --accent-text: #fff; --error: #c62828; --ok: #1b7f3b; }
  @media (prefers-color-scheme: dark) { :root { --bg: #111317; --card: #1a1d23; --text: #eef0f3; --muted: #a3aab6;
    --line: #2e333c; --accent: #7c9cff; --accent-text: #0b0d12; --error: #ff8a80; --ok: #7ad79a; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 420px; margin: 48px auto; padding: 28px 24px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
  @media (max-width: 480px) { main { margin: 16px; } }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .lead { color: var(--muted); }
  code { font: 13px ui-monospace, Menlo, monospace; }
  button { font: inherit; padding: 9px 14px; border-radius: 8px; border: 1px solid var(--line); background: transparent; color: inherit; cursor: pointer; }
  button.primary { width: 100%; background: var(--accent); color: var(--accent-text); border-color: var(--accent); font-weight: 600; }
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  button[disabled] { opacity: .6; cursor: progress; }
  #status { min-height: 1.5em; margin: 16px 0 0; }
  #status.error { color: var(--error); }
  #status.ok { color: var(--ok); font-weight: 600; }
</style>
</head>
<body>
<main>
  ${body}
</main>
${expired ? '' : `<script src="${SDK}"></script>
<script>
(() => {
  const pb = new PocketBase(${escapeJson(storeUrl)});
  pb.autoCancellation(false);
  const users = pb.collection('users');
  const $ = (id) => document.getElementById(id);
  const status = (text, kind = '') => { $('status').textContent = text; $('status').className = kind; };
  const busy = (on) => document.querySelectorAll('button').forEach((el) => { el.disabled = on; });

  async function finish() {
    status('Checking your licence…');
    const res = await fetch(location.pathname, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: pb.authStore.token }),
    });
    pb.authStore.clear();
    const answer = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(answer.error || 'Sign-in failed (' + res.status + ')');
    $('choose').hidden = true;
    status('Signed in as ' + answer.name + '. You can close this tab and go back to your terminal.', 'ok');
  }

  async function attempt(signIn) {
    busy(true);
    status('Signing in…');
    try {
      await signIn();
      await finish();
    } catch (err) {
      status(err?.response?.message || err?.message || 'Sign-in failed', 'error');
      busy(false);
    }
  }

  $('google').addEventListener('click', () => attempt(() => users.authWithOAuth2({ provider: 'google' })));

})();
</script>`}
</body>
</html>
`;
}

module.exports = { loginPage };

'use strict';

/**
 * The browser page `npm login` opens: sign in to Zen with Google (the only way offered) through the PocketBase JS
 * SDK, then hand the PocketBase token to the registry, which checks the seat and finishes the npm login.
 *
 * The markup and its stylesheet are Zen DS itself, built by `scripts/build-login-page.mjs` into `login/` (real
 * components rendered to HTML, the CSS they use, the Inter font). This file adds the behaviour.
 */

const fs = require('node:fs');
const path = require('node:path');

const SDK = 'https://cdn.jsdelivr.net/npm/pocketbase@0.28.1/dist/pocketbase.umd.js';
const DIR = path.join(__dirname, 'login');
const STATIC = { 'zen.css': 'text/css; charset=utf-8', 'InterVariable.woff2': 'font/woff2' };

const read = (name) => fs.readFileSync(path.join(DIR, name), 'utf8');
const templates = { signin: read('signin.html'), expired: read('expired.html') };
const escapeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

// ZenProvider renders theme "system" as light on the server; follow the device here, as it does in the browser.
const THEME_SCRIPT = `<script>
(() => {
  const provider = document.querySelector('.zen-provider');
  const media = matchMedia('(prefers-color-scheme: dark)');
  const apply = () => { const t = media.matches ? 'dark' : 'light'; provider.dataset.theme = t; provider.style.colorScheme = t; };
  apply();
  media.addEventListener('change', apply);
})();
</script>`;

function signInScript(storeUrl) {
  return `<script src="${SDK}"></script>
<script>
(() => {
  const pb = new PocketBase(${escapeJson(storeUrl)});
  pb.autoCancellation(false);
  const $ = (id) => document.getElementById(id);
  const button = $('zen-google');
  const label = button.querySelector('.zen-button__label');
  const show = (id, text) => {
    $('zen-error').hidden = id !== 'zen-error';
    $('zen-done').hidden = id !== 'zen-done';
    if (text) $(id + '-text').textContent = text;
  };
  const busy = (text) => { button.disabled = Boolean(text); label.textContent = text || 'Continue with Google'; };

  button.addEventListener('click', async () => {
    show(null);
    busy('Signing in…');
    try {
      await pb.collection('users').authWithOAuth2({ provider: 'google' });
      busy('Checking your licence…');
      const res = await fetch(location.pathname, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: pb.authStore.token }),
      });
      pb.authStore.clear();
      const answer = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(answer.error || 'Sign-in failed (' + res.status + ').');
      $('zen-actions').hidden = true;
      show('zen-done', 'Signed in as ' + answer.name + '. You can close this tab and go back to your terminal.');
    } catch (err) {
      busy(null);
      const text = err?.response?.message || err?.message || 'Sign-in failed.';
      show('zen-error', /cancel|closed/i.test(text) ? 'The Google window was closed. Try again.' : text.charAt(0).toUpperCase() + text.slice(1));
    }
  });
})();
</script>`;
}

function loginPage({ storeUrl, expired }) {
  return expired
    ? templates.expired.replace('<!--ZEN_SCRIPT-->', THEME_SCRIPT)
    : templates.signin.replace('<!--ZEN_SCRIPT-->', THEME_SCRIPT + signInScript(storeUrl));
}

/** The page's stylesheet and font, or null. */
function loginAsset(name) {
  if (!Object.hasOwn(STATIC, name)) return null;
  return { type: STATIC[name], body: fs.readFileSync(path.join(DIR, name)) };
}

module.exports = { loginPage, loginAsset };

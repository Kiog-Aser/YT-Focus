const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const origin = 'https://www.youtube.com';
const contentScript = readFileSync(join(__dirname, 'content.js'), 'utf8');

function openPage(path, storage = new Map()) {
  const location = new URL(path, origin);
  const elements = new Map();
  function createElement(tag) {
    const element = new EventTarget();
    return Object.assign(element, {
      tagName: tag.toUpperCase(),
      style: {},
      classList: { add() {} },
      appendChild(child) { if (child.id) elements.set(child.id, child); },
      remove() { elements.delete(this.id); },
      focus() {}
    });
  }
  const video = location.pathname === '/watch' ? { removeAttribute() {} } : null;
  const document = Object.assign(new EventTarget(), {
    body: createElement('body'),
    head: createElement('head'),
    createElement,
    getElementById: id => elements.get(id),
    querySelector: selector => selector === 'video' ? video : null,
    querySelectorAll: () => []
  });
  const window = Object.assign(new EventTarget(), { location });
  runInNewContext(contentScript, {
    document, window, location, URL, URLSearchParams,
    console: { log() {} },
    MutationObserver: class { observe() {} },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    },
    setTimeout() {}, setInterval() {}
  });
  return { document, location, window, video };
}

function press(target, key, options = {}) {
  target.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key, ...options }));
}

test('1–5 request the corresponding home feed and keep its label after URL cleanup', () => {
  for (const path of ['/', '/results?search_query=spanish', '/feed/subscriptions']) {
    const storage = new Map();
    for (let slot = 1; slot <= 5; slot++) {
      const { location, window } = openPage(path, storage);
      press(window, String(slot));
      assert.equal(location.href, `${origin}/?authuser=${slot - 1}`);
      const { document } = openPage('/', storage);
      assert.match(document.getElementById('yt-focus-container').innerHTML, new RegExp(`acct ${slot} •`));
    }
  }
});

test('search accepts digits and search, watch and subscriptions links retain the slot', () => {
  const storage = new Map();
  press(openPage('/', storage).window, '4');
  const { document, location, window } = openPage('/', storage);
  press(window, 's');
  press(window, '2');
  assert.equal(location.href, `${origin}/`);
  const input = document.getElementById('yt-focus-search-box');
  input.value = 'B2 Spanish';
  press(input, 'Enter');
  assert.equal(location.pathname, '/results');
  assert.equal(location.searchParams.get('search_query'), 'B2 Spanish');
  assert.equal(location.searchParams.get('authuser'), '3');

  location.searchParams.delete('authuser');
  const results = openPage(location.href, storage);
  results.window.__ytFocus.videos = [{ url: '/watch?v=test&authuser=0' }];
  press(results.window, 'Enter');
  assert.equal(results.location.href, `${origin}/watch?v=test&authuser=3`);

  results.location.searchParams.delete('authuser');
  const watch = openPage(results.location.href, storage);
  press(watch.window, '3');
  assert.equal(watch.video.playbackRate, 1.5);
  press(watch.window, 'b');
  assert.equal(watch.location.href, `${origin}/feed/subscriptions?authuser=3`);
});

test('an authuser in the address does not set or override the saved slot', () => {
  const storage = new Map();
  const page = openPage('/?authuser=1', storage);
  assert.match(page.document.getElementById('yt-focus-container').innerHTML, /acct default •/);
  press(page.window, '4');
  const results = openPage('/results?search_query=spanish&authuser=1', storage);
  assert.match(results.document.getElementById('yt-focus-container').innerHTML, /acct 4 •/);
  press(results.window, 'h');
  assert.equal(results.location.href, `${origin}/?authuser=3`);
});

test('quick-open remains available without adding a slot to the default feed', () => {
  for (const [key, options, index] of [['!', { shiftKey: true, code: 'Digit1' }, 1], ['6', {}, 6]]) {
    const { location, window } = openPage('/');
    window.__ytFocus.videos = Array.from({ length: 9 }, (_, i) => ({ url: `/watch?v=video${i + 1}` }));
    press(window, '1', { ctrlKey: true });
    assert.equal(location.href, `${origin}/`);
    press(window, key, options);
    assert.equal(location.href, `${origin}/watch?v=video${index}`);
  }
});

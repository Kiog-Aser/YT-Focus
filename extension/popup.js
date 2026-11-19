// popup.js - manage simple settings stored in chrome.storage
const enableQuitEl = document.getElementById('enableQuit');
const disableAutoplayEl = document.getElementById('disableAutoplay');

function load() {
  chrome.storage.sync.get({ enableQuitHotkey: true, disableAutoplay: true }, (data) => {
    enableQuitEl.checked = data.enableQuitHotkey;
    disableAutoplayEl.checked = data.disableAutoplay;
  });
}

enableQuitEl.addEventListener('change', () => {
  chrome.storage.sync.set({ enableQuitHotkey: enableQuitEl.checked });
});

disableAutoplayEl.addEventListener('change', () => {
  chrome.storage.sync.set({ disableAutoplay: disableAutoplayEl.checked });
});

load();

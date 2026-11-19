// background.js
// This script will clean up YouTube URLs to remove list/radio params
chrome.webNavigation.onCommitted.addListener(function(details) {
  const url = new URL(details.url);
  let changed = false;
  // Only act if it's a video page
  if (url.searchParams.has('v')) {
    // Remove playlist/radio params
    ['list', 'index', 'start_radio', 'radio'].forEach(param => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    });
    if (changed) {
      chrome.tabs.update(details.tabId, { url: url.toString() });
    }
  }
}, { url: [{ hostEquals: 'www.youtube.com' }] });

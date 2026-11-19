function getFocusAuthuser() {
  return new URLSearchParams(location.search).get('authuser');
}

function navigateInFocus(path, authuser = getFocusAuthuser()) {
  const url = new URL(path, location.origin);
  if (authuser !== null && url.origin === location.origin) {
    url.searchParams.set('authuser', authuser);
  }
  window.location.href = url.href;
}

// --- Minimal YouTube Overlay UI ---
function createMinimalOverlay() {
  // Global state
  if (!window.__ytFocus) window.__ytFocus = {};
  const state = window.__ytFocus;
  if (typeof state.selectedIndex !== 'number' || isNaN(state.selectedIndex) || state.selectedIndex < 0) state.selectedIndex = 0; // always initialize
  // Load settings once (quit hotkey and autoplay toggles)
  if (state.settingsLoaded !== true) {
    state.settingsLoaded = true;
    try {
      chrome.storage && chrome.storage.sync.get({ enableQuitHotkey: true, disableAutoplay: true }, cfg => {
        state.enableQuitHotkey = cfg.enableQuitHotkey;
        state.disableAutoplay = cfg.disableAutoplay;
        // Apply autoplay setting immediately
        if (state.disableAutoplay) {
          setTimeout(() => {
            disableAutoplay();
            preventAutoplay();
          }, 100);
        }
      });
      // Keep updated via runtime message if we add messaging later
    } catch(e) {
      state.enableQuitHotkey = true;
      state.disableAutoplay = true;
    }
  }

  // We'll hide the root only after we've collected at least 1 video to avoid empty list/black screen.
  const ytRoot = document.getElementById('ytd-app');

  let overlay = document.getElementById('yt-minimal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'yt-minimal-overlay';
    Object.assign(overlay.style, {
      position:'fixed',top:'0',left:'0',width:'100vw',height:'100vh',
      background:'#0d0f17',color:'#a6e3a1',zIndex:'999999',
      fontFamily:'monospace',boxSizing:'border-box',display:'flex',
      flexDirection:'column',alignItems:'center',justifyContent:'center',
      padding:'2vh 2vw',overflow:'hidden'
    });
    document.body.appendChild(overlay);
  }
  // Main container centered
  let container = document.getElementById('yt-focus-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'yt-focus-container';
    Object.assign(container.style, {
      width:'min(90vw,100ch)',maxHeight:'85vh',display:'flex',flexDirection:'column',
      background:'#111827',border:'1px solid #313244',padding:'1.2em 1.5em',
      borderRadius:'12px',boxShadow:'0 0 40px #000a',overflow:'hidden'
    });
    overlay.appendChild(container);
  }
  container.innerHTML = '';

  const authuser = getFocusAuthuser();
  const accountLabel = /^[0-4]$/.test(authuser) ? Number(authuser) + 1 : 'default';
  const headerHTML = `<pre style="color:#f9e2af;font-size:1.2em;margin:0 0 0.4em 0; text-align:center;">(\\_/)( _ )( ___)( _ )/ __)  F O C U S
 \\ /  )(  _  )(__ (( (__   M O D E
 (__) (__) (____)\\___/\\___)
</pre>
<div style="color:#89b4fa;margin:0 0 0.5em 0;text-align:center;font-size:0.8em;">acct ${accountLabel} • 1-5 switch • Shift+1-5 / 6-9 quick • j/k↑↓ move • Enter open • s search • q quit • f re-enter</div>`;

  const listContainerId = 'yt-focus-list';
  let listContainer = document.getElementById(listContainerId);
  if (!listContainer) { listContainer = document.createElement('div'); listContainer.id = listContainerId; }
  Object.assign(listContainer.style,{flex:'1 1 auto',overflowY:'auto',paddingRight:'4px'});
  container.innerHTML = headerHTML;
  container.appendChild(listContainer);

  function collectVideos() {
    // Map keyed by URL so we can upgrade placeholders with richer data later
    const byUrl = new Map();
    const durationRe = /^\d{1,2}:\d{2}(?::\d{2})?$/i;
    const badWords = ['bekijken','mix','live'];
    const isBad = t => !t || t.length < 2 || durationRe.test(t) || badWords.includes(t.toLowerCase());
    const adTitleRe = /\b(ad|advertentie|gesponsord|promoted|sponsored|reclame)\b/i;
    const uiNoiseRe = /^(bekijken|watch|afspelen)$/i;
    const newsAdRe = /\b(nieuwsblad|hln|standaard|tijd|knack)\b/i; // Common news site ads
    function isAdOrJunk(title, url, channel, duration) {
      if (!title) return true;
      if (adTitleRe.test(title)) return true;
      if (uiNoiseRe.test(title.trim())) return true;
      // Skip news site promotional content (often ads)
      if (newsAdRe.test(channel || '')) return true;
      // Mix / playlist suggestion cards (auto-mixes) often begin with 'Mix:' or 'Mijn mix'
      // Only skip if no channel/duration, otherwise allow
      if (/^(mix:|mijn mix|mix)$/i.test(title) && (!channel || !duration)) return true;
      // Now playing overlay artifacts like '0:07 0:07 Wordt nu afgespeeld'
      if (/wordt nu afgespeeld/i.test(title)) return true;
      return false;
    }
    function upsert(obj) {
      if (!obj || !obj.url || !/watch\?/.test(obj.url)) return;
      let url = obj.url;
      if (url.startsWith('/watch')) url = 'https://www.youtube.com' + url;
      let title = (obj.title||'').trim();
      if (!title) return;
      const channel = (obj.channel||'').trim();
      const duration = (obj.duration||'').trim();
      const uploadDate = (obj.uploadDate||'').trim();
      if (isAdOrJunk(title, url, channel, duration)) return;
      
      // Optional compact debug (single line) – keep extremely low volume
      if ((!channel || !duration) && !/^(mix:)/i.test(title) && !window.__ytFocus._briefLogged) {
        window.__ytFocus._briefLogged = true;
        console.log('[yt-focus] missing meta for first video example:', title);
      }

      // Debug date extraction
      if (uploadDate && !window.__ytFocus._dateLogged) {
        window.__ytFocus._dateLogged = true;
        console.log('[yt-focus] date extraction working:', title, '->', uploadDate);
      }
      
      const existing = byUrl.get(url);
      if (!existing) {
        byUrl.set(url, { title, url, channel, duration, uploadDate });
      } else {
        // Upgrade title if previous was bad or clearly shorter placeholder
        if ((isBad(existing.title) && !isBad(title)) || (!isBad(title) && title.length > existing.title.length+4)) {
          existing.title = title;
        }
        if ((!existing.channel || existing.channel.length < 2) && channel) existing.channel = channel;
        if ((!existing.duration || existing.duration.length < 2) && duration) existing.duration = duration;
        if ((!existing.uploadDate || existing.uploadDate.length < 2) && uploadDate) existing.uploadDate = uploadDate;
      }
    }
    const pathIsHome = location.pathname === '/';
    // 0. Network captured videos first
    if (Array.isArray(state.networkVideos)) state.networkVideos.forEach(upsert);
    // 1. Direct DOM video renderers (covers home + search)
    document.querySelectorAll('ytd-rich-item-renderer ytd-rich-grid-media, ytd-video-renderer, ytd-compact-video-renderer').forEach(media => {
      try {
        const a = media.querySelector('a#video-title, a[href*="/watch"]');
        if (!a) return;
        const url = a.href || a.getAttribute('href');
        if (!url || !url.includes('/watch?v=')) return;
        
  // Skip if this media block contains obvious ad markers
  if (media.closest('ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-promoted-video-renderer, ytd-in-feed-ad-layout-renderer, ytd-ad-inline-playback-renderer, ytd-action-companion-ad-renderer, [is-ad], [data-is-ad]')) return;
  // Skip if the video container has ad-related attributes or classes
  if (media.hasAttribute('is-ad') || media.dataset.isAd || media.classList.contains('ad-content') || media.querySelector('[aria-label*="Ad"]')) return;
        
        const attrTitle = a.getAttribute('title') || a.getAttribute('aria-label');
        const titleCandidateEl = media.querySelector('a#video-title, #video-title.yt-simple-endpoint, h3 a#video-title, h3, yt-formatted-string[aria-label]') || a;
        let title = (attrTitle || (titleCandidateEl && titleCandidateEl.textContent) || '').trim();
        
        // Skip if title is just a duration (indicates we grabbed a duration element instead of title)
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(title)) return;
        
        // Strip view/metadata parts from aria-label (keep before ":" patterns with time?)
        const delim = title.indexOf(' – ');
        if (delim > 10 && !title.includes('|')) title = title.slice(0, delim).trim();
        
        if (!title || title.length < 3) return; // Skip very short or empty titles
        if (isAdOrJunk(title, url)) return;
        
        // Date extraction - get upload/publish date
        let uploadDate = '';
        (function extractDate(){
          const dateSelectors = [
            // Standard date elements
            'ytd-video-meta-block #metadata-line span:nth-child(2)',
            'ytd-video-meta-block #metadata-line yt-formatted-string',
            '#metadata-line span:nth-child(2)',
            '#metadata-line yt-formatted-string',
            'ytd-video-meta-block span[aria-label*="ago"]',
            'span[aria-label*="ago"]',

            // Homepage rich grid specific
            'ytd-rich-metadata-renderer span',
            '#metadata ytd-video-meta-block span',
            '.ytd-video-meta-block span',

            // Generic date/time elements
            '[aria-label*="Uploaded"]',
            '[aria-label*="Published"]',
            'span:contains("ago")',
            'yt-formatted-string:contains("ago")'
          ];

          for (const sel of dateSelectors) {
            const dateElements = media.querySelectorAll(sel);
            for (const el of dateElements) {
              const text = el.textContent || el.innerText || '';
              // Look for patterns like "2 days ago", "3 weeks ago", "1 month ago", etc.
              if (/\d+\s*(second|minute|hour|day|week|month|year)s?\s+ago/i.test(text)) {
                uploadDate = text.trim();
                break;
              }
            }
            if (uploadDate) break;
          }

          // Fallback: look in the entire media element for date patterns
          if (!uploadDate) {
            const allText = media.textContent || media.innerText || '';
            const dateMatch = allText.match(/(\d+\s*(?:second|minute|hour|day|week|month|year)s?\s+ago)/i);
            if (dateMatch) {
              uploadDate = dateMatch[1];
            }
          }
        })();

        // Channel extraction - enhanced for homepage rich grid
        let channel = '';
        (function extractChannel(){
          // Direct channel-name components (works for search)
          const c1 = media.querySelector('ytd-channel-name, #channel-name');
          if (c1) {
            const aEl = c1.querySelector('a');
            if (aEl && aEl.textContent.trim()) { channel = aEl.textContent.trim(); return; }
            if (c1.textContent.trim()) { channel = c1.textContent.trim(); return; }
          }
          // Compact / meta blocks (works for search)
          const meta = media.querySelector('#text-container #text, #metadata-line a, .ytd-video-meta-block a, #byline a, a[href*="/@"]');
          if (meta && meta.textContent.trim().length>1) { channel = meta.textContent.trim(); return; }

          // Enhanced homepage rich grid channel extraction
            const rich = media.closest('ytd-rich-item-renderer');
            if (rich) {
            // Try multiple homepage-specific selectors
            const homeSelectors = [
              'ytd-channel-name a',
              '#channel-name a',
              '#byline a',
              'a[href*="/@"]',
              '#text-container ytd-channel-name a',
              '#metadata ytd-channel-name a',
              'ytd-video-meta-block ytd-channel-name a'
            ];
            for (const sel of homeSelectors) {
              const link = rich.querySelector(sel);
              if (link && link.textContent.trim()) {
                channel = link.textContent.trim();
                return;
              }
            }
            // Try to find any channel link in the rich item
            const anyChannelLink = rich.querySelector('a[href*="/@"], a[href*="/channel/"], a[href*="/c/"]');
            if (anyChannelLink && anyChannelLink.textContent.trim()) {
              channel = anyChannelLink.textContent.trim();
              return;
            }
          }

          // Fallback to aria-label parse: pattern "Title by Channel ..." or localized 'door'
          if (!channel) {
            const aria = a.getAttribute('aria-label') || attrTitle || '';
            const m = aria.match(/(?: by | door )([^•]+?)(?:\s+\d|$| •)/i);
            if (m) channel = m[1].trim();
          }

          // Last resort: look for any channel-like text in metadata areas
          if (!channel) {
            const metaArea = media.querySelector('#metadata, #text-container, .ytd-video-meta-block');
            if (metaArea) {
              const text = metaArea.textContent.trim();
              // Look for patterns like "Channel Name • 2 days ago" or similar
              const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1 && l.length < 50);
              for (const line of lines) {
                // Skip if it looks like a view count or date
                if (/views|ago|minutes|hours|days|weeks|months|years/i.test(line)) continue;
                // Skip if it contains numbers that aren't part of a channel name
                if (/^\d/.test(line) && !line.includes('@')) continue;
                // If it looks like a reasonable channel name
                if (line.length > 2 && line.length < 30 && !/\d{2}:\d{2}/.test(line)) {
                  channel = line;
                  break;
                }
              }
            }
          }
        })();
        
        // Duration extraction - comprehensive enhancement for all YouTube layouts
        let duration = '';
        (function extractDuration(){
          // Get the rich item container for homepage videos
            const rich = media.closest('ytd-rich-item-renderer');

          // Ultra-comprehensive duration selectors for all video types
          const durationSelectors = [
            // Standard YouTube duration elements
            'ytd-thumbnail-overlay-time-status-renderer span',
            'ytd-thumbnail-overlay-time-status-renderer',
            'ytd-thumbnail-overlay-time-status-renderer #text',
            'ytd-thumbnail-overlay-time-status-renderer span span',

            // Homepage rich grid specific
            '#overlays ytd-thumbnail-overlay-time-status-renderer span',
            '#overlays ytd-thumbnail-overlay-time-status-renderer',
            'ytd-thumbnail #overlays span',
            'ytd-thumbnail #overlays ytd-thumbnail-overlay-time-status-renderer span',

            // Search results and compact layouts
            'ytd-thumbnail-overlay-time-status-renderer[data-style="DEFAULT"] span',
            'ytd-thumbnail-overlay-time-status-renderer[data-style="LIVE"] span',

            // Generic thumbnail overlays
            'ytd-thumbnail span',
            '#thumbnail span',
            '[overlay-style="DEFAULT"] span',
            '[overlay-style="LIVE"] span',

            // Deep search in overlays
            '#overlays *',
            'ytd-thumbnail #overlays *',

            // Alternative duration containers
            'ytd-thumbnail-overlay-resume-playback-renderer span',
            'ytd-thumbnail-overlay-now-playing-renderer span',
            'ytd-thumbnail-overlay-loading-preview-renderer span',

            // Badge and status elements
            '.badge-shape-wiz__text span',
            '.badge-shape-wiz span',
            '[aria-label*="duration"] span',
            '[aria-label*="length"] span'
          ];

          // Try each selector systematically
          for (const sel of durationSelectors) {
            if (duration) break; // Already found, stop searching

            let elements = [];
            if (rich) {
              // For homepage videos, search in rich item first
              elements = rich.querySelectorAll(sel);
              if (elements.length === 0) {
                // Then search in media element
                elements = media.querySelectorAll(sel);
              }
            } else {
              // For search/other pages
              elements = media.querySelectorAll(sel);
            }

            for (const el of elements) {
              if (duration) break;

              let text = el.textContent || el.innerText || '';
              text = text.trim().replace(/\s+/g, '');

              // Check for valid duration patterns
              if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
                duration = text;
                break;
              }

              // Also check for "LIVE" text
              if (/^live$/i.test(text)) {
                duration = 'LIVE';
                break;
              }
            }
          }

          // Enhanced live stream detection
          if (!duration) {
            const liveSelectors = [
              '[badge-style*=LIVE]',
              '.badge-style-type-live-now',
              'ytd-badge-supported-renderer[icon-type=LIVE]',
              '[overlay-style="LIVE"]',
              '.ytd-thumbnail-overlay-time-status-renderer[overlay-style="LIVE"]',
              'ytd-badge-supported-renderer span',
              '.badge-shape-wiz__text',
              '[aria-label*="LIVE"]',
              '[aria-label*="live"]'
            ];

            for (const sel of liveSelectors) {
              if (duration) break;

              const liveBadge = media.querySelector(sel) || (rich && rich.querySelector(sel));
              if (liveBadge) {
                const badgeText = liveBadge.textContent || liveBadge.innerText || '';
                if (/live/i.test(badgeText)) {
                  duration = 'LIVE';
                  break;
                }
              }
            }
          }

          // Deep text search in thumbnail areas
          if (!duration) {
            const thumbnailAreas = [media, rich].filter(Boolean);
            for (const area of thumbnailAreas) {
              if (duration) break;

              const thumbnail = area.querySelector('ytd-thumbnail, #thumbnail, .ytd-thumbnail');
              if (thumbnail) {
                // Search all text content for duration patterns
                const allText = thumbnail.textContent || thumbnail.innerText || '';
                const matches = allText.match(/(\d{1,2}:\d{2}(?::\d{2})?)/g);

                if (matches && matches.length > 0) {
                  // Use the first valid duration found
                  for (const match of matches) {
                    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(match)) {
                      duration = match;
                      break;
                    }
                  }
                }

                // Also check for live indicators in text
                if (!duration && /live/i.test(allText)) {
                  duration = 'LIVE';
                }
              }
            }
          }

          // Final comprehensive search in all text content
          if (!duration) {
            const searchAreas = [media, rich].filter(Boolean);
            for (const area of searchAreas) {
              if (duration) break;

              const allText = area.textContent || area.innerText || '';
              const timeMatches = allText.match(/(\d{1,2}:\d{2}(?::\d{2})?)/g);

              if (timeMatches) {
                for (const match of timeMatches) {
                  // Skip if it looks like a date, view count, or other non-duration
                  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(match)) continue;
                  if (match.includes('.') || match.includes(',')) continue;

                  // Additional validation - check if this looks like a reasonable video duration
                  const parts = match.split(':').map(Number);
                  if (parts.length >= 2) {
                    const [minutes, seconds] = parts.slice(-2);
                    // Valid minutes (0-300) and seconds (0-59)
                    if (minutes >= 0 && minutes <= 300 && seconds >= 0 && seconds <= 59) {
                      duration = match;
                      break;
                    }
                  }
                }
              }

              // Final live check
              if (!duration && /live/i.test(allText)) {
                duration = 'LIVE';
              }
            }
          }
        })();
        
  upsert({ title, url, channel, duration, uploadDate });
      } catch(e) {}
    });
    // 1b. Homepage specific fast path if still empty: rich-item anchors with enhanced metadata
    if (pathIsHome && byUrl.size < 5) {
      document.querySelectorAll('ytd-rich-item-renderer').forEach(rich => {
        try {
          const a = rich.querySelector('a#video-title');
          if (!a) return;
          const url = a.href;
          if (!url || !url.includes('/watch?v=')) return;

          const title = a.textContent.trim();
          if (!title || title.length < 3) return;

          // Enhanced channel extraction for homepage fallback
          let channel = '';
          const channelSelectors = [
            'ytd-channel-name a', '#channel-name a', '#byline a', 'a[href*="/@"]',
            'ytd-video-meta-block a', '#metadata a'
          ];
          for (const sel of channelSelectors) {
            const chLink = rich.querySelector(sel);
            if (chLink && chLink.textContent.trim()) {
              channel = chLink.textContent.trim();
              break;
            }
          }

          // Enhanced date extraction for homepage fallback
          let uploadDate = '';
          const dateSelectors = [
            'ytd-rich-metadata-renderer span',
            '#metadata-line span:nth-child(2)',
            '#metadata-line yt-formatted-string',
            'span[aria-label*="ago"]',
            'ytd-video-meta-block span'
          ];

          for (const sel of dateSelectors) {
            const dateElements = rich.querySelectorAll(sel);
            for (const el of dateElements) {
              const text = el.textContent || el.innerText || '';
              if (/\d+\s*(second|minute|hour|day|week|month|year)s?\s+ago/i.test(text)) {
                uploadDate = text.trim();
                break;
              }
            }
            if (uploadDate) break;
          }

          // Enhanced duration extraction for homepage fallback using comprehensive selectors
          let duration = '';
          const durationSelectors = [
            // Standard YouTube duration elements
            'ytd-thumbnail-overlay-time-status-renderer span',
            'ytd-thumbnail-overlay-time-status-renderer',
            'ytd-thumbnail-overlay-time-status-renderer #text',
            'ytd-thumbnail-overlay-time-status-renderer span span',

            // Homepage rich grid specific
            '#overlays ytd-thumbnail-overlay-time-status-renderer span',
            '#overlays ytd-thumbnail-overlay-time-status-renderer',
            'ytd-thumbnail #overlays span',
            'ytd-thumbnail #overlays ytd-thumbnail-overlay-time-status-renderer span',

            // Generic thumbnail overlays
            'ytd-thumbnail span',
            '#thumbnail span',
            '[overlay-style="DEFAULT"] span',
            '[overlay-style="LIVE"] span',

            // Deep search in overlays
            '#overlays *',
            'ytd-thumbnail #overlays *',

            // Alternative duration containers
            'ytd-thumbnail-overlay-resume-playback-renderer span',
            'ytd-thumbnail-overlay-now-playing-renderer span',
            'ytd-thumbnail-overlay-loading-preview-renderer span',

            // Badge and status elements
            '.badge-shape-wiz__text span',
            '.badge-shape-wiz span',
            '[aria-label*="duration"] span',
            '[aria-label*="length"] span'
          ];

          for (const sel of durationSelectors) {
            if (duration) break;

            const elements = rich.querySelectorAll(sel);
            for (const el of elements) {
              if (duration) break;

              let text = el.textContent || el.innerText || '';
              text = text.trim().replace(/\s+/g, '');

              // Check for valid duration patterns
              if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
                duration = text;
                break;
              }

              // Also check for "LIVE" text
              if (/^live$/i.test(text)) {
                duration = 'LIVE';
                break;
              }
            }
          }

          // Enhanced live stream detection for homepage fallback
          if (!duration) {
            const liveSelectors = [
              '[badge-style*=LIVE]',
              '.badge-style-type-live-now',
              'ytd-badge-supported-renderer[icon-type=LIVE]',
              '[overlay-style="LIVE"]',
              '.ytd-thumbnail-overlay-time-status-renderer[overlay-style="LIVE"]',
              'ytd-badge-supported-renderer span',
              '.badge-shape-wiz__text',
              '[aria-label*="LIVE"]',
              '[aria-label*="live"]'
            ];

            for (const sel of liveSelectors) {
              if (duration) break;

              const liveBadge = rich.querySelector(sel);
              if (liveBadge) {
                const badgeText = liveBadge.textContent || liveBadge.innerText || '';
                if (/live/i.test(badgeText)) {
                  duration = 'LIVE';
                  break;
                }
              }
            }
          }

          // Deep text search in thumbnail for homepage fallback
          if (!duration) {
            const thumbnail = rich.querySelector('ytd-thumbnail, #thumbnail, .ytd-thumbnail');
            if (thumbnail) {
              const allText = thumbnail.textContent || thumbnail.innerText || '';
              const matches = allText.match(/(\d{1,2}:\d{2}(?::\d{2})?)/g);

              if (matches && matches.length > 0) {
                for (const match of matches) {
                  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(match)) {
                    duration = match;
                    break;
                  }
                }
              }

              // Also check for live indicators in text
              if (!duration && /live/i.test(allText)) {
                duration = 'LIVE';
              }
            }
          }

          upsert({ title, url, channel, duration, uploadDate });
        } catch(e) {}
      });
    }
    // 1c. Generic anchor fallback if still sparse
    if (byUrl.size < 5) {
      document.querySelectorAll('a[href*="/watch?v="]').forEach(a=>{
        try {
          const url = a.href;
          if (!url) return;
          const title = (a.getAttribute('title') || a.textContent || a.getAttribute('aria-label') || '').trim();
          if (!title || title.length < 3) return;
          // Skip if title is just a duration
          if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(title)) return;
          if (!isAdOrJunk(title, url)) upsert({ title, url });
        } catch(e) {}
      });
    }
    // 2. Anchor fallback (#video-title)
    document.querySelectorAll('a#video-title').forEach(a => {
      try { 
        const t=a.textContent.trim(); 
        if(!t || t.length < 3) return;
        // Skip if title is just a duration
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) return;
        if(!isAdOrJunk(t,a.href)) upsert({ title: t, url: a.href }); 
      } catch(e) {}
    });
  // 3. ytInitialData deep walk (fast, no scrolling)
    const walkInitial = (root) => {
      if (!root || typeof root !== 'object') return;
      if (root.videoRenderer) collectFromRenderer(root.videoRenderer);
      if (root.compactVideoRenderer) collectFromRenderer(root.compactVideoRenderer);
      if (Array.isArray(root)) { root.forEach(walkInitial); return; }
      for (const k in root) { if (Object.prototype.hasOwnProperty.call(root,k)) walkInitial(root[k]); }
    };
    function collectFromRenderer(vr) {
      try {
        const videoId = vr.videoId || (vr.navigationEndpoint && vr.navigationEndpoint.watchEndpoint && vr.navigationEndpoint.watchEndpoint.videoId);
        if (!videoId) return;
        const url = '/watch?v=' + videoId;
        const getText = (obj) => {
          if (!obj) return '';
            if (typeof obj === 'string') return obj;
            if (obj.simpleText) return obj.simpleText;
            if (Array.isArray(obj.runs)) return obj.runs.map(r=>r.text).join('');
          return '';
        };
        const title = getText(vr.title) || 'Untitled';
        // Channel can appear in multiple fields depending on feed type
        const channel = getText(vr.ownerText) || getText(vr.shortBylineText) || getText(vr.longBylineText) || getText(vr.bylineText) || getText(vr.subtitle) || '';
        let duration = getText(vr.lengthText) || '';
        // Extract upload date from publishedTimeText or similar fields
        const uploadDate = getText(vr.publishedTimeText) || getText(vr.dateText) || '';
        if (!duration && vr.thumbnailOverlays) {
          try {
            const ov = vr.thumbnailOverlays.find(o=>o.thumbnailOverlayTimeStatusRenderer);
            if (ov) duration = getText(ov.thumbnailOverlayTimeStatusRenderer.text) || '';
          } catch(e) {}
        }
        // Normalize duration spacing
        if (duration) duration = duration.replace(/\s+/g,'');
        // Mark live if live badges present
        if (!duration && Array.isArray(vr.badges)) {
          const live = vr.badges.find(b=>getText(b.metadataBadgeRenderer?.label||'').toLowerCase().includes('live'));
          if (live) duration = 'LIVE';
        }
        if (isAdOrJunk(title, url, channel, duration)) return;
        upsert({ title, url, channel, duration, uploadDate });
      } catch(e) {}
    }
    // Specialized homepage richGrid extraction (homepage structure differs)
    function extractHome(initial) {
      if (!initial) return;
      try {
        const tabs = initial.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
        for (const t of tabs) {
          const tabContent = t.tabRenderer?.content?.richGridRenderer?.contents;
          if (Array.isArray(tabContent)) {
            for (const c of tabContent) {
              const richItem = c.richItemRenderer?.content;
              if (richItem && (richItem.videoRenderer || richItem.compactVideoRenderer)) {
                collectFromRenderer(richItem.videoRenderer || richItem.compactVideoRenderer);
              }
              // Some items directly hold videoRenderer
              if (c.videoRenderer || c.compactVideoRenderer) collectFromRenderer(c.videoRenderer || c.compactVideoRenderer);
            }
          }
        }
      } catch(e) {}
      // Continuation actions
      try {
        const actions = initial.onResponseReceivedActions || initial.onResponseReceivedEndpoints || [];
        actions.forEach(a => {
          const items = a.appendContinuationItemsAction?.continuationItems;
          if (Array.isArray(items)) items.forEach(it => {
            const richItem = it.richItemRenderer?.content;
            if (richItem && (richItem.videoRenderer || richItem.compactVideoRenderer)) {
              collectFromRenderer(richItem.videoRenderer || richItem.compactVideoRenderer);
            }
            if (it.videoRenderer || it.compactVideoRenderer) collectFromRenderer(it.videoRenderer || it.compactVideoRenderer);
          });
        });
      } catch(e) {}
    }
  try { if (window.ytInitialData) { walkInitial(window.ytInitialData); extractHome(window.ytInitialData); } } catch(e) {}
    // 4. Recently received actions (YouTube sometimes puts more there)
    try {
      const a = window.ytInitialData && window.ytInitialData.onResponseReceivedActions;
      if (Array.isArray(a)) a.forEach(walkInitial);
    } catch(e) {}
    // 5. Inline script parsing fallback (only attempt once)
  if (byUrl.size < 5 && !state.inlineParsedAttempted) {
      state.inlineParsedAttempted = true;
      try {
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
          const tx = s.textContent;
            if (!tx) continue;
            const idx = tx.indexOf('ytInitialData');
            if (idx !== -1) {
              // Try pattern ytInitialData = { ... };
              const assignIdx = tx.indexOf('=', idx);
              if (assignIdx !== -1) {
                const after = tx.slice(assignIdx+1).trim();
                // naive brace match
                if (after[0] === '{') {
                  let depth=0,end=-1; for (let i=0;i<after.length;i++){ const ch=after[i]; if(ch==='{' ) depth++; else if (ch==='}') { depth--; if(depth===0){ end=i; break; } } }
                  if (end!==-1) {
                    const jsonStr = after.slice(0,end+1);
                    try { const parsed = JSON.parse(jsonStr); walkInitial(parsed); extractHome(parsed); } catch(e) {}
                  }
                }
              }
            }
        }
      } catch(e) {}
    }
    // Final upgrade pass: attempt to fill missing channel/duration via DOM per videoId (enhanced)
    const values = Array.from(byUrl.values());
    values.forEach(v => {
      if (v.channel && v.duration) return;
      const idMatch = v.url.match(/v=([\w-]{6,})/); if (!idMatch) return;

      // Try to find the video element in different ways
      const selectors = [
        `a#video-title[href*="${idMatch[1]}"]`,
        `a[href*="${idMatch[1]}"]`,
        `a[href*="v=${idMatch[1]}"]`
      ];

      let media = null;
      for (const sel of selectors) {
        const anchor = document.querySelector(sel);
        if (anchor) {
          media = anchor.closest('ytd-rich-grid-media, ytd-video-renderer, ytd-compact-video-renderer, ytd-rich-item-renderer');
          if (media) break;
        }
      }

      if (!media) return;

      // Enhanced channel extraction
      if (!v.channel) {
        const channelSelectors = [
          'ytd-channel-name a', '#channel-name a', '#byline a', 'a[href*="/@"]',
          'ytd-video-meta-block a', '#metadata a',
          'ytd-channel-name', '#channel-name'
        ];

        for (const sel of channelSelectors) {
          const chEl = media.querySelector(sel);
          if (chEl) {
            const text = chEl.textContent.trim();
            if (text && text.length > 1 && text.length < 50) {
              v.channel = text;
              break;
            }
          }
        }
      }

      // Ultra-comprehensive duration extraction
      if (!v.duration) {
        const durationSelectors = [
          // Standard YouTube duration elements
          'ytd-thumbnail-overlay-time-status-renderer span',
          'ytd-thumbnail-overlay-time-status-renderer',
          'ytd-thumbnail-overlay-time-status-renderer #text',
          'ytd-thumbnail-overlay-time-status-renderer span span',

          // Homepage rich grid specific
          '#overlays ytd-thumbnail-overlay-time-status-renderer span',
          '#overlays ytd-thumbnail-overlay-time-status-renderer',
          'ytd-thumbnail #overlays span',
          'ytd-thumbnail #overlays ytd-thumbnail-overlay-time-status-renderer span',

          // Generic thumbnail overlays
          'ytd-thumbnail span',
          '#thumbnail span',
          '[overlay-style="DEFAULT"] span',
          '[overlay-style="LIVE"] span',

          // Deep search in overlays
          '#overlays *',
          'ytd-thumbnail #overlays *',

          // Alternative duration containers
          'ytd-thumbnail-overlay-resume-playback-renderer span',
          'ytd-thumbnail-overlay-now-playing-renderer span',
          'ytd-thumbnail-overlay-loading-preview-renderer span',

          // Badge and status elements
          '.badge-shape-wiz__text span',
          '.badge-shape-wiz span',
          '[aria-label*="duration"] span',
          '[aria-label*="length"] span'
        ];

        for (const sel of durationSelectors) {
          if (v.duration) break;

          const elements = media.querySelectorAll(sel);
          for (const el of elements) {
            if (v.duration) break;

            let text = el.textContent || el.innerText || '';
            text = text.trim().replace(/\s+/g, '');

            // Check for valid duration patterns
            if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
              v.duration = text;
              break;
            }

            // Also check for "LIVE" text
            if (/^live$/i.test(text)) {
              v.duration = 'LIVE';
              break;
            }
          }
        }

        // Enhanced live stream detection
        if (!v.duration) {
          const liveSelectors = [
            '[badge-style*=LIVE]',
            '.badge-style-type-live-now',
            'ytd-badge-supported-renderer[icon-type=LIVE]',
            '[overlay-style="LIVE"]',
            '.ytd-thumbnail-overlay-time-status-renderer[overlay-style="LIVE"]',
            'ytd-badge-supported-renderer span',
            '.badge-shape-wiz__text',
            '[aria-label*="LIVE"]',
            '[aria-label*="live"]'
          ];

          for (const sel of liveSelectors) {
            if (v.duration) break;

            const liveBadge = media.querySelector(sel);
            if (liveBadge) {
              const badgeText = liveBadge.textContent || liveBadge.innerText || '';
              if (/live/i.test(badgeText)) {
                v.duration = 'LIVE';
                break;
              }
            }
          }
        }

        // Deep text search in thumbnail areas
        if (!v.duration) {
          const thumbnail = media.querySelector('ytd-thumbnail, #thumbnail, .ytd-thumbnail');
          if (thumbnail) {
            const allText = thumbnail.textContent || thumbnail.innerText || '';
            const matches = allText.match(/(\d{1,2}:\d{2}(?::\d{2})?)/g);

            if (matches && matches.length > 0) {
              for (const match of matches) {
                if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(match)) {
                  v.duration = match;
                  break;
                }
              }
            }

            // Also check for live indicators in text
            if (!v.duration && /live/i.test(allText)) {
              v.duration = 'LIVE';
            }
          }
        }

        // Final comprehensive search in all text content
        if (!v.duration) {
          const allText = media.textContent || media.innerText || '';
          const timeMatches = allText.match(/(\d{1,2}:\d{2}(?::\d{2})?)/g);

          if (timeMatches) {
            for (const match of timeMatches) {
              // Skip if it looks like a date, view count, or other non-duration
              if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(match)) continue;
              if (match.includes('.') || match.includes(',')) continue;

              // Additional validation - check if this looks like a reasonable video duration
              const parts = match.split(':').map(Number);
              if (parts.length >= 2) {
                const [minutes, seconds] = parts.slice(-2);
                // Valid minutes (0-300) and seconds (0-59)
                if (minutes >= 0 && minutes <= 300 && seconds >= 0 && seconds <= 59) {
                  v.duration = match;
                  break;
                }
              }
            }
          }

          // Final live check
          if (!v.duration && /live/i.test(allText)) {
            v.duration = 'LIVE';
          }
        }
      }
    });

    // Add duration retry mechanism for videos that still don't have duration
    // This handles cases where YouTube loads duration info asynchronously
    if (!state.durationRetryAttempted) {
      state.durationRetryAttempted = true;
      setTimeout(() => {
        const videosWithoutDuration = values.filter(v => !v.duration);
        if (videosWithoutDuration.length > 0) {
          videosWithoutDuration.forEach(v => {
            const idMatch = v.url.match(/v=([\w-]{6,})/);
            if (!idMatch) return;

            const anchor = document.querySelector(`a[href*="${idMatch[1]}"]`);
            if (!anchor) return;

            const media = anchor.closest('ytd-rich-grid-media, ytd-video-renderer, ytd-compact-video-renderer, ytd-rich-item-renderer');
            if (!media) return;

            // Try the most comprehensive duration selectors for retry
            const retrySelectors = [
              'ytd-thumbnail-overlay-time-status-renderer span',
              'ytd-thumbnail-overlay-time-status-renderer #text',
              '#overlays ytd-thumbnail-overlay-time-status-renderer span',
              'ytd-thumbnail #overlays span',
              '#thumbnail span',
              '.badge-shape-wiz__text span'
            ];

            for (const sel of retrySelectors) {
              const elements = media.querySelectorAll(sel);
              for (const el of elements) {
                let text = el.textContent || el.innerText || '';
                text = text.trim().replace(/\s+/g, '');

                if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
                  v.duration = text;
                  break;
                }

                if (/^live$/i.test(text)) {
                  v.duration = 'LIVE';
                  break;
                }
              }
              if (v.duration) break;
            }
          });

          // Re-render if we found any missing durations
          if (videosWithoutDuration.some(v => v.duration)) {
            renderList();
          }
        }
      }, 1500); // Wait 1.5 seconds for async loading
    }
    return values;
  }

  function extractVideosFromInitialData() {
    const vids = [];
    const pushRenderer = (vr) => {
      try {
        const videoId = vr.videoId || (vr.navigationEndpoint && vr.navigationEndpoint.watchEndpoint && vr.navigationEndpoint.watchEndpoint.videoId);
        if (!videoId) return;
        const url = '/watch?v=' + videoId;
        const title = (vr.title && (vr.title.simpleText || (vr.title.runs && vr.title.runs.map(r=>r.text).join('')))) || 'Untitled';
        const channel = (vr.ownerText && (vr.ownerText.simpleText || (vr.ownerText.runs && vr.ownerText.runs.map(r=>r.text).join('')))) || '';
        const duration = (vr.lengthText && (vr.lengthText.simpleText || (vr.lengthText.runs && vr.lengthText.runs.map(r=>r.text).join('')))) || '';
        const uploadDate = (vr.publishedTimeText && (vr.publishedTimeText.simpleText || (vr.publishedTimeText.runs && vr.publishedTimeText.runs.map(r=>r.text).join('')))) || '';
        vids.push({ title, url, channel, duration, uploadDate });
      } catch(e) {}
    };
    function walk(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (obj.videoRenderer) pushRenderer(obj.videoRenderer);
      else if (obj.compactVideoRenderer) pushRenderer(obj.compactVideoRenderer);
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj,k)) walk(obj[k]);
      }
    }
    walk(window.ytInitialData);
    return vids;
  }

  function renderList() {
  const vids = collectVideos();
  if (!Array.isArray(state.videos)) state.videos = [];
  const prev = state.videos;
  const changed = vids.length !== prev.length || vids.some((v,i)=>!prev[i] || prev[i].url!==v.url);
  // Always assign on first run (prev may be empty) and on any change with >0 items
  if (changed || !prev.length) state.videos = vids;
    if (!state.videos || !state.videos.length) {
      const netCount = (state.networkVideos && state.networkVideos.length) || 0;
      const haveInitialData = !!window.ytInitialData;
      const domAnchors = document.querySelectorAll('a[href*="/watch?v="]').length;
      listContainer.innerHTML = `<div style="opacity:0.6;text-align:center;padding:2em;">Loading feed… (0)<br/><span style='font-size:0.7em;'>path:${location.pathname} net:${netCount} ytInit:${haveInitialData} anchors:${domAnchors}</span></div>`;
      return;
    }
    if (state.selectedIndex >= state.videos.length) state.selectedIndex = state.videos.length-1;
    listContainer.innerHTML = state.videos.map((v,i)=>{
      const sel = i===state.selectedIndex;
      // Create relevance indicator for homepage videos
      let relevanceIndicator = '';
      if (location.pathname === '/' && v.uploadDate) {
        const ageMatch = v.uploadDate.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?/i);
        if (ageMatch) {
          const [_, num, unit] = ageMatch;
          const count = parseInt(num);

          if (unit.toLowerCase().includes('day')) {
            if (count >= 7) relevanceIndicator = ' 1w+';
            else if (count >= 2) relevanceIndicator = ` ${count}+`;
            else if (count === 1) relevanceIndicator = ' 1+';
          } else if (unit.toLowerCase().includes('week')) {
            if (count >= 4) relevanceIndicator = ' 1m+';
            else relevanceIndicator = ` ${count}w+`;
          } else if (unit.toLowerCase().includes('month')) {
            relevanceIndicator = ` ${count}m+`;
          } else if (unit.toLowerCase().includes('year')) {
            relevanceIndicator = ` ${count}y+`;
          } else if (unit.toLowerCase().includes('hour')) {
            if (count >= 24) relevanceIndicator = ' 1+';
          }
        }
      }

      const line = `${i+1}. ${v.title}${v.channel?`  ·  ${v.channel}`:''}${v.uploadDate?`  (${v.uploadDate})`:''}${v.duration?`  [${v.duration}]`:''}${relevanceIndicator}`;

      // Debug log first video data
      if (i === 0 && !window.__ytFocus._displayDebugged) {
        window.__ytFocus._displayDebugged = true;
        console.log('[yt-focus] display data:', {
          title: v.title,
          channel: v.channel,
          uploadDate: v.uploadDate,
          duration: v.duration,
          relevanceIndicator,
          line
        });
      }

      return `<div data-i="${i}" style="padding:6px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;background:${sel?'#313244':'transparent'};color:${sel?'#f5e0dc':'#a6e3a1'};border-left:4px solid ${sel?'#89b4fa':'transparent'};font-size:0.95em;">${line}</div>`;
    }).join('');
    if (state.debugOverlay) {
      listContainer.insertAdjacentHTML('afterbegin', `<div style="position:sticky;top:0;background:#111827;padding:4px 6px;font-size:0.65em;opacity:0.7;">videos:${state.videos.length}</div>`);
    }
    // Ensure selected element is scrolled into view
    const selEl = listContainer.querySelector(`[data-i="${state.selectedIndex}"]`);
    if (selEl) {
      const top = selEl.offsetTop;
      const bottom = top + selEl.offsetHeight;
      if (top < listContainer.scrollTop) listContainer.scrollTop = top - 8;
      else if (bottom > listContainer.scrollTop + listContainer.clientHeight) listContainer.scrollTop = bottom - listContainer.clientHeight + 8;
    }
  }
  // Expose direct render for network hook
  try { window.__ytFocus.renderListDirect = renderList; } catch(e) {}

  renderList();
  // Observe for dynamic feed changes (lighter debounce)
  if (!state.listObserver) {
    state.listObserver = new MutationObserver(()=>{ clearTimeout(state._updateTimer); state._updateTimer = setTimeout(()=>{ renderList(); },150); });
    state.listObserver.observe(document.body,{childList:true,subtree:true});
  }
  // Poll early after navigation to catch late population without scrolling
  let attempt = 0;
  function earlyPoll(){
    if (!document.getElementById('yt-minimal-overlay')) return;
    attempt++;
    renderList();
    if ((state.videos||[]).length < 25 && attempt < 25) setTimeout(earlyPoll, 160);
  }
  earlyPoll();

  listContainer.onclick = e => {
    const d = e.target.closest('[data-i]');
    if (!d) return; state.selectedIndex = parseInt(d.dataset.i,10)||0; renderList(); navigateInFocus(state.videos[state.selectedIndex].url); };
  // Wheel near bottom triggers maybeLoadMoreUnderlying
  listContainer.addEventListener('wheel', () => {
    if (!state.videos) return;
    if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 40) {
      if (typeof maybeLoadMoreUnderlying === 'function') maybeLoadMoreUnderlying();
    }
  });

  function openSearchPrompt() {
    if (document.getElementById('yt-focus-search-backdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'yt-focus-search-backdrop';
    Object.assign(backdrop.style,{position:'fixed',inset:'0',background:'#0d0f17',display:'flex',alignItems:'center',justifyContent:'center',zIndex:'1000000'});
    const box = document.createElement('div');
    Object.assign(box.style,{display:'flex',flexDirection:'column',gap:'10px',width:'min(900px,90vw)',padding:'2em 2.5em',background:'#111827',border:'1px solid #313244',borderRadius:'14px',boxShadow:'0 0 50px #000'});
  box.innerHTML = '<div style="color:#89b4fa;font-size:0.85em;letter-spacing:1px;">SEARCH</div>';
    const input = document.createElement('input');
    input.id='yt-focus-search-box'; Object.assign(input.style,{background:'#1e293b',color:'#f5e0dc',border:'2px solid #45475a',padding:'14px 16px',fontFamily:'monospace',fontSize:'1.1em',borderRadius:'8px',outline:'none'});
    input.placeholder = 'Type to search…';
    const hint = document.createElement('div');
    hint.style.cssText='color:#cdd6f4;font-size:0.7em;opacity:0.7;text-align:right';
    hint.textContent='Enter to search • Esc to close';
    box.appendChild(input); box.appendChild(hint); backdrop.appendChild(box); document.body.appendChild(backdrop); input.focus();
  // Mark search open in state
  if (window.__ytFocus) window.__ytFocus.searchOpen = true;
  function close(){ backdrop.remove(); if (window.__ytFocus) window.__ytFocus.searchOpen = false; }
    backdrop.addEventListener('click', e=>{ if(e.target===backdrop) close(); });
    input.addEventListener('keydown', ev => { if (ev.key==='Enter'){ const q=input.value.trim(); close(); if(q) navigateInFocus('/results?search_query='+encodeURIComponent(q));} else if (ev.key==='Escape'){ close(); }});
  }

  // Always (re)attach key handler to ensure navigation works
  if (state.keyHandler) {
    window.removeEventListener('keydown', state.keyHandler);
    state.keyHandler = null;
  }

  console.log('[yt-focus] Attaching keyboard handler');
  state.keyHandler = ev => {
    // If search modal open, ignore all shortcuts (except allow its own handling)
    if (state.searchOpen || document.getElementById('yt-focus-search-backdrop')) {
      return; // don't intercept typing
    }
    // Ignore when focus is inside input/textarea/contentEditable
    const tgt = ev.target;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing) return;
    const vids = state.videos||[];
    const quickKey = ev.shiftKey ? /^Digit([1-5])$/.exec(ev.code)?.[1] : /^[6-9]$/.exec(ev.key)?.[0];
    if (!ev.shiftKey && /^[1-5]$/.test(ev.key)) {
      ev.preventDefault();
      if (!ev.repeat) navigateInFocus('/', String(Number(ev.key) - 1));
    }
    else if (ev.key==='j' || ev.key==='ArrowDown'){
      if (state.selectedIndex < vids.length-1) {
        state.selectedIndex++;
        renderList();
      } else {
        // At bottom: attempt gentle underlying page advance to load more (demand-driven)
        maybeLoadMoreUnderlying();
        setTimeout(()=>renderList(),180);
      }
      ev.preventDefault();
    }
    else if (ev.key==='k' || ev.key==='ArrowUp'){ state.selectedIndex=Math.max(0,state.selectedIndex-1); renderList(); ev.preventDefault(); }
    else if (quickKey){
      const n = Number(quickKey) - 1;
      if (vids[n]) { ev.preventDefault(); navigateInFocus(vids[n].url); }
    }
    else if (ev.key==='Enter'){ if(vids[state.selectedIndex]) navigateInFocus(vids[state.selectedIndex].url); }
    else if (ev.key==='s'){ ev.preventDefault(); ev.stopPropagation(); openSearchPrompt(); }
    else if (ev.key==='h'){ navigateInFocus('/'); }
    else if (ev.key==='q'){ if (state.enableQuitHotkey !== false) { const o=document.getElementById('yt-minimal-overlay'); if(o) o.remove(); const root=document.getElementById('ytd-app'); if(root) root.style.display=''; window.removeEventListener('keydown', state.keyHandler); state.keyHandler=null; state.overlayDismissed=true; } }
    else if (ev.key==='d'){ state.debugOverlay = !state.debugOverlay; renderList(); }
    else if (ev.key==='l'){ maybeLoadMoreUnderlying(); }
  };
  window.addEventListener('keydown', state.keyHandler);

  // Demand-driven underlying page load more (single gentle scroll pulses)
  function maybeLoadMoreUnderlying() {
    try {
      const grid = document.querySelector('ytd-rich-grid-renderer #contents, ytd-page-manager, #contents.ytd-section-list-renderer');
      if (grid && typeof grid.scrollTo === 'function') {
        const before = (state.videos||[]).length;
        grid.scrollTo({ top: grid.scrollHeight, behavior:'instant' });
        // Also nudge window
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior:'instant' });
        // Re-collect after brief delay only if new items may appear
        setTimeout(()=>{
          const after = (collectVideos()||[]).length;
          if (after > before) renderList();
        }, 300);
      }
    } catch(e) {}
  }
}

// --- Network interception to capture homepage & dynamic feed videos ---
if (!window.__ytFocus) window.__ytFocus = {};
if (!window.__ytFocus.networkHooked) {
  window.__ytFocus.networkHooked = true;
  const state = window.__ytFocus;
  state.networkVideos = [];
  const seenIds = new Set();
  function addNetworkVideo(vr) {
    try {
      const videoId = vr.videoId || (vr.navigationEndpoint && vr.navigationEndpoint.watchEndpoint && vr.navigationEndpoint.watchEndpoint.videoId);
      if (!videoId || seenIds.has(videoId)) return;
      seenIds.add(videoId);
      const title = vr.title && (vr.title.simpleText || (vr.title.runs && vr.title.runs.map(r=>r.text).join('')));
      const channel = vr.ownerText && (vr.ownerText.simpleText || (vr.ownerText.runs && vr.ownerText.runs.map(r=>r.text).join('')));
      const duration = vr.lengthText && (vr.lengthText.simpleText || (vr.lengthText.runs && vr.lengthText.runs.map(r=>r.text).join('')));
      // Extract upload date from publishedTimeText or similar fields
      const uploadDate = (vr.publishedTimeText && (vr.publishedTimeText.simpleText || (vr.publishedTimeText.runs && vr.publishedTimeText.runs.map(r=>r.text).join('')))) || '';
      state.networkVideos.push({ title: title||'Untitled', url: 'https://www.youtube.com/watch?v='+videoId, channel: channel||'', duration: duration||'', uploadDate });
    } catch(e) {}
  }
  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.videoRenderer) addNetworkVideo(obj.videoRenderer);
    if (obj.compactVideoRenderer) addNetworkVideo(obj.compactVideoRenderer);
    if (Array.isArray(obj)) { obj.forEach(walk); return; }
    for (const k in obj) if (Object.prototype.hasOwnProperty.call(obj,k)) walk(obj[k]);
  }
  function processData(data) {
    walk(data);
    // If overlay present, re-render list (debounced)
    if (!state._netDebounce) state._netDebounce = 0;
    clearTimeout(state._netDebounce);
    state._netDebounce = setTimeout(()=>{
      if (window.__ytFocus && window.__ytFocus.renderListDirect && document.getElementById('yt-minimal-overlay')) {
        try { window.__ytFocus.renderListDirect(); } catch(e) {}
      }
    }, 120);
  }
  // Fetch hook
  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(...args) {
      return origFetch.apply(this, args).then(res => {
        try {
          const ct = res.headers.get('content-type')||'';
          if (ct.includes('json')) {
            res.clone().json().then(j => {
              if (j && (j.contents || j.onResponseReceivedActions || j.onResponseReceivedEndpoints)) processData(j);
            }).catch(()=>{});
          }
        } catch(e) {}
        return res;
      });
    };
  }
  // XHR hook
  const OrigXHR = window.XMLHttpRequest;
  if (OrigXHR) {
    function WrappedXHR(){ const xhr = new OrigXHR(); let url='';
      xhr.addEventListener('load', function(){
        try {
          if (this.responseType === '' || this.responseType === 'text') {
            if (typeof this.responseText === 'string' && this.responseText.includes('videoRenderer')) {
              const txt = this.responseText.trim();
              if (txt.startsWith('{') && txt.endsWith('}')) {
                try { const data = JSON.parse(txt); if (data && (data.contents || data.onResponseReceivedActions)) processData(data); } catch(e) {}
              }
            }
          }
        } catch(e) {}
      });
      const origOpen = xhr.open; xhr.open = function(m,u,...rest){ url=u; return origOpen.call(this,m,u,...rest); };
      return xhr; }
    window.XMLHttpRequest = WrappedXHR;
  }
}

// Homepage zero-result polling (scroll pulses + re-render) to coax initial tiles
if (!window.__ytFocus.homeZeroPoller) {
  window.__ytFocus.homeZeroPoller = true;
  const state = window.__ytFocus;
  let tries = 0;
  function pulse() {
    if (location.pathname !== '/' || !document.getElementById('yt-minimal-overlay')) return;
    if ((state.videos && state.videos.length) || tries > 12) return; // stop when populated or after ~5s
    tries++;
    try { window.scrollTo({ top: document.documentElement.scrollHeight, behavior:'instant' }); } catch(e) {}
    if (state.renderListDirect) state.renderListDirect();
    setTimeout(pulse, 400);
  }
  setTimeout(pulse, 300);
}

// Run overlay on homepage, search, and subscriptions
function maybeShowMinimalOverlay() {
  const path = window.location.pathname;
  if (path === '/' || path.startsWith('/results') || path.startsWith('/feed/subscriptions')) {
    createMinimalOverlay();
  } else if (path.startsWith('/watch')) {
    applyMinimalWatchPage();
  } else {
    const overlay = document.getElementById('yt-minimal-overlay');
    if (overlay) overlay.remove();
    const ytRoot = document.getElementById('ytd-app') || document.body;
    if (ytRoot) ytRoot.style.display = '';
  }
}

// --- Native HTML5 Video Player Overlay ---
// Replace previous experimental native-player attempt with distraction hiding on watch pages
function applyMinimalWatchPage() {
  // Ensure original UI is visible
  const ytRoot = document.getElementById('ytd-app');
  if (ytRoot) ytRoot.style.display = '';
  const overlay = document.getElementById('yt-minimal-overlay');
  if (overlay) overlay.remove();

  // Inject (or update) a style tag that hides distractions
  const STYLE_ID = 'yt-focus-min-css';
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
  /* Minimal distraction mode for watch page without breaking player */
  body.yt-focus-watch { background:#000 !important; }
  body.yt-focus-watch #secondary,
  body.yt-focus-watch #masthead-container,
  body.yt-focus-watch ytd-mini-guide-renderer,
  body.yt-focus-watch ytd-guide-renderer,
  body.yt-focus-watch #guide { display:none !important; }
  /* Hide metadata, description, comments and extras */
  body.yt-focus-watch #below,
  body.yt-focus-watch ytd-watch-metadata,
  body.yt-focus-watch ytd-video-owner-renderer,
  body.yt-focus-watch ytd-comments,
  body.yt-focus-watch ytd-watch-flexy #primary-inner > *:not(#player):not(#columns),
  body.yt-focus-watch ytd-merch-shelf-renderer,
  body.yt-focus-watch ytd-engagement-panel-section-list-renderer,
  body.yt-focus-watch ytd-endpoint.top-level-buttons.style-scope.ytd-menu-renderer { display:none !important; }
  /* Remove gap below player */
  body.yt-focus-watch #primary-inner { padding:0 !important; margin:0 !important; }
  body.yt-focus-watch #movie_player { outline:none !important; background:#000 !important; box-shadow:0 0 24px #000; }
  body.yt-focus-watch .ytp-endscreen-content, body.yt-focus-watch .ytp-ce-element, body.yt-focus-watch .ytp-pause-overlay { display:none !important; }
  `;

  // Force theater mode for larger video (YouTube sets an attribute on ytd-watch-flexy)
  const flexy = document.querySelector('ytd-watch-flexy');
  if (flexy && !flexy.hasAttribute('theater')) {
    try {
      // Click theater mode button if exists
      const theaterBtn = document.querySelector('.ytp-size-button');
      if (theaterBtn && !document.fullscreenElement) theaterBtn.click();
    } catch (e) {}
  }
  document.body.classList.add('yt-focus-watch');

  // Enhanced keyboard shortcuts for player with better space bar handling
  if (!window.__ytFocus) window.__ytFocus = {};
  const state = window.__ytFocus;
  if (!state.watchKeyHandler) {
    state.watchKeyHandler = (e) => {
      const v = document.querySelector('video');
      if (!v) return;

      // Ignore if focus is in input/textarea/contentEditable
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'f') {
        // Toggle fullscreen
        if (!document.fullscreenElement) {
          v.requestFullscreen().catch(()=>{});
        } else {
          document.exitFullscreen().catch(()=>{});
        }
        e.preventDefault();
      }
      else if (e.key === ' ') {
        // Space bar - let YouTube handle this naturally, but ensure it works
        e.preventDefault();

        // Small delay to avoid conflicts with YouTube's native handler
        setTimeout(() => {
          try {
            if (v.paused) {
              v.play().catch(() => {
                // If play fails, try clicking the play button
                const playButton = document.querySelector('.ytp-play-button');
                if (playButton) playButton.click();
              });
            } else {
              v.pause();
            }
          } catch(err) {
            console.log('[yt-focus] Space bar playback error:', err);
          }
        }, 10);
      }
      else if (e.key === 'ArrowRight') {
        v.currentTime += (e.shiftKey ? 10 : 5);
        e.preventDefault();
      }
      else if (e.key === 'ArrowLeft') {
        v.currentTime -= (e.shiftKey ? 10 : 5);
        e.preventDefault();
      }
      else if (e.key === '+') {
        v.playbackRate = Math.min(3, v.playbackRate + 0.25);
        e.preventDefault();
      }
      else if (e.key === '-') {
        v.playbackRate = Math.max(0.25, v.playbackRate - 0.25);
        e.preventDefault();
      }
      else if (e.key === 's') {
        navigateInFocus('/');
      }
      // Subscription feed shortcut
      else if (e.key === 'b') {
        console.log('[yt-focus] b key detected, current page:', location.pathname);
        navigateInFocus('/feed/subscriptions');
      }
      // Additional playback speed shortcuts
      else if (e.key === '1') {
        v.playbackRate = 1.0;
        console.log('[yt-focus] Speed set to 1.0x');
        e.preventDefault();
      }
      else if (e.key === '2') {
        v.playbackRate = 1.25;
        console.log('[yt-focus] Speed set to 1.25x');
        e.preventDefault();
      }
      else if (e.key === '3') {
        v.playbackRate = 1.5;
        console.log('[yt-focus] Speed set to 1.5x');
        e.preventDefault();
      }
      else if (e.key === '4') {
        v.playbackRate = 1.75;
        console.log('[yt-focus] Speed set to 1.75x');
        e.preventDefault();
      }
      else if (e.key === '5') {
        v.playbackRate = 2.0;
        console.log('[yt-focus] Speed set to 2.0x');
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', state.watchKeyHandler);
  }
}

// Listen for navigation (SPA)
window.addEventListener('yt-navigate-finish', maybeShowMinimalOverlay);
maybeShowMinimalOverlay();

// Global listener to re-enter focus mode with 'f' if overlay dismissed and handle subscriptions shortcut
if (!window.__ytFocus) window.__ytFocus = {};
if (!window.__ytFocus.globalReEntry) {
  window.__ytFocus.globalReEntry = true;
  window.addEventListener('keydown', (e) => {
    // Handle subscription shortcut globally
    if (e.key === 'b' && !document.getElementById('yt-minimal-overlay')) {
      console.log('[yt-focus] Global b key detected, going to subscriptions');
      navigateInFocus('/feed/subscriptions');
      return;
    }

    if (e.key === 'f' && !document.getElementById('yt-minimal-overlay')) {
      const path = location.pathname;
      if (path === '/' || path.startsWith('/results') || path.startsWith('/feed/subscriptions')) {
        createMinimalOverlay();
      }
    }
  });
}
// Keep storage synced for enableQuitHotkey while page session lives
try {
  if (chrome.storage && !window.__ytFocus._storageListener) {
    window.__ytFocus._storageListener = (changes, area) => {
      if (area === 'sync' && window.__ytFocus) {
        if (changes.enableQuitHotkey) {
        window.__ytFocus.enableQuitHotkey = changes.enableQuitHotkey.newValue;
        }
        if (changes.disableAutoplay) {
          window.__ytFocus.disableAutoplay = changes.disableAutoplay.newValue;
          // Apply autoplay setting change immediately
          if (window.__ytFocus.disableAutoplay) {
            disableAutoplay();
            preventAutoplay();
          }
        }
      }
    };
    chrome.storage.onChanged.addListener(window.__ytFocus._storageListener);
  }
} catch(e) {}
// Hide all YouTube Shorts from UI and recommendations
function removeShorts() {
  // Remove Shorts shelf on homepage and recommendations
  const shortsSelectors = [
    'ytd-rich-section-renderer:has(a[href*="/shorts/"])', // homepage shelf
    'ytd-reel-shelf-renderer', // another homepage shelf
    'ytd-grid-video-renderer a[href*="/shorts/"]', // channel page
    'ytd-compact-video-renderer a[href*="/shorts/"]', // sidebar
    'ytd-video-renderer a[href*="/shorts/"]', // search results
    'a[href*="/shorts/"]', // any Shorts link
    'ytd-reel-item-renderer', // Shorts in feeds
    'ytd-reel-video-renderer',
    'ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]',
    'ytd-rich-grid-media:has(a[href*="/shorts/"])',
    'ytd-rich-item-renderer:has(a[href*="/shorts/"])'
  ];
  shortsSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      // Remove the whole card or shelf
      if (el.tagName.startsWith('YTD-')) {
        el.remove();
      } else if (el.closest('ytd-rich-item-renderer')) {
        el.closest('ytd-rich-item-renderer').remove();
      } else if (el.closest('ytd-video-renderer')) {
        el.closest('ytd-video-renderer').remove();
      } else if (el.closest('ytd-compact-video-renderer')) {
        el.closest('ytd-compact-video-renderer').remove();
      } else {
        el.remove();
      }
    });
  });
  // Hide Shorts tab in the sidebar
  const shortsTab = document.querySelector('a[title="Shorts"], a[href="/shorts"]');
  if (shortsTab && shortsTab.parentElement) {
    shortsTab.parentElement.style.display = 'none';
  }
}

// Observe for dynamic content (YouTube is SPA)
const shortsObserver = new MutationObserver(() => removeShorts());
shortsObserver.observe(document.body, { childList: true, subtree: true });
// Initial run
removeShorts();
// content.js
// --- Smart playback speed detection ---
function isMusicContent() {
  // Get video metadata to determine if it's music/song content
  const title = document.title || '';
  const url = window.location.href || '';

  // Check for music-related keywords in title
  const musicKeywords = [
    'music', 'song', 'track', 'album', 'single', 'official video', 'official audio',
    'lyric video', 'lyrics', 'karaoke', 'remix', 'cover', 'feat.', 'ft.', 'feat',
    'ft', 'prod.', 'produced by', 'spotify', 'apple music', 'soundcloud',
    'official music video', 'music video', 'musical', 'symphony', 'orchestra'
  ];

  const lowerTitle = title.toLowerCase();
  const isMusicByTitle = musicKeywords.some(keyword =>
    lowerTitle.includes(keyword.toLowerCase())
  );

  // Check for music channel indicators
  const musicChannels = [
    'vevo', 'records', 'music', 'official', 'tv', 'radio', 'hits', 'top 40',
    'billboard', 'mtv', 'vh1', 'bet', 'soul', 'r&b', 'hip hop', 'rap',
    'electronic', 'edm', 'dance', 'pop', 'rock', 'jazz', 'classical'
  ];

  const isMusicByChannel = musicChannels.some(channel =>
    lowerTitle.includes(channel.toLowerCase())
  );

  // Check if video is longer than 10 minutes (likely not a song)
  const durationElement = document.querySelector('span.ytp-time-duration');
  let isLongVideo = false;
  if (durationElement) {
    const durationText = durationElement.textContent || '';
    const durationMatch = durationText.match(/(\d+):(\d+)/);
    if (durationMatch) {
      const [_, minutes] = durationMatch;
      isLongVideo = parseInt(minutes) >= 10;
    }
  }

  return (isMusicByTitle || isMusicByChannel) && !isLongVideo;
}

function setSmartPlaybackSpeed() {
  const trySet = () => {
    const video = document.querySelector('video');
    if (!video) return;

    const targetSpeed = isMusicContent() ? 1.0 : 1.75;

    // Only change speed if it's different from target
    if (video.playbackRate !== targetSpeed) {
      video.playbackRate = targetSpeed;
      console.log(`[yt-focus] Set playback speed to ${targetSpeed}x (${isMusicContent() ? 'music detected' : 'regular video'})`);
    }
  };

  // Try immediately and on interval (for SPA loads)
  trySet();
  const interval = setInterval(() => {
    trySet();
    // Stop after 10 seconds
  }, 500);
  setTimeout(() => clearInterval(interval), 10000);
}

window.addEventListener('yt-navigate-finish', setSmartPlaybackSpeed);
setSmartPlaybackSpeed();
// This script disables YouTube autoplay and forces a reload to a clean video URL if needed
function cleanYouTubeUrl() {
  const url = new URL(window.location.href);
  let changed = false;
  if (url.searchParams.has('v')) {
    ['list', 'index', 'start_radio', 'radio'].forEach(param => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    });
    if (changed) {
      window.location.replace(url.toString());
      return true;
    }
  }
  return false;
}

function disableAutoplay() {
  console.log('[yt-focus] Disabling autoplay...');

  // Try to find the autoplay toggle and turn it off
  const selectors = [
    'button[aria-label*="Autoplay"]',
    'tp-yt-paper-toggle-button[aria-label*="Autoplay"]',
    '#toggle[aria-checked]',
    'ytd-compact-autoplay-renderer #toggle',
    '.ytp-autonav-toggle-button[aria-checked="true"]',
    'ytd-toggle-button-renderer[aria-pressed="true"] button'
  ];

  for (const sel of selectors) {
    const toggle = document.querySelector(sel);
    if (toggle) {
      const isChecked = toggle.getAttribute('aria-checked') === 'true' ||
                       toggle.getAttribute('aria-pressed') === 'true';
      if (isChecked) {
        console.log('[yt-focus] Found autoplay toggle, clicking to disable');
      toggle.click();
        break;
    }
  }
  }

  // Set autoplay in localStorage (YouTube uses this for remembering user setting)
  try {
    localStorage.setItem('yt-autonav-disable-autoplay', 'true');
    localStorage.setItem('yt-player-autonav', 'false');
    localStorage.setItem('yt-player-autonav-disabled', 'true');
    console.log('[yt-focus] Set autoplay to disabled in localStorage');
  } catch (e) {
    console.log('[yt-focus] Failed to set localStorage:', e);
  }

  // Also try to set the autoplay switch in the player config
  if (window.yt && window.yt.config_ && window.yt.config_.PLAYER_CONFIG) {
    window.yt.config_.PLAYER_CONFIG.args.autoplay = 0;
    console.log('[yt-focus] Disabled autoplay in player config');
  }

  // Try to disable autoplay on the video element itself
  const video = document.querySelector('video');
  if (video) {
    video.autoplay = false;
    console.log('[yt-focus] Disabled autoplay on video element');
  }

  // Try to find and disable any autoplay-related elements in the DOM
  const autoplayElements = document.querySelectorAll('[data-autoplay], [autoplay]');
  autoplayElements.forEach(el => {
    el.removeAttribute('autoplay');
    el.removeAttribute('data-autoplay');
    el.autoplay = false;
  });

  console.log('[yt-focus] Autoplay disabling completed');
}

// Aggressive autoplay prevention
function preventAutoplay() {
  const video = document.querySelector('video');
  if (video) {
    // Override the play method to require user interaction
    const originalPlay = video.play;
    video.play = function() {
      // Only allow play if there's been a recent user interaction
      const timeSinceInteraction = Date.now() - (window.lastUserInteraction || 0);
      if (timeSinceInteraction < 5000) { // 5 seconds grace period
        return originalPlay.call(this);
      } else {
        console.log('[yt-focus] Blocked autoplay attempt');
        return Promise.resolve(); // Don't reject, just do nothing
      }
    };

    // Prevent autoplay attribute
    video.autoplay = false;
    video.removeAttribute('autoplay');
  }
}

// Track user interactions
function trackUserInteraction() {
  window.lastUserInteraction = Date.now();
}

// Add event listeners for user interactions
document.addEventListener('click', trackUserInteraction);
document.addEventListener('keydown', trackUserInteraction);
document.addEventListener('touchstart', trackUserInteraction);

// Watch for dynamically added autoplay elements
const autoplayObserver = new MutationObserver((mutations) => {
  let autoplayFound = false;
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Check if the added node or its children have autoplay attributes
        if (node.hasAttribute && (node.hasAttribute('autoplay') || node.hasAttribute('data-autoplay'))) {
          node.removeAttribute('autoplay');
          node.removeAttribute('data-autoplay');
          autoplayFound = true;
        }
        // Check children
        const autoplayElements = node.querySelectorAll ?
          node.querySelectorAll('[autoplay], [data-autoplay]') : [];
        autoplayElements.forEach(el => {
          el.removeAttribute('autoplay');
          el.removeAttribute('data-autoplay');
          autoplayFound = true;
        });
      }
    });
  });
  if (autoplayFound) {
    console.log('[yt-focus] Removed dynamically added autoplay elements');
  }
});

// Start observing
autoplayObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Clean URL first, then disable autoplay and remove Shorts
if (!cleanYouTubeUrl()) {
  window.addEventListener('yt-navigate-finish', () => {
    cleanYouTubeUrl();
    disableAutoplay();
    preventAutoplay();
    removeShorts();
  });
  disableAutoplay();
  preventAutoplay();
  removeShorts();
}

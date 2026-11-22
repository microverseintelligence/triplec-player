(() => {
  'use strict';
  const MOODS = [
    { id: 'all', color: '#f3efe8' },
    { id: 'energy', color: '#ff8a4c' },
    { id: 'rhythm', color: '#f2c14e' },
    { id: 'mantra', color: '#e98ad6' },
    { id: 'drums', color: '#d9773b' },
    { id: 'lofi', color: '#8fb3ff' },
    { id: 'calm', color: '#7fd1b9' },
  ];
  const GENRES = ['all', 'ethno', 'drums', 'mantra', 'electronic', 'downtempo', 'lofi', 'ambient', 'cinematic', 'neoclassical', 'acoustic'];
  const PAGE = 60;
  const T = (k, v) => window.TC.t(k, v);
  const moodLabel = (id) => T('mood.' + id);
  const moodTitle = (id) => id === 'all' ? T('title.all') : moodLabel(id);
  const $ = (s) => document.querySelector(s);
  const audio = $('#audio');
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tc.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tc.' + k, JSON.stringify(v)); } catch {} },
  };

  let tracks = [];
  let mood = store.get('mood', 'all');
  let view = store.get('view', 'grid');
  let genre = store.get('genre', 'all');
  let query = '';
  let shown = PAGE;
  let io = null;
  let queue = [];        // ids of the current play queue
  let qi = -1;           // index in queue
  let shuffle = store.get('shuffle', false);
  let repeat = store.get('repeat', 'off'); // off | all | one
  let seeking = false;

  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const byId = (id) => tracks.find((t) => t.id === id);
  const current = () => byId(queue[qi]);
  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ё/g, 'е');
  const filtered = () => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    return tracks.filter((t) => (mood === 'all' || t.moods.includes(mood)) && (genre === 'all' || t.genre === genre)
      && (!words.length || words.every((w) => t._s.includes(w))));
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function greeting() {
    const h = new Date().getHours();
    $('#greeting').textContent = T(h < 5 ? 'greet.night' : h < 12 ? 'greet.morning' : h < 18 ? 'greet.day' : 'greet.evening');
  }

  function renderMoods() {
    const nav = $('#moods');
    nav.innerHTML = MOODS.map((m) => {
      const n = m.id === 'all' ? tracks.length : tracks.filter((t) => t.moods.includes(m.id)).length;
      if (!n) return '';
      return `<button class="chip" data-mood="${m.id}" aria-pressed="${m.id === mood}" style="--c:${m.color}"><span class="dot"></span>${esc(moodLabel(m.id))}<span class="cnt">${n}</span></button>`;
    }).join('');
    nav.onclick = (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      mood = b.dataset.mood; store.set('mood', mood);
      nav.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c.dataset.mood === mood));
      resetAndRender();
    };
  }

  function renderCatalog() {
    const all = filtered();
    const list = all.slice(0, shown);
    const gt = genre !== 'all' ? ` · ${T('genre.' + genre)}` : '';
    $('#catalogTitle').textContent = `${moodTitle(mood)}${gt} · ${all.length}`;
    $('#empty').hidden = all.length > 0;
    $('#more').hidden = all.length <= shown;
    const el = $('#catalog');
    el.className = `catalog ${view}`;
    const cur = current();
    const playing = !audio.paused;
    if (view === 'grid') {
      el.innerHTML = list.map((t, i) => `
        <button class="card${cur && cur.id === t.id ? ' active' : ''}" data-id="${t.id}" aria-label="${esc(t.title)} — ${esc(t.artist)}">
          <div class="cover"><img src="${t.cover}" alt="" loading="${i < 10 ? 'eager' : 'lazy'}" decoding="async" width="300" height="300">
            <span class="fab"><svg><use href="#${cur && cur.id === t.id && playing ? 'i-pause' : 'i-play'}"/></svg></span></div>
          <div class="t">${t.original ? `<span class="orig">${T('orig.badge')}</span>` : ''}${esc(t.title)}</div>
          <div class="a">${esc(t.artist)}</div>
        </button>`).join('');
    } else {
      el.innerHTML = list.map((t, i) => `
        <button class="row${cur && cur.id === t.id ? ' active' : ''}${playing ? '' : ' paused'}" data-id="${t.id}">
          <img src="${t.cover}" alt="" loading="${i < 12 ? 'eager' : 'lazy'}" decoding="async" width="56" height="56">
          <span style="min-width:0"><span class="t" style="display:block">${cur && cur.id === t.id ? '<span class="eq"><i></i><i></i><i></i></span>' : ''}${esc(t.title)}</span>
          <span class="a" style="display:block">${esc(t.artist)}</span></span>
          <span class="d">${fmt(t.duration)}</span>
        </button>`).join('');
    }
  }

  function resetAndRender() { shown = PAGE; renderCatalog(); }
  function showMore() { if (filtered().length > shown) { shown += PAGE; renderCatalog(); } }

  function renderGenres() {
    const nav = $('#genres');
    nav.innerHTML = GENRES.map((g) => {
      const n = g === 'all' ? tracks.length : tracks.filter((t) => t.genre === g).length;
      if (!n) return '';
      return `<button class="gchip" data-genre="${g}" aria-pressed="${g === genre}">${esc(T('genre.' + g))}<span class="cnt">${n}</span></button>`;
    }).join('');
    nav.onclick = (e) => {
      const b = e.target.closest('.gchip'); if (!b) return;
      genre = b.dataset.genre; store.set('genre', genre);
      nav.querySelectorAll('.gchip').forEach((c) => c.setAttribute('aria-pressed', c.dataset.genre === genre));
      resetAndRender();
    };
  }

  function setView(v) {
    view = v; store.set('view', v);
    document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === v));
    renderCatalog();
  }

  function buildQueue(startId) {
    let ids = filtered().map((t) => t.id);
    if (shuffle) {
      ids = ids.filter((id) => id !== startId);
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      ids.unshift(startId);
    }
    queue = ids; qi = Math.max(0, ids.indexOf(startId));
  }

  function load(t, autoplay = true) {
    if (!t) return;
    audio.src = t.src;
    audio.currentTime = 0;
    store.set('last', t.id);
    updateNowPlaying(t);
    if (autoplay) audio.play().catch(() => {});
    renderCatalog();
  }

  function playId(id) {
    const cur = current();
    if (cur && cur.id === id) { toggle(); return; }
    buildQueue(id); load(byId(id));
  }

  function toggle() {
    if (!current()) { const f = filtered()[0]; if (f) playId(f.id); return; }
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  }

  function next(auto = false) {
    if (!queue.length) return;
    if (auto && repeat === 'one') { audio.currentTime = 0; audio.play(); return; }
    if (qi < queue.length - 1) qi++;
    else if (repeat === 'all' || !auto) qi = 0;
    else { audio.pause(); return; }
    load(current());
  }
  function prev() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (!queue.length) return;
    qi = qi > 0 ? qi - 1 : queue.length - 1;
    load(current());
  }

  // ---- color tint from cover
  function tintFrom(img) {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 16;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, 16, 16);
      const d = x.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { const s = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]); const w = 1 + s / 40; r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; n += w; }
      document.documentElement.style.setProperty('--tint', `${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)}`);
    } catch {}
  }

  function updateNowPlaying(t) {
    $('#mini').hidden = false;
    $('#miniCover').src = t.cover; $('#miniTitle').textContent = t.title; $('#miniArtist').textContent = t.artist;
    $('#art').src = t.cover; $('#pTitle').textContent = t.title; $('#pArtist').textContent = t.artist;
    $('#playerBg').style.backgroundImage = `url("${t.cover}")`;
    $('#playerMood').textContent = t.moods.filter((m) => MOODS.some((x) => x.id === m)).map(moodLabel).join(' · ') || T('now.playing');
    const lic = $('#pLicense');
    lic.textContent = t.original ? T('orig.full') : t.license;
    lic.href = `credits.html#t-${t.id}`;
    lic.title = t.original ? T('orig.tip') : T('lic.tip', { l: t.license, a: t.artist });
    const img = new Image(); img.onload = () => tintFrom(img); img.src = t.cover;
    document.title = `${t.title} — Triple C`;
    if ('mediaSession' in navigator) {
      const abs = (p) => new URL(p, location.href).href;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title, artist: t.artist, album: 'Triple C',
        artwork: [{ src: abs(t.cover), sizes: '600x600', type: 'image/webp' }],
      });
    }
  }

  function syncPlayState() {
    const playing = !audio.paused;
    const icon = playing ? '#i-pause' : '#i-play';
    $('#play use').setAttribute('href', icon); $('#miniPlay use').setAttribute('href', icon);
    $('#play').setAttribute('aria-label', T(playing ? 'pause' : 'play')); $('#miniPlay').setAttribute('aria-label', T(playing ? 'pause' : 'play'));
    $('#player').classList.toggle('playing', playing);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    const cur = current();
    document.querySelectorAll('.card').forEach((c) => {
      const on = cur && c.dataset.id === cur.id;
      c.classList.toggle('active', !!on);
      const u = c.querySelector('.fab use'); if (u) u.setAttribute('href', on && playing ? '#i-pause' : '#i-play');
    });
    document.querySelectorAll('.row').forEach((r) => r.classList.toggle('paused', !playing));
  }

  function setRange(el, frac) { el.style.setProperty('--p', `${(frac * 100).toFixed(2)}%`); }
  function onTime() {
    const d = audio.duration || (current() && current().duration) || 0;
    const f = d ? audio.currentTime / d : 0;
    if (!seeking) { $('#seek').value = Math.round(f * 1000); setRange($('#seek'), f); $('#tCur').textContent = fmt(audio.currentTime); }
    $('#tDur').textContent = fmt(d);
    $('#miniBar').style.width = `${f * 100}%`;
    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && d && isFinite(d)) {
      try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(audio.currentTime, d), playbackRate: 1 }); } catch {}
    }
    if (Math.floor(audio.currentTime) % 5 === 0) store.set('pos', audio.currentTime);
  }

  function openPlayer() { $('#player').classList.add('open'); $('#player').setAttribute('aria-hidden', 'false'); document.body.classList.add('lock'); }
  function closePlayer() { $('#player').classList.remove('open'); $('#player').setAttribute('aria-hidden', 'true'); document.body.classList.remove('lock'); }

  function syncModes() {
    $('#shuffle').setAttribute('aria-pressed', shuffle);
    $('#repeat').setAttribute('aria-pressed', repeat !== 'off');
    $('#repeat').classList.toggle('one', repeat === 'one');
    $('#repeat').setAttribute('aria-label', T(repeat === 'one' ? 'repeat.one' : repeat === 'all' ? 'repeat.all' : 'repeat'));
  }

  function setVol(v) {
    audio.volume = v; store.set('vol', v);
    $('#vol').value = Math.round(v * 100); setRange($('#vol'), v);
    $('#mute use').setAttribute('href', v === 0 || audio.muted ? '#i-mute' : '#i-vol');
  }

  function bind() {
    $('#catalog').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) playId(b.dataset.id); });
    document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
    let qt = null;
    $('#q').addEventListener('input', (e) => { clearTimeout(qt); qt = setTimeout(() => { query = e.target.value; $('#qClear').hidden = !query; resetAndRender(); }, 120); });
    $('#q').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; query = ''; $('#qClear').hidden = true; resetAndRender(); } });
    $('#qClear').addEventListener('click', () => { $('#q').value = ''; query = ''; $('#qClear').hidden = true; resetAndRender(); $('#q').focus(); });
    $('#more').addEventListener('click', showMore);
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((ents) => { if (ents.some((x) => x.isIntersecting)) showMore(); }, { rootMargin: '600px 0px' });
      io.observe($('#more'));
    }
    $('#playAll').addEventListener('click', () => { const l = filtered(); if (!l.length) return; const start = shuffle ? l[Math.floor(Math.random() * l.length)] : l[0]; buildQueue(start.id); load(start); });
    $('#miniOpen').addEventListener('click', openPlayer);
    $('#playerClose').addEventListener('click', closePlayer);
    $('#miniPlay').addEventListener('click', toggle); $('#play').addEventListener('click', toggle);
    $('#miniNext').addEventListener('click', () => next()); $('#next').addEventListener('click', () => next());
    $('#miniPrev').addEventListener('click', prev); $('#prev').addEventListener('click', prev);
    $('#shuffle').addEventListener('click', () => { shuffle = !shuffle; store.set('shuffle', shuffle); const c = current(); if (c) buildQueue(c.id); syncModes(); });
    $('#repeat').addEventListener('click', () => { repeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'; store.set('repeat', repeat); syncModes(); });
    const seek = $('#seek');
    seek.addEventListener('input', () => { seeking = true; const d = audio.duration || 0; setRange(seek, seek.value / 1000); $('#tCur').textContent = fmt(d * seek.value / 1000); });
    seek.addEventListener('change', () => { const d = audio.duration || 0; if (d) audio.currentTime = d * seek.value / 1000; seeking = false; });
    $('#vol').addEventListener('input', (e) => { audio.muted = false; setVol(e.target.value / 100); });
    $('#mute').addEventListener('click', () => { audio.muted = !audio.muted; $('#mute use').setAttribute('href', audio.muted ? '#i-mute' : '#i-vol'); });

    audio.addEventListener('play', syncPlayState); audio.addEventListener('pause', syncPlayState);
    audio.addEventListener('timeupdate', onTime); audio.addEventListener('loadedmetadata', onTime);
    audio.addEventListener('ended', () => next(true));
    audio.addEventListener('error', () => { if (audio.src) setTimeout(() => next(true), 800); });
    // no download / save-as on the media element
    audio.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => { if (e.target.closest('audio, .art, .cover, .mini, .player')) e.preventDefault(); });

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea')) return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      else if (e.code === 'ArrowRight' && e.shiftKey) next();
      else if (e.code === 'ArrowLeft' && e.shiftKey) prev();
      else if (e.code === 'ArrowRight') audio.currentTime = Math.min((audio.duration || 0), audio.currentTime + 10);
      else if (e.code === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 10);
      else if (e.code === 'Escape') closePlayer();
    });
    // swipe down to close full player
    let y0 = null;
    $('#player').addEventListener('touchstart', (e) => { if (!e.target.closest('input')) y0 = e.touches[0].clientY; }, { passive: true });
    $('#player').addEventListener('touchend', (e) => { if (y0 !== null && e.changedTouches[0].clientY - y0 > 90) closePlayer(); y0 = null; });

    if ('mediaSession' in navigator) {
      const ms = navigator.mediaSession;
      const h = (a, f) => { try { ms.setActionHandler(a, f); } catch {} };
      h('play', () => audio.play()); h('pause', () => audio.pause());
      h('previoustrack', prev); h('nexttrack', () => next());
      h('seekbackward', (d) => { audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset || 10)); });
      h('seekforward', (d) => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (d.seekOffset || 10)); });
      h('seekto', (d) => { if (d.fastSeek && audio.fastSeek) audio.fastSeek(d.seekTime); else audio.currentTime = d.seekTime; });
    }
  }

  async function init() {
    greeting();
    bind();
    const res = await fetch('tracks.json', { cache: 'no-cache' });
    tracks = await res.json();
    tracks.forEach((t) => { t._s = norm(`${t.title} ${t.artist} ${t.album || ''}`); });
    if (!MOODS.some((m) => m.id === mood)) mood = 'all';
    if (!GENRES.includes(genre)) genre = 'all';
    renderGenres();
    renderMoods(); setView(view); syncModes(); setVol(store.get('vol', 0.85));
    const last = byId(store.get('last', ''));
    if (last) {
      buildQueue(last.id); load(last, false);
      const pos = store.get('pos', 0);
      audio.addEventListener('loadedmetadata', () => { if (pos && pos < audio.duration - 5) audio.currentTime = pos; }, { once: true });
    }
    syncPlayState();
    window.TC.onChange(() => {
      greeting(); renderMoods(); renderGenres(); renderCatalog(); syncModes(); syncPlayState();
      const c = current(); if (c) updateNowPlaying(c);
    });
    window.TCApp = {
      tracks: () => tracks,
      byId,
      playList(ids, startId) { const list = ids.filter((id) => byId(id)); if (!list.length) return; queue = list; qi = Math.max(0, list.indexOf(startId)); load(byId(queue[qi])); },
      isPlaying: () => !audio.paused,
      pause: () => audio.pause(),
    };
    document.dispatchEvent(new CustomEvent('tc:ready'));
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  init();
})();

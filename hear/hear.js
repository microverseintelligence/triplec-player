// Triple C — «Слышу» / "Hear": music recognition with free, in-browser tools only.
// 1) landmark fingerprint against the Triple C catalog (index precomputed, see fp.js)
// 2) AcoustID + MusicBrainz via Chromaprint WASM (only if a free client key is configured)
// 3) Whisper (transformers.js, lazy) -> lyrics -> lrclib / iTunes / MusicBrainz candidates, verified against real lyrics
// 4) "Similar here": tempo / pulse / brightness / low-end features precomputed for every track
(() => {
  'use strict';
  const CFG = window.TC_HEAR_CONFIG || {};
  const FP = window.TCFP;
  const BASE = new URL('.', (document.currentScript && document.currentScript.src) || location.href.replace(/[^/]*$/, 'hear/'));
  const T = (k, v) => window.TC.t(k, v);
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sheet = $('#hear'), orb = $('#hearOrb'), statusEl = $('#hearStatus'), hintEl = $('#hearHint'), stepsEl = $('#hearSteps'), resEl = $('#hearResults'), wave = $('#hearWave');
  let state = 'idle', rec = null, stream = null, ctx = null, analyser = null, raf = 0, timer = 0, t0 = 0, chunks = [], level = 0;
  let indexP = null, metaP = null, asrP = null, lastFeat = null, lastMatchId = null, lastRender = null;

  const loadIndex = () => indexP || (indexP = fetch(new URL('index.bin', BASE)).then((r) => { if (!r.ok) throw new Error('index'); return r.arrayBuffer(); }).then((b) => FP.loadIndex(b)));
  const loadMeta = () => metaP || (metaP = fetch(new URL('meta.json', BASE)).then((r) => r.json()));

  // ---------- UI helpers
  function setStatus(main, hint) { statusEl.textContent = main || ''; hintEl.textContent = hint || ''; }
  function idleUI() {
    state = 'idle'; sheet.dataset.state = 'idle'; setStatus(T('hear.idle'), T('hear.idle2'));
    orb.setAttribute('aria-label', T('hear.start'));
  }
  const STEPS = ['catalog', 'acoustid', 'words', 'lyrics'];
  function stepsInit() {
    stepsEl.hidden = false;
    stepsEl.innerHTML = STEPS.map((s) => `<li data-step="${s}" data-st="wait"><span class="dot"></span><span class="lbl">${esc(T('step.' + s))}</span><span class="val"></span></li>`).join('');
  }
  function step(s, st, val) {
    const li = stepsEl.querySelector(`[data-step="${s}"]`); if (!li) return;
    li.dataset.st = st; li.querySelector('.val').textContent = val || '';
  }
  function open() {
    sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('open'));
    document.body.classList.add('lock');
    if (state === 'idle') { resEl.innerHTML = ''; stepsEl.hidden = true; idleUI(); }
    loadIndex().catch(() => {}); loadMeta().catch(() => {});
  }
  function close() {
    stopRecording(true);
    sheet.classList.remove('open'); document.body.classList.remove('lock');
    setTimeout(() => { sheet.hidden = true; }, 220);
  }

  // ---------- recording
  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { setStatus(T('hear.nomic')); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) { setStatus(T('hear.denied')); return; }
    if (window.TCApp && window.TCApp.isPlaying()) window.TCApp.pause();
    resEl.innerHTML = ''; stepsEl.hidden = true; lastFeat = null; lastMatchId = null;
    state = 'listening'; sheet.dataset.state = 'listening';
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream); analyser = ctx.createAnalyser(); analyser.fftSize = 1024; src.connect(analyser);
    chunks = [];
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = onStopped;
    rec.start(250);
    t0 = performance.now(); level = 0;
    const secs = CFG.recordSeconds || 10;
    const tick = () => {
      const left = Math.max(0, secs - (performance.now() - t0) / 1000);
      setStatus(T('hear.listening', { s: Math.ceil(left) }), T('hear.listening2'));
      if (left <= 0) stopRecording(false);
    };
    tick(); timer = setInterval(tick, 200);
    draw();
  }
  function stopRecording(cancel) {
    clearInterval(timer); cancelAnimationFrame(raf);
    if (rec && rec.state !== 'inactive') { rec._cancel = !!cancel; rec.stop(); }
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    if (cancel) { rec = null; if (ctx) ctx.close().catch(() => {}); ctx = null; idleUI(); }
  }
  function draw() {
    const c = wave.getContext('2d'); const W = wave.width, H = wave.height;
    const buf = new Uint8Array(analyser.fftSize);
    const loop = () => {
      analyser.getByteTimeDomainData(buf);
      let p = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; p += v * v; }
      const rms = Math.sqrt(p / buf.length); level = level * 0.8 + rms * 0.2;
      sheet.style.setProperty('--lvl', Math.min(1, level * 6).toFixed(3));
      c.clearRect(0, 0, W, H);
      const bars = 48, bw = W / bars;
      for (let b = 0; b < bars; b++) {
        let m = 0; const o = Math.floor(b * buf.length / bars);
        for (let i = 0; i < buf.length / bars; i++) m = Math.max(m, Math.abs(buf[o + i] - 128) / 128);
        const h = Math.max(3, m * H * 1.6);
        c.fillStyle = `rgba(233,185,141,${0.35 + Math.min(0.65, m * 2)})`;
        const x = b * bw + bw * 0.2; const y = (H - Math.min(H, h)) / 2;
        c.beginPath(); c.roundRect ? c.roundRect(x, y, bw * 0.6, Math.min(H, h), 3) : c.rect(x, y, bw * 0.6, Math.min(H, h)); c.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
  }

  // ---------- decoding / resampling
  async function decode(blob) {
    const ab = await blob.arrayBuffer();
    const dc = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const buf = await new Promise((res, rej) => dc.decodeAudioData(ab.slice(0), res, rej));
    return { buf, ab };
  }
  async function resample(buf, sr) {
    const len = Math.ceil(buf.duration * sr);
    const oc = new OfflineAudioContext(1, len, sr);
    const s = oc.createBufferSource(); s.buffer = buf; s.connect(oc.destination); s.start();
    const out = await oc.startRendering(); return out.getChannelData(0);
  }

  // ---------- pipeline
  async function onStopped() {
    const cancelled = rec && rec._cancel; rec = null;
    if (cancelled) return;
    state = 'analyzing'; sheet.dataset.state = 'analyzing'; setStatus(T('hear.analyzing'), '');
    stepsInit();
    let dec;
    try { dec = await decode(new Blob(chunks, { type: chunks[0] && chunks[0].type })); } catch (e) { finish({ error: true }); return; }
    if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    const x8 = await resample(dec.buf, FP.SR);
    let p = 0; for (let i = 0; i < x8.length; i++) p += x8[i] * x8[i];
    const quiet = Math.sqrt(p / Math.max(1, x8.length)) < 0.003;
    lastFeat = FP.features(x8);
    // 1) catalog
    step('catalog', 'run');
    let match = null;
    try {
      const [idx, meta] = await Promise.all([loadIndex(), loadMeta()]);
      const r = FP.lookup(idx, FP.queryHashes(x8));
      const d = FP.decide(r);
      if (d && meta.ids[d.track]) match = { id: meta.ids[d.track], score: d.score, count: d.count };
    } catch (e) { console.warn(e); }
    window.__hearDebug = { match };
    if (match) {
      step('catalog', 'ok', T('step.found')); ['acoustid', 'words', 'lyrics'].forEach((s) => step(s, 'skip', T('step.skip')));
      lastMatchId = match.id; finish({ match }); return;
    }
    step('catalog', 'no', T('step.none'));
    if (quiet) { ['acoustid', 'words', 'lyrics'].forEach((s) => step(s, 'skip', T('step.skip'))); finish({ quiet: true }); return; }
    // 2) + 3) in parallel
    const pA = acoustid(dec.ab, dec.buf.duration);
    const pW = words(dec.buf);
    const [ac, wr] = await Promise.all([pA, pW]);
    finish({ acoustid: ac, words: wr });
  }

  async function acoustid(ab, dur) {
    if (!CFG.acoustidClient) { step('acoustid', 'skip', T('step.nokey')); return null; }
    step('acoustid', 'run');
    try {
      const mod = await import(new URL('../vendor/chromaprint/index.js', BASE).href);
      let fp = null; for await (const f of mod.processAudioFile(ab)) { fp = f; break; }
      if (!fp) throw new Error('nofp');
      const body = new URLSearchParams({ client: CFG.acoustidClient, format: 'json', meta: 'recordings releasegroups compress', duration: String(Math.round(dur)), fingerprint: fp });
      const r = await fetch('https://api.acoustid.org/v2/lookup', { method: 'POST', body });
      const j = await r.json();
      const best = (j.results || []).filter((x) => x.recordings && x.recordings.length).sort((a, b) => b.score - a.score)[0];
      if (!best) { step('acoustid', 'no', T('step.none')); return null; }
      const rc = best.recordings[0];
      step('acoustid', 'ok', T('step.found'));
      return { title: rc.title, artist: (rc.artists || []).map((a) => a.name).join(', '), score: best.score, mbid: rc.id };
    } catch (e) { step('acoustid', 'err', T('step.err')); return null; }
  }

  async function asr() {
    if (asrP) return asrP;
    asrP = (async () => {
      const tf = await import(CFG.transformersUrl);
      tf.env.allowLocalModels = false;
      const prog = {};
      return tf.pipeline('automatic-speech-recognition', CFG.whisperModel, {
        dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' }, device: 'wasm',
        progress_callback: (e) => {
          if (e.status === 'progress' && e.total) { prog[e.file] = [e.loaded, e.total]; const v = Object.values(prog); const pct = Math.round(100 * v.reduce((a, b) => a + b[0], 0) / v.reduce((a, b) => a + b[1], 0)); step('words', 'run', T('step.model', { p: pct })); }
        },
      });
    })();
    asrP.catch(() => { asrP = null; });
    return asrP;
  }
  const HALLU = /(продолжение следует|субтитр|thank(s)? (you )?for watching|подписывайтесь|dimatorzok|amara\.org|редактор субтитров|♪|\[music\]|\(music\)|музыка\b)/i;
  const wordCount = (t) => (t.match(/[\p{L}']+/gu) || []).length;
  async function transcribe(pipe, x16, language) {
    const out = await pipe(x16, { chunk_length_s: 30, task: 'transcribe', language, return_timestamps: false });
    const text = String((out && out.text) || '').replace(/\s+/g, ' ').trim();
    return (!text || wordCount(text) < 3 || HALLU.test(text)) ? '' : text;
  }
  async function words(buf) {
    step('words', 'run');
    try {
      const pipe = await asr();
      step('words', 'run');
      const x16 = await resample(buf, 16000);
      // Whisper (tiny) does not detect the language reliably in transformers.js: try the UI language first, then the other one.
      const langs = window.TC.lang === 'en' ? ['english', 'russian'] : ['russian', 'english'];
      let firstText = '';
      for (const lang of langs) {
        const text = await transcribe(pipe, x16, lang);
        if (!text) continue;
        if (!firstText) firstText = text;
        step('words', 'ok', `«${text.slice(0, 40)}${text.length > 40 ? '…' : ''}»`);
        step('lyrics', 'run');
        const song = await lyricsSearch(text);
        if (song) { step('lyrics', 'ok', T('step.found')); return { text, song }; }
      }
      if (!firstText) { step('words', 'no', T('step.none')); step('lyrics', 'skip', T('step.skip')); return null; }
      step('lyrics', 'no', T('step.none'));
      return { text: firstText, song: null };
    } catch (e) {
      console.warn('words', e); step('words', 'err', T('step.err')); step('lyrics', 'skip', T('step.skip')); return null;
    }
  }

  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/\s+/g, ' ').trim();
  const getJSON = (u, ms = 9000) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return fetch(u, { signal: c.signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null).finally(() => clearTimeout(t)); };
  // How well real lyrics cover what we heard: share of heard words + share of heard word pairs found in the lyrics.
  function lyricScore(heard, lyrics) {
    const L = norm(lyrics).split(' '); if (L.length < 5) return 0;
    const Ls = new Set(L), Lb = new Set(L.slice(1).map((w, i) => L[i] + ' ' + w));
    const W = norm(heard).split(' ').filter(Boolean); if (!W.length) return 0;
    const uni = W.filter((w) => Ls.has(w)).length / W.length;
    const bi = W.length > 1 ? W.slice(1).filter((w, i) => Lb.has(W[i] + ' ' + w)).length / (W.length - 1) : uni;
    return 0.4 * uni + 0.6 * bi;
  }
  // Short phrases likely to be (part of) the title: choruses repeat, titles often open a line.
  function phrases(text) {
    const W = norm(text).split(' ').filter(Boolean); const out = [];
    const add = (p) => { p = p.trim(); if (p && p.split(' ').length >= 2 && !out.includes(p)) out.push(p); };
    const cnt = new Map();
    for (let n = 4; n >= 2; n--) for (let i = 0; i + n <= W.length; i++) { const g = W.slice(i, i + n).join(' '); cnt.set(g, (cnt.get(g) || 0) + 1); }
    [...cnt].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 2).forEach(([g]) => add(g));
    add(W.slice(0, 2).join(' ')); add(W.slice(0, 4).join(' ')); add(W.slice(0, 3).join(' '));
    text.split(/[,.!?;:\n]+/).map((s) => norm(s).split(' ').slice(0, 5).join(' ')).forEach(add);
    return out.slice(0, 7);
  }
  async function askLLM(text) { // optional: only with a free Pollinations publishable key (pk_…) in config.js
    if (!CFG.pollinationsKey) return [];
    const prompt = 'Identify the song from this lyric fragment transcribed by speech recognition (may be misheard). Answer ONLY JSON {"candidates":[{"title":"","artist":""}]}, up to 3, most likely first, original-language titles; if unknown {"candidates":[]}. Fragment: ' + text.slice(0, 300);
    try {
      const r = await fetch('https://gen.pollinations.ai/text/' + encodeURIComponent(prompt) + '?json=true&key=' + encodeURIComponent(CFG.pollinationsKey));
      const m = (await r.text()).match(/\{[\s\S]*\}/); return m ? (JSON.parse(m[0]).candidates || []).filter((c) => c.title) : [];
    } catch { return []; }
  }
  async function lyricsSearch(text) {
    const cands = new Map(); // key -> {title, artist, lyrics}
    const addRows = (rows) => (rows || []).forEach((x) => { if (!x || !x.plainLyrics) return; const k = norm(x.artistName + '|' + x.trackName); if (!cands.has(k)) cands.set(k, { title: x.trackName, artist: x.artistName, lyrics: x.plainLyrics }); });
    const ps = phrases(text);
    // 1) lrclib (free, open lyrics DB): phrases as title search + whole fragment
    const lr = await Promise.all([...ps.map((p) => getJSON(`https://lrclib.net/api/search?q=${encodeURIComponent(p)}`)), getJSON(`https://lrclib.net/api/search?q=${encodeURIComponent(norm(text).split(' ').slice(0, 8).join(' '))}`)]);
    lr.forEach((rows) => addRows((rows || []).slice(0, 8)));
    // 2) iTunes Search + MusicBrainz for titles, 3) optional LLM guess; their lyrics are then fetched from lrclib to verify
    const extra = [];
    const [it, mb, llm] = await Promise.all([
      getJSON(`https://itunes.apple.com/search?entity=song&limit=5&term=${encodeURIComponent(ps[0] || text.slice(0, 60))}`),
      getJSON(`https://musicbrainz.org/ws/2/recording?fmt=json&limit=5&query=${encodeURIComponent('recording:"' + (ps[0] || '') + '"')}`),
      askLLM(text),
    ]);
    (llm || []).forEach((c) => extra.push([c.title, c.artist]));
    ((it && it.results) || []).slice(0, 3).forEach((s) => extra.push([s.trackName, s.artistName]));
    ((mb && mb.recordings) || []).slice(0, 3).forEach((r) => extra.push([r.title, ((r['artist-credit'] || [])[0] || {}).name || '']));
    const ex = await Promise.all(extra.filter(([t, a]) => t && !cands.has(norm(a + '|' + t))).slice(0, 6).map(([t, a]) => getJSON(`https://lrclib.net/api/search?track_name=${encodeURIComponent(t)}&artist_name=${encodeURIComponent(a)}`)));
    ex.forEach((rows) => addRows((rows || []).slice(0, 2)));
    const scored = [...cands.values()].map((c, i) => ({ ...c, i, verified: lyricScore(text, c.lyrics) })).sort((a, b) => b.verified - a.verified || a.i - b.i);
    let best = scored[0]; (window.__hearDebug ||= {}).lyr = scored.slice(0, 6).map((c) => `${c.artist} - ${c.title} ${c.verified.toFixed(2)}`);
    if (!best || best.verified < 0.3) return null;
    // covers share the lyrics: among near-equal candidates with the same title, prefer the one iTunes ranks first (usually the original)
    const near = scored.filter((c) => c.verified >= best.verified - 0.08 && norm(c.title) === norm(best.title));
    const cc = /[а-яё]/i.test(best.title + best.artist) ? '&country=ru' : '';
    const j = await getJSON(`https://itunes.apple.com/search?entity=song&limit=10${cc}&term=${encodeURIComponent(best.title)}`);
    const res = ((j && j.results) || []).filter((x) => norm(x.trackName).startsWith(norm(best.title)));
    const sameArtist = (a, b) => { a = norm(a).replace(/^(группа|the) /, ''); b = norm(b).replace(/^(группа|the) /, ''); return a && b && (a.includes(b) || b.includes(a)); };
    let s = null;
    for (const x of res) { const c = near.find((n) => sameArtist(n.artist, x.artistName)); if (c) { best = c; s = x; break; } }
    if (!s) { const k = await getJSON(`https://itunes.apple.com/search?entity=song&limit=1${cc}&term=${encodeURIComponent(best.artist + ' ' + best.title)}`); s = k && k.results && k.results[0]; }
    return { title: best.title, artist: best.artist, verified: best.verified, art: s && s.artworkUrl100 ? s.artworkUrl100.replace('100x100', '300x300') : '', apple: s && s.trackViewUrl };
  }

  // ---------- similar in catalog
  async function similar(n = 8) {
    const meta = await loadMeta(); const tracks = window.TCApp.tracks();
    const K = ['bpm', 'pulse', 'centroid', 'low', 'dyn', 'flux'], W = [1.2, 0.8, 1.0, 0.7, 0.4, 0.8];
    let q = null;
    if (lastMatchId) { const i = meta.ids.indexOf(lastMatchId); if (i >= 0 && meta.features[i]) q = meta.features[i]; }
    if (!q && lastFeat) q = K.map((k) => lastFeat[k]);
    if (!q) return [];
    const z = (v, k) => { const [m, s] = meta.stats[k]; return ((k === 'bpm' ? Math.log2(v || 90) : v) - m) / s; };
    const qz = q.map((v, i) => z(v, K[i]));
    const res = [];
    meta.features.forEach((f, i) => {
      if (!f || meta.ids[i] === lastMatchId) return;
      let d = 0;
      f.forEach((v, j) => {
        let diff;
        if (K[j] === 'bpm') { const r = Math.log2((v || 90) / (q[0] || 90)); diff = Math.min(Math.abs(r), Math.abs(r - 1), Math.abs(r + 1)) / meta.stats.bpm[1]; }
        else diff = z(v, K[j]) - qz[j];
        d += W[j] * diff * diff;
      });
      res.push([d, meta.ids[i]]);
    });
    res.sort((a, b) => a[0] - b[0]);
    const byId = new Map(tracks.map((t) => [t.id, t]));
    return res.slice(0, n).map(([, id]) => byId.get(id)).filter(Boolean);
  }

  // ---------- results
  const linkSet = (title, artist) => {
    const q = encodeURIComponent(`${artist} ${title}`.trim());
    return [
      ['YouTube', `https://www.youtube.com/results?search_query=${q}`],
      [window.TC.lang === 'en' ? 'Yandex Music' : 'Яндекс Музыка', `https://music.yandex.ru/search?text=${q}`],
      ['Spotify', `https://open.spotify.com/search/${q}`],
    ];
  };
  function trackRow(t, big) {
    return `<button class="hr-track${big ? ' big' : ''}" data-play="${esc(t.id)}"><img src="${esc(t.cover)}" alt="" width="56" height="56"><span class="hr-t"><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></span><span class="hr-play"><svg><use href="#i-play"/></svg></span></button>`;
  }
  function finish(r) {
    lastRender = r;
    state = 'done'; sheet.dataset.state = 'done';
    setStatus('', ''); orb.setAttribute('aria-label', T('hear.again'));
    render();
  }
  function render() {
    const r = lastRender; if (!r) return;
    let h = '';
    const tracks = window.TCApp ? window.TCApp.tracks() : [];
    if (r.match) {
      const t = tracks.find((x) => x.id === r.match.id);
      if (t) h += `<section class="hr-card ok"><p class="hr-kicker">${esc(T('res.catalog'))} · ${esc(T('res.match', { p: Math.round(r.match.score * 100) }))}</p>${trackRow(t, true)}</section>`;
    }
    if (r.acoustid) {
      h += `<section class="hr-card"><p class="hr-kicker">${esc(T('res.acoustid'))} · ${Math.round(r.acoustid.score * 100)}%</p><h3>${esc(r.acoustid.title)}</h3><p class="hr-artist">${esc(r.acoustid.artist)}</p>
        <p class="hr-links"><span>${esc(T('res.listen'))}:</span>${linkSet(r.acoustid.title, r.acoustid.artist).map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}<a href="https://musicbrainz.org/recording/${esc(r.acoustid.mbid)}" target="_blank" rel="noopener">MusicBrainz</a></p></section>`;
    }
    if (r.words) {
      const s = r.words.song;
      h += `<section class="hr-card"><p class="hr-heard">${esc(T('res.heard', { t: r.words.text }))}</p>`;
      if (s) {
        const sure = s.verified >= 0.5;
        h += `<div class="hr-song">${s.art ? `<img src="${esc(s.art)}" alt="" width="72" height="72">` : '<span class="hr-noart"><svg><use href="#i-mic"/></svg></span>'}
          <div><p class="hr-kicker">${esc(T('res.song'))} · <span class="badge ${sure ? 'ok' : 'maybe'}">${esc(T(sure ? 'res.verified' : 'res.maybe'))}</span></p><h3>${esc(s.title)}</h3><p class="hr-artist">${esc(s.artist)}</p></div></div>
          <p class="hr-links"><span>${esc(T('res.listen'))}:</span>${linkSet(s.title, s.artist).map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}${s.apple ? `<a href="${esc(s.apple)}" target="_blank" rel="noopener">Apple Music</a>` : ''}</p>`;
      } else h += `<p class="hr-none">${esc(T('res.noneWords'))}</p>`;
      h += '</section>';
    }
    if (!r.match && !r.acoustid && !r.words) {
      h += `<section class="hr-card none"><p>${esc(r.quiet ? T('hear.quiet') : r.error ? T('step.err') : T('res.none'))}</p><p class="hr-sub">${esc(T('res.tip'))}</p></section>`;
    }
    h += `<div class="hr-actions"><button class="text-btn" id="hrSimilar"><svg><use href="#i-shuffle"/></svg>${esc(T('res.similar'))}</button><button class="text-btn ghost" id="hrAgain"><svg><use href="#i-mic"/></svg>${esc(T('hear.again'))}</button></div><div id="hrSimilarList"></div>`;
    resEl.innerHTML = h;
  }
  async function showSimilar() {
    const box = $('#hrSimilarList'); if (!box) return;
    const list = await similar(8);
    const feat = lastFeat ? `<span class="hr-bpm">${esc(T('res.bpm', { b: Math.round(lastFeat.bpm) }))}</span>` : '';
    box.innerHTML = `<section class="hr-card"><p class="hr-kicker">${esc(T('res.similarTitle'))} ${feat}</p>${list.map((t) => trackRow(t)).join('')}</section>`;
    box.dataset.ids = list.map((t) => t.id).join(',');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---------- wiring
  function bind() {
    $('#hearOpen').addEventListener('click', open);
    sheet.addEventListener('click', (e) => {
      if (e.target.closest('[data-hear-close]')) { close(); return; }
      const p = e.target.closest('[data-play]');
      if (p) {
        const box = $('#hrSimilarList'); const ids = box && box.dataset.ids ? box.dataset.ids.split(',') : [];
        const list = ids.includes(p.dataset.play) ? ids : [p.dataset.play, ...ids];
        window.TCApp.playList(list, p.dataset.play); close(); return;
      }
      if (e.target.closest('#hrSimilar')) { showSimilar(); return; }
      if (e.target.closest('#hrAgain')) { start(); return; }
    });
    orb.addEventListener('click', () => { if (state === 'listening') stopRecording(false); else if (state !== 'analyzing') start(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) close(); });
    window.TC.onChange(() => { if (state === 'idle') idleUI(); else if (state === 'done') render(); if (!stepsEl.hidden) stepsEl.querySelectorAll('li').forEach((li) => { li.querySelector('.lbl').textContent = T('step.' + li.dataset.step); }); });
  }
  bind(); idleUI();
})();

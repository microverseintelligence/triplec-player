// Triple C "Hear" — open landmark audio fingerprint (peak-pair hashing, Wang 2003 / audfprint style)
// and simple audio features. Same code runs in the browser and in Node (index builder).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TCFP = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SR = 8000, N = 512, HOP = 256, NB = 256; // 32 ms hop, 15.6 Hz bins
  const FMIN = 6;               // ignore < ~94 Hz
  const DT = 63, DF = 31;       // target zone
  const IDX = { T: 10, F: 12, K: 1 };   // sparse peaks in the index
  const QRY = { T: 9, F: 12, K: 99 };   // denser peaks in queries (superset of index peaks)
  const CFG = { thr: 1.0, qthr: 1.0 };
  const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  // radix-2 FFT tables
  const rev = new Uint16Array(N); for (let i = 0, j = 0; i < N; i++) { rev[i] = j; let b = N >> 1; while (j & b) { j ^= b; b >>= 1; } j |= b; }
  const cosT = new Float32Array(N / 2), sinT = new Float32Array(N / 2);
  for (let i = 0; i < N / 2; i++) { cosT[i] = Math.cos(2 * Math.PI * i / N); sinT[i] = -Math.sin(2 * Math.PI * i / N); }
  function fftMag(frame, re, im, out) {
    for (let i = 0; i < N; i++) { re[rev[i]] = frame[i]; im[i] = 0; }
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1, step = N / size;
      for (let s = 0; s < N; s += size) for (let k = 0; k < half; k++) {
        const a = s + k, b = a + half, c = cosT[k * step], d = sinT[k * step];
        const tr = re[b] * c - im[b] * d, ti = re[b] * d + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
    for (let k = 0; k < NB; k++) out[k] = Math.hypot(re[k], im[k]);
  }
  // log-magnitude spectrogram, Float32Array frames*NB
  function spectrogram(x) {
    const frames = Math.max(0, Math.floor((x.length - N) / HOP) + 1);
    const S = new Float32Array(frames * NB), fr = new Float32Array(N), re = new Float32Array(N), im = new Float32Array(N), mag = new Float32Array(NB);
    for (let t = 0; t < frames; t++) {
      const o = t * HOP;
      for (let i = 0; i < N; i++) fr[i] = x[o + i] * win[i];
      fftMag(fr, re, im, mag);
      for (let k = 0; k < NB; k++) S[t * NB + k] = Math.log(mag[k] + 1e-4);
    }
    return { S, frames };
  }
  function maxFilter(S, frames, T, F) {
    const A = new Float32Array(S.length), B = new Float32Array(S.length);
    for (let t = 0; t < frames; t++) for (let k = 0; k < NB; k++) {
      let m = -Infinity; const lo = Math.max(0, k - F), hi = Math.min(NB - 1, k + F);
      for (let j = lo; j <= hi; j++) { const v = S[t * NB + j]; if (v > m) m = v; }
      A[t * NB + k] = m;
    }
    for (let k = 0; k < NB; k++) for (let t = 0; t < frames; t++) {
      let m = -Infinity; const lo = Math.max(0, t - T), hi = Math.min(frames - 1, t + T);
      for (let j = lo; j <= hi; j++) { const v = A[j * NB + k]; if (v > m) m = v; }
      B[t * NB + k] = m;
    }
    return B;
  }
  function peaks(spec, P, thr) {
    const { S, frames } = spec; const M = maxFilter(S, frames, P.T, P.F);
    let sum = 0; for (let i = 0; i < S.length; i++) sum += S[i]; const mean = sum / Math.max(1, S.length);
    const out = [];
    for (let t = 0; t < frames; t++) for (let k = FMIN; k < NB; k++) {
      const v = S[t * NB + k]; if (v === M[t * NB + k] && v > mean + thr) out.push([t, k]);
    }
    return out; // sorted by t
  }
  // hashes: Array of [hash20, t]
  function hashes(pk, K) {
    const out = [];
    for (let i = 0; i < pk.length; i++) {
      const [t1, f1] = pk[i]; let n = 0;
      for (let j = i + 1; j < pk.length && n < K; j++) {
        const dt = pk[j][0] - t1; if (dt < 1) continue; if (dt > DT) break;
        const df = pk[j][1] - f1; if (df < -DF || df > DF) continue;
        out.push([(f1 << 12) | ((df + 32) << 6) | dt, t1]); n++;
      }
    }
    return out;
  }
  function indexHashes(x) { return hashes(peaks(spectrogram(x), IDX, CFG.thr), IDX.K); }
  function queryHashes(x) { return hashes(peaks(spectrogram(x), QRY, CFG.qthr), QRY.K); }
  // compact index (v2): header 'TCF2' + n, Uint8 counts[2^20] (entries per hash), then n * 3-byte entries
  // entry = track(10 bits) << 14 | time(14 bits, frames of 32 ms), little endian, sorted by hash.
  function loadIndex(buf) {
    const dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x32464354) throw new Error('bad index');
    const n = dv.getUint32(4, true), H = 1 << 20;
    const counts = new Uint8Array(buf, 8, H), off = new Uint32Array(H + 1);
    for (let i = 0; i < H; i++) off[i + 1] = off[i] + counts[i];
    return { n, off, ent: new Uint8Array(buf, 8 + H, n * 3) };
  }
  function lookup(index, qh) {
    const { off, ent } = index; const votes = new Map();
    for (const [h, tq] of qh) {
      for (let i = off[h], e = off[h + 1]; i < e; i++) {
        const v = ent[i * 3] | (ent[i * 3 + 1] << 8) | (ent[i * 3 + 2] << 16);
        const tr = v >>> 14, off2 = (v & 16383) - tq;
        const key = tr * 100000 + (off2 + 50000);
        votes.set(key, (votes.get(key) || 0) + 1);
      }
    }
    const per = new Map();
    for (const [key, c] of votes) {
      const tr = Math.floor(key / 100000), o = key % 100000;
      const c2 = c + (votes.get(tr * 100000 + o - 1) || 0) + (votes.get(tr * 100000 + o + 1) || 0);
      const b = per.get(tr); if (!b || c2 > b.count) per.set(tr, { track: tr, count: c2, offset: o - 50000 });
    }
    return [...per.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }
  // decision rule tuned on 120 noisy 10 s clips per SNR: no false positives at min 4, ratio 2.2
  function decide(r) {
    const a = r[0], b = r[1]; if (!a) return null;
    const sec = (b && b.count) || 1;
    if (a.count >= 4 && a.count >= 2.2 * sec) return { track: a.track, count: a.count, score: Math.min(1, a.count / (a.count + 3 * sec)), offset: a.offset };
    return null;
  }
  // ---- simple features for "similar in catalog": tempo, pulse strength, brightness, low-end, dynamics, flux
  function features(x) {
    const spec = spectrogram(x); const { S, frames } = spec; if (frames < 40) return null;
    const flux = new Float32Array(frames); let cen = 0, low = 0, tot = 0, rmsArr = [];
    for (let t = 0; t < frames; t++) {
      let e = 0, c = 0, l = 0, f = 0;
      for (let k = 2; k < NB; k++) {
        const m = Math.exp(S[t * NB + k]); e += m; c += m * k; if (k < 16) l += m;
        if (t) { const d = S[t * NB + k] - S[(t - 1) * NB + k]; if (d > 0) f += d; }
      }
      flux[t] = f; cen += c; low += l; tot += e; rmsArr.push(Math.log(e + 1e-6));
    }
    // onset autocorrelation for tempo 60..180 BPM (lag in frames of 32 ms)
    let mu = 0; for (const v of flux) mu += v; mu /= frames;
    const o = Array.from(flux, (v) => Math.max(0, v - mu));
    let best = 0, bestLag = 0, ac0 = 0; for (const v of o) ac0 += v * v;
    const acs = [];
    for (let lag = 10; lag <= 31; lag++) { let s = 0; for (let t = lag; t < frames; t++) s += o[t] * o[t - lag]; acs.push(s); if (s > best) { best = s; bestLag = lag; } }
    const bpm = bestLag ? 60 / (bestLag * HOP / SR) : 0;
    const pulse = ac0 ? best / ac0 : 0;
    const rm = rmsArr.reduce((a, b) => a + b, 0) / frames;
    const dyn = Math.sqrt(rmsArr.reduce((a, b) => a + (b - rm) * (b - rm), 0) / frames);
    const fluxN = mu / (rm > -20 ? Math.exp(rm / 4) : 1);
    return { bpm: +bpm.toFixed(1), pulse: +pulse.toFixed(4), centroid: +((cen / tot) * SR / N).toFixed(1), low: +(low / tot).toFixed(4), dyn: +dyn.toFixed(3), flux: +fluxN.toFixed(4) };
  }
  return { SR, HOP, spectrogram, peaks, indexHashes, queryHashes, lookup, loadIndex, decide, features, IDX, QRY, CFG };
});

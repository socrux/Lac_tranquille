// Lac Tranquille — musique et effets sonores, entièrement synthétisés (Web Audio API)
'use strict';

const Sound = (() => {
  const KEY = 'lacTranquille.settings';
  const settings = { music: 0.5, sfx: 0.8, muted: false };
  // réglages relus depuis localStorage : donnée non fiable, chaque champ est validé (volume fini entre 0 et 1)
  const vol = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : d);
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      settings.music = vol(raw.music, settings.music);
      settings.sfx = vol(raw.sfx, settings.sfx);
      settings.muted = raw.muted === true;
    }
  } catch { /* stockage indisponible */ }

  // Tempo de la musique, déclaré avant init() qui l'utilise (évite toute zone morte temporelle)
  const BPM = 84;
  const E8 = 60 / BPM / 2;          // durée d'une croche

  let ac = null;
  let master, musicBus, sfxBus, musicDelay, sfxDelay, noiseBuf;
  const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

  // ---------------------------------------------------------------------------
  // Mise en place
  // ---------------------------------------------------------------------------
  function makeDelay(dest, time, feedback, wet) {
    const d = ac.createDelay(2);
    d.delayTime.value = time;
    const fb = ac.createGain();
    fb.gain.value = feedback;
    const w = ac.createGain();
    w.gain.value = wet;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    d.connect(lp);
    lp.connect(fb);
    fb.connect(d);
    lp.connect(w);
    w.connect(dest);
    return d;
  }

  function init() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();

    const comp = ac.createDynamicsCompressor();
    master = ac.createGain();
    comp.connect(master);
    master.connect(ac.destination);

    musicBus = ac.createGain();
    musicBus.gain.value = 0;
    const warm = ac.createBiquadFilter();       // adoucit les ondes carrées
    warm.type = 'lowpass';
    warm.frequency.value = 2600;
    musicBus.connect(warm);
    warm.connect(comp);

    sfxBus = ac.createGain();
    sfxBus.connect(comp);

    musicDelay = makeDelay(musicBus, E8 * 3, 0.35, 0.4);
    sfxDelay = makeDelay(sfxBus, 0.16, 0.3, 0.35);

    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    applyVolumes(true);
    startMusic();
  }

  function applyVolumes(fadeIn = false) {
    if (!ac) return;
    const t = ac.currentTime;
    master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, 0.05);
    musicBus.gain.setTargetAtTime(settings.music * 0.6, t, fadeIn ? 1.5 : 0.05);
    sfxBus.gain.setTargetAtTime(settings.sfx, t, 0.05);
  }

  // seules les trois clés connues sont modifiables, avec la même validation qu'à la lecture
  function set(key, value) {
    if (key === 'muted') settings.muted = value === true;
    else if (key === 'music' || key === 'sfx') settings[key] = vol(value, settings[key]);
    else return;
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* idem */ }
    applyVolumes();
  }

  // ---------------------------------------------------------------------------
  // Briques de base
  // ---------------------------------------------------------------------------
  function tone({ t, f, dur, type = 'square', vol = 0.1, attack = 0.005, slide = null, dest = sfxBus, send = 0, sendTo = sfxDelay }) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    if (send) {
      const s = ac.createGain();
      s.gain.value = send;
      g.connect(s);
      s.connect(sendTo);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise({ t, dur, vol = 0.2, type = 'bandpass', freq = 1000, freqTo = null, q = 1, dest = sfxBus, attack = 0.005 }) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const flt = ac.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(freq, t);
    if (freqTo) flt.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    flt.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(dest);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  const now = () => ac.currentTime + 0.01;
  const ready = () => ac && ac.state === 'running';

  // ---------------------------------------------------------------------------
  // Musique : petite boucle chiptune calme, 16 mesures en fa majeur, 84 bpm
  // ---------------------------------------------------------------------------
  const CHORDS = [
    { bass: 41, notes: [53, 57, 60, 64] },  // Fmaj7
    { bass: 40, notes: [52, 55, 59, 62] },  // Em7
    { bass: 38, notes: [50, 53, 57, 60] },  // Dm7
    { bass: 36, notes: [48, 52, 55, 59] },  // Cmaj7
    { bass: 34, notes: [46, 50, 53, 57] },  // Bbmaj7
    { bass: 33, notes: [45, 48, 52, 55] },  // Am7
    { bass: 31, notes: [43, 46, 50, 53] },  // Gm7
    { bass: 36, notes: [48, 53, 55, 58] },  // C7sus4
  ];

  // [croche de départ, note MIDI, durée en croches]
  const MELODY = [
    [[0, 72, 2], [2, 69, 1], [3, 72, 1], [4, 76, 3]],
    [[0, 74, 2], [2, 72, 2], [4, 71, 2], [6, 67, 2]],
    [[0, 69, 3], [3, 72, 1], [4, 74, 2], [6, 77, 2]],
    [[0, 76, 4], [4, 74, 2], [6, 72, 2]],
    [[0, 74, 2], [2, 72, 1], [3, 70, 1], [4, 69, 4]],
    [[0, 72, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2]],
    [[0, 70, 3], [3, 69, 1], [4, 67, 2], [6, 65, 2]],
    [[0, 67, 6]],
    [[0, 81, 2], [2, 79, 2], [4, 77, 4]],
    [[0, 76, 2], [2, 74, 2], [4, 79, 4]],
    [[0, 77, 2], [2, 74, 2], [4, 72, 2], [6, 69, 2]],
    [[0, 71, 2], [2, 72, 6]],
    [[0, 74, 3], [3, 77, 1], [4, 81, 4]],
    [[0, 79, 2], [2, 76, 2], [4, 72, 4]],
    [[0, 74, 2], [2, 70, 2], [4, 67, 2], [6, 70, 2]],
    [[0, 72, 4]],
  ];
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
  const LOOP = MELODY.length * 8;

  let step = 0;
  let nextTime = 0;

  function playStep(s, t) {
    const bar = Math.floor(s / 8);
    const e = s % 8;
    const ch = CHORDS[bar % CHORDS.length];
    const m = { dest: musicBus, sendTo: musicDelay };

    // nappe douce en début de mesure
    if (e === 0) {
      for (const n of ch.notes) tone({ ...m, t, f: mtof(n), dur: E8 * 8, type: 'sine', vol: 0.018, attack: 0.5 });
    }
    // arpège
    tone({ ...m, t, f: mtof(ch.notes[ARP[e]] + 12), dur: E8 * 1.7, type: 'triangle', vol: 0.05, send: 0.25 });
    // basse
    if (e === 0) tone({ ...m, t, f: mtof(ch.bass + 12), dur: E8 * 3.5, type: 'triangle', vol: 0.16, attack: 0.01 });
    if (e === 4) tone({ ...m, t, f: mtof(ch.bass + 12), dur: E8 * 1.8, type: 'triangle', vol: 0.12, attack: 0.01 });
    if (e === 6) tone({ ...m, t, f: mtof(ch.bass + 19), dur: E8 * 1.8, type: 'triangle', vol: 0.1, attack: 0.01 });
    // mélodie
    for (const [off, n, len] of MELODY[bar]) {
      if (off === e) tone({ ...m, t, f: mtof(n), dur: len * E8 * 0.95, type: 'square', vol: 0.028, attack: 0.015, send: 0.45 });
    }
    // petit shaker sur les contretemps
    if (e % 2 === 1) noise({ t, dur: 0.05, vol: 0.012, type: 'highpass', freq: 7000, dest: musicBus });
  }

  // ---------------------------------------------------------------------------
  // Musique épique (combat contre le Grand Ancien) : ré mineur, 132 bpm, en doubles croches.
  // intensity (1 → 3) ajoute des couches à chaque phase du combat.
  // ---------------------------------------------------------------------------
  const EPIC_BPM = 132;
  const S16 = 60 / EPIC_BPM / 4;
  const EPIC_CHORDS = [
    { root: 38, tri: [62, 65, 69] },   // Dm
    { root: 34, tri: [58, 62, 65] },   // Bb
    { root: 36, tri: [60, 64, 67] },   // C
    { root: 33, tri: [61, 64, 69] },   // A
    { root: 38, tri: [62, 65, 69] },   // Dm
    { root: 41, tri: [60, 65, 69] },   // F
    { root: 34, tri: [58, 62, 65] },   // Bb
    { root: 33, tri: [61, 64, 67] },   // A7
  ];
  // thème des cuivres : [double croche, note, durée en doubles croches]
  const EPIC_THEME = [
    [[0, 62, 6], [6, 65, 2], [8, 69, 8]],
    [[0, 70, 6], [6, 69, 2], [8, 65, 8]],
    [[0, 67, 4], [4, 69, 4], [8, 72, 6], [14, 70, 2]],
    [[0, 69, 12], [12, 73, 4]],
    [[0, 74, 6], [6, 72, 2], [8, 69, 8]],
    [[0, 72, 6], [6, 69, 2], [8, 65, 8]],
    [[0, 70, 4], [4, 69, 4], [8, 67, 4], [12, 65, 4]],
    [[0, 64, 8], [8, 61, 8]],
  ];
  const TAIKO = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0];
  const EPIC_LOOP = EPIC_CHORDS.length * 16;
  let mode = 'calm';
  let intensity = 1;

  function kick(t, vol, f0 = 120) {
    tone({ t, f: f0, slide: 38, dur: 0.35, type: 'sine', vol, attack: 0.002, dest: musicBus });
    noise({ t, dur: 0.06, vol: vol * 0.4, type: 'lowpass', freq: 900, dest: musicBus });
  }

  function playEpic(s, t) {
    const bar = Math.floor(s / 16);
    const e = s % 16;
    const ch = EPIC_CHORDS[bar % EPIC_CHORDS.length];
    const m = { dest: musicBus, sendTo: musicDelay };
    // gong au début de la boucle
    if (s === 0) {
      for (const [r, g] of [[1, 0.12], [2.3, 0.05], [3.1, 0.04]]) tone({ ...m, t, f: 55 * r, dur: 4, type: 'sine', vol: g, attack: 0.01, send: 0.6 });
      noise({ t, dur: 2.5, vol: 0.08, type: 'bandpass', freq: 400, q: 0.7, dest: musicBus, attack: 0.01 });
    }
    // chœur : accord tenu, voix douces
    if (e === 0) {
      for (const n of ch.tri) {
        tone({ ...m, t, f: mtof(n), dur: S16 * 16, type: 'sine', vol: 0.03, attack: 0.25, send: 0.5 });
        tone({ ...m, t, f: mtof(n) * 1.004, dur: S16 * 16, type: 'triangle', vol: 0.012, attack: 0.3 });
      }
      // basse : cuivre grave
      tone({ ...m, t, f: mtof(ch.root), dur: S16 * 15, type: 'sawtooth', vol: 0.05, attack: 0.04 });
    }
    // ostinato des cordes (doubles croches)
    const ost = [0, 0, 12, 0, 7, 0, 12, 7];
    tone({ ...m, t, f: mtof(ch.root + 24 + ost[e % 8]), dur: S16 * 0.9, type: 'sawtooth', vol: 0.016 + intensity * 0.004, attack: 0.004 });
    // tambours taiko
    if (TAIKO[e]) kick(t, e === 0 ? 0.5 : 0.32);
    if (intensity >= 2 && (e === 4 || e === 12)) noise({ t, dur: 0.18, vol: 0.12, type: 'bandpass', freq: 1800, q: 0.9, dest: musicBus });
    if (intensity >= 3 && e % 2 === 1) noise({ t, dur: 0.04, vol: 0.03, type: 'highpass', freq: 8000, dest: musicBus });
    // thème héroïque aux cuivres (dès la phase 2), doublé à l'octave en phase 3
    if (intensity >= 2) {
      for (const [off, n, len] of EPIC_THEME[bar % EPIC_THEME.length]) {
        if (off !== e) continue;
        tone({ ...m, t, f: mtof(n), dur: len * S16 * 0.95, type: 'square', vol: 0.03, attack: 0.03, send: 0.35 });
        tone({ ...m, t, f: mtof(n - 12), dur: len * S16 * 0.95, type: 'sawtooth', vol: 0.022, attack: 0.04 });
        if (intensity >= 3) tone({ ...m, t, f: mtof(n + 12), dur: len * S16 * 0.9, type: 'triangle', vol: 0.025, attack: 0.02, send: 0.4 });
      }
    }
  }

  function schedule() {
    if (!ac) return;
    if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.05;
    while (nextTime < ac.currentTime + 0.3) {
      if (mode === 'epic') {
        playEpic(step, nextTime);
        nextTime += S16;
        step = (step + 1) % EPIC_LOOP;
      } else {
        playStep(step, nextTime);
        nextTime += E8;
        step = (step + 1) % LOOP;
      }
    }
  }

  // Change de musique ('calm' ou 'epic'), avec un petit silence de transition
  function setMusic(next, level = 1) {
    intensity = level;
    if (next === mode) return;
    mode = next;
    step = 0;
    if (ac) nextTime = ac.currentTime + 0.4;
  }

  function startMusic() {
    nextTime = ac.currentTime + 0.1;
    setInterval(schedule, 50);
  }

  // ---------------------------------------------------------------------------
  // Effets sonores
  // ---------------------------------------------------------------------------
  const sfx = {
    // lancer : sifflement de la ligne + cliquetis du moulinet
    cast() {
      if (!ready()) return;
      const t = now();
      noise({ t, dur: 0.4, vol: 0.3, type: 'bandpass', freq: 500, freqTo: 3000, q: 1.5, attack: 0.03 });
      for (let i = 0; i < 10; i++) tone({ t: t + 0.08 + i * 0.055, f: 2200 - i * 60, dur: 0.02, type: 'square', vol: 0.03 });
    },
    // le flotteur touche l'eau
    splash() {
      if (!ready()) return;
      const t = now();
      noise({ t, dur: 0.35, vol: 0.3, type: 'lowpass', freq: 1400, freqTo: 250 });
      tone({ t, f: 520, slide: 140, dur: 0.16, type: 'sine', vol: 0.22 });
    },
    // petite touche
    plop() {
      if (!ready()) return;
      tone({ t: now(), f: 700, slide: 260, dur: 0.09, type: 'sine', vol: 0.09 });
    },
    // ça mord ! Cloche claire (ou glas inquiétant pour une abomination)
    bell(abom) {
      if (!ready()) return;
      const t = now();
      if (!abom) {
        for (const [dt, v] of [[0, 1], [0.22, 0.75]]) {
          for (const [r, g] of [[1, 0.2], [2, 0.06], [2.76, 0.07], [5.4, 0.03]]) {
            tone({ t: t + dt, f: 1046 * r, dur: 1.5, type: 'sine', vol: g * v, attack: 0.002, send: 0.3 });
          }
        }
      } else {
        const base = 98;
        for (const [r, g] of [[1, 0.25], [1.06, 0.18], [2.4, 0.09], [3.9, 0.05], [0.5, 0.2]]) {
          tone({ t, f: base * r * 2, dur: 2.8, type: 'sine', vol: g, attack: 0.004, send: 0.6 });
        }
        tone({ t: t + 0.4, f: base * 2 * 1.414, dur: 2.2, type: 'sine', vol: 0.12, send: 0.6 });
        noise({ t, dur: 1.5, vol: 0.3, type: 'lowpass', freq: 160 });
        tone({ t, f: 110, slide: 40, dur: 1.8, type: 'sawtooth', vol: 0.04 });
      }
    },
    // on ferre : coup sec vers le haut
    hook() {
      if (!ready()) return;
      const t = now();
      noise({ t, dur: 0.18, vol: 0.25, type: 'bandpass', freq: 900, freqTo: 2800, q: 2 });
      tone({ t, f: 220, slide: 660, dur: 0.12, type: 'square', vol: 0.04 });
    },
    // cliquetis du moulinet (plus aigu à mesure que le poisson approche)
    reel(progress) {
      if (!ready()) return;
      tone({ t: now(), f: 1400 + progress * 900, dur: 0.025, type: 'square', vol: 0.022 });
    },
    // un coffre apparaît dans la jauge
    chestAppear() {
      if (!ready()) return;
      const t = now();
      [76, 83, 88].forEach((n, i) => tone({ t: t + i * 0.06, f: mtof(n), dur: 0.25, type: 'triangle', vol: 0.08, send: 0.4 }));
    },
    // coffre récupéré
    chestGet() {
      if (!ready()) return;
      const t = now();
      noise({ t, dur: 0.12, vol: 0.15, type: 'bandpass', freq: 600, q: 2 });
      [72, 76, 79, 84, 88].forEach((n, i) => tone({ t: t + 0.05 + i * 0.05, f: mtof(n), dur: 0.3, type: 'square', vol: 0.035, send: 0.4 }));
    },
    // succès débloqué : petite fanfare
    achievement() {
      if (!ready()) return;
      const t = now();
      [[67, 0], [72, 0.1], [76, 0.2], [79, 0.3]].forEach(([n, dt]) => tone({ t: t + dt, f: mtof(n), dur: 0.18, type: 'square', vol: 0.04, send: 0.3 }));
      for (const n of [72, 76, 79, 84]) tone({ t: t + 0.42, f: mtof(n), dur: 0.9, type: 'triangle', vol: 0.05, attack: 0.01, send: 0.4 });
    },
    // pêche parfaite
    perfect() {
      if (!ready()) return;
      const t = now() + 0.35;
      [84, 88, 91, 96, 100].forEach((n, i) => {
        tone({ t: t + i * 0.07, f: mtof(n), dur: 0.5, type: 'triangle', vol: 0.07, send: 0.5 });
        tone({ t: t + i * 0.07, f: mtof(n) * 2, dur: 0.3, type: 'sine', vol: 0.03, send: 0.5 });
      });
    },
    // poisson attrapé
    catchFish(abom) {
      if (!ready()) return;
      const t = now();
      const notes = abom ? [57, 60, 63, 66, 69] : [72, 76, 79, 84];
      notes.forEach((n, i) => tone({ t: t + i * 0.07, f: mtof(n), dur: 0.16, type: abom ? 'sawtooth' : 'square', vol: abom ? 0.03 : 0.045, send: 0.3 }));
      const end = t + notes.length * 0.07;
      tone({ t: end, f: abom ? 233 : 988, dur: 0.08, type: 'square', vol: 0.04 });
      tone({ t: end + 0.08, f: abom ? 311 : 1319, dur: 0.4, type: 'square', vol: 0.04, send: 0.3 });
    },
    // pacte avec la sorcière : accords dissonants qui descendent, grondement grave
    curse() {
      if (!ready()) return;
      const t = now();
      [[62, 63], [58, 59], [53, 54]].forEach(([a, b], i) => {
        tone({ t: t + i * 0.22, f: mtof(a), slide: mtof(a - 1), dur: 0.5, type: 'sawtooth', vol: 0.025, send: 0.5 });
        tone({ t: t + i * 0.22, f: mtof(b), slide: mtof(b - 1), dur: 0.5, type: 'triangle', vol: 0.04, send: 0.5 });
      });
      noise({ t: t + 0.1, dur: 1.4, vol: 0.18, type: 'lowpass', freq: 180, freqTo: 50, attack: 0.3 });
    },
    // le poisson s'échappe
    miss() {
      if (!ready()) return;
      const t = now();
      tone({ t, f: 440, slide: 220, dur: 0.22, type: 'square', vol: 0.04 });
      tone({ t: t + 0.2, f: 330, slide: 150, dur: 0.3, type: 'square', vol: 0.04 });
    },
    // ferré trop tôt
    early() {
      if (!ready()) return;
      tone({ t: now(), f: 300, slide: 180, dur: 0.18, type: 'triangle', vol: 0.15 });
    },
    buy() {
      if (!ready()) return;
      const t = now();
      for (const dt of [0, 0.12]) {
        tone({ t: t + dt, f: 988, dur: 0.06, type: 'square', vol: 0.04 });
        tone({ t: t + dt + 0.06, f: 1319, dur: 0.25, type: 'square', vol: 0.04 });
      }
    },
    click() {
      if (!ready()) return;
      tone({ t: now(), f: 1200, slide: 900, dur: 0.04, type: 'square', vol: 0.03 });
    },
    page() {
      if (!ready()) return;
      noise({ t: now(), dur: 0.16, vol: 0.18, type: 'bandpass', freq: 1500, freqTo: 3500, q: 0.8, attack: 0.02 });
    },
    // objet trouvé : petit carillon (plus riche pour un objet rare)
    itemFound(tier = 0) {
      if (!ready()) return;
      const t = now();
      const notes = [79, 84, 88, 91, 96].slice(0, 2 + Math.min(3, tier));
      notes.forEach((n, i) => tone({ t: t + i * 0.08, f: mtof(n), dur: 0.35, type: 'triangle', vol: 0.07, send: 0.5 }));
      tone({ t: t + notes.length * 0.08, f: mtof(notes[notes.length - 1] + 12), dur: 0.6, type: 'sine', vol: 0.04, send: 0.6 });
    },
    // vente d'un objet : tintement de pièces
    sell() {
      if (!ready()) return;
      const t = now();
      for (let i = 0; i < 3; i++) tone({ t: t + i * 0.06, f: 1800 + Math.random() * 600, dur: 0.08, type: 'square', vol: 0.03 });
    },
    // tonnerre : grondement grave (distance = délai et douceur)
    thunder(dist = 0.5) {
      if (!ready()) return;
      const t = now();
      noise({ t, dur: 0.35, vol: 0.45 * (1 - dist * 0.6), type: 'lowpass', freq: 2400 - dist * 1600, freqTo: 300, attack: 0.01 });
      noise({ t: t + 0.05, dur: 2.8, vol: 0.5, type: 'lowpass', freq: 220, freqTo: 60, attack: 0.15 });
      noise({ t: t + 0.4, dur: 1.8, vol: 0.3, type: 'lowpass', freq: 160, freqTo: 50, attack: 0.3 });
    },
    // pluie continue : niveau entre 0 (aucune) et 1 (averse)
    rain(level) {
      if (!ac) return;
      if (!rainGain) {
        const src = ac.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        const hp = ac.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 900;
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 5200;
        rainGain = ac.createGain();
        rainGain.gain.value = 0;
        src.connect(hp);
        hp.connect(lp);
        lp.connect(rainGain);
        rainGain.connect(sfxBus);
        src.start();
      }
      rainGain.gain.setTargetAtTime(level * 0.09, ac.currentTime, 0.4);
    },
  };
  let rainGain = null;

  // Rugissement du Grand Ancien : grondement grave et dissonant
  sfx.roar = () => {
    if (!ready()) return;
    const t = now();
    noise({ t, dur: 3.2, vol: 0.55, type: 'lowpass', freq: 500, freqTo: 90, attack: 0.3 });
    for (const [f, v] of [[55, 0.12], [58.3, 0.1], [82, 0.07], [110, 0.05]]) {
      tone({ t, f, slide: f * 0.7, dur: 3.2, type: 'sawtooth', vol: v, attack: 0.4, send: 0.5 });
    }
  };
  // passage d'une phase du combat
  sfx.phase = () => {
    if (!ready()) return;
    const t = now();
    [62, 69, 74].forEach((n, i) => tone({ t: t + i * 0.09, f: mtof(n), dur: 0.6, type: 'square', vol: 0.05, send: 0.5 }));
    kick(t, 0.5, 90);
  };

  // morceau en cours ('calm' ou 'epic') et s'il est réellement audible
  const nowPlaying = () => ({ track: mode, playing: !!ac && ac.state === 'running' && !settings.muted && settings.music > 0 });

  return { init, set, settings, setMusic, nowPlaying, ...sfx };
})();

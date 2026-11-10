// Lac Tranquille — musique et effets sonores, entièrement synthétisés (Web Audio API)
'use strict';

const Sound = (() => {
  const KEY = 'lacTranquille.settings';
  // track : 'auto' (selon le moment du jeu) ou l'identifiant d'un morceau ; loop : rejouer ce morceau en boucle
  const settings = { music: 0.5, sfx: 0.8, muted: false, track: 'auto', loop: false };
  // réglages relus depuis localStorage : donnée non fiable, chaque champ est validé (volume fini entre 0 et 1)
  const vol = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : d);
  let rawTrack = 'auto';            // validé plus bas, une fois le registre des morceaux déclaré
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      settings.music = vol(raw.music, settings.music);
      settings.sfx = vol(raw.sfx, settings.sfx);
      settings.muted = raw.muted === true;
      settings.loop = raw.loop === true;
      rawTrack = raw.track;
    }
  } catch { /* stockage indisponible */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* idem */ } };

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
    // curseur 0..1 élevé au carré : l'oreille perçoit le volume de façon logarithmique, le carré répartit
    // le changement sur toute la course du curseur (un curseur linéaire ne change presque rien avant 20 %)
    master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, 0.05);
    musicBus.gain.setTargetAtTime(settings.music ** 2 * 0.9, t, fadeIn ? 1.5 : 0.05);
    sfxBus.gain.setTargetAtTime(settings.sfx ** 2, t, 0.05);
  }

  // seules les clés de volume sont modifiables ici, avec la même validation qu'à la lecture
  // (le morceau et la boucle passent par chooseTrack)
  function set(key, value) {
    if (key === 'muted') settings.muted = value === true;
    else if (key === 'music' || key === 'sfx') settings[key] = vol(value, settings[key]);
    else return;
    save();
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

  // ---------------------------------------------------------------------------
  // Morceaux supplémentaires. Chacun : fonction (pas, instant) jouée par le séquenceur.
  // [pas de départ, note MIDI, durée en pas]
  // ---------------------------------------------------------------------------
  const M = () => ({ dest: musicBus, sendTo: musicDelay });
  const melodyAt = (bars, bar, e, fn) => { for (const [off, n, len] of bars[bar % bars.length]) if (off === e) fn(n, len); };

  // --- « Clair de lune sur le lac » : nuit, la mineur, 66 bpm, boîte à musique et grillons
  const NIGHT_E8 = 60 / 66 / 2;
  const NIGHT_CHORDS = [
    { bass: 33, notes: [57, 60, 64, 71] },   // Am9
    { bass: 29, notes: [53, 57, 60, 64] },   // Fmaj7
    { bass: 36, notes: [55, 60, 64, 71] },   // Cmaj7
    { bass: 31, notes: [55, 59, 62, 64] },   // G6
  ];
  const NIGHT_MELODY = [
    [[0, 76, 3], [3, 79, 1], [4, 81, 4]], [[0, 79, 2], [2, 76, 2], [4, 72, 4]],
    [[0, 74, 3], [3, 76, 1], [4, 79, 4]], [[0, 76, 8]],
    [[0, 81, 2], [2, 84, 2], [4, 83, 2], [6, 79, 2]], [[0, 77, 4], [4, 76, 4]],
    [[0, 74, 2], [2, 72, 2], [4, 71, 4]], [[0, 69, 8]],
  ];
  function playNight(s, t) {
    const bar = Math.floor(s / 8), e = s % 8, ch = NIGHT_CHORDS[bar % 4], m = M();
    if (e === 0) {
      for (const n of ch.notes) tone({ ...m, t, f: mtof(n), dur: NIGHT_E8 * 9, type: 'sine', vol: 0.016, attack: 0.9 });
      tone({ ...m, t, f: mtof(ch.bass + 12), dur: NIGHT_E8 * 8, type: 'sine', vol: 0.12, attack: 0.08 });
    }
    if (e === 0 || e === 3 || e === 6) tone({ ...m, t, f: mtof(ch.notes[(e / 3 + bar) % 4] + 12), dur: NIGHT_E8 * 3, type: 'triangle', vol: 0.025, send: 0.35 });
    melodyAt(NIGHT_MELODY, bar, e, (n, len) => {
      tone({ ...m, t, f: mtof(n + 12), dur: len * NIGHT_E8 * 1.2, type: 'sine', vol: 0.05, attack: 0.003, send: 0.55 });   // boîte à musique
      tone({ ...m, t, f: mtof(n + 24), dur: 0.4, type: 'sine', vol: 0.012, attack: 0.002 });
    });
    if (e % 4 === 2) for (let k = 0; k < 3; k++) noise({ t: t + k * 0.06, dur: 0.03, vol: 0.006, type: 'bandpass', freq: 6500, q: 8, dest: musicBus });
  }

  // --- « Gouttes sur la coque » : pluie, ré dorien, 76 bpm, piano électrique et contrebasse
  const RAIN_E8 = 60 / 76 / 2;
  const RAIN_CHORDS = [
    { bass: 38, notes: [50, 53, 57, 60] },   // Dm7
    { bass: 31, notes: [50, 53, 55, 59] },   // G7
    { bass: 34, notes: [50, 53, 57, 58] },   // Bbmaj7
    { bass: 33, notes: [48, 52, 55, 57] },   // Am7
  ];
  const RAIN_MELODY = [
    [[0, 69, 3], [4, 72, 2], [6, 74, 2]], [[0, 77, 6]], [[0, 76, 2], [2, 74, 2], [4, 72, 4]], [[0, 69, 8]],
    [[0, 74, 3], [3, 76, 1], [4, 77, 2], [6, 79, 2]], [[0, 81, 6]], [[0, 79, 2], [2, 77, 2], [4, 76, 2], [6, 74, 2]], [[0, 74, 8]],
  ];
  const RAIN_SCALE = [74, 76, 77, 79, 81, 84, 86];
  function playRain(s, t) {
    const bar = Math.floor(s / 8), e = s % 8, ch = RAIN_CHORDS[bar % 4], m = M();
    if (e === 0 || e === 5) {                                     // accords de piano électrique
      for (const n of ch.notes) {
        tone({ ...m, t, f: mtof(n), dur: RAIN_E8 * 4, type: 'sine', vol: 0.03, attack: 0.008, send: 0.2 });
        tone({ ...m, t, f: mtof(n) * 2.003, dur: RAIN_E8 * 1.5, type: 'sine', vol: 0.006, attack: 0.004 });
      }
    }
    if (e % 2 === 0) {                                            // contrebasse qui marche
      const walk = [0, 7, 12, 10][e / 2];
      tone({ ...m, t, f: mtof(ch.bass + 12 + walk), dur: RAIN_E8 * 1.8, type: 'triangle', vol: 0.12, attack: 0.01 });
    }
    melodyAt(RAIN_MELODY, bar, e, (n, len) => tone({ ...m, t, f: mtof(n), dur: len * RAIN_E8, type: 'triangle', vol: 0.035, attack: 0.07, send: 0.4 }));
    if ((s * 37) % 11 < 4) tone({ ...m, t: t + RAIN_E8 * 0.5, f: mtof(RAIN_SCALE[(s * 13) % 7] + 12), dur: 0.25, type: 'sine', vol: 0.02, attack: 0.002, send: 0.6 });   // gouttes
    if (e === 2 || e === 6) noise({ t, dur: 0.14, vol: 0.02, type: 'bandpass', freq: 3200, q: 0.6, dest: musicBus, attack: 0.02 });   // balais
  }

  // --- « Jour de marché à Saint-Aubin » : village, sol majeur, 112 bpm, accordéon et tambourin
  const VIL_E8 = 60 / 112 / 2;
  const VIL_CHORDS = [
    { root: 31, stab: [55, 59, 62] }, { root: 36, stab: [55, 60, 64] }, { root: 38, stab: [54, 57, 62] }, { root: 31, stab: [55, 59, 62] },
    { root: 40, stab: [55, 59, 64] }, { root: 36, stab: [55, 60, 64] }, { root: 38, stab: [54, 57, 60] }, { root: 31, stab: [55, 59, 62] },
  ];
  const VIL_MELODY = [
    [[0, 74, 2], [2, 71, 1], [3, 74, 1], [4, 79, 2], [6, 78, 2]], [[0, 76, 2], [2, 72, 2], [4, 76, 2], [6, 79, 2]],
    [[0, 78, 2], [2, 74, 2], [4, 72, 2], [6, 69, 2]], [[0, 71, 4], [4, 67, 4]],
    [[0, 71, 2], [2, 74, 2], [4, 76, 2], [6, 79, 2]], [[0, 81, 2], [2, 79, 2], [4, 76, 2], [6, 72, 2]],
    [[0, 74, 2], [2, 76, 1], [3, 78, 1], [4, 81, 2], [6, 78, 2]], [[0, 79, 6]],
  ];
  function playVillage(s, t) {
    const bar = Math.floor(s / 8), e = s % 8, ch = VIL_CHORDS[bar % 8], m = M();
    if (e === 0 || e === 4) tone({ ...m, t, f: mtof(ch.root + 12 + (e === 4 ? 7 : 0)), dur: VIL_E8 * 1.6, type: 'triangle', vol: 0.15, attack: 0.008 });   // oum…
    if (e === 2 || e === 6) for (const n of ch.stab) tone({ ...m, t, f: mtof(n), dur: VIL_E8 * 0.8, type: 'square', vol: 0.012, attack: 0.006 });          // …pa !
    melodyAt(VIL_MELODY, bar, e, (n, len) => {                    // accordéon : deux anches légèrement désaccordées
      tone({ ...m, t, f: mtof(n), dur: len * VIL_E8 * 0.95, type: 'square', vol: 0.022, attack: 0.02, send: 0.25 });
      tone({ ...m, t, f: mtof(n) * 1.006, dur: len * VIL_E8 * 0.95, type: 'sawtooth', vol: 0.012, attack: 0.02 });
    });
    if (e % 2 === 1) noise({ t, dur: 0.07, vol: 0.022, type: 'highpass', freq: 6000, dest: musicBus });   // tambourin
    if (e === 0) tone({ t, f: 110, slide: 45, dur: 0.18, type: 'sine', vol: 0.12, attack: 0.002, dest: musicBus });
  }

  // --- « Ce qui dort sous l'eau » : lac corrompu, 54 bpm, bourdon, cloches dissonantes, battements de cœur
  const ABY_E8 = 60 / 54 / 2;
  const ABY_BELLS = [61, 62, 67, 68, 73, 74];
  function playAbyss(s, t) {
    const bar = Math.floor(s / 8), e = s % 8, m = M();
    if (s % 32 === 0) {                                           // bourdon de triton, très long
      for (const [n, d] of [[25, 1], [31, 1.004], [37, 0.997]]) tone({ ...m, t, f: mtof(n) * d, dur: ABY_E8 * 33, type: 'sawtooth', vol: 0.03, attack: 2.5 });
      noise({ t, dur: ABY_E8 * 30, vol: 0.03, type: 'bandpass', freq: 300, freqTo: 900, q: 3, dest: musicBus, attack: 3 });
    }
    if (e === 0 || e === 1) tone({ t, f: e ? 60 : 70, slide: 35, dur: 0.3, type: 'sine', vol: e ? 0.13 : 0.18, attack: 0.004, dest: musicBus });   // cœur
    if (e === 0 || (e === 5 && bar % 2)) {
      const n = ABY_BELLS[(bar * 5 + e) % ABY_BELLS.length];
      for (const [r, g] of [[1, 0.04], [2.76, 0.015], [5.4, 0.008]]) tone({ ...m, t, f: mtof(n) * r, dur: 3, type: 'sine', vol: g, attack: 0.003, send: 0.7 });
    }
    if (e === 3 && bar % 4 === 3) noise({ t, dur: 1.4, vol: 0.02, type: 'bandpass', freq: 1800, freqTo: 700, q: 4, dest: musicBus, attack: 0.5 });   // murmure
  }

  // ---------------------------------------------------------------------------
  // Registre des morceaux et séquenceur.
  // Les changements de morceau se font au début d'une mesure (enchaînement musical), sauf pour le
  // combat contre le Grand Ancien qui démarre tout de suite.
  // ---------------------------------------------------------------------------
  const TRACKS = {
    calm:    { title: 'Ricochets sur le Lac Tranquille', info: 'Thème principal',   step: E8,       len: LOOP,      bar: 8,  play: playStep },
    village: { title: 'Jour de marché à Saint-Aubin',    info: 'Le village',        step: VIL_E8,   len: 64,        bar: 8,  play: playVillage },
    pluie:   { title: 'Gouttes sur la coque',            info: 'Jours de pluie',    step: RAIN_E8,  len: 64,        bar: 8,  play: playRain },
    nuit:    { title: 'Clair de lune sur le lac',        info: 'La nuit',           step: NIGHT_E8, len: 64,        bar: 8,  play: playNight },
    abysses: { title: "Ce qui dort sous l'eau",          info: 'Le lac corrompu',   step: ABY_E8,   len: 64,        bar: 8,  play: playAbyss },
    epic:    { title: "L'Éveil du Grand Ancien",         info: 'Combat',            step: S16,      len: EPIC_LOOP, bar: 16, play: playEpic },
  };
  const PLAYLIST = Object.keys(TRACKS);
  // réglages relus plus haut : le morceau choisi n'est validé qu'ici, une fois le registre connu
  settings.track = typeof rawTrack === 'string' && (rawTrack === 'auto' || Object.hasOwn(TRACKS, rawTrack)) ? rawTrack : 'auto';

  let context = 'calm';           // morceau demandé par le jeu en mode automatique (nuit, pluie, village…)
  let jukebox = settings.track === 'auto' ? 'calm' : settings.track;   // position dans la playlist
  // morceau voulu maintenant : combat > choix du joueur > contexte du jeu
  const wanted = () => (mode === 'epic' ? 'epic' : settings.track === 'auto' ? context : jukebox);
  let cur = 'calm';
  const silent = () => settings.muted || settings.music <= 0;

  function schedule() {
    if (!ac) return;
    if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.05;
    while (nextTime < ac.currentTime + 0.3) {
      let def = TRACKS[cur];
      if (step % def.bar === 0 && wanted() !== cur) {             // début de mesure : on peut changer
        cur = wanted();
        step = 0;
        def = TRACKS[cur];
      }
      if (!silent()) def.play(step, nextTime);                   // musique coupée : on avance sans créer de sons
      nextTime += def.step;
      if (++step >= def.len) {
        step = 0;
        // playlist : morceau choisi sans « en boucle » → on passe au suivant à la fin du morceau
        if (settings.track !== 'auto' && !settings.loop && mode !== 'epic') {
          jukebox = PLAYLIST[(PLAYLIST.indexOf(jukebox) + 1) % PLAYLIST.length];
        }
      }
    }
  }

  // changement immédiat (choix du joueur dans les options, début du combat)
  function cutTo(id) {
    cur = id;
    step = 0;
    if (ac) nextTime = ac.currentTime + 0.3;
  }

  // Combat contre le Grand Ancien : 'epic' (avec son intensité) ou retour à la musique normale
  function setMusic(next, level = 1) {
    intensity = level;
    if (next === 'epic') { if (mode !== 'epic') { mode = 'epic'; cutTo('epic'); } }
    else mode = 'calm';
  }
  // Contexte de jeu pour le mode automatique (changement à la prochaine mesure)
  function setContext(id) {
    if (Object.hasOwn(TRACKS, id) && id !== 'epic') context = id;
  }
  // Choix du joueur : 'auto' ou un morceau, et la lecture en boucle
  function chooseTrack(id, loop) {
    if (id === 'auto' || Object.hasOwn(TRACKS, id)) settings.track = id;
    settings.loop = loop === true;
    save();
    if (settings.track !== 'auto') { jukebox = settings.track; if (mode !== 'epic') cutTo(jukebox); }
    else if (mode !== 'epic') cutTo(context);
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
  // morceau en cours (identifiant, titre) et s'il est réellement audible
  const nowPlaying = () => ({ track: cur, title: TRACKS[cur].title, info: TRACKS[cur].info,
    playing: !!ac && ac.state === 'running' && !silent() });
  // liste des morceaux pour le menu des options
  const trackList = () => PLAYLIST.map((id) => ({ id, title: TRACKS[id].title, info: TRACKS[id].info }));

  return { init, set, settings, setMusic, setContext, chooseTrack, nowPlaying, trackList, ...sfx };
})();

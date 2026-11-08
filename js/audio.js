/* ============================================================
 * 拼音汉字乐园 · 声音模块
 * 全部声音用浏览器原生能力合成，零音频文件、零外部依赖，
 * 断网也能用：
 *   - 朗读：Web Speech API（中文 zh-CN）
 *   - 掌声：Web Audio API 白噪声 burst 合成
 *   - 提示音：Web Audio API 振荡器
 * ============================================================ */
window.SoundKit = (function () {
  'use strict';

  let ctx = null;
  let noiseBuffer = null;
  let soundOn = true;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      return ctx;
    } catch (e) { return null; }
  }

  function resume() {
    const c = ensure();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} }
    return c;
  }

  function noise() {
    const c = ensure();
    if (!c) return null;
    if (noiseBuffer) return noiseBuffer;
    const len = Math.floor(c.sampleRate * 0.3);
    noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  // 单个音符
  function tone(freq, at, dur, vol, type) {
    const c = ensure();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(at); osc.stop(at + dur + 0.02);
  }

  // 一次拍手：短促的带通白噪声
  function clap(at, vol) {
    const c = ensure();
    const buf = noise();
    if (!c || !buf) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800 + Math.random() * 1900;
    bp.Q.value = 0.6 + Math.random() * 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.085 + Math.random() * 0.06);
    let last = bp;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.random() * 1.7 - 0.85;
      bp.connect(p);
      last = p;
    }
    src.connect(bp);
    last.connect(g);
    g.connect(c.destination);
    src.start(at, Math.random() * 0.05);
    src.stop(at + 0.2);
  }

  /* 掌声：34 次随机拍手铺在 1.5 秒里，像一屋子小朋友在鼓掌 */
  function applause() {
    if (!soundOn) return;
    const c = resume();
    if (!c) return;
    const t0 = c.currentTime + 0.03;
    for (let i = 0; i < 34; i++) {
      const t = t0 + i * 0.041 + Math.random() * 0.032;
      clap(t, 0.10 + Math.random() * 0.13);
    }
    // 收尾的三音上行「叮咚」
    [784, 988, 1318].forEach(function (f, i) {
      tone(f, t0 + 0.90 + i * 0.11, 0.28, 0.055, 'sine');
    });
  }

  function tap() {
    if (!soundOn) return;
    const c = resume(); if (!c) return;
    tone(680, c.currentTime + 0.005, 0.075, 0.045, 'sine');
  }

  function wrong() {
    if (!soundOn) return;
    const c = resume(); if (!c) return;
    const t = c.currentTime + 0.01;
    tone(330, t, 0.16, 0.05, 'triangle');
    tone(262, t + 0.13, 0.22, 0.045, 'triangle');
  }

  function cheer() { // 答对 = 掌声 + 上行音
    if (!soundOn) return;
    applause();
  }

  /* ---------- 朗读 ---------- */
  function speak(text, opts) {
    opts = opts || {};
    if (!('speechSynthesis' in window) || !text) return false;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = opts.rate || 0.86;
      u.pitch = opts.pitch || 1.06;
      u.volume = 1;
      const voices = synth.getVoices() || [];
      const zh = voices.filter(function (v) {
        return /zh|cmn|Chinese|中文|普通话/i.test((v.lang || '') + ' ' + (v.name || ''));
      });
      if (zh.length) {
        u.voice = zh.find(function (v) {
          return /Tingting|Ting-Ting|Huihui|Yaoyao|Xiaoxiao|Meijia|Kangkang|女|Female/i.test(v.name || '');
        }) || zh[0];
      }
      if (opts.onend) u.onend = opts.onend;
      synth.speak(u);
      return true;
    } catch (e) { return false; }
  }

  function stopSpeak() {
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) {}
  }

  function setEnabled(on) { soundOn = !!on; }
  function isEnabled() { return soundOn; }

  // 预热：在首次用户交互时解锁音频上下文
  function unlock() { resume(); }

  return {
    unlock: unlock,
    applause: applause,
    cheer: cheer,
    tap: tap,
    wrong: wrong,
    speak: speak,
    stopSpeak: stopSpeak,
    setEnabled: setEnabled,
    isEnabled: isEnabled
  };
})();

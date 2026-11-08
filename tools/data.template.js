/* ============================================================
 * 拼音汉字乐园 · 1~6 年级分级字库与拼音工具
 *
 * 本文件由 tools/generate_data.py 生成，请勿手工编辑；
 * 想加字请修改字表后重新运行脚本（README 里有说明）。
 *
 * 每条数据：
 *   c 汉字 / i 声母 / f 带调韵母 / w 组词 / e 图示 / g 年级
 *   s 例句（可选）/ tip 拼音小提示（可选）
 * 完整拼音 p = i + f，由程序合成，避免手工录入不一致。
 *
 * 说明：三拼音节按「声母 + 带介音的韵母」两拼法处理（如 huā = h + uā），
 * 整体认读音节会给出提示；真零声母字不适合「选声母」题型，未收录。
 * ============================================================ */
window.PINYIN_DATA = (function () {
  'use strict';

  const UNITS = /*__UNITS__*/;

  /* ---------- 拼音工具 ---------- */
  const BASE_TONES = {
    a: 'āáǎà', o: 'ōóǒò', e: 'ēéěè',
    i: 'īíǐì', u: 'ūúǔù', 'ü': 'ǖǘǚǜ'
  };
  const TONE_TO_BASE = {};
  Object.keys(BASE_TONES).forEach(function (base) {
    for (const ch of BASE_TONES[base]) TONE_TO_BASE[ch] = base;
  });

  // 去掉声调，返回基础韵母（ü 保留）
  function stripTone(final) {
    return Array.from(final).map(function (ch) { return TONE_TO_BASE[ch] || ch; }).join('');
  }

  // 给基础韵母标上第 toneIdx 声（0~3）
  function markTone(base, toneIdx) {
    const chars = Array.from(base);
    let idx = -1;
    for (const key of ['a', 'o', 'e', 'ü']) {
      const pos = chars.indexOf(key);
      if (pos !== -1) { idx = pos; break; }
    }
    if (idx === -1) { // iu / ui / i / u：标在最后一个元音上
      for (let k = chars.length - 1; k >= 0; k--) {
        if ('iuü'.indexOf(chars[k]) !== -1) { idx = k; break; }
      }
    }
    if (idx === -1) return base;
    const group = BASE_TONES[chars[idx]];
    if (!group) return base;
    chars[idx] = group[toneIdx];
    return chars.join('');
  }

  // 同一韵母的其他声调形式
  function toneVariants(final) {
    const chars = Array.from(final);
    const idx = chars.findIndex(function (ch) { return TONE_TO_BASE[ch]; });
    if (idx === -1) return [];
    const base = TONE_TO_BASE[chars[idx]];
    const group = BASE_TONES[base];
    const out = [];
    for (let t = 0; t < 4; t++) {
      if (group[t] === chars[idx]) continue;
      const copy = chars.slice();
      copy[idx] = group[t];
      out.push(copy.join(''));
    }
    return out;
  }

  // 形近 / 音近声母，用于困难模式的干扰项
  const INITIAL_CONFUSABLE = {
    b: ['p', 'd', 'q', 'm', 'f'], p: ['b', 'q', 'd', 'f'],
    m: ['n', 'f', 'b', 'w'], f: ['t', 'h', 'b', 'p'],
    d: ['t', 'b', 'p', 'q'], t: ['d', 'f', 'p', 'k'],
    n: ['l', 'm', 'h', 'r'], l: ['n', 'r', 'd', 't'],
    g: ['k', 'h', 'j', 'q'], k: ['g', 'h', 'q', 't'],
    h: ['k', 'g', 'f', 'n'],
    j: ['q', 'x', 'zh', 'z'], q: ['j', 'x', 'ch', 'c'], x: ['j', 'q', 'sh', 's'],
    zh: ['z', 'ch', 'j', 'sh'], ch: ['c', 'zh', 'q', 'sh'], sh: ['s', 'zh', 'x', 'ch'],
    r: ['l', 'n', 'sh', 'y'],
    z: ['zh', 'c', 'j', 's'], c: ['ch', 'z', 'q', 's'], s: ['sh', 'c', 'x', 'z'],
    y: ['w', 'r', 'l', 'n'], w: ['y', 'm', 'h', 'n']
  };

  // 相近韵母家族（基础形式），覆盖两拼、三拼与带介音韵母
  const FINAL_FAMILIES = [
    ['a', 'ai', 'ao', 'an', 'ang', 'ia', 'ua'],
    ['o', 'ou', 'ong', 'uo', 'ao'],
    ['e', 'ei', 'en', 'eng', 'ie', 'üe'],
    ['i', 'in', 'ing', 'ie', 'iu', 'ian'],
    ['u', 'ui', 'un', 'ou', 'ua', 'uo'],
    ['ü', 'üe', 'üan', 'u', 'un'],
    ['ai', 'ei', 'ui', 'ao', 'an', 'uai'],
    ['an', 'ang', 'en', 'eng', 'in', 'ing', 'ian', 'uan'],
    ['ao', 'ou', 'iu', 'ai', 'iao'],
    ['ie', 'üe', 'ei', 'i', 'in'],
    ['ui', 'iu', 'un', 'u', 'uai'],
    ['in', 'ing', 'en', 'eng', 'ian', 'iang'],
    ['ia', 'iao', 'ian', 'iang', 'iong', 'ua', 'uo', 'uai', 'uan', 'uang', 'ueng'],
    ['uan', 'uang', 'ian', 'iang', 'üan', 'an', 'ang'],
    ['iong', 'ong', 'iang', 'ing', 'un'],
    ['er', 'e', 'ei', 'en']
  ];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pick(arr, n) { return shuffle(arr).slice(0, n); }

  // 生成声母干扰项
  function distractorInitials(correct, count) {
    let pool = (INITIAL_CONFUSABLE[correct] || []).slice();
    if (pool.length < count) {
      pool = pool.concat(Object.keys(INITIAL_CONFUSABLE).filter(function (x) {
        return x !== correct && pool.indexOf(x) === -1;
      }));
    }
    return pick(pool, count);
  }

  // 生成韵母干扰项：优先同韵不同调，再补形近韵母，最后用题库真实韵母兜底
  function distractorFinals(correct, count) {
    const out = [];
    const tones = shuffle(toneVariants(correct));
    for (const t of tones) {
      if (out.length >= count) break;
      if (out.indexOf(t) === -1) out.push(t);
    }
    const base = stripTone(correct);
    if (out.length < count) {
      const families = FINAL_FAMILIES.filter(function (f) { return f.indexOf(base) !== -1; });
      const candidates = [];
      families.forEach(function (f) {
        f.forEach(function (b) {
          if (b === base) return;
          for (let t = 0; t < 4; t++) candidates.push(markTone(b, t));
        });
      });
      for (const c of shuffle(candidates)) {
        if (out.length >= count) break;
        if (out.indexOf(c) === -1 && c !== correct) out.push(c);
      }
    }
    if (out.length < count) {
      const sameStart = ALL_FINALS.filter(function (x) { return x !== base && x[0] === base[0]; });
      const others = ALL_FINALS.filter(function (x) { return x !== base && x[0] !== base[0]; });
      for (const b of shuffle(sameStart).concat(shuffle(others))) {
        if (out.length >= count) break;
        const cand = markTone(b, Math.floor(Math.random() * 4));
        if (out.indexOf(cand) === -1 && cand !== correct) out.push(cand);
      }
    }
    return out.slice(0, count);
  }

  // 展平题库，附加年级 / 单元信息与完整拼音
  const ALL_WORDS = [];
  UNITS.forEach(function (unit) {
    unit.words.forEach(function (w) {
      ALL_WORDS.push(Object.assign({}, w, {
        g: w.g || unit.n,
        unit: unit.id,
        unitName: unit.name,
        p: w.i + w.f
      }));
    });
  });

  const ALL_FINALS = Array.from(new Set(ALL_WORDS.map(function (w) { return stripTone(w.f); })));
  const GRADES = UNITS.map(function (u) {
    return { id: u.id, n: u.n, name: u.name, emoji: u.emoji, color: u.color, count: u.words.length };
  });

  // 按勾选的年级取题（grades 为数字数组，如 [1, 3, 5]）
  function wordsForGrades(grades) {
    const set = Object.create(null);
    (grades || []).forEach(function (g) { set[String(Number(g))] = 1; });
    return ALL_WORDS.filter(function (w) { return set[String(w.g)]; });
  }

  return {
    UNITS: UNITS,
    GRADES: GRADES,
    ALL_WORDS: ALL_WORDS,
    ALL_FINALS: ALL_FINALS,
    wordsForGrades: wordsForGrades,
    stripTone: stripTone,
    markTone: markTone,
    toneVariants: toneVariants,
    shuffle: shuffle,
    pick: pick,
    distractorInitials: distractorInitials,
    distractorFinals: distractorFinals
  };
})();

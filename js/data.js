/* ============================================================
 * 拼音汉字乐园 · 题库与拼音工具
 * 说明：
 *  1. 只收录「两拼音节」的常用字（声母 + 韵母），
 *     避开整体认读音节（zhi/chi/shi/ri/zi/ci/si/yi/wu/yu…）
 *     与三拼音节（jia/guo/hua…），符合一年级拼读教学顺序。
 *  2. 每条数据：c 汉字 / i 声母 / f 带调韵母 / w 组词 / e 图示 / s 例句
 *     完整拼音 = i + f，避免手工录入造成的不一致。
 * ============================================================ */
window.PINYIN_DATA = (function () {
  'use strict';

  const UNITS = [
    {
      id: 'nature', name: '大自然', emoji: '🌳', color: '#56c596',
      words: [
        { c: '山', i: 'sh', f: 'ān', w: '高山', e: '⛰️', s: '远处有一座高山。' },
        { c: '水', i: 'sh', f: 'uǐ', w: '喝水', e: '💧', s: '我每天都要喝水。' },
        { c: '木', i: 'm', f: 'ù', w: '树木', e: '🌳', s: '公园里有很多树木。' },
        { c: '风', i: 'f', f: 'ēng', w: '大风', e: '🌬️', s: '今天外面风很大。' },
        { c: '春', i: 'ch', f: 'ūn', w: '春天', e: '🌸', s: '春天来了，花开了。' },
        { c: '秋', i: 'q', f: 'iū', w: '秋天', e: '🍂', s: '秋天树叶变黄了。' },
        { c: '冬', i: 'd', f: 'ōng', w: '冬天', e: '❄️', s: '冬天会下雪。' },
        { c: '星', i: 'x', f: 'īng', w: '星星', e: '⭐', s: '天上有许多星星。' }
      ]
    },
    {
      id: 'family', name: '我的家', emoji: '🏠', color: '#ff9f68',
      words: [
        { c: '爸', i: 'b', f: 'à', w: '爸爸', e: '👨', s: '爸爸带我去公园。' },
        { c: '妈', i: 'm', f: 'ā', w: '妈妈', e: '👩', s: '妈妈给我讲故事。' },
        { c: '哥', i: 'g', f: 'ē', w: '哥哥', e: '👦', s: '哥哥比我高一点。' },
        { c: '弟', i: 'd', f: 'ì', w: '弟弟', e: '🧒', s: '弟弟在玩积木。' },
        { c: '姐', i: 'j', f: 'iě', w: '姐姐', e: '👧', s: '姐姐会画小动物。' },
        { c: '妹', i: 'm', f: 'èi', w: '妹妹', e: '👶', s: '妹妹笑得真开心。' },
        { c: '门', i: 'm', f: 'én', w: '大门', e: '🚪', s: '请把大门关好。' },
        { c: '包', i: 'b', f: 'āo', w: '书包', e: '🎒', s: '我的书包是蓝色的。' }
      ]
    },
    {
      id: 'school', name: '学校生活', emoji: '🎒', color: '#6aa9ff',
      words: [
        { c: '书', i: 'sh', f: 'ū', w: '读书', e: '📖', s: '我最喜欢读书了。' },
        { c: '本', i: 'b', f: 'ěn', w: '书本', e: '📚', s: '把书本放整齐。' },
        { c: '笔', i: 'b', f: 'ǐ', w: '铅笔', e: '✏️', s: '我有一支新铅笔。' },
        { c: '读', i: 'd', f: 'ú', w: '读书', e: '📖', s: '每天早上我读书。' },
        { c: '写', i: 'x', f: 'iě', w: '写字', e: '🖊️', s: '我会写自己的名字。' },
        { c: '同', i: 't', f: 'óng', w: '同学', e: '🧑‍🤝‍🧑', s: '同学之间要互相帮助。' },
        { c: '学', i: 'x', f: 'ué', w: '学习', e: '📝', s: '我们一起学习拼音。', tip: '小 ü 碰到 j、q、x，去掉两点还读 ü：x + üé → xué' },
        { c: '班', i: 'b', f: 'ān', w: '班级', e: '🏫', s: '我在一年级一班。' }
      ]
    },
    {
      id: 'number', name: '数字方位', emoji: '🔢', color: '#b489f5',
      words: [
        { c: '三', i: 's', f: 'ān', w: '三个', e: '3️⃣', s: '桌上有三个苹果。' },
        { c: '六', i: 'l', f: 'iù', w: '六个', e: '6️⃣', s: '我有六支彩笔。' },
        { c: '七', i: 'q', f: 'ī', w: '七个', e: '7️⃣', s: '一周有七天。' },
        { c: '八', i: 'b', f: 'ā', w: '八个', e: '8️⃣', s: '八点要去上学。' },
        { c: '九', i: 'j', f: 'iǔ', w: '九个', e: '9️⃣', s: '九加一等于十。' },
        { c: '百', i: 'b', f: 'ǎi', w: '一百', e: '💯', s: '我能数到一百。' },
        { c: '东', i: 'd', f: 'ōng', w: '东方', e: '🧭', s: '太阳从东方升起。' },
        { c: '北', i: 'b', f: 'ěi', w: '北方', e: '🧭', s: '北方的冬天很冷。' }
      ]
    },
    {
      id: 'action', name: '动作身体', emoji: '🏃', color: '#ff7f9e',
      words: [
        { c: '走', i: 'z', f: 'ǒu', w: '走路', e: '🚶', s: '我走路去学校。' },
        { c: '路', i: 'l', f: 'ù', w: '道路', e: '🛣️', s: '过马路要看红绿灯。' },
        { c: '跑', i: 'p', f: 'ǎo', w: '跑步', e: '🏃', s: '每天早上跑步。' },
        { c: '步', i: 'b', f: 'ù', w: '跑步', e: '👟', s: '多跑步身体好。' },
        { c: '看', i: 'k', f: 'àn', w: '看书', e: '👀', s: '我在安静地看书。' },
        { c: '听', i: 't', f: 'īng', w: '听歌', e: '👂', s: '我喜欢听儿歌。' },
        { c: '喝', i: 'h', f: 'ē', w: '喝水', e: '🥤', s: '运动后要喝水。' },
        { c: '手', i: 'sh', f: 'ǒu', w: '小手', e: '✋', s: '饭前要洗小手。' }
      ]
    },
    {
      id: 'life', name: '生活颜色', emoji: '🎨', color: '#f5c344',
      words: [
        { c: '大', i: 'd', f: 'à', w: '大树', e: '🌳', s: '门前有一棵大树。' },
        { c: '好', i: 'h', f: 'ǎo', w: '你好', e: '👋', s: '见到老师说你好。' },
        { c: '白', i: 'b', f: 'ái', w: '白色', e: '⬜', s: '云朵是白色的。' },
        { c: '红', i: 'h', f: 'óng', w: '红色', e: '🔴', s: '国旗是红色的。' },
        { c: '蓝', i: 'l', f: 'án', w: '蓝天', e: '🔵', s: '蓝天上飘着白云。' },
        { c: '绿', i: 'l', f: 'ǜ', w: '绿色', e: '🟢', s: '小草是绿色的。', tip: 'ǜ 上的两点不能丢：l + ǜ → lǜ' },
        { c: '车', i: 'ch', f: 'ē', w: '汽车', e: '🚗', s: '汽车开得很快。' },
        { c: '飞', i: 'f', f: 'ēi', w: '飞机', e: '✈️', s: '飞机在天上飞。' },
        { c: '盼', i: 'p', f: 'àn', w: '盼望', e: '👀', s: '我盼望快快长大。' }
      ]
    }
  ];

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

  // 相近韵母家族（基础形式）
  const FINAL_FAMILIES = [
    ['a', 'ai', 'ao', 'an', 'ang'],
    ['o', 'ou', 'ong', 'uo', 'ao'],
    ['e', 'ei', 'en', 'eng', 'ie'],
    ['i', 'in', 'ing', 'ie', 'iu'],
    ['u', 'ui', 'un', 'u', 'ou'],
    ['ü', 'üe', 'u', 'un'],
    ['ai', 'ei', 'ui', 'ao', 'an'],
    ['an', 'ang', 'en', 'eng', 'in', 'ing'],
    ['ao', 'ou', 'iu', 'ai'],
    ['ie', 'üe', 'ei', 'i', 'in'],
    ['ui', 'iu', 'un', 'u'],
    ['in', 'ing', 'en', 'eng', 'ian']
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

  // 生成韵母干扰项：优先同韵不同调，再补形近韵母
  function distractorFinals(correct, count) {
    const out = [];
    const tones = shuffle(toneVariants(correct));
    for (const t of tones) {
      if (out.length >= count) break;
      if (out.indexOf(t) === -1) out.push(t);
    }
    if (out.length < count) {
      const base = stripTone(correct);
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
    return out.slice(0, count);
  }

  // 展平题库，附加 unit 信息与完整拼音
  const ALL_WORDS = [];
  UNITS.forEach(function (unit) {
    unit.words.forEach(function (w) {
      ALL_WORDS.push(Object.assign({}, w, {
        unit: unit.id,
        unitName: unit.name,
        p: w.i + w.f
      }));
    });
  });

  return {
    UNITS: UNITS,
    ALL_WORDS: ALL_WORDS,
    stripTone: stripTone,
    markTone: markTone,
    toneVariants: toneVariants,
    shuffle: shuffle,
    pick: pick,
    distractorInitials: distractorInitials,
    distractorFinals: distractorFinals
  };
})();

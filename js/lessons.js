/* ============================================================
 * 拼音汉字乐园 · 拼音基础专项数据
 *
 * 本文件由 tools/generate_lessons.py 生成，请勿手工编辑。
 *   CONFUSABLE  易混淆声母 b / p / d / t / q 的形状口诀
 *   WHOLE       16 个整体认读音节 + 例字 + 形近干扰项
 *
 * 整体认读音节教学上「不拼读、整体记」，所以不进「拼一拼」题库，
 * 而是由 wholeWords() 展平成独立题目，在专属玩法里练习。
 * ============================================================ */
window.PINYIN_LESSONS = (function () {
  'use strict';

  var CONFUSABLE = {
  "letters": [
    "b",
    "p",
    "d",
    "t",
    "q"
  ],
  "short": {
    "b": "像个 6 字 b b b",
    "p": "右上半圆 p p p",
    "d": "左下半圆 d d d",
    "q": "左上半圆 q q q",
    "t": "伞柄朝下 t t t"
  },
  "tips": {
    "b": "像个 6 字 b b b：右下半圆，像收音机天线朝上 📻",
    "p": "右上半圆 p p p：泼水的时候要用力 💦",
    "d": "左下半圆 d d d：马蹄印子 d d d 🐎",
    "q": "左上半圆 q q q：气球飞上天 🎈",
    "t": "伞柄朝下 t t t：像一个倒过来的小伞把 ☂️"
  },
  "banner": "6 字 b ｜ 反 6 d ｜ 右上 p ｜ 左上 q ｜ 伞把 t",
  "note": "b、d 的肚子一个朝右一个朝左；p、q 的半圆都在上面，方向相反；t 像一把小伞。先看清方向再选！"
};

  var WHOLE = [
  {
    "s": "zhi",
    "e": "💡",
    "near": [
      "chi",
      "shi",
      "zi"
    ],
    "zi": [
      {
        "c": "知",
        "w": "知道",
        "e": "💡",
        "p": "zhī"
      },
      {
        "c": "纸",
        "w": "纸张",
        "e": "📄",
        "p": "zhǐ"
      },
      {
        "c": "直",
        "w": "直线",
        "e": "📏",
        "p": "zhí"
      }
    ]
  },
  {
    "s": "chi",
    "e": "🍚",
    "near": [
      "zhi",
      "shi",
      "ci"
    ],
    "zi": [
      {
        "c": "吃",
        "w": "吃饭",
        "e": "🍚",
        "p": "chī"
      },
      {
        "c": "尺",
        "w": "尺子",
        "e": "📐",
        "p": "chǐ"
      },
      {
        "c": "池",
        "w": "池塘",
        "e": "💧",
        "p": "chí"
      }
    ]
  },
  {
    "s": "shi",
    "e": "🔟",
    "near": [
      "zhi",
      "chi",
      "si"
    ],
    "zi": [
      {
        "c": "十",
        "w": "十个",
        "e": "🔟",
        "p": "shí"
      },
      {
        "c": "石",
        "w": "石头",
        "e": "🪨",
        "p": "shí"
      },
      {
        "c": "狮",
        "w": "狮子",
        "e": "🦁",
        "p": "shī"
      }
    ]
  },
  {
    "s": "ri",
    "e": "🌅",
    "near": [
      "zi",
      "chi",
      "shi"
    ],
    "zi": [
      {
        "c": "日",
        "w": "日出",
        "e": "🌅",
        "p": "rì"
      }
    ]
  },
  {
    "s": "zi",
    "e": "📝",
    "near": [
      "zhi",
      "ci",
      "si"
    ],
    "zi": [
      {
        "c": "字",
        "w": "汉字",
        "e": "📝",
        "p": "zì"
      },
      {
        "c": "紫",
        "w": "紫色",
        "e": "🟣",
        "p": "zǐ"
      },
      {
        "c": "子",
        "w": "孩子",
        "e": "👶",
        "p": "zǐ"
      }
    ]
  },
  {
    "s": "ci",
    "e": "📖",
    "near": [
      "chi",
      "zi",
      "si"
    ],
    "zi": [
      {
        "c": "词",
        "w": "生词",
        "e": "📖",
        "p": "cí"
      },
      {
        "c": "次",
        "w": "一次",
        "e": "1️⃣",
        "p": "cì"
      },
      {
        "c": "刺",
        "w": "刺猬",
        "e": "🦔",
        "p": "cì"
      }
    ]
  },
  {
    "s": "si",
    "e": "4️⃣",
    "near": [
      "shi",
      "zi",
      "ci"
    ],
    "zi": [
      {
        "c": "四",
        "w": "四个",
        "e": "4️⃣",
        "p": "sì"
      },
      {
        "c": "丝",
        "w": "丝线",
        "e": "🧵",
        "p": "sī"
      },
      {
        "c": "思",
        "w": "思考",
        "e": "💭",
        "p": "sī"
      }
    ]
  },
  {
    "s": "yi",
    "e": "1️⃣",
    "near": [
      "yu",
      "ye",
      "wu"
    ],
    "zi": [
      {
        "c": "一",
        "w": "一个",
        "e": "1️⃣",
        "p": "yī"
      },
      {
        "c": "衣",
        "w": "衣服",
        "e": "👕",
        "p": "yī"
      },
      {
        "c": "椅",
        "w": "椅子",
        "e": "🪑",
        "p": "yǐ"
      }
    ]
  },
  {
    "s": "wu",
    "e": "5️⃣",
    "near": [
      "yi",
      "yu",
      "ye"
    ],
    "zi": [
      {
        "c": "五",
        "w": "五个",
        "e": "5️⃣",
        "p": "wǔ"
      },
      {
        "c": "屋",
        "w": "屋子",
        "e": "🏠",
        "p": "wū"
      },
      {
        "c": "乌",
        "w": "乌云",
        "e": "☁️",
        "p": "wū"
      }
    ]
  },
  {
    "s": "yu",
    "e": "🐟",
    "near": [
      "yi",
      "wu",
      "yue"
    ],
    "zi": [
      {
        "c": "鱼",
        "w": "小鱼",
        "e": "🐟",
        "p": "yú"
      },
      {
        "c": "雨",
        "w": "下雨",
        "e": "🌧️",
        "p": "yǔ"
      },
      {
        "c": "玉",
        "w": "玉石",
        "e": "💎",
        "p": "yù"
      }
    ]
  },
  {
    "s": "ye",
    "e": "🍃",
    "near": [
      "yue",
      "yi",
      "yuan"
    ],
    "zi": [
      {
        "c": "叶",
        "w": "树叶",
        "e": "🍃",
        "p": "yè"
      },
      {
        "c": "夜",
        "w": "夜晚",
        "e": "🌙",
        "p": "yè"
      },
      {
        "c": "爷",
        "w": "爷爷",
        "e": "👴",
        "p": "yé"
      }
    ]
  },
  {
    "s": "yue",
    "e": "🌕",
    "near": [
      "ye",
      "yuan",
      "yu"
    ],
    "zi": [
      {
        "c": "月",
        "w": "月亮",
        "e": "🌕",
        "p": "yuè"
      },
      {
        "c": "越",
        "w": "越来越",
        "e": "🏃",
        "p": "yuè"
      },
      {
        "c": "乐",
        "w": "音乐",
        "e": "🎵",
        "p": "yuè"
      }
    ]
  },
  {
    "s": "yuan",
    "e": "⭕",
    "near": [
      "yue",
      "yu",
      "yun"
    ],
    "zi": [
      {
        "c": "圆",
        "w": "圆形",
        "e": "⭕",
        "p": "yuán"
      },
      {
        "c": "元",
        "w": "一元",
        "e": "💰",
        "p": "yuán"
      },
      {
        "c": "远",
        "w": "远方",
        "e": "🔭",
        "p": "yuǎn"
      }
    ]
  },
  {
    "s": "yin",
    "e": "🔊",
    "near": [
      "ying",
      "yun",
      "yi"
    ],
    "zi": [
      {
        "c": "音",
        "w": "声音",
        "e": "🔊",
        "p": "yīn"
      },
      {
        "c": "银",
        "w": "银色",
        "e": "🥈",
        "p": "yín"
      },
      {
        "c": "因",
        "w": "因为",
        "e": "❓",
        "p": "yīn"
      }
    ]
  },
  {
    "s": "yun",
    "e": "☁️",
    "near": [
      "yuan",
      "yin",
      "ying"
    ],
    "zi": [
      {
        "c": "云",
        "w": "白云",
        "e": "☁️",
        "p": "yún"
      },
      {
        "c": "运",
        "w": "运动",
        "e": "⚽",
        "p": "yùn"
      }
    ]
  },
  {
    "s": "ying",
    "e": "🦅",
    "near": [
      "yin",
      "yun",
      "yi"
    ],
    "zi": [
      {
        "c": "鹰",
        "w": "老鹰",
        "e": "🦅",
        "p": "yīng"
      },
      {
        "c": "英",
        "w": "英雄",
        "e": "🦸",
        "p": "yīng"
      },
      {
        "c": "影",
        "w": "影子",
        "e": "🌑",
        "p": "yǐng"
      }
    ]
  }
];

  var WHOLE_MAP = {};
  WHOLE.forEach(function (x) { WHOLE_MAP[x.s] = x; });

  /* 展开成与 js/data.js 字库兼容的题目对象，app.js 可复用整套答题流程 */
  function wholeWords() {
    var out = [];
    WHOLE.forEach(function (item) {
      item.zi.forEach(function (z) {
        out.push({
          c: z.c, w: z.w, e: z.e, p: z.p, s: item.s,
          i: '', f: '', g: 0, unitName: '整体认读',
          tip: '「' + item.s + '」是整体认读音节，不用拼，要整个记住哦',
          answer: item.s
        });
      });
    });
    return out;
  }

  /* 形近干扰项：先取最易混的 3 个，不足再从其余 15 个里补 */
  function wholeDistractors(s, n) {
    var sh = window.PINYIN_DATA.shuffle;
    var item = WHOLE_MAP[s] || { near: [] };
    var pool = sh((item.near || []).slice());
    var others = sh(WHOLE.map(function (x) { return x.s; }).filter(function (x) {
      return x !== s && pool.indexOf(x) === -1;
    }));
    return pool.concat(others).slice(0, n);
  }

  return {
    CONFUSABLE: CONFUSABLE,
    WHOLE: WHOLE,
    wholeWords: wholeWords,
    wholeDistractors: wholeDistractors
  };
})();

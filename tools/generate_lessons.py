#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 js/lessons.js —— 易混声母口诀 + 16 个整体认读音节专项题库。

运行：pip install pypinyin && python tools/generate_lessons.py

说明：
  * 整体认读音节共 16 个，每个配 1~3 个例字；带调拼音由 pypinyin
    依据「组词」自动定音（多音字如「音乐」的乐读 yuè），并校验
    去调后确实等于该整体认读音节，避免人工写错声调。
  * 生成的 lessons.js 是纯静态数据，打开网页不需要 Python。
"""
import json
from pathlib import Path

from pypinyin import pinyin, Style

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'js' / 'lessons.js'

TONE_CHARS = set('āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ')
# 「一」在词组里会变调，教材按本调 yī 教
FORCE_SINGLE = set('一不')

# ---------------------------------------------------------------- 易混声母
CONFUSABLE = {
    'letters': ['b', 'p', 'd', 't', 'q'],
    'short': {
        'b': '像个 6 字 b b b',
        'p': '右上半圆 p p p',
        'd': '左下半圆 d d d',
        'q': '左上半圆 q q q',
        't': '伞柄朝下 t t t',
    },
    'tips': {
        'b': '像个 6 字 b b b：右下半圆，像收音机天线朝上 📻',
        'p': '右上半圆 p p p：泼水的时候要用力 💦',
        'd': '左下半圆 d d d：马蹄印子 d d d 🐎',
        'q': '左上半圆 q q q：气球飞上天 🎈',
        't': '伞柄朝下 t t t：像一个倒过来的小伞把 ☂️',
    },
    'banner': '6 字 b ｜ 反 6 d ｜ 右上 p ｜ 左上 q ｜ 伞把 t',
    'note': 'b、d 的肚子一个朝右一个朝左；p、q 的半圆都在上面，方向相反；t 像一把小伞。先看清方向再选！',
}

# ---------------------------------------------------------------- 整体认读音节
# 格式：(音节, 配图, 最易混的其它整体认读音节, [(例字, 组词, 配图), ...])
WHOLE = [
    ('zhi', '💡', ['chi', 'shi', 'zi'],
     [('知', '知道', '💡'), ('纸', '纸张', '📄'), ('直', '直线', '📏')]),
    ('chi', '🍚', ['zhi', 'shi', 'ci'],
     [('吃', '吃饭', '🍚'), ('尺', '尺子', '📐'), ('池', '池塘', '💧')]),
    ('shi', '🔟', ['zhi', 'chi', 'si'],
     [('十', '十个', '🔟'), ('石', '石头', '🪨'), ('狮', '狮子', '🦁')]),
    ('ri', '🌅', ['zi', 'chi', 'shi'],
     [('日', '日出', '🌅')]),
    ('zi', '📝', ['zhi', 'ci', 'si'],
     [('字', '汉字', '📝'), ('紫', '紫色', '🟣'), ('子', '孩子', '👶')]),
    ('ci', '📖', ['chi', 'zi', 'si'],
     [('词', '生词', '📖'), ('次', '一次', '1️⃣'), ('刺', '刺猬', '🦔')]),
    ('si', '4️⃣', ['shi', 'zi', 'ci'],
     [('四', '四个', '4️⃣'), ('丝', '丝线', '🧵'), ('思', '思考', '💭')]),
    ('yi', '1️⃣', ['yu', 'ye', 'wu'],
     [('一', '一个', '1️⃣'), ('衣', '衣服', '👕'), ('椅', '椅子', '🪑')]),
    ('wu', '5️⃣', ['yi', 'yu', 'ye'],
     [('五', '五个', '5️⃣'), ('屋', '屋子', '🏠'), ('乌', '乌云', '☁️')]),
    ('yu', '🐟', ['yi', 'wu', 'yue'],
     [('鱼', '小鱼', '🐟'), ('雨', '下雨', '🌧️'), ('玉', '玉石', '💎')]),
    ('ye', '🍃', ['yue', 'yi', 'yuan'],
     [('叶', '树叶', '🍃'), ('夜', '夜晚', '🌙'), ('爷', '爷爷', '👴')]),
    ('yue', '🌕', ['ye', 'yuan', 'yu'],
     [('月', '月亮', '🌕'), ('越', '越来越', '🏃'), ('乐', '音乐', '🎵')]),
    ('yuan', '⭕', ['yue', 'yu', 'yun'],
     [('圆', '圆形', '⭕'), ('元', '一元', '💰'), ('远', '远方', '🔭')]),
    ('yin', '🔊', ['ying', 'yun', 'yi'],
     [('音', '声音', '🔊'), ('银', '银色', '🥈'), ('因', '因为', '❓')]),
    ('yun', '☁️', ['yuan', 'yin', 'ying'],
     [('云', '白云', '☁️'), ('运', '运动', '⚽')]),
    ('ying', '🦅', ['yin', 'yun', 'yi'],
     [('鹰', '老鹰', '🦅'), ('英', '英雄', '🦸'), ('影', '影子', '🌑')]),
]


def has_tone(s):
    return any(ch in TONE_CHARS for ch in s)


def char_tone(char, word):
    """按组词确定单字带调读音；轻声 / 变调回退到本调。"""
    if char in FORCE_SINGLE:
        return pinyin(char, style=Style.TONE)[0][0]
    py = pinyin(word, style=Style.TONE)
    idx = word.index(char)
    if idx < len(py) and has_tone(py[idx][0]):
        return py[idx][0]
    cand = pinyin(char, style=Style.TONE)[0][0]
    if has_tone(cand):
        return cand
    for alt in pinyin(char, style=Style.TONE, heteronym=True)[0]:
        if has_tone(alt):
            return alt
    return ''


def char_normal(char, word):
    if char in FORCE_SINGLE:
        return pinyin(char, style=Style.NORMAL)[0][0]
    py = pinyin(word, style=Style.NORMAL)
    idx = word.index(char)
    return py[idx][0] if idx < len(py) else ''


TPL = """/* ============================================================
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

  var CONFUSABLE = __CONFUSABLE__;

  var WHOLE = __WHOLE__;

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
"""


def js(value):
    return json.dumps(value, ensure_ascii=False, indent=2)


def main():
    items, problems = [], []
    for s, emoji, near, zilist in WHOLE:
        zi = []
        for c, w, em in zilist:
            p = char_tone(c, w)
            normal = char_normal(c, w)
            if not p or normal != s:
                problems.append('%s(%s) 读音=%s 去调=%s 应属=%s' % (c, w, p, normal, s))
            zi.append({'c': c, 'w': w, 'e': em, 'p': p})
        items.append({'s': s, 'e': emoji, 'near': near, 'zi': zi})

    all_syllables = [x[0] for x in WHOLE]
    for item in items:
        for n in item['near']:
            if n not in all_syllables:
                problems.append('%s 的干扰项 %s 不在 16 个音节里' % (item['s'], n))
            if n == item['s']:
                problems.append('%s 的干扰项含自身' % item['s'])

    out = (TPL.replace('__CONFUSABLE__', js(CONFUSABLE))
              .replace('__WHOLE__', js(items)))
    OUT.write_text(out, encoding='utf-8', newline='\n')

    print('生成完成:', OUT)
    print('整体认读音节:', len(items), '个 | 例字题目:', sum(len(x['zi']) for x in items), '道')
    for item in items:
        print('  %-6s %s  %s' % (
            item['s'], item['e'],
            '  '.join(z['c'] + '=' + z['p'] for z in item['zi'])))
    print('校验问题:', problems if problems else '无')
    if problems:
        raise SystemExit(1)


if __name__ == '__main__':
    main()

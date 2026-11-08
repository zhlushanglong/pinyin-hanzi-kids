/* ============================================================
 * 拼音汉字乐园 · 主逻辑
 * 三种玩法：拼一拼 / 听音选字 / 组词小达人
 * 学习记录保存在浏览器 localStorage，不上传任何数据
 * ============================================================ */
(function () {
  'use strict';

  var D = window.PINYIN_DATA;
  var S = window.SoundKit;
  var $ = function (id) { return document.getElementById(id); };
  var STORE_KEY = 'pyhz_state_v1';

  var defaults = {
    stars: 0,
    combo: 0,
    bestCombo: 0,
    records: {},      // { '路': {try: 3, ok: 2} }
    wrongList: [],    // 需要复习的汉字
    settings: {
      mode: 'spell', unit: 'all', difficulty: 'easy',
      autoSpeak: true, sound: true, rate: 0.85, round: 10
    }
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaults));
      var s = JSON.parse(raw);
      s.settings = Object.assign({}, defaults.settings, s.settings || {});
      s.records = s.records || {};
      s.wrongList = s.wrongList || [];
      s.stars = s.stars || 0;
      s.bestCombo = s.bestCombo || 0;
      s.combo = s.combo || 0;
      return s;
    } catch (e) { return JSON.parse(JSON.stringify(defaults)); }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  var state = loadState();

  var session = {
    queue: [], index: 0, correct: 0, current: null,
    selections: { initial: null, final: null },
    answered: false, locked: false, reviewOnly: false,
    autoTimer: null, retryTimer: null
  };

  /* ---------------- 通用小工具 ---------------- */
  function toast(msg) {
    var root = $('toastRoot');
    root.innerHTML = '<div class="toast">' + msg + '</div>';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { root.innerHTML = ''; }, 2300);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function confetti() {
    var box = document.createElement('div');
    box.className = 'confetti';
    var colors = ['#ffca3a', '#ff7f9e', '#6aa9ff', '#22b8a6', '#b489f5', '#ff9f68'];
    for (var i = 0; i < 42; i++) {
      var p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (1.3 + Math.random() * 1.3) + 's';
      p.style.animationDelay = (Math.random() * 0.45) + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 3400);
  }

  /* ---------------- 首页 ---------------- */
  function renderUnits() {
    var html = '<button type="button" class="unit-chip' + (state.settings.unit === 'all' ? ' selected' : '') + '" data-unit="all"><span class="u-emoji">🌈</span> 全部汉字</button>';
    D.UNITS.forEach(function (u) {
      html += '<button type="button" class="unit-chip' + (state.settings.unit === u.id ? ' selected' : '') + '" data-unit="' + u.id + '"><span class="u-emoji">' + u.emoji + '</span> ' + u.name + '</button>';
    });
    $('unitGrid').innerHTML = html;
  }

  function renderStats() {
    var mastered = Object.keys(state.records).filter(function (k) { return state.records[k].ok > 0; }).length;
    $('statStars').textContent = state.stars;
    $('statMastered').textContent = mastered;
    $('statCombo').textContent = state.bestCombo;
    $('practiceStars').textContent = '⭐ ' + state.stars;
  }

  function syncSettingsUI() {
    $('swAutoSpeak').classList.toggle('on', !!state.settings.autoSpeak);
    $('swSound').classList.toggle('on', !!state.settings.sound);
    $('btnSound').textContent = state.settings.sound ? '🔊' : '🔇';
    $('rateRange').value = state.settings.rate;
    $('rateLabel').textContent = Number(state.settings.rate).toFixed(2) + ' 倍（慢一点更清楚）';
    Array.prototype.forEach.call($('roundSwitch').children, function (b) {
      b.classList.toggle('active', Number(b.dataset.n) === Number(state.settings.round));
    });
    Array.prototype.forEach.call($('difficultySwitch').children, function (b) {
      b.classList.toggle('active', b.dataset.diff === state.settings.difficulty);
    });
    Array.prototype.forEach.call($('modeGrid').children, function (b) {
      b.classList.toggle('selected', b.dataset.mode === state.settings.mode);
    });
    S.setEnabled(state.settings.sound);
  }

  /* ---------------- 出题 ---------------- */
  function wordsInScope() {
    if (state.settings.unit === 'all') return D.ALL_WORDS.slice();
    return D.ALL_WORDS.filter(function (w) { return w.unit === state.settings.unit; });
  }

  function buildQueue() {
    var pool = wordsInScope();
    if (session.reviewOnly) {
      var onlyWrong = pool.filter(function (w) { return state.wrongList.indexOf(w.c) !== -1; });
      if (onlyWrong.length) pool = onlyWrong;
    }
    var shuffled = D.shuffle(pool);
    // 错字优先出现在前面，温故而知新
    var review = shuffled.filter(function (w) { return state.wrongList.indexOf(w.c) !== -1; });
    var rest = shuffled.filter(function (w) { return state.wrongList.indexOf(w.c) === -1; });
    var queue = review.concat(rest);
    var n = Number(state.settings.round);
    while (queue.length < n && pool.length) {
      var more = D.shuffle(pool);
      for (var i = 0; i < more.length && queue.length < n; i++) {
        if (i > 0 || queue.length === 0 || queue[queue.length - 1].c !== more[i].c) queue.push(more[i]);
      }
    }
    session.queue = queue.slice(0, n);
  }

  function startSession(reviewOnly) {
    clearTimeout(session.autoTimer);
    clearTimeout(session.retryTimer);
    session = {
      queue: [], index: 0, correct: 0, current: null,
      selections: { initial: null, final: null },
      answered: false, locked: false, reviewOnly: !!reviewOnly,
      autoTimer: null, retryTimer: null
    };
    buildQueue();
    $('homeView').classList.add('hidden');
    $('practiceView').classList.remove('hidden');
    $('btnBack').classList.remove('hidden');
    S.unlock();                       // 首次点击解锁浏览器音频
    if (reviewOnly && state.wrongList.length === 0) toast('太棒啦，目前没有错字要复习 🎉');
    nextQuestion();
  }

  function nextQuestion() {
    clearTimeout(session.autoTimer);
    clearTimeout(session.retryTimer);
    if (session.index >= session.queue.length) { showReport(); return; }

    session.answered = false;
    session.locked = false;
    session.selections = { initial: null, final: null };
    session.current = session.queue[session.index];

    var mode = state.settings.mode;
    $('stageTag').textContent = mode === 'spell' ? '🧩 拼一拼' : mode === 'listen' ? '👂 听音选字' : '🍎 组词小达人';
    $('practiceTip').textContent = mode === 'spell'
      ? '先点声母，再点韵母，拼出这个字的读音～ 答错也没关系，再听一次就好啦！'
      : mode === 'listen'
        ? '点大喇叭多听几遍，从四个汉字里找出你听到的那个字。'
        : '看看这个字，选出它能组成的好词语。';

    renderQuestion();
    renderChoices();
    updateProgress();

    $('feedback').className = 'feedback neutral';
    $('feedback').textContent = mode === 'spell' ? '听一听，然后选出声母和韵母吧 🎧' : mode === 'listen' ? '仔细听，再选出对应的字 👂' : '想一想，这个字能组成哪个词？🤔';
    $('btnNext').classList.add('hidden');
    $('overlay').classList.add('hidden');

    if (state.settings.autoSpeak) setTimeout(function () { speakCurrent(); }, 380);
  }

  function updateProgress() {
    var total = session.queue.length;
    $('progressLabel').textContent = '第 ' + (session.index + 1) + ' / ' + total + ' 题';
    $('progressFill').style.width = (session.index / total * 100) + '%';
  }

  /* ---------------- 题面渲染 ---------------- */
  var GRID_SVG = '<svg viewBox="0 0 560 118" preserveAspectRatio="none" aria-hidden="true">'
    + '<rect x="1" y="1" width="558" height="116" rx="14" fill="#ffffff" stroke="#dceff0" stroke-width="2"/>'
    + '<line x1="2" y1="40" x2="558" y2="40" stroke="#8bd3d8" stroke-width="2"/>'
    + '<line x1="2" y1="79" x2="558" y2="79" stroke="#8bd3d8" stroke-width="2"/>'
    + '</svg>';

  var TIANZI_SVG = '<svg viewBox="0 0 132 132" aria-hidden="true">'
    + '<rect x="2" y="2" width="128" height="128" rx="9" fill="#fffdf7" stroke="#efb9b9" stroke-width="2"/>'
    + '<line x1="66" y1="3" x2="66" y2="129" stroke="#f0c9c9" stroke-width="1.5" stroke-dasharray="6 5"/>'
    + '<line x1="3" y1="66" x2="129" y2="66" stroke="#f0c9c9" stroke-width="1.5" stroke-dasharray="6 5"/>'
    + '<line x1="4" y1="4" x2="128" y2="128" stroke="#f7dcdc" stroke-width="1.2" stroke-dasharray="5 7"/>'
    + '<line x1="128" y1="4" x2="4" y2="128" stroke="#f7dcdc" stroke-width="1.2" stroke-dasharray="5 7"/>'
    + '</svg>';

  function renderQuestion() {
    var w = session.current;
    var mode = state.settings.mode;
    var html = '';

    if (mode === 'spell') {
      html += '<div class="pinyin-grid">' + GRID_SVG
        + '<div class="pinyin-slots"><span class="slot placeholder" id="slotInitial">?</span><span class="slot placeholder" id="slotFinal">?</span></div>'
        + '</div>';
      html += '<div class="hanzi-row">'
        + '<div class="tianzi">' + TIANZI_SVG + '<div class="zi">' + esc(w.c) + '</div></div>'
        + '<div class="hanzi-info">'
        + '<div class="word-emoji">' + w.e + '</div>'
        + '<div class="word-main">' + esc(w.w) + '</div>'
        + '<div class="word-pinyin" id="answerPinyin">拼一拼，读音是？</div>'
        + '<div class="word-sentence">' + esc(w.s) + '</div>'
        + (w.tip ? '<div class="tip-line">💡 ' + esc(w.tip) + '</div>' : '')
        + '</div></div>';
    } else if (mode === 'listen') {
      html += '<div class="listen-box">'
        + '<button type="button" class="listen-btn" id="bigSpeak" aria-label="播放读音">🔊</button>'
        + '<div class="listen-tip">点喇叭听一听，选出你听到的字</div>'
        + '</div>';
    } else {
      html += '<div class="hanzi-row" style="margin-top:26px">'
        + '<div class="tianzi">' + TIANZI_SVG + '<div class="zi">' + esc(w.c) + '</div></div>'
        + '<div class="hanzi-info">'
        + '<div class="word-emoji">' + w.e + '</div>'
        + '<div class="word-pinyin" style="font-size:34px">' + esc(w.p) + '</div>'
        + '<div class="word-sentence">这个字能组成哪个词呢？<br>选对了就有掌声哦 👏</div>'
        + '</div></div>';
    }
    $('questionArea').innerHTML = html;
    if (mode === 'listen') {
      $('bigSpeak').addEventListener('click', function () { S.tap(); speakCurrent(); });
    }
  }

  function choiceHTML(value, kind, extra) {
    var label = kind === 'initial' ? '<span class="kind">声母</span>'
      : kind === 'final' ? '<span class="kind">韵母</span>' : '';
    return '<button type="button" class="choice ' + (extra || '') + '" data-kind="' + kind + '" data-value="' + esc(value) + '">'
      + '<span>' + esc(value) + '</span>' + label + '</button>';
  }

  function renderChoices() {
    var w = session.current;
    var mode = state.settings.mode;
    var html = '';

    if (mode === 'spell') {
      var hard = state.settings.difficulty === 'hard';
      var initials = hard ? D.shuffle([w.i].concat(D.distractorInitials(w.i, 3))) : [w.i];
      var finals = hard
        ? D.shuffle([w.f].concat(D.distractorFinals(w.f, 5)))
        : D.shuffle([w.f].concat(D.distractorFinals(w.f, 2)));

      if (hard) {
        html += '<div class="choice-group"><div class="choice-label">① 先找声母</div><div class="choice-list">';
        initials.forEach(function (v) { html += choiceHTML(v, 'initial'); });
        html += '</div></div>';
        html += '<div class="choice-group"><div class="choice-label">② 再找韵母（看清声调哦）</div><div class="choice-list">';
        finals.forEach(function (v) { html += choiceHTML(v, 'final'); });
        html += '</div></div>';
      } else {
        // 简单模式：1 个声母 + 3 个韵母混排，和课本练习一样
        var mixed = [{ v: w.i, k: 'initial' }].concat(finals.map(function (f) { return { v: f, k: 'final' }; }));
        html += '<div class="choice-group"><div class="choice-label">从下面找出声母和韵母</div><div class="choice-list">';
        D.shuffle(mixed).forEach(function (o) { html += choiceHTML(o.v, o.k); });
        html += '</div></div>';
      }
    } else if (mode === 'listen') {
      var others = D.ALL_WORDS.filter(function (x) { return x.c !== w.c; });
      var similar = others.filter(function (x) { return x.f === w.f || x.i === w.i; });
      var picked = D.pick(similar, 2);
      picked = picked.concat(D.pick(others.filter(function (x) { return picked.indexOf(x) === -1; }), 3 - picked.length));
      var chars = D.shuffle([w.c].concat(picked.map(function (x) { return x.c; })));
      html += '<div class="choice-group"><div class="choice-label">哪个是刚才读到的字？</div><div class="choice-list">';
      chars.forEach(function (c) { html += choiceHTML(c, 'single', 'text'); });
      html += '</div></div>';
    } else {
      // 干扰词都是题库里的真词，但不能含有当前汉字（否则也能组成词，会造成误判）
      var pool = D.ALL_WORDS.filter(function (x) {
        return x.w !== w.w && x.w.indexOf(w.c) === -1;
      });
      var uniqueWords = [];
      pool.forEach(function (x) { if (uniqueWords.indexOf(x.w) === -1) uniqueWords.push(x.w); });
      var words = D.pick(uniqueWords, 3);
      var opts = D.shuffle([w.w].concat(words));
      html += '<div class="choice-group"><div class="choice-label">选出正确的组词</div><div class="choice-list">';
      opts.forEach(function (v) { html += choiceHTML(v, 'single', 'text small'); });
      html += '</div></div>';
    }
    $('choices').innerHTML = html;
  }

  /* ---------------- 作答 ---------------- */
  function onChoiceClick(el) {
    if (session.locked || session.answered) return;
    var kind = el.dataset.kind;
    var value = el.dataset.value;
    S.tap();

    if (kind === 'initial' || kind === 'final') {
      Array.prototype.forEach.call(document.querySelectorAll('.choice[data-kind="' + kind + '"]'), function (x) {
        x.classList.remove('selected');
      });
      el.classList.add('selected');
      session.selections[kind] = value;
      updateSlots();
      if (session.selections.initial && session.selections.final) checkSpell();
      else {
        $('feedback').className = 'feedback neutral';
        $('feedback').textContent = kind === 'initial' ? '声母选好啦，再选一个韵母吧 👍' : '韵母选好啦，还差一个声母哦 👍';
      }
    } else {
      checkSingle(value, el);
    }
  }

  function updateSlots() {
    var a = $('slotInitial'), b = $('slotFinal');
    if (!a || !b) return;
    var si = session.selections.initial, sf = session.selections.final;
    a.textContent = si || '?';
    a.className = 'slot' + (si ? ' pop' : ' placeholder');
    b.textContent = sf || '?';
    b.className = 'slot' + (sf ? ' pop' : ' placeholder');
  }

  function checkSpell() {
    var w = session.current;
    var ok = session.selections.initial === w.i && session.selections.final === w.f;
    session.locked = true;
    if (ok) { onCorrect(); return; }
    Array.prototype.forEach.call($('choices').querySelectorAll('.choice'), function (x) {
      if (x.classList.contains('selected')) {
        var isRight = (x.dataset.kind === 'initial' && x.dataset.value === w.i) ||
                      (x.dataset.kind === 'final' && x.dataset.value === w.f);
        if (!isRight) x.classList.add('wrongpick');
      }
    });
    onWrong();
  }

  function checkSingle(value, el) {
    var w = session.current;
    var right = state.settings.mode === 'listen' ? w.c : w.w;
    session.locked = true;
    if (value === right) { el.classList.add('correct'); onCorrect(); return; }
    el.classList.add('wrongpick');
    onWrong();
  }

  function onCorrect() {
    var w = session.current;
    session.answered = true;
    session.correct++;
    state.stars++;
    state.combo++;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    var rec = state.records[w.c] || { try: 0, ok: 0 };
    rec.ok++; rec.try++;
    state.records[w.c] = rec;
    var wi = state.wrongList.indexOf(w.c);
    if (wi !== -1) state.wrongList.splice(wi, 1);
    saveState();
    renderStats();

    S.cheer();                       // 掌声 + 上行音
    confetti();

    if (state.settings.mode === 'spell') {
      $('slotInitial').textContent = w.i;
      $('slotFinal').textContent = w.f;
      $('slotInitial').className = 'slot correct-text pop';
      $('slotFinal').className = 'slot correct-text pop';
      var ap = $('answerPinyin');
      if (ap) { ap.textContent = w.p + ' · ' + w.w; ap.style.color = '#17a06a'; }
    }
    Array.prototype.forEach.call($('choices').querySelectorAll('.choice'), function (x) { x.classList.add('dim'); });
    $('feedback').className = 'feedback ok';
    $('feedback').textContent = '🎉 答对啦！' + w.c + '，' + w.w + '　　' + w.p;
    $('cheerSub').textContent = w.p + ' · ' + w.w;
    $('overlay').classList.remove('hidden');
    $('btnNext').classList.remove('hidden');
    $('progressFill').style.width = ((session.index + 1) / session.queue.length * 100) + '%';

    // 掌声稍后再读一遍，让孩子听清正确读音
    setTimeout(function () { speakText(w.c + '，' + w.w); }, 950);
    session.autoTimer = setTimeout(function () { if (session.answered) goNext(); }, 2600);
  }

  function onWrong() {
    var w = session.current;
    state.combo = 0;
    var rec = state.records[w.c] || { try: 0, ok: 0 };
    rec.try++;
    state.records[w.c] = rec;
    if (state.wrongList.indexOf(w.c) === -1) state.wrongList.push(w.c);
    saveState();
    S.wrong();
    $('feedback').className = 'feedback no';
    $('feedback').textContent = '再想一想～ 点「🔊 再听一遍」听听读音吧！';
    session.retryTimer = setTimeout(function () {
      speakCurrent();
      session.retryTimer = setTimeout(function () {
        session.selections = { initial: null, final: null };
        session.locked = false;
        Array.prototype.forEach.call($('choices').querySelectorAll('.choice'), function (x) {
          x.classList.remove('selected', 'wrongpick');
        });
        updateSlots();
        $('feedback').className = 'feedback neutral';
        $('feedback').textContent = '没关系，再试一次，你可以的 💪';
      }, 620);
    }, 530);
  }

  function goNext() {
    clearTimeout(session.autoTimer);
    if (!session.answered) return;
    session.index++;
    nextQuestion();
  }

  function speakText(text) {
    if (!state.settings.sound) { toast('声音已关闭，点右上角 🔊 可以打开'); return; }
    var ok = S.speak(text, { rate: state.settings.rate });
    if (!ok) toast('当前浏览器不支持朗读，建议用 Edge 或 Chrome 打开 🙂');
  }

  function speakCurrent() {
    var w = session.current;
    if (!w) return;
    var text = state.settings.mode === 'word' ? w.c : (w.c + '，' + w.w);
    speakText(text);
  }

  /* ---------------- 一轮结束报告 ---------------- */
  function showReport() {
    S.stopSpeak();
    var total = session.queue.length;
    var pct = total ? Math.round(session.correct / total * 100) : 0;
    var emoji = pct >= 90 ? '🏆' : pct >= 60 ? '🎉' : '💪';
    var title = pct >= 90 ? '太厉害啦！' : pct >= 60 ? '完成得不错！' : '继续加油！';
    $('modalRoot').innerHTML = '<div class="modal-mask"><div class="modal">'
      + '<div class="report-emoji">' + emoji + '</div>'
      + '<h2>' + title + '</h2>'
      + '<p style="color:#607d8d;margin:0">这一轮你一共得到了 ' + session.correct + ' 颗星星</p>'
      + '<div class="report-grid">'
      + '<div><b>' + total + '</b><small>本轮题目</small></div>'
      + '<div><b>' + session.correct + '</b><small>答对</small></div>'
      + '<div><b>' + pct + '%</b><small>正确率</small></div>'
      + '</div>'
      + '<button class="btn btn-primary" id="btnAgain">再来一轮 🔁</button>'
      + '<button class="btn btn-soft" id="btnGoHome">回首页 🏠</button>'
      + '</div></div>';
    $('btnAgain').addEventListener('click', function () {
      $('modalRoot').innerHTML = '';
      startSession(false);
    });
    $('btnGoHome').addEventListener('click', function () {
      $('modalRoot').innerHTML = '';
      goHome();
    });
  }

  function goHome() {
    clearTimeout(session.autoTimer);
    clearTimeout(session.retryTimer);
    S.stopSpeak();
    $('practiceView').classList.add('hidden');
    $('homeView').classList.remove('hidden');
    $('btnBack').classList.add('hidden');
    $('modalRoot').innerHTML = '';
    renderStats();
    renderUnits();
  }

  /* ---------------- 事件绑定 ---------------- */
  $('unitGrid').addEventListener('click', function (e) {
    var b = e.target.closest('.unit-chip');
    if (!b) return;
    state.settings.unit = b.dataset.unit;
    saveState(); renderUnits(); S.tap();
  });
  $('modeGrid').addEventListener('click', function (e) {
    var b = e.target.closest('.mode-card');
    if (!b) return;
    state.settings.mode = b.dataset.mode;
    saveState(); syncSettingsUI(); S.tap();
  });
  $('modeGrid').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var b = e.target.closest('.mode-card');
      if (b) { e.preventDefault(); b.click(); }
    }
  });
  $('difficultySwitch').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    state.settings.difficulty = b.dataset.diff;
    saveState(); syncSettingsUI(); S.tap();
    if (!$('practiceView').classList.contains('hidden')) toast('已切换为「' + (b.dataset.diff === 'easy' ? '简单' : '困难') + '」，下一题生效');
  });
  $('btnStart').addEventListener('click', function () { startSession(false); });
  $('btnReview').addEventListener('click', function () { startSession(true); });
  $('btnBack').addEventListener('click', goHome);
  $('btnNext').addEventListener('click', goNext);
  $('btnSkip').addEventListener('click', function () {
    if (session.answered) return;
    state.combo = 0; saveState();
    session.index++;
    nextQuestion();
  });
  $('btnSpeak').addEventListener('click', function () { S.tap(); speakCurrent(); });
  $('choices').addEventListener('click', function (e) {
    var el = e.target.closest('.choice');
    if (el) onChoiceClick(el);
  });

  $('btnSettings').addEventListener('click', function () {
    $('settingsPanel').classList.toggle('hidden');
    S.tap();
  });
  $('swAutoSpeak').addEventListener('click', function () {
    state.settings.autoSpeak = !state.settings.autoSpeak;
    saveState(); syncSettingsUI(); S.tap();
  });
  $('btnSound').addEventListener('click', function () {
    state.settings.sound = !state.settings.sound;
    saveState(); syncSettingsUI();
    if (state.settings.sound) S.tap();
    toast(state.settings.sound ? '声音已打开 🔊' : '声音已关闭 🔇');
  });
  $('swSound').addEventListener('click', function () {
    state.settings.sound = !state.settings.sound;
    saveState(); syncSettingsUI(); S.tap();
  });
  $('rateRange').addEventListener('input', function () {
    state.settings.rate = parseFloat(this.value);
    saveState(); syncSettingsUI();
  });
  $('roundSwitch').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    state.settings.round = Number(b.dataset.n);
    saveState(); syncSettingsUI(); S.tap();
  });
  $('btnReset').addEventListener('click', function () {
    if (!window.confirm('确定要清空所有星星和学习记录吗？')) return;
    var keep = state.settings;
    state = JSON.parse(JSON.stringify(defaults));
    state.settings = keep;
    saveState(); renderStats(); syncSettingsUI();
    toast('记录已清空，重新出发 🌱');
  });

  document.addEventListener('keydown', function (e) {
    if ($('practiceView').classList.contains('hidden')) return;
    if (e.key >= '1' && e.key <= '9') {
      var list = $('choices').querySelectorAll('.choice');
      var el = list[Number(e.key) - 1];
      if (el) { e.preventDefault(); el.click(); }
    } else if (e.code === 'Space') {
      e.preventDefault(); speakCurrent();
    } else if (e.key === 'Enter') {
      if (!$('btnNext').classList.contains('hidden')) { e.preventDefault(); goNext(); }
    }
  });

  // 页面重新可见时恢复音频上下文
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) S.unlock();
  });

  /* ---------------- 启动 ---------------- */
  renderUnits();
  renderStats();
  syncSettingsUI();
})();

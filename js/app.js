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
      mode: 'spell', difficulty: 'easy', grades: [1],
      autoSpeak: true, sound: true, rate: 0.85, round: 10,
      eyeCare: true, studyMinutes: 15
    }
  };

  var VALID_GRADES = [1, 2, 3, 4, 5, 6];
  var STUDY_OPTIONS = [10, 15, 20, 30];
  function normalizeStudyMinutes(v) {
    v = Number(v);
    return STUDY_OPTIONS.indexOf(v) !== -1 ? v : 15;
  }
  function normalizeGrades(v) {
    if (!Array.isArray(v)) return [1];
    var out = [];
    v.forEach(function (g) {
      g = Number(g);
      if (VALID_GRADES.indexOf(g) !== -1 && out.indexOf(g) === -1) out.push(g);
    });
    return out.length ? out.sort(function (a, b) { return a - b; }) : [1];
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaults));
      var s = JSON.parse(raw);
      s.settings = Object.assign({}, defaults.settings, s.settings || {});
      s.settings.grades = normalizeGrades(s.settings.grades);
      s.settings.studyMinutes = normalizeStudyMinutes(s.settings.studyMinutes);
      s.settings.eyeCare = s.settings.eyeCare !== false;
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
    autoTimer: null, retryTimer: null, speakTimer: null
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

  /* ============================================================
   * 护眼休息：学习满设定分钟 → 强制锁定 5 分钟
   * - 只累计「练习页可见」的时间，回首页切后台不计时
   * - 累计时长与休息截止时间戳存在独立的 localStorage，刷新、
   *   重开标签页、清空学习记录都不能跳过休息
   * - 休息倒计时同时按墙钟和单调递减双重校验，改系统时间不会
   *   让倒计时瞬间跳完
   * ============================================================ */
  var EYE_KEY = 'pyhz_eyecare_v1';
  var REST_MS = 5 * 60 * 1000;
  var RING_LEN = 527.79;               // 2πr, r = 84
  var REST_TIPS = [
    '👀 看看窗外远处的绿树',
    '🙆 站起来伸个大懒腰',
    '💧 喝几口水，润润嗓子',
    '👐 搓热手心，轻轻敷敷眼睛',
    '🚶 在屋里慢慢走一走'
  ];

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function freshEye() {
    return { day: todayKey(), ms: 0, lockUntil: 0, restLeft: 0, restCount: 0, lastNow: Date.now() };
  }
  function loadEye() {
    var blank = freshEye();
    try {
      var raw = localStorage.getItem(EYE_KEY);
      if (!raw) return blank;
      var e = JSON.parse(raw) || {};
      var out = {
        day: typeof e.day === 'string' ? e.day : blank.day,
        ms: Math.max(0, Number(e.ms) || 0),
        lockUntil: Math.max(0, Number(e.lockUntil) || 0),
        restLeft: typeof e.restLeft === 'number' ? Math.max(0, e.restLeft) : (e.lockUntil ? REST_MS : 0),
        restCount: Math.max(0, Number(e.restCount) || 0),
        lastNow: Number(e.lastNow) || blank.lastNow
      };
      // 新的一天：学习时长与休息状态重新开始
      return out.day === todayKey() ? out : blank;
    } catch (err) { return blank; }
  }
  function saveEye() {
    try { localStorage.setItem(EYE_KEY, JSON.stringify(eye)); } catch (e) {}
  }
  var eye = loadEye();
  var eyeLastTick = Date.now();

  function isResting() { return eye.lockUntil > 0; }
  function parentGateOpen() { return !$('parentGate').classList.contains('hidden'); }
  function fmtClock(ms) {
    var s = Math.ceil(Math.max(0, ms) / 1000);
    return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2);
  }
  function fmtLeft(ms) {
    var s = Math.ceil(Math.max(0, ms) / 1000);
    var m = Math.floor(s / 60);
    return m > 0 ? m + ' 分 ' + (s % 60) + ' 秒' : (s % 60) + ' 秒';
  }

  function renderEyeUI() {
    var strip = $('eyeStrip');
    var on = !!state.settings.eyeCare;
    var limit = Number(state.settings.studyMinutes) * 60000;
    strip.classList.toggle('off', !on);
    strip.classList.toggle('resting', isResting());
    $('eyeBadge').textContent = '今日休息 ' + eye.restCount + ' 次';

    if (isResting()) {
      $('eyeStatus').textContent = '😴 护眼休息中';
      $('eyeCountdown').textContent = '还有 ' + fmtLeft(eye.restLeft) + ' 可以继续学习';
      $('eyeFill').style.width = Math.min(100, eye.restLeft / REST_MS * 100) + '%';
    } else if (!on) {
      $('eyeStatus').textContent = '护眼休息已关闭（家长可开启）';
      $('eyeCountdown').textContent = '';
      $('eyeFill').style.width = '0%';
    } else {
      var used = Math.min(limit, eye.ms);
      $('eyeStatus').textContent = '今天已认真学 ' + Math.floor(used / 60000) + ' 分 '
        + Math.floor(used % 60000 / 1000) + ' 秒';
      $('eyeCountdown').textContent = '距离休息还有 ' + fmtLeft(limit - used);
      $('eyeFill').style.width = (used / limit * 100) + '%';
    }
  }

  function renderRestClock() {
    var left = eye.restLeft;
    $('restTime').textContent = fmtClock(left);
    var ratio = Math.max(0, Math.min(1, left / REST_MS));
    $('restRing').style.strokeDashoffset = (RING_LEN * (1 - ratio)).toFixed(2);
    var passed = Math.min(REST_TIPS.length, Math.floor((REST_MS - left) / 60000));
    $('restTip').textContent = REST_TIPS[Math.min(REST_TIPS.length - 1, passed)];
    var dots = '';
    for (var i = 0; i < 5; i++) dots += '<i class="' + (i < passed ? 'on' : '') + '"></i>';
    $('restDots').innerHTML = dots;
  }

  function showRestOverlay() {
    $('restStudyMin').textContent = state.settings.studyMinutes;
    $('restOverlay').classList.remove('hidden');
    document.body.classList.add('rest-lock');
    renderRestClock();
  }
  function hideRestOverlay() {
    $('restOverlay').classList.add('hidden');
    document.body.classList.remove('rest-lock');
  }
  function stopPracticeTimers() {
    clearTimeout(session.autoTimer);
    clearTimeout(session.retryTimer);
    clearTimeout(session.speakTimer);
    S.stopSpeak();
  }

  function startRest() {
    var now = Date.now();
    eye.lockUntil = now + REST_MS;
    eye.restLeft = REST_MS;
    eye.ms = 0;                       // 休息结束后重新累计
    eye.restCount++;
    eye.lastNow = now;
    eyeLastTick = now;
    saveEye();
    stopPracticeTimers();
    $('overlay').classList.add('hidden');
    $('modalRoot').innerHTML = '';
    closeParentGate();
    showRestOverlay();
    renderEyeUI();
    S.tap();
  }

  function finishRest(silent) {
    var now = Date.now();
    eye.lockUntil = 0;
    eye.restLeft = 0;
    eye.ms = 0;
    eye.lastNow = now;
    eyeLastTick = now;
    saveEye();
    hideRestOverlay();
    renderEyeUI();
    if (!silent) {
      // 休息前正在做题：重新呈现当前这一题，不推进进度
      if (!$('practiceView').classList.contains('hidden') && session.current) nextQuestion();
      toast('休息好啦，继续闯关吧 🌈');
    }
  }

  function initEye() {
    var now = Date.now();
    if (eye.lockUntil) {
      // 关掉页面期间也算在休息，把离线时间从剩余秒数里扣掉
      var away = Math.max(0, now - eye.lastNow);
      eye.restLeft = Math.max(0, eye.restLeft - away);
      if (eye.restLeft <= 0) {
        eye.lockUntil = 0; eye.restLeft = 0; eye.ms = 0;
      } else {
        showRestOverlay();
      }
    }
    eye.lastNow = now;
    eyeLastTick = now;
    saveEye();
    renderEyeUI();
  }

  function eyeTick() {
    // 跨过零点：新的一天重新累计
    if (eye.day !== todayKey()) {
      var wasResting = isResting();
      eye = freshEye();
      eyeLastTick = Date.now();
      saveEye();
      if (wasResting) hideRestOverlay();
      renderEyeUI();
      return;
    }

    var now = Date.now();
    // 系统时间被往回拨：把截止时间一起后移，保持剩余休息时长不变
    var rolledBack = now < eye.lastNow - 5000;
    if (rolledBack && eye.lockUntil) eye.lockUntil += eye.lastNow - now;
    eye.lastNow = now;
    var raw = Math.max(0, now - eyeLastTick);
    eyeLastTick = now;
    var studyDelta = raw > 3000 ? 0 : raw;      // 后台/休眠的空档不算学习
    // 休息按真实经过时间递减，单次最多 60 秒；时间回拨时按 1 秒兜底，避免倒计时冻住
    var restDelta = rolledBack ? 1000 : Math.min(raw, 60000);

    if (isResting()) {
      eye.restLeft = Math.max(0, eye.restLeft - restDelta);
      if (eye.restLeft <= 0) finishRest(false);
      else { renderRestClock(); renderEyeUI(); saveEye(); }
      return;
    }
    if (!state.settings.eyeCare) { renderEyeUI(); saveEye(); return; }

    var practicing = !$('practiceView').classList.contains('hidden');
    var visible = !document.hidden;
    var reportOpen = $('modalRoot').innerHTML.trim() !== '';
    if (practicing && visible && !reportOpen) {
      eye.ms += studyDelta;
      if (eye.ms >= Number(state.settings.studyMinutes) * 60000) { startRest(); return; }
      saveEye();
    }
    renderEyeUI();
  }

  /* 家长验证：避免小朋友自己关掉护眼模式 */
  var parentCheck = null, parentAction = null;
  function closeParentGate() {
    $('parentGate').classList.add('hidden');
    parentCheck = null; parentAction = null;
  }
  function askParent(action, force) {
    if (isResting() && !force) return;
    var a = 6 + Math.floor(Math.random() * 4);
    var b = 7 + Math.floor(Math.random() * 6);
    $('parentQuestion').textContent = a + ' × ' + b + ' = ?';
    $('parentAnswer').value = '';
    $('parentError').classList.add('hidden');
    parentCheck = function (v) { return v.trim() !== '' && Number(v) === a * b; };
    parentAction = action;
    $('parentGate').classList.remove('hidden');
    setTimeout(function () { $('parentAnswer').focus(); }, 30);
  }
  function submitParent() {
    if (parentCheck && parentCheck($('parentAnswer').value)) {
      var act = parentAction;
      closeParentGate();
      if (act) act();
      toast('已由家长确认 ✅');
    } else {
      $('parentError').classList.remove('hidden');
      $('parentAnswer').select();
    }
  }

  /* ---------------- 首页：年级选择 ---------------- */
  function renderGrades() {
    var html = '';
    D.GRADES.forEach(function (g) {
      var on = state.settings.grades.indexOf(g.n) !== -1;
      html += '<button type="button" class="unit-chip grade-chip' + (on ? ' selected' : '') + '" data-grade="' + g.n + '" aria-pressed="' + on + '">'
        + '<span class="u-emoji">' + g.emoji + '</span> ' + esc(g.name)
        + '<small>' + g.count + ' 字</small></button>';
    });
    $('gradeGrid').innerHTML = html;
    var chosen = state.settings.grades.map(function (n) {
      return D.GRADES[n - 1] ? D.GRADES[n - 1].name : (n + '年级');
    }).join('、');
    $('scopeHint').textContent = '已选 ' + D.wordsForGrades(state.settings.grades).length
      + ' 字（' + chosen + '）· 全库 ' + D.ALL_WORDS.length + ' 字';
  }

  function renderGradeChecks() {
    var html = '';
    D.GRADES.forEach(function (g) {
      var on = state.settings.grades.indexOf(g.n) !== -1;
      html += '<button type="button" class="grade-check' + (on ? ' on' : '') + '" data-grade="' + g.n + '" aria-pressed="' + on + '">'
        + (on ? '✓ ' : '') + esc(g.name) + '</button>';
    });
    html += '<button type="button" class="grade-check quick" data-action="all">全选 6 个年级</button>'
      + '<button type="button" class="grade-check quick" data-action="g1">只学一年级</button>';
    $('gradeChecks').innerHTML = html;
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
    $('swEyeCare').classList.toggle('on', !!state.settings.eyeCare);
    Array.prototype.forEach.call($('studyMinutesSwitch').children, function (b) {
      b.classList.toggle('active', Number(b.dataset.n) === Number(state.settings.studyMinutes));
    });
    S.setEnabled(state.settings.sound);
    renderGrades();
    renderGradeChecks();
    renderEyeUI();
  }

  /* ---------------- 出题 ---------------- */
  function wordsInScope() {
    var pool = D.wordsForGrades(state.settings.grades);
    return pool.length ? pool : D.ALL_WORDS.slice();
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
    if (isResting()) return;
    stopPracticeTimers();
    session = {
      queue: [], index: 0, correct: 0, current: null,
      selections: { initial: null, final: null },
      answered: false, locked: false, reviewOnly: !!reviewOnly,
      autoTimer: null, retryTimer: null, speakTimer: null
    };
    buildQueue();
    $('homeView').classList.add('hidden');
    $('practiceView').classList.remove('hidden');
    document.body.classList.add('view-practice');
    $('btnBack').classList.remove('hidden');
    S.unlock();                       // 首次点击解锁浏览器音频
    if (reviewOnly && state.wrongList.length === 0) toast('太棒啦，目前没有错字要复习 🎉');
    nextQuestion();
  }

  function nextQuestion() {
    clearTimeout(session.autoTimer);
    clearTimeout(session.retryTimer);
    clearTimeout(session.speakTimer);
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
        + '<div class="grade-tag">📚 ' + esc(w.unitName || (w.g + '年级')) + '</div>'
        + '<div class="word-pinyin" id="answerPinyin">拼一拼，读音是？</div>'
        + (w.s ? '<div class="word-sentence">' + esc(w.s) + '</div>' : '')
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
        + '<div class="grade-tag">📚 ' + esc(w.unitName || (w.g + '年级')) + '</div>'
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
      var others = wordsInScope().filter(function (x) { return x.c !== w.c; });
      var similar = others.filter(function (x) { return x.f === w.f || x.i === w.i; });
      var picked = D.pick(similar, 2);
      picked = picked.concat(D.pick(others.filter(function (x) { return picked.indexOf(x) === -1; }), 3 - picked.length));
      var chars = D.shuffle([w.c].concat(picked.map(function (x) { return x.c; })));
      html += '<div class="choice-group"><div class="choice-label">哪个是刚才读到的字？</div><div class="choice-list">';
      chars.forEach(function (c) { html += choiceHTML(c, 'single', 'text'); });
      html += '</div></div>';
    } else {
      // 干扰词都是题库里的真词，但不能含有当前汉字（否则也能组成词，会造成误判）
      var pool = wordsInScope().filter(function (x) {
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
    if (isResting() || session.locked || session.answered) return;
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
    session.speakTimer = setTimeout(function () { speakText(w.c + '，' + w.w); }, 950);
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
    stopPracticeTimers();
    $('practiceView').classList.add('hidden');
    $('homeView').classList.remove('hidden');
    document.body.classList.remove('view-practice');
    $('btnBack').classList.add('hidden');
    $('modalRoot').innerHTML = '';
    renderStats();
    syncSettingsUI();
  }

  /* ---------------- 事件绑定 ---------------- */
  function applyGrades(list) {
    state.settings.grades = normalizeGrades(list);
    saveState(); syncSettingsUI(); S.tap();
  }
  function toggleGrade(n) {
    var i = state.settings.grades.indexOf(n);
    if (i !== -1) {
      if (state.settings.grades.length === 1) { toast('至少要留一个年级哦 🙂'); return; }
      state.settings.grades.splice(i, 1);
    } else {
      state.settings.grades.push(n);
    }
    applyGrades(state.settings.grades);
  }
  $('gradeGrid').addEventListener('click', function (e) {
    var b = e.target.closest('.grade-chip');
    if (b) toggleGrade(Number(b.dataset.grade));
  });
  $('gradeChecks').addEventListener('click', function (e) {
    var b = e.target.closest('.grade-check');
    if (!b) return;
    if (b.dataset.action === 'all') applyGrades([1, 2, 3, 4, 5, 6]);
    else if (b.dataset.action === 'g1') applyGrades([1]);
    else toggleGrade(Number(b.dataset.grade));
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
    var panel = $('settingsPanel');
    panel.classList.toggle('hidden');
    // 手机上设置面板在页面下方，展开后直接滚过去，避免孩子找不到
    if (!panel.classList.contains('hidden')) panel.scrollIntoView({ block: 'start' });
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

  /* ---------------- 护眼休息：事件 ---------------- */
  $('swEyeCare').addEventListener('click', function () {
    askParent(function () {
      state.settings.eyeCare = !state.settings.eyeCare;
      saveState(); syncSettingsUI(); S.tap();
    });
  });
  $('studyMinutesSwitch').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var n = normalizeStudyMinutes(b.dataset.n);
    if (n === Number(state.settings.studyMinutes)) return;
    askParent(function () {
      state.settings.studyMinutes = n;
      saveState(); syncSettingsUI(); S.tap();
    });
  });
  // 家长紧急出口：万一时间异常导致倒计时不走，可由家长验证后结束休息
  $('btnRestParent').addEventListener('click', function () {
    askParent(function () { finishRest(false); }, true);
  });
  $('parentCancel').addEventListener('click', closeParentGate);
  $('parentOk').addEventListener('click', submitParent);
  $('parentAnswer').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submitParent(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeParentGate(); }
  });

  // 休息期间用捕获阶段拦住底层所有点击，改答案、开设置、点开始都不行
  document.addEventListener('click', function (e) {
    if (!isResting() || $('restOverlay').contains(e.target) || $('parentGate').contains(e.target)) return;
    e.preventDefault(); e.stopPropagation();
  }, true);

  // 多标签页同步：任一窗口进入 / 结束休息，其他窗口跟着走
  window.addEventListener('storage', function (e) {
    if (e.key !== EYE_KEY || !e.newValue) return;
    try {
      var remoteResting = Number(JSON.parse(e.newValue).lockUntil) > 0;
      if (remoteResting === isResting()) return;   // 状态未变，避免互相覆盖学习时长
      eye = loadEye();
      eyeLastTick = Date.now();
      if (remoteResting) { stopPracticeTimers(); showRestOverlay(); }
      else hideRestOverlay();
      renderEyeUI();
      if (isResting()) renderRestClock();
    } catch (err) {}
  });

  document.addEventListener('keydown', function (e) {
    if (parentGateOpen() && e.key === 'Escape') { closeParentGate(); return; }
    if (isResting() || parentGateOpen()) return;
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

  // 页面重新可见时恢复音频上下文；切到后台的空档不计入学习时间
  document.addEventListener('visibilitychange', function () {
    eyeLastTick = Date.now();
    if (!document.hidden) {
      S.unlock();
      if (isResting()) renderRestClock();
    }
  });

  /* ---------------- 启动 ---------------- */
  initEye();
  renderStats();
  syncSettingsUI();
  setInterval(eyeTick, 1000);
})();

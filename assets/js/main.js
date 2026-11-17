/* ==========================================================================
   栗子tc · Kuri's Atelier — 交互脚本（无依赖）
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 本地设定 ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('kuri-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('kuri-' + k, JSON.stringify(v)); } catch (e) { /* 存储不可用时忽略 */ } }
  };
  const prefs = Object.assign({ particles: true, trail: true, speed: 3, pet: true }, store.get('prefs', {}));
  const savePrefs = () => store.set('prefs', prefs);

  /* ---------- 台词 ---------- */
  const LINES = {
    intro: [
      { who: '？？？', text: '啊……有客人来了！' },
      { who: '小栗', text: '欢迎来到「栗子のアトリエ」！我是这里的看板娘——小栗。' },
      { who: '小栗', text: '这里的主人叫栗子tc，是个对 AI、二次元和数字创作都充满好奇心的人。' },
      { who: '小栗', text: '比起只让 AI 回答问题，栗子更想让 AI 一起写代码、做桌宠、画角色、生成动画……' },
      { who: '小栗', text: '对了对了！栗子刚刚公开了新作「诺瓦 · 星白桌宠」，点左上角那个 NEW 就能看到哦！' },
      { who: '小栗', text: '往下滚动，可以看到角色档案、作品、攻略路线，还有 ChatGPT 帮忙记下的「记忆存档」。' },
      { who: '小栗', text: '对了，试着点点我，或者……在我头上来回摸一摸？(｡•ㅅ•｡)' }
    ],
    poke: [
      '呜哇！突然戳我做什么啦～',
      '今天也要把想象变成现实哦！',
      '栗子最近在研究让桌宠自己干活的 Agent……',
      '你知道吗？千绘莉的网格形变全是手写的 WebGL2 哦。',
      '8GB 显存也要跑大模型！量化，启动！',
      '要不要去 GitHub 给栗子点个 Star？☆',
      '日语 N4……がんばります！',
      '莓华会在「工坊」里帮栗子干活，好羡慕……',
      '作品能用了也不能停，细节还要继续打磨！',
      '新来的诺瓦是个安静慢热的孩子……我们会成为朋友吗？',
      '听说诺瓦的星空菜单，其实就是她自己的头！好厉害……'
    ],
    face: ['脸、脸不可以戳啦……', '唔……会被戳出酒窝的！', '再戳就要鼓起来了哦！(｀・ω・´)'],
    head: ['嘿嘿……被摸头了。', '再、再摸一下也可以哦。'],
    ears: ['耳、耳朵不可以！很敏感的！', '呀！耳朵会抖起来的啦！'],
    clip: ['这个栗子发卡是我的宝物！', '发卡是栗子形状的，可爱吧？'],
    tablet: ['这是栗子的平板，里面全是代码和立绘草稿哦。', '偷看平板是不行的！……好吧，就一眼。'],
    tail: ['尾、尾巴也不行啦！', '尾巴要炸毛了啦——！'],
    pat: ['嘿嘿……好舒服……', '呼噜呼噜……啊，才、才没有在撒娇！', '再摸下去要融化了……'],
    max: '好、好感度 MAX 了？！……才、才没有很开心呢！'
  };

  /* ======================================================================
     昼夜主题
     ====================================================================== */
  const themeMeta = $('meta[name="theme-color"]');
  function setTheme(t) {
    root.dataset.theme = t;
    try { localStorage.setItem('kuri-theme', t); } catch (e) { /* ignore */ }
    if (themeMeta) themeMeta.content = t === 'day' ? '#fcf5f0' : '#140f1f';
    $$('[data-theme-set]').forEach((b) => b.classList.toggle('on', b.dataset.themeSet === t));
    bg.onTheme();
  }
  function switchTheme(t, x = innerWidth - 60, y = 40) {
    if (t === root.dataset.theme) return;
    if (!document.startViewTransition || reduceMotion) { setTheme(t); return; }
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => setTheme(t));
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  }

  /* ======================================================================
     背景画布：樱花、星空、光斑、流星
     ====================================================================== */
  const bg = (() => {
    const cv = $('#fxBg');
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, raf = 0;
    let petals = [], stars = [], orbs = [], meteors = [];
    let sprites = [], orbSprite = null;
    let wind = 0, scrollPush = 0, mx = -9999, my = -9999, nextMeteor = performance.now() + 5000;
    let enabled = prefs.particles && !reduceMotion;

    const night = () => root.dataset.theme !== 'day';

    function petalSprite(c1, c2) {
      const s = 48, c = document.createElement('canvas');
      c.width = c.height = s;
      const g = c.getContext('2d');
      g.translate(s / 2, s / 2);
      const r = 20;
      g.beginPath();
      g.moveTo(0, r);
      g.bezierCurveTo(r * .95, r * .35, r * .72, -r * .8, r * .18, -r * .95);
      g.lineTo(0, -r * .66);
      g.lineTo(-r * .18, -r * .95);
      g.bezierCurveTo(-r * .72, -r * .8, -r * .95, r * .35, 0, r);
      g.closePath();
      const grad = g.createLinearGradient(0, -r, 0, r);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      g.fillStyle = grad;
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, r * .8);
      g.lineTo(0, -r * .45);
      g.stroke();
      return c;
    }
    function makeSprites() {
      const sets = night()
        ? [['#ffe6ee', '#f6b1c3'], ['#ffd8e3', '#f19cb4'], ['#fff2f5', '#f4c1d0'], ['#ffeadf', '#f2b7a6']]
        : [['#ffd3df', '#ea8eaa'], ['#ffc6d5', '#e07b9a'], ['#ffe2ea', '#efa4b9'], ['#ffdacb', '#eb9f8a']];
      sprites = sets.map(([a, b]) => petalSprite(a, b));
      const s = 64, c = document.createElement('canvas');
      c.width = c.height = s;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      if (night()) { grad.addColorStop(0, 'rgba(255,214,226,.55)'); grad.addColorStop(.5, 'rgba(255,190,210,.18)'); }
      else { grad.addColorStop(0, 'rgba(255,255,255,.9)'); grad.addColorStop(.5, 'rgba(255,236,228,.35)'); }
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
      orbSprite = c;
    }

    function newPetal(init) {
      return {
        x: rand(-20, w + 20), y: init ? rand(-h * .1, h) : rand(-60, -20),
        s: rand(5, 11), vy: rand(.35, .95), vx: rand(-.25, .45),
        rot: rand(0, 6.28), vr: rand(-.025, .025), flip: rand(0, 6.28), vf: rand(.012, .04),
        sway: rand(0, 6.28), a: rand(.5, .92), img: Math.floor(Math.random() * 4)
      };
    }
    function build() {
      const area = w * h;
      const n = Math.round(clamp(area / 26000, 14, 48));
      petals = Array.from({ length: n }, () => newPetal(true));
      stars = Array.from({ length: Math.round(clamp(area / 8000, 60, 220)) }, () => ({
        x: Math.random() * w, y: Math.pow(Math.random(), 1.5) * h * .92,
        r: rand(.3, 1.4), t: rand(0, 6.28), s: rand(.008, .03)
      }));
      orbs = Array.from({ length: Math.round(clamp(w / 160, 4, 10)) }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: rand(30, 110), vy: rand(-.12, -.04), vx: rand(-.05, .05), a: rand(.12, .35)
      }));
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (!enabled) drawStatic();
    }

    function drawStars(t, animate) {
      ctx.fillStyle = '#fff';
      for (const st of stars) {
        if (animate) st.t += st.s;
        ctx.globalAlpha = .25 + .65 * Math.abs(Math.sin(st.t));
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function drawStatic() {
      ctx.clearRect(0, 0, w, h);
      if (night()) drawStars(0, false);
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, w, h);
      const isNight = night();
      wind *= .96;
      scrollPush *= .9;

      if (isNight) {
        drawStars(now, true);
        if (now > nextMeteor) {
          meteors.push({ x: rand(w * .2, w * 1.05), y: rand(-20, h * .3), vx: -rand(7, 11), vy: rand(2.4, 4), life: 1 });
          nextMeteor = now + rand(6000, 13000);
        }
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.x += m.vx; m.y += m.vy; m.life -= .012;
          if (m.life <= 0) { meteors.splice(i, 1); continue; }
          const tx = m.x - m.vx * 14, ty = m.y - m.vy * 14;
          const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
          g.addColorStop(0, `rgba(255,240,245,${m.life})`);
          g.addColorStop(1, 'rgba(255,200,220,0)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
        }
      }

      for (const o of orbs) {
        o.y += o.vy - scrollPush * .05; o.x += o.vx;
        if (o.y < -o.r) { o.y = h + o.r; o.x = Math.random() * w; }
        if (o.y > h + o.r) o.y = -o.r;
        ctx.globalAlpha = o.a;
        ctx.drawImage(orbSprite, o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
      }

      for (const p of petals) {
        p.sway += .012;
        p.x += p.vx + Math.sin(p.sway) * .45 + wind;
        p.y += p.vy - scrollPush * .25;
        p.rot += p.vr; p.flip += p.vf;
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 14400) {
          const d = Math.sqrt(d2) + .01, f = (1 - d / 120) * 2.2;
          p.x += dx / d * f; p.y += dy / d * f; p.vr += (Math.random() - .5) * .004;
        }
        if (p.y > h + 30 || p.x < -60 || p.x > w + 60 || p.y < -120) {
          Object.assign(p, newPetal(false));
          if (wind > 1.2) p.x = rand(-60, w * .5);
          if (wind < -1.2) p.x = rand(w * .5, w + 60);
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, .3 + .7 * Math.abs(Math.cos(p.flip)));
        ctx.globalAlpha = p.a;
        ctx.drawImage(sprites[p.img], -p.s, -p.s, p.s * 2, p.s * 2);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function start() { if (!raf && enabled) raf = requestAnimationFrame(frame); }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    addEventListener('resize', () => { resize(); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

    makeSprites();
    resize();
    start();

    return {
      setEnabled(v) { enabled = v && !reduceMotion; if (enabled) start(); else { stop(); drawStatic(); } },
      onTheme() { makeSprites(); if (!enabled) drawStatic(); },
      pointer(x, y) { mx = x; my = y; },
      scroll(dy) { wind = clamp(wind + dy * .012, -3, 3); scrollPush = clamp(scrollPush + dy * .08, -14, 14); }
    };
  })();

  /* ======================================================================
     前景画布：点击爆发、鼠标星屑、栗子雨
     ====================================================================== */
  const fx = (() => {
    const cv = $('#fxTop');
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, raf = 0, parts = [];
    const COLORS = ['#f5a9bb', '#f6c993', '#bba8f3', '#ffe3ea', '#ff9fb9'];
    const chestImg = new Image();
    chestImg.src = 'assets/img/favicon.svg';

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function sparkle(r) {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * .14, -r * .14, r, 0);
      ctx.quadraticCurveTo(r * .14, r * .14, 0, r);
      ctx.quadraticCurveTo(-r * .14, r * .14, -r, 0);
      ctx.quadraticCurveTo(-r * .14, -r * .14, 0, -r);
      ctx.closePath();
    }
    function heart(r) {
      ctx.beginPath();
      ctx.moveTo(0, r * .9);
      ctx.bezierCurveTo(-r * 1.25, 0, -r * .6, -r * 1.05, 0, -r * .35);
      ctx.bezierCurveTo(r * .6, -r * 1.05, r * 1.25, 0, 0, r * .9);
      ctx.closePath();
    }
    function add(p) {
      parts.push(p);
      if (parts.length > 420) parts.splice(0, parts.length - 420);
      if (!raf) raf = requestAnimationFrame(loop);
    }
    function loop() {
      ctx.clearRect(0, 0, w, h);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life--;
        if (p.life <= 0 || p.y > h + 60) { parts.splice(i, 1); continue; }
        p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        const k = p.life / p.max;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.kind === 'chest' ? Math.min(1, k * 3) : k;
        const s = p.size * (p.kind === 'trail' ? k : (.6 + .4 * k));
        if (p.kind === 'chest') {
          if (chestImg.complete) ctx.drawImage(chestImg, -s, -s, s * 2, s * 2);
        } else {
          ctx.fillStyle = p.color;
          if (p.kind === 'heart') heart(s); else sparkle(s);
          ctx.shadowColor = p.color; ctx.shadowBlur = p.kind === 'trail' ? 6 : 10;
          ctx.fill();
        }
        ctx.restore();
      }
      raf = parts.length ? requestAnimationFrame(loop) : 0;
    }
    function burst(x, y, kind = 'spark', n = 12, power = 1) {
      if (reduceMotion) return;
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), sp = rand(1.5, 5.5) * power;
        const k = kind === 'mix' ? (Math.random() < .5 ? 'heart' : 'spark') : kind;
        add({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (k === 'heart' ? 1.4 : .6),
          g: k === 'heart' ? -.02 : .06, drag: .94, rot: rand(-.4, .4), vr: rand(-.06, .06),
          size: k === 'heart' ? rand(5, 9) : rand(3, 7), life: 0, max: 0, kind: k, color: pick(COLORS)
        });
        const p = parts[parts.length - 1];
        p.life = p.max = Math.round(rand(40, 70));
      }
    }
    function trail(x, y) {
      if (reduceMotion) return;
      const life = Math.round(rand(26, 46));
      add({ x: x + rand(-4, 4), y: y + rand(-4, 4), vx: rand(-.4, .4), vy: rand(-.2, .6), g: .015, drag: .98, rot: rand(0, 1), vr: rand(-.05, .05), size: rand(2, 4.4), life, max: life, kind: 'trail', color: pick(COLORS) });
    }
    function chestnutRain(count = 46) {
      if (reduceMotion) return;
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const life = 400;
          add({ x: rand(0, w), y: rand(-80, -20), vx: rand(-.6, .6), vy: rand(1.5, 3.5), g: .05, drag: .995, rot: rand(-1, 1), vr: rand(-.06, .06), size: rand(12, 22), life, max: life, kind: 'chest', color: '#fff' });
        }, i * 45);
      }
    }
    addEventListener('resize', resize, { passive: true });
    resize();
    return { burst, trail, chestnutRain };
  })();

  /* ======================================================================
     提示条
     ====================================================================== */
  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  /* ======================================================================
     ADV 对话框
     ====================================================================== */
  const adv = (() => {
    const wrap = $('#adv'), box = $('#advBox'), textEl = $('#advText'), nameEl = $('.adv-name b');
    const autoBtn = $('#advAuto'), skipBtn = $('#advSkip'), logBtn = $('#advLog');
    const SPEEDS = [0, 72, 52, 36, 22, 9];
    const log = [];
    let i = 0, full = '', pos = 0, typing = false, auto = false, timer = 0, started = false;

    function setName(who) {
      if (nameEl.textContent !== who) nameEl.textContent = who;
    }
    function done() {
      typing = false;
      textEl.textContent = full;
      wrap.classList.add('idle');
      if (auto) timer = setTimeout(next, 1500 + full.length * 45);
    }
    function show(text, who = '小栗') {
      clearTimeout(timer);
      setName(who);
      full = text; pos = 0; typing = true;
      wrap.classList.remove('idle');
      log.push({ who, text });
      if (log.length > 80) log.shift();
      if (reduceMotion) { done(); return; }
      textEl.textContent = '';
      const step = () => {
        pos++;
        textEl.textContent = full.slice(0, pos);
        if (pos < full.length) {
          const ch = full[pos - 1];
          const mult = '，。！？…～、'.includes(ch) ? 5 : 1;
          timer = setTimeout(step, SPEEDS[prefs.speed] * mult);
        } else done();
      };
      step();
    }
    function next() {
      if (typing) { clearTimeout(timer); done(); return; }
      if (i < LINES.intro.length) { const l = LINES.intro[i++]; show(l.text, l.who); }
      else show(pick(LINES.poke));
    }
    function start() {
      if (started) return;
      started = true;
      next();
    }
    box.addEventListener('click', next);
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
    });
    autoBtn.addEventListener('click', () => {
      auto = !auto;
      autoBtn.setAttribute('aria-pressed', String(auto));
      if (auto && !typing) next();
      if (!auto) clearTimeout(timer);
    });
    skipBtn.addEventListener('click', () => {
      if (i < LINES.intro.length) {
        clearTimeout(timer);
        for (; i < LINES.intro.length - 1; i++) log.push(LINES.intro[i]);
        const l = LINES.intro[i++];
        typing = false;
        show(l.text, l.who);
      } else {
        $('#profile').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
    logBtn.addEventListener('click', () => openLog(log));
    return { start, say: (t) => show(t, '小栗') };
  })();

  /* ======================================================================
     看板娘互动：分部位反应、摸头、好感度
     ====================================================================== */
  (() => {
    const kuri = $('#kuri');
    const affBox = $('#affection'), affBar = $('#affBar');
    let aff = clamp(Number(store.get('aff', 0)) || 0, 0, 100);
    let maxDone = aff >= 100;
    let patDist = 0, patLastX = null, patDir = 0, patTurns = 0, patT = 0, patCool = 0;

    function renderAff(show) {
      affBar.style.width = aff + '%';
      affBox.classList.toggle('max', aff >= 100);
      if (show) affBox.classList.add('show');
    }
    function addAff(v, x, y) {
      aff = clamp(aff + v, 0, 100);
      store.set('aff', aff);
      renderAff(true);
      if (aff >= 100 && !maxDone) {
        maxDone = true;
        setTimeout(() => {
          adv.say(LINES.max);
          toast('♥ 好感度 MAX ♥');
          const r = kuri.getBoundingClientRect();
          fx.burst(r.left + r.width / 2, r.top + r.height * .32, 'heart', 36, 1.6);
        }, 250);
        return true;
      }
      return false;
    }
    function anim(cls) {
      kuri.classList.remove('hop', 'shake');
      void kuri.offsetWidth;
      kuri.classList.add(cls);
    }
    function zone(e) {
      const r = kuri.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (x > .55 && x < .68 && y > .155 && y < .24) return 'clip';
      if (y < .17 && (x < .42 || x > .58)) return 'ears';
      if (y < .2) return 'head';
      if (y < .34 && x > .36 && x < .64) return 'face';
      if (x > .52 && x < .74 && y > .35 && y < .54) return 'tablet';
      if (x > .64 && x < .9 && y > .56 && y < .75) return 'tail';
      return 'body';
    }

    kuri.addEventListener('click', (e) => {
      const z = e.detail === 0 ? 'body' : zone(e);
      const x = e.clientX || kuri.getBoundingClientRect().left + kuri.offsetWidth / 2;
      const y = e.clientY || kuri.getBoundingClientRect().top + kuri.offsetHeight / 3;
      const hitMax = addAff(z === 'head' ? 9 : 6, x, y);
      if (z === 'ears' || z === 'tail') anim('shake'); else anim('hop');
      fx.burst(x, y, z === 'ears' || z === 'tail' ? 'spark' : 'heart', 12);
      if (!hitMax) adv.say(pick(LINES[z] || LINES.poke));
    });

    // 在头顶左右来回移动 = 摸头
    kuri.addEventListener('pointermove', (e) => {
      const r = kuri.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const now = performance.now();
      if (y > .04 && y < .24 && x > .26 && x < .74) {
        if (now - patT > 700) { patDist = 0; patTurns = 0; patDir = 0; patLastX = null; }
        patT = now;
        if (patLastX !== null) {
          const dx = e.clientX - patLastX;
          patDist += Math.abs(dx);
          const dir = Math.sign(dx);
          if (dir && dir !== patDir) { if (patDir) patTurns++; patDir = dir; }
          if (Math.random() < .25) fx.trail(e.clientX, e.clientY);
        }
        patLastX = e.clientX;
        if (patDist > 260 && patTurns >= 3 && now > patCool) {
          patCool = now + 2600;
          patDist = 0; patTurns = 0;
          fx.burst(e.clientX, e.clientY - 10, 'heart', 8, .7);
          if (!addAff(8, e.clientX, e.clientY)) adv.say(pick(LINES.pat));
        }
      }
    });

    renderAff(aff > 0);
  })();

  /* ======================================================================
     角色名称打字（AI 创作者 / 桌宠开发者 …）
     ====================================================================== */
  const roleTyper = (() => {
    const el = $('#roleType');
    const roles = ['AI 创作者', '桌宠开发者', '二次元爱好者', '自动化狂热者', 'Agent 探索者', 'Galgame 玩家'];
    let ri = 0, ci = roles[0].length, del = true, started = false;
    function tick() {
      const word = roles[ri];
      if (del) {
        ci--;
        el.textContent = word.slice(0, ci);
        if (ci <= 0) { del = false; ri = (ri + 1) % roles.length; setTimeout(tick, 320); return; }
        setTimeout(tick, 55);
      } else {
        ci++;
        el.textContent = roles[ri].slice(0, ci);
        if (ci >= roles[ri].length) { del = true; setTimeout(tick, 2100); return; }
        setTimeout(tick, 120);
      }
    }
    return { start() { if (started || reduceMotion) return; started = true; setTimeout(tick, 2400); } };
  })();

  /* ======================================================================
     载入画面
     ====================================================================== */
  (() => {
    const loader = $('#loader'), bar = $('#loaderBar');
    const tips = [
      'TIPS：点击看板娘，她会有反应哦',
      'TIPS：在小栗头上左右来回移动鼠标，就是摸头',
      'TIPS：右上角可以切换昼夜',
      'TIPS：记忆存档可以点开读档',
      'TIPS：对话框的 LOG 可以回看台词'
    ];
    $('#loaderTip').textContent = pick(tips);
    let prog = 0, finished = false;
    const iv = setInterval(() => {
      prog = Math.min(90, prog + rand(4, 14));
      bar.style.width = prog + '%';
    }, 120);
    const img = $('#kuri img');
    const imgReady = new Promise((res) => {
      if (img.complete) res();
      else { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); }
    });
    const minWait = new Promise((r) => setTimeout(r, reduceMotion ? 0 : 900));
    const maxWait = new Promise((r) => setTimeout(r, 4000));
    function finish() {
      if (finished) return;
      finished = true;
      clearInterval(iv);
      bar.style.width = '100%';
      setTimeout(() => {
        loader.classList.add('done');
        root.classList.add('ready');
        setTimeout(() => adv.start(), reduceMotion ? 0 : 1700);
        roleTyper.start();
      }, reduceMotion ? 0 : 320);
    }
    Promise.race([Promise.all([imgReady, minWait]), maxWait]).then(finish);
  })();

  /* ======================================================================
     自定义光标 + 首屏视差（共用一个动画循环）
     ====================================================================== */
  (() => {
    const stage = $('#stage');
    const hero = $('#hero');
    let heroVisible = true;
    new IntersectionObserver(([en]) => {
      heroVisible = en.isIntersecting;
      hero.classList.toggle('off', !heroVisible);
    }).observe(hero);

    let tx = 0, ty = 0, cx = 0, cy = 0;
    let mx = -100, my = -100, rx = -100, ry = -100, lastTrailX = 0, lastTrailY = 0;
    const cursor = $('#cursor'), dot = $('.cursor-dot', cursor), ring = $('.cursor-ring', cursor);
    const useCursor = finePointer && !reduceMotion;
    if (useCursor) root.classList.add('has-cursor');

    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      tx = (mx / innerWidth - .5) * 2; ty = (my / innerHeight - .5) * 2;
      bg.pointer(mx, my);
      if (useCursor) {
        dot.style.transform = `translate(${mx}px, ${my}px)`;
        cursor.classList.remove('hidden');
        const hoverable = e.target.closest && e.target.closest('a, button, [role="button"], label, input, select, .slot');
        cursor.classList.toggle('hover', !!hoverable);
        if (prefs.trail && Math.hypot(mx - lastTrailX, my - lastTrailY) > 14) {
          lastTrailX = mx; lastTrailY = my;
          fx.trail(mx, my);
        }
      }
    }, { passive: true });
    if (useCursor) {
      document.addEventListener('pointerdown', () => cursor.classList.add('down'));
      document.addEventListener('pointerup', () => cursor.classList.remove('down'));
      document.documentElement.addEventListener('mouseleave', () => { cursor.classList.add('hidden'); bg.pointer(-9999, -9999); });
    }

    function loop() {
      requestAnimationFrame(loop);
      if (useCursor) {
        rx += (mx - rx) * .2; ry += (my - ry) * .2;
        ring.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px)`;
      }
      if (heroVisible && finePointer && !reduceMotion) {
        cx += (tx - cx) * .06; cy += (ty - cy) * .06;
        stage.style.setProperty('--mx', cx.toFixed(3));
        stage.style.setProperty('--my', cy.toFixed(3));
      }
    }
    if (useCursor || (finePointer && !reduceMotion)) requestAnimationFrame(loop);
  })();

  // 新作入口：滚动到作品卡片后高亮一下
  $$('[data-spotlight]').forEach((a) => a.addEventListener('click', () => {
    const target = document.getElementById(a.dataset.spotlight);
    if (!target) return;
    target.classList.add('in');
    target.classList.remove('spotlight');
    setTimeout(() => {
      void target.offsetWidth;
      target.classList.add('spotlight');
      setTimeout(() => target.classList.remove('spotlight'), 2600);
    }, reduceMotion ? 0 : 750);
  }));

  // 全局点击星屑
  document.addEventListener('click', (e) => {
    if (e.detail === 0) return;
    if (e.target.closest('#kuri, input, .adv-box, label')) return;
    fx.burst(e.clientX, e.clientY, 'spark', 8, .8);
  });

  /* ======================================================================
     导航 / 滚动联动
     ====================================================================== */
  (() => {
    const nav = $('#nav'), burger = $('#burger'), links = $$('#navLinks a');
    const progress = $('#navProgress'), sky = $('.sky'), hero = $('#hero');
    const toTop = $('#toTop'), routeEl = $('#route'), routeFill = $('#routeFill');
    let lastY = scrollY, ticking = false;

    function update() {
      ticking = false;
      const y = scrollY, vh = innerHeight;
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      nav.classList.toggle('solid', y > 30);
      nav.classList.toggle('tuck', y > vh && y > lastY + 4 && !nav.classList.contains('open'));
      if (y < lastY - 4) nav.classList.remove('tuck');
      progress.style.setProperty('--sp', (y / max).toFixed(4));
      sky.style.setProperty('--p', clamp(y / (vh * 1.1), 0, 1).toFixed(3));
      if (matchMedia('(min-width: 961px)').matches) hero.style.setProperty('--hs', clamp(y / (vh * .9), 0, 1).toFixed(3));
      toTop.classList.toggle('show', y > vh * .8);
      const rr = routeEl.getBoundingClientRect();
      routeFill.style.setProperty('--fill', clamp((vh * .62 - rr.top) / rr.height, 0, 1).toFixed(4));
      bg.scroll(y - lastY);
      lastY = y;
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update, { passive: true });
    update();

    burger.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    links.forEach((a) => a.addEventListener('click', () => {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }));
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('open') && !nav.contains(e.target)) {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
    toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

    // 当前章节高亮 + 迷你看板娘台词
    const sections = $$('main section[id]');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const seen = new Set();
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.id;
        links.forEach((a) => a.classList.remove('active'));
        const a = map.get(id);
        if (a) a.classList.add('active');
        pet.section(id === 'hero' ? null : en.target, !seen.has(id));
        seen.add(id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  })();

  /* ======================================================================
     迷你看板娘
     ====================================================================== */
  const pet = (() => {
    const box = $('#miniPet'), bubble = $('#mpBubble'), face = $('#mpFace');
    let timer = 0, inHero = true;
    function render() { box.classList.toggle('show', prefs.pet && !inHero); }
    function say(text, ms = 5200) {
      if (!prefs.pet || inHero) return;
      bubble.textContent = text;
      bubble.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => bubble.classList.remove('show'), ms);
    }
    face.addEventListener('click', (e) => {
      face.classList.remove('boop');
      void face.offsetWidth;
      face.classList.add('boop');
      say(pick(LINES.poke));
      if (e.detail) fx.burst(e.clientX, e.clientY, 'heart', 8, .8);
    });
    return {
      section(el, first) {
        inHero = !el;
        render();
        if (el && first && el.dataset.pet) setTimeout(() => say(el.dataset.pet), 400);
        if (!el) bubble.classList.remove('show');
      },
      refresh: render
    };
  })();

  /* ======================================================================
     滚动显现
     ====================================================================== */
  (() => {
    const groups = new Map();
    $$('.reveal').forEach((el) => {
      const p = el.parentElement;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(el);
    });
    groups.forEach((els, parent) => {
      if (parent.classList.contains('route-list')) return;
      els.forEach((el, i) => el.style.setProperty('--d', ((i % 3) * .09).toFixed(2) + 's'));
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach((el) => io.observe(el));
  })();

  /* ======================================================================
     属性雷达图
     ====================================================================== */
  (() => {
    const svg = $('#radar');
    if (!svg) return;
    let stats;
    try { stats = JSON.parse(svg.dataset.stats); } catch (e) { return; }
    const NS = 'http://www.w3.org/2000/svg';
    const cx = 160, cy = 150, R = 100, n = stats.length;
    const pt = (i, r) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    const el = (tag, attrs, text) => {
      const e = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
      if (text != null) e.textContent = text;
      svg.appendChild(e);
      return e;
    };
    [.25, .5, .75, 1].forEach((lv) => {
      el('polygon', { class: 'grid', points: stats.map((_, i) => pt(i, R * lv).join(',')).join(' ') });
    });
    stats.forEach((_, i) => { const [x, y] = pt(i, R); el('line', { class: 'axis', x1: cx, y1: cy, x2: x, y2: y }); });
    el('polygon', { class: 'area', points: stats.map((s, i) => pt(i, R * s[1] / 100).join(',')).join(' ') });
    stats.forEach((s, i) => {
      const [x, y] = pt(i, R * s[1] / 100);
      el('circle', { class: 'pt', cx: x, cy: y, r: 4 });
      const [lx, ly] = pt(i, R + 24);
      const anchor = Math.abs(lx - cx) < 4 ? 'middle' : lx > cx ? 'start' : 'end';
      el('text', { class: 'lbl', x: lx, y: ly - 2, 'text-anchor': anchor }, s[0]);
      el('text', { class: 'val', x: lx, y: ly + 13, 'text-anchor': anchor }, s[1]);
    });
    new IntersectionObserver(([en], obs) => {
      if (en.isIntersecting) { svg.classList.add('in'); obs.disconnect(); }
    }, { threshold: .4 }).observe(svg);
  })();

  /* ======================================================================
     3D 倾斜卡片
     ====================================================================== */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach((el) => {
      const strength = el.classList.contains('work-media') ? 6 : 8;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transition = 'transform .12s linear';
        el.style.transform = `perspective(1000px) rotateX(${((.5 - py) * strength).toFixed(2)}deg) rotateY(${((px - .5) * strength * 1.2).toFixed(2)}deg)`;
        el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1)';
        el.style.transform = '';
      });
    });
  }

  /* ======================================================================
     跑马灯：复制一份内容实现无缝循环
     ====================================================================== */
  $$('.mq-row').forEach((row) => {
    const track = $('.mq-track', row);
    const clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    row.appendChild(clone);
  });

  /* ======================================================================
     弹窗：作品详细 / 记忆存档 / 对话记录
     ====================================================================== */
  const modal = $('#modal'), mCard = $('.modal-card', modal), mBody = $('#modalBody');
  const mNav = $('#modalNav'), mPrev = $('#modalPrev'), mNext = $('#modalNext'), mPos = $('#modalPos');
  const slotBtns = $$('.slot');
  let lastFocus = null, curSlot = 0;

  function fill(content) {
    mBody.innerHTML = '';
    mBody.appendChild(content);
    Array.from(mBody.children).forEach((c, k) => c.style.setProperty('--k', Math.min(k, 14)));
    mBody.scrollTop = 0;
  }
  function openModal(content, withNav) {
    if (modal.hidden) lastFocus = document.activeElement;
    fill(content);
    mNav.hidden = !withNav;
    modal.hidden = false;
    modal.classList.remove('closing');
    document.body.classList.add('lock');
    requestAnimationFrame(() => $('.modal-close', modal).focus({ preventScroll: true }));
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.classList.add('closing');
    setTimeout(() => {
      modal.hidden = true;
      modal.classList.remove('closing');
      if (panel.hidden) document.body.classList.remove('lock');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, 280);
  }
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });

  $$('[data-detail]').forEach((btn) => btn.addEventListener('click', () => {
    const tpl = $('#tpl-detail-' + btn.dataset.detail);
    if (tpl) openModal(tpl.content.cloneNode(true), false);
  }));

  function slotContent(i) {
    const btn = slotBtns[i - 1];
    const h = getComputedStyle($('.slot-thumb', btn)).getPropertyValue('--h').trim() || '340';
    const kanji = $('.slot-thumb b', btn).textContent;
    const no = $('.slot-no', btn).textContent;
    const frag = document.createDocumentFragment();
    const head = document.createElement('div');
    head.className = 'sl-head';
    head.style.setProperty('--h', h);
    head.innerHTML = `<span class="sl-kanji" style="--h:${h}">${kanji}</span><span class="sl-meta"><b>${no}</b><span>SAVE DATA · 2026/11/16 · ChatGPT</span></span><span class="sl-load">LOAD COMPLETE</span>`;
    frag.appendChild(head);
    frag.appendChild($('#tpl-slot-' + i).content.cloneNode(true));
    return frag;
  }
  function openSlot(i) {
    curSlot = i;
    openModal(slotContent(i), true);
    mPos.textContent = String(i).padStart(2, '0') + ' / ' + String(slotBtns.length).padStart(2, '0');
    mPrev.disabled = i <= 1;
    mNext.disabled = i >= slotBtns.length;
  }
  slotBtns.forEach((btn) => btn.addEventListener('click', (e) => {
    const r = btn.getBoundingClientRect();
    fx.burst(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2, 'spark', 14);
    openSlot(Number(btn.dataset.slot));
  }));
  mPrev.addEventListener('click', () => { if (curSlot > 1) openSlot(curSlot - 1); });
  mNext.addEventListener('click', () => { if (curSlot < slotBtns.length) openSlot(curSlot + 1); });

  function openLog(log) {
    const frag = document.createDocumentFragment();
    const h = document.createElement('h2');
    h.id = 'modalTitle';
    h.className = 'sl-title';
    h.style.paddingTop = '34px';
    h.textContent = 'BACKLOG · 对话记录';
    frag.appendChild(h);
    if (!log.length) {
      const p = document.createElement('p');
      p.className = 'log-empty';
      p.textContent = '还没有对话哦。';
      frag.appendChild(p);
    } else {
      const ul = document.createElement('ul');
      ul.className = 'log-list';
      log.forEach((l) => {
        const li = document.createElement('li');
        const b = document.createElement('b');
        b.textContent = l.who;
        const s = document.createElement('span');
        s.textContent = l.text;
        li.append(b, s);
        ul.appendChild(li);
      });
      frag.appendChild(ul);
    }
    openModal(frag, false);
    requestAnimationFrame(() => { mBody.scrollTop = mBody.scrollHeight; });
  }

  /* ======================================================================
     设置面板
     ====================================================================== */
  const panel = $('#config'), pCard = $('.panel-card', panel);
  let panelFocus = null;
  function openPanel() {
    panelFocus = document.activeElement;
    panel.hidden = false;
    panel.classList.remove('closing');
    $$('[data-theme-set]').forEach((b) => b.classList.toggle('on', b.dataset.themeSet === root.dataset.theme));
    requestAnimationFrame(() => $('.seg button.on', panel)?.focus({ preventScroll: true }));
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.classList.add('closing');
    setTimeout(() => {
      panel.hidden = true;
      panel.classList.remove('closing');
      if (panelFocus && panelFocus.focus) panelFocus.focus({ preventScroll: true });
    }, 280);
  }
  $$('[data-open-config]').forEach((b) => b.addEventListener('click', openPanel));
  panel.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closePanel(); });
  $$('[data-theme-set]').forEach((b) => b.addEventListener('click', (e) => {
    const r = b.getBoundingClientRect();
    switchTheme(b.dataset.themeSet, e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
  }));
  $('#themeBtn').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    switchTheme(root.dataset.theme === 'day' ? 'night' : 'day', r.left + r.width / 2, r.top + r.height / 2);
  });

  const cfgParticles = $('#cfgParticles'), cfgTrail = $('#cfgTrail'), cfgSpeed = $('#cfgSpeed'), cfgPet = $('#cfgPet');
  cfgParticles.checked = prefs.particles;
  cfgTrail.checked = prefs.trail;
  cfgSpeed.value = prefs.speed;
  cfgPet.checked = prefs.pet;
  cfgParticles.addEventListener('change', () => { prefs.particles = cfgParticles.checked; bg.setEnabled(prefs.particles); savePrefs(); });
  cfgTrail.addEventListener('change', () => { prefs.trail = cfgTrail.checked; savePrefs(); });
  cfgSpeed.addEventListener('input', () => { prefs.speed = clamp(Number(cfgSpeed.value) || 3, 1, 5); savePrefs(); });
  cfgPet.addEventListener('change', () => { prefs.pet = cfgPet.checked; pet.refresh(); savePrefs(); });
  if (!prefs.particles) bg.setEnabled(false);
  $$('[data-theme-set]').forEach((b) => b.classList.toggle('on', b.dataset.themeSet === root.dataset.theme));

  /* ======================================================================
     键盘：Esc 关闭、焦点循环、彩蛋
     ====================================================================== */
  function trapFocus(container, e) {
    const f = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', container).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!container.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }
  let eggBuf = '';
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modal.hidden) closeModal();
      else if (!panel.hidden) closePanel();
      else if ($('#nav').classList.contains('open')) $('#burger').click();
      return;
    }
    if (e.key === 'Tab') {
      if (!modal.hidden) trapFocus(mCard, e);
      else if (!panel.hidden) trapFocus(pCard, e);
      return;
    }
    if (!modal.hidden && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !mNav.hidden) {
      (e.key === 'ArrowLeft' ? mPrev : mNext).click();
      return;
    }
    const tgt = e.target;
    if ((tgt && tgt.closest && tgt.closest('input, textarea')) || !e.key || e.key.length !== 1) return;
    eggBuf = (eggBuf + e.key.toLowerCase()).slice(-4);
    if (eggBuf === 'kuri') {
      eggBuf = '';
      fx.chestnutRain();
      toast('🌰 栗子雨降临！');
      adv.say('哇——是栗子雨！今天的晚饭有着落了！');
    }
  });

  /* ======================================================================
     GitHub 实时数据
     ====================================================================== */
  function countUp(el, to) {
    const from = Number(el.textContent) || 0;
    if (from === to || reduceMotion) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 900;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  (async () => {
    const USER = 'lizitc';
    let data = store.get('gh', null);
    if (!data || Date.now() - data.t > 30 * 60 * 1000) {
      try {
        const [u, repos] = await Promise.all([
          fetch(`https://api.github.com/users/${USER}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
          fetch(`https://api.github.com/users/${USER}/repos?per_page=100`).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        ]);
        data = {
          t: Date.now(),
          followers: u.followers,
          repos: u.public_repos,
          list: repos.filter((r) => !r.fork).map((r) => ({ n: r.name, s: r.stargazers_count, f: r.forks_count }))
        };
        store.set('gh', data);
      } catch (e) {
        if (!data) return; // 保留页面里的静态数字
      }
    }
    const byName = new Map(data.list.map((r) => [r.n.toLowerCase(), r]));
    $$('.work[data-repo]').forEach((card) => {
      const r = byName.get(card.dataset.repo.toLowerCase());
      if (!r) return;
      const s = $('[data-stat="stars"]', card), f = $('[data-stat="forks"]', card);
      if (s) countUp(s, r.s);
      if (f) countUp(f, r.f);
    });
    const totals = {
      repos: data.repos,
      followers: data.followers,
      stars: data.list.reduce((a, r) => a + r.s, 0),
      forks: data.list.reduce((a, r) => a + r.f, 0)
    };
    $$('[data-gh]').forEach((el) => {
      const v = totals[el.dataset.gh];
      if (typeof v === 'number') countUp(el, v);
    });
  })();
})();

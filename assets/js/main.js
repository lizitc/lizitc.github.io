/* 栗子tc · 个人网站交互脚本（无依赖） */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ==========================================================
     设定（保存在 localStorage）
     ========================================================== */
  const CFG_KEY = 'lizitc.cfg';
  const DEFAULTS = { theme: 'auto', petals: 60, speed: 60, fx: true };
  const cfg = { ...DEFAULTS };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) { /* 隐私模式等 */ }
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } };

  const resolveTheme = () => {
    if (cfg.theme !== 'auto') return cfg.theme;
    const h = new Date().getHours();
    return h >= 6 && h < 18 ? 'day' : 'night';
  };

  /* ==========================================================
     花瓣与光点（背景 canvas）
     ========================================================== */
  const Petals = (() => {
    const cv = $('#petals');
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    let petals = [], motes = [];
    let wind = 0, windTarget = 0, lastScroll = window.scrollY;
    let raf = 0, last = 0, theme = 'night';

    const petalSprite = (c1, c2) => {
      const s = 64, c = document.createElement('canvas');
      c.width = c.height = s;
      const g = c.getContext('2d');
      g.translate(s / 2, s / 2);
      const grd = g.createLinearGradient(0, -s * .4, 0, s * .44);
      grd.addColorStop(0, c1); grd.addColorStop(1, c2);
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(0, s * .44);
      g.bezierCurveTo(-s * .44, s * .12, -s * .32, -s * .4, -s * .07, -s * .38);
      g.lineTo(0, -s * .27);
      g.lineTo(s * .07, -s * .38);
      g.bezierCurveTo(s * .32, -s * .4, s * .44, s * .12, 0, s * .44);
      g.fill();
      return c;
    };
    const moteSprite = (rgb) => {
      const s = 64, c = document.createElement('canvas');
      c.width = c.height = s;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, `rgba(${rgb},.9)`);
      grd.addColorStop(.35, `rgba(${rgb},.32)`);
      grd.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
      return c;
    };
    const sprites = {
      petals: [petalSprite('#fff0f5', '#f9b6cf'), petalSprite('#ffe3ee', '#f59abd'), petalSprite('#fff6f9', '#fbc9dc')],
      night: moteSprite('255,224,170'),
      day: moteSprite('255,255,255'),
    };

    const newPetal = (scatter) => {
      const z = .35 + Math.random() * .65;
      return {
        x: Math.random() * (W + 160) - 80,
        y: scatter ? Math.random() * H : -30 - Math.random() * 60,
        z,
        s: (10 + Math.random() * 13) * z,
        vx: .15 + Math.random() * .5,
        vy: .45 + Math.random() * .85,
        rot: Math.random() * 6.283, vr: (Math.random() - .5) * .03,
        flip: Math.random() * 6.283, vf: .015 + Math.random() * .04,
        sway: Math.random() * 6.283, vs: .008 + Math.random() * .018,
        k: (Math.random() * 3) | 0,
        a: .4 + z * .5,
      };
    };
    const newMote = () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 5 + Math.random() * 22,
      vx: (Math.random() - .5) * .12, vy: -.04 - Math.random() * .16,
      ph: Math.random() * 6.283, sp: .006 + Math.random() * .014,
    });

    const populate = () => {
      const n = Math.round((cfg.petals / 100) * Math.min(90, (W * H) / 16000));
      while (petals.length < n) petals.push(newPetal(true));
      petals.length = n;
      const m = Math.round(n * .4);
      while (motes.length < m) motes.push(newMote());
      motes.length = m;
    };

    const draw = (dt) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const scrollDelta = clamp(window.scrollY - lastScroll, -80, 80);
      lastScroll = window.scrollY;
      wind += (windTarget - wind) * .05 * dt;
      windTarget *= Math.pow(.96, dt);

      const moteImg = sprites[theme];
      const moteAlpha = theme === 'night' ? .5 : .34;
      for (const m of motes) {
        m.ph += m.sp * dt;
        m.x += (m.vx + wind * .12) * dt;
        m.y += m.vy * dt - scrollDelta * .06;
        if (m.y < -40) m.y = H + 30; else if (m.y > H + 40) m.y = -30;
        if (m.x < -40) m.x = W + 30; else if (m.x > W + 40) m.x = -30;
        ctx.globalAlpha = moteAlpha * (.45 + .55 * Math.sin(m.ph));
        if (ctx.globalAlpha > .01) ctx.drawImage(moteImg, m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
      }

      for (const p of petals) {
        p.sway += p.vs * dt; p.flip += p.vf * dt; p.rot += p.vr * dt;
        p.x += (p.vx + wind + Math.sin(p.sway) * .7) * p.z * dt;
        p.y += p.vy * p.z * dt - scrollDelta * p.z * .22;
        if (p.y > H + 34) { Object.assign(p, newPetal(false)); }
        else if (p.y < -120) { p.y = H + 20; }
        if (p.x > W + 80) p.x = -60; else if (p.x < -80) p.x = W + 60;
        const c = Math.cos(p.rot) * dpr, s = Math.sin(p.rot) * dpr, f = Math.cos(p.flip);
        ctx.setTransform(c, s, -s * f, c * f, p.x * dpr, p.y * dpr);
        ctx.globalAlpha = p.a;
        ctx.drawImage(sprites.petals[p.k], -p.s / 2, -p.s / 2, p.s, p.s);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now) => {
      const dt = clamp((now - last) / 16.667, .2, 3);
      last = now;
      draw(dt);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (reduceMotion) { draw(0); return; }
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      populate();
      if (reduceMotion) draw(0);
    };

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { document.hidden ? cancelAnimationFrame(raf) : start(); });
    if (finePointer) {
      window.addEventListener('pointermove', (e) => { windTarget = clamp(windTarget + (e.movementX || 0) * .012, -2.2, 2.2); }, { passive: true });
    }

    return {
      init() { resize(); start(); },
      refresh() { populate(); if (reduceMotion) draw(0); },
      setTheme(t) { theme = t; if (reduceMotion) draw(0); },
    };
  })();

  /* ==========================================================
     光标星屑（前景 canvas，只在有粒子时运行）
     ========================================================== */
  const FX = (() => {
    const cv = $('#fx');
    const ctx = cv.getContext('2d');
    const COLORS = ['#f8a9c6', '#ffd9a8', '#c9b4f5', '#ffffff', '#ffc2d6'];
    let W = 0, H = 0, dpr = 1, parts = [], running = false, last = 0, lx = -99, ly = -99;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    };
    const star = (r) => {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.fill();
    };
    const heart = (r) => {
      ctx.beginPath();
      ctx.moveTo(0, r * .9);
      ctx.bezierCurveTo(-r * 1.35, -r * .1, -r * .65, -r * 1.15, 0, -r * .35);
      ctx.bezierCurveTo(r * .65, -r * 1.15, r * 1.35, -r * .1, 0, r * .9);
      ctx.fill();
    };
    const add = (x, y, burst) => {
      const ang = Math.random() * 6.283;
      const sp = burst ? 1.4 + Math.random() * 3.2 : Math.random() * .5;
      parts.push({
        x, y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - (burst ? 1.2 : 0),
        g: burst ? .09 : .025,
        r: burst ? 5 + Math.random() * 6 : 3 + Math.random() * 5,
        rot: Math.random() * 6.283, vr: (Math.random() - .5) * .14,
        life: 0, max: burst ? 46 + Math.random() * 26 : 30 + Math.random() * 22,
        heart: burst && Math.random() < .45,
        c: COLORS[(Math.random() * COLORS.length) | 0],
      });
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    };
    const loop = (now) => {
      const dt = clamp((now - last) / 16.667, .2, 3);
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      parts = parts.filter((p) => (p.life += dt) < p.max);
      for (const p of parts) {
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        const k = 1 - p.life / p.max;
        ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = p.c;
        p.heart ? heart(p.r * (.5 + k * .5)) : star(p.r * (.35 + k * .65));
      }
      ctx.globalAlpha = 1;
      if (parts.length) requestAnimationFrame(loop);
      else { running = false; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reduceMotion) {
      window.addEventListener('pointermove', (e) => {
        if (!cfg.fx || e.pointerType !== 'mouse') return;
        if (Math.hypot(e.clientX - lx, e.clientY - ly) < 22) return;
        lx = e.clientX; ly = e.clientY;
        add(lx, ly, false);
      }, { passive: true });
      window.addEventListener('pointerdown', (e) => {
        if (!cfg.fx) return;
        for (let i = 0; i < 12; i++) add(e.clientX, e.clientY, true);
      }, { passive: true });
    }
    return { burst(x, y, n = 12) { if (cfg.fx && !reduceMotion) for (let i = 0; i < n; i++) add(x, y, true); } };
  })();

  /* ==========================================================
     主题
     ========================================================== */
  const themeMeta = $('meta[name="theme-color"]');
  const applyTheme = () => {
    const t = resolveTheme();
    root.dataset.theme = t;
    if (themeMeta) themeMeta.content = t === 'day' ? '#fff7f3' : '#16132a';
    Petals.setTheme(t);
    $$('#cfgTheme button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === cfg.theme)));
  };
  $('#themeBtn').addEventListener('click', (e) => {
    cfg.theme = resolveTheme() === 'day' ? 'night' : 'day';
    saveCfg(); applyTheme();
    const r = e.currentTarget.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + r.height / 2, 10);
  });
  setInterval(() => { if (cfg.theme === 'auto') applyTheme(); }, 5 * 60 * 1000);

  /* ==========================================================
     CONFIG 抽屉
     ========================================================== */
  const drawer = $('#config'), mask = $('#cfgMask'), cfgBtn = $('#cfgBtn');
  const petalsIn = $('#cfgPetals'), speedIn = $('#cfgSpeed'), fxIn = $('#cfgFx');
  let lastFocus = null;

  const syncRange = (input, out) => {
    const p = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--p', p + '%');
    out.textContent = input.value;
  };
  const syncControls = () => {
    petalsIn.value = cfg.petals; speedIn.value = cfg.speed; fxIn.checked = !!cfg.fx;
    syncRange(petalsIn, $('#cfgPetalsOut')); syncRange(speedIn, $('#cfgSpeedOut'));
  };
  const openCfg = (opener) => {
    lastFocus = opener || document.activeElement;
    drawer.classList.add('open'); drawer.removeAttribute('inert'); drawer.setAttribute('aria-hidden', 'false');
    mask.hidden = false; cfgBtn.setAttribute('aria-expanded', 'true');
    $('#cfgClose').focus({ preventScroll: true });
  };
  const closeCfg = () => {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); drawer.setAttribute('inert', ''); drawer.setAttribute('aria-hidden', 'true');
    mask.hidden = true; cfgBtn.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  cfgBtn.addEventListener('click', () => openCfg(cfgBtn));
  $('#cfgBtn2').addEventListener('click', (e) => openCfg(e.currentTarget));
  $('#cfgClose').addEventListener('click', closeCfg);
  mask.addEventListener('click', closeCfg);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCfg(); });

  $('#cfgTheme').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    cfg.theme = b.dataset.v; saveCfg(); applyTheme();
  });
  petalsIn.addEventListener('input', () => { cfg.petals = +petalsIn.value; syncRange(petalsIn, $('#cfgPetalsOut')); Petals.refresh(); saveCfg(); });
  speedIn.addEventListener('input', () => { cfg.speed = +speedIn.value; syncRange(speedIn, $('#cfgSpeedOut')); saveCfg(); });
  fxIn.addEventListener('change', () => { cfg.fx = fxIn.checked; saveCfg(); });
  $('#cfgReset').addEventListener('click', () => { Object.assign(cfg, DEFAULTS); saveCfg(); syncControls(); applyTheme(); Petals.refresh(); });

  /* ==========================================================
     ADV 对话框（打字机）
     ========================================================== */
  const Adv = (() => {
    const box = $('#adv'), textEl = $('#advText'), nameEl = $('#advName');
    const autoBtn = $('#advAuto'), logBtn = $('#advLog'), logPanel = $('#advLogPanel'), logList = $('#advLogList');
    const GUIDE = [
      '欢迎光临～这里是栗子tc 的小站。我是负责带路的看板娘，小栗。',
      '这里的主人喜欢人工智能和二次元，还有一切能把想法做成作品的工具。',
      '会呼吸的 Live2D 角色、住在桌面上的 AI 女仆、自己用的图库……都是主人和 AI 一起做出来的。',
      '点一下对话框可以继续。想直接逛的话，从左边的菜单选一个章节吧。',
      '对了，右上角的齿轮里可以调花瓣数量和文字速度哦。',
    ];
    const SELF = [
      '欢迎光临～这里是栗子tc 的个人小站。',
      '我喜欢人工智能和二次元，还有一切能把想法做成作品的工具。',
      '会呼吸的 Live2D 角色、住在桌面上的 AI 女仆、自己用的图库……都是我和 AI 一起做出来的。',
      '点一下对话框可以继续。想直接逛的话，从左边的菜单选一个章节吧。',
      '对了，右上角的齿轮里可以调花瓣数量和文字速度哦。',
    ];
    let lines = GUIDE, name = '小栗';
    let idx = -1, pos = 0, typing = false, timer = 0, autoTimer = 0, auto = true, visible = true, started = false, logged = -1;

    const charDelay = (ch) => {
      const base = 92 - cfg.speed * .82;
      return '。，、～…？！'.includes(ch) ? base * 4.5 : base;
    };
    const done = () => {
      typing = false; box.classList.add('done');
      if (idx > logged) {
        logged = idx;
        const li = document.createElement('li');
        const b = document.createElement('b'); b.textContent = name;
        li.append(b, lines[idx]);
        logList.append(li);
      }
      clearTimeout(autoTimer);
      if (auto && visible) autoTimer = setTimeout(next, 3200);
    };
    const tick = () => {
      const line = lines[idx];
      if (pos >= line.length) { done(); return; }
      pos++;
      textEl.textContent = line.slice(0, pos);
      timer = setTimeout(tick, charDelay(line[pos - 1]));
    };
    const show = (i) => {
      clearTimeout(timer); clearTimeout(autoTimer);
      idx = i; pos = 0; typing = true; box.classList.remove('done');
      textEl.textContent = '';
      if (reduceMotion) { pos = lines[idx].length; textEl.textContent = lines[idx]; done(); return; }
      tick();
    };
    function next() { show((idx + 1) % lines.length); }
    const advance = () => {
      if (!started) return;
      if (typing) { clearTimeout(timer); pos = lines[idx].length; textEl.textContent = lines[idx]; done(); }
      else next();
    };

    $('#advBody').addEventListener('click', advance);
    autoBtn.addEventListener('click', () => {
      auto = !auto;
      autoBtn.classList.toggle('on', auto); autoBtn.setAttribute('aria-pressed', String(auto));
      clearTimeout(autoTimer);
      if (auto && !typing && started) autoTimer = setTimeout(next, 1200);
    });
    logBtn.addEventListener('click', () => {
      const open = logPanel.hidden;
      logPanel.hidden = !open; logBtn.classList.toggle('on', open); logBtn.setAttribute('aria-expanded', String(open));
      if (open) logPanel.scrollTop = logPanel.scrollHeight;
    });
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      clearTimeout(autoTimer);
      if (visible && auto && started && !typing) autoTimer = setTimeout(next, 1600);
    }, { threshold: .3 }).observe(box);

    return {
      start() {
        const img = $('.char-img');
        const hasMascot = img && img.complete && img.naturalWidth > 0;
        if (!hasMascot) { lines = SELF; name = '栗子tc'; }
        nameEl.textContent = name;
        started = true; show(0);
      },
    };
  })();

  /* ==========================================================
     入场：载入完成后揭幕
     ========================================================== */
  let revealed = false;
  const curtainUp = () => {
    if (revealed) return;
    revealed = true;
    document.body.classList.add('ready');
    setTimeout(() => Adv.start(), reduceMotion ? 0 : 1700);
  };
  if (document.readyState === 'complete') setTimeout(curtainUp, 300);
  else window.addEventListener('load', () => setTimeout(curtainUp, 300));
  setTimeout(curtainUp, 3500); // 网络慢时也不会一直挡着

  /* ==========================================================
     标题画面视差
     ========================================================== */
  if (finePointer && !reduceMotion) {
    const hero = $('.hero');
    let tx = 0, ty = 0, x = 0, y = 0, on = false;
    const step = () => {
      x += (tx - x) * .07; y += (ty - y) * .07;
      hero.style.setProperty('--px', x.toFixed(4));
      hero.style.setProperty('--py', y.toFixed(4));
      if (Math.abs(tx - x) + Math.abs(ty - y) > .001) requestAnimationFrame(step); else on = false;
    };
    window.addEventListener('pointermove', (e) => {
      if (window.scrollY > window.innerHeight) return;
      tx = (e.clientX / window.innerWidth - .5) * 2;
      ty = (e.clientY / window.innerHeight - .5) * 2;
      if (!on) { on = true; requestAnimationFrame(step); }
    }, { passive: true });
  }

  /* ==========================================================
     滚动：导航、进度、小看板娘
     ========================================================== */
  const nav = $('#nav'), bar = $('#progressBar'), pet = $('#pet');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle('scrolled', y > 40);
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    pet.classList.toggle('show', y > window.innerHeight * .6);
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  const links = $$('.nav-links a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('active', a.dataset.sec === en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main .sec').forEach((s) => spy.observe(s));
  new IntersectionObserver(([en]) => { if (en.isIntersecting) links.forEach((a) => a.classList.remove('active')); }, { threshold: .5 }).observe($('.hero'));

  /* ==========================================================
     滚动揭示与数字滚动
     ========================================================== */
  const countUp = (el) => {
    const to = +el.dataset.count;
    el.dataset.done = '1';
    if (reduceMotion || !to) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1300;
    const f = (now) => {
      const k = clamp((now - t0) / dur, 0, 1);
      el.textContent = Math.round((+el.dataset.count) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  };
  $$('.reveal').forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--d', Math.min(sibs.indexOf(el), 5) * 90 + 'ms');
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      $$('[data-count]', en.target).forEach(countUp);
      io.unobserve(en.target);
    });
  }, { threshold: .14, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ==========================================================
     卡片 3D 倾斜
     ========================================================== */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.classList.add('tilting');
        el.style.setProperty('--rx', ((.5 - py) * 9).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((px - .5) * 11).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('tilting');
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ==========================================================
     小看板娘
     ========================================================== */
  const PET_LINES = [
    '要不要再去看看作品？千绘莉的耳朵可以拽哦。',
    '主人今天也在和 AI 一起做东西。',
    '摸头可以，拽耳朵不行！',
    '日语还在 N4……がんばります！',
    '花瓣太多的话，去右上角的齿轮里调一调。',
    '下一个作品做好了，会第一时间摆到这里来。',
    '把想象中的事物变成现实，听起来很帅吧？',
  ];
  const bubble = $('#petBubble'), petBtn = $('#petBtn');
  let petIdx = -1, petTimer = 0;
  petBtn.addEventListener('click', () => {
    let i; do { i = (Math.random() * PET_LINES.length) | 0; } while (i === petIdx);
    petIdx = i;
    bubble.textContent = PET_LINES[i];
    bubble.classList.add('show');
    petBtn.classList.remove('hop'); void petBtn.offsetWidth; petBtn.classList.add('hop');
    clearTimeout(petTimer);
    petTimer = setTimeout(() => bubble.classList.remove('show'), 3600);
  });
  $('#topBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  /* ==========================================================
     GitHub 实时数据（失败时保留页面里写好的数字）
     ========================================================== */
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? null : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };
  const setCount = (el, v) => { if (!el) return; el.dataset.count = v; if (el.dataset.done) el.textContent = v; };
  fetch('https://api.github.com/users/lizitc/repos?per_page=100&sort=updated')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((list) => {
      if (!Array.isArray(list)) return;
      let stars = 0, repos = 0;
      list.forEach((r) => {
        if (r.fork) return;
        repos++; stars += r.stargazers_count || 0;
        const card = document.querySelector(`.work[data-repo="${CSS.escape(r.name)}"]`);
        if (!card) return;
        const put = (k, v) => { const el = $(`[data-k="${k}"]`, card); if (el && v != null) el.textContent = v; };
        put('stars', r.stargazers_count); put('forks', r.forks_count); put('pushed', fmtDate(r.pushed_at));
      });
      setCount($('#statRepos'), repos); setCount($('#statStars'), stars);
    })
    .catch(() => { /* 离线或被限流：使用静态数字 */ });

  /* ==========================================================
     启动
     ========================================================== */
  syncControls();
  Petals.init();
  applyTheme();
})();

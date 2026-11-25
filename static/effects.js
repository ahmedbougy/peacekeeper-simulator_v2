(function () {
  "use strict";

  /* ---------- SOUND (synthesized, no files) ---------- */
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var muted = false;
  try { muted = localStorage.getItem("pk_muted") === "1"; } catch (e) {}

  function getCtx() {
    if (!AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, vol, slideTo) {
    if (muted) return;
    var c = getCtx();
    if (!c) return;
    var t0 = c.currentTime + start;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  var C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;

  var S = {
    blip: function () { tone(880, 0, 0.06, "triangle", 0.08); },
    start: function () {
      tone(C5, 0, 0.12, "square", 0.12);
      tone(G5, 0.1, 0.12, "square", 0.12);
      tone(C6, 0.2, 0.25, "square", 0.12);
    },
    calm: function () {
      [C5, E5, G5, C6].forEach(function (f, i) { tone(f, i * 0.09, 0.35, "sine", 0.22); });
      tone(C6 * 2, 0.4, 0.4, "triangle", 0.08);
    },
    avoid: function () {
      tone(440, 0, 0.18, "triangle", 0.18);
      tone(392, 0.16, 0.3, "triangle", 0.18);
    },
    aggr: function () {
      tone(160, 0, 0.45, "sawtooth", 0.22, 70);
      tone(110, 0.05, 0.45, "square", 0.12, 55);
    },
    win: function () {
      [C5, E5, G5, C6, G5, C6].forEach(function (f, i) { tone(f, i * 0.13, 0.28, "square", 0.14); });
      tone(C6, 0.85, 0.9, "triangle", 0.2);
      tone(G5, 0.85, 0.9, "triangle", 0.15);
    },
    mid: function () {
      [C5, E5, G5].forEach(function (f, i) { tone(f, i * 0.16, 0.35, "triangle", 0.2); });
    },
    lose: function () {
      [392, 370, 349, 330].forEach(function (f, i) { tone(f, i * 0.28, 0.45, "sawtooth", 0.12); });
    }
  };

  // Run fn when audio is allowed (handles browser autoplay rules)
  function whenAudioReady(fn) {
    var c = getCtx();
    if (!c) return;
    setTimeout(function () {
      if (c.state === "running") { fn(); return; }
      var once = function () {
        getCtx();
        fn();
        window.removeEventListener("pointerdown", once);
        window.removeEventListener("keydown", once);
      };
      window.addEventListener("pointerdown", once);
      window.addEventListener("keydown", once);
    }, 150);
  }

  /* ---------- CONFETTI ---------- */
  var COLORS = ["#ffd34d", "#3ddc84", "#4dabff", "#ff6bd6", "#ffa94d", "#ffffff"];
  var HOT = ["#ff6b6b", "#ffa94d", "#ffd34d"];

  var Confetti = {
    cv: null, cx: null, p: [], running: false,
    init: function () {
      if (this.cv) return;
      var cv = document.createElement("canvas");
      cv.className = "confetti";
      document.body.appendChild(cv);
      this.cv = cv;
      this.cx = cv.getContext("2d");
      function resize() { cv.width = window.innerWidth; cv.height = window.innerHeight; }
      resize();
      window.addEventListener("resize", resize);
    },
    burst: function (x, y, n, colors) {
      this.init();
      colors = colors || COLORS;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2;
        var s = 4 + Math.random() * 11;
        this.p.push({
          x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 5,
          w: 6 + Math.random() * 8, h: 4 + Math.random() * 6,
          r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          c: colors[i % colors.length], life: 1.6
        });
      }
      this.start();
    },
    rain: function (ms) {
      this.init();
      var self = this;
      var end = Date.now() + ms;
      var iv = setInterval(function () {
        for (var j = 0; j < 7; j++) {
          self.p.push({
            x: Math.random() * window.innerWidth, y: -20,
            vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
            w: 6 + Math.random() * 8, h: 4 + Math.random() * 6,
            r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
            c: COLORS[j % COLORS.length], life: 5
          });
        }
        self.start();
        if (Date.now() > end) clearInterval(iv);
      }, 60);
    },
    start: function () {
      if (this.running) return;
      this.running = true;
      var self = this;
      (function frame() {
        var cx = self.cx;
        cx.clearRect(0, 0, self.cv.width, self.cv.height);
        self.p = self.p.filter(function (q) { return q.life > 0 && q.y < self.cv.height + 30; });
        self.p.forEach(function (q) {
          q.vy += 0.25; q.vx *= 0.99;
          q.x += q.vx; q.y += q.vy; q.r += q.vr; q.life -= 0.008;
          cx.save();
          cx.globalAlpha = Math.max(0, Math.min(1, q.life));
          cx.translate(q.x, q.y);
          cx.rotate(q.r);
          cx.fillStyle = q.c;
          cx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
          cx.restore();
        });
        if (self.p.length) requestAnimationFrame(frame);
        else self.running = false;
      })();
    }
  };

  /* ---------- HELPERS ---------- */
  function countUp(el, from, to, ms) {
    var t0 = performance.now();
    requestAnimationFrame(function step(t) {
      var k = Math.min(1, (t - t0) / ms);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    });
  }

  /* ---------- MUTE BUTTON ---------- */
  var muteBtn = document.getElementById("muteBtn");
  function paintMute() { if (muteBtn) muteBtn.textContent = muted ? "🔇" : "🔊"; }
  if (muteBtn) {
    paintMute();
    muteBtn.addEventListener("click", function () {
      muted = !muted;
      try { localStorage.setItem("pk_muted", muted ? "1" : "0"); } catch (e) {}
      paintMute();
      if (!muted) S.blip();
    });
  }

  /* ---------- HOME PAGE ---------- */
  var modeForm = document.querySelector(".mode-form");
  if (modeForm) {
    var started = false;
    modeForm.querySelectorAll(".mode-card").forEach(function (btn) {
      btn.addEventListener("mouseenter", S.blip);
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        if (started) return;
        started = true;
        S.start();
        var r = btn.getBoundingClientRect();
        Confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 80);
        var h = document.createElement("input");
        h.type = "hidden"; h.name = "mode"; h.value = btn.value;
        modeForm.appendChild(h);
        setTimeout(function () { modeForm.submit(); }, 450);
      });
    });
  }

  /* ---------- SCENARIO PAGE ---------- */
  var form = document.querySelector(".choices");
  if (form) {
    var locked = false;
    var buttons = Array.prototype.slice.call(form.querySelectorAll(".choice"));
    var hud = document.getElementById("hud");
    var hudNum = document.getElementById("hudNum");

    var FEEDBACK = {
      calm:       { big: "+3", sub: "Peacemaker move! 🕊️" },
      avoidant:   { big: "+1", sub: "Tension left unresolved… 😬" },
      aggressive: { big: "+0", sub: "Fire started! 🔥" }
    };

    function pick(btn) {
      if (locked) return;
      locked = true;
      var style = btn.dataset.style;
      var pts = parseInt(btn.dataset.pts, 10) || 0;
      var fb = FEEDBACK[style] || FEEDBACK.avoidant;

      form.classList.add("locked");
      btn.classList.add("picked");
      buttons.forEach(function (b) { if (b !== btn) b.classList.add("dimmed"); });

      // Overlay
      var ov = document.createElement("div");
      ov.className = "fx-overlay " + style;
      ov.innerHTML = '<div class="fx-big">' + fb.big + '</div><div class="fx-sub">' + fb.sub + "</div>";
      document.body.appendChild(ov);
      void ov.offsetWidth;
      ov.classList.add("show");

      // Sound + visuals per style
      if (style === "calm") {
        S.calm();
        Confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 140);
      } else if (style === "avoidant") {
        S.avoid();
      } else {
        S.aggr();
        var c = document.querySelector(".container");
        if (c) c.classList.add("shake");
        Confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 50, HOT);
      }

      // HUD score
      if (hud && hudNum) {
        var cur = parseInt(hud.dataset.score, 10) || 0;
        hud.classList.add("pop");
        countUp(hudNum, cur, cur + pts, 600);
      }

      var h = document.createElement("input");
      h.type = "hidden"; h.name = "choice"; h.value = btn.value;
      form.appendChild(h);
      setTimeout(function () { form.submit(); }, 1300);
    }

    buttons.forEach(function (b) {
      b.addEventListener("mouseenter", S.blip);
      b.addEventListener("click", function (e) { e.preventDefault(); pick(b); });
    });

    // Keyboard shortcuts: 1/2/3 or A/B/C
    window.addEventListener("keydown", function (e) {
      var k = e.key.toLowerCase();
      var map = { "1": 0, "2": 1, "3": 2, "a": 0, "b": 1, "c": 2 };
      if (map.hasOwnProperty(k) && buttons[map[k]]) pick(buttons[map[k]]);
    });
  }

  /* ---------- RESULT PAGE ---------- */
  var result = document.querySelector(".result[data-tier]");
  if (result) {
    var tier = parseInt(result.dataset.tier, 10);
    var num = result.querySelector(".num");
    if (num) countUp(num, 0, parseInt(num.dataset.score, 10) || 0, 1600);

    setTimeout(function () {
      whenAudioReady(function () {
        if (tier === 3) S.win(); else if (tier === 2) S.mid(); else S.lose();
      });
      if (tier === 3) {
        Confetti.rain(6000);
        Confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 160);
      } else if (tier === 2) {
        Confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 90);
      }
    }, 500);
  }
})();
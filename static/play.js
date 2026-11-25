(function () {
  "use strict";
  var el = PK.el, clear = PK.clear;
  var app = document.getElementById("app");

  /* ---- storage (falls back to memory if the browser blocks it) ---- */
  var mem = {};
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {
      if (v === undefined) return k in mem ? mem[k] : null;
      mem[k] = v;
    }
  }
  function makePid() {
    var a = new Uint8Array(12), s = "";
    try { (window.crypto || window.msCrypto).getRandomValues(a); }
    catch (e) { for (var i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < a.length; j++) s += ("0" + a[j].toString(16)).slice(-2);
    return s;
  }
  var pid = ls("pk_pid");
  if (!pid) { pid = makePid(); ls("pk_pid", pid); }

  /* ---- network ---- */
  function getState() {
    return fetch("/api/state?pid=" + encodeURIComponent(pid), { cache: "no-store" })
      .then(function (r) { return r.json(); });
  }
  function post(url, body) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }

  var sig = "", busy = false, failed = false, cur = null;
  var banner = el("div", "banner", "Reconnecting…");
  banner.style.display = "none";
  document.body.appendChild(banner);

  function tick() {
    if (busy) return;
    busy = true;
    getState()
      .then(function (s) { banner.style.display = "none"; handle(s); })
      .catch(function () { banner.style.display = "block"; })
      .then(function () { busy = false; });
  }

  function join() {
    post("/api/join", { pid: pid, name: ls("pk_name") || "Guest" })
      .then(function (st) {
        if (st.registered) { failed = false; sig = ""; handle(st); }
        else { failed = true; viewMsg("The room is full right now. Ask the host."); }
      })
      .catch(function () { banner.style.display = "block"; });
  }

  function handle(s) {
    if (!s.registered) {
      if (failed) return;
      if (ls("pk_name") !== null) join(); else viewName();
      return;
    }
    cur = s;
    var g = [s.phase, s.sid, s.my_vote, s.number, s.mode].join("|");
    if (g !== sig) { sig = g; render(s); } else { live(s); }
  }

  /* ---- views ---- */
  function top(s) {
    var t = el("div", "topbar");
    t.appendChild(el("span", "brand", "🕊️ Peacekeeper"));
    var right = (ls("pk_name") || "Guest");
    if (s && (s.phase === "question" || s.phase === "reveal")) right += " · " + s.number + "/" + s.total;
    t.appendChild(el("span", null, right));
    return t;
  }

  function viewMsg(text) {
    sig = "msg"; clear(app); app.appendChild(top());
    var c = el("section", "card"); c.appendChild(el("p", null, text)); app.appendChild(c);
  }

  function viewName() {
    if (sig === "form") return;
    sig = "form"; clear(app); app.appendChild(top());
    var c = el("section", "card");
    c.appendChild(el("h2", null, "Join the room"));
    c.appendChild(el("p", "muted", "Pick a nickname, or leave it blank."));
    var inp = el("input", "field");
    inp.maxLength = 16; inp.placeholder = "Nickname"; inp.autocomplete = "off";
    var btn = el("button", "btn", "Join"); btn.type = "button";
    function go() { ls("pk_name", inp.value.trim() || "Guest"); join(); }
    btn.addEventListener("click", go);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    c.appendChild(inp); c.appendChild(btn); app.appendChild(c);
  }

  function render(s) {
    clear(app);
    app.appendChild(top(s));
    if (s.phase === "lobby") {
      var c = el("section", "card center");
      c.appendChild(el("h2", null, "You're in!"));
      c.appendChild(el("p", "muted", "Waiting for the host to start…"));
      c.appendChild(el("p", "big", ""));
      c.lastChild.id = "pcount";
      c.lastChild.textContent = s.players + " players";
      app.appendChild(c);
    } else if (s.phase === "question") {
      renderQuestion(s);
    } else if (s.phase === "reveal") {
      renderReveal(s);
    } else if (s.phase === "final") {
      renderFinal(s);
    }
    window.scrollTo(0, 0);
  }

  function renderQuestion(s) {
    var card = el("section", "card");
    card.appendChild(el("span", "badge", s.scenario.badge));
    card.appendChild(el("h2", null, s.scenario.title));
    card.appendChild(el("p", "story", s.scenario.text));
    app.appendChild(card);
    s.choices.forEach(function (c) {
      var b = el("button", "choice" + (s.my_vote === c.value ? " picked" : ""));
      b.type = "button";
      b.appendChild(el("span", "letter", c.letter));
      var body = el("span", "cbody");
      body.appendChild(el("span", "clabel", c.label));
      body.appendChild(el("span", "ctext", c.text));
      b.appendChild(body);
      b.addEventListener("click", function () { vote(s.sid, c.value); });
      app.appendChild(b);
    });
    var st = el("p", "status", s.my_vote == null ? "Tap your answer"
      : "Locked in ✔ You can change it until the host reveals.");
    app.appendChild(st);
    var v = el("p", "muted center", ""); v.id = "voted";
    v.textContent = s.voted + " of " + s.players + " voted";
    app.appendChild(v);
  }

  function vote(sid, choice) {
    post("/api/vote", { pid: pid, sid: sid, choice: choice })
      .then(function (r) { if (r.ok) { handle(r.state); } else { tick(); } })
      .catch(function () { banner.style.display = "block"; });
  }

  function renderReveal(s) {
    var c = el("section", "card center");
    if (s.my_points == null) {
      c.appendChild(el("div", "pts none", "—"));
      c.appendChild(el("p", "muted", "You didn't vote this round."));
    } else {
      c.appendChild(el("div", "pts " + s.my_style, "+" + s.my_points));
      c.appendChild(el("p", "msg " + s.my_style, PK.STYLE[s.my_style].msg));
    }
    if (s.my_total != null) c.appendChild(el("p", "muted", "Your total: " + s.my_total + " pts"));
    app.appendChild(c);
    var r = el("section", "card");
    r.appendChild(el("h3", null, "What the room chose"));
    r.appendChild(PK.bars(s.results));
    app.appendChild(r);
    app.appendChild(PK.whyCard(s.why));
    app.appendChild(el("p", "muted center", "Look at the big screen…"));
  }

  function renderFinal(s) {
    var c = el("section", "card center");
    if (!s.me) {
      c.appendChild(el("h2", null, "Game over"));
      c.appendChild(el("p", "muted", "You didn't vote this time. Join the next round!"));
      app.appendChild(c);
      return;
    }
    var tier = s.me.scaled >= 21 ? "calm" : (s.me.scaled >= 11 ? "avoidant" : "aggressive");
    c.appendChild(el("span", "badge", s.me.rank.badge));
    c.appendChild(el("h1", "rank " + tier, s.me.rank.name));
    var sc = el("div", "score", String(s.me.scaled)); sc.appendChild(el("span", null, "/30"));
    c.appendChild(sc);
    c.appendChild(el("p", null, s.me.rank.feedback));
    app.appendChild(c);
    var b = el("section", "card");
    var row = el("div", "mini-stats");
    [["calm", "Calm"], ["avoidant", "Avoidant"], ["aggressive", "Aggressive"]].forEach(function (x) {
      var m = el("div", "mini " + x[0]);
      m.appendChild(el("b", null, String(s.me.styles[x[0]])));
      m.appendChild(el("span", null, x[1]));
      row.appendChild(m);
    });
    b.appendChild(row);
    app.appendChild(b);
    var q = el("blockquote", null, "“" + s.me.rank.quote + "”");
    app.appendChild(q);
  }

  // Small in-place updates so buttons never re-render under a finger.
  function live(s) {
    var p = document.getElementById("pcount");
    if (p && s.phase === "lobby") p.textContent = s.players + " players";
    var v = document.getElementById("voted");
    if (v && s.phase === "question") v.textContent = s.voted + " of " + s.players + " voted";
  }

  tick();
  setInterval(tick, 1500);
})();

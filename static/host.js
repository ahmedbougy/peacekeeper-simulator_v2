(function () {
  "use strict";
  var el = PK.el, clear = PK.clear;
  var app = document.getElementById("app");
  var sig = "", S = null, busy = false, acting = false;

  function api(url, body) {
    var opt = body ? { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body) } : { cache: "no-store" };
    return fetch(url, opt).then(function (r) {
      if (r.status === 401) { location.href = "/host/login"; throw new Error("auth"); }
      return r.json();
    });
  }
  function act(a) {
    if (acting) return;
    acting = true;
    api("/api/host/action", { action: a }).then(apply).catch(function () {})
      .then(function () { acting = false; });
  }
  function tick() {
    if (busy) return;
    busy = true;
    api("/api/host/state").then(apply).catch(function () {}).then(function () { busy = false; });
  }
  function apply(s) {
    if (!s || !s.phase) return;
    S = s;
    var g = [s.phase, s.sid, s.number, s.mode].join("|");
    if (g !== sig) { sig = g; render(s); } else { live(s); }
  }

  function joinUrl() {
    var host = location.host, lan = document.body.dataset.lan;
    if ((location.hostname === "localhost" || location.hostname === "127.0.0.1") && lan) {
      host = lan + (location.port ? ":" + location.port : "");
    }
    return location.protocol + "//" + host + "/play";
  }

  function btn(label, cls, fn) {
    var b = el("button", "btn " + (cls || ""), label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  }

  function header(s) {
    var h = el("div", "h-top");
    h.appendChild(el("span", "brand", "🕊️ Peacekeeper Simulator"));
    var mid = el("span", "h-mid", "Scenario " + s.number + " of " + s.total);
    h.appendChild(mid);
    h.appendChild(el("span", "h-right", "👥 " + s.players));
    app.appendChild(h);
    var pr = el("div", "progress");
    var f = el("div", "progress-bar");
    f.style.width = Math.round((s.number - (s.phase === "reveal" ? 0 : 1)) / s.total * 100) + "%";
    pr.appendChild(f);
    app.appendChild(pr);
  }

  function controls(items) {
    var c = el("div", "controls");
    items.forEach(function (i) { c.appendChild(i); });
    app.appendChild(c);
  }

  function render(s) {
    clear(app);
    if (s.phase === "lobby") lobby(s);
    else if (s.phase === "question") question(s);
    else if (s.phase === "reveal") reveal(s);
    else if (s.phase === "final") final(s);
    window.scrollTo(0, 0);
  }

  function lobby(s) {
    var w = el("section", "hero");
    w.appendChild(el("h1", null, "Peacekeeper Simulator"));
    w.appendChild(el("p", "lead", "Join on your phone"));
    w.appendChild(el("div", "joinurl", joinUrl()));
    var img = el("img", "qr");
    img.src = "/static/qr.png"; img.alt = "QR code";
    img.onerror = function () { img.style.display = "none"; };
    w.appendChild(img);
    var pc = el("div", "pcount", s.players + " players joined"); pc.id = "pcount";
    w.appendChild(pc);
    var chips = el("div", "chips"); chips.id = "chips";
    w.appendChild(chips);
    app.appendChild(w);
    fillChips(s);
    controls([
      btn("Start Full Run (10)", "", function () { act("start_full"); }),
      btn("Start Quick Demo (5)", "alt", function () { act("start_quick"); })
    ]);
  }

  var lastNames = "";
  function fillChips(s) {
    var box = document.getElementById("chips");
    var key = (s.names || []).join("\u0001");
    if (!box || key === lastNames) return;
    lastNames = key;
    clear(box);
    (s.names || []).forEach(function (n) { box.appendChild(el("span", "chip", n)); });
  }

  function question(s) {
    header(s);
    var sc = el("section", "stage");
    sc.appendChild(el("span", "badge", s.scenario.badge));
    sc.appendChild(el("h2", null, s.scenario.title));
    sc.appendChild(el("p", "story", s.scenario.text));
    app.appendChild(sc);
    var row = el("div", "choice-row");
    s.choices.forEach(function (c) {
      var card = el("div", "choice-card");
      card.appendChild(el("span", "letter", c.letter));
      card.appendChild(el("div", "clabel", c.label));
      card.appendChild(el("div", "ctext", c.text));
      row.appendChild(card);
    });
    app.appendChild(row);
    var m = el("div", "meter");
    m.appendChild(el("div", "meter-text", ""));
    m.firstChild.id = "meterText";
    var tr = el("div", "track"); var fl = el("div", "fill calm"); fl.id = "meterFill";
    tr.appendChild(fl); m.appendChild(tr);
    app.appendChild(m);
    live(s);
    controls([btn("Reveal results  (Space)", "", function () { act("reveal"); })]);
  }

  function reveal(s) {
    header(s);
    var sc = el("section", "stage");
    sc.appendChild(el("h2", null, s.scenario.title));
    app.appendChild(sc);
    var big = el("div", "big-bars");
    big.appendChild(PK.bars(s.results));
    app.appendChild(big);
    app.appendChild(PK.whyCard(s.why));
    var last = s.number >= s.total;
    controls([btn(last ? "Show final results  (Space)" : "Next scenario  (Space)", "", function () { act("next"); })]);
  }

  function final(s) {
    var f = s.final;
    var w = el("section", "stage center");
    w.appendChild(el("h1", null, "Room results"));
    w.appendChild(el("p", "lead", f.players
      ? f.players + " players · average score " + f.average + " / 30"
      : "No votes were cast."));
    app.appendChild(w);
    var cls = { "Master Peacekeeper": "calm", "Borderline Diplomat": "avoidant", "Accidental Flame-Starter": "aggressive" };
    var row = el("div", "tier-row");
    f.tiers.forEach(function (t) {
      var c = el("div", "tier " + cls[t.name]);
      c.appendChild(el("div", "tier-pct", t.percent + "%"));
      c.appendChild(el("div", "tier-name", t.name));
      c.appendChild(el("div", "tier-count", t.count + (t.count === 1 ? " player" : " players")));
      row.appendChild(c);
    });
    app.appendChild(row);

    var sb = el("section", "stage");
    sb.appendChild(el("h3", null, "How the room responded overall"));
    var bar = el("div", "split");
    [["calm", "Calm"], ["avoidant", "Avoidant"], ["aggressive", "Aggressive"]].forEach(function (x) {
      var seg = el("div", "seg " + x[0], f.styles[x[0]] ? x[1] + " " + f.styles[x[0]] + "%" : "");
      seg.style.flexGrow = String(f.styles[x[0]] || 0);
      bar.appendChild(seg);
    });
    sb.appendChild(bar);
    app.appendChild(sb);

    if (f.top.length) {
      var lb = el("section", "stage");
      lb.appendChild(el("h3", null, "Top peacekeepers"));
      var ol = el("ol", "board");
      f.top.forEach(function (r) {
        var li = el("li");
        li.appendChild(el("span", "n", r.name));
        li.appendChild(el("span", "s", r.scaled + " / 30"));
        ol.appendChild(li);
      });
      lb.appendChild(ol);
      app.appendChild(lb);
    }
    controls([
      btn("New game (same players)", "", function () { act("lobby"); }),
      btn("Reset everything", "alt", function () { act("reset"); })
    ]);
  }

  function live(s) {
    if (s.phase === "lobby") {
      var p = document.getElementById("pcount");
      if (p) p.textContent = s.players + (s.players === 1 ? " player joined" : " players joined");
      fillChips(s);
    } else if (s.phase === "question") {
      var t = document.getElementById("meterText"), f = document.getElementById("meterFill");
      if (t) t.textContent = s.voted + " / " + s.players + " voted";
      if (f) f.style.width = (s.players ? Math.round(s.voted * 100 / s.players) : 0) + "%";
    }
  }

  window.addEventListener("keydown", function (e) {
    if (!S || (e.key !== " " && e.key !== "ArrowRight")) return;
    if (S.phase === "question") act("reveal");
    else if (S.phase === "reveal") act("next");
    else return;
    e.preventDefault();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });

  tick();
  setInterval(tick, 1000);
})();

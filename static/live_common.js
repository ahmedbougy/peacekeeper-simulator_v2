(function () {
  "use strict";
  var PK = (window.PK = {});

  PK.el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;   // never innerHTML: names are user input
    return e;
  };
  PK.clear = function (n) { while (n.firstChild) n.removeChild(n.firstChild); };

  PK.STYLE = {
    calm: { tag: "Calm", msg: "Peacemaker move!" },
    avoidant: { tag: "Avoidant", msg: "Tension left unresolved" },
    aggressive: { tag: "Aggressive", msg: "Fire started!" }
  };

  // Animated result bars. results: [{letter,label,style,points,count}]
  PK.bars = function (results) {
    var el = PK.el, total = 0;
    results.forEach(function (r) { total += r.count; });
    var box = el("div", "bars");
    results.forEach(function (r) {
      var pct = total ? Math.round(r.count * 100 / total) : 0;
      var row = el("div", "bar-row");
      var head = el("div", "bar-head");
      head.appendChild(el("span", "bar-letter", r.letter));
      head.appendChild(el("span", "bar-label", r.label));
      head.appendChild(el("span", "bar-tag " + r.style, PK.STYLE[r.style].tag + " · +" + r.points));
      head.appendChild(el("span", "bar-num", r.count + " (" + pct + "%)"));
      var track = el("div", "track");
      var fill = el("div", "fill " + r.style);
      fill.style.width = "0%";
      track.appendChild(fill);
      row.appendChild(head);
      row.appendChild(track);
      box.appendChild(row);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { fill.style.width = pct + "%"; });
      });
    });
    return box;
  };

  PK.whyCard = function (w) {
    var c = PK.el("section", "why");
    c.appendChild(PK.el("div", "why-kicker", "Why it matters"));
    c.appendChild(PK.el("div", "why-title", w.concept));
    c.appendChild(PK.el("p", "why-text", w.text));
    return c;
  };
})();

import os
import random
from flask import Flask, render_template, request, redirect, url_for, session
from scenarios import SCENARIOS, QUICK_INDEXES, get_rank
from live import live_bp, _lan_ip

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "peacekeeper-demo-secret-key")
app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_HTTPONLY=True)
app.register_blueprint(live_bp)   # Live Room: /play, /host, /api/*

# Solo-mode keys only, so starting a solo game never logs the host out.
SOLO_KEYS = ("mode", "idx", "score", "styles", "seed")


def clear_solo():
    for k in SOLO_KEYS:
        session.pop(k, None)


def current_set():
    if session.get("mode") == "quick":
        return [SCENARIOS[i] for i in QUICK_INDEXES]
    return SCENARIOS


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/start", methods=["POST"])
def start():
    mode = request.form.get("mode", "full")
    clear_solo()
    session["mode"] = "quick" if mode == "quick" else "full"
    session["idx"] = 0
    session["score"] = 0
    session["styles"] = {"aggressive": 0, "avoidant": 0, "calm": 0}
    session["seed"] = random.randint(1, 10 ** 6)
    return redirect(url_for("scenario"))


@app.route("/scenario")
def scenario():
    if "idx" not in session:
        return redirect(url_for("index"))
    items = current_set()
    idx = session["idx"]
    if idx >= len(items):
        return redirect(url_for("result"))

    sc = items[idx]
    order = [0, 1, 2]
    random.Random(session["seed"] + idx).shuffle(order)
    choices = []
    for pos, original in enumerate(order):
        style, label, text, pts = sc["choices"][original]
        choices.append({"letter": "ABC"[pos], "value": original,
                        "label": label, "text": text,
                        "style": style, "pts": pts})
    return render_template(
        "scenario.html", sc=sc, choices=choices,
        number=idx + 1, total=len(items),
        percent=int(idx / len(items) * 100), score=session["score"])


@app.route("/answer", methods=["POST"])
def answer():
    if "idx" not in session:
        return redirect(url_for("index"))
    items = current_set()
    idx = session["idx"]
    if idx >= len(items):
        return redirect(url_for("result"))
    try:
        form_idx = int(request.form.get("idx", -1))
        choice = int(request.form.get("choice", -1))
    except ValueError:
        return redirect(url_for("scenario"))
    if form_idx != idx or choice not in (0, 1, 2):
        return redirect(url_for("scenario"))

    style, _label, _text, pts = items[idx]["choices"][choice]
    styles = session["styles"]
    styles[style] += 1
    session["styles"] = styles
    session["score"] = session["score"] + pts
    session["idx"] = idx + 1
    if session["idx"] >= len(items):
        return redirect(url_for("result"))
    return redirect(url_for("scenario"))


@app.route("/result")
def result():
    if "idx" not in session:
        return redirect(url_for("index"))
    items = current_set()
    if session["idx"] < len(items):
        return redirect(url_for("scenario"))
    raw = session["score"]
    max_raw = len(items) * 3
    scaled = round(raw / max_raw * 30)
    return render_template("result.html", raw=raw, max_raw=max_raw,
                           scaled=scaled, rank=get_rank(scaled),
                           styles=session["styles"], total=len(items))


@app.route("/reset")
def reset():
    clear_solo()
    return redirect(url_for("index"))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    ip = _lan_ip()
    print("\n  Solo game : http://127.0.0.1:%d" % port)
    print("  Host page : http://127.0.0.1:%d/host   (password: %s)"
          % (port, os.environ.get("HOST_PASSWORD", "peace")))
    if ip:
        print("  Phones    : http://%s:%d/play" % (ip, port))
    print()
    app.run(host="0.0.0.0", port=port,
            debug=os.environ.get("FLASK_DEBUG") == "1", threaded=True)

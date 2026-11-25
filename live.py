"""Live Room: host screen (/host) + phone voting (/play), updated by polling.

State lives in this process's memory, so run ONE worker (gunicorn -w 1).
"""
import os
import re
import random
import secrets
import socket
import threading
from functools import wraps

from flask import (Blueprint, render_template, request, session,
                   redirect, url_for, jsonify)

from scenarios import SCENARIOS, QUICK_INDEXES, get_rank
from why import WHY

live_bp = Blueprint("live", __name__)

HOST_PASSWORD = os.environ.get("HOST_PASSWORD", "peace")
MAX_PLAYERS = 300
PID_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
LOCK = threading.Lock()
ROOM = {}


def _reset_room():
    ROOM.clear()
    ROOM.update({
        "phase": "lobby",          # lobby | question | reveal | final
        "mode": "full",
        "order": list(range(len(SCENARIOS))),
        "pos": 0,
        "seed": random.randint(1, 10 ** 6),
        "players": {},             # pid -> {"name": str, "votes": {sid: choice}}
    })


_reset_room()


def _lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))   # sends nothing; just picks a route
        return s.getsockname()[0]
    except Exception:
        return None
    finally:
        s.close()


def _choices(si):
    """Choices in a shuffled (but stable for this game) order. No scoring info."""
    order = [0, 1, 2]
    random.Random(ROOM["seed"] * 1000 + si).shuffle(order)
    sc = SCENARIOS[si]
    return [{"letter": "ABC"[pos], "value": o,
             "label": sc["choices"][o][1], "text": sc["choices"][o][2]}
            for pos, o in enumerate(order)]


def _totals(player):
    raw = 0
    styles = {"aggressive": 0, "avoidant": 0, "calm": 0}
    for si, c in player["votes"].items():
        style, _label, _text, pts = SCENARIOS[si]["choices"][c]
        raw += pts
        styles[style] += 1
    return raw, styles


def _scaled(raw):
    return round(raw / (len(ROOM["order"]) * 3) * 30)


def _final_stats():
    rows, style_tot = [], {"aggressive": 0, "avoidant": 0, "calm": 0}
    tiers = {"Master Peacekeeper": 0, "Borderline Diplomat": 0,
             "Accidental Flame-Starter": 0}
    for p in ROOM["players"].values():
        if not p["votes"]:
            continue
        raw, styles = _totals(p)
        scaled = _scaled(raw)
        rank = get_rank(scaled)
        tiers[rank["name"]] += 1
        rows.append({"name": p["name"], "scaled": scaled})
        for k, v in styles.items():
            style_tot[k] += v
    n = len(rows)
    answers = sum(style_tot.values())
    pct = lambda x, d: round(x * 100 / d) if d else 0
    return {
        "players": n,
        "average": round(sum(r["scaled"] for r in rows) / n, 1) if n else 0,
        "tiers": [{"name": k, "count": v, "percent": pct(v, n)} for k, v in tiers.items()],
        "styles": {k: pct(v, answers) for k, v in style_tot.items()},
        "top": sorted(rows, key=lambda r: -r["scaled"])[:5],
    }


def _state(pid, host=False):
    ph = ROOM["phase"]
    players = ROOM["players"]
    out = {"phase": ph, "mode": ROOM["mode"], "total": len(ROOM["order"]),
           "number": ROOM["pos"] + 1, "players": len(players)}
    me = players.get(pid) if isinstance(pid, str) else None
    out["registered"] = me is not None
    if host and ph == "lobby":
        out["names"] = [p["name"] for p in list(players.values())[:80]]

    if ph in ("question", "reveal"):
        si = ROOM["order"][ROOM["pos"]]
        sc = SCENARIOS[si]
        choices = _choices(si)
        out["sid"] = si
        out["scenario"] = {"title": sc["title"], "badge": sc["badge"], "text": sc["text"]}
        out["choices"] = choices
        out["voted"] = sum(1 for p in players.values() if si in p["votes"])
        my_vote = me["votes"].get(si) if me else None
        out["my_vote"] = my_vote
        if ph == "reveal":
            counts = [0, 0, 0]
            for p in players.values():
                c = p["votes"].get(si)
                if c is not None:
                    counts[c] += 1
            out["results"] = [{
                "letter": c["letter"], "label": c["label"],
                "style": sc["choices"][c["value"]][0],
                "points": sc["choices"][c["value"]][3],
                "count": counts[c["value"]],
            } for c in choices]
            out["why"] = WHY[si]
            if my_vote is not None:
                out["my_points"] = sc["choices"][my_vote][3]
                out["my_style"] = sc["choices"][my_vote][0]
            if me:
                out["my_total"] = _totals(me)[0]

    if ph == "final":
        out["final"] = _final_stats()
        if me and me["votes"]:
            raw, styles = _totals(me)
            out["me"] = {"raw": raw, "scaled": _scaled(raw), "styles": styles,
                         "rank": get_rank(_scaled(raw))}
    return out


# ---------------------------------------------------------------- pages
@live_bp.route("/play")
def play():
    return render_template("play.html")


def host_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if not session.get("host"):
            if request.path.startswith("/api/"):
                return jsonify(error="auth"), 401
            return redirect(url_for("live.host_login"))
        return fn(*a, **kw)
    return wrapper


@live_bp.route("/host/login", methods=["GET", "POST"])
def host_login():
    error = None
    if request.method == "POST":
        pw = request.form.get("password", "")
        if secrets.compare_digest(pw.encode(), HOST_PASSWORD.encode()):
            session["host"] = True
            return redirect(url_for("live.host"))
        error = "Wrong password"
    return render_template("host_login.html", error=error)


@live_bp.route("/host/logout")
def host_logout():
    session.pop("host", None)
    return redirect(url_for("index"))


@live_bp.route("/host")
@host_required
def host():
    return render_template("host.html", lan_ip=_lan_ip() or "")


# ----------------------------------------------------------------- API
@live_bp.after_request
def no_cache(resp):
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


@live_bp.get("/api/state")
def api_state():
    with LOCK:
        return jsonify(_state(request.args.get("pid", "")))


@live_bp.post("/api/join")
def api_join():
    d = request.get_json(silent=True) or {}
    pid = d.get("pid")
    if not isinstance(pid, str) or not PID_RE.match(pid):
        return jsonify(error="bad id"), 400
    name = re.sub(r"\s+", " ", str(d.get("name") or "")).strip()[:16] or "Guest"
    with LOCK:
        players = ROOM["players"]
        if pid in players:
            players[pid]["name"] = name
        elif len(players) >= MAX_PLAYERS:
            return jsonify(registered=False, error="full")
        else:
            players[pid] = {"name": name, "votes": {}}
        return jsonify(_state(pid))


@live_bp.post("/api/vote")
def api_vote():
    d = request.get_json(silent=True) or {}
    pid = d.get("pid")
    try:
        sid, choice = int(d.get("sid")), int(d.get("choice"))
    except (TypeError, ValueError):
        return jsonify(ok=False), 400
    with LOCK:
        p = ROOM["players"].get(pid) if isinstance(pid, str) else None
        if (p is None or ROOM["phase"] != "question" or choice not in (0, 1, 2)
                or sid != ROOM["order"][ROOM["pos"]]):
            return jsonify(ok=False), 409
        p["votes"][sid] = choice          # voting again just changes the answer
        return jsonify(ok=True, state=_state(pid))


@live_bp.get("/api/host/state")
@host_required
def api_host_state():
    with LOCK:
        return jsonify(_state(None, host=True))


@live_bp.post("/api/host/action")
@host_required
def api_host_action():
    if not request.is_json:
        return jsonify(error="json only"), 415
    act = (request.get_json(silent=True) or {}).get("action")
    with LOCK:
        ph = ROOM["phase"]
        if act in ("start_full", "start_quick"):
            quick = act == "start_quick"
            ROOM["mode"] = "quick" if quick else "full"
            ROOM["order"] = list(QUICK_INDEXES) if quick else list(range(len(SCENARIOS)))
            ROOM["pos"] = 0
            ROOM["seed"] = random.randint(1, 10 ** 6)
            for p in ROOM["players"].values():
                p["votes"] = {}
            ROOM["phase"] = "question"
        elif act == "reveal" and ph == "question":
            ROOM["phase"] = "reveal"
        elif act == "next" and ph == "reveal":
            if ROOM["pos"] + 1 >= len(ROOM["order"]):
                ROOM["phase"] = "final"
            else:
                ROOM["pos"] += 1
                ROOM["phase"] = "question"
        elif act == "lobby":                 # new game, keep the same players
            for p in ROOM["players"].values():
                p["votes"] = {}
            ROOM["phase"] = "lobby"
        elif act == "reset":                 # wipe everything
            _reset_room()
        else:
            return jsonify(error="bad action"), 400
        return jsonify(_state(None, host=True))

/* Plug'Heur V13 · test-session tracker
   One row per test session, sent to a Google Sheet through an Apps Script web app.
   Anonymous: no name, phone number or email is ever recorded (only "filled / not filled").
   Disable on a device with ?notrack in the address. Runs after the app; never changes its behaviour. */
(function () {
  "use strict";
  /* Paste the Apps Script web-app URL here (ends with /exec). Empty = tracking off. */
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbyYaJxbEGoShREW0DxtcyExvWkQCQD1E84VVPbMrkGWwFI-5m9GDG_9hFIFjn7ItZm6/exec";
  var VERSION = "v13-t2";

  var Q = new URLSearchParams(location.search);
  if (!ENDPOINT || Q.has("notrack")) return;

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* Partner and language come from the test link (?c=...) when there is one */
  var LINKCFG = null;
  try {
    var c = Q.get("c");
    if (c) {
      var t = c.replace(/-/g, "+").replace(/_/g, "/");
      while (t.length % 4) t += "=";
      LINKCFG = JSON.parse(decodeURIComponent(escape(atob(t))));
    }
  } catch (e) { LINKCFG = null; }

  /* Funnel: a screen counts as reaching the step it belongs to */
  var STEP = {
    loading: 0, home: 1,
    otp: 2, method: 2,
    welcome: 3, newemail: 3, profile: 3,
    terms: 4, pay0: 4, hold: 4, checkout: 4, pricing: 4, paycard: 4, payerr: 4,
    prep: 5, ready: 5,
    session: 6, chat: 6, swap: 6, swapeject: 6,
    done: 7
  };
  var REASONS = ["wait_time", "faulty_battery", "station_not_found", "app"];
  var ANSWERS = ["love", "ok", "meh", "dislike"];

  var S = null, cur = null, curAt = 0, timer = null;

  function sid() { return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function lang() {
    var b = $(".langb");
    var l = b && b.textContent ? b.textContent.trim().toLowerCase() : "";
    return l === "es" || l === "fr" ? l : (LINKCFG && LINKCFG.lang === "es" ? "es" : "fr");
  }
  function st() { return (window.__ph && window.__ph.state) || {}; }

  function newSession() {
    S = {
      session_id: sid(), started: Date.now(), updated: Date.now(),
      mode: LINKCFG ? "link" : "studio",
      partner: (LINKCFG && LINKCFG.place) || "",
      device: (matchMedia("(pointer:coarse)").matches ? "mobile" : "desktop") + " " + innerWidth + "x" + innerHeight,
      reached: [], furthest: 0, times: {},
      homeAt: null, batteryAt: null,
      profile_status: "not_reached", birth_year_filled: "", postcode_filled: "", dni_filled: "",
      rating: "", reasons: [], comment: "", rating_sent: false,
      question: "", qPick: null, end_clicks: [], google: "", help: []
    };
  }

  function tick() {
    if (!cur || !curAt || document.visibilityState === "hidden") return;
    var now = Date.now();
    S.times[cur] = (S.times[cur] || 0) + (now - curAt);
    curAt = now;
  }

  function row() {
    tick();
    var s = st(), now = Date.now();
    var secs = function (ms) { return ms == null ? "" : Math.round(ms / 100) / 10; };
    var times = {};
    Object.keys(S.times).forEach(function (k) { times[k] = Math.round(S.times[k] / 100) / 10; });
    return {
      session_id: S.session_id,
      started_at: new Date(S.started).toISOString(),
      updated_at: new Date(now).toISOString(),
      mode: S.mode,
      partner: S.partner,
      lang: lang(),
      flow: s.flow || "",
      device: S.device,
      returning_user: S.reached.indexOf("welcome") >= 0,
      last_screen: cur || "",
      furthest_step: S.furthest,
      screens_reached: S.reached.join(" > "),
      completed: S.rating_sent,
      t_to_battery_s: S.homeAt && S.batteryAt ? secs(S.batteryAt - S.homeAt) : "",
      t_total_s: secs(now - S.started),
      screen_times: JSON.stringify(times),
      profile_status: S.profile_status,
      birth_year_filled: S.birth_year_filled,
      postcode_filled: S.postcode_filled,
      dni_filled: S.dni_filled,
      optin_data: !!s.priv,
      optin_partner: !!s.mk,
      offer_code_requested: !!s.codeSent,
      rating: S.rating,
      rating_reasons: S.reasons.join(", "),
      comment: S.comment,
      question_answer: S.question,
      end_clicks: S.end_clicks.join(", "),
      google_review: S.google,
      help_actions: S.help.join(", "),
      version: VERSION
    };
  }

  function send(now) {
    if (!S || !S.homeAt) return;            /* nothing worth recording before the home screen */
    S.updated = Date.now();
    clearTimeout(timer);
    var go = function () {
      try {
        var body = JSON.stringify({ row: row() });
        fetch(ENDPOINT, { method: "POST", mode: "no-cors", keepalive: body.length < 60000,
          headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body }).catch(function () {});
      } catch (e) {}
    };
    if (now) go(); else timer = setTimeout(go, 1500);
  }

  function onScreen(id) {
    if (!id || id === cur) return;
    tick();
    if (id === "loading" && S && S.homeAt) { send(true); newSession(); }   /* restart = new tester */
    cur = id; curAt = Date.now();
    if (S.reached.indexOf(id) < 0) S.reached.push(id);
    if (STEP[id] != null && STEP[id] > S.furthest) S.furthest = STEP[id];
    if (id === "home" && !S.homeAt) S.homeAt = Date.now();
    if (id === "welcome") S.profile_status = "returning";
    if (id === "profile" && S.profile_status === "not_reached") S.profile_status = "started";
    if (id === "session" && !S.batteryAt && S.reached.indexOf("ready") >= 0) S.batteryAt = Date.now();
    send(id === "session" || id === "done");
  }

  function pressed(sel) {
    return $$(sel).map(function (b, i) { return b.getAttribute("aria-pressed") === "true" ? i : -1; })
      .filter(function (i) { return i >= 0; });
  }

  document.addEventListener("click", function (e) {
    if (!S) return;
    var el = e.target.closest ? e.target.closest("button,[data-soc],[data-issue],[data-open]") : null;
    if (!el) return;
    var id = el.id;

    if (id === "profGo") {
      setTimeout(function () {
        if (cur === "profile") return;     /* validation failed, stayed on the screen */
        var v = function (x) { var i = $("#" + x); return !!(i && i.value.trim()); };
        var dniShown = $("#dniWrap") && !$("#dniWrap").hidden;
        S.profile_status = "completed";
        S.birth_year_filled = v("year"); S.postcode_filled = v("zip"); S.dni_filled = dniShown ? v("dni") : "";
        send(true);
      }, 60);
      return;
    }
    if (id === "send") {
      setTimeout(function () {
        var s = st();
        if (!s.rating) return;              /* no star yet: the app asks for one */
        S.rating = s.rating;
        S.reasons = pressed("#why button").map(function (i) { return REASONS[i] || "other"; });
        var fb = $("#fbText");
        S.comment = fb && !fb.hidden ? fb.value.trim().slice(0, 500) : "";
        S.rating_sent = true;
        S.google = s.rating === 5 ? "shown" : "";
        send(true);
      }, 60);
      return;
    }
    /* Question du jour: remember the exact answer tapped, then save it on "Envoyer" */
    if (el.classList.contains("answer")) {
      var list = $$("#ov-question .answer"), i = list.indexOf(el);
      if (i >= 0) S.qPick = { key: ANSWERS[i] || ("answer_" + (i + 1)), label: el.textContent.replace(/\s+/g, " ").trim() };
      return;
    }
    if (id === "qSend") {
      var pick = S.qPick;
      if (!pick) {                           /* fallback: the answer the app shows as selected */
        var opts = $$("#ov-question .answer"), j = -1;
        opts.forEach(function (x, k) { if (x.getAttribute("aria-checked") === "true") j = k; });
        if (j >= 0) pick = { key: ANSWERS[j] || ("answer_" + (j + 1)), label: opts[j].textContent.replace(/\s+/g, " ").trim() };
      }
      if (pick) { S.question = pick.key + " (" + pick.label + ")"; S.qPick = null; send(true); }
      return;
    }
    if (el.dataset && el.dataset.soc) { S.end_clicks.push(el.dataset.soc); send(true); return; }
    if (el.closest("#ov-google")) {
      S.google = el.classList.contains("btn-p") ? "clicked" : (el.hasAttribute("data-close") ? "dismissed" : S.google);
      send(true); return;
    }
    if (id === "stuck") { S.help.push("battery_stuck"); send(); return; }
    if (id === "rcFail") { S.help.push("still_not_charging"); send(); return; }
    if (el.dataset && el.dataset.issue) { S.help.push("issue:" + el.dataset.issue); send(); return; }
    if (el.dataset && el.dataset.open && cur === "session") { S.help.push("open:" + el.dataset.open); send(); return; }
  }, true);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") { tick(); send(true); }
    else curAt = Date.now();
  });
  window.addEventListener("pagehide", function () { send(true); });

  function start() {
    var app = $("#app");
    if (!app) return;
    newSession();
    onScreen(app.dataset.screen);
    new MutationObserver(function () { onScreen(app.dataset.screen); })
      .observe(app, { attributes: true, attributeFilter: ["data-screen"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

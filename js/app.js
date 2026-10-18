(function () {
  var $ = UI.$;
  var DAYS = 14;
  var today = UI.startOfDay(new Date());
  var hub = {};     // hub[prop][day] = { price, state }
  var mirror = {};  // mirror[prop][channel][day] = { price, state }
  var bookings = [];
  var activeProp = PROPERTIES[0].id;
  var editing = null;
  var stay = { from: null, to: null };
  var guests = 2;

  /* ---------- seed ---------- */
  PROPERTIES.forEach(function (p, pi) {
    hub[p.id] = [];
    mirror[p.id] = {};
    for (var d = 0; d < DAYS; d++) {
      var date = UI.addDays(today, d);
      var wknd = date.getDay() === 5 || date.getDay() === 6;
      var wobble = ((d * 7 + pi * 13) % 5) * 4;
      hub[p.id].push({ price: Math.round(p.base * (wknd ? 1.22 : 1) + wobble), state: "open" });
    }
    if (pi === 1) hub[p.id][9].state = "closed";
    CHANNELS.forEach(function (c) {
      mirror[p.id][c.id] = hub[p.id].map(function (n) { return { price: n.price, state: n.state }; });
    });
  });

  /* ---------- channel cards ---------- */
  function renderCards() {
    var wrap = $("#channelCards");
    CHANNELS.forEach(function (c, i) {
      var el = document.createElement("article");
      el.className = "card";
      el.style.setProperty("--c", c.color);
      el.style.transitionDelay = i * 90 + "ms";
      var rows = c.rows.map(function (r) { return "<li><span>" + r[0] + "</span><b>" + r[1] + "</b></li>"; }).join("");
      el.innerHTML =
        '<div class="card-top"><div class="badge">' + c.letter + '</div><span class="tag live">' + c.mode + ' &middot; live</span></div>' +
        "<h3>" + c.name + '</h3><p class="sub">' + c.sub + "</p><ul>" + rows + "</ul>" +
        '<svg class="spark" viewBox="0 0 200 34" preserveAspectRatio="none"><path d="' + spark(i) + '"/></svg>';
      wrap.appendChild(el);
      UI.tilt(el);
      setTimeout(function () { el.style.transitionDelay = ""; }, 1500);
    });
  }

  function spark(seed) {
    var d = "M0 " + 20;
    for (var x = 10; x <= 200; x += 10) {
      var y = 17 + Math.sin(x * 0.07 + seed * 1.7) * 8 + Math.cos(x * 0.19 + seed) * 4;
      d += " L" + x + " " + y.toFixed(1);
    }
    return d;
  }

  /* ---------- mirror grid ---------- */
  function renderTabs() {
    var tabs = $("#propTabs");
    tabs.innerHTML = "";
    PROPERTIES.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "prop-tab" + (p.id === activeProp ? " on" : "");
      b.innerHTML = '<img alt="" loading="lazy" src="' + p.img + '"><span>' + p.name + "</span>";
      b.addEventListener("click", function () { activeProp = p.id; renderTabs(); renderGrid(); });
      tabs.appendChild(b);
    });
  }

  function renderGrid() {
    var g = $("#mirrorGrid");
    var html = "<div></div>";
    for (var d = 0; d < DAYS; d++) {
      var date = UI.addDays(today, d);
      var we = date.getDay() === 0 || date.getDay() === 6;
      html += '<div class="g-head' + (we ? " we" : "") + '">' +
        date.toLocaleDateString("en-GB", { weekday: "short" }) + "<b>" + date.getDate() + "</b></div>";
    }
    html += '<div class="g-label hub"><i style="--c:#ff6a3d"></i>BEDS24</div>';
    hub[activeProp].forEach(function (n, d) {
      html += '<div class="cell hub ' + n.state + '" data-day="' + d + '">' + label(n) + "</div>";
    });
    CHANNELS.forEach(function (c) {
      html += '<div class="g-label"><i style="--c:' + c.color + '"></i>' + c.name + "</div>";
      mirror[activeProp][c.id].forEach(function (n, d) {
        var stale = !same(n, hub[activeProp][d]);
        html += '<div class="cell ' + n.state + (stale ? " stale" : "") + '" data-ch="' + c.id + '" data-day="' + d + '">' + label(n) + "</div>";
      });
    });
    g.innerHTML = html;
    updateDrift();
  }

  function label(n) {
    if (n.state === "booked") return "booked";
    if (n.state === "closed") return "closed";
    return n.price;
  }

  function same(a, b) { return a.state === b.state && (a.state !== "open" || a.price === b.price); }

  function updateDrift() {
    var total = 0;
    PROPERTIES.forEach(function (p) {
      CHANNELS.forEach(function (c) {
        mirror[p.id][c.id].forEach(function (n, d) { if (!same(n, hub[p.id][d])) total++; });
      });
    });
    $("#driftNum").textContent = total;
    $("#heroDrift").textContent = total;
    $("#driftArc").style.strokeDashoffset = Math.min(total / 20, 1) * 100.5;
    $(".drift").classList.toggle("bad", total > 0);
    $("#driftLabel").textContent = total ? "Pushing..." : "In sync";
  }

  // hub changed -> each channel catches up after its own latency
  function propagate(propId, dayList, skipChannel) {
    Orb.burst(skipChannel);
    CHANNELS.forEach(function (c) {
      if (c.id === skipChannel) {
        copy(propId, c.id, dayList);
        return;
      }
      setTimeout(function () {
        copy(propId, c.id, dayList);
        log("out", "push " + c.name + " " + propName(propId) + " " + dayList.length + " night(s) ok " + (c.delay + rand(120)) + "ms");
      }, c.delay + rand(250));
    });
    refreshCells(propId);
  }

  function copy(propId, chId, dayList) {
    dayList.forEach(function (d) {
      var src = hub[propId][d];
      mirror[propId][chId][d] = { price: src.price, state: src.state };
    });
    refreshCells(propId, chId, dayList);
  }

  function refreshCells(propId, chId, dayList) {
    if (propId === activeProp) {
      // full redraw keeps it simple, then flash what just landed
      renderGrid();
      if (chId) {
        dayList.forEach(function (d) {
          var el = $('.cell[data-ch="' + chId + '"][data-day="' + d + '"]');
          if (el) el.classList.add("flash");
        });
      }
    } else {
      updateDrift();
    }
  }

  /* ---------- cell editor popover ---------- */
  function cellEditor() {
    var pop = $("#cellPop"), input = $("#popPrice"), state = "open";
    $("#mirrorGrid").addEventListener("click", function (e) {
      var cell = e.target.closest(".cell.hub");
      if (!cell) return;
      var d = +cell.dataset.day, n = hub[activeProp][d];
      if (n.state === "booked") {
        UI.toast("That night is booked. Cancel the booking in the test lab to free it.", "warn");
        return;
      }
      editing = d;
      state = n.state;
      input.value = n.price;
      $("#popTitle").textContent = propName(activeProp) + " / " + UI.fmt(UI.addDays(today, d));
      setSeg(state);
      UI.place(pop, cell);
    });
    $("#popSeg").addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b) { state = b.dataset.v; setSeg(state); }
    });
    pop.querySelectorAll("[data-p]").forEach(function (b) {
      b.addEventListener("click", function () {
        input.value = Math.max(10, (parseInt(input.value, 10) || 0) + +b.dataset.p);
      });
    });
    input.addEventListener("input", function () { input.value = input.value.replace(/[^0-9]/g, "").slice(0, 4); });
    $("#popApply").addEventListener("click", function () {
      var price = parseInt(input.value, 10);
      if (!price || price < 10) { UI.toast("Price must be at least 10 EUR.", "err"); return; }
      var n = hub[activeProp][editing];
      n.price = price; n.state = state;
      pop.hidden = true;
      log("t", "hub update " + propName(activeProp) + " " + UI.fmt(UI.addDays(today, editing)) + " -> " + (state === "open" ? price + " EUR" : "closed"));
      propagate(activeProp, [editing]);
      UI.toast("Saved in BEDS24. Pushing to " + CHANNELS.length + " channels.");
    });
    UI.dismissable(pop, function (t) { return !!t.closest(".cell.hub"); });

    function setSeg(v) {
      $("#popSeg").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === v); });
    }
  }

  /* ---------- test lab ---------- */
  var propSel, chanSel;

  function lab() {
    propSel = UI.select($("#propSelect"), PROPERTIES.map(function (p) {
      return { value: p.id, label: p.name, note: "from " + p.base + " EUR", color: "#ff6a3d" };
    }));
    chanSel = UI.select($("#chanSelect"), CHANNELS.map(function (c) {
      return { value: c.id, label: c.name, note: c.mode, color: c.color };
    }));

    var picker = UI.rangePicker($("#dateBtn"), 60, function (a, b) {
      stay.from = a; stay.to = b;
      $("#dateLabel").textContent = UI.fmt(a) + " - " + UI.fmt(b) + "  (" + UI.nights(a, b) + "n)";
    });
    picker.set(UI.addDays(today, 2), UI.addDays(today, 5));

    document.querySelectorAll("[data-step]").forEach(function (b) {
      b.addEventListener("click", function () {
        guests = Math.max(1, Math.min(8, guests + +b.dataset.step));
        $("#guests").textContent = guests;
      });
    });

    $("#labForm").addEventListener("submit", function (e) { e.preventDefault(); create(); });
    $("#modBtn").addEventListener("click", modify);
    $("#cancelBtn").addEventListener("click", cancel);
    $("#clearLog").addEventListener("click", function () { $("#log").innerHTML = ""; });
  }

  function create() {
    if (!stay.from) { UI.toast("Pick the stay dates first.", "warn"); return; }
    var propId = propSel.get(), ch = channel(chanSel.get());
    var days = dayIndexes(stay.from, stay.to);
    var ref = ch.letter + "-" + (100000 + rand(899999));
    var clash = overlap(propId, stay.from, stay.to, null);

    var steps = [
      ["ok", ch.name + " sends reservation " + ref, "webhook"],
      clash
        ? ["err", "Overbooking guard: nights already held by #" + clash.id, "rejected"]
        : ["ok", "BEDS24 imports it as a new booking", "mapped room + rate"]
    ];
    if (clash) {
      play(steps);
      log("er", "reject " + ref + " " + propName(propId) + " overlaps #" + clash.id);
      UI.toast("Double booking stopped. Nothing was written.", "err");
      return;
    }

    var bk = {
      id: 40000 + rand(9999), ref: ref, prop: propId, ch: ch.id,
      from: stay.from, to: stay.to, guests: guests, status: "new"
    };
    bookings.unshift(bk);
    steps.push(["ok", "Nights blocked in hub", UI.nights(bk.from, bk.to) + " night(s)"]);
    steps.push(["ok", "Availability pushed to the other " + (CHANNELS.length - 1) + " channels", "auto"]);
    steps.push(["ok", "Check passed: drift returns to 0", "verified"]);
    play(steps);

    log("in", "import " + ref + " from " + ch.name + " -> #" + bk.id + " " + propName(propId) + " " + UI.fmt(bk.from) + "-" + UI.fmt(bk.to) + " " + guests + "pax");
    setState(propId, days, "booked");
    propagate(propId, days, ch.id);
    renderBookings();
    activeProp = propId; renderTabs(); renderGrid();
    UI.toast("Booking #" + bk.id + " is in BEDS24.");
  }

  function modify() {
    var bk = lastActive();
    if (!bk) { UI.toast("No active booking to modify yet.", "warn"); return; }
    var ch = channel(bk.ch);
    var newTo = UI.addDays(bk.to, 1);
    var clash = overlap(bk.prop, bk.to, newTo, bk);
    if (clash) {
      play([["ok", ch.name + " sends a change for " + bk.ref, "modify"], ["err", "Extra night is taken by #" + clash.id, "rejected"]]);
      log("er", "reject modify " + bk.ref + " extra night overlaps #" + clash.id);
      UI.toast("Change refused - the extra night is not free.", "err");
      return;
    }
    var added = dayIndexes(bk.to, newTo);
    bk.to = newTo; bk.status = "mod";
    play([
      ["ok", ch.name + " sends a change for " + bk.ref, "modify"],
      ["ok", "BEDS24 updates #" + bk.id + " in place", "same booking id"],
      ["ok", "Departure moved to " + UI.fmt(newTo), "+1 night"],
      ["ok", "New night closed on the other channels", "auto"],
      ["ok", "Check passed: no duplicate booking created", "verified"]
    ]);
    log("in", "modify " + bk.ref + " -> #" + bk.id + " checkout " + UI.fmt(newTo));
    setState(bk.prop, added, "booked");
    propagate(bk.prop, added, bk.ch);
    renderBookings();
  }

  function cancel() {
    var bk = lastActive();
    if (!bk) { UI.toast("No active booking to cancel.", "warn"); return; }
    UI.confirm(
      "Cancel booking #" + bk.id + "?",
      "This simulates " + channel(bk.ch).name + " sending a cancellation for " + bk.ref + ". The nights reopen everywhere.",
      "Cancel booking"
    ).then(function (yes) {
      if (!yes) return;
      var days = dayIndexes(bk.from, bk.to);
      bk.status = "cx";
      play([
        ["ok", channel(bk.ch).name + " sends cancellation " + bk.ref, "cancel"],
        ["ok", "BEDS24 marks #" + bk.id + " cancelled", "kept for history"],
        ["ok", "Nights reopened in hub", UI.nights(bk.from, bk.to) + " night(s)"],
        ["ok", "Availability pushed back to all channels", "auto"],
        ["ok", "Check passed: drift returns to 0", "verified"]
      ]);
      log("in", "cancel " + bk.ref + " -> #" + bk.id + " nights released");
      setState(bk.prop, days, "open");
      propagate(bk.prop, days, bk.ch);
      renderBookings();
      UI.toast("Cancelled. Nights are open again.");
    });
  }

  function setState(propId, days, state) {
    days.forEach(function (d) { hub[propId][d].state = state; });
  }

  function overlap(propId, from, to, except) {
    return bookings.filter(function (b) {
      return b !== except && b.status !== "cx" && b.prop === propId && from < b.to && to > b.from;
    })[0];
  }

  function lastActive() {
    return bookings.filter(function (b) { return b.status !== "cx"; })[0];
  }

  // only nights inside the visible 14-day window get drawn
  function dayIndexes(from, to) {
    var out = [];
    for (var d = UI.nights(today, from); d < UI.nights(today, to); d++) if (d >= 0 && d < DAYS) out.push(d);
    return out;
  }

  function renderBookings() {
    var list = $("#bkList");
    $("#bkCount").textContent = bookings.filter(function (b) { return b.status !== "cx"; }).length;
    if (!bookings.length) { list.innerHTML = '<p class="empty">No test bookings yet.</p>'; return; }
    list.innerHTML = "";
    bookings.forEach(function (b) {
      var c = channel(b.ch);
      var el = document.createElement("div");
      el.className = "bk " + b.status;
      el.style.setProperty("--c", c.color);
      el.innerHTML = "<em>" + { "new": "confirmed", mod: "modified", cx: "cancelled" }[b.status] + "</em>" +
        "<b>#" + b.id + " &middot; " + propName(b.prop) + "</b>" +
        "<span>" + c.name + " " + b.ref + "</span>" +
        "<span>" + UI.fmt(b.from) + " - " + UI.fmt(b.to) + " &middot; " + b.guests + " guest(s)</span>";
      list.appendChild(el);
    });
  }

  function play(steps) {
    var tl = $("#timeline");
    tl.innerHTML = "";
    steps.forEach(function (s, i) {
      var li = document.createElement("li");
      li.className = s[0];
      li.style.animationDelay = i * 260 + "ms";
      li.textContent = s[1];
      var sm = document.createElement("small");
      sm.textContent = s[2];
      li.appendChild(sm);
      tl.appendChild(li);
    });
  }

  /* ---------- log ---------- */
  function log(kind, msg) {
    var pre = $("#log");
    var line = document.createElement("div");
    var ts = document.createElement("span");
    ts.className = "t";
    ts.textContent = new Date().toTimeString().slice(0, 8) + "  ";
    var body = document.createElement("span");
    body.className = kind;
    body.textContent = msg;
    line.appendChild(ts); line.appendChild(body);
    pre.appendChild(line);
    pre.scrollTop = pre.scrollHeight;
  }

  /* ---------- runbook ---------- */
  function renderRunbook() {
    var acc = $("#acc");
    RUNBOOK.forEach(function (item, i) {
      var el = document.createElement("div");
      el.className = "acc-item" + (i === 0 ? " open" : "");
      el.innerHTML =
        '<button type="button" class="acc-q"><small>' + String(i + 1).padStart(2, "0") + " " + item.tag + "</small><span>" + item.q + '</span><i class="plus"></i></button>' +
        '<div class="acc-a"><div><ol>' + item.a.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol></div></div>";
      el.firstChild.addEventListener("click", function () {
        var open = el.classList.contains("open");
        acc.querySelectorAll(".acc-item").forEach(function (x) { x.classList.remove("open"); });
        if (!open) el.classList.add("open");
      });
      acc.appendChild(el);
    });
  }

  /* ---------- helpers ---------- */
  function channel(id) { return CHANNELS.filter(function (c) { return c.id === id; })[0]; }
  function propName(id) { return PROPERTIES.filter(function (p) { return p.id === id; })[0].name; }
  function rand(n) { return Math.floor(Math.random() * n); }

  function clock() {
    var el = $("#clock");
    (function tick() {
      el.textContent = "sync ok " + new Date().toTimeString().slice(0, 8);
      setTimeout(tick, 1000);
    })();
  }

  /* ---------- boot ---------- */
  Orb.init($("#orb"), CHANNELS);
  renderCards();
  renderTabs();
  renderGrid();
  renderRunbook();
  cellEditor();
  lab();
  clock();
  UI.cursor();
  UI.magnetic();
  UI.scrollFx();
  log("t", "console ready - " + PROPERTIES.length + " properties, " + CHANNELS.length + " channels, simulated data");
})();

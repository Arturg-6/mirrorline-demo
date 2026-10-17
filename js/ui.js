// Small UI kit: cursor, scroll effects, toasts, select, date range picker, modal.
var UI = (function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var fine = window.matchMedia("(pointer: fine)").matches;

  /* ---- cursor + magnetic buttons ---- */
  function cursor() {
    if (!fine) return;
    document.body.classList.add("has-cursor");
    var dot = $("#cursorDot"), ring = $("#cursorRing");
    var x = 0, y = 0, rx = 0, ry = 0;
    window.addEventListener("mousemove", function (e) {
      x = e.clientX; y = e.clientY;
      dot.style.transform = "translate(" + x + "px," + y + "px) translate(-50%,-50%)";
    });
    (function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseover", function (e) {
      ring.classList.toggle("hot", !!e.target.closest("a, button, .cell.hub, .select-btn, .prop-tab"));
    });
  }

  function magnetic() {
    if (!fine) return;
    document.addEventListener("mousemove", function (e) {
      var el = e.target.closest(".mag");
      document.querySelectorAll(".mag.pull").forEach(function (m) {
        if (m !== el) { m.classList.remove("pull"); m.style.transform = ""; }
      });
      if (!el) return;
      var r = el.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      el.classList.add("pull");
      el.style.transform = "translate(" + dx * 0.25 + "px," + dy * 0.35 + "px)";
    });
  }

  function tilt(el) {
    if (!fine) return;
    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.transform = "rotateY(" + (px - 0.5) * 16 + "deg) rotateX(" + (0.5 - py) * 14 + "deg)";
      el.style.setProperty("--mx", px * 100 + "%");
      el.style.setProperty("--my", py * 100 + "%");
    });
    el.addEventListener("mouseleave", function () { el.style.transform = ""; });
  }

  /* ---- scroll ---- */
  function scrollFx() {
    var bar = $("#progress");
    var par = document.querySelectorAll("[data-parallax]");
    var links = document.querySelectorAll(".nav-links a");
    function onScroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
      par.forEach(function (el) {
        el.style.transform = "translateY(" + window.scrollY * parseFloat(el.dataset.parallax) + "px)";
      });
      var current = "";
      document.querySelectorAll("main section[id]").forEach(function (s) {
        if (s.getBoundingClientRect().top < window.innerHeight * 0.4) current = s.id;
      });
      links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + current); });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll("[data-reveal], .card").forEach(function (el) { io.observe(el); });

    document.querySelectorAll("[data-count]").forEach(function (el) {
      var end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var k = Math.min((ts - t0) / 1400, 1);
        el.textContent = (end * (1 - Math.pow(1 - k, 3))).toFixed(dec);
        if (k < 1) requestAnimationFrame(step);
      }
      setTimeout(function () { requestAnimationFrame(step); }, 400);
    });
  }

  /* ---- toasts ---- */
  function toast(msg, kind) {
    var el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.innerHTML = "<i></i><span></span>";
    el.lastChild.textContent = msg;
    $("#toasts").appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { el.remove(); }, 300);
    }, 3200);
  }

  /* ---- custom select ---- */
  function select(root, items, onChange) {
    root.innerHTML =
      '<button type="button" class="select-btn"><i></i><span></span>' +
      '<svg class="chev" width="12" height="12" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>' +
      '<div class="options" role="listbox"></div>';
    var btn = root.firstChild, list = root.lastChild;
    items.forEach(function (it) {
      var o = document.createElement("div");
      o.className = "opt"; o.setAttribute("role", "option"); o.dataset.v = it.value;
      o.style.setProperty("--c", it.color || "var(--mute)");
      o.innerHTML = "<i></i><span></span><small></small>";
      o.children[1].textContent = it.label;
      o.children[2].textContent = it.note || "";
      o.addEventListener("click", function () { set(it.value); root.classList.remove("open"); });
      list.appendChild(o);
    });
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelectorAll(".select.open").forEach(function (s) { if (s !== root) s.classList.remove("open"); });
      root.classList.toggle("open");
    });
    document.addEventListener("click", function (e) { if (!root.contains(e.target)) root.classList.remove("open"); });
    function set(v) {
      var it = items.filter(function (x) { return x.value === v; })[0];
      root.dataset.value = v;
      btn.style.setProperty("--c", it.color || "var(--mute)");
      btn.children[1].textContent = it.label;
      list.querySelectorAll(".opt").forEach(function (o) { o.classList.toggle("on", o.dataset.v === v); });
      if (onChange) onChange(v);
    }
    set(items[0].value);
    return { set: set, get: function () { return root.dataset.value; } };
  }

  /* ---- positioned popovers ---- */
  function place(pop, anchor) {
    pop.hidden = false;
    var r = anchor.getBoundingClientRect();
    var pw = pop.offsetWidth;
    var left = r.left + window.scrollX + r.width / 2 - pw / 2;
    left = Math.max(12, Math.min(left, document.documentElement.clientWidth - pw - 12));
    pop.style.left = left + "px";
    pop.style.top = r.bottom + window.scrollY + 8 + "px";
  }

  function dismissable(pop, anchorTest) {
    document.addEventListener("mousedown", function (e) {
      if (pop.hidden) return;
      if (pop.contains(e.target) || (anchorTest && anchorTest(e.target))) return;
      pop.hidden = true;
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") pop.hidden = true; });
    pop.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", function () { pop.hidden = true; });
    });
  }

  /* ---- date range picker ---- */
  function rangePicker(btn, maxDays, onPick) {
    var pop = $("#datePop"), days = $("#pkDays"), info = $("#pkInfo");
    var today = startOfDay(new Date());
    var limit = addDays(today, maxDays);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    var from = null, to = null;
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    function render() {
      $("#pkMonth").textContent = MONTHS[view.getMonth()] + " " + view.getFullYear();
      days.innerHTML = "";
      var lead = (view.getDay() + 6) % 7;
      for (var i = 0; i < lead; i++) days.appendChild(document.createElement("span"));
      var count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var d = 1; d <= count; d++) {
        var date = new Date(view.getFullYear(), view.getMonth(), d);
        var b = document.createElement("button");
        b.type = "button"; b.textContent = d;
        b.disabled = date < today || date > limit;
        if (+date === +today) b.classList.add("today");
        if (from && +date === +from || to && +date === +to) b.classList.add("edge");
        else if (from && to && date > from && date < to) b.classList.add("mid");
        b.addEventListener("click", pick.bind(null, date));
        days.appendChild(b);
      }
      info.textContent = !from ? "Choose arrival" : !to ? "Choose departure" : nights(from, to) + " night(s)";
    }

    function pick(date) {
      if (!from || to || date <= from) { from = date; to = null; }
      else to = date;
      render();
    }

    pop.querySelectorAll("[data-m]").forEach(function (b) {
      b.addEventListener("click", function () {
        view = new Date(view.getFullYear(), view.getMonth() + +b.dataset.m, 1);
        render();
      });
    });
    $("#pkDone").addEventListener("click", function () {
      if (from && !to) to = addDays(from, 1);
      pop.hidden = true;
      if (from) onPick(from, to);
    });
    btn.addEventListener("click", function () {
      if (!pop.hidden) { pop.hidden = true; return; }
      render(); place(pop, btn);
    });
    dismissable(pop, function (t) { return btn.contains(t); });

    return {
      set: function (a, b) { from = a; to = b; view = new Date(a.getFullYear(), a.getMonth(), 1); onPick(a, b); }
    };
  }

  /* ---- modal ---- */
  function confirm(title, text, okLabel) {
    var m = $("#modal");
    $("#modalTitle").textContent = title;
    $("#modalText").textContent = text;
    $("#modalOk").textContent = okLabel || "Confirm";
    m.hidden = false;
    return new Promise(function (resolve) {
      function done(v) {
        m.hidden = true;
        $("#modalOk").removeEventListener("click", yes);
        m.removeEventListener("click", bg);
        resolve(v);
      }
      function yes() { done(true); }
      function bg(e) { if (e.target === m || e.target.hasAttribute("data-close")) done(false); }
      $("#modalOk").addEventListener("click", yes);
      m.addEventListener("click", bg);
    });
  }

  /* ---- date helpers ---- */
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function nights(a, b) { return Math.round((b - a) / 86400000); }
  function fmt(d) { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); }

  return {
    $: $, cursor: cursor, magnetic: magnetic, tilt: tilt, scrollFx: scrollFx, toast: toast,
    select: select, place: place, dismissable: dismissable, rangePicker: rangePicker, confirm: confirm,
    startOfDay: startOfDay, addDays: addDays, nights: nights, fmt: fmt
  };
})();

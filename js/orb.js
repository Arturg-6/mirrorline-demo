// 3D sync map drawn on a plain canvas: hub in the middle, channels orbiting,
// packets travelling both ways along the links.
var Orb = (function () {
  var canvas, ctx, w, h, dpr;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var shell = [];
  var packets = [];
  var nodes = [];
  var burstUntil = 0;

  function init(el, channels) {
    canvas = el;
    ctx = canvas.getContext("2d");

    // fibonacci sphere for the hub shell
    var n = 220;
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2;
      var r = Math.sqrt(1 - y * y);
      var a = i * 2.39996;
      shell.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }

    channels.forEach(function (c, i) {
      nodes.push({
        ch: c,
        phase: (i / channels.length) * Math.PI * 2,
        tilt: [0.35, -0.5, 0.15, -0.25][i % 4],
        radius: 2.1 + (i % 2) * 0.35,
        speed: 0.18 + i * 0.03,
        pos: [0, 0, 0]
      });
    });

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", function (e) {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    setInterval(spawn, 260);
    requestAnimationFrame(frame);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn() {
    if (!nodes.length) return;
    var node = nodes[(Math.random() * nodes.length) | 0];
    var inbound = Math.random() < 0.35;
    packets.push({ node: node, t: 0, inbound: inbound, speed: 0.008 + Math.random() * 0.008 });
  }

  // fire a visible wave from hub to every channel (used when the mirror pushes)
  function burst(inboundFrom) {
    burstUntil = performance.now() + 900;
    nodes.forEach(function (node) {
      if (inboundFrom && node.ch.id === inboundFrom) {
        packets.push({ node: node, t: 0, inbound: true, speed: 0.022, big: true });
      } else {
        packets.push({ node: node, t: -0.15, inbound: false, speed: 0.016, big: true });
      }
    });
  }

  function rotate(p, yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var x = p[0] * cy - p[2] * sy;
    var z = p[0] * sy + p[2] * cy;
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var y = p[1] * cp - z * sp;
    z = p[1] * sp + z * cp;
    return [x, y, z];
  }

  function project(p) {
    var scale = Math.min(w, h) * 0.17;
    var depth = 6;
    var f = depth / (depth + p[2]);
    return { x: w / 2 + p[0] * scale * f, y: h / 2 + p[1] * scale * f, s: f };
  }

  function orbitPoint(node, ang) {
    var x = Math.cos(ang) * node.radius;
    var z = Math.sin(ang) * node.radius;
    var y = z * node.tilt;
    return [x, y, z * Math.cos(node.tilt)];
  }

  function frame(now) {
    var t = now / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    var yaw = t * 0.12 + mouse.x * 0.5;
    var pitch = -0.32 + mouse.y * 0.25;

    ctx.clearRect(0, 0, w, h);

    // soft glow behind hub
    var hot = now < burstUntil ? 1 : 0;
    var g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.42);
    g.addColorStop(0, hot ? "rgba(255,106,61,0.32)" : "rgba(255,106,61,0.18)");
    g.addColorStop(1, "rgba(255,106,61,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // orbit rings
    nodes.forEach(function (node) {
      ctx.beginPath();
      for (var i = 0; i <= 80; i++) {
        var p = project(rotate(orbitPoint(node, (i / 80) * Math.PI * 2), yaw, pitch));
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = "rgba(236,235,230,0.07)";
      ctx.lineWidth = 1;
      ctx.stroke();
      node.pos = rotate(orbitPoint(node, node.phase + t * node.speed), yaw, pitch);
    });

    // collect drawables and sort by depth
    var items = [];
    shell.forEach(function (p) {
      var q = rotate([p[0] * 0.9, p[1] * 0.9, p[2] * 0.9], yaw * 1.6, pitch);
      items.push({ z: q[2], kind: "dot", p: q });
    });
    nodes.forEach(function (node) { items.push({ z: node.pos[2], kind: "node", node: node }); });
    items.push({ z: 0, kind: "core" });

    // links first (always behind)
    nodes.forEach(function (node) {
      var a = project([0, 0, 0]), b = project(node.pos);
      var lg = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      lg.addColorStop(0, "rgba(255,106,61,0.35)");
      lg.addColorStop(1, hexA(node.ch.color, 0.35));
      ctx.strokeStyle = lg;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.setLineDash([]);
    });

    items.sort(function (a, b) { return b.z - a.z; });
    items.forEach(function (it) {
      if (it.kind === "dot") {
        var p = project(it.p);
        var alpha = 0.15 + (1 - (it.p[2] + 1) / 2) * 0.6;
        ctx.fillStyle = "rgba(236,235,230," + alpha.toFixed(3) + ")";
        ctx.fillRect(p.x, p.y, 1.6 * p.s, 1.6 * p.s);
      } else if (it.kind === "core") {
        var c = project([0, 0, 0]);
        var r = Math.min(w, h) * 0.055;
        ctx.fillStyle = "#ff6a3d";
        ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#140b07";
        ctx.font = "800 " + Math.round(r * 0.62) + "px Bricolage Grotesque, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("B24", c.x, c.y + 1);
      } else {
        drawNode(it.node);
      }
    });

    // packets
    packets = packets.filter(function (pk) {
      pk.t += pk.speed;
      if (pk.t > 1) return false;
      if (pk.t < 0) return true;
      var k = pk.inbound ? 1 - pk.t : pk.t;
      var pos = pk.node.pos;
      var p = project([pos[0] * k, pos[1] * k, pos[2] * k]);
      var col = pk.inbound ? "#7cf2c6" : "#ff6a3d";
      var size = (pk.big ? 4.5 : 2.6) * p.s;
      ctx.shadowColor = col; ctx.shadowBlur = pk.big ? 18 : 10;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      return true;
    });

    requestAnimationFrame(frame);
  }

  function drawNode(node) {
    var p = project(node.pos);
    var r = Math.min(w, h) * 0.034 * p.s;
    ctx.fillStyle = node.ch.color;
    ctx.shadowColor = node.ch.color; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#111";
    ctx.font = "800 " + Math.round(r * 0.95) + "px Bricolage Grotesque, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(node.ch.letter, p.x, p.y + 1);
    ctx.fillStyle = "rgba(236,235,230,0.8)";
    ctx.font = "500 12px JetBrains Mono, monospace";
    ctx.fillText(node.ch.name, p.x, p.y + r + 14);
  }

  function hexA(hex, a) {
    var v = parseInt(hex.slice(1), 16);
    return "rgba(" + (v >> 16) + "," + ((v >> 8) & 255) + "," + (v & 255) + "," + a + ")";
  }

  return { init: init, burst: burst };
})();

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- Count-up numbers ---------- */
  const formatters = {
    int: (v) => Math.round(v).toLocaleString("en-US"),
    k1: (v) => v.toFixed(1) + "K",
    k1plus: (v) => "+" + v.toFixed(1) + "K",
  };
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  function runCount(el) {
    const target = parseFloat(el.dataset.count);
    const fmt = formatters[el.dataset.format] || formatters.int;
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const duration = target > 1000 ? 2000 : 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = clamp((now - start) / duration);
      el.textContent = fmt(target * easeOutExpo(t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const counters = document.querySelectorAll("[data-count]");
  // HTML ships the final numbers (works without JS); start from zero when we animate
  if (!reduceMotion && "IntersectionObserver" in window) {
    counters.forEach((el) => {
      el.textContent = (formatters[el.dataset.format] || formatters.int)(0);
    });
  }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { runCount(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => io.observe(el));
  } else {
    counters.forEach(runCount);
  }

  /* ---------- Flip cards: hover on desktop, tap / Enter / Space everywhere ---------- */
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  document.querySelectorAll(".flip").forEach((card) => {
    const toggle = (force) => card.classList.toggle("is-flipped", force);
    card.addEventListener("click", () => { if (!canHover) toggle(); });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      if (e.key === "Escape") toggle(false);
    });
    card.addEventListener("blur", () => toggle(false));
  });
  // Tapping anywhere else un-flips on touch screens
  if (!canHover) {
    document.addEventListener("click", (e) => {
      document.querySelectorAll(".flip.is-flipped").forEach((c) => {
        if (!c.contains(e.target)) c.classList.remove("is-flipped");
      });
    });
  }

  /* ---------- Comments type themselves out ---------- */
  const markTimestamps = (el, text) => {
    el.textContent = "";
    text.split(/(\b\d{1,2}:\d{2}\b)/).forEach((part, i) => {
      if (i % 2) { const s = document.createElement("span"); s.className = "yt-ts"; s.textContent = part; el.append(s); }
      else if (part) el.append(part);
    });
  };
  const typers = [...document.querySelectorAll(".yt .type")];
  typers.forEach((el) => { el.dataset.full = el.textContent; });
  if (reduceMotion || !("IntersectionObserver" in window)) {
    typers.forEach((el) => markTimestamps(el, el.dataset.full));
  } else {
    typers.forEach((el) => { el.textContent = ""; });
    let queue = 0;
    const typeIt = (el) => {
      const chars = Array.from(el.dataset.full); // keeps emoji intact
      const delay = (queue++ % 3) * 350;
      let i = 0;
      setTimeout(() => {
        el.classList.add("typing");
        const step = () => {
          i += 1;
          el.textContent = chars.slice(0, i).join("");
          if (i < chars.length) setTimeout(step, 18 + Math.random() * 38);
          else { el.classList.remove("typing"); markTimestamps(el, el.dataset.full); }
        };
        step();
      }, delay);
    };
    const tio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { typeIt(e.target); tio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    typers.forEach((el) => tio.observe(el));
  }

  /* ---------- Reveal on scroll ---------- */
  if (!reduceMotion && "IntersectionObserver" in window) {
    const groups = [".stat", ".channel", ".versus", ".tests li", ".signal", ".yt", ".contact-inner"];
    const items = [];
    groups.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el, i) => {
        el.classList.add("reveal");
        el.style.transitionDelay = Math.min(i, 5) * 80 + "ms";
        items.push(el);
      });
    });
    const rio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    items.forEach((el) => rio.observe(el));
  }

  /* ---------- Hero: headsets float, then drop onto the platform ---------- */
  const scene = document.querySelector(".scene");
  const stage = document.querySelector(".stage");
  const hint = document.querySelector(".scroll-hint");
  if (!scene || !stage) return;

  const headsets = [...stage.querySelectorAll(".headset")].map((el, i) => ({
    body: el.querySelector(".headset-body"),
    shadow: el.querySelector(".headset-shadow"),
    start: 0.06 + i * 0.08,   // second headset drops a beat later
    phase: i * 1.7,
    tilt: i === 0 ? -7 : 7,
  }));

  const setLanded = (on) => stage.classList.toggle("landed", on);

  if (reduceMotion) { setLanded(true); return; }

  // Bounce on landing
  const easeOutBounce = (x) => {
    const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  };
  const smooth = (x) => x * x * (3 - 2 * x);

  let progress = 0;
  let running = false;
  let landed = false;

  function measure() {
    const rect = scene.getBoundingClientRect();
    const travel = scene.offsetHeight - window.innerHeight;
    progress = travel > 0 ? clamp(-rect.top / travel) : 1;
  }

  function frame(now) {
    if (!running) return;
    const t = now / 1000;
    // how high they float before dropping (less on phones so they stay clear of the header)
    const lift = stage.clientHeight * (window.innerWidth < 860 ? 0.22 : 0.42);
    let allDown = true;

    headsets.forEach((h) => {
      const d = clamp((progress - h.start) / 0.5);
      const fall = easeOutBounce(d);
      const calm = 1 - smooth(d);                  // floating fades out as it drops
      const bob = Math.sin(t * 1.6 + h.phase) * 14 * calm;
      const y = -lift * (1 - fall) + bob;
      const rot = h.tilt * calm + Math.sin(t * 1.1 + h.phase) * 2.5 * calm;
      h.body.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;

      const near = clamp(1 - Math.abs(y) / lift);  // shadow tightens as it nears the platform
      h.shadow.style.transform = `scale(${(0.45 + 0.55 * near).toFixed(3)})`;
      h.shadow.style.opacity = (0.2 + 0.8 * near).toFixed(3);
      if (d < 1) allDown = false;
    });

    if (allDown !== landed) { landed = allDown; setLanded(landed); }
    if (hint) hint.style.opacity = progress > 0.03 ? "0" : "1";
    requestAnimationFrame(frame);
  }

  const onScroll = () => measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  measure();

  // Only animate while the hero is on screen
  const sio = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
    else if (!entry.isIntersecting) { running = false; }
  });
  sio.observe(scene);
})();

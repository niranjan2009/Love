const wrapper = document.getElementById("envelopeWrapper");
const seal = document.getElementById("seal");
const flap = document.getElementById("flap");
const letter = document.getElementById("letter");
const bgMusic = document.getElementById("bgMusic");
const heartMusic = document.getElementById("heartMusic");
const sealSound = document.getElementById("sealSound");
const openSound = document.getElementById("openSound");
const nextArrow = document.getElementById("nextArrow");
const scrollHint = document.getElementById("scrollHint");
const countdownMusic = document.getElementById("countdownMusic");

const isSmall = window.matchMedia("(max-width: 900px)").matches; // phones / small tablets
let opened = false;
let experienceStarted = false; // becomes true after "Tap to open" on the loader
let typingStarted = false;

function safePlay(a) {
    if (!a) return;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
}

/* =========================================================
   LOVE PRELOADER - "Loading our memories"
   Loads every image + audio (+ fonts) first, then waits for a
   tap. The tap also unlocks all sounds for phones.
========================================================= */
const BASE_ASSETS = [
    "assets/background.jpg",
    "assets/envelope-bottom.png",
    "assets/envelope-flap.png",
    "assets/paper.png",
    "assets/wax-seal.png",
    "assets/petal.png",
    "assets/music.mp3",
    "assets/seal-break.mp3",
    "assets/open.mp3",
    "assets/heart-music.mp3",
    "assets/countdown.mp3"
];

const LOADER_MSGS = [
    "Gathering our first smiles…",
    "Pressing rose petals…",
    "Tuning our song…",
    "Folding every little memory…",
    "Sealing the envelope with love…"
];

function buildLoader() {
    let el = document.getElementById("loader");
    if (el) return el;
    const heart = "M50 84 C18 60 4 44 4 26 C4 13 14 4 27 4 C37 4 45 9 50 17 C55 9 63 4 73 4 C86 4 96 13 96 26 C96 44 82 60 50 84 Z";
    el = document.createElement("div");
    el.id = "loader";
    el.innerHTML =
        '<div class="loader-floaters"></div>' +
        '<div class="loader-stage">' +
          '<div class="loader-heart">' +
            '<svg viewBox="0 0 100 90" aria-hidden="true">' +
              '<defs><clipPath id="heartClip"><path d="' + heart + '"/></clipPath></defs>' +
              '<g clip-path="url(#heartClip)"><rect class="heart-fill" x="0" y="0" width="100" height="90"/></g>' +
              '<path class="heart-outline" d="' + heart + '"/>' +
            '</svg>' +
            '<div class="loader-percent">0%</div>' +
          '</div>' +
          '<div class="loader-title">Loading our memories…</div>' +
          '<div class="loader-msg"></div>' +
          '<div class="loader-bar"><i></i></div>' +
          '<button id="loaderBtn" type="button">Tap to open 💌</button>' +
        '</div>';
    document.body.appendChild(el);
    return el;
}

(function loveLoader() {
    const loader = buildLoader();
    const oldPreloader = document.getElementById("preloader"); // replaced by this loader
    if (oldPreloader) oldPreloader.remove();

    const pctEl = loader.querySelector(".loader-percent");
    const msgEl = loader.querySelector(".loader-msg");
    const btn = loader.querySelector("#loaderBtn");
    const floaters = loader.querySelector(".loader-floaters");

    /* ---- build the asset list (known files + anything found in the HTML) ---- */
    const abs = s => new URL(s, location.href).href;
    const urls = new Set(BASE_ASSETS.map(abs));
    document.querySelectorAll("img[src], audio[src], audio source[src]").forEach(n => {
        const s = n.getAttribute("src");
        if (s && !s.startsWith("data:") && !s.startsWith("blob:")) urls.add(abs(s));
    });
    const list = Array.from(urls);
    const isAudioFile = u => /\.(mp3|wav|ogg|m4a|aac)(\?|#|$)/i.test(u);

    const prog = new Array(list.length + 1).fill(0); // last slot = fonts
    let target = 0, shown = 0, lastMove = Date.now(), ready = false, forced = false;

    function setP(i, v) {
        prog[i] = Math.max(prog[i], Math.min(1, v));
        target = forced ? 1 : prog.reduce((a, b) => a + b, 0) / prog.length;
        lastMove = Date.now();
    }

    /* ---- images: load + decode ---- */
    function loadImage(u, i) {
        return new Promise(res => {
            const img = new Image();
            const done = () => { setP(i, 1); res(); };
            img.onload = () => {
                (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(done);
            };
            img.onerror = done; // never get stuck on a missing file
            img.src = u;
        });
    }

    /* ---- audio: download fully (works even where phones block audio preload),
            then hand the audio elements an in-memory copy ---- */
    const srcOf = a => {
        const s = a.getAttribute("src") || (a.querySelector("source") && a.querySelector("source").getAttribute("src"));
        return s ? abs(s) : null;
    };

    function bindAudio(u, blobUrl) {
        document.querySelectorAll("audio").forEach(a => {
            if (srcOf(a) === u && a.paused && a.currentTime === 0) {
                a.src = blobUrl;
                a.load();
            }
        });
    }

    function loadAudio(u, i) {
        return fetch(u)
            .then(res => {
                if (!res.ok) throw new Error("HTTP " + res.status);
                const total = +res.headers.get("Content-Length") || 0;
                const type = res.headers.get("Content-Type") || "audio/mpeg";
                if (!res.body || !res.body.getReader || !total) return res.blob();
                const reader = res.body.getReader();
                const chunks = [];
                let got = 0;
                const pump = () => reader.read().then(r => {
                    if (r.done) return new Blob(chunks, { type });
                    chunks.push(r.value);
                    got += r.value.length;
                    setP(i, Math.min(0.98, got / total));
                    return pump();
                });
                return pump();
            })
            .then(blob => bindAudio(u, URL.createObjectURL(blob)))
            .catch(() => {}) // audio will simply load normally later
            .then(() => setP(i, 1));
    }

    list.forEach((u, i) => { isAudioFile(u) ? loadAudio(u, i) : loadImage(u, i); });

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => setP(list.length, 1), () => setP(list.length, 1));
    } else {
        setP(list.length, 1);
    }

    /* ---- floating hearts behind the loader ---- */
    const heartsTimer = setInterval(() => {
        const h = document.createElement("span");
        h.className = "lh";
        h.textContent = "\u2665\uFE0E";
        h.style.left = Math.random() * 100 + "%";
        h.style.fontSize = (12 + Math.random() * 18) + "px";
        h.style.animationDuration = (5 + Math.random() * 5) + "s";
        floaters.appendChild(h);
        setTimeout(() => h.remove(), 10500);
    }, 450);

    /* ---- message swapper ---- */
    let msgI = -1;
    function setMsg(t) {
        msgEl.classList.add("swap");
        setTimeout(() => { msgEl.textContent = t; msgEl.classList.remove("swap"); }, 350);
    }

    /* ---- progress loop ---- */
    function tick() {
        if (ready) return;
        // safety: if nothing moved for 12s (slow data / blocked file), let her in anyway
        if (!forced && Date.now() - lastMove > 12000) { forced = true; target = 1; }

        shown = Math.min(target, shown + Math.max((target - shown) * 0.08, 0.003));
        loader.style.setProperty("--p", shown.toFixed(4));
        pctEl.textContent = Math.round(shown * 100) + "%";

        const mi = Math.min(LOADER_MSGS.length - 1, Math.floor(shown * LOADER_MSGS.length));
        if (mi !== msgI) { msgI = mi; setMsg(LOADER_MSGS[mi]); }

        if (shown >= 0.999 && target > 0.9999) {
            ready = true;
            loader.style.setProperty("--p", "1");
            pctEl.textContent = "100%";
            setTimeout(() => setMsg("Every memory is ready ♥"), 400);
            loader.classList.add("ready");
            setTimeout(() => { try { btn.focus({ preventScroll: true }); } catch (e) {} }, 900);
        } else {
            requestAnimationFrame(tick);
        }
    }
    requestAnimationFrame(tick);

    /* ---- the tap: unlock every sound (needed on phones) and open the page ---- */
    function unlockAudio() {
        [bgMusic, heartMusic, sealSound, openSound, countdownMusic].forEach(a => {
            if (!a) return;
            a.muted = true;
            const reset = () => { a.pause(); a.currentTime = 0; a.muted = false; };
            const p = a.play();
            if (p && p.then) p.then(reset).catch(() => { a.muted = false; });
            else reset();
        });
    }

    function enterExperience() {
        if (experienceStarted) return;
        experienceStarted = true;
        unlockAudio();
        loader.classList.add("leaving");

        const box = document.querySelector(".container");
        if (box && box.animate) {
            box.animate(
                [
                    { transform: "translateY(50px)", opacity: 0 },
                    { transform: "translateY(0)", opacity: 1 }
                ],
                { duration: 1400, delay: 500, easing: "ease-out", fill: "backwards" }
            );
        }
        setTimeout(() => { clearInterval(heartsTimer); loader.remove(); }, 1800);
    }
    btn.addEventListener("click", enterExperience);
})();

/* ==================
   CLICK TO OPEN
================== */
wrapper.addEventListener("click", openEnvelope);

function openEnvelope() {
    if (opened || !experienceStarted) return;
    opened = true;
    wrapper.classList.add("open");

    if (sealSound) {
        sealSound.currentTime = 0;
        safePlay(sealSound);
    }

    setTimeout(() => {
        if (openSound) {
            openSound.currentTime = 0;
            safePlay(openSound);
        }
    }, 500);

    setTimeout(() => {
        document.body.classList.add("read-mode");
    }, 2000);

    setTimeout(() => {
        if (bgMusic) {
            bgMusic.volume = 0.5;
            bgMusic.play().catch(() => console.log("Music blocked until user interaction."));
        }
    }, 1200);

    // typewriter starts here (works for click, tap and Enter)
    if (!typingStarted) {
        typingStarted = true;
        setTimeout(typeWriter, 1800);
    }

    letter.scrollTop = 0;
}

document.querySelectorAll("img").forEach(img => img.draggable = false);

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && experienceStarted) openEnvelope();
});

letter.addEventListener("scroll", () => {
    const maxScroll = letter.scrollHeight - letter.clientHeight;
    const progress = letter.scrollTop / maxScroll;
    letter.style.boxShadow = `0 20px 50px rgba(0,0,0,.45), 0 0 ${progress * 60}px rgba(255, 180, 180,.35)`;
});

const particleContainer = document.getElementById("particles");
function createParticle() {
    const p = document.createElement("div");
    p.classList.add("particle");
    p.style.left = Math.random() * window.innerWidth + "px";
    p.style.top = window.innerHeight + "px";
    p.style.animationDuration = (6 + Math.random() * 8) + "s";
    p.style.opacity = 0.2 + Math.random() * 0.8;
    p.style.transform = `scale(${0.5 + Math.random()})`;
    particleContainer.appendChild(p);
    setTimeout(() => p.remove(), 15000);
}
setInterval(createParticle, isSmall ? 350 : 180);

const petalContainer = document.getElementById("petals");
function createPetal() {
    const petal = document.createElement("img");
    petal.src = "assets/petal.png";
    petal.classList.add("petal");
    petal.style.left = Math.random() * window.innerWidth + "px";
    petal.style.top = "-100px";
    petal.style.width = (40 + Math.random() * 5) + "px";
    petal.style.animationDuration = (8 + Math.random() * 6) + "s";
    petal.style.transform = `rotate(${Math.random() * 360}deg)`;
    petalContainer.appendChild(petal);
    setTimeout(() => petal.remove(), 16000);
}
setInterval(createPetal, isSmall ? 900 : 600);


/* ============================
   SMART TYPEWRITER EFFECT
============================ */
const textContainer = document.querySelector(".letter-text");
const originalText = textContainer.innerHTML;
textContainer.innerHTML = "";
let index = 0;

function typeWriter() {
    if (index < originalText.length) {
        let char = originalText.charAt(index);

        // 1. Check if we hit an HTML tag (like <br> or <h2>)
        if (char === '<') {
            let tag = "";
            while (index < originalText.length) {
                tag += originalText.charAt(index);
                if (originalText.charAt(index) === '>') {
                    index++;
                    break;
                }
                index++;
            }
            textContainer.innerHTML += tag;
            typeWriter(); // no delay for tags

        // 2. Check if we hit an HTML symbol code (like &amp;)
        } else if (char === '&') {
            let entity = "";
            while (index < originalText.length) {
                entity += originalText.charAt(index);
                if (originalText.charAt(index) === ';') {
                    index++;
                    break;
                }
                index++;
            }
            textContainer.innerHTML += entity;
            typeWriter();

        // 3. Normal text characters type out slowly
        } else {
            textContainer.innerHTML += char;
            index++;
            setTimeout(typeWriter, 20);
        }
    } else {
        // Show "(Scroll Down)" hint once the typewriter effect finishes completely
        if (scrollHint) {
            scrollHint.classList.add("show");
        }
    }
}


/* ============================
   FINAL MESSAGE & NEXT ARROW
============================ */
const finalMessage = document.createElement("div");
finalMessage.className = "final-message";
finalMessage.innerHTML = "<br><br>I Love You Forever<br><br>Sandhiya";

const letterContent = letter.querySelector(".letter-content");
letterContent.insertBefore(finalMessage, nextArrow);

letter.addEventListener("scroll", () => {
    const distance = letter.scrollHeight - letter.clientHeight;
    if (letter.scrollTop >= distance - 50) {
        finalMessage.classList.add("show");
        setTimeout(() => {
            nextArrow.classList.add("show");
        }, 800);
    }
});

document.addEventListener("mousemove", (e) => {
    const x = (e.clientX / window.innerWidth - .5) * 15;
    const y = (e.clientY / window.innerHeight - .5) * 15;
    document.body.style.backgroundPosition = `${50 + x}% ${50 + y}%`;
});

function createHeart() {
    const heart = document.createElement("div");
    heart.innerHTML = "❤";
    heart.style.position = "absolute";
    heart.style.left = Math.random() * window.innerWidth + "px";
    heart.style.bottom = "-40px";
    heart.style.color = "rgba(255,180,220,.5)";
    heart.style.fontSize = (25 + Math.random() * 30) + "px";
    heart.style.pointerEvents = "none";
    heart.style.transition = "all 10s linear";
    document.body.appendChild(heart);
    setTimeout(() => {
        heart.style.transform = `translateY(-${window.innerHeight + 300}px) rotate(${Math.random() * 720}deg)`;
        heart.style.opacity = 0;
    }, 100);
    setTimeout(() => heart.remove(), 11000);
}
setInterval(createHeart, 2500);

/* =========================================================
   PARTICLE TEXT ANIMATION & FINAL BURST
========================================================= */

nextArrow.addEventListener("click", () => {
    document.body.classList.add("particle-mode");
    setTimeout(startParticleAnimation, 1200);

    // 1. Pause the original background music
    if (bgMusic) {
        bgMusic.pause();
    }

    // 2. Play the new countdown music
    if (countdownMusic) {
        countdownMusic.volume = 0.25; // (phones ignore volume - they use the device volume)
        countdownMusic.currentTime = 0;
        countdownMusic.play().catch(() => console.log("Music blocked by browser."));
    }
});

const canvas = document.getElementById('animationCanvas');
const ctx = canvas.getContext('2d');
let width, height;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const chars = ['♥'];
const textParticles = [];
let isHeartPhase = false;
let heartTime = 0;
let hasBurst = false;

class TextParticle {
    constructor(x, y, color) {
        this.x = width / 2 + (Math.random() - 0.5) * 200;
        this.y = height / 2 + (Math.random() - 0.5) * 200;
        this.baseTargetX = x;
        this.baseTargetY = y;
        this.targetX = x;
        this.targetY = y;
        this.color = color || '#ffffff';
        this.char = chars[Math.floor(Math.random() * chars.length)];
        this.vx = 0;
        this.vy = 0;
        this.friction = 0.82;
        this.spring = 0.08;
        this.isExploding = false;
        this.isActive = true;
    }

    update() {
        if (!this.isActive) return;
        if (this.isExploding) {
            this.vx *= 0.94;
            this.vy *= 0.94;
            this.x += this.vx;
            this.y += this.vy;
        } else {
            let tx = this.targetX;
            let ty = this.targetY;
            if (isHeartPhase) {
                const cx = width / 2;
                const cy = height / 2;
                const scale = 1 + Math.sin(heartTime) * 0.06;
                tx = cx + (this.baseTargetX - cx) * scale;
                ty = cy + (this.baseTargetY - cy) * scale;
            }
            const dx = tx - this.x;
            const dy = ty - this.y;
            this.vx += dx * this.spring;
            this.vy += dy * this.spring;
            this.vx *= this.friction;
            this.vy *= this.friction;
            this.x += this.vx;
            this.y += this.vy;
        }
    }

    draw(ctx) {
        if (!this.isActive) return;

        // random start timer so particles don't all blink together
        if (!this.lastFlash) {
            this.lastFlash = Date.now() - Math.floor(Math.random() * 200);
        }

        // new random colour every 200ms (colour string cached = faster on phones)
        if (!this.fill || Date.now() - this.lastFlash > 200) {
            this.hue = Math.floor(Math.random() * 360);
            this.fill = `hsl(${this.hue}, 100%, 60%)`;
            this.lastFlash = Date.now();
        }

        ctx.fillStyle = this.fill;
        ctx.fillText(this.char, this.x, this.y);
    }
}

function getTextPoints(text, fontSize) {
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    offCanvas.width = width;
    offCanvas.height = height;

    offCtx.fillStyle = 'black';
    offCtx.fillRect(0, 0, width, height);
    offCtx.fillStyle = 'white';
    offCtx.font = `bold ${fontSize}px Arial`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText(text, width / 2, height / 2);

    const imageData = offCtx.getImageData(0, 0, width, height).data;
    const points = [];
    const step = 8;

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            if (imageData[index] > 128) {
                points.push({
                    x: x + (Math.random() - 0.5) * 4,
                    y: y + (Math.random() - 0.5) * 4
                });
            }
        }
    }
    return points;
}

function getHeartPoints() {
    const points = [];
    const scale = Math.min(width, height) / 50;
    const cx = width / 2;
    const cy = height / 2 - 20;
    const small = width < 700;            // phones: fewer, tighter particles
    const perStep = small ? 3 : 5;
    const jitter = small ? 12 : 20;

    for (let t = 0; t < Math.PI * 2; t += 0.02) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        for (let i = 0; i < perStep; i++) {
            points.push({
                x: cx + x * scale + (Math.random() - 0.5) * jitter,
                y: cy + y * scale + (Math.random() - 0.5) * jitter
            });
        }
    }
    return points;
}

function updateTargets(newTargets, color) {
    for (let i = 0; i < newTargets.length; i++) {
        if (i < textParticles.length) {
            textParticles[i].baseTargetX = newTargets[i].x;
            textParticles[i].baseTargetY = newTargets[i].y;
            textParticles[i].targetX = newTargets[i].x;
            textParticles[i].targetY = newTargets[i].y;
            textParticles[i].color = color;
            textParticles[i].isActive = true;
            textParticles[i].isExploding = false;
        } else {
            textParticles.push(new TextParticle(newTargets[i].x, newTargets[i].y, color));
        }
    }
    for (let i = newTargets.length; i < textParticles.length; i++) {
        textParticles[i].isActive = false;
    }
}

function explode() {
    textParticles.forEach(p => {
        if (p.isActive) {
            const angle = Math.random() * Math.PI * 2;
            const force = 15 + Math.random() * 35;
            p.vx = Math.cos(angle) * force;
            p.vy = Math.sin(angle) * force;
            p.isExploding = true;
        }
    });
}

function startFallingHearts() {
    setInterval(() => {
        const heart = document.createElement("div");
        heart.innerHTML = "❤";
        heart.className = "falling-heart";
        heart.style.left = Math.random() * window.innerWidth + "px";
        heart.style.fontSize = (15 + Math.random() * 20) + "px";
        heart.style.animationDuration = (3 + Math.random() * 3) + "s";
        document.body.appendChild(heart);

        setTimeout(() => {
            heart.remove();
        }, 6000);
    }, isSmall ? 220 : 100);
}

canvas.addEventListener("click", () => {
    if (isHeartPhase && !hasBurst) {
        hasBurst = true;
        document.body.classList.remove("heart-ready");
        explode();
        startFallingHearts();

        if (bgMusic) bgMusic.pause();
        if (countdownMusic) {
            countdownMusic.pause();
            countdownMusic.currentTime = 0;
        }
        if (heartMusic) {
            heartMusic.volume = 0.5;
            heartMusic.currentTime = 0;
            heartMusic.play().catch(() => console.log("Heart music blocked."));
        }

        // Show the question 4 seconds after the heart bursts
        setTimeout(() => {
            document.getElementById("loveQuestion").classList.add("show");
        }, 4000);
    }
});

const sequence = [
    { type: 'text', val: '3', color: '#FFD700' },    // Gold
    { type: 'text', val: '2', color: '#FF8C00' },    // Dark Orange
    { type: 'text', val: '1', color: '#FF69B4' },    // Hot Pink
    { type: 'text', val: 'You', color: '#00FFFF' },  // Cyan / Bright Blue
    { type: 'text', val: 'Are', color: '#98FB98' },  // Mint Green
    { type: 'text', val: 'My', color: '#DDA0DD' },   // Plum / Light Purple
    { type: 'text', val: 'Love', color: '#FF3333' }, // Bright Red
    { type: 'heart', color: '#ff66b2' }
];

let currentIndex = 0;

function nextSequence() {
    if (currentIndex >= sequence.length) return;
    const current = sequence[currentIndex];
    let targets = [];

    if (current.type === 'text') {
        let fontSize = Math.min(width, height) * 0.45;

        // shrink the word if it would run off a narrow phone screen
        const mctx = document.createElement('canvas').getContext('2d');
        mctx.font = `bold ${fontSize}px Arial`;
        const tw = mctx.measureText(current.val).width;
        if (tw > width * 0.9) fontSize *= (width * 0.9) / tw;

        targets = getTextPoints(current.val, fontSize);
        updateTargets(targets, current.color);

        setTimeout(() => {
            explode();
            setTimeout(() => {
                currentIndex++;
                nextSequence();
            }, 700);
        }, 1400);

    } else if (current.type === 'heart') {
        targets = getHeartPoints();
        updateTargets(targets, current.color);
        isHeartPhase = true;

        setTimeout(() => {
            document.body.classList.add("heart-ready");
        }, 1000);
    }
}

function animateParticles() {
    ctx.fillStyle = 'rgba(26, 26, 28, 0.3)';
    ctx.fillRect(0, 0, width, height);

    if (isHeartPhase) {
        heartTime += 0.08;

        if (!hasBurst) {
            ctx.fillStyle = '#ffb3d9';
            ctx.font = `bold ${Math.min(26, width / 18)}px Courier New`;
            ctx.textAlign = 'center';
            ctx.fillText("I LOVE YOU SANDHIYA ♥", width / 2, height / 2);

            // Low-opacity "(Tap Here)" text inside the heart, just beneath her name
            ctx.fillStyle = 'rgba(255, 179, 217, 0.45)';
            ctx.font = '13px Courier New';
            ctx.fillText("(Tap Here)", width / 2, (height / 2) + 30);
        }
    }

    ctx.font = '11px Courier New'; // set once per frame instead of once per particle
    textParticles.forEach(p => {
        p.update();
        p.draw(ctx);
    });
    requestAnimationFrame(animateParticles);
}

function startParticleAnimation() {
    setTimeout(() => {
        nextSequence();
    }, 500);
    animateParticles();
}

/* ============================
   RUNAWAY BUTTON LOGIC
============================ */
const btnNo = document.getElementById("btnNo");
const btnYes = document.getElementById("btnYes");

let noX = 0, noY = 0;        // current jump offset
let noRest = null;           // button's resting centre (measured once)
window.addEventListener("resize", () => { noRest = null; noX = 0; noY = 0; });

function moveNoButton(e) {
    e.preventDefault();

    // measure where the button sits when it is NOT displaced
    if (!noRest) {
        const r = btnNo.getBoundingClientRect();
        noRest = { x: r.left + r.width / 2 - noX, y: r.top + r.height / 2 - noY };
    }
    const w = btnNo.offsetWidth, h = btnNo.offsetHeight, m = 12;

    // same ±150px jump as before, but never leaves the screen (important on phones)
    const loX = Math.max(-150, m + w / 2 - noRest.x);
    const hiX = Math.min(150, window.innerWidth - m - w / 2 - noRest.x);
    const loY = Math.max(-150, m + h / 2 - noRest.y);
    const hiY = Math.min(150, window.innerHeight - m - h / 2 - noRest.y);

    noX = loX + Math.random() * Math.max(0, hiX - loX);
    noY = loY + Math.random() * Math.max(0, hiY - loY);

    // random tilt so it looks like it's tumbling away
    const rotation = Math.random() * 40 - 20;

    btnNo.style.transform = `translate(${noX}px, ${noY}px) rotate(${rotation}deg) scale(0.85)`;
    btnNo.style.opacity = "0.7";
}

// Mouse hover on laptop
btnNo.addEventListener("mouseover", moveNoButton);
// Finger tap on phone
btnNo.addEventListener("touchstart", moveNoButton, { passive: false });

// What happens when she finally clicks YES
btnYes.addEventListener("click", () => {
    const questionBox = document.getElementById("loveQuestion");

    questionBox.innerHTML = `<h2>Love you too ma! ❤️<br>You are my everything... & Sandhiya,Call pannu ma, Na unakaaga wait pandren!</h2>`;

    for (let i = 0; i < 20; i++) {
        setTimeout(createHeart, i * 150);
    }
});

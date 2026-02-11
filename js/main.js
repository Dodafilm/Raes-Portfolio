/* ============================================
   RAE HOLT — Portfolio JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // FLIP DISC BACKGROUND (optimized)
    // ============================================
    const flipCanvas = document.getElementById('flip-disc-canvas');
    const flipCtx = flipCanvas.getContext('2d', { alpha: false });

    const DISC_SIZE = 14;
    const DISC_GAP = 2;
    const CELL = DISC_SIZE + DISC_GAP;
    const RADIUS = DISC_SIZE / 2;
    const FLIP_RADIUS = 120;
    const FLIP_RADIUS_SQ = FLIP_RADIUS * FLIP_RADIUS; // squared for fast comparison
    const FLIP_SPEED = 0.18;
    const RETURN_SPEED = 0.08;
    const DEAD_ZONE = 0.005;       // below this flip value, snap to 0
    const PI2 = Math.PI * 2;
    const BG_COLOR = '#1a1a1a';

    // Pre-rendered disc sprites for each color at full size (avoids arc() per frame)
    const FRONT_COLOR = '#1e1e1e';
    const ACCENT_COLORS = ['#E8453C', '#D4A574', '#ffffff'];
    const SPRITE_SIZE = DISC_SIZE + 2; // 1px padding for anti-alias
    const spriteCache = {};

    function makeDiscSprite(fillColor, strokeColor) {
        const key = fillColor + strokeColor;
        if (spriteCache[key]) return spriteCache[key];
        const c = document.createElement('canvas');
        c.width = SPRITE_SIZE;
        c.height = SPRITE_SIZE;
        const cx = c.getContext('2d');
        cx.beginPath();
        cx.arc(SPRITE_SIZE / 2, SPRITE_SIZE / 2, RADIUS, 0, PI2);
        cx.fillStyle = fillColor;
        cx.fill();
        cx.strokeStyle = strokeColor;
        cx.lineWidth = 0.5;
        cx.stroke();
        spriteCache[key] = c;
        return c;
    }

    // Pre-build all sprites
    const frontSprite = makeDiscSprite(FRONT_COLOR, '#2a2a2a');
    const backSprites = ACCENT_COLORS.map(c => makeDiscSprite(c, 'rgba(255,255,255,0.15)'));

    // Use typed arrays for disc state (SoA layout for cache-friendly iteration)
    let cols, rows, totalDiscs;
    let discFlip, discTarget, discColorIdx;
    // Track which discs are currently animating so we can skip static ones
    let activeSet = new Set();
    let flipMouseX = -9999;
    let flipMouseY = -9999;
    let prevMouseCol = -1;
    let prevMouseRow = -1;

    function initDiscs() {
        flipCanvas.width = window.innerWidth;
        flipCanvas.height = window.innerHeight;
        cols = Math.ceil(flipCanvas.width / CELL) + 1;
        rows = Math.ceil(flipCanvas.height / CELL) + 1;
        totalDiscs = cols * rows;

        discFlip = new Float32Array(totalDiscs);     // current flip 0-1
        discTarget = new Float32Array(totalDiscs);   // target flip
        discColorIdx = new Uint8Array(totalDiscs);   // back color index

        for (let i = 0; i < totalDiscs; i++) {
            discColorIdx[i] = (Math.random() * ACCENT_COLORS.length) | 0;
        }
        activeSet.clear();

        // Draw initial static frame
        drawStaticBackground();
    }

    function drawStaticBackground() {
        flipCtx.fillStyle = BG_COLOR;
        flipCtx.fillRect(0, 0, flipCanvas.width, flipCanvas.height);
        const halfSprite = SPRITE_SIZE / 2;
        for (let r = 0; r < rows; r++) {
            const y = r * CELL + RADIUS - halfSprite;
            for (let c = 0; c < cols; c++) {
                flipCtx.drawImage(frontSprite, c * CELL + RADIUS - halfSprite, y);
            }
        }
    }

    initDiscs();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initDiscs, 100);
    });

    document.addEventListener('mousemove', (e) => {
        flipMouseX = e.clientX;
        flipMouseY = e.clientY;
    });
    document.addEventListener('mouseleave', () => {
        flipMouseX = -9999;
        flipMouseY = -9999;
    });

    function updateDiscTargets() {
        // Only check discs in the grid region near the mouse
        const mcol = ((flipMouseX - RADIUS) / CELL) | 0;
        const mrow = ((flipMouseY - RADIUS) / CELL) | 0;
        const span = Math.ceil(FLIP_RADIUS / CELL) + 1;

        const rMin = Math.max(0, mrow - span);
        const rMax = Math.min(rows - 1, mrow + span);
        const cMin = Math.max(0, mcol - span);
        const cMax = Math.min(cols - 1, mcol + span);

        // Also clear targets for previous mouse region if it moved
        if (prevMouseCol !== mcol || prevMouseRow !== mrow) {
            const prMin = Math.max(0, prevMouseRow - span);
            const prMax = Math.min(rows - 1, prevMouseRow + span);
            const pcMin = Math.max(0, prevMouseCol - span);
            const pcMax = Math.min(cols - 1, prevMouseCol + span);
            for (let r = prMin; r <= prMax; r++) {
                const rowOff = r * cols;
                for (let c = pcMin; c <= pcMax; c++) {
                    const idx = rowOff + c;
                    discTarget[idx] = 0;
                    if (discFlip[idx] > DEAD_ZONE) activeSet.add(idx);
                }
            }
            prevMouseCol = mcol;
            prevMouseRow = mrow;
        }

        // Set targets for discs near mouse
        for (let r = rMin; r <= rMax; r++) {
            const dy = r * CELL + RADIUS - flipMouseY;
            const dy2 = dy * dy;
            const rowOff = r * cols;
            for (let c = cMin; c <= cMax; c++) {
                const dx = c * CELL + RADIUS - flipMouseX;
                const distSq = dx * dx + dy2;
                const idx = rowOff + c;
                if (distSq < FLIP_RADIUS_SQ) {
                    const t = 1 - Math.sqrt(distSq) / FLIP_RADIUS;
                    discTarget[idx] = t;
                    activeSet.add(idx);
                } else {
                    discTarget[idx] = 0;
                }
            }
        }
    }

    function drawDiscs() {
        updateDiscTargets();

        const halfSprite = SPRITE_SIZE / 2;

        // Process only active (animating) discs
        activeSet.forEach(idx => {
            let f = discFlip[idx];
            const t = discTarget[idx];

            // Animate
            if (f < t) {
                f += (t - f) * FLIP_SPEED + 0.02;
                if (f > t) f = t;
            } else if (f > t) {
                f -= (f - t) * RETURN_SPEED + 0.008;
                if (f < DEAD_ZONE) { f = 0; }
            }
            discFlip[idx] = f;

            // If static, remove from active set and redraw as front disc
            if (f === 0 && t === 0) {
                activeSet.delete(idx);
            }

            // Compute grid position
            const col = idx % cols;
            const row = (idx / cols) | 0;
            const cx = col * CELL + RADIUS;
            const cy = row * CELL + RADIUS;

            // Erase this disc's cell
            flipCtx.fillStyle = BG_COLOR;
            flipCtx.fillRect(cx - halfSprite, cy - halfSprite, SPRITE_SIZE, SPRITE_SIZE);

            if (f === 0) {
                // Static front disc
                flipCtx.drawImage(frontSprite, cx - halfSprite, cy - halfSprite);
                return;
            }

            // Flip animation: scaleX
            let scaleX, isFront;
            if (f <= 0.5) {
                scaleX = 1 - f * 2;
                isFront = true;
            } else {
                scaleX = (f - 0.5) * 2;
                isFront = false;
            }
            if (scaleX < 0.05) scaleX = 0.05;

            const sprite = isFront ? frontSprite : backSprites[discColorIdx[idx]];

            flipCtx.save();
            flipCtx.translate(cx, cy);
            flipCtx.scale(scaleX, 1);
            flipCtx.drawImage(sprite, -halfSprite, -halfSprite);
            flipCtx.restore();
        });

        requestAnimationFrame(drawDiscs);
    }
    requestAnimationFrame(drawDiscs);


    // ---- Paint Cursor Trail (optimized) ----
    const canvas = document.getElementById('paint-cursor-canvas');
    const ctx = canvas.getContext('2d');
    const heroEl = document.getElementById('hero');

    // Object pool to avoid GC churn
    const MAX_PARTICLES = 150;
    const pool = new Array(MAX_PARTICLES);
    let poolCount = 0;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const paintColors = ['#E8453C', '#D4A574', '#2D2D2D'];

    function spawnParticle(x, y) {
        if (poolCount >= MAX_PARTICLES) return;
        const p = pool[poolCount] || (pool[poolCount] = {});
        p.x = x + (Math.random() - 0.5) * 10;
        p.y = y + (Math.random() - 0.5) * 10;
        p.size = Math.random() * 6 + 2;
        p.color = paintColors[(Math.random() * paintColors.length) | 0];
        p.alpha = Math.random() * 0.4 + 0.2;
        p.life = 1;
        p.decay = Math.random() * 0.025 + 0.01;
        p.vx = (Math.random() - 0.5);
        p.vy = (Math.random() - 0.5) + 0.5;
        p.sx = p.size;
        p.sy = p.size * 0.6;
        poolCount++;
    }

    document.addEventListener('mousemove', (e) => {
        const rect = heroEl.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            spawnParticle(e.clientX, e.clientY);
        }
    });

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let writeIdx = 0;
        for (let i = 0; i < poolCount; i++) {
            const p = pool[i];
            p.life -= p.decay;
            if (p.life <= 0) continue;

            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.02;
            p.sx *= 0.99;
            p.sy *= 0.99;

            ctx.globalAlpha = p.alpha * p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.sx, p.sy, 0, 0, PI2);
            ctx.fill();

            // Compact alive particles down
            if (writeIdx !== i) pool[writeIdx] = p;
            writeIdx++;
        }
        poolCount = writeIdx;
        ctx.globalAlpha = 1;

        requestAnimationFrame(animateParticles);
    }
    animateParticles();


    // ---- Interactive Name SVG ----
    const heroName = document.getElementById('heroName');
    if (heroName) {
        const svg = heroName.querySelector('.paint-name');
        const strokes = svg.querySelectorAll('.stroke');
        const splatters = svg.querySelectorAll('.splatter');

        // Click to re-animate strokes
        heroName.addEventListener('click', () => {
            // Re-trigger stroke animation
            strokes.forEach(stroke => {
                stroke.style.animation = 'none';
                stroke.offsetHeight; // force reflow
                stroke.style.animation = '';
            });

            // Re-trigger splatter animation
            splatters.forEach(splatter => {
                splatter.style.animation = 'none';
                splatter.offsetHeight;
                splatter.style.animation = '';
            });

            // Add random new splatters temporarily
            const svgNS = 'http://www.w3.org/2000/svg';
            const splatGroup = svg.querySelector('.splatters');
            for (let i = 0; i < 5; i++) {
                const circle = document.createElementNS(svgNS, 'circle');
                circle.setAttribute('cx', Math.random() * 900);
                circle.setAttribute('cy', Math.random() * 150 + 30);
                circle.setAttribute('r', Math.random() * 6 + 2);
                circle.setAttribute('fill', paintColors[Math.floor(Math.random() * paintColors.length)]);
                circle.setAttribute('opacity', Math.random() * 0.5 + 0.2);
                circle.classList.add('splatter');
                circle.style.animation = `splat 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`;
                circle.style.animationDelay = `${Math.random() * 0.5}s`;
                splatGroup.appendChild(circle);

                // Remove after animation
                setTimeout(() => circle.remove(), 2000);
            }
        });

        // Mouse move parallax on SVG strokes
        heroName.addEventListener('mousemove', (e) => {
            const rect = heroName.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;

            strokes.forEach((stroke, i) => {
                const factor = (i + 1) * 2;
                stroke.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
                stroke.style.transition = 'transform 0.3s ease-out';
            });
        });

        heroName.addEventListener('mouseleave', () => {
            strokes.forEach(stroke => {
                stroke.style.transform = 'translate(0, 0)';
            });
        });
    }


    // ---- Navigation ----
    const nav = document.getElementById('mainNav');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    // Scroll state
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // Mobile toggle
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        navToggle.classList.toggle('active');
    });

    // Close nav on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            navToggle.classList.remove('active');
        });
    });

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                const offset = 80;
                const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });


    // ---- Scroll Reveal ----
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    // Gallery items
    const galleryObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger the reveal
                const item = entry.target;
                const siblings = item.parentElement.querySelectorAll('.gallery-item');
                const idx = Array.from(siblings).indexOf(item);

                setTimeout(() => {
                    item.classList.add('visible');
                }, idx * 100);

                galleryObserver.unobserve(item);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.gallery-item').forEach(item => {
        galleryObserver.observe(item);
    });

    // Section reveals
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                sectionObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    // Add reveal class to section headers and bio elements
    document.querySelectorAll('.section-header, .bio-grid, .contact-inner, .resume-grid').forEach(el => {
        el.classList.add('reveal');
        sectionObserver.observe(el);
    });


    // ---- Active Nav Highlighting ----
    const sections = document.querySelectorAll('.section, .hero');
    const navLinkElements = document.querySelectorAll('.nav-links a:not(.nav-cta)');

    const activeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinkElements.forEach(link => {
                    link.style.color = '';
                    if (link.getAttribute('href') === `#${id}`) {
                        link.style.color = '#fff';
                    }
                });
            }
        });
    }, { threshold: 0.3 });

    sections.forEach(section => activeObserver.observe(section));


    // ---- Bio Stats Counter Animation ----
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = entry.target.querySelectorAll('.stat-number');
                statNumbers.forEach(stat => {
                    const text = stat.textContent;
                    const match = text.match(/(\d+)/);
                    if (match) {
                        const target = parseInt(match[1]);
                        const suffix = text.replace(match[1], '');
                        let current = 0;
                        const increment = target / 40;
                        const timer = setInterval(() => {
                            current += increment;
                            if (current >= target) {
                                current = target;
                                clearInterval(timer);
                            }
                            stat.textContent = Math.floor(current) + suffix;
                        }, 30);
                    }
                });
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const bioStats = document.querySelector('.bio-stats');
    if (bioStats) statsObserver.observe(bioStats);


    // ---- Lightbox / Popup ----
    const lightbox = document.getElementById('lightbox');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDescription = document.getElementById('lightboxDescription');
    const lightboxCategory = document.getElementById('lightboxCategory');
    const lightboxTools = document.getElementById('lightboxTools');
    const lightboxYear = document.getElementById('lightboxYear');
    const lightboxClient = document.getElementById('lightboxClient');

    const categoryLabels = {
        commercial: 'Commercial Work',
        marketing: 'Marketing Design',
        social: 'Social Media',
        album: 'Album Art',
        painting: 'Painting'
    };

    function openLightbox(card) {
        const title = card.dataset.title;
        const description = card.dataset.description;
        const tools = card.dataset.tools;
        const year = card.dataset.year;
        const client = card.dataset.client;
        const category = card.closest('.gallery-item').dataset.category;

        // Clone the placeholder as the lightbox image preview
        const placeholder = card.querySelector('.gallery-placeholder');
        const placeholderImg = placeholder.querySelector('img');
        lightboxImage.style.cssText = '';
        lightboxImage.style.width = '100%';
        lightboxImage.style.minHeight = '300px';
        lightboxImage.style.maxHeight = '450px';
        lightboxImage.style.display = 'flex';
        lightboxImage.style.alignItems = 'center';
        lightboxImage.style.justifyContent = 'center';
        lightboxImage.style.overflow = 'hidden';

        if (placeholderImg) {
            lightboxImage.style.background = '#111';
            lightboxImage.innerHTML = `<img src="${placeholderImg.src}" alt="${placeholderImg.alt || ''}" style="width:100%;height:100%;object-fit:contain;">`;
        } else {
            const bgStyle = placeholder.style.cssText;
            lightboxImage.style.cssText += bgStyle;
            lightboxImage.style.width = '100%';
            lightboxImage.style.minHeight = '300px';
            lightboxImage.style.maxHeight = '450px';
            lightboxImage.style.display = 'flex';
            lightboxImage.style.alignItems = 'center';
            lightboxImage.style.justifyContent = 'center';
            const spanEl = placeholder.querySelector('span');
            lightboxImage.innerHTML = spanEl ? `<span style="font-family: var(--font-handwritten); font-size: 1.5rem; color: rgba(255,255,255,0.6);">${spanEl.textContent}</span>` : '';
        }

        lightboxCategory.textContent = categoryLabels[category] || category;
        lightboxTitle.textContent = title || 'Untitled';
        lightboxDescription.innerHTML = description || '';
        lightboxTools.innerHTML = tools || '—';
        lightboxYear.textContent = year || '—';
        lightboxClient.innerHTML = client || '—';

        // Update the label for paintings (show "Size" instead of "Client / Size")
        const clientLabel = document.querySelector('#metaClient .meta-label');
        if (category === 'painting') {
            clientLabel.textContent = 'Size';
        } else {
            clientLabel.textContent = 'Client';
        }

        lightbox.classList.add('active');
        document.body.classList.add('lightbox-open');
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.classList.remove('lightbox-open');
    }

    // Attach click to all gallery cards
    document.querySelectorAll('.gallery-card[data-title]').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            openLightbox(card);
        });
    });

    // Close lightbox
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });


    // ---- Gallery Card Tilt Effect ----
    document.querySelectorAll('.gallery-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const tiltX = (y - 0.5) * 8;
            const tiltY = (x - 0.5) * -8;

            card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });


    // ---- Parallax on scroll ----
    const heroShapes = document.querySelectorAll('.shape');
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;

        heroShapes.forEach((shape, i) => {
            const speed = (i + 1) * 0.05;
            shape.style.transform = `translate(0, ${scrolled * speed}px)`;
        });
    }, { passive: true });

});

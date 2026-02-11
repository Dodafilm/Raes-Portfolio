/* ============================================
   RAE HOLT — Portfolio JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // FLOW FIELD BACKGROUND
    // ============================================
    const flowCanvas = document.getElementById('flow-field-canvas');
    const flowCtx = flowCanvas.getContext('2d');

    // --- Perlin Noise ---
    const perm = new Uint8Array(512);
    const grad2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
    (function() {
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            const t = p[i]; p[i] = p[j]; p[j] = t;
        }
        for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    })();

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerpN(a, b, t) { return a + t * (b - a); }

    function noise2D(x, y) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x), yf = y - Math.floor(y);
        const u = fade(xf), v = fade(yf);
        const d = (i, fx, fy) => { const g = grad2[perm[i] & 7]; return g[0] * fx + g[1] * fy; };
        const aa = perm[X] + Y, ba = perm[X + 1] + Y;
        return lerpN(
            lerpN(d(aa, xf, yf), d(ba, xf - 1, yf), u),
            lerpN(d(aa + 1, xf, yf - 1), d(ba + 1, xf - 1, yf - 1), u),
            v
        );
    }

    // Configuration
    const PARTICLE_COUNT = 600;
    const NOISE_SCALE = 0.0025;
    const NOISE_SPEED = 0.0006;
    const MAX_SPEED = 1.5;
    const CURSOR_RADIUS = 220;

    // White pen-stroke palette
    const FLOW_COLORS = [
        'rgba(255,255,255,0.18)',
        'rgba(255,255,255,0.14)',
        'rgba(255,255,255,0.10)',
        'rgba(240,240,240,0.12)',
        'rgba(220,220,220,0.08)',
    ];

    let flowW, flowH, flowTime = 0;
    let flowMX = -9999, flowMY = -9999;
    const particles = [];

    function createParticle() {
        const x = Math.random() * flowW, y = Math.random() * flowH;
        return {
            x, y, px: x, py: y, vx: 0, vy: 0,
            color: FLOW_COLORS[(Math.random() * FLOW_COLORS.length) | 0],
            lw: 0.3 + Math.random() * 1.2,
            life: (Math.random() * 280 + 120) | 0,
            ml: 0
        };
    }

    function resetParticle(p) {
        p.x = Math.random() * flowW; p.y = Math.random() * flowH;
        p.px = p.x; p.py = p.y; p.vx = 0; p.vy = 0;
        p.life = (Math.random() * 280 + 120) | 0; p.ml = p.life;
        p.color = FLOW_COLORS[(Math.random() * FLOW_COLORS.length) | 0];
        p.lw = 0.3 + Math.random() * 1.2;
    }

    function initFlow() {
        flowCanvas.width = window.innerWidth;
        flowCanvas.height = window.innerHeight;
        flowW = flowCanvas.width; flowH = flowCanvas.height;
        flowCtx.fillStyle = '#181818';
        flowCtx.fillRect(0, 0, flowW, flowH);
        particles.length = 0;
        for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle());
    }

    initFlow();

    let flowResizeT;
    window.addEventListener('resize', () => {
        clearTimeout(flowResizeT);
        flowResizeT = setTimeout(initFlow, 150);
    });

    document.addEventListener('mousemove', (e) => { flowMX = e.clientX; flowMY = e.clientY; });
    document.addEventListener('mouseleave', () => { flowMX = -9999; flowMY = -9999; });

    function tickFlow() {
        // Subtle fade for trailing pen strokes
        flowCtx.fillStyle = 'rgba(24,24,24,0.02)';
        flowCtx.fillRect(0, 0, flowW, flowH);
        flowTime += NOISE_SPEED;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (!p.ml) p.ml = p.life;
            p.px = p.x; p.py = p.y;

            // Two-octave noise angle
            const n1 = noise2D(p.x * NOISE_SCALE, p.y * NOISE_SCALE + flowTime);
            const n2 = noise2D(p.x * NOISE_SCALE + 31.7, p.y * NOISE_SCALE + flowTime + 17.3);
            let angle = (n1 + n2 * 0.5) * Math.PI * 2.5;

            // Cursor swirl influence
            const dx = p.x - flowMX, dy = p.y - flowMY;
            const dSq = dx * dx + dy * dy;
            if (dSq < CURSOR_RADIUS * CURSOR_RADIUS) {
                const dist = Math.sqrt(dSq);
                const t = 1 - dist / CURSOR_RADIUS;
                angle = lerpN(angle, Math.atan2(dy, dx) + Math.PI * 0.55, t * 0.7);
                p.vx -= dx * 0.00004 * t;
                p.vy -= dy * 0.00004 * t;
            }

            p.vx += Math.cos(angle) * 0.15;
            p.vy += Math.sin(angle) * 0.15;

            // Speed cap + damping
            const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (spd > MAX_SPEED) { p.vx = p.vx / spd * MAX_SPEED; p.vy = p.vy / spd * MAX_SPEED; }
            p.vx *= 0.97; p.vy *= 0.97;

            p.x += p.vx; p.y += p.vy;
            p.life--;

            if (p.life <= 0 || p.x < -20 || p.x > flowW + 20 || p.y < -20 || p.y > flowH + 20) {
                resetParticle(p);
                continue;
            }

            // Draw pen stroke — thin line from previous to current position
            const lr = p.life / p.ml;
            flowCtx.globalAlpha = Math.sin(lr * Math.PI);
            flowCtx.beginPath();
            flowCtx.moveTo(p.px, p.py);
            flowCtx.lineTo(p.x, p.y);
            flowCtx.strokeStyle = p.color;
            flowCtx.lineWidth = p.lw * (0.3 + lr * 0.7);
            flowCtx.lineCap = 'round';
            flowCtx.stroke();
        }

        flowCtx.globalAlpha = 1;
        requestAnimationFrame(tickFlow);
    }

    requestAnimationFrame(tickFlow);


    // Cherry red palette for SVG splatters
    const paintColors = ['#CC2936', '#a3212b', '#e63946'];


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
                        link.style.color = '#CC2936';
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

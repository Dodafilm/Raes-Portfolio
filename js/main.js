/* ============================================
   RAE HOLT — Portfolio JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // FLIP DISC BACKGROUND
    // ============================================
    const flipCanvas = document.getElementById('flip-disc-canvas');
    const flipCtx = flipCanvas.getContext('2d');

    const DISC_SIZE = 14;          // disc diameter
    const DISC_GAP = 2;            // gap between discs
    const CELL = DISC_SIZE + DISC_GAP;
    const FLIP_RADIUS = 120;       // mouse influence radius
    const FLIP_SPEED = 0.08;       // how fast discs flip (0-1)
    const RETURN_SPEED = 0.03;     // how fast discs return

    const FRONT_COLOR = '#1e1e1e'; // dark front (resting)
    const BACK_COLOR = '#E8453C';  // red back (flipped)
    const ACCENT_COLORS = ['#E8453C', '#D4A574', '#fff'];

    let cols, rows, discs;
    let flipMouseX = -9999;
    let flipMouseY = -9999;

    function initDiscs() {
        flipCanvas.width = window.innerWidth;
        flipCanvas.height = window.innerHeight;
        cols = Math.ceil(flipCanvas.width / CELL) + 1;
        rows = Math.ceil(flipCanvas.height / CELL) + 1;

        discs = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                discs.push({
                    x: c * CELL + DISC_SIZE / 2,
                    y: r * CELL + DISC_SIZE / 2,
                    flip: 0,           // 0 = front, 1 = fully flipped
                    targetFlip: 0,
                    backColor: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
                });
            }
        }
    }
    initDiscs();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initDiscs, 150);
    });

    // Track mouse for flip discs (needs pointer events)
    document.addEventListener('mousemove', (e) => {
        flipMouseX = e.clientX;
        flipMouseY = e.clientY;
    });

    document.addEventListener('mouseleave', () => {
        flipMouseX = -9999;
        flipMouseY = -9999;
    });

    function drawDiscs() {
        flipCtx.clearRect(0, 0, flipCanvas.width, flipCanvas.height);

        for (let i = 0; i < discs.length; i++) {
            const d = discs[i];

            // Calculate distance to mouse
            const dx = d.x - flipMouseX;
            const dy = d.y - flipMouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Set target flip based on distance
            if (dist < FLIP_RADIUS) {
                d.targetFlip = 1 - (dist / FLIP_RADIUS); // closer = more flipped
            } else {
                d.targetFlip = 0;
            }

            // Animate flip value
            if (d.flip < d.targetFlip) {
                d.flip += (d.targetFlip - d.flip) * FLIP_SPEED + 0.01;
                if (d.flip > d.targetFlip) d.flip = d.targetFlip;
            } else if (d.flip > d.targetFlip) {
                d.flip -= (d.flip - d.targetFlip) * RETURN_SPEED + 0.003;
                if (d.flip < 0) d.flip = 0;
            }

            // Draw the disc
            // Flip effect: scale X from 1 (front) through 0 (edge) to 1 (back)
            const flipPhase = d.flip; // 0 to 1
            const radius = DISC_SIZE / 2;

            // Determine which "side" is showing
            // 0-0.5 = front rotating to edge, 0.5-1 = back rotating from edge
            let scaleX;
            let isFront;
            if (flipPhase <= 0.5) {
                scaleX = 1 - flipPhase * 2;  // 1 -> 0
                isFront = true;
            } else {
                scaleX = (flipPhase - 0.5) * 2; // 0 -> 1
                isFront = false;
            }

            // Min scale so disc doesn't disappear completely
            scaleX = Math.max(scaleX, 0.05);

            const color = isFront ? FRONT_COLOR : d.backColor;

            flipCtx.save();
            flipCtx.translate(d.x, d.y);
            flipCtx.scale(scaleX, 1);

            // Draw circle
            flipCtx.beginPath();
            flipCtx.arc(0, 0, radius, 0, Math.PI * 2);

            // Add subtle shading based on flip state
            if (!isFront && flipPhase > 0.5) {
                const brightness = 0.7 + 0.3 * ((flipPhase - 0.5) * 2);
                flipCtx.globalAlpha = brightness;
            } else {
                flipCtx.globalAlpha = 0.9;
            }

            flipCtx.fillStyle = color;
            flipCtx.fill();

            // Subtle border
            flipCtx.strokeStyle = isFront ? '#2a2a2a' : 'rgba(255,255,255,0.15)';
            flipCtx.lineWidth = 0.5;
            flipCtx.stroke();

            flipCtx.restore();
        }

        requestAnimationFrame(drawDiscs);
    }
    drawDiscs();


    // ---- Paint Cursor Trail ----
    const canvas = document.getElementById('paint-cursor-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouseX = 0;
    let mouseY = 0;
    let isMouseMoving = false;
    let mouseTimer = null;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const paintColors = ['#E8453C', '#D4A574', '#2D2D2D', '#E8453C', '#D4A574'];

    class PaintParticle {
        constructor(x, y) {
            this.x = x + (Math.random() - 0.5) * 10;
            this.y = y + (Math.random() - 0.5) * 10;
            this.size = Math.random() * 6 + 2;
            this.color = paintColors[Math.floor(Math.random() * paintColors.length)];
            this.opacity = Math.random() * 0.4 + 0.2;
            this.life = 1;
            this.decay = Math.random() * 0.02 + 0.008;
            this.vx = (Math.random() - 0.5) * 1;
            this.vy = (Math.random() - 0.5) * 1 + 0.5;
            this.rotation = Math.random() * Math.PI * 2;
        }

        update() {
            this.life -= this.decay;
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.02; // gravity
            this.size *= 0.99;
        }

        draw(ctx) {
            if (this.life <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.opacity * this.life;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);

            // Draw an irregular paint blob
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        isMouseMoving = true;

        // Only spawn particles on the hero section
        const hero = document.getElementById('hero');
        const heroRect = hero.getBoundingClientRect();
        if (e.clientY >= heroRect.top && e.clientY <= heroRect.bottom) {
            for (let i = 0; i < 2; i++) {
                particles.push(new PaintParticle(mouseX, mouseY));
            }
        }

        clearTimeout(mouseTimer);
        mouseTimer = setTimeout(() => { isMouseMoving = false; }, 100);
    });

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        // Remove dead particles
        particles = particles.filter(p => p.life > 0);

        // Cap particles
        if (particles.length > 200) {
            particles = particles.slice(-200);
        }

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
    document.querySelectorAll('.section-header, .bio-grid, .contact-inner').forEach(el => {
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
        const bgStyle = placeholder.style.cssText;
        lightboxImage.style.cssText = bgStyle;
        // Ensure it fills the lightbox image area
        lightboxImage.style.width = '100%';
        lightboxImage.style.minHeight = '300px';
        lightboxImage.style.maxHeight = '450px';
        lightboxImage.style.display = 'flex';
        lightboxImage.style.alignItems = 'center';
        lightboxImage.style.justifyContent = 'center';
        lightboxImage.innerHTML = `<span style="font-family: var(--font-handwritten); font-size: 1.5rem; color: rgba(255,255,255,0.6);">${placeholder.querySelector('span').textContent}</span>`;

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

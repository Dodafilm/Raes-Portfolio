/* ============================================
   RAE HOLT — Portfolio JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

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
                        link.style.color = 'var(--charcoal)';
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

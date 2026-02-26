/* ============================================
   AXO LANDING PAGE — INTERACTIONS
   ============================================ */

(function () {
    'use strict';

    /* ---------- Nav scroll effect ---------- */
    const nav = document.getElementById('nav');
    const handleNavScroll = () => {
        nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll();

    /* ---------- Mobile hamburger menu ---------- */
    const hamburger = document.getElementById('navHamburger');
    const navLinks = document.getElementById('navLinks');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            navLinks.classList.toggle('open');
        });
        // Close menu when a link is clicked
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('open');
                navLinks.classList.remove('open');
            });
        });
    }

    /* ---------- Reveal on scroll ---------- */
    const revealEls = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));

    /* ---------- Stat counter animation ---------- */
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    let statsCounted = false;

    function animateCounters() {
        if (statsCounted) return;
        statsCounted = true;

        statNumbers.forEach((el) => {
            const target = parseFloat(el.dataset.target);
            const isDecimal = target % 1 !== 0;
            const duration = 1800;
            const startTime = performance.now();

            function tick(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // ease-out cubic
                const ease = 1 - Math.pow(1 - progress, 3);
                const current = target * ease;

                el.textContent = isDecimal
                    ? current.toFixed(1)
                    : Math.floor(current).toString();

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    el.textContent = isDecimal
                        ? target.toFixed(1)
                        : target.toString();
                }
            }

            requestAnimationFrame(tick);
        });
    }

    const statsSection = document.getElementById('stats');
    if (statsSection) {
        const statsObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        animateCounters();
                        statsObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.3 }
        );
        statsObserver.observe(statsSection);
    }

    /* ---------- Email form ---------- */
    const form = document.getElementById('betaForm');
    const emailInput = document.getElementById('emailInput');
    const formMsg = document.getElementById('formMsg');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            if (!email) return;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                formMsg.textContent = 'Please enter a valid email address.';
                formMsg.className = 'form-msg error';
                return;
            }

            const btn = form.querySelector('.form-btn');
            btn.textContent = 'Sending...';
            btn.disabled = true;
            formMsg.textContent = '';
            formMsg.className = 'form-msg';

            try {
                const res = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });

                const data = await res.json();

                if (res.ok) {
                    formMsg.textContent = data.message;
                    formMsg.className = 'form-msg success';
                    btn.textContent = 'Joined ✓';
                    emailInput.value = '';
                    emailInput.disabled = true;
                } else {
                    formMsg.textContent = data.error || 'Something went wrong.';
                    formMsg.className = 'form-msg error';
                    btn.textContent = 'Get Early Access';
                    btn.disabled = false;
                }
            } catch (err) {
                formMsg.textContent = 'Network error. Please try again.';
                formMsg.className = 'form-msg error';
                btn.textContent = 'Get Early Access';
                btn.disabled = false;
            }
        });
    }

    /* ---------- Smooth scroll for anchor links ---------- */
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
})();

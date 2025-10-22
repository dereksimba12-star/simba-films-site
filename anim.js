// anim.js — effets reveal + parallax (compatibles contenu dynamique)
// Améliorations: reduced-motion, perf viewport, cible parallax souris flexible.
(() => {
  let revealObserver = null;
  let parallaxEls = [];
  let ticking = false;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  // ---- REVEAL-ON-SCROLL ----
  function initReveal(root = document) {
    const els = root.querySelectorAll('.reveal:not(.reveal-bound)');
    if (!els.length || reduceMotion) return;

    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('show');
            revealObserver.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    }

    els.forEach(el => {
      el.classList.add('reveal-bound'); // évite double binding
      revealObserver.observe(el);
    });
  }

  // ---- PARALLAX AU SCROLL ----
  function collectParallaxEls(root = document) {
    if (reduceMotion) return;
    const newEls = Array.from(root.querySelectorAll('.parallax:not(.px-bound)'));
    newEls.forEach(el => el.classList.add('px-bound'));
    if (newEls.length) parallaxEls.push(...newEls);
  }

  function applyParallax() {
    if (reduceMotion || parallaxEls.length === 0) return;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    for (let i = 0; i < parallaxEls.length; i++) {
      const el = parallaxEls[i];
      const speed = parseFloat(el.dataset.speed || 0.1);
      const rect = el.getBoundingClientRect();

      // Skip si complètement hors viewport → perf
      if (rect.bottom < 0 || rect.top > vh) continue;

      const offset = (rect.top - vh / 2) * speed;
      el.style.transform = `translateY(${offset.toFixed(1)}px)`;
      el.style.willChange = 'transform';
    }
  }

  function onScrollOrResize() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      applyParallax();
      ticking = false;
    });
  }

  // ---- PARALLAX À LA SOURIS (pour [data-parallax-mouse]) ----
  function initMouseParallax(root = document) {
    if (reduceMotion) return;

    root.querySelectorAll('[data-parallax-mouse]:not(.pm-bound)').forEach(box => {
      box.classList.add('pm-bound');

      const strength = parseFloat(box.dataset.strength || 12);

      // Cible flexible:
      // 1) élément marqué data-parallax-target
      // 2) premier enfant
      // 3) l’élément lui-même en fallback
      let target =
        box.querySelector('[data-parallax-target]') ||
        box.firstElementChild ||
        box;

      const onMove = (e) => {
        const rect = box.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        target.style.transform = `translate(${(-dx * strength).toFixed(1)}px, ${(-dy * strength).toFixed(1)}px) scale(1.02)`;
        target.style.willChange = 'transform';
      };
      const onLeave = () => { target.style.transform = 'translate(0,0) scale(1)'; };

      box.addEventListener('mousemove', onMove);     // passive n’apporte rien ici
      box.addEventListener('mouseleave', onLeave);
    });
  }

  // ---- INITIALISATION PUBLIQUE ----
  function initUX(root = document) {
    initReveal(root);
    collectParallaxEls(root);
    initMouseParallax(root);
    applyParallax(); // premier calcul
  }

  // Expose pour ré-initialiser après injection dynamique (CMS/JSON)
  window.initUX = initUX;

  // Boot à DOMContentLoaded (premier rendu)
  document.addEventListener('DOMContentLoaded', () => {
    initUX(document);
  });

  // listeners globaux (une seule fois)
  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);
})();

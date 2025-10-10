// anim.js — effets reveal + parallax (compatible contenu dynamique)
(() => {
  let revealObserver = null;
  let parallaxEls = [];
  let ticking = false;

  // ---- REVEAL-ON-SCROLL ----
  function initReveal(root = document) {
    const els = root.querySelectorAll('.reveal:not(.reveal-bound)');
    if (!els.length) return;

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
    const newEls = Array.from(root.querySelectorAll('.parallax:not(.px-bound)'));
    newEls.forEach(el => el.classList.add('px-bound'));
    if (newEls.length) {
      parallaxEls.push(...newEls);
    }
  }

  function applyParallax() {
    const vh = window.innerHeight;
    parallaxEls.forEach(el => {
      const speed = parseFloat(el.dataset.speed || 0.1);
      const rect = el.getBoundingClientRect();
      const offset = (rect.top - vh / 2) * speed;
      el.style.transform = `translateY(${offset.toFixed(1)}px)`;
      el.style.willChange = 'transform';
    });
  }

  function onScrollOrResize() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        applyParallax();
        ticking = false;
      });
      ticking = true;
    }
  }

  // ---- PARALLAX À LA SOURIS (pour [data-parallax-mouse]) ----
  function initMouseParallax(root = document) {
    root.querySelectorAll('[data-parallax-mouse]:not(.pm-bound)').forEach(box => {
      box.classList.add('pm-bound');
      const strength = parseFloat(box.dataset.strength || 12);
      const img = box.querySelector('img');
      if (!img) return;

      const onMove = (e) => {
        const rect = box.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        img.style.transform = `translate(${(-dx * strength).toFixed(1)}px, ${(-dy * strength).toFixed(1)}px) scale(1.02)`;
        img.style.willChange = 'transform';
      };
      const onLeave = () => { img.style.transform = 'translate(0,0) scale(1)'; };

      box.addEventListener('mousemove', onMove, { passive: true });
      box.addEventListener('mouseleave', onLeave, { passive: true });
    });
  }

  // ---- INITIALISATION PUBLIQUE ----
  function initUX(root = document) {
    initReveal(root);
    collectParallaxEls(root);
    initMouseParallax(root);
    // Appliquer une première fois les offsets
    applyParallax();
  }

  // Expose pour que script.js puisse réinitialiser après injection
  window.initUX = initUX;

  // Boot à DOMContentLoaded (premier rendu)
  document.addEventListener('DOMContentLoaded', () => {
    initUX(document);
  });

  // listeners globaux (une seule fois)
  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);
})();
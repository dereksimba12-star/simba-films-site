// script.js — charge content/site.json et injecte le contenu (+ socials SVG inline, mailto, gallery top-level)
(async () => {
  const VERSION = Date.now(); // cache-busting simple
  const JSON_URL = `content/site.json?v=${VERSION}`;

  // Helpers
  const get = (obj, path) => path.split('.').reduce((a, k) => (a ? a[k] : undefined), obj);
  const qs  = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));

  // ----- 1) Charger le JSON -----
  let cfg;
  try {
    const res = await fetch(JSON_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cfg = await res.json();
    console.log('[Simba] site.json chargé ✅', cfg);
  } catch (err) {
    console.error('❌ Impossible de charger content/site.json', err);
    const main = qs('main');
    if (main) {
      const msg = document.createElement('div');
      msg.style.padding = '1rem';
      msg.style.background = '#fff6f6';
      msg.style.border = '1px solid #f5c2c2';
      msg.style.color = '#8a2b2b';
      msg.style.margin = '1rem 0';
      msg.textContent = '⚠️ Le contenu n’a pas pu être chargé (vérifie /content/site.json).';
      main.prepend(msg);
    }
    return;
  }

  // ----- 2) data-cms / data-cms-text / data-cms-html -----
  qsa('[data-cms]').forEach(el => {
    const key = el.getAttribute('data-cms');
    const val = get(cfg, key);
    if (val) {
      el.setAttribute('src', `${val}?v=${VERSION}`);
      el.addEventListener('error', () => console.warn('❌ Image introuvable:', val));
    }
  });

  qsa('[data-cms-text]').forEach(el => {
    const key = el.getAttribute('data-cms-text');
    const val = get(cfg, key);
    if (typeof val === 'string') el.textContent = val;
  });

  qsa('[data-cms-html]').forEach(el => {
    const key = el.getAttribute('data-cms-html');
    const val = get(cfg, key);
    if (typeof val === 'string') el.innerHTML = val;
  });

  // ----- 2.b) Email (injection unique + filet de sécurité) -----
  (function injectEmail() {
    const email = (get(cfg, 'contact.email') || 'dereksimba@simbafilms.org').trim();

    // Lien principal par id #contactEmail (recommandé dans index.html)
    const mainLink = qs('#contactEmail');
    if (mainLink) {
      mainLink.textContent = email;
      mainLink.setAttribute('href', `mailto:${email}`);
      mainLink.setAttribute('data-email', 'true');
    }

    // Cibles CMS texte
    qsa('[data-cms-text="contact.email"]').forEach(el => { el.textContent = email; });

    // Cibles CMS génériques
    qsa('[data-cms="contact.email"]').forEach(el => {
      if (el.tagName === 'A') {
        el.textContent = email;
        el.setAttribute('href', `mailto:${email}`);
      } else {
        el.textContent = email;
      }
    });

    // Filet de sécurité : corriger d’anciens liens mailto si présents
    qsa('a[href^="mailto:"]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const txt  = (a.textContent || '').trim();
      const txtHasAt = txt.includes('@') && txt !== email;
      const hrefDiff = !href.includes(`mailto:${email}`);
      if (txtHasAt) a.textContent = email;
      if (hrefDiff) a.setAttribute('href', `mailto:${email}`);
    });
  })();

  // ----- 3) Slideshow de fond -----
  (function(){
    const root = qs('[data-cms-list="backgrounds"]');
    if (!root) return;
    const arr = cfg.backgrounds;
    if (!Array.isArray(arr)) return;
    root.innerHTML = arr.map(i => `<img src="${i.src}?v=${VERSION}" alt="${i.alt||''}" loading="lazy">`).join('');
  })();

  // ----- 4) PROJETS -----
  (function(){
    const root = qs('[data-cms-list="projects"]');
    if (!root) return;
    const arr = cfg.projects;
    if (!Array.isArray(arr)) return;
    root.innerHTML = arr.map(p => `
      <article class="card project reveal stagger">
        <img class="parallax" data-speed="0.15" src="${p.image}?v=${VERSION}" alt="Visuel ${p.title}" loading="lazy" />
        <div class="card__body">
          ${p.watchUrl ? `<a href="${p.watchUrl}" class="btn btn--sm" target="_blank" rel="noopener">Watch</a>` : ''}
          <h3>${p.title}</h3>
          <p>${p.summary || ''}</p>
          <ul class="tags">${(p.tags||[]).map(t=>`<li>${t}</li>`).join('')}</ul>
          <div class="card__actions">
            ${p.cta1 ? `<a href="${p.cta1.url||'#'}" class="btn btn--sm">${p.cta1.label||'More'}</a>` : ''}
            ${p.cta2 ? `<a href="${p.cta2.url||'#'}" class="btn btn--sm btn--ghost">${p.cta2.label||'Details'}</a>` : ''}
          </div>
        </div>
      </article>
    `).join('');
  })();

 // ----- 5) Socials (SVG inline intégrés + mailto) -----
(() => {
  const root = document.querySelector('[data-cms-list="socials"]');
  if (!root) return;
  const arr = Array.isArray(cfg.socials) ? cfg.socials : [];

  // Pack d’icônes en currentColor (blanc sur ton fond sombre)
  const SVGS = {
    email: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2.25" y="4.5" width="19.5" height="15" rx="2.25" ry="2.25"/>
          <path d="M3 6l9 6 9-6"/>
        </g>
      </svg>`,
    instagram: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4"/>
          <circle cx="12" cy="12" r="3.8"/>
          <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/>
        </g>
      </svg>`,
    tiktok: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 3v7.2c0 2.3-1.9 4.2-4.2 4.2A3.2 3.2 0 0 0 6.6 18c0 1.8 1.4 3.2 3.2 3.2 3.6 0 5.9-2.2 5.9-5.7V8.5a6.6 6.6 0 0 0 4.7 2V7.1a4.9 4.9 0 0 1-4.7-4.1H14Z" fill="currentColor"/>
      </svg>`,
    facebook: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5 21v-7h2.3l.4-3h-2.7V9a1.2 1.2 0 0 1 1.4-1.3h1.3V5.1A14 14 0 0 0 14 5c-2.2 0-3.5 1.4-3.5 3.9V11H8v3h2.6v7h2.9Z" fill="currentColor"/>
      </svg>`
  };

  root.innerHTML = '';
  arr.forEach(item => {
    const platform = (item.platform || '').toLowerCase();
    const li = document.createElement('li');
    li.className = 'social';

    const a = document.createElement('a');
    a.dataset.platform = platform;
    a.setAttribute('aria-label', platform || 'social');

    // Email => mailto, le reste -> lien externe
    if (platform === 'email' || platform === 'mail' || (item.url && item.url.includes('@'))) {
      const email = (item.url || '').replace(/^mailto:/i, '').trim();
      a.href = `mailto:${email}`;
      a.innerHTML = SVGS.email;
    } else {
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener';
      // icône intégrée si connue, sinon fallback vers ton fichier/texte
      if (SVGS[platform]) {
        a.innerHTML = SVGS[platform];
      } else if (item.icon && item.icon.endsWith('.svg')) {
        // fallback soft: img si jamais tu gardes des fichiers custom
        const img = document.createElement('img');
        img.className = 'icon';
        img.src = `${item.icon}?v=${Date.now()}`;
        img.alt = `${platform} logo`;
        a.appendChild(img);
      } else {
        a.textContent = (platform || 'social').toUpperCase();
      }
    }

    li.appendChild(a);
    root.appendChild(li);
  });
})();

  // ----- 6) SHOWREELS (multi) -----
  (function(){
    const mount = qs('#reel-embed');
    const select = qs('#reel-select');
    let reels = Array.isArray(cfg.reels) ? cfg.reels.slice() : [];

    if ((!reels || !reels.length) && cfg.reel) {
      const r = cfg.reel;
      if (r.platform==='youtube' && r.youtubeId) reels=[r];
      else if (r.platform==='vimeo' && r.vimeoId) reels=[r];
    }

    const renderFrame = (container,r)=>{
      if(!container||!r)return;
      if(r.platform==='youtube'&&r.youtubeId){
        container.innerHTML=`<iframe title="${r.title||'Showreel'}"
        src="https://www.youtube.com/embed/${r.youtubeId}?${r.params||''}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="lazy" allowfullscreen></iframe>`;
      }else if(r.platform==='vimeo'&&r.vimeoId){
        container.innerHTML=`<iframe title="${r.title||'Showreel'}"
        src="https://player.vimeo.com/video/${r.vimeoId}?${r.params||''}"
        allow="autoplay; fullscreen; picture-in-picture"
        loading="lazy" allowfullscreen></iframe>`;
      }else if(r.platform==='mp4'&&r.src){
        container.innerHTML=`<video controls playsinline style="width:100%;max-height:480px;display:block">
          <source src="${r.src}" type="video/mp4"></video>`;
      }else container.innerHTML='<p class="note">Configuration showreel invalide.</p>';
    };

    if(select&&mount&&reels.length){
      select.innerHTML=reels.map((r,i)=>`<option value="${i}">${r.title||`Showreel ${i+1}`}</option>`).join('');
      const renderIdx=i=>renderFrame(mount,reels[i]);
      renderIdx(0);
      select.addEventListener('change',e=>renderIdx(parseInt(e.target.value,10)));
    }

    const reelsRoot=document.querySelector('[data-cms-list="reels"]');
    if(reelsRoot&&reels.length){
      reelsRoot.innerHTML=reels.map(r=>{
        let embed='';
        if(r.platform==='youtube'&&r.youtubeId)
          embed=`<iframe src="https://www.youtube.com/embed/${r.youtubeId}?${r.params||''}" allowfullscreen loading="lazy"></iframe>`;
        else if(r.platform==='vimeo'&&r.vimeoId)
          embed=`<iframe src="https://player.vimeo.com/video/${r.vimeoId}?${r.params||''}" allowfullscreen loading="lazy"></iframe>`;
        else if(r.platform==='mp4'&&r.src)
          embed=`<video controls playsinline><source src="${r.src}" type="video/mp4"></video>`;
        return `<article class="reel-card"><h3>${r.title}</h3><div class="reel-frame">${embed}</div></article>`;
      }).join('');
    }
  })();

  // ----- 7) HERO ROTATOR (profil animé + Ken Burns) -----
  (function(){
    const host = document.querySelector('[data-hero-rotator]');
    if (!host) return;

    // ⚠️ Supporte gallery AU NIVEAU RACINE (cfg.gallery) et hero.gallery
    const galleryTop = Array.isArray(cfg.gallery) ? cfg.gallery : [];
    const galleryHero = (cfg.hero && Array.isArray(cfg.hero.gallery)) ? cfg.hero.gallery : [];
    const list = (galleryTop.length ? galleryTop : galleryHero.length ? galleryHero : (cfg.hero?.image ? [cfg.hero.image] : []));

    if (!list.length) return;

    // Injecte les images
    host.innerHTML = list.map((src,i)=>`
      <img src="${src}?v=${VERSION}" alt="Hero ${i+1}" ${i===0?'class="show"':''} loading="${i===0?'eager':'lazy'}">
    `).join('');

    let idx = 0, timer = null;
    const interval = (cfg.hero && Number(cfg.hero.interval)) || 3500;
    const useKB = !!(cfg.hero && cfg.hero.kenBurns);

    function next(){
      const imgs = host.querySelectorAll('img');
      if (imgs.length < 2) return;
      imgs[idx].classList.remove('show','kenburns');
      idx = (idx + 1) % imgs.length;
      imgs[idx].classList.add('show');
      if (useKB) imgs[idx].classList.add('kenburns');
    }

    function start(){ if (!timer) timer = setInterval(next, interval); }
    function stop(){ clearInterval(timer); timer = null; }

    if (useKB) {
      const first = host.querySelector('img.show');
      if (first) first.classList.add('kenburns');
    }

    host.addEventListener('mouseenter', stop);
    host.addEventListener('mouseleave', start);
    const io = new IntersectionObserver(entries=>{
      if (entries.some(e=>e.isIntersecting)) start(); else stop();
    }, {threshold:0.3});
    io.observe(host);
  })();

  // ----- 8) Année du footer -----
  const y = qs('#year');
  if (y) y.textContent = new Date().getFullYear();

  // ----- 9) Menu burger -----
  (function(){
    const toggle = qs('[data-toggle]');
    const menu   = qs('[data-menu]');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('is-open');
    });
  })();

  // ----- 10) Réinitialiser les animations (anim.js) -----
  if (typeof window.initUX === 'function') window.initUX(document);
})();

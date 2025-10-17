// script.js — charge content/site.json et injecte le contenu (+ fix email)
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

  // ----- 2.b) Injection e-mail (texte + href) -----
  (function injectEmail() {
    // Email depuis le JSON (fallback sur ton mail pro)
    const email = (get(cfg, 'contact.email') || 'derek@simbafilms.org').trim();

    // 1) Lien principal par id #contactEmail (recommandé dans index.html)
    const mainLink = qs('#contactEmail');
    if (mainLink) {
      mainLink.textContent = email;
      mainLink.setAttribute('href', `mailto:${email}`);
      mainLink.setAttribute('data-email', 'true');
    }

    // 2) Cibles "CMS"
    // ex. <span data-cms-text="contact.email"></span>
    qsa('[data-cms-text="contact.email"]').forEach(el => {
      el.textContent = email;
    });
    // ex. <a data-cms="contact.email"></a> pour le href
    qsa('[data-cms="contact.email"]').forEach(el => {
      // Si c’est un lien, on le traite comme mailto
      const isAnchor = el.tagName === 'A';
      if (isAnchor) {
        el.textContent = email;
        el.setAttribute('href', `mailto:${email}`);
      } else {
        // Sinon on met juste le texte
        el.textContent = email;
      }
    });

    // 3) Sélecteurs explicites si tu veux marquer des cibles : .js-email, [data-email]
    qsa('.js-email, [data-email]').forEach(el => {
      if (el.tagName === 'A') {
        el.textContent = email;
        el.setAttribute('href', `mailto:${email}`);
      } else {
        el.textContent = email;
      }
    });

    // 4) Filet de sécurité : corriger d’anciens liens mailto si présents
    // (ex. ancien gmail resté en dur dans le HTML)
    qsa('a[href^="mailto:"]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const txt  = (a.textContent || '').trim();

      // Si le texte contient un '@' différent de celui qu’on veut, on remplace.
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
          ${p.watchUrl ? `<a href="${p.watchUrl}" class="btn btn--sm" target="_blank">Watch</a>` : ''}
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

  // ----- 5) Socials -----
  (function(){
    const root = document.querySelector('[data-cms-list="socials"]');
    if (!root) return;
    const arr = cfg.socials;
    if (!Array.isArray(arr)) return;
    root.innerHTML = arr.map(s => `
      <li class="social">
        <a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.platform}" data-platform="${(s.platform||'').toLowerCase()}">
          <img class="icon" src="${s.icon}?v=${VERSION}" alt="${s.platform} logo" loading="lazy"
               onerror="this.onerror=null; this.replaceWith(document.createTextNode('${(s.platform||'social').toUpperCase()}')); ">
        </a>
      </li>
    `).join('');
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

    const gallery = (cfg.hero && Array.isArray(cfg.hero.gallery)) ? cfg.hero.gallery : [];
    const list = gallery.length ? gallery : (cfg.hero?.image ? [cfg.hero.image] : []);
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
// ----- Mise à jour du contact email depuis le JSON -----
const email = (cfg?.contact?.email || 'derek@simbafilms.org').trim();
const emailLink = document.querySelector('#contactEmail');
if (emailLink) {
  emailLink.textContent = email;
  emailLink.setAttribute('href', `mailto:${email}`);
}

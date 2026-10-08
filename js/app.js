(function () {
  'use strict';

  /* ---------- helpers ---------- */

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  function on(el, type, fn, opts) {
    if (el && el.addEventListener) el.addEventListener(type, fn, opts);
  }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function prefersReducedMotion() {
    var m = window.matchMedia;
    return m ? m('(prefers-reduced-motion: reduce)').matches : false;
  }

  /* ---------- header: scrolled + mobile menu ---------- */

  var header = $('#siteHeader');
  var menuToggle = $('#menuToggle');
  var navLinks = $('#navLinks');

  function updateHeader() {
    if (!header) return;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    header.classList.toggle('scrolled', y > 30);
  }

  on(window, 'scroll', updateHeader, { passive: true });
  updateHeader();

  if (menuToggle && navLinks) {
    on(menuToggle, 'click', function () {
      var open = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      header.classList.toggle('menu-open', !open);
    });
  }

  // close mobile menu when a section link is chosen
  if (navLinks) {
    $$('.nav-link', navLinks).forEach(function (a) {
      on(a, 'click', function () {
        if (window.innerWidth <= 760) {
          menuToggle.setAttribute('aria-expanded', 'false');
          header.classList.remove('menu-open');
        }
      });
    });
  }

  /* ---------- smooth scroll with sticky-header offset ---------- */

  $$('.nav-link').forEach(function (a) {
    on(a, 'click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      var offset = header ? header.offsetHeight : 0;
      var top = target.getBoundingClientRect().top + (window.scrollY || 0) - offset - 8;
      window.scrollTo({ top: top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      if (window.history && window.history.pushState) {
        window.history.pushState(null, '', id);
      }
    });
  });

  /* ---------- scroll spy ---------- */

  var sections = $$('.section, .hero').filter(function (s) { return s.id; });
  var linkFor = {};
  $$('.nav-link').forEach(function (a) {
    var id = (a.getAttribute('href') || '').slice(1);
    if (id) linkFor[id] = a;
  });

  function spy() {
    var scroll = window.scrollY || 0;
    var current = null;
    var probe = scroll + (window.innerHeight || document.documentElement.clientHeight) * 0.35;
    sections.forEach(function (s) {
      if (s.offsetTop <= probe) current = s.id;
    });
    // snap to bottom
    if (document.documentElement.scrollHeight - scroll - window.innerHeight < 40 && sections.length) {
      current = sections[sections.length - 1].id;
    }
    Object.keys(linkFor).forEach(function (id) {
      var el = linkFor[id];
      if (id === current) {
        el.classList.add('active');
        el.setAttribute('aria-current', 'true');
      } else {
        el.classList.remove('active');
        el.removeAttribute('aria-current');
      }
    });
  }

  on(window, 'scroll', spy, { passive: true });
  spy();

  /* ---------- scroll reveal ---------- */

  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- star field in hero ---------- */

  var starsHost = $('[data-stars]');
  if (starsHost) {
    var frag = document.createDocumentFragment();
    var N = 54;
    for (var i = 0; i < N; i++) {
      var s = document.createElement('span');
      var size = (Math.random() * 2 + 1).toFixed(1);
      s.style.left = (Math.random() * 100).toFixed(2) + '%';
      s.style.top = (Math.random() * 88).toFixed(2) + '%';
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.setProperty('--so', (Math.random() * 0.5 + 0.15).toFixed(2));
      s.style.setProperty('--tw', (Math.random() * 5 + 4).toFixed(1) + 's');
      s.style.setProperty('--twd', (Math.random() * 6).toFixed(1) + 's');
      frag.appendChild(s);
    }
    starsHost.appendChild(frag);
  }

  /* ---------- film grain overlay ---------- */

  if (!document.querySelector('.grain')) {
    var grain = document.createElement('div');
    grain.className = 'grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);
  }

  /* ---------- image fallbacks: silent placeholder look ---------- */

  function markBroken(img) {
    if (!img) return;
    img.classList.add('fallback');
  }

  $('.portrait-frame img, .gallery-item img').forEach(function (img) {
    var handle = function (good) {
      if (good) { img.classList.add('ok'); img.classList.remove('fallback'); }
      else { img.classList.remove('ok'); markBroken(img); }
    };
    if (img.complete && img.naturalWidth > 0) {
      handle(true);
    } else {
      on(img, 'load', function () { handle(true); }, { once: true });
      on(img, 'error', function () { handle(false); }, { once: true });
      handle(false);
    }
  });

  /* ---------- lightbox ---------- */

  var lightbox = $('#lightbox');
  var lbImg = $('#lbImg');
  var lbCaption = $('#lbCaption');
  var lbItems = $$('.gallery-item');
  var lbIndex = 0;
  var lbPrev = null;

  function lbSet(i) {
    if (!lightbox || !lbItems.length) return;
    lbIndex = ((i % lbItems.length) + lbItems.length) % lbItems.length;
    var item = lbItems[lbIndex];
    var src = item.getAttribute('data-full') || item.querySelector('img').src;
    lbImg.classList.remove('ok');
    lbImg.style.opacity = '0';
    lbImg.src = src;
    lbImg.onload = function () {
      lbImg.classList.add('ok');
      lbImg.style.opacity = '';
    };
    lbImg.onerror = function () { lbImg.classList.remove('ok'); };
    if (lbCaption) {
      lbCaption.textContent = (lbIndex + 1) + ' / ' + lbItems.length;
    }
  }

  function lbOpen(i) {
    if (!lightbox) return;
    lbSet(i);
    lbPrev = document.activeElement;
    lightbox.hidden = false;
    requestAnimationFrame(function () { lightbox.classList.add('open'); });
    document.body.style.overflow = 'hidden';
    on(lbImg.parentElement, 'click', function (e) { if (e.target === lbImg.parentElement) lbClose(); });
  }

  function lbClose() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    setTimeout(function () { lightbox.hidden = true; }, 280);
    document.body.style.overflow = '';
    if (lbPrev && lbPrev.focus) lbPrev.focus();
  }

  lbItems.forEach(function (item, i) {
    on(item, 'click', function () { lbOpen(i); });
    on(item, 'keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbOpen(i); }
    });
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', 'Open image ' + (i + 1) + ' in fullscreen');
  });

  var lbCloseBtn = $('#lbClose');
  var lbPrevBtn = $('#lbPrev');
  var lbNextBtn = $('#lbNext');

  on(lbCloseBtn, 'click', lbClose);
  on(lbPrevBtn, 'click', function () { lbSet(lbIndex - 1); });
  on(lbNextBtn, 'click', function () { lbSet(lbIndex + 1); });
  on(lightbox, 'click', function (e) {
    if (e.target === lightbox) lbClose();
  });

  on(document, 'keydown', function (e) {
    if (!lightbox || lightbox.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); lbClose(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); lbSet(lbIndex - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); lbSet(lbIndex + 1); }
  });

  /* ---------- custom audio player ---------- */

  var audio = $('#themeAudio');
  var player = $('.player');
  var toggleBtn = $('#playerToggle');
  var toggleLabel = $('.player-toggle-label');
  var track = $('#playerTrack');
  var fill = $('#playerFill');
  var thumb = $('#playerThumb');
  var timeEl = $('#playerTime');
  var durEl = $('#playerDur');
  var volRange = $('#volRange');
  var volBtn = $('#volBtn');

  var VOL_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1c1.9.6 3.4 2.2 3.4 4.2s-1.5 3.6-3.4 4.2v2.1c3.2-.7 5.6-3.5 5.6-6.9s-2.4-6.2-5.6-6.9z"/></svg>';
  var VOL_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm18.6 6.2-1.4 1.4L17 13.4 15.6 14.8l1.4-1.4-1.4-1.4 1.4-1.4 1.4 1.4 1.4-1.4zM14 3.2v2.1c1.9.6 3.4 2.2 3.4 4.2s-1.5 3.6-3.4 4.2v2.1c3.2-.7 5.6-3.5 5.6-6.9s-2.4-6.2-5.6-6.9z"/></svg>';

  function fmtTime(v) {
    if (!isFinite(v) || v < 0) v = 0;
    var m = Math.floor(v / 60);
    var s = Math.floor(v % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function setProgressUI() {
    if (!audio || !fill) return;
    var pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    fill.style.width = pct + '%';
    if (thumb) thumb.style.left = pct + '%';
    if (timeEl) timeEl.textContent = fmtTime(audio.currentTime);
  }

  function setDurUI() {
    if (!audio || !durEl) return;
    durEl.textContent = fmtTime(audio.duration || 0);
  }

  function setMuteUI() {
    if (!volBtn) return;
    var muted = audio.muted || audio.volume === 0;
    volBtn.classList.toggle('muted', muted);
    volBtn.innerHTML = muted ? VOL_OFF : VOL_ON;
  }

  function setPlayingUI() {
    if (!player || !toggleLabel) return;
    var playing = audio && !audio.paused && !audio.ended;
    player.classList.toggle('playing', playing);
    toggleLabel.textContent = playing ? 'pause' : 'play';
    if (toggleBtn) toggleBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  function togglePlay() {
    if (!audio) return;
    if (audio.paused || audio.ended) {
      var p = audio.play();
      if (p && p.catch) p.catch(function () {
        // blocked: leave as a calm play button; visitor can press it
      });
    } else {
      audio.pause();
    }
  }

  if (audio) {
    on(toggleBtn, 'click', togglePlay);
    on(audio, 'play', setPlayingUI);
    on(audio, 'pause', setPlayingUI);
    on(audio, 'ended', setPlayingUI);
    on(audio, 'timeupdate', setProgressUI);
    on(audio, 'durationchange', setDurUI);
    on(audio, 'loadedmetadata', setDurUI);
    on(audio, 'loadeddata', setDurUI);
    on(audio, 'volumechange', setMuteUI);
    on(audio, 'error', function () {
      // silent: player just stays as a play button; no technical text shown
    });
    if (!audio.hasAttribute('data-init')) {
      audio.setAttribute('data-init', '1');
      if (volRange) {
        audio.volume = clamp01(parseInt(volRange.value, 10) / 100) || 0.7;
      }
    }

    if (volBtn) {
      volBtn.innerHTML = VOL_ON;
      on(volBtn, 'click', function () {
        audio.muted = !audio.muted;
        if (!audio.muted && audio.volume === 0) {
          audio.volume = 0.7;
          if (volRange) volRange.value = '70';
        }
        setMuteUI();
      });
    }

    if (volRange) {
      on(volRange, 'input', function () {
        audio.volume = clamp01(volRange.value / 100);
        audio.muted = false;
        setMuteUI();
      });
    }

    if (track) {
      function seekFromEvent(e) {
        var rect = track.getBoundingClientRect();
        var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        var f = clamp01(x / rect.width);
        if (audio.duration) {
          audio.currentTime = f * audio.duration;
          setProgressUI();
        }
      }
      var seeking = false;
      on(track, 'mousedown', function (e) { seeking = true; seekFromEvent(e); e.preventDefault(); });
      on(window, 'mousemove', function (e) { if (seeking) seekFromEvent(e); }, { passive: true });
      on(window, 'mouseup', function () { seeking = false; });
      on(track, 'touchstart', function (e) { seekFromEvent(e); }, { passive: true });
      on(track, 'touchmove', function (e) { seekFromEvent(e); }, { passive: true });

      on(document, 'keydown', function (e) {
        // keyboard shortcuts when lightbox is closed and not typing
        if (lightbox && !lightbox.hidden) return;
        var tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.key === 'ArrowRight' && audio) {
          audio.currentTime = Math.min((audio.duration || 0), audio.currentTime + 5);
          setProgressUI();
        } else if (e.key === 'ArrowLeft' && audio) {
          audio.currentTime = Math.max(0, audio.currentTime - 5);
          setProgressUI();
        }
      });
    }

    setPlayingUI();
    setMuteUI();
    setProgressUI();
    setDurUI();

  }

  /* ---------- hero glow parallax (very subtle) ---------- */

  var glow = $('.hero-glow');
  if (glow && !prefersReducedMotion()) {
    var ticking = false;
    on(window, 'scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY || 0;
        var off = Math.min(1, y / (window.innerHeight || 1));
        glow.style.transform = 'translate(-50%, calc(-50% + ' + (off * 80) + 'px))';
        glow.style.opacity = String(1 - off * 0.85);
        ticking = false;
      });
    }, { passive: true });
  }
})();

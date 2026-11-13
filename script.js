// Filter project (All / Web / Mobile)
const buttons = document.querySelectorAll('.filter-btn');
const projects = document.querySelectorAll('.project');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    projects.forEach(p => {
      p.classList.toggle('is-hidden', filter !== 'all' && p.dataset.type !== filter);
    });
  });
});

// Tutup menu samping (offcanvas) pas link diklik
document.querySelectorAll('#nav .nav-link, #nav .btn').forEach(link => {
  link.addEventListener('click', () => {
    const nav = document.getElementById('nav');
    if (nav.classList.contains('show')) bootstrap.Offcanvas.getOrCreateInstance(nav).hide();
  });
});

// Tahun otomatis di footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Tandain kalo JS jalan. Animasi "muncul" cuma dipake kalo JS hidup,
// jadi kalo JS error kontennya tetep keliatan.
document.documentElement.classList.add('js');


/* =====================================================
   BACKGROUND JARING (particle network)
   Titik-titik gerak pelan, nyambung pake garis kalo deket.
   Kursor juga jadi "titik" -> titik sekitar nyambung ke kursor
   dan ketarik halus.
   ===================================================== */
(() => {
  const canvas = document.getElementById('net');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- SETTING (ubah di sini) ----
  const DENSITY    = 4200;  // makin KECIL = makin banyak titik
  const MAX_POINTS = 320;   // batas jumlah titik
  const LINK_DIST  = 150;   // jarak maksimal antar titik buat disambung
  const MOUSE_DIST = 230;   // radius kursor nyambung ke titik
  const MOUSE_PULL = 0.0009;// kekuatan tarikan ke kursor
  const SPEED      = 0.35;  // kecepatan dasar titik
  // --------------------------------

  // Warna titik: biru, ungu, pink
  const COLORS = ['79,140,255', '139,92,246', '236,72,153'];
  // di light mode garisnya ditebelin dikit biar tetep keliatan
  const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';

  let w, h, dpr, points = [];
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false, strength: 0 };

  function makePoint() {
    const angle = Math.random() * Math.PI * 2;
    const sp = SPEED * (0.4 + Math.random() * 0.8);
    const bvx = Math.cos(angle) * sp, bvy = Math.sin(angle) * sp;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: bvx, vy: bvy,
      bvx, bvy,                           // kecepatan "asli" buat balik setelah ketarik
      r: Math.random() * 1.5 + 0.8,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.round(Math.min(MAX_POINTS, Math.max(70, (w * h) / DENSITY)));
    // jangan reset semua titik pas resize, cukup tambah/kurangin
    while (points.length < target) points.push(makePoint());
    points.length = target;
    for (const p of points) { p.x = Math.min(p.x, w); p.y = Math.min(p.y, h); }
  }

  let last = performance.now();
  function step(now) {
    // dt biar gerakannya sama di layar 60Hz / 120Hz
    const dt = Math.min((now - last) / 16.667, 3);
    last = now;

    // kursor di-ease biar garisnya gak loncat-loncat
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, 0.25 * dt);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, 0.25 * dt);
    mouse.strength += ((mouse.active ? 1 : 0) - mouse.strength) * Math.min(1, 0.08 * dt);

    ctx.clearRect(0, 0, w, h);

    for (const p of points) {
      if (mouse.strength > 0.01) {
        const dx = mouse.x - p.x, dy = mouse.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < MOUSE_DIST && d > 30) {
          const f = (1 - d / MOUSE_DIST) * MOUSE_PULL * mouse.strength * dt;
          p.vx += dx * f;
          p.vy += dy * f;
        }
      }
      // pelan-pelan balik ke kecepatan asli (redaman)
      p.vx += (p.bvx - p.vx) * 0.02 * dt;
      p.vy += (p.bvy - p.vy) * 0.02 * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // nembus pinggir -> muncul di sisi seberang (lebih mulus dari mantul)
      if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
    }

    // garis antar titik
    const boost = isLight() ? 1.6 : 1;
    ctx.lineWidth = 0.8;
    const LD2 = LINK_DIST * LINK_DIST;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LD2) {
          const alpha = Math.min(1, (1 - d2 / LD2) * 0.35 * boost);
          ctx.strokeStyle = `rgba(${a.c},${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // garis dari kursor ke titik sekitar (jaring kursor)
    if (mouse.strength > 0.01) {
      ctx.lineWidth = 1.1;
      for (const p of points) {
        const d = Math.hypot(mouse.x - p.x, mouse.y - p.y);
        if (d < MOUSE_DIST) {
          const alpha = Math.min(1, (1 - d / MOUSE_DIST) * 0.85 * mouse.strength * boost);
          ctx.strokeStyle = `rgba(236,72,153,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
    }

    // titik
    for (const p of points) {
      ctx.fillStyle = `rgba(${p.c},0.95)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduceMotion) requestAnimationFrame(step);
  }

  function setMouse(x, y) {
    if (!mouse.active && mouse.strength < 0.05) { mouse.x = x; mouse.y = y; }
    mouse.tx = x; mouse.ty = y; mouse.active = true;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => setMouse(e.clientX, e.clientY));
  document.addEventListener('mouseleave', () => { mouse.active = false; });
  window.addEventListener('touchmove', e => setMouse(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  window.addEventListener('touchend', () => { mouse.active = false; });

  resize();
  requestAnimationFrame(step);
})();


/* =====================================================
   KURSOR CUSTOM (titik + lingkaran yang ngikut pelan)
   Cuma aktif di device yang pake mouse.
   ===================================================== */
(() => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
    document.body.classList.add('has-cursor');
  });
  document.addEventListener('mouseleave', () => document.body.classList.remove('has-cursor'));

  // Lingkaran ngegedein pas hover link/tombol
  document.addEventListener('mouseover', e => {
    document.body.classList.toggle('cursor-hover', !!e.target.closest('a, button, .project-card'));
  });

  (function follow() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(follow);
  })();
})();


/* =====================================================
   EFEK NGETIK di bawah nama
   Kata-katanya diatur di atribut data-words di index.html
   ===================================================== */
(() => {
  const el = document.querySelector('.typed');
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const words = el.dataset.words.split('|');
  let w = 0, i = words[0].length, deleting = true;

  function tick() {
    const word = words[w];
    el.textContent = word.slice(0, i);
    let delay = deleting ? 45 : 90;

    if (!deleting && i === word.length) { delay = 1800; deleting = true; }  // diem bentar
    else if (deleting && i === 0) { deleting = false; w = (w + 1) % words.length; delay = 300; }
    else i += deleting ? -1 : 1;

    setTimeout(tick, delay);
  }
  setTimeout(tick, 1800);
})();


/* =====================================================
   GANTI BAHASA (EN / ID)
   Teks English diambil langsung dari HTML.
   Teks Indonesia ada di objek ID di bawah, key-nya = data-i18n.
   ===================================================== */
(() => {
  const ID = {
    nav_about: 'Tentang',
    nav_exp: 'Pengalaman',
    nav_projects: 'Proyek',
    nav_skills: 'Keahlian',
    nav_contact: 'Hubungi saya',
    status: 'Terbuka untuk freelance',
    hello: 'Halo, selamat datang!',
    role_prefix: 'Saya seorang',
    btn_projects: 'Lihat proyek saya',
    btn_cv: 'Unduh CV',

    about_title: 'Tentang saya',
    about_text: 'Saya siswa Software Engineering yang fokus di pengembangan web dan mobile. Saya sudah membuat company profile, sistem internal, dan aplikasi mobile untuk klien, serta mengajar dasar pemrograman di beberapa sekolah. Saya bekerja dengan kedisiplinan tinggi, kreativitas, dan komitmen untuk membangun produk digital yang berdampak.',
    fact_remote: 'Bisa kerja remote',

    exp_sub: 'Tempat saya berkarya sejauh ini.',
    present: 'Juni 2024 – Sekarang',
    d_biantara: 'Oktober 2026',
    d_quamus: 'Juni 2026',
    d_codveda: 'April 2026',
    exp1: 'Membuat website dan aplikasi mobile untuk klien freelance, mulai dari UI, integrasi API, logika backend, sampai pengelolaan database.',
    exp2: 'Mengembangkan website klien dari awal sampai selesai, menggunakan stack yang dibutuhkan tiap proyek.',
    exp3: 'Membuat aplikasi absensi dan monitoring sekolah dengan React Native, mengintegrasikan API absensi dan data siswa, serta mendemokan fitur ke klien.',
    exp4: 'Bekerja bersama tim developer di frontend, backend, integrasi API, dan pengolahan data JSON untuk fitur web dan mobile.',

    proj_sub: 'Beberapa karya web dan mobile saya.',
    filter_all: 'Semua',

    w_kinfolk: 'Toko online majalah dan buku Kinfolk, dengan pencarian produk, wishlist, keranjang, dan akun pengguna.',
    w_cahaya: 'Company profile distributor produk elektrikal dan rumah tangga, lengkap dengan katalog dan brand mitra.',
    w_notezy: 'Aplikasi catatan berbasis web dengan login dan register, jadi tiap pengguna punya ruang catatan pribadi.',
    w_beakon: 'Website Beakon Leadership, konsultan pengembangan kepemimpinan, dengan halaman solusi dan insight.',
    w_paydholla: 'Sistem penggajian berbasis presensi untuk karyawan dan bendahara, semua dikelola dalam satu dashboard.',
    w_bbi: 'Website kursus Bahasa Indonesia untuk warga asing, dengan level belajar terstruktur dan booking via WhatsApp.',
    w_starlight: 'Company profile perusahaan trading global yang memasok tekstil dan bahan kimia di seluruh Indonesia.',
    w_pokjawas: 'Sistem administrasi dan pelaporan untuk Pokjawas Kemenag Kabupaten Tangerang, dengan dashboard admin.',
    w_portfolio: 'Website portfolio Next Level Studio, video editor freelance dari Malaysia, berisi karya dan review klien.',
    w_dixon: 'Company profile perusahaan jasa maritim: jual kapal bekas, pembuatan kapal baru, dan desain kapal.',
    w_typss: 'Website sekolah public speaking di Indonesia, dengan program, event, berita, dan konsultasi gratis.',
    w_dci: 'Website layanan charter helikopter pribadi, menampilkan armada, destinasi wisata, dan pemesanan online.',

    mentor_text: 'Saya mengajar HTML, CSS, dan JavaScript ke siswa SMP/SMK dan membimbing mereka membuat website dan portfolio pertama lewat proyek langsung.',
    sk_lang: 'Bahasa',
    sk_tools: 'Tools',
    sk_soft: 'Problem solving, komunikasi, kepemimpinan, kerja tim, manajemen waktu, berpikir kritis',

    contact_title: 'Punya ide proyek? Yuk kita wujudkan.',
    footer: 'Dibuat dengan HTML, CSS &amp; Bootstrap.',
  };

  const els = document.querySelectorAll('[data-i18n]');
  els.forEach(el => { el.dataset.en = el.innerHTML; });   // simpen teks English asli
  const btns = document.querySelectorAll('.lang-switch button');

  function setLang(lang) {
    els.forEach(el => {
      const key = el.dataset.i18n;
      el.innerHTML = lang === 'id' && ID[key] ? ID[key] : el.dataset.en;
    });
    btns.forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    document.documentElement.lang = lang;
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }

  btns.forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  let saved = 'en';
  try { saved = localStorage.getItem('lang') || 'en'; } catch (e) {}
  if (saved !== 'en') setLang(saved);
})();



/* =====================================================
   DARK / LIGHT MODE (ikon bulan & matahari)
   Tema awal dipasang di <head> biar gak kedip.
   ===================================================== */
(() => {
  const btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
})();


/* =====================================================
   SKILL BAR
   - Warna ngikutin persen: persen sama = warna sama
   - Animasi diulang tiap kali bagian Skills kelihatan lagi
   ===================================================== */
(() => {
  const skills = document.querySelectorAll('.skill');
  if (!skills.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Warna per persen. Mau ganti warna? ubah di sini.
  const TIERS = [
    { min: 100, fill: 'linear-gradient(90deg, #10B981, #22D3EE)', glow: 'rgba(34, 211, 238, .55)' }, // hijau → cyan
    { min: 98,  fill: 'linear-gradient(90deg, #3B82F6, #22D3EE)', glow: 'rgba(59, 130, 246, .55)' }, // biru → cyan
    { min: 97,  fill: 'linear-gradient(90deg, #6366F1, #3B82F6)', glow: 'rgba(99, 102, 241, .55)' }, // indigo → biru
    { min: 96,  fill: 'linear-gradient(90deg, #8B5CF6, #D946EF)', glow: 'rgba(168, 85, 247, .55)' }, // ungu → magenta
    { min: 95,  fill: 'linear-gradient(90deg, #EC4899, #F472B6)', glow: 'rgba(236, 72, 153, .55)' }, // pink
    { min: 80,  fill: 'linear-gradient(90deg, #F43F5E, #FB7185)', glow: 'rgba(244, 63, 94, .5)' },   // rose
    { min: 65,  fill: 'linear-gradient(90deg, #F59E0B, #FBBF24)', glow: 'rgba(245, 158, 11, .5)' },  // oranye → kuning
    { min: 0,   fill: 'linear-gradient(90deg, #EF4444, #F97316)', glow: 'rgba(239, 68, 68, .5)' },   // merah → oranye
  ];

  skills.forEach(s => {
    const val = +s.querySelector('.skill-pct').dataset.val;
    const tier = TIERS.find(t => val >= t.min);
    s.style.setProperty('--fill', tier.fill);
    s.style.setProperty('--glow', tier.glow);
  });

  const timers = new WeakMap();
  function countUp(el) {
    const target = +el.dataset.val;
    if (reduce) { el.textContent = target + '%'; return; }
    const start = performance.now(), dur = 1600;
    const id = Symbol();
    timers.set(el, id);
    (function frame(now) {
      if (timers.get(el) !== id) return;        // animasi lama dibatalin
      const t = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + '%';
      if (t < 1) requestAnimationFrame(frame);
    })(start);
  }

  if (!('IntersectionObserver' in window) || reduce) {
    skills.forEach(s => s.classList.add('in-view'));
    return;
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const pct = e.target.querySelector('.skill-pct');
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        countUp(pct);
      } else {
        // reset pas keluar layar, biar nanti jalan lagi dari 0
        e.target.classList.remove('in-view');
        timers.delete(pct);
        pct.textContent = '0%';
      }
    });
  }, { threshold: 0.3 });

  skills.forEach(s => {
    s.querySelector('.skill-pct').textContent = '0%';
    io.observe(s);
  });
})();


/* =====================================================
   EXPERIENCE: kartu muncul satu-satu + garis ngisi sesuai scroll
   Animasi diulang tiap kali bagian ini kelihatan lagi.
   ===================================================== */
(() => {
  const line = document.querySelector('.timeline');
  if (!line) return;
  const items = line.querySelectorAll('li');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(li => li.classList.add('in-view'));
    line.style.setProperty('--progress', 1);
    return;
  }

  // muncul gantian (delay dikit tiap kartu)
  items.forEach((li, i) => { li.style.transitionDelay = `${i * 0.12}s, ${i * 0.12}s, 0s, 0s`; });
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => e.target.classList.toggle('in-view', e.isIntersecting));
  }, { threshold: 0.25 });
  items.forEach(li => io.observe(li));

  // garis gradasi ngikutin posisi scroll
  let ticking = false;
  function update() {
    const r = line.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = (vh * 0.7 - r.top) / r.height;
    line.style.setProperty('--progress', Math.max(0, Math.min(1, p)).toFixed(3));
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

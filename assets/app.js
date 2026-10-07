/* Interaksi website WRS: navbar, animasi scroll, angka berjalan, lightbox foto,
   pencarian mal (halaman Lokasi), dan form WhatsApp (halaman Contact). */
(function () {
  var doc = document;
  var T = {};  /* teks antarmuka sesuai bahasa halaman (diisi saat build) */
  try { T = JSON.parse(doc.body.getAttribute("data-t") || "{}"); } catch (e) { T = {}; }
  function isi(templat, nilai) {
    return String(templat || "").replace(/\{(\w+)\}/g, function (_, k) { return nilai[k]; });
  }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- navbar: mengecil saat scroll + hamburger di HP ---- */
  var nav = doc.querySelector(".nav");
  var burger = doc.querySelector(".burger");
  var progres = doc.querySelector(".progres");
  var atas = doc.querySelector(".ke-atas");
  if (atas) atas.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
  function saatScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 40);
    if (atas) atas.classList.toggle("tampak", window.scrollY > 700);
    if (progres) {
      var tinggi = doc.documentElement.scrollHeight - window.innerHeight;
      progres.style.transform = "scaleX(" + (tinggi > 0 ? Math.min(window.scrollY / tinggi, 1) : 0) + ")";
    }
  }
  saatScroll();
  window.addEventListener("scroll", saatScroll, { passive: true });
  if (burger) {
    var tutupMenu = function () {
      nav.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    };
    burger.addEventListener("click", function () {
      var buka = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", buka ? "true" : "false");
    });
    doc.getElementById("menu-utama").addEventListener("click", function (e) {
      if (e.target.tagName === "A") tutupMenu();
    });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") tutupMenu(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 820) tutupMenu(); });
  }

  /* ---- muncul perlahan saat di-scroll + angka berjalan naik ---- */
  /* Daftar ini harus sama dengan daftar di bagian ANIMASI pada style.css */
  var REVEAL = ".stat,.split>*,.kartu-pendiri,.vm-kartu,.vm-sub,.misi li,.latar-teks,.sec>.inner>h2,.art,.kel,.cari," +
    ".marquee,.vid,.upd,.kartu-kontak,.faq-item,.spes-kartu,.alasan-kartu,.langkah,.upd-mini,.cta .inner>*,.kontak .cols>div,.kontak .inner>h2,.form";

  function hitung(kotak) {
    var b = kotak.querySelector("b[data-n]");
    if (!b || reduce) return;
    var n = parseInt(b.getAttribute("data-n"), 10) || 0;
    var akhiran = b.getAttribute("data-akhiran") || "";
    var mulai = null;
    b.textContent = "0" + akhiran;
    function langkah(t) {
      if (mulai === null) mulai = t;
      var p = Math.min((t - mulai) / 1400, 1);
      b.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))) + akhiran;
      if (p < 1) window.requestAnimationFrame(langkah);
    }
    window.requestAnimationFrame(langkah);
  }

  var elemen = doc.querySelectorAll(REVEAL);
  if (reduce || !("IntersectionObserver" in window)) {
    elemen.forEach(function (el) { el.classList.add("in"); });
  } else {
    var pengamat = new IntersectionObserver(function (daftar) {
      daftar.forEach(function (d) {
        if (!d.isIntersecting) return;
        d.target.classList.add("in");
        pengamat.unobserve(d.target);
        if (d.target.classList.contains("stat")) hitung(d.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    elemen.forEach(function (el) { pengamat.observe(el); });
  }

  /* ---- lightbox: klik foto untuk memperbesar ---- */
  var PILIH_FOTO = "img.mo,img.gal-img,img.foto-about,img.potret,img.upd-img";
  var semuaFoto = [].slice.call(doc.querySelectorAll(PILIH_FOTO)).filter(function (f) {
    return !f.closest("[aria-hidden='true']"); /* lewati salinan galeri yang bergerak */
  });
  var foto = semuaFoto;  /* daftar yang sedang dijelajahi: satu event, atau foto umum halaman */
  function pilihDaftar(img) {
    var g = img.getAttribute("data-grup");
    foto = semuaFoto.filter(function (f) { return g ? f.getAttribute("data-grup") === g : !f.getAttribute("data-grup"); });
  }
  var lb, lbFoto, lbKet, kini = 0;

  function tampil(i) {
    kini = (i + foto.length) % foto.length;
    lbFoto.src = foto[kini].getAttribute("data-besar") || foto[kini].src;
    lbFoto.alt = foto[kini].alt;
    lbKet.textContent = foto[kini].alt;
  }
  function tutup() {
    if (!lb) return;
    lb.classList.remove("open");
    doc.documentElement.style.overflow = "";
  }
  function siapkan() {
    if (lb) return;
    lb = doc.createElement("div");
    lb.className = "lb";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", T.lb_label || "Photo viewer");
    lb.innerHTML =
      '<button class="lb-x" type="button" aria-label="' + (T.lb_tutup || "Close") + '">&times;</button>' +
      '<button class="lb-p" type="button" aria-label="' + (T.lb_sebelum || "Previous") + '">&#8249;</button>' +
      '<img class="lb-img" alt=""><p class="lb-cap"></p>' +
      '<button class="lb-n" type="button" aria-label="' + (T.lb_sesudah || "Next") + '">&#8250;</button>';
    doc.body.appendChild(lb);
    lbFoto = lb.querySelector(".lb-img");
    lbKet = lb.querySelector(".lb-cap");
    lb.querySelector(".lb-x").addEventListener("click", tutup);
    lb.querySelector(".lb-p").addEventListener("click", function () { tampil(kini - 1); });
    lb.querySelector(".lb-n").addEventListener("click", function () { tampil(kini + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) tutup(); });
    var awalX = null;
    lb.addEventListener("touchstart", function (e) { awalX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (awalX === null) return;
      var dx = e.changedTouches[0].clientX - awalX;
      if (Math.abs(dx) > 50) tampil(kini + (dx < 0 ? 1 : -1));
      awalX = null;
    });
    doc.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") tutup();
      if (e.key === "ArrowLeft") tampil(kini - 1);
      if (e.key === "ArrowRight") tampil(kini + 1);
    });
  }
  if (semuaFoto.length) {
    doc.addEventListener("click", function (e) {
      var img = e.target.closest ? e.target.closest(PILIH_FOTO) : null;
      if (!img) return;
      pilihDaftar(img);
      var i = foto.findIndex(function (f) { return f.src === img.src; });
      if (i < 0) return;
      siapkan();
      var banyak = foto.length > 1 ? "" : "none";
      lb.querySelector(".lb-p").style.display = banyak;
      lb.querySelector(".lb-n").style.display = banyak;
      tampil(i);
      lb.classList.add("open");
      doc.documentElement.style.overflow = "hidden";
      lb.querySelector(".lb-x").focus();
    });
  }

  /* ---- lencana status pada kartu update di beranda ---- */
  (function () {
    var h = new Date();
    var iso = h.getFullYear() + "-" + ("0" + (h.getMonth() + 1)).slice(-2) + "-" + ("0" + h.getDate()).slice(-2);
    doc.querySelectorAll(".upd-mini").forEach(function (k) {
      var lencana = k.querySelector(".badge");
      if (!lencana) return;
      var st = iso < k.getAttribute("data-mulai") ? "akan" : (iso > k.getAttribute("data-selesai") ? "selesai" : "jalan");
      lencana.className = "badge st-" + st;
      lencana.textContent = T["st_" + st] || lencana.textContent;
    });
  })();

  /* ---- update event: status otomatis, saring jenis, tampilkan lebih banyak, foto ---- */
  var kartuUpd = [].slice.call(doc.querySelectorAll(".upd"));
  if (kartuUpd.length) {
    var h = new Date();
    var iso = h.getFullYear() + "-" + ("0" + (h.getMonth() + 1)).slice(-2) + "-" + ("0" + h.getDate()).slice(-2);
    kartuUpd.forEach(function (k) {
      var lencana = k.querySelector(".badge");
      if (!lencana) return;
      var st = iso < k.getAttribute("data-mulai") ? "akan" : (iso > k.getAttribute("data-selesai") ? "selesai" : "jalan");
      lencana.className = "badge st-" + st;
      lencana.textContent = T["st_" + st] || lencana.textContent;
      k.setAttribute("data-status", st);
    });
    var daftarUpd = doc.querySelector(".upd-list");
    var batch = parseInt(daftarUpd.getAttribute("data-batch"), 10) || 6;
    var tampilN = batch, kat = "semua", tombolLagi = doc.querySelector(".btn-lagi");
    var terapkan = function () {
      var cocok = kartuUpd.filter(function (k) { return kat === "semua" || k.getAttribute("data-kat") === kat; });
      kartuUpd.forEach(function (k) { k.hidden = true; });
      cocok.forEach(function (k, i) { k.hidden = i >= tampilN; });
      tombolLagi.hidden = cocok.length <= tampilN;
    };
    doc.querySelectorAll(".chip").forEach(function (c) {
      c.addEventListener("click", function () {
        doc.querySelectorAll(".chip").forEach(function (x) {
          x.classList.toggle("on", x === c);
          x.setAttribute("aria-pressed", x === c ? "true" : "false");
        });
        kat = c.getAttribute("data-kat");
        tampilN = batch;
        terapkan();
      });
    });
    tombolLagi.addEventListener("click", function () { tampilN += batch; terapkan(); });
    terapkan();
    doc.querySelectorAll(".upd-lebih").forEach(function (t) {
      t.addEventListener("click", function () {
        var buka = t.closest(".upd").classList.toggle("open");
        t.setAttribute("aria-expanded", buka ? "true" : "false");
        t.textContent = buka ? T.foto_tutup : isi(T.foto_lihat, { n: t.getAttribute("data-n") });
      });
    });
  }

  /* ---- video YouTube: pemutar baru dimuat saat gambar diklik ---- */
  doc.addEventListener("click", function (e) {
    var tombol = e.target.closest ? e.target.closest(".vid-btn") : null;
    if (!tombol) return;
    var f = doc.createElement("iframe");
    f.className = "vid-frame";
    f.src = tombol.getAttribute("data-embed");
    f.title = tombol.getAttribute("data-judul") || "Video";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.setAttribute("allowfullscreen", "");
    f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    tombol.parentNode.replaceChild(f, tombol);
  });


  /* ============ efek 3D dan interaksi kursor (dimatikan bila "kurangi gerakan") ============ */
  var halus = !!(window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches);
  var penunjuk = { x: -9999, y: -9999, waktu: 0 };
  function batas(n, a, b) { return Math.max(a, Math.min(b, n)); }
  if (!reduce) {
    window.addEventListener("pointermove", function (e) {
      penunjuk.x = e.clientX; penunjuk.y = e.clientY; penunjuk.waktu = performance.now();
    }, { passive: true });

    /* -- koin logo 3D: mengikuti kursor, melayang saat diam, klik untuk memutar -- */
    var koin = doc.querySelector(".koin");
    if (koin) {
      var badan = koin.querySelector(".koin-badan");
      var bayangan = koin.querySelector(".koin-bayangan");
      var cur = { x: 0, y: 0 }, putar0 = null, koinTampak = true;
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (d) { koinTampak = d[0].isIntersecting; }).observe(koin);
      }
      koin.addEventListener("click", function () { if (putar0 === null) putar0 = performance.now(); });
      var gerakKoin = function (t) {
        window.requestAnimationFrame(gerakKoin);
        if (!koinTampak || doc.hidden) return;
        var tx, ty;
        if (halus && t - penunjuk.waktu < 2500 && penunjuk.x > -9000) {
          var r = koin.getBoundingClientRect();
          var dx = (penunjuk.x - (r.left + r.width / 2)) / (window.innerWidth * 0.33);
          var dy = (penunjuk.y - (r.top + r.height / 2)) / (window.innerHeight * 0.42);
          ty = batas(dx, -1, 1) * 30; tx = -batas(dy, -1, 1) * 22;
        } else {                      /* diam atau layar sentuh: bergoyang pelan */
          tx = Math.sin(t / 1700) * 7; ty = Math.sin(t / 2300) * 18;
        }
        cur.x += (tx - cur.x) * 0.08; cur.y += (ty - cur.y) * 0.08;
        var putar = 0;
        if (putar0 !== null) {
          var p = Math.min((t - putar0) / 1100, 1);
          putar = 360 * (1 - Math.pow(1 - p, 3));
          if (p >= 1) putar0 = null;
        }
        badan.style.transform = "rotateX(" + cur.x.toFixed(2) + "deg) rotateY(" + (cur.y + putar).toFixed(2) + "deg)";
        koin.style.setProperty("--gx", (50 - cur.y * 1.5).toFixed(1) + "%");
        koin.style.setProperty("--gy", (45 + cur.x * 1.6).toFixed(1) + "%");
        if (bayangan) bayangan.style.transform = "translateX(" + (-cur.y * 1.4).toFixed(1) + "px) scaleX(" + (1 - Math.abs(cur.y) / 140).toFixed(3) + ")";
      };
      window.requestAnimationFrame(gerakKoin);
    }

    /* -- cahaya mengikuti kursor + partikel emas di hero, kepala halaman, dan ajakan akhir -- */
    var wadahPartikel = [].slice.call(doc.querySelectorAll("[data-partikel]"));
    var sistem = [];
    wadahPartikel.forEach(function (w) {
      var sorot = doc.createElement("span"); sorot.className = "sorot"; sorot.setAttribute("aria-hidden", "true");
      var kanvas = doc.createElement("canvas"); kanvas.className = "partikel"; kanvas.setAttribute("aria-hidden", "true");
      w.appendChild(sorot); w.appendChild(kanvas);
      var ctx = kanvas.getContext("2d");
      var S = { w: w, sorot: sorot, kanvas: kanvas, ctx: ctx, W: 0, H: 0, titik: [], tampak: false, dpr: Math.min(window.devicePixelRatio || 1, 2) };
      var baru = function (acak) {
        return { x: Math.random() * S.W, y: acak ? Math.random() * S.H : S.H + 10, r: Math.random() * 1.7 + 0.6,
          v: Math.random() * 0.28 + 0.08, a: Math.random() * 6.28, k: Math.random() * 0.025 + 0.006 };
      };
      var ukur = function () {
        var r = w.getBoundingClientRect();
        S.W = r.width; S.H = r.height;
        kanvas.width = Math.round(S.W * S.dpr); kanvas.height = Math.round(S.H * S.dpr);
        ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
        var n = Math.round(Math.min(halus ? 46 : 22, (S.W * S.H) / 24000));
        while (S.titik.length < n) S.titik.push(baru(true));
        S.titik.length = n;
      };
      S.ukur = ukur; ukur();
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (d) { S.tampak = d[0].isIntersecting; }).observe(w);
      } else { S.tampak = true; }
      sistem.push(S);
    });
    window.addEventListener("resize", function () { sistem.forEach(function (S) { S.ukur(); }); });
    var gambarPartikel = function (t) {
      window.requestAnimationFrame(gambarPartikel);
      if (doc.hidden) return;
      sistem.forEach(function (S) {
        if (!S.tampak) return;
        var r = S.w.getBoundingClientRect();
        var px = penunjuk.x - r.left, py = penunjuk.y - r.top;
        if (halus && penunjuk.x > -9000) {
          S.w.style.setProperty("--sx", px.toFixed(0) + "px");
          S.w.style.setProperty("--sy", py.toFixed(0) + "px");
        }
        var c = S.ctx;
        c.clearRect(0, 0, S.W, S.H);
        S.titik.forEach(function (p) {
          p.y -= p.v; p.a += p.k; p.x += Math.sin(p.a) * 0.18;
          if (halus) {                 /* dihindari kursor */
            var ddx = p.x - px, ddy = p.y - py, d2 = ddx * ddx + ddy * ddy;
            if (d2 < 11000) { var f = (1 - d2 / 11000) * 1.6; var d = Math.sqrt(d2) || 1; p.x += (ddx / d) * f; p.y += (ddy / d) * f; }
          }
          if (p.y < -10) { p.y = S.H + 10; p.x = Math.random() * S.W; }
          var alfa = 0.28 + 0.34 * (0.5 + 0.5 * Math.sin(p.a * 2.3));
          c.beginPath(); c.arc(p.x, p.y, p.r * 3.2, 0, 6.2832); c.fillStyle = "rgba(232,144,30," + (alfa * 0.16).toFixed(3) + ")"; c.fill();
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.2832); c.fillStyle = "rgba(246,217,138," + alfa.toFixed(3) + ")"; c.fill();
        });
      });
    };
    window.requestAnimationFrame(gambarPartikel);

    /* -- parallax: latar hero bergeser pelan, foto kartu spesialisasi menyapu ke samping -- */
    var heroBg = doc.querySelector(".hero-bg");
    var fotoSpes = [].slice.call(doc.querySelectorAll(".spes-kartu img"));
    var menunggu = false;
    var parallax = function () {
      menunggu = false;
      var y = window.scrollY, vh = window.innerHeight;
      if (heroBg && y < vh * 1.2) heroBg.style.transform = "translate3d(0," + (y * 0.2).toFixed(1) + "px,0) scale(1.06)";
      fotoSpes.forEach(function (img) {
        var r = img.parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = batas((r.top + r.height / 2) / vh, 0, 1);
        img.style.objectPosition = (28 + p * 44).toFixed(1) + "% 50%";
      });
    };
    window.addEventListener("scroll", function () {
      if (!menunggu) { menunggu = true; window.requestAnimationFrame(parallax); }
    }, { passive: true });
    parallax();

    /* -- kartu miring 3D dan tombol magnetik (hanya untuk mouse) -- */
    if (halus) {
      doc.querySelectorAll(".spes-kartu,.alasan-kartu,.upd-mini,.vm-kartu,.kartu-kontak").forEach(function (k) {
        k.addEventListener("pointermove", function (e) {
          var r = k.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          k.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
          k.style.setProperty("--my", (py * 100).toFixed(1) + "%");
          k.style.transform = "perspective(900px) rotateX(" + ((0.5 - py) * 8).toFixed(2) + "deg) rotateY(" +
            ((px - 0.5) * 10).toFixed(2) + "deg) translateY(-5px)";
        });
        k.addEventListener("pointerleave", function () { k.style.transform = ""; });
      });
      doc.querySelectorAll(".btn").forEach(function (t) {
        t.addEventListener("pointermove", function (e) {
          var r = t.getBoundingClientRect();
          var x = (e.clientX - (r.left + r.width / 2)) * 0.28, y = (e.clientY - (r.top + r.height / 2)) * 0.32;
          t.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
        });
        t.addEventListener("pointerleave", function () { t.style.transform = ""; });
      });
    }
  }

  /* ---- navigasi jenis event: penanda aktif mengikuti posisi scroll ---- */
  var artikelJenis = [].slice.call(doc.querySelectorAll(".jenis-isi .art"));
  if (artikelJenis.length && "IntersectionObserver" in window) {
    var tautanJenis = [].slice.call(doc.querySelectorAll(".jenis-nav a"));
    var aktifkanJenis = function (id) {
      tautanJenis.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + id;
        a.classList.toggle("on", on);
        var w = a.parentNode;
        if (on && w.scrollWidth > w.clientWidth) w.scrollTo({ left: a.offsetLeft - w.clientWidth / 2 + a.clientWidth / 2, behavior: reduce ? "auto" : "smooth" });
      });
    };
    aktifkanJenis(artikelJenis[0].id);
    var pengamatJenis = new IntersectionObserver(function (d) {
      d.forEach(function (x) { if (x.isIntersecting) aktifkanJenis(x.target.id); });
    }, { rootMargin: "-35% 0px -55% 0px" });
    artikelJenis.forEach(function (a) { pengamatJenis.observe(a); });
  }

  /* ---- peta area mal (Leaflet, dimuat hanya di halaman Lokasi) ---- */
  var petaEl = doc.getElementById("peta"), petaApi = null, petaObj = null, areaData = [];
  if (petaEl) {
    if (!window.L) {
      petaEl.innerHTML = '<p class="peta-gagal">' + (T.peta_gagal || "") + "</p>";
    } else {
      try { areaData = JSON.parse(doc.getElementById("peta-data").textContent); } catch (e) { areaData = []; }
      petaObj = L.map(petaEl, { scrollWheelZoom: false, minZoom: 4, maxZoom: 17, zoomSnap: 0.5, dragging: !L.Browser.mobile, tap: false })
        .setView([-2.5, 118], 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
      }).addTo(petaObj);
      petaObj.on("focus", function () { petaObj.scrollWheelZoom.enable(); });
      petaObj.on("blur", function () { petaObj.scrollWheelZoom.disable(); });
      var lapis = L.layerGroup().addTo(petaObj);
      var aktifArea = [];
      var isiPopup = function (it) {
        var d = doc.createElement("div"); d.className = "pop";
        var h = doc.createElement("h4"); h.textContent = it.a.n + " · " + isi(T.n_mal, { n: it.mal.length }); d.appendChild(h);
        var ul = doc.createElement("ul");
        it.mal.forEach(function (m) {
          var li = doc.createElement("li"), a = doc.createElement("a");
          a.href = m.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = m.nama;
          li.appendChild(a); ul.appendChild(li);
        });
        d.appendChild(ul);
        return d;
      };
      var gambarPeta = function () {
        lapis.clearLayers();
        var kel = [];
        aktifArea.forEach(function (it) {
          var p = petaObj.latLngToContainerPoint([it.a.lat, it.a.lng]), g = null;
          for (var i = 0; i < kel.length; i++) {
            var dx = kel[i].x - p.x, dy = kel[i].y - p.y;
            if (dx * dx + dy * dy < 1600) { g = kel[i]; break; }
          }
          if (g) {
            var n = g.m.length;
            g.x = (g.x * n + p.x) / (n + 1); g.y = (g.y * n + p.y) / (n + 1); g.m.push(it);
          } else { kel.push({ x: p.x, y: p.y, m: [it] }); }
        });
        kel.forEach(function (g) {
          var jumlah = g.m.reduce(function (s, it) { return s + it.mal.length; }, 0);
          if (g.m.length === 1) {
            var it = g.m[0];
            L.marker([it.a.lat, it.a.lng], { icon: L.divIcon({ className: "pin", html: "<b>" + jumlah + "</b>", iconSize: [36, 36] }), title: it.a.n })
              .bindPopup(isiPopup(it), { maxWidth: 280 })
              .bindTooltip(it.a.n, { direction: "top", offset: [0, -16] })
              .addTo(lapis);
          } else {
            var titik = g.m.map(function (it) { return [it.a.lat, it.a.lng]; });
            L.marker(petaObj.containerPointToLatLng([g.x, g.y]), { icon: L.divIcon({ className: "pin pin-klaster", html: "<b>" + jumlah + "</b>", iconSize: [46, 46] }), title: g.m.length + " area" })
              .on("click", function () { petaObj.fitBounds(L.latLngBounds(titik), { padding: [70, 70], maxZoom: 12 }); })
              .addTo(lapis);
          }
        });
      };
      petaObj.on("zoomend", gambarPeta);
      var muatSemua = function (animasi) {
        if (!aktifArea.length) { gambarPeta(); return; }
        petaObj.fitBounds(L.latLngBounds(aktifArea.map(function (it) { return [it.a.lat, it.a.lng]; })), { padding: [40, 40], maxZoom: 8, animate: !!animasi && !reduce });
        gambarPeta();
      };
      petaApi = {
        perbarui: function (perArea, animasi) {
          aktifArea = areaData.filter(function (a) { return perArea[a.k] && perArea[a.k].length; })
            .map(function (a) { return { a: a, mal: perArea[a.k] }; });
          muatSemua(animasi);
        },
        semua: function () { muatSemua(true); }
      };
      doc.body.classList.add("peta-ok");
      var tombolSemua = doc.getElementById("peta-semua");
      if (tombolSemua) tombolSemua.addEventListener("click", function () { petaApi.semua(); });
      doc.querySelectorAll(".ke-peta").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var ks = btn.getAttribute("data-areas").split(",");
          var titik = areaData.filter(function (a) { return ks.indexOf(a.k) >= 0; }).map(function (a) { return [a.lat, a.lng]; });
          if (!titik.length) return;
          petaEl.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
          petaObj.flyToBounds(L.latLngBounds(titik), { padding: [80, 80], maxZoom: 11, duration: reduce ? 0 : 1.2 });
        });
      });
    }
  }

  /* ---- pencarian dan penyaringan wilayah mal (halaman Lokasi) ---- */
  var cari = doc.getElementById("cari");
  if (cari) {
    var total = parseInt(cari.parentNode.getAttribute("data-total"), 10) || 0;
    var jumlah = doc.getElementById("jumlah");
    var kosong = doc.getElementById("kosong");
    var wil = "semua";
    var terapkan = function (animasi) {
      var q = cari.value.trim().toLowerCase(), tampil = 0, perArea = {};
      doc.querySelectorAll(".mal").forEach(function (a) {
        var ok = (!q || a.getAttribute("data-cari").indexOf(q) !== -1) && (wil === "semua" || a.getAttribute("data-wil") === wil);
        a.hidden = !ok;
        if (!ok) return;
        tampil++;
        var k = a.getAttribute("data-area");
        if (k) (perArea[k] = perArea[k] || []).push({ nama: a.lastChild.textContent, url: a.href });
      });
      doc.querySelectorAll(".kel").forEach(function (k) { k.hidden = !k.querySelector(".mal:not([hidden])"); });
      doc.querySelectorAll(".wilayah").forEach(function (w) { w.hidden = !w.querySelector(".kel:not([hidden])"); });
      kosong.hidden = tampil > 0;
      jumlah.textContent = (q || wil !== "semua") ? isi(T.jumlah_saring, { n: tampil, total: total }) : isi(T.jumlah, { total: total });
      if (petaApi) petaApi.perbarui(perArea, animasi);
    };
    cari.addEventListener("input", function () { terapkan(true); });
    doc.querySelectorAll(".chip-wil").forEach(function (c) {
      c.addEventListener("click", function () {
        doc.querySelectorAll(".chip-wil").forEach(function (x) {
          x.classList.toggle("on", x === c);
          x.setAttribute("aria-pressed", x === c ? "true" : "false");
        });
        wil = c.getAttribute("data-wil");
        terapkan(true);
      });
    });
    terapkan(false);
  }

  /* ---- salin nomor/email, pemberitahuan singkat ---- */
  var toast = null;
  var tampilToast = function (teks) {
    if (!toast) {
      toast = doc.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status");
      doc.body.appendChild(toast);
    }
    toast.textContent = teks; toast.classList.add("tampak");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(function () { toast.classList.remove("tampak"); }, 1800);
  };
  doc.querySelectorAll(".salin").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var nilai = btn.getAttribute("data-salin");
      var sukses = function () { tampilToast(T.disalin || "Copied"); };
      var cadangan = function () {
        var t = doc.createElement("textarea");
        t.value = nilai; t.style.position = "fixed"; t.style.opacity = "0";
        doc.body.appendChild(t); t.select();
        try { if (doc.execCommand("copy")) sukses(); } catch (e) { /* diabaikan */ }
        doc.body.removeChild(t);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(nilai).then(sukses, cadangan);
      else cadangan();
    });
  });

  /* ---- FAQ ---- */
  doc.querySelectorAll(".faq-tanya").forEach(function (b) {
    b.addEventListener("click", function () {
      var buka = b.closest(".faq-item").classList.toggle("buka");
      b.setAttribute("aria-expanded", buka ? "true" : "false");
    });
  });

  /* ---- formulir WhatsApp ---- */
  var form = doc.getElementById("form-wa");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var usaha = d.get("usaha") ? (T.wa_dari || " - ") + d.get("usaha") : "";
      var teks =
        (T.wa_awal || "") + d.get("nama") + usaha + ".\n" +
        (T.wa_butuh || "") + d.get("butuh") + "\n\n" + d.get("pesan");
      var url = "https://wa.me/" + form.getAttribute("data-wa") + "?text=" + encodeURIComponent(teks);
      var tombol = form.querySelector('button[type="submit"]');
      if (tombol) { tombol.dataset.awal = tombol.dataset.awal || tombol.textContent; tombol.textContent = T.mengirim || "..."; tombol.classList.add("mengirim"); }
      var info = form.querySelector(".form-info");
      if (info) { info.hidden = false; info.querySelector("a").href = url; }
      window.open(url, "_blank", "noopener");
      window.setTimeout(function () {
        if (tombol) { tombol.textContent = tombol.dataset.awal; tombol.classList.remove("mengirim"); }
      }, 4000);
    });
  }
})();

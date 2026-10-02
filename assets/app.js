/* Interaksi website WRS: navbar, animasi scroll, angka berjalan, lightbox foto,
   pencarian mal (halaman Lokasi), dan form WhatsApp (halaman Contact). */
(function () {
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- navbar: mengecil saat scroll + hamburger di HP ---- */
  var nav = doc.querySelector(".nav");
  var burger = doc.querySelector(".burger");
  function saatScroll() { nav.classList.toggle("scrolled", window.scrollY > 40); }
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
    ".marquee,.kontak .cols>div,.kontak .inner>h2,.form";

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
  var PILIH_FOTO = "img.mo,img.gal-img,img.foto-about,img.potret";
  var foto = [].slice.call(doc.querySelectorAll(PILIH_FOTO)).filter(function (f) {
    return !f.closest("[aria-hidden='true']"); /* lewati salinan galeri yang bergerak */
  });
  var lb, lbFoto, lbKet, kini = 0;

  function tampil(i) {
    kini = (i + foto.length) % foto.length;
    lbFoto.src = foto[kini].src;
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
    lb.setAttribute("aria-label", "Tampilan foto");
    lb.innerHTML =
      '<button class="lb-x" type="button" aria-label="Tutup">&times;</button>' +
      '<button class="lb-p" type="button" aria-label="Foto sebelumnya">&#8249;</button>' +
      '<img class="lb-img" alt=""><p class="lb-cap"></p>' +
      '<button class="lb-n" type="button" aria-label="Foto berikutnya">&#8250;</button>';
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
  if (foto.length) {
    doc.addEventListener("click", function (e) {
      var img = e.target.closest ? e.target.closest(PILIH_FOTO) : null;
      if (!img) return;
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

  /* ---- pencarian mal (halaman Lokasi) ---- */
  var cari = document.getElementById("cari");
  if (cari) {
    var total = parseInt(cari.parentNode.getAttribute("data-total"), 10) || 0;
    var jumlah = document.getElementById("jumlah");
    var kosong = document.getElementById("kosong");
    cari.addEventListener("input", function () {
      var q = cari.value.trim().toLowerCase();
      var tampil = 0;
      document.querySelectorAll(".mal").forEach(function (a) {
        var ok = !q || a.getAttribute("data-cari").indexOf(q) !== -1;
        a.hidden = !ok;
        if (ok) tampil++;
      });
      document.querySelectorAll(".kel").forEach(function (k) {
        k.hidden = !k.querySelector(".mal:not([hidden])");
      });
      document.querySelectorAll(".wilayah").forEach(function (w) {
        w.hidden = !w.querySelector(".kel:not([hidden])");
      });
      kosong.hidden = tampil > 0;
      jumlah.textContent = q ? tampil + " dari " + total + " lokasi" : total + " lokasi";
    });
  }

  var form = document.getElementById("form-wa");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var usaha = d.get("usaha") ? " dari " + d.get("usaha") : "";
      var teks =
        "Halo WRS, saya " + d.get("nama") + usaha + ".\n" +
        "Kebutuhan: " + d.get("butuh") + "\n\n" + d.get("pesan");
      var url = "https://wa.me/" + form.getAttribute("data-wa") + "?text=" + encodeURIComponent(teks);
      window.open(url, "_blank", "noopener");
    });
  }
})();

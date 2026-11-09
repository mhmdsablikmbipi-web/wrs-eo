/* Panel admin WRS. Berjalan sepenuhnya di browser dan bicara langsung dengan GitHub.
 * Tidak ada server milik kami: "login" = kunci akses GitHub (token) yang ditempel admin.
 * Semua teks dari repo/pengguna ditulis dengan textContent (tidak pernah innerHTML). */
(function () {
  "use strict";

  var CFG = JSON.parse(document.getElementById("cfg").textContent);
  var API = "https://api.github.com";
  var K_TOKEN = "wrs_admin_token";
  var K_REPO = "wrs_admin_repo";
  var app = document.getElementById("app");
  var bar = document.getElementById("bar-user");
  var toast = document.getElementById("toast");

  var JENIS = {
    event: {
      folder: "update", nama: "Event", baru: "Event baru", wajibTanggal: true,
      kosong: "Belum ada event. Tekan \"Event baru\" untuk menambah."
    },
    proyek: {
      folder: "portofolio", nama: "Portofolio", baru: "Proyek baru", wajibTanggal: false,
      kosong: "Belum ada proyek portofolio. Tekan \"Proyek baru\" untuk menambah."
    }
  };
  var BULAN_NAMA = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus",
    "September", "Oktober", "November", "Desember"];
  var BULAN = {
    januari: 1, jan: 1, january: 1, februari: 2, pebruari: 2, feb: 2, february: 2,
    maret: 3, mar: 3, march: 3, april: 4, apr: 4, mei: 5, may: 5, juni: 6, jun: 6, june: 6,
    juli: 7, jul: 7, july: 7, agustus: 8, agu: 8, agt: 8, aug: 8, august: 8,
    september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, oct: 10, october: 10,
    november: 11, nov: 11, nop: 11, desember: 12, des: 12, dec: 12, december: 12
  };
  var KUNCI = {
    judul: "judul", title: "judul", nama_event: "judul", nama: "judul", judul_en: "judul_en", title_en: "judul_en",
    kategori: "kategori", category: "kategori", jenis: "kategori", mal: "mal", mall: "mal", lokasi: "mal",
    kota: "kota", city: "kota", periode: "periode", period: "periode", tanggal: "periode",
    mulai: "mulai", start: "mulai", selesai: "selesai", end: "selesai",
    deskripsi: "deskripsi", description: "deskripsi", keterangan: "deskripsi",
    deskripsi_en: "deskripsi_en", description_en: "deskripsi_en",
    klien: "klien", client: "klien", brand: "klien"
  };
  var ALIAS_KAT = { automotive: "otomotif", multiproduct: "multiproduk", bazar: "bazaar" };
  var EKS_FOTO = /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif)$/i;

  var S = { token: "", repo: "", branch: "", user: null, pohon: [], data: { event: [], proyek: [] }, tab: "ringkas", sibuk: false,
    dok: { galeri: {}, ig: {}, galat: [] }, draf: { kegiatan: [], porto: [], sembunyi: [], ig: {} },
    awal: { kegiatan: "[]", porto: "[]", sembunyi: "[]", ig: "[]" }, igBuka: {} };
  var E = null;          // keadaan editor (null = sedang di daftar)
  var kotorEditor = false;

  /* ------------------------------------------------------------------ DOM */
  var PROPS = { value: 1, checked: 1, disabled: 1, hidden: 1, required: 1, multiple: 1, open: 1, readOnly: 1 };
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") e.className = v;
        else if (k === "text") e.textContent = v;
        else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
        else if (PROPS[k]) e[k] = v;
        else e.setAttribute(k, v === true ? "" : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) tambah(e, arguments[i]);
    return e;
  }
  function tambah(e, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { tambah(e, x); }); return; }
    e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  function kosongkan(e) { while (e.firstChild) e.removeChild(e.firstChild); }
  function tampilkan(node) { kosongkan(app); app.appendChild(node); window.scrollTo(0, 0); }

  var toastT = 0;
  function info(teks, jenis) {
    toast.textContent = teks;
    toast.className = "toast show " + (jenis || "");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.className = "toast"; }, jenis === "salah" ? 9000 : 4500);
  }

  /* ----------------------------------------------------------- penyimpanan */
  function simpanLokal(nama, nilai, tahan) {
    try {
      sessionStorage.removeItem(nama); localStorage.removeItem(nama);
      (tahan ? localStorage : sessionStorage).setItem(nama, nilai);
    } catch (e) { /* peramban memblokir penyimpanan: tidak apa-apa, login tiap kali */ }
  }
  function bacaLokal(nama) {
    try { return sessionStorage.getItem(nama) || localStorage.getItem(nama) || ""; } catch (e) { return ""; }
  }
  function hapusLokal(nama) {
    try { sessionStorage.removeItem(nama); localStorage.removeItem(nama); } catch (e) { /* abaikan */ }
  }

  /* ------------------------------------------------------------- GitHub API */
  async function gh(path, opsi) {
    opsi = opsi || {};
    var res;
    try {
      res = await fetch(API + path, {
        method: opsi.method || "GET",
        cache: "no-store",
        headers: Object.assign({
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: "Bearer " + S.token
        }, opsi.body ? { "Content-Type": "application/json" } : {}),
        body: opsi.body ? JSON.stringify(opsi.body) : undefined
      });
    } catch (e) {
      var g = new Error("Tidak bisa terhubung ke GitHub. Periksa koneksi internet lalu coba lagi.");
      g.status = 0;
      throw g;
    }
    if (!res.ok) {
      var pesan = "";
      try { pesan = (await res.json()).message || ""; } catch (e) { /* tanpa isi */ }
      var err = new Error(pesan || res.statusText);
      err.status = res.status;
      err.rate = res.headers.get("x-ratelimit-remaining") === "0";
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  function ramahError(e) {
    if (e.status === 401) return "Kunci akses ditolak: salah ketik, sudah kedaluwarsa, atau sudah dicabut. Buat kunci baru lalu masuk lagi.";
    if (e.rate) return "Batas permintaan GitHub tercapai. Tunggu beberapa menit lalu coba lagi.";
    if (e.status === 403) return "Kunci akses ini tidak punya izin untuk tindakan tersebut (perlu izin \"Contents: Read and write\").";
    if (e.status === 404) return "Repo atau data tidak ditemukan. Periksa nama repo, dan pastikan kunci akses mencakup repo ini.";
    if (e.status === 409 || e.status === 422) return "GitHub menolak perubahan: " + e.message;
    return e.message || "Terjadi kesalahan tak dikenal.";
  }
  function tunggu(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function enc(s) { return encodeURIComponent(s); }

  async function paralel(daftar, batas, fn) {
    var i = 0, gagal = null;
    async function kerja() {
      while (i < daftar.length && !gagal) {
        var n = i++;
        try { await fn(daftar[n], n); } catch (e) { gagal = e; }
      }
    }
    var pekerja = [];
    for (var k = 0; k < Math.min(batas, daftar.length); k++) pekerja.push(kerja());
    await Promise.all(pekerja);
    if (gagal) throw gagal;
  }

  function teksKeB64(t) {
    var bytes = new TextEncoder().encode(t), s = "";
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function blobKeB64(b) {
    return new Promise(function (ok, gagal) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(",")[1]); };
      r.onerror = function () { gagal(new Error("Foto tidak bisa dibaca.")); };
      r.readAsDataURL(b);
    });
  }

  /* Satu commit berisi banyak file sekaligus: semua berhasil, atau tidak ada yang berubah.
   * entri: {path, isi (teks atau Blob)} | {path, sha} (pindah) | {path, hapus:true} */
  async function komit(pesan, entri, onProgres) {
    var total = entri.filter(function (e) { return !e.hapus && !e.sha; }).length + 3, selesai = 0;
    function maju(t) { selesai++; if (onProgres) onProgres(Math.min(selesai / total, 1), t); }
    var sha = entri.map(function (e) { return e.sha || null; });
    var antre = [];
    entri.forEach(function (e, i) { if (!e.hapus && !e.sha) antre.push(i); });
    await paralel(antre, 3, async function (i) {
      var isi = entri[i].isi;
      var b64 = typeof isi === "string" ? teksKeB64(isi) : await blobKeB64(isi);
      var r = await gh("/repos/" + S.repo + "/git/blobs", { method: "POST", body: { content: b64, encoding: "base64" } });
      sha[i] = r.sha;
      maju("Mengunggah file…");
    });
    for (var coba = 0; coba < 4; coba++) {
      var ref = await gh("/repos/" + S.repo + "/git/ref/heads/" + enc(S.branch));
      var kepala = ref.object.sha;
      var cm = await gh("/repos/" + S.repo + "/git/commits/" + kepala);
      var peta = {};
      entri.forEach(function (e, i) {
        peta[e.path] = { path: e.path, mode: "100644", type: "blob", sha: e.hapus ? null : sha[i] };
      });
      var pohon = await gh("/repos/" + S.repo + "/git/trees", {
        method: "POST", body: { base_tree: cm.tree.sha, tree: Object.keys(peta).map(function (k) { return peta[k]; }) }
      });
      var komitBaru = await gh("/repos/" + S.repo + "/git/commits", {
        method: "POST", body: { message: pesan, tree: pohon.sha, parents: [kepala] }
      });
      try {
        await gh("/repos/" + S.repo + "/git/refs/heads/" + enc(S.branch), { method: "PATCH", body: { sha: komitBaru.sha, force: false } });
        maju("Tersimpan di GitHub");
        return komitBaru.sha;
      } catch (e) {
        /* 422 = ada perubahan lain masuk saat kita bekerja (mis. robot pembangun): ulangi di atasnya */
        if (e.status === 422 && coba < 3) { await tunggu(700 * (coba + 1)); continue; }
        throw e;
      }
    }
  }

  /* ----------------------------------------------------------- info.txt */
  function bacaInfo(teks) {
    var mentah = {}, kunci = null;
    teks.replace(/^﻿/, "").split(/\r?\n/).forEach(function (baris) {
      if (/^\s*#/.test(baris)) return;
      var m = baris.match(/^\s*([A-Za-z_ ]{2,20}?)\s*[:=]\s*(.*)$/);
      if (m) {
        var k = KUNCI[m[1].trim().toLowerCase().replace(/[\s_]+/g, "_")];
        if (k) { kunci = k; mentah[k] = [m[2].trim()]; return; }
      }
      if (kunci !== null) mentah[kunci].push(baris.trim());
    });
    var hasil = {};
    Object.keys(mentah).forEach(function (k) {
      var paras = [], cur = [];
      mentah[k].forEach(function (x) {
        if (x) cur.push(x); else if (cur.length) { paras.push(cur.join(" ")); cur = []; }
      });
      if (cur.length) paras.push(cur.join(" "));
      hasil[k] = paras;
    });
    return hasil;
  }

  function uraiTanggal(s) {
    s = s.trim();
    var m = s.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/);
    if (m) {
      var a = +m[1], b = +m[2], c = +m[3];
      return m[1].length === 4 ? [c, b, a] : [a, b, c];
    }
    var th = s.match(/\b(\d{4})\b/);
    var sisa = th ? s.replace(th[1], " ") : s;
    var hr = sisa.match(/\b(\d{1,2})\b/);
    var kata = s.match(/[A-Za-z]+/g) || [], bln = null;
    for (var i = 0; i < kata.length; i++) if (BULAN[kata[i].toLowerCase()]) { bln = BULAN[kata[i].toLowerCase()]; break; }
    return [hr ? +hr[1] : null, bln, th ? +th[1] : null];
  }
  var PEMISAH = /\s*(?:\bs\s*\/\s*d\b\.?|\bs\.\s*d\.?|\bsd\b|\bsampai\b|\bhingga\b|\bto\b|\buntil\b|\s-\s|–|—)\s*/i;
  function uraiPeriode(teks) {
    var bagian = teks.trim().split(PEMISAH).filter(function (p) { return p && p.trim(); });
    if (!bagian.length || bagian.length > 2) throw new Error("format periode tidak dikenali");
    var kiri = uraiTanggal(bagian[0]), kanan = uraiTanggal(bagian[bagian.length - 1]);
    if (bagian.length === 1) kanan = kiri.slice();
    if (kanan[0] === null) throw new Error("tanggal akhir tidak terbaca");
    kanan[2] = kanan[2] || kiri[2];
    kanan[1] = kanan[1] || kiri[1];
    if (!kanan[1] || !kanan[2] || kiri[0] === null) throw new Error("bulan atau tahun belum ditulis");
    if (kiri[1] === null) {
      kiri[1] = kiri[0] > kanan[0] ? kanan[1] - 1 : kanan[1];
      if (kiri[1] === 0) { kiri[1] = 12; kiri[2] = (kiri[2] || kanan[2]) - 1; }
    }
    if (kiri[2] === null) kiri[2] = kiri[1] > kanan[1] ? kanan[2] - 1 : kanan[2];
    var a = isoOk(kiri[2], kiri[1], kiri[0]), b = isoOk(kanan[2], kanan[1], kanan[0]);
    if (!a || !b) throw new Error("ada tanggal yang tidak ada di kalender");
    if (a > b) throw new Error("tanggal selesai lebih awal dari tanggal mulai");
    return [a, b];
  }
  function pad(n, l) { n = String(n); while (n.length < (l || 2)) n = "0" + n; return n; }
  function isoOk(y, m, d) {
    var t = new Date(y, m - 1, d);
    if (t.getFullYear() !== y || t.getMonth() !== m - 1 || t.getDate() !== d) return "";
    return pad(y, 4) + "-" + pad(m) + "-" + pad(d);
  }
  function hariIni() {
    var t = new Date();
    return pad(t.getFullYear(), 4) + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate());
  }
  function tglIndo(iso) {
    var p = iso.split("-");
    return +p[2] + " " + BULAN_NAMA[+p[1] - 1] + " " + p[0];
  }
  function periodeIndo(a, b) {
    if (!a) return "";
    if (!b || a === b) return tglIndo(a);
    var x = a.split("-"), y = b.split("-");
    if (x[0] === y[0] && x[1] === y[1]) return +x[2] + " – " + +y[2] + " " + BULAN_NAMA[+x[1] - 1] + " " + x[0];
    if (x[0] === y[0]) return +x[2] + " " + BULAN_NAMA[+x[1] - 1] + " – " + +y[2] + " " + BULAN_NAMA[+y[1] - 1] + " " + x[0];
    return tglIndo(a) + " – " + tglIndo(b);
  }
  function normKategori(mentah) {
    var k = (mentah || "").toLowerCase().replace(/[^a-z]/g, "");
    return ALIAS_KAT[k] || k || "lainnya";
  }
  function labelKategori(k) {
    var f = CFG.kategori.filter(function (x) { return x.k === k; })[0];
    return f ? f.l : k;
  }

  function satuBaris(t) { return (t || "").replace(/\s*[\r\n]+\s*/g, " ").trim(); }
  function amanKunci(baris) {
    /* Baris lanjutan yang kebetulan berbentuk "judul: ..." akan dibaca sebagai kolom baru: beri penanda tak terlihat. */
    var m = baris.match(/^\s*([A-Za-z_ ]{2,20}?)\s*[:=]/);
    return m && KUNCI[m[1].trim().toLowerCase().replace(/[\s_]+/g, "_")] ? "​" + baris : baris;
  }
  function tulisParagraf(kunci, teks) {
    var paras = (teks || "").split(/\r?\n\s*\r?\n/).map(satuBaris).filter(Boolean);
    if (!paras.length) return "";
    return kunci + ": " + paras[0] + paras.slice(1).map(function (p) { return "\n\n" + amanKunci(p); }).join("") + "\n";
  }
  function buatInfo(f) {
    var o = [
      "# Dibuat/diubah lewat Panel Admin website. Boleh juga diedit manual di GitHub.\n",
      "judul: " + satuBaris(f.judul) + "\n",
      "kategori: " + satuBaris(f.kategori) + "\n"
    ];
    if (f.klien !== undefined && satuBaris(f.klien)) o.push("klien: " + satuBaris(f.klien) + "\n");
    if (satuBaris(f.mal)) o.push("mal: " + satuBaris(f.mal) + "\n");
    if (satuBaris(f.kota)) o.push("kota: " + satuBaris(f.kota) + "\n");
    if (f.mulai) {
      var a = f.mulai, b = f.selesai && f.selesai >= a ? f.selesai : a;
      o.push("periode: " + (a === b ? tglIndo(a) : tglIndo(a) + " sd " + tglIndo(b)) + "\n");
    }
    o.push("\n");
    var d = tulisParagraf("deskripsi", f.deskripsi);
    if (d) o.push(d + "\n");
    if (satuBaris(f.judul_en)) o.push("judul_en: " + satuBaris(f.judul_en) + "\n");
    var de = tulisParagraf("deskripsi_en", f.deskripsi_en);
    if (de) o.push(de);
    return o.join("");
  }
  function urutAlami(a, b) {
    var x = a.toLowerCase().split(/(\d+)/), y = b.toLowerCase().split(/(\d+)/);
    for (var i = 0; i < Math.min(x.length, y.length); i++) {
      var p = x[i], q = y[i];
      if (p === q) continue;
      if (i % 2 === 1) return (+p) - (+q);
      return p < q ? -1 : 1;
    }
    return x.length - y.length;
  }
  function slugTeks(s, maks) {
    var t = (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return (t.slice(0, maks || 40).replace(/-+$/, "")) || "item";
  }

  /* ------------------------------------------------------------ data repo */
  async function muatPohon() {
    var t = await gh("/repos/" + S.repo + "/git/trees/" + enc(S.branch) + "?recursive=1");
    S.pohon = t.tree || [];
    if (t.truncated) info("Repo terlalu besar: daftar mungkin tidak lengkap.", "salah");
    var hasil = {};
    Object.keys(JENIS).forEach(function (j) {
      var awal = JENIS[j].folder + "/", grup = {};
      S.pohon.forEach(function (n) {
        if (n.type !== "blob" || n.path.indexOf(awal) !== 0) return;
        var sisa = n.path.slice(awal.length), i = sisa.indexOf("/");
        if (i < 1) return;
        var dir = sisa.slice(0, i);
        if (dir.charAt(0) === "." || /^_template$/i.test(dir)) return;
        (grup[dir] = grup[dir] || []).push({ path: n.path, nama: sisa.slice(i + 1), sha: n.sha, size: n.size });
      });
      hasil[j] = Object.keys(grup).sort().map(function (dir) {
        var berkas = grup[dir].filter(function (f) { return f.nama.indexOf("/") < 0; });
        var txt = berkas.filter(function (f) { return /\.txt$/i.test(f.nama); }).sort(function (a, b) { return urutAlami(a.nama, b.nama); })[0];
        var fotos = berkas.filter(function (f) { return EKS_FOTO.test(f.nama); }).sort(function (a, b) { return urutAlami(a.nama, b.nama); });
        return { jenis: j, dir: dir, tersembunyi: dir.charAt(0) === "_", info: txt || null, foto: fotos, semua: grup[dir], data: null };
      });
    });
    S.data = hasil;
    var semua = [];
    Object.keys(JENIS).forEach(function (j) { S.data[j].forEach(function (it) { if (it.info) semua.push(it); }); });
    await paralel(semua, 6, async function (it) {
      var b = await gh("/repos/" + S.repo + "/git/blobs/" + it.info.sha);
      it.data = olahInfo(it, bacaTeksBlob(b.content));
    });
    S.data.event.forEach(function (it) { if (!it.data) it.data = olahInfo(it, ""); });
    S.data.proyek.forEach(function (it) { if (!it.data) it.data = olahInfo(it, ""); });
    await muatDok();
  }
  function bacaTeksBlob(b64) {
    var bin = atob(b64.replace(/\s/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch (e) { return new TextDecoder("windows-1252").decode(bytes); }
  }
  function olahInfo(it, teks) {
    var i = bacaInfo(teks), g = function (k) { return (i[k] || []).join(" ").trim(); };
    var d = {
      judul: g("judul"), kategori: normKategori(g("kategori")), kategoriMentah: g("kategori"),
      klien: g("klien"), mal: g("mal"), kota: g("kota"),
      deskripsi: (i.deskripsi || []).join("\n\n"), judul_en: g("judul_en"), deskripsi_en: (i.deskripsi_en || []).join("\n\n"),
      mulai: "", selesai: "", masalah: ""
    };
    try {
      if (i.periode && i.periode.length) { var p = uraiPeriode(i.periode.join(" ")); d.mulai = p[0]; d.selesai = p[1]; }
      else if (i.mulai && i.mulai.length) {
        d.mulai = uraiPeriode(i.mulai.join(" "))[0];
        d.selesai = i.selesai && i.selesai.length ? uraiPeriode(i.selesai.join(" "))[0] : d.mulai;
      }
    } catch (e) { d.masalah = "Periode di file ini tidak terbaca (" + e.message + "). Pilih tanggal lagi lalu simpan."; }
    if (!d.mulai && it.jenis === "proyek") {
      var m = it.dir.match(/^_?(\d{4})-(\d{2})-(\d{2})/);
      if (m) d.mulai = d.selesai = isoOk(+m[1], +m[2], +m[3]);
    }
    if (!d.judul) d.judul = it.dir.replace(/^_?\d{4}-\d{2}-\d{2}[ _-]*/, "").replace(/[-_]+/g, " ").trim();
    return d;
  }
  function statusItem(d) {
    var h0 = hariIni();
    if (!d.mulai) return "selesai";
    return h0 < d.mulai ? "akan" : (h0 > (d.selesai || d.mulai) ? "selesai" : "jalan");
  }

  /* --------------------------------------------------------------- login */
  function layarMasuk(pesan) {
    hapusBar();
    var inputToken = h("input", { type: "password", id: "i-token", autocomplete: "off", spellcheck: "false", placeholder: "github_pat_…", required: true });
    var inputRepo = h("input", { type: "text", id: "i-repo", value: bacaLokal(K_REPO) || CFG.repo, autocomplete: "off", spellcheck: "false" });
    var ingat = h("input", { type: "checkbox", id: "i-ingat" });
    var tombol = h("button", { class: "tb tb-emas", type: "submit", text: "Masuk" });
    var galat = h("p", { class: "galat", role: "alert", hidden: !pesan, text: pesan || "" });
    var form = h("form", { class: "kartu masuk", onsubmit: async function (ev) {
      ev.preventDefault();
      galat.hidden = true;
      tombol.disabled = true; tombol.textContent = "Memeriksa…";
      try { await masuk(inputToken.value, inputRepo.value, ingat.checked); }
      catch (e) { galat.textContent = e.pesan || ramahError(e); galat.hidden = false; tombol.disabled = false; tombol.textContent = "Masuk"; }
    } },
      h("h1", { text: "Masuk sebagai admin" }),
      h("p", { class: "lead", text: "Kelola event, portofolio, foto galeri, dan tautan Instagram mal website WRS langsung dari browser." }),
      h("label", { class: "f", for: "i-token" }, h("span", { class: "f-l", text: "Kunci akses GitHub" }), inputToken,
        h("small", { text: "Kode panjang berawalan github_pat_. Diberikan oleh pemilik website. Jangan dibagikan lewat grup." })),
      h("label", { class: "cek" }, ingat, h("span", { text: "Ingat di perangkat ini (hanya untuk komputer/HP pribadi)" })),
      h("details", { class: "lanjut" }, h("summary", { text: "Pengaturan repo" }),
        h("label", { class: "f", for: "i-repo" }, h("span", { class: "f-l", text: "Repo GitHub (pemilik/nama)" }), inputRepo)),
      galat, tombol,
      bantuanToken()
    );
    tampilkan(h("div", { class: "tengah" }, form));
    inputToken.focus();
  }
  function bantuanToken() {
    return h("details", { class: "bantuan" },
      h("summary", { text: "Belum punya kunci akses? Cara membuatnya (untuk pemilik website)" }),
      h("ol", null,
        h("li", null, "Buka ", h("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener noreferrer", text: "github.com/settings/personal-access-tokens/new" }), " dan masuk ke akun GitHub."),
        h("li", { text: "Token name: Admin website WRS. Expiration: 90 days." }),
        h("li", { text: "Repository access: Only select repositories, lalu pilih repo website ini." }),
        h("li", { text: "Permissions → Repository permissions: Contents = Read and write. Tambahkan Actions = Read-only supaya panel bisa menampilkan proses pembangunan website." }),
        h("li", { text: "Klik Generate token, salin kodenya, lalu tempel di kolom di atas." })
      ),
      h("p", { class: "kecil", text: "Kunci ini setara akses tulis ke repo website. Simpan di pengelola kata sandi, dan cabut lewat pengaturan GitHub jika hilang." })
    );
  }

  async function masuk(token, repo, ingat) {
    token = (token || "").trim(); repo = (repo || "").trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/\/+$/, "");
    if (!token) throw Object.assign(new Error("x"), { pesan: "Tempel kunci akses terlebih dahulu." });
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw Object.assign(new Error("x"), { pesan: "Nama repo harus berbentuk pemilik/nama, contoh: mhmdsablikmbipi-web/wrs-static." });
    S.token = token; S.repo = repo;
    var user = await gh("/user");
    var r = await gh("/repos/" + repo);
    if (!r.permissions || !r.permissions.push) {
      S.token = "";
      throw Object.assign(new Error("x"), { pesan: "Kunci akses ini hanya bisa membaca repo. Buat kunci baru dengan izin Contents: Read and write." });
    }
    S.user = user; S.branch = r.default_branch || "main";
    simpanLokal(K_TOKEN, token, ingat); simpanLokal(K_REPO, repo, ingat);
    await masukSelesai();
  }
  async function masukSelesai() {
    isiBar();
    tampilkan(h("div", { class: "tengah" }, h("div", { class: "memuat" }, h("div", { class: "kerangka" }), h("p", { text: "Memuat data website…" }))));
    try { await muatPohon(); }
    catch (e) { info(ramahError(e), "salah"); return layarMasuk(ramahError(e)); }
    tampilDaftar();
  }
  function keluar() {
    hapusLokal(K_TOKEN);
    S.token = ""; S.user = null; S.pohon = []; E = null; kotorEditor = false;
    lepasUrl(S.draf.kegiatan); lepasUrl(S.draf.porto);
    S.draf = { kegiatan: [], porto: [], sembunyi: [], ig: {} }; S.awal = { kegiatan: "[]", porto: "[]", sembunyi: "[]", ig: "[]" };
    S.dok = { galeri: {}, ig: {}, galat: [] }; S.igBuka = {}; S.tab = "ringkas";
    layarMasuk();
  }
  function hapusBar() { kosongkan(bar); bar.hidden = true; }
  function isiBar() {
    kosongkan(bar); bar.hidden = false;
    bar.appendChild(h("span", { class: "akun" },
      S.user && S.user.avatar_url ? h("img", { src: S.user.avatar_url + (S.user.avatar_url.indexOf("?") < 0 ? "?s=48" : ""), alt: "", width: 24, height: 24 }) : null,
      h("span", { text: S.user ? S.user.login : "" })));
    bar.appendChild(h("button", { class: "tb tb-garis kecil", type: "button", text: "Keluar", onclick: async function () {
      if ((kotorEditor || kotorSemua()) && !(await konfirmasi("Keluar tanpa menyimpan?", "Ada perubahan yang belum disimpan dan akan hilang.", "Tetap keluar", true))) return;
      keluar();
    } }));
  }

  /* -------------------------------------------------------------- daftar */
  function kartuItem(it) {
    var d = it.data, st = statusItem(d), jenis = it.jenis;
    var lokasi = [d.klien, d.mal, d.kota].filter(Boolean).join(" · ");
    var thumb = it.foto[0]
      ? h("img", { class: "th", src: rawUrl(it.foto[0].path), alt: "", loading: "lazy", onerror: function (e) { e.target.replaceWith(h("div", { class: "th kos", text: "Foto" })); } })
      : h("div", { class: "th kos", text: "Belum ada foto" });
    return h("article", { class: "item" + (it.tersembunyi ? " sembunyi" : "") },
      thumb,
      h("div", { class: "item-isi" },
        h("div", { class: "lencana" },
          jenis === "event" ? h("span", { class: "badge st-" + st, text: { jalan: "Sedang berlangsung", akan: "Akan datang", selesai: "Selesai" }[st] }) : null,
          h("span", { class: "tag", text: labelKategori(d.kategori) }),
          it.tersembunyi ? h("span", { class: "tag abu", text: "Disembunyikan" }) : null),
        h("h3", { text: d.judul || it.dir }),
        h("p", { class: "meta", text: [periodeIndo(d.mulai, d.selesai), lokasi].filter(Boolean).join(" · ") || "—" }),
        h("p", { class: "meta", text: it.foto.length + " foto" }),
        h("div", { class: "aksi" },
          h("button", { class: "tb tb-emas kecil", type: "button", text: "Tambah foto", onclick: function () { bukaEditor(jenis, it, true); } }),
          h("button", { class: "tb tb-garis kecil", type: "button", text: "Ubah", onclick: function () { bukaEditor(jenis, it); } }),
          h("button", { class: "tb tb-garis kecil", type: "button", text: it.tersembunyi ? "Tampilkan" : "Sembunyikan", onclick: function () { ubahTampil(it); } }),
          h("button", { class: "tb tb-bahaya kecil", type: "button", text: "Hapus", onclick: function () { hapusItem(it); } })
        )));
  }
  function rawUrl(path) {
    return "https://raw.githubusercontent.com/" + S.repo + "/" + enc(S.branch) + "/" + path.split("/").map(enc).join("/");
  }

  async function ubahTampil(it) {
    var awal = JENIS[it.jenis].folder + "/";
    var dirBaru = it.tersembunyi ? it.dir.replace(/^_+/, "") : "_" + it.dir;
    if (S.data[it.jenis].some(function (x) { return x.dir === dirBaru; })) return info("Sudah ada folder dengan nama " + dirBaru + ".", "salah");
    var entri = [];
    it.semua.forEach(function (f) {
      entri.push({ path: awal + dirBaru + "/" + f.nama, sha: f.sha });
      entri.push({ path: f.path, hapus: true });
    });
    await jalankanSimpan((it.tersembunyi ? "Tampilkan " : "Sembunyikan ") + JENIS[it.jenis].nama.toLowerCase() + ": " + it.data.judul, entri,
      it.tersembunyi ? "Ditampilkan di website" : "Disembunyikan dari website");
  }
  async function hapusItem(it) {
    if (!(await konfirmasi("Hapus permanen?", "\"" + (it.data.judul || it.dir) + "\" beserta " + it.foto.length + " fotonya akan dihapus. Untuk sementara, lebih aman memakai Sembunyikan.", "Hapus", true))) return;
    var entri = it.semua.map(function (f) { return { path: f.path, hapus: true }; });
    await jalankanSimpan("Hapus " + JENIS[it.jenis].nama.toLowerCase() + ": " + it.data.judul, entri, "Dihapus");
  }

  /* -------------------------------------------------------------- editor */
  function bukaEditor(jenis, it, fokusFoto) {
    var d = it ? it.data : null;
    E = {
      jenis: jenis, item: it, fokusFoto: !!fokusFoto,
      f: {
        judul: d ? d.judul : "", kategori: d ? d.kategori : (CFG.kategori[0] || {}).k || "otomotif",
        klien: d ? d.klien : "", mal: d ? d.mal : "", kota: d ? d.kota : "",
        mulai: d ? d.mulai : (jenis === "event" ? hariIni() : ""), selesai: d ? d.selesai : "",
        deskripsi: d ? d.deskripsi : "", judul_en: d ? d.judul_en : "", deskripsi_en: d ? d.deskripsi_en : ""
      },
      kategoriMentah: d && !CFG.kategori.some(function (x) { return x.k === d.kategori; }) ? d.kategoriMentah : "",
      lama: it ? it.foto.map(function (f) { return { path: f.path, nama: f.nama, hapus: false }; }) : [],
      baru: [], memproses: 0, infoDirty: !it
    };
    kotorEditor = false;
    gambarEditor();
  }

  function gambarEditor() {
    var cfg = JENIS[E.jenis], f = E.f, jenis = E.jenis;
    var tandai = function () { kotorEditor = true; E.infoDirty = true; };
    function teks(kunci, atribut) {
      return h("input", Object.assign({ type: "text", value: f[kunci], autocomplete: "off", oninput: function (ev) { f[kunci] = ev.target.value; tandai(); } }, atribut || {}));
    }
    var opsiKat = CFG.kategori.map(function (k) { return h("option", { value: k.k, text: k.l }); });
    if (E.kategoriMentah) opsiKat.push(h("option", { value: E.kategoriMentah, text: E.kategoriMentah + " (dari file)" }));
    var pilihKat = h("select", { onchange: function (ev) { f.kategori = ev.target.value; tandai(); } }, opsiKat);
    pilihKat.value = E.kategoriMentah && f.kategori === normKategori(E.kategoriMentah) ? E.kategoriMentah : f.kategori;
    if (!pilihKat.value) pilihKat.value = "lainnya";
    f.kategori = pilihKat.value;

    var daftarMal = h("datalist", { id: "dl-mal" }, CFG.mal.map(function (m) { return h("option", { value: m.n, label: m.k }); }));
    var inMal = teks("mal", { list: "dl-mal", placeholder: "Contoh: Margo City" });
    var inKota = teks("kota", { placeholder: "Contoh: Depok" });
    function isiKota() {
      var m = CFG.mal.filter(function (x) { return x.n.toLowerCase() === inMal.value.trim().toLowerCase(); })[0];
      if (m && !inKota.value) { inKota.value = m.k; f.kota = m.k; }
    }
    inMal.addEventListener("input", isiKota);
    inMal.addEventListener("change", isiKota);
    var inMulai = h("input", { type: "date", value: f.mulai, required: cfg.wajibTanggal, onchange: function (ev) { f.mulai = ev.target.value; tandai(); } });
    var inSelesai = h("input", { type: "date", value: f.selesai, onchange: function (ev) { f.selesai = ev.target.value; tandai(); } });
    var inDesk = h("textarea", { rows: 5, oninput: function (ev) { f.deskripsi = ev.target.value; tandai(); }, placeholder: "Tulis penjelasan singkat. Baris kosong membuat paragraf baru." });
    inDesk.value = f.deskripsi;
    var inDeskEn = h("textarea", { rows: 4, oninput: function (ev) { f.deskripsi_en = ev.target.value; tandai(); } });
    inDeskEn.value = f.deskripsi_en;

    var kotakLama = h("div", { class: "foto-grid" });
    var kotakBaru = h("div", { class: "foto-grid" });
    var ringkas = h("p", { class: "meta", "aria-live": "polite" });
    var tombolSimpan = h("button", { class: "tb tb-emas besar", type: "submit", text: "Simpan dan tayangkan" });

    function segarkan() {
      kosongkan(kotakLama);
      E.lama.forEach(function (l) {
        kotakLama.appendChild(h("figure", { class: "fk" + (l.hapus ? " dihapus" : "") },
          h("img", { src: rawUrl(l.path), alt: "", loading: "lazy", onerror: function (e) { e.target.style.display = "none"; } }),
          h("figcaption", { text: l.nama }),
          h("button", { class: "x", type: "button", "aria-label": (l.hapus ? "Batalkan hapus " : "Hapus ") + l.nama, text: l.hapus ? "↺" : "×",
            onclick: function () { l.hapus = !l.hapus; kotorEditor = true; segarkan(); } })));
      });
      kosongkan(kotakBaru);
      E.baru.forEach(function (b, i) {
        kotakBaru.appendChild(h("figure", { class: "fk baru" },
          b.url ? h("img", { src: b.url, alt: "" }) : h("div", { class: "memproses", text: "Menyiapkan…" }),
          h("figcaption", { text: b.url ? kb(b.blob.size) : b.nama }),
          h("button", { class: "x", type: "button", "aria-label": "Batalkan " + b.nama, text: "×", onclick: function () {
            if (b.url) URL.revokeObjectURL(b.url);
            E.baru.splice(i, 1); segarkan();
          } })));
      });
      var hapusN = E.lama.filter(function (l) { return l.hapus; }).length;
      var bagian = [];
      bagian.push(E.lama.length - hapusN + " foto tersimpan");
      if (E.baru.length) bagian.push(E.baru.length + " foto baru akan ditambahkan");
      if (hapusN) bagian.push(hapusN + " foto akan dihapus");
      ringkas.textContent = bagian.join(" · ");
      tombolSimpan.disabled = E.memproses > 0;
      tombolSimpan.textContent = E.memproses > 0 ? "Menyiapkan foto…" : "Simpan dan tayangkan";
    }

    var input = h("input", { type: "file", accept: "image/*", multiple: true, class: "tersembunyi", id: "i-foto", onchange: function (ev) { tambahFoto(ev.target.files, segarkan); ev.target.value = ""; } });
    var zona = h("label", { class: "zona", for: "i-foto", tabindex: "0",
      ondragover: function (ev) { ev.preventDefault(); zona.classList.add("on"); },
      ondragleave: function () { zona.classList.remove("on"); },
      ondrop: function (ev) { ev.preventDefault(); zona.classList.remove("on"); tambahFoto(ev.dataTransfer.files, segarkan); },
      onkeydown: function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); input.click(); } } },
      h("strong", { text: "Pilih foto atau seret ke sini" }),
      h("span", { text: "Bisa banyak sekaligus. Foto otomatis dikecilkan dan data lokasi (GPS) dihapus." }));

    var form = h("form", { class: "kartu editor", novalidate: true, onsubmit: function (ev) { ev.preventDefault(); simpanEditor(tombolSimpan); } },
      h("button", { class: "kembali", type: "button", text: "← Kembali ke daftar", onclick: async function () {
        if (kotorEditor && !(await konfirmasi("Kembali tanpa menyimpan?", "Perubahan di formulir ini belum disimpan.", "Tetap kembali", true))) return;
        bersihkanEditor(); tampilDaftar();
      } }),
      h("h1", { text: E.item ? "Ubah: " + (E.item.data.judul || E.item.dir) : cfg.baru }),
      E.item && E.item.data.masalah ? h("p", { class: "galat", text: E.item.data.masalah }) : null,
      h("div", { class: "baris2" },
        h("label", { class: "f" }, h("span", { class: "f-l", text: "Judul *" }), teks("judul", { placeholder: jenis === "event" ? "Contoh: Pameran Otomotif Margo City" : "Contoh: Bazaar Ramadan Season City" })),
        h("label", { class: "f" }, h("span", { class: "f-l", text: "Jenis" }), pilihKat)),
      jenis === "proyek" ? h("label", { class: "f" }, h("span", { class: "f-l", text: "Klien / brand (opsional)" }), teks("klien")) : null,
      h("div", { class: "baris2" },
        h("label", { class: "f" }, h("span", { class: "f-l", text: "Mal / lokasi" }), inMal, daftarMal),
        h("label", { class: "f" }, h("span", { class: "f-l", text: "Kota" }), inKota)),
      h("div", { class: "baris2" },
        h("label", { class: "f" }, h("span", { class: "f-l", text: jenis === "event" ? "Mulai *" : "Tanggal / mulai" }), inMulai),
        h("label", { class: "f" }, h("span", { class: "f-l", text: "Selesai" }), inSelesai, h("small", { text: "Kosongkan jika hanya satu hari." }))),
      h("label", { class: "f" }, h("span", { class: "f-l", text: "Deskripsi" }), inDesk),
      h("details", { class: "lanjut" }, h("summary", { text: "Versi bahasa Inggris (opsional)" }),
        h("label", { class: "f" }, h("span", { class: "f-l", text: "Judul (English)" }), teks("judul_en")),
        h("label", { class: "f" }, h("span", { class: "f-l", text: "Description (English)" }), inDeskEn),
        h("small", { text: "Jika kosong, halaman English memakai teks Indonesia." })),
      h("h2", { id: "bag-foto", text: "Foto" }),
      E.lama.length ? h("p", { class: "meta", text: "Foto yang sudah ada (tekan × untuk menandai dihapus):" }) : null,
      kotakLama, zona, input, kotakBaru, ringkas,
      h("div", { class: "simpan-baris" }, tombolSimpan,
        h("p", { class: "kecil", text: "Setelah disimpan, website diperbarui otomatis dalam 2–5 menit." }))
    );
    tampilkan(h("div", { class: "lebar sempit" }, form));
    segarkan();
    if (E.fokusFoto) { E.fokusFoto = false; var t = document.getElementById("bag-foto"); if (t) t.scrollIntoView({ block: "start" }); }
  }
  function bersihkanEditor() {
    if (E) E.baru.forEach(function (b) { if (b.url) URL.revokeObjectURL(b.url); });
    E = null; kotorEditor = false;
  }
  function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }

  function tambahFoto(files, segarkan) {
    var daftar = [].slice.call(files || []).filter(function (f) { return /^image\//.test(f.type) || EKS_FOTO.test(f.name); });
    if (!daftar.length) return info("Pilih file foto (JPG, PNG, atau WebP).", "salah");
    kotorEditor = true;
    daftar.forEach(function (file) {
      var slot = { nama: file.name, blob: null, url: "" };
      E.baru.push(slot); E.memproses++;
      var cur = E;
      kompres(file).then(function (blob) {
        slot.blob = blob; slot.url = URL.createObjectURL(blob);
      }).catch(function (e) {
        cur.baru.splice(cur.baru.indexOf(slot), 1);
        info("\"" + file.name + "\" dilewati: " + (e.message || "tidak bisa dibaca") + " Simpan ulang sebagai JPG lalu coba lagi.", "salah");
      }).then(function () { cur.memproses--; if (E === cur) segarkan(); });
    });
    segarkan();
  }

  /* Kecilkan foto di browser: sisi terpanjang 1800 px, JPEG. Hasilnya ratusan KB, bukan puluhan MB,
   * dan data EXIF (termasuk lokasi GPS) ikut terbuang. */
  async function kompres(file) {
    if (file.size > 40 * 1048576) throw new Error("ukuran terlalu besar (maks 40 MB).");
    var bmp, lebar, tinggi;
    try {
      bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      lebar = bmp.width; tinggi = bmp.height;
    } catch (e) {
      bmp = await new Promise(function (ok, gagal) {
        var url = URL.createObjectURL(file), im = new Image();
        im.onload = function () { URL.revokeObjectURL(url); ok(im); };
        im.onerror = function () { URL.revokeObjectURL(url); gagal(new Error("format foto tidak didukung browser ini.")); };
        im.src = url;
      });
      lebar = bmp.naturalWidth; tinggi = bmp.naturalHeight;
    }
    var skala = Math.min(1, 1800 / Math.max(lebar, tinggi));
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(lebar * skala)); c.height = Math.max(1, Math.round(tinggi * skala));
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    return new Promise(function (ok, gagal) {
      c.toBlob(function (b) { b ? ok(b) : gagal(new Error("gagal memproses foto.")); }, "image/jpeg", 0.84);
    });
  }

  function nomorFotoBerikut(lama) {
    var mx = 0;
    lama.forEach(function (l) { var m = l.nama.match(/^foto-(\d+)\./i); if (m) mx = Math.max(mx, +m[1]); });
    return mx + 1;
  }
  function folderBaru(jenis, f) {
    var tgl = f.mulai || hariIni();
    var dasar = tgl + "_" + slugTeks(jenis === "event" ? (f.mal || f.judul) : f.judul, 40);
    var ada = {}; S.data[jenis].forEach(function (x) { ada[x.dir.replace(/^_/, "")] = 1; });
    var nama = dasar, n = 2;
    while (ada[nama]) nama = dasar + "-" + n++;
    return nama;
  }

  async function simpanEditor(tombol) {
    var f = E.f, jenis = E.jenis, cfg = JENIS[jenis];
    if (!satuBaris(f.judul)) return info("Isi judul terlebih dahulu.", "salah");
    if (cfg.wajibTanggal && !f.mulai) return info("Pilih tanggal mulai event.", "salah");
    if (f.mulai && f.selesai && f.selesai < f.mulai) return info("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.", "salah");
    if (E.memproses > 0) return;
    var it = E.item, dir = it ? it.dir : folderBaru(jenis, f), dasar = cfg.folder + "/" + dir;
    var entri = [];
    if (!it || E.infoDirty) entri.push({ path: it && it.info ? it.info.path : dasar + "/info.txt", isi: buatInfo(f) });
    E.lama.forEach(function (l) { if (l.hapus) entri.push({ path: l.path, hapus: true }); });
    var no = nomorFotoBerikut(E.lama);
    E.baru.forEach(function (b) { if (b.blob) entri.push({ path: dasar + "/foto-" + pad(no++, 3) + ".jpg", isi: b.blob }); });
    if (!entri.length) return info("Belum ada yang diubah.", "salah");
    var pesan = (it ? "Ubah " : "Tambah ") + cfg.nama.toLowerCase() + ": " + satuBaris(f.judul);
    await jalankanSimpan(pesan, entri, it ? "Perubahan disimpan" : "Tersimpan");
  }

  /* ----------------------------------------------- simpan + pantau pembangunan */
  async function jalankanSimpan(pesan, entri, sukses, sesudah) {
    if (S.sibuk) return false;
    S.sibuk = true;
    var layar = h("div", { class: "tengah" });
    var judul = h("h1", { text: "Menyimpan…" });
    var batang = h("div", { class: "batang" }, h("i"));
    var langkah = h("ol", { class: "langkah" });
    var ket = h("p", { class: "lead", text: "Jangan tutup halaman ini." });
    layar.appendChild(h("div", { class: "kartu proses", role: "status", "aria-live": "polite" }, judul, ket, batang, langkah));
    tampilkan(layar);
    function langkahBaru(t, mode) { langkah.appendChild(h("li", { class: mode || "", text: t })); return langkah.lastChild; }
    var sha;
    try {
      sha = await komit(pesan, entri, function (p, t) { batang.firstChild.style.width = Math.round(p * 100) + "%"; ket.textContent = t; });
    } catch (e) {
      S.sibuk = false;
      info(ramahError(e), "salah");
      if (E) { gambarEditor(); } else { tampilDaftar(); }
      return false;
    }
    batang.firstChild.style.width = "100%";
    bersihkanEditor();   // sudah tersimpan: tidak ada lagi perubahan yang tertunda
    if (sesudah) sesudah();
    judul.textContent = sukses;
    ket.textContent = "Perubahan sudah di GitHub. Sekarang website sedang dibangun ulang.";
    langkahBaru("Tersimpan di GitHub", "ok");
    var lBangun = langkahBaru("Membangun halaman website…", "jalan");
    var lTayang = langkahBaru("Menayangkan ke internet…", "tunggu");
    var tombolLanjut = h("button", { class: "tb tb-emas", type: "button", text: "Kembali ke daftar", onclick: async function () {
      tombolLanjut.disabled = true; tombolLanjut.textContent = "Memuat…";
      try { await muatPohon(); } catch (e) { info(ramahError(e), "salah"); }
      S.sibuk = false; E = null; tampilDaftar();
    } });
    layar.firstChild.appendChild(tombolLanjut);
    S.sibuk = false;   // daftar boleh dibuka kapan saja; pemantauan berjalan di latar
    try {
      await pantau(sha, lBangun, lTayang, ket);
    } catch (e) {
      lBangun.className = "tunggu"; lTayang.className = "tunggu";
      ket.textContent = "Perubahan sudah tersimpan. Proses pembangunan tidak bisa dipantau dari sini (" + ramahError(e) + "), tetapi website tetap diperbarui otomatis dalam 2–5 menit.";
    }
    return true;
  }

  async function pantau(sha, lBangun, lTayang, ket) {
    var mulai = Date.now(), run = null;
    while (Date.now() - mulai < 8 * 60000) {
      await tunggu(4000);
      var r = await gh("/repos/" + S.repo + "/actions/runs?head_sha=" + sha + "&per_page=10");
      run = (r.workflow_runs || [])[0] || null;
      if (run && run.status === "completed") break;
      if (run) ket.textContent = "Membangun halaman website…";
    }
    if (!run) { lBangun.className = "tunggu"; ket.textContent = "Perubahan tersimpan. Website akan diperbarui dalam 2–5 menit."; return; }
    if (run.status !== "completed") { ket.textContent = "Pembangunan masih berjalan. Cek lagi beberapa menit lagi."; return; }
    if (run.conclusion !== "success") {
      lBangun.className = "gagal";
      ket.textContent = "";
      ket.appendChild(document.createTextNode("Pembangunan website gagal. Data Anda aman di GitHub. "));
      ket.appendChild(h("a", { href: run.html_url, target: "_blank", rel: "noopener noreferrer", text: "Lihat penyebabnya" }));
      return;
    }
    lBangun.className = "ok"; lTayang.className = "jalan";
    ket.textContent = "Menayangkan ke internet…";
    var t2 = Date.now();
    while (Date.now() - t2 < 4 * 60000) {
      await tunggu(5000);
      var r2 = await gh("/repos/" + S.repo + "/actions/runs?branch=" + enc(S.branch) + "&per_page=8");
      var pages = (r2.workflow_runs || []).filter(function (x) {
        return /pages/i.test(x.name || "") && new Date(x.created_at).getTime() >= new Date(run.updated_at).getTime() - 30000;
      })[0];
      if (pages && pages.status === "completed") {
        lTayang.className = pages.conclusion === "success" ? "ok" : "gagal";
        ket.textContent = pages.conclusion === "success" ? "Selesai. Buka halaman website dan tekan Ctrl + F5 untuk melihat hasilnya." : "Penayangan gagal. Coba lagi beberapa menit lagi.";
        return;
      }
      if (!pages && Date.now() - t2 > 100000) break;   // tidak ada proses penayangan terpisah yang terlihat
    }
    lTayang.className = "ok";
    ket.textContent = "Selesai dibangun. Jika perubahan belum terlihat, tunggu 1–2 menit lalu tekan Ctrl + F5.";
  }

  /* ================================================================ IKON, DIALOG, PRATINJAU */
  var SVGNS = "http://www.w3.org/2000/svg";
  var IKON = {
    ringkas: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
    event: ["M4 6h16v14H4z", "M4 10h16", "M8 3v5", "M16 3v5"],
    proyek: ["M3 8h18v12H3z", "M9 8V5h6v3", "M3 13h18"],
    kegiatan: ["M3 5h18v14H3z", "M3 16l5-5 4 4 3-3 6 6", "M9 9.5h.01"],
    porto: ["M12 3l9 5-9 5-9-5z", "M3 13l9 5 9-5"],
    ig: ["M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z", "M12 10m-2.5 0a2.5 2.5 0 105 0a2.5 2.5 0 10-5 0"],
    tambah: ["M12 5v14", "M5 12h14"],
    hapus: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13"],
    mata: ["M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z", "M12 12m-3 0a3 3 0 106 0a3 3 0 10-6 0"],
    matamati: ["M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z", "M4 4l16 16"],
    kiri: ["M15 6l-6 6 6 6"], kanan: ["M9 6l6 6-6 6"],
    ubah: ["M4 20h4L19 9l-4-4L4 16z"],
    luar: ["M14 4h6v6", "M20 4l-9 9", "M18 14v6H4V6h6"],
    unggah: ["M12 16V4", "M7 9l5-5 5 5", "M4 20h16"],
    cek: ["M5 12l5 5 9-10"],
    cari: ["M11 11m-7 0a7 7 0 1014 0a7 7 0 10-14 0", "M16 16l5 5"],
    ganti: ["M7 7h11l-3-3", "M17 17H6l3 3"],
    urung: ["M9 7L4 12l5 5", "M4 12h10a6 6 0 010 12"],
    peringatan: ["M12 4l9 16H3z", "M12 10v4", "M12 17h.01"]
  };
  function ikon(nama) {
    var s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "ik"); s.setAttribute("aria-hidden", "true");
    (IKON[nama] || []).forEach(function (d) {
      var p = document.createElementNS(SVGNS, "path"); p.setAttribute("d", d); s.appendChild(p);
    });
    return s;
  }
  function tb(teks, kelas, nama, onclick, extra) {
    return h("button", Object.assign({ class: "tb " + kelas, type: "button", onclick: onclick }, extra || {}),
      nama ? ikon(nama) : null, h("span", { text: teks }));
  }
  var uidN = 0;
  function uid() { return "x" + (++uidN); }
  function klon(o) { return JSON.parse(JSON.stringify(o)); }

  function dialog(judul, isi, tombol) {
    return new Promise(function (selesai) {
      var lama = document.activeElement, bg;
      function kunci(ev) { if (ev.key === "Escape") { ev.stopPropagation(); tutup(null); } }
      function tutup(v) {
        document.removeEventListener("keydown", kunci, true); bg.remove();
        if (lama && lama.focus) { try { lama.focus(); } catch (e) { /* abaikan */ } }
        selesai(v);
      }
      var btn = tombol.map(function (t) {
        return h("button", { class: "tb " + t.kelas, type: "button", text: t.teks, onclick: function () { tutup(t.nilai); } });
      });
      bg = h("div", { class: "modal-bg", onmousedown: function (ev) { if (ev.target === bg) tutup(null); } },
        h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": judul },
          h("h2", { text: judul }), isi, h("div", { class: "modal-aksi" }, btn)));
      document.addEventListener("keydown", kunci, true);
      document.body.appendChild(bg);
      btn[btn.length - 1].focus();
    });
  }
  function konfirmasi(judul, teks, oke, bahaya) {
    return dialog(judul, h("p", { class: "lead", text: teks }), [
      { teks: "Batal", kelas: "tb-garis", nilai: false },
      { teks: oke || "Ya", kelas: bahaya ? "tb-bahaya-isi" : "tb-emas", nilai: true }
    ]).then(function (v) { return v === true; });
  }
  function pratinjau(url, teks) {
    var lama = document.activeElement, bg;
    function kunci(ev) { if (ev.key === "Escape") { ev.stopPropagation(); tutup(); } }
    function tutup() {
      document.removeEventListener("keydown", kunci, true); bg.remove();
      if (lama && lama.focus) { try { lama.focus(); } catch (e) { /* abaikan */ } }
    }
    var img = h("img", { src: url, alt: teks || "Pratinjau foto" });
    var x = h("button", { class: "lb-x", type: "button", "aria-label": "Tutup pratinjau", text: "×", onclick: tutup });
    bg = h("div", { class: "lb", role: "dialog", "aria-modal": "true", "aria-label": "Pratinjau foto",
      onclick: function (ev) { if (ev.target !== img) tutup(); } }, x, img, teks ? h("p", { text: teks }) : null);
    document.addEventListener("keydown", kunci, true);
    document.body.appendChild(bg);
    x.focus();
  }
  function hitung(el, akhir) {
    var kurang = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (kurang || akhir < 2) { el.textContent = akhir; return; }
    var t0 = performance.now(), dur = 700;
    el.textContent = "0";
    function langkah(t) {
      var p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(akhir * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(langkah);
    }
    requestAnimationFrame(langkah);
  }
  function lalu(iso) {
    var m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 1) return "baru saja";
    if (m < 60) return m + " menit lalu";
    if (m < 1440) return Math.round(m / 60) + " jam lalu";
    return Math.round(m / 1440) + " hari lalu";
  }

  /* ================================================================ DATA GALERI & INSTAGRAM */
  var IG_RE = /^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?(?:\?[^\s#]*)?$/;
  function bersihUrl(daftar) {
    return daftar.map(function (u) { return String(u || "").trim(); }).filter(Boolean);
  }
  function bentukKeg(l) {
    return JSON.stringify(l.filter(function (x) { return !x.hapus; }).map(function (x) {
      return [x.baru || x.proses ? "+" + x.id : x.file, x.ket.trim(), x.ket_en.trim()];
    }));
  }
  function bentukPorto(l) {
    return JSON.stringify(l.filter(function (x) { return !x.hapus; }).map(function (x) {
      return [x.baru || x.proses ? "+" + x.id : x.file, x.ket.trim(), x.ket_en.trim(), x.kat];
    }));
  }
  function bentukSemb(a) { return JSON.stringify(a.slice().sort()); }
  function bentukIg(ig) {
    return JSON.stringify(Object.keys(ig).sort().map(function (k) { return [k, bersihUrl(ig[k].urls)]; })
      .filter(function (x) { return x[1].length; }));
  }
  function bentukBagian(b) {
    if (b === "kegiatan") return bentukKeg(S.draf.kegiatan);
    if (b === "porto") return bentukPorto(S.draf.porto) + "|" + bentukSemb(S.draf.sembunyi);
    return bentukIg(S.draf.ig);
  }
  function kotorBagian(b) {
    if (b !== "kegiatan" && b !== "porto" && b !== "ig") return false;
    var awal = b === "porto" ? S.awal.porto + "|" + S.awal.sembunyi : S.awal[b];
    return bentukBagian(b) !== awal;
  }
  function kotorSemua() { return ["kegiatan", "porto", "ig"].some(kotorBagian); }
  function lepasUrl(daftar) { daftar.forEach(function (x) { if (x.url) { try { URL.revokeObjectURL(x.url); } catch (e) { /* abaikan */ } } }); }
  function itemFoto(d, kat) {
    return { id: uid(), file: String(d.file), ket: String(d.ket || ""), ket_en: String(d.ket_en || ""), kat: kat ? String(d.kat || "lainnya") : "",
      baru: null, url: "", hapus: false, proses: false, nama: "" };
  }
  function resetDraf(b) {
    var g = S.dok.galeri || {};
    if (b === "kegiatan") {
      lepasUrl(S.draf.kegiatan);
      var src = Array.isArray(g.kegiatan) ? g.kegiatan : CFG.kegiatan_awal;
      S.draf.kegiatan = src.filter(function (d) { return d && d.file; }).map(function (d) { return itemFoto(d, false); });
      S.awal.kegiatan = bentukKeg(S.draf.kegiatan);
    } else if (b === "porto") {
      lepasUrl(S.draf.porto);
      var pf = g.portofolio && typeof g.portofolio === "object" ? g.portofolio : {};
      S.draf.porto = (Array.isArray(pf.tambah) ? pf.tambah : []).filter(function (d) { return d && d.file; }).map(function (d) { return itemFoto(d, true); });
      S.draf.sembunyi = (Array.isArray(pf.sembunyi) ? pf.sembunyi : []).filter(function (x) { return typeof x === "string"; });
      S.awal.porto = bentukPorto(S.draf.porto); S.awal.sembunyi = bentukSemb(S.draf.sembunyi);
    } else if (b === "ig") {
      var ig = S.dok.ig && typeof S.dok.ig === "object" && !Array.isArray(S.dok.ig) ? S.dok.ig : {};
      S.draf.ig = {};
      Object.keys(ig).forEach(function (nama) {
        var v = ig[nama], arr = Array.isArray(v) ? v : (typeof v === "string" ? [v] : []);
        var urls = arr.map(function (u) { return typeof u === "object" && u ? u.url : u; }).filter(function (u) { return typeof u === "string"; });
        var m = CFG.mal.filter(function (x) { return x.n.toLowerCase() === String(nama).trim().toLowerCase(); })[0];
        S.draf.ig[(m ? m.n : String(nama)).toLowerCase()] = { nama: m ? m.n : String(nama), urls: urls };
      });
      S.awal.ig = bentukIg(S.draf.ig);
    }
  }
  async function muatDok() {
    var node = function (p) { return S.pohon.filter(function (n) { return n.type === "blob" && n.path === p; })[0]; };
    S.dok = { galeri: {}, ig: {}, galat: [] };
    var nama = [["galeri", "data/galeri.json"], ["ig", "data/instagram.json"]];
    for (var i = 0; i < nama.length; i++) {
      var n = node(nama[i][1]);
      if (!n) continue;
      try {
        var b = await gh("/repos/" + S.repo + "/git/blobs/" + n.sha);
        var j = JSON.parse(bacaTeksBlob(b.content));
        if (j && typeof j === "object" && !Array.isArray(j)) S.dok[nama[i][0]] = j; else throw new Error("bentuk bukan objek");
      } catch (e) {
        S.dok.galat.push(nama[i][1] + " tidak terbaca (" + e.message + "). Isi lama akan diganti saat Anda menyimpan.");
      }
    }
    ["kegiatan", "porto", "ig"].forEach(function (b) { if (!kotorBagian(b)) resetDraf(b); });
  }

  /* ================================================================ KERANGKA + TAB */
  var TABS = [
    { k: "ringkas", n: "Ringkasan", i: "ringkas" },
    { k: "event", n: "Event", i: "event" },
    { k: "proyek", n: "Portofolio", i: "proyek" },
    { k: "kegiatan", n: "Galeri kegiatan", i: "kegiatan" },
    { k: "porto", n: "Galeri portofolio", i: "porto" },
    { k: "ig", n: "Instagram mal", i: "ig" }
  ];
  var isiTab = null, navTab = null, barAktif = null;

  function tampilDaftar() { E = null; kotorEditor = false; tampilShell(); }
  function tampilShell() {
    navTab = h("nav", { class: "nav-tab", "aria-label": "Bagian panel" });
    isiTab = h("div", { class: "isi-tab" });
    tampilkan(h("div", { class: "lebar" }, navTab, isiTab));
    segarNav(); gambarIsi(false);
  }
  function segarNav() {
    if (!navTab) return;
    kosongkan(navTab);
    TABS.forEach(function (t) {
      navTab.appendChild(h("button", { class: "nav-b" + (S.tab === t.k ? " on" : ""), type: "button", "aria-current": S.tab === t.k ? "page" : null,
        onclick: function () { pindahTab(t.k); } },
        ikon(t.i), h("span", { text: t.n }),
        kotorBagian(t.k) ? h("i", { class: "titik", title: "Ada perubahan yang belum disimpan" }) : null));
    });
  }
  function pindahTab(k) {
    if (S.tab === k) return;
    S.tab = k; segarNav(); gambarIsi(false); window.scrollTo(0, 0);
    isiTab.classList.remove("masuk"); void isiTab.offsetWidth; isiTab.classList.add("masuk");
  }
  function gambarIsi(jaga) {
    if (!isiTab) return;
    var y = window.scrollY;
    kosongkan(isiTab); barAktif = null;
    var fn = { ringkas: isiRingkas, event: isiDaftar, proyek: isiDaftar, kegiatan: isiKegiatan, porto: isiPorto, ig: isiIg }[S.tab];
    isiTab.appendChild(fn());
    if (jaga) window.scrollTo(0, y);
  }
  function perbaruiBar() { segarNav(); if (barAktif) barAktif.perbarui(); }

  /* ---- bilah simpan (galeri & Instagram) */
  function ringkasUbah(b) {
    var p = [], l;
    if (b === "kegiatan" || b === "porto") {
      l = b === "kegiatan" ? S.draf.kegiatan : S.draf.porto;
      var n = l.filter(function (x) { return x.baru || x.proses; }).length, d = l.filter(function (x) { return x.hapus; }).length;
      if (n) p.push(n + " foto baru");
      if (d) p.push(d + " foto dihapus");
      if (b === "porto") {
        var a = JSON.parse(S.awal.sembunyi), s = S.draf.sembunyi;
        var tamb = s.filter(function (x) { return a.indexOf(x) < 0; }).length, kur = a.filter(function (x) { return s.indexOf(x) < 0; }).length;
        if (tamb) p.push(tamb + " foto disembunyikan");
        if (kur) p.push(kur + " foto ditampilkan lagi");
      }
      if (!p.length) p.push("Urutan atau keterangan diubah");
    } else {
      var terisi = Object.keys(S.draf.ig).filter(function (k) { return bersihUrl(S.draf.ig[k].urls).length; }).length;
      p.push("Tautan Instagram diubah (" + terisi + " mal terisi)");
    }
    return p.join(" · ");
  }
  function sedangProses(b) {
    return (b === "kegiatan" && S.draf.kegiatan.some(function (x) { return x.proses; })) ||
      (b === "porto" && S.draf.porto.some(function (x) { return x.proses; }));
  }
  function jumlahIgSalah() {
    var n = 0;
    Object.keys(S.draf.ig).forEach(function (k) { bersihUrl(S.draf.ig[k].urls).forEach(function (u) { if (!IG_RE.test(u)) n++; }); });
    return n;
  }
  function barSimpan(b) {
    var ket = h("span", { class: "bs-ket" });
    var simpan = tb("Simpan dan tayangkan", "tb-emas", "cek", function () { simpanBagian(b); });
    var batal = tb("Batalkan perubahan", "tb-garis kecil", "urung", async function () {
      if (!(await konfirmasi("Batalkan perubahan?", "Semua perubahan di bagian ini yang belum disimpan akan dibuang.", "Ya, batalkan", true))) return;
      resetDraf(b); segarNav(); gambarIsi(true);
    });
    var bar = h("div", { class: "bs" }, h("div", { class: "bs-isi" }, ket, h("div", { class: "bs-aksi" }, batal, simpan)));
    bar.perbarui = function () {
      var k = kotorBagian(b), p = sedangProses(b), salah = b === "ig" ? jumlahIgSalah() : 0;
      bar.classList.toggle("on", k);
      ket.textContent = p ? "Menyiapkan foto…" : (salah ? salah + " tautan belum valid. Perbaiki dulu sebelum menyimpan." : (k ? ringkasUbah(b) : "Belum ada perubahan."));
      ket.classList.toggle("salah", !!salah);
      simpan.disabled = !k || p || !!salah; batal.disabled = !k;
    };
    bar.perbarui(); barAktif = bar;
    return bar;
  }

  /* ---- kartu foto yang bisa diseret / diganti / dihapus */
  var seret = null;
  function kartuFoto(it, daftar, i, opsi) {
    var src = it.baru ? it.url : (it.file ? rawUrl(it.file) : "");
    function pindah(dari, ke) {
      if (ke < 0 || ke >= daftar.length || dari === ke) return;
      daftar.splice(ke, 0, daftar.splice(dari, 1)[0]); opsi.segarkan(); opsi.ubah();
    }
    var kartu = h("article", { class: "fc" + (it.hapus ? " dihapus" : "") + (it.baru ? " baru" : ""), draggable: it.hapus || it.proses ? null : "true",
      ondragstart: function (ev) { seret = it.id; try { ev.dataTransfer.setData("text/plain", it.id); ev.dataTransfer.effectAllowed = "move"; } catch (e) { /* abaikan */ } kartu.classList.add("diseret"); },
      ondragend: function () { seret = null; kartu.classList.remove("diseret"); },
      ondragover: function (ev) { if (seret && seret !== it.id) { ev.preventDefault(); kartu.classList.add("tujuan"); } },
      ondragleave: function () { kartu.classList.remove("tujuan"); },
      ondrop: function (ev) {
        ev.preventDefault(); kartu.classList.remove("tujuan");
        var dari = daftar.map(function (x) { return x.id; }).indexOf(seret);
        seret = null;
        if (dari >= 0) pindah(dari, i);
      } });
    var gambar = it.proses
      ? h("div", { class: "fc-img memproses", text: "Menyiapkan…" })
      : h("button", { class: "fc-img", type: "button", "aria-label": "Perbesar foto " + (i + 1), onclick: function () { pratinjau(src, it.ket); } },
        h("img", { src: src, alt: "", loading: "lazy", draggable: "false", onerror: function (e) { e.target.replaceWith(h("span", { class: "fc-rusak", text: "Foto tidak tampil" })); } }));
    var inKet = h("input", { type: "text", value: it.ket, placeholder: "Keterangan (Indonesia)", "aria-label": "Keterangan foto " + (i + 1) + " (Indonesia)", maxlength: 120,
      oninput: function (ev) { it.ket = ev.target.value; opsi.ubah(); } });
    var inEn = h("input", { type: "text", value: it.ket_en, placeholder: "Caption (English, opsional)", "aria-label": "Caption foto " + (i + 1) + " (English)", maxlength: 120,
      oninput: function (ev) { it.ket_en = ev.target.value; opsi.ubah(); } });
    var pilihKat = null;
    if (opsi.kat) {
      pilihKat = h("select", { "aria-label": "Jenis foto " + (i + 1), onchange: function (ev) { it.kat = ev.target.value; opsi.ubah(); } },
        CFG.kategori.map(function (k) { return h("option", { value: k.k, text: k.l }); }));
      pilihKat.value = it.kat; if (!pilihKat.value) { pilihKat.value = "lainnya"; it.kat = "lainnya"; }
    }
    var ganti = h("input", { type: "file", accept: "image/*", class: "tersembunyi", "aria-label": "Pilih foto pengganti",
      onchange: function (ev) {
        var f = ev.target.files && ev.target.files[0]; ev.target.value = "";
        if (!f) return;
        it.proses = true; opsi.segarkan(); opsi.ubah();
        kompres(f).then(function (b) {
          if (it.url) { try { URL.revokeObjectURL(it.url); } catch (e) { /* abaikan */ } }
          it.baru = b; it.url = URL.createObjectURL(b); it.nama = f.name;
        }).catch(function (e) { info("\"" + f.name + "\" dilewati: " + (e.message || "tidak bisa dibaca"), "salah"); })
          .then(function () { it.proses = false; opsi.segarkan(); opsi.ubah(); });
      } });
    return (function () {
        kartu.appendChild(gambar);
        kartu.appendChild(h("span", { class: "fc-no", text: String(i + 1) }));
        if (it.baru) kartu.appendChild(h("span", { class: "fc-baru", text: "Baru" }));
        if (it.hapus) kartu.appendChild(h("span", { class: "fc-hapus", text: "Akan dihapus" }));
        kartu.appendChild(h("div", { class: "fc-isi" }, inKet, inEn, pilihKat));
        kartu.appendChild(h("div", { class: "fc-aksi" },
          h("button", { class: "ib", type: "button", "aria-label": "Geser ke kiri", title: "Geser ke kiri", disabled: i === 0, onclick: function () { pindah(i, i - 1); } }, ikon("kiri")),
          h("button", { class: "ib", type: "button", "aria-label": "Geser ke kanan", title: "Geser ke kanan", disabled: i === daftar.length - 1, onclick: function () { pindah(i, i + 1); } }, ikon("kanan")),
          h("label", { class: "ib", title: "Ganti dengan foto lain" }, ikon("ganti"), h("span", { class: "tersembunyi", text: "Ganti foto " + (i + 1) }), ganti),
          h("button", { class: "ib" + (it.hapus ? "" : " bahaya"), type: "button", "aria-label": it.hapus ? "Batalkan hapus" : "Hapus foto " + (i + 1), title: it.hapus ? "Batalkan hapus" : "Hapus foto",
            onclick: function () {
              if (it.baru || !it.file) { /* foto yang belum tersimpan: langsung buang */
                if (it.url) { try { URL.revokeObjectURL(it.url); } catch (e) { /* abaikan */ } }
                daftar.splice(daftar.indexOf(it), 1);
              } else it.hapus = !it.hapus;
              opsi.segarkan(); opsi.ubah();
            } }, ikon(it.hapus ? "urung" : "hapus"))));
        return kartu;
      })();
  }
  function zonaUnggah(idInput, aksi) {
    var input = h("input", { type: "file", accept: "image/*", multiple: true, class: "tersembunyi", id: idInput,
      onchange: function (ev) { aksi(ev.target.files); ev.target.value = ""; } });
    var zona = h("label", { class: "zona", for: idInput, tabindex: "0",
      ondragover: function (ev) { if (!seret) { ev.preventDefault(); zona.classList.add("on"); } },
      ondragleave: function () { zona.classList.remove("on"); },
      ondrop: function (ev) { if (seret) return; ev.preventDefault(); zona.classList.remove("on"); aksi(ev.dataTransfer.files); },
      onkeydown: function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); input.click(); } } },
      h("span", { class: "zona-ik" }, ikon("unggah")),
      h("strong", { text: "Tambah foto: pilih atau seret ke sini" }),
      h("span", { text: "Bisa banyak sekaligus. Foto otomatis dikecilkan dan data lokasi (GPS) dihapus." }));
    return h("div", null, zona, input);
  }
  function tambahFotoDaftar(files, daftar, dasar, segarkan, ubah) {
    var arr = [].slice.call(files || []).filter(function (f) { return /^image\//.test(f.type) || EKS_FOTO.test(f.name); });
    if (!arr.length) return info("Pilih file foto (JPG, PNG, atau WebP).", "salah");
    arr.forEach(function (file) {
      var it = Object.assign({ id: uid(), file: "", ket: "", ket_en: "", kat: "", baru: null, url: "", hapus: false, proses: true, nama: file.name }, dasar || {});
      daftar.push(it);
      kompres(file).then(function (b) { it.baru = b; it.url = URL.createObjectURL(b); it.proses = false; })
        .catch(function (e) {
          var k = daftar.indexOf(it); if (k >= 0) daftar.splice(k, 1);
          info("\"" + file.name + "\" dilewati: " + (e.message || "tidak bisa dibaca") + " Simpan ulang sebagai JPG lalu coba lagi.", "salah");
        }).then(function () { segarkan(); ubah(); });
    });
    segarkan(); ubah();
  }
  function kepalaBagian(judul, lead, kanan) {
    return h("div", { class: "kepala-daftar" }, h("div", null, h("h1", { text: judul }), h("p", { class: "lead", text: lead })), kanan || null);
  }

  /* ================================================================ RINGKASAN */
  function isiRingkas() {
    var ev = S.data.event.filter(function (x) { return !x.tersembunyi; });
    var jalan = ev.filter(function (x) { return statusItem(x.data) === "jalan"; });
    var akan = ev.filter(function (x) { return statusItem(x.data) === "akan"; });
    var proyek = S.data.proyek.filter(function (x) { return !x.tersembunyi; });
    var igN = CFG.mal.filter(function (m) { var d = S.draf.ig[m.n.toLowerCase()]; return d && bersihUrl(d.urls).length; }).length;
    var nama = S.user ? (S.user.name || S.user.login) : "";
    var chip = h("span", { class: "chip-bangun", hidden: true });
    var jam = new Date().getHours();
    var salam = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 18 ? "Selamat sore" : "Selamat malam";

    gh("/repos/" + S.repo + "/actions/runs?branch=" + enc(S.branch) + "&per_page=5").then(function (r) {
      var run = (r.workflow_runs || [])[0];
      if (!run) return;
      chip.hidden = false;
      if (run.status !== "completed") { chip.className = "chip-bangun jalan"; chip.textContent = "Website sedang diperbarui…"; }
      else if (run.conclusion === "success") { chip.className = "chip-bangun ok"; chip.textContent = "Website tayang · diperbarui " + lalu(run.updated_at); }
      else { chip.className = "chip-bangun gagal"; chip.textContent = "Pembangunan terakhir gagal"; }
    }).catch(function () { /* izin Actions tidak ada: lencana disembunyikan */ });

    function kartuStat(ik, angka, label, sub, tab) {
      var n = h("span", { class: "stat-n", text: "0" });
      var el = h("button", { class: "stat", type: "button", onclick: function () { pindahTab(tab); } },
        h("span", { class: "stat-ik" }, ikon(ik)), n, h("span", { class: "stat-l", text: label }), h("span", { class: "stat-s", text: sub }));
      hitung(n, angka);
      return el;
    }
    var stat = h("div", { class: "stat-grid" },
      kartuStat("event", jalan.length, "Event berlangsung", akan.length ? akan.length + " akan datang" : "Tidak ada yang akan datang", "event"),
      kartuStat("proyek", proyek.length, "Proyek portofolio", "Tampil di beranda", "proyek"),
      kartuStat("kegiatan", S.draf.kegiatan.filter(function (x) { return !x.hapus; }).length, "Foto galeri kegiatan", "Berjalan di beranda", "kegiatan"),
      kartuStat("ig", igN, "Mal dengan Instagram", "dari " + CFG.mal.length + " mal", "ig"));

    var cepat = h("div", { class: "cepat" },
      tb("Event baru", "tb-emas", "tambah", function () { bukaEditor("event", null); }),
      tb("Proyek baru", "tb-garis", "tambah", function () { bukaEditor("proyek", null); }),
      tb("Foto galeri", "tb-garis", "unggah", function () { pindahTab("kegiatan"); }),
      tb("Isi Instagram mal", "tb-garis", "ig", function () { pindahTab("ig"); }));

    var jalanDaftar = h("div", { class: "mini-daftar" });
    if (!jalan.length) jalanDaftar.appendChild(h("p", { class: "kosong", text: "Tidak ada event yang sedang berlangsung hari ini." }));
    jalan.slice(0, 5).forEach(function (it) {
      jalanDaftar.appendChild(h("div", { class: "mini" },
        h("div", null, h("strong", { text: it.data.judul || it.dir }),
          h("p", { class: "meta", text: [periodeIndo(it.data.mulai, it.data.selesai), it.data.mal].filter(Boolean).join(" · ") })),
        h("div", { class: "aksi" },
          tb("Tambah foto", "tb-emas kecil", "unggah", function () { bukaEditor("event", it, true); }),
          tb("Ubah", "tb-garis kecil", "ubah", function () { bukaEditor("event", it); }))));
    });

    var perhatian = [];
    jalan.forEach(function (it) {
      if (!it.foto.length) perhatian.push({ t: "Event \"" + (it.data.judul || it.dir) + "\" belum punya foto.", b: "Tambah foto", f: function () { bukaEditor("event", it, true); } });
    });
    ev.concat(proyek).forEach(function (it) {
      if (it.data.masalah) perhatian.push({ t: "\"" + (it.data.judul || it.dir) + "\": " + it.data.masalah, b: "Perbaiki", f: function () { bukaEditor(it.jenis, it); } });
    });
    if (igN < CFG.mal.length) perhatian.push({ t: (CFG.mal.length - igN) + " dari " + CFG.mal.length + " mal belum punya tautan Instagram.", b: "Isi sekarang", f: function () { pindahTab("ig"); } });
    S.dok.galat.forEach(function (t) { perhatian.push({ t: t, b: null }); });
    ["kegiatan", "porto", "ig"].forEach(function (b) {
      if (kotorBagian(b)) perhatian.push({ t: "Ada perubahan " + { kegiatan: "galeri kegiatan", porto: "galeri portofolio", ig: "Instagram mal" }[b] + " yang belum disimpan.", b: "Buka", f: function () { pindahTab(b); } });
    });
    var daftarPerhatian = h("ul", { class: "perhatian" });
    if (!perhatian.length) daftarPerhatian.appendChild(h("li", { class: "beres" }, ikon("cek"), h("span", { text: "Semuanya beres. Tidak ada yang perlu dikerjakan." })));
    perhatian.slice(0, 6).forEach(function (p) {
      daftarPerhatian.appendChild(h("li", null, ikon("peringatan"), h("span", { text: p.t }), p.b ? tb(p.b, "tb-garis kecil", null, p.f) : null));
    });

    return h("div", { class: "ringkas" },
      h("section", { class: "sambut" },
        h("div", null, h("p", { class: "sambut-s", text: salam + (nama ? "," : "") }), h("h1", { text: nama || "Admin WRS" }),
          h("p", { class: "lead", text: "Kelola event, portofolio, foto galeri, dan tautan Instagram website WRS dari satu tempat." }), chip),
        cepat),
      stat,
      h("div", { class: "dua-kolom" },
        h("section", { class: "kartu" }, h("h2", { text: "Sedang berlangsung" }), jalanDaftar),
        h("section", { class: "kartu" }, h("h2", { text: "Perlu perhatian" }), daftarPerhatian)),
      h("p", { class: "kecil tengah-teks" }, "Lihat hasilnya: ",
        h("a", { href: "index.html", target: "_blank", rel: "noopener", text: "Beranda" }), " · ",
        h("a", { href: "lokasi.html", target: "_blank", rel: "noopener", text: "Lokasi Mal" }), " · ",
        h("a", { href: "event.html", target: "_blank", rel: "noopener", text: "Artikel Event" })));
  }

  /* ================================================================ EVENT / PORTOFOLIO (daftar) */
  function isiDaftar() {
    var jenis = S.tab, cfg = JENIS[jenis];
    var kepala = kepalaBagian(jenis === "event" ? "Event" : "Portofolio terbaru",
      jenis === "event" ? "Perbarui event yang sedang berjalan, tambah foto dokumentasi, atau buat event baru."
        : "Tambahkan proyek terbaru beserta fotonya. Tampil di bagian Portofolio pada beranda website.",
      tb(cfg.baru, "tb-emas", "tambah", function () { bukaEditor(jenis, null); }));
    var cari = h("div", { class: "cari" }, ikon("cari"),
      h("input", { type: "text", placeholder: "Cari judul, mal, atau kota…", "aria-label": "Cari", oninput: function (ev) { q = ev.target.value.trim().toLowerCase(); render(); } }));
    var q = "";
    var isi = h("div", { class: "daftar" });
    var semua = S.data[jenis].slice().sort(function (a, b) { return ((b.data.mulai || "") + b.dir).localeCompare((a.data.mulai || "") + a.dir); });
    var tampilSemua = false;
    function cocok(it) {
      if (!q) return true;
      return [it.data.judul, it.data.mal, it.data.kota, it.data.klien, labelKategori(it.data.kategori)].join(" ").toLowerCase().indexOf(q) >= 0;
    }
    function render() {
      kosongkan(isi);
      var items = semua.filter(cocok);
      if (!semua.length) return isi.appendChild(h("p", { class: "kosong", text: cfg.kosong }));
      if (!items.length) return isi.appendChild(h("p", { class: "kosong", text: "Tidak ada yang cocok dengan pencarian." }));
      if (jenis !== "event") return items.forEach(function (it) { isi.appendChild(kartuItem(it)); });
      var grup = { jalan: [], akan: [], selesai: [] };
      items.forEach(function (it) { grup[statusItem(it.data)].push(it); });
      [["jalan", "Sedang berlangsung"], ["akan", "Akan datang"], ["selesai", "Selesai"]].forEach(function (g) {
        var arr = grup[g[0]];
        if (!arr.length) {
          if (g[0] === "jalan" && !q) isi.appendChild(h("section", { class: "grup" }, h("h2", { text: g[1] }), h("p", { class: "kosong", text: "Tidak ada event yang sedang berlangsung hari ini." })));
          return;
        }
        var batas = g[0] === "selesai" && !tampilSemua && !q;
        var tampil = batas ? arr.slice(0, 6) : arr;
        isi.appendChild(h("section", { class: "grup" }, h("h2", { text: g[1] + " (" + arr.length + ")" }),
          tampil.map(function (it) { return kartuItem(it); }),
          batas && arr.length > 6 ? tb("Tampilkan semua (" + arr.length + ")", "tb-garis", null, function () { tampilSemua = true; render(); }) : null));
      });
    }
    render();
    return h("div", null, kepala, semua.length > 4 ? cari : null, isi);
  }

  /* ================================================================ GALERI KEGIATAN */
  function isiKegiatan() {
    var grid = h("div", { class: "fc-grid" });
    var hit = h("p", { class: "meta", "aria-live": "polite" });
    function D() { return S.draf.kegiatan; }
    var opsi = { kat: false, segarkan: segar, ubah: perbaruiBar };
    function segar() {
      kosongkan(grid);
      D().forEach(function (it, i) { grid.appendChild(kartuFoto(it, D(), i, opsi)); });
      var aktif = D().filter(function (x) { return !x.hapus; }).length;
      hit.textContent = aktif + " foto di galeri kegiatan beranda" + (aktif === 1 ? " (disarankan minimal 4 supaya terlihat penuh)" : "");
      perbaruiBar();
    }
    var zona = zonaUnggah("i-foto-keg", function (files) { tambahFotoDaftar(files, D(), null, segar, perbaruiBar); });
    var bawaan = tb("Kembalikan ke foto bawaan", "tb-garis kecil", "urung", async function () {
      if (!(await konfirmasi("Kembalikan ke foto bawaan?", "Daftar foto diganti dengan foto bawaan website. Foto yang Anda unggah tidak dipakai lagi (setelah disimpan).", "Kembalikan", true))) return;
      lepasUrl(S.draf.kegiatan);
      S.draf.kegiatan = CFG.kegiatan_awal.map(function (d) { return itemFoto(d, false); });
      gambarIsi(true);
    });
    var node = h("div", { class: "gal" },
      kepalaBagian("Galeri kegiatan", "Foto yang berputar di bagian Galeri kegiatan pada beranda. Seret kartu untuk mengurutkan, atau pakai tombol panah. Keterangan tampil di bawah foto.", bawaan),
      zona, hit, grid);
    segar();
    node.appendChild(barSimpan("kegiatan"));
    return node;
  }

  /* ================================================================ GALERI PORTOFOLIO */
  function fotoOtomatis() {
    var r = [];
    CFG.porto_konten.forEach(function (p) { r.push({ src: p.src, kat: p.kat, judul: p.judul, asal: "Artikel event" }); });
    ["event", "proyek"].forEach(function (j) {
      S.data[j].forEach(function (it) {
        if (it.tersembunyi) return;
        it.foto.forEach(function (f) {
          r.push({ src: f.path, kat: it.data.kategori, judul: it.data.judul || it.dir, asal: j === "event" ? "Update event" : "Portofolio terbaru", item: it });
        });
      });
    });
    return r;
  }
  function isiPorto() {
    var gridT = h("div", { class: "fc-grid" });
    var hitT = h("p", { class: "meta", "aria-live": "polite" });
    function D() { return S.draf.porto; }
    var opsiT = { kat: true, segarkan: segarT, ubah: perbaruiBar };
    function segarT() {
      kosongkan(gridT);
      D().forEach(function (it, i) { gridT.appendChild(kartuFoto(it, D(), i, opsiT)); });
      var n = D().filter(function (x) { return !x.hapus; }).length;
      hitT.textContent = n ? n + " foto tambahan (tampil paling depan di galeri)" : "Belum ada foto tambahan. Foto yang Anda unggah di sini tampil paling depan.";
      perbaruiBar();
    }
    var zona = zonaUnggah("i-foto-porto", function (files) {
      tambahFotoDaftar(files, D(), { kat: (CFG.kategori[0] || {}).k || "lainnya" }, segarT, perbaruiBar);
    });

    var oto = fotoOtomatis(), saring = "semua";
    var gridO = h("div", { class: "fa-grid" });
    var hitO = h("p", { class: "meta", "aria-live": "polite" });
    var chips = h("div", { class: "chips-a", role: "group", "aria-label": "Saring foto otomatis" });
    function segarO() {
      var sb = S.draf.sembunyi;
      kosongkan(gridO); kosongkan(chips);
      var nSemb = oto.filter(function (f) { return sb.indexOf(f.src) >= 0; }).length;
      [["semua", "Semua (" + oto.length + ")"], ["tampil", "Tampil (" + (oto.length - nSemb) + ")"], ["sembunyi", "Disembunyikan (" + nSemb + ")"]].forEach(function (c) {
        chips.appendChild(h("button", { class: "chip-a" + (saring === c[0] ? " on" : ""), type: "button", "aria-pressed": saring === c[0] ? "true" : "false",
          text: c[1], onclick: function () { saring = c[0]; segarO(); } }));
      });
      oto.forEach(function (f) {
        var sem = sb.indexOf(f.src) >= 0;
        if ((saring === "tampil" && sem) || (saring === "sembunyi" && !sem)) return;
        gridO.appendChild(h("figure", { class: "fa" + (sem ? " sem" : "") },
          h("button", { class: "fa-img", type: "button", "aria-label": "Perbesar: " + f.judul, onclick: function () { pratinjau(rawUrl(f.src), f.judul); } },
            h("img", { src: rawUrl(f.src), alt: "", loading: "lazy", onerror: function (e) { e.target.style.display = "none"; } })),
          h("figcaption", null, h("strong", { text: f.judul }), h("span", { text: labelKategori(f.kat) + " · " + f.asal })),
          h("button", { class: "ib fa-mata", type: "button", "aria-pressed": sem ? "true" : "false",
            "aria-label": (sem ? "Tampilkan lagi: " : "Sembunyikan: ") + f.judul, title: sem ? "Tampilkan lagi di galeri" : "Sembunyikan dari galeri",
            onclick: function () {
              var k = S.draf.sembunyi.indexOf(f.src);
              if (k >= 0) S.draf.sembunyi.splice(k, 1); else S.draf.sembunyi.push(f.src);
              segarO(); perbaruiBar();
            } }, ikon(sem ? "matamati" : "mata")),
          sem ? h("span", { class: "fa-label", text: "Disembunyikan" }) : null));
      });
      if (!gridO.firstChild) gridO.appendChild(h("p", { class: "kosong", text: "Tidak ada foto pada saringan ini." }));
      hitO.textContent = "Galeri menampilkan maksimal " + CFG.galeri_maks + " foto. Foto otomatis berasal dari Artikel event, Update event, dan Portofolio terbaru. Untuk menghapus permanen, ubah event/proyek terkait.";
    }
    var node = h("div", { class: "gal" },
      kepalaBagian("Galeri portofolio", "Atur foto di bagian Portofolio pada beranda: tambah foto sendiri, ubah keterangan, urutkan, hapus, atau sembunyikan foto otomatis."),
      h("h2", { class: "sub-h", text: "Foto tambahan dari admin" }), zona, hitT, gridT,
      h("h2", { class: "sub-h", text: "Foto otomatis" }), chips, hitO, gridO);
    segarT(); segarO();
    node.appendChild(barSimpan("porto"));
    return node;
  }

  /* ================================================================ INSTAGRAM PER MAL */
  function isiIg() {
    var total = CFG.mal.length;
    var wilayah = []; CFG.mal.forEach(function (m) { if (wilayah.indexOf(m.k) < 0) wilayah.push(m.k); });
    var f = { q: "", w: "", s: "semua" };
    var daftar = h("div", { class: "ig-daftar" });
    var prog = h("div", { class: "ig-prog" });
    function terisi() { return CFG.mal.filter(function (m) { var d = S.draf.ig[m.n.toLowerCase()]; return d && bersihUrl(d.urls).length; }).length; }
    function segarProg() {
      var n = terisi(), p = Math.round(n / total * 100);
      kosongkan(prog);
      var bar = h("div", { class: "batang" }, h("i"));
      prog.appendChild(h("div", { class: "ig-prog-t" }, h("strong", { text: n + " dari " + total + " mal" }), h("span", { text: " sudah punya tautan Instagram (" + p + "%)" })));
      prog.appendChild(bar);
      requestAnimationFrame(function () { bar.firstChild.style.width = p + "%"; });
    }
    function baris(m) {
      var key = m.n.toLowerCase();
      var d = S.draf.ig[key] || (S.draf.ig[key] = { nama: m.n, urls: [] });
      var el = h("section", { class: "ig-b" });
      var badge;
      function hitBadge() {
        var n = bersihUrl(d.urls).length;
        badge.textContent = n ? n + " tautan" : "Belum ada"; badge.className = "ig-hit" + (n ? " ok" : "");
        el.classList.toggle("ada", !!n);
      }
      function segar(fokus) {
        kosongkan(el);
        var buka = !!S.igBuka[key];
        el.classList.toggle("buka", buka);
        badge = h("span", { class: "ig-hit" });
        el.appendChild(h("button", { class: "ig-kepala", type: "button", "aria-expanded": buka ? "true" : "false",
          onclick: function () { S.igBuka[key] = !S.igBuka[key]; segar(); } },
          h("span", { class: "ig-nama", text: m.n }), h("span", { class: "ig-wil", text: m.k }), badge, h("span", { class: "ig-pana", "aria-hidden": "true", text: "›" })));
        hitBadge();
        if (!buka) return;
        var panel = h("div", { class: "ig-panel" });
        if (!d.urls.length) d.urls.push("");
        var terakhir = null;
        d.urls.forEach(function (u, i) {
          var status = h("span", { class: "ig-st" });
          var buka2 = h("a", { class: "ib", target: "_blank", rel: "noopener noreferrer", title: "Uji tautan di tab baru", "aria-label": "Uji tautan " + (i + 1), hidden: true }, ikon("luar"));
          function nilai() {
            var v = (d.urls[i] || "").trim();
            if (!v) { status.textContent = ""; status.className = "ig-st"; buka2.hidden = true; return; }
            if (IG_RE.test(v)) { status.textContent = "✓ Valid"; status.className = "ig-st ok"; buka2.hidden = false; buka2.href = v; }
            else { status.textContent = "Bukan link postingan Instagram (contoh: instagram.com/p/…)"; status.className = "ig-st salah"; buka2.hidden = true; buka2.removeAttribute("href"); }
          }
          var inp = h("input", { type: "text", value: u, placeholder: "https://www.instagram.com/p/…", autocomplete: "off", spellcheck: "false", "aria-label": "Tautan Instagram " + (i + 1) + " untuk " + m.n,
            oninput: function (ev) { d.urls[i] = ev.target.value; nilai(); hitBadge(); perbaruiBar(); },
            onchange: function (ev) {
              var v = ev.target.value.trim();
              if (/^(www\.)?instagram\.com\//i.test(v)) { v = "https://" + v; ev.target.value = v; d.urls[i] = v; nilai(); perbaruiBar(); }
            },
            onpaste: function (ev) {
              var t = (ev.clipboardData && ev.clipboardData.getData("text")) || "";
              var bagian = t.split(/[\s,]+/).filter(Boolean);
              if (bagian.length > 1) { ev.preventDefault(); d.urls.splice.apply(d.urls, [i, 1].concat(bagian)); segar(); perbaruiBar(); }
            } });
          nilai(); terakhir = inp;
          panel.appendChild(h("div", { class: "ig-baris" },
            h("div", { class: "ig-in" }, inp, status), buka2,
            h("button", { class: "ib bahaya", type: "button", "aria-label": "Hapus tautan " + (i + 1), title: "Hapus tautan", onclick: function () { d.urls.splice(i, 1); segar(); perbaruiBar(); } }, ikon("hapus"))));
        });
        panel.appendChild(tb("Tambah tautan lain", "tb-garis kecil", "tambah", function () { d.urls.push(""); segar(true); perbaruiBar(); }));
        el.appendChild(panel);
        if (fokus && terakhir) terakhir.focus();
      }
      segar();
      return el;
    }
    function render() {
      kosongkan(daftar);
      var n = 0;
      CFG.mal.forEach(function (m) {
        var d = S.draf.ig[m.n.toLowerCase()], ada = d && bersihUrl(d.urls).length > 0;
        if (f.q && (m.n + " " + m.k).toLowerCase().indexOf(f.q) < 0) return;
        if (f.w && m.k !== f.w) return;
        if (f.s === "ada" && !ada) return;
        if (f.s === "belum" && ada) return;
        n++; daftar.appendChild(baris(m));
      });
      if (!n) daftar.appendChild(h("p", { class: "kosong", text: "Tidak ada mal yang cocok." }));
      segarProg();
    }
    var pilihW = h("select", { "aria-label": "Saring wilayah", onchange: function (ev) { f.w = ev.target.value; render(); } },
      h("option", { value: "", text: "Semua wilayah" }), wilayah.map(function (w) { return h("option", { value: w, text: w }); }));
    var chipS = h("div", { class: "chips-a", role: "group", "aria-label": "Saring status" });
    function segarChip() {
      kosongkan(chipS);
      [["semua", "Semua"], ["ada", "Sudah ada"], ["belum", "Belum ada"]].forEach(function (c) {
        chipS.appendChild(h("button", { class: "chip-a" + (f.s === c[0] ? " on" : ""), type: "button", "aria-pressed": f.s === c[0] ? "true" : "false", text: c[1],
          onclick: function () { f.s = c[0]; segarChip(); render(); } }));
      });
    }
    segarChip();
    var node = h("div", { class: "ig" },
      kepalaBagian("Instagram per mal", "Tempel link postingan Instagram @eo.wrs.id untuk proyek di setiap mal. Di halaman Lokasi Mal akan muncul tombol “Lihat di Instagram” di samping navigasi Google Maps."),
      prog,
      h("div", { class: "ig-alat" },
        h("div", { class: "cari" }, ikon("cari"), h("input", { type: "text", placeholder: "Cari nama mal…", "aria-label": "Cari mal", oninput: function (ev) { f.q = ev.target.value.trim().toLowerCase(); render(); } })),
        pilihW, chipS),
      daftar);
    render();
    node.appendChild(barSimpan("ig"));
    return node;
  }

  /* ================================================================ SIMPAN GALERI / INSTAGRAM */
  async function simpanBagian(b) {
    if (S.sibuk) return;
    var g = klon(S.dok.galeri || {}), entri = [], urut = 0;
    function unggah(it, sub) {
      var dasar = slugTeks((it.nama || "foto").replace(/\.[^.]+$/, ""), 24);
      var path = "galeri/" + sub + "/" + dasar + "-" + Date.now().toString(36) + (urut++) + ".jpg";
      entri.push({ path: path, isi: it.baru });
      return path;
    }
    function bersihkanLama(lama, baruDaftar, awalan) {
      var dipakai = {}; baruDaftar.forEach(function (d) { dipakai[d.file] = 1; });
      (Array.isArray(lama) ? lama : []).forEach(function (d) {
        if (d && typeof d.file === "string" && d.file.indexOf(awalan) === 0 && !dipakai[d.file]) entri.push({ path: d.file, hapus: true });
      });
    }
    var pesan, sukses;
    if (b === "kegiatan") {
      var aktif = S.draf.kegiatan.filter(function (x) { return !x.hapus; });
      if (!aktif.length) return info("Galeri kegiatan perlu minimal 1 foto.", "salah");
      var lamaKeg = g.kegiatan;
      g.kegiatan = aktif.map(function (x) {
        var o = { file: x.baru ? unggah(x, "kegiatan") : x.file, ket: x.ket.trim() };
        if (x.ket_en.trim()) o.ket_en = x.ket_en.trim();
        return o;
      });
      bersihkanLama(lamaKeg, g.kegiatan, "galeri/kegiatan/");
      pesan = "Ubah galeri kegiatan"; sukses = "Galeri kegiatan disimpan";
    } else if (b === "porto") {
      var lamaPf = g.portofolio && g.portofolio.tambah;
      g.portofolio = {
        tambah: S.draf.porto.filter(function (x) { return !x.hapus; }).map(function (x) {
          var o = { file: x.baru ? unggah(x, "portofolio") : x.file, kat: x.kat, ket: x.ket.trim() };
          if (x.ket_en.trim()) o.ket_en = x.ket_en.trim();
          return o;
        }),
        sembunyi: S.draf.sembunyi.slice().sort()
      };
      bersihkanLama(lamaPf, g.portofolio.tambah, "galeri/portofolio/");
      pesan = "Ubah galeri portofolio"; sukses = "Galeri portofolio disimpan";
    } else {
      var obj = {};
      Object.keys(S.draf.ig).sort().forEach(function (k) {
        var u = bersihUrl(S.draf.ig[k].urls);
        if (u.length) obj[S.draf.ig[k].nama] = u;
      });
      entri.push({ path: "data/instagram.json", isi: JSON.stringify(obj, null, 2) + "\n" });
      pesan = "Ubah tautan Instagram mal"; sukses = "Tautan Instagram disimpan";
    }
    if (b !== "ig") entri.push({ path: "data/galeri.json", isi: JSON.stringify(g, null, 2) + "\n" });
    await jalankanSimpan(pesan, entri, sukses, function () {
      if (b === "ig") S.dok.ig = JSON.parse(entri[entri.length - 1].isi); else S.dok.galeri = g;
      S.dok.galat = S.dok.galat.filter(function (t) { return t.indexOf(b === "ig" ? "instagram" : "galeri") < 0; });
      resetDraf(b);
    });
  }

  /* ---------------------------------------------------------------- awal */
  window.addEventListener("beforeunload", function (ev) {
    if (kotorEditor || S.sibuk || kotorSemua()) { ev.preventDefault(); ev.returnValue = ""; }
  });

  (async function awal() {
    var token = bacaLokal(K_TOKEN), repo = bacaLokal(K_REPO) || CFG.repo;
    var host = location.hostname.match(/^([^.]+)\.github\.io$/i), seg = location.pathname.split("/").filter(Boolean)[0];
    if (!bacaLokal(K_REPO) && host && seg && !/\./.test(seg)) repo = host[1] + "/" + seg;   // tebak dari alamat github.io
    if (!bacaLokal(K_REPO)) CFG.repo = repo;
    if (!token) return layarMasuk();
    tampilkan(h("div", { class: "tengah" }, h("p", { class: "memuat", text: "Memeriksa kunci akses…" })));
    var tahan = false;
    try { tahan = !!localStorage.getItem(K_TOKEN); } catch (e) { /* abaikan */ }
    try { await masuk(token, repo, tahan); }
    catch (e) { hapusLokal(K_TOKEN); layarMasuk(e.pesan || ramahError(e)); }
  })();
})();

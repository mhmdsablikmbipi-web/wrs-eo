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

  var S = { token: "", repo: "", branch: "", user: null, pohon: [], data: { event: [], proyek: [] }, tab: "event", sibuk: false };
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
      h("p", { class: "lead", text: "Panel ini dipakai untuk memperbarui event yang sedang berjalan dan menambah portofolio terbaru, langsung dari browser." }),
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
    tampilkan(h("div", { class: "tengah" }, h("p", { class: "memuat", text: "Memuat daftar event dan portofolio…" })));
    try { await muatPohon(); }
    catch (e) { info(ramahError(e), "salah"); return layarMasuk(ramahError(e)); }
    tampilDaftar();
  }
  function keluar() {
    hapusLokal(K_TOKEN);
    S.token = ""; S.user = null; S.pohon = []; E = null; kotorEditor = false;
    layarMasuk();
  }
  function hapusBar() { kosongkan(bar); bar.hidden = true; }
  function isiBar() {
    kosongkan(bar); bar.hidden = false;
    bar.appendChild(h("span", { class: "akun" },
      S.user && S.user.avatar_url ? h("img", { src: S.user.avatar_url + (S.user.avatar_url.indexOf("?") < 0 ? "?s=48" : ""), alt: "", width: 24, height: 24 }) : null,
      h("span", { text: S.user ? S.user.login : "" })));
    bar.appendChild(h("button", { class: "tb tb-garis kecil", type: "button", text: "Keluar", onclick: function () {
      if (kotorEditor && !confirm("Ada perubahan yang belum disimpan. Tetap keluar?")) return;
      keluar();
    } }));
  }

  /* -------------------------------------------------------------- daftar */
  function tampilDaftar() {
    E = null; kotorEditor = false;
    var jenis = S.tab, cfg = JENIS[jenis];
    var tabs = h("div", { class: "tabs", role: "tablist" }, Object.keys(JENIS).map(function (j) {
      return h("button", { class: "tab" + (j === jenis ? " on" : ""), type: "button", role: "tab", "aria-selected": j === jenis ? "true" : "false",
        text: JENIS[j].nama + " (" + S.data[j].length + ")", onclick: function () { S.tab = j; tampilDaftar(); } });
    }));
    var kepala = h("div", { class: "kepala-daftar" },
      h("div", null,
        h("h1", { text: jenis === "event" ? "Event" : "Portofolio terbaru" }),
        h("p", { class: "lead", text: jenis === "event"
          ? "Perbarui event yang sedang berjalan, tambah foto dokumentasi, atau buat event baru."
          : "Tambahkan proyek terbaru beserta fotonya. Tampil di halaman Portofolio website." })),
      h("button", { class: "tb tb-emas", type: "button", text: "+ " + cfg.baru, onclick: function () { bukaEditor(jenis, null); } }));
    var isi = h("div", { class: "daftar" });
    var items = S.data[jenis].slice().sort(function (a, b) {
      return ((b.data.mulai || "") + b.dir).localeCompare((a.data.mulai || "") + a.dir);
    });
    if (!items.length) isi.appendChild(h("p", { class: "kosong", text: cfg.kosong }));
    else if (jenis === "event") {
      var grup = { jalan: [], akan: [], selesai: [] };
      items.forEach(function (it) { grup[statusItem(it.data)].push(it); });
      var tampilSemua = false;
      var render = function () {
        kosongkan(isi);
        [["jalan", "Sedang berlangsung"], ["akan", "Akan datang"], ["selesai", "Selesai"]].forEach(function (g) {
          var arr = grup[g[0]];
          if (!arr.length) { if (g[0] === "jalan") isi.appendChild(h("section", { class: "grup" }, h("h2", { text: g[1] }), h("p", { class: "kosong", text: "Tidak ada event yang sedang berlangsung hari ini." }))); return; }
          var tampil = g[0] === "selesai" && !tampilSemua ? arr.slice(0, 6) : arr;
          isi.appendChild(h("section", { class: "grup" }, h("h2", { text: g[1] + " (" + arr.length + ")" }),
            tampil.map(function (it) { return kartuItem(it); }),
            g[0] === "selesai" && arr.length > 6 && !tampilSemua
              ? h("button", { class: "tb tb-garis", type: "button", text: "Tampilkan semua (" + arr.length + ")", onclick: function () { tampilSemua = true; render(); } }) : null));
        });
      };
      render();
    } else items.forEach(function (it) { isi.appendChild(kartuItem(it)); });
    tampilkan(h("div", { class: "lebar" }, tabs, kepala, isi));
  }

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
    if (!confirm("Hapus \"" + (it.data.judul || it.dir) + "\" beserta " + it.foto.length + " fotonya secara permanen?\n\nUntuk sementara, lebih aman memakai Sembunyikan.")) return;
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
      h("button", { class: "kembali", type: "button", text: "← Kembali ke daftar", onclick: function () {
        if (kotorEditor && !confirm("Perubahan belum disimpan. Tetap kembali?")) return;
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
  async function jalankanSimpan(pesan, entri, sukses) {
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

  /* ---------------------------------------------------------------- awal */
  window.addEventListener("beforeunload", function (ev) {
    if (kotorEditor || S.sibuk) { ev.preventDefault(); ev.returnValue = ""; }
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

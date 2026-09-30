"""
Pembuat website statis WRS.

Cara pakai:
    pip install -r requirements.txt     (sekali saja)
    python build.py                     (setiap selesai mengedit konten.py)
    python build.py --serve             (bangun lalu buka di http://localhost:8000)

Isi website diedit di konten.py, tampilan di assets/style.css.
Hasil build ada di folder docs/ (folder inilah yang dipublikasikan GitHub Pages).
"""

import json
import re
import shutil
import sys
from html import escape
from pathlib import Path
from urllib.parse import quote_plus

from PIL import Image

import konten as K

BASE = Path(__file__).resolve().parent
OUT = BASE / "docs"
IMG = OUT / "images"

FILE = {"home": "index.html", "event": "event.html", "lokasi": "lokasi.html", "kontak": "kontak.html"}
NAMA = K.PERUSAHAAN["nama"]
SITE = (K.SITE_URL.rstrip("/") + "/") if K.SITE_URL else ""

# =============================================================================
# FOTO: cari file, kecilkan, simpan ke docs/images/
# =============================================================================

_cache: dict = {}
HILANG: list = []


def slug(nama: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", Path(nama).stem.lower()).strip("-")


def cari_file(nama: str):
    for folder in (BASE / "foto", BASE / "images", BASE):
        if (folder / nama).is_file():
            return folder / nama
    return None


def punya_transparansi(im) -> bool:
    """True hanya kalau gambar benar-benar punya bagian transparan (mis. logo)."""
    if "transparency" in im.info:
        return True
    if im.mode in ("RGBA", "LA"):
        return im.getchannel("A").getextrema()[0] < 255
    return False


def img_url(nama: str, sisi: int = 1200) -> str:
    """Alamat foto di website. Kosong kalau file tidak ditemukan."""
    if not nama:
        return ""
    if nama.startswith(("http://", "https://")):
        return nama
    if nama in _cache:
        return _cache[nama]
    src = cari_file(nama)
    if not src:
        HILANG.append(nama)
        _cache[nama] = ""
        return ""
    im = Image.open(src)
    im.thumbnail((sisi, sisi))
    if punya_transparansi(im):
        nama_out = f"{slug(nama)}.png"
        im.convert("RGBA").save(IMG / nama_out, "PNG", optimize=True)
    else:
        nama_out = f"{slug(nama)}.webp"
        im.convert("RGB").save(IMG / nama_out, "WEBP", quality=82, method=6)
    _cache[nama] = f"images/{nama_out}"
    return _cache[nama]


def foto(nama: str, kelas: str, alt: str = "", lazy: bool = True) -> str:
    if not nama:
        return ""
    url = img_url(nama)
    if url:
        muat = ' loading="lazy"' if lazy else ""
        return f'<img class="{kelas}" src="{url}" alt="{escape(alt)}"{muat}>'
    return f'<div class="{kelas} slot"><span>Taruh foto di<br>foto/{escape(nama)}</span></div>'


# =============================================================================
# KOMPONEN KECIL
# =============================================================================

def tujuan(t: str) -> str:
    return FILE[t[5:]] if t.startswith("?hal=") else t


def tombol(teks: str, t: str, gaya: str) -> str:
    t = tujuan(t)
    luar = ' target="_blank" rel="noopener"' if t.startswith("http") else ""
    return f'<a class="btn {gaya}" href="{escape(t)}"{luar}>{escape(teks)}</a>'


def paragraf(daftar) -> str:
    return "".join(f"<p>{escape(p)}</p>" for p in daftar)


def tautan_telepon(teks: str) -> str:
    def ganti(m):
        nomor = re.sub(r"[^\d+]", "", m.group(1))
        return f'<a href="tel:{nomor}">{m.group(1)}</a>'
    return re.sub(r"([+\d(][\d()\s+-]{7,}\d)", ganti, escape(teks))


MAPS_URL = K.KANTOR_LINK or "https://www.google.com/maps/search/?api=1&query=" + quote_plus(K.KANTOR_QUERY)
MAPS_EMBED = "https://maps.google.com/maps?q=" + quote_plus(K.KANTOR_QUERY) + "&output=embed"
WA_URL = f"https://wa.me/{K.WA_NOMOR}?text={quote_plus(K.WA_PESAN)}"


def kerangka(kode: str, judul: str, deskripsi: str, isi: str, jsonld: str = "") -> str:
    logo = img_url(K.PERUSAHAAN["logo"], 512)
    aktif_file = FILE[kode]
    judul_penuh = NAMA if kode == "home" else f"{judul} | {NAMA}"
    on = ' class="on"'
    tautan = "".join(
        f'<a href="{FILE[k]}"{on if k == kode else ""}>{escape(t)}</a>' for t, k in K.MENU
    )
    og = (
        f'<meta property="og:type" content="website"><meta property="og:title" content="{escape(judul_penuh)}">'
        f'<meta property="og:description" content="{escape(deskripsi)}">'
    )
    kanon = ""
    if SITE:
        alamat = SITE if kode == "home" else SITE + aktif_file
        kanon = f'<link rel="canonical" href="{alamat}">'
        og += f'<meta property="og:url" content="{alamat}"><meta property="og:image" content="{SITE}{logo}">'
    ld = f'<script type="application/ld+json">{jsonld}</script>' if jsonld else ""
    return f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(judul_penuh)}</title>
<meta name="description" content="{escape(deskripsi)}">
{kanon}{og}
<link rel="icon" type="image/png" href="images/favicon.png">
<link rel="apple-touch-icon" href="images/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Instrument+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="assets/style.css">
{ld}
</head>
<body>
<div class="nav"><a class="brand" href="index.html"><img src="{logo}" alt="Logo {escape(NAMA)}"><span>{escape(NAMA)}</span></a><nav class="links">{tautan}</nav></div>
<main>
{isi}
</main>
<div class="foot">{escape(K.FOOTER)}</div>
<script src="assets/app.js" defer></script>
</body>
</html>
"""


def kepala(judul: str, sub: str) -> str:
    return f'<div class="phead"><div class="inner"><h1>{escape(judul)}</h1><p>{escape(sub)}</p></div></div>'


# =============================================================================
# HALAMAN
# =============================================================================

def halaman_home() -> str:
    logo = img_url(K.PERUSAHAAN["logo"], 512)
    galeri = "".join(
        f'<figure class="gal">{foto(f, "gal-img", ket, lazy=False)}<figcaption>{escape(ket)}</figcaption></figure>'
        for f, ket in K.GALERI_HOME
    )
    visi = "".join(f'<div class="val"><h3>{escape(j)}</h3><p>{escape(t)}</p></div>' for j, t in K.VISI)
    misi = "".join(f"<li>{escape(m)}</li>" for m in K.MISI)
    return f"""
<div class="hero"><div>
<h1>{escape(K.HERO['judul'])}</h1>
<p>{escape(K.HERO['deskripsi'])}</p>
{tombol(*K.HERO['tombol_utama'], 'gold')}{tombol(*K.HERO['tombol_kedua'], 'line')}
</div><img class="logo" src="{logo}" alt="Logo {escape(NAMA)}"></div>

<section class="sec"><div class="inner two">
<h2>{escape(K.PROFIL['judul'])}</h2>
<div>{paragraf(K.PROFIL['paragraf'])}{foto(K.PROFIL['foto'], 'foto-about', K.PROFIL['judul'])}</div>
</div></section>

<section class="sec" style="padding-top:0"><div class="inner pendiri">
{foto(K.PENDIRI['foto'], 'potret', K.PENDIRI['nama'])}
<div><h2>{escape(K.PENDIRI['nama'])}</h2>
<p class="jab">{escape(K.PENDIRI['jabatan'])}</p>{paragraf(K.PENDIRI['cerita'])}</div>
</div></section>

<section class="sec band"><div class="inner">
<h2>Visi kami</h2>
<div class="vals">{visi}</div>
<h2 style="margin-top:64px">Misi kami</h2>
<ul class="misi">{misi}</ul>
</div></section>

<section class="sec"><div class="inner two">
<h2>{escape(K.LATAR['judul'])}</h2>
<div>{paragraf(K.LATAR['paragraf'])}</div>
</div></section>

<section class="sec" style="padding-top:0"><div class="inner">
<h2 style="margin-bottom:36px">{escape(K.GALERI_JUDUL)}</h2>
<div class="marquee" style="--dur:{len(K.GALERI_HOME) * K.GALERI_DETIK}s">
<div class="track"><div class="set">{galeri}</div><div class="set" aria-hidden="true">{galeri}</div></div>
</div>
</div></section>
"""


def artikel_event(i: int, e: dict) -> str:
    kelas = "art rev" if i % 2 else "art"
    fotos = "".join(foto(f, "mo", e["judul"]) for f in e["foto"])
    return (
        f'<article class="{kelas}" id="{slug(e["judul"])}">'
        f'<div class="art-teks"><h2>{escape(e["judul"])}</h2>'
        f'<p class="lead">{escape(e["lead"])}</p>{paragraf(e["isi"])}</div>'
        f'<div class="mosaic">{fotos}</div></article>'
    )


def halaman_event() -> str:
    artikel = "".join(artikel_event(i, e) for i, e in enumerate(K.EVENT_TIPE))
    return kepala(K.EVENT_JUDUL, K.EVENT_DESKRIPSI) + (
        f'<section class="sec" style="padding-top:40px"><div class="inner">{artikel}</div></section>'
    )


def daftar_mal() -> tuple:
    total, hasil = 0, []
    for wilayah, grup in K.MAL:
        kelompok = []
        for label, kueri, daftar in grup:
            kartu = []
            for m in daftar:
                total += 1
                nama, q = m if isinstance(m, tuple) else (m, f"{m} {kueri}".strip())
                url = "https://www.google.com/maps/search/?api=1&query=" + quote_plus(q)
                cari = f"{nama} {label} {wilayah}".lower()
                kartu.append(
                    f'<a class="mal" href="{escape(url)}" target="_blank" rel="noopener" data-cari="{escape(cari)}">'
                    f'<span class="no">{total:02d}</span>{escape(nama)}</a>'
                )
            kelompok.append(
                f'<div class="kel"><h3 class="grp">{escape(label)}</h3><div class="malgrid">{"".join(kartu)}</div></div>'
            )
        hasil.append(f'<div class="wilayah"><h2 class="wil">{escape(wilayah)}</h2>{"".join(kelompok)}</div>')
    return "".join(hasil), total


def halaman_lokasi() -> tuple:
    daftar, total = daftar_mal()
    isi = kepala("Lokasi mal mitra WRS", f"{total} lokasi proyek WRS. Klik nama mal untuk membuka Google Maps.") + f"""
<section class="sec" style="padding-top:36px"><div class="inner">
<div class="cari" data-total="{total}">
<label for="cari">Cari mal atau wilayah</label>
<input id="cari" type="search" placeholder="Contoh: Season City atau Tangerang" autocomplete="off">
<p class="jumlah" id="jumlah" aria-live="polite">{total} lokasi</p>
</div>
{daftar}
<div class="kosong" id="kosong" hidden>Mal tidak ditemukan. Coba kata kunci lain.</div>
</div></section>
"""
    return isi, total


def halaman_kontak() -> str:
    alamat = "<br>".join(escape(b) for b in K.KONTAK["alamat"])
    telepon = "<br>".join(tautan_telepon(b) for b in K.KONTAK["telepon"])
    sosmed = "<br>".join(
        f'{escape(n)}: <a href="{escape(u)}" target="_blank" rel="noopener">{escape(t)}</a>' for n, t, u in K.SOSMED
    )
    email = escape(K.KONTAK["email"])
    return kepala(K.KONTAK["judul"], K.KONTAK["deskripsi"]) + f"""
<section class="kontak"><div class="inner cols">
<div>
<p class="ci"><b>Alamat kantor pusat</b><br>{alamat}</p>
<p class="ci"><b>Telepon</b><br>{telepon}</p>
<p class="ci"><b>Email</b><br><a href="mailto:{email}">{email}</a></p>
<p class="ci"><b>Sosial media</b><br>{sosmed}</p>
{tombol("Chat via WhatsApp", WA_URL, "wa")}
</div>
<div>
<iframe title="Peta kantor pusat WRS" src="{escape(MAPS_EMBED)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
{tombol("Buka di Google Maps", MAPS_URL, "gold")}
</div>
</div>
<div class="inner">
<h2 style="margin-top:48px">Kirim pesan lewat WhatsApp</h2>
<form class="form" id="form-wa" data-wa="{escape(K.WA_NOMOR)}">
<label>Nama<input name="nama" required autocomplete="name"></label>
<label>Nama usaha (boleh dikosongkan)<input name="usaha" autocomplete="organization"></label>
<label>Kebutuhan
<select name="butuh">
<option>Sewa space di mal</option>
<option>Pameran otomotif</option>
<option>Pameran multi produk</option>
<option>Pameran furniture</option>
<option>Bazaar</option>
<option>Konsultasi strategi gratis</option>
</select></label>
<label>Pesan<textarea name="pesan" required></textarea></label>
<button type="submit">Kirim lewat WhatsApp</button>
</form>
</div>
</section>
"""


def json_ld() -> str:
    data = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": NAMA,
        "foundingDate": "2003",
        "description": K.HERO["deskripsi"],
        "email": K.KONTAK["email"],
        "telephone": K.KONTAK["telepon"][0],
        "address": {
            "@type": "PostalAddress",
            "streetAddress": " ".join(K.KONTAK["alamat"]),
            "addressCountry": "ID",
        },
        "sameAs": [u for _, _, u in K.SOSMED],
    }
    if SITE:
        data["url"] = SITE
    return json.dumps(data, ensure_ascii=False)


# =============================================================================
# BUILD
# =============================================================================

def bersihkan() -> None:
    OUT.mkdir(exist_ok=True)
    for item in OUT.iterdir():
        if item.name == "CNAME":  # dipakai GitHub Pages untuk domain sendiri
            continue
        shutil.rmtree(item) if item.is_dir() else item.unlink()
    IMG.mkdir(parents=True)


def tulis(nama: str, isi: str) -> None:
    (OUT / nama).write_text(isi, encoding="utf-8")


def build() -> None:
    bersihkan()
    shutil.copytree(BASE / "assets", OUT / "assets")
    (OUT / ".nojekyll").write_text("")
    logo_src = cari_file(K.PERUSAHAAN["logo"])
    if logo_src:
        fav = Image.open(logo_src).convert("RGBA")
        fav.thumbnail((192, 192))
        fav.save(IMG / "favicon.png", "PNG", optimize=True)

    lokasi, total = halaman_lokasi()
    tulis("index.html", kerangka("home", "Home", K.HERO["deskripsi"], halaman_home(), json_ld()))
    tulis("event.html", kerangka("event", "Artikel Event", K.EVENT_DESKRIPSI, halaman_event()))
    tulis("lokasi.html", kerangka(
        "lokasi", "Lokasi Mal", f"{total} lokasi mal mitra WRS di Jabodetabek dan kota-kota besar Indonesia.", lokasi))
    tulis("kontak.html", kerangka("kontak", "Contact", K.KONTAK["deskripsi"], halaman_kontak()))

    if SITE:
        urls = "".join(f"<url><loc>{SITE}{'' if k == 'home' else FILE[k]}</loc></url>" for k in FILE)
        tulis("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>')
        tulis("robots.txt", f"User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n")

    print(f"Selesai: {len(FILE)} halaman, {len(list(IMG.glob('*')))} file gambar -> {OUT}")
    if HILANG:
        print("Foto belum ada (tampil sebagai kotak penanda):", ", ".join(sorted(set(HILANG))))
    if "XXXX" in K.WA_NOMOR:
        print("Peringatan: WA_NOMOR di konten.py belum diisi.")


if __name__ == "__main__":
    build()
    if "--serve" in sys.argv:
        import functools
        import http.server
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(OUT))
        print("Buka http://localhost:8000  (Ctrl+C untuk berhenti)")
        http.server.ThreadingHTTPServer(("", 8000), handler).serve_forever()

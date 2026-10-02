"""
Pembuat website statis WRS (Indonesia + Inggris).

Cara pakai:
    pip install -r requirements.txt     (sekali saja)
    python build.py                     (setiap selesai mengedit konten)
    python build.py --serve             (bangun lalu buka di http://localhost:8000)

Yang diedit:
    konten.py     teks bahasa Indonesia, daftar mal, kontak, nama file foto
    konten_en.py  teks bahasa Inggris (hanya bagian yang perlu diterjemahkan)
    video.py      daftar video dari kanal YouTube WRS
    assets/       tampilan (style.css) dan interaksi (app.js)

Hasil build ada di folder docs/ (folder inilah yang dipublikasikan GitHub Pages):
    docs/index.html ...        versi Indonesia
    docs/en/index.html ...     versi Inggris
"""

import hashlib
import json
import re
import shutil
import sys
from datetime import date
from html import escape
from pathlib import Path
from urllib.parse import quote_plus

from PIL import Image

import konten as KID

try:  # versi Inggris bersifat opsional: hapus konten_en.py kalau tidak diperlukan
    import konten_en as KEN
except ImportError:
    KEN = None
try:  # video bersifat opsional
    import video as V
except ImportError:
    V = None

BASE = Path(__file__).resolve().parent
OUT = BASE / "docs"
IMG = OUT / "images"

FILE = {"home": "index.html", "event": "event.html", "lokasi": "lokasi.html", "kontak": "kontak.html"}
SITE = (KID.SITE_URL.rstrip("/") + "/") if KID.SITE_URL else ""

# =============================================================================
# TEKS ANTARMUKA (di luar konten.py): label tombol, form, dan sebagainya
# =============================================================================

UI = {
    "id": {
        "bahasa": "Bahasa",
        "buka_menu": "Buka menu",
        "chat_wa": "Chat WhatsApp",
        "taruh_foto": "Taruh foto di",
        "visi_misi": "Visi dan misi",
        "visi": "Visi",
        "misi": "Misi",
        "st_tahun": "tahun pengalaman",
        "st_mal": "lokasi mal mitra",
        "st_event": "jenis event andalan",
        "video_judul": "Video kegiatan",
        "putar": "Putar video",
        "tonton": "Tonton di YouTube",
        "lokasi_judul": "Lokasi mal mitra WRS",
        "lokasi_sub": "{total} lokasi proyek WRS. Klik nama mal untuk membuka Google Maps.",
        "lokasi_meta": "{total} lokasi mal mitra WRS di Jabodetabek dan kota-kota besar Indonesia.",
        "cari_label": "Cari mal atau wilayah",
        "cari_hint": "Contoh: Season City atau Tangerang",
        "jumlah": "{total} lokasi",
        "jumlah_saring": "{n} dari {total} lokasi",
        "kosong": "Mal tidak ditemukan. Coba kata kunci lain.",
        "alamat": "Alamat kantor pusat",
        "telepon": "Telepon",
        "email": "Email",
        "sosmed": "Sosial media",
        "btn_wa": "Chat via WhatsApp",
        "btn_maps": "Buka di Google Maps",
        "peta": "Peta kantor pusat WRS",
        "form_judul": "Kirim pesan lewat WhatsApp",
        "f_nama": "Nama",
        "f_usaha": "Nama usaha (boleh dikosongkan)",
        "f_butuh": "Kebutuhan",
        "f_pesan": "Pesan",
        "f_kirim": "Kirim lewat WhatsApp",
        "opsi": ["Sewa space di mal", "Pameran otomotif", "Pameran multi produk",
                 "Pameran furniture", "Bazaar", "Konsultasi strategi gratis"],
        "lb_tutup": "Tutup",
        "lb_sebelum": "Foto sebelumnya",
        "lb_sesudah": "Foto berikutnya",
        "lb_label": "Tampilan foto",
        "wa_awal": "Halo WRS, saya ",
        "wa_dari": " dari ",
        "wa_butuh": "Kebutuhan: ",
    },
    "en": {
        "bahasa": "Language",
        "buka_menu": "Open menu",
        "chat_wa": "Chat on WhatsApp",
        "taruh_foto": "Place photo in",
        "visi_misi": "Vision and mission",
        "visi": "Vision",
        "misi": "Mission",
        "st_tahun": "years of experience",
        "st_mal": "partner mall locations",
        "st_event": "signature event types",
        "video_judul": "Event videos",
        "putar": "Play video",
        "tonton": "Watch on YouTube",
        "lokasi_judul": "WRS partner mall locations",
        "lokasi_sub": "{total} WRS project locations. Click a mall name to open Google Maps.",
        "lokasi_meta": "{total} WRS partner mall locations across Greater Jakarta and major cities in Indonesia.",
        "cari_label": "Search mall or area",
        "cari_hint": "Example: Season City or Tangerang",
        "jumlah": "{total} locations",
        "jumlah_saring": "{n} of {total} locations",
        "kosong": "No mall found. Try another keyword.",
        "alamat": "Head office address",
        "telepon": "Phone",
        "email": "Email",
        "sosmed": "Social media",
        "btn_wa": "Chat on WhatsApp",
        "btn_maps": "Open in Google Maps",
        "peta": "WRS head office map",
        "form_judul": "Send a message via WhatsApp",
        "f_nama": "Name",
        "f_usaha": "Business name (optional)",
        "f_butuh": "What do you need?",
        "f_pesan": "Message",
        "f_kirim": "Send via WhatsApp",
        "opsi": ["Mall space rental", "Automotive exhibition", "Multi-product exhibition",
                 "Furniture exhibition", "Bazaar", "Free strategy consultation"],
        "lb_tutup": "Close",
        "lb_sebelum": "Previous photo",
        "lb_sesudah": "Next photo",
        "lb_label": "Photo viewer",
        "wa_awal": "Hello WRS, I'm ",
        "wa_dari": " from ",
        "wa_butuh": "Need: ",
    },
}
# Bagian UI yang dikirim ke JavaScript (lightbox, pencarian mal, form WhatsApp)
KUNCI_JS = ["lb_tutup", "lb_sebelum", "lb_sesudah", "lb_label", "jumlah", "jumlah_saring",
            "wa_awal", "wa_dari", "wa_butuh"]

# Bahasa yang sedang dibangun (diatur oleh pakai())
K = KID
T = UI["id"]
LANG = "id"
PREFIX = ""   # "../" untuk halaman di dalam folder en/
NAMA = K.PERUSAHAAN["nama"]


def pakai(bahasa: str) -> None:
    global K, T, LANG, PREFIX, NAMA
    LANG = bahasa
    K = KEN if bahasa == "en" else KID
    T = UI[bahasa]
    PREFIX = "../" if bahasa == "en" else ""
    NAMA = K.PERUSAHAAN["nama"]


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
    """Alamat foto relatif terhadap folder docs/. Kosong kalau file tidak ditemukan."""
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


def aset(url: str) -> str:
    """Tambahkan awalan folder untuk halaman di dalam en/ (kecuali alamat luar)."""
    return url if url.startswith(("http://", "https://")) or not url else PREFIX + url


def foto(nama: str, kelas: str, alt: str = "", lazy: bool = True) -> str:
    if not nama:
        return ""
    url = img_url(nama)
    if url:
        muat = ' loading="lazy"' if lazy else ""
        return f'<img class="{kelas}" src="{aset(url)}" alt="{escape(alt)}"{muat}>'
    return f'<div class="{kelas} slot"><span>{escape(T["taruh_foto"])}<br>foto/{escape(nama)}</span></div>'


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


def teks_bahasa(nilai) -> str:
    """Teks biasa, atau kamus {"id": "...", "en": "..."} yang dipilih sesuai bahasa."""
    if isinstance(nilai, dict):
        return nilai.get(LANG) or next(iter(nilai.values()), "")
    return nilai


def maps_url() -> str:
    return K.KANTOR_LINK or "https://www.google.com/maps/search/?api=1&query=" + quote_plus(K.KANTOR_QUERY)


def maps_embed() -> str:
    return "https://maps.google.com/maps?q=" + quote_plus(K.KANTOR_QUERY) + "&output=embed"


def wa_url() -> str:
    return f"https://wa.me/{K.WA_NOMOR}?text={quote_plus(K.WA_PESAN)}"


IKON_WA = (
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
)


def versi(nama: str) -> str:
    """Kode pendek dari isi file di assets/. Berubah setiap file diedit, sehingga browser
    tidak memakai style.css/app.js lama yang tersimpan (cache)."""
    return hashlib.md5((BASE / "assets" / nama).read_bytes()).hexdigest()[:8]


def alamat_halaman(kode: str, bahasa: str) -> str:
    """Alamat lengkap halaman (hanya dipakai kalau SITE_URL diisi)."""
    folder = "en/" if bahasa == "en" else ""
    return SITE + folder + ("" if kode == "home" else FILE[kode])


def tombol_bahasa(kode: str) -> str:
    if not KEN:
        return ""
    if LANG == "id":
        href_id, href_en = FILE[kode], "en/" + FILE[kode]
    else:
        href_id, href_en = "../" + FILE[kode], FILE[kode]
    on = ' class="on" aria-current="true"'
    return (
        f'<div class="lang" role="group" aria-label="{escape(T["bahasa"])}">'
        f'<a href="{href_id}" lang="id" hreflang="id" title="Bahasa Indonesia"{on if LANG == "id" else ""}>ID</a>'
        f'<a href="{href_en}" lang="en" hreflang="en" title="English"{on if LANG == "en" else ""}>EN</a></div>'
    )


def kerangka(kode: str, deskripsi: str, isi: str, jsonld: str = "") -> str:
    logo = aset(img_url(K.PERUSAHAAN["logo"], 512))
    label = {k: t for t, k in K.MENU}[kode]
    judul_penuh = NAMA if kode == "home" else f"{label} | {NAMA}"
    on = ' class="on"'
    tautan = "".join(f'<a href="{FILE[k]}"{on if k == kode else ""}>{escape(t)}</a>' for t, k in K.MENU)
    og = (
        f'<meta property="og:type" content="website"><meta property="og:title" content="{escape(judul_penuh)}">'
        f'<meta property="og:description" content="{escape(deskripsi)}">'
    )
    kanon = ""
    if SITE:
        alamat = alamat_halaman(kode, LANG)
        kanon = f'<link rel="canonical" href="{alamat}">'
        if KEN:
            kanon += (
                f'<link rel="alternate" hreflang="id" href="{alamat_halaman(kode, "id")}">'
                f'<link rel="alternate" hreflang="en" href="{alamat_halaman(kode, "en")}">'
                f'<link rel="alternate" hreflang="x-default" href="{alamat_halaman(kode, "id")}">'
            )
        og += f'<meta property="og:url" content="{alamat}"><meta property="og:image" content="{SITE}{img_url(K.PERUSAHAAN["logo"], 512)}">'
    ld = f'<script type="application/ld+json">{jsonld}</script>' if jsonld else ""
    data_js = escape(json.dumps({k: T[k] for k in KUNCI_JS}, ensure_ascii=False), quote=True)
    return f"""<!DOCTYPE html>
<html lang="{LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(judul_penuh)}</title>
<meta name="description" content="{escape(deskripsi)}">
{kanon}{og}
<script>document.documentElement.classList.add("js")</script>
<link rel="icon" type="image/png" href="{PREFIX}images/favicon.png">
<link rel="apple-touch-icon" href="{PREFIX}images/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Instrument+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="{PREFIX}assets/style.css?v={versi('style.css')}">
{ld}
</head>
<body data-t="{data_js}">
<div class="nav"><a class="brand" href="index.html"><img src="{logo}" alt="Logo {escape(NAMA)}"><span>{escape(NAMA)}</span></a><nav class="links" id="menu-utama">{tautan}</nav>{tombol_bahasa(kode)}<button class="burger" type="button" aria-label="{escape(T['buka_menu'])}" aria-expanded="false" aria-controls="menu-utama"><span></span><span></span><span></span></button></div>
<main>
{isi}
</main>
<div class="foot">{escape(K.FOOTER)}</div>
<a class="wa-float" href="{escape(wa_url())}" target="_blank" rel="noopener" aria-label="{escape(T['chat_wa'])}"><svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path d="{IKON_WA}"/></svg></a>
<script src="{PREFIX}assets/app.js?v={versi('app.js')}" defer></script>
</body>
</html>
"""


def kepala(judul: str, sub: str) -> str:
    return f'<div class="phead"><div class="inner"><h1>{escape(judul)}</h1><p>{escape(sub)}</p></div></div>'


# =============================================================================
# VIDEO YOUTUBE
# =============================================================================

def id_youtube(s: str) -> str:
    """Ambil kode video dari link YouTube (atau terima kodenya langsung)."""
    s = s.strip()
    m = re.search(r"(?:v=|youtu\.be/|shorts/|embed/|live/)([A-Za-z0-9_-]{11})", s)
    return m.group(1) if m else s


def bagian_video() -> str:
    daftar = getattr(V, "VIDEO", []) if V else []
    if not daftar:
        return ""
    kartu = []
    for v in daftar:
        vid = id_youtube(v["id"])
        judul = teks_bahasa(v.get("judul", ""))
        mulai, selesai = int(v.get("mulai") or 0), int(v.get("selesai") or 0)
        embed = f"https://www.youtube-nocookie.com/embed/{vid}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
        watch = f"https://www.youtube.com/watch?v={vid}"
        if mulai:
            embed += f"&start={mulai}"
            watch += f"&t={mulai}s"
        if selesai:
            embed += f"&end={selesai}"
        thumb = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
        putar = escape(f"{T['putar']}: {judul}")
        kartu.append(
            '<figure class="vid">'
            f'<button class="vid-btn" type="button" data-embed="{escape(embed)}" data-judul="{escape(judul)}" aria-label="{putar}">'
            f'<img src="{thumb}" alt="" loading="lazy" onerror="this.remove()">'
            '<span class="vid-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></button>'
            f'<figcaption><span>{escape(judul)}</span>'
            f'<a href="{escape(watch)}" target="_blank" rel="noopener">{escape(T["tonton"])}</a></figcaption></figure>'
        )
    solo = " solo" if len(kartu) == 1 else ""
    return f"""
<section class="sec" style="padding-top:0"><div class="inner">
<h2 style="margin-bottom:36px">{escape(T['video_judul'])}</h2>
<div class="vids{solo}">{''.join(kartu)}</div>
</div></section>
"""


# =============================================================================
# HALAMAN
# =============================================================================

def halaman_home() -> str:
    logo = aset(img_url(K.PERUSAHAAN["logo"], 512))
    galeri = "".join(
        f'<figure class="gal">{foto(f, "gal-img", ket, lazy=False)}<figcaption>{escape(ket)}</figcaption></figure>'
        for f, ket in K.GALERI_HOME
    )
    visi = "".join(f'<div class="vm-kartu"><h3>{escape(j)}</h3><p>{escape(t)}</p></div>' for j, t in K.VISI)
    misi = "".join(f"<li>{escape(m)}</li>" for m in K.MISI)
    return f"""
<div class="hero"><div>
<h1>{escape(K.HERO['judul'])}</h1>
<p>{escape(K.HERO['deskripsi'])}</p>
{tombol(*K.HERO['tombol_utama'], 'gold')}{tombol(*K.HERO['tombol_kedua'], 'line')}
</div><img class="logo" src="{logo}" alt="Logo {escape(NAMA)}"></div>

{bagian_statistik()}

<section class="sec profil"><div class="inner split">
<div class="split-teks"><h2>{escape(K.PROFIL['judul'])}</h2>{paragraf(K.PROFIL['paragraf'])}</div>
{foto(K.PROFIL['foto'], 'foto-about', K.PROFIL['judul'])}
</div></section>

<section class="sec" style="padding-top:0"><div class="inner">
<div class="pendiri kartu-pendiri">
{foto(K.PENDIRI['foto'], 'potret', K.PENDIRI['nama'])}
<div><h2>{escape(K.PENDIRI['nama'])}</h2>
<p class="jab">{escape(K.PENDIRI['jabatan'])}</p>{paragraf(K.PENDIRI['cerita'])}</div>
</div>
</div></section>

<section class="sec visimisi"><div class="inner">
<h2>{escape(T['visi_misi'])}</h2>
<h3 class="vm-sub">{escape(T['visi'])}</h3>
<div class="vm-grid">{visi}</div>
<h3 class="vm-sub">{escape(T['misi'])}</h3>
<ul class="misi">{misi}</ul>
</div></section>

<section class="sec latar"><div class="inner">
<h2>{escape(K.LATAR['judul'])}</h2>
<div class="latar-teks">{paragraf(K.LATAR['paragraf'])}</div>
</div></section>

<section class="sec" style="padding-top:0"><div class="inner">
<h2 style="margin-bottom:36px">{escape(K.GALERI_JUDUL)}</h2>
<div class="marquee" style="--dur:{len(K.GALERI_HOME) * K.GALERI_DETIK}s">
<div class="track"><div class="set">{galeri}</div><div class="set" aria-hidden="true">{galeri}</div></div>
</div>
</div></section>
{bagian_video()}"""


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
    nama_wilayah = getattr(K, "NAMA_WILAYAH", {})  # terjemahan nama wilayah (opsional)
    total, hasil = 0, []
    for wilayah, grup in K.MAL:
        w_tampil = nama_wilayah.get(wilayah, wilayah)
        kelompok = []
        for label, kueri, daftar in grup:
            l_tampil = nama_wilayah.get(label, label)
            kartu = []
            for m in daftar:
                total += 1
                nama, q = m if isinstance(m, tuple) else (m, f"{m} {kueri}".strip())
                url = "https://www.google.com/maps/search/?api=1&query=" + quote_plus(q)
                cari = f"{nama} {l_tampil} {w_tampil} {label} {wilayah}".lower()
                kartu.append(
                    f'<a class="mal" href="{escape(url)}" target="_blank" rel="noopener" data-cari="{escape(cari)}">'
                    f'<span class="no">{total:02d}</span>{escape(nama)}</a>'
                )
            kelompok.append(
                f'<div class="kel"><h3 class="grp">{escape(l_tampil)}</h3><div class="malgrid">{"".join(kartu)}</div></div>'
            )
        hasil.append(f'<div class="wilayah"><h2 class="wil">{escape(w_tampil)}</h2>{"".join(kelompok)}</div>')
    return "".join(hasil), total


def statistik() -> list:
    """Angka di bawah hero: (angka, akhiran, label). Bisa diganti lewat STATISTIK di konten.py."""
    kustom = getattr(K, "STATISTIK", None)
    if kustom:
        return kustom
    berdiri = getattr(K, "TAHUN_BERDIRI", 2003)
    _, total = daftar_mal()
    return [
        (date.today().year - berdiri, "", T["st_tahun"]),
        (total, "", T["st_mal"]),
        (len(K.EVENT_TIPE), "", T["st_event"]),
    ]


def bagian_statistik() -> str:
    item = "".join(
        f'<div class="stat"><b data-n="{n}" data-akhiran="{escape(a)}">{n}{escape(a)}</b><span>{escape(l)}</span></div>'
        for n, a, l in statistik()
    )
    return f'<section class="stats"><div class="inner">{item}</div></section>'


def halaman_lokasi() -> tuple:
    daftar, total = daftar_mal()
    isi = kepala(T["lokasi_judul"], T["lokasi_sub"].format(total=total)) + f"""
<section class="sec" style="padding-top:36px"><div class="inner">
<div class="cari" data-total="{total}">
<label for="cari">{escape(T['cari_label'])}</label>
<input id="cari" type="search" placeholder="{escape(T['cari_hint'])}" autocomplete="off">
<p class="jumlah" id="jumlah" aria-live="polite">{escape(T['jumlah'].format(total=total))}</p>
</div>
{daftar}
<div class="kosong" id="kosong" hidden>{escape(T['kosong'])}</div>
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
    opsi = "".join(f"<option>{escape(o)}</option>" for o in T["opsi"])
    return kepala(K.KONTAK["judul"], K.KONTAK["deskripsi"]) + f"""
<section class="kontak"><div class="inner cols">
<div>
<p class="ci"><b>{escape(T['alamat'])}</b><br>{alamat}</p>
<p class="ci"><b>{escape(T['telepon'])}</b><br>{telepon}</p>
<p class="ci"><b>{escape(T['email'])}</b><br><a href="mailto:{email}">{email}</a></p>
<p class="ci"><b>{escape(T['sosmed'])}</b><br>{sosmed}</p>
{tombol(T['btn_wa'], wa_url(), "wa")}
</div>
<div>
<iframe title="{escape(T['peta'])}" src="{escape(maps_embed())}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
{tombol(T['btn_maps'], maps_url(), "gold")}
</div>
</div>
<div class="inner">
<h2 style="margin-top:48px">{escape(T['form_judul'])}</h2>
<form class="form" id="form-wa" data-wa="{escape(K.WA_NOMOR)}">
<label>{escape(T['f_nama'])}<input name="nama" required autocomplete="name"></label>
<label>{escape(T['f_usaha'])}<input name="usaha" autocomplete="organization"></label>
<label>{escape(T['f_butuh'])}
<select name="butuh">{opsi}</select></label>
<label>{escape(T['f_pesan'])}<textarea name="pesan" required></textarea></label>
<button type="submit">{escape(T['f_kirim'])}</button>
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
        "inLanguage": LANG,
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


def tulis_bahasa(bahasa: str, folder: Path) -> int:
    """Bangun keempat halaman untuk satu bahasa. Mengembalikan jumlah halaman."""
    pakai(bahasa)
    folder.mkdir(exist_ok=True)
    lokasi, total = halaman_lokasi()
    halaman = {
        "home": (K.HERO["deskripsi"], halaman_home(), json_ld()),
        "event": (K.EVENT_DESKRIPSI, halaman_event(), ""),
        "lokasi": (T["lokasi_meta"].format(total=total), lokasi, ""),
        "kontak": (K.KONTAK["deskripsi"], halaman_kontak(), ""),
    }
    for kode, (deskripsi, isi, ld) in halaman.items():
        (folder / FILE[kode]).write_text(kerangka(kode, deskripsi, isi, ld), encoding="utf-8")
    return len(halaman)


def build() -> None:
    bersihkan()
    shutil.copytree(BASE / "assets", OUT / "assets")
    (OUT / ".nojekyll").write_text("")
    logo_src = cari_file(KID.PERUSAHAAN["logo"])
    if logo_src:
        fav = Image.open(logo_src).convert("RGBA")
        fav.thumbnail((192, 192))
        fav.save(IMG / "favicon.png", "PNG", optimize=True)

    halaman = tulis_bahasa("id", OUT)
    bahasa = ["id"]
    if KEN:
        halaman += tulis_bahasa("en", OUT / "en")
        bahasa.append("en")
    pakai("id")

    if SITE:
        urls = "".join(
            f"<url><loc>{alamat_halaman(k, b)}</loc></url>" for b in bahasa for k in FILE
        )
        (OUT / "sitemap.xml").write_text(
            '<?xml version="1.0" encoding="UTF-8"?>'
            f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>',
            encoding="utf-8",
        )
        (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n", encoding="utf-8")

    print(f"Selesai: {halaman} halaman ({', '.join(bahasa)}), {len(list(IMG.glob('*')))} file gambar -> {OUT}")
    if V and getattr(V, "VIDEO", []):
        print(f"Video YouTube: {len(V.VIDEO)}")
    if HILANG:
        print("Foto belum ada (tampil sebagai kotak penanda):", ", ".join(sorted(set(HILANG))))
    if "XXXX" in KID.WA_NOMOR:
        print("Peringatan: WA_NOMOR di konten.py belum diisi.")


if __name__ == "__main__":
    build()
    if "--serve" in sys.argv:
        import functools
        import http.server
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(OUT))
        print("Buka http://localhost:8000  (Ctrl+C untuk berhenti)")
        http.server.ThreadingHTTPServer(("", 8000), handler).serve_forever()

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
from datetime import date, datetime
from html import escape
from pathlib import Path
from urllib.parse import quote_plus

from PIL import Image, ImageOps

try:  # foto iPhone berformat HEIC (opsional): pip install pillow-heif
    import pillow_heif
    pillow_heif.register_heif_opener()
except Exception:
    pass

import konten as KID

try:  # versi Inggris bersifat opsional: hapus konten_en.py kalau tidak diperlukan
    import konten_en as KEN
except ImportError:
    KEN = None
try:  # data peta bersifat opsional (tanpa peta.py, halaman Lokasi tampil tanpa peta)
    import peta as PT
except ImportError:
    PT = None
try:  # video bersifat opsional
    import video as V
except ImportError:
    V = None

BASE = Path(__file__).resolve().parent
OUT = BASE / "docs"
IMG = OUT / "images"

FOLDER_UPDATE = BASE / "update"   # satu folder per event: info.txt + foto-foto dokumentasi
EKSTENSI_FOTO = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".heic", ".heif"}
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
        "upd_judul": "Update event terbaru",
        "upd_sub": "Jadwal dan dokumentasi pameran WRS dari minggu ke minggu di berbagai mal.",
        "jenis_judul": "Jenis event WRS",
        "semua": "Semua",
        "filter": "Saring berdasarkan jenis event",
        "st_akan": "Akan datang",
        "st_jalan": "Sedang berlangsung",
        "st_selesai": "Selesai",
        "lagi": "Tampilkan event sebelumnya",
        "foto_lihat": "Lihat semua foto ({n})",
        "foto_tutup": "Tampilkan lebih sedikit",
        "foto_segera": "Foto dokumentasi segera hadir.",
        "scroll": "Gulir",
        "tk_sejak": "Sejak 2003",
        "tk_mal": "{total} mal mitra",
        "tk_konsul": "Konsultasi strategi gratis",
        "spes_judul": "Spesialisasi kami",
        "spes_sub": "Empat jenis event yang rutin kami selenggarakan di mal mitra.",
        "baca": "Baca selengkapnya",
        "upd_home_sub": "Pameran yang sedang dan baru berlangsung di mal mitra kami.",
        "lihat_update": "Lihat semua update event",
        "alasan_judul": "Kenapa memilih WRS",
        "alur_judul": "Alur kerja sama",
        "mitra_judul": "Mal mitra kami",
        "lihat_lokasi": "Lihat semua lokasi mal",
        "cta_judul": "Siap tampil di mal?",
        "cta_sub": "Ceritakan kebutuhan Anda. Konsultasi strategi dari tim WRS tanpa biaya.",
        "chip_gratis": "Konsultasi strategi gratis",
        "chip_wa": "Balasan lewat WhatsApp",
        "chip_event": "{n} jenis event",
        "chip_area": "{n} area dan kota",
        "chip_lokasi": "{n} lokasi mal",
        "chip_update": "{n} update event",
        "chip_berkala": "Diperbarui berkala",
        "jenis_nav": "Jenis event",
        "peta_judul": "Peta sebaran mal",
        "peta_catatan": "Penanda menunjukkan area (kota atau wilayah), bukan titik persis tiap mal. Klik penanda untuk melihat daftar mal, lalu buka lokasi persisnya di Google Maps.",
        "peta_semua": "Lihat semua area",
        "ke_peta": "Lihat di peta",
        "peta_gagal": "Peta tidak dapat dimuat. Gunakan daftar mal di bawah.",
        "wilayah_semua": "Semua wilayah",
        "n_mal": "{n} mal",
        "k_wa_sub": "Cara tercepat untuk bertanya soal slot, mal, dan jadwal.",
        "k_telp": "Telepon",
        "k_email": "Email",
        "k_alamat": "Kantor pusat",
        "k_sosmed": "Ikuti kami",
        "salin": "Salin",
        "disalin": "Tersalin",
        "rute": "Petunjuk arah",
        "form_sub": "Isi singkat saja, percakapan dilanjutkan lewat WhatsApp.",
        "mengirim": "Membuka WhatsApp...",
        "wa_manual": "WhatsApp tidak terbuka? Klik di sini.",
        "faq_judul": "Pertanyaan yang sering diajukan",
        "ke_atas": "Kembali ke atas",
        "foot_nav": "Menu",
        "foot_kontak": "Kontak",
        "foot_ikuti": "Ikuti kami",
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
        "upd_judul": "Latest event updates",
        "upd_sub": "Weekly schedule and photo documentation of WRS exhibitions across partner malls.",
        "jenis_judul": "WRS event types",
        "semua": "All",
        "filter": "Filter by event type",
        "st_akan": "Upcoming",
        "st_jalan": "Ongoing",
        "st_selesai": "Finished",
        "lagi": "Show earlier events",
        "foto_lihat": "See all photos ({n})",
        "foto_tutup": "Show fewer",
        "foto_segera": "Photo documentation coming soon.",
        "scroll": "Scroll",
        "tk_sejak": "Since 2003",
        "tk_mal": "{total} partner malls",
        "tk_konsul": "Free strategy consultation",
        "spes_judul": "What we do",
        "spes_sub": "Four types of events we regularly run in partner malls.",
        "baca": "Read more",
        "upd_home_sub": "Exhibitions running now and recently at our partner malls.",
        "lihat_update": "See all event updates",
        "alasan_judul": "Why choose WRS",
        "alur_judul": "How it works",
        "mitra_judul": "Our partner malls",
        "lihat_lokasi": "See all mall locations",
        "cta_judul": "Ready to be in a mall?",
        "cta_sub": "Tell us what you need. A strategy consultation with the WRS team is free.",
        "chip_gratis": "Free strategy consultation",
        "chip_wa": "Replies via WhatsApp",
        "chip_event": "{n} event types",
        "chip_area": "{n} areas and cities",
        "chip_lokasi": "{n} mall locations",
        "chip_update": "Event updates: {n}",
        "chip_berkala": "Updated regularly",
        "jenis_nav": "Event types",
        "peta_judul": "Mall distribution map",
        "peta_catatan": "Markers show areas (cities or regions), not the exact spot of each mall. Click a marker to see its malls, then open the exact location in Google Maps.",
        "peta_semua": "See all areas",
        "ke_peta": "Show on map",
        "peta_gagal": "The map could not be loaded. Please use the mall list below.",
        "wilayah_semua": "All regions",
        "n_mal": "{n} malls",
        "k_wa_sub": "The fastest way to ask about slots, malls, and schedules.",
        "k_telp": "Phone",
        "k_email": "Email",
        "k_alamat": "Head office",
        "k_sosmed": "Follow us",
        "salin": "Copy",
        "disalin": "Copied",
        "rute": "Get directions",
        "form_sub": "A short note is enough; we continue the conversation on WhatsApp.",
        "mengirim": "Opening WhatsApp...",
        "wa_manual": "WhatsApp did not open? Click here.",
        "faq_judul": "Frequently asked questions",
        "ke_atas": "Back to top",
        "foot_nav": "Menu",
        "foot_kontak": "Contact",
        "foot_ikuti": "Follow us",
        "wa_awal": "Hello WRS, I'm ",
        "wa_dari": " from ",
        "wa_butuh": "Need: ",
    },
}
# Bagian UI yang dikirim ke JavaScript (lightbox, pencarian mal, form WhatsApp)
KUNCI_JS = ["lb_tutup", "lb_sebelum", "lb_sesudah", "lb_label", "jumlah", "jumlah_saring",
            "wa_awal", "wa_dari", "wa_butuh", "st_akan", "st_jalan", "st_selesai", "foto_lihat", "foto_tutup",
            "disalin", "mengirim", "wa_manual", "n_mal", "peta_gagal"]

# Ikon (gaya garis) untuk bagian "Kenapa memilih WRS"
IKON = {
    "award": '<circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/>',
    "pin": '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    "grafik": '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    "cek": '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><polyline points="22 4 12 14 9 11"/>',
    "naik": '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    "chat": '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
}
IKON["telp"] = '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'
IKON["surel"] = '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>'
IKON["bagi"] = '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>'

FAQ = {
    "id": [
        ("Apakah konsultasi strategi berbayar?", "Tidak. Tim WRS siap membantu menyusun strategi terbaik untuk pameran Anda tanpa biaya."),
        ("Jenis event apa saja yang diselenggarakan WRS?", "Pameran otomotif, pameran multi produk, pameran furniture, dan bazaar di mal mitra."),
        ("Di mana saja lokasi mal mitra WRS?", "Di Jabodetabek dan kota-kota besar seperti Bandung, Palembang, Medan, Pekanbaru, dan Surabaya. Daftar lengkapnya ada di halaman Lokasi Mal."),
        ("Bagaimana cara memesan slot atau menyewa space?", "Hubungi kami lewat WhatsApp atau formulir di halaman ini, lalu sebutkan jenis usaha, mal yang diminati, dan perkiraan tanggal. Tim kami membantu memilih lokasi dan jadwal."),
        ("Apakah usaha kecil (UMKM) bisa ikut?", "Bisa. WRS berawal dari penyewaan ruang usaha bagi UMKM, dan bazaar serta sewa counter tersedia untuk usaha yang ingin mulai tampil di mal."),
    ],
    "en": [
        ("Is the strategy consultation paid?", "No. The WRS team is ready to help you plan the best strategy for your exhibition at no cost."),
        ("What kinds of events does WRS organize?", "Automotive exhibitions, multi-product exhibitions, furniture exhibitions, and bazaars in partner malls."),
        ("Where are WRS partner malls located?", "In Greater Jakarta and major cities such as Bandung, Palembang, Medan, Pekanbaru, and Surabaya. The full list is on the Mall Locations page."),
        ("How do I book a slot or rent space?", "Contact us via WhatsApp or the form on this page, then tell us your business type, the malls you are interested in, and your estimated dates. Our team helps you choose a location and schedule."),
        ("Can small businesses (MSMEs) take part?", "Yes. WRS began by renting business space to MSMEs, and bazaars and counter rentals are available for businesses that want to start showing up in malls."),
    ],
}

# (ikon, judul, isi). Teks diambil dari isi website WRS sebelumnya; sesuaikan bila perlu.
BERANDA = {
    "id": {
        "alasan": [
            ("award", "Berpengalaman sejak 2003", "Puluhan ribu bisnis dan pameran di berbagai industri sudah kami bantu tampil di mal."),
            ("pin", "Jaringan mal mitra luas", "Pilih lokasi dan jadwal di Jabodetabek dan kota-kota besar di berbagai pulau."),
            ("grafik", "Analisa yang matang", "Setiap event kami mulai dengan analisa yang detail dan menyeluruh."),
            ("cek", "Eksekusi yang rapi", "Tim profesional kami menjalankan setiap proyek dengan persiapan yang matang."),
            ("naik", "Biaya jadi investasi", "Kami berupaya agar setiap biaya yang Anda keluarkan menjadi investasi yang menguntungkan."),
            ("chat", "Konsultasi strategi gratis", "Baru pertama kali ikut pameran di mal? Tim kami siap membantu menyusun strategi terbaik tanpa biaya."),
        ],
        "alur": [
            ("Konsultasi", "Ceritakan produk dan target Anda. Konsultasi strategi dari tim WRS tanpa biaya."),
            ("Pilih mal dan tanggal", "Tentukan lokasi dan jadwal di antara mal mitra WRS."),
            ("Persiapan dan penataan", "Tim kami menyiapkan area, penataan, dan promosi event."),
            ("Event berlangsung", "Pameran berjalan, dan dokumentasinya kami tampilkan di website."),
        ],
    },
    "en": {
        "alasan": [
            ("award", "Experienced since 2003", "We have helped tens of thousands of businesses and exhibitions across many industries show up in malls."),
            ("pin", "A wide partner mall network", "Choose locations and dates in Greater Jakarta and major cities across several islands."),
            ("grafik", "Thorough analysis", "Every event starts with a detailed and comprehensive analysis."),
            ("cek", "Neat execution", "Our professional team runs every project with careful preparation."),
            ("naik", "Costs become investments", "We work so that every cost you spend becomes a profitable investment."),
            ("chat", "Free strategy consultation", "First time exhibiting in a mall? Our team is ready to help you plan the best strategy at no cost."),
        ],
        "alur": [
            ("Consultation", "Tell us about your product and goals. A strategy consultation with the WRS team is free."),
            ("Choose mall and dates", "Pick a location and schedule among WRS partner malls."),
            ("Preparation and layout", "Our team prepares the area, layout, and event promotion."),
            ("Event day", "The exhibition runs, and we publish the documentation on the website."),
        ],
    },
}


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
    kunci = (nama, sisi)
    if kunci in _cache:
        return _cache[kunci]
    src = cari_file(nama)
    if not src:
        HILANG.append(nama)
        _cache[kunci] = ""
        return ""
    im = ImageOps.exif_transpose(Image.open(src))  # foto dari HP sering tersimpan miring
    im.thumbnail((sisi, sisi))
    ekor = "" if sisi == 1200 else f"-{sisi}"
    if punya_transparansi(im):
        nama_out = f"{slug(nama)}{ekor}.png"
        im.convert("RGBA").save(IMG / nama_out, "PNG", optimize=True)
    else:
        nama_out = f"{slug(nama)}{ekor}.webp"
        im.convert("RGB").save(IMG / nama_out, "WEBP", quality=80, method=6)
    _cache[kunci] = f"images/{nama_out}"
    return _cache[kunci]


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
    pakai_peta = kode == "lokasi" and PT is not None
    leaflet_css = f'<link rel="stylesheet" href="{PREFIX}assets/vendor/leaflet/leaflet.css">\n' if pakai_peta else ""
    leaflet_js = f'<script src="{PREFIX}assets/vendor/leaflet/leaflet.js" defer></script>\n' if pakai_peta else ""
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
{leaflet_css}{ld}
</head>
<body data-t="{data_js}">
<div class="progres" aria-hidden="true"></div>
<div class="nav"><a class="brand" href="index.html"><img src="{logo}" alt="Logo {escape(NAMA)}"><span>{escape(NAMA)}</span></a><nav class="links" id="menu-utama">{tautan}</nav>{tombol_bahasa(kode)}<button class="burger" type="button" aria-label="{escape(T['buka_menu'])}" aria-expanded="false" aria-controls="menu-utama"><span></span><span></span><span></span></button></div>
<main>
{isi}
</main>
{footer_html()}
<button class="ke-atas" type="button" aria-label="{escape(T['ke_atas'])}"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg></button>
<a class="wa-float" href="{escape(wa_url())}" target="_blank" rel="noopener" aria-label="{escape(T['chat_wa'])}"><svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path d="{IKON_WA}"/></svg></a>
{leaflet_js}<script src="{PREFIX}assets/app.js?v={versi('app.js')}" defer></script>
</body>
</html>
"""


def footer_html() -> str:
    logo = aset(img_url(K.PERUSAHAAN["logo"], 512))
    menu = "".join(f'<a href="{FILE[k]}">{escape(t)}</a>' for t, k in K.MENU)
    alamat = "<br>".join(escape(x) for x in K.KONTAK["alamat"])
    telepon = "<br>".join(tautan_telepon(x) for x in K.KONTAK["telepon"])
    email = escape(K.KONTAK["email"])
    sosmed = "".join(
        f'<a href="{escape(u)}" target="_blank" rel="noopener">{escape(n)}</a>' for n, _, u in K.SOSMED)
    return f"""<footer class="foot-besar"><div class="inner foot-grid">
<div class="foot-merek"><a class="foot-logo" href="index.html"><img src="{logo}" alt="Logo {escape(NAMA)}"><span>{escape(NAMA)}</span></a>
<p>{escape(K.HERO['deskripsi'])}</p></div>
<div class="foot-kol"><h4>{escape(T['foot_nav'])}</h4>{menu}</div>
<div class="foot-kol"><h4>{escape(T['foot_kontak'])}</h4><p>{alamat}</p><p>{telepon}</p><p><a href="mailto:{email}">{email}</a></p></div>
<div class="foot-kol"><h4>{escape(T['foot_ikuti'])}</h4>{sosmed}</div>
</div><div class="foot-bawah"><div class="inner"><span>{escape(K.FOOTER)}</span></div></div></footer>"""


def kepala(judul: str, sub: str, chips=()) -> str:
    baris = "".join(f'<span class="phead-chip">{escape(c)}</span>' for c in chips)
    baris = f'<div class="phead-chips">{baris}</div>' if baris else ""
    return (f'<div class="phead" data-partikel><div class="inner"><h1>{escape(judul)}</h1>'
            f'<p>{escape(sub)}</p>{baris}</div></div>')


# =============================================================================
# UPDATE EVENT: satu folder di update/ = satu event (info.txt + foto dokumentasi)
# =============================================================================

PERINGATAN: list = []
UPDATE: list = []

BULAN = {
    "januari": 1, "jan": 1, "january": 1, "februari": 2, "pebruari": 2, "feb": 2, "february": 2,
    "maret": 3, "mar": 3, "march": 3, "april": 4, "apr": 4, "mei": 5, "may": 5,
    "juni": 6, "jun": 6, "june": 6, "juli": 7, "jul": 7, "july": 7,
    "agustus": 8, "agu": 8, "agt": 8, "aug": 8, "august": 8,
    "september": 9, "sep": 9, "sept": 9, "oktober": 10, "okt": 10, "oct": 10, "october": 10,
    "november": 11, "nov": 11, "nop": 11, "desember": 12, "des": 12, "dec": 12, "december": 12,
}
BULAN_NAMA = {
    "id": ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus",
           "September", "Oktober", "November", "Desember"],
    "en": ["January", "February", "March", "April", "May", "June", "July", "August",
           "September", "October", "November", "December"],
}
KATEGORI = {
    "otomotif": {"id": "Otomotif", "en": "Automotive"},
    "multiproduk": {"id": "Multi produk", "en": "Multi-product"},
    "furniture": {"id": "Furniture", "en": "Furniture"},
    "bazaar": {"id": "Bazaar", "en": "Bazaar"},
    "lainnya": {"id": "Lainnya", "en": "Other"},
}
ALIAS_KATEGORI = {"automotive": "otomotif", "multiproduct": "multiproduk", "bazar": "bazaar"}
KUNCI_INFO = {
    "judul": "judul", "title": "judul", "nama_event": "judul", "nama": "judul",
    "judul_en": "judul_en", "title_en": "judul_en",
    "kategori": "kategori", "category": "kategori", "jenis": "kategori",
    "mal": "mal", "mall": "mal", "lokasi": "mal", "kota": "kota", "city": "kota",
    "periode": "periode", "period": "periode", "tanggal": "periode",
    "mulai": "mulai", "start": "mulai", "selesai": "selesai", "end": "selesai",
    "deskripsi": "deskripsi", "description": "deskripsi", "keterangan": "deskripsi",
    "deskripsi_en": "deskripsi_en", "description_en": "deskripsi_en",
}


def urut_alami(p: Path) -> list:
    """Urutan nama file yang wajar: foto2 sebelum foto10."""
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", p.name.lower())]


def slug_teks(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "event"


def baca_teks(path: Path) -> str:
    data = path.read_bytes()
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        return data.decode("cp1252", errors="replace")


def baca_info(path: Path) -> dict:
    """info.txt: baris 'kunci: isi'. Baris tanpa kunci melanjutkan isi sebelumnya;
    baris kosong memisahkan paragraf (untuk deskripsi)."""
    mentah, kunci = {}, None
    for baris in baca_teks(path).splitlines():
        if baris.lstrip().startswith("#"):   # baris catatan, diabaikan
            continue
        m = re.match(r"^\s*([A-Za-z_ ]{2,20}?)\s*[:=]\s*(.*)$", baris)
        if m:
            k = KUNCI_INFO.get(re.sub(r"[\s_]+", "_", m.group(1).strip().lower()))
            if k:
                kunci = k
                mentah[k] = [m.group(2).strip()]
                continue
        if kunci is not None:
            mentah[kunci].append(baris.strip())
    hasil = {}
    for k, baris in mentah.items():
        paras, cur = [], []
        for x in baris:
            if x:
                cur.append(x)
            elif cur:
                paras.append(" ".join(cur))
                cur = []
        if cur:
            paras.append(" ".join(cur))
        hasil[k] = paras
    return hasil


def urai_tanggal(s: str) -> tuple:
    """(hari, bulan, tahun); bagian yang tidak ditulis bernilai None."""
    s = s.strip()
    m = re.match(r"^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$", s)
    if m:
        a, b_, c = (int(x) for x in m.groups())
        return (c, b_, a) if len(m.group(1)) == 4 else (a, b_, c)
    tahun = re.search(r"\b(\d{4})\b", s)
    sisa = s.replace(tahun.group(1), " ") if tahun else s
    hari = re.search(r"\b(\d{1,2})\b", sisa)
    bulan = next((BULAN[w.lower()] for w in re.findall(r"[A-Za-z]+", s) if w.lower() in BULAN), None)
    return (int(hari.group(1)) if hari else None, bulan, int(tahun.group(1)) if tahun else None)


PEMISAH_PERIODE = re.compile(
    r"\s*(?:\bs\s*/\s*d\b\.?|\bs\.\s*d\.?|\bsd\b|\bsampai\b|\bhingga\b|\bto\b|\buntil\b|\s-\s|–|—)\s*", re.I
)


def urai_periode(teks: str) -> tuple:
    """'28 September sd 4 Oktober 2026' -> (date, date). Bulan/tahun yang hilang di awal dilengkapi."""
    bagian = [p for p in PEMISAH_PERIODE.split(teks.strip()) if p.strip()]
    if not bagian or len(bagian) > 2:
        raise ValueError("format periode tidak dikenali")
    kiri = list(urai_tanggal(bagian[0]))
    kanan = list(urai_tanggal(bagian[-1]))
    if len(bagian) == 1:
        kanan = kiri[:]
    if kanan[0] is None:
        raise ValueError("tanggal akhir tidak terbaca")
    kanan[2] = kanan[2] or kiri[2]
    kanan[1] = kanan[1] or kiri[1]
    if kanan[1] is None or kanan[2] is None or kiri[0] is None:
        raise ValueError("bulan atau tahun belum ditulis")
    if kiri[1] is None:                       # contoh "28 - 4 Oktober 2026" -> September
        kiri[1] = kanan[1] - 1 if kiri[0] > kanan[0] else kanan[1]
        if kiri[1] == 0:
            kiri[1], kiri[2] = 12, (kiri[2] or kanan[2]) - 1
    if kiri[2] is None:
        kiri[2] = kanan[2] - 1 if kiri[1] > kanan[1] else kanan[2]
    try:
        a, b_ = date(kiri[2], kiri[1], kiri[0]), date(kanan[2], kanan[1], kanan[0])
    except ValueError:
        raise ValueError("ada tanggal yang tidak ada di kalender")
    if a > b_:
        raise ValueError("tanggal selesai lebih awal dari tanggal mulai")
    return a, b_


def format_periode(a: date, b_: date, bahasa: str) -> str:
    n = BULAN_NAMA[bahasa]
    if a == b_:
        return f"{a.day} {n[a.month - 1]} {a.year}"
    if (a.year, a.month) == (b_.year, b_.month):
        return f"{a.day} – {b_.day} {n[a.month - 1]} {a.year}"
    if a.year == b_.year:
        return f"{a.day} {n[a.month - 1]} – {b_.day} {n[b_.month - 1]} {a.year}"
    return f"{a.day} {n[a.month - 1]} {a.year} – {b_.day} {n[b_.month - 1]} {b_.year}"


def simpan_foto_update(src: Path, awalan: str, nomor: int):
    """Simpan dua ukuran: kecil (kisi di halaman) dan besar (saat foto diklik)."""
    try:
        im = ImageOps.exif_transpose(Image.open(src))
        hasil = []
        for sisi, akhir in ((640, "-k"), (1400, "")):
            x = im.copy()
            x.thumbnail((sisi, sisi))
            nama = f"u-{awalan}-{nomor:02d}{akhir}.webp"
            x.convert("RGB").save(IMG / nama, "WEBP", quality=80, method=4)
            hasil.append(f"images/{nama}")
        return tuple(hasil)
    except Exception as e:
        PERINGATAN.append(f"Foto {src.parent.name}/{src.name} tidak bisa dibaca ({type(e).__name__}); dilewati. "
                          "Simpan ulang sebagai JPG atau PNG.")
        return None


def muat_update() -> list:
    """Baca semua folder event di update/. Folder berawalan _ atau . diabaikan (untuk template/draf)."""
    if not FOLDER_UPDATE.is_dir():
        return []
    hasil = []
    for folder in sorted(p for p in FOLDER_UPDATE.iterdir() if p.is_dir() and not p.name.startswith(("_", "."))):
        nama = folder.name
        txt = sorted((f for f in folder.iterdir() if f.suffix.lower() == ".txt"), key=urut_alami)
        if not txt:
            PERINGATAN.append(f"Folder update/{nama} dilewati: tidak ada file info.txt di dalamnya.")
            continue
        info = baca_info(txt[0])
        try:
            if info.get("periode"):
                mulai, selesai = urai_periode(" ".join(info["periode"]))
            elif info.get("mulai"):
                mulai = urai_periode(" ".join(info["mulai"]))[0]
                selesai = urai_periode(" ".join(info["selesai"]))[0] if info.get("selesai") else mulai
                if selesai < mulai:
                    raise ValueError("tanggal selesai lebih awal dari tanggal mulai")
            else:
                raise ValueError("baris 'periode:' belum diisi")
        except ValueError as e:
            PERINGATAN.append(f"Folder update/{nama} dilewati: {e}. Contoh yang benar -> periode: 28 September sd 4 Oktober 2026")
            continue
        judul = " ".join(info.get("judul", [])).strip() or re.sub(
            r"^\d{4}-\d{2}-\d{2}[ _-]*", "", nama).replace("-", " ").replace("_", " ").strip().title()
        k_mentah = " ".join(info.get("kategori", [])).strip()
        k_norm = re.sub(r"[^a-z]", "", k_mentah.lower())
        k_norm = ALIAS_KATEGORI.get(k_norm, k_norm) or "lainnya"
        label = KATEGORI.get(k_norm) or {"id": k_mentah.title(), "en": k_mentah.title()}
        awalan = slug_teks(nama)
        fotos = []
        berkas = sorted((f for f in folder.iterdir() if f.suffix.lower() in EKSTENSI_FOTO), key=urut_alami)
        for i, f in enumerate(berkas, 1):
            sudah = simpan_foto_update(f, awalan, i)
            if sudah:
                fotos.append(sudah)
        hasil.append({
            "id": awalan,
            "judul": {"id": judul, "en": " ".join(info.get("judul_en", [])).strip() or judul},
            "kat": k_norm, "label": label,
            "mal": " ".join(info.get("mal", [])).strip(), "kota": " ".join(info.get("kota", [])).strip(),
            "mulai": mulai, "selesai": selesai,
            "isi": {"id": info.get("deskripsi", []), "en": info.get("deskripsi_en") or info.get("deskripsi", [])},
            "foto": fotos,
        })
    hasil.sort(key=lambda u: (u["mulai"], u["selesai"], u["id"]), reverse=True)
    return hasil


def status_update(u: dict, hari: date) -> str:
    return "akan" if hari < u["mulai"] else ("selesai" if hari > u["selesai"] else "jalan")


def kartu_update(u: dict, hari: date) -> str:
    judul = u["judul"][LANG]
    lokasi = " · ".join(x for x in (u["mal"], u["kota"]) if x)
    st = status_update(u, hari)
    batas = int(getattr(KID, "UPDATE_FOTO_TAMPIL", 6))
    foto_html = "".join(
        f'<img class="upd-img{" extra" if i >= batas else ""}" src="{aset(t)}" data-besar="{aset(b_)}" '
        f'data-grup="{u["id"]}" alt="{escape(judul + (" - " + u["mal"] if u["mal"] else ""))}" loading="lazy">'
        for i, (t, b_) in enumerate(u["foto"])
    )
    if foto_html:
        n = len(u["foto"])
        lebih = (
            f'<button class="upd-lebih" type="button" data-n="{n}" aria-expanded="false">'
            f'{escape(T["foto_lihat"].format(n=n))}</button>' if n > batas else ""
        )
        galeri = f'<div class="upd-foto" data-n="{min(n, 3)}">{foto_html}</div>{lebih}'
    else:
        galeri = f'<p class="upd-kosong">{escape(T["foto_segera"])}</p>'
    return (
        f'<article class="upd" id="update-{u["id"]}" data-kat="{u["kat"]}" data-status="{st}" '
        f'data-mulai="{u["mulai"].isoformat()}" data-selesai="{u["selesai"].isoformat()}">'
        f'<div class="upd-kepala"><span class="badge st-{st}">{escape(T["st_" + st])}</span>'
        f'<span class="upd-tag">{escape(u["label"][LANG])}</span></div>'
        f'<h3>{escape(judul)}</h3>'
        f'<p class="upd-meta"><span>{escape(format_periode(u["mulai"], u["selesai"], LANG))}</span>'
        f'{"<span>" + escape(lokasi) + "</span>" if lokasi else ""}</p>'
        f'{paragraf(u["isi"][LANG])}{galeri}</article>'
    )


def bagian_update() -> str:
    if not UPDATE:
        return ""
    hari = date.today()
    urut = []
    for u in UPDATE:
        if all(u["kat"] != k for k, _ in urut):
            urut.append((u["kat"], u["label"][LANG]))
    chips = ""
    if len(urut) > 1:
        chips = '<div class="chips" role="group" aria-label="' + escape(T["filter"]) + '">' + (
            f'<button class="chip on" type="button" data-kat="semua" aria-pressed="true">{escape(T["semua"])}</button>'
            + "".join(f'<button class="chip" type="button" data-kat="{k}" aria-pressed="false">{escape(lb)}</button>'
                      for k, lb in urut)
        ) + "</div>"
    batch = int(getattr(KID, "UPDATE_PER_HALAMAN", 6))
    kartu = "".join(kartu_update(u, hari) for u in UPDATE)
    return f"""
<section class="sec" style="padding-top:40px;padding-bottom:20px"><div class="inner">
<h2>{escape(T['upd_judul'])}</h2>
<p class="upd-sub">{escape(T['upd_sub'])}</p>
{chips}
<div class="upd-list" data-batch="{batch}">{kartu}</div>
<div class="upd-lagi"><button class="btn-lagi" type="button" hidden>{escape(T['lagi'])}</button></div>
</div></section>
"""


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

# =============================================================================
# BAGIAN BERANDA YANG BARU (hero foto, teks berjalan, spesialisasi, dst.)
# =============================================================================

def hero_foto() -> tuple:
    """Latar hero: foto-foto bergantian (crossfade) dengan gerak zoom pelan."""
    nama = getattr(K, "HERO_FOTO", None) or [f for f, _ in K.GALERI_HOME[:5]]
    urls = [u for u in (img_url(n, 1600) for n in nama) if u]
    if not urls:
        return "", ""
    n = len(urls)
    kf = ""
    if n > 1:
        e = 100 / n
        kf = (
            "<style>@keyframes herogeser{0%{opacity:0;transform:scale(1)}5%{opacity:1}"
            f"{e:.2f}%{{opacity:1}}{e + 5:.2f}%{{opacity:0;transform:scale(1.1)}}100%{{opacity:0;transform:scale(1.1)}}}}</style>"
        )
    per = 7
    slide = "".join(
        f'<i style="background-image:url(\'{aset(u)}\');animation-delay:{k * per}s"></i>' for k, u in enumerate(urls)
    )
    return f'<span class="hero-bg" aria-hidden="true" style="--total:{n * per}s">{slide}</span>', kf


def koin_html(logo: str) -> str:
    """Logo sebagai koin emas 3D: dua sisi + tepi bertumpuk. Digerakkan oleh app.js mengikuti kursor."""
    tepi = "".join(f'<i style="--z:{z}px"></i>' for z in range(-8, 9))
    return (
        '<div class="koin-wrap"><div class="koin"><span class="koin-cahaya"></span><span class="koin-cincin"></span>'
        f'<div class="koin-badan">{tepi}'
        f'<img class="koin-belakang" src="{logo}" alt="">'
        f'<img class="koin-muka" src="{logo}" alt="Logo {escape(NAMA)}">'
        '<span class="koin-kilau"></span></div><span class="koin-bayangan"></span></div></div>'
    )


def bagian_ticker() -> str:
    _, total = daftar_mal()
    kata = [e["judul"] for e in K.EVENT_TIPE] + [
        T["tk_sejak"], T["tk_mal"].format(total=total), T["tk_konsul"]]
    himpunan = "".join(f'<span class="tk">{escape(k)}</span>' for k in kata * 2)
    durasi = max(30, len(kata) * 2 * 4)
    return (
        f'<div class="ticker" aria-hidden="true"><div class="run" style="--dur:{durasi}s"><div class="run-track">'
        f'<div class="run-set">{himpunan}</div><div class="run-set">{himpunan}</div></div></div></div>'
    )


def bagian_spesialisasi() -> str:
    kartu = []
    for e in K.EVENT_TIPE:
        url = img_url(e["foto"][0]) if e.get("foto") else ""
        gambar = f'<img src="{aset(url)}" alt="{escape(e["judul"])}" loading="lazy">' if url else ""
        kartu.append(
            f'<a class="spes-kartu" href="event.html#{slug(e["judul"])}">{gambar}'
            f'<span class="spes-isi"><h3>{escape(e["judul"])}</h3><p>{escape(e["lead"])}</p>'
            f'<span>{escape(T["baca"])} →</span></span></a>'
        )
    return f"""
<section class="sec"><div class="inner">
<h2>{escape(T['spes_judul'])}</h2>
<p class="sub">{escape(T['spes_sub'])}</p>
<div class="spes">{''.join(kartu)}</div>
</div></section>
"""


def bagian_update_beranda() -> str:
    if not UPDATE:
        return ""
    hari = date.today()
    kartu = []
    for u in UPDATE[:3]:
        judul = u["judul"][LANG]
        lokasi = " · ".join(x for x in (u["mal"], u["kota"]) if x)
        if u["foto"]:
            gambar = f'<img class="upd-mini-foto" src="{aset(u["foto"][0][0])}" alt="{escape(judul)}" loading="lazy">'
        else:
            gambar = f'<div class="upd-mini-foto">{escape(u["label"][LANG])}</div>'
        st = status_update(u, hari)
        kartu.append(
            f'<a class="upd-mini" href="event.html#update-{u["id"]}" data-mulai="{u["mulai"].isoformat()}" '
            f'data-selesai="{u["selesai"].isoformat()}">{gambar}<span class="upd-mini-isi">'
            f'<span class="badge st-{st}">{escape(T["st_" + st])}</span><h3>{escape(judul)}</h3>'
            f'<p class="upd-mini-meta">{escape(format_periode(u["mulai"], u["selesai"], LANG))}'
            f'{" · " + escape(lokasi) if lokasi else ""}</p></span></a>'
        )
    return f"""
<section class="sec" style="padding-top:0"><div class="inner">
<h2>{escape(T['upd_judul'])}</h2>
<p class="sub">{escape(T['upd_home_sub'])}</p>
<div class="upd-mini-grid" data-n="{len(kartu)}">{''.join(kartu)}</div>
<a class="lihat-semua" href="event.html">{escape(T['lihat_update'])} →</a>
</div></section>
"""


def bagian_alasan() -> str:
    data = getattr(K, "ALASAN", None) or BERANDA[LANG]["alasan"]
    kartu = "".join(
        f'<div class="alasan-kartu"><span class="ikon"><svg viewBox="0 0 24 24" aria-hidden="true">{IKON.get(ik, IKON["cek"])}</svg></span>'
        f'<h3>{escape(j)}</h3><p>{escape(t)}</p></div>'
        for ik, j, t in data
    )
    return f"""
<section class="sec" style="padding-top:0"><div class="inner">
<h2>{escape(T['alasan_judul'])}</h2>
<div class="alasan">{kartu}</div>
</div></section>
"""


def bagian_alur() -> str:
    data = getattr(K, "ALUR", None) or BERANDA[LANG]["alur"]
    langkah = "".join(
        f'<div class="langkah"><b>{i}</b><h3>{escape(j)}</h3><p>{escape(t)}</p></div>'
        for i, (j, t) in enumerate(data, 1)
    )
    return f"""
<section class="sec" style="padding-top:0"><div class="inner">
<h2>{escape(T['alur_judul'])}</h2>
<div class="alur">{langkah}</div>
</div></section>
"""


def bagian_mitra() -> str:
    nama = []
    for _, grup in K.MAL:
        for _, _, daftar in grup:
            nama += [m[0] if isinstance(m, tuple) else m for m in daftar[:3]]
    nama = nama[:48]
    baris = [nama[0::2], nama[1::2]]
    rows = []
    for i, isi in enumerate(baris):
        chips = "".join(f'<span class="mitra-chip">{escape(n)}</span>' for n in isi)
        balik = " balik" if i else ""
        rows.append(
            f'<div class="run{balik}" style="--dur:{max(40, len(isi) * 3)}s" aria-hidden="true"><div class="run-track">'
            f'<div class="run-set">{chips}</div><div class="run-set">{chips}</div></div></div>'
        )
    return f"""
<section class="sec mitra" style="padding-top:0"><div class="inner">
<h2>{escape(T['mitra_judul'])}</h2>
</div>
{''.join(rows)}
<div class="inner"><a class="lihat-semua" href="lokasi.html">{escape(T['lihat_lokasi'])} →</a></div>
</section>
"""


def bagian_cta() -> str:
    return f"""
<section class="cta" data-partikel><div class="inner">
<h2>{escape(T['cta_judul'])}</h2>
<p>{escape(T['cta_sub'])}</p>
<div>{tombol(T['btn_wa'], wa_url(), 'wa')}{tombol(K.HERO['tombol_kedua'][0], K.HERO['tombol_kedua'][1], 'line')}</div>
</div></section>
"""


def halaman_home() -> str:
    logo = aset(img_url(K.PERUSAHAAN["logo"], 512))
    galeri = "".join(
        f'<figure class="gal">{foto(f, "gal-img", ket, lazy=False)}<figcaption>{escape(ket)}</figcaption></figure>'
        for f, ket in K.GALERI_HOME
    )
    visi = "".join(f'<div class="vm-kartu"><h3>{escape(j)}</h3><p>{escape(t)}</p></div>' for j, t in K.VISI)
    misi = "".join(f"<li>{escape(m)}</li>" for m in K.MISI)
    bg, kf = hero_foto()
    kelas_hero = "hero hero-foto" if bg else "hero"
    return f"""{kf}
<div class="{kelas_hero}" data-partikel>{bg}<div>
<h1>{escape(K.HERO['judul'])}</h1>
<p>{escape(K.HERO['deskripsi'])}</p>
{tombol(*K.HERO['tombol_utama'], 'gold')}{tombol(*K.HERO['tombol_kedua'], 'line')}
</div>{koin_html(logo)}
<a class="scroll-cue" href="#stat"><span>{escape(T['scroll'])}</span><i></i></a></div>

{bagian_ticker()}

{bagian_statistik()}

<section class="sec profil"><div class="inner split">
<div class="split-teks"><h2>{escape(K.PROFIL['judul'])}</h2>{paragraf(K.PROFIL['paragraf'])}</div>
{foto(K.PROFIL['foto'], 'foto-about', K.PROFIL['judul'])}
</div></section>

{bagian_spesialisasi()}

{bagian_update_beranda()}

{bagian_alasan()}

{bagian_alur()}

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

{bagian_mitra()}

<section class="sec" style="padding-top:0"><div class="inner">
<h2 style="margin-bottom:36px">{escape(K.GALERI_JUDUL)}</h2>
<div class="marquee" style="--dur:{len(K.GALERI_HOME) * K.GALERI_DETIK}s">
<div class="track"><div class="set">{galeri}</div><div class="set" aria-hidden="true">{galeri}</div></div>
</div>
</div></section>
{bagian_video()}
{bagian_cta()}"""


def artikel_event(i: int, e: dict) -> str:
    kelas = "art rev" if i % 2 else "art"
    fotos = "".join(foto(f, "mo", e["judul"]) for f in e["foto"])
    return (
        f'<article class="{kelas}" id="{slug(e["judul"])}">'
        f'<div class="art-teks"><span class="art-no" aria-hidden="true">{i + 1:02d}</span><h2>{escape(e["judul"])}</h2>'
        f'<p class="lead">{escape(e["lead"])}</p>{paragraf(e["isi"])}</div>'
        f'<div class="mosaic">{fotos}</div></article>'
    )


def halaman_event() -> str:
    artikel = "".join(artikel_event(i, e) for i, e in enumerate(K.EVENT_TIPE))
    navigasi = "".join(
        f'<a href="#{slug(e["judul"])}"><b>{i + 1:02d}</b><span>{escape(e["judul"])}</span></a>'
        for i, e in enumerate(K.EVENT_TIPE)
    )
    chips = [T["chip_event"].format(n=len(K.EVENT_TIPE))]
    if UPDATE:
        chips.insert(0, T["chip_update"].format(n=len(UPDATE)))
    chips.append(T["chip_berkala"])
    return kepala(K.EVENT_JUDUL, K.EVENT_DESKRIPSI, chips) + bagian_update() + (
        f'<section class="sec" style="padding-top:{20 if UPDATE else 40}px"><div class="inner">'
        f'<h2 style="margin-bottom:8px">{escape(T["jenis_judul"])}</h2>'
        f'<div class="jenis"><nav class="jenis-nav" aria-label="{escape(T["jenis_nav"])}">{navigasi}</nav>'
        f'<div class="jenis-isi">{artikel}</div></div></div></section>'
    )


AREA_DATA: list = []   # diisi oleh daftar_mal(): area yang punya mal, untuk peta


def area_mal(nama: str, q: str, label: str):
    if not PT:
        return None
    teks = f"{nama} {q}".lower()
    for kata, kunci in PT.ATURAN:
        if kata in teks:
            return kunci
    return PT.LABEL_AREA.get(label)


def daftar_mal() -> tuple:
    nama_wilayah = getattr(K, "NAMA_WILAYAH", {})  # terjemahan nama wilayah (opsional)
    total, hasil, area_pakai = 0, [], {}
    for idx, (wilayah, grup) in enumerate(K.MAL):
        w_tampil = nama_wilayah.get(wilayah, wilayah)
        kelompok = []
        for label, kueri, daftar in grup:
            l_tampil = nama_wilayah.get(label, label)
            kartu, area_grup = [], []
            for m in daftar:
                total += 1
                nama, q = m if isinstance(m, tuple) else (m, f"{m} {kueri}".strip())
                url = "https://www.google.com/maps/search/?api=1&query=" + quote_plus(q)
                ak = area_mal(nama, q, label)
                if ak and ak in PT.AREA:
                    area_pakai[ak] = area_pakai.get(ak, 0) + 1
                    if ak not in area_grup:
                        area_grup.append(ak)
                cari = f"{nama} {l_tampil} {w_tampil} {label} {wilayah}".lower()
                kartu.append(
                    f'<a class="mal" href="{escape(url)}" target="_blank" rel="noopener" data-cari="{escape(cari)}" '
                    f'data-area="{ak or ""}" data-wil="w{idx}"><span class="no">{total:02d}</span>{escape(nama)}</a>'
                )
            ke_peta = ""
            if area_grup:
                ke_peta = (f'<button class="ke-peta" type="button" data-areas="{",".join(area_grup)}">'
                           f'{escape(T["ke_peta"])}</button>')
            kelompok.append(
                f'<div class="kel"><div class="grp-baris"><h3 class="grp">{escape(l_tampil)}</h3>{ke_peta}</div>'
                f'<div class="malgrid">{"".join(kartu)}</div></div>'
            )
        hasil.append(f'<div class="wilayah"><h2 class="wil">{escape(w_tampil)}</h2>{"".join(kelompok)}</div>')
    AREA_DATA[:] = [
        {"k": k, "n": PT.AREA[k][0 if LANG == "id" else 1], "lat": PT.AREA[k][2], "lng": PT.AREA[k][3]}
        for k in PT.AREA if k in area_pakai
    ] if PT else []
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
    return f'<section class="stats" id="stat"><div class="inner">{item}</div></section>'


def halaman_lokasi() -> tuple:
    daftar, total = daftar_mal()
    n_area = len(AREA_DATA)
    nama_wilayah = getattr(K, "NAMA_WILAYAH", {})
    chips_wil = f'<button class="chip chip-wil on" type="button" data-wil="semua" aria-pressed="true">{escape(T["wilayah_semua"])}</button>' + "".join(
        f'<button class="chip chip-wil" type="button" data-wil="w{i}" aria-pressed="false">{escape(nama_wilayah.get(w, w))}</button>'
        for i, (w, _) in enumerate(K.MAL)
    )
    peta = ""
    if PT and AREA_DATA:
        data = json.dumps(AREA_DATA, ensure_ascii=False).replace("</", "<\\/")
        peta = f"""
<div class="peta-bungkus">
<div id="peta" class="peta" role="region" aria-label="{escape(T['peta_judul'])}"></div>
<div class="peta-aksi"><p class="peta-catatan">{escape(T['peta_catatan'])}</p>
<button class="chip" id="peta-semua" type="button">{escape(T['peta_semua'])}</button></div>
</div>
<script type="application/json" id="peta-data">{data}</script>
"""
    chips = [T["chip_lokasi"].format(n=total)]
    if n_area:
        chips.append(T["chip_area"].format(n=n_area))
    isi = kepala(T["lokasi_judul"], T["lokasi_sub"].format(total=total), chips) + f"""
<section class="sec" style="padding-top:36px"><div class="inner">
{peta}
<div class="cari" data-total="{total}">
<label for="cari">{escape(T['cari_label'])}</label>
<input id="cari" type="search" placeholder="{escape(T['cari_hint'])}" autocomplete="off">
<div class="chips" role="group">{chips_wil}</div>
<p class="jumlah" id="jumlah" aria-live="polite">{escape(T['jumlah'].format(total=total))}</p>
</div>
{daftar}
<div class="kosong" id="kosong" hidden>{escape(T['kosong'])}</div>
</div></section>
"""
    return isi, total


def ikon_svg(nama: str) -> str:
    return f'<span class="ikon"><svg viewBox="0 0 24 24" aria-hidden="true">{IKON[nama]}</svg></span>'


def nomor_dari(teks: str) -> str:
    m = re.search(r"([+\d(][\d()\s+-]{7,}\d)", teks)
    return m.group(1) if m else teks


def rapikan_nomor(n: str) -> str:
    """628161415671 -> +62 816 1415 671 (bentuk lain ditampilkan apa adanya dengan tanda +)."""
    d = re.sub(r"\D", "", n)
    if d.startswith("62") and len(d) >= 11:
        return f"+62 {d[2:5]} {d[5:9]} {d[9:]}"
    return "+" + d


def tombol_salin(nilai: str) -> str:
    return f'<button class="salin" type="button" data-salin="{escape(nilai)}">{escape(T["salin"])}</button>'


def bagian_faq() -> str:
    data = getattr(K, "FAQ", None) or FAQ[LANG]
    item = "".join(
        f'<div class="faq-item"><h3><button class="faq-tanya" type="button" aria-expanded="false">'
        f'<span>{escape(q)}</span><i aria-hidden="true"></i></button></h3>'
        f'<div class="faq-jawab"><div><p>{escape(a)}</p></div></div></div>'
        for q, a in data
    )
    return f"""
<section class="sec faq"><div class="inner">
<h2>{escape(T['faq_judul'])}</h2>
<div class="faq-daftar">{item}</div>
</div></section>
"""


def halaman_kontak() -> str:
    alamat = "<br>".join(escape(x) for x in K.KONTAK["alamat"])
    telp = "".join(
        f'<div class="baris-salin"><span>{tautan_telepon(x)}</span>{tombol_salin(nomor_dari(x))}</div>'
        for x in K.KONTAK["telepon"]
    )
    email = escape(K.KONTAK["email"])
    sosmed = "".join(
        f'<a class="pil" href="{escape(u)}" target="_blank" rel="noopener">{escape(n)}<span>{escape(t)}</span></a>'
        for n, t, u in K.SOSMED
    )
    rute = "https://www.google.com/maps/dir/?api=1&destination=" + quote_plus(K.KANTOR_QUERY)
    opsi = "".join(
        f'<label class="opsi"><input type="radio" name="butuh" value="{escape(o)}"{" checked" if i == 0 else ""}>'
        f'<span>{escape(o)}</span></label>'
        for i, o in enumerate(T["opsi"])
    )
    kartu = f"""
<section class="sec kartu-sec" style="padding-bottom:0"><div class="inner kartu-grid">
<div class="kartu-kontak utama">{ikon_svg('chat')}<h3>WhatsApp</h3><p>{escape(T['k_wa_sub'])}</p>
<p class="besar">{escape(rapikan_nomor(K.WA_NOMOR))}</p>{tombol(T['btn_wa'], wa_url(), 'wa')}</div>
<div class="kartu-kontak">{ikon_svg('telp')}<h3>{escape(T['k_telp'])}</h3>{telp}</div>
<div class="kartu-kontak">{ikon_svg('surel')}<h3>{escape(T['k_email'])}</h3>
<div class="baris-salin"><span><a href="mailto:{email}">{email}</a></span>{tombol_salin(K.KONTAK['email'])}</div></div>
<div class="kartu-kontak">{ikon_svg('pin')}<h3>{escape(T['k_alamat'])}</h3><p>{alamat}</p>
{tombol(T['rute'], rute, 'gold')}</div>
<div class="kartu-kontak lebar">{ikon_svg('bagi')}<h3>{escape(T['k_sosmed'])}</h3><div class="pils">{sosmed}</div></div>
</div></section>
"""
    return kepala(K.KONTAK["judul"], K.KONTAK["deskripsi"], [T["chip_gratis"], T["chip_wa"]]) + kartu + f"""
<section class="kontak" style="margin-top:80px"><div class="inner cols">
<div>
<h2>{escape(T['form_judul'])}</h2>
<p class="form-sub">{escape(T['form_sub'])}</p>
<form class="form" id="form-wa" data-wa="{escape(K.WA_NOMOR)}">
<label>{escape(T['f_nama'])}<input name="nama" required autocomplete="name"></label>
<label>{escape(T['f_usaha'])}<input name="usaha" autocomplete="organization"></label>
<fieldset class="opsi-grup"><legend>{escape(T['f_butuh'])}</legend>{opsi}</fieldset>
<label>{escape(T['f_pesan'])}<textarea name="pesan" required></textarea></label>
<button type="submit">{escape(T['f_kirim'])}</button>
<p class="form-info" hidden><a href="#" target="_blank" rel="noopener">{escape(T['wa_manual'])}</a></p>
</form>
</div>
<div>
<iframe title="{escape(T['peta'])}" src="{escape(maps_embed())}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
{tombol(T['btn_maps'], maps_url(), "gold")}{tombol(T['rute'], rute, "line")}
</div>
</div></section>
{bagian_faq()}
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

    UPDATE[:] = muat_update()
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
    print(f"Update event: {len(UPDATE)} event, {sum(len(u['foto']) for u in UPDATE)} foto dokumentasi")
    for p in PERINGATAN:
        print("PERHATIAN:", p)
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

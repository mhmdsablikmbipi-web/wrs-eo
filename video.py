"""
VIDEO DARI KANAL YOUTUBE WRS  (tampil di Home, di bawah Galeri kegiatan)

Cara menambah video:
  1. Buka video di YouTube, salin alamatnya (boleh link lengkap atau hanya kodenya).
  2. Tambahkan satu blok { ... } di daftar VIDEO di bawah.
  3. Jalankan  python build.py

Keterangan:
  "id"      : link YouTube atau kode video (contoh: "4O_G2vuPlM0").
  "judul"   : bisa teks biasa, atau {"id": "...", "en": "..."} agar ikut berganti bahasa.
  "mulai"   : detik mulai putar (0 = dari awal).
  "selesai" : detik berhenti (0 = sampai akhir). Isi "mulai" dan "selesai" untuk membuat
              klip singkat dari video panjang, misalnya mulai 30 dan selesai 60 = klip 30 detik.

Kosongkan daftar ([]) kalau belum ingin menampilkan video; bagian videonya otomatis hilang.
Video yang pemiliknya mematikan fitur "sematkan" (embed) tidak bisa diputar di website;
bagi video seperti itu pengunjung masih bisa klik tautan "Tonton di YouTube".
"""

VIDEO = [
    {
        # Ditemukan lewat pencarian di YouTube: "PT. WAHANA REZEKI SEMPURNA - AEON MALL SENTUL BOGOR,
        # Event WRS OTOshow Juli 2022". Pastikan video ini memang ada di kanal WRS Anda dan bisa disematkan.
        "id": "https://www.youtube.com/watch?v=4O_G2vuPlM0",
        "judul": {
            "id": "WRS OTOshow di AEON Mall Sentul Bogor (Juli 2022)",
            "en": "WRS OTOshow at AEON Mall Sentul Bogor (July 2022)",
        },
        "mulai": 0,
        "selesai": 0,
    },
]

"""
VIDEO DARI KANAL YOUTUBE WRS  (tampil di bagian paling bawah Home dan halaman Portofolio)

Ada dua cara, dan keduanya boleh dipakai bersamaan:

1) OTOMATIS (sudah aktif): website menampilkan pemutar yang selalu memuat video TERBARU
   dari kanal "WRS EO OFFICIAL". Setiap kali WRS mengunggah video baru ke YouTube, video
   itu muncul sendiri di website, tanpa perlu mengedit apa pun atau menjalankan build lagi.
   Kodenya (KANAL_ID) tidak berubah selama kanalnya sama.

   Kalau mau mematikan pemutar otomatis, ubah VIDEO_TERBARU_OTOMATIS menjadi False.

2) PILIHAN MANUAL (opsional): video tertentu yang ingin Anda sorot, misalnya aftermovie
   event besar. Tambahkan satu blok { ... } di daftar VIDEO di bawah, lalu jalankan
   python build.py (atau push ke GitHub).

   "id"      : link YouTube atau kode video (contoh: "https://www.youtube.com/watch?v=XXXXXXXXXXX")
   "judul"   : teks biasa, atau {"id": "...", "en": "..."} agar ikut berganti bahasa
   "mulai"   : detik mulai putar (0 = dari awal)
   "selesai" : detik berhenti (0 = sampai akhir); isi mulai dan selesai untuk membuat klip singkat

Video yang pemiliknya mematikan fitur "sematkan" (embed) tidak bisa diputar di website;
untuk itu pengunjung masih bisa klik tautan "Tonton di YouTube".
"""

# Kode kanal YouTube WRS EO OFFICIAL (@wrseo3919). Diawali "UC".
KANAL_ID = "UC9suvWOPsqNR4R4yg9ghJiw"

# Tombol "Buka kanal YouTube WRS" mengarah ke sini.
KANAL_URL = "https://www.youtube.com/@wrseo3919"

# True = pemutar otomatis video terbaru kanal. False = hanya video pilihan di bawah.
VIDEO_TERBARU_OTOMATIS = True

# Video pilihan manual. Kosongkan ([]) kalau tidak diperlukan.
# Contoh (hapus tanda # di depan untuk memakai):
# VIDEO = [
#     {
#         "id": "https://www.youtube.com/watch?v=GANTI_DENGAN_KODE_VIDEO",
#         "judul": {"id": "Aftermovie Event WRS", "en": "WRS Event Aftermovie"},
#         "mulai": 0,
#         "selesai": 0,
#     },
# ]
VIDEO = []

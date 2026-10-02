# Website PT. Wahana Rezeki Sempurna (statis)

Isi website ada di `konten.py`, tampilan di `assets/style.css`, foto asli di folder `foto/`.
Folder `docs/` adalah hasil jadi yang dipublikasikan GitHub Pages. Jangan diedit langsung,
karena akan ditimpa setiap kali `build.py` dijalankan.

## Mengubah isi website
1. Edit `konten.py` (teks, daftar mal, kontak, nomor WhatsApp) atau ganti foto di folder `foto/`.
2. Jalankan `python build.py`. Untuk melihat hasilnya di komputer: `python build.py --serve`, lalu buka http://localhost:8000.
3. Commit dan push ke GitHub. Website ikut diperbarui dalam beberapa menit.

Pertama kali: `pip install -r requirements.txt`.

## Memasang di GitHub Pages
1. Buat repository baru di GitHub, lalu unggah seluruh isi folder ini (termasuk folder `docs/`).
2. Di GitHub: Settings > Pages > Build and deployment > Source: Deploy from a branch.
3. Pilih Branch: `main`, folder: `/docs`, lalu Save.
4. Alamat website muncul di halaman yang sama, biasanya `https://NAMAANDA.github.io/NAMA-REPO/`.
5. Isi `SITE_URL` di `konten.py` dengan alamat itu, jalankan `python build.py` lagi, lalu push. Ini membuat sitemap untuk Google.

## Domain sendiri (opsional)
Di Settings > Pages > Custom domain, isi domain Anda. GitHub membuat file `docs/CNAME`; file ini aman dari build berikutnya.
Lalu atur DNS di registrar sesuai petunjuk GitHub dan aktifkan Enforce HTTPS.

## Animasi dan interaksi
Website memakai animasi ringan tanpa library tambahan: bagian yang muncul perlahan saat di-scroll,
angka yang menghitung naik, navbar yang mengecil saat digulir dan hamburger di HP, tombol WhatsApp
melayang, dan foto yang bisa diklik untuk diperbesar (geser dengan tombol panah atau usap di HP).
Semua animasi otomatis mati bagi pengunjung yang mengaktifkan pengaturan "kurangi gerakan".

Kode animasi ada di bagian paling bawah `assets/style.css` dan di `assets/app.js`.

### Angka di bawah hero (Home)
Secara bawaan angkanya dihitung otomatis: tahun pengalaman (tahun sekarang dikurangi 2003),
jumlah mal di daftar, dan jumlah jenis event. Untuk mengubahnya, tambahkan ke `konten.py` (opsional):

    TAHUN_BERDIRI = 2003
    STATISTIK = [            # (angka, akhiran, label)
        (23, "", "tahun pengalaman"),
        (107, "", "lokasi mal mitra"),
        (4, "", "jenis event andalan"),
    ]

Kalau `STATISTIK` tidak ditulis, angka bawaan dipakai.

## Dua bahasa (Indonesia dan Inggris)
Website punya dua versi: Indonesia di alamat utama dan Inggris di `/en/`. Tombol **ID | EN** di navbar
memindahkan pengunjung ke halaman yang sama dalam bahasa lain.

- Teks bahasa Indonesia: `konten.py` (seperti biasa).
- Teks bahasa Inggris: `konten_en.py`. File ini hanya berisi teks yang perlu diterjemahkan. Daftar mal, kontak,
  sosial media, nomor WhatsApp, dan nama file foto diambil otomatis dari `konten.py`, jadi tidak perlu ditulis dua kali.
- Kalau teks Indonesia diubah, ubah juga terjemahannya di `konten_en.py`.
- Label tombol dan form (di luar konten) ada di `build.py`, pada kamus `UI`.
- Tidak ingin versi Inggris? Hapus `konten_en.py`, lalu jalankan `python build.py`. Tombol bahasa otomatis hilang.
- Setelah `SITE_URL` diisi di `konten.py`, build ikut membuat tag `hreflang` dan sitemap untuk kedua bahasa.

## Video YouTube
Video ada di bagian bawah Home, diatur di `video.py`. Cukup tempel link video dari kanal YouTube WRS.
Isi `mulai` dan `selesai` (dalam detik) untuk menjadikannya klip singkat, misalnya mulai 30 dan selesai 60.
Pemutar baru dimuat saat gambar diklik, jadi halaman tetap ringan. Kosongkan daftar `VIDEO` untuk menyembunyikan bagian ini.

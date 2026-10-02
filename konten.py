"""
KONTEN WEBSITE PT. WAHANA REZEKI SEMPURNA (WRS)

Semua teks, daftar mal, kontak, dan nama file foto diedit di file ini.
Setelah selesai mengedit, jalankan:   python build.py
Hasilnya (website statis) ada di folder  docs/

Foto: taruh file aslinya di folder  foto/  lalu tulis namanya di bawah
(contoh "otomotif-1.png"). Saat build, foto otomatis dikecilkan dan diubah
ke format WebP. Foto yang belum ada tampil sebagai kotak putus-putus.
"""

# Alamat website setelah online, contoh: "https://namaanda.github.io/wrs-website/"
# atau domain sendiri "https://wrs-eo.com/". Boleh dikosongkan dulu; kalau diisi,
# build ikut membuat sitemap.xml dan robots.txt untuk Google.
SITE_URL = ""

PERUSAHAAN = {"nama": "PT. Wahana Rezeki Sempurna", "logo": "logo.png"}

# Menu navbar: (teks menu, kode halaman)
MENU = [
    ("Beranda", "home"),
    ("Artikel Event", "event"),
    ("Lokasi Mal", "lokasi"),
    ("Kontak", "kontak"),
]

# ------------------------------- HALAMAN HOME --------------------------------
HERO = {
    "judul": "Mau jualan di mal? Kami bantu usaha Anda naik kelas.",
    "deskripsi": (
        "PT. Wahana Rezeki Sempurna adalah Exhibition Organizer yang sejak 2003 "
        "menyelenggarakan pameran, bazaar, dan penyewaan space di berbagai mal "
        "dan pusat perbelanjaan."
    ),
    "tombol_utama": ("Lihat event kami", "?hal=event"),
    "tombol_kedua": ("Konsultasi gratis", "?hal=kontak"),
}

PROFIL = {
    "judul": "Profil perusahaan",
    "paragraf": [
        "PT. Wahana Rezeki Sempurna adalah perusahaan profesional di bidang Exhibition "
        "Organizer, penyelenggara event pameran dan promosi. Kami melayani berbagai "
        "industri: otomotif, properti, teknologi, furniture, perbankan, travel, fashion, "
        "F&B, hingga aksesori.",
    ],
    "foto": "profil.png",
}

PENDIRI = {
    "nama": "Rizal Mulyana, S.E., M.B.A.",
    "jabatan": "Direktur Utama",
    "cerita": [
        "PT. Wahana Rezeki Sempurna atau yang biasa disingkat dengan PT. WRS dipimpin oleh Rizal Mulyana, S.E., M.B.A. "
        "sebagai Direktur Utama. Dengan pengalaman yang banyak, dibawah kepemimpinan Rizal Mulyana, PT. Wahana Rezeki Sempurna "
        "mampu bertahan dan terus mengembangkan usaha Event Organizer yang mewadahi banyak usaha UMKM. Rizal Mulyana mulai menekuni "
        "dunia bisnis ini sejak tahun 2000 an yang dimulai dari sewa menyewa ruang usaha untuk UMKM di ITC Mangga Dua.",
    ],
    "foto": "pendiri.png",
}

# Visi: (judul, penjelasan). Tambah atau hapus baris sesuka Anda.
VISI = [
    ("Worth it", "Memberikan event pameran yang berharga dan bermanfaat bagi mitra kami."),
    ("Reliable", "Mitra yang terpercaya dan dapat diandalkan."),
    ("Service", "Kami berupaya memberikan pelayanan yang terbaik."),
]
MISI = [
    "Memberikan pelayanan jasa profesional demi tercapainya kesuksesan di setiap penyelenggaraan kegiatan Exhibition / pameran serta promotion service sehingga memberikan pencapaian hasil yang luar biasa bagi mitra kami.",
    "Ikut membantu berpartisipasi meramaikan mall / gedung yang kami kelola sehingga meningkatkan penjualan, karena pameran adalah media komunikasi promosi yang efektif selain mampu menjangkau target market yang luas, dapat juga memberikan pesan komersial yang diinginkan.",
]

LATAR = {
    "judul": "Latar Belakang Perusahaan",
    "paragraf": [
        "PT Wahana Rezeki Sempurna, atau WRS, didirikan pada sekitar 2003 dan bergerak di "
        "bidang Exhibition Organizer dan jasa penyelenggaraan pameran/promosi. Namun, akar "
        "bisnisnya berawal dari aktivitas yang lebih sederhana, yaitu menyediakan dan "
        "menyewakan ruang usaha bagi para pelaku UMKM.",
        "Rizal Mulyana, S.E., M.B.A., yang kemudian menjadi "
        "Direktur Utama WRS, mulai menekuni bisnis sejak awal 2000-an. Salah satu langkah "
        "awalnya adalah mengelola penyewaan ruang usaha bagi UMKM di ITC Mangga Dua, "
        "Jakarta. Dari kegiatan tersebut, ia melihat adanya kebutuhan besar dari pedagang kecil "
        "terhadap ruang usaha yang strategis di pusat-pusat perbelanjaan.",
    ],
}

GALERI_JUDUL = "Galeri kegiatan"
GALERI_DETIK = 6  # detik per foto; makin besar makin lambat
# (nama file di folder images/, keterangan). Tambah atau hapus baris sesuka Anda.
GALERI_HOME = [
    ("home-1.png", "Pameran di mal"),
    ("home-2.png", "Bazaar dan event promosi"),
    ("home-3.png", "Pameran Furniture"),
    ("home-4.png", "Penataan area pameran"),
    ("home-5.png", "Kerja sama dengan mal mitra"),
    ("home-6.png", "Pengunjung event"),
]

# ---------------------------- HALAMAN ARTIKEL EVENT --------------------------
EVENT_JUDUL = "Artikel event WRS"
EVENT_DESKRIPSI = "Jenis event yang rutin kami selenggarakan di mal mitra, lengkap dengan dokumentasinya."
# "foto": 3 file. Foto pertama tampil besar, dua lainnya di sampingnya.
EVENT_TIPE = [
    {
        "judul": "Pameran otomotif",
        "lead": "Tempat merek, dealer, dan calon pembeli bertemu langsung di area publik mal.",
        "isi": [
            "Pameran otomotif adalah salah satu event andalan WRS. Berbagai merek dan dealer "
            "menampilkan unit terbaru di area mal, sehingga pengunjung bisa melihat, "
            "membandingkan, dan bertanya langsung kepada tenaga penjual.",
            "Bagi peserta, format ini efektif untuk menjaring calon pembeli dan memperkuat merek. "
            "Tim WRS membantu penataan area, alur pengunjung, dan promosi event.",
        ],
        "foto": ["otomotif-1.png", "otomotif-2.png", "otomotif-3.png"],
    },
    {
        "judul": "Pameran multi produk",
        "lead": "Satu event, banyak kategori usaha dalam satu area pameran.",
        "isi": [
            "Pameran multi produk menghadirkan beragam bisnis sekaligus, seperti perbankan, "
            "properti, teknologi, travel, dan kebutuhan rumah tangga. Pengunjung mal bisa "
            "menjelajahi banyak penawaran dalam satu kunjungan.",
            "Format ini cocok untuk bisnis yang ingin tampil di mal tanpa menyelenggarakan "
            "acara sendiri. Kami menyiapkan tempat, penataan, dan promosinya.",
        ],
        "foto": ["multiproduk-1.png", "multiproduk-2.png", "multiproduk-3.png"],
    },
    {
        "judul": "Pameran furniture",
        "lead": "Perlengkapan rumah dan interior, dipamerkan langsung kepada calon pembeli.",
        "isi": [
            "Pameran furniture mempertemukan produsen dan penjual perabot dengan pengunjung "
            "yang sedang mencari perlengkapan rumah. Produk bisa dilihat, disentuh, dan "
            "dibandingkan secara langsung.",
            "WRS mengatur tata letak area pameran agar setiap produk mudah dilihat dan "
            "pengunjung nyaman berkeliling.",
        ],
        "foto": ["furniture-1.png", "furniture-2.png", "furniture-3.png"],
    },
    {
        "judul": "Bazaar",
        "lead": "Ruang berjualan yang terjangkau untuk fashion, F&B, aksesori, dan usaha kecil.",
        "isi": [
            "Bazaar menyediakan counter dan kios di mal bagi pelaku usaha yang ingin "
            "bertemu pembeli secara langsung. Kategori yang biasa hadir antara lain fashion, "
            "F&B, dan aksesori.",
            "Baru pertama kali berjualan di mal? Tim kami siap membantu memilih lokasi, tanggal, "
            "dan ukuran space yang sesuai.",
        ],
        "foto": ["bazaar-1.png", "bazaar-2.png", "bazaar-3.png"],
    },
]

# ---------------------------- HALAMAN LOKASI MAL -----------------------------
# Susunan: (wilayah, [(label kelompok, kata tambahan untuk pencarian Google Maps, [daftar mal])])
# Mal boleh ditulis "Nama" saja, atau ("Nama tampilan", "kata pencarian Google Maps lengkap")
# kalau hasil pencarian Google Maps kurang tepat.
MAL = [
    ("Jabodetabek", [
        ("Jakarta Barat", "Jakarta Barat", [
            "Season City", "Mall Taman Palem", "Puri Indah Mall", "Lippo Puri Mall",
            "Neo Soho", "Central Park"]),
        ("Jakarta Timur", "Jakarta Timur", [
            ("Living World Kota Wisata Cibubur", "Living World Kota Wisata Cibubur"),
            "Aeon Mall JGC Cakung", "Pusat Grosir Cililitan (PGC)", "TSM Cibubur",
            "City Plaza Jatinegara", "Basura City Mall", "Lippo Kramat Jati",
            "Tamini Square", "Cibubur Junction", "Cijantung Mall"]),
        ("Jakarta Pusat", "Jakarta Pusat", [
            "Transmart Cempaka Putih", "ITC Cempaka Mas", "Pasar Baru Jakarta",
            "Senayan City", "Senayan Park", "Gajah Mada Plaza", "Kenari Plaza",
            "Thamrin City"]),
        ("Jakarta Utara", "Jakarta Utara", [
            "Koja Trade Mall", "Baywalk Mall", "Pluit Village", "Mall Artha Gading",
            "Central Market PIK"]),
        ("Jakarta Selatan", "Jakarta Selatan", [
            "Kemang Village", "Aeon Mall Tanjung Barat", "Mall Ambassador",
            "Blok M Square", "Pondok Indah Mall", "Kalibata City", "Kalibata Plaza",
            "Poins Square", "Kota Kasablanka", "Cilandak Town Square", "Kuningan City"]),
        ("Bekasi, Cikarang, Karawang", "", [
            "Revo Mall Bekasi", "Bekasi Trade Center", "CyberPark Bekasi",
            "Grand Metropolitan Mall Bekasi", "Sentra Grosir Cikarang (SGC)",
            "Aeon Delta Mas Cikarang", "Living Plaza Jababeka", "Karawang Central Plaza"]),
        ("Tangerang", "Tangerang", [
            "Aeon Mall BSD", "Bintaro Plaza", "ITC BSD", "Tang City", "Eastvara BSD",
            "Mall Ciputra Raya Tangerang", "The Barn BSD", "Supermall Karawaci",
            "Bintaro Xchange", "Greenlake Lavela Grand Lucky", "Living World Alam Sutera"]),
        ("Depok", "Depok", [
            "The Park Sawangan", "Margo City Depok", "Depok Town Square", "ITC Depok"]),
        ("Bogor", "Bogor", [
            "Aeon Mall Sentul City", "Botani Square Bogor", "Cibinong City Mall",
            "Pusat Grosir Bogor (PGB)"]),
        ("Banten", "Serang", ["Mall of Serang"]),
    ]),
    ("Luar Jabodetabek / luar kota", [
        ("Bandung / Jawa Barat", "Bandung", [
            "Botanica Bandung", "Summarecon Mall Bandung", "Paskal 23 Mall Bandung",
            "TSM Bandung", "Paris Van Java"]),
        ("Palembang", "", [
            "Palembang Square", "Palembang Icon", "Palembang Indah Mall",
            "Palembang Trade Center", "Citimall Lahat", "Lippo Plaza Lubuk Linggau",
            "Transmart Palembang"]),
        ("Sulawesi", "", ["TSM Makassar", "Transmart Kawanua Manado"]),
        ("Sumatera", "", [
            "Central Plaza Lampung", "Transmart Padang", "Transmart Pangkal Pinang",
            "Transmart Lampung", "Sunplaza Medan", "Pekanbaru Exchange",
            "Transmart Pekanbaru", "Living World Pekanbaru", "SKA Mall Pekanbaru",
            ("Sukaramai Trade Center", "Sukaramai Trade Center Pekanbaru"),
            "Delipark Mall Medan", "Centre Point Mall Medan"]),
        ("Surabaya / Jawa Timur", "", [
            "Kaza Mall Surabaya", "Pakuwon City Mall Surabaya", "Unimas District Sidoarjo",
            "Kediri Town Square", ("Delta Plaza", "Delta Plaza Surabaya"),
            "Trans Icon Surabaya", "Suncity Madiun", "Lippo Sidoarjo",
            ("Cito", "Cito City of Tomorrow Surabaya"), "Plaza Marina Surabaya",
            "Transmart Rungkut Surabaya", "Suncity Mall Sidoarjo", "Galaxy Mall Surabaya"]),
    ]),
]

# ------------------------------- HALAMAN CONTACT -----------------------------
KONTAK = {
    "judul": "Hubungi kami",
    "deskripsi": "Tanyakan slot pameran, sewa space, atau konsultasi strategi. Kami balas secepatnya.",
    "alamat": [
        "Graha WRS, Ruko Season City Blok A No. 33-35,",
        "Jl. Jembatan Besi, Latumenten, Jakarta Barat 11320",
    ],
    "telepon": ["(021) 2907 1225", "Call center: 0816 1415 671"],
    "email": "Wrsempurna.eo@gmail.com",
}

# Sosial media: (nama, teks yang tampil, link)
SOSMED = [
    ("Youtube", "wrs eo official", "https://www.youtube.com/@wrseo3919"),
    ("Instagram", "@eo.wrs.id", "https://www.instagram.com/eo.wrs.id"),
    ("TikTok", "@wrs.eo", "https://www.tiktok.com/@wrs.eo"),
]

# WhatsApp: isi tanpa tanda + dan tanpa 0 di depan. Contoh: 6281614156710
WA_NOMOR = "628161415671"
WA_PESAN = "Halo WRS, saya ingin bertanya tentang pameran atau sewa space di mal."

# Google Maps kantor pusat. KANTOR_QUERY dipakai untuk peta dan tombol.
# Kalau pin kurang pas, buka lokasi di Google Maps > Bagikan > salin link, lalu tempel di KANTOR_LINK.
KANTOR_QUERY = "Graha WRS, Ruko Season City Blok A No. 33-35, Jl. Jembatan Besi, Latumenten, Jakarta Barat 11320"
KANTOR_LINK = ""

FOOTER = "© 2026 PT. Wahana Rezeki Sempurna. Semua hak dilindungi."

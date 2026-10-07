"""
DATA PETA HALAMAN LOKASI MAL

Penanda di peta menunjukkan AREA (kota atau wilayah), bukan titik persis tiap mal.
Koordinatnya adalah titik pusat kota yang dibulatkan. Daftar mal tetap membuka lokasi
persis lewat Google Maps. Tiap mal dimasukkan ke area lewat kata kunci pada namanya
(ATURAN); kalau tidak ada yang cocok, dipakai nama kelompoknya (LABEL_AREA).

Menambah mal baru di konten.py biasanya tidak perlu mengubah file ini, selama nama mal
atau kelompoknya mengandung nama kota yang sudah ada. Untuk kota baru, tambahkan di AREA
dan ATURAN. Koordinat bisa dicek di Google Maps (klik kanan pada peta > salin koordinat).
"""

# kunci: (nama Indonesia, nama Inggris, lintang, bujur)
AREA = {
    "jakbar": ("Jakarta Barat", "West Jakarta", -6.1683, 106.7589),
    "jaktim": ("Jakarta Timur", "East Jakarta", -6.2250, 106.9004),
    "jakpus": ("Jakarta Pusat", "Central Jakarta", -6.1865, 106.8341),
    "jakut": ("Jakarta Utara", "North Jakarta", -6.1384, 106.8630),
    "jaksel": ("Jakarta Selatan", "South Jakarta", -6.2615, 106.8106),
    "bekasi": ("Bekasi", "Bekasi", -6.2383, 106.9756),
    "cikarang": ("Cikarang", "Cikarang", -6.2616, 107.1527),
    "karawang": ("Karawang", "Karawang", -6.3227, 107.3376),
    "tangerang": ("Tangerang", "Tangerang", -6.2300, 106.6500),
    "depok": ("Depok", "Depok", -6.4025, 106.7942),
    "bogor": ("Bogor", "Bogor", -6.5950, 106.8166),
    "serang": ("Serang", "Serang", -6.1200, 106.1503),
    "bandung": ("Bandung", "Bandung", -6.9175, 107.6191),
    "palembang": ("Palembang", "Palembang", -2.9761, 104.7754),
    "lahat": ("Lahat", "Lahat", -3.7928, 103.5365),
    "lubuklinggau": ("Lubuk Linggau", "Lubuk Linggau", -3.2999, 102.8613),
    "makassar": ("Makassar", "Makassar", -5.1477, 119.4327),
    "manado": ("Manado", "Manado", 1.4748, 124.8421),
    "lampung": ("Bandar Lampung", "Bandar Lampung", -5.4500, 105.2667),
    "padang": ("Padang", "Padang", -0.9492, 100.3543),
    "pangkalpinang": ("Pangkal Pinang", "Pangkal Pinang", -2.1316, 106.1169),
    "medan": ("Medan", "Medan", 3.5952, 98.6722),
    "pekanbaru": ("Pekanbaru", "Pekanbaru", 0.5071, 101.4478),
    "surabaya": ("Surabaya", "Surabaya", -7.2575, 112.7521),
    "sidoarjo": ("Sidoarjo", "Sidoarjo", -7.4478, 112.7183),
    "kediri": ("Kediri", "Kediri", -7.8167, 112.0111),
    "madiun": ("Madiun", "Madiun", -7.6298, 111.5238),
}

# (kata kunci pada nama mal / kata pencarian, kunci area). Yang lebih spesifik di atas.
ATURAN = [
    ("lubuk linggau", "lubuklinggau"), ("lahat", "lahat"), ("palembang", "palembang"),
    ("lampung", "lampung"), ("padang", "padang"), ("pangkal pinang", "pangkalpinang"),
    ("medan", "medan"), ("pekanbaru", "pekanbaru"), ("manado", "manado"), ("kawanua", "manado"),
    ("makassar", "makassar"), ("madiun", "madiun"), ("kediri", "kediri"), ("sidoarjo", "sidoarjo"),
    ("surabaya", "surabaya"), ("paris van java", "bandung"), ("bandung", "bandung"),
    ("karawang", "karawang"), ("cikarang", "cikarang"), ("jababeka", "cikarang"), ("bekasi", "bekasi"),
    ("serang", "serang"), ("sentul", "bogor"), ("cibinong", "bogor"), ("bogor", "bogor"), ("depok", "depok"),
]

# Nama kelompok di konten.py -> area (dipakai bila tidak ada kata kunci yang cocok)
LABEL_AREA = {
    "Jakarta Barat": "jakbar", "Jakarta Timur": "jaktim", "Jakarta Pusat": "jakpus",
    "Jakarta Utara": "jakut", "Jakarta Selatan": "jaksel", "Tangerang": "tangerang",
    "Depok": "depok", "Bogor": "bogor", "Banten": "serang",
}

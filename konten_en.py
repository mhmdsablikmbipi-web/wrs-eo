"""
ENGLISH VERSION OF THE WRS WEBSITE CONTENT

Everything not written in this file (mall list, contact details, social media,
photo names, WhatsApp number, etc.) is taken from konten.py, so you only edit
those things there. This file contains only the texts that need translating.

After editing, run:   python build.py
The English pages are generated into docs/en/
"""

from konten import *  # noqa: F401,F403  (semua isi konten.py dipakai kembali)
import konten as _id

MENU = [
    ("Home", "home"),
    ("Event Articles", "event"),
    ("Mall Locations", "lokasi"),
    ("Contact", "kontak"),
]

HERO = {
    "judul": "Want to sell in a mall? We help your business level up.",
    "deskripsi": (
        "PT. Wahana Rezeki Sempurna is an Exhibition Organizer that has been running "
        "exhibitions, bazaars, and space rentals in malls and shopping centers since 2003."
    ),
    "tombol_utama": ("See our events", "?hal=event"),
    "tombol_kedua": ("Free consultation", "?hal=kontak"),
}

PROFIL = {
    "judul": "Company profile",
    "paragraf": [
        "PT. Wahana Rezeki Sempurna is a professional Exhibition Organizer, running exhibition "
        "and promotional events. We serve a wide range of industries: automotive, property, "
        "technology, furniture, banking, travel, fashion, F&B, and accessories.",
    ],
    "foto": _id.PROFIL["foto"],
}

PENDIRI = {
    "nama": _id.PENDIRI["nama"],
    "jabatan": "President Director",
    "cerita": [
        "PT. Wahana Rezeki Sempurna, commonly abbreviated as PT. WRS, is led by Rizal Mulyana, "
        "S.E., M.B.A. as President Director. With extensive experience, under his leadership "
        "PT. Wahana Rezeki Sempurna has endured and continues to grow its Event Organizer business, "
        "which serves many MSMEs (small and medium businesses). Rizal Mulyana began his business "
        "career in the early 2000s, starting with renting out business space for MSMEs at "
        "ITC Mangga Dua.",
    ],
    "foto": _id.PENDIRI["foto"],
}

VISI = [
    ("Worth it", "Delivering exhibitions that are valuable and beneficial for our partners."),
    ("Reliable", "A trusted and dependable partner."),
    ("Service", "We strive to provide the best service."),
]
MISI = [
    "To provide professional services that lead to success in every exhibition event and "
    "promotion service, delivering outstanding results for our partners.",
    "To help enliven the malls / buildings we manage and increase their sales, because "
    "exhibitions are an effective promotional communication medium that reaches a wide target "
    "market and can deliver the commercial message our partners want.",
]

LATAR = {
    "judul": "Company background",
    "paragraf": [
        "PT Wahana Rezeki Sempurna, or WRS, was founded around 2003 and operates as an Exhibition "
        "Organizer and provider of exhibition/promotional event services. Its business, however, "
        "began with a simpler activity: providing and renting out business space to MSME operators.",
        "Rizal Mulyana, S.E., M.B.A., who later became WRS's President Director, began his business "
        "career in the early 2000s. One of his first steps was managing business space rentals for "
        "MSMEs at ITC Mangga Dua, Jakarta. From this work, he saw a great need among small traders "
        "for strategic business space in shopping centers.",
    ],
}

GALERI_JUDUL = "Activity gallery"
# Captions in the same order as GALERI_HOME in konten.py (photo files come from there).
_KET_GALERI = [
    "Mall exhibition",
    "Bazaar and promotional events",
    "Furniture exhibition",
    "Exhibition area layout",
    "Partnership with partner malls",
    "Event visitors",
]
GALERI_HOME = [(f, ket) for (f, _), ket in zip(_id.GALERI_HOME, _KET_GALERI)]

EVENT_JUDUL = "WRS event articles"
EVENT_DESKRIPSI = "The kinds of events we regularly hold in partner malls, with photo documentation."
# Texts in the same order as EVENT_TIPE in konten.py (photo files come from there).
_EVENT_EN = [
    {
        "judul": "Automotive exhibitions",
        "lead": "Where brands, dealers, and prospective buyers meet face to face in a mall's public areas.",
        "isi": [
            "Automotive exhibitions are one of WRS's signature events. Brands and dealers showcase "
            "their latest models in the mall, so visitors can see, compare, and ask sales staff directly.",
            "For participants, this format is effective for reaching prospective buyers and "
            "strengthening the brand. The WRS team helps with area layout, visitor flow, and "
            "event promotion.",
        ],
    },
    {
        "judul": "Multi-product exhibitions",
        "lead": "One event, many business categories in a single exhibition area.",
        "isi": [
            "Multi-product exhibitions bring many businesses together at once, such as banking, "
            "property, technology, travel, and household needs. Mall visitors can explore many "
            "offers in a single visit.",
            "This format suits businesses that want a presence in a mall without organizing an "
            "event of their own. We prepare the venue, layout, and promotion.",
        ],
    },
    {
        "judul": "Furniture exhibitions",
        "lead": "Home furnishings and interiors, displayed directly to prospective buyers.",
        "isi": [
            "Furniture exhibitions bring manufacturers and furniture sellers together with visitors "
            "who are looking for home furnishings. Products can be seen, touched, and compared in person.",
            "WRS arranges the exhibition layout so every product is easy to see and visitors can "
            "move around comfortably.",
        ],
    },
    {
        "judul": "Bazaars",
        "lead": "Affordable selling space for fashion, F&B, accessories, and small businesses.",
        "isi": [
            "Bazaars provide counters and kiosks in malls for business owners who want to meet "
            "buyers face to face. Categories that usually take part include fashion, F&B, and accessories.",
            "Selling in a mall for the first time? Our team is ready to help you choose the right "
            "location, dates, and space size.",
        ],
    },
]
EVENT_TIPE = [dict(e, **t) for e, t in zip(_id.EVENT_TIPE, _EVENT_EN)]

# Display names for the mall list (search on Google Maps still uses the original names).
NAMA_WILAYAH = {
    "Jabodetabek": "Greater Jakarta (Jabodetabek)",
    "Luar Jabodetabek / luar kota": "Outside Greater Jakarta / other cities",
    "Jakarta Barat": "West Jakarta",
    "Jakarta Timur": "East Jakarta",
    "Jakarta Pusat": "Central Jakarta",
    "Jakarta Utara": "North Jakarta",
    "Jakarta Selatan": "South Jakarta",
    "Bandung / Jawa Barat": "Bandung / West Java",
    "Sumatera": "Sumatra",
    "Surabaya / Jawa Timur": "Surabaya / East Java",
}

KONTAK = dict(
    _id.KONTAK,
    judul="Contact us",
    deskripsi="Ask about exhibition slots, space rental, or a free strategy consultation. We reply as soon as possible.",
)
WA_PESAN = "Hello WRS, I would like to ask about exhibitions or space rental in malls."
FOOTER = "© 2026 PT. Wahana Rezeki Sempurna. All rights reserved."

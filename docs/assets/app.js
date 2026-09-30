/* Pencarian mal (halaman Lokasi) dan form WhatsApp (halaman Contact). */
(function () {
  var cari = document.getElementById("cari");
  if (cari) {
    var total = parseInt(cari.parentNode.getAttribute("data-total"), 10) || 0;
    var jumlah = document.getElementById("jumlah");
    var kosong = document.getElementById("kosong");
    cari.addEventListener("input", function () {
      var q = cari.value.trim().toLowerCase();
      var tampil = 0;
      document.querySelectorAll(".mal").forEach(function (a) {
        var ok = !q || a.getAttribute("data-cari").indexOf(q) !== -1;
        a.hidden = !ok;
        if (ok) tampil++;
      });
      document.querySelectorAll(".kel").forEach(function (k) {
        k.hidden = !k.querySelector(".mal:not([hidden])");
      });
      document.querySelectorAll(".wilayah").forEach(function (w) {
        w.hidden = !w.querySelector(".kel:not([hidden])");
      });
      kosong.hidden = tampil > 0;
      jumlah.textContent = q ? tampil + " dari " + total + " lokasi" : total + " lokasi";
    });
  }

  var form = document.getElementById("form-wa");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var usaha = d.get("usaha") ? " dari " + d.get("usaha") : "";
      var teks =
        "Halo WRS, saya " + d.get("nama") + usaha + ".\n" +
        "Kebutuhan: " + d.get("butuh") + "\n\n" + d.get("pesan");
      var url = "https://wa.me/" + form.getAttribute("data-wa") + "?text=" + encodeURIComponent(teks);
      window.open(url, "_blank", "noopener");
    });
  }
})();

const varsayilanAromalar = [
  { kod: "F 122 05116", ad: "ŞEFTALİ AROMASI", tedarikci: "ROBERTET", stok: 86, kritik: 10, aciklama: "", termin: "" },
  { kod: "F120 08030", ad: "ACIBADEM AROMASI", tedarikci: "ROBERTET", stok: 56, kritik: 10, aciklama: "", termin: "" },
  { kod: "F120 08404", ad: "MUZ AROMASI", tedarikci: "ROBERTET", stok: 52, kritik: 10, aciklama: "", termin: "" },
  { kod: "F120 10941", ad: "KAHVE AROMASI", tedarikci: "ROBERTET", stok: 60.58, kritik: 10, aciklama: "", termin: "" }
];

const VARSAYILAN_OZEL_SIFRE = "365325";

let aromalar = [];
let siparisler = [];
let ozelKayitlar = [];
let ozelUrunSirasi = [];

let seciliAromaIndex = null;
let duzenlemeModu = false;
let duzenlenenAromaIndex = null;
let seciliSiparisId = null;

let ozelDuzenlemeModu = false;
let ozelDuzenlenenId = null;
let acikOzelUrunAdi = null;

function $(id) { return document.getElementById(id); }

function buyukHarfeCevir(text) {
  return String(text || "").toLocaleUpperCase("tr-TR");
}

function kodNormalizeEt(kod) {
  return String(kod || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[\s.\-_/]+/g, "")
    .trim();
}

function sayiFormatla(deger) {
  const sayi = Number(deger || 0);
  if (sayi === 0) return "0";
  if (Math.abs(sayi) < 1) return sayi.toFixed(5).replace(/\.?0+$/, "");
  return sayi.toFixed(3).replace(/\.?0+$/, "");
}

function bugununTarihiInputIcin() {
  const bugun = new Date();
  return `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, "0")}-${String(bugun.getDate()).padStart(2, "0")}`;
}

function tarihFormatla(tarih) {
  if (!tarih) return "-";
  const parcalar = String(tarih).split("-");
  if (parcalar.length !== 3) return tarih;
  return `${parcalar[2]}.${parcalar[1]}.${parcalar[0]}`;
}

function beklemeSuresiHesapla(tarih) {
  if (!tarih) return "-";
  const baslangic = new Date(`${tarih}T00:00:00`);
  if (Number.isNaN(baslangic.getTime())) return "-";

  const bugun = new Date();
  const bugunSifir = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate());
  const gun = Math.floor((bugunSifir - baslangic) / (1000 * 60 * 60 * 24));

  if (gun < 0) return "TARİH GELECEKTE";
  if (gun === 0) return "BUGÜN";
  if (gun === 1) return "1 GÜN";
  return `${gun} GÜN`;
}

function mevcutOzelSifreGetir() {
  return localStorage.getItem("ozelAlanSifresi") || VARSAYILAN_OZEL_SIFRE;
}

function aromaEslesmeBulIndex(kod, tedarikci) {
  return aromalar.findIndex((a) =>
    kodNormalizeEt(a.kod) === kodNormalizeEt(kod) &&
    kodNormalizeEt(a.tedarikci) === kodNormalizeEt(tedarikci)
  );
}

function aromaKodunaGoreBulIndex(kod) {
  return aromalar.findIndex((a) => kodNormalizeEt(a.kod) === kodNormalizeEt(kod));
}

function aromaKodundanBul(kod) {
  return aromalar.find((a) => kodNormalizeEt(a.kod) === kodNormalizeEt(kod));
}

function siparisBul(id) {
  return siparisler.find((s) => String(s.id) === String(id));
}

function ozelKayitBul(id) {
  return ozelKayitlar.find((k) => String(k.id) === String(id));
}

function ozelUrunSirasiGuncelle() {
  const benzersizUrunler = [...new Set(
    ozelKayitlar
      .map((k) => buyukHarfeCevir(k.urunAdi || "").trim())
      .filter(Boolean)
  )];

  const mevcutSiradakiler = ozelUrunSirasi.filter((urun) => benzersizUrunler.includes(urun));
  const yeniOlanlar = benzersizUrunler.filter((urun) => !mevcutSiradakiler.includes(urun));

  ozelUrunSirasi = [...mevcutSiradakiler, ...yeniOlanlar];
}

function ozelUrunSiraIndexGetir(urunAdi) {
  const index = ozelUrunSirasi.indexOf(buyukHarfeCevir(urunAdi || "").trim());
  return index === -1 ? 999999 : index;
}

function ozelUrunSirasiDegistir(eskiUrunAdi, yeniUrunAdi) {
  const eski = buyukHarfeCevir(eskiUrunAdi || "").trim();
  const yeni = buyukHarfeCevir(yeniUrunAdi || "").trim();
  if (!eski || !yeni || eski === yeni) return;

  ozelUrunSirasiGuncelle();

  const eskiIndex = ozelUrunSirasi.indexOf(eski);
  const yeniIndex = ozelUrunSirasi.indexOf(yeni);

  if (eskiIndex === -1 || yeniIndex === -1) return;

  const tasinan = ozelUrunSirasi.splice(eskiIndex, 1)[0];
  ozelUrunSirasi.splice(yeniIndex, 0, tasinan);

  verileriKaydet();
  ozelTabloyuDoldur(filtreliOzelListeGetir());
}

function ozelUrunTasi(urunAdi, yon) {
  const sirali = ozelKayitlariUrunBazliGrupla(ozelKayitlar).map((g) => g.urunAdi);
  const i = sirali.indexOf(buyukHarfeCevir(urunAdi || "").trim());
  if (i === -1) return;

  const hedefIndex = yon === "yukari" ? i - 1 : i + 1;
  if (hedefIndex < 0 || hedefIndex >= sirali.length) return;

  ozelUrunSirasiDegistir(sirali[i], sirali[hedefIndex]);
}

function ozelUrunuTamamenSil(urunAdi) {
  const hedef = buyukHarfeCevir(urunAdi || "").trim();
  if (!hedef) return;

  const buUrunKayitlari = ozelKayitlar.filter((k) => buyukHarfeCevir(k.urunAdi || "").trim() === hedef);
  if (!buUrunKayitlari.length) return;

  if (!confirm(`${hedef} ürününü ve içindeki ${buUrunKayitlari.length} kalemi tamamen silmek istiyor musun?`)) return;

  ozelKayitlar = ozelKayitlar.filter((k) => buyukHarfeCevir(k.urunAdi || "").trim() !== hedef);
  ozelUrunSirasi = ozelUrunSirasi.filter((urun) => urun !== hedef);

  if (acikOzelUrunAdi === hedef) {
    acikOzelUrunAdi = null;
    modalKapat("ozelDetayModal");
  }

  verileriKaydet();
  ozelTabloyuDoldur(filtreliOzelListeGetir());
}

function verileriKaydet() {
  localStorage.setItem("aromaStokListesi", JSON.stringify(aromalar));
  localStorage.setItem("bekleyenSiparisListesi", JSON.stringify(siparisler));
  localStorage.setItem("ozelReceteListesi", JSON.stringify(ozelKayitlar));
  localStorage.setItem("ozelUrunSirasi", JSON.stringify(ozelUrunSirasi));
}

function verileriYukle() {
  const kayitliAromalar = localStorage.getItem("aromaStokListesi");
  const kayitliSiparisler = localStorage.getItem("bekleyenSiparisListesi");
  const kayitliOzelKayitlar = localStorage.getItem("ozelReceteListesi");
  const kayitliOzelUrunSirasi = localStorage.getItem("ozelUrunSirasi");

  if (kayitliAromalar) {
    try {
      aromalar = JSON.parse(kayitliAromalar).map((aroma) => ({
        kod: buyukHarfeCevir(aroma.kod || ""),
        ad: buyukHarfeCevir(aroma.ad || ""),
        tedarikci: buyukHarfeCevir(aroma.tedarikci || ""),
        stok: Number(aroma.stok || 0),
        kritik: Number(aroma.kritik || 10),
        aciklama: aroma.aciklama || "",
        termin: buyukHarfeCevir(aroma.termin || "")
      }));
    } catch {
      aromalar = varsayilanAromalar.map((a) => ({ ...a }));
    }
  } else {
    aromalar = varsayilanAromalar.map((a) => ({ ...a }));
  }

  if (kayitliSiparisler) {
    try {
      siparisler = JSON.parse(kayitliSiparisler).map((siparis) => ({
        id: siparis.id || Date.now() + Math.random(),
        kod: buyukHarfeCevir(siparis.kod || ""),
        ad: buyukHarfeCevir(siparis.ad || ""),
        tedarikci: buyukHarfeCevir(siparis.tedarikci || ""),
        miktar: Number(siparis.miktar || 0),
        tarih: siparis.tarih || bugununTarihiInputIcin(),
        aciklama: siparis.aciklama || ""
      }));
    } catch {
      siparisler = [];
    }
  } else {
    siparisler = [];
  }

  if (kayitliOzelKayitlar) {
    try {
      ozelKayitlar = JSON.parse(kayitliOzelKayitlar).map((kayit) => ({
        id: kayit.id || Date.now() + Math.random(),
        urunAdi: buyukHarfeCevir(kayit.urunAdi || kayit.urun || ""),
        aromaKod: buyukHarfeCevir(kayit.aromaKod || kayit.kod || ""),
        aromaAd: buyukHarfeCevir(kayit.aromaAd || kayit.ad || ""),
        miktar: Number(kayit.miktar || 0),
        birim: buyukHarfeCevir(kayit.birim || "KG"),
        not: kayit.not || ""
      }));
    } catch {
      ozelKayitlar = [];
    }
  } else {
    ozelKayitlar = [];
  }

  if (kayitliOzelUrunSirasi) {
    try {
      ozelUrunSirasi = JSON.parse(kayitliOzelUrunSirasi).map((x) => buyukHarfeCevir(x));
    } catch {
      ozelUrunSirasi = [];
    }
  } else {
    ozelUrunSirasi = [];
  }

  if (!localStorage.getItem("ozelAlanSifresi")) {
    localStorage.setItem("ozelAlanSifresi", VARSAYILAN_OZEL_SIFRE);
  }

  ozelUrunSirasiGuncelle();
  verileriKaydet();
}

function durumBilgisiGetir(aroma) {
  const stok = Number(aroma.stok || 0);
  const kritik = Number(aroma.kritik || 10);

  if (stok <= 0) return { metin: "STOK YOK", sinif: "kirmizi" };
  if (kritik > 0 && stok <= kritik) return { metin: "KRİTİK", sinif: "turuncu" };
  return { metin: "YETERLİ", sinif: "yesil" };
}

function filtreliListeGetir() {
  const aranan = ($("aramaKutusu").value || "").toLocaleLowerCase("tr-TR").trim();
  if (!aranan) return aromalar;

  return aromalar.filter((aroma) =>
    String(aroma.kod || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(aroma.ad || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(aroma.tedarikci || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(aroma.aciklama || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(aroma.termin || "").toLocaleLowerCase("tr-TR").includes(aranan)
  );
}

function filtreliSiparisListeGetir() {
  const aranan = ($("siparisAramaKutusu").value || "").toLocaleLowerCase("tr-TR").trim();
  if (!aranan) return siparisler;

  return siparisler.filter((siparis) =>
    String(siparis.kod || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(siparis.ad || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(siparis.tedarikci || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(siparis.tarih || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(siparis.aciklama || "").toLocaleLowerCase("tr-TR").includes(aranan)
  );
}

function filtreliOzelListeGetir() {
  const aranan = ($("ozelAramaKutusu").value || "").toLocaleLowerCase("tr-TR").trim();
  if (!aranan) return ozelKayitlar;

  return ozelKayitlar.filter((kayit) =>
    String(kayit.urunAdi || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(kayit.aromaKod || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(kayit.aromaAd || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(kayit.birim || "").toLocaleLowerCase("tr-TR").includes(aranan) ||
    String(kayit.not || "").toLocaleLowerCase("tr-TR").includes(aranan)
  );
}

function ozetleriGuncelle() {
  const kritikSayisi = aromalar.filter((aroma) => {
    const stok = Number(aroma.stok || 0);
    const kritik = Number(aroma.kritik || 10);
    return stok <= 0 || (kritik > 0 && stok <= kritik);
  }).length;

  $("kritikStok").textContent = kritikSayisi;
  $("bekleyenSiparis").textContent = siparisler.length;
}

function bodyModalDurumuGuncelle() {
  const ids = [
    "detayModal",
    "formModal",
    "siparisModal",
    "siparisDetayModal",
    "listeModal",
    "ozelSifreModal",
    "ozelAlanModal",
    "ozelFormModal",
    "ozelDetayModal"
  ];

  const acik = ids.some((id) => {
    const el = $(id);
    return el && !el.classList.contains("gizli");
  });

  document.body.classList.toggle("modal-acik", acik);
}

function modalAc(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("gizli");
  bodyModalDurumuGuncelle();
}

function modalKapat(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add("gizli");
  bodyModalDurumuGuncelle();
}

function tumKucukPopupKapat() {
  modalKapat("detayModal");
  modalKapat("formModal");
  modalKapat("siparisModal");
  modalKapat("siparisDetayModal");
  modalKapat("listeModal");
  modalKapat("ozelFormModal");
  modalKapat("ozelDetayModal");
}

function tabloyuDoldur(liste = aromalar) {
  const tablo = $("aromaTablosu");
  tablo.innerHTML = "";

  if (!liste.length) {
    tablo.innerHTML = `<tr><td colspan="8" class="bos-metin">Kayıt bulunamadı.</td></tr>`;
    return;
  }

  liste.forEach((aroma) => {
    const orijinalIndex = aromaEslesmeBulIndex(aroma.kod, aroma.tedarikci);
    const durum = durumBilgisiGetir(aroma);
    const notVarMi = String(aroma.aciklama || "").trim() !== "";

    const tr = document.createElement("tr");
    tr.className = seciliAromaIndex === orijinalIndex ? "secili-satir" : "";
    tr.dataset.index = orijinalIndex;
    tr.draggable = true;

    tr.addEventListener("click", (event) => {
      if (event.target.closest(".surukle-hucre")) return;
      aromaSec(orijinalIndex);
    });

    tr.innerHTML = `
      <td class="surukle-hucre" data-label="Sırala" title="Sürükle">
        <span class="surukle-ikon">↕</span>
        <span class="sira-butonlari">
          <button type="button" class="sira-btn" data-sira="yukari" title="Yukarı taşı">↑</button>
          <button type="button" class="sira-btn" data-sira="asagi" title="Aşağı taşı">↓</button>
        </span>
      </td>
      <td data-label="Kod">${aroma.kod}</td>
      <td data-label="Aroma Adı">${aroma.ad}</td>
      <td data-label="Tedarikçi">${aroma.tedarikci || "-"}</td>
      <td data-label="Stok">${sayiFormatla(aroma.stok)} kg</td>
      <td class="not-hucre" data-label="Not">${notVarMi ? '<span class="not-ikon" title="Açıklama var">!</span>' : ""}</td>
      <td class="${durum.sinif}" data-label="Durum">${durum.metin}</td>
      <td data-label="Termin">${aroma.termin || "-"}</td>
    `;

    tablo.appendChild(tr);
  });

  aromaSurukleBirakBagla();
}

function siparisTablosunuDoldur(liste = siparisler) {
  const tablo = $("siparisTablosu");
  tablo.innerHTML = "";

  if (!liste.length) {
    tablo.innerHTML = `<tr><td colspan="8" class="bos-metin">Bekleyen sipariş yok.</td></tr>`;
    return;
  }

  liste.forEach((siparis) => {
    const notVarMi = String(siparis.aciklama || "").trim() !== "";

    const tr = document.createElement("tr");
    tr.dataset.id = siparis.id;

    tr.innerHTML = `
      <td data-label="Kod">${siparis.kod}</td>
      <td data-label="Aroma Adı">${siparis.ad}</td>
      <td data-label="Tedarikçi">${siparis.tedarikci || "-"}</td>
      <td data-label="Miktar">${sayiFormatla(siparis.miktar)} kg</td>
      <td data-label="Tarih">${tarihFormatla(siparis.tarih)}</td>
      <td data-label="Bekleme">${beklemeSuresiHesapla(siparis.tarih)}</td>
      <td class="not-hucre" data-label="Not">${notVarMi ? '<span class="not-ikon" title="Açıklama var">!</span>' : ""}</td>
      <td data-label="İşlem">
        <div class="siparis-islem">
          <button class="yesil-btn buton-mini" data-id="${siparis.id}" data-islem="stok">Stoğa Dahil Et</button>
          <button class="gri-btn buton-mini" data-id="${siparis.id}" data-islem="sil">Sil</button>
        </div>
      </td>
    `;

    tr.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      siparisDetayAc(siparis.id);
    });

    tablo.appendChild(tr);
  });
}

function ozelKayitlariUrunBazliGrupla(liste = ozelKayitlar) {
  const map = new Map();

  liste.forEach((kayit) => {
    const anahtar = buyukHarfeCevir(kayit.urunAdi || "").trim();
    if (!anahtar) return;

    if (!map.has(anahtar)) {
      map.set(anahtar, {
        urunAdi: anahtar,
        kayitlar: []
      });
    }

    map.get(anahtar).kayitlar.push(kayit);
  });

  ozelUrunSirasiGuncelle();

  return Array.from(map.values()).sort((a, b) => {
    return ozelUrunSiraIndexGetir(a.urunAdi) - ozelUrunSiraIndexGetir(b.urunAdi);
  });
}

function ozelToplamBilgisiGetir(kayitlar) {
  const birimler = [...new Set(kayitlar.map((k) => buyukHarfeCevir(k.birim || "KG")))];
  if (birimler.length === 1) {
    const toplam = kayitlar.reduce((sum, k) => sum + Number(k.miktar || 0), 0);
    return `${sayiFormatla(toplam)} ${birimler[0]}`;
  }
  return `${kayitlar.length} KALEM`;
}

function urunUretimAnaliziGetir(kayitlar) {
  const kgKalemler = kayitlar.filter((k) => buyukHarfeCevir(k.birim || "") === "KG" && Number(k.miktar || 0) > 0);

  if (!kgKalemler.length) {
    return {
      uretilebilirTon: null,
      kisitlayanKalem: null,
      durumMetni: "HESAPLANAMADI",
      durumSinif: "turuncu"
    };
  }

  const detaylar = kgKalemler.map((kayit) => {
    const stokKaydi = aromaKodundanBul(kayit.aromaKod);
    const mevcutStok = stokKaydi ? Number(stokKaydi.stok || 0) : null;
    const gereken = Number(kayit.miktar || 0);
    const ton = mevcutStok === null ? null : mevcutStok / gereken;

    return {
      kayit,
      stokKaydi,
      mevcutStok,
      gereken,
      ton
    };
  });

  const hesaplanabilenler = detaylar.filter((d) => d.ton !== null && Number.isFinite(d.ton));

  if (!hesaplanabilenler.length) {
    return {
      uretilebilirTon: null,
      kisitlayanKalem: null,
      durumMetni: "STOK EŞLEŞMESİ YOK",
      durumSinif: "kirmizi"
    };
  }

  const enDusuk = hesaplanabilenler.reduce((min, d) => d.ton < min.ton ? d : min, hesaplanabilenler[0]);

  return {
    uretilebilirTon: enDusuk.ton,
    kisitlayanKalem: enDusuk,
    durumMetni: `${sayiFormatla(enDusuk.ton)} TON`,
    durumSinif: enDusuk.ton <= 0 ? "kirmizi" : enDusuk.ton <= 1 ? "turuncu" : "yesil"
  };
}

function ozelTabloyuDoldur(liste = ozelKayitlar) {
  const tablo = $("ozelTablo");
  tablo.innerHTML = "";

  if (!liste.length) {
    tablo.innerHTML = `<tr><td colspan="5" class="bos-metin">Özel kayıt bulunamadı.</td></tr>`;
    return;
  }

  const gruplar = ozelKayitlariUrunBazliGrupla(liste);

  gruplar.forEach((grup) => {
    const analiz = urunUretimAnaliziGetir(grup.kayitlar);
    const ilkUc = grup.kayitlar
      .slice(0, 3)
      .map((k) => `${k.aromaAd} (${sayiFormatla(k.miktar)} ${k.birim})`)
      .join("<br>");

    const devamVar = grup.kayitlar.length > 3
      ? `<div style="margin-top:6px; color:#6b7280; font-size:13px;">+ ${grup.kayitlar.length - 3} KALEM DAHA</div>`
      : "";

    const tr = document.createElement("tr");
    tr.className = "ozel-urun-satir";
    tr.dataset.urunadi = grup.urunAdi;
    tr.draggable = true;

    tr.innerHTML = `
      <td class="ozel-surukle-hucre" data-label="Sırala" title="Sürükle">
        <span class="surukle-ikon">↕</span>
        <span class="sira-butonlari">
          <button type="button" class="sira-btn" data-ozelsira="yukari" title="Yukarı taşı">↑</button>
          <button type="button" class="sira-btn" data-ozelsira="asagi" title="Aşağı taşı">↓</button>
        </span>
      </td>
      <td data-label="Ürün">
        <strong>${grup.urunAdi}</strong>
        <div style="margin-top:6px; color:#6b7280; font-size:13px;">${grup.kayitlar.length} aroma kalemi</div>
      </td>
      <td data-label="Özet">
        <div style="font-size:13px; line-height:1.5;">${ilkUc || "-"}</div>
        ${devamVar}
      </td>
      <td data-label="Üretim">
        <div style="font-size:13px; color:#6b7280;">TOPLAM: ${ozelToplamBilgisiGetir(grup.kayitlar)}</div>
        <div class="${analiz.durumSinif}" style="margin-top:6px; font-size:18px; font-weight:700;">${analiz.durumMetni}</div>
      </td>
      <td data-label="İşlem">
        <div class="ozel-islem">
          <button class="yesil-btn buton-mini ozel-ekle-btn" data-urunekle="${grup.urunAdi}">+ Kalem Ekle</button>
          <button class="gri-btn buton-mini" data-urunsil="${grup.urunAdi}">Ürünü Sil</button>
        </div>
      </td>
    `;

    tr.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      ozelUrunDetayAc(grup.urunAdi);
    });

    tablo.appendChild(tr);
  });

  ozelUrunSurukleBirakBagla();
}

function aromaSec(index) {
  const aroma = aromalar[index];
  if (!aroma) return;

  seciliAromaIndex = index;
  const durum = durumBilgisiGetir(aroma);

  $("detayKod").textContent = aroma.kod;
  $("detayAd").textContent = aroma.ad;
  $("detayTedarikci").textContent = aroma.tedarikci || "-";
  $("detayStok").textContent = `${sayiFormatla(aroma.stok)} kg`;
  $("detayDurum").textContent = durum.metin;
  $("detayDurum").className = durum.sinif;
  $("detayKritikLimit").textContent = `${sayiFormatla(aroma.kritik || 0)} kg`;
  $("detayKritikInput").value = Number(aroma.kritik || 0);
  $("detayTermin").textContent = aroma.termin || "-";
  $("detayTerminInput").value = aroma.termin || "";
  $("detayAciklama").textContent = aroma.aciklama || "-";

  tabloyuDoldur(filtreliListeGetir());
  modalAc("detayModal");
}

function siparisDetayAc(id) {
  const siparis = siparisBul(id);
  if (!siparis) return;

  seciliSiparisId = id;
  $("siparisDetayKod").textContent = siparis.kod;
  $("siparisDetayAd").textContent = siparis.ad;
  $("siparisDetayTedarikci").textContent = siparis.tedarikci || "-";
  $("siparisDetayMiktar").textContent = `${sayiFormatla(siparis.miktar)} kg`;
  $("siparisDetayTarih").textContent = tarihFormatla(siparis.tarih);
  $("siparisDetayBekleme").textContent = beklemeSuresiHesapla(siparis.tarih);
  $("siparisDetayAciklama").value = siparis.aciklama || "";
  $("siparisDetayMiktarInput").value = "";

  modalAc("siparisDetayModal");
}

function bekleyenSiparisPopupAc() {
  $("listeModalBaslik").textContent = "Bekleyen Siparişler";
  $("listeModalThead").innerHTML = `
    <tr>
      <th>Kod</th>
      <th>Aroma Adı</th>
      <th>Tedarikçi</th>
      <th>Miktar</th>
      <th>Tarih</th>
      <th>Bekleme</th>
      <th>Not</th>
    </tr>
  `;

  const tbody = $("listeModalTbody");
  tbody.innerHTML = "";

  if (!siparisler.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="bos-metin">Bekleyen sipariş yok.</td></tr>`;
    modalAc("listeModal");
    return;
  }

  siparisler.forEach((siparis) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Kod">${siparis.kod}</td>
      <td data-label="Aroma Adı">${siparis.ad}</td>
      <td data-label="Tedarikçi">${siparis.tedarikci || "-"}</td>
      <td data-label="Miktar">${sayiFormatla(siparis.miktar)} kg</td>
      <td data-label="Tarih">${tarihFormatla(siparis.tarih)}</td>
      <td data-label="Bekleme">${beklemeSuresiHesapla(siparis.tarih)}</td>
      <td class="not-hucre" data-label="Not">${String(siparis.aciklama || "").trim() ? '<span class="not-ikon">!</span>' : ""}</td>
    `;
    tr.addEventListener("click", () => {
      modalKapat("listeModal");
      siparisDetayAc(siparis.id);
    });
    tbody.appendChild(tr);
  });

  modalAc("listeModal");
}

function kritikStokPopupAc() {
  $("listeModalBaslik").textContent = "Kritik Stoktaki Aromalar";
  $("listeModalThead").innerHTML = `
    <tr>
      <th>Kod</th>
      <th>Aroma Adı</th>
      <th>Tedarikçi</th>
      <th>Stok</th>
      <th>Not</th>
      <th>Durum</th>
      <th>Termin</th>
    </tr>
  `;

  const tbody = $("listeModalTbody");
  tbody.innerHTML = "";

  const kritikAromalar = aromalar.filter((aroma) => {
    const stok = Number(aroma.stok || 0);
    const kritik = Number(aroma.kritik || 10);
    return stok <= 0 || (kritik > 0 && stok <= kritik);
  });

  if (!kritikAromalar.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="bos-metin">Kritik stokta aroma yok.</td></tr>`;
    modalAc("listeModal");
    return;
  }

  kritikAromalar.forEach((aroma) => {
    const durum = durumBilgisiGetir(aroma);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Kod">${aroma.kod}</td>
      <td data-label="Aroma Adı">${aroma.ad}</td>
      <td data-label="Tedarikçi">${aroma.tedarikci || "-"}</td>
      <td data-label="Stok">${sayiFormatla(aroma.stok)} kg</td>
      <td class="not-hucre" data-label="Not">${String(aroma.aciklama || "").trim() ? '<span class="not-ikon">!</span>' : ""}</td>
      <td class="${durum.sinif}" data-label="Durum">${durum.metin}</td>
      <td data-label="Termin">${aroma.termin || "-"}</td>
    `;
    tr.addEventListener("click", () => {
      modalKapat("listeModal");
      aromaSec(aromaEslesmeBulIndex(aroma.kod, aroma.tedarikci));
    });
    tbody.appendChild(tr);
  });

  modalAc("listeModal");
}

function ozelUrunDetayAc(urunAdi) {
  const grup = ozelKayitlariUrunBazliGrupla(ozelKayitlar).find((g) => g.urunAdi === urunAdi);
  if (!grup) return;

  acikOzelUrunAdi = urunAdi;
  const analiz = urunUretimAnaliziGetir(grup.kayitlar);

  $("ozelDetayBaslik").textContent = grup.urunAdi;
  $("ozelDetayToplam").textContent = ozelToplamBilgisiGetir(grup.kayitlar);
  $("ozelDetayUretim").textContent = analiz.durumMetni;
  $("ozelDetayUretim").className = `ozet-buyuk-yazi ${analiz.durumSinif}`;

  if (analiz.kisitlayanKalem) {
    $("ozelDetayKisit").innerHTML = `
      <strong>${analiz.kisitlayanKalem.kayit.aromaAd}</strong><br>
      GEREKEN: ${sayiFormatla(analiz.kisitlayanKalem.gereken)} KG / TON<br>
      STOK: ${sayiFormatla(analiz.kisitlayanKalem.mevcutStok)} KG
    `;
  } else {
    $("ozelDetayKisit").textContent = "Stok eşleşmesi bulunamadı ya da KG verisi yok.";
  }

  const tbody = $("ozelDetayTablo");
  tbody.innerHTML = "";

  grup.kayitlar.forEach((kayit) => {
    const stokKaydi = aromaKodundanBul(kayit.aromaKod);
    const stokMetni = stokKaydi ? `${sayiFormatla(stokKaydi.stok)} KG` : "BULUNAMADI";

  const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Aroma Kodu">${kayit.aromaKod || "-"}</td>
      <td data-label="Tedarikçi">${stokKaydi ? (stokKaydi.tedarikci || "-") : "-"}</td>
      <td data-label="Aroma Adı">${kayit.aromaAd || "-"}</td>
      <td data-label="Kullanım">${sayiFormatla(kayit.miktar)} ${kayit.birim || ""}</td>
      <td class="${stokKaydi ? "yesil" : "kirmizi"}" data-label="Stok">${stokMetni}</td>
      <td class="not-hucre" data-label="Not">${String(kayit.not || "").trim() ? '<span class="not-ikon" title="Not var">!</span>' : ""}</td>
      <td data-label="İşlem">
        <div class="ozel-islem">
          <button class="mavi-btn buton-mini" data-ozelid="${kayit.id}" data-ozelislem="duzenle">Düzenle</button>
          <button class="gri-btn buton-mini" data-ozelid="${kayit.id}" data-ozelislem="sil">Sil</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  modalAc("ozelDetayModal");
}

function formTemizle() {
  $("yeniKod").value = "";
  $("yeniAd").value = "";
  $("yeniTedarikci").value = "";
  $("yeniStok").value = "";
  $("yeniAciklama").value = "";
  yeniAromaOnerileriniKapat();
}

function siparisFormTemizle() {
  $("siparisKod").value = "";
  $("siparisAd").value = "";
  $("siparisTedarikci").value = "";
  $("siparisMiktar").value = "";
  $("siparisTarih").value = bugununTarihiInputIcin();
  $("siparisAciklama").value = "";
  siparisAromaOnerileriniKapat();
}

function ozelFormTemizle() {
  ozelDuzenlemeModu = false;
  ozelDuzenlenenId = null;
  $("ozelFormBaslik").textContent = "Yeni Özel Kayıt";
  $("ozelKaydetBtn").textContent = "Kaydet";
  $("ozelUrunAdi").value = "";
  $("ozelAromaKod").value = "";
  $("ozelAromaAd").value = "";
  $("ozelMiktar").value = "";
  $("ozelBirim").value = "KG";
  $("ozelNot").value = "";
  ozelAromaOnerileriniKapat();
}

function yeniAromaModunaGec() {
  duzenlemeModu = false;
  duzenlenenAromaIndex = null;
  $("formBaslik").textContent = "Yeni Aroma Ekle";
  $("kaydetYeniAromaBtn").textContent = "Kaydet";
  formTemizle();
}

function duzenlemeModunaGec(index) {
  const aroma = aromalar[index];
  if (!aroma) return;

  duzenlemeModu = true;
  duzenlenenAromaIndex = index;

  $("formBaslik").textContent = "Aromayı Düzenle";
  $("kaydetYeniAromaBtn").textContent = "Güncelle";
  $("yeniKod").value = aroma.kod;
  $("yeniAd").value = aroma.ad;
  $("yeniTedarikci").value = aroma.tedarikci || "";
  $("yeniStok").value = aroma.stok;
  $("yeniAciklama").value = aroma.aciklama || "";
  yeniAromaOnerileriniKapat();
}

function ozelDuzenlemeModunaGec(id) {
  const kayit = ozelKayitBul(id);
  if (!kayit) return;

  ozelDuzenlemeModu = true;
  ozelDuzenlenenId = id;

  $("ozelFormBaslik").textContent = "Özel Kaydı Düzenle";
  $("ozelKaydetBtn").textContent = "Güncelle";
  $("ozelUrunAdi").value = kayit.urunAdi;
  $("ozelAromaKod").value = kayit.aromaKod || "";
  $("ozelAromaAd").value = kayit.aromaAd || "";
  $("ozelMiktar").value = kayit.miktar;
  $("ozelBirim").value = kayit.birim || "KG";
  $("ozelNot").value = kayit.not || "";
  ozelAromaOnerileriniKapat();
}

function stokEkle() {
  if (seciliAromaIndex === null) return;
  const miktar = parseFloat($("miktarInput").value);
  if (isNaN(miktar) || miktar <= 0) return alert("Geçerli bir miktar girin.");

  aromalar[seciliAromaIndex].stok = Number(aromalar[seciliAromaIndex].stok) + miktar;
  verileriKaydet();
  $("miktarInput").value = "";

  ozetleriGuncelle();
  aromaSec(seciliAromaIndex);
  ozelTabloyuDoldur(filtreliOzelListeGetir());
  if (acikOzelUrunAdi) ozelUrunDetayAc(acikOzelUrunAdi);
}

function stokDus() {
  if (seciliAromaIndex === null) return;
  const miktar = parseFloat($("miktarInput").value);
  if (isNaN(miktar) || miktar <= 0) return alert("Geçerli bir miktar girin.");
  if (miktar > Number(aromalar[seciliAromaIndex].stok)) return alert("Stoktan fazla düşüm yapılamaz.");

  aromalar[seciliAromaIndex].stok = Number(aromalar[seciliAromaIndex].stok) - miktar;
  verileriKaydet();
  $("miktarInput").value = "";

  ozetleriGuncelle();
  aromaSec(seciliAromaIndex);
  ozelTabloyuDoldur(filtreliOzelListeGetir());
  if (acikOzelUrunAdi) ozelUrunDetayAc(acikOzelUrunAdi);
}

function terminKaydet() {
  if (seciliAromaIndex === null) return alert("Önce bir aroma seçin.");
  aromalar[seciliAromaIndex].termin = buyukHarfeCevir($("detayTerminInput").value.trim());
  verileriKaydet();
  tabloyuDoldur(filtreliListeGetir());
  ozetleriGuncelle();
  aromaSec(seciliAromaIndex);
}

function kritikLimitKaydet() {
  if (seciliAromaIndex === null) return alert("Önce bir aroma seçin.");
  const yeniKritik = parseFloat($("detayKritikInput").value);
  if (isNaN(yeniKritik) || yeniKritik < 0) return alert("Geçerli bir kritik limit girin.");

  aromalar[seciliAromaIndex].kritik = yeniKritik;
  verileriKaydet();
  tabloyuDoldur(filtreliListeGetir());
  ozetleriGuncelle();
  aromaSec(seciliAromaIndex);
}

function siparisDetayKaydet() {
  if (seciliSiparisId === null) return;
  const siparis = siparisBul(seciliSiparisId);
  if (!siparis) return;

  siparis.aciklama = $("siparisDetayAciklama").value.trim();
  verileriKaydet();
  siparisTablosunuDoldur(filtreliSiparisListeGetir());
  ozetleriGuncelle();
  siparisDetayAc(seciliSiparisId);
}

function siparisMiktarEkle() {
  if (seciliSiparisId === null) return;
  const siparis = siparisBul(seciliSiparisId);
  const miktar = parseFloat($("siparisDetayMiktarInput").value);
  if (!siparis) return;
  if (isNaN(miktar) || miktar <= 0) return alert("Geçerli bir miktar girin.");

  siparis.miktar = Number(siparis.miktar) + miktar;
  siparis.aciklama = $("siparisDetayAciklama").value.trim();

  verileriKaydet();
  siparisTablosunuDoldur(filtreliSiparisListeGetir());
  ozetleriGuncelle();
  siparisDetayAc(seciliSiparisId);
}

function siparisMiktarDus() {
  if (seciliSiparisId === null) return;
  const siparis = siparisBul(seciliSiparisId);
  const miktar = parseFloat($("siparisDetayMiktarInput").value);
  if (!siparis) return;
  if (isNaN(miktar) || miktar <= 0) return alert("Geçerli bir miktar girin.");
  if (miktar > Number(siparis.miktar)) return alert("Sipariş miktarından fazla azaltılamaz.");

  siparis.miktar = Number(siparis.miktar) - miktar;
  siparis.aciklama = $("siparisDetayAciklama").value.trim();

  verileriKaydet();
  siparisTablosunuDoldur(filtreliSiparisListeGetir());
  ozetleriGuncelle();

  if (Number(siparis.miktar) <= 0 && confirm("Sipariş miktarı 0 oldu. Siparişi silmek ister misin?")) {
    siparisSil(seciliSiparisId);
    modalKapat("siparisDetayModal");
    return;
  }

  siparisDetayAc(seciliSiparisId);
}

function aromaKaydetVeyaGuncelle() {
  const kod = buyukHarfeCevir($("yeniKod").value.trim());
  const ad = buyukHarfeCevir($("yeniAd").value.trim());
  const tedarikci = buyukHarfeCevir($("yeniTedarikci").value.trim());
  const stok = parseFloat($("yeniStok").value);
  const aciklama = $("yeniAciklama").value.trim();

  $("yeniKod").value = kod;
  $("yeniAd").value = ad;
  $("yeniTedarikci").value = tedarikci;

  if (!kod || !ad || !tedarikci) return alert("Kod, aroma adı ve tedarikçi alanlarını doldurun.");

  if (duzenlemeModu) {
    const ayniKayitVar = aromalar.some((a, i) =>
      i !== duzenlenenAromaIndex &&
      kodNormalizeEt(a.kod) === kodNormalizeEt(kod) &&
      kodNormalizeEt(a.tedarikci) === kodNormalizeEt(tedarikci)
    );

    if (ayniKayitVar) return alert("Bu kod ve tedarikçiyle başka kayıt zaten var.");

    aromalar[duzenlenenAromaIndex] = {
      ...aromalar[duzenlenenAromaIndex],
      kod,
      ad,
      tedarikci,
      stok: isNaN(stok) ? 0 : stok,
      aciklama
    };

    verileriKaydet();
    tabloyuDoldur(filtreliListeGetir());
    ozetleriGuncelle();
    modalKapat("formModal");

    const guncelIndex = aromaEslesmeBulIndex(kod, tedarikci);
    seciliAromaIndex = guncelIndex;
    aromaSec(guncelIndex);
    ozelTabloyuDoldur(filtreliOzelListeGetir());
    if (acikOzelUrunAdi) ozelUrunDetayAc(acikOzelUrunAdi);
    return;
  }

  const kayitVar = aromalar.some((a) =>
    kodNormalizeEt(a.kod) === kodNormalizeEt(kod) &&
    kodNormalizeEt(a.tedarikci) === kodNormalizeEt(tedarikci)
  );

  if (kayitVar) return alert("Bu kod ve tedarikçiyle kayıt zaten var.");

  aromalar.unshift({
    kod,
    ad,
    tedarikci,
    stok: isNaN(stok) ? 0 : stok,
    kritik: 10,
    aciklama,
    termin: ""
  });

  verileriKaydet();
  tabloyuDoldur(filtreliListeGetir());
  ozetleriGuncelle();
  modalKapat("formModal");

  aromaSec(aromaEslesmeBulIndex(kod, tedarikci));
  ozelTabloyuDoldur(filtreliOzelListeGetir());
  if (acikOzelUrunAdi) ozelUrunDetayAc(acikOzelUrunAdi);
}

function seciliAromayiSil() {
  if (seciliAromaIndex === null) return alert("Önce bir aroma seçin.");
  const aroma = aromalar[seciliAromaIndex];

  if (!confirm(`${aroma.kod} kodlu aromayı listeden kaldırmak istiyor musun?`)) return;

  aromalar.splice(seciliAromaIndex, 1);
  seciliAromaIndex = null;

  verileriKaydet();
  modalKapat("detayModal");
  tabloyuDoldur(filtreliListeGetir());
  ozetleriGuncelle();
  ozelTabloyuDoldur(filtreliOzelListeGetir());
  if (acikOzelUrunAdi) ozelUrunDetayAc(acikOzelUrunAdi);
}

function siparisKaydet() {
  const kod = buyukHarfeCevir($("siparisKod").value.trim());
  const ad = buyukHarfeCevir($("siparisAd").value.trim());
  const tedarikci = buyukHarfeCevir($("siparisTedarikci").value.trim());
  const miktar = parseFloat($("siparisMiktar").value);
  const tarih = $("siparisTarih").value || bugununTarihiInputIcin();
  const aciklama = $("siparisAciklama").value.trim();

  $("siparisKod").value = kod;
  $("siparisAd").value = ad;
  $("siparisTedarikci").value = tedarikci;

  if (!kod || !ad || !tedarikci) return alert("Kod, aroma adı ve tedarikçi alanlarını doldurun.");
  if (isNaN(miktar) || miktar <= 0) return alert("Geçerli bir sipariş miktarı girin.");

  siparisler.unshift({
    id: Date.now() + Math.random(),
    kod,
    ad,
    tedarikci,
    miktar,
    tarih,
    aciklama
  });

  verileriKaydet();
  siparisTablosunuDoldur(filtreliSiparisListeGetir());
  ozetleriGuncelle();
  modalKapat("siparisModal");
  siparisFormTemizle();
}

function siparisSil(id) {
  const siparis = siparisBul(id);
  if (!siparis) return;
  if (!confirm(`${siparis.kod} siparişini silmek istiyor musun?`)) return;

  siparisler = siparisler.filter((s) => String(s.id) !== String(id));

  if (String(seciliSiparisId) === String(id)) {
    seciliSiparisId = null;
    modalKapat("siparisDetayModal");
  }

  verileriKaydet();
  siparisTablosunuDoldur(filtreliSiparisListeGetir());
  ozetleriGuncelle();
}

function siparisiStogaDahilEt(id) {
  const siparisIndex = siparisler.findIndex((s) => String(s.id) === String(id));
  if (siparisIndex === -1) return;

  const siparis = siparisler[siparisIndex];
  const tamEslesenIndex = aromaEslesmeBulIndex(siparis.kod, siparis.tedarikci);
  const sadeceKodEslesenIndex = aromaKodunaGoreBulIndex(siparis.kod);

  if (tamEslesenIndex > -1) {
    aromalar[tamEslesenIndex].stok = Number(aromalar[tamEslesenIndex].stok) + Number(siparis.miktar);
    siparisler.splice(siparisIndex, 1);
    seciliSiparisId = null;
    verileriKaydet();
    tabloyuDoldur(filtreliListeGetir());
    siparisTablosunuDoldur(filtreliSiparisListeGetir());
    ozetleriGuncelle();
    modalKapat("siparisDetayModal");
    aromaSec(tamEslesenIndex);
    ozelTabloyuDoldur(filtreliOzelListeGetir());
    if (acikOzelUrunAdi) ozelUrunDetayAc(acikOzelUrunAdi);
    return;
  }

  if (sadeceKodEslesenIndex > -1) {
    const mevcutAroma = aromalar[sadeceKodEslesenIndex];
    const onay = confirm(
      `Kod bulundu fakat tedarikçi farklı görünüyor.\n\nStoktaki kayıt:\n${mevcutAroma.kod} - ${mevcutAroma.tedarikci}\n\nSiparişteki kayıt:\n${siparis.kod} - ${siparis.tedarikci}\n\nYine de bu stoğa dahil etmek istiyor musun?`
    );
    if (!onay) return;

    aromalar[sadeceKodEslesenIndex].stok = Number(aromalar[sadeceKodEslesenIndex].stok) + Number(siparis.miktar);
    siparisler.splice(siparisIndex, 1);
    seciliSiparisId = null;
    verileriKaydet();
    tabloyuDoldur(filtreliListeGetir());
    siparisTablosunuDoldur(filtreliSiparisListeGetir());
    ozetleriGuncelle();
    modalKapat("siparisDetayModal");
    aromaSec(sadeceKodEslesenIndex);
    ozelTabloyuDoldur(filtreliOzelListeGetir());
    if (acikOzelUrunAdi) ozelUrunDetayAc(acikOzelUrunAdi);
    return;
  }

  alert(`Bu kod mevcut stokta bulunamadı.\n\nKod: ${siparis.kod}\nTedarikçi: ${siparis.tedarikci}\n\nÖnce kodu kontrol et. Kod doğruysa ürünü ayrıca "Yeni Aroma Ekle" ile açmalısın.`);
}

function ozelKaydetVeyaGuncelle() {
  const urunAdi = buyukHarfeCevir($("ozelUrunAdi").value.trim());
  const aromaKod = buyukHarfeCevir($("ozelAromaKod").value.trim());
  const aromaAd = buyukHarfeCevir($("ozelAromaAd").value.trim());
  const miktar = parseFloat($("ozelMiktar").value);
  const birim = buyukHarfeCevir($("ozelBirim").value.trim());
  const not = $("ozelNot").value.trim();

  $("ozelUrunAdi").value = urunAdi;
  $("ozelAromaKod").value = aromaKod;
  $("ozelAromaAd").value = aromaAd;
  $("ozelBirim").value = birim;

  if (!urunAdi) return alert("Ürün adı girmelisin.");
  if (!aromaAd) return alert("Aroma adı girmelisin.");
  if (isNaN(miktar) || miktar <= 0) return alert("Geçerli bir kullanım miktarı girin.");
  if (!birim) return alert("Birim girmelisin.");

  if (ozelDuzenlemeModu && ozelDuzenlenenId !== null) {
    const kayit = ozelKayitBul(ozelDuzenlenenId);
    if (!kayit) return;

    kayit.urunAdi = urunAdi;
    kayit.aromaKod = aromaKod;
    kayit.aromaAd = aromaAd;
    kayit.miktar = miktar;
    kayit.birim = birim;
    kayit.not = not;
  } else {
    ozelKayitlar.unshift({
      id: Date.now() + Math.random(),
      urunAdi,
      aromaKod,
      aromaAd,
      miktar,
      birim,
      not
    });
  }

  ozelUrunSirasiGuncelle();
  verileriKaydet();
  ozelTabloyuDoldur(filtreliOzelListeGetir());
  modalKapat("ozelFormModal");
  ozelFormTemizle();

  acikOzelUrunAdi = urunAdi;
  ozelUrunDetayAc(urunAdi);
}

function ozelKayitSil(id) {
  const kayit = ozelKayitBul(id);
  if (!kayit) return;
  const urunAdi = kayit.urunAdi;

  if (!confirm(`${kayit.urunAdi} için özel kaydı silmek istiyor musun?`)) return;

  ozelKayitlar = ozelKayitlar.filter((k) => String(k.id) !== String(id));
  ozelUrunSirasiGuncelle();
  verileriKaydet();
  ozelTabloyuDoldur(filtreliOzelListeGetir());

  const ayniUrunKaldimi = ozelKayitlar.some((k) => k.urunAdi === urunAdi);

  if (acikOzelUrunAdi === urunAdi && ayniUrunKaldimi) {
    ozelUrunDetayAc(urunAdi);
  } else if (acikOzelUrunAdi === urunAdi && !ayniUrunKaldimi) {
    modalKapat("ozelDetayModal");
    acikOzelUrunAdi = null;
  }
}

function ozelSifreDogrulaVeAc() {
  if ($("ozelSifreInput").value !== mevcutOzelSifreGetir()) {
    $("ozelSifreHata").classList.remove("gizli");
    return;
  }

  $("ozelSifreHata").classList.add("gizli");
  modalKapat("ozelSifreModal");
  modalAc("ozelAlanModal");
  ozelTabloyuDoldur(filtreliOzelListeGetir());
}

function ozelSifreDegistir() {
  const mevcut = $("mevcutSifreInput").value;
  const yeni = $("yeniSifreInput").value.trim();

  if (mevcut !== mevcutOzelSifreGetir()) return alert("Mevcut şifre yanlış.");
  if (!yeni) return alert("Yeni şifre boş olamaz.");

  localStorage.setItem("ozelAlanSifresi", yeni);
  $("mevcutSifreInput").value = "";
  $("yeniSifreInput").value = "";
  $("sifreDegistirPanel").classList.add("gizli");
  alert("Şifre güncellendi.");
}

function ozelJsonVerisiniUygula(data, kullaniciyaMesajGoster = true) {
  if (!Array.isArray(data)) {
    if (kullaniciyaMesajGoster) alert("JSON içeriği liste formatında değil.");
    return;
  }

  ozelKayitlar = data.map((kayit) => ({
    id: kayit.id || Date.now() + Math.random() + Math.random(),
    urunAdi: buyukHarfeCevir(kayit.urunAdi || kayit.urun || ""),
    aromaKod: buyukHarfeCevir(kayit.aromaKod || kayit.kod || ""),
    aromaAd: buyukHarfeCevir(kayit.aromaAd || kayit.ad || ""),
    miktar: Number(kayit.miktar || 0),
    birim: buyukHarfeCevir(kayit.birim || "KG"),
    not: kayit.not || ""
  })).filter((k) => k.urunAdi && k.aromaAd && Number(k.miktar) > 0);

  ozelUrunSirasiGuncelle();
  verileriKaydet();
  ozelTabloyuDoldur(filtreliOzelListeGetir());

  if (kullaniciyaMesajGoster) alert(`${ozelKayitlar.length} özel kayıt yüklendi.`);
}

async function ozelJsonOtomatikYukle() {
  if (ozelKayitlar.length) return;

  try {
    const response = await fetch("ozel_kayitlar_import.json", { cache: "no-store" });
    if (!response.ok) return;

    const data = await response.json();
    if (Array.isArray(data) && data.length) {
      ozelJsonVerisiniUygula(data, false);
      $("jsonBilgiKutusu").textContent = `JSON dosyasından ${data.length} özel kayıt yüklendi.`;
    }
  } catch {
    // file:// kullanımında sessiz geç
  }
}

function ozelJsonDosyaOku(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      ozelJsonVerisiniUygula(data, true);
      $("jsonBilgiKutusu").textContent = `${file.name} dosyasından ${ozelKayitlar.length} özel kayıt yüklendi.`;
    } catch {
      alert("JSON dosyası okunamadı.");
    }
    event.target.value = "";
  };

  reader.readAsText(file, "utf-8");
}

function siparisAromaOnerileriniKapat() {
  $("siparisAromaOnerileri").innerHTML = "";
  $("siparisAromaOnerileri").classList.add("gizli");
}

function yeniAromaOnerileriniKapat() {
  $("yeniAromaOnerileri").innerHTML = "";
  $("yeniAromaOnerileri").classList.add("gizli");
}

function ozelAromaOnerileriniKapat() {
  $("ozelAromaOnerileri").innerHTML = "";
  $("ozelAromaOnerileri").classList.add("gizli");
}

function siparisAromaOnerileriniGoster() {
  const aranan = buyukHarfeCevir($("siparisAd").value.trim());
  const kutu = $("siparisAromaOnerileri");
  if (!aranan) return siparisAromaOnerileriniKapat();

  const eslesenler = aromalar.filter((aroma) =>
    String(aroma.ad || "").includes(aranan) ||
    String(aroma.kod || "").includes(aranan) ||
    String(aroma.tedarikci || "").includes(aranan)
  );

  if (!eslesenler.length) return siparisAromaOnerileriniKapat();

  kutu.innerHTML = "";
  eslesenler.slice(0, 8).forEach((aroma) => {
    const item = document.createElement("div");
    item.className = "oneri-item";
    item.innerHTML = `
      <div class="oneri-item-ust">${aroma.ad}</div>
      <div class="oneri-item-alt">${aroma.kod} - ${aroma.tedarikci}</div>
    `;
    item.addEventListener("click", () => {
      $("siparisKod").value = aroma.kod;
      $("siparisAd").value = aroma.ad;
      $("siparisTedarikci").value = aroma.tedarikci || "";
      siparisAromaOnerileriniKapat();
    });
    kutu.appendChild(item);
  });

  kutu.classList.remove("gizli");
}

function yeniAromaOnerileriniGoster() {
  const aranan = buyukHarfeCevir($("yeniAd").value.trim());
  const kutu = $("yeniAromaOnerileri");
  if (!aranan) return yeniAromaOnerileriniKapat();

  const eslesenler = aromalar.filter((aroma) =>
    String(aroma.ad || "").includes(aranan) ||
    String(aroma.kod || "").includes(aranan) ||
    String(aroma.tedarikci || "").includes(aranan)
  );

  if (!eslesenler.length) return yeniAromaOnerileriniKapat();

  kutu.innerHTML = "";
  eslesenler.slice(0, 8).forEach((aroma) => {
    const item = document.createElement("div");
    item.className = "oneri-item";
    item.innerHTML = `
      <div class="oneri-item-ust">${aroma.ad}</div>
      <div class="oneri-item-alt">${aroma.kod} - ${aroma.tedarikci}</div>
    `;
    item.addEventListener("click", () => {
      $("yeniKod").value = aroma.kod;
      $("yeniAd").value = aroma.ad;
      $("yeniTedarikci").value = aroma.tedarikci || "";
      yeniAromaOnerileriniKapat();
    });
    kutu.appendChild(item);
  });

  kutu.classList.remove("gizli");
}

function ozelAromaOnerileriniGoster() {
  const aranan = buyukHarfeCevir($("ozelAromaAd").value.trim());
  const kutu = $("ozelAromaOnerileri");
  if (!aranan) return ozelAromaOnerileriniKapat();

  const eslesenler = aromalar.filter((aroma) =>
    String(aroma.ad || "").includes(aranan) ||
    String(aroma.kod || "").includes(aranan) ||
    String(aroma.tedarikci || "").includes(aranan)
  );

  if (!eslesenler.length) return ozelAromaOnerileriniKapat();

  kutu.innerHTML = "";
  eslesenler.slice(0, 8).forEach((aroma) => {
    const item = document.createElement("div");
    item.className = "oneri-item";
    item.innerHTML = `
      <div class="oneri-item-ust">${aroma.ad}</div>
      <div class="oneri-item-alt">${aroma.kod} - ${aroma.tedarikci}</div>
    `;
    item.addEventListener("click", () => {
      $("ozelAromaKod").value = aroma.kod;
      $("ozelAromaAd").value = aroma.ad;
      ozelAromaOnerileriniKapat();
    });
    kutu.appendChild(item);
  });

  kutu.classList.remove("gizli");
}

function aromaSirasiDegistir(eskiIndex, yeniIndex) {
  if (
    eskiIndex === yeniIndex ||
    eskiIndex < 0 ||
    yeniIndex < 0 ||
    eskiIndex >= aromalar.length ||
    yeniIndex >= aromalar.length
  ) return;

  const seciliAroma = seciliAromaIndex !== null && aromalar[seciliAromaIndex]
    ? { kod: aromalar[seciliAromaIndex].kod, tedarikci: aromalar[seciliAromaIndex].tedarikci }
    : null;

  const tasinan = aromalar.splice(eskiIndex, 1)[0];
  aromalar.splice(yeniIndex, 0, tasinan);

  if (seciliAroma) {
    seciliAromaIndex = aromalar.findIndex((a) =>
      kodNormalizeEt(a.kod) === kodNormalizeEt(seciliAroma.kod) &&
      kodNormalizeEt(a.tedarikci) === kodNormalizeEt(seciliAroma.tedarikci)
    );
  }

  verileriKaydet();
  tabloyuDoldur(filtreliListeGetir());
  ozetleriGuncelle();
  ozelTabloyuDoldur(filtreliOzelListeGetir());
}

function aromaSurukleBirakBagla() {
  const satirlar = document.querySelectorAll("#aromaTablosu tr");
  let suruklenenIndex = null;

  satirlar.forEach((satir) => {
    satir.addEventListener("dragstart", function(event) {
      suruklenenIndex = Number(this.dataset.index);
      this.classList.add("surukleniyor");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(suruklenenIndex));
    });

    satir.addEventListener("dragend", function() {
      this.classList.remove("surukleniyor");
      document.querySelectorAll("#aromaTablosu tr").forEach((s) => s.classList.remove("surukle-ustu"));
    });

    satir.addEventListener("dragover", function(event) {
      event.preventDefault();
      this.classList.add("surukle-ustu");
      event.dataTransfer.dropEffect = "move";
    });

    satir.addEventListener("dragleave", function() {
      this.classList.remove("surukle-ustu");
    });

    satir.addEventListener("drop", function(event) {
      event.preventDefault();
      this.classList.remove("surukle-ustu");
      const hedefIndex = Number(this.dataset.index);
      if (suruklenenIndex === null || Number.isNaN(hedefIndex) || suruklenenIndex === hedefIndex) return;
      aromaSirasiDegistir(suruklenenIndex, hedefIndex);
      suruklenenIndex = null;
    });
  });
}

function ozelUrunSurukleBirakBagla() {
  const satirlar = document.querySelectorAll("#ozelTablo tr");
  let suruklenenUrunAdi = null;

  satirlar.forEach((satir) => {
    satir.addEventListener("dragstart", function(event) {
      suruklenenUrunAdi = this.dataset.urunadi;
      this.classList.add("ozel-surukleniyor");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", suruklenenUrunAdi || "");
    });

    satir.addEventListener("dragend", function() {
      this.classList.remove("ozel-surukleniyor");
      document.querySelectorAll("#ozelTablo tr").forEach((s) => s.classList.remove("ozel-surukle-ustu"));
    });

    satir.addEventListener("dragover", function(event) {
      event.preventDefault();
      this.classList.add("ozel-surukle-ustu");
      event.dataTransfer.dropEffect = "move";
    });

    satir.addEventListener("dragleave", function() {
      this.classList.remove("ozel-surukle-ustu");
    });

    satir.addEventListener("drop", function(event) {
      event.preventDefault();
      this.classList.remove("ozel-surukle-ustu");

      const hedefUrunAdi = this.dataset.urunadi;
      if (!suruklenenUrunAdi || !hedefUrunAdi || suruklenenUrunAdi === hedefUrunAdi) return;

      ozelUrunSirasiDegistir(suruklenenUrunAdi, hedefUrunAdi);
      suruklenenUrunAdi = null;
    });
  });
}

function buyukHarfInputBagla(id) {
  const element = $(id);
  if (!element) return;

  element.addEventListener("input", function() {
    if (this.type === "password" || this.type === "date" || this.type === "number") return;
    const cursor = this.selectionStart;
    this.value = buyukHarfeCevir(this.value);
    this.setSelectionRange(cursor, cursor);
  });
}

function enterKisayollariBagla() {
  [
    ["miktarInput", stokEkle],
    ["siparisDetayMiktarInput", siparisMiktarEkle],
    ["yeniStok", aromaKaydetVeyaGuncelle],
    ["siparisMiktar", siparisKaydet],
    ["detayTerminInput", terminKaydet],
    ["detayKritikInput", kritikLimitKaydet],
    ["ozelSifreInput", ozelSifreDogrulaVeAc],
    ["ozelMiktar", ozelKaydetVeyaGuncelle],
    ["yeniSifreInput", ozelSifreDegistir]
  ].forEach(([id, fn]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter") fn();
    });
  });
}

function eventleriBagla() {
  $("aramaKutusu").addEventListener("input", () => tabloyuDoldur(filtreliListeGetir()));

  $("aromaTablosu").addEventListener("click", function(event) {
    const siraBtn = event.target.closest("button[data-sira]");
    if (!siraBtn) return;
    event.stopPropagation();
    const tr = siraBtn.closest("tr");
    if (!tr) return;
    const index = Number(tr.dataset.index);
    if (Number.isNaN(index)) return;
    const hedef = siraBtn.dataset.sira === "yukari" ? index - 1 : index + 1;
    aromaSirasiDegistir(index, hedef);
  });
  $("siparisAramaKutusu").addEventListener("input", () => siparisTablosunuDoldur(filtreliSiparisListeGetir()));
  $("ozelAramaKutusu").addEventListener("input", () => ozelTabloyuDoldur(filtreliOzelListeGetir()));

  $("ekleBtn").addEventListener("click", stokEkle);
  $("dusBtn").addEventListener("click", stokDus);
  $("terminKaydetBtn").addEventListener("click", terminKaydet);
  $("kritikKaydetBtn").addEventListener("click", kritikLimitKaydet);

  $("duzenleBtn").addEventListener("click", () => {
    if (seciliAromaIndex === null) return alert("Önce bir aroma seçin.");
    duzenlemeModunaGec(seciliAromaIndex);
    modalKapat("detayModal");
    modalAc("formModal");
  });

  $("yeniAromaBtn").addEventListener("click", () => {
    yeniAromaModunaGec();
    modalAc("formModal");
  });

  $("kaydetYeniAromaBtn").addEventListener("click", aromaKaydetVeyaGuncelle);
  $("silBtn").addEventListener("click", seciliAromayiSil);

  $("yeniSiparisBtn").addEventListener("click", () => {
    siparisFormTemizle();
    if (!$("siparisTarih").value) $("siparisTarih").value = bugununTarihiInputIcin();
    modalAc("siparisModal");
  });

  $("kaydetSiparisBtn").addEventListener("click", siparisKaydet);
  $("siparisAd").addEventListener("input", siparisAromaOnerileriniGoster);
  $("yeniAd").addEventListener("input", yeniAromaOnerileriniGoster);
  $("ozelAromaAd").addEventListener("input", ozelAromaOnerileriniGoster);

  $("siparisDetayKaydetBtn").addEventListener("click", siparisDetayKaydet);
  $("siparisMiktarEkleBtn").addEventListener("click", siparisMiktarEkle);
  $("siparisMiktarDusBtn").addEventListener("click", siparisMiktarDus);
  $("siparisDetayStogaDahilBtn").addEventListener("click", () => {
    if (seciliSiparisId !== null) siparisiStogaDahilEt(seciliSiparisId);
  });
  $("siparisDetaySilBtn").addEventListener("click", () => {
    if (seciliSiparisId !== null) siparisSil(seciliSiparisId);
  });

  $("bekleyenSiparisKart").addEventListener("click", bekleyenSiparisPopupAc);
  $("kritikStokKart").addEventListener("click", kritikStokPopupAc);

  $("ozelKart").addEventListener("click", () => {
    $("ozelSifreInput").value = "";
    $("ozelSifreHata").classList.add("gizli");
    modalAc("ozelSifreModal");
  });

  $("ozelSifreGirisBtn").addEventListener("click", ozelSifreDogrulaVeAc);

  $("ozelYeniKayitBtn").addEventListener("click", () => {
    ozelFormTemizle();
    modalAc("ozelFormModal");
  });

  $("ozelJsonYukleBtn").addEventListener("click", () => $("ozelJsonDosyaInput").click());
  $("ozelJsonDosyaInput").addEventListener("change", ozelJsonDosyaOku);

  $("sifreDegistirAcBtn").addEventListener("click", () => {
    $("sifreDegistirPanel").classList.toggle("gizli");
  });

  $("sifreDegistirBtn").addEventListener("click", ozelSifreDegistir);
  $("ozelKaydetBtn").addEventListener("click", ozelKaydetVeyaGuncelle);

  $("ozelDetayKalemEkleBtn").addEventListener("click", () => {
    if (!acikOzelUrunAdi) return;
    ozelFormTemizle();
    $("ozelUrunAdi").value = acikOzelUrunAdi;
    modalAc("ozelFormModal");
  });

  $("siparisTablosu").addEventListener("click", function(event) {
    const buton = event.target.closest("button");
    if (!buton) return;

    const id = buton.dataset.id;
    const islem = buton.dataset.islem;

    if (islem === "stok") siparisiStogaDahilEt(id);
    if (islem === "sil") siparisSil(id);
  });

  $("ozelTablo").addEventListener("click", function(event) {
    const siraButonu = event.target.closest("button[data-ozelsira]");
    if (siraButonu) {
      event.stopPropagation();
      const tr = siraButonu.closest("tr");
      if (tr) ozelUrunTasi(tr.dataset.urunadi, siraButonu.dataset.ozelsira);
      return;
    }

    const ekleButonu = event.target.closest("button[data-urunekle]");
    if (ekleButonu) {
      ozelFormTemizle();
      $("ozelUrunAdi").value = ekleButonu.dataset.urunekle || "";
      modalAc("ozelFormModal");
      return;
    }

    const silButonu = event.target.closest("button[data-urunsil]");
    if (silButonu) {
      ozelUrunuTamamenSil(silButonu.dataset.urunsil || "");
    }
  });

  $("ozelDetayTablo").addEventListener("click", function(event) {
    const buton = event.target.closest("button[data-ozelid]");
    if (!buton) return;

    const id = buton.dataset.ozelid;
    const islem = buton.dataset.ozelislem;

    if (islem === "duzenle") {
      ozelDuzenlemeModunaGec(id);
      modalKapat("ozelDetayModal");
      modalAc("ozelFormModal");
    }

    if (islem === "sil") {
      ozelKayitSil(id);
    }
  });

  document.querySelectorAll("[data-kapat]").forEach((el) => {
    el.addEventListener("click", () => {
      modalKapat(el.dataset.kapat);
    });
  });

  document.addEventListener("click", function(event) {
    [
      { kutu: $("siparisAromaOnerileri"), input: $("siparisAd"), kapat: siparisAromaOnerileriniKapat },
      { kutu: $("yeniAromaOnerileri"), input: $("yeniAd"), kapat: yeniAromaOnerileriniKapat },
      { kutu: $("ozelAromaOnerileri"), input: $("ozelAromaAd"), kapat: ozelAromaOnerileriniKapat }
    ].forEach(({ kutu, input, kapat }) => {
      if (!kutu || !input) return;
      if (!kutu.contains(event.target) && input !== event.target) kapat();
    });
  });

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      tumKucukPopupKapat();
      modalKapat("ozelSifreModal");
      modalKapat("ozelAlanModal");
    }
  });
}

[
  "yeniKod",
  "yeniAd",
  "yeniTedarikci",
  "siparisKod",
  "siparisAd",
  "siparisTedarikci",
  "detayTerminInput",
  "ozelUrunAdi",
  "ozelAromaKod",
  "ozelAromaAd",
  "ozelBirim"
].forEach(buyukHarfInputBagla);

enterKisayollariBagla();
verileriYukle();
eventleriBagla();
tabloyuDoldur();
siparisTablosunuDoldur();
ozetleriGuncelle();
ozelTabloyuDoldur();
ozelJsonOtomatikYukle();
// ============================================================
// ÜRETİM SİSTEMİ
// ============================================================

// ============================================================
// ÜRETİM + YEDEKLEME SİSTEMİ
// ============================================================

let uretimGecmisi = [];

function uretimGecmisiniYukle() {
  try {
    const kayitli = localStorage.getItem("uretimGecmisi");
    uretimGecmisi = kayitli ? JSON.parse(kayitli) : [];
  } catch {
    uretimGecmisi = [];
  }
}

function uretimGecmisiniKaydet() {
  localStorage.setItem("uretimGecmisi", JSON.stringify(uretimGecmisi));
}

function uretimYap(urunAdi, litreMiktari) {
  const miktar = parseFloat(litreMiktari);
  if (isNaN(miktar) || miktar <= 0) {
    alert("Geçerli bir litre miktarı girin.");
    return false;
  }

  const grup = ozelKayitlariUrunBazliGrupla(ozelKayitlar).find((g) => g.urunAdi === urunAdi);
  if (!grup) {
    alert("Ürün bulunamadı.");
    return false;
  }

  const oran = miktar / 1000;
  const kgKalemler = grup.kayitlar.filter((k) => buyukHarfeCevir(k.birim || "") === "KG");

  const yetersizler = [];
  kgKalemler.forEach((kayit) => {
    const stokKaydi = aromaKodundanBul(kayit.aromaKod);
    const gerekli = Number(kayit.miktar) * oran;
    const mevcutStok = stokKaydi ? Number(stokKaydi.stok || 0) : 0;

    if (!stokKaydi) {
      yetersizler.push(`• ${kayit.aromaAd} (${kayit.aromaKod}) — STOKTA KAYITLI DEĞİL`);
    } else if (mevcutStok < gerekli) {
      yetersizler.push(
        `• ${kayit.aromaAd}\n  Gereken: ${sayiFormatla(gerekli)} KG — Mevcut: ${sayiFormatla(mevcutStok)} KG`
      );
    }
  });

  if (yetersizler.length) {
    const devamMi = confirm(
      `⚠️ Bazı aromalar yetersiz:\n\n${yetersizler.join("\n\n")}\n\nYine de devam etmek istiyor musun? (Stok eksiye düşebilir)`
    );
    if (!devamMi) return false;
  }

  const ozet = kgKalemler.map((kayit) => {
    const stokKaydi = aromaKodundanBul(kayit.aromaKod);
    const gerekli = Number(kayit.miktar) * oran;
    const onceki = stokKaydi ? Number(stokKaydi.stok || 0) : 0;
    const sonraki = onceki - gerekli;
    return `• ${kayit.aromaAd}: ${sayiFormatla(gerekli)} KG düşülecek (${sayiFormatla(onceki)} → ${sayiFormatla(sonraki)} KG)`;
  });

  const onay = confirm(
    `${urunAdi}\n${miktar} litre üretim yapılacak.\n\nDüşülecek aromalar:\n${ozet.join("\n")}\n\nOnaylıyor musun?`
  );
  if (!onay) return false;

  const kullanilanlar = [];
  kgKalemler.forEach((kayit) => {
    const stokIndex = aromaKodunaGoreBulIndex(kayit.aromaKod);
    const gerekli = Number(kayit.miktar) * oran;

    if (stokIndex > -1) {
      const oncekiStok = Number(aromalar[stokIndex].stok || 0);
      aromalar[stokIndex].stok = oncekiStok - gerekli;
      kullanilanlar.push({
        aromaKod: kayit.aromaKod,
        aromaAd: kayit.aromaAd,
        dusülen: gerekli,
        oncekiStok,
        sonrakiStok: aromalar[stokIndex].stok
      });
    }
  });

  const bugun = new Date();
  const tarihStr = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, "0")}-${String(bugun.getDate()).padStart(2, "0")}`;
  const saatStr = `${String(bugun.getHours()).padStart(2, "0")}:${String(bugun.getMinutes()).padStart(2, "0")}`;

  uretimGecmisi.unshift({
    id: `${Date.now()}-${Math.random()}`,
    urunAdi,
    litre: miktar,
    tarih: tarihStr,
    saat: saatStr,
    kullanilanlar
  });

  uretimGecmisiniKaydet();
  verileriKaydet();

  tabloyuDoldur(filtreliListeGetir());
  ozetleriGuncelle();
  ozelTabloyuDoldur(filtreliOzelListeGetir());
  if (acikOzelUrunAdi) ozelUrunDetayAc(acikOzelUrunAdi);

  return true;
}

function uretimGecmisiniGoster(urunAdi) {
  const liste = urunAdi
    ? uretimGecmisi.filter((u) => u.urunAdi === urunAdi)
    : uretimGecmisi;

  const baslik = document.getElementById("uretimGecmisiBaslik");
  const icerik = document.getElementById("uretimGecmisiIcerik");

  baslik.textContent = urunAdi ? `${urunAdi} — Üretim Geçmişi` : "Tüm Üretim Geçmişi";
  icerik.innerHTML = "";

  if (!liste.length) {
    icerik.innerHTML = `<p style="color:#6b7280; text-align:center; padding:20px;">Henüz üretim kaydı yok.</p>`;
    modalAc("uretimGecmisiModal");
    return;
  }

  liste.forEach((kayit) => {
    const kart = document.createElement("div");
    kart.style.cssText = `
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 12px;
      background: #f9fafb;
    `;

    const detaylar = (kayit.kullanilanlar || []).map((k) =>
      `<div style="font-size:13px; color:#374151; padding: 3px 0;">
        • ${k.aromaAd}: <strong>${sayiFormatla(k.dusülen)} KG</strong> düşüldü
        <span style="color:#6b7280;">(${sayiFormatla(k.oncekiStok)} → ${sayiFormatla(k.sonrakiStok)} KG)</span>
      </div>`
    ).join("");

    kart.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
        <div>
          <strong style="font-size:15px;">${kayit.urunAdi}</strong>
          <span style="margin-left:10px; background:#dcfce7; color:#15803d; padding:3px 10px; border-radius:20px; font-size:13px; font-weight:700;">${sayiFormatla(kayit.litre)} LİTRE</span>
        </div>
        <div style="font-size:13px; color:#6b7280;">${tarihFormatla(kayit.tarih)} ${kayit.saat || ""}</div>
      </div>
      <div>${detaylar}</div>
    `;

    icerik.appendChild(kart);
  });

  modalAc("uretimGecmisiModal");
}

function tumVerileriYedekle() {
  const yedek = {
    tarih: new Date().toISOString(),
    versiyon: "1.1",
    aromalar,
    siparisler,
    ozelKayitlar,
    ozelUrunSirasi,
    uretimGecmisi
  };

  const json = JSON.stringify(yedek, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const bugun = new Date();
  const tarihStr = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, "0")}-${String(bugun.getDate()).padStart(2, "0")}`;

  const a = document.createElement("a");
  a.href = url;
  a.download = `aroma_yedek_${tarihStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`Yedekleme tamamlandı.\n\n• ${aromalar.length} aroma\n• ${siparisler.length} sipariş\n• ${ozelKayitlar.length} özel kayıt\n• ${uretimGecmisi.length} üretim kaydı`);
}

function yedektenGeriYukle(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const veri = JSON.parse(e.target.result);

      const aromaSayisi = Array.isArray(veri.aromalar) ? veri.aromalar.length : 0;
      const siparisSayisi = Array.isArray(veri.siparisler) ? veri.siparisler.length : 0;
      const ozelSayisi = Array.isArray(veri.ozelKayitlar) ? veri.ozelKayitlar.length : 0;
      const uretimSayisi = Array.isArray(veri.uretimGecmisi) ? veri.uretimGecmisi.length : 0;

      if (!aromaSayisi && !siparisSayisi && !ozelSayisi) {
        alert("Yedek dosyasında geçerli veri bulunamadı.");
        event.target.value = "";
        return;
      }

      const onay = confirm(
        `Yedek dosyası okundu:\n\n• ${aromaSayisi} aroma\n• ${siparisSayisi} sipariş\n• ${ozelSayisi} özel kayıt\n• ${uretimSayisi} üretim kaydı\n\nMevcut tüm veriler silinip bu yedek yüklenecek.\n\nDevam etmek istiyor musun?`
      );

      if (!onay) { event.target.value = ""; return; }

      if (Array.isArray(veri.aromalar)) {
        aromalar = veri.aromalar.map((a) => ({
          kod: buyukHarfeCevir(a.kod || ""),
          ad: buyukHarfeCevir(a.ad || ""),
          tedarikci: buyukHarfeCevir(a.tedarikci || ""),
          stok: Number(a.stok || 0),
          kritik: Number(a.kritik || 10),
          aciklama: a.aciklama || "",
          termin: buyukHarfeCevir(a.termin || "")
        }));
      }

      if (Array.isArray(veri.siparisler)) {
        siparisler = veri.siparisler.map((s) => ({
          id: s.id || `${Date.now()}-${Math.random()}`,
          kod: buyukHarfeCevir(s.kod || ""),
          ad: buyukHarfeCevir(s.ad || ""),
          tedarikci: buyukHarfeCevir(s.tedarikci || ""),
          miktar: Number(s.miktar || 0),
          tarih: s.tarih || bugununTarihiInputIcin(),
          aciklama: s.aciklama || ""
        }));
      }

      if (Array.isArray(veri.ozelKayitlar)) {
        ozelKayitlar = veri.ozelKayitlar.map((k) => ({
          id: k.id || `${Date.now()}-${Math.random()}`,
          urunAdi: buyukHarfeCevir(k.urunAdi || ""),
          aromaKod: buyukHarfeCevir(k.aromaKod || ""),
          aromaAd: buyukHarfeCevir(k.aromaAd || ""),
          miktar: Number(k.miktar || 0),
          birim: buyukHarfeCevir(k.birim || "KG"),
          not: k.not || ""
        }));
      }

      if (Array.isArray(veri.ozelUrunSirasi)) {
        ozelUrunSirasi = veri.ozelUrunSirasi.map((x) => buyukHarfeCevir(x));
      }

      if (Array.isArray(veri.uretimGecmisi)) {
        uretimGecmisi = veri.uretimGecmisi;
        uretimGecmisiniKaydet();
      }

      ozelUrunSirasiGuncelle();
      verileriKaydet();

      seciliAromaIndex = null;
      seciliSiparisId = null;
      acikOzelUrunAdi = null;

      tabloyuDoldur();
      siparisTablosunuDoldur();
      ozetleriGuncelle();
      ozelTabloyuDoldur(filtreliOzelListeGetir());

      alert(`Yedek başarıyla yüklendi.\n\n• ${aromalar.length} aroma\n• ${siparisler.length} sipariş\n• ${ozelKayitlar.length} özel kayıt\n• ${uretimGecmisi.length} üretim kaydı`);

    } catch {
      alert("Dosya okunamadı. Geçerli bir yedek dosyası seçtiğinden emin ol.");
    }

    event.target.value = "";
  };

  reader.readAsText(file, "utf-8");
}

function uretimArayuzuOlustur() {
  const modalHTML = `
    <div class="modal gizli" id="uretimGecmisiModal">
      <div class="modal-arka" data-kapat="uretimGecmisiModal"></div>
      <div class="modal-kutu modal-kutu-genis">
        <div class="panel-baslik">
          <h2 id="uretimGecmisiBaslik">Üretim Geçmişi</h2>
          <button class="gri-btn" data-kapat="uretimGecmisiModal">Kapat</button>
        </div>
        <div id="uretimGecmisiIcerik"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  document.querySelectorAll("[data-kapat='uretimGecmisiModal']").forEach((el) => {
    el.addEventListener("click", () => modalKapat("uretimGecmisiModal"));
  });

  const detayModal = document.getElementById("ozelDetayModal");
  if (!detayModal) return;

  const tabloAlani = detayModal.querySelector(".tablo-alani");
  if (!tabloAlani) return;

  const uretimPanel = document.createElement("div");
  uretimPanel.id = "uretimPanel";
  uretimPanel.style.cssText = `
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  `;

  uretimPanel.innerHTML = `
    <div style="font-weight:700; color:#15803d; font-size:15px; min-width:160px;">🏭 Üretim Yap (Litre)</div>
    <input
      type="number"
      id="uretimLitreInput"
      placeholder="Kaç litre? (örn: 500)"
      min="0"
      step="1"
      style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px; font:inherit; width:220px;"
    >
    <button id="uretimYapBtn" class="yesil-btn">Üretimi Onayla ve Stoktan Düş</button>
    <button id="uretimGecmisiBtn" class="mavi-btn">📋 Üretim Geçmişi</button>
  `;

  tabloAlani.parentNode.insertBefore(uretimPanel, tabloAlani);

  document.getElementById("uretimYapBtn").addEventListener("click", () => {
    if (!acikOzelUrunAdi) return alert("Önce bir ürün açın.");
    const litre = document.getElementById("uretimLitreInput").value;
    const basarili = uretimYap(acikOzelUrunAdi, litre);
    if (basarili) document.getElementById("uretimLitreInput").value = "";
  });

  document.getElementById("uretimGecmisiBtn").addEventListener("click", () => {
    uretimGecmisiniGoster(acikOzelUrunAdi);
  });

  document.getElementById("uretimLitreInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("uretimYapBtn").click();
  });
}

// Yedekleme butonları
(function yedekArayuzuOlustur() {
  const gizliInput = document.createElement("input");
  gizliInput.type = "file";
  gizliInput.id = "yedekGeriYukleInput";
  gizliInput.accept = ".json,application/json";
  gizliInput.className = "gizli";
  gizliInput.addEventListener("change", yedektenGeriYukle);
  document.body.appendChild(gizliInput);

  const ustAlan = document.querySelector(".ust-alan");
  if (!ustAlan) return;

  const butonGrup = document.createElement("div");
  butonGrup.style.cssText = "margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap;";

  const yedekleBtn = document.createElement("button");
  yedekleBtn.textContent = "💾 Yedek Al";
  yedekleBtn.className = "yesil-btn";
  yedekleBtn.style.cssText = "font-size: 14px; padding: 8px 14px;";
  yedekleBtn.addEventListener("click", tumVerileriYedekle);

  const geriYukleBtn = document.createElement("button");
  geriYukleBtn.textContent = "📂 Yedekten Geri Yükle";
  geriYukleBtn.className = "mavi-btn";
  geriYukleBtn.style.cssText = "font-size: 14px; padding: 8px 14px;";
  geriYukleBtn.addEventListener("click", () => document.getElementById("yedekGeriYukleInput").click());

  butonGrup.appendChild(yedekleBtn);
  butonGrup.appendChild(geriYukleBtn);
  ustAlan.appendChild(butonGrup);
})();

// Başlat
uretimGecmisiniYukle();
uretimArayuzuOlustur();
// ============================================================
// REÇETE ADI DEĞİŞTİRME
// ============================================================

function urunAdiniDegistir(eskiAd, yeniAd) {
  const eski = buyukHarfeCevir(eskiAd || "").trim();
  const yeni = buyukHarfeCevir(yeniAd || "").trim();

  if (!yeni) return alert("Yeni ürün adı boş olamaz.");
  if (eski === yeni) return;

  const zatenVar = ozelKayitlar.some(
    (k) => buyukHarfeCevir(k.urunAdi || "").trim() === yeni
  );
  if (zatenVar) return alert("Bu isimde başka bir ürün zaten var.");

  ozelKayitlar.forEach((k) => {
    if (buyukHarfeCevir(k.urunAdi || "").trim() === eski) {
      k.urunAdi = yeni;
    }
  });

  const siraIndex = ozelUrunSirasi.indexOf(eski);
  if (siraIndex > -1) ozelUrunSirasi[siraIndex] = yeni;

  acikOzelUrunAdi = yeni;

  verileriKaydet();
  ozelTabloyuDoldur(filtreliOzelListeGetir());
  ozelUrunDetayAc(yeni);
}

// Detay modal başlığına düzenle butonu ekle
const _orijinalOzelUrunDetayAc = ozelUrunDetayAc;
ozelUrunDetayAc = function(urunAdi) {
  _orijinalOzelUrunDetayAc(urunAdi);

  const baslik = document.getElementById("ozelDetayBaslik");
  if (!baslik) return;

  // Önceki butonu temizle
  const eskiBtn = document.getElementById("urunAdiDuzenleBtn");
  if (eskiBtn) eskiBtn.remove();

  const duzenleBtn = document.createElement("button");
  duzenleBtn.id = "urunAdiDuzenleBtn";
  duzenleBtn.textContent = "✏️ Adı Değiştir";
  duzenleBtn.className = "mavi-btn buton-mini";
  duzenleBtn.style.cssText = "font-size:13px; margin-left:10px;";
  duzenleBtn.addEventListener("click", () => {
    const mevcutAd = acikOzelUrunAdi;
    const yeniAd = prompt("Yeni ürün adı:", mevcutAd);
    if (yeniAd === null) return; // iptal
    urunAdiniDegistir(mevcutAd, yeniAd);
  });

  baslik.insertAdjacentElement("afterend", duzenleBtn);
};
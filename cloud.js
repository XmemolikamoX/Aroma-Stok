// ============================================================
// BULUT SENKRON + GİRİŞ KATMANI (Supabase)
// ------------------------------------------------------------
// - Supabase ayarlanmışsa: e-posta/şifre ile giriş ister, verileri
//   buluttan yükler ve her değişikliği otomatik buluta kaydeder.
// - Ayarlanmamışsa (config'te BURAYA... duruyorsa): hiçbir şey değişmez,
//   uygulama eskisi gibi sadece yerel (offline) çalışır.
// ============================================================

(function () {
  // Bulutta saklanacak localStorage anahtarları
  const KEYS = [
    "aromaStokListesi",
    "bekleyenSiparisListesi",
    "ozelReceteListesi",
    "ozelUrunSirasi",
    "uretimGecmisi",
    "ozelAlanSifresi"
  ];

  const cfg = window.SUPABASE_CONFIG || {};
  const yapilandirildi =
    cfg.url && cfg.anonKey &&
    !String(cfg.url).includes("BURAYA") &&
    !String(cfg.anonKey).includes("BURAYA");

  // Orijinal setItem'i sakla (sarmadan önce)
  const origSetItem = localStorage.setItem.bind(localStorage);

  let supa = null;
  let aktifKullanici = null;
  let yuklemeBitti = false;
  let appYuklendi = false;
  let yazmaZaman = null;

  // ---- localStorage yazımını yakala: bizim anahtarlar değişince buluta yaz ----
  localStorage.setItem = function (key, value) {
    origSetItem(key, value);
    if (yuklemeBitti && aktifKullanici && KEYS.includes(key)) {
      bulutaYazPlanla();
    }
  };

  function snapshotTopla() {
    const veri = {};
    KEYS.forEach((k) => { veri[k] = localStorage.getItem(k); });
    return veri;
  }

  function bulutaYazPlanla() {
    clearTimeout(yazmaZaman);
    durumGoster("Kaydediliyor…", false);
    yazmaZaman = setTimeout(bulutaYaz, 900);
  }

  async function bulutaYaz() {
    if (!supa || !aktifKullanici) return;
    try {
      const { error } = await supa
        .from("kullanici_verileri")
        .upsert(
          {
            user_id: aktifKullanici.id,
            veri: snapshotTopla(),
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      durumGoster("Kaydedildi ✓", true);
    } catch (e) {
      console.error("Buluta yazma hatası:", e);
      durumGoster("Kayıt hatası ⚠ (internet?)", true);
    }
  }

  async function buluttanOku() {
    try {
      const { data, error } = await supa
        .from("kullanici_verileri")
        .select("veri")
        .eq("user_id", aktifKullanici.id)
        .maybeSingle();
      if (error) throw error;
      if (data && data.veri) {
        KEYS.forEach((k) => {
          const v = data.veri[k];
          if (v !== null && v !== undefined) origSetItem(k, v);
        });
      }
    } catch (e) {
      console.error("Buluttan okuma hatası:", e);
    }
  }

  // ---- Uygulamayı (app.js) yükle ----
  function appBaslat() {
    if (appYuklendi) return;
    appYuklendi = true;
    yuklemeBitti = true;
    const s = document.createElement("script");
    s.src = "app.js";
    document.body.appendChild(s);
  }

  // ---- Durum rozeti ----
  let durumEl = null;
  function durumGoster(metin, otomatikGizle) {
    if (!durumEl) {
      durumEl = document.createElement("div");
      durumEl.className = "bulut-durum";
      document.body.appendChild(durumEl);
    }
    durumEl.textContent = metin;
    durumEl.classList.add("gorunur");
    clearTimeout(durumEl._t);
    if (otomatikGizle) {
      durumEl._t = setTimeout(() => durumEl.classList.remove("gorunur"), 2200);
    }
  }

  // ---- Çıkış butonu ----
  function cikisButonuEkle() {
    if (document.getElementById("cikisBtn")) return;
    const btn = document.createElement("button");
    btn.id = "cikisBtn";
    btn.className = "cikis-btn gri-btn";
    btn.textContent = "⎋ Çıkış";
    if (aktifKullanici) btn.title = aktifKullanici.email || "";
    btn.addEventListener("click", async () => {
      if (!confirm("Çıkış yapmak istiyor musun?")) return;
      try { await supa.auth.signOut(); } catch (e) { console.error(e); }
      location.reload();
    });
    document.body.appendChild(btn);
  }

  // ---- Giriş ekranı ----
  function girisEkraniGoster() {
    let katman = document.getElementById("girisKatman");
    if (katman) { katman.classList.remove("gizli-katman"); return; }

    katman = document.createElement("div");
    katman.id = "girisKatman";
    katman.className = "giris-katman";
    katman.innerHTML = `
      <div class="giris-kutu">
        <h1>🔒 Aroma Stok</h1>
        <p class="giris-aciklama">Reçeteleriniz güvende. Devam etmek için giriş yapın.</p>

        <label for="girisEmail">E-posta</label>
        <input type="email" id="girisEmail" placeholder="ornek@mail.com" autocomplete="username">

        <label for="girisSifre">Şifre</label>
        <input type="password" id="girisSifre" placeholder="••••••••" autocomplete="current-password">

        <p id="girisHata" class="giris-hata gizli"></p>

        <div class="giris-butonlar">
          <button id="girisYapBtn" class="mavi-btn">Giriş Yap</button>
          <button id="kayitOlBtn" class="gri-btn">Kayıt Ol</button>
        </div>
        <p class="giris-not">İlk kez mi giriyorsun? Önce "Kayıt Ol" ile hesap oluştur.</p>
      </div>
    `;
    document.body.appendChild(katman);

    const hataGoster = (m, hataMi = true) => {
      const h = document.getElementById("girisHata");
      h.textContent = m;
      h.classList.remove("gizli");
      h.classList.toggle("bilgi", !hataMi);
    };
    const email = () => document.getElementById("girisEmail").value.trim();
    const sifre = () => document.getElementById("girisSifre").value;

    document.getElementById("girisYapBtn").addEventListener("click", async () => {
      if (!email() || !sifre()) return hataGoster("E-posta ve şifre girin.");
      hataGoster("Giriş yapılıyor…", false);
      const { data, error } = await supa.auth.signInWithPassword({ email: email(), password: sifre() });
      if (error) return hataGoster("Giriş başarısız: " + error.message);
      aktifKullanici = data.user;
      await girisSonrasi();
    });

    document.getElementById("kayitOlBtn").addEventListener("click", async () => {
      if (!email() || !sifre()) return hataGoster("E-posta ve şifre girin.");
      if (sifre().length < 6) return hataGoster("Şifre en az 6 karakter olmalı.");
      hataGoster("Hesap oluşturuluyor…", false);
      const { data, error } = await supa.auth.signUp({ email: email(), password: sifre() });
      if (error) return hataGoster("Kayıt başarısız: " + error.message);
      if (data.session) {
        aktifKullanici = data.user;
        await girisSonrasi();
      } else {
        hataGoster("Hesap oluşturuldu! E-postana gelen onay linkine tıkla, sonra giriş yap.", false);
      }
    });

    ["girisEmail", "girisSifre"].forEach((id) => {
      document.getElementById(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.getElementById("girisYapBtn").click();
      });
    });
  }

  function girisEkraniGizle() {
    const k = document.getElementById("girisKatman");
    if (k) k.classList.add("gizli-katman");
  }

  async function girisSonrasi() {
    durumGoster("Veriler yükleniyor…", false);
    await buluttanOku();
    girisEkraniGizle();
    cikisButonuEkle();
    durumGoster("Hazır ✓", true);
    appBaslat();
  }

  // ---- Başlangıç ----
  async function basla() {
    // Supabase ayarlanmamış → eski yerel davranış
    if (!yapilandirildi || !window.supabase) {
      if (yapilandirildi && !window.supabase) {
        console.warn("Supabase SDK yüklenemedi (internet?). Yerel modda açılıyor.");
      }
      appBaslat();
      return;
    }

    supa = window.supabase.createClient(cfg.url, cfg.anonKey);

    try {
      const { data } = await supa.auth.getSession();
      if (data && data.session) {
        aktifKullanici = data.session.user;
        await girisSonrasi();
        return;
      }
    } catch (e) {
      console.error("Oturum kontrol hatası:", e);
    }
    girisEkraniGoster();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", basla);
  } else {
    basla();
  }
})();

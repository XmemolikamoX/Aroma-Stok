// ============================================================
// SUPABASE AYARLARI
// ============================================================
// Aşağıdaki iki değeri kendi Supabase projenden al ve yapıştır.
// Supabase panelinde:  Settings (Ayarlar) > API  sayfasında bulunur.
//
//   url     = "Project URL"        (örn: https://abcdefgh.supabase.co)
//   anonKey = "anon public" anahtarı (uzun bir metin)
//
// NOT: anon (public) anahtarın herkese açık olması NORMALDİR; güvenlik
// veritabanındaki kurallarla (RLS) sağlanır. Service_role anahtarını ASLA
// buraya koyma.
//
// Bu iki değer "BURAYA..." olarak kaldığı sürece uygulama eskisi gibi
// SADECE YEREL (offline) çalışır; giriş ekranı çıkmaz.
// ============================================================

window.SUPABASE_CONFIG = {
  url: "https://egwatujoyipsvcdmstes.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2F0dWpveWlwc3ZjZG1zdGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDA2MzEsImV4cCI6MjA5NzI3NjYzMX0.ULg2DuNi2xPss-LvwvcxdVX3CY1x4lBGHyPKVIkZE0M"
};

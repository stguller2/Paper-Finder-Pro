# Paper Finder Pro

Akademik makale atıflarını analiz eden, DOI numaralarını bulan ve Sci-Hub/LibGen gibi kaynaklar üzerinden hızlı indirme bağlantıları oluşturan modern bir web uygulamasıdır.

## 🚀 Özellikler

- **V1: Tekil Atıf Analizi:** Karmaşık veya eksik atıf metinlerini (Abstract dahil) analiz ederek DOI, başlık, yazar ve yıl bilgilerini çıkarır.
- **V2: PDF Referans Ayıklama:** Akademik bir PDF dosyasını yüklediğinizde, kaynakça (References) bölümündeki tüm atıfları otomatik olarak bulur ve her biri için indirme linkleri oluşturur.
- **Gelişmiş Sci-Hub Entegrasyonu:**
  - 8 farklı aktif Sci-Hub mirror'ı arasından seçim yapabilme.
  - DNS engellemelerine karşı (NXDOMAIN hatası) yerleşik hata giderme rehberi.
- **Alternatif Kaynaklar:** Sci-Hub'da bulunamayan (özellikle 2022-2025 arası yeni makaleler) için LibGen, Google Scholar, ResearchGate, PubMed ve Semantic Scholar bağlantıları.
- **Yapay Zeka Destekli:** Metadata çıkarımı için Google Gemini AI (Gemini 3 Flash) modelini kullanır.

## 🛠️ Kurulum ve Çalıştırma

Bu proje bir React + Vite + Tailwind CSS uygulamasıdır.

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

3. Çıktı almak (Build) için:
```bash
npm run build
```

## 🔑 Gereksinimler

Projenin çalışması için bir **Gemini API Key** gereklidir. Geliştirme ortamında `.env` dosyasına veya AI Studio üzerindeki "Secrets" paneline `GEMINI_API_KEY` eklenmiş olmalıdır.

## 📝 Notlar
- Uygulama, Sci-Hub veritabanının genellikle 2021 sonrasını kapsamadığının bilincindedir ve bu makaleler için otomatik olarak alternatif yollara yönlendirme yapar.
- DNS engellerini aşmak için kullanıcıya 1.1.1.1 veya 8.8.8.8 kullanımı önerilir.

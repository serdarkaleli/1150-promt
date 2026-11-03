# Master Prompt Kütüphanesi (PromptHub Pro)

Kişisel ve profesyonel Master Promptlarınızı güvenle saklayabileceğiniz, kategorilere ayırabileceğiniz, etiketleyebileceğiniz, arayabileceğiniz ve tek tıkla özelleştirip kopyalayabileceğiniz modern, mobil uyumlu ve uçtan uca güvenli bir web uygulaması.

---

## 1. Mimari ve Klasör Yapısı

Uygulama, hem yerel ortamda tek komutla bağımsız çalışabilen (Express + Vite + SQLite/JSON + JWT) hem de Supabase PostgreSQL + Vercel üzerinde sıfır maliyetle ($0) dağıtılabilen modüler bir mimariye sahiptir.

```
├── /
│   ├── index.html                   # HTML giriş noktası, SEO ve OpenGraph tanımları
│   ├── metadata.json                # AI Studio meta konfigürasyonu
│   ├── package.json                 # Bağımlılıklar ve çalıştırma scriptleri
│   ├── server.ts                    # Full-Stack Express sunucusu & Vite dev entegrasyonu
│   ├── tsconfig.json                # TypeScript konfigürasyonu
│   ├── vite.config.ts               # Vite & Tailwind CSS konfigürasyonu
│   ├── README.md                    # Tam mimari ve kurulum kılavuzu
│   │
│   ├── /supabase
│   │   └── schema.sql               # PostgreSQL şeması, RLS politikaları, trigram indeksleri
│   │
│   ├── /src
│   │   ├── main.tsx                 # React DOM giriş noktası
│   │   ├── App.tsx                  # Ana uygulama düzeni, filtreler ve modal yönetimi
│   │   ├── index.css                # Tailwind CSS v4 direktifleri
│   │   │
│   │   ├── /types
│   │   │   └── index.ts             # User, Prompt, Category, Filter tipleri
│   │   │
│   │   ├── /context
│   │   │   └── AuthContext.tsx      # Kullanıcı oturumu, token yönetimi, demo girişi
│   │   │
│   │   ├── /services
│   │   │   └── api.ts               # REST API istemcisi, Bearer header yönetimi
│   │   │
│   │   ├── /utils
│   │   │   ├── prompt-utils.ts      # Türkçe normalizasyon, değişken ayrıştırma, filtreleme
│   │   │   └── prompt-utils.test.ts # node:test ile yazılmış birim testleri
│   │   │
│   │   ├── /server
│   │   │   ├── db.ts                # Atomik dosya tabanlı veritabanı & hazır Türkçe promptlar
│   │   │   └── auth.ts              # JWT token üretme & doğrulama middleware
│   │   │
│   │   └── /components
│   │       ├── Header.tsx           # Üst bar, anlık arama, yeni prompt ve profil butonları
│   │       ├── Sidebar.tsx          # Kategoriler, etiketler, favori filtresi, mobil çekmece
│   │       ├── PromptCard.tsx       # Prompt kartı, tek tıkla kopyalama, token tahmini
│   │       ├── PromptDetailModal.tsx# Tam metin inceleme, canlı değişken doldurma
│   │       ├── PromptFormModal.tsx  # Prompt ekleme & düzenleme formu
│   │       ├── VariableReplacerModal.tsx # Dinamik {{değişken}} doldurma ve kopyalama
│   │       ├── DeployGuideModal.tsx # Uygulama içi Supabase & Vercel rehberi
│   │       ├── ExportImportModal.tsx# JSON yedekleme ve toplu içe aktarma
│   │       └── Toast.tsx            # Başarılı/hata bildirim konteyneri
│   │
│   └── /.data                       # Sunucu tarafı izole kullanıcı veri deposu (db.json)
```

---

## 2. Veritabanı Şeması ve Güvenlik Kuralları (Row Level Security - RLS)

Supabase üzerinde çalıştırılacak PostgreSQL tablosu ve güvenlik politikaları:

### `prompts` Tablosu
- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id`: `UUID REFERENCES auth.users(id) ON DELETE CASCADE`
- `title`: `TEXT NOT NULL`
- `description`: `TEXT DEFAULT ''`
- `content`: `TEXT NOT NULL`
- `category`: `TEXT DEFAULT 'Genel'`
- `tags`: `TEXT[] DEFAULT '{}'`
- `is_favorite`: `BOOLEAN DEFAULT false`
- `copy_count`: `INTEGER DEFAULT 0`
- `created_at`: `TIMESTAMPTZ DEFAULT now()`
- `updated_at`: `TIMESTAMPTZ DEFAULT now()`

### RLS Güvenlik Kuralları
```sql
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompts"
    ON public.prompts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts"
    ON public.prompts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
    ON public.prompts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
    ON public.prompts FOR DELETE USING (auth.uid() = user_id);
```

> **Güvenlik Garantisi:** Kullanıcılar yalnızca `auth.uid()` değerlerine karşılık gelen promptları okuyabilir, ekleyebilir, değiştirebilir ve silebilir.

---

## 3. Ortam Değişkenleri (.env)

```env
# Supabase Bağlantısı (Supabase Kontrol Paneli > Settings > API)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# JWT Gizli Anahtarı
JWT_SECRET="guclu-ve-rastgele-bir-anahtar-2026"

# Port (Varsayılan 3000)
PORT=3000
```

---

## 4. Yerel Kurulum Adımları

1. Repoyu klonlayın ve bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

2. Birim testlerini çalıştırın:
   ```bash
   npx tsx --test src/utils/prompt-utils.test.ts
   ```

3. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```

4. Tarayıcınızda `http://localhost:3000` adresini açın.
   - Hazır demo hesabı: `demo@prompthub.local` / `demo1234`
   - Veya "Kayıt Ol" sekmesinden kendi izole hesabınızı açın.

### Kişisel erişim için yayınlama (Render)

Bu sürüm React arayüzü ve Express API'sini aynı Node servisi olarak çalıştırır. Bu nedenle yalnızca statik Vercel deploy'u yerine Node web service kullanın:

1. Repoyu GitHub'a push edin.
2. Render'da **New > Blueprint** seçip repoyu bağlayın.
3. Render, kökteki `render.yaml` dosyasındaki `1150-prompt` servisini oluşturur.
4. Deploy tamamlanınca verilen `onrender.com` adresini bilgisayar ve telefondan açın.

`JWT_SECRET` Render tarafından otomatik üretilir. Mevcut JSON veri deposu (`.data/db.json`) kişisel kullanım için çalışır; ancak Render'ın ücretsiz diskinde servis yeniden oluşturulursa veriler kalıcı olmayabilir. Düzenli olarak uygulamadaki JSON dışa aktarma özelliğiyle yedek alın.

---

## 5. Test Senaryoları

| Senaryo No | Test Adı | Beklenen Sonuç |
|------------|----------|----------------|
| **TS-01** | Kullanıcı Kaydı & Giriş | Şifre Bcrypt ile hashlenir, JWT token döner, oturum açık kalır. |
| **TS-02** | Veri İzolasyonu | A kullanıcısı B kullanıcısının promptlarını listeleyemez veya silemez (401/404). |
| **TS-03** | Türkçe Arama Normalizasyonu | "TypeScript", "türkçe", "ıgdır", "IGDIR" aramaları karakter bağımsız eşleşir. |
| **TS-04** | Tek Tıkla Kopyalama | Panoya kopyalanır, bildirim çıkar, kopyalama sayacı 1 artar. |
| **TS-05** | Şablon Değişkenleri | `{{proje_adi}}` algılanır, formda doldurulup özelleştirilmiş kopyalama yapılır. |
| **TS-06** | JSON Dışa & İçe Aktarma | Promptlar JSON olarak indirilir, başka bir hesapta eksiksiz içe aktarılır. |
| **TS-07** | Prompt Test Laboratuvarı | Prompt detayından senaryo açılır, değişkenler doldurulur, eksik alanlar doğrulanır ve senaryo tarayıcıda kaydedilir. |

---

## 6. Çevrim İçi Yayınlama Adımları (Supabase + Vercel)

1. **Supabase Veritabanı:**
   - [supabase.com](https://supabase.com) adresinde ücretsiz proje açın.
   - `SQL Editor` sekmesine girip `supabase/schema.sql` dosyasındaki SQL kodunu çalıştırın.
2. **Vercel Dağıtımı:**
   - Projenizi GitHub'a push edin.
   - [vercel.com](https://vercel.com) adresinden "Import Project" seçin.
   - Environment variables kısmına `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` ekleyin.
   - `Deploy` butonuna basın.
3. **Maliyet:** 0 TL / Ay (Hobby planlar kapsamında ömür boyu ücretsizdir).

---

## 7. Bilinen Eksikler ve Sonraki Geliştirme Aşamaları

- [ ] **Prompt Versiyon Geçmişi:** Yapılan düzenlemelerin önceki sürümlerini geri yükleyebilme.
- [ ] **Topluluk Paylaşımı (Public Link):** İstenen promptları parola korumalı veya herkese açık bağlantı ile paylaşabilme.
- [ ] **Çoklu Dil Çevirici:** Prompt içeriğini tek tıkla İngilizce veya diğer dillere çevirip kopyalayabilme.

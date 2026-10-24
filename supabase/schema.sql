-- ==============================================================================
-- MASTER PROMPT KÜTÜPHANESİ - SUPABASE POSTGRESQL VERİTABANI ŞEMASI & RLS POLİTİKALARI
-- ==============================================================================

-- 1. UUID & Arama Eklentilerini Aktifleştir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Kategoriler Tablosu (categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL ise genel şablon kategorisi
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Folder',
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Promptlar Tablosu (prompts)
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'Genel' NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    is_favorite BOOLEAN DEFAULT false NOT NULL,
    copy_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. İndeksler (Hızlı filtreleme, arama ve sıralama için)
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON public.prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON public.prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_is_favorite ON public.prompts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON public.prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON public.prompts USING GIN(tags);

-- Türkçe ve genel metin araması için GIN Trigram İndeksleri
CREATE INDEX IF NOT EXISTS idx_prompts_title_trgm ON public.prompts USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prompts_desc_trgm ON public.prompts USING GIN(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prompts_content_trgm ON public.prompts USING GIN(content gin_trgm_ops);

-- 5. Otomatik updated_at Güncelleme Tetikleyicisi
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prompts_updated_at ON public.prompts;
CREATE TRIGGER trigger_prompts_updated_at
    BEFORE UPDATE ON public.prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. GÜVENLİK: ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- Kullanıcıların SADECE KENDİ promptlarına erişebilmesini kesin olarak sağlar.
-- ==============================================================================

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Prompts RLS Kuralları:
-- a) Kullanıcı yalnızca kendi promptlarını görebilir
CREATE POLICY "Users can view own prompts"
    ON public.prompts
    FOR SELECT
    USING (auth.uid() = user_id);

-- b) Kullanıcı yalnızca kendi user_id'si ile prompt ekleyebilir
CREATE POLICY "Users can insert own prompts"
    ON public.prompts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- c) Kullanıcı yalnızca kendi promptlarını güncelleyebilir
CREATE POLICY "Users can update own prompts"
    ON public.prompts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- d) Kullanıcı yalnızca kendi promptlarını silebilir
CREATE POLICY "Users can delete own prompts"
    ON public.prompts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Categories RLS Kuralları:
-- Kullanıcı kendi oluşturduğu veya sistemin genel kategorilerini (user_id IS NULL) görebilir
CREATE POLICY "Users can view categories"
    ON public.categories
    FOR SELECT
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
    ON public.categories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
    ON public.categories
    FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 7. BAŞLANGIÇ KATEGORİLERİ (Örnek Sistem Kategorileri)
-- ==============================================================================
INSERT INTO public.categories (name, icon, color) VALUES
    ('Yazılım & Kodlama', 'Code', '#3b82f6'),
    ('SEO & İçerik Pazarlaması', 'Megaphone', '#10b981'),
    ('Veri Analizi & Python', 'BarChart2', '#8b5cf6'),
    ('İş & Yönetim Stratejisi', 'Briefcase', '#f59e0b'),
    ('Görsel & Midjourney', 'Image', '#ec4899'),
    ('Çeviri & Dil Öğrenimi', 'Languages', '#06b6d4')
ON CONFLICT DO NOTHING;

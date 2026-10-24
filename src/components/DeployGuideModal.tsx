import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Copy,
  Check,
  Database,
  Cloud,
  ShieldCheck,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { useToast } from './Toast';

interface DeployGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeployGuideModal: React.FC<DeployGuideModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'supabase' | 'env' | 'vercel' | 'rls'>('supabase');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Metin panoya kopyalandı!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sqlCode = `-- ==============================================================================
-- MASTER PROMPT KÜTÜPHANESİ - SUPABASE POSTGRESQL & RLS GÜVENLİK KURALLARI
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Prompts Tablosu
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

-- 2. Kategoriler Tablosu
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Folder',
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Row Level Security (RLS) Etkinleştirme
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 4. Kullanıcı İzolasyon Politikaları (Yalnızca kendi verilerine erişim)
CREATE POLICY "Users can view own prompts" ON public.prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prompts" ON public.prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prompts" ON public.prompts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own prompts" ON public.prompts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view categories" ON public.categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);`;

  const envSample = `# Supabase Bağlantısı (Supabase Project Dashboard -> Settings -> API)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# JWT Güvenlik Anahtarı (İsteğe bağlı Express / Standalone sunucu için)
JWT_SECRET="guclu-ve-rastgele-bir-gizli-anahtar-2026"

# Uygulama URL'i
APP_URL="https://your-domain.vercel.app"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Veritabanı, Güvenlik & Vercel Dağıtım Rehberi
              </h2>
              <p className="text-xs text-slate-400">
                Supabase PostgreSQL, RLS Politikaları ve Vercel kurulum adımları
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Rehber penceresini kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'supabase'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>1. Supabase Kurulumu & SQL</span>
          </button>

          <button
            onClick={() => setActiveTab('rls')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'rls'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>2. RLS & Kullanıcı Güvenliği</span>
          </button>

          <button
            onClick={() => setActiveTab('env')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'env'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>3. Ortam Değişkenleri (.env)</span>
          </button>

          <button
            onClick={() => setActiveTab('vercel')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'vercel'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>4. Vercel Dağıtımı</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Supabase Ücretsiz Proje Başlatma (Minimum Masraf / $0):
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 underline font-medium inline-flex items-center gap-1"
                    >
                      supabase.com <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    üzerinden ücretsiz bir hesap oluşturun ve "New Project" butonuna tıklayın.
                  </li>
                  <li>Proje bölgesi olarak Avrupa (Frankfurt) veya size en yakın bölgeyi seçin.</li>
                  <li>
                    Sol menüden <strong>SQL Editor</strong> sekmesini açın ve "New query" seçin.
                  </li>
                  <li>Aşağıdaki SQL şemasını yapıştırıp <strong>Run</strong> butonuna tıklayın.</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs text-slate-400 uppercase font-semibold">
                    SQL Editor'e Yapıştırılacak Kod:
                  </span>
                  <button
                    onClick={() => copyToClipboard(sqlCode, 'sql')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
                  >
                    {copiedKey === 'sql' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>SQL'i Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto max-h-64 leading-relaxed text-slate-300">
                  <pre>{sqlCode}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rls' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-800/40 space-y-2">
                <h3 className="font-bold text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Kullanıcı İzolasyonu & Row Level Security (RLS) Garantisi
                </h3>
                <p>
                  Uygulamanızda her kullanıcı <strong>yalnızca kendi oluşturduğu</strong> özel master
                  promptları görebilir, düzenleyebilir ve silebilir. Başka bir kullanıcının API veya
                  doğrudan veritabanı sorgusu ile başkasının promptlarına erişmesi PostgreSQL çekirdek
                  seviyesinde engellenmiştir.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200">Uygulanan Güvenlik Katmanları:</h4>
                <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-300">
                  <li>
                    <strong>auth.uid() = user_id:</strong> Supabase Auth tokeni içerisindeki kullanıcı kimliği ile satırdaki <code>user_id</code> eşleşmediğinde veritabanı boş küme döner.
                  </li>
                  <li>
                    <strong>Şifreleme (Bcrypt):</strong> Şifreler asla düz metin (plaintext) olarak saklanmaz, tek yönlü tuzlanmış hash olarak tutulur.
                  </li>
                  <li>
                    <strong>Sunucu Tarafı Doğrulama:</strong> Express / Next.js sunucu uç noktalarında gelen tüm istekler JWT token doğrulamasına tabi tutulur.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  Gereken Ortam Değişkenleri (.env)
                </h3>
                <p className="text-slate-400">
                  Supabase kontrol panelinizde <code>Project Settings &gt; API</code> sekmesinden aşağıdaki
                  değerleri kopyalayın:
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs text-slate-400 uppercase font-semibold">
                    .env.local / Vercel Environment Variables:
                  </span>
                  <button
                    onClick={() => copyToClipboard(envSample, 'env')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
                  >
                    {copiedKey === 'env' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>.env Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300">
                  <pre>{envSample}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-indigo-400" />
                  Vercel Üzerinde 3 Adımda Canlıya Alma (Ücretsiz / Hobby Plan):
                </h3>
                <ol className="list-decimal list-inside space-y-2 pl-1 text-slate-300">
                  <li>
                    GitHub reponuzu{' '}
                    <a
                      href="https://vercel.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 underline font-medium"
                    >
                      vercel.com
                    </a>{' '}
                    üzerine aktarın ("Add New Project" &gt; "Import Git Repository").
                  </li>
                  <li>
                    <strong>Environment Variables</strong> bölümüne yukarıdaki değişkenleri ekleyin (<code>NEXT_PUBLIC_SUPABASE_URL</code> ve <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>).
                  </li>
                  <li>
                    <strong>Deploy</strong> butonuna tıklayın. 1-2 dakika içinde uygulamanız dünya çapında CDN üzerinde aktif olacaktır!
                  </li>
                </ol>
              </div>

              <div className="p-4 bg-indigo-950/30 rounded-xl border border-indigo-800/40">
                <span className="font-semibold text-indigo-300 block mb-1">Maliyet Özeti:</span>
                <p className="text-xs text-slate-300">
                  Vercel Hobby Plan (Ücretsiz) + Supabase Free Tier (Ücretsiz 500 MB DB, 50.000 aktif kullanıcı/ay).
                  Kişisel ve ekip içi kullanım için <strong>0 TL / 0 USD maliyetle</strong> ömür boyu çalışır.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Tamam, Anladım
          </button>
        </div>
      </div>
    </div>
  );
};

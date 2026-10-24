import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  SlidersHorizontal,
  FolderOpen,
  Sparkles,
  ArrowUpDown,
  Filter,
  CheckCircle,
  LogIn,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PromptCard } from './components/PromptCard';
import { PromptDetailModal } from './components/PromptDetailModal';
import { PromptFormModal } from './components/PromptFormModal';
import { VariableReplacerModal } from './components/VariableReplacerModal';
import { DeployGuideModal } from './components/DeployGuideModal';
import { ExportImportModal } from './components/ExportImportModal';
import { AuthModal } from './components/AuthModal';
import { RecentlyUsedWidget } from './components/RecentlyUsedWidget';
import { api } from './services/api';
import type { Prompt, Category, PromptCreateInput } from './types';

function PromptHubApp() {
  const { user, isAuthenticated, loading: authLoading, loginWithDemo } = useAuth();
  const { showToast } = useToast();

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [recentPrompts, setRecentPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedTag, setSelectedTag] = useState('Tümü');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyFillable, setOnlyFillable] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'popular'>('newest');
  const [isLoadingPack, setIsLoadingPack] = useState(false);
  const PAGE_SIZE = 32;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when search or filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedCategory, selectedTag, onlyFavorites, onlyFillable, sortBy]);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [detailPrompt, setDetailPrompt] = useState<Prompt | null>(null);
  const [replacerPrompt, setReplacerPrompt] = useState<Prompt | null>(null);
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto-login with demo if unauthenticated on fresh applet mount for effortless testing
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      loginWithDemo().catch(() => {});
    }
  }, [authLoading, isAuthenticated, loginWithDemo]);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setPrompts([]);
      setCategories([]);
      setTags([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [fetchedPrompts, fetchedCategories, fetchedTags, fetchedRecent] = await Promise.all([
        api.getPrompts({
          searchQuery,
          category: selectedCategory,
          tag: selectedTag,
          onlyFavorites,
          onlyFillable,
          sortBy,
        }),
        api.getCategories(),
        api.getTags(),
        api.getRecentPrompts(3),
      ]);

      setPrompts(fetchedPrompts);
      setCategories(fetchedCategories);
      setTags(fetchedTags);
      setRecentPrompts(fetchedRecent);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      showToast(err.message || 'Veriler yüklenirken hata oluştu.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, searchQuery, selectedCategory, selectedTag, onlyFavorites, onlyFillable, sortBy, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLoadSamplePack = async () => {
    try {
      setIsLoadingPack(true);
      const res = await api.loadSamplePack();
      showToast(res.message, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Paket yüklenirken hata oluştu.', 'error');
    } finally {
      setIsLoadingPack(false);
    }
  };

  // Actions
  const handleToggleFavorite = async (id: string) => {
    try {
      const res = await api.toggleFavorite(id);
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_favorite: res.is_favorite } : p))
      );
      setRecentPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_favorite: res.is_favorite } : p))
      );
      if (detailPrompt && detailPrompt.id === id) {
        setDetailPrompt((prev) => (prev ? { ...prev, is_favorite: res.is_favorite } : null));
      }
      showToast(
        res.is_favorite ? 'Favorilere eklendi!' : 'Favorilerden çıkarıldı.',
        'info'
      );
    } catch {
      showToast('Favori güncellenemedi.', 'error');
    }
  };

  const handleIncrementCopy = async (id: string) => {
    try {
      const res = await api.incrementCopy(id);
      const nowIso = res.last_copied_at || new Date().toISOString();
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, copy_count: res.copy_count, last_copied_at: nowIso } : p))
      );
      setRecentPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, copy_count: res.copy_count, last_copied_at: nowIso } : p))
      );
      if (detailPrompt && detailPrompt.id === id) {
        setDetailPrompt((prev) => (prev ? { ...prev, copy_count: res.copy_count, last_copied_at: nowIso } : null));
      }
      // Reload recent prompts to reorder with the newest at the top
      api.getRecentPrompts(3).then((rec) => setRecentPrompts(rec)).catch(() => {});
    } catch {}
  };

  const handleSavePrompt = async (data: PromptCreateInput) => {
    if (editingPrompt) {
      const updated = await api.updatePrompt(editingPrompt.id, data);
      showToast('Prompt başarıyla güncellendi!', 'success');
      setEditingPrompt(null);
    } else {
      await api.createPrompt(data);
      showToast('Yeni prompt başarıyla oluşturuldu!', 'success');
    }
    await loadData();
  };

  const handleDeletePrompt = async (id: string) => {
    try {
      await api.deletePrompt(id);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      if (detailPrompt?.id === id) {
        setDetailPrompt(null);
      }
      showToast('Prompt silindi.', 'info');
    } catch {
      showToast('Prompt silinemedi.', 'error');
    }
  };

  const handleAddCategory = async (name: string, color?: string) => {
    try {
      const newCat = await api.createCategory(name, color);
      setCategories((prev) => [...prev, newCat]);
      showToast(`"${name}" kategorisi eklendi.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Kategori eklenemedi.', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast('Kategori silindi.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Kategori silinemedi.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-violet-600 selection:text-white">
      {/* Top Navbar */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewPrompt={() => {
          setEditingPrompt(null);
          setIsFormOpen(true);
        }}
        onOpenDeployGuide={() => setIsDeployGuideOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Left Sidebar */}
        <Sidebar
          categories={categories}
          tags={tags}
          prompts={prompts}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setIsMobileMenuOpen(false);
          }}
          selectedTag={selectedTag}
          onSelectTag={(tag) => {
            setSelectedTag(tag);
            setIsMobileMenuOpen(false);
          }}
          onlyFavorites={onlyFavorites}
          onToggleFavorites={() => setOnlyFavorites(!onlyFavorites)}
          onlyFillable={onlyFillable}
          onToggleFillable={() => setOnlyFillable(!onlyFillable)}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onLoadSamplePack={handleLoadSamplePack}
          isLoadingPack={isLoadingPack}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onOpenDeployGuide={() => {
            setIsMobileMenuOpen(false);
            setIsDeployGuideOpen(true);
          }}
          onOpenExportImport={() => {
            setIsMobileMenuOpen(false);
            setIsExportImportOpen(true);
          }}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {/* Son Kullanılanlar Widget'ı */}
          <RecentlyUsedWidget
            recentPrompts={recentPrompts}
            categories={categories}
            onOpenDetail={(p) => setDetailPrompt(p)}
            onOpenReplacer={(p) => setReplacerPrompt(p)}
            onIncrementCopy={handleIncrementCopy}
            onToggleFavorite={handleToggleFavorite}
          />

          {/* Active Filter Bar & Sorting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                  <span>
                    {onlyFillable
                      ? '⚡ Doldurulabilir Şablon Formları'
                      : onlyFavorites
                      ? 'Favori Master Promptlar'
                      : selectedCategory !== 'Tümü'
                      ? selectedCategory
                      : selectedTag !== 'Tümü'
                      ? `#${selectedTag} Etiketli Promptlar`
                      : 'Tüm Master Promptlar'}
                  </span>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {prompts.length}
                  </span>
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {onlyFillable
                  ? 'Yalnızca doldurulabilir alanlara sahip, sade form olarak uygulanabilen promptlar listeleniyor.'
                  : searchQuery
                  ? `"${searchQuery}" araması için sonuçlar görüntüleniyor`
                  : 'Yapay zeka şablonlarınızı yönetin, özelleştirin ve tek tıkla kopyalayın.'}
              </p>

              {/* Active filter pills */}
              {(onlyFillable || onlyFavorites || selectedCategory !== 'Tümü' || selectedTag !== 'Tümü' || searchQuery) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {onlyFillable && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ⚡ Doldurulabilir Formlar
                      <button onClick={() => setOnlyFillable(false)} className="hover:text-white">×</button>
                    </span>
                  )}
                  {onlyFavorites && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      ♥ Favoriler
                      <button onClick={() => setOnlyFavorites(false)} className="hover:text-white">×</button>
                    </span>
                  )}
                  {selectedCategory !== 'Tümü' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Kategori: {selectedCategory}
                      <button onClick={() => setSelectedCategory('Tümü')} className="hover:text-white">×</button>
                    </span>
                  )}
                  {selectedTag !== 'Tümü' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      #{selectedTag}
                      <button onClick={() => setSelectedTag('Tümü')} className="hover:text-white">×</button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sırala:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="newest">En Yeniler</option>
                <option value="oldest">En Eskiler</option>
                <option value="popular">En Çok Kopyalananlar</option>
                <option value="title">Başlığa Göre (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 h-56"
                />
              ))}
            </div>
          ) : prompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80 my-6">
              <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4">
                <FolderOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-200 mb-1">
                Kriterlere Uygun Prompt Bulunamadı
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-5">
                {searchQuery || selectedCategory !== 'Tümü' || selectedTag !== 'Tümü' || onlyFavorites
                  ? 'Filtreleri sıfırlayarak veya yeni bir arama yaparak tekrar deneyin.'
                  : 'Kütüphaneniz henüz boş. İlk master promptunuzu ekleyerek başlayın!'}
              </p>
              <div className="flex items-center gap-2">
                {(searchQuery || selectedCategory !== 'Tümü' || selectedTag !== 'Tümü' || onlyFavorites) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('Tümü');
                      setSelectedTag('Tümü');
                      setOnlyFavorites(false);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingPrompt(null);
                    setIsFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-600/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Prompt Ekle</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {prompts.slice(0, visibleCount).map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    categories={categories}
                    onToggleFavorite={handleToggleFavorite}
                    onIncrementCopy={handleIncrementCopy}
                    onEdit={(p) => {
                      setEditingPrompt(p);
                      setIsFormOpen(true);
                    }}
                    onDelete={handleDeletePrompt}
                    onOpenDetail={(p) => setDetailPrompt(p)}
                    onOpenReplacer={(p) => setReplacerPrompt(p)}
                  />
                ))}
              </div>

              {/* Progressive loading controls for large prompt catalogs */}
              {prompts.length > visibleCount && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
                  <div className="text-xs text-slate-400 text-center sm:text-left">
                    Toplam <span className="text-slate-100 font-bold">{prompts.length}</span> prompttan{' '}
                    <span className="text-violet-400 font-bold">{Math.min(visibleCount, prompts.length)}</span> tanesi gösteriliyor.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, prompts.length))}
                      className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Daha Fazla Göster (+{Math.min(PAGE_SIZE, prompts.length - visibleCount)})</span>
                    </button>
                    <button
                      onClick={() => setVisibleCount(prompts.length)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                    >
                      Tümünü Göster ({prompts.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <PromptFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPrompt(null);
        }}
        onSubmit={handleSavePrompt}
        initialData={editingPrompt}
        categories={categories}
        existingTags={tags}
        onAddCategory={handleAddCategory}
      />

      <PromptDetailModal
        prompt={detailPrompt}
        categories={categories}
        isOpen={!!detailPrompt}
        onClose={() => setDetailPrompt(null)}
        onEdit={(p) => {
          setDetailPrompt(null);
          setEditingPrompt(p);
          setIsFormOpen(true);
        }}
        onToggleFavorite={handleToggleFavorite}
        onIncrementCopy={handleIncrementCopy}
        onPromptUpdated={(updated) => {
          setDetailPrompt(updated);
          setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }}
      />

      <VariableReplacerModal
        prompt={replacerPrompt}
        isOpen={!!replacerPrompt}
        onClose={() => setReplacerPrompt(null)}
        onIncrementCopy={handleIncrementCopy}
      />

      <DeployGuideModal
        isOpen={isDeployGuideOpen}
        onClose={() => setIsDeployGuideOpen(false)}
      />

      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        onRefresh={loadData}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PromptHubApp />
      </ToastProvider>
    </AuthProvider>
  );
}

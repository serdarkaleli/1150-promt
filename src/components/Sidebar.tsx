import React, { useState } from 'react';
import {
  Sparkles,
  Heart,
  Folder,
  Tag as TagIcon,
  Plus,
  Trash2,
  X,
  Layers,
  BarChart,
  Copy,
  BookOpen,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import type { Category, Prompt } from '../types';

interface SidebarProps {
  categories: Category[];
  tags: string[];
  prompts: Prompt[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedTag: string;
  onSelectTag: (tag: string) => void;
  onlyFavorites: boolean;
  onToggleFavorites: () => void;
  onlyFillable: boolean;
  onToggleFillable: () => void;
  onAddCategory: (name: string, color?: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onLoadSamplePack: () => Promise<void>;
  isLoadingPack: boolean;
  isOpen: boolean;
  onClose: () => void;
  onOpenDeployGuide: () => void;
  onOpenExportImport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  categories,
  tags,
  prompts,
  selectedCategory,
  onSelectCategory,
  selectedTag,
  onSelectTag,
  onlyFavorites,
  onToggleFavorites,
  onlyFillable,
  onToggleFillable,
  onAddCategory,
  onDeleteCategory,
  onLoadSamplePack,
  isLoadingPack,
  isOpen,
  onClose,
  onOpenDeployGuide,
  onOpenExportImport,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [catColor, setCatColor] = useState('#8b5cf6');

  // Stats calculation
  const totalPrompts = prompts.length;
  const favoriteCount = prompts.filter((p) => p.is_favorite).length;
  const fillableCount = prompts.filter((p) => /\{[^{}]+?\}|\[[A-Za-z0-9_]{2,}\]/.test(p.content)).length;
  const totalCopies = prompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await onAddCategory(newCatName.trim(), catColor);
    setNewCatName('');
    setIsAddingCat(false);
  };

  const getCategoryCount = (catName: string) => {
    return prompts.filter((p) => p.category === catName).length;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900/90 text-slate-200 p-4 border-r border-slate-800 overflow-y-auto">
      {/* Mobile Header in Drawer */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 lg:hidden">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-400" />
          <span className="font-bold text-sm text-slate-100">Filtreler & Kategoriler</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Menüyü kapat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Nav / Quick Filters */}
      <div className="space-y-1 mb-4">
        <button
          onClick={() => {
            onSelectCategory('Tümü');
            onSelectTag('Tümü');
            if (onlyFavorites) onToggleFavorites();
            if (onlyFillable) onToggleFillable();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            selectedCategory === 'Tümü' && selectedTag === 'Tümü' && !onlyFavorites && !onlyFillable
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-violet-300" />
            <span>Tüm Promptlar</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950/60 font-mono text-slate-300">
            {totalPrompts}
          </span>
        </button>

        {/* Sadece Doldurulabilir Formlar Filter */}
        <button
          onClick={onToggleFillable}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            onlyFillable
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal
              className={`w-4 h-4 ${onlyFillable ? 'text-slate-950 font-bold' : 'text-amber-400'}`}
            />
            <span>Doldurulabilir Formlar</span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono ${
              onlyFillable ? 'bg-slate-900/30 text-slate-950 font-bold' : 'bg-slate-950/60 text-slate-300'
            }`}
          >
            {fillableCount}
          </span>
        </button>

        {/* Favorilerim */}
        <button
          onClick={onToggleFavorites}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            onlyFavorites
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Heart
              className={`w-4 h-4 ${onlyFavorites ? 'fill-current text-white' : 'text-rose-400'}`}
            />
            <span>Favorilerim</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950/60 font-mono text-slate-300">
            {favoriteCount}
          </span>
        </button>
      </div>

      {/* Sample Pack 1-Click Loader Button */}
      <div className="mb-5">
        <button
          onClick={onLoadSamplePack}
          disabled={isLoadingPack}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-900/40 via-violet-900/40 to-slate-900 border border-violet-500/30 hover:border-violet-400/50 text-violet-200 hover:text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
          title="Kapsamlı depodan 1000+ hazır master prompt paketini kütüphanenize aktarır"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>{isLoadingPack ? 'Paket Aktarılıyor...' : '🚀 1000+ Hazır Prompt Paketini Yükle'}</span>
        </button>
      </div>

      {/* Categories Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-slate-400" />
            Kategoriler
          </span>
          <button
            onClick={() => setIsAddingCat(!isAddingCat)}
            className="p-1 rounded text-slate-400 hover:text-violet-300 hover:bg-slate-800 transition-colors"
            title="Yeni Kategori Ekle"
            aria-label="Yeni Kategori Ekle"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {isAddingCat && (
          <form onSubmit={handleCreateCategory} className="p-2 mb-2 bg-slate-950/80 rounded-xl border border-slate-700/60 space-y-2">
            <input
              type="text"
              placeholder="Kategori Adı..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'].map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCatColor(c)}
                    className={`w-4 h-4 rounded-full transition-transform ${catColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-80'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsAddingCat(false)}
                  className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-0.5 text-[11px] bg-violet-600 hover:bg-violet-500 text-white rounded font-medium"
                >
                  Ekle
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-0.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            const count = getCategoryCount(cat.name);
            return (
              <div
                key={cat.id}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-violet-600/20 text-violet-200 border border-violet-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
                onClick={() => onSelectCategory(isSelected ? 'Tümü' : cat.name)}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color || '#8b5cf6' }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">
                    {count}
                  </span>
                  {cat.user_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCategory(cat.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-400 transition-opacity"
                      title="Kategoriyi Sil"
                      aria-label={`${cat.name} kategorisini sil`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tags Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
            <TagIcon className="w-3.5 h-3.5 text-slate-400" />
            Etiketler
          </span>
          {selectedTag !== 'Tümü' && (
            <button
              onClick={() => onSelectTag('Tümü')}
              className="text-[11px] text-violet-400 hover:text-violet-300"
            >
              Temizle
            </button>
          )}
        </div>

        {tags.length === 0 ? (
          <p className="px-2 text-xs text-slate-400 italic">Henüz etiket bulunmuyor.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 px-1">
            {tags.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => onSelectTag(isSelected ? 'Tümü' : tag)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-violet-600 border-violet-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Extra Links */}
      <div className="lg:hidden mt-auto pt-4 border-t border-slate-800 space-y-2 mb-4">
        <button
          onClick={onOpenDeployGuide}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 rounded-xl"
        >
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>Supabase & Vercel Rehberi</span>
        </button>
        <button
          onClick={onOpenExportImport}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 rounded-xl"
        >
          <ArrowUpDown className="w-4 h-4 text-amber-400" />
          <span>Yedekleme & İçe/Dışa Aktar</span>
        </button>
      </div>

      {/* Stats Footnote */}
      <div className="mt-auto pt-4 border-t border-slate-800/80 px-2 text-slate-400 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1.5">
            <BarChart className="w-3.5 h-3.5 text-indigo-400" />
            Toplam Prompt:
          </span>
          <span className="font-mono font-semibold text-slate-200">{totalPrompts}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            Kopyalama Sayısı:
          </span>
          <span className="font-mono font-semibold text-slate-200">{totalCopies}</span>
        </div>

        <button
          onClick={onOpenExportImport}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/80 transition-colors shadow-xs"
        >
          <BarChart className="w-3.5 h-3.5 text-violet-400" />
          <span>İstatistikler & Yedekleme</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 h-[calc(100vh-4rem)] sticky top-16">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

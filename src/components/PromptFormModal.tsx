import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Save,
  FolderPlus,
  Heart,
  SlidersHorizontal,
} from 'lucide-react';
import type { Prompt, Category, PromptCreateInput } from '../types';
import { extractTemplateVariables, estimateStats, sanitizeTags } from '../utils/prompt-utils';

interface PromptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PromptCreateInput) => Promise<void>;
  initialData?: Prompt | null;
  categories: Category[];
  existingTags: string[];
  onAddCategory: (name: string) => Promise<void>;
}

export const PromptFormModal: React.FC<PromptFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  existingTags,
  onAddCategory,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Yazılım & Kodlama');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setContent(initialData.content);
      setCategory(initialData.category || 'Yazılım & Kodlama');
      setTags(initialData.tags || []);
      setIsFavorite(initialData.is_favorite || false);
    } else {
      setTitle('');
      setDescription('');
      setContent('');
      setCategory(categories[0]?.name || 'Yazılım & Kodlama');
      setTags([]);
      setIsFavorite(false);
    }
    setTagInput('');
    setError('');
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const variables = extractTemplateVariables(content);
  const stats = estimateStats(content);

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^#+/, '').toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleCreateNewCategory = async () => {
    if (!newCatName.trim()) return;
    await onAddCategory(newCatName.trim());
    setCategory(newCatName.trim());
    setNewCatName('');
    setShowNewCatInput(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Lütfen bir başlık girin.');
      return;
    }
    if (!content.trim()) {
      setError('Lütfen prompt içeriğini doldurun.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        category,
        tags: sanitizeTags(tags),
        is_favorite: isFavorite,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında bir hata meydana geldi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              {initialData ? 'Promptu Düzenle' : 'Yeni Master Prompt Oluştur'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Formu kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Prompt Başlığı <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Kıdemli Full-Stack Mimar Promptu"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Category & Favorite row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">Kategori</label>
                <button
                  type="button"
                  onClick={() => setShowNewCatInput(!showNewCatInput)}
                  className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>+ Yeni Kategori</span>
                </button>
              </div>

              {showNewCatInput ? (
                <div className="flex items-center gap-1.5 mb-2">
                  <input
                    type="text"
                    placeholder="Yeni kategori adı..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Ekle
                  </button>
                </div>
              ) : null}

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kısa Açıklama / Kullanım Amacı
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Örn: Kod incelemeleri ve mimari kararlar için"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Prompt Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Master Prompt İçeriği <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span>{stats.words} kelime</span>
                <span>•</span>
                <span className="text-violet-400 font-semibold">~{stats.estTokens} token</span>
              </div>
            </div>

            <textarea
              required
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Prompt içeriğinizi buraya yazın veya yapıştırın. Değişken şablonları için {{degisken_adi}} sözdizimini kullanabilirsiniz (örn: {{proje_adi}}, {{hedef_kitle}})..."
              className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed resize-y"
            />

            {/* Variable detection indicator */}
            {variables.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-300/90 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Algılanan Değişkenler: {variables.map((v) => `{{${v}}}`).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Etiketler (Virgül veya Enter ile ekleyin)
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Örn: mimari, typescript, seo..."
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={() => handleAddTag(tagInput)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
              >
                Ekle
              </button>
            </div>

            {/* Selected Tags Chips */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-violet-600/20 text-violet-300 border border-violet-500/30"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-400"
                      aria-label={`${t} etiketini sil`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Existing Tag Suggestions */}
            {existingTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                <span className="text-[10px] uppercase">Önerilenler:</span>
                {existingTags.slice(0, 8).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => handleAddTag(t)}
                    className="hover:text-violet-300 underline"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Favorite Toggle */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isFavorite
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current text-rose-400' : ''}`} />
              <span>{isFavorite ? 'Favorilere Eklendi' : 'Favorilere Ekle'}</span>
            </button>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

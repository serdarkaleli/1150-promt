import React, { useState } from 'react';
import {
  Heart,
  Copy,
  Check,
  Edit3,
  Trash2,
  SlidersHorizontal,
  Maximize2,
  Clock,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Prompt, Category } from '../types';
import { extractTemplateVariables, estimateStats } from '../utils/prompt-utils';
import { useToast } from './Toast';

interface PromptCardProps {
  prompt: Prompt;
  categories: Category[];
  onToggleFavorite: (id: string) => Promise<void>;
  onIncrementCopy: (id: string) => Promise<void>;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (prompt: Prompt) => void;
  onOpenReplacer: (prompt: Prompt) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  categories,
  onToggleFavorite,
  onIncrementCopy,
  onEdit,
  onDelete,
  onOpenDetail,
  onOpenReplacer,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const variables = extractTemplateVariables(prompt.content);
  const stats = estimateStats(prompt.content);
  const categoryObj = categories.find((c) => c.name === prompt.category);
  const categoryColor = categoryObj?.color || '#8b5cf6';

  const handleCopyDirect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopied(true);
      showToast('Prompt panoya kopyalandı!', 'success');
      onIncrementCopy(prompt.id);

      // Trigger a light confetti burst
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.8 },
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Kopyalama başarısız oldu.', 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onClick={() => onOpenDetail(prompt)}
      className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-violet-950/20 cursor-pointer relative"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Badge */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{
                backgroundColor: `${categoryColor}15`,
                color: categoryColor,
                border: `1px solid ${categoryColor}30`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: categoryColor }}
              />
              {prompt.category}
            </span>

            {/* Template Variables Badge */}
            {variables.length > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReplacer(prompt);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                title={`${variables.length} adet doldurulabilir değişken`}
              >
                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                <span>{variables.length} Doldurulabilir Alan</span>
              </span>
            )}
          </div>

          {/* Action icons: Favorite, Edit, Delete */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onToggleFavorite(prompt.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                prompt.is_favorite
                  ? 'text-rose-500 hover:text-rose-400 bg-rose-500/10'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
              }`}
              title={prompt.is_favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              aria-label={prompt.is_favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            >
              <Heart className={`w-4 h-4 ${prompt.is_favorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => onEdit(prompt)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-slate-800 transition-colors"
              title="Promptu Düzenle"
              aria-label="Promptu Düzenle"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            {isDeleting ? (
              <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-lg border border-rose-800/60">
                <button
                  onClick={() => onDelete(prompt.id)}
                  className="px-2 py-0.5 text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-bold rounded"
                  aria-label="Silmeyi onayla"
                >
                  Sil
                </button>
                <button
                  onClick={() => setIsDeleting(false)}
                  className="px-1.5 py-0.5 text-[11px] text-slate-300 hover:text-white"
                  aria-label="İptal et"
                >
                  Vazgeç
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsDeleting(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Promptu Sil"
                aria-label="Promptu Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-violet-200 transition-colors line-clamp-2 mb-1.5">
          {prompt.title}
        </h3>

        {/* Description */}
        {prompt.description && (
          <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-3">
            {prompt.description}
          </p>
        )}

        {/* Content Snippet / Code block */}
        <div className="relative my-3 bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 font-mono text-xs text-slate-300 overflow-hidden max-h-32 group/content">
          <pre className="whitespace-pre-wrap break-words leading-relaxed">
            {prompt.content.slice(0, 220)}
            {prompt.content.length > 220 && '...'}
          </pre>
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
        </div>

        {/* Tags */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {prompt.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-300 border border-slate-700/50"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-[11px]" title="Tahmini Token Sayısı">
            <Sparkles className="w-3 h-3 text-violet-400" />
            ~{stats.estTokens} tok
          </span>
          <span className="flex items-center gap-1 text-[11px]" title="Kopyalama Sayısı">
            <Copy className="w-3 h-3 text-slate-400" />
            {prompt.copy_count || 0}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400" title="Son Güncellenme">
            <Clock className="w-3 h-3" />
            {formatDate(prompt.updated_at || prompt.created_at)}
          </span>
        </div>

        {/* Quick Copy Buttons */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {variables.length > 0 && (
            <button
              onClick={() => onOpenReplacer(prompt)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
              title="Sadece doldurulabilir form ile aç ve kopyala"
              aria-label="Sadece doldurulabilir form ile aç ve kopyala"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Formu Doldur</span>
            </button>
          )}

          <button
            onClick={handleCopyDirect}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              copied
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm shadow-violet-600/20'
            }`}
            aria-label="Promptu kopyala"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Kopyala</span>
              </>
            )}
          </button>

          <button
            onClick={() => onOpenDetail(prompt)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Tam Boyut Görüntüle"
            aria-label="Tam Boyut Görüntüle"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

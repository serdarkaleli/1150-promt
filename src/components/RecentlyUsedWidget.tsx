import React, { useState } from 'react';
import {
  Clock,
  Copy,
  Check,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Flame,
  Heart,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Prompt, Category } from '../types';
import { hasFillableVariables } from '../utils/prompt-utils';
import { useToast } from './Toast';

interface RecentlyUsedWidgetProps {
  recentPrompts: Prompt[];
  categories: Category[];
  onOpenDetail: (prompt: Prompt) => void;
  onOpenReplacer: (prompt: Prompt) => void;
  onIncrementCopy: (id: string) => Promise<void>;
  onToggleFavorite?: (id: string) => Promise<void>;
}

export const RecentlyUsedWidget: React.FC<RecentlyUsedWidgetProps> = ({
  recentPrompts,
  categories,
  onOpenDetail,
  onOpenReplacer,
  onIncrementCopy,
  onToggleFavorite,
}) => {
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!recentPrompts || recentPrompts.length === 0) {
    return null;
  }

  const handleCopy = async (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      showToast(`"${prompt.title}" panoya kopyalandı!`, 'success');
      onIncrementCopy(prompt.id);

      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.8 },
      });

      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Kopyalama başarısız oldu.', 'error');
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Son kullanılan';
    try {
      const now = new Date().getTime();
      const past = new Date(dateStr).getTime();
      const diffMs = now - past;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'Az önce kopyalandı';
      if (diffMinutes < 60) return `${diffMinutes} dk önce`;
      if (diffHours < 24) return `${diffHours} saat önce`;
      if (diffDays === 1) return 'Dün';
      return `${diffDays} gün önce`;
    } catch {
      return 'Son kullanılan';
    }
  };

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800/90 shadow-xl overflow-hidden backdrop-blur-md transition-all">
      {/* Widget Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>Son Kullanılanlar</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30">
                {recentPrompts.length} Prompt
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              En son kopyalanan promptlara hızlı erişim ve tek tıkla kopyalama
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Genişlet' : 'Daralt'}
          aria-label={isCollapsed ? 'Son Kullanılanları Genişlet' : 'Son Kullanılanları Daralt'}
        >
          <span className="text-[11px] font-medium hidden xs:inline">
            {isCollapsed ? 'Göster' : 'Gizle'}
          </span>
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Widget Body */}
      {!isCollapsed && (
        <div className="p-3.5 sm:p-4.5 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5">
            {recentPrompts.map((prompt, idx) => {
              const categoryObj = categories.find((c) => c.name === prompt.category);
              const categoryColor = categoryObj?.color || '#8b5cf6';
              const isFillable = hasFillableVariables(prompt.content);
              const isCopied = copiedId === prompt.id;

              return (
                <div
                  key={prompt.id}
                  onClick={() => onOpenDetail(prompt)}
                  className="group relative p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-violet-500/40 hover:bg-slate-900/80 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md"
                >
                  {/* Top line with Category & Timestamp */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold truncate max-w-[150px]"
                        style={{
                          backgroundColor: `${categoryColor}18`,
                          color: categoryColor,
                          border: `1px solid ${categoryColor}35`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: categoryColor }}
                        />
                        <span className="truncate">{prompt.category}</span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {prompt.is_favorite && (
                          <Heart className="w-3 h-3 text-rose-400 fill-rose-500" />
                        )}
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatRelativeTime(prompt.last_copied_at || prompt.updated_at)}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4
                      className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-violet-300 transition-colors line-clamp-2 leading-snug"
                      title={prompt.title}
                    >
                      {prompt.title}
                    </h4>

                    {/* Excerpt */}
                    {prompt.description ? (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {prompt.description}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 font-mono line-clamp-2 leading-relaxed">
                        {prompt.content.slice(0, 100)}...
                      </p>
                    )}
                  </div>

                  {/* Bottom Row Actions */}
                  <div className="pt-3 mt-3 border-t border-slate-900 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>{prompt.copy_count || 0} kopya</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isFillable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReplacer(prompt);
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/25 transition-colors flex items-center gap-1"
                          title="Şablon Değişkenlerini Doldur"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                          <span>Form</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, prompt)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 shadow-xs ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20'
                        }`}
                        title="Metni Kopyala"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-200" />
                            <span>Kopyalandı</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-violet-200" />
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

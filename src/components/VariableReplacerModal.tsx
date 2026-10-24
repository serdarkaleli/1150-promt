import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  FileText,
  ListFilter,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Prompt } from '../types';
import {
  extractTemplateVariables,
  fillPromptTemplate,
  formatVariableLabel,
  estimateStats,
} from '../utils/prompt-utils';
import { useToast } from './Toast';

interface VariableReplacerModalProps {
  prompt: Prompt | null;
  isOpen: boolean;
  onClose: () => void;
  onIncrementCopy: (id: string) => Promise<void>;
}

export const VariableReplacerModal: React.FC<VariableReplacerModalProps> = ({
  prompt,
  isOpen,
  onClose,
  onIncrementCopy,
}) => {
  const { showToast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [copiedType, setCopiedType] = useState<'prompt' | 'values' | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

  const variables = useMemo(() => {
    return prompt ? extractTemplateVariables(prompt.content) : [];
  }, [prompt?.content]);

  // Reset when prompt changes
  useEffect(() => {
    setValues({});
    setCopiedType(null);
    setShowLivePreview(false);
  }, [prompt?.id]);

  const previewContent = useMemo(() => {
    if (!prompt) return '';
    return fillPromptTemplate(prompt.content, values);
  }, [prompt?.content, values]);

  const stats = useMemo(() => {
    return estimateStats(previewContent);
  }, [previewContent]);

  const filledCount = useMemo(() => {
    return Object.values(values).filter((v) => v && v.trim().length > 0).length;
  }, [values]);

  if (!isOpen || !prompt) return null;

  // Copy full filled prompt
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(previewContent);
      setCopiedType('prompt');
      showToast('Doldurulmuş tam prompt panoya kopyalandı!', 'success');
      onIncrementCopy(prompt.id);

      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.7 },
      });

      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      showToast('Kopyalama başarısız oldu.', 'error');
    }
  };

  // Copy only the filled values (clean parameters list)
  const handleCopyValuesOnly = async () => {
    try {
      const lines = variables.map((v) => {
        const label = formatVariableLabel(v);
        const val = values[v]?.trim() || '(Boş bırakıldı)';
        return `• ${label} (${v}): ${val}`;
      });

      const textToCopy = `[${prompt.title} - Doldurulan Değerler]\n\n${lines.join('\n')}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedType('values');
      showToast('Sadece doldurulan değerler panoya kopyalandı!', 'info');
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      showToast('Kopyalama başarısız oldu.', 'error');
    }
  };

  // Check if variable is long text like document, code, text_to_summarize
  const isMultilineVariable = (varName: string) => {
    const lower = varName.toLowerCase();
    return (
      lower.includes('text') ||
      lower.includes('document') ||
      lower.includes('code') ||
      lower.includes('snippet') ||
      lower.includes('content') ||
      lower.includes('aciklama') ||
      lower.includes('metin') ||
      lower.includes('error') ||
      lower.includes('tarifi')
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  Sadece Doldurulabilir Form Modu
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Hızlı Doldur
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-sm sm:max-w-md">
                {prompt.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Şablon penceresini kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-slate-950 px-5 py-2.5 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Doldurulan Alanlar:</span>
            <span className="font-semibold text-slate-200">
              {filledCount} / {variables.length}
            </span>
          </div>
          <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300"
              style={{
                width: `${variables.length > 0 ? (filledCount / variables.length) * 100 : 0}%`,
              }}
            />
          </div>
          {filledCount > 0 && (
            <button
              onClick={() => setValues({})}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Temizle</span>
            </button>
          )}
        </div>

        {/* Form Body - Only the fillable fields! */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 gap-4">
            {variables.map((v) => {
              const label = formatVariableLabel(v);
              const isMulti = isMultilineVariable(v);
              return (
                <div
                  key={v}
                  className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1.5 focus-within:border-amber-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <span>{label}</span>
                    </label>
                    <span className="text-[11px] font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      {`{${v}}`}
                    </span>
                  </div>

                  {isMulti ? (
                    <textarea
                      rows={3}
                      placeholder={`Lütfen ${label.toLowerCase()} girin...`}
                      value={values[v] || ''}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [v]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 leading-relaxed resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={`Lütfen ${label.toLowerCase()} girin...`}
                      value={values[v] || ''}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [v]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Optional Collapsible Live Preview */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowLivePreview(!showLivePreview)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              {showLivePreview ? <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
              <span>
                {showLivePreview ? 'Canlı Prompt Önizlemesini Gizle' : 'Oluşacak Prompt Önizlemesini Göster (İsteğe Bağlı)'}
              </span>
            </button>

            {showLivePreview && (
              <div className="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto max-h-48 overflow-y-auto leading-relaxed">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                  <span>Önizleme Metni</span>
                  <span className="flex items-center gap-1 text-violet-400">
                    <Sparkles className="w-3 h-3" />
                    ~{stats.estTokens} token
                  </span>
                </div>
                <pre className="whitespace-pre-wrap break-words">{previewContent}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyValuesOnly}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors"
            title="Sadece doldurduğunuz parametreleri kopyalar"
          >
            {copiedType === 'values' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Değerler Kopyalandı!</span>
              </>
            ) : (
              <>
                <ListFilter className="w-3.5 h-3.5 text-amber-400" />
                <span>Sadece Değerleri Kopyala</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Kapat
            </button>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {copiedType === 'prompt' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-950 font-bold" />
                  <span>Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Doldurulmuş Promptu Kopyala</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

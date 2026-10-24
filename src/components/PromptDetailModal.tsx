import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Heart,
  Edit3,
  Clock,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  FileText,
  Eye,
  EyeOff,
  History,
  Undo2,
  ArrowLeftRight,
  Save,
  CheckCircle2,
  AlertCircle,
  FileClock,
  Tag as TagIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Prompt, Category, PromptVersion } from '../types';
import {
  extractTemplateVariables,
  fillPromptTemplate,
  formatVariableLabel,
  estimateStats,
} from '../utils/prompt-utils';
import { api } from '../services/api';
import { useToast } from './Toast';

interface PromptDetailModalProps {
  prompt: Prompt | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (prompt: Prompt) => void;
  onToggleFavorite: (id: string) => Promise<void>;
  onIncrementCopy: (id: string) => Promise<void>;
  onPromptUpdated?: (prompt: Prompt) => void;
}

export const PromptDetailModal: React.FC<PromptDetailModalProps> = ({
  prompt,
  categories,
  isOpen,
  onClose,
  onEdit,
  onToggleFavorite,
  onIncrementCopy,
  onPromptUpdated,
}) => {
  const { showToast } = useToast();

  // Modal Main Tab: 'detail' | 'history'
  const [activeMainTab, setActiveMainTab] = useState<'detail' | 'history'>('detail');

  // Detail Tab states
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [copiedType, setCopiedType] = useState<'filled' | 'original' | 'values' | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'form'>('full');
  const [showLivePreviewInForm, setShowLivePreviewInForm] = useState(false);

  // History Tab states
  const [previewingVersion, setPreviewingVersion] = useState<number | null>(null);
  const [comparingVersion, setComparingVersion] = useState<number | null>(null);
  const [revertConfirmVersion, setRevertConfirmVersion] = useState<PromptVersion | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [copiedHistoryVersion, setCopiedHistoryVersion] = useState<number | null>(null);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  const variables = useMemo(() => {
    return prompt ? extractTemplateVariables(prompt.content) : [];
  }, [prompt?.content]);

  useEffect(() => {
    setVariableValues({});
    setCopiedType(null);
    setPreviewingVersion(null);
    setComparingVersion(null);
    setRevertConfirmVersion(null);
    if (variables.length > 0) {
      setViewMode('full');
    }
  }, [prompt?.id]);

  const filledContent = useMemo(() => {
    if (!prompt) return '';
    return fillPromptTemplate(prompt.content, variableValues);
  }, [prompt?.content, variableValues]);

  const stats = useMemo(() => {
    return estimateStats(filledContent || prompt?.content || '');
  }, [filledContent, prompt?.content]);

  const filledCount = useMemo(() => {
    return Object.values(variableValues).filter((v) => v && v.trim().length > 0).length;
  }, [variableValues]);

  if (!isOpen || !prompt) return null;

  const categoryObj = categories.find((c) => c.name === prompt.category);
  const categoryColor = categoryObj?.color || '#8b5cf6';
  const historyList = prompt.history || [];
  const currentVersionNumber = historyList.length + 1;

  const handleCopy = async (text: string, type: 'filled' | 'original') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      showToast('Prompt panoya kopyalandı!', 'success');
      onIncrementCopy(prompt.id);

      confetti({
        particleCount: 30,
        spread: 45,
        origin: { y: 0.7 },
      });

      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      showToast('Kopyalama başarısız oldu.', 'error');
    }
  };

  const handleCopyValuesOnly = async () => {
    try {
      const lines = variables.map((v) => {
        const label = formatVariableLabel(v);
        const val = variableValues[v]?.trim() || '(Boş bırakıldı)';
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

  const handleCopyVersionContent = async (version: PromptVersion) => {
    try {
      await navigator.clipboard.writeText(version.content);
      setCopiedHistoryVersion(version.version);
      showToast(`Sürüm ${version.version} içeriği kopyalandı!`, 'success');
      setTimeout(() => setCopiedHistoryVersion(null), 2000);
    } catch {
      showToast('Kopyalama başarısız oldu.', 'error');
    }
  };

  const handleRevert = async (targetVersion: PromptVersion) => {
    try {
      setIsReverting(true);
      const res = await api.revertPrompt(prompt.id, targetVersion.version);
      showToast(res.message, 'success');

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
      });

      if (onPromptUpdated) {
        onPromptUpdated(res.prompt);
      }
      setRevertConfirmVersion(null);
      setPreviewingVersion(null);
      setComparingVersion(null);
    } catch (err: any) {
      showToast(err.message || 'Sürüme geri dönülemedi.', 'error');
    } finally {
      setIsReverting(false);
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      setIsCreatingSnapshot(true);
      const res = await api.createSnapshot(prompt.id, 'Manuel Sürüm Noktası');
      showToast('Mevcut sürüm noktası geçmişe başarıyla kaydedildi!', 'success');
      if (onPromptUpdated) {
        onPromptUpdated(res.prompt);
      }
    } catch (err: any) {
      showToast(err.message || 'Sürüm noktası oluşturulamadı.', 'error');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleResetVariables = () => {
    setVariableValues({});
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('tr-TR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
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
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
                style={{
                  backgroundColor: `${categoryColor}20`,
                  color: categoryColor,
                  border: `1px solid ${categoryColor}40`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: categoryColor }}
                />
                {prompt.category}
              </span>

              {variables.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <SlidersHorizontal className="w-3 h-3" />
                  {variables.length} Doldurulabilir Alan
                </span>
              )}

              {prompt.is_favorite && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  <Heart className="w-3 h-3 fill-current text-rose-400" />
                  Favori
                </span>
              )}

              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(prompt.updated_at || prompt.created_at)}
              </span>

              {historyList.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  <FileClock className="w-3 h-3" />
                  v{currentVersionNumber}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-100 truncate">
              {prompt.title}
            </h2>

            {prompt.description && (
              <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed">
                {prompt.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onToggleFavorite(prompt.id)}
              className={`p-2 rounded-xl transition-colors ${
                prompt.is_favorite
                  ? 'text-rose-400 bg-rose-500/10'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
              }`}
              title="Favori Durumunu Değiştir"
              aria-label="Favori Durumunu Değiştir"
            >
              <Heart className={`w-5 h-5 ${prompt.is_favorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => {
                onClose();
                onEdit(prompt);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-violet-400 hover:bg-slate-800 transition-colors"
              title="Düzenle"
              aria-label="Düzenle"
            >
              <Edit3 className="w-5 h-5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Kapat"
              aria-label="Detay penceresini kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Main Tabs: Prompt Detayı vs Sürüm Geçmişi */}
        <div className="flex items-center border-b border-slate-800 px-5 bg-slate-950/70">
          <button
            type="button"
            onClick={() => setActiveMainTab('detail')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeMainTab === 'detail'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Prompt Detayı & Şablon</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('history')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeMainTab === 'history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Geçmiş & Sürümler</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                historyList.length > 0
                  ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {historyList.length > 0 ? `${historyList.length} Önceki Sürüm` : 'İlk Sürüm (v1)'}
            </span>
          </button>
        </div>

        {/* TAB 1: PROMPT DETAYI & ŞABLON */}
        {activeMainTab === 'detail' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* View Mode Segmented Controls (if prompt has variables) */}
            {variables.length > 0 && (
              <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode('full')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                      viewMode === 'full'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Tam Prompt İncele</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('form')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                      viewMode === 'form'
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Sadece Doldurulabilir Form Modu</span>
                  </button>
                </div>

                {viewMode === 'form' && (
                  <span className="text-xs text-amber-300/90 font-medium">
                    {filledCount} / {variables.length} alan dolduruldu
                  </span>
                )}
              </div>
            )}

            {/* Scrollable Content */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Mode 1: Sadece Doldurulabilir Form Modu */}
              {variables.length > 0 && viewMode === 'form' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-300">
                        Sade Form Görünümü
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Arka plandaki sistem talimatlarını görmeden yalnızca doldurmanız gereken alanları girin ve çıktıyı alın.
                      </p>
                    </div>
                    {filledCount > 0 && (
                      <button
                        onClick={handleResetVariables}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-900 rounded-lg border border-slate-800"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Sıfırla</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3.5">
                    {variables.map((v) => {
                      const label = formatVariableLabel(v);
                      return (
                        <div
                          key={v}
                          className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5 focus-within:border-amber-500/60 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-200">
                              {label}
                            </label>
                            <span className="text-[11px] font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              {`{${v}}`}
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            placeholder={`Lütfen ${label.toLowerCase()} değerini yazın...`}
                            value={variableValues[v] || ''}
                            onChange={(e) =>
                              setVariableValues((prev) => ({
                                ...prev,
                                [v]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 leading-relaxed resize-y"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Optional Preview Toggle in Form Mode */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLivePreviewInForm(!showLivePreviewInForm)}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                      {showLivePreviewInForm ? <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>
                        {showLivePreviewInForm ? 'Prompt Önizlemesini Gizle' : 'Oluşacak Prompt Önizlemesini Göster'}
                      </span>
                    </button>

                    {showLivePreviewInForm && (
                      <div className="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto max-h-48 overflow-y-auto leading-relaxed">
                        <pre className="whitespace-pre-wrap break-words">{filledContent}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Mode 2: Tam Prompt İncele (Default view with collapsible variable inputs) */
                <>
                  {/* Dynamic Variables Quick Customizer */}
                  {variables.length > 0 && (
                    <div className="p-4 bg-slate-950/70 border border-amber-500/30 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs sm:text-sm">
                          <SlidersHorizontal className="w-4 h-4" />
                          <span>Şablon Değişkenlerini Canlı Doldur ({variables.length} adet)</span>
                        </div>
                        {filledCount > 0 && (
                          <button
                            onClick={handleResetVariables}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Sıfırla</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {variables.map((v) => (
                          <div key={v} className="space-y-1">
                            <label className="text-[11px] font-mono text-amber-200/90 block truncate">
                              {formatVariableLabel(v)} <span className="opacity-60 font-mono">{`{${v}}`}</span>
                            </label>
                            <input
                              type="text"
                              placeholder={`${formatVariableLabel(v)} için değer...`}
                              value={variableValues[v] || ''}
                              onChange={(e) =>
                                setVariableValues((prev) => ({
                                  ...prev,
                                  [v]: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prompt Full Text Area */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {variables.length > 0 && filledCount > 0
                          ? 'Doldurulmuş Canlı Prompt İçeriği'
                          : 'Master Prompt İçeriği'}
                      </span>
                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                        <span>{stats.words} kelime</span>
                        <span>•</span>
                        <span>{stats.chars} karakter</span>
                        <span>•</span>
                        <span className="text-violet-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          ~{stats.estTokens} token
                        </span>
                      </div>
                    </div>

                    <div className="relative bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto leading-relaxed shadow-inner">
                      <pre className="whitespace-pre-wrap break-words">{filledContent}</pre>
                    </div>
                  </div>
                </>
              )}

              {/* Tags */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  <span className="text-xs text-slate-400 mr-1">Etiketler:</span>
                  {prompt.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>
                  Toplam <span className="font-semibold text-slate-200">{prompt.copy_count || 0}</span> kez kopyalandı
                </span>
                {historyList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveMainTab('history')}
                    className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    <span>{historyList.length} önceki sürüm var</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {variables.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyValuesOnly}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                      title="Sadece doldurulan değerleri kopyala"
                    >
                      {copiedType === 'values' ? 'Değerler Kopyalandı!' : 'Sadece Değerleri Kopyala'}
                    </button>
                    <button
                      onClick={() => handleCopy(prompt.content, 'original')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                    >
                      {copiedType === 'original' ? 'Orijinal Kopyalandı!' : 'Ham Şablonu Kopyala'}
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleCopy(filledContent, 'filled')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {copiedType === 'filled' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Tek Tıkla Kopyala</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GEÇMİŞ & SÜRÜMLER */}
        {activeMainTab === 'history' && (
          <div className="flex flex-col flex-1 overflow-hidden p-5 space-y-5 overflow-y-auto">
            {/* History Intro Bar */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span>Sürüm Geçmişi & Değişiklik Günlüğü</span>
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                    Otomatik Arşiv
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Her güncellemede promptun önceki hali otomatik olarak kaydedilir. İstediğiniz zaman eski bir sürüme geri dönebilirsiniz.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateSnapshot}
                disabled={isCreatingSnapshot}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors shrink-0 shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isCreatingSnapshot ? 'Kaydediliyor...' : 'Anlık Sürüm Noktası Al'}</span>
              </button>
            </div>

            {/* Current Active Version Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-2.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black text-emerald-400 font-mono tracking-wide uppercase">
                    Sürüm {currentVersionNumber} • Şu Anki Aktif Sürüm
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {formatDate(prompt.updated_at || prompt.created_at)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{prompt.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Kategori: <span className="text-slate-200 font-medium">{prompt.category}</span>
                    {' • '}
                    <span>{estimateStats(prompt.content).words} kelime</span>
                    {' • '}
                    <span>{estimateStats(prompt.content).chars} karakter</span>
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 self-start sm:self-auto">
                  Yayında / Kullanımda
                </span>
              </div>
            </div>

            {/* Revert Confirmation Dialog Banner */}
            {revertConfirmVersion && (
              <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/60 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-bold text-amber-200">
                      Sürüm {revertConfirmVersion.version} Durumuna Geri Dönülsün mü?
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Prompt başlığı, içeriği, kategorisi ve etiketleri bu sürümdeki haline geri döndürülecektir.
                      Mevcut aktif durumunuz da kaybolmaz; otomatik olarak yeni bir sürüm noktası olarak geçmişe eklenecektir.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-900/40">
                  <button
                    type="button"
                    onClick={() => setRevertConfirmVersion(null)}
                    disabled={isReverting}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevert(revertConfirmVersion)}
                    disabled={isReverting}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>{isReverting ? 'Geri Yükleniyor...' : `Sürüm ${revertConfirmVersion.version}'e Geri Dön`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Previous Versions List */}
            {historyList.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                  <FileClock className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-sm font-bold text-slate-200">
                    Henüz Kayıtlı Eski Sürüm Bulunmuyor
                  </h4>
                  <p className="text-xs text-slate-400">
                    Bu prompt henüz güncellenmedi. Prompt üzerinde düzenleme yaptığınızda veya içerik değiştirdiğinizde, önceki halleri otomatik olarak bu zaman çizelgesinde arşivlenecektir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateSnapshot}
                  disabled={isCreatingSnapshot}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Şu Anki Durumu İlk Sürüm Noktası Olarak Kaydet</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between px-1">
                  <span>Önceki Kayıtlı Sürümler ({historyList.length})</span>
                  <span className="text-[11px] text-slate-400">Yeniden eskiye doğru sıralı</span>
                </div>

                <div className="space-y-3">
                  {historyList.map((ver) => {
                    const isPreviewing = previewingVersion === ver.version;
                    const isComparing = comparingVersion === ver.version;
                    const verStats = estimateStats(ver.content);
                    const currentStats = estimateStats(prompt.content);
                    const wordDiff = verStats.words - currentStats.words;

                    return (
                      <div
                        key={ver.version}
                        className={`rounded-2xl border transition-all ${
                          revertConfirmVersion?.version === ver.version
                            ? 'bg-amber-950/20 border-amber-500/60'
                            : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                        }`}
                      >
                        {/* Version Header Card */}
                        <div className="p-4 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                                Sürüm {ver.version}
                              </span>
                              <span className="text-xs font-semibold text-slate-200">
                                {ver.change_summary || 'Güncelleme kaydedildi'}
                              </span>
                            </div>

                            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {formatDate(ver.timestamp)}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <h5 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                                {ver.title}
                              </h5>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                                <span>Kategori: {ver.category}</span>
                                <span>•</span>
                                <span>{verStats.words} kelime</span>
                                <span>•</span>
                                <span>{verStats.chars} karakter</span>
                                {wordDiff !== 0 && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                      wordDiff > 0
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-rose-500/20 text-rose-300'
                                    }`}
                                  >
                                    {wordDiff > 0 ? `+${wordDiff}` : wordDiff} kelime (şu ankiye göre)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions on this past version */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isPreviewing) {
                                    setPreviewingVersion(null);
                                    setComparingVersion(null);
                                  } else {
                                    setPreviewingVersion(ver.version);
                                    setComparingVersion(null);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1 ${
                                  isPreviewing
                                    ? 'bg-slate-800 text-white border-slate-600'
                                    : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                {isPreviewing ? <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
                                <span>{isPreviewing ? 'Gizle' : 'İncele'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyVersionContent(ver)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1"
                                title="Bu sürümün metnini panoya kopyala"
                              >
                                {copiedHistoryVersion === ver.version ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
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
                                type="button"
                                onClick={() => setRevertConfirmVersion(ver)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                                <span>Geri Dön</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Content Preview / Diff Comparison */}
                        {isPreviewing && (
                          <div className="p-4 border-t border-slate-800/80 bg-slate-950/95 space-y-3 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Sürüm {ver.version} İçerik Görünümü</span>
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setComparingVersion(isComparing ? null : ver.version)}
                                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                                    isComparing
                                      ? 'bg-violet-600 text-white'
                                      : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                                  }`}
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                  <span>{isComparing ? 'Tekli Önizleme' : 'Mevcut İle Yan Yana Kıyasla'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Single Preview or Side-by-Side Comparison */}
                            {isComparing ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                {/* Left: Past version */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300 px-1">
                                    <span>Eski Sürüm (Sürüm {ver.version})</span>
                                    <span>{verStats.words} kelime</span>
                                  </div>
                                  <div className="p-3 bg-slate-900/90 rounded-xl border border-indigo-500/30 font-mono text-xs text-slate-200 overflow-x-auto max-h-64 overflow-y-auto leading-relaxed">
                                    <pre className="whitespace-pre-wrap break-words">{ver.content}</pre>
                                  </div>
                                </div>

                                {/* Right: Current active version */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300 px-1">
                                    <span>Şu Anki Aktif Sürüm (v{currentVersionNumber})</span>
                                    <span>{currentStats.words} kelime</span>
                                  </div>
                                  <div className="p-3 bg-slate-900/90 rounded-xl border border-emerald-500/30 font-mono text-xs text-slate-200 overflow-x-auto max-h-64 overflow-y-auto leading-relaxed">
                                    <pre className="whitespace-pre-wrap break-words">{prompt.content}</pre>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto max-h-64 overflow-y-auto leading-relaxed shadow-inner">
                                <pre className="whitespace-pre-wrap break-words">{ver.content}</pre>
                              </div>
                            )}

                            {/* Description and tags of this past version if different */}
                            {ver.description && ver.description !== prompt.description && (
                              <div className="p-2.5 bg-slate-900/60 rounded-lg text-xs text-slate-300 border border-slate-800">
                                <span className="font-semibold text-slate-400 block mb-0.5">Açıklama (Eski Sürüm):</span>
                                <p>{ver.description}</p>
                              </div>
                            )}

                            {ver.tags && ver.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[11px] text-slate-400">Bu sürümdeki etiketler:</span>
                                {ver.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

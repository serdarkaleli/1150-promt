import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  Upload,
  ArrowUpDown,
  FileText,
  BarChart3,
  PieChart,
  Tags,
  FolderTree,
  Sparkles,
  Copy,
  SlidersHorizontal,
  Flame,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Award,
  Calendar,
  Heart,
  Folder,
  Tag as TagIcon,
  Star,
  Layers,
  MousePointerClick,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { useToast } from './Toast';
import type { LibraryStats, TopPromptStat } from '../types';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

// Custom Tooltip for Top 5 Performance Bar Chart
const CustomPerformanceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data: TopPromptStat = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700/90 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 max-w-xs z-50">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
          <span className="font-bold text-violet-400 font-mono flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            #{data.rank} En Çok Kopyalanan
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            {data.category}
          </span>
        </div>
        <p className="font-semibold text-slate-100 line-clamp-2">{data.title}</p>
        <div className="flex items-center justify-between text-slate-300 pt-1">
          <span className="text-slate-400">Kopyalanma Hacmi:</span>
          <span className="font-mono font-bold text-emerald-400 text-sm">
            {data.copy_count} kez
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Zirveye Oranı:</span>
          <span className="font-mono font-semibold text-indigo-300">%{data.percentageOfTop}</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Kütüphane İçi Payı:</span>
          <span className="font-mono font-semibold text-amber-300">%{data.shareOfTotalCopies}</span>
        </div>
        {data.is_favorite && (
          <div className="text-[10px] text-rose-400 flex items-center gap-1 pt-0.5 font-medium">
            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
            <span>Favori Master Prompt</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Trend View
const CustomTrendTooltip = ({ active, payload, label, topPrompts }: any) => {
  if (active && payload && payload.length) {
    const totalDay = payload.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0);
    return (
      <div className="bg-slate-900/95 border border-slate-700/90 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[210px] z-50">
        <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex justify-between items-center">
          <span className="flex items-center gap-1 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-violet-400" />
            {label} Günü Trendi
          </span>
          <span className="text-emerald-400 font-mono font-bold">
            {totalDay} kopyalama
          </span>
        </div>
        <div className="space-y-1 pt-1">
          {payload.map((entry: any, i: number) => {
            const prompt = topPrompts?.[i];
            return (
              <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 truncate text-slate-300 max-w-[140px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="truncate">{prompt?.shortTitle || `#${i + 1} Prompt`}</span>
                </span>
                <span className="font-mono font-bold text-slate-100">{entry.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'stats' | 'transfer'>('stats');

  // Stats state
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Chart mode toggle: 'performance' (top 5 bar + trend line) or 'timeline' (weekly distribution)
  const [chartMode, setChartMode] = useState<'performance' | 'timeline'>('performance');

  // Selected Group Summary State (Category or Tag)
  const [summaryGroupType, setSummaryGroupType] = useState<'category' | 'tag'>('category');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [selectedTagName, setSelectedTagName] = useState<string>('');

  // Filters inside lists
  const [tagSearch, setTagSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  // Import state
  const [jsonInput, setJsonInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Fetch stats whenever modal opens
  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      const data = await api.getStats();
      setStats(data);

      // Initialize selected category and tag if not set
      if (data.categoryDistribution && data.categoryDistribution.length > 0 && !selectedCategoryName) {
        setSelectedCategoryName(data.categoryDistribution[0].name);
      }
      if (data.popularTags && data.popularTags.length > 0 && !selectedTagName) {
        setSelectedTagName(data.popularTags[0].tag);
      }
    } catch (err: any) {
      console.error('Error fetching library stats:', err);
      setStatsError(err.message || 'İstatistikler yüklenemedi.');
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  // Selected Category Object
  const selectedCategoryData = useMemo(() => {
    if (!stats?.categoryDistribution || stats.categoryDistribution.length === 0) return null;
    return (
      stats.categoryDistribution.find((c) => c.name === selectedCategoryName) ||
      stats.categoryDistribution[0]
    );
  }, [stats?.categoryDistribution, selectedCategoryName]);

  // Selected Tag Object
  const selectedTagData = useMemo(() => {
    if (!stats?.popularTags || stats.popularTags.length === 0) return null;
    return (
      stats.popularTags.find((t) => t.tag === selectedTagName) ||
      stats.popularTags[0]
    );
  }, [stats?.popularTags, selectedTagName]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!stats?.categoryDistribution) return [];
    if (!categorySearch.trim()) return stats.categoryDistribution;
    const q = categorySearch.toLowerCase().trim();
    return stats.categoryDistribution.filter((c) =>
      c.name.toLowerCase().includes(q)
    );
  }, [stats?.categoryDistribution, categorySearch]);

  const displayedCategories = useMemo(() => {
    if (showAllCategories || categorySearch.trim()) {
      return filteredCategories;
    }
    return filteredCategories.slice(0, 6);
  }, [filteredCategories, showAllCategories, categorySearch]);

  // Filtered tags
  const filteredTags = useMemo(() => {
    if (!stats?.popularTags) return [];
    if (!tagSearch.trim()) return stats.popularTags;
    const q = tagSearch.toLowerCase().trim();
    return stats.popularTags.filter((t) => t.tag.toLowerCase().includes(q));
  }, [stats?.popularTags, tagSearch]);

  const displayedTags = useMemo(() => {
    if (showAllTags || tagSearch.trim()) {
      return filteredTags;
    }
    return filteredTags.slice(0, 14);
  }, [filteredTags, showAllTags, tagSearch]);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      const data = await api.exportPrompts();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `master-prompts-yedek-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Yedek JSON dosyası başarıyla indirildi!', 'success');
    } catch {
      showToast('Dışa aktarma başarısız oldu.', 'error');
    }
  };

  const handleImport = async () => {
    setImportError('');
    if (!jsonInput.trim()) {
      setImportError('Lütfen içe aktarılacak JSON verisini yapıştırın.');
      return;
    }

    try {
      setIsImporting(true);
      const parsed = JSON.parse(jsonInput);
      const promptList = Array.isArray(parsed) ? parsed : parsed.prompts;

      if (!Array.isArray(promptList) || promptList.length === 0) {
        throw new Error('Geçerli bir prompt dizisi bulunamadı.');
      }

      const res = await api.importPrompts(promptList);
      showToast(res.message, 'success');
      await onRefresh();
      await fetchStats();
      setJsonInput('');
      setActiveTab('stats');
    } catch (err: any) {
      setImportError(err.message || 'JSON formatı geçersiz.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonInput(text);
    };
    reader.readAsText(file);
  };

  const handleLoadSamplePack = async () => {
    try {
      setIsImporting(true);
      const res = await api.loadSamplePack();
      showToast(res.message, 'success');
      await onRefresh();
      await fetchStats();
      setActiveTab('stats');
    } catch {
      showToast('Paket yüklenemedi.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Bar colors palette for top 5 prompts
  const topColors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl sm:max-w-3xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  Kütüphane İstatistikleri & Aktarım
                </h2>
                {stats && (
                  <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {stats.totalPrompts} Prompt
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Kategori ve etiket performanslarını inceleyin, kütüphaneyi yedekleyin veya aktarın
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchStats}
              disabled={isLoadingStats}
              title="İstatistikleri Yenile"
              aria-label="İstatistikleri Yenile"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin text-violet-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Pencereyi Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-800 px-4 sm:px-5 bg-slate-900/60">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'stats'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>İstatistik Paneli & Grafikler</span>
            {stats && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300 font-mono">
                {stats.totalPrompts}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'transfer'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span>Yedekleme & İçe/Dışa Aktar</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: İSTATİSTİK PANELİ & GRAFİKLER */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {isLoadingStats && !stats ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-7 h-7 text-violet-500 animate-spin" />
                  <p className="text-xs text-slate-400">Kütüphane istatistikleri ve grafikler hazırlanıyor...</p>
                </div>
              ) : statsError ? (
                <div className="p-4 bg-rose-950/50 border border-rose-800/80 rounded-xl text-rose-300 text-xs">
                  {statsError}
                </div>
              ) : stats ? (
                <>
                  {/* Top 4 Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Metric 1: Toplam Prompt */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-slate-400">Toplam Prompt</span>
                        <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-tight">
                          {stats.totalPrompts.toLocaleString('tr-TR')}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Kütüphanedeki kayıtlar</p>
                      </div>
                    </div>

                    {/* Metric 2: Kategori Çeşitliliği */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-slate-400">Kategoriler</span>
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                          <FolderTree className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-tight">
                          {stats.totalCategories}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Farklı uzmanlık alanı</p>
                      </div>
                    </div>

                    {/* Metric 3: Aktif Etiketler */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-slate-400">Popüler Etiket</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Tags className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-tight">
                          {stats.popularTags.length}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Benzersiz konu etiketi</p>
                      </div>
                    </div>

                    {/* Metric 4: Form & Kullanım */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-slate-400">Kopyalama & Form</span>
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <Copy className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-tight">
                          {stats.totalCopies.toLocaleString('tr-TR')}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {stats.fillableCount} form · {stats.favoriteCount} favori
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* RECHARTS ÇUBUK GRAFİK & KOPYALAMA TRENDİ BÖLÜMÜ */}
                  {/* ======================================================== */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600/30 to-indigo-600/30 border border-violet-500/40 flex items-center justify-center text-violet-400 shadow-sm">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-100">
                              En Çok Kullanılan 5 Prompt & Kopyalama Trendi
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                              Recharts Analitiği
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            En yüksek kopyalanma hacmine sahip ilk 5 promptun performans ve trend dağılımı
                          </p>
                        </div>
                      </div>

                      {/* Chart Mode Toggle */}
                      <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setChartMode('performance')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            chartMode === 'performance'
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Hacim & Sıralama</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartMode('timeline')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            chartMode === 'timeline'
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Haftalık Trend</span>
                        </button>
                      </div>
                    </div>

                    {/* Chart Container */}
                    {!stats.topPrompts || stats.topPrompts.length === 0 ? (
                      <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs italic bg-slate-900/40 rounded-xl border border-slate-800/80">
                        Henüz kopyalanmış prompt kaydı bulunmuyor.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="h-64 sm:h-72 w-full pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            {chartMode === 'performance' ? (
                              <ComposedChart
                                data={stats.topPrompts}
                                margin={{ top: 15, right: 15, left: -15, bottom: 25 }}
                              >
                                <defs>
                                  <linearGradient id="barGradient0" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95} />
                                    <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.7} />
                                  </linearGradient>
                                  <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.7} />
                                  </linearGradient>
                                  <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.95} />
                                    <stop offset="100%" stopColor="#0e7490" stopOpacity={0.7} />
                                  </linearGradient>
                                  <linearGradient id="barGradient3" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                                    <stop offset="100%" stopColor="#047857" stopOpacity={0.7} />
                                  </linearGradient>
                                  <linearGradient id="barGradient4" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                                    <stop offset="100%" stopColor="#b45309" stopOpacity={0.7} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                  dataKey="shortTitle"
                                  stroke="#64748b"
                                  fontSize={11}
                                  tickLine={false}
                                  interval={0}
                                  tick={({ x, y, payload }) => (
                                    <g transform={`translate(${Number(x)},${Number(y) + 8})`}>
                                      <text
                                        x={0}
                                        y={0}
                                        dy={10}
                                        textAnchor="middle"
                                        fill="#94a3b8"
                                        fontSize={10}
                                        className="font-medium select-none"
                                      >
                                        {payload.value.length > 13
                                          ? `${payload.value.substring(0, 12)}...`
                                          : payload.value}
                                      </text>
                                    </g>
                                  )}
                                />
                                <YAxis
                                  stroke="#64748b"
                                  fontSize={11}
                                  tickLine={false}
                                  axisLine={false}
                                  allowDecimals={false}
                                />
                                <Tooltip
                                  content={<CustomPerformanceTooltip />}
                                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                                />
                                <Legend
                                  verticalAlign="top"
                                  align="right"
                                  height={30}
                                  iconSize={8}
                                  formatter={(value) => (
                                    <span className="text-[11px] text-slate-300 font-medium">
                                      {value === 'copy_count' ? 'Kopyalanma Hacmi' : 'Performans Eğrisi'}
                                    </span>
                                  )}
                                />
                                <Bar
                                  dataKey="copy_count"
                                  radius={[6, 6, 0, 0]}
                                  barSize={38}
                                  name="copy_count"
                                >
                                  {stats.topPrompts.map((_, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={`url(#barGradient${index % 5})`}
                                    />
                                  ))}
                                </Bar>
                                <Line
                                  type="monotone"
                                  dataKey="copy_count"
                                  stroke="#38bdf8"
                                  strokeWidth={2.5}
                                  dot={{
                                    r: 4.5,
                                    fill: '#0284c7',
                                    stroke: '#f0f9ff',
                                    strokeWidth: 2,
                                  }}
                                  activeDot={{ r: 6.5, fill: '#38bdf8' }}
                                  name="trend_line"
                                />
                              </ComposedChart>
                            ) : (
                              <BarChart
                                data={stats.copyTrend}
                                margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                  dataKey="period"
                                  stroke="#64748b"
                                  fontSize={11}
                                  tickLine={false}
                                />
                                <YAxis
                                  stroke="#64748b"
                                  fontSize={11}
                                  tickLine={false}
                                  axisLine={false}
                                  allowDecimals={false}
                                />
                                <Tooltip
                                  content={
                                    <CustomTrendTooltip topPrompts={stats.topPrompts} />
                                  }
                                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                                />
                                <Legend
                                  verticalAlign="top"
                                  align="right"
                                  height={30}
                                  iconSize={8}
                                  formatter={(value) => {
                                    const idx = Number(value.replace('prompt_', '')) - 1;
                                    const p = stats.topPrompts[idx];
                                    return (
                                      <span className="text-[10px] text-slate-300 font-medium truncate max-w-[100px] inline-block">
                                        #{idx + 1} {p?.shortTitle || 'Prompt'}
                                      </span>
                                    );
                                  }}
                                />
                                <Bar dataKey="prompt_1" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="prompt_2" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="prompt_3" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="prompt_4" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="prompt_5" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>

                        {/* Top 5 Ranked Cards List */}
                        <div className="grid grid-cols-1 gap-2 pt-1 border-t border-slate-800/80">
                          {stats.topPrompts.map((p, idx) => (
                            <div
                              key={p.id}
                              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm"
                                  style={{
                                    backgroundColor: `${topColors[idx % topColors.length]}25`,
                                    color: topColors[idx % topColors.length],
                                    border: `1px solid ${topColors[idx % topColors.length]}40`,
                                  }}
                                >
                                  #{idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="text-xs font-bold text-slate-100 truncate max-w-[260px] sm:max-w-md"
                                      title={p.title}
                                    >
                                      {p.title}
                                    </span>
                                    {p.is_favorite && (
                                      <Heart className="w-3 h-3 fill-rose-500 text-rose-500 shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="text-violet-300 font-medium">
                                      {p.category}
                                    </span>
                                    <span>•</span>
                                    <span>Kütüphane içi pay: %{p.shareOfTotalCopies}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                                <div className="text-right">
                                  <div className="text-xs font-mono font-bold text-emerald-400">
                                    {p.copy_count} kopyalama
                                  </div>
                                  <div className="w-20 sm:w-28 h-1.5 rounded-full bg-slate-950 overflow-hidden mt-1">
                                    <div
                                      className="h-full rounded-full transition-all duration-300"
                                      style={{
                                        width: `${p.percentageOfTop}%`,
                                        backgroundColor: topColors[idx % topColors.length],
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ======================================================== */}
                  {/* SEÇİLEN KATEGORİ VEYA ETİKET GRUBU ÖZET KARTI */}
                  {/* ======================================================== */}
                  <div
                    id="group-summary-card"
                    className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 border border-violet-500/30 shadow-xl space-y-4 transition-all"
                  >
                    {/* Header with Type Selector and Item Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-100">
                              Grup Performans & Etki Özeti
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
                              Etkileşimli Analiz
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Seçilen kategori veya etiketin kopyalanma ve favori edilme oranları
                          </p>
                        </div>
                      </div>

                      {/* Controls: Category vs Tag Toggle & Dropdown */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Type Toggle */}
                        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() => setSummaryGroupType('category')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              summaryGroupType === 'category'
                                ? 'bg-violet-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Folder className="w-3.5 h-3.5" />
                            <span>Kategori</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSummaryGroupType('tag')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              summaryGroupType === 'tag'
                                ? 'bg-violet-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <TagIcon className="w-3.5 h-3.5" />
                            <span>Etiket</span>
                          </button>
                        </div>

                        {/* Item Select Dropdown */}
                        {summaryGroupType === 'category' ? (
                          <select
                            value={selectedCategoryName}
                            onChange={(e) => setSelectedCategoryName(e.target.value)}
                            className="bg-slate-950 border border-violet-500/40 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium"
                          >
                            {stats.categoryDistribution.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name} ({c.count} prompt)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={selectedTagName}
                            onChange={(e) => setSelectedTagName(e.target.value)}
                            className="bg-slate-950 border border-violet-500/40 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium"
                          >
                            {stats.popularTags.map((t) => (
                              <option key={t.tag} value={t.tag}>
                                #{t.tag} ({t.count} prompt)
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Quick Selection Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
                        <MousePointerClick className="w-3 h-3 text-slate-400" />
                        Hızlı Seç:
                      </span>
                      {summaryGroupType === 'category'
                        ? stats.categoryDistribution.slice(0, 5).map((cat) => (
                            <button
                              key={cat.name}
                              onClick={() => setSelectedCategoryName(cat.name)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg font-medium border transition-all ${
                                selectedCategoryName === cat.name
                                  ? 'bg-violet-600/30 border-violet-500 text-violet-200 shadow-xs'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <span
                                className="w-2 h-2 rounded-full inline-block mr-1.5 align-middle"
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </button>
                          ))
                        : stats.popularTags.slice(0, 6).map((tg) => (
                            <button
                              key={tg.tag}
                              onClick={() => setSelectedTagName(tg.tag)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg font-medium border transition-all ${
                                selectedTagName === tg.tag
                                  ? 'bg-violet-600/30 border-violet-500 text-violet-200 shadow-xs'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              #{tg.tag}
                            </button>
                          ))}
                    </div>

                    {/* Active Selected Group Content Card */}
                    {summaryGroupType === 'category' && selectedCategoryData ? (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Title & Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-900/70 rounded-xl border border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: selectedCategoryData.color }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-100">
                                  {selectedCategoryData.name}
                                </h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-semibold">
                                  {selectedCategoryData.count} Prompt (%{selectedCategoryData.percentage})
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                Kategoriye özel kopyalama ve favori edilme analizi
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium flex items-center gap-1">
                              <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                              <span>{selectedCategoryData.fillableCount} Form Şablonu</span>
                            </span>
                          </div>
                        </div>

                        {/* Dual Key Metrics: Kopyalama Oranı & Favori Edilme Oranı */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {/* 1. Kopyalama Oranı Kartı */}
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                                Toplam Kopyalama & Pay
                              </span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                Pay: %{selectedCategoryData.copyShare}
                              </span>
                            </div>

                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                                {selectedCategoryData.totalCopies.toLocaleString('tr-TR')}
                              </span>
                              <span className="text-xs text-slate-400">kez kopyalandı</span>
                            </div>

                            {/* Progress Gauge */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Kütüphane Geneli Kopyalama Oranı</span>
                                <span className="font-mono font-bold text-slate-200">
                                  %{selectedCategoryData.copyShare}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-500"
                                  style={{ width: `${Math.max(5, selectedCategoryData.copyShare)}%` }}
                                />
                              </div>
                            </div>

                            <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-900">
                              <span>Ortalama Performans:</span>
                              <span className="font-mono font-semibold text-slate-200">
                                {selectedCategoryData.avgCopiesPerPrompt} kopya / prompt
                              </span>
                            </div>
                          </div>

                          {/* 2. Favori Edilme Oranı Kartı */}
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-3 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500/30" />
                                Favori Edilme & Beğeni
                              </span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                Oran: %{selectedCategoryData.favoriteRate}
                              </span>
                            </div>

                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-rose-400 font-mono tracking-tight">
                                {selectedCategoryData.favoriteCount}
                              </span>
                              <span className="text-xs text-slate-400">prompt favorilendi</span>
                            </div>

                            {/* Progress Gauge */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Kategori İçi Favori Edilme Oranı</span>
                                <span className="font-mono font-bold text-slate-200">
                                  %{selectedCategoryData.favoriteRate}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-rose-600 to-pink-400 transition-all duration-500"
                                  style={{ width: `${Math.max(5, selectedCategoryData.favoriteRate)}%` }}
                                />
                              </div>
                            </div>

                            <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-900">
                              <span>Kütüphane Favori Payı:</span>
                              <span className="font-mono font-semibold text-rose-300">
                                Toplam favorilerin %{selectedCategoryData.favoriteShare}'i
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Top Prompt in Category */}
                        {selectedCategoryData.topPromptTitle && (
                          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                <Award className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                                  Bu Kategorinin En Çok Kullanılanı
                                </span>
                                <span className="text-xs font-bold text-slate-200 truncate block">
                                  {selectedCategoryData.topPromptTitle}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-400 shrink-0 px-2 py-1 rounded bg-slate-950 border border-slate-800">
                              {selectedCategoryData.topPromptCopies} kopyalama
                            </span>
                          </div>
                        )}
                      </div>
                    ) : summaryGroupType === 'tag' && selectedTagData ? (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Title & Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-900/70 rounded-xl border border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                              <TagIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-100">
                                  #{selectedTagData.tag}
                                </h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-semibold">
                                  {selectedTagData.count} Prompt (%{selectedTagData.percentage})
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                Etiket grubuna özel kopyalama ve favori edilme analizi
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium flex items-center gap-1">
                              <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                              <span>{selectedTagData.fillableCount} Form Şablonu</span>
                            </span>
                          </div>
                        </div>

                        {/* Dual Key Metrics: Kopyalama Oranı & Favori Edilme Oranı */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {/* 1. Kopyalama Oranı Kartı */}
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                                Toplam Kopyalama & Pay
                              </span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                Pay: %{selectedTagData.copyShare}
                              </span>
                            </div>

                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                                {selectedTagData.totalCopies.toLocaleString('tr-TR')}
                              </span>
                              <span className="text-xs text-slate-400">kez kopyalandı</span>
                            </div>

                            {/* Progress Gauge */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Kütüphane Geneli Kopyalama Oranı</span>
                                <span className="font-mono font-bold text-slate-200">
                                  %{selectedTagData.copyShare}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-500"
                                  style={{ width: `${Math.max(5, selectedTagData.copyShare)}%` }}
                                />
                              </div>
                            </div>

                            <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-900">
                              <span>Ortalama Performans:</span>
                              <span className="font-mono font-semibold text-slate-200">
                                {selectedTagData.avgCopiesPerPrompt} kopya / prompt
                              </span>
                            </div>
                          </div>

                          {/* 2. Favori Edilme Oranı Kartı */}
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-3 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500/30" />
                                Favori Edilme & Beğeni
                              </span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                Oran: %{selectedTagData.favoriteRate}
                              </span>
                            </div>

                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-rose-400 font-mono tracking-tight">
                                {selectedTagData.favoriteCount}
                              </span>
                              <span className="text-xs text-slate-400">prompt favorilendi</span>
                            </div>

                            {/* Progress Gauge */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Etiket İçi Favori Edilme Oranı</span>
                                <span className="font-mono font-bold text-slate-200">
                                  %{selectedTagData.favoriteRate}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-rose-600 to-pink-400 transition-all duration-500"
                                  style={{ width: `${Math.max(5, selectedTagData.favoriteRate)}%` }}
                                />
                              </div>
                            </div>

                            <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-900">
                              <span>Kütüphane Favori Payı:</span>
                              <span className="font-mono font-semibold text-rose-300">
                                Toplam favorilerin %{selectedTagData.favoriteShare}'i
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Top Prompt with this tag */}
                        {selectedTagData.topPromptTitle && (
                          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                <Award className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                                  Bu Etiketin En Çok Kullanılanı
                                </span>
                                <span className="text-xs font-bold text-slate-200 truncate block">
                                  {selectedTagData.topPromptTitle}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-400 shrink-0 px-2 py-1 rounded bg-slate-950 border border-slate-800">
                              {selectedTagData.topPromptCopies} kopyalama
                            </span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* ======================================================== */}
                  {/* Kategori Dağılımı (Category Distribution) */}
                  {/* ======================================================== */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                          <PieChart className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-100">Kategori Dağılımı</h3>
                          <p className="text-[11px] text-slate-400">
                            Promptların kategorilere göre dağılımı (Özet kartını güncellemek için bir kategoriye tıklayın)
                          </p>
                        </div>
                      </div>

                      {/* Filter Search inside categories */}
                      {stats.categoryDistribution.length > 5 && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            placeholder="Kategori ara..."
                            className="w-full sm:w-44 pl-8 pr-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Proportional Multi-Segment Bar */}
                    {stats.categoryDistribution.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-full rounded-full bg-slate-900 flex overflow-hidden border border-slate-800">
                          {stats.categoryDistribution.slice(0, 10).map((cat) => (
                            <div
                              key={cat.name}
                              onClick={() => {
                                setSelectedCategoryName(cat.name);
                                setSummaryGroupType('category');
                                document.getElementById('group-summary-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }}
                              style={{
                                width: `${Math.max(1, (cat.count / stats.totalPrompts) * 100)}%`,
                                backgroundColor: cat.color,
                              }}
                              title={`${cat.name}: ${cat.count} prompt (%${cat.percentage}) - Özet kartında görüntülemek için tıklayın`}
                              className="h-full transition-all hover:opacity-90 cursor-pointer"
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Top 10 kategori orantılı görsel dağılım</span>
                          <span>Toplam {stats.totalPrompts} prompt</span>
                        </div>
                      </div>
                    )}

                    {/* Categories List with Progress Bars */}
                    {displayedCategories.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center italic">
                        Aramaya uygun kategori bulunamadı.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {displayedCategories.map((item) => {
                          const isSelected = summaryGroupType === 'category' && selectedCategoryName === item.name;
                          return (
                            <div
                              key={item.name}
                              onClick={() => {
                                setSelectedCategoryName(item.name);
                                setSummaryGroupType('category');
                                document.getElementById('group-summary-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-violet-950/40 border-violet-500/60 shadow-sm'
                                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="text-xs font-semibold text-slate-200 truncate" title={item.name}>
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-xs font-mono font-bold text-slate-100">
                                    {item.count}
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                    %{item.percentage}
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.max(4, item.percentage)}%`,
                                    backgroundColor: item.color,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Toggle show all categories */}
                    {!categorySearch && stats.categoryDistribution.length > 6 && (
                      <button
                        onClick={() => setShowAllCategories(!showAllCategories)}
                        className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/20 rounded-xl transition-colors border border-indigo-900/30"
                      >
                        {showAllCategories ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            <span>Daha Az Kategori Göster (İlk 6)</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            <span>Tüm Kategorileri Göster ({stats.categoryDistribution.length})</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* ======================================================== */}
                  {/* En Popüler Etiketler (Most Popular Tags) */}
                  {/* ======================================================== */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <Flame className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-100">En Popüler Etiketler</h3>
                          <p className="text-[11px] text-slate-400">
                            Kütüphanede en çok kullanılan anahtar kelimeler (Özet kartını güncellemek için bir etikete tıklayın)
                          </p>
                        </div>
                      </div>

                      {/* Tag Search Input */}
                      {stats.popularTags.length > 8 && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={tagSearch}
                            onChange={(e) => setTagSearch(e.target.value)}
                            placeholder="Etiket ara..."
                            className="w-full sm:w-44 pl-8 pr-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      )}
                    </div>

                    {displayedTags.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center italic">
                        {tagSearch ? 'Aramaya uygun etiket bulunamadı.' : 'Henüz etiket bulunmuyor.'}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {displayedTags.map((t, idx) => {
                          const isTop3 = !tagSearch && idx < 3;
                          const isSelected = summaryGroupType === 'tag' && selectedTagName === t.tag;
                          return (
                            <button
                              key={t.tag}
                              type="button"
                              onClick={() => {
                                setSelectedTagName(t.tag);
                                setSummaryGroupType('tag');
                                document.getElementById('group-summary-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-600/30'
                                  : isTop3
                                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-xs hover:border-amber-400'
                                  : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                              }`}
                            >
                              {isTop3 && <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              <span>#{t.tag}</span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                                  isSelected
                                    ? 'bg-white/20 text-white font-bold'
                                    : isTop3
                                    ? 'bg-amber-500/30 text-amber-200 font-bold'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {t.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Toggle show all tags */}
                    {!tagSearch && stats.popularTags.length > 14 && (
                      <button
                        onClick={() => setShowAllTags(!showAllTags)}
                        className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-950/20 rounded-xl transition-colors border border-amber-900/30"
                      >
                        {showAllTags ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            <span>Daha Az Etiket Göster (İlk 14)</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            <span>Tüm Popüler Etiketleri Göster ({stats.popularTags.length})</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Quick Export CTA in Stats Tab */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-violet-950/40 via-indigo-950/40 to-slate-900 border border-violet-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span>Kütüphanenizi Yedeklemek İster misiniz?</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        {stats.totalPrompts} prompt ve {stats.totalCategories} kategorinizi tek tıkla JSON olarak bilgisayarınıza kaydedin.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-600/30 transition-all"
                      >
                        <Download className="w-4 h-4 text-white" />
                        <span>Hemen Yedek İndir</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('transfer')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                      >
                        <span>İçe Aktar</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* TAB 2: YEDEKLEME & İÇE / DIŞA AKTARMA */}
          {activeTab === 'transfer' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Quick Status Bar */}
              {stats && (
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-300">
                    Mevcut Durum: <span className="font-bold text-slate-100">{stats.totalPrompts} prompt</span>,{' '}
                    <span className="font-bold text-slate-100">{stats.totalCategories} kategori</span> kayıtlı.
                  </div>
                  <button
                    onClick={() => setActiveTab('stats')}
                    className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
                  >
                    <span>İstatistikleri Gör</span>
                    <span>→</span>
                  </button>
                </div>
              )}

              {/* Export Box */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-200">
                    Tüm Kütüphaneyi Dışa Aktar (JSON)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kişisel promptlarınızı ve kategorilerinizi tek tıkla cihazınıza indirin.
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-semibold border border-slate-700 transition-colors shrink-0 ml-3"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>İndir</span>
                </button>
              </div>

              {/* Sample Pack 1-Click Load */}
              <div className="p-4 bg-indigo-950/30 rounded-xl border border-indigo-800/40 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-semibold text-indigo-200">
                      348 Hazır Master Prompt Paketini Yükle
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                      Örnek Paket
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    37 kategoride 348 adet profesyonel master prompt ve doldurulabilir şablonu hesabınıza ekler.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={handleLoadSamplePack}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors shrink-0 ml-3 disabled:opacity-50"
                >
                  <span>{isImporting ? 'Yükleniyor...' : 'Paketi Yükle'}</span>
                </button>
              </div>

              {/* Import Box */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-200">
                    Promptları İçe Aktar
                  </h3>
                  <label className="cursor-pointer text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>JSON Dosyası Seç</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {importError && (
                  <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-lg">
                    {importError}
                  </div>
                )}

                <textarea
                  rows={5}
                  placeholder="Veya yedek JSON metnini doğrudan buraya yapıştırın..."
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />

                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-600/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isImporting ? 'İçe Aktarılıyor...' : 'Promptları Kütüphaneye Ekle'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

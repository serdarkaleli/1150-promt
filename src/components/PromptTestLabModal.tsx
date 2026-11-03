import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clipboard,
  FlaskConical,
  Play,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type { Prompt } from '../types';
import {
  estimateStats,
  extractTemplateVariables,
  fillPromptTemplate,
  formatVariableLabel,
} from '../utils/prompt-utils';
import { useToast } from './Toast';

interface PromptTestLabModalProps {
  prompt: Prompt | null;
  isOpen: boolean;
  onClose: () => void;
}

interface SavedPromptScenario {
  id: string;
  name: string;
  values: Record<string, string>;
  createdAt: string;
}

const storageKey = (promptId: string) => `prompthub_test_scenarios_${promptId}`;

export const PromptTestLabModal: React.FC<PromptTestLabModalProps> = ({
  prompt,
  isOpen,
  onClose,
}) => {
  const { showToast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [scenarioName, setScenarioName] = useState('');
  const [scenarios, setScenarios] = useState<SavedPromptScenario[]>([]);
  const [copied, setCopied] = useState(false);

  const variables = useMemo(
    () => (prompt ? extractTemplateVariables(prompt.content) : []),
    [prompt]
  );
  const previewContent = useMemo(
    () => (prompt ? fillPromptTemplate(prompt.content, values) : ''),
    [prompt, values]
  );
  const stats = useMemo(() => estimateStats(previewContent), [previewContent]);
  const unresolvedVariables = useMemo(
    () => variables.filter((variable) => !values[variable]?.trim()),
    [values, variables]
  );
  const filledCount = variables.length - unresolvedVariables.length;

  useEffect(() => {
    if (!prompt) return;

    setValues({});
    setScenarioName('');
    setCopied(false);

    try {
      const stored = localStorage.getItem(storageKey(prompt.id));
      const parsed = stored ? JSON.parse(stored) : [];
      setScenarios(Array.isArray(parsed) ? parsed : []);
    } catch {
      setScenarios([]);
      showToast('Kayıtlı test senaryoları okunamadı.', 'error');
    }
  }, [prompt, showToast]);

  if (!isOpen || !prompt) return null;

  const handleReset = () => {
    setValues({});
    setScenarioName('');
  };

  const handleSaveScenario = () => {
    const name = scenarioName.trim();
    if (!name) {
      showToast('Senaryoyu kaydetmek için bir ad girin.', 'error');
      return;
    }

    const nextScenario: SavedPromptScenario = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      values,
      createdAt: new Date().toISOString(),
    };
    const nextScenarios = [nextScenario, ...scenarios].slice(0, 20);

    try {
      localStorage.setItem(storageKey(prompt.id), JSON.stringify(nextScenarios));
      setScenarios(nextScenarios);
      setScenarioName('');
      showToast('Test senaryosu kaydedildi.', 'success');
    } catch {
      showToast('Test senaryosu kaydedilemedi.', 'error');
    }
  };

  const handleDeleteScenario = (scenarioId: string) => {
    const nextScenarios = scenarios.filter((scenario) => scenario.id !== scenarioId);
    try {
      localStorage.setItem(storageKey(prompt.id), JSON.stringify(nextScenarios));
      setScenarios(nextScenarios);
    } catch {
      showToast('Test senaryosu silinemedi.', 'error');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewContent);
      setCopied(true);
      showToast('Test çıktısı panoya kopyalandı.', 'success');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Test çıktısı kopyalanamadı.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">Prompt Test Laboratuvarı</h2>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Senaryo
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">{prompt.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Test laboratuvarını kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] overflow-y-auto">
          <section className="p-4 sm:p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Girdi senaryosu</h3>
                <p className="text-xs text-slate-400 mt-1">Farklı kullanım koşullarını doldurup tekrar test edin.</p>
              </div>
              <span className="text-xs font-mono text-cyan-300">{filledCount}/{variables.length} alan</span>
            </div>

            {variables.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 text-xs text-slate-300">
                Bu promptta değişken bulunmuyor. Test çıktısı doğrudan mevcut prompt içeriğidir.
              </div>
            ) : (
              <div className="space-y-3">
                {variables.map((variable) => (
                  <label key={variable} className="block p-3 rounded-xl border border-slate-800 bg-slate-950/70">
                    <span className="flex items-center justify-between gap-2 mb-1.5 text-xs font-semibold text-slate-200">
                      <span>{formatVariableLabel(variable)}</span>
                      <code className="text-[10px] text-cyan-300/80">{`{{${variable}}}`}</code>
                    </span>
                    {variable.toLowerCase().includes('text') ||
                    variable.toLowerCase().includes('code') ||
                    variable.toLowerCase().includes('metin') ||
                    variable.toLowerCase().includes('document') ? (
                      <textarea
                        rows={3}
                        value={values[variable] || ''}
                        onChange={(event) => setValues((current) => ({ ...current, [variable]: event.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-y"
                        placeholder={`${formatVariableLabel(variable)} girin...`}
                      />
                    ) : (
                      <input
                        value={values[variable] || ''}
                        onChange={(event) => setValues((current) => ({ ...current, [variable]: event.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        placeholder={`${formatVariableLabel(variable)} girin...`}
                      />
                    )}
                  </label>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Senaryo adı</label>
              <div className="flex gap-2">
                <input
                  value={scenarioName}
                  onChange={(event) => setScenarioName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSaveScenario();
                  }}
                  placeholder="Örn: E-ticaret landing page"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  onClick={handleSaveScenario}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                >
                  <Save className="w-3.5 h-3.5" />
                  Kaydet
                </button>
              </div>
            </div>

            {scenarios.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-300">Kayıtlı senaryolar</h3>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {scenarios.map((scenario) => (
                    <div key={scenario.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <button
                        onClick={() => setValues(scenario.values)}
                        className="flex-1 text-left text-xs text-slate-300 hover:text-cyan-300 truncate"
                        title="Senaryoyu yükle"
                      >
                        {scenario.name}
                      </button>
                      <button
                        onClick={() => handleDeleteScenario(scenario.id)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                        aria-label={`${scenario.name} senaryosunu sil`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="p-4 sm:p-6 space-y-4 bg-slate-950/35">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Test çıktısı</h3>
                <p className="text-xs text-slate-400 mt-1">Değişkenler doldurulduktan sonra çalıştırılabilir prompt.</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span>~{stats.estTokens} token</span>
                <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white" title="Alanları temizle">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
              unresolvedVariables.length === 0
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
            }`}>
              {unresolvedVariables.length === 0 ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>
                {unresolvedVariables.length === 0
                  ? 'Senaryo çalıştırılmaya hazır.'
                  : `Eksik alanlar: ${unresolvedVariables.map(formatVariableLabel).join(', ')}`}
              </span>
            </div>

            <pre className="min-h-[280px] max-h-[52vh] overflow-y-auto whitespace-pre-wrap break-words p-4 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs sm:text-sm leading-relaxed text-slate-200">
              {previewContent}
            </pre>

            <div className="flex justify-end">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-xs font-bold"
              >
                {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                {copied ? 'Kopyalandı!' : 'Test çıktısını kopyala'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

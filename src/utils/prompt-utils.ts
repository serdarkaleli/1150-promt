/**
 * Turkish string normalization for search and indexing.
 * Handles Turkish specific characters: İ/i, I/ı, Ş/ş, Ğ/ğ, Ü/ü, Ö/ö, Ç/ç
 */
export function normalizeTurkishText(text: string): string {
  if (!text) return '';
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Filter prompts by search term, category, tag, favorite, and fillable form filter.
 */
export interface FilterablePrompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  copy_count?: number;
}

export interface PromptFilterOptions {
  searchQuery?: string;
  category?: string;
  tag?: string;
  onlyFavorites?: boolean;
  onlyFillable?: boolean;
  sortBy?: 'newest' | 'oldest' | 'title' | 'popular';
}

export function filterPrompts<T extends FilterablePrompt>(
  prompts: T[],
  options: PromptFilterOptions
): T[] {
  const query = options.searchQuery ? normalizeTurkishText(options.searchQuery) : '';
  const selectedCategory = options.category && options.category !== 'Tümü' ? options.category : null;
  const selectedTag = options.tag && options.tag !== 'Tümü' ? options.tag : null;

  const filtered = prompts.filter((p) => {
    if (options.onlyFavorites && !p.is_favorite) {
      return false;
    }

    if (options.onlyFillable && !hasFillableVariables(p.content)) {
      return false;
    }

    if (selectedCategory && p.category !== selectedCategory) {
      return false;
    }

    if (selectedTag && !p.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
      return false;
    }

    if (query) {
      const matchTitle = normalizeTurkishText(p.title).includes(query);
      const matchDesc = normalizeTurkishText(p.description).includes(query);
      const matchContent = normalizeTurkishText(p.content).includes(query);
      const matchCategory = normalizeTurkishText(p.category).includes(query);
      const matchTags = p.tags.some((t) => normalizeTurkishText(t).includes(query));
      if (!matchTitle && !matchDesc && !matchContent && !matchCategory && !matchTags) {
        return false;
      }
    }

    return true;
  });

  return filtered.sort((a, b) => {
    switch (options.sortBy) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'title':
        return a.title.localeCompare(b.title, 'tr');
      case 'popular':
        return (b.copy_count || 0) - (a.copy_count || 0);
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
}

/**
 * Common dictionary for translating/humanizing technical variable names into clear Turkish labels.
 */
const VARIABLE_LABELS_TR: Record<string, string> = {
  concept: 'Kavram / Konu Başlığı',
  topic: 'Konu / Odak Noktası',
  number: 'Adet / Sayı',
  text_to_summarize: 'Özetlenecek Metin',
  text_to_translate: 'Çevrilecek Metin',
  source_language: 'Kaynak Dil (Örn: İngilizce)',
  target_language: 'Hedef Dil (Örn: Türkçe)',
  code_snippet: 'Kaynak Kod Parçacığı',
  language: 'Programlama Dili / Konuşma Dili',
  frameworks_and_versions: 'Framework / Kütüphane Sürümleri',
  complex_problem: 'Çözülecek Karmaşık Problem',
  complex_concept: 'Açıklanacak Karmaşık Kavram',
  paste_document: 'İncelenecek Doküman / Metin',
  paste_error_message: 'Hata Mesajı (Error Output)',
  paste_code_snippet: 'İlgili Kod Parçası',
  symptom_1: '1. Belirti / Hata Davranışı',
  symptom_2: '2. Belirti / Hata Davranışı',
  option_1: '1. Seçenek / Alternatif',
  option_2: '2. Seçenek / Alternatif',
  option_3: '3. Seçenek / Alternatif',
  context: 'Bağlam / Proje Çerçevesi',
  proje_adi: 'Proje veya Ürün Adı',
  hedef_kitle: 'Hedef Kitle / Okuyucu Profili',
  makale_konusu: 'Makale / İçerik Konusu',
  anahtar_kelimeler: 'Odak Anahtar Kelimeler',
  karakter_tarifi: 'Karakter / Obje Tarifi',
  mekan_ve_ortam: 'Mekan ve Ortam Detayları',
  veri_seti_aciklamasi: 'Veri Seti Açıklaması',
  hedef_unvan: 'Hedef Kişi / Ünvan',
  cozumumuz: 'Şirketimiz ve Sunduğu Çözüm',
  ana_problem: 'Müşterinin Yaşadığı Ana Problem',
  sirket_adi: 'Hedef Şirket Adı',
  task_goal: 'Görev / Ulaşılacak Hedef',
  audience: 'Hedef Kitle',
  tone: 'Yazım Tonu (Örn: Profesyonel, Samimi)',
  format: 'İstenen Çıktı Formatı',
};

/**
 * Returns a human-friendly readable label for any variable name.
 */
export function formatVariableLabel(name: string): string {
  if (!name) return '';
  const cleanKey = name.trim().toLowerCase();
  if (VARIABLE_LABELS_TR[cleanKey]) {
    return VARIABLE_LABELS_TR[cleanKey];
  }

  // Convert snake_case or camelCase to capitalized words
  return name
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Extracts template variables formatted as:
 * - {variable_name}
 * - {{variable_name}}
 * - [VARIABLE_NAME]
 */
export function extractTemplateVariables(content: string): string[] {
  if (!content) return [];
  const matches = new Set<string>();

  // 1. Matches {variable} or {{variable}}
  const curlyRegex = /\{{1,2}([^\{\}\r\n]+?)\}{1,2}/g;
  let match;
  while ((match = curlyRegex.exec(content)) !== null) {
    const raw = match[1].trim();
    // Exclude JSON braces or complex expressions
    if (raw && !raw.includes(':') && !raw.includes('"') && raw.length <= 60) {
      matches.add(raw);
    }
  }

  // 2. Matches [VARIABLE_NAME] or [variable_name]
  const bracketRegex = /\[([A-Z0-9_]{2,40}|[a-z0-9_]{3,40})\]/g;
  while ((match = bracketRegex.exec(content)) !== null) {
    const raw = match[1].trim();
    if (raw && !matches.has(raw)) {
      matches.add(raw);
    }
  }

  return Array.from(matches);
}

/**
 * Check if prompt has any fillable variable placeholders.
 */
export function hasFillableVariables(content: string): boolean {
  return extractTemplateVariables(content).length > 0;
}

/**
 * Replaces variables in a prompt template with provided values.
 * Handles both {var}, {{var}}, and [var].
 */
export function fillPromptTemplate(
  content: string,
  values: Record<string, string>
): string {
  if (!content) return '';

  let result = content;

  // Process all values
  for (const [key, val] of Object.entries(values)) {
    if (val === undefined || val === '') continue;

    // Replace {{key}}, {key}, [key]
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\{\\{${escaped}\\}\\}|\\{${escaped}\\}|\\[${escaped}\\])`, 'g');
    result = result.replace(regex, val);
  }

  return result;
}

/**
 * Token and word count estimation helper
 */
export function estimateStats(content: string): { words: number; chars: number; estTokens: number } {
  if (!content) return { words: 0, chars: 0, estTokens: 0 };
  const chars = content.length;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  // Rule of thumb for English/Turkish: ~4 characters or ~0.75 words per token
  const estTokens = Math.max(1, Math.round(chars / 3.8));
  return { words, chars, estTokens };
}

/**
 * Sanitize tags: trim, remove leading #, lowercase, unique
 */
export function sanitizeTags(tagsInput: string | string[]): string[] {
  let list: string[] = [];
  if (Array.isArray(tagsInput)) {
    list = tagsInput;
  } else if (typeof tagsInput === 'string') {
    list = tagsInput.split(/[,;\s]+/);
  }
  const clean = list
    .map((t) => t.trim().replace(/^#+/, ''))
    .filter((t) => t.length > 0);
  return Array.from(new Set(clean));
}

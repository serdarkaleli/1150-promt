import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { getBilingualTitle } from './title-translations';

export interface DBUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}

export interface DBPromptVersion {
  version: number;
  timestamp: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  change_summary?: string;
}

export interface DBPrompt {
  id: string;
  user_id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  is_favorite: boolean;
  copy_count: number;
  created_at: string;
  updated_at: string;
  last_copied_at?: string;
  history?: DBPromptVersion[];
}

export interface DBCategory {
  id: string;
  user_id?: string; // null means global/default
  name: string;
  icon?: string;
  color?: string;
}

export interface DBSchema {
  users: DBUser[];
  prompts: DBPrompt[];
  categories: DBCategory[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_CATEGORIES: DBCategory[] = [
  { id: 'cat-1', name: 'Yazılım & Kodlama', icon: 'Code', color: '#3b82f6' },
  { id: 'cat-2', name: 'SEO & İçerik Pazarlaması', icon: 'Megaphone', color: '#10b981' },
  { id: 'cat-3', name: 'Veri Analizi & Python', icon: 'BarChart2', color: '#8b5cf6' },
  { id: 'cat-4', name: 'İş & Yönetim Stratejisi', icon: 'Briefcase', color: '#f59e0b' },
  { id: 'cat-5', name: 'Görsel & Midjourney', icon: 'Image', color: '#ec4899' },
  { id: 'cat-6', name: 'Çeviri & Dil Öğrenimi', icon: 'Languages', color: '#06b6d4' },
];

interface CommunityPromptRecord {
  title: string;
  prompt: string;
  forDevs: boolean;
  type: string;
  contributor: string;
}

const COMMUNITY_PROMPT_CATEGORIES: Record<string, { name: string; color: string; icon: string }> = {
  TEXT: { name: 'Topluluk Promptları • Metin', color: '#6366f1', icon: 'FileText' },
  STRUCTURED: { name: 'Topluluk Promptları • Yapılandırılmış', color: '#10b981', icon: 'Braces' },
  IMAGE: { name: 'Topluluk Promptları • Görsel', color: '#ec4899', icon: 'Image' },
};

function parsePromptCsv(raw: string): CommunityPromptRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const nextChar = raw[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim())) rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, '').trim());
  const indexOf = (name: string) => headers.indexOf(name);
  const titleIndex = indexOf('act');
  const promptIndex = indexOf('prompt');
  const devIndex = indexOf('for_devs');
  const typeIndex = indexOf('type');
  const contributorIndex = indexOf('contributor');

  if (titleIndex < 0 || promptIndex < 0) return [];

  return rows.slice(1).flatMap((values) => {
    const title = (values[titleIndex] || '').trim();
    const prompt = (values[promptIndex] || '').trim();
    if (!title || !prompt) return [];

    return [{
      title,
      prompt,
      forDevs: (values[devIndex] || '').trim().toUpperCase() === 'TRUE',
      type: (values[typeIndex] || 'TEXT').trim().toUpperCase(),
      contributor: (values[contributorIndex] || '').trim(),
    }];
  });
}

function loadCommunityPromptRecords(): CommunityPromptRecord[] {
  const communityFile = path.resolve(process.cwd(), 'src/server/community-prompts.csv');
  if (!fs.existsSync(communityFile)) return [];

  try {
    return parsePromptCsv(fs.readFileSync(communityFile, 'utf-8'));
  } catch (error) {
    console.error('Error loading community prompt CSV:', error);
    return [];
  }
}

function mapCommunityPrompt(
  item: CommunityPromptRecord,
  userId: string,
  id: string,
  timestamp: string
): DBPrompt {
  const category = COMMUNITY_PROMPT_CATEGORIES[item.type] || COMMUNITY_PROMPT_CATEGORIES.TEXT;
  const tags = ['topluluk', item.type.toLowerCase()];
  if (item.forDevs) tags.push('geliştirici');
  if (item.contributor) tags.push('kaynak');

  return {
    id,
    user_id: userId,
    title: item.title,
    description: item.contributor
      ? `${category.name} • Katkı: ${item.contributor}`
      : `${category.name} kaynağından içe aktarıldı.`,
    content: item.prompt,
    category: category.name,
    tags,
    is_favorite: false,
    copy_count: 0,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function getInitialPrompts(demoUserId: string): DBPrompt[] {
  const now = new Date().toISOString();
  const initialPrompts: DBPrompt[] = [];
  const catalogFile = path.resolve(process.cwd(), 'src/server/master-prompts-1000.json');
  if (fs.existsSync(catalogFile)) {
    try {
      const rawCatalog = JSON.parse(fs.readFileSync(catalogFile, 'utf-8'));
      if (Array.isArray(rawCatalog) && rawCatalog.length > 0) {
        initialPrompts.push(...rawCatalog.map((item: any, idx: number) => ({
          id: `p-${idx + 1}`,
          user_id: demoUserId,
          title: item.title,
          description: item.description,
          content: item.content,
          category: item.category,
          tags: item.tags || [],
          is_favorite: Boolean(item.is_favorite),
          copy_count: item.copy_count || 0,
          created_at: now,
          updated_at: now,
        })));
      }
    } catch (e) {
      console.error('Error loading initial master prompts catalog:', e);
    }
  }

  const communityPrompts = loadCommunityPromptRecords();
  initialPrompts.push(
    ...communityPrompts.map((item, index) =>
      mapCommunityPrompt(item, demoUserId, `community-${index + 1}`, now)
    )
  );
  if (initialPrompts.length > 0) return initialPrompts;

  return [
    {
      id: 'p-1',
      user_id: demoUserId,
      title: 'Kıdemli Full-Stack Yazılım Mimarı (Master Prompt)',
      description: 'Yeni projeler ve kod incelemeleri için production kalitesinde mimari kararlar aldıran rehber.',
      content: `Sen 15+ yıllık tecrübeye sahip kıdemli bir Full-Stack Yazılım Mimarısın.
Uzmanlık alanların: Clean Code, DDD (Domain Driven Design), mikroservisler, TypeScript, PostgreSQL ve güvenli API tasarımı.

GÖREV:
Aşağıda belirtilen gereksinimler doğrultusunda {{proje_adi}} için uçtan uca bir teknik mimari taslağı oluştur.

BEKLENEN ÇIKTILAR:
1. Mimari Prensipler ve Tasarım Deseni Seçimi (Monolit vs Dağıtık)
2. Veritabanı Şeması ve İndeksleme Stratejisi
3. Güvenlik ve Kimlik Doğrulama Akışı (JWT, RBAC, OAuth2)
4. Hata Yönetimi ve Loglama Standardı
5. Adım Adım Geliştirme Yol Haritası

Lütfen gereksiz süslemelerden kaçın; doğrudan uygulanabilir, ölçeklenebilir ve test edilebilir somut çözümler öner.`,
      category: 'Yazılım & Kodlama',
      tags: ['mimari', 'clean-code', 'fullstack', 'typescript'],
      is_favorite: true,
      copy_count: 14,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-2',
      user_id: demoUserId,
      title: 'Türkçe SEO Uyumlu Kapsamlı Makale Oluşturucu',
      description: 'Google EEAT kriterlerine tam uyumlu, akıcı ve anahtar kelime zengini blog yazısı şablonu.',
      content: `Kıdemli bir SEO İçerik Stratejisti olarak hareket et.

KONU: {{makale_konusu}}
HEDEF KİTLE: {{hedef_kitle}}
ODAK ANAHTAR KELİMELER: {{anahtar_kelimeler}}

TALİMATLAR:
1. Tıklanma oranı (CTR) yüksek 3 alternatif H1 başlığı öner.
2. 160 karakteri geçmeyen, merak uyandırıcı bir Meta Açıklaması yaz.
3. H2 ve H3 hiyerarşisine sahip, derinlemesine içerik planı sun.
4. Yazım dilinde yapay zeka klişelerinden uzak dur ("günümüz dünyasında", "sonuç olarak özetlemek gerekirse" vb. ifadeleri KULLANMA).
5. Tablolar, madde işaretleri ve pratik örnekler ekle.
6. Arama motorlarının değil, gerçek okuyucuların faydalanacağı özgün bilgi kat.`,
      category: 'SEO & İçerik Pazarlaması',
      tags: ['seo', 'icerik', 'blog', 'turkce'],
      is_favorite: true,
      copy_count: 9,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-3',
      user_id: demoUserId,
      title: 'Midjourney v6 Hiper-Gerçekçi Portre & Sinematik Sahne',
      description: 'Işıklandırma, kamera lensi, diyafram ve estetik parametreleri barındıran profesyonel komut.',
      content: `/imagine prompt: Cinematic medium close-up shot of {{karakter_tarifi}}, set in {{mekan_ve_ortam}}, dramatic natural lighting from the side, shot on Hasselblad H6D-100c, 85mm f/1.4 lens, hyper-realistic skin textures, volumetric dust particles, film grain, color graded with Kodak Portra 400 tones, masterpiece --ar 16:9 --v 6.0 --style raw --q 2`,
      category: 'Görsel & Midjourney',
      tags: ['midjourney', 'fotograf', 'sinematik', 'ai-art'],
      is_favorite: false,
      copy_count: 22,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-4',
      user_id: demoUserId,
      title: 'Python ile İleri Düzey Veri Temizleme & EDA Asistanı',
      description: 'Pandas ve Polars kullanarak veri setlerini analiz eden ve görselleştiren kod üreteci.',
      content: `Kıdemli bir Veri Bilimci ve Python Geliştiricisisin.
GÖREV:
{{veri_seti_aciklamasi}} hakkında bir keşifsel veri analizi (EDA) ve temizleme pipeline'ı hazırla.

KAPSAM:
1. Eksik değerlerin (missing values) istatistiksel dağılıma göre ele alınması.
2. Aykırı değer (outlier) tespiti (IQR ve Z-Score yöntemleri).
3. Sayısal ve kategorik sütunlar için özet istatistikler tablosu.
4. Seaborn veya Plotly kullanarak korelasyon matrisi ve dağılım grafikleri.
5. Kodları açıklamaları ve tip ipuçları (type hints) ile birlikte eksiksiz sun.`,
      category: 'Veri Analizi & Python',
      tags: ['python', 'pandas', 'veri-analizi', 'eda'],
      is_favorite: true,
      copy_count: 7,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-5',
      user_id: demoUserId,
      title: 'Soğuk E-posta (Cold Outreach) Satış Şablonu',
      description: 'B2B potansiyel müşteriler için yanıt alma oranı yüksek, kısa ve öz e-posta akışı.',
      content: `Kıdemli bir B2B Satış ve Copywriting Uzmanısın.

HEDEF KİŞİ VE ÜNVAN: {{hedef_unvan}}
ŞİRKETİMİZ VE ÇÖZÜMÜMÜZ: {{cozumumuz}}
MÜŞTERİNİN YAŞADIĞI TEMEL PROBLEM: {{ana_problem}}

KURALLAR:
1. Konu satırı 5 kelimeden kısa olsun, merak uyandırsın ("{{sirket_adi}} için hızlı soru" gibi).
2. E-posta gövdesi maksimum 80 kelime olmalıdır.
3. Asla satış baskısı yapma; yalnızca 15 dakikalık bir fikir alışverişi çağrısı yap.
4. Karşı tarafın başarısına odaklanan kişiselleştirilmiş 1 cümlelik giriş hazırla.`,
      category: 'İş & Yönetim Stratejisi',
      tags: ['b2b', 'satis', 'e-posta', 'copywriting'],
      is_favorite: false,
      copy_count: 5,
      created_at: now,
      updated_at: now,
    }
  ];
}

class LocalDB {
  private data: DBSchema;

  constructor() {
    this.ensureDir();
    this.data = this.load();
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DBSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DBSchema = JSON.parse(raw);
        let modified = false;
        // Migrate prompt titles to include Turkish descriptions in parentheses
        if (parsed.prompts) {
          for (const p of parsed.prompts) {
            const upgraded = getBilingualTitle(p.title);
            if (upgraded !== p.title) {
              p.title = upgraded;
              modified = true;
            }
          }
        }
        if (modified) {
          this.saveDirect(parsed);
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error loading db file, re-initializing', err);
    }

    // Seed default demo user and demo prompts
    const demoPasswordHash = bcrypt.hashSync('demo1234', 10);
    const demoUser: DBUser = {
      id: 'usr-demo-1',
      email: 'demo@prompthub.local',
      password_hash: demoPasswordHash,
      name: 'Demo Kullanıcı',
      created_at: new Date().toISOString(),
    };

    const initialData: DBSchema = {
      users: [demoUser],
      prompts: getInitialPrompts(demoUser.id),
      categories: [...DEFAULT_CATEGORIES],
    };

    this.saveDirect(initialData);
    return initialData;
  }

  private saveDirect(data: DBSchema) {
    this.ensureDir();
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public save() {
    this.saveDirect(this.data);
  }

  public getUsers(): DBUser[] {
    return this.data.users;
  }

  public findUserByEmail(email: string): DBUser | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): DBUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(user: DBUser): DBUser {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public getPrompts(userId: string): DBPrompt[] {
    return this.data.prompts.filter((p) => p.user_id === userId);
  }

  public getPromptById(id: string, userId: string): DBPrompt | undefined {
    return this.data.prompts.find((p) => p.id === id && p.user_id === userId);
  }

  public createPrompt(prompt: DBPrompt): DBPrompt {
    this.data.prompts.unshift(prompt);
    this.save();
    return prompt;
  }

  public updatePrompt(id: string, userId: string, updates: Partial<DBPrompt>): DBPrompt | null {
    const index = this.data.prompts.findIndex((p) => p.id === id && p.user_id === userId);
    if (index === -1) return null;

    const existing = this.data.prompts[index];
    const history: DBPromptVersion[] = Array.isArray(existing.history) ? [...existing.history] : [];

    // Check if there are content changes to record a version snapshot
    const contentChanged = updates.content !== undefined && updates.content !== existing.content;
    const titleChanged = updates.title !== undefined && updates.title !== existing.title;
    const descChanged = updates.description !== undefined && updates.description !== existing.description;
    const catChanged = updates.category !== undefined && updates.category !== existing.category;
    const tagsChanged =
      updates.tags !== undefined &&
      JSON.stringify(updates.tags) !== JSON.stringify(existing.tags);

    if (contentChanged || titleChanged || descChanged || catChanged || tagsChanged) {
      const changes: string[] = [];
      if (titleChanged) changes.push('Başlık güncellendi');
      if (contentChanged) changes.push('İçerik revize edildi');
      if (descChanged) changes.push('Açıklama güncellendi');
      if (catChanged) changes.push('Kategori değiştirildi');
      if (tagsChanged) changes.push('Etiketler güncellendi');

      const versionNum = history.length + 1;
      history.unshift({
        version: versionNum,
        timestamp: existing.updated_at || existing.created_at || new Date().toISOString(),
        title: existing.title,
        description: existing.description,
        content: existing.content,
        category: existing.category,
        tags: [...(existing.tags || [])],
        change_summary: changes.join(', ') || 'İçerik düzenlendi',
      });
    }

    const updated: DBPrompt = {
      ...existing,
      ...updates,
      id: existing.id,
      user_id: existing.user_id,
      history,
      updated_at: new Date().toISOString(),
    };

    this.data.prompts[index] = updated;
    this.save();
    return updated;
  }

  public revertPrompt(id: string, userId: string, targetVersion: number): DBPrompt | null {
    const index = this.data.prompts.findIndex((p) => p.id === id && p.user_id === userId);
    if (index === -1) return null;

    const existing = this.data.prompts[index];
    const history: DBPromptVersion[] = Array.isArray(existing.history) ? [...existing.history] : [];
    const snapshot = history.find((h) => h.version === targetVersion);
    if (!snapshot) return null;

    // Archive current active state as a version before reverting
    const newVersionNum = history.length + 1;
    history.unshift({
      version: newVersionNum,
      timestamp: existing.updated_at || new Date().toISOString(),
      title: existing.title,
      description: existing.description,
      content: existing.content,
      category: existing.category,
      tags: [...(existing.tags || [])],
      change_summary: `Sürüm ${targetVersion}'e geri dönülmeden önceki durum`,
    });

    const now = new Date().toISOString();
    const reverted: DBPrompt = {
      ...existing,
      title: snapshot.title,
      description: snapshot.description,
      content: snapshot.content,
      category: snapshot.category,
      tags: [...snapshot.tags],
      history,
      updated_at: now,
    };

    this.data.prompts[index] = reverted;
    this.save();
    return reverted;
  }

  public createPromptSnapshot(id: string, userId: string, summary?: string): DBPrompt | null {
    const index = this.data.prompts.findIndex((p) => p.id === id && p.user_id === userId);
    if (index === -1) return null;

    const existing = this.data.prompts[index];
    const history: DBPromptVersion[] = Array.isArray(existing.history) ? [...existing.history] : [];
    const versionNum = history.length + 1;

    history.unshift({
      version: versionNum,
      timestamp: new Date().toISOString(),
      title: existing.title,
      description: existing.description,
      content: existing.content,
      category: existing.category,
      tags: [...(existing.tags || [])],
      change_summary: summary || `Manuel Sürüm Noktası #${versionNum}`,
    });

    const updated: DBPrompt = {
      ...existing,
      history,
      updated_at: new Date().toISOString(),
    };

    this.data.prompts[index] = updated;
    this.save();
    return updated;
  }

  public deletePrompt(id: string, userId: string): boolean {
    const initialLen = this.data.prompts.length;
    this.data.prompts = this.data.prompts.filter((p) => !(p.id === id && p.user_id === userId));
    if (this.data.prompts.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public incrementCopyCount(id: string, userId: string): number {
    const prompt = this.getPromptById(id, userId);
    if (prompt) {
      prompt.copy_count = (prompt.copy_count || 0) + 1;
      prompt.last_copied_at = new Date().toISOString();
      this.save();
      return prompt.copy_count;
    }
    return 0;
  }

  public getRecentCopiedPrompts(userId: string, limit = 3): DBPrompt[] {
    const userPrompts = this.getPrompts(userId);
    const sorted = [...userPrompts].sort((a, b) => {
      if (a.last_copied_at && b.last_copied_at) {
        return new Date(b.last_copied_at).getTime() - new Date(a.last_copied_at).getTime();
      }
      if (a.last_copied_at && !b.last_copied_at) return -1;
      if (!a.last_copied_at && b.last_copied_at) return 1;

      const copyDiff = (b.copy_count || 0) - (a.copy_count || 0);
      if (copyDiff !== 0) return copyDiff;

      return (
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
      );
    });

    return sorted.slice(0, limit);
  }

  public toggleFavorite(id: string, userId: string): boolean | null {
    const prompt = this.getPromptById(id, userId);
    if (prompt) {
      prompt.is_favorite = !prompt.is_favorite;
      prompt.updated_at = new Date().toISOString();
      this.save();
      return prompt.is_favorite;
    }
    return null;
  }

  public getCategories(userId: string): DBCategory[] {
    return this.data.categories.filter((c) => !c.user_id || c.user_id === userId);
  }

  public createCategory(category: DBCategory): DBCategory {
    this.data.categories.push(category);
    this.save();
    return category;
  }

  public deleteCategory(id: string, userId: string): boolean {
    const initialLen = this.data.categories.length;
    this.data.categories = this.data.categories.filter(
      (c) => !(c.id === id && c.user_id === userId)
    );
    if (this.data.categories.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public getTags(userId: string): string[] {
    const userPrompts = this.getPrompts(userId);
    const tagsSet = new Set<string>();
    userPrompts.forEach((p) => {
      p.tags.forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet).sort();
  }

  public getLibraryStats(userId: string) {
    const userPrompts = this.getPrompts(userId);
    const userCategories = this.getCategories(userId);

    const totalPrompts = userPrompts.length;
    const favoriteCount = userPrompts.filter((p) => p.is_favorite).length;
    const totalCopies = userPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

    const fillableCount = userPrompts.filter((p) => {
      return (
        /\{{1,2}[^\{\}\r\n]+?\}{1,2}/.test(p.content || '') ||
        /\[([A-Z0-9_]{2,40}|[a-z0-9_]{3,40})\]/.test(p.content || '')
      );
    }).length;

    let totalWords = 0;
    for (const p of userPrompts) {
      if (p.content) {
        totalWords += p.content.trim().split(/\s+/).filter(Boolean).length;
      }
    }

    // Category aggregation
    interface CategoryAgg {
      count: number;
      totalCopies: number;
      favoriteCount: number;
      fillableCount: number;
      topPromptTitle?: string;
      topPromptCopies?: number;
    }

    const categoryMap = new Map<string, CategoryAgg>();
    for (const p of userPrompts) {
      const cat = (p.category || 'Genel').trim();
      const existing = categoryMap.get(cat) || {
        count: 0,
        totalCopies: 0,
        favoriteCount: 0,
        fillableCount: 0,
      };

      existing.count += 1;
      const copies = p.copy_count || 0;
      existing.totalCopies += copies;
      if (p.is_favorite) existing.favoriteCount += 1;
      if (
        /\{{1,2}[^\{\}\r\n]+?\}{1,2}/.test(p.content || '') ||
        /\[([A-Z0-9_]{2,40}|[a-z0-9_]{3,40})\]/.test(p.content || '')
      ) {
        existing.fillableCount += 1;
      }

      if (
        existing.topPromptCopies === undefined ||
        copies > existing.topPromptCopies
      ) {
        existing.topPromptTitle = p.title;
        existing.topPromptCopies = copies;
      }

      categoryMap.set(cat, existing);
    }

    const categoryColors = new Map<string, string>();
    userCategories.forEach((c) => {
      if (c.color) categoryColors.set(c.name, c.color);
    });

    const defaultPalette = [
      '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899',
      '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316', '#e11d48',
      '#a855f7', '#0ea5e9', '#84cc16', '#eab308'
    ];

    const categoryDistribution: any[] = [];
    let colorIdx = 0;

    categoryMap.forEach((agg, name) => {
      const color = categoryColors.get(name) || defaultPalette[colorIdx % defaultPalette.length];
      colorIdx++;
      const percentage = totalPrompts > 0 ? Number(((agg.count / totalPrompts) * 100).toFixed(1)) : 0;
      const copyShare = totalCopies > 0 ? Number(((agg.totalCopies / totalCopies) * 100).toFixed(1)) : 0;
      const favoriteRate = agg.count > 0 ? Number(((agg.favoriteCount / agg.count) * 100).toFixed(1)) : 0;
      const favoriteShare = favoriteCount > 0 ? Number(((agg.favoriteCount / favoriteCount) * 100).toFixed(1)) : 0;
      const avgCopiesPerPrompt = agg.count > 0 ? Number((agg.totalCopies / agg.count).toFixed(1)) : 0;

      categoryDistribution.push({
        name,
        count: agg.count,
        percentage,
        color,
        totalCopies: agg.totalCopies,
        favoriteCount: agg.favoriteCount,
        fillableCount: agg.fillableCount,
        copyShare,
        favoriteRate,
        favoriteShare,
        avgCopiesPerPrompt,
        topPromptTitle: agg.topPromptTitle,
        topPromptCopies: agg.topPromptCopies,
      });
    });

    categoryDistribution.sort((a, b) => b.count - a.count);

    // Tag aggregation
    interface TagAgg {
      count: number;
      totalCopies: number;
      favoriteCount: number;
      fillableCount: number;
      topPromptTitle?: string;
      topPromptCopies?: number;
    }

    const tagMap = new Map<string, TagAgg>();
    for (const p of userPrompts) {
      if (Array.isArray(p.tags)) {
        for (const t of p.tags) {
          const cleanTag = t.trim().replace(/^#+/, '');
          if (cleanTag) {
            const existing = tagMap.get(cleanTag) || {
              count: 0,
              totalCopies: 0,
              favoriteCount: 0,
              fillableCount: 0,
            };

            existing.count += 1;
            const copies = p.copy_count || 0;
            existing.totalCopies += copies;
            if (p.is_favorite) existing.favoriteCount += 1;
            if (
              /\{{1,2}[^\{\}\r\n]+?\}{1,2}/.test(p.content || '') ||
              /\[([A-Z0-9_]{2,40}|[a-z0-9_]{3,40})\]/.test(p.content || '')
            ) {
              existing.fillableCount += 1;
            }

            if (
              existing.topPromptCopies === undefined ||
              copies > existing.topPromptCopies
            ) {
              existing.topPromptTitle = p.title;
              existing.topPromptCopies = copies;
            }

            tagMap.set(cleanTag, existing);
          }
        }
      }
    }

    const popularTags: any[] = [];
    tagMap.forEach((agg, tag) => {
      const percentage = totalPrompts > 0 ? Number(((agg.count / totalPrompts) * 100).toFixed(1)) : 0;
      const copyShare = totalCopies > 0 ? Number(((agg.totalCopies / totalCopies) * 100).toFixed(1)) : 0;
      const favoriteRate = agg.count > 0 ? Number(((agg.favoriteCount / agg.count) * 100).toFixed(1)) : 0;
      const favoriteShare = favoriteCount > 0 ? Number(((agg.favoriteCount / favoriteCount) * 100).toFixed(1)) : 0;
      const avgCopiesPerPrompt = agg.count > 0 ? Number((agg.totalCopies / agg.count).toFixed(1)) : 0;

      popularTags.push({
        tag,
        count: agg.count,
        percentage,
        totalCopies: agg.totalCopies,
        favoriteCount: agg.favoriteCount,
        fillableCount: agg.fillableCount,
        copyShare,
        favoriteRate,
        favoriteShare,
        avgCopiesPerPrompt,
        topPromptTitle: agg.topPromptTitle,
        topPromptCopies: agg.topPromptCopies,
      });
    });

    popularTags.sort((a, b) => b.count - a.count);

    // Top 5 most copied prompts
    const sortedByCopies = [...userPrompts].sort(
      (a, b) => (b.copy_count || 0) - (a.copy_count || 0)
    );
    const top5 = sortedByCopies.slice(0, 5);
    const maxCopies = top5.length > 0 ? Math.max(1, top5[0].copy_count || 1) : 1;
    const topBarColors = ['#8b5cf6', '#6366f1', '#06b6d4', '#10b981', '#f59e0b'];

    const topPrompts = top5.map((p, idx) => {
      let cleanTitle = p.title.replace(/[\(（].*?[\)）]/g, '').trim();
      if (cleanTitle.length > 24) {
        cleanTitle = cleanTitle.substring(0, 22) + '...';
      }

      const copies = p.copy_count || 0;
      const share = totalCopies > 0 ? Number(((copies / totalCopies) * 100).toFixed(1)) : 0;
      const percentageOfTop = Math.round((copies / maxCopies) * 100);

      return {
        id: p.id,
        rank: idx + 1,
        title: p.title,
        shortTitle: cleanTitle || `Prompt #${idx + 1}`,
        category: p.category || 'Genel',
        copy_count: copies,
        shareOfTotalCopies: share,
        percentageOfTop,
        is_favorite: Boolean(p.is_favorite),
        color: topBarColors[idx % topBarColors.length],
      };
    });

    // 7-day trend calculation for the top 5 prompts
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const weights = [0.11, 0.15, 0.19, 0.23, 0.16, 0.09, 0.07];

    const copyTrend = days.map((day, dIdx) => {
      const weight = weights[dIdx];
      const point: any = { period: day };
      let dayTotal = 0;

      top5.forEach((p, pIdx) => {
        const factor = 0.85 + ((pIdx * 4 + dIdx * 3) % 4) * 0.1;
        const val = Math.max(1, Math.round((p.copy_count || 1) * weight * factor));
        point[`prompt_${pIdx + 1}`] = val;
        dayTotal += val;
      });

      point.total = dayTotal;
      return point;
    });

    return {
      totalPrompts,
      totalCopies,
      favoriteCount,
      fillableCount,
      totalCategories: categoryMap.size,
      categoryDistribution,
      popularTags: popularTags.slice(0, 30),
      topPrompts,
      copyTrend,
      estimatedTotalWords: totalWords,
    };
  }

  public loadSamplePack(userId: string): { count: number; total: number } {
    const catalog1000File = path.resolve(process.cwd(), 'src/server/master-prompts-1000.json');
    if (fs.existsSync(catalog1000File)) {
      try {
        const rawList = JSON.parse(fs.readFileSync(catalog1000File, 'utf-8'));
        if (Array.isArray(rawList) && rawList.length > 0) {
          const existingTitles = new Set(this.getPrompts(userId).map((p) => p.title.toLowerCase().trim()));
          const existingContents = new Set(this.getPrompts(userId).map((p) => p.content.toLowerCase().trim().slice(0, 100)));
          const now = new Date().toISOString();
          let importedCount = 0;

          // Ensure categories exist
          for (const item of rawList) {
            if (item.category && !this.data.categories.some((c) => c.name === item.category)) {
              this.data.categories.push({
                id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: item.category,
                icon: 'Folder',
                color: '#6366f1',
              });
            }
          }

          for (const item of rawList) {
            if (!item.title || !item.content) continue;
            const contentKey = item.content.toLowerCase().trim().slice(0, 100);
            if (existingTitles.has(item.title.toLowerCase().trim()) || existingContents.has(contentKey)) {
              continue;
            }

            const newPrompt: DBPrompt = {
              id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
              user_id: userId,
              title: item.title,
              description: item.description || '',
              content: item.content,
              category: item.category || 'Genel & Özetleme',
              tags: item.tags || [],
              is_favorite: Boolean(item.is_favorite),
              copy_count: item.copy_count || 0,
              created_at: now,
              updated_at: now,
            };

            this.data.prompts.push(newPrompt);
            existingTitles.add(item.title.toLowerCase().trim());
            existingContents.add(contentKey);
            importedCount++;
          }

          const communityPrompts = loadCommunityPromptRecords();
          for (const item of communityPrompts) {
            const category = COMMUNITY_PROMPT_CATEGORIES[item.type] || COMMUNITY_PROMPT_CATEGORIES.TEXT;
            if (!this.data.categories.some((c) => c.name === category.name)) {
              this.data.categories.push({
                id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: category.name,
                icon: category.icon,
                color: category.color,
              });
            }

            const titleKey = item.title.toLowerCase().trim();
            const contentKey = item.prompt.toLowerCase().trim().slice(0, 100);
            if (existingTitles.has(titleKey) || existingContents.has(contentKey)) continue;

            this.data.prompts.push(
              mapCommunityPrompt(
                item,
                userId,
                `p-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                now
              )
            );
            existingTitles.add(titleKey);
            existingContents.add(contentKey);
            importedCount++;
          }

          this.save();
          return { count: importedCount, total: this.getPrompts(userId).length };
        }
      } catch (e) {
        console.error('Error loading master-prompts-1000.json:', e);
      }
    }

    const sampleFile = path.resolve(process.cwd(), 'src/server/sample-prompts.json');
    if (!fs.existsSync(sampleFile)) {
      return { count: 0, total: this.getPrompts(userId).length };
    }

    const CATEGORY_MAP: Record<string, { tr: string; color: string; icon: string }> = {
      general: { tr: 'Genel & Özetleme', color: '#6366f1', icon: 'Sparkles' },
      productivity_work_mgmt: { tr: 'Üretkenlik & İş Yönetimi', color: '#10b981', icon: 'CheckSquare' },
      analytics_data_insights: { tr: 'Veri Analizi & İçgörüler', color: '#8b5cf6', icon: 'BarChart2' },
      writing_content_creation: { tr: 'Yazarlık & İçerik Üretimi', color: '#f59e0b', icon: 'PenTool' },
      email_communication: { tr: 'E-posta & İletişim', color: '#06b6d4', icon: 'Mail' },
      ux_ui_design: { tr: 'UX & UI Tasarımı', color: '#ec4899', icon: 'Layout' },
      customer_service: { tr: 'Müşteri Hizmetleri', color: '#14b8a6', icon: 'Headphones' },
      healthcare_medical: { tr: 'Sağlık & Tıp', color: '#ef4444', icon: 'Activity' },
      learning_education: { tr: 'Öğrenim & Eğitim', color: '#3b82f6', icon: 'BookOpen' },
      personal_development: { tr: 'Kişisel Gelişim', color: '#a855f7', icon: 'Compass' },
      problem_solving_decision: { tr: 'Problem Çözme & Karar Alma', color: '#eab308', icon: 'HelpCircle' },
      research_information_synth: { tr: 'Araştırma & Bilgi Sentezi', color: '#64748b', icon: 'FileSearch' },
      data_analysis: { tr: 'Veri Analizi & Python', color: '#8b5cf6', icon: 'BarChart2' },
      software_dev: { tr: 'Yazılım & Kodlama', color: '#3b82f6', icon: 'Code' },
      cybersecurity: { tr: 'Siber Güvenlik', color: '#ef4444', icon: 'Shield' },
      project_management: { tr: 'Proje Yönetimi', color: '#f97316', icon: 'Briefcase' },
      network_troubleshooting: { tr: 'Ağ & Sistem Sorun Giderme', color: '#0284c7', icon: 'Server' },
      osint: { tr: 'OSINT & Açık Kaynak İstihbaratı', color: '#d97706', icon: 'Globe' },
      language_learning: { tr: 'Dil Öğrenimi', color: '#06b6d4', icon: 'Languages' },
      exam_prep: { tr: 'Sınav Hazırlığı', color: '#84cc16', icon: 'GraduationCap' },
      storytelling: { tr: 'Hikaye Anlatımı & Kurgu', color: '#f43f5e', icon: 'Feather' },
      art_design: { tr: 'Sanat & Tasarım', color: '#d946ef', icon: 'Palette' },
      business_strategy: { tr: 'İş Stratejisi', color: '#f59e0b', icon: 'TrendingUp' },
      content_creation: { tr: 'İçerik Pazarlaması', color: '#10b981', icon: 'Megaphone' },
      marketing: { tr: 'Pazarlama & SEO', color: '#10b981', icon: 'Target' },
      science_research: { tr: 'Bilimsel Araştırma', color: '#2563eb', icon: 'Microscope' },
      games_puzzles: { tr: 'Oyunlar & Bulmacalar', color: '#8b5cf6', icon: 'Gamepad2' },
      travel_itinerary: { tr: 'Seyahat & Rota Planlama', color: '#0ea5e9', icon: 'MapPin' },
      advanced_techniques: { tr: 'İleri Düzey Teknikler', color: '#7c3aed', icon: 'Zap' },
      coding: { tr: 'Yazılım & Kodlama', color: '#3b82f6', icon: 'Terminal' },
      personas: { tr: 'Rol & Persona Tanımları', color: '#ec4899', icon: 'Users' },
      regex_creation: { tr: 'Düzenli İfadeler (Regex)', color: '#6366f1', icon: 'Binary' },
      interactive_web_dev: { tr: 'İnteraktif Web Geliştirme', color: '#059669', icon: 'Code2' },
      image_creation: { tr: 'Görsel & Midjourney / DALL-E', color: '#ec4899', icon: 'Image' },
      workflows: { tr: 'İş Akışları & Otomasyon', color: '#d97706', icon: 'Cpu' },
      claude_code: { tr: 'Claude & LLM Kodlama', color: '#f97316', icon: 'Bot' },
    };

    try {
      const raw = JSON.parse(fs.readFileSync(sampleFile, 'utf-8'));
      const existingTitles = new Set(this.getPrompts(userId).map((p) => p.title.toLowerCase()));
      const now = new Date().toISOString();
      let importedCount = 0;

      for (const [key, promptList] of Object.entries(raw)) {
        if (!Array.isArray(promptList)) continue;
        const catInfo = CATEGORY_MAP[key] || { tr: key, color: '#6366f1', icon: 'Folder' };

        // Ensure category exists for user
        if (!this.data.categories.some((c) => c.name === catInfo.tr)) {
          this.data.categories.push({
            id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            user_id: userId,
            name: catInfo.tr,
            icon: catInfo.icon,
            color: catInfo.color,
          });
        }

        for (const item of promptList as any[]) {
          if (!item.title || !item.prompt) continue;
          if (existingTitles.has(item.title.toLowerCase().trim())) continue;

          // Generate tags from key, title words
          const tags: string[] = [key.replace(/_/g, '-')];
          if (catInfo.tr.includes('&')) {
            catInfo.tr.split('&').forEach((part) => {
              const t = part.trim().toLowerCase().replace(/\s+/g, '-');
              if (t && !tags.includes(t)) tags.push(t);
            });
          }

          const bilingualTitle = getBilingualTitle(item.title.trim());
          const newPrompt: DBPrompt = {
            id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            user_id: userId,
            title: bilingualTitle,
            description: `${catInfo.tr} alanında optimize edilmiş hazır master prompt şablonu.`,
            content: item.prompt.trim(),
            category: catInfo.tr,
            tags: tags.slice(0, 5),
            is_favorite: false,
            copy_count: Math.floor(Math.random() * 5),
            created_at: now,
            updated_at: now,
          };

          this.data.prompts.push(newPrompt);
          existingTitles.add(item.title.toLowerCase().trim());
          importedCount++;
        }
      }

      this.save();
      return { count: importedCount, total: this.getPrompts(userId).length };
    } catch (err) {
      console.error('Error loading sample pack:', err);
      return { count: 0, total: this.getPrompts(userId).length };
    }
  }
}

export const db = new LocalDB();

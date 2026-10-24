import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db, type DBUser, type DBPrompt } from './src/server/db';
import { authMiddleware, generateToken, type AuthRequest } from './src/server/auth';
import { filterPrompts, sanitizeTags } from './src/utils/prompt-utils';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Ad, e-posta ve şifre zorunludur.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Bu e-posta adresi zaten kayıtlı.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser: DBUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: email.trim().toLowerCase(),
      password_hash,
      name: name.trim(),
      created_at: new Date().toISOString(),
    };

    db.createUser(newUser);
    const token = generateToken(newUser);

    return res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        created_at: newUser.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Kayıt işlemi sırasında bir hata oluştu.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre zorunludur.' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }

    const token = generateToken(user);
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Giriş işlemi sırasında bir hata oluştu.' });
  }
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
    },
  });
});

// Prompt Routes (Protected)
app.get('/api/prompts', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { search, category, tag, onlyFavorites, onlyFillable, sortBy } = req.query;

  const userPrompts = db.getPrompts(userId);
  const filtered = filterPrompts(userPrompts, {
    searchQuery: typeof search === 'string' ? search : undefined,
    category: typeof category === 'string' ? category : undefined,
    tag: typeof tag === 'string' ? tag : undefined,
    onlyFavorites: onlyFavorites === 'true',
    onlyFillable: onlyFillable === 'true',
    sortBy: sortBy as any,
  });

  res.json(filtered);
});

app.post('/api/prompts/load-sample-pack', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const result = db.loadSamplePack(userId);
  res.json({
    success: true,
    count: result.count,
    total: result.total,
    message: `${result.count} adet yeni master prompt kütüphanenize başarıyla eklendi (Toplam: ${result.total}).`,
  });
});

app.post('/api/prompts', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { title, description, content, category, tags, is_favorite } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Başlık ve prompt içeriği zorunludur.' });
  }

  const cleanTags = sanitizeTags(tags || []);
  const now = new Date().toISOString();

  const newPrompt: DBPrompt = {
    id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    title: title.trim(),
    description: (description || '').trim(),
    content: content.trim(),
    category: category || 'Genel',
    tags: cleanTags,
    is_favorite: Boolean(is_favorite),
    copy_count: 0,
    created_at: now,
    updated_at: now,
  };

  db.createPrompt(newPrompt);
  res.status(201).json(newPrompt);
});

app.get('/api/prompts/recent', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 3;
  const recent = db.getRecentCopiedPrompts(userId, limit);
  res.json(recent);
});

app.get('/api/prompts/:id', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const prompt = db.getPromptById(req.params.id, userId);
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt bulunamadı.' });
  }
  res.json(prompt);
});

app.put('/api/prompts/:id', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { title, description, content, category, tags, is_favorite } = req.body;

  const updates: Partial<DBPrompt> = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description.trim();
  if (content !== undefined) updates.content = content.trim();
  if (category !== undefined) updates.category = category;
  if (tags !== undefined) updates.tags = sanitizeTags(tags);
  if (is_favorite !== undefined) updates.is_favorite = Boolean(is_favorite);

  const updated = db.updatePrompt(req.params.id, userId, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Prompt bulunamadı veya güncelleme yetkiniz yok.' });
  }

  res.json(updated);
});

app.delete('/api/prompts/:id', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const success = db.deletePrompt(req.params.id, userId);
  if (!success) {
    return res.status(404).json({ error: 'Prompt bulunamadı veya silme yetkiniz yok.' });
  }
  res.json({ success: true, message: 'Prompt başarıyla silindi.' });
});

app.post('/api/prompts/:id/favorite', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const is_favorite = db.toggleFavorite(req.params.id, userId);
  if (is_favorite === null) {
    return res.status(404).json({ error: 'Prompt bulunamadı.' });
  }
  res.json({ is_favorite });
});

app.post('/api/prompts/:id/copy', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const copy_count = db.incrementCopyCount(req.params.id, userId);
  const prompt = db.getPromptById(req.params.id, userId);
  res.json({ copy_count, last_copied_at: prompt?.last_copied_at });
});

app.post('/api/prompts/:id/revert', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { version } = req.body;
  if (typeof version !== 'number') {
    return res.status(400).json({ error: 'Geçersiz sürüm numarası.' });
  }

  const reverted = db.revertPrompt(req.params.id, userId, version);
  if (!reverted) {
    return res.status(404).json({ error: 'İlgili sürüm veya prompt bulunamadı.' });
  }

  res.json({
    success: true,
    prompt: reverted,
    message: `Prompt başarıyla Sürüm ${version} durumuna geri yüklendi.`,
  });
});

app.post('/api/prompts/:id/snapshot', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { summary } = req.body;
  const updated = db.createPromptSnapshot(req.params.id, userId, summary);
  if (!updated) {
    return res.status(404).json({ error: 'Prompt bulunamadı.' });
  }
  res.json({
    success: true,
    prompt: updated,
    message: 'Mevcut sürüm noktası geçmişe kaydedildi.',
  });
});

// Categories Routes
app.get('/api/categories', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const categories = db.getCategories(userId);
  res.json(categories);
});

app.post('/api/categories', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { name, icon, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Kategori adı zorunludur.' });
  }

  const newCategory = {
    id: `cat-${Date.now()}`,
    user_id: userId,
    name: name.trim(),
    icon: icon || 'Folder',
    color: color || '#6366f1',
  };

  db.createCategory(newCategory);
  res.status(201).json(newCategory);
});

app.delete('/api/categories/:id', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const success = db.deleteCategory(req.params.id, userId);
  if (!success) {
    return res.status(404).json({ error: 'Kategori bulunamadı veya varsayılan kategori silinemez.' });
  }
  res.json({ success: true });
});

// Tags Route
app.get('/api/tags', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const tags = db.getTags(userId);
  res.json(tags);
});

// Library Stats Route
app.get('/api/stats', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const stats = db.getLibraryStats(userId);
  res.json(stats);
});

// Export & Import Routes
app.get('/api/export', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const prompts = db.getPrompts(userId);
  const categories = db.getCategories(userId);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="master-prompts-${Date.now()}.json"`);
  res.json({
    version: '1.0',
    export_date: new Date().toISOString(),
    prompts,
    categories,
  });
});

app.post('/api/import', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { prompts } = req.body;
  if (!Array.isArray(prompts)) {
    return res.status(400).json({ error: 'Geçersiz içe aktarma formatı.' });
  }

  let count = 0;
  const now = new Date().toISOString();
  for (const item of prompts) {
    if (item.title && item.content) {
      const newPrompt: DBPrompt = {
        id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        title: String(item.title).trim(),
        description: String(item.description || '').trim(),
        content: String(item.content).trim(),
        category: String(item.category || 'Genel').trim(),
        tags: sanitizeTags(item.tags || []),
        is_favorite: Boolean(item.is_favorite),
        copy_count: Number(item.copy_count) || 0,
        created_at: item.created_at || now,
        updated_at: now,
      };
      db.createPrompt(newPrompt);
      count++;
    }
  }

  res.json({ success: true, count, message: `${count} adet prompt başarıyla içe aktarıldı.` });
});

// Health / status endpoint
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'online',
    app: 'Master Prompt Kütüphanesi',
    version: '1.0.0',
    hasSupabaseEnv: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
  });
});

// Vite Middleware for development & Static hosting for production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();

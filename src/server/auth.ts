import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, type DBUser } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'prompthub-master-secret-key-2026';

export interface AuthRequest extends Request {
  user?: DBUser;
}

export function generateToken(user: DBUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli. Lütfen giriş yapın.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Kullanıcı bulunamadı veya oturum süresi dolmuş.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş oturum anahtarı.' });
  }
}

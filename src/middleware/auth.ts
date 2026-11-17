import { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifySessionToken } from '../lib/crypto.ts';
import { getOrCreateFirebaseUser, getUserByUid } from '../db/repository.ts';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
  subscriptionPlan: string;
  active: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

async function resolveUserFromAuthHeader(authHeader?: string): Promise<AuthenticatedUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  if (token.startsWith('ta.')) {
    const payload = verifySessionToken(token);
    if (!payload) return null;
    const dbUser = await getUserByUid(payload.uid);
    if (!dbUser || !dbUser.active) return null;
    return {
      id: dbUser.id,
      uid: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      subscriptionPlan: dbUser.subscriptionPlan,
      active: dbUser.active,
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const dbUser = await getOrCreateFirebaseUser(
      decoded.uid,
      decoded.email || `${decoded.uid}@tribunaalmense.local`,
      decoded.name || decoded.email?.split('@')[0] || 'Usuário'
    );
    if (!dbUser.active) return null;
    return {
      id: dbUser.id,
      uid: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      subscriptionPlan: dbUser.subscriptionPlan,
      active: dbUser.active,
    };
  } catch {
    return null;
  }
}

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const user = await resolveUserFromAuthHeader(req.headers.authorization);
    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore optional auth resolution errors
  }
  next();
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await resolveUserFromAuthHeader(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Não autorizado: token inválido ou ausente.' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(401).json({ error: 'Falha na verificação de autenticação.' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Sessão administrativa necessária.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissão insuficiente para esta operação.' });
    }
    next();
  };
};

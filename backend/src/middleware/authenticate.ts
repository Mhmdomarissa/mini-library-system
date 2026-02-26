import type { Request, Response, NextFunction } from 'express';
import getFirebaseAdmin from '../config/firebase';
import { User } from '../models/User';
import logger from '../utils/logger';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await getFirebaseAdmin().auth().verifyIdToken(token);

    // Use atomic findOneAndUpdate (upsert) to eliminate the find → create
    // race condition. Two concurrent first-logins for the same UID will both
    // hit this path; MongoDB guarantees only one document is created.
    // SECURITY: role is NEVER taken from the token — always defaults to 'member'.
    const user = await User.findOneAndUpdate(
      { firebaseUid: decoded.uid },
      {
        $setOnInsert: {
          firebaseUid: decoded.uid,
          // Only trust email/name from the verified Firebase token, never from req.body
          email: decoded.email ?? '',
          name: decoded.name?.trim() || decoded.email || 'Unknown',
          role: 'member', // hard-coded — client can never influence this
          isActive: true,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );

    if (!user) {
      // Should never happen after a successful upsert, but guard anyway
      res.status(500).json({ message: 'Internal server error' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Account is deactivated' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    // Log only the error message — never log the raw token or decoded payload
    const message = error instanceof Error ? error.message : 'Unknown auth error';
    logger.warn('Authentication failed', { message });
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

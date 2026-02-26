import type { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase';
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
    const decoded = await admin.auth().verifyIdToken(token);

    let user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email ?? '',
        name: decoded.name ?? decoded.email ?? 'Unknown',
        role: 'member',
        isActive: true,
      });
      logger.info(`New user created: ${user.email}`);
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Account is deactivated' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication failed:', error);
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

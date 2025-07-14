import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name?: string;
      plan: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
      usageCount: number;
      profile?: any;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  
  return res.status(401).json({
    success: false,
    error: 'Authentication required'
  });
};

export const requirePlan = (plans: ('FREE' | 'PREMIUM' | 'ENTERPRISE')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!plans.includes(req.user.plan)) {
      return res.status(403).json({
        success: false,
        error: 'Upgrade your plan to access this feature'
      });
    }

    return next();
  };
};

export const checkUsageLimit = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'User not found'
    });
  }

  // Define usage limits
  const limits = {
    FREE: 5,
    PREMIUM: 100,
    ENTERPRISE: -1 // Unlimited
  };

  const limit = limits[user.plan];
  
  if (limit !== -1 && user.usageCount >= limit) {
    return res.status(429).json({
      success: false,
      error: 'Usage limit exceeded. Please upgrade your plan.',
      usageCount: user.usageCount,
      limit
    });
  }

  return next();
};

export const incrementUsage = async (userId: string, incrementBy = 1) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      usageCount: {
        increment: incrementBy
      }
    }
  });
};
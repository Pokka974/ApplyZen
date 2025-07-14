import express from 'express';
import bcrypt from 'bcrypt';
import passport from '../config/passport';
import { prisma } from '../config/database';
import { emailService } from '../services/emailService';
import { ApiResponse } from '@./shared-types';

const router = express.Router();

// Local Registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      } as ApiResponse);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      } as ApiResponse);
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || '',
        passwordHash,
        emailVerified: false
      },
      include: { profile: true }
    });

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, user.name || '', user.id);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email sending fails
    }

    // Return success without auto-login (user needs to verify email first)
    return res.json({
      success: true,
      message: 'Compte créé avec succès ! Vérifiez votre email pour activer votre compte.',
      data: {
        emailSent: true,
        email: user.email
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    } as ApiResponse);
  }
});

// Local Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Login failed'
      } as ApiResponse);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: info?.message || 'Invalid credentials'
      } as ApiResponse);
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Login failed'
        } as ApiResponse);
      }

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            usageCount: user.usageCount,
            profile: user.profile
          }
        }
      } as ApiResponse);
    });
  })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    } as ApiResponse);
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    } as ApiResponse);
  }

  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        plan: req.user.plan,
        usageCount: req.user.usageCount,
        profile: req.user.profile
      }
    }
  } as ApiResponse);
});

// Email verification
router.get('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing verification token or email'
      } as ApiResponse);
    }

    const isVerified = await emailService.verifyEmail(token as string, email as string);

    if (isVerified) {
      // Redirect to success page or extension
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/email-verified?success=true`);
    } else {
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/email-verified?success=false`);
    }
  } catch (error) {
    console.error('Email verification error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/email-verified?success=false`);
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      } as ApiResponse);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse);
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      } as ApiResponse);
    }

    await emailService.sendVerificationEmail(user.email, user.name || '', user.id);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email'
    } as ApiResponse);
  }
});

// Google OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/auth-failed' }),
  (req, res) => {
    // Successful authentication - redirect to a success page
    res.redirect('/auth-success');
  }
);

// LinkedIn OAuth
router.get('/linkedin', passport.authenticate('linkedin'));

router.get('/linkedin/callback',
  passport.authenticate('linkedin', { failureRedirect: '/login?error=linkedin_failed' }),
  (req, res) => {
    // Successful authentication
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  }
);

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', {
  scope: ['email']
}));

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login?error=facebook_failed' }),
  (req, res) => {
    // Successful authentication
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  }
);

export default router;
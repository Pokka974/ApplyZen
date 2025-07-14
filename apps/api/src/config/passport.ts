import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import bcrypt from 'bcrypt';
import { prisma } from './database';

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy (Email/Password)
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { profile: true }
      });

      if (!user || !user.passwordHash) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      if (!user.emailVerified) {
        return done(null, false, { message: 'Please verify your email before logging in. Check your inbox for the verification link.' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google OAuth callback received:', { 
          id: profile.id, 
          email: profile.emails?.[0]?.value 
        });

        // Check if user exists with this Google ID
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id },
          include: { profile: true }
        });

        if (user) {
          console.log('Found existing user with Google ID');
          return done(null, user);
        }

        // Check if user exists with this email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { profile: true }
          });

          if (user) {
            // Link Google account to existing user
            console.log('Linking Google account to existing user');
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id },
              include: { profile: true }
            });
            return done(null, user);
          }
        }

        // Create new user
        console.log('Creating new user from Google OAuth');
        user = await prisma.user.create({
          data: {
            email: email?.toLowerCase() || `google_${profile.id}@placeholder.com`,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
            googleId: profile.id,
            emailVerified: true
          },
          include: { profile: true }
        });

        console.log('Created new user:', user.id);
        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error);
      }
    }
  ));
} else {
  console.warn('Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

// LinkedIn OAuth Strategy
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: '/api/auth/linkedin/callback',
      scope: ['r_emailaddress', 'r_liteprofile']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists with this LinkedIn ID
        let user = await prisma.user.findUnique({
          where: { linkedinId: profile.id },
          include: { profile: true }
        });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with this email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { profile: true }
          });

          if (user) {
            // Link LinkedIn account to existing user
            user = await prisma.user.update({
              where: { id: user.id },
              data: { linkedinId: profile.id },
              include: { profile: true }
            });
            return done(null, user);
          }
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            email: email?.toLowerCase() || '',
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
            linkedinId: profile.id,
            emailVerified: true
          },
          include: { profile: true }
        });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
}

// Facebook OAuth Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: '/api/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name', 'picture.type(large)']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists with this Facebook ID
        let user = await prisma.user.findUnique({
          where: { facebookId: profile.id },
          include: { profile: true }
        });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with this email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { profile: true }
          });

          if (user) {
            // Link Facebook account to existing user
            user = await prisma.user.update({
              where: { id: user.id },
              data: { facebookId: profile.id },
              include: { profile: true }
            });
            return done(null, user);
          }
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            email: email?.toLowerCase() || '',
            name: `${profile.name?.givenName} ${profile.name?.familyName}`,
            avatar: profile.photos?.[0]?.value,
            facebookId: profile.id,
            emailVerified: true
          },
          include: { profile: true }
        });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
}

export default passport;
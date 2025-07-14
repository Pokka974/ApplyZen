import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    // For development, we'll use a fake SMTP service like Ethereal
    // In production, you'd use a real service like SendGrid, Mailgun, etc.

    if (
      process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS
    ) {
      // Production email configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      // Development: Create a test account with Ethereal
      console.warn(
        'Email service: Using development mode (no emails will be sent)'
      );
      console.log(
        'To configure email, set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env'
      );
    }
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    userId: string
  ): Promise<string> {
    const verificationToken = uuidv4();
    const verificationUrl = `${
      process.env.CLIENT_URL || 'http://localhost:3000'
    }/verify-email?token=${verificationToken}&email=${encodeURIComponent(
      email
    )}`;

    // Store verification token in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        // We'll add these fields to the user model
        verificationToken,
        verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const emailHtml = this.createVerificationEmailTemplate(
      name,
      verificationUrl
    );

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.EMAIL_FROM || 'ApplyZen <noreply@applyzen.com>',
          to: email,
          subject: 'Confirmez votre adresse email - ApplyZen',
          html: emailHtml,
        });
        console.log(`Verification email sent to ${email}`);
      } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
      }
    } else {
      // Development mode: just log the verification URL
      console.log('\n=== EMAIL VERIFICATION (DEV MODE) ===');
      console.log(`To: ${email}`);
      console.log(`Verification URL: ${verificationUrl}`);
      console.log('=====================================\n');
    }

    return verificationToken;
  }

  async verifyEmail(token: string, email: string): Promise<boolean> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          verificationToken: token,
          verificationExpiry: {
            gt: new Date(), // Token not expired
          },
        },
      });

      if (!user) {
        return false;
      }

      // Mark email as verified and clear verification data
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationExpiry: null,
        },
      });

      return true;
    } catch (error) {
      console.error('Error verifying email:', error);
      return false;
    }
  }

  private createVerificationEmailTemplate(
    name: string,
    verificationUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmez votre email - ApplyZen</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            padding: 40px 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            color: rgba(255, 255, 255, 0.9);
            margin: 10px 0 0 0;
          }
          .content {
            padding: 0 20px;
          }
          .verification-btn {
            display: inline-block;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            transition: background-color 0.2s;
          }
          .verification-btn:hover {
            background: #2563eb;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .warning {
            background: #fef3cd;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📄 ApplyZen</h1>
          <p>Générateur de candidatures IA</p>
        </div>
        
        <div class="content">
          <h2>Bonjour ${name || 'cher utilisateur'} ! 👋</h2>
          
          <p>Bienvenue sur ApplyZen ! Pour commencer à générer des CV et lettres de motivation personnalisés, vous devez confirmer votre adresse email.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" class="verification-btn">
              ✅ Confirmer mon email
            </a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important :</strong> Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte ApplyZen, vous pouvez ignorer cet email.
          </div>
          
          <p>Une fois votre email confirmé, vous pourrez :</p>
          <ul>
            <li>🎯 Générer des CV personnalisés pour chaque offre</li>
            <li>✍️ Créer des lettres de motivation adaptées</li>
            <li>📊 Suivre l'historique de vos candidatures</li>
            <li>⚡ Économiser des heures de travail</li>
          </ul>
          
          <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
          <p style="word-break: break-all; color: #3b82f6; font-family: monospace; background: #f3f4f6; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
        </div>
        
        <div class="footer">
          <p>Cet email a été envoyé par ApplyZen. Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
          <p>© 2024 ApplyZen - Votre assistant IA pour les candidatures</p>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();

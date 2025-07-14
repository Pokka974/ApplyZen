import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { DocumentGenerationRequest, ApiResponse, DocumentsResponse } from '@./shared-types';
import { generateDocuments } from './services/documentGenerator';
import { detectLanguage } from './utils/languageDetection';
import { parseCVWithAI } from './services/cvParser';
import { generatePDF, generateDOCX } from './services/documentExporter';
import passport from './config/passport';
import { requireAuth, checkUsageLimit, incrementUsage } from './middleware/auth';
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import templateRoutes from './routes/templates';
import { JobService } from './services/jobService';

// Load environment variables
dotenv.config();

const app = express();

// Configure session store
const PgSession = ConnectPgSimple(session);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'applyzen.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/templates', templateRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth success/failure pages
app.get('/auth-success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Success - ApplyZen</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 100px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          margin: 0;
        }
        .container {
          max-width: 400px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }
        h1 { margin-bottom: 20px; }
        p { margin-bottom: 30px; line-height: 1.6; }
        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ Authentification réussie!</h1>
        <p>Vous êtes maintenant connecté à ApplyZen. Vous pouvez fermer cette page et retourner à l'extension.</p>
        <button class="close-btn" onclick="window.close()">Fermer cette page</button>
      </div>
      <script>
        // Auto-close after 3 seconds
        setTimeout(() => {
          window.close();
        }, 3000);
      </script>
    </body>
    </html>
  `);
});

app.get('/auth-failed', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Failed - ApplyZen</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 100px 20px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          margin: 0;
        }
        .container {
          max-width: 400px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }
        h1 { margin-bottom: 20px; }
        p { margin-bottom: 30px; line-height: 1.6; }
        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>❌ Échec de l'authentification</h1>
        <p>Une erreur s'est produite lors de la connexion. Veuillez réessayer.</p>
        <button class="close-btn" onclick="window.close()">Fermer cette page</button>
      </div>
      <script>
        // Auto-close after 5 seconds
        setTimeout(() => {
          window.close();
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

app.post('/api/generate', requireAuth, checkUsageLimit, async (req, res) => {
  try {
    const { jobData, profile, type, templateId }: DocumentGenerationRequest = req.body;

    if (!jobData || !profile || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: jobData, profile, type'
      } as ApiResponse);
    }

    // Detect language from job data
    const language = detectLanguage(jobData.description, jobData.title);
    
    console.log(`Generating ${type} in ${language} for job: ${jobData.title} at ${jobData.company}`);

    // Check if documents already exist for this job with the same template
    const existingDocs = await JobService.getExistingDocuments(
      req.user!.id,
      jobData.title,
      jobData.company,
      type,
      templateId
    );

    if (existingDocs.length > 0) {
      // Return existing documents instead of generating new ones
      const existingResult: DocumentsResponse = { success: true };
      
      for (const doc of existingDocs) {
        if (doc.type === 'CV') {
          existingResult.cv = {
            content: doc.content,
            type: 'cv',
            language: doc.language.toLowerCase() as any,
            wordCount: doc.wordCount,
            generatedAt: doc.generatedAt.toISOString()
          };
        } else if (doc.type === 'COVER_LETTER') {
          existingResult.coverLetter = {
            content: doc.content,
            type: 'cover-letter',
            language: doc.language.toLowerCase() as any,
            wordCount: doc.wordCount,
            generatedAt: doc.generatedAt.toISOString()
          };
        }
      }

      return res.json({
        success: true,
        data: existingResult,
        message: 'Retrieved existing documents'
      } as ApiResponse<DocumentsResponse>);
    }

    // Generate documents
    const result = await generateDocuments({
      jobData,
      profile,
      type,
      language,
      templateId
    });

    // Save job and documents to database
    const jobId = await JobService.saveJob(req.user!.id, jobData);
    await JobService.saveDocuments(req.user!.id, jobId, result, templateId);

    // Increment user usage count based on documents generated
    const documentsGenerated = (result.cv ? 1 : 0) + (result.coverLetter ? 1 : 0);
    await incrementUsage(req.user!.id, documentsGenerated);

    res.json({
      success: true,
      data: result
    } as ApiResponse<DocumentsResponse>);

  } catch (error) {
    console.error('Document generation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = errorMessage.includes('API Error: 401') ? 401 :
                      errorMessage.includes('API Error: 429') ? 429 : 500;

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    } as ApiResponse);
  }
});

app.post('/api/parse-cv', async (req, res) => {
  try {
    const { cvText } = req.body;
    
    if (!cvText) {
      return res.status(400).json({
        success: false,
        error: 'CV text is required'
      } as ApiResponse);
    }

    console.log('Parsing CV text with AI...');
    
    // Parse CV using OpenAI
    const parsedData = await parseCVWithAI(cvText);
    
    res.json({
      success: true,
      data: parsedData
    } as ApiResponse);

  } catch (error) {
    console.error('CV parsing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'CV parsing failed'
    } as ApiResponse);
  }
});

app.post('/api/parse-pdf', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file provided'
      } as ApiResponse);
    }

    console.log('Extracting text from PDF...');
    
    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const cvText = pdfData.text;
    
    if (!cvText || cvText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract text from PDF. The file may be image-based or corrupted.'
      } as ApiResponse);
    }

    console.log('Parsing CV text with AI...');
    
    // Parse CV using OpenAI
    const parsedData = await parseCVWithAI(cvText);
    
    res.json({
      success: true,
      data: parsedData
    } as ApiResponse);

  } catch (error) {
    console.error('PDF parsing error:', error);
    
    let errorMessage = 'PDF parsing failed';
    if (error instanceof Error) {
      if (error.message.includes('Only PDF files are allowed')) {
        errorMessage = 'Only PDF files are allowed';
      } else if (error.message.includes('File too large')) {
        errorMessage = 'File is too large (max 10MB)';
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    } as ApiResponse);
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    // TODO: Save profile to database
    // For now, just return success
    res.json({
      success: true,
      message: 'Profile saved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Profile save error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save profile'
    } as ApiResponse);
  }
});

app.get('/api/profile/:userId', async (req, res) => {
  try {
    // TODO: Get profile from database
    res.json({
      success: true,
      data: null
    } as ApiResponse);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    } as ApiResponse);
  }
});

app.post('/api/export/pdf', async (req, res) => {
  try {
    const { content, fileName } = req.body;
    
    if (!content || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Content and fileName are required'
      } as ApiResponse);
    }

    console.log('Generating PDF for:', fileName);
    
    const pdfBuffer = await generatePDF(content, fileName);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
      'Cache-Control': 'no-cache'
    });
    
    res.end(pdfBuffer, 'binary');
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'PDF generation failed'
    } as ApiResponse);
  }
});

app.post('/api/export/docx', async (req, res) => {
  try {
    const { content, fileName } = req.body;
    
    if (!content || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Content and fileName are required'
      } as ApiResponse);
    }

    console.log('Generating DOCX for:', fileName);
    
    const docxBuffer = await generateDOCX(content, fileName);
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}.docx"`,
      'Content-Length': docxBuffer.length
    });
    
    res.send(docxBuffer);
    
  } catch (error) {
    console.error('DOCX generation error:', error);
    res.status(500).json({
      success: false,
      error: 'DOCX generation failed'
    } as ApiResponse);
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  } as ApiResponse);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  } as ApiResponse);
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`🚀 ApplyZen API server listening at http://localhost:${port}`);
  console.log(`📄 Health check: http://localhost:${port}/api/health`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

export default app;
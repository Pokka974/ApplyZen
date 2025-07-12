import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { DocumentGenerationRequest, ApiResponse, DocumentsResponse } from '@./shared-types';
import { generateDocuments } from './services/documentGenerator';
import { detectLanguage } from './utils/languageDetection';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/generate', async (req, res) => {
  try {
    const { jobData, profile, type }: DocumentGenerationRequest = req.body;

    if (!jobData || !profile || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: jobData, profile, type'
      } as ApiResponse);
    }

    // Detect language from job data
    const language = detectLanguage(jobData.description, jobData.title);
    
    console.log(`Generating ${type} in ${language} for job: ${jobData.title} at ${jobData.company}`);

    // Generate documents
    const result = await generateDocuments({
      jobData,
      profile,
      type,
      language
    });

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
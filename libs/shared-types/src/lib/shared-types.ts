// Job Data Types
export interface JobData {
  title: string;
  company: string;
  logo?: string;
  location: string;
  contractTypes?: string[];
  description: string;
  missions?: string;
  requirements?: string;
  benefits?: string;
  candidates?: string;
  companySector?: string;
  companySize?: string[];
  companyDescription?: string;
}

// User Profile Types
export interface WorkExperience {
  jobTitle: string;
  company: string;
  startDate: string; // Format: YYYY-MM
  endDate: string; // Format: YYYY-MM or empty for current
  responsibilities: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  currentTitle: string;
  experience: ExperienceLevel;
  skills: string;
  summary: string;
  education: string;
  languages: string;
  openaiKey?: string;
  experiences?: WorkExperience[];
  updatedAt?: string;
}

export type ExperienceLevel = '0-1' | '1-3' | '3-5' | '5-10' | '10+';

// Document Generation Types
export interface DocumentGenerationRequest {
  jobData: JobData;
  profile: UserProfile;
  type: DocumentType;
}

export type DocumentType = 'cv' | 'cover-letter' | 'both';

export interface GeneratedDocument {
  content: string;
  type: DocumentType;
  language: SupportedLanguage;
  wordCount: number;
  generatedAt: string;
}

export interface DocumentsResponse {
  cv?: GeneratedDocument;
  coverLetter?: GeneratedDocument;
  success: boolean;
  error?: string;
}

// Language Support Types
export type SupportedLanguage = 'french' | 'english' | 'german' | 'spanish';

export interface LanguageInstructions {
  cvInstruction: string;
  coverLetterInstruction: string;
  styleInstruction: string;
  systemMessage: string;
}

// Chrome Extension Message Types
export interface ChromeMessage {
  action: ChromeMessageAction;
  data?: any;
  tabId?: number;
}

export type ChromeMessageAction = 
  | 'scrapeJob'
  | 'jobPageDetected'
  | 'generateCV'
  | 'generateCoverLetter'
  | 'generateBoth'
  | 'saveProfile'
  | 'getProfile';

export interface ScrapeJobResponse {
  success: boolean;
  data?: JobData;
  error?: string;
}

// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// Database Entity Types
export interface SavedJob {
  id: string;
  userId: string;
  jobData: JobData;
  appliedAt?: string;
  status: ApplicationStatus;
  generatedDocuments?: GeneratedDocument[];
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus = 'pending' | 'applied' | 'interview' | 'rejected' | 'accepted';

// Configuration Types
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AppConfig {
  openai: OpenAIConfig;
  database: {
    url: string;
  };
  auth: {
    jwtSecret: string;
    tokenExpiry: string;
  };
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export type ErrorCode = 
  | 'INVALID_JOB_DATA'
  | 'PROFILE_NOT_FOUND'
  | 'GENERATION_FAILED'
  | 'API_ERROR'
  | 'AUTH_FAILED'
  | 'SCRAPING_FAILED'
  | 'INVALID_LANGUAGE'
  | 'FILE_PROCESSING_ERROR';

// Download Types
export interface DownloadOptions {
  format: DownloadFormat;
  fileName: string;
}

export type DownloadFormat = 'markdown' | 'docx' | 'pdf';

// Analytics Types
export interface UsageMetrics {
  userId: string;
  action: AnalyticsAction;
  jobId?: string;
  documentType?: DocumentType;
  language?: SupportedLanguage;
  success: boolean;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type AnalyticsAction = 
  | 'job_scraped'
  | 'document_generated'
  | 'document_downloaded'
  | 'profile_updated'
  | 'login'
  | 'register';
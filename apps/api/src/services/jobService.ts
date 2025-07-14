import { prisma } from '../config/database';
import { JobData, DocumentType, SupportedLanguage, GeneratedDocument } from '@./shared-types';

export class JobService {
  
  // Save or get existing job
  static async saveJob(userId: string, jobData: JobData, sourceUrl?: string): Promise<string> {
    try {
      // Check if job already exists for this user
      const existingJob = await prisma.job.findFirst({
        where: {
          userId,
          title: jobData.title,
          company: jobData.company
        }
      });

      if (existingJob) {
        return existingJob.id;
      }

      // Create new job
      const job = await prisma.job.create({
        data: {
          userId,
          title: jobData.title,
          company: jobData.company,
          logo: jobData.logo,
          location: jobData.location,
          contractTypes: jobData.contractTypes || [],
          description: jobData.description,
          missions: jobData.missions,
          requirements: jobData.requirements,
          benefits: jobData.benefits,
          candidates: jobData.candidates,
          companySector: jobData.companySector,
          companySize: jobData.companySize || [],
          companyDescription: jobData.companyDescription,
          sourceUrl,
          platform: 'LINKEDIN' // Default to LinkedIn for now
        }
      });

      return job.id;
    } catch (error) {
      console.error('Error saving job:', error);
      throw new Error('Failed to save job');
    }
  }

  // Save generated documents
  static async saveDocuments(userId: string, jobId: string, documents: {
    cv?: GeneratedDocument;
    coverLetter?: GeneratedDocument;
  }): Promise<void> {
    try {
      const documentsToSave = [];

      if (documents.cv) {
        documentsToSave.push({
          userId,
          jobId,
          type: 'CV' as const,
          content: documents.cv.content,
          language: documents.cv.language.toUpperCase() as any,
          wordCount: documents.cv.wordCount
        });
      }

      if (documents.coverLetter) {
        documentsToSave.push({
          userId,
          jobId,
          type: 'COVER_LETTER' as const,
          content: documents.coverLetter.content,
          language: documents.coverLetter.language.toUpperCase() as any,
          wordCount: documents.coverLetter.wordCount
        });
      }

      await prisma.document.createMany({
        data: documentsToSave
      });
    } catch (error) {
      console.error('Error saving documents:', error);
      throw new Error('Failed to save documents');
    }
  }

  // Get user's job history
  static async getUserJobs(userId: string, limit = 20, offset = 0) {
    try {
      const jobs = await prisma.job.findMany({
        where: { userId },
        include: {
          documents: {
            select: {
              id: true,
              type: true,
              language: true,
              wordCount: true,
              generatedAt: true,
              downloadCount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      const total = await prisma.job.count({
        where: { userId }
      });

      return { jobs, total };
    } catch (error) {
      console.error('Error fetching user jobs:', error);
      throw new Error('Failed to fetch job history');
    }
  }

  // Check if documents already exist for a job
  static async getExistingDocuments(userId: string, jobTitle: string, company: string, type: DocumentType) {
    try {
      const job = await prisma.job.findFirst({
        where: {
          userId,
          title: jobTitle,
          company
        },
        include: {
          documents: {
            where: {
              OR: [
                { type: type === 'both' ? 'CV' : (type === 'cover-letter' ? 'COVER_LETTER' : 'CV') },
                ...(type === 'both' ? [{ type: 'COVER_LETTER' as any }] : [])
              ]
            }
          }
        }
      });

      return job?.documents || [];
    } catch (error) {
      console.error('Error checking existing documents:', error);
      return [];
    }
  }

  // Update application status
  static async updateApplicationStatus(userId: string, jobId: string, status: 'PENDING' | 'APPLIED' | 'INTERVIEW' | 'REJECTED' | 'ACCEPTED') {
    try {
      const updatedJob = await prisma.job.update({
        where: { 
          id: jobId,
          userId // Ensure user owns this job
        },
        data: {
          status,
          appliedAt: status === 'APPLIED' ? new Date() : undefined
        }
      });

      return updatedJob;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw new Error('Failed to update application status');
    }
  }

  // Get document by ID
  static async getDocument(userId: string, documentId: string) {
    try {
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          userId
        },
        include: {
          job: {
            select: {
              title: true,
              company: true
            }
          }
        }
      });

      if (document) {
        // Increment download count
        await prisma.document.update({
          where: { id: documentId },
          data: {
            downloadCount: {
              increment: 1
            }
          }
        });
      }

      return document;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw new Error('Failed to fetch document');
    }
  }
}
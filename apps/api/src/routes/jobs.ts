import express from 'express';
import { requireAuth } from '../middleware/auth';
import { JobService } from '../services/jobService';
import { ApiResponse } from '@./shared-types';

const router = express.Router();

// Get user's job history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await JobService.getUserJobs(userId, limit, offset);

    res.json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching job history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job history'
    } as ApiResponse);
  }
});

// Update application status
router.patch('/:jobId/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { jobId } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'APPLIED', 'INTERVIEW', 'REJECTED', 'ACCEPTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      } as ApiResponse);
    }

    const updatedJob = await JobService.updateApplicationStatus(userId, jobId, status);

    res.json({
      success: true,
      data: updatedJob
    } as ApiResponse);
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job status'
    } as ApiResponse);
  }
});

// Get document content
router.get('/documents/:documentId', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { documentId } = req.params;

    const document = await JobService.getDocument(userId, documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: document
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document'
    } as ApiResponse);
  }
});

export default router;
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { templateEngine } from '../services/templateEngine';
import { ApiResponse, TemplateListResponse, TemplateResponse } from '@./shared-types';

const router = Router();

// GET /api/templates - List all available templates
router.get('/', requireAuth, async (req, res) => {
  try {
    const userPlan = req.user!.plan || 'FREE';
    console.log(`Fetching templates for user plan: ${userPlan}`);
    
    const templates = templateEngine.getTemplatesForUser(userPlan);
    console.log(`Found ${templates.length} templates for user:`, templates.map(t => ({ id: t.id, name: t.name, isPremium: t.isPremium })));
    
    res.json({
      success: true,
      templates
    } as TemplateListResponse);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    } as ApiResponse);
  }
});

// GET /api/templates/:id - Get specific template details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userPlan = req.user!.plan || 'FREE';
    
    const template = templateEngine.getTemplate(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      } as ApiResponse);
    }
    
    // Check if user has access to this template
    const hasAccess = templateEngine.hasTemplateAccess(id, userPlan);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Template requires premium subscription'
      } as ApiResponse);
    }
    
    res.json({
      success: true,
      template
    } as TemplateResponse);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    } as ApiResponse);
  }
});

// GET /api/templates/:id/preview - Get template preview (rendered with sample data)
router.get('/:id/preview', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userPlan = req.user!.plan || 'FREE';
    
    const template = templateEngine.getTemplate(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      } as ApiResponse);
    }
    
    // Check if user has access to this template
    const hasAccess = templateEngine.hasTemplateAccess(id, userPlan);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Template requires premium subscription'
      } as ApiResponse);
    }
    
    // Sample data for preview
    const sampleUserData = {
      fullName: 'Jean Dupont',
      email: 'jean.dupont@email.com',
      phone: '+33 1 23 45 67 89',
      location: 'Paris, France',
      currentTitle: 'Développeur Full Stack',
      experience: '3-5' as const,
      skills: '',
      summary: '',
      education: '',
      languages: ''
    };
    
    const sampleAIContent = `
# Jean Dupont

## Résumé Professionnel
Développeur Full Stack passionné avec 4 ans d'expérience dans le développement d'applications web modernes. Expert en JavaScript, React, Node.js avec une solide expérience en bases de données et déploiement cloud.

## Compétences
**Technologies Frontend:** React, Vue.js, HTML5, CSS3, JavaScript/TypeScript
**Technologies Backend:** Node.js, Express, Python, PostgreSQL, MongoDB
**Outils:** Git, Docker, AWS, Jenkins, Jest

## Expérience Professionnelle
**Développeur Full Stack Senior** - TechCorp (2022-2024)
- Développement d'applications web complexes avec React et Node.js
- Mise en place d'architectures microservices
- Amélioration des performances de 40%

**Développeur Frontend** - StartupXYZ (2020-2022)
- Création d'interfaces utilisateur modernes avec React
- Collaboration avec l'équipe UX/UI
- Intégration d'APIs REST

## Formation
**Master en Informatique** - Université Paris-Saclay (2020)
**Licence en Informatique** - Université Paris-Saclay (2018)

## Langues
- Français (Natif)
- Anglais (Courant)
- Espagnol (Intermédiaire)
    `;
    
    const renderedHtml = templateEngine.renderTemplate(id, sampleUserData, sampleAIContent);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(renderedHtml);
  } catch (error) {
    console.error('Error generating template preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate template preview'
    } as ApiResponse);
  }
});

// GET /api/templates/:id/thumbnail - Get template thumbnail image
router.get('/:id/thumbnail', async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, return a placeholder response
    // In production, you would generate or serve actual thumbnail images
    res.json({
      success: true,
      message: 'Thumbnail endpoint - to be implemented',
      templateId: id
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching template thumbnail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template thumbnail'
    } as ApiResponse);
  }
});

// GET /api/templates/:id/config - Get template configuration
router.get('/:id/config', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userPlan = req.user!.plan || 'FREE';
    
    const config = templateEngine.getTemplateConfig(id);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Template configuration not found'
      } as ApiResponse);
    }
    
    // Check if user has access to this template
    const hasAccess = templateEngine.hasTemplateAccess(id, userPlan);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Template requires premium subscription'
      } as ApiResponse);
    }
    
    res.json({
      success: true,
      data: config
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching template config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template configuration'
    } as ApiResponse);
  }
});

export default router;
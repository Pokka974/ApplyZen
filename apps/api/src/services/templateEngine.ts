import fs from 'fs';
import path from 'path';
import { 
  CvTemplate, 
  TemplateConfig, 
  TemplatePreview, 
  UserProfile, 
  TemplateCategory 
} from '@./shared-types';

export class TemplateEngine {
  private templatesDir: string;
  private templatesCache: Map<string, CvTemplate> = new Map();

  constructor() {
    // __dirname in built app points to /dist/apps/api (from the logs)
    // So we need to go up to project root and find the source templates
    const projectRoot = path.resolve(__dirname, '../../..');
    this.templatesDir = path.join(projectRoot, 'apps/api/src/templates');
    
    console.log('Template engine __dirname:', __dirname);
    console.log('Template engine projectRoot:', projectRoot);
    console.log('Template engine templatesDir:', this.templatesDir);
    
    this.loadTemplates();
  }

  /**
   * Load all templates from the templates directory
   */
  private loadTemplates(): void {
    try {
      console.log('Loading templates from:', this.templatesDir);
      
      if (!fs.existsSync(this.templatesDir)) {
        console.error('Templates directory does not exist:', this.templatesDir);
        return;
      }
      
      const templateDirs = fs.readdirSync(this.templatesDir);
      console.log('Found template directories:', templateDirs);
      
      for (const dir of templateDirs) {
        const templatePath = path.join(this.templatesDir, dir);
        const configPath = path.join(templatePath, 'config.json');
        const htmlPath = path.join(templatePath, 'template.html');
        const cssPath = path.join(templatePath, 'styles.css');
        
        console.log(`Checking template: ${dir}`);
        console.log(`  Config exists: ${fs.existsSync(configPath)}`);
        console.log(`  HTML exists: ${fs.existsSync(htmlPath)}`);
        console.log(`  CSS exists: ${fs.existsSync(cssPath)}`);
        
        if (fs.existsSync(configPath) && fs.existsSync(htmlPath) && fs.existsSync(cssPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
            const cssContent = fs.readFileSync(cssPath, 'utf-8');
            
            const template: CvTemplate = {
              id: config.id,
              name: config.name,
              description: config.description,
              previewUrl: `/api/templates/${config.id}/preview`,
              category: config.category,
              isPremium: config.isPremium,
              htmlContent,
              cssContent,
              placeholders: config.placeholders?.map((p: any) => p.key) || [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            this.templatesCache.set(config.id, template);
            console.log(`  ✓ Loaded template: ${config.name} (${config.id})`);
          } catch (error) {
            console.error(`  ✗ Failed to load template ${dir}:`, error);
          }
        } else {
          console.log(`  ✗ Missing files for template: ${dir}`);
        }
      }
      
      console.log(`Successfully loaded ${this.templatesCache.size} CV templates`);
      console.log('Available templates:', Array.from(this.templatesCache.keys()));
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  /**
   * Get all available templates as previews
   */
  public getTemplatesPreviews(): TemplatePreview[] {
    const previews: TemplatePreview[] = [];
    
    for (const [id, template] of this.templatesCache) {
      const configPath = path.join(this.templatesDir, id, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      previews.push({
        id: template.id,
        name: template.name,
        description: template.description,
        previewUrl: template.previewUrl,
        thumbnailUrl: `/api/templates/${id}/thumbnail`,
        category: template.category,
        isPremium: template.isPremium,
        features: config.features || []
      });
    }
    
    return previews.sort((a, b) => {
      // Sort by premium status (free first) then by name
      if (a.isPremium !== b.isPremium) {
        return a.isPremium ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get a specific template by ID
   */
  public getTemplate(id: string): CvTemplate | null {
    return this.templatesCache.get(id) || null;
  }

  /**
   * Get template config by ID
   */
  public getTemplateConfig(id: string): TemplateConfig | null {
    try {
      const configPath = path.join(this.templatesDir, id, 'config.json');
      if (!fs.existsSync(configPath)) {
        return null;
      }
      
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config;
    } catch (error) {
      console.error(`Error loading template config for ${id}:`, error);
      return null;
    }
  }

  /**
   * Render a template with user data
   */
  public renderTemplate(templateId: string, userData: UserProfile, aiGeneratedContent: string): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let htmlContent = template.htmlContent;
    
    // Replace CSS placeholder
    htmlContent = htmlContent.replace('{{css}}', template.cssContent);
    
    // Replace basic user data placeholders
    htmlContent = htmlContent.replace(/{{fullName}}/g, userData.fullName || '');
    htmlContent = htmlContent.replace(/{{email}}/g, userData.email || '');
    htmlContent = htmlContent.replace(/{{phone}}/g, userData.phone || '');
    htmlContent = htmlContent.replace(/{{location}}/g, userData.location || '');
    htmlContent = htmlContent.replace(/{{currentTitle}}/g, userData.currentTitle || '');
    
    // Process AI-generated content
    const sections = this.parseAIContent(aiGeneratedContent);
    
    console.log('Template sections parsed:', Object.keys(sections));
    console.log('Experiences content:', sections.experiences ? 'Found' : 'Missing');
    
    // Add fallback for experiences if not detected
    if (!sections.experiences && userData.experiences && userData.experiences.length > 0) {
      console.log('FALLBACK: Using user profile experiences directly');
      const fallbackExperiences = userData.experiences.map(exp => `
        <div class="experience-item">
          <h3>${exp.jobTitle} - ${exp.company}</h3>
          <p class="experience-date">${exp.startDate} - ${exp.endDate || 'Présent'}</p>
          <p>${exp.responsibilities}</p>
        </div>
      `).join('');
      sections.experiences = fallbackExperiences;
    }
    
    // Enhanced fallback for summary if not detected
    if (!sections.summary) {
      if (userData.summary && userData.summary.trim()) {
        console.log('FALLBACK: Using user profile summary directly');
        sections.summary = `<p>${userData.summary}</p>`;
      } else {
        console.log('FALLBACK: Creating basic professional summary');
        const basicSummary = `Professionnel ${userData.experience || 'expérimenté'} avec une expertise en ${userData.currentTitle || 'son domaine'}. Passionné par l'innovation et l'excellence professionnelle.`;
        sections.summary = `<p>${basicSummary}</p>`;
      }
    }
    
    // Replace content with detailed logging
    const summaryContent = sections.summary || '';
    const skillsContent = sections.skills || '';
    const experiencesContent = sections.experiences || '';
    const educationContent = sections.education || '';
    const languagesContent = sections.languages || '';
    
    console.log('=== TEMPLATE REPLACEMENT ===');
    console.log(`Summary: ${summaryContent.length} chars`);
    console.log(`Skills: ${skillsContent.length} chars`);
    console.log(`Experiences: ${experiencesContent.length} chars`);
    console.log(`Education: ${educationContent.length} chars`);
    console.log(`Languages: ${languagesContent.length} chars`);
    
    htmlContent = htmlContent.replace(/{{summary}}/g, summaryContent);
    htmlContent = htmlContent.replace(/{{skills}}/g, skillsContent);
    htmlContent = htmlContent.replace(/{{experiences}}/g, experiencesContent);
    htmlContent = htmlContent.replace(/{{education}}/g, educationContent);
    htmlContent = htmlContent.replace(/{{languages}}/g, languagesContent);
    
    // Handle conditional sections (basic Handlebars-like syntax)
    htmlContent = this.processConditionals(htmlContent, {
      summary: sections.summary,
      languages: sections.languages
    });
    
    return htmlContent;
  }

  /**
   * Parse AI-generated content into sections
   */
  private parseAIContent(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    
    console.log('=== AI CONTENT PARSING START ===');
    console.log('Raw AI content length:', content.length);
    console.log('First 500 chars:', content.substring(0, 500));
    
    // Split content by markdown headers
    const lines = content.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];
    
    console.log('Total lines to process:', lines.length);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check for section headers (## or ###)
      if (trimmedLine.startsWith('## ') || trimmedLine.startsWith('### ')) {
        // Save previous section
        if (currentSection) {
          const htmlContent = this.markdownToHtml(currentContent.join('\n'));
          sections[currentSection] = htmlContent;
          console.log(`Saved section "${currentSection}" with ${currentContent.length} lines`);
          console.log(`Section HTML length: ${htmlContent.length}`);
        }
        
        // Start new section
        const headerText = trimmedLine.replace(/^#+\s*/, '').toLowerCase();
        currentSection = this.mapHeaderToSection(headerText);
        currentContent = [];
        console.log(`New section detected: "${trimmedLine}" → mapped to "${currentSection}"`);
      } else {
        currentContent.push(line);
      }
    }
    
    // Save last section
    if (currentSection) {
      const htmlContent = this.markdownToHtml(currentContent.join('\n'));
      sections[currentSection] = htmlContent;
      console.log(`Saved final section "${currentSection}" with ${currentContent.length} lines`);
      console.log(`Section HTML length: ${htmlContent.length}`);
    }
    
    console.log('=== FINAL SECTIONS ===');
    Object.keys(sections).forEach(key => {
      console.log(`${key}: ${sections[key] ? 'HAS CONTENT' : 'EMPTY'} (${sections[key]?.length || 0} chars)`);
      if (sections[key] && sections[key].length > 0) {
        console.log(`  Preview: ${sections[key].substring(0, 100)}...`);
      }
    });
    console.log('=== AI CONTENT PARSING END ===');
    
    return sections;
  }

  /**
   * Map markdown headers to template sections
   */
  private mapHeaderToSection(header: string): string {
    const normalizedHeader = header.toLowerCase().trim();
    console.log('Mapping header:', header, '→', normalizedHeader);
    
    // Direct exact matches first
    if (normalizedHeader in this.getHeaderMappings()) {
      const result = this.getHeaderMappings()[normalizedHeader];
      console.log('Direct match found:', normalizedHeader, '→', result);
      return result;
    }
    
    const mappings = this.getHeaderMappings();
    
    // Fuzzy matching for partial matches
    for (const [key, value] of Object.entries(mappings)) {
      if (normalizedHeader.includes(key) || key.includes(normalizedHeader)) {
        console.log('Fuzzy match found:', key, '→', value);
        return value;
      }
    }
    
    console.log('Header not matched, returning "other"');
    return 'other';
  }
  
  /**
   * Get header mappings as a separate method for reusability
   */
  private getHeaderMappings(): Record<string, string> {
    return {
      // Summary variations - most specific first
      'résumé professionnel': 'summary',
      'professional summary': 'summary',
      'profil professionnel': 'summary',
      'professional profile': 'summary',
      'résumé': 'summary',
      'profil': 'summary',
      'profile': 'summary',
      'à propos': 'summary',
      'about': 'summary',
      'summary': 'summary',
      'bio': 'summary',
      'biographie': 'summary',
      
      // Skills variations
      'compétences': 'skills',
      'skills': 'skills',
      'compétences techniques': 'skills',
      'technical skills': 'skills',
      'savoir-faire': 'skills',
      'expertise': 'skills',
      
      // Experience variations
      'expérience professionnelle': 'experiences',
      'expériences professionnelles': 'experiences',
      'experience': 'experiences',
      'expérience': 'experiences',
      'expériences': 'experiences',
      'professional experience': 'experiences',
      'work experience': 'experiences',
      'emploi': 'experiences',
      'carrière': 'experiences',
      'parcours professionnel': 'experiences',
      'historique professionnel': 'experiences',
      
      // Education variations
      'formation': 'education',
      'formations': 'education',
      'education': 'education',
      'éducation': 'education',
      'parcours académique': 'education',
      'diplômes': 'education',
      
      // Languages variations
      'langues': 'languages',
      'languages': 'languages',
      'langue': 'languages',
      'sprachen': 'languages',
      'idiomas': 'languages',
      
      // German headers
      'berufliches profil': 'summary',
      'fähigkeiten': 'skills',
      'berufserfahrung': 'experiences',
      'ausbildung': 'education',
      
      // Spanish headers  
      'resumen profesional': 'summary',
      'habilidades': 'skills',
      'experiencia profesional': 'experiences',
      'formación': 'education'
    };
    
    };

  /**
   * Convert markdown to HTML
   */
  private markdownToHtml(markdown: string): string {
    return markdown
      // Remove horizontal rule separators (---) first
      .replace(/^-{3,}$/gm, '')
      .replace(/\n\n\n+/g, '\n\n')
      
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      
      // Lists
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      
      // Wrap consecutive list items in ul tags
      .replace(/(<li>.*?<\/li>(\s*<li>.*?<\/li>)*)/gs, '<ul>$1</ul>')
      
      // Line breaks and paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      
      // Wrap in paragraphs if not already wrapped
      .replace(/^(?!<[hul]|<p>)/gm, '<p>')
      .replace(/(?<![>])$/gm, '</p>')
      
      // Clean up
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<[hul])/g, '$1')
      .replace(/(<\/[hul]>)<\/p>/g, '$1')
      .trim();
  }

  /**
   * Process conditional sections (basic Handlebars-like syntax)
   */
  private processConditionals(html: string, data: Record<string, any>): string {
    // Handle {{#if variable}} ... {{/if}} blocks
    const conditionalRegex = /{{#if\s+(\w+)}}(.*?){{\/if}}/gs;
    
    return html.replace(conditionalRegex, (match, variable, content) => {
      const value = data[variable];
      return value && value.trim() ? content : '';
    });
  }

  /**
   * Check if user has access to template
   */
  public hasTemplateAccess(templateId: string, userPlan: string): boolean {
    const template = this.getTemplate(templateId);
    if (!template) return false;
    
    if (!template.isPremium) return true;
    
    return userPlan === 'PREMIUM' || userPlan === 'ENTERPRISE';
  }

  /**
   * Get templates filtered by user plan
   */
  public getTemplatesForUser(userPlan: string): TemplatePreview[] {
    const allTemplates = this.getTemplatesPreviews();
    
    return allTemplates.map(template => ({
      ...template,
      // Mark premium templates as locked for free users
      isPremium: template.isPremium && userPlan === 'FREE'
    }));
  }

  /**
   * Render a template with user data and guaranteed summary injection
   */
  public renderTemplateWithGuaranteedSummary(
    templateId: string, 
    userData: UserProfile, 
    aiGeneratedContent: string, 
    guaranteedSummary: string
  ): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let htmlContent = template.htmlContent;
    
    // Replace CSS placeholder
    htmlContent = htmlContent.replace('{{css}}', template.cssContent);
    
    // Replace basic user data placeholders
    htmlContent = htmlContent.replace(/{{fullName}}/g, userData.fullName || '');
    htmlContent = htmlContent.replace(/{{email}}/g, userData.email || '');
    htmlContent = htmlContent.replace(/{{phone}}/g, userData.phone || '');
    htmlContent = htmlContent.replace(/{{location}}/g, userData.location || '');
    htmlContent = htmlContent.replace(/{{currentTitle}}/g, userData.currentTitle || '');
    
    // Process AI-generated content
    const sections = this.parseAIContent(aiGeneratedContent);
    
    console.log('Template sections parsed:', Object.keys(sections));
    console.log('Experiences content:', sections.experiences ? 'Found' : 'Missing');
    
    // GUARANTEED SUMMARY INJECTION - This ensures summary is ALWAYS present
    console.log('=== GUARANTEED SUMMARY INJECTION ===');
    console.log('Guaranteed summary provided:', guaranteedSummary ? 'YES' : 'NO');
    console.log('AI-parsed summary found:', sections.summary ? 'YES' : 'NO');
    
    // Use guaranteed summary as primary, AI-parsed as secondary, fallback as tertiary
    let finalSummary = '';
    if (guaranteedSummary && guaranteedSummary.trim()) {
      finalSummary = `<p>${guaranteedSummary}</p>`;
      console.log('Using guaranteed summary (primary)');
    } else if (sections.summary && sections.summary.trim()) {
      finalSummary = sections.summary;
      console.log('Using AI-parsed summary (secondary)');
    } else {
      // Ultimate fallback
      const fallback = this.createUltimateFallbackSummary(userData);
      finalSummary = `<p>${fallback}</p>`;
      console.log('Using ultimate fallback summary (tertiary)');
    }
    
    console.log('Final summary length:', finalSummary.length);
    console.log('Final summary preview:', finalSummary.substring(0, 100) + '...');
    
    // Add fallback for experiences if not detected
    if (!sections.experiences && userData.experiences && userData.experiences.length > 0) {
      console.log('FALLBACK: Using user profile experiences directly');
      const fallbackExperiences = userData.experiences.map(exp => `
        <div class="experience-item">
          <h3>${exp.jobTitle} - ${exp.company}</h3>
          <p class="experience-date">${exp.startDate} - ${exp.endDate || 'Présent'}</p>
          <p>${exp.responsibilities}</p>
        </div>
      `).join('');
      sections.experiences = fallbackExperiences;
    }
    
    // Replace content with detailed logging
    const skillsContent = sections.skills || '';
    const experiencesContent = sections.experiences || '';
    const educationContent = sections.education || '';
    const languagesContent = sections.languages || '';
    
    console.log('=== TEMPLATE REPLACEMENT ===');
    console.log(`Summary: ${finalSummary.length} chars`);
    console.log(`Skills: ${skillsContent.length} chars`);
    console.log(`Experiences: ${experiencesContent.length} chars`);
    console.log(`Education: ${educationContent.length} chars`);
    console.log(`Languages: ${languagesContent.length} chars`);
    
    htmlContent = htmlContent.replace(/{{summary}}/g, finalSummary);
    htmlContent = htmlContent.replace(/{{skills}}/g, skillsContent);
    htmlContent = htmlContent.replace(/{{experiences}}/g, experiencesContent);
    htmlContent = htmlContent.replace(/{{education}}/g, educationContent);
    htmlContent = htmlContent.replace(/{{languages}}/g, languagesContent);
    
    // Handle conditional sections (basic Handlebars-like syntax)
    htmlContent = this.processConditionals(htmlContent, {
      summary: finalSummary,
      languages: sections.languages
    });
    
    return htmlContent;
  }

  /**
   * Create an ultimate fallback summary when all else fails
   */
  private createUltimateFallbackSummary(userData: UserProfile): string {
    const title = userData.currentTitle || 'Professionnel expérimenté';
    const skills = userData.skills?.split(',')[0]?.trim() || 'son domaine';
    return `${title} avec une solide expertise en ${skills}. Passionné par l'innovation et déterminé à apporter une valeur ajoutée significative à votre équipe.`;
  }
}

// Export singleton instance
export const templateEngine = new TemplateEngine();

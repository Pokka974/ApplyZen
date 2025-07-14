"use strict";
const __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateEngine = exports.TemplateEngine = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class TemplateEngine {
    constructor() {
        this.templatesCache = new Map();
        // __dirname in built app points to /dist/apps/api (from the logs)
        // So we need to go up to project root and find the source templates
        const projectRoot = path_1.default.resolve(__dirname, '../../..');
        this.templatesDir = path_1.default.join(projectRoot, 'apps/api/src/templates');
        console.log('Template engine __dirname:', __dirname);
        console.log('Template engine projectRoot:', projectRoot);
        console.log('Template engine templatesDir:', this.templatesDir);
        this.loadTemplates();
    }
    /**
     * Load all templates from the templates directory
     */
    loadTemplates() {
        try {
            console.log('Loading templates from:', this.templatesDir);
            if (!fs_1.default.existsSync(this.templatesDir)) {
                console.error('Templates directory does not exist:', this.templatesDir);
                return;
            }
            const templateDirs = fs_1.default.readdirSync(this.templatesDir);
            console.log('Found template directories:', templateDirs);
            for (const dir of templateDirs) {
                const templatePath = path_1.default.join(this.templatesDir, dir);
                const configPath = path_1.default.join(templatePath, 'config.json');
                const htmlPath = path_1.default.join(templatePath, 'template.html');
                const cssPath = path_1.default.join(templatePath, 'styles.css');
                console.log(`Checking template: ${dir}`);
                console.log(`  Config exists: ${fs_1.default.existsSync(configPath)}`);
                console.log(`  HTML exists: ${fs_1.default.existsSync(htmlPath)}`);
                console.log(`  CSS exists: ${fs_1.default.existsSync(cssPath)}`);
                if (fs_1.default.existsSync(configPath) && fs_1.default.existsSync(htmlPath) && fs_1.default.existsSync(cssPath)) {
                    try {
                        const config = JSON.parse(fs_1.default.readFileSync(configPath, 'utf-8'));
                        const htmlContent = fs_1.default.readFileSync(htmlPath, 'utf-8');
                        const cssContent = fs_1.default.readFileSync(cssPath, 'utf-8');
                        const template = {
                            id: config.id,
                            name: config.name,
                            description: config.description,
                            previewUrl: `/api/templates/${config.id}/preview`,
                            category: config.category,
                            isPremium: config.isPremium,
                            htmlContent,
                            cssContent,
                            placeholders: config.placeholders?.map((p) => p.key) || [],
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                        this.templatesCache.set(config.id, template);
                        console.log(`  ✓ Loaded template: ${config.name} (${config.id})`);
                    }
                    catch (error) {
                        console.error(`  ✗ Failed to load template ${dir}:`, error);
                    }
                }
                else {
                    console.log(`  ✗ Missing files for template: ${dir}`);
                }
            }
            console.log(`Successfully loaded ${this.templatesCache.size} CV templates`);
            console.log('Available templates:', Array.from(this.templatesCache.keys()));
        }
        catch (error) {
            console.error('Error loading templates:', error);
        }
    }
    /**
     * Get all available templates as previews
     */
    getTemplatesPreviews() {
        const previews = [];
        for (const [id, template] of this.templatesCache) {
            const configPath = path_1.default.join(this.templatesDir, id, 'config.json');
            const config = JSON.parse(fs_1.default.readFileSync(configPath, 'utf-8'));
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
    getTemplate(id) {
        return this.templatesCache.get(id) || null;
    }
    /**
     * Get template config by ID
     */
    getTemplateConfig(id) {
        try {
            const configPath = path_1.default.join(this.templatesDir, id, 'config.json');
            if (!fs_1.default.existsSync(configPath)) {
                return null;
            }
            const config = JSON.parse(fs_1.default.readFileSync(configPath, 'utf-8'));
            return config;
        }
        catch (error) {
            console.error(`Error loading template config for ${id}:`, error);
            return null;
        }
    }
    /**
     * Render a template with user data
     */
    renderTemplate(templateId, userData, aiGeneratedContent) {
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
        htmlContent = htmlContent.replace(/{{summary}}/g, sections.summary || '');
        htmlContent = htmlContent.replace(/{{skills}}/g, sections.skills || '');
        htmlContent = htmlContent.replace(/{{experiences}}/g, sections.experiences || '');
        htmlContent = htmlContent.replace(/{{education}}/g, sections.education || '');
        htmlContent = htmlContent.replace(/{{languages}}/g, sections.languages || '');
        // Handle conditional sections (basic Handlebars-like syntax)
        htmlContent = this.processConditionals(htmlContent, {
            languages: sections.languages
        });
        return htmlContent;
    }
    /**
     * Parse AI-generated content into sections
     */
    parseAIContent(content) {
        const sections = {};
        // Split content by markdown headers
        const lines = content.split('\n');
        let currentSection = '';
        let currentContent = [];
        for (const line of lines) {
            const trimmedLine = line.trim();
            // Check for section headers (## or ###)
            if (trimmedLine.startsWith('## ') || trimmedLine.startsWith('### ')) {
                // Save previous section
                if (currentSection) {
                    sections[currentSection] = this.markdownToHtml(currentContent.join('\n'));
                }
                // Start new section
                const headerText = trimmedLine.replace(/^#+\s*/, '').toLowerCase();
                currentSection = this.mapHeaderToSection(headerText);
                currentContent = [];
            }
            else {
                currentContent.push(line);
            }
        }
        // Save last section
        if (currentSection) {
            sections[currentSection] = this.markdownToHtml(currentContent.join('\n'));
        }
        return sections;
    }
    /**
     * Map markdown headers to template sections
     */
    mapHeaderToSection(header) {
        const mappings = {
            'résumé professionnel': 'summary',
            'professional summary': 'summary',
            'profil': 'summary',
            'profile': 'summary',
            'compétences': 'skills',
            'skills': 'skills',
            'compétences techniques': 'skills',
            'technical skills': 'skills',
            'expérience professionnelle': 'experiences',
            'experience': 'experiences',
            'expérience': 'experiences',
            'professional experience': 'experiences',
            'formation': 'education',
            'education': 'education',
            'éducation': 'education',
            'parcours académique': 'education',
            'langues': 'languages',
            'languages': 'languages',
            'langue': 'languages'
        };
        for (const [key, value] of Object.entries(mappings)) {
            if (header.includes(key)) {
                return value;
            }
        }
        return 'other';
    }
    /**
     * Convert markdown to HTML
     */
    markdownToHtml(markdown) {
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
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
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
    processConditionals(html, data) {
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
    hasTemplateAccess(templateId, userPlan) {
        const template = this.getTemplate(templateId);
        if (!template)
            return false;
        if (!template.isPremium)
            return true;
        return userPlan === 'PREMIUM' || userPlan === 'ENTERPRISE';
    }
    /**
     * Get templates filtered by user plan
     */
    getTemplatesForUser(userPlan) {
        const allTemplates = this.getTemplatesPreviews();
        return allTemplates.map(template => ({
            ...template,
            // Mark premium templates as locked for free users
            isPremium: template.isPremium && userPlan === 'FREE'
        }));
    }
}
exports.TemplateEngine = TemplateEngine;
// Export singleton instance
exports.templateEngine = new TemplateEngine();

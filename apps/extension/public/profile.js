// Profile management functionality
class ProfileManager {
    constructor() {
        this.form = document.getElementById('profile-form');
        this.experiencesContainer = document.getElementById('experiences-container');
        this.addExperienceBtn = document.getElementById('add-experience');
        this.backBtn = document.getElementById('back-btn');
        this.uploadBtn = document.getElementById('upload-btn');
        this.cvUpload = document.getElementById('cv-upload');
        this.uploadStatus = document.getElementById('upload-status');
        this.textImportBtn = document.getElementById('text-import-btn');
        
        this.init();
    }

    init() {
        this.loadProfile();
        this.bindEvents();
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.saveProfile(e));
        this.addExperienceBtn.addEventListener('click', () => this.addExperience());
        this.backBtn.addEventListener('click', () => window.close());
        
        // CV upload functionality
        this.uploadBtn.addEventListener('click', () => this.cvUpload.click());
        this.cvUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        this.textImportBtn.addEventListener('click', () => this.handleTextImport());
        
        // Handle experience removal
        this.experiencesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) {
                e.target.parentElement.remove();
            }
        });
    }

    async loadProfile() {
        try {
            const result = await chrome.storage.sync.get(['userProfile']);
            const profile = result.userProfile;
            
            if (profile) {
                this.populateForm(profile);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    populateForm(profile) {
        // Personal info
        document.getElementById('fullName').value = profile.fullName || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('phone').value = profile.phone || '';
        document.getElementById('location').value = profile.location || '';
        document.getElementById('address').value = profile.address || '';
        
        // Professional info
        document.getElementById('currentTitle').value = profile.currentTitle || '';
        document.getElementById('experience').value = profile.experience || '';
        document.getElementById('skills').value = profile.skills || '';
        document.getElementById('summary').value = profile.summary || '';
        
        // Education
        document.getElementById('education').value = profile.education || '';
        document.getElementById('languages').value = profile.languages || '';
        
        // API key
        document.getElementById('openaiKey').value = profile.openaiKey || '';
        
        // Experiences
        if (profile.experiences && profile.experiences.length > 0) {
            this.experiencesContainer.innerHTML = '';
            profile.experiences.forEach(exp => this.addExperience(exp));
        }
    }

    addExperience(experienceData = null) {
        const experienceItem = document.createElement('div');
        experienceItem.className = 'experience-item';
        
        experienceItem.innerHTML = `
            <button type="button" class="remove-btn">×</button>
            <div class="form-row">
                <div class="form-group">
                    <label>Poste</label>
                    <input type="text" name="jobTitle[]" placeholder="Développeur Frontend" value="${experienceData?.jobTitle || ''}">
                </div>
                <div class="form-group">
                    <label>Entreprise</label>
                    <input type="text" name="company[]" placeholder="Nom de l'entreprise" value="${experienceData?.company || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Début</label>
                    <input type="month" name="startDate[]" value="${experienceData?.startDate || ''}">
                </div>
                <div class="form-group">
                    <label>Fin</label>
                    <input type="month" name="endDate[]" value="${experienceData?.endDate || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Missions principales</label>
                <textarea name="responsibilities[]" rows="3" placeholder="Décrivez vos principales responsabilités et réalisations...">${experienceData?.responsibilities || ''}</textarea>
            </div>
        `;
        
        this.experiencesContainer.appendChild(experienceItem);
    }

    async saveProfile(e) {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const profile = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            location: formData.get('location'),
            address: formData.get('address'),
            currentTitle: formData.get('currentTitle'),
            experience: formData.get('experience'),
            skills: formData.get('skills'),
            summary: formData.get('summary'),
            education: formData.get('education'),
            languages: formData.get('languages'),
            openaiKey: formData.get('openaiKey'),
            experiences: this.collectExperiences(formData),
            updatedAt: new Date().toISOString()
        };

        try {
            await chrome.storage.sync.set({ userProfile: profile });
            
            // Show success message
            this.showSuccessMessage();
            
            // Close after delay
            setTimeout(() => {
                window.close();
            }, 1500);
            
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
        }
    }

    collectExperiences(formData) {
        const experiences = [];
        const jobTitles = formData.getAll('jobTitle[]');
        const companies = formData.getAll('company[]');
        const startDates = formData.getAll('startDate[]');
        const endDates = formData.getAll('endDate[]');
        const responsibilities = formData.getAll('responsibilities[]');

        for (let i = 0; i < jobTitles.length; i++) {
            if (jobTitles[i] || companies[i]) {
                experiences.push({
                    jobTitle: jobTitles[i],
                    company: companies[i],
                    startDate: startDates[i],
                    endDate: endDates[i],
                    responsibilities: responsibilities[i]
                });
            }
        }

        return experiences;
    }

    showSuccessMessage() {
        const submitBtn = this.form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<span class="btn-icon">✅</span>Profil sauvegardé!';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }, 1500);
    }

    // Handle text import
    async handleTextImport() {
        const modal = this.createTextInputModal();
        document.body.appendChild(modal);
    }

    createTextInputModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 80%;
            overflow: auto;
        `;

        content.innerHTML = `
            <h3 style="margin-bottom: 16px;">Coller le texte de votre CV</h3>
            <textarea 
                id="cv-text-input" 
                placeholder="Copiez et collez tout le texte de votre CV ici..."
                style="width: 100%; height: 300px; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; resize: vertical;"
            ></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;">
                <button id="cancel-text-import" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Annuler</button>
                <button id="process-text-import" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Analyser avec IA</button>
            </div>
        `;

        modal.appendChild(content);

        // Event listeners
        const cancelBtn = content.querySelector('#cancel-text-import');
        const processBtn = content.querySelector('#process-text-import');
        const textArea = content.querySelector('#cv-text-input');

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        processBtn.addEventListener('click', async () => {
            const cvText = textArea.value.trim();
            if (!cvText) {
                alert('Veuillez coller le texte de votre CV');
                return;
            }

            document.body.removeChild(modal);
            await this.processTextImport(cvText);
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        return modal;
    }

    async processTextImport(cvText) {
        try {
            this.showUploadStatus('Analyse du CV avec IA...', 'loading');
            
            console.log('Processing CV text, length:', cvText.length);
            
            // Call backend API for CV parsing
            const response = await fetch('http://localhost:3000/api/parse-cv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cvText })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                this.populateFormFromParsedData(result.data);
                this.showUploadStatus('CV importé avec succès! 🎉', 'success');
            } else {
                throw new Error(result.error || 'Erreur lors de l\'analyse du CV');
            }
            
        } catch (error) {
            console.error('Error processing CV text:', error);
            
            let errorMsg = 'Erreur lors du traitement du CV.';
            if (error.message.includes('API Error: 401')) {
                errorMsg = 'Erreur d\'authentification API. Vérifiez la configuration.';
            } else if (error.message.includes('API Error: 429')) {
                errorMsg = 'Limite de taux API atteinte. Attendez un moment et réessayez.';
            } else if (error.message.includes('fetch')) {
                errorMsg = 'Impossible de contacter le serveur. Assurez-vous que l\'API est démarrée.';
            }
            
            this.showUploadStatus(errorMsg, 'error');
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (file.type !== 'application/pdf') {
            this.showUploadStatus('Veuillez sélectionner un fichier PDF valide.', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.showUploadStatus('Le fichier est trop volumineux (max 10MB).', 'error');
            return;
        }

        try {
            this.showUploadStatus('Extraction du texte du PDF...', 'loading');
            
            // Convert PDF to text using FormData
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('http://localhost:3000/api/parse-pdf', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                this.populateFormFromParsedData(result.data);
                this.showUploadStatus('CV importé avec succès! 🎉', 'success');
            } else {
                throw new Error(result.error || 'Erreur lors de l\'analyse du PDF');
            }
            
        } catch (error) {
            console.error('Error processing PDF:', error);
            let errorMsg = 'Erreur lors du traitement du PDF.';
            if (error.message.includes('fetch')) {
                errorMsg = 'Impossible de contacter le serveur. Assurez-vous que l\'API est démarrée.';
            }
            this.showUploadStatus(errorMsg, 'error');
        }
    }

    populateFormFromParsedData(data) {
        // Personal info
        if (data.fullName) document.getElementById('fullName').value = data.fullName;
        if (data.email) document.getElementById('email').value = data.email;
        if (data.phone) document.getElementById('phone').value = data.phone;
        if (data.location) document.getElementById('location').value = data.location;
        if (data.address) document.getElementById('address').value = data.address;
        
        // Professional info
        if (data.currentTitle) document.getElementById('currentTitle').value = data.currentTitle;
        if (data.experience) document.getElementById('experience').value = data.experience;
        if (data.skills) document.getElementById('skills').value = data.skills;
        if (data.summary) document.getElementById('summary').value = data.summary;
        
        // Education and languages
        if (data.education) document.getElementById('education').value = data.education;
        if (data.languages) document.getElementById('languages').value = data.languages;
        
        // Experiences
        if (data.experiences && data.experiences.length > 0) {
            this.experiencesContainer.innerHTML = '';
            data.experiences.forEach(exp => this.addExperience(exp));
        }
    }

    showUploadStatus(message, type) {
        this.uploadStatus.style.display = 'block';
        this.uploadStatus.className = `upload-status ${type}`;
        
        if (type === 'loading') {
            this.uploadStatus.innerHTML = `
                <div class="spinner"></div>
                ${message}
            `;
        } else {
            this.uploadStatus.textContent = message;
        }
        
        if (type !== 'loading') {
            setTimeout(() => {
                this.uploadStatus.style.display = 'none';
            }, 5000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});
// History page functionality
class HistoryManager {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api';
        this.init();
    }

    async init() {
        await this.checkAuthentication();
        await this.loadUserData();
        await this.loadJobHistory();
        this.bindEvents();
    }

    async checkAuthentication() {
        try {
            const response = await fetch(`${this.apiUrl}/auth/me`, {
                credentials: 'include'
            });

            if (!response.ok) {
                // Redirect to extension popup for authentication
                window.close();
                return;
            }

            const data = await response.json();
            if (data.success && data.data?.user) {
                this.displayUserInfo(data.data.user);
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.showError('Erreur de connexion. Veuillez vous reconnecter.');
        }
    }

    displayUserInfo(user) {
        const userInfoDiv = document.getElementById('user-info');
        const userNameEl = document.getElementById('user-name');
        const userEmailEl = document.getElementById('user-email');
        const userPlanEl = document.getElementById('user-plan');

        userNameEl.textContent = user.name || user.email;
        userEmailEl.textContent = user.email;
        userPlanEl.textContent = user.plan;
        userPlanEl.className = `plan-badge ${user.plan.toLowerCase()}`;

        userInfoDiv.style.display = 'flex';

        // Update usage stats
        const usageCountEl = document.getElementById('usage-count');
        usageCountEl.textContent = user.usageCount || 0;
    }

    async loadUserData() {
        // This will be populated when we load job history
        // For now, we'll update the stats based on the data we receive
    }

    async loadJobHistory() {
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiUrl}/jobs/history?limit=50`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.displayJobHistory(data.data.jobs);
                this.updateStats(data.data);
            } else {
                throw new Error(data.error || 'Failed to load history');
            }
        } catch (error) {
            console.error('Error loading job history:', error);
            this.showError('Impossible de charger l\'historique. Veuillez réessayer.');
        } finally {
            this.showLoading(false);
        }
    }

    updateStats(data) {
        const totalJobs = data.total || 0;
        const totalDocuments = data.jobs?.reduce((count, job) => {
            return count + (job.documents?.length || 0);
        }, 0) || 0;

        document.getElementById('total-jobs').textContent = totalJobs;
        document.getElementById('total-documents').textContent = totalDocuments;
        
        const statsGrid = document.getElementById('stats-grid');
        statsGrid.style.display = 'grid';
    }

    displayJobHistory(jobs) {
        try {
            const jobsList = document.getElementById('jobs-list');
            const emptyState = document.getElementById('empty-state');

            if (!jobs || jobs.length === 0) {
                emptyState.style.display = 'block';
                return;
            }

            jobsList.innerHTML = '';
            
            jobs.forEach((job, index) => {
                try {
                    console.log(`Creating job card ${index + 1}/${jobs.length} for:`, job.title);
                    const jobCard = this.createJobCard(job);
                    jobsList.appendChild(jobCard);
                } catch (error) {
                    console.error(`Error creating job card for job ${index}:`, error, job);
                    // Create a fallback simple card
                    const fallbackCard = document.createElement('div');
                    fallbackCard.className = 'job-card';
                    fallbackCard.innerHTML = `
                        <div class="job-header">
                            <div>
                                <div class="job-title">${job.title || 'Unknown Job'}</div>
                                <div class="job-company">${job.company || 'Unknown Company'}</div>
                            </div>
                        </div>
                        <p style="color: #dc2626; font-size: 12px;">Error loading documents for this job</p>
                    `;
                    jobsList.appendChild(fallbackCard);
                }
            });
        } catch (error) {
            console.error('Error in displayJobHistory:', error);
            this.showError('Erreur lors de l\'affichage de l\'historique');
        }
    }

    createJobCard(job) {
        const card = document.createElement('div');
        card.className = 'job-card';
        
        const createdDate = new Date(job.createdAt).toLocaleDateString('fr-FR');
        
        // Create job header
        const header = document.createElement('div');
        header.className = 'job-header';
        
        const jobInfo = document.createElement('div');
        
        const title = document.createElement('div');
        title.className = 'job-title';
        title.textContent = job.title;
        
        const company = document.createElement('div');
        company.className = 'job-company';
        company.textContent = job.company;
        
        const location = document.createElement('div');
        location.className = 'job-location';
        location.textContent = job.location;
        
        jobInfo.appendChild(title);
        jobInfo.appendChild(company);
        jobInfo.appendChild(location);
        
        const date = document.createElement('div');
        date.className = 'job-date';
        date.textContent = createdDate;
        
        header.appendChild(jobInfo);
        header.appendChild(date);
        
        card.appendChild(header);
        
        // Create documents section
        if (job.documents && job.documents.length > 0) {
            const docsList = document.createElement('div');
            docsList.className = 'documents-list';
            
            job.documents.forEach(doc => {
                const docBadge = this.createDocumentBadge.call(this, doc);
                docsList.appendChild(docBadge);
            });
            
            card.appendChild(docsList);
        } else {
            const noDocsMsg = document.createElement('p');
            noDocsMsg.style.cssText = 'color: #64748b; font-size: 14px; margin-top: 12px;';
            noDocsMsg.textContent = 'Aucun document généré';
            card.appendChild(noDocsMsg);
        }

        return card;
    }

    createDocumentBadge(document) {
        try {
            console.log('Creating document badge for:', document);
            
            const typeLabel = document.type === 'CV' ? 'CV' : 'Lettre';
            const typeClass = document.type === 'CV' ? 'cv' : 'cover-letter';
            const generatedDate = new Date(document.generatedAt).toLocaleDateString('fr-FR');
            
            const container = window.document.createElement('div');
            container.className = 'document-container';
            container.style.cssText = 'display: flex; align-items: center; gap: 8px;';
            
            // Create document badge
            const badge = window.document.createElement('div');
            badge.className = `document-badge ${typeClass}`;
            badge.title = `Généré le ${generatedDate} - ${document.wordCount} mots`;
            badge.textContent = `📄 ${typeLabel} (${document.language.toLowerCase()})`;
            badge.style.cursor = 'pointer';
            badge.addEventListener('click', () => this.viewDocument(document.id));
            
            // Create download buttons container
            const buttonsContainer = window.document.createElement('div');
            buttonsContainer.className = 'download-buttons';
            buttonsContainer.style.cssText = 'display: flex; gap: 4px;';
            
            // Create PDF button
            const pdfBtn = window.document.createElement('button');
            pdfBtn.className = 'mini-btn';
            pdfBtn.title = 'Télécharger PDF';
            pdfBtn.textContent = '📄 PDF';
            pdfBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadDocument(document.id, 'pdf');
            });
            
            // Create DOCX button
            const docxBtn = window.document.createElement('button');
            docxBtn.className = 'mini-btn';
            docxBtn.title = 'Télécharger DOCX';
            docxBtn.textContent = '📝 DOCX';
            docxBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadDocument(document.id, 'docx');
            });
            
            buttonsContainer.appendChild(pdfBtn);
            buttonsContainer.appendChild(docxBtn);
            
            container.appendChild(badge);
            container.appendChild(buttonsContainer);
            
            return container;
        } catch (error) {
            console.error('Error creating document badge:', error);
            // Return a simple fallback element
            const fallback = window.document.createElement('div');
            fallback.className = 'document-badge';
            fallback.textContent = `📄 ${document.type || 'Document'} (error)`;
            fallback.style.cssText = 'color: #dc2626; padding: 4px 8px; border: 1px solid #fecaca; border-radius: 4px;';
            return fallback;
        }
    }

    async viewDocument(documentId) {
        try {
            const response = await fetch(`${this.apiUrl}/jobs/documents/${documentId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.data) {
                this.showDocumentModal(data.data);
            } else {
                throw new Error(data.error || 'Document non trouvé');
            }
        } catch (error) {
            console.error('Error loading document:', error);
            alert('Impossible de charger le document.');
        }
    }

    showDocumentModal(document) {
        try {
            // Create modal
            const modal = window.document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;

            const modalContent = window.document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            width: 80%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 24px;
        `;

        const typeLabel = document.type === 'CV' ? 'CV' : 'Lettre de motivation';
        const generatedDate = new Date(document.generatedAt).toLocaleDateString('fr-FR');

            // Create modal header
            const header = window.document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';
            
            const title = window.document.createElement('h2');
            title.textContent = `${typeLabel} - ${document.job.title} chez ${document.job.company}`;
            
            const closeBtn = window.document.createElement('button');
            closeBtn.style.cssText = 'background: none; border: none; font-size: 24px; cursor: pointer;';
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', () => modal.remove());
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            
            // Create meta info
            const metaInfo = window.document.createElement('p');
            metaInfo.style.cssText = 'color: #64748b; margin-bottom: 20px;';
            metaInfo.textContent = `Généré le ${generatedDate} • ${document.wordCount} mots • ${document.language}`;
            
            // Create content area
            const contentArea = window.document.createElement('div');
            contentArea.style.cssText = 'white-space: pre-wrap; line-height: 1.6; font-family: "Times New Roman", serif;';
            contentArea.textContent = document.content;
            
            // Create action buttons
            const actionsDiv = window.document.createElement('div');
            actionsDiv.style.cssText = 'margin-top: 24px; text-align: right; display: flex; gap: 12px; justify-content: flex-end;';
            
            const pdfBtn = window.document.createElement('button');
            pdfBtn.className = 'btn';
            pdfBtn.textContent = '📄 PDF';
            pdfBtn.addEventListener('click', () => this.downloadDocument(document.id, 'pdf'));
            
            const docxBtn = window.document.createElement('button');
            docxBtn.className = 'btn';
            docxBtn.textContent = '📝 DOCX';
            docxBtn.addEventListener('click', () => this.downloadDocument(document.id, 'docx'));
            
            const copyBtn = window.document.createElement('button');
            copyBtn.className = 'btn btn-secondary';
            copyBtn.textContent = '📋 Copier';
            copyBtn.addEventListener('click', () => this.copyToClipboard(document.id));
            
            actionsDiv.appendChild(pdfBtn);
            actionsDiv.appendChild(docxBtn);
            actionsDiv.appendChild(copyBtn);
            
            // Assemble modal content
            modalContent.appendChild(header);
            modalContent.appendChild(metaInfo);
            modalContent.appendChild(contentArea);
            modalContent.appendChild(actionsDiv);

            modal.className = 'modal';
            modal.appendChild(modalContent);
            window.document.body.appendChild(modal);

            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        } catch (error) {
            console.error('Error creating modal:', error);
            alert('Erreur lors de l\'affichage du document');
        }
    }

    async downloadDocument(documentId, format) {
        try {
            console.log(`Starting download: ${documentId}, format: ${format}`);
            
            // First get the document data
            const response = await fetch(`${this.apiUrl}/jobs/documents/${documentId}`, {
                credentials: 'include'
            });

            console.log('Document fetch response:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch document: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            if (!data.success || !data.data) {
                throw new Error('Document not found');
            }

            const document = data.data;
            const fileName = `${document.job.company}_${document.job.title}_${document.type}`.replace(/[^a-zA-Z0-9]/g, '_');

            console.log(`Calling export API: ${this.apiUrl}/export/${format}`);

            // Call the appropriate export endpoint
            const exportResponse = await fetch(`${this.apiUrl}/export/${format}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    content: document.content,
                    fileName: fileName
                })
            });

            console.log('Export response:', exportResponse.status);

            if (!exportResponse.ok) {
                const errorText = await exportResponse.text();
                throw new Error(`Export failed: ${exportResponse.status} - ${errorText}`);
            }

            // Download the file
            const blob = await exportResponse.blob();
            console.log('Blob created:', blob.size, 'bytes');
            
            const url = window.URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = `${fileName}.${format}`;
            window.document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            window.document.body.removeChild(a);

            console.log('Download initiated successfully');
            // Show success message
            this.showDownloadSuccess(format);

        } catch (error) {
            console.error('Error downloading document:', error);
            alert(`Erreur lors du téléchargement ${format.toUpperCase()}: ${error.message}`);
        }
    }

    async copyToClipboard(documentId) {
        try {
            const response = await fetch(`${this.apiUrl}/jobs/documents/${documentId}`, {
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success && data.data) {
                await navigator.clipboard.writeText(data.data.content);
                alert('Document copié dans le presse-papiers !');
            }
        } catch (error) {
            console.error('Error copying document:', error);
            alert('Erreur lors de la copie.');
        }
    }

    showDownloadSuccess(format) {
        try {
            // Create a temporary success message
            const successDiv = window.document.createElement('div');
            successDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 1001;
                font-weight: 500;
            `;
            successDiv.textContent = `Document ${format.toUpperCase()} téléchargé avec succès !`;
            
            window.document.body.appendChild(successDiv);
            
            setTimeout(() => {
                successDiv.remove();
            }, 3000);
        } catch (error) {
            console.error('Error showing download success:', error);
            // Fallback to alert
            alert(`Document ${format.toUpperCase()} téléchargé avec succès !`);
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        const errorMessage = document.getElementById('error-message');
        
        errorMessage.textContent = message;
        errorDiv.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    bindEvents() {
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.addEventListener('click', () => {
            this.loadJobHistory();
        });
    }
}

// Initialize when page loads
let historyManager;
document.addEventListener('DOMContentLoaded', () => {
    historyManager = new HistoryManager();
});
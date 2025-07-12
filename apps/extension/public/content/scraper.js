// LinkedIn job scraper content script
console.log('ApplyZen content script loaded on:', window.location.href);

// Job scraping functions
const scrapeJobData = () => {
  try {
    console.log('Starting job scraping...');
    
    const jobData = {
      title: '',
      company: '',
      logo: '',
      location: '',
      contractTypes: [],
      description: '',
      missions: '',
      requirements: '',
      benefits: '',
      candidates: '',
      companySector: '',
      companySize: [],
      companyDescription: ''
    };

    // Scrape job title
    const titleSelectors = [
      'h1.t-24.t-bold.inline a',
      'h1.job-details-jobs-unified-top-card__job-title a',
      'h1[data-test-id="job-title"]',
      '.job-details-jobs-unified-top-card__job-title h1'
    ];
    
    for (const selector of titleSelectors) {
      const titleEl = document.querySelector(selector);
      if (titleEl) {
        jobData.title = titleEl.textContent?.trim() || '';
        console.log('Found title:', jobData.title);
        break;
      }
    }

    // Scrape company name
    const companySelectors = [
      'div.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name a',
      'a[data-test-id="job-poster-company-name"]',
      '.job-details-jobs-unified-top-card__company-name span'
    ];
    
    for (const selector of companySelectors) {
      const companyEl = document.querySelector(selector);
      if (companyEl) {
        jobData.company = companyEl.textContent?.trim() || '';
        console.log('Found company:', jobData.company);
        break;
      }
    }

    // Scrape location
    const locationSelectors = [
      '.job-details-jobs-unified-top-card__bullet',
      'span[data-test-id="job-location"]',
      '.job-details-jobs-unified-top-card__primary-description-container span'
    ];
    
    for (const selector of locationSelectors) {
      const locationEl = document.querySelector(selector);
      if (locationEl && locationEl.textContent?.includes('·')) {
        const parts = locationEl.textContent.split('·');
        jobData.location = parts[0]?.trim() || '';
        console.log('Found location:', jobData.location);
        break;
      } else if (locationEl) {
        jobData.location = locationEl.textContent?.trim() || '';
        console.log('Found location:', jobData.location);
        break;
      }
    }

    // Scrape job description
    const descriptionSelectors = [
      'div.jobs-description-content__text--stretch',
      '.jobs-description__text',
      '[data-test-id="job-description"]',
      '.jobs-box__html-content'
    ];
    
    for (const selector of descriptionSelectors) {
      const descEl = document.querySelector(selector);
      if (descEl) {
        jobData.description = descEl.textContent?.trim() || '';
        console.log('Found description length:', jobData.description.length);
        break;
      }
    }

    // Scrape company logo
    const logoSelectors = [
      '.job-details-jobs-unified-top-card__company-logo img',
      'img[data-test-id="company-logo"]',
      '.jobs-unified-top-card__company-logo img'
    ];
    
    for (const selector of logoSelectors) {
      const logoEl = document.querySelector(selector);
      if (logoEl) {
        jobData.logo = logoEl.src || '';
        console.log('Found logo:', jobData.logo);
        break;
      }
    }

    // Extract contract types from description
    const contractKeywords = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance', 'Temps plein', 'Temps partiel'];
    const foundContracts = contractKeywords.filter(keyword => 
      jobData.description.toLowerCase().includes(keyword.toLowerCase())
    );
    jobData.contractTypes = foundContracts;

    console.log('Scraped job data:', jobData);
    return jobData;
    
  } catch (error) {
    console.error('Error scraping job data:', error);
    throw error;
  }
};

// Detect if current page is a job page
const detectJobPage = () => {
  const url = window.location.href;
  const isJobPage = url.includes('/jobs/view/') || 
                    (url.includes('/jobs/') && url.includes('currentJobId='));
  
  if (isJobPage) {
    // Wait for content to load, then check if job content exists
    const checkContent = () => {
      const hasJobContent = document.querySelector('h1.t-24.t-bold.inline a') ||
                           document.querySelector('.job-details-jobs-unified-top-card__company-name') ||
                           document.querySelector('h1[data-test-id="job-title"]');
      
      if (hasJobContent) {
        console.log('Job page detected with content');
        // Notify background script
        try {
          chrome.runtime.sendMessage({
            action: 'jobPageDetected',
            url: window.location.href
          });
        } catch (error) {
          console.error('Error sending job page detected message:', error);
        }
      } else {
        // Try again after a short delay
        setTimeout(checkContent, 1000);
      }
    };
    
    checkContent();
  } else {
    console.log('Not a job page:', url);
  }
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === 'scrapeJob') {
    try {
      const jobData = scrapeJobData();
      
      if (!jobData.title || !jobData.company) {
        sendResponse({
          success: false,
          error: 'Could not find job title or company. Make sure you are on a LinkedIn job page.'
        });
        return;
      }
      
      sendResponse({
        success: true,
        data: jobData
      });
      
    } catch (error) {
      console.error('Scraping error:', error);
      sendResponse({
        success: false,
        error: error.message || 'Failed to scrape job data'
      });
    }
  }
  
  return true; // Keep message channel open for async response
});

// Initialize
detectJobPage();

// Re-detect when page content changes (for SPA navigation)
const observer = new MutationObserver((mutations) => {
  let shouldRecheck = false;
  
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      shouldRecheck = true;
    }
  });
  
  if (shouldRecheck) {
    setTimeout(detectJobPage, 500);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('ApplyZen content script initialized');
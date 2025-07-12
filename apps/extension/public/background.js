// Background service worker for ApplyZen extension

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  if (message.action === 'jobPageDetected') {
    // Set badge to indicate job page detected
    chrome.action.setBadgeText({
      text: '!',
      tabId: sender.tab.id
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: '#4CAF50',
      tabId: sender.tab.id
    });
  }

  return true; // Keep message channel open for async responses
});

// Clear badge when navigating away from job pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isJobPage = tab.url.includes('/jobs/view/') || 
                      (tab.url.includes('/jobs/') && tab.url.includes('currentJobId='));
    
    if (!isJobPage) {
      chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
  }
});

console.log('ApplyZen background service worker loaded');
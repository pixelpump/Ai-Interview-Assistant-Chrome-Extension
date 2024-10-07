let recognition;
let assistantWindowId = null;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'startListening') {
    startListening();
  } else if (request.action === 'stopListening') {
    stopListening();
  } else if (request.action === 'setApiKey') {
    chrome.storage.sync.set({ openaiApiKey: request.apiKey });
  } else if (request.action === 'getAIResponse') {
    getAIResponse(request.question);
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === assistantWindowId) {
    assistantWindowId = null;
  }
});

function startListening() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('Error querying tabs:', chrome.runtime.lastError);
      return;
    }
    if (tabs.length === 0) {
      console.error('No active tab found');
      return;
    }
    const activeTabId = tabs[0].id;
    if (typeof activeTabId === 'undefined') {
      console.error('Active tab ID is undefined');
      return;
    }
    chrome.tabCapture.getMediaStreamId({ consumerTabId: activeTabId }, (streamId) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting media stream ID:', chrome.runtime.lastError);
        return;
      }
      injectContentScriptAndStartCapture(activeTabId, streamId);
    });
  });
}

function injectContentScriptAndStartCapture(tabId, streamId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error injecting content script:', chrome.runtime.lastError);
      return;
    }
    // Wait a bit to ensure the content script is fully loaded
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { action: 'startCapture', streamId: streamId }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error starting capture:', chrome.runtime.lastError);
        } else {
          console.log('Capture started successfully');
        }
      });
    }, 100);
  });
}

function stopListening() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'stopCapture' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error stopping capture:', chrome.runtime.lastError);
      } else {
        console.log('Capture stopped successfully');
      }
    });
  });
}

function isQuestion(text) {
  // Simple check for question words or question mark
  const questionWords = ['what', 'when', 'where', 'who', 'why', 'how'];
  const lowerText = text.toLowerCase();
  return questionWords.some(word => lowerText.includes(word)) || text.includes('?');
}

async function getAIResponse(question) {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not set');
    }

    console.log('Sending request to OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant that answers questions briefly and concisely." },
          { role: "user", content: question }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get response from OpenAI: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content.trim();
    chrome.runtime.sendMessage({action: 'updateAIResponse', response: answer});
  } catch (error) {
    console.error('Error getting AI response:', error);
    chrome.runtime.sendMessage({action: 'updateAIResponse', response: 'Error: ' + error.message});
  }
}

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('openaiApiKey', (result) => {
      resolve(result.openaiApiKey);
    });
  });
}
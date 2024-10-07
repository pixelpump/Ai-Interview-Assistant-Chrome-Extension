let audioContext;
let mediaStream;
let recognition;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCapture') {
    startCapture(request.streamId);
  } else if (request.action === 'stopCapture') {
    stopCapture();
  }
});

function startCapture(streamId) {
  navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    }
  }).then((stream) => {
    mediaStream = stream;
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);

    // Initialize speech recognition
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = function(event) {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript.trim() !== '') {
        chrome.runtime.sendMessage({action: 'updateTranscript', transcript: finalTranscript});
        
        // Check if the transcript contains a question
        if (isQuestion(finalTranscript)) {
          chrome.runtime.sendMessage({action: 'getAIResponse', question: finalTranscript});
        }
      }
    };

    recognition.start();
  }).catch((error) => {
    console.error('Error starting capture:', error);
  });
}

function stopCapture() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }
  if (audioContext) {
    audioContext.close();
  }
  if (recognition) {
    recognition.stop();
  }
}

function isQuestion(text) {
  const questionWords = ['what', 'when', 'where', 'who', 'why', 'how'];
  const lowerText = text.toLowerCase();
  return questionWords.some(word => lowerText.includes(word)) || text.includes('?');
}
function createDraggableUI() {
  const uiHTML = `
    <div id="ai-assistant-ui" class="ai-assistant-container">
      <div id="ai-assistant-header">AI Interview Assistant</div>
      <div id="ai-assistant-content">
        <input type="password" id="apiKeyInput" placeholder="Enter your OpenAI API Key here">
        <button id="saveApiKey">Save API Key</button>
        <button id="toggleListening">Start Listening</button>
        <div id="transcript"></div>
        <div id="aiResponse"></div>
      </div>
    </div>
  `;

  const uiElement = document.createElement('div');
  uiElement.innerHTML = uiHTML;
  document.body.appendChild(uiElement);

  const container = document.getElementById('ai-assistant-ui');
  const header = document.getElementById('ai-assistant-header');

  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    if (e.target === header) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      xOffset = currentX;
      yOffset = currentY;

      setTranslate(currentX, currentY, container);
    }
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;

    isDragging = false;
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }
}

createDraggableUI();
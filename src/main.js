import './style.css'
import { parseFigmaUrl, fetchFigmaNodeImage } from './figmaService.js'
import { runAIAnalysis, fetchUrlAsBase64 } from './aiService.js'

document.querySelector('#app').innerHTML = `
  <aside class="sidebar">
    <div class="logo-container">
      <h2 class="text-gradient">MQA UI Flow</h2>
    </div>
    <div class="nav-links" style="display:flex; flex-direction:column; gap:12px;">
      <a href="#" class="nav-item active">Dashboard</a>
      <a href="#" class="nav-item">History</a>
      <a href="#" class="nav-item">Rules</a>
    </div>
    <div style="margin-top:auto;" class="glass-panel" style="padding:16px;">
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px;">System Config</p>
      <button id="auth-btn" style="width:100%; justify-content:center; font-size:0.9rem;">Set Keys</button>
    </div>
  </aside>

  <main class="main-content">
    <header>
      <h3>Premium QA Dashboard</h3>
      <div style="display:flex; gap:16px; align-items:center;">
        <span style="font-size:0.9rem; color:var(--text-secondary);">Senior UI/UX AI Active</span>
      </div>
    </header>
    
    <div id="content-area" style="padding:40px; display:flex; flex-direction:column; gap:24px; max-width:1200px; margin:0 auto; width:100%;">
      
      <div class="glass-panel" id="setup-panel" style="padding:32px;">
        <h2 style="margin-bottom:24px;">Prepare Analysis</h2>
        <div style="display:grid; grid-template-columns: 1fr; gap:24px;">
          <div>
            <label>Figma Design URL (Select a specific frame)</label>
            <input type="text" id="figma-url" placeholder="https://www.figma.com/design/..." />
          </div>
          <div>
            <label>Live Webpage URL</label>
            <input type="text" id="webpage-url" placeholder="https://yoursite.com" />
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
             <div>
                <label>Compare URL (Subpath)</label>
                <input type="text" id="compare-url" placeholder="/about" />
             </div>
             <div>
                <label>Expected Meta Title</label>
                <input type="text" id="meta-title" placeholder="10Pearls..." />
             </div>
          </div>
          <div>
            <label>Expected Meta Description</label>
            <textarea id="meta-description" placeholder="Describe the page..." rows="3"></textarea>
          </div>
        </div>
        <div style="margin-top:24px; display:flex; justify-content:flex-end; align-items:center; gap: 16px;">
          <span id="error-msg" style="color:var(--error); font-size:0.9rem; display:none;"></span>
          <button id="start-comparison" style="padding: 14px 40px; font-size: 1rem;">Launch Analysis Engine</button>
        </div>
      </div>

    </div>
  </main>

  <div class="modal-overlay" id="auth-modal">
    <div class="glass-panel" style="padding:32px; width:450px; transform:translateY(20px); transition:transform 0.3s ease;">
      <h3 style="margin-bottom:16px;">System Credentials</h3>
      
      <label class="modal-label">Figma Access Token</label>
      <input type="password" id="figma-token-input" placeholder="figd_..." style="margin-bottom:16px;" />
      
      <label class="modal-label">Gemini AI API Key</label>
      <input type="password" id="gemini-key-input" placeholder="AIza..." style="margin-bottom:24px;" />

      <div style="display:flex; justify-content:flex-end; gap:12px;">
        <button class="secondary" id="close-modal-btn">Cancel</button>
        <button id="save-token-btn">Save Credentials</button>
      </div>
    </div>
  </div>
`

// --- Credentials Management ---
const getFigmaToken = () => localStorage.getItem('figmaToken');
const getGeminiKey = () => localStorage.getItem('geminiKey');

const authBtn = document.getElementById('auth-btn');
const authModal = document.getElementById('auth-modal');
const closeBtn = document.getElementById('close-modal-btn');
const saveBtn = document.getElementById('save-token-btn');
const figmaInput = document.getElementById('figma-token-input');
const geminiInput = document.getElementById('gemini-key-input');

const toggleModal = (show) => {
  if (show) {
    figmaInput.value = getFigmaToken() || '';
    geminiInput.value = getGeminiKey() || '';
    authModal.classList.add('active');
    authModal.querySelector('.glass-panel').style.transform = 'translateY(0)';
  } else {
    authModal.classList.remove('active');
    authModal.querySelector('.glass-panel').style.transform = 'translateY(20px)';
  }
}

authBtn.addEventListener('click', () => toggleModal(true));
closeBtn.addEventListener('click', () => toggleModal(false));

saveBtn.addEventListener('click', () => {
  localStorage.setItem('figmaToken', figmaInput.value.trim());
  localStorage.setItem('geminiKey', geminiInput.value.trim());
  updateAuthBtnState();
  toggleModal(false);
});

const updateAuthBtnState = () => {
  const isReady = getFigmaToken() && getGeminiKey();
  authBtn.innerHTML = isReady ? 'Credentials Set ✓' : 'Set Keys';
  authBtn.style.background = isReady ? 'var(--success)' : 'var(--accent-color)';
}
updateAuthBtnState();

// --- Application Core Logic ---
const startBtn = document.getElementById('start-comparison');
const figmaUrlInput = document.getElementById('figma-url');
const errorMsg = document.getElementById('error-msg');
const contentArea = document.getElementById('content-area');
const setupPanel = document.getElementById('setup-panel');

const showError = (msg) => {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
  setTimeout(() => { errorMsg.style.display = 'none'; }, 5000);
}

/**
 * Renders the results of the AI analysis
 */
const renderResultsUI = (bugs) => {
  const container = document.getElementById('ai-results-container');
  container.innerHTML = '<h3>Analysis Complete</h3><div style="margin-top:20px; display:flex; flex-direction:column; gap:16px;"></div>';
  const list = container.querySelector('div');

  if (bugs.length === 0) {
    list.innerHTML = '<div class="glass-panel" style="padding:20px; text-align:center; color:var(--success);">✅ No bugs found! This implementation perfectly matches the 10Pearls Senior UI principles.</div>';
    return;
  }

  bugs.forEach(bug => {
    const card = document.createElement('div');
    card.className = 'glass-panel';
    card.style.padding = '20px';
    card.style.borderLeft = bug.severity === 'High' ? '4px solid var(--error)' : (bug.severity === 'Medium' ? '4px solid var(--warning)' : '4px solid var(--accent-color)');
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <h4 style="color:var(--text-primary);">${bug.title}</h4>
        <span style="font-size:0.7rem; padding:4px 8px; border-radius:4px; background:rgba(255,255,255,0.05); color:var(--text-secondary); text-transform:uppercase;">${bug.severity}</span>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; font-size:0.9rem; color:var(--text-secondary); margin-bottom:12px;">
        <div><strong>Expected:</strong> <br/> ${bug.expected}</div>
        <div><strong>Actual:</strong> <br/> ${bug.actual}</div>
      </div>
      <div style="font-size:0.9rem; padding:12px; background:rgba(0,0,0,0.2); border-radius:6px;">
        <strong>Recommendation:</strong> ${bug.recommendation}
      </div>
    `;
    list.appendChild(card);
  });
}

/**
 * Handles the comparison view after fetching designs
 */
const renderComparisonUI = (figmaImageUrl) => {
  setupPanel.style.display = 'none';

  const ui = document.createElement('div');
  ui.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h2>Senior UI Comparison</h2>
      <button class="secondary" onclick="location.reload()">New Analysis</button>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom:24px;">
      <div class="glass-panel" style="padding:24px;">
        <h3 style="margin-bottom:16px; color:var(--accent-color); font-size:1rem;">Expected Result (Design)</h3>
        <div style="background:rgba(0,0,0,0.3); border-radius:8px; height:450px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
          <img src="${figmaImageUrl}" id="expected-img" style="max-width:100%; max-height:100%; object-fit:contain;" />
        </div>
      </div>

      <div class="glass-panel" style="padding:24px;">
        <h3 style="margin-bottom:16px; color:var(--text-secondary); font-size:1rem;">Actual Implementation (Screenshot)</h3>
        <div id="upload-zone" style="background:rgba(255,255,255,0.03); border:2px dashed var(--border-color); border-radius:8px; height:450px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:20px; transition:all 0.3s ease;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <div style="text-align:center;">
            <p style="color:var(--text-primary); margin-bottom:4px;">Upload Implementation Screenshot</p>
            <p style="font-size:0.8rem; color:var(--text-secondary);">Drag and drop or click to browse</p>
          </div>
          <input type="file" id="actual-upload" accept="image/*" style="display:none;" />
          <img id="actual-preview" style="display:none; max-width:100%; max-height:100%; object-fit:contain;" />
        </div>
      </div>
    </div>

    <div id="ai-action-area" style="display:none; margin-bottom:24px;">
      <div class="glass-panel" style="padding:24px; display:flex; justify-content:space-between; align-items:center; border: 1px solid var(--accent-color);">
        <div>
          <h3 style="font-size:1.1rem; margin-bottom:4px;">Ready for Senior Review</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary);">The AI will now verify aesthetics, typography, and layout based on the 10Pearls Design System.</p>
        </div>
        <button id="run-ai-btn" style="padding:12px 32px; background:var(--accent-color); font-size:1rem;">Run AI Analysis</button>
      </div>
    </div>

    <div id="ai-results-container" class="glass-panel" style="padding:32px; display:none;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="spinner" style="width:20px; height:20px; border-width:2px;"></div>
        <p>AI is analyzing designs according to 10Pearls typography rules...</p>
      </div>
    </div>
  `;
  contentArea.appendChild(ui);

  const uploadZone = document.getElementById('upload-zone');
  const uploadInput = document.getElementById('actual-upload');
  const actualPreview = document.getElementById('actual-preview');
  const aiActionArea = document.getElementById('ai-action-area');
  const runAiBtn = document.getElementById('run-ai-btn');
  const aiResultsContainer = document.getElementById('ai-results-container');

  uploadZone.onclick = () => uploadInput.click();
  
  uploadInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        actualPreview.src = e.target.result;
        actualPreview.style.display = 'block';
        uploadZone.querySelector('div').style.display = 'none';
        uploadZone.querySelector('svg').style.display = 'none';
        uploadZone.style.borderStyle = 'solid';
        aiActionArea.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  };

  runAiBtn.onclick = async () => {
    runAiBtn.disabled = true;
    runAiBtn.innerHTML = 'Analyzing...';
    aiResultsContainer.style.display = 'block';
    
    // Gather Metadata
    const metadata = {
      webpageUrl: document.getElementById('webpage-url').value,
      compareUrl: document.getElementById('compare-url').value,
      metaTitle: document.getElementById('meta-title').value,
      metaDesc: document.getElementById('meta-description').value
    };

    try {
      const figmaBase64 = await fetchUrlAsBase64(figmaImageUrl);
      const actualBase64 = actualPreview.src;
      
      const bugs = await runAIAnalysis(getGeminiKey(), figmaBase64, actualBase64, metadata);
      renderResultsUI(bugs);
      aiActionArea.style.display = 'none'; // Clear space
    } catch (err) {
      aiResultsContainer.innerHTML = `<p style="color:var(--error);">Error: ${err.message}</p>`;
      runAiBtn.disabled = false;
      runAiBtn.innerHTML = 'Retry AI Analysis';
    }
  }
}

startBtn.addEventListener('click', async () => {
  const token = getFigmaToken();
  const gemini = getGeminiKey();
  
  if (!token || !gemini) {
    toggleModal(true);
    return;
  }

  const figmaUrl = figmaUrlInput.value.trim();
  if (!figmaUrl) {
    showError("Please enter a Figma Designer URL");
    return;
  }

  const urlParams = parseFigmaUrl(figmaUrl);
  if (!urlParams || !urlParams.fileKey || !urlParams.nodeId) {
    showError("Invalid Figma URL. Please copy a link directly to a specific Node.");
    return;
  }

  startBtn.innerHTML = 'Fetching Design...';
  startBtn.disabled = true;

  try {
    const figmaImage = await fetchFigmaNodeImage(token, urlParams.fileKey, urlParams.nodeId);
    renderComparisonUI(figmaImage);
  } catch (err) {
    showError(err.message);
    startBtn.innerHTML = 'Launch Analysis Engine';
    startBtn.disabled = false;
  }
});

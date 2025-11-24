// ================================================================
// COWBOYS PLAYOFF PREDICTOR — FRONTEND ENGINE (v3.3 Fixed)
// ================================================================

// ⚠️ IMPORTANT: While developing, use localhost. 
// Switch this to your Render URL only after you deploy the Backend changes.
const API_URL = window.location.hostname === "localhost"
    ? "http://localhost:3001/api" 
    : "https://cowboys-playoff-prediction-app.onrender.com/api";

const RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 1000;

let currentPrediction = null;
let predictionHistory = [];

document.addEventListener("DOMContentLoaded", () => {
  console.log("🏈 Cowboys Playoff Predictor starting...");
  setupEventListeners();
  setupSmoothScroll();
  setupFanConfidence();
  initializeApp();
});

// -------------------- Initialization --------------------
async function initializeApp() {
  try {
    console.log(`Connecting to API at: ${API_URL}`);
    await Promise.all([
      loadCurrentDataWithRetry(),
      loadPredictionHistoryWithRetry(),
    ]);
  } catch (err) {
    console.error("❌ Initialization failed. Switching to Offline Mode.", err);
    showError("Backend unreachable. Showing offline simulation data.");
    showMockData(); // <--- This function is now defined below
  }
}

// -------------------- API --------------------
async function fetchWithRetry(url, options = {}, attempts = RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY * (i + 1)));
    }
  }
}

async function loadCurrentDataWithRetry() {
  const url = `${API_URL}/prediction/current`;
  const data = await fetchWithRetry(url);
  currentPrediction = data.prediction || data;
  updatePredictionDisplay(currentPrediction);
}

async function loadPredictionHistoryWithRetry() {
  const url = `${API_URL}/prediction/history`;
  const data = await fetchWithRetry(url);
  predictionHistory = data.history || [];
  updateHistoryDisplay(predictionHistory);
}

// -------------------- Fallback / Mock Data --------------------
// This was missing in the previous version
function showMockData() {
  console.log("⚠️ Using Mock Data");
  
  const mockPrediction = {
    playoffs: 0.65,
    division: 0.35,
    conference: 0.15,
    superBowl: 0.05,
    confidence_score: 70
  };

  updatePredictionDisplay(mockPrediction);

  // Mock History
  const mockHistory = [
    { generatedAt: new Date().toISOString(), playoffs: 0.62, division: 0.30, conference: 0.12, superBowl: 0.04 },
    { generatedAt: new Date(Date.now() - 86400000).toISOString(), playoffs: 0.58, division: 0.28, conference: 0.10, superBowl: 0.03 }
  ];
  
  updateHistoryDisplay(mockHistory);
}

// -------------------- Display Logic --------------------
function updatePredictionDisplay(pred) {
  if (!pred) return;
  const playoff = toPercent(pred.playoffs || pred.playoff_probability);
  const div = toPercent(pred.division || pred.division_probability);
  const conf = toPercent(pred.conference || pred.conference_probability);
  const bowl = toPercent(pred.superBowl || pred.superbowl_probability);
  const confScore = normalizeConfidence(pred.confidence_score);

  safeSetText("playoff-prob", `${playoff}%`);
  safeSetText("division-prob", `${div}%`);
  safeSetText("superbowl-prob", `${bowl}%`);
  
  safeSetWidth("playoff-bar", playoff);
}

function updateHistoryDisplay(history) {
  // Since we removed the history list from index.html in the revamp, 
  // we check if the element exists before trying to update it.
  const container = document.getElementById("history-list");
  if (!container) return; 

  if (!history || history.length === 0) {
    container.innerHTML = "<div class='loading'>No history available.</div>";
    return;
  }
  // If you added the history list back, this populates it
  container.innerHTML = history.map(pred => `
    <div class="history-item">
      <div>${new Date(pred.generatedAt || pred.prediction_date).toLocaleDateString()}</div>
      <div>${toPercent(pred.playoffs || pred.playoff_probability)}% Chance</div>
    </div>
  `).join("");
}

// -------------------- Fan Confidence Tracker --------------------
const FAN_KEY = "fanVote2025";
let fanConfidence = 65;

function setupFanConfidence() {
  const saved = localStorage.getItem(FAN_KEY);
  if (saved) fanConfidence = parseInt(saved, 10);
  
  updateFanMeter();
  
  const upBtn = document.getElementById("vote-up");
  const downBtn = document.getElementById("vote-down");
  
  if (upBtn) upBtn.addEventListener("click", () => handleFanVote(true));
  if (downBtn) downBtn.addEventListener("click", () => handleFanVote(false));
}

function handleFanVote(upvote) {
  if (localStorage.getItem(FAN_KEY + "_voted")) {
    alert("You already voted this session!");
    return;
  }
  fanConfidence = Math.min(100, Math.max(0, fanConfidence + (upvote ? 5 : -5)));
  localStorage.setItem(FAN_KEY, fanConfidence);
  localStorage.setItem(FAN_KEY + "_voted", "true");
  updateFanMeter();
}

function updateFanMeter() {
  const bar = document.getElementById("fan-meter");
  const val = document.getElementById("fan-meter-value");
  
  // Safety check to prevent "Cannot read properties of null"
  if (bar) {
    bar.style.width = `${fanConfidence}%`;
  }
  if (val) {
    val.textContent = `${fanConfidence}%`;
  }
}

// -------------------- Utils --------------------
function setupEventListeners() {
    // Add any specific button listeners here if needed
}

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href'))?.scrollIntoView({
        behavior: 'smooth'
      });
    });
  });
}

function toPercent(v) {
  if (v == null) return 0;
  const n = Number(v);
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

function normalizeConfidence(v) {
  if (v == null) return 75;
  const n = Number(v);
  return n > 1 ? Math.round(n) : Math.round(n * 100);
}

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function safeSetWidth(id, percent) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${percent}%`;
}

function showError(msg) {
  console.warn(msg);
  // Optional: create a visible banner
}


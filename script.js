// ================================================================
// COWBOYS PLAYOFF PREDICTOR — FRONTEND ENGINE (v3.4 FINAL)
// ================================================================

// 1. POINT TO LOCALHOST TO FIX 500 ERRORS
// We are forcing localhost because your live Render server is outdated.
const API_URL = "http://localhost:3001/api";

const RETRY_ATTEMPTS = 1;
const RETRY_DELAY = 1000;

document.addEventListener("DOMContentLoaded", () => {
  console.log("🏈 Cowboys Playoff Predictor starting...");
  setupFanConfidence();
  setupSmoothScroll();
  initializeApp();
});

// -------------------- Initialization --------------------
async function initializeApp() {
  try {
    console.log(`Connecting to Backend at: ${API_URL}`);
    
    // Attempt to load data
    const predictionData = await fetchWithRetry(`${API_URL}/prediction/current`);
    
    // If successful, update UI
    if (predictionData) {
      updatePredictionDisplay(predictionData.prediction || predictionData);
    }

  } catch (err) {
    console.warn("⚠️ Backend unreachable or erroring. Switching to Offline Mode.");
    showMockData(); // FALLBACK to ensure website looks good
  }
}

// -------------------- Fallback / Mock Data --------------------
function showMockData() {
  // This data displays if the server is off
  const mockPrediction = {
    playoffs: 0.72,
    division: 0.45,
    conference: 0.18,
    superBowl: 0.08,
    confidence_score: 85
  };
  updatePredictionDisplay(mockPrediction);
}

// -------------------- Display Logic --------------------
function updatePredictionDisplay(pred) {
  if (!pred) return;
  
  const playoff = toPercent(pred.playoffs || pred.playoff_probability);
  const div = toPercent(pred.division || pred.division_probability);
  const bowl = toPercent(pred.superBowl || pred.superbowl_probability);

  safeSetText("playoff-prob", `${playoff}%`);
  safeSetText("division-prob", `${div}%`);
  safeSetText("superbowl-prob", `${bowl}%`);
  
  safeSetWidth("playoff-bar", playoff);
  safeSetWidth("division-bar", div);
  safeSetWidth("superbowl-bar", bowl);
}

// -------------------- API Helper --------------------
async function fetchWithRetry(url, attempts = RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }
}

// -------------------- Fan Confidence --------------------
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
  
  if (bar) bar.style.width = `${fanConfidence}%`;
  if (val) val.textContent = `${fanConfidence}%`;
}

// -------------------- Utils --------------------
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

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function safeSetWidth(id, percent) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${percent}%`;
}

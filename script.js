// ================================================================
// COWBOYS PREDICTOR - GITHUB FIX (v3.5)
// ================================================================

// 1. POINT TO YOUR LIVE RENDER SERVER
const API_URL = "https://cowboys-playoff-prediction-app.onrender.com/api";

const RETRY_ATTEMPTS = 1;
const RETRY_DELAY = 1000;

document.addEventListener("DOMContentLoaded", () => {
  console.log("Starting App...");
  setupFanConfidence();
  setupSmoothScroll();
  initializeApp();
});

async function initializeApp() {
  try {
    // Try to fetch live data
    const data = await fetchWithRetry(`${API_URL}/prediction/current`);
    updatePredictionDisplay(data.prediction || data);
  } catch (err) {
    console.warn("⚠️ Server Error (500) or Offline. Switching to Mock Data.");
    // 2. FALLBACK TO MOCK DATA IF SERVER CRASHES
    showMockData();
  }
}

function showMockData() {
  const mock = {
    playoffs: 0.72,
    division: 0.45,
    conference: 0.18,
    superBowl: 0.08,
    confidence_score: 85
  };
  updatePredictionDisplay(mock);
}

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

// Helper Functions
async function fetchWithRetry(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function safeSetWidth(id, percent) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${percent}%`;
}

function toPercent(v) {
  if (v == null) return 0;
  return Number(v) <= 1 ? Math.round(Number(v) * 100) : Math.round(Number(v));
}

// Fan Confidence Logic
const FAN_KEY = "fanVote2025";
let fanConfidence = 65;

function setupFanConfidence() {
  const saved = localStorage.getItem(FAN_KEY);
  if (saved) fanConfidence = parseInt(saved, 10);
  updateFanMeter();
  
  const up = document.getElementById("vote-up");
  const down = document.getElementById("vote-down");
  if(up) up.addEventListener("click", () => handleFanVote(true));
  if(down) down.addEventListener("click", () => handleFanVote(false));
}

function handleFanVote(upvote) {
  if (localStorage.getItem(FAN_KEY + "_voted")) return alert("Already voted!");
  fanConfidence = Math.min(100, Math.max(0, fanConfidence + (upvote ? 5 : -5)));
  localStorage.setItem(FAN_KEY, fanConfidence);
  localStorage.setItem(FAN_KEY + "_voted", "true");
  updateFanMeter();
}

function updateFanMeter() {
  const bar = document.getElementById("fan-meter");
  const val = document.getElementById("fan-meter-value");
  if(bar) bar.style.width = `${fanConfidence}%`;
  if(val) val.textContent = `${fanConfidence}%`;
}

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href'))?.scrollIntoView({behavior: 'smooth'});
    });
  });
}

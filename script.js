// ================================================================
// COWBOYS PLAYOFF PREDICTOR — FRONTEND ENGINE (v3.1)
// ================================================================
// Fully synced with backend endpoints:
//   /api/prediction/current
//   /api/prediction/generate
//   /api/prediction/history
//   /api/cowboys/record
// ================================================================

const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001/api"
    : "https://cowboys-playoff-prediction-app.onrender.com/api";

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1200;
const currentYear = new Date().getFullYear();

let currentPrediction = null;
let predictionHistory = [];
let seasonData = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("🏈 Cowboys Playoff Predictor starting...");
  console.log("API URL:", API_URL);
  setupEventListeners();
  setupSmoothScroll();
  initializeApp();
});

// -------------------- Initialization --------------------
async function initializeApp() {
  showLoadingState(true);

  try {
    await Promise.all([
      loadCurrentDataWithRetry(),
      loadLiveRecordWithRetry(),
      loadPredictionHistoryWithRetry(),
    ]);
  } catch (err) {
    console.error("❌ Initialization failed:", err);
    showError("Unable to reach backend. Showing mock data.");
    showMockData();
  } finally {
    showLoadingState(false);
  }
}

// -------------------- Event Listeners --------------------
function setupEventListeners() {
  const generateBtn = document.getElementById("generate-btn");
  if (generateBtn) generateBtn.addEventListener("click", generateNewPrediction);

  window.addEventListener("scroll", () => {
    const nav = document.querySelector(".main-nav");
    if (!nav) return;
    if (window.scrollY > 80) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  });
}

function setupSmoothScroll() {
  document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (targetId && targetId.startsWith("#")) {
        e.preventDefault();
        const section = document.querySelector(targetId);
        if (section) section.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

// -------------------- API Helpers --------------------
async function fetchWithRetry(url, options = {}, attempts = RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`Fetch ${i + 1}/${attempts} failed: ${url}`, err.message);
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY * (i + 1)));
    }
  }
}

// -------------------- Data Loaders --------------------
async function loadCurrentDataWithRetry() {
  const url = `${API_URL}/prediction/current`;
  const data = await fetchWithRetry(url);

  currentPrediction = data.prediction || data;
  seasonData = data.season || data.seasonData || { wins: 0, losses: 0, ties: 0 };

  updatePredictionDisplay(currentPrediction);
  updateSeasonDisplay(seasonData);
}

async function loadLiveRecordWithRetry() {
  const url = `${API_URL}/cowboys/record?year=${currentYear}`;
  try {
    const record = await fetchWithRetry(url);
    // Merge into seasonData without removing ratings
    seasonData = { ...seasonData, ...record };
    updateLiveRecordDisplay(seasonData);
  } catch {
    console.warn("Live record unavailable — continuing with prediction data only.");
  }
}

async function loadPredictionHistoryWithRetry() {
  const url = `${API_URL}/prediction/history`;
  try {
    const data = await fetchWithRetry(url);
    predictionHistory = data.history || [];
    updateHistoryDisplay(predictionHistory);
  } catch {
    console.warn("Prediction history failed to load.");
  }
}

// -------------------- Generate Prediction --------------------
async function generateNewPrediction() {
  const btn = document.getElementById("generate-btn");
  if (!btn) return;

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "<span>GENERATING...</span>";

  try {
    const url = `${API_URL}/prediction/generate`;
    const data = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    currentPrediction = data.prediction || data;
    updatePredictionDisplay(currentPrediction);
    await loadPredictionHistoryWithRetry();

    btn.innerHTML = "<span>✓ UPDATED</span>";
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);
  } catch (err) {
    console.error("Error generating new prediction:", err);
    showError("Prediction generation failed.");
    btn.innerHTML = "<span>ERROR - TRY AGAIN</span>";
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);
  }
}

// -------------------- UI Updates --------------------
function updatePredictionDisplay(prediction) {
  if (!prediction) return;

  const playoffProb = toPercent(prediction.playoffs || prediction.playoff_probability);
  const divisionProb = toPercent(prediction.division || prediction.division_probability);
  const conferenceProb = toPercent(prediction.conference || prediction.conference_probability);
  const superbowlProb = toPercent(prediction.superBowl || prediction.superbowl_probability);
  const confidence = normalizeConfidence(prediction.confidence_score);

  safeSetText("playoff-prob", `${playoffProb}%`);
  safeSetText("division-prob", `${divisionProb}%`);
  safeSetText("conference-prob", `${conferenceProb}%`);
  safeSetText("superbowl-prob", `${superbowlProb}%`);
  safeSetText("confidence", `${confidence}%`);

  setTimeout(() => {
    safeSetWidth("playoff-bar", playoffProb);
    safeSetWidth("division-bar", divisionProb);
    safeSetWidth("conference-bar", conferenceProb);
    safeSetWidth("superbowl-bar", superbowlProb);
  }, 150);
}

function updateSeasonDisplay(season) {
  if (!season) return;

  const record = `${season.wins}-${season.losses}-${season.ties || 0}`;
  const totalGames = season.wins + season.losses + (season.ties || 0);
  const winPct = totalGames > 0 ? (season.wins / totalGames).toFixed(3) : ".000";

  safeSetText("record", record);
  safeSetText("win-pct", winPct);

  if (season.avg_points_scored !== undefined)
    safeSetText("off-rating", season.avg_points_scored.toFixed(1));

  if (season.avg_points_allowed !== undefined)
    safeSetText("def-rating", season.avg_points_allowed.toFixed(1));
}

function updateLiveRecordDisplay(data) {
  if (!data) return;

  const record = `${data.wins}-${data.losses}-${data.ties || 0}`;
  const totalGames = data.wins + data.losses + (data.ties || 0);
  const winPct = totalGames > 0 ? (data.wins / totalGames).toFixed(3) : ".000";

  safeSetText("record", record);
  safeSetText("win-pct", winPct);
}

function updateHistoryDisplay(history) {
  const container = document.getElementById("history-list");
  if (!container) return;

  if (!history || history.length === 0) {
    container.innerHTML =
      '<div class="loading">No prediction history yet. Generate one!</div>';
    return;
  }

  container.innerHTML = history
    .map((pred) => {
      const dateStr = pred.generatedAt || pred.prediction_date || new Date().toISOString();
      const date = new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const playoff = toPercent(pred.playoffs || pred.playoff_probability);
      const division = toPercent(pred.division || pred.division_probability);
      const conference = toPercent(pred.conference || pred.conference_probability);
      const superbowl = toPercent(pred.superBowl || pred.superbowl_probability);

      return `
        <div class="history-item">
          <div class="history-date">${date}</div>
          <div class="history-predictions">
            <div class="history-pred"><div class="history-pred-label">PLAYOFFS</div><div class="history-pred-value">${playoff}%</div></div>
            <div class="history-pred"><div class="history-pred-label">DIVISION</div><div class="history-pred-value">${division}%</div></div>
            <div class="history-pred"><div class="history-pred-label">CONFERENCE</div><div class="history-pred-value">${conference}%</div></div>
            <div class="history-pred"><div class="history-pred-label">SUPER BOWL</div><div class="history-pred-value">${superbowl}%</div></div>
          </div>
        </div>`;
    })
    .join("");
}

// -------------------- Helpers --------------------
function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function safeSetWidth(id, percent) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${percent}%`;
}

function showError(msg) {
  console.error(msg);
  const banner = document.createElement("div");
  banner.className = "error-banner";
  banner.textContent = msg;
  banner.style.cssText =
    "position:fixed;top:0;left:0;width:100%;padding:10px;background:#ff6b35;color:white;text-align:center;z-index:9999;";
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 4000);
}

function showLoadingState(active) {
  const root = document.body;
  if (active) root.classList.add("loading-active");
  else root.classList.remove("loading-active");
}

// Converts 0.82 -> 82, 82 -> 82
function toPercent(value) {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return num <= 1 ? Math.round(num * 100) : Math.round(num);
}

// Fixes 0.75 → 75% and 75 → 75%
function normalizeConfidence(raw) {
  if (raw === undefined || raw === null) return 75;
  const val = Number(raw);
  if (isNaN(val)) return 75;
  return val > 1 ? Math.round(val) : Math.round(val * 100);
}

// -------------------- Mock Mode --------------------
function showMockData() {
  console.warn("⚠️ Using mock fallback data (API unreachable)");
  const mockPrediction = {
    playoffs: 0.76,
    division: 0.48,
    conference: 0.19,
    superBowl: 0.07,
    confidence_score: 0.85,
  };

  const mockSeason = {
    wins: 8,
    losses: 5,
    ties: 0,
    avg_points_scored: 27.3,
    avg_points_allowed: 21.4,
  };

  const mockHistory = [
    { generatedAt: new Date().toISOString(), ...mockPrediction },
    { generatedAt: new Date(Date.now() - 86400000).toISOString(), ...mockPrediction },
  ];

  updatePredictionDisplay(mockPrediction);
  updateSeasonDisplay(mockSeason);
  updateHistoryDisplay(mockHistory);
}

// -------------------- Dev Diagnostics --------------------
window.debugCowboys = {
  reload: initializeApp,
  state: () => ({
    currentPrediction,
    predictionHistory,
    seasonData,
  }),
  mock: showMockData,
};

console.log("✅ Frontend logic loaded successfully");


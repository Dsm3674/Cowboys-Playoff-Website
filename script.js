// ================================================================
// COWBOYS PLAYOFF PREDICTOR — FRONTEND ENGINE (v3.2)
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

document.addEventListener("DOMContentLoaded", () => {
  console.log("🏈 Cowboys Playoff Predictor starting...");
  setupEventListeners();
  setupSmoothScroll();
  initializeApp();
  setupFanConfidence();
});

// -------------------- Initialization --------------------
async function initializeApp() {
  try {
    await Promise.all([
      loadCurrentDataWithRetry(),
      loadPredictionHistoryWithRetry(),
    ]);
  } catch (err) {
    console.error("❌ Initialization failed:", err);
    showError("Unable to reach backend. Showing mock data.");
    showMockData();
  }
}

// -------------------- Event Listeners --------------------
function setupEventListeners() {
  const generateBtn = document.getElementById("generate-btn");
  if (generateBtn) generateBtn.addEventListener("click", generateNewPrediction);
}

function setupSmoothScroll() {
  document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (targetId.startsWith("#")) {
        e.preventDefault();
        document
          .querySelector(targetId)
          ?.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
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

async function generateNewPrediction() {
  const btn = document.getElementById("generate-btn");
  btn.disabled = true;
  btn.textContent = "GENERATING...";

  try {
    const data = await fetchWithRetry(`${API_URL}/prediction/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    currentPrediction = data.prediction || data;
    updatePredictionDisplay(currentPrediction);
    await loadPredictionHistoryWithRetry();
    btn.textContent = "✓ UPDATED";
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "GENERATE NEW PREDICTION →";
    }, 2000);
  } catch (err) {
    showError("Prediction generation failed.");
    btn.textContent = "ERROR - TRY AGAIN";
    setTimeout(() => (btn.textContent = "GENERATE NEW PREDICTION →"), 2000);
  }
}

// -------------------- Display --------------------
function updatePredictionDisplay(pred) {
  if (!pred) return;
  const playoff = toPercent(pred.playoffs);
  const div = toPercent(pred.division);
  const conf = toPercent(pred.conference);
  const bowl = toPercent(pred.superBowl);
  const confScore = normalizeConfidence(pred.confidence_score);
  safeSetText("playoff-prob", `${playoff}%`);
  safeSetText("division-prob", `${div}%`);
  safeSetText("conference-prob", `${conf}%`);
  safeSetText("superbowl-prob", `${bowl}%`);
  safeSetText("confidence", `${confScore}%`);
  safeSetWidth("playoff-bar", playoff);
  safeSetWidth("division-bar", div);
  safeSetWidth("conference-bar", conf);
  safeSetWidth("superbowl-bar", bowl);
}

function updateHistoryDisplay(history) {
  const container = document.getElementById("history-list");
  if (!history || history.length === 0) {
    container.innerHTML =
      "<div class='loading'>No prediction history yet. Generate one!</div>";
    return;
  }
  container.innerHTML = history
    .map(
      (pred) => `
    <div class="history-item">
      <div class="history-date">${new Date(pred.generatedAt).toLocaleString()}</div>
      <div class="history-predictions">
        <div class="history-pred"><div class="history-pred-label">PLAYOFFS</div><div class="history-pred-value">${toPercent(pred.playoffs)}%</div></div>
        <div class="history-pred"><div class="history-pred-label">DIVISION</div><div class="history-pred-value">${toPercent(pred.division)}%</div></div>
        <div class="history-pred"><div class="history-pred-label">CONFERENCE</div><div class="history-pred-value">${toPercent(pred.conference)}%</div></div>
        <div class="history-pred"><div class="history-pred-label">SUPER BOWL</div><div class="history-pred-value">${toPercent(pred.superBowl)}%</div></div>
      </div>
    </div>`
    )
    .join("");
}

// -------------------- Fan Confidence Tracker --------------------
const FAN_KEY = "fanVote2025";
let fanConfidence = 65;

function setupFanConfidence() {
  const saved = localStorage.getItem(FAN_KEY);
  if (saved) fanConfidence = parseInt(saved, 10);
  updateFanMeter();
  document.getElementById("vote-up")?.addEventListener("click", () => handleFanVote(true));
  document.getElementById("vote-down")?.addEventListener("click", () => handleFanVote(false));
}

function handleFanVote(upvote) {
  if (localStorage.getItem(FAN_KEY)) {
    showError("You already voted this session!");
    return;
  }
  fanConfidence = Math.min(100, Math.max(0, fanConfidence + (upvote ? 5 : -5)));
  localStorage.setItem(FAN_KEY, fanConfidence);
  updateFanMeter();
}

function updateFanMeter() {
  document.getElementById("fan-meter").style.width = `${fanConfidence}%`;
  document.getElementById("fan-meter-value").textContent = `${fanConfidence}%`;
}

// -------------------- Utils --------------------
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
  console.error(msg);
  const banner = document.createElement("div");
  banner.className = "error-banner";
  banner.textContent = msg;
  banner.style.cssText =
    "position:fixed;top:0;left:0;width:100%;padding:10px;background:#ff6b35;color:white;text-align:center;z-index:9999;";
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 3000);
}



const API_URL = "https://cowboys-playoff-prediction-app.onrender.com/api";
const RETRY_ATTEMPTS = 1;
const RETRY_DELAY = 1000;

document.addEventListener("DOMContentLoaded", () => {
  setupFanConfidence();
  setupSmoothScroll();
  initializeApp();
});

async function initializeApp() {
  try {
    // ✅ FIX: use an endpoint that ACTUALLY EXISTS
    const data = await fetchWithRetry(`${API_URL}/prediction/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelType: "RandomForest" }),
    });

    // backend returns { success, prediction }
    updatePredictionDisplay(data.prediction);
  } catch (err) {
    console.error("Live API failed, falling back to mock data:", err);
    showMockData();
  }
}

function showMockData() {
  const mock = {
    playoff_probability: 0.72,
    division_probability: 0.45,
    superbowl_probability: 0.08,
    confidence_score: 85,
  };
  updatePredictionDisplay(mock);
}

function updatePredictionDisplay(pred) {
  if (!pred) return;

  const playoff = toPercent(pred.playoff_probability);
  const div = toPercent(pred.division_probability);
  const bowl = toPercent(pred.superbowl_probability);

  safeSetText("playoff-prob", `${playoff}%`);
  safeSetText("division-prob", `${div}%`);
  safeSetText("superbowl-prob", `${bowl}%`);

  safeSetWidth("playoff-bar", playoff);
  safeSetWidth("division-bar", div);
  safeSetWidth("superbowl-bar", bowl);
}

async function fetchWithRetry(url, options = {}) {
  const res = await fetch(url, options);
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
  return Number(v) <= 1
    ? Math.round(Number(v) * 100)
    : Math.round(Number(v));
}

/* ---------------- FAN CONFIDENCE (UNCHANGED) ---------------- */

const FAN_KEY = "fanVote2025";
let fanConfidence = 65;

function setupFanConfidence() {
  const saved = localStorage.getItem(FAN_KEY);
  if (saved) fanConfidence = parseInt(saved, 10);
  updateFanMeter();

  const up = document.getElementById("vote-up");
  const down = document.getElementById("vote-down");

  if (up) up.addEventListener("click", () => handleFanVote(true));
  if (down) down.addEventListener("click", () => handleFanVote(false));
}

function handleFanVote(upvote) {
  if (localStorage.getItem(FAN_KEY + "_voted"))
    return alert("Already voted!");
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



function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      document
        .querySelector(this.getAttribute("href"))
        ?.scrollIntoView({ behavior: "smooth" });
    });
  });
}



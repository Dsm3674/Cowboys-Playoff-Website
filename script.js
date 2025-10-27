// =========================
// API CONFIGURATION
// =========================

// Automatically use Render API when deployed, or localhost for dev
const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001/api"
    : "https://cowboys-playoff-prediction-app.onrender.com/api";

// State management
let currentPrediction = null;
let predictionHistory = [];

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  setupEventListeners();
  setupSmoothScroll();
});

function setupEventListeners() {
  const generateBtn = document.getElementById("generate-btn");
  if (generateBtn) {
    generateBtn.addEventListener("click", generateNewPrediction);
  }
}

function setupSmoothScroll() {
  document.querySelectorAll("nav a").forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });
}

async function initializeApp() {
  try {
    await loadCurrentPrediction();
    await loadSeasonStats();
    await loadPredictionHistory();
  } catch (error) {
    console.error("Error initializing app:", error);
    showMockData();
  }
}

// =========================
// API FUNCTIONS
// =========================
async function loadCurrentPrediction() {
  try {
    const response = await fetch(`${API_URL}/predictions/current`);
    if (!response.ok) throw new Error("Failed to fetch prediction");

    const data = await response.json();
    currentPrediction = data.prediction;
    updatePredictionDisplay(currentPrediction);
  } catch (error) {
    console.error("Error loading prediction:", error);
    throw error;
  }
}

async function generateNewPrediction() {
  const btn = document.getElementById("generate-btn");
  btn.disabled = true;
  btn.textContent = "GENERATING...";

  try {
    const response = await fetch(`${API_URL}/predictions/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error("Failed to generate prediction");

    const data = await response.json();
    currentPrediction = data.prediction;
    updatePredictionDisplay(currentPrediction);
    await loadPredictionHistory();

    btn.textContent = "PREDICTION UPDATED";
    setTimeout(() => {
      btn.textContent = "GENERATE NEW PREDICTION";
      btn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error("Error generating prediction:", error);
    btn.textContent = "ERROR - TRY AGAIN";
    setTimeout(() => {
      btn.textContent = "GENERATE NEW PREDICTION";
      btn.disabled = false;
    }, 2000);
  }
}

async function loadSeasonStats() {
  try {
    const response = await fetch(`${API_URL}/teams/1/current`);
    if (!response.ok) throw new Error("Failed to fetch stats");

    const data = await response.json();
    updateStatsDisplay(data);
  } catch (error) {
    console.error("Error loading stats:", error);
    throw error;
  }
}

async function loadPredictionHistory() {
  try {
    const response = await fetch(`${API_URL}/predictions/history?limit=10`);
    if (!response.ok) throw new Error("Failed to fetch history");

    const data = await response.json();
    predictionHistory = data.history || data.predictions || [];
    updateHistoryDisplay(predictionHistory);
  } catch (error) {
    console.error("Error loading history:", error);
    throw error;
  }
}

// =========================
// DISPLAY UPDATE FUNCTIONS
// =========================
function updatePredictionDisplay(prediction) {
  if (!prediction) return;

  const playoffProb = Math.round(prediction.playoff_probability * 100);
  const divisionProb = Math.round(prediction.division_probability * 100);
  const conferenceProb = Math.round(prediction.conference_probability * 100);
  const superbowlProb = Math.round(prediction.superbowl_probability * 100);
  const confidence = Math.round(prediction.confidence_score * 100);

  document.getElementById("playoff-prob").textContent = `${playoffProb}%`;
  document.getElementById("division-prob").textContent = `${divisionProb}%`;
  document.getElementById("conference-prob").textContent = `${conferenceProb}%`;
  document.getElementById("superbowl-prob").textContent = `${superbowlProb}%`;
  document.getElementById("confidence").textContent = `${confidence}%`;

  // Animate progress bars
  setTimeout(() => {
    document.getElementById("playoff-bar").style.width = `${playoffProb}%`;
    document.getElementById("division-bar").style.width = `${divisionProb}%`;
    document.getElementById("conference-bar").style.width = `${conferenceProb}%`;
    document.getElementById("superbowl-bar").style.width = `${superbowlProb}%`;
  }, 100);
}

function updateStatsDisplay(data) {
  if (!data || !data.season) return;

  const s = data.season;
  const record = `${s.wins}-${s.losses}-${s.ties}`;
  const winPct = s.win_percentage ? s.win_percentage.toFixed(3) : ".000";
  const offRating = s.offensive_rating ? s.offensive_rating.toFixed(1) : "0.0";
  const defRating = s.defensive_rating ? s.defensive_rating.toFixed(1) : "0.0";

  document.getElementById("record").textContent = record;
  document.getElementById("win-pct").textContent = winPct;
  document.getElementById("off-rating").textContent = offRating;
  document.getElementById("def-rating").textContent = defRating;
}

function updateHistoryDisplay(history) {
  const list = document.getElementById("history-list");
  if (!list) return;

  if (!history || history.length === 0) {
    list.innerHTML = '<div class="loading">No prediction history available</div>';
    return;
  }

  list.innerHTML = history
    .map((pred) => {
      const date = new Date(pred.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
        <div class="history-item">
          <div class="history-date">${date}</div>
          <div class="history-predictions">
            <div class="history-pred">
              <div class="history-pred-label">PLAYOFFS</div>
              <div class="history-pred-value">${Math.round(
                pred.playoff_probability * 100
              )}%</div>
            </div>
            <div class="history-pred">
              <div class="history-pred-label">DIVISION</div>
              <div class="history-pred-value">${Math.round(
                pred.division_probability * 100
              )}%</div>
            </div>
            <div class="history-pred">
              <div class="history-pred-label">CONFERENCE</div>
              <div class="history-pred-value">${Math.round(
                pred.conference_probability * 100
              )}%</div>
            </div>
            <div class="history-pred">
              <div class="history-pred-label">SUPER BOWL</div>
              <div class="history-pred-value">${Math.round(
                pred.superbowl_probability * 100
              )}%</div>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

// =========================
// MOCK DATA (fallback)
// =========================
function showMockData() {
  console.log("Using mock data (API not reachable)");

  const mockPrediction = {
    playoff_probability: 0.42,
    division_probability: 0.28,
    conference_probability: 0.12,
    superbowl_probability: 0.06,
    confidence_score: 0.73,
  };

  const mockStats = {
    season: {
      wins: 3,
      losses: 3,
      ties: 0,
      win_percentage: 0.5,
      offensive_rating: 78.5,
      defensive_rating: 82.3,
    },
  };

  const mockHistory = [
    {
      created_at: new Date().toISOString(),
      playoff_probability: 0.42,
      division_probability: 0.28,
      conference_probability: 0.12,
      superbowl_probability: 0.06,
    },
  ];

  updatePredictionDisplay(mockPrediction);
  updateStatsDisplay(mockStats);
  updateHistoryDisplay(mockHistory);
}


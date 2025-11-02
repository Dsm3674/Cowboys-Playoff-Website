
const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001/api"
    : "https://cowboys-playoff-prediction-app.onrender.com/api";

// State management
let currentPrediction = null;
let predictionHistory = [];
let seasonData = null;
let currentYear = new Date().getFullYear();

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
      if (this.getAttribute("href").startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    });
  });
}

async function initializeApp() {
  try {
    await Promise.all([
      loadCurrentData(),
      loadLiveRecord(),
      loadPredictionHistory(),
    ]);
  } catch (error) {
    console.error("Error initializing app:", error);
    showError("Unable to connect to API. Using sample data.");
    showMockData();
  }
}

async function loadCurrentData() {
  try {
    const response = await fetch(`${API_URL}/cowboys/current`);
    if (!response.ok) throw new Error("Failed to fetch current data");

    const data = await response.json();

    // ✅ Support both flat and nested backend responses
    currentPrediction = data.prediction || data;
    seasonData = data.season || data.seasonData || { wins: 0, losses: 0, ties: 0 };

    updatePredictionDisplay(currentPrediction);
    updateSeasonDisplay(seasonData);
  } catch (error) {
    console.error("Error loading current data:", error);
    throw error;
  }
}

async function loadLiveRecord() {
  try {
    const response = await fetch(`${API_URL}/cowboys/record?year=${currentYear}`);
    if (!response.ok) throw new Error("Failed to fetch live record");

    const data = await response.json();
    updateLiveRecordDisplay(data);
  } catch (error) {
    console.warn("Live record endpoint not available, skipping...");
  }
}

async function generateNewPrediction() {
  const btn = document.getElementById("generate-btn");
  const originalText = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<span>GENERATING...</span>';

  try {
    const response = await fetch(`${API_URL}/cowboys/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error("Failed to generate prediction");

    const data = await response.json();
    currentPrediction = data.prediction || data;

    updatePredictionDisplay(currentPrediction);
    await loadPredictionHistory();

    btn.innerHTML = '<span>✓ PREDICTION UPDATED</span>';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error("Error generating prediction:", error);
    showError("Failed to generate new prediction. Please try again.");

    btn.innerHTML = '<span>ERROR - TRY AGAIN</span>';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);
  }
}

async function loadPredictionHistory() {
  try {
    const response = await fetch(`${API_URL}/cowboys/history?limit=10`);
    if (!response.ok) throw new Error("Failed to fetch history");

    const data = await response.json();
    predictionHistory = data.history || [];
    updateHistoryDisplay(predictionHistory);
  } catch (error) {
    console.error("Error loading history:", error);
    throw error;
  }
}

// -------------------------------
// UI UPDATE FUNCTIONS
// -------------------------------

function updatePredictionDisplay(prediction) {
  if (!prediction) return;

  // ✅ Fix: handle both 0.xx and xx values safely
  const playoffProb = Math.round(
    (prediction.playoff_probability > 1
      ? prediction.playoff_probability / 100
      : prediction.playoff_probability) * 100
  );
  const divisionProb = Math.round(
    (prediction.division_probability > 1
      ? prediction.division_probability / 100
      : prediction.division_probability) * 100
  );
  const conferenceProb = Math.round(
    (prediction.conference_probability > 1
      ? prediction.conference_probability / 100
      : prediction.conference_probability) * 100
  );
  const superbowlProb = Math.round(
    (prediction.superbowl_probability > 1
      ? prediction.superbowl_probability / 100
      : prediction.superbowl_probability) * 100
  );
  const confidence = Math.round(
    (prediction.confidence_score > 1
      ? prediction.confidence_score / 100
      : prediction.confidence_score) * 100
  );

  // Update UI
  document.getElementById("playoff-prob").textContent = `${playoffProb}%`;
  document.getElementById("division-prob").textContent = `${divisionProb}%`;
  document.getElementById("conference-prob").textContent = `${conferenceProb}%`;
  document.getElementById("superbowl-prob").textContent = `${superbowlProb}%`;
  document.getElementById("confidence").textContent = `${confidence}%`;

  // Animate bars
  setTimeout(() => {
    document.getElementById("playoff-bar").style.width = `${playoffProb}%`;
    document.getElementById("division-bar").style.width = `${divisionProb}%`;
    document.getElementById("conference-bar").style.width = `${conferenceProb}%`;
    document.getElementById("superbowl-bar").style.width = `${superbowlProb}%`;
  }, 100);
}

function updateSeasonDisplay(season) {
  if (!season) return;

  const record = `${season.wins}-${season.losses}-${season.ties || 0}`;
  const totalGames = season.wins + season.losses + (season.ties || 0);
  const winPct = totalGames > 0 ? (season.wins / totalGames).toFixed(3) : ".000";

  document.getElementById("record").textContent = record;
  document.getElementById("win-pct").textContent = winPct;

  // ✅ Fix: display offensive / defensive ratings if available
  if (season.avg_points_scored !== undefined)
    document.getElementById("off-rating").textContent = season.avg_points_scored.toFixed(1);
  if (season.avg_points_allowed !== undefined)
    document.getElementById("def-rating").textContent = season.avg_points_allowed.toFixed(1);
}

function updateLiveRecordDisplay(data) {
  if (!data) return;

  const record = `${data.wins}-${data.losses}-${data.ties || 0}`;
  const totalGames = data.wins + data.losses + (data.ties || 0);
  const winPct = totalGames > 0 ? (data.wins / totalGames).toFixed(3) : ".000";

  document.getElementById("record").textContent = record;
  document.getElementById("win-pct").textContent = winPct;
}

function updateHistoryDisplay(history) {
  const list = document.getElementById("history-list");
  if (!list) return;

  if (!history || history.length === 0) {
    list.innerHTML =
      '<div class="loading">No prediction history yet. Generate a prediction to start tracking!</div>';
    return;
  }

  list.innerHTML = history
    .map((pred) => {
      // ✅ Fix invalid date handling
      const dateStr =
        pred.prediction_date || pred.generatedAt || pred.created_at || new Date().toISOString();
      const date = new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const playoff = Math.round(
        (pred.playoff_probability > 1 ? pred.playoff_probability / 100 : pred.playoff_probability) *
          100
      );
      const division = Math.round(
        (pred.division_probability > 1 ? pred.division_probability / 100 : pred.division_probability) *
          100
      );
      const conference = Math.round(
        (pred.conference_probability > 1
          ? pred.conference_probability / 100
          : pred.conference_probability) * 100
      );
      const superbowl = Math.round(
        (pred.superbowl_probability > 1 ? pred.superbowl_probability / 100 : pred.superbowl_probability) *
          100
      );

      return `
        <div class="history-item">
          <div class="history-date">${date}</div>
          <div class="history-predictions">
            <div class="history-pred">
              <div class="history-pred-label">PLAYOFFS</div>
              <div class="history-pred-value">${playoff}%</div>
            </div>
            <div class="history-pred">
              <div class="history-pred-label">DIVISION</div>
              <div class="history-pred-value">${division}%</div>
            </div>
            <div class="history-pred">
              <div class="history-pred-label">CONFERENCE</div>
              <div class="history-pred-value">${conference}%</div>
            </div>
            <div class="history-pred">
              <div class="history-pred-label">SUPER BOWL</div>
              <div class="history-pred-value">${superbowl}%</div>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

// -------------------------------
// ERROR & MOCK HANDLING
// -------------------------------

function showError(message) {
  console.error(message);
}

function showMockData() {
  console.log("⚠️ Using mock data (API not reachable)");
  const mockPrediction = {
    playoff_probability: 0.725,
    division_probability: 0.453,
    conference_probability: 0.187,
    superbowl_probability: 0.082,
    confidence_score: 0.845,
  };

  const mockSeason = { wins: 8, losses: 5, ties: 0, year: currentYear, avg_points_scored: 85.2, avg_points_allowed: 72.8 };

  const mockHistory = [
    { prediction_date: new Date().toISOString(), ...mockPrediction },
    { prediction_date: new Date(Date.now() - 86400000).toISOString(), ...mockPrediction },
  ];

  updatePredictionDisplay(mockPrediction);
  updateSeasonDisplay(mockSeason);
  updateHistoryDisplay(mockHistory);
}

console.log("✅ Cowboys Playoff Predictor (Website) initialized");
console.log("API URL:", API_URL);


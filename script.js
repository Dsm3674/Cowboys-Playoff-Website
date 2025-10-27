

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
      loadPredictionHistory()
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
    seasonData = data.season;
    currentPrediction = data.prediction;
    
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
    console.error("Error loading live record:", error);
    // Non-critical, continue without live data
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
    currentPrediction = data.prediction;
    
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


function updatePredictionDisplay(prediction) {
  if (!prediction) {
    console.log("No prediction data available");
    return;
  }

  // Handle both decimal (0.XX) and percentage (XX) formats
  const playoffProb = prediction.playoff_probability > 1 
    ? prediction.playoff_probability 
    : Math.round(prediction.playoff_probability * 100);
  
  const divisionProb = prediction.division_probability > 1
    ? prediction.division_probability
    : Math.round(prediction.division_probability * 100);
  
  const conferenceProb = prediction.conference_probability > 1
    ? prediction.conference_probability
    : Math.round(prediction.conference_probability * 100);
  
  const superbowlProb = prediction.superbowl_probability > 1
    ? prediction.superbowl_probability
    : Math.round(prediction.superbowl_probability * 100);
  
  const confidence = prediction.confidence_score > 1
    ? prediction.confidence_score
    : Math.round(prediction.confidence_score * 100);

  // Update text values
  document.getElementById("playoff-prob").textContent = `${playoffProb}%`;
  document.getElementById("division-prob").textContent = `${divisionProb}%`;
  document.getElementById("conference-prob").textContent = `${conferenceProb}%`;
  document.getElementById("superbowl-prob").textContent = `${superbowlProb}%`;
  document.getElementById("confidence").textContent = `${confidence}%`;


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
}

function updateLiveRecordDisplay(data) {
  if (!data) return;

  // Update with live ESPN data
  const record = `${data.wins}-${data.losses}-${data.ties || 0}`;
  const totalGames = data.wins + data.losses + (data.ties || 0);
  const winPct = totalGames > 0 ? (data.wins / totalGames).toFixed(3) : ".000";

  document.getElementById("record").textContent = record;
  document.getElementById("win-pct").textContent = winPct;
  
  // If we have factors data, update ratings
  if (seasonData && seasonData.factors_json) {
    try {
      const factors = typeof seasonData.factors_json === 'string' 
        ? JSON.parse(seasonData.factors_json) 
        : seasonData.factors_json;
      
      if (factors.offensive_rating) {
        document.getElementById("off-rating").textContent = factors.offensive_rating.toFixed(1);
      }
      if (factors.defensive_rating) {
        document.getElementById("def-rating").textContent = factors.defensive_rating.toFixed(1);
      }
    } catch (e) {
      console.error("Error parsing factors:", e);
    }
  }
}

function updateHistoryDisplay(history) {
  const list = document.getElementById("history-list");
  if (!list) return;

  if (!history || history.length === 0) {
    list.innerHTML = '<div class="loading">No prediction history available yet. Generate a prediction to start tracking!</div>';
    return;
  }

  list.innerHTML = history
    .map((pred) => {
      const date = new Date(pred.prediction_date || pred.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Handle both decimal and percentage formats
      const playoff = pred.playoff_probability > 1 
        ? pred.playoff_probability 
        : Math.round(pred.playoff_probability * 100);
      
      const division = pred.division_probability > 1
        ? pred.division_probability
        : Math.round(pred.division_probability * 100);
      
      const conference = pred.conference_probability > 1
        ? pred.conference_probability
        : Math.round(pred.conference_probability * 100);
      
      const superbowl = pred.superbowl_probability > 1
        ? pred.superbowl_probability
        : Math.round(pred.superbowl_probability * 100);

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


function showError(message) {
  console.error(message);
  // You can add a toast notification here if you want
}

function showMockData() {
  console.log("Using mock data (API not reachable)");

  const mockPrediction = {
    playoff_probability: 72.5,
    division_probability: 45.3,
    conference_probability: 18.7,
    superbowl_probability: 8.2,
    confidence_score: 84.5,
  };

  const mockSeason = {
    wins: 8,
    losses: 5,
    ties: 0,
    year: currentYear,
  };

  const mockHistory = [
    {
      prediction_date: new Date().toISOString(),
      playoff_probability: 72.5,
      division_probability: 45.3,
      conference_probability: 18.7,
      superbowl_probability: 8.2,
    },
    {
      prediction_date: new Date(Date.now() - 86400000).toISOString(),
      playoff_probability: 70.1,
      division_probability: 43.8,
      conference_probability: 17.2,
      superbowl_probability: 7.5,
    },
  ];

  updatePredictionDisplay(mockPrediction);
  updateSeasonDisplay(mockSeason);
  updateHistoryDisplay(mockHistory);
  
=
  document.getElementById("off-rating").textContent = "85.2";
  document.getElementById("def-rating").textContent = "72.8";
}


console.log("Cowboys Playoff Predictor initialized");
console.log("API URL:", API_URL);


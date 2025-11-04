const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001/api"
    : "https://cowboys-playoff-prediction-app.onrender.com/api";

// State management
let currentPrediction = null;
let predictionHistory = [];
let seasonData = null;
let currentYear = new Date().getFullYear();
let lastUpdateTime = null;

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  setupSmoothScroll();
  startAutoRefresh();
});

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
  showLoadingState();
  try {
    await Promise.all([
      loadCurrentData(),
      loadLiveRecord(),
      loadPredictionHistory(),
    ]);
    hideLoadingState();
    updateLastRefreshTime();
  } catch (error) {
    console.error("Error initializing app:", error);
    showError("Unable to load live data. Retrying...");
    setTimeout(initializeApp, 5000); // Retry after 5 seconds
  }
}

function startAutoRefresh() {
  // Refresh every 2 minutes
  setInterval(async () => {
    console.log("🔄 Auto-refreshing data...");
    try {
      await Promise.all([
        loadCurrentData(),
        loadLiveRecord(),
        loadPredictionHistory(),
      ]);
      updateLastRefreshTime();
      showRefreshNotification();
    } catch (error) {
      console.error("Auto-refresh failed:", error);
    }
  }, 2 * 60 * 1000); // 2 minutes
}

async function loadCurrentData() {
  try {
    const response = await fetch(`${API_URL}/prediction/current`);
    if (!response.ok) throw new Error("Failed to fetch current data");

    const data = await response.json();
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
    console.warn("Live record endpoint not available");
  }
}

async function loadPredictionHistory() {
  try {
    const response = await fetch(`${API_URL}/prediction/history`);
    if (!response.ok) throw new Error("Failed to fetch history");

    const data = await response.json();
    predictionHistory = data.history || [];
    updateHistoryDisplay(predictionHistory);
  } catch (error) {
    console.error("Error loading history:", error);
  }
}

// -------------------------------
// UI UPDATE FUNCTIONS
// -------------------------------

function updatePredictionDisplay(prediction) {
  if (!prediction) return;

  // Handle both percentage formats (0.xx and xx)
  const normalize = (val) => (val > 1 ? val : val * 100);
  
  const playoffProb = Math.round(normalize(prediction.playoffs || prediction.playoff_probability || 0));
  const divisionProb = Math.round(normalize(prediction.division || prediction.division_probability || 0));
  const conferenceProb = Math.round(normalize(prediction.conference || prediction.conference_probability || 0));
  const superbowlProb = Math.round(normalize(prediction.superBowl || prediction.superbowl_probability || 0));

  // Update UI with smooth animation
  animateValue("playoff-prob", playoffProb);
  animateValue("division-prob", divisionProb);
  animateValue("conference-prob", conferenceProb);
  animateValue("superbowl-prob", superbowlProb);

  // Animate bars
  setTimeout(() => {
    document.getElementById("playoff-bar").style.width = `${playoffProb}%`;
    document.getElementById("division-bar").style.width = `${divisionProb}%`;
    document.getElementById("conference-bar").style.width = `${conferenceProb}%`;
    document.getElementById("superbowl-bar").style.width = `${superbowlProb}%`;
  }, 100);

  // Update confidence if available
  if (prediction.confidence_score || prediction.confidenceScore) {
    const confidence = Math.round(normalize(prediction.confidence_score || prediction.confidenceScore));
    document.getElementById("confidence").textContent = `${confidence}%`;
  }
}

function animateValue(elementId, endValue) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const startValue = parseInt(element.textContent) || 0;
  const duration = 1000;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const current = Math.floor(startValue + (endValue - startValue) * easeOutCubic(progress));
    element.textContent = `${current}%`;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function updateSeasonDisplay(season) {
  if (!season) return;

  const record = `${season.wins}-${season.losses}-${season.ties || 0}`;
  const totalGames = season.wins + season.losses + (season.ties || 0);
  const winPct = totalGames > 0 ? (season.wins / totalGames).toFixed(3) : ".000";

  document.getElementById("record").textContent = record;
  document.getElementById("win-pct").textContent = winPct;

  if (season.avg_points_scored !== undefined) {
    document.getElementById("off-rating").textContent = season.avg_points_scored.toFixed(1);
  }
  if (season.avg_points_allowed !== undefined) {
    document.getElementById("def-rating").textContent = season.avg_points_allowed.toFixed(1);
  }
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
    list.innerHTML = `
      <div class="loading">
        <div class="loading-icon">📊</div>
        <p>Building prediction history...</p>
        <p class="loading-subtext">New predictions are generated automatically</p>
      </div>`;
    return;
  }

  list.innerHTML = history
    .slice(0, 10) // Show last 10
    .map((pred) => {
      const dateStr = pred.prediction_date || pred.generatedAt || pred.created_at || new Date().toISOString();
      const date = new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const normalize = (val) => (val > 1 ? val : val * 100);
      const playoff = Math.round(normalize(pred.playoffs || pred.playoff_probability || 0));
      const division = Math.round(normalize(pred.division || pred.division_probability || 0));
      const conference = Math.round(normalize(pred.conference || pred.conference_probability || 0));
      const superbowl = Math.round(normalize(pred.superBowl || pred.superbowl_probability || 0));

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
// UI HELPERS
// -------------------------------

function showLoadingState() {
  const elements = document.querySelectorAll('.prediction-value-massive, .prediction-value-compact, .stat-number');
  elements.forEach(el => {
    el.style.opacity = '0.3';
  });
}

function hideLoadingState() {
  const elements = document.querySelectorAll('.prediction-value-massive, .prediction-value-compact, .stat-number');
  elements.forEach(el => {
    el.style.opacity = '1';
  });
}

function updateLastRefreshTime() {
  lastUpdateTime = new Date();
  const timeString = lastUpdateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  // Update footer or create update indicator
  updateRefreshIndicator(timeString);
}

function updateRefreshIndicator(timeString) {
  let indicator = document.getElementById("refresh-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "refresh-indicator";
    indicator.className = "refresh-indicator";
    document.querySelector(".confidence-banner").appendChild(indicator);
  }
  indicator.textContent = `Last updated: ${timeString}`;
  indicator.style.fontSize = "0.7rem";
  indicator.style.marginTop = "1rem";
  indicator.style.opacity = "0.7";
  indicator.style.letterSpacing = "0.1em";
}

function showRefreshNotification() {
  const notification = document.createElement("div");
  notification.className = "refresh-notification";
  notification.textContent = "✓ Data Updated";
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 2rem;
    background: var(--orange);
    color: var(--dark);
    padding: 1rem 2rem;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.15em;
    z-index: 1000;
    animation: slideIn 0.3s ease-out, slideOut 0.3s ease-out 2.7s;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showError(message) {
  console.error(message);
  const notification = document.createElement("div");
  notification.className = "error-notification";
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 2rem;
    background: #ff4444;
    color: white;
    padding: 1rem 2rem;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.15em;
    z-index: 1000;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Add notification animations to CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

console.log("✅ Cowboys Playoff Predictor initialized");
console.log("🔄 Auto-refresh enabled (every 2 minutes)");
console.log("API URL:", API_URL);

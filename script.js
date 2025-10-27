// ----------------------------
// Cowboys Playoff Website JS
// ----------------------------

// ✅ Auto-detect backend URL
const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001/api"
    : "https://cowboys-playoff-prediction-app.onrender.com/api";

// ----------------------------
// Initialize App
// ----------------------------
async function initializeApp() {
  try {
    await loadCowboysRecord();
    await loadCurrentPrediction();
    await loadPredictionHistory();

    // refresh data every 5 minutes
    setInterval(loadCowboysRecord, 5 * 60 * 1000);
  } catch (error) {
    console.error("Initialization error:", error);
    showMockData();
  }
}

// ----------------------------
// Fetch Cowboys Record (W-L-T)
// ----------------------------
async function loadCowboysRecord() {
  try {
    const response = await fetch(`${API_URL}/cowboys/record`);
    if (!response.ok) throw new Error("Failed to fetch Cowboys record");
    const data = await response.json();
    updateStatsDisplay({
      season: {
        wins: data.wins,
        losses: data.losses,
        ties: data.ties,
        win_percentage: data.winPct,
        offensive_rating: data.offenseRating || 0,
        defensive_rating: data.defenseRating || 0,
      },
    });
  } catch (err) {
    console.error("Error loading Cowboys record:", err);
  }
}

// ----------------------------
// Fetch Schedule
// ----------------------------
async function loadCowboysSchedule() {
  try {
    const res = await fetch(`${API_URL}/cowboys/schedule`);
    if (!res.ok) throw new Error("Failed to fetch schedule");
    const data = await res.json();
    renderSchedule(data.games);
  } catch (err) {
    console.error("Error fetching schedule:", err);
  }
}

// ----------------------------
// Update Stats Display
// ----------------------------
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

// ----------------------------
// Render Schedule Table
// ----------------------------
function renderSchedule(games) {
  const table = document.getElementById("schedule-table");
  if (!table) return;

  table.innerHTML = `
    <tr>
      <th>Week</th>
      <th>Date</th>
      <th>Opponent</th>
      <th>Score</th>
      <th>Result</th>
    </tr>
  `;

  games.forEach((g) => {
    const date = new Date(g.date).toLocaleString();
    const score =
      g.status === "scheduled" ? "-" : `${g.teamScore}-${g.oppScore}`;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${g.week}</td>
      <td>${date}</td>
      <td>${g.opponent}</td>
      <td>${score}</td>
      <td>${g.result || g.status}</td>
    `;
    table.appendChild(row);
  });
}

// ----------------------------
// Mock Data (Fallback)
// ----------------------------
function showMockData() {
  updateStatsDisplay({
    season: {
      wins: 0,
      losses: 0,
      ties: 0,
      win_percentage: 0,
      offensive_rating: 0,
      defensive_rating: 0,
    },
  });
  console.warn("Showing mock data because API could not load.");
}

// ----------------------------
// Placeholder for Predictions
// ----------------------------
async function loadCurrentPrediction() {
  // Stub function for now – can be implemented later
  console.log("Prediction feature coming soon.");
}

async function loadPredictionHistory() {
  // Stub function for now – can be implemented later
  console.log("Prediction history feature coming soon.");
}

// ----------------------------
// Start App
// ----------------------------
document.addEventListener("DOMContentLoaded", initializeApp);

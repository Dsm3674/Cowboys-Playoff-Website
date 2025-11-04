const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001/api/prediction"
    : "https://cowboys-playoff-prediction-app.onrender.com/api/prediction";

let seasonData = null;
let predictionData = null;
let historyData = [];

document.addEventListener("DOMContentLoaded", async () => {
  await loadDashboard();
  setInterval(loadDashboard, 120000); // auto refresh every 2 min
});

async function loadDashboard() {
  showLoading();
  try {
    const [currentRes, historyRes] = await Promise.all([
      fetch(`${API_URL}/current`),
      fetch(`${API_URL}/history`),
    ]);

    if (!currentRes.ok || !historyRes.ok)
      throw new Error("Failed to fetch backend data");

    const currentJson = await currentRes.json();
    const historyJson = await historyRes.json();

    seasonData = currentJson.season;
    predictionData = currentJson.prediction;
    historyData = historyJson.history || [];

    updateSeasonStats();
    updatePredictionStats();
    updatePredictionArchive();
  } catch (err) {
    console.error("Error loading dashboard:", err);
    showError("Failed to load data. Retrying...");
  } finally {
    hideLoading();
  }
}

function updateSeasonStats() {
  if (!seasonData) return;

  const off = seasonData.avg_points_scored ?? 0;
  const def = seasonData.avg_points_allowed ?? 0;
  const record = `${seasonData.wins}-${seasonData.losses}-${seasonData.ties || 0}`;

  document.getElementById("record").textContent = record;
  document.getElementById("off-rating").textContent = off.toFixed(1);
  document.getElementById("def-rating").textContent = def.toFixed(1);
}

function updatePredictionStats() {
  if (!predictionData) return;

  const normalize = (v) => (v > 1 ? v : v * 100);
  const playoffs = Math.round(normalize(predictionData.playoffs || 0));
  const division = Math.round(normalize(predictionData.division || 0));
  const conference = Math.round(normalize(predictionData.conference || 0));
  const superbowl = Math.round(normalize(predictionData.superBowl || 0));

  animateValue("playoff-prob", playoffs);
  animateValue("division-prob", division);
  animateValue("conference-prob", conference);
  animateValue("superbowl-prob", superbowl);

  document.getElementById("playoff-bar").style.width = `${playoffs}%`;
  document.getElementById("division-bar").style.width = `${division}%`;
  document.getElementById("conference-bar").style.width = `${conference}%`;
  document.getElementById("superbowl-bar").style.width = `${superbowl}%`;
}

function updatePredictionArchive() {
  const list = document.getElementById("history-list");
  if (!list) return;

  if (!historyData.length) {
    list.innerHTML = `<p>No recent predictions yet — generating soon...</p>`;
    return;
  }

  list.innerHTML = historyData
    .map((p) => {
      const d = new Date(p.generatedAt || p.prediction_date || Date.now());
      const fmt = d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const normalize = (v) => (v > 1 ? v : v * 100);
      return `
        <div class="history-item">
          <div class="history-date">${fmt}</div>
          <div class="history-predictions">
            <span>🏈 ${Math.round(normalize(p.playoffs))}% Playoffs</span> |
            <span>${Math.round(normalize(p.division))}% Division</span> |
            <span>${Math.round(normalize(p.conference))}% Conference</span> |
            <span>${Math.round(normalize(p.superBowl))}% Super Bowl</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function animateValue(id, end) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / 1000, 1);
    const val = Math.floor(start + (end - start) * progress);
    el.textContent = `${val}%`;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function showLoading() {
  document.querySelectorAll(".stat-number, .prediction-value-massive").forEach((e) => {
    e.style.opacity = "0.3";
  });
}

function hideLoading() {
  document.querySelectorAll(".stat-number, .prediction-value-massive").forEach((e) => {
    e.style.opacity = "1";
  });
}

function showError(msg) {
  const n = document.createElement("div");
  n.textContent = msg;
  n.style.cssText = `
    position:fixed;top:80px;right:2rem;
    background:#ff4d4d;color:#fff;padding:1rem 1.5rem;
    border-radius:6px;z-index:1000;font-weight:600;`;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 4000);
}

console.log("✅ Cowboys Playoff Predictor Website Ready");


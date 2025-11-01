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

    // ✅ support both flat and nested backend responses
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

    const data = await response




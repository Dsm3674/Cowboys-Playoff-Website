// API Configuration
const API_URL = 'http://localhost:3001/api';

// State management
let currentPrediction = null;
let predictionHistory = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupSmoothScroll();
});

function setupEventListeners() {
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateNewPrediction);
    }
}

function setupSmoothScroll() {
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
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
        console.error('Error initializing app:', error);
        showMockData();
    }
}

// API Functions
async function loadCurrentPrediction() {
    try {
        const response = await fetch(`${API_URL}/predictions/current`);
        if (!response.ok) throw new Error('Failed to fetch prediction');
        
        const data = await response.json();
        currentPrediction = data.prediction;
        updatePredictionDisplay(currentPrediction);
    } catch (error) {
        console.error('Error loading prediction:', error);
        throw error;
    }
}

async function generateNewPrediction() {
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.textContent = 'GENERATING...';
    
    try {
        const response = await fetch(`${API_URL}/predictions/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to generate prediction');
        
        const data = await response.json();
        currentPrediction = data.prediction;
        updatePredictionDisplay(currentPrediction);
        await loadPredictionHistory();
        
        btn.textContent = 'PREDICTION UPDATED';
        setTimeout(() => {
            btn.textContent = 'GENERATE NEW PREDICTION';
            btn.disabled = false;
        }, 2000);
    } catch (error) {
        console.error('Error generating prediction:', error);
        btn.textContent = 'ERROR - TRY AGAIN';
        setTimeout(() => {
            btn.textContent = 'GENERATE NEW PREDICTION';
            btn.disabled = false;
        }, 2000);
    }
}

async function loadSeasonStats() {
    try {
        const response = await fetch(`${API_URL}/teams/1/current`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const data = await response.json();
        updateStatsDisplay(data);
    } catch (error) {
        console.error('Error loading stats:', error);
        throw error;
    }
}

async function loadPredictionHistory() {
    try {
        const response = await fetch(`${API_URL}/predictions/history?limit=10`);
        if (!response.ok) throw new Error('Failed to fetch history');
        
        const data = await response.json();
        predictionHistory = data.predictions;
        updateHistoryDisplay(predictionHistory);
    } catch (error) {
        console.error('Error loading history:', error);
        throw error;
    }
}

// Display Update Functions
function updatePredictionDisplay(prediction) {
    if (!prediction) return;
    
    const playoffProb = Math.round(prediction.playoff_probability * 100);
    const divisionProb = Math.round(prediction.division_probability * 100);
    const conferenceProb = Math.round(prediction.conference_probability * 100);
    const superbowlProb = Math.round(prediction.superbowl_probability * 100);
    const confidence = Math.round(prediction.confidence_score * 100);
    
    // Update values
    const playoffProbEl = document.getElementById('playoff-prob');
    const divisionProbEl = document.getElementById('division-prob');
    const conferenceProbEl = document.getElementById('conference-prob');
    const superbowlProbEl = document.getElementById('superbowl-prob');
    const confidenceEl = document.getElementById('confidence');
    
    if (playoffProbEl) playoffProbEl.textContent = `${playoffProb}%`;
    if (divisionProbEl) divisionProbEl.textContent = `${divisionProb}%`;
    if (conferenceProbEl) conferenceProbEl.textContent = `${conferenceProb}%`;
    if (superbowlProbEl) superbowlProbEl.textContent = `${superbowlProb}%`;
    if (confidenceEl) confidenceEl.textContent = `${confidence}%`;
    
    // Animate bars
    setTimeout(() => {
        const playoffBar = document.getElementById('playoff-bar');
        const divisionBar = document.getElementById('division-bar');
        const conferenceBar = document.getElementById('conference-bar');
        const superbowlBar = document.getElementById('superbowl-bar');
        
        if (playoffBar) playoffBar.style.width = `${playoffProb}%`;
        if (divisionBar) divisionBar.style.width = `${divisionProb}%`;
        if (conferenceBar) conferenceBar.style.width = `${conferenceProb}%`;
        if (superbowlBar) superbowlBar.style.width = `${superbowlProb}%`;
    }, 100);
}

function updateStatsDisplay(data) {
    if (!data || !data.season) return;
    
    const season = data.season;
    const record = `${season.wins}-${season.losses}-${season.ties}`;
    const winPct = season.win_percentage ? season.win_percentage.toFixed(3) : '.000';
    const offRating = season.offensive_rating ? season.offensive_rating.toFixed(1) : '0.0';
    const defRating = season.defensive_rating ? season.defensive_rating.toFixed(1) : '0.0';
    
    const recordEl = document.getElementById('record');
    const winPctEl = document.getElementById('win-pct');
    const offRatingEl = document.getElementById('off-rating');
    const defRatingEl = document.getElementById('def-rating');
    
    if (recordEl) recordEl.textContent = record;
    if (winPctEl) winPctEl.textContent = winPct;
    if (offRatingEl) offRatingEl.textContent = offRating;
    if (defRatingEl) defRatingEl.textContent = defRating;
}

function updateHistoryDisplay(history) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    if (!history || history.length === 0) {
        historyList.innerHTML = '<div class="loading">No prediction history available</div>';
        return;
    }
    
    historyList.innerHTML = history.map(pred => {
        const date = new Date(pred.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="history-item">
                <div class="history-date">${date}</div>
                <div class="history-predictions">
                    <div class="history-pred">
                        <div class="history-pred-label">PLAYOFFS</div>
                        <div class="history-pred-value">${Math.round(pred.playoff_probability * 100)}%</div>
                    </div>
                    <div class="history-pred">
                        <div class="history-pred-label">DIVISION</div>
                        <div class="history-pred-value">${Math.round(pred.division_probability * 100)}%</div>
                    </div>
                    <div class="history-pred">
                        <div class="history-pred-label">CONFERENCE</div>
                        <div class="history-pred-value">${Math.round(pred.conference_probability * 100)}%</div>
                    </div>
                    <div class="history-pred">
                        <div class="history-pred-label">SUPER BOWL</div>
                        <div class="history-pred-value">${Math.round(pred.superbowl_probability * 100)}%</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Mock data for demonstration (when API is not available)
function showMockData() {
    console.log('Using mock data for demonstration - API not available');
    
    const mockPrediction = {
        playoff_probability: 0.42,
        division_probability: 0.28,
        conference_probability: 0.12,
        superbowl_probability: 0.06,
        confidence_score: 0.73
    };
    
    const mockStats = {
        season: {
            wins: 3,
            losses: 3,
            ties: 0,
            win_percentage: 0.500,
            offensive_rating: 78.5,
            defensive_rating: 82.3
        }
    };
    
    const mockHistory = [
        {
            created_at: new Date().toISOString(),
            playoff_probability: 0.42,
            division_probability: 0.28,
            conference_probability: 0.12,
            superbowl_probability: 0.06
        },
        {
            created_at: new Date(Date.now() - 86400000).toISOString(),
            playoff_probability: 0.45,
            division_probability: 0.31,
            conference_probability: 0.14,
            superbowl_probability: 0.07
        },
        {
            created_at: new Date(Date.now() - 172800000).toISOString(),
            playoff_probability: 0.38,
            division_probability: 0.25,
            conference_probability: 0.10,
            superbowl_probability: 0.05
        },
        {
            created_at: new Date(Date.now() - 259200000).toISOString(),
            playoff_probability: 0.35,
            division_probability: 0.22,
            conference_probability: 0.08,
            superbowl_probability: 0.04
        }
    ];
    
    updatePredictionDisplay(mockPrediction);
    updateStatsDisplay(mockStats);
    updateHistoryDisplay(mockHistory);
}
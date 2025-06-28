document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const roundDisplay = document.getElementById('roundDisplay');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const statusDisplay = document.getElementById('statusDisplay');
    const scenarioText = document.getElementById('scenarioText');
    const resultText = document.getElementById('resultText');
    const safeOptionButton = document.getElementById('safeOptionButton');
    const riskyOptionButton = document.getElementById('riskyOptionButton');
    const nextRoundButton = document.getElementById('nextRoundButton');
    const startGameButton = document.getElementById('startGameButton');
    const backgroundMusic = document.getElementById('backgroundMusic');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const pauseButton = document.getElementById('pauseButton');
    const instructionsButton = document.getElementById('instructionsButton');
    const instructionsModal = document.getElementById('instructionsModal');
    const closeButton = instructionsModal.querySelector('.close-button');
    const pausedOverlay = document.querySelector('.paused-overlay');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const gameOverMessage = document.getElementById('gameOverMessage');
    const finalScoreDisplay = document.getElementById('finalScoreDisplay');
    const restartGameButton = document.getElementById('restartGameButton');
    const nextGameButton = document.getElementById('nextGameButton');
    const gameArea = document.getElementById('gameArea');

    // --- Game Configuration Constants ---
    const MAX_ROUNDS = 7;
    const SAFE_REWARD_BASE = 50;
    const RISKY_REWARD_BASE = 200;
    const RISKY_FAILURE_PENALTY_BASE = -75; // Penalty for risky failures
    const RISKY_SUCCESS_PROBABILITY_BASE = 0.45; // 45% chance of success for risky option

    // --- Scenarios (Emotional Triggers & Context) ---
    // Each scenario has a type for emotional bias tracking, and different outcome texts
    const SCENARIOS = [
        {
            id: 1,
            text: "You discover an investment opportunity. Option A: Get a guaranteed ₹500 profit in a week. Option B: Invest in a new startup with a 45% chance to triple your money (get ₹1500), but a 55% chance to lose ₹750. What do you do?",
            type: "Greed/LossAversion",
            safeChoiceText: "Take the guaranteed ₹500",
            riskyChoiceText: "Invest in the startup (₹1500 or -₹750)",
            safeReward: 500,
            riskyReward: 1500,
            riskyPenalty: 750,
            riskySuccessProb: 0.45,
            resultWinText: "Your startup investment paid off! You earned ₹{amount}.",
            resultLoseText: "The startup failed. You lost ₹{amount}.",
            resultSafeText: "You took the safe profit of ₹{amount}."
        },
        {
            id: 2,
            text: "You're trekking through a dense jungle and come across a river. Option A: Take a known, safe detour which adds 2 days to your journey. Option B: Cross the river directly (takes 1 day) but there's a 50% chance of encountering dangerous rapids and losing 1 day's worth of supplies (value ₹100). What's your choice?",
            type: "Urgency/Fear",
            safeChoiceText: "Take the 2-day detour (no risk)",
            riskyChoiceText: "Cross the river (1-day journey, 50% risk of -₹100 supplies)",
            safeReward: 0, // No monetary reward for safe option in this type of scenario, focus on time/resources
            riskyReward: 0, // No monetary reward, focus on avoiding penalty
            riskyPenalty: 100, // Value of lost supplies
            riskySuccessProb: 0.50, // 50% chance of no rapids
            resultWinText: "You successfully crossed the river with no issues.",
            resultLoseText: "Dangerous rapids! You lost ₹{amount} worth of supplies.",
            resultSafeText: "You safely took the detour, arriving 2 days later."
        },
        {
            id: 3,
            text: "You're competing in a trivia show, last question. Option A: Take a guaranteed ₹200 bonus. Option B: Wager all your current winnings (₹500 total) on a final question. If you get it right (40% chance), you win ₹1000. If wrong (60% chance), you lose everything. What's your final answer?",
            type: "HighStakes/Gambling",
            safeChoiceText: "Take the ₹200 bonus",
            riskyChoiceText: "Wager all ₹500 for a chance at ₹1000",
            safeReward: 200,
            riskyReward: 1000,
            riskyPenalty: 500, // Losing current winnings
            riskySuccessProb: 0.40,
            resultWinText: "You got it right! You won ₹{amount} from your wager.",
            resultLoseText: "Incorrect! You lost ₹{amount} from your wager.",
            resultSafeText: "You chose the guaranteed ₹{amount} bonus."
        },
        {
            id: 4,
            text: "A charity event offers a prize. Option A: Receive a guaranteed ₹100 donation in your name. Option B: Spin a wheel with a 60% chance to win ₹400 for charity, but a 40% chance to win nothing. What's your charitable spirit tell you?",
            type: "Altruism/ConsequenceAversion",
            safeChoiceText: "Guaranteed ₹100 donation",
            riskyChoiceText: "Spin for ₹400 (60% chance)",
            safeReward: 100,
            riskyReward: 400,
            riskyPenalty: 0, // Penalty is just receiving nothing vs a positive amount
            riskySuccessProb: 0.60,
            resultWinText: "The wheel landed on the big prize! ₹{amount} donated!",
            resultLoseText: "The wheel landed on nothing this time.",
            resultSafeText: "A guaranteed ₹{amount} has been donated in your name."
        },
        {
            id: 5,
            text: "You have a rare, valuable antique. Option A: Sell it to a reputable dealer for a flat ₹600. Option B: Auction it off. There's a 30% chance it sells for ₹1500, and a 70% chance it sells for only ₹100. What's your strategy?",
            type: "OptimismBias/Realism",
            safeChoiceText: "Sell to dealer for ₹600",
            riskyChoiceText: "Auction for (₹1500 or ₹100)",
            safeReward: 600,
            riskyReward: 1500,
            riskyPenalty: 500, // It's a loss relative to the safe option (600-100)
            riskySuccessProb: 0.30,
            resultWinText: "The auction was a success! You sold it for ₹{amount}!",
            resultLoseText: "The auction didn't go well. You only got ₹{amount}.",
            resultSafeText: "You safely sold the antique for ₹{amount}."
        },
        {
            id: 6,
            text: "You're at a reunion with old friends. Option A: Stick to your savings goal and skip the expensive group trip. Option B: Join the trip, spending ₹800, with a 50% chance of strengthening your friendships (gain social value ₹1200), but a 50% chance it causes conflicts (social loss worth ₹400). What do you choose?",
            type: "SocialPressure/Acceptance",
            safeChoiceText: "Skip the trip and stick to your plan",
            riskyChoiceText: "Join the trip (₹800 cost, ±social value)",
            safeReward: 0,
            riskyReward: 1200,
            riskyPenalty: 400,
            riskySuccessProb: 0.50,
            resultWinText: "The trip was amazing! You strengthened bonds worth ₹{amount} in value.",
            resultLoseText: "The trip caused conflicts. You feel drained and regret spending ₹{amount}.",
            resultSafeText: "You stayed firm and kept your savings intact."
        },
        {
            id: 7,
            text: "You have an important assignment due tomorrow. Option A: Sleep early and ensure you're well-rested. Option B: Stay up late to binge your favorite show — there's a 40% chance it helps you relax (gain mental clarity worth ₹300), but a 60% chance it leaves you tired and you underperform (loss of ₹200 in value). What’s your call?",
            type: "TimeManagement/RegretAversion",
            safeChoiceText: "Sleep early and be fresh",
            riskyChoiceText: "Binge the show (40% relax boost / 60% tiredness)",
            safeReward: 0,
            riskyReward: 300,
            riskyPenalty: 200,
            riskySuccessProb: 0.40,
            resultWinText: "You feel relaxed and focused. You gained mental clarity worth ₹{amount}.",
            resultLoseText: "You’re exhausted and underperformed. It cost you ₹{amount}.",
            resultSafeText: "You slept well and woke up prepared."
        }


    ];

    // --- Game State Variables ---
    let currentRound = 0; // 0-indexed, so 0 is first round, 4 is last
    let totalScore = 0;
    let isGameRunning = false;
    let isPaused = false;
    let gameData = []; // Array to store all collected game session data
    let currentScenario = null; // Stores the scenario for the current round

    // Data tracking variables for the current game
    let roundStartTime = 0; // Timestamp when current round started
    let previousChoice = null; // To track perseveration (e.g., did they keep choosing risky after a loss?)
    let streakRiskyWins = 0;
    let streakRiskyLosses = 0;
    let riskyChoicesMade = 0;
    let safeChoicesMade = 0;
    let decisionTime = 0; // Time taken to make a decision in a round

    // --- Utility Functions ---

    /**
     * Records game events and data points into the `gameData` array.
     * This data is intended for backend processing for ML models.
     * @param {string} eventType - A string describing the type of event (e.g., 'GameStart', 'ChoiceMade', 'GameOver').
     * @param {object} data - An object containing specific data pertinent to the event.
     */
    function recordGameData(eventType, data) {
        const timestamp = new Date().toISOString();
        const entry = {
            timestamp: timestamp,
            round: currentRound + 1, // Store as 1-indexed for display/analysis
            totalScore: totalScore,
            eventType: eventType,
            ...data
        };
        gameData.push(entry);
        // console.log("Data collected:", entry); // For debugging
        // --- IMPORTANT FOR BACKEND INTEGRATION ---
        // At this point, you would typically send this 'entry' (or a batch of entries)
        // to your backend API for storage and further analysis.
        // fetch('/api/game_data_endpoint', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(entry)
        // }).then(response => {
        //     if (!response.ok) console.error('Failed to send data to backend');
        // }).catch(error => console.error('Network error sending data:', error));
    }

    /**
     * Resets game state variables to their initial values.
     */
    function resetGame() {
        currentRound = 0;
        totalScore = 0;
        isGameRunning = false;
        isPaused = false;
        gameData = [];
        currentScenario = null;
        previousChoice = null;
        streakRiskyWins = 0;
        streakRiskyLosses = 0;
        riskyChoicesMade = 0;
        safeChoicesMade = 0;
        decisionTime = 0;

        scoreDisplay.textContent = '0';
        roundDisplay.textContent = `1 / ${MAX_ROUNDS}`;
        statusDisplay.textContent = 'Press Start';
        scenarioText.textContent = 'Click "Start Game" to begin your challenge.';
        resultText.textContent = '';
        resultText.className = 'result-text'; // Reset classes
        safeOptionButton.textContent = 'Safe Option';
        riskyOptionButton.textContent = 'Risky Option';
        safeOptionButton.disabled = true;
        riskyOptionButton.disabled = true;
        nextRoundButton.style.display = 'none';
        startGameButton.textContent = 'Start Game';
        gameOverScreen.style.display = 'none';
        gameArea.style.display = 'block';
        pausedOverlay.style.display = 'none';
    }

    /**
     * Initializes the game or restarts it.
     */
    function startGame() {
        if (isGameRunning) {
            
            if (confirm("A game is already in progress. Do you want to restart from Round 1?")) {
                resetGame();
            } else {
                return;
            }
        }
        isGameRunning = true;
        startGameButton.textContent = 'Restart Game';
        recordGameData('GameStart', { totalRounds: MAX_ROUNDS });
        startRound();
    }

    /**
     * Sets up and displays a new round.
     */
    function startRound() {
        if (!isGameRunning || isPaused) return;
        if (currentRound >= MAX_ROUNDS) {
            gameOver();
            return;
        }

        statusDisplay.textContent = 'Make your choice!';
        roundDisplay.textContent = `${currentRound + 1} / ${MAX_ROUNDS}`;
        resultText.textContent = ''; // Clear previous round's result
        resultText.className = 'result-text'; // Reset result text styling

        // Get a random scenario for the current round
        currentScenario = SCENARIOS[currentRound]; // Or pick randomly: SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];

        scenarioText.textContent = currentScenario.text;
        safeOptionButton.textContent = currentScenario.safeChoiceText;
        riskyOptionButton.textContent = currentScenario.riskyChoiceText;

        safeOptionButton.disabled = false;
        riskyOptionButton.disabled = false;
        nextRoundButton.style.display = 'none'; // Hide "Next Round" button

        roundStartTime = performance.now(); // Record start time for decision time tracking

        recordGameData('RoundStart', {
            scenarioId: currentScenario.id,
            scenarioType: currentScenario.type,
            safeOptionDetails: { reward: currentScenario.safeReward },
            riskyOptionDetails: { reward: currentScenario.riskyReward, penalty: currentScenario.riskyPenalty, probability: currentScenario.riskySuccessProb }
        });
    }

    /**
     * Handles the user's choice (safe or risky).
     * @param {string} choiceType - 'safe' or 'risky'.
     */
    function handleChoice(choiceType) {
        if (!isGameRunning || isPaused || safeOptionButton.disabled) return; // Prevent multiple clicks or clicks when disabled

        const decisionEndTime = performance.now();
        decisionTime = decisionEndTime - roundStartTime; // Time taken to decide

        safeOptionButton.disabled = true; // Disable buttons after choice
        riskyOptionButton.disabled = true;

        let reward = 0;
        let outcomeMessage = '';
        let outcomeType = 'neutral'; // 'win', 'lose', 'neutral'

        if (choiceType === 'safe') {
            reward = currentScenario.safeReward;
            totalScore += reward;
            safeChoicesMade++;
            outcomeMessage = currentScenario.resultSafeText.replace('{amount}', reward);
            outcomeType = 'neutral';
            streakRiskyWins = 0; // Reset risky streaks on safe choice
            streakRiskyLosses = 0;
        } else { // Risky choice
            riskyChoicesMade++;
            // Determine outcome of risky choice based on probability
            if (Math.random() < currentScenario.riskySuccessProb) {
                reward = currentScenario.riskyReward;
                totalScore += reward;
                outcomeMessage = currentScenario.resultWinText.replace('{amount}', reward);
                outcomeType = 'win';
                streakRiskyWins++; // Increment win streak
                streakRiskyLosses = 0; // Reset loss streak
            } else {
                reward = -currentScenario.riskyPenalty; // Apply penalty
                totalScore += reward; // Subtract penalty from score
                outcomeMessage = currentScenario.resultLoseText.replace('{amount}', currentScenario.riskyPenalty);
                outcomeType = 'lose';
                streakRiskyLosses++; // Increment loss streak
                streakRiskyWins = 0; // Reset win streak
            }
        }

        scoreDisplay.textContent = totalScore;
        resultText.textContent = outcomeMessage;
        resultText.classList.add(outcomeType); // Add class for styling (green/red)

        recordGameData('ChoiceMade', {
            scenarioId: currentScenario.id,
            chosenOption: choiceType,
            rewardOutcome: reward,
            totalScoreAfterChoice: totalScore,
            decisionTimeMs: decisionTime,
            isSuccess: outcomeType === 'win',
            previousChoice: previousChoice, // Perseveration tracking
            streakRiskyWins: streakRiskyWins, // Emotional bias/risk preference
            streakRiskyLosses: streakRiskyLosses // Emotional bias/risk preference
        });

        previousChoice = choiceType; // Update for next round's perseveration tracking

        currentRound++;
        if (currentRound < MAX_ROUNDS) {
            nextRoundButton.style.display = 'block'; // Show "Next Round" button
            statusDisplay.textContent = 'Decision made. Click Next Round.';
        } else {
            gameOver(); // All rounds completed
        }
    }

    /**
     * Ends the game, displays final score and options.
     */
    function gameOver() {
        isGameRunning = false;
        gameArea.style.display = 'none';
        gameOverScreen.style.display = 'flex';

        finalScoreDisplay.textContent = totalScore;
        gameOverMessage.textContent = `You completed all ${MAX_ROUNDS} rounds!`;
        if (totalScore >= (MAX_ROUNDS * SAFE_REWARD_BASE * 0.8)) { // Example threshold for good score
            gameOverMessage.textContent += " Well done!";
        } else if (totalScore < (MAX_ROUNDS * SAFE_REWARD_BASE * 0.2)) {
             gameOverMessage.textContent += " Perhaps a bit too risky?";
        }

        recordGameData('GameOver', {
            finalScore: totalScore,
            totalRiskyChoices: riskyChoicesMade,
            totalSafeChoices: safeChoicesMade,
            outcome: 'AllRoundsCompleted'
        });

        console.log("Game Over! All data collected for this session:", gameData);
        // You would typically send `gameData` to your backend here.
    }

    // --- UI/Control Functions ---

    /**
     * Toggles dark mode and saves preference.
     */
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
    }

    /**
     * Loads dark mode preference from local storage.
     */
    function loadDarkModePreference() {
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark-mode');
        }
    }

    /**
     * Toggles the game's paused state.
     */
    function togglePause() {
        if (!isGameRunning) return;

        isPaused = !isPaused;
        pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
        pausedOverlay.style.display = isPaused ? 'flex' : 'none';

        recordGameData('Pause', { state: isPaused ? 'paused' : 'resumed' });

        // Disable/enable choice buttons based on pause state
        safeOptionButton.disabled = isPaused || resultText.textContent !== ''; // Keep disabled if choice already made
        riskyOptionButton.disabled = isPaused || resultText.textContent !== '';

        if (isPaused) {
            statusDisplay.textContent = 'Game Paused';
        } else {
            statusDisplay.textContent = 'Make your choice!';
        }
    }

    /**
     * Displays the instructions modal.
     */
    function showInstructions() {
        instructionsModal.style.display = 'flex';
    }

    /**
     * Hides the instructions modal.
     */
    function hideInstructions() {
        instructionsModal.style.display = 'none';
    }

    // --- Event Listeners ---
    startGameButton.addEventListener('click', startGame);
    safeOptionButton.addEventListener('click', () => handleChoice('safe'));
    riskyOptionButton.addEventListener('click', () => handleChoice('risky'));
    nextRoundButton.addEventListener('click', startRound);
    darkModeToggle.addEventListener('click', toggleDarkMode);
    pauseButton.addEventListener('click', togglePause);
    instructionsButton.addEventListener('click', showInstructions);
    closeButton.addEventListener('click', hideInstructions);
    restartGameButton.addEventListener('click', startGame);

    if (nextGameButton) {
    nextGameButton.addEventListener('click', () => {
      window.location.href = 'last.html';
    });
  }

    // Close instructions modal if user clicks outside of it
    window.addEventListener('click', (event) => {
        if (event.target === instructionsModal) {
            hideInstructions();
        }
    });

    startGameButton.addEventListener('click', () => {
        backgroundMusic.play(); // your game logic
    });

    // --- Initial Setup ---
    loadDarkModePreference();
    resetGame();
});
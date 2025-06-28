document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameCanvas = document.getElementById('gameCanvas');
    const levelDisplay = document.getElementById('levelDisplay');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const statusDisplay = document.getElementById('statusDisplay');
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
    const gameArea = document.getElementById('gameArea'); // The main game content area

    // --- Game Configuration Constants ---
    const MAX_LEVEL = 5; // Total number of levels
    const GREEN_DOT_CLICK_SCORE = 10; // Points for clicking a green dot
    const LEVEL_DURATION_MS = 20000; // Duration of each level (20 seconds)

    // Dot spawning intervals (adjusted per level in LEVEL_SETTINGS)
    let greenDotSpawnInterval = 1000; // How often a green dot appears (ms)
    let redDotSpawnInterval = 3000; // How often a red dot appears (ms)

    // Dot sizes
    const GREEN_DOT_MIN_SIZE = 30; // pixels
    const GREEN_DOT_MAX_SIZE = 50; // pixels
    const RED_DOT_MIN_SIZE = 20; // Red dots can be smaller/larger to vary difficulty
    const RED_DOT_MAX_SIZE = 70;

    // Difficulty settings for each level
    const LEVEL_SETTINGS = {
        1: { greenInterval: 1000, redInterval: 3000, greenSpeed: 1, redSpeed: 0.5, redMinSize: 20, redMaxSize: 40 },
        2: { greenInterval: 800,  redInterval: 2500, greenSpeed: 1.2, redSpeed: 0.7, redMinSize: 30, redMaxSize: 50 },
        3: { greenInterval: 700,  redInterval: 2000, greenSpeed: 1.4, redSpeed: 1, redMinSize: 40, redMaxSize: 60 },
        4: { greenInterval: 600,  redInterval: 1500, greenSpeed: 1.6, redSpeed: 1.2, redMinSize: 50, redMaxSize: 70 },
        5: { greenInterval: 500,  redInterval: 1000, greenSpeed: 1.8, redSpeed: 1.5, redMinSize: 60, redMaxSize: 80 }
    };

    // --- Game State Variables ---
    let currentLevel = 1;
    let score = 0;
    let isGameRunning = false;
    let isPaused = false;
    let dotSpawnTimers = []; // Stores intervals for dot spawning
    let dotMovementAnimationFrames = []; // Stores requestAnimationFrame IDs for dot movement
    let levelTimer = null; // Stores the timeout ID for the level duration
    let gameData = []; // Array to store all collected game session data

    // Data tracking variables for the current level
    let levelStartTime = 0; // Timestamp when the current level started
    let dotsSpawned = { green: 0, red: 0 };
    let greenDotsClicked = 0;
    let redDotsClicked = 0; // This should ideally be 0, as clicking one restarts
    let totalClicksMade = 0; // All clicks, including on empty space

    // --- Utility Functions ---

    /**
     * Generates a random integer within a specified range (inclusive).
     * @param {number} min - The minimum value.
     * @param {number} max - The maximum value.
     * @returns {number} A random integer.
     */
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Records game events and data points into the `gameData` array.
     * This data is intended for backend processing.
     * @param {string} eventType - A string describing the type of event (e.g., 'GameStart', 'DotClick', 'LevelComplete').
     * @param {object} data - An object containing specific data relevant to the event.
     */
    function recordGameData(eventType, data) {
        const timestamp = new Date().toISOString(); // Get current timestamp
        const entry = {
            timestamp: timestamp,
            level: currentLevel,
            score: score,
            eventType: eventType,
            ...data // Include specific event data
        };
        gameData.push(entry);
        // console.log("Data collected:", entry); // For debugging: you would remove this in production
        // --- IMPORTANT FOR BACKEND INTEGRATION ---
        // You would typically send this 'entry' (or a batch of entries) to your backend here.
        // Example: fetch('/api/game_data', { method: 'POST', body: JSON.stringify(entry) });
    }
    function downloadGameDataAsJSON() {
    const dataStr = JSON.stringify(gameData, null, 2); // Convert to formatted JSON
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `game_data_${new Date().toISOString()}.json`;
    a.click();

    URL.revokeObjectURL(url); // Free up memory
}

    // --- Dot Management ---

    /**
     * Spawns a new dot (green or red) at a random top position and applies movement.
     * @param {string} type - 'green' or 'red'.
     */
    function spawnDot(type) {
        if (!isGameRunning || isPaused) return;

        const size = (type === 'green') ?
            getRandomInt(GREEN_DOT_MIN_SIZE, GREEN_DOT_MAX_SIZE) :
            getRandomInt(LEVEL_SETTINGS[currentLevel].redMinSize, LEVEL_SETTINGS[currentLevel].redMaxSize);

        const dot = document.createElement('div');
        dot.classList.add('dot', type);
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.left = `${getRandomInt(0, gameCanvas.offsetWidth - size)}px`; // Random X position
        dot.style.top = `-50px`; // Start above canvas
        dot.dataset.type = type;
        dot.dataset.spawnTime = performance.now(); // Record spawn time for response time calculation

        // Add event listener for clicks
        dot.addEventListener('mousedown', handleDotClick); // Use mousedown to capture clicks faster

        gameCanvas.appendChild(dot); // Add dot to the game canvas

        if (type === 'green') dotsSpawned.green++;
        else dotsSpawned.red++;

        moveDot(dot); // Start moving the dot
    }

    /**
     * Moves a dot downwards using requestAnimationFrame for smooth animation.
     * Removes the dot when it goes off-screen.
     * @param {HTMLElement} dot - The dot element to move.
     */
    function moveDot(dot) {
        let position = -50; // Starting position (above canvas)
        const speed = (dot.dataset.type === 'green') ?
            LEVEL_SETTINGS[currentLevel].greenSpeed :
            LEVEL_SETTINGS[currentLevel].redSpeed;

        const animate = () => {
            if (!isGameRunning || isPaused) {
                // If paused, stop animation frame, but keep dot in place
                dotMovementAnimationFrames[dot.dataset.id] = undefined; // Clear its ID
                return;
            }

            position += speed; // Move dot down by its speed
            dot.style.top = `${position}px`;

            // Remove dot if it goes off screen
            if (position > gameCanvas.offsetHeight) {
                dot.remove();
                // Optionally, penalize for missed green dots here if you want
            } else {
                dotMovementAnimationFrames[dot.dataset.id] = requestAnimationFrame(animate);
            }
        };

        // Assign a unique ID to each dot for managing its animation frame
        dot.dataset.id = Date.now() + Math.random();
        dotMovementAnimationFrames[dot.dataset.id] = requestAnimationFrame(animate);
    }

    // --- Game Logic ---

    /**
     * Initializes a new level, sets up spawning, and starts level timer.
     */
    function startLevel() {
        if (!isGameRunning || isPaused) return; // Don't start level if game not running or paused

        statusDisplay.textContent = `Level ${currentLevel} - Go!`;
        scoreDisplay.textContent = score;
        levelDisplay.textContent = `${currentLevel} / ${MAX_LEVEL}`;
        dotsSpawned = { green: 0, red: 0 };
        greenDotsClicked = 0;
        redDotsClicked = 0;
        totalClicksMade = 0;
        levelStartTime = performance.now(); // Record level start time

        // Apply level-specific settings
        const settings = LEVEL_SETTINGS[currentLevel];
        greenDotSpawnInterval = settings.greenInterval;
        redDotSpawnInterval = settings.redInterval;

        // Clear existing intervals to avoid multiple spawners
        dotSpawnTimers.forEach(clearInterval);
        dotSpawnTimers = [];

        // Start spawning dots
        dotSpawnTimers.push(setInterval(() => spawnDot('green'), greenDotSpawnInterval));
        dotSpawnTimers.push(setInterval(() => spawnDot('red'), redDotSpawnInterval));

        // Set timer for level duration
        levelTimer = setTimeout(endLevel, LEVEL_DURATION_MS);

        recordGameData('LevelStart', {
            levelSettings: settings,
            levelDuration: LEVEL_DURATION_MS
        });
    }

    /**
     * Ends the current level and progresses to the next or ends the game.
     */
    function endLevel() {
        if (!isGameRunning) return; // Ensure game is still running

        // Clear all timers and animation frames for the current level
        dotSpawnTimers.forEach(clearInterval);
        dotSpawnTimers = [];
        Object.values(dotMovementAnimationFrames).forEach(cancelAnimationFrame);
        dotMovementAnimationFrames = {}; // Clear all stored animation frame IDs
        clearTimeout(levelTimer); // Clear the level duration timer

        // Remove any remaining dots on screen
        gameCanvas.innerHTML = '';

        const levelEndTime = performance.now();
        const levelActualDuration = levelEndTime - levelStartTime;

        recordGameData('LevelComplete', {
            duration: levelActualDuration,
            greenDotsSpawned: dotsSpawned.green,
            redDotsSpawned: dotsSpawned.red,
            greenDotsClicked: greenDotsClicked,
            redDotsClicked: redDotsClicked,
            totalClicksMade: totalClicksMade,
            levelScore: score // Current score when level ends
        });

        currentLevel++;
        if (currentLevel <= MAX_LEVEL) {
            statusDisplay.textContent = `Level ${currentLevel-1} Complete! Next Level...`;
            setTimeout(startLevel, 2000); // Small delay before next level
        } else {
            gameOver(true); // Game finished all levels successfully
        }
    }

    /**
     * Handles a click on a dot (green or red).
     * @param {Event} event - The click event.
     */
    function handleDotClick(event) {
        if (!isGameRunning || isPaused) return;

        event.stopPropagation(); // Prevent click from bubbling to gameCanvas background
        totalClicksMade++; // Count all clicks on dots

        const clickedDot = event.currentTarget; // The dot element that was clicked
        const dotType = clickedDot.dataset.type;
        const clickTime = performance.now();
        const spawnTime = parseFloat(clickedDot.dataset.spawnTime);
        const responseTime = clickTime - spawnTime; // Reaction time

        // Add a visual feedback/fade-out effect
        clickedDot.classList.add('fade-out');
        setTimeout(() => clickedDot.remove(), 300); // Remove after fade

        if (dotType === 'green') {
            score += GREEN_DOT_CLICK_SCORE;
            scoreDisplay.textContent = score;
            greenDotsClicked++;
            recordGameData('GreenDotClick', {
                dotId: clickedDot.dataset.id,
                responseTime: responseTime,
                currentScore: score
            });
        } else if (dotType === 'red') {
            redDotsClicked++;
            recordGameData('RedDotClick', {
                dotId: clickedDot.dataset.id,
                responseTime: responseTime,
                inhibitionFailure: true, // Mark as inhibition failure
                currentScore: score
            });
            alert("You clicked a red dot! Restarting game."); // Optional message
            resetGame();     // Reset all scores, levels, etc.
            startGame();
        }
    }

    /**
     * Handles clicks on the gameCanvas background (missing a dot).
     * @param {Event} event - The click event.
     */
    function handleCanvasClick(event) {
        if (!isGameRunning || isPaused) return;
        totalClicksMade++; // Count clicks on empty space for error rate

        // Optionally record misses here if you want to differentiate
        // recordGameData('MissClick', { x: event.clientX, y: event.clientY });
    }

    /**
     * Initiates the game, resetting all states.
     */
    function startGame() {
        if (isGameRunning) {
            // If already running, confirm restart
            if (confirm("Game is already in progress. Do you want to restart?")) {
                resetGame();
            } else {
                return;
            }
        }

        resetGame(); // Ensure clean state if starting new game
        isGameRunning = true;
        startGameButton.textContent = 'Restart Game';
        gameArea.style.display = 'block';
        gameOverScreen.style.display = 'none';

        recordGameData('GameStart', { initialLevel: 1 });
        startLevel();
    }

    /**
     * Ends the game, displays final score, and shows restart/menu options.
     * @param {boolean} completedSuccessfully - True if all levels were completed, false if restarted by red dot.
     */
    function gameOver(completedSuccessfully) {
        isGameRunning = false;
        // Clear all intervals and animation frames
        dotSpawnTimers.forEach(clearInterval);
        dotSpawnTimers = [];
        Object.values(dotMovementAnimationFrames).forEach(cancelAnimationFrame);
        dotMovementAnimationFrames = {};
        clearTimeout(levelTimer);

        gameCanvas.innerHTML = ''; // Clear all dots

        gameArea.style.display = 'none'; // Hide game play area
        gameOverScreen.style.display = 'flex'; // Show game over screen

        finalScoreDisplay.textContent = score;
        if (completedSuccessfully) {
            gameOverMessage.textContent = "Congratulations! You completed all levels.";
            recordGameData('GameComplete', { finalScore: score, reason: 'AllLevelsCompleted' });
        } else {
            gameOverMessage.textContent = "Oops! You clicked a red dot. Game restarted.";
            recordGameData('GameComplete', { finalScore: score, reason: 'RedDotClicked', levelRestarted: currentLevel });
        }
        downloadGameDataAsJSON();
    }

    /**
     * Resets all game state variables and UI elements.
     */
    function resetGame() {
        isGameRunning = false;
        isPaused = false;
        currentLevel = 1;
        score = 0;
        levelDisplay.textContent = `1 / ${MAX_LEVEL}`;
        scoreDisplay.textContent = '0';
        statusDisplay.textContent = 'Press Start';
        startGameButton.textContent = 'Start Game';
        pauseButton.textContent = 'Pause';
        pausedOverlay.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameArea.style.display = 'block'; // Ensure game area is visible initially if resetting from game over
        gameCanvas.innerHTML = ''; // Clear any dots

        // Clear all existing timers and animation frames
        dotSpawnTimers.forEach(clearInterval);
        dotSpawnTimers = [];
        Object.values(dotMovementAnimationFrames).forEach(cancelAnimationFrame);
        dotMovementAnimationFrames = {};
        clearTimeout(levelTimer);
        levelTimer = null;

        gameData = []; // Clear collected data for a new session
        dotsSpawned = { green: 0, red: 0 };
        greenDotsClicked = 0;
        redDotsClicked = 0;
        totalClicksMade = 0;
        levelStartTime = 0;
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
     * Manages pausing/resuming dot spawns and movements.
     */
    function togglePause() {
        if (!isGameRunning) return; // Only allow pause if game is running

        isPaused = !isPaused;
        pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
        pausedOverlay.style.display = isPaused ? 'flex' : 'none';

        recordGameData('Pause', { state: isPaused ? 'paused' : 'resumed' });

        if (isPaused) {
            // Pause spawning
            dotSpawnTimers.forEach(clearInterval);
            dotSpawnTimers = [];
            // Pause dot movements by cancelling all active animation frames
            Object.values(dotMovementAnimationFrames).forEach(cancelAnimationFrame);
            // Store the timestamp of pause to adjust level timer on resume
            clearTimeout(levelTimer);
            levelTimer = null;
            statusDisplay.textContent = 'Game Paused';
        } else {
            // Resume spawning with current intervals
            const settings = LEVEL_SETTINGS[currentLevel];
            greenDotSpawnInterval = settings.greenInterval;
            redDotSpawnInterval = settings.redInterval;
            dotSpawnTimers.push(setInterval(() => spawnDot('green'), greenDotSpawnInterval));
            dotSpawnTimers.push(setInterval(() => spawnDot('red'), redDotSpawnInterval));

            // Resume dot movements (re-request animation frames for each dot)
            document.querySelectorAll('.dot').forEach(dot => {
                moveDot(dot); // Call moveDot again to resume animation for each dot
            });

            // Adjust level timer based on time elapsed during pause
            const remainingTime = LEVEL_DURATION_MS - (performance.now() - levelStartTime);
            levelTimer = setTimeout(endLevel, Math.max(0, remainingTime)); // Ensure no negative time

            statusDisplay.textContent = `Level ${currentLevel} - Go!`;
        }
    }

    /**
     * Displays the instructions modal.
     */
    function showInstructions() {
        instructionsModal.style.display = 'flex';
         instructionsModal.style.opacity = "1";
        instructionsModal.style.pointerEvents = "auto";
    
    }

    /**
     * Hides the instructions modal.
     */
    function hideInstructions() {
        instructionsModal.style.display = 'none';
        instructionsModal.style.opacity = "0";
        instructionsModal.style.pointerEvents = "none";
    
    }

    startGameButton.addEventListener('click', startGame);
    pauseButton.addEventListener('click', togglePause);
    instructionsButton.addEventListener('click', showInstructions);
    closeButton.addEventListener('click', hideInstructions);
    restartGameButton.addEventListener('click', startGame);
    nextGameButton.addEventListener('click', () => {
        window.location.href = 'risk-safe.html';
    });

    gameCanvas.addEventListener('mousedown', handleCanvasClick); // Listen for clicks on canvas background

    // Close instructions modal if user clicks outside of it
    window.addEventListener('click', (event) => {
        if (event.target === instructionsModal) {
            hideInstructions();
        }
    });
    startGameButton.addEventListener('click', () => {
        backgroundMusic.play();
        startGame(); // your game logic
    });
    
    // --- Initial Setup ---
    loadDarkModePreference(); // Apply dark mode preference on load
    resetGame(); // Ensure initial state is clean and ready
});
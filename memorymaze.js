document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gridContainer = document.getElementById('gridContainer');
    const levelDisplay = document.getElementById('levelDisplay');
    const statusDisplay = document.getElementById('statusDisplay');
    const startGameButton = document.getElementById('startGameButton');
    const backgroundMusic = document.getElementById('backgroundMusic');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const pauseButton = document.getElementById('pauseButton');
    const instructionsButton = document.getElementById('instructionsButton');
    const instructionsModal = document.getElementById('instructionsModal');
    const closeButton = instructionsModal.querySelector('.close-button');
    const pausedOverlay = document.querySelector('.paused-overlay');
    const gameOverScreen = document.getElementById('gameOverScreen'); // Get the game over screen div
    const nextGameButton = document.getElementById('nextGameButton');
    const gameArea = document.getElementById('gameArea'); // The main game content area

    // --- Game Configuration Constants ---
    const GRID_SIZE = 4; // Defines the grid as 4x4, resulting in 16 cells
    const CELL_COUNT = GRID_SIZE * GRID_SIZE; // Total number of cells in the grid (16)
    const MEMORY_FLASH_DURATION_MS = 1000; // Duration each pattern cell is lit up
    const PATTERN_GAP_MS = 200; // Time gap between consecutive cell flashes in a pattern
    const LEVEL_INCREASE_PATTERN = 1; // How many cells are added to the pattern length per level
    const MIN_PATTERN_LENGTH = 3; // Starting pattern length for Level 1
    const MAX_LEVEL = 4; // The maximum level the game will go up to

    // --- Game State Variables ---
    let currentLevel = 1; // Tracks the current game level
    let patternSequence = []; // Stores the indices of cells that form the pattern for the current level
    let userClicks = []; // Stores the indices of cells clicked by the user during the recall phase
    let gameData = []; // Array to store all collected game session data for ML model
    let isGameRunning = false; // True if a game session is active
    let isMemorizing = false; // True during the pattern flash phase
    let isRecalling = false; // True during the user's recall phase
    let isPaused = false; // True if the game is currently paused
    let isResumed = false;

    // Timestamps for performance tracking
    let recallStartTime = 0; // Timestamp when the recall phase officially begins
    let lastClickTime = 0; // Timestamp of the last user click, used for decision time variability
    let patternDisplayStartTime = 0; // Timestamp when the pattern first starts flashing (for working memory load)

    // Variables for managing pause/resume functionality
    let flashPatternTimeout = null; // Stores the timeout ID for the current pattern flashing sequence
    let currentFlashIndex = 0; // Tracks which cell in the pattern is currently being flashed
    let resumeGameTimestamp = 0; // Stores the timestamp when the game was paused, to calculate resume delay

    // Tracking for ML metrics
    let totalClicksMadeInLevel = 0; // Counts all clicks made by the user in a level (for perseveration)
    let totalErrorsInLevel = 0; // Counts incorrect clicks in a level (for consistency/error rate)


    // --- Utility Functions ---

    /**
     * Generates the grid cells dynamically and appends them to the gridContainer.
     */
    function generateGrid() {
        gridContainer.innerHTML = ''; // Clear any existing cells
        gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`; // Set CSS grid columns
        for (let i = 0; i < CELL_COUNT; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.index = i; // Store cell's index for easy identification during clicks
            cell.addEventListener('click', handleCellClick); // Add click event listener to each cell
            gridContainer.appendChild(cell);
        }
    }

    /**
     * Generates a random sequence of unique cell indices for the pattern.
     * The length of the pattern is determined by the current level.
     * @param {number} length - The desired length of the pattern.
     * @returns {number[]} An array of unique cell indices representing the pattern.
     */
    function getRandomPattern(length) {
        const pattern = [];
        // Create an array of all possible cell indices [0, 1, ..., CELL_COUNT-1]
        const availableCells = Array.from({ length: CELL_COUNT }, (_, i) => i);

        for (let i = 0; i < length; i++) {
            // Ensure we don't try to pick more cells than available
            if (availableCells.length === 0) break;
            const randomIndex = Math.floor(Math.random() * availableCells.length);
            // Remove the selected cell from available options and add it to the pattern
            const selectedCellIndex = availableCells.splice(randomIndex, 1)[0];
            pattern.push(selectedCellIndex);
        }
        return pattern;
    }

    /**
     * Flashes the generated pattern sequence on the grid.
     * This function is designed to be resumable after being paused.
     * @param {number[]} pattern - The array of cell indices to flash.
     * @param {number} startIndex - The index in the pattern sequence to start flashing from.
     */
    function createCancelableDelay(ms) {
               return new Promise(resolve => {
               flashPatternTimeout = setTimeout(resolve, ms);
                });
            }
    async function flashPattern(pattern, startIndex = 0) {
        // Stop flashing if the game is paused or not in the memorizing state
        if (isPaused || !isMemorizing) {
            return;
        }

        statusDisplay.textContent = 'Memorize the pattern!';

        // Clear all cell visual states (flashing, correct, incorrect) before starting a new flash sequence
        // This is done only at the beginning of a new pattern, not if resuming mid-flash
        if (startIndex === 0) {
            document.querySelectorAll('.grid-cell').forEach(cell => {
                cell.classList.remove('flashing', 'correct', 'incorrect');
            });
            patternDisplayStartTime = performance.now(); // Record the start time of pattern display
        }

        currentFlashIndex = startIndex; // Update the global index to track current flash position

        // Loop through the pattern from the specified start index
        for (let i = startIndex; i < pattern.length; i++) {
            // If the game becomes paused during the loop, save progress and stop
            if (isPaused) {
                currentFlashIndex = i; // Store the exact index where the pause occurred
                return;
            }

            const cellIndex = pattern[i];
            const cell = gridContainer.children[cellIndex]; // Get the actual DOM cell element
            

        // Inside your flashPattern function
        if (cell) {
            cell.classList.add('flashing');
            await createCancelableDelay(MEMORY_FLASH_DURATION_MS - 50);
            cell.classList.remove('flashing');
            await createCancelableDelay(PATTERN_GAP_MS);
        }
        }

        // --- Pattern Flashing Complete ---
        flashPatternTimeout = null; // Clear the timeout ID as the sequence is finished
        isMemorizing = false; // Exit the memorizing phase
        statusDisplay.textContent = 'Recall the pattern!';
        recallStartTime = performance.now(); // Record the precise start time for the recall phase
        lastClickTime = performance.now(); // Initialize last click time for the first click
        isRecalling = true; // Enter the recall phase, allowing user clicks
        userClicks = []; // Reset user clicks for the new recall round
        totalClicksMadeInLevel = 0; // Reset click count for perseveration
        totalErrorsInLevel = 0; // Reset error count for consistency
    }

    /**
     * Records game events and relevant data points into the `gameData` array.
     * This data is intended for backend processing for ML models.
     * @param {string} eventType - A string describing the type of event (e.g., 'LevelStart', 'RecallClick', 'RecallError', 'LevelComplete', 'GameOver', 'Pause').
     * @param {object} data - An object containing specific data pertinent to the event.
     */
    function recordGameData(eventType, data) {
        const timestamp = new Date().toISOString(); // Get current timestamp in ISO format
        const entry = {
            timestamp: timestamp,
            level: currentLevel,
            eventType: eventType,
            ...data // Use spread operator to include all properties from the 'data' object
        };
        gameData.push(entry); // Add the structured entry to the gameData array

        // --- IMPORTANT FOR BACKEND INTEGRATION ---
        // At this point, you would typically send this 'entry' (or a batch of entries)
        // to your backend API. For example:
        // fetch('/api/game_data_endpoint', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(entry)
        // }).then(response => {
        //     if (!response.ok) console.error('Failed to send data to backend');
        // }).catch(error => console.error('Network error sending data:', error));
    }
    
    // --- Game Flow Logic ---

    /**
     * Initiates or restarts the game.
     */
    async function startGame() {
        // If a game is already in progress, ask the user if they want to restart
        if (isGameRunning) {
            if (confirm("A game is already in progress. Do you want to restart from Level 1?")) {
                resetGame(); // Reset all game states
            } else {
                return; // User chose not to restart
            }
        }

        isGameRunning = true; // Set game state to running
        startGameButton.textContent = 'Restart Game'; // Change button text
        gameOverScreen.style.display = 'none'; // Hide game over screen if it was visible
        gameArea.style.display = 'block'; // Ensure the main game area is visible
        currentLevel = 1; // Start from Level 1
        levelDisplay.textContent = `${currentLevel} / ${MAX_LEVEL}`; // Update level display
        gameData = []; // Clear any previously collected data for a fresh session
        await startLevel(); // Begin the first level
    }

    /**
     * Prepares and starts a new game level.
     */   
    async function startLevel() {
        // If the game is paused, prevent starting a new level. This will be handled on resume.
        if (isPaused) {
            statusDisplay.textContent = 'Game Paused';
            return;
        }
        // Check if the game has reached or surpassed the maximum level
        if (currentLevel > MAX_LEVEL) {
            gameOver(); // End the game if max level is reached
            return;
        }

        statusDisplay.textContent = 'Generating pattern...'; // Inform user
        // Calculate the pattern length for the current level
        const patternLength = MIN_PATTERN_LENGTH + (currentLevel - 1) * LEVEL_INCREASE_PATTERN;
        patternSequence = getRandomPattern(patternLength); // Generate the new pattern sequence

        // Record the start of the level and its pattern details
        recordGameData('LevelStart', {
            pattern: patternSequence,
            patternLength: patternLength
        });

        // Clear visual states of all grid cells (e.g., previous correct/incorrect highlights)
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('correct', 'incorrect', 'flashing');
        });

        // Add a small delay before flashing the pattern for better user experience
        await new Promise(resolve => setTimeout(resolve, 500));
        isMemorizing = true; // Set game state to memorizing
        currentFlashIndex = 0; // Reset flash index to start from the beginning of the new pattern
        await flashPattern(patternSequence); // Start flashing the pattern

        statusDisplay.textContent = `Level ${currentLevel} - Memorize!`;

        // e.g., flash sequence, then accept user input
        await playPattern(); 
        enableInput();
    }
       function pauseGame() {
    // Optional: stop any timers or animations
    resumePending = true; // Use this to remember that a level was in progress
}
function resumeGame() {
    if (isMemorizing && currentFlashIndex < patternSequence.length) {
        flashPattern(patternSequence, currentFlashIndex); // resume flashing
    } else if (isRecalling) {
        const pausedDuration = performance.now() - resumeGameTimestamp;
        recallStartTime += pausedDuration;
        lastClickTime += pausedDuration;
        statusDisplay.textContent = 'Recall the pattern!';
    } else if (resumePending) {
        resumePending = false;
        startLevel(); // fallback for weird edge case
    } else {
        statusDisplay.textContent = 'Press Start';
    }
}
    /**
     * Handles a user click on a grid cell during the recall phase.
     * This function performs validation, updates game state, and records data.
     * @param {Event} event - The click event object from the DOM.
     */
    function handleCellClick(event) {
        // Only process clicks if the game is in the recalling phase and not paused
        if (!isRecalling || isPaused) return;

        const clickedCell = event.target;
        const clickedIndex = parseInt(clickedCell.dataset.index); // Get the data-index of the clicked cell
        totalClicksMadeInLevel++; // Increment total clicks for perseveration tracking

        const currentTime = performance.now();
        const timeSinceLastClick = currentTime - lastClickTime; // Calculate time elapsed since the previous click
        lastClickTime = currentTime; // Update the last click time for the next calculation

        userClicks.push(clickedIndex); // Add the clicked cell's index to the user's sequence

        const currentExpectedPatternIndex = userClicks.length - 1; // The current position in the sequence being checked
        const expectedCellIndex = patternSequence[currentExpectedPatternIndex]; // The correct cell for this position

        let isCorrect = (clickedIndex === expectedCellIndex);
        let errorType = null; // Default error type to null

        // --- Handle Incorrect Click ---
        if (!isCorrect) {
            totalErrorsInLevel++; // Increment error count for consistency tracking
            clickedCell.classList.add('incorrect'); // Apply red highlight for visual feedback

            // Determine if the error is due to clicking an extra cell after the pattern is complete
            if (userClicks.length > patternSequence.length) {
                errorType = 'Perseveration'; // Indicates clicking beyond the expected pattern length
            } else {
                errorType = 'IncorrectCell'; // Indicates clicking the wrong cell within the pattern
            }

            // Record the detailed error data
            recordGameData('RecallError', {
                clickedCell: clickedIndex,
                expectedCell: expectedCellIndex,
                clickOrder: userClicks.length, // Which click number this was in the sequence
                timeSinceRecallStart: currentTime - recallStartTime, // Time from recall start to this click
                timeSinceLastClick: timeSinceLastClick, // Time from previous click to this click
                errorType: errorType
            });

            // Provide visual feedback for the error then restart the pattern recall
            setTimeout(() => {
                clickedCell.classList.remove('incorrect'); // Remove the red highlight
                statusDisplay.textContent = 'Incorrect! Try again from start.'; // Inform user
                userClicks = []; // Reset user's clicks for this pattern
                isRecalling = false; // Disable clicks temporarily
                // After a short delay, restart the current level if game is still active
                setTimeout(() => {
                    if (isGameRunning && !isPaused) {
                        startLevel();
                    }
                }, 1500); // Gives user a moment to process the error
            }, 500);

            return; // Exit the function as an error occurred
        } else {
            // --- Handle Correct Click ---
            clickedCell.classList.add('correct'); // Apply green highlight for visual feedback

            // Record the correct click data
            recordGameData('RecallClick', {
                clickedCell: clickedIndex,
                expectedCell: expectedCellIndex,
                clickOrder: userClicks.length,
                timeSinceRecallStart: currentTime - recallStartTime,
                timeSinceLastClick: timeSinceLastClick,
                correct: true
            });
        }

        // --- Check for Pattern Completion ---
        // If the user has clicked the correct number of cells (i.e., completed the pattern)
        if (userClicks.length === patternSequence.length) {
            const recallEndTime = performance.now();
            const workingMemoryLoad = patternSequence.length; // Pattern length as a direct proxy for WM load
            const responseTime = recallEndTime - recallStartTime; // Total time taken to recall the pattern
            const errorRate = totalErrorsInLevel / patternSequence.length; // Errors per expected click

            // Record successful level completion data
            recordGameData('LevelComplete', {
                pattern: patternSequence,
                userClicks: userClicks,
                workingMemoryLoad: workingMemoryLoad,
                responseTime: responseTime,
                errorRate: errorRate,
                totalClicksMade: totalClicksMadeInLevel // Total clicks for perseveration analysis
            });

            statusDisplay.textContent = 'Correct! Next Level...'; // Inform user
            isRecalling = false; // Disable clicks until the next level starts

            // Clear green highlights after a short delay
            setTimeout(() => {
                document.querySelectorAll('.grid-cell').forEach(cell => {
                    cell.classList.remove('correct');
                });
                currentLevel++; // Advance to the next level
                levelDisplay.textContent = `${currentLevel} / ${MAX_LEVEL}`; // Update level display
                // If game is still running and not paused, and max level not reached, start the next level
                if (isGameRunning && !isPaused) {
                    startLevel();
                }
            }, 1000); // Delay before moving to the next level
        }
    }

    /**
     * Resets all game state variables and UI elements to their initial conditions.
     */
    function resetGame() {
        isGameRunning = false;
        isMemorizing = false;
        isRecalling = false;
        isPaused = false;
        currentLevel = 1;
        patternSequence = [];
        userClicks = [];
        gameData = []; // Clear all collected data for a fresh game session
        clearTimeout(flashPatternTimeout); // Clear any pending pattern flashes
        flashPatternTimeout = null; // Reset timeout ID
        currentFlashIndex = 0; // Reset flash index
        recallStartTime = 0;
        lastClickTime = 0;
        totalClicksMadeInLevel = 0;
        totalErrorsInLevel = 0;
        patternDisplayStartTime = 0;
        resumeGameTimestamp = 0;

        pausedOverlay.style.display = 'none'; // Hide pause overlay
        gameOverScreen.style.display = 'none'; // Hide game over screen
        gameArea.style.display = 'block'; // Ensure game area is visible
        startGameButton.textContent = 'Start Game'; // Reset start button text
        levelDisplay.textContent = `${currentLevel} / ${MAX_LEVEL}`; // Reset level display
        statusDisplay.textContent = 'Press Start'; // Reset status message
        // Clear all visual states from grid cells
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('flashing', 'correct', 'incorrect');
        });
    }

    /**
     * Handles the end of the game when all levels are completed.
     * Displays the game over screen and prepares data for potential backend send.
     */
    function gameOver() {
        isGameRunning = false; // Set game state to not running
        isMemorizing = false; // Ensure no more memorizing
        isRecalling = false; // Ensure no more recalling
        clearTimeout(flashPatternTimeout); // Clear any lingering timeouts
        flashPatternTimeout = null; // Reset timeout ID

        gameArea.style.display = 'none'; // Hide the main game grid and info
        gameOverScreen.style.display = 'flex'; // Show the game over screen

        // Record the game over event and final game data summary
        recordGameData('GameOver', {
            finalLevelCompleted: MAX_LEVEL,
            totalGameDataEntries: gameData.length,
            // You might add overall game metrics here if calculated
        });

        console.log("Game Over! All data collected for this session:", gameData);
        // This is the primary point where you would trigger sending the `gameData`
        // array to your backend API for storage and further analysis.
        // Example: sendDataToBackend(gameData);
    }

    // --- UI/Control Functions ---

    /**
     * Toggles the 'dark-mode' class on the body to switch themes.
     * Stores the user's preference in localStorage.
     */
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        // Save preference
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', 'disabled');
        }
    }

    /**
     * Loads the user's dark mode preference from localStorage when the page loads.
     */
    function loadDarkModePreference() {
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark-mode');
        }
    }

    /**
     * Toggles the game's paused state. Stops timers and updates UI.
     * Crucial for correctly resuming game flow (flashing pattern or recall timer).
     */
    function togglePause() {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    pausedOverlay.style.display = isPaused ? 'flex' : 'none';

    if (isPaused) {
        recordGameData('Pause', { state: 'paused' });
        if (flashPatternTimeout) {
            clearTimeout(flashPatternTimeout);
            flashPatternTimeout = null;
        }
        if (isRecalling) {
            resumeGameTimestamp = performance.now();
        }
        statusDisplay.textContent = 'Game Paused';
        pauseGame(); // ✅ pause logic
    } else {
        recordGameData('Pause', { state: 'resumed' });

        if (isMemorizing) {
            setTimeout(() => {
                flashPattern(patternSequence, currentFlashIndex); // ✅ resume pattern flash
            }, 500);
        } else if (isRecalling) {
            const pausedDuration = performance.now() - resumeGameTimestamp;
            recallStartTime += pausedDuration;
            lastClickTime += pausedDuration;
            statusDisplay.textContent = 'Recall the pattern!';
        } else {
            resumeGame(); // ✅ resume level if needed
        }
    }
}
    /**
     * Displays the instructions modal to the user.
     */
    function showInstructions() {
        instructionsModal.style.display = 'flex'; // Make the modal visible
    }

    /**
     * Hides the instructions modal.
     */
    function hideInstructions() {
        instructionsModal.style.display = 'none'; // Hide the modal
    }

    /**
     * Redirects the user to the "next_game.html" page.
     */
    function goToNextGame() {
        window.location.href = 'impulse.html'; // Navigate to the specified URL
    }

    // --- Event Listeners ---
    startGameButton.addEventListener('click', startGame);
    darkModeToggle.addEventListener('click', toggleDarkMode);
    pauseButton.addEventListener('click', togglePause);
    instructionsButton.addEventListener('click', showInstructions);
    closeButton.addEventListener('click', hideInstructions);
    nextGameButton.addEventListener('click', goToNextGame); // Listener for the "Next Game" button

    // Close instructions modal if user clicks outside of the modal content
    window.addEventListener('click', (event) => {
        if (event.target === instructionsModal) {
            hideInstructions();
        }
    });

    gridContainer.addEventListener("click", (e) => {
    if (isPaused) return;
    handleCellClick(e.target);
    });
    
    // --- Initial Setup on Page Load ---
    loadDarkModePreference(); // Apply dark mode preference based on localStorage
    generateGrid(); // Create the initial grid cells when the page loads

    startGameButton.addEventListener('click', () => {
        backgroundMusic.play();
        startGame(); // your game logic
    });
});

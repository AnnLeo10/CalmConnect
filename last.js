document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    // Game Screens
    const instructionsScreen = document.getElementById('instructions-screen');
    const gamePlayScreen = document.getElementById('game-play-screen');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const endGameSummaryScreen = document.getElementById('end-game-summary-screen'); // New final summary screen

    // Buttons
    const startButton = document.getElementById('startButton');
    const pauseButton = document.getElementById('pauseButton');
    const resumeButton = document.getElementById('resumeButton');
    const restartGameFromPauseButton = document.getElementById('restartGameFromPause'); // New
    const nextRoundButton = document.getElementById('nextRoundButton');
    const playAgainButton = document.getElementById('playAgainButton'); // On summary screen
    const viewDetailedResultsButton = document.getElementById('viewDetailedResultsButton'); // On summary screen

    // Game Play Elements
    const wireContainer = document.getElementById('wireContainer');
    const timerBar = document.getElementById('timerBar');
    const timerText = document.getElementById('timerText'); // New
    const currentRoundSpan = document.getElementById('currentRound');
    const maxRoundsSpan = document.getElementById('maxRounds');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const bombImage = document.getElementById('bombImage'); // For shake animation
    const flickerOverlay = document.getElementById('flickerOverlay'); // For global flicker

    // End Game Summary Elements
    const finalEncouragementText = document.getElementById('finalEncouragement');
    const summaryWiresDefused = document.getElementById('summaryWiresDefused');
    const summaryExplosions = document.getElementById('summaryExplosions');
    const summaryAvgReactionTime = document.getElementById('summaryAvgReactionTime');

    // Global Message Overlay
    const globalMessageOverlay = document.getElementById('global-message-overlay');
    const globalMessageText = document.getElementById('global-message-text');

    // --- Audio Elements (NEW) ---
    const tickSound = new Audio('CalmConnect/gameBg/ticking-clock_1-27477.mp3');
    const explosionSound = new Audio('CalmConnect/gameBg/explosion-42132.mp3');
    const successSound = new Audio('CalmConnect/gameBg/success-340660.mp3');
    const gameOverSound = new Audio('CalmConnect/gameBg/game-fail-90322.mp3');
    tickSound.loop = true; // Loop the ticking sound
    tickSound.volume = 0.5;
    explosionSound.volume = 0.7;
    successSound.volume = 0.6;
    gameOverSound.volume = 0.7;


    // --- Game Variables ---
    const MAX_ROUNDS = 5;
    const TIME_PER_ROUND_SECONDS = 8;
    const WIRE_COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];

    let currentRound = 0;
    let gameData = []; // Stores data for each round
    let roundStartTime;
    let timerInterval;
    let countdownInterval;
    let timeRemaining;
    let isPaused = false;
    let wiresInRound = []; // Stores the actual wire elements for the current round
    let correctWireColor; // The color of the wire to cut for the current round
    let wiresCutCount = 0; // Wires cut in current round (should be 1)
    let totalSuccessfulDefuses = 0; // Total across all rounds
    let totalExplosions = 0; // Total across all rounds
    let totalReactionTime = 0; // Sum of reaction times for successful defuses
    let currentRoundAmbiguityType; // Store ambiguity type for current round

    // --- Round Configurations (DEFINED AMBIGUITY AND RULES) ---
    // This is crucial for your AI model. Define diverse scenarios.
    const ALL_ROUND_CONFIGURATIONS = [
        {
            wires: ['red', 'blue', 'green', 'yellow'],
            correct: 'green',
            ambiguity: 'low', // Explicit: "Cut the green wire."
            hint: "The correct wire is the one that brings life. (Green)",
            visualCue: null // No special visual cue
        },
        {
            wires: ['red', 'red', 'blue', 'yellow'],
            correct: 'yellow',
            ambiguity: 'medium', // Implicit rule: "Cut the unique color."
            hint: "Look for the outlier, the one that stands alone.",
            visualCue: null
        },
        {
            wires: ['blue', 'blue', 'red', 'green', 'blue'],
            correct: 'red',
            ambiguity: 'high', // Subtle rule: "Cut the non-majority color."
            hint: "Sometimes, the obvious choice isn't the right one. Consider what breaks the pattern.",
            visualCue: 'bomb-flicker' // The entire bomb flickers
        },
        {
            wires: ['green', 'red', 'blue', 'purple'],
            correct: 'purple', // Complex rule: "Cut the last color alphabetically, but only if it's there. Otherwise, cut red."
            ambiguity: 'very-high', // Unclear rule, requires trial/error or deep thought
            hint: "The solution might be less about what you see, and more about a hidden order.",
            visualCue: null
        },
        {
            wires: ['red', 'blue', 'yellow', 'green'],
            correct: 'blue', // Dynamic rule: "Cut the wire that pulsates faster."
            ambiguity: 'dynamic-speed', // Ambiguity based on subtle real-time change
            hint: "Pay close attention to subtle shifts. Velocity matters.",
            visualCue: 'wire-pulse-speed' // Wires pulse at different speeds
        },
        {
            wires: ['yellow', 'green', 'yellow', 'blue'],
            correct: 'green', // Rule: "Cut the wire that has a subtle hum/vibration (simulated)."
            ambiguity: 'auditory-visual', // Ambiguity combining visual and implied audio cues (difficult)
            hint: "Listen closely, or perhaps feel the frequency.",
            visualCue: 'wire-vibrate' // Wires vibrate
        },
        {
            wires: ['red', 'blue', 'red', 'red'],
            correct: 'blue', // Rule: "Cut the wire that has the *least* charge (visual dimming)."
            ambiguity: 'subtle-visual', // Very subtle visual difference
            hint: "The power is unevenly distributed. Find the weak link.",
            visualCue: 'wire-dim' // Wires dim at different levels
        }
    ];

    let shuffledRoundConfigs = []; // Will hold the configurations for the current game

    // --- Functions ---

    function showScreen(screenToShow, animationClass = 'screen-fade-in') {
        // Hide all game screens
        [instructionsScreen, gamePlayScreen, pauseOverlay, endGameSummaryScreen, globalMessageOverlay].forEach(screen => {
            screen.classList.remove('active');
            screen.classList.add('hidden');
            screen.classList.remove(animationClass); // Clear any previous animation
        });

        // Show the desired screen
        if (screenToShow) {
            screenToShow.classList.remove('hidden');
            // Allow CSS to register 'hidden' before adding 'active' for transition
            setTimeout(() => {
                screenToShow.classList.add('active');
                if (animationClass) {
                    screenToShow.classList.add(animationClass);
                }
            }, 10);
        }
    }

    function startGame() {
        currentRound = 0;
        gameData = [];
        totalSuccessfulDefuses = 0;
        totalExplosions = 0;
        totalReactionTime = 0;
        isPaused = false;
        clearInterval(timerInterval);
        clearInterval(countdownInterval);
        tickSound.pause(); // Ensure sound is off
        tickSound.currentTime = 0;

        // Shuffle a copy of all configurations for the new game
        shuffledRoundConfigs = [...ALL_ROUND_CONFIGURATIONS];
        shuffleArray(shuffledRoundConfigs);
        shuffledRoundConfigs = shuffledRoundConfigs.slice(0, MAX_ROUNDS); // Take only MAX_ROUNDS

        maxRoundsSpan.textContent = MAX_ROUNDS;
        showScreen(gamePlayScreen);
        startRound();
    }

    function startRound() {
        if (currentRound >= MAX_ROUNDS) {
            endGame();
            return;
        }

        const roundConfig = shuffledRoundConfigs[currentRound];
        if (!roundConfig) {
            console.error("No round configuration found for current round:", currentRound);
            endGame();
            return;
        }

        currentRound++;
        currentRoundSpan.textContent = currentRound;
        feedbackMessage.textContent = ''; // Clear feedback
        feedbackMessage.classList.remove('correct', 'incorrect');
        nextRoundButton.classList.add('hidden'); // Hide next round button

        wiresCutCount = 0; // Reset for new round
        currentRoundAmbiguityType = roundConfig.ambiguity; // Set ambiguity for this round

        // Clear previous wires and reset state
        wireContainer.innerHTML = '';
        wiresInRound = [];
        bombImage.classList.remove('shake'); // Remove any bomb shake
        flickerOverlay.classList.remove('active'); // Turn off global flicker

        // Determine correct wire for this round based on its config
        correctWireColor = roundConfig.correct;

        roundConfig.wires.forEach(color => {
            const wireDiv = document.createElement('div');
            wireDiv.classList.add('wire', color);
            wireDiv.dataset.color = color;
            wireDiv.addEventListener('click', handleWireCut);
            wireContainer.appendChild(wireDiv);
            wiresInRound.push(wireDiv);
        });

        // Apply visual cues based on ambiguity type
        applyVisualCues(roundConfig.visualCue);


        // Start round timer
        timeRemaining = TIME_PER_ROUND_SECONDS;
        roundStartTime = Date.now();
        updateTimerBar(); // Initial update
        clearInterval(timerInterval); // Clear any existing timer
        clearInterval(countdownInterval); // Clear existing countdown
        timerBar.style.width = '100%'; // Reset to full width
        timerBar.style.backgroundColor = 'var(--timer-color-active)';
        timerBar.style.transition = 'width 0.1s linear, background-color 0.3s ease';

        tickSound.play(); // Start ticking sound

        countdownInterval = setInterval(() => {
            if (!isPaused) {
                timeRemaining = TIME_PER_ROUND_SECONDS - ((Date.now() - roundStartTime) / 1000);
                updateTimerBar();
                updateTimerText();

                if (timeRemaining <= 0) {
                    clearInterval(countdownInterval);
                    clearInterval(timerInterval);
                    handleTimeOut();
                } else if (timeRemaining < TIME_PER_ROUND_SECONDS * 0.3) { // Last 30% of time
                    timerBar.style.backgroundColor = 'var(--danger-color)'; // Change to red
                    // Potentially increase tick sound speed here
                }
            }
        }, 50); // Update frequently for smooth bar and text

        timerInterval = setTimeout(() => {
             if (!isPaused && wiresCutCount === 0) { // Only if no wire was cut yet
                handleTimeOut();
             }
        }, TIME_PER_ROUND_SECONDS * 1000);
    }

    function updateTimerBar() {
        const percentage = (timeRemaining / TIME_PER_ROUND_SECONDS) * 100;
        timerBar.style.width = `${Math.max(0, percentage)}%`;
    }

    function updateTimerText() {
        const seconds = Math.max(0, Math.floor(timeRemaining));
        const milliseconds = Math.max(0, Math.floor((timeRemaining - seconds) * 100));
        timerText.textContent = `${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`;
    }

    function applyVisualCues(cueType) {
        // Remove all previous cue classes
        wiresInRound.forEach(wire => {
            wire.classList.remove('flicker', 'pulse-speed', 'vibrate', 'dim');
            wire.style.animationDuration = ''; // Reset for pulse-speed
        });

        if (cueType === 'bomb-flicker') {
            bombImage.classList.add('shake');
            flickerOverlay.classList.add('active');
        } else if (cueType === 'wire-flicker') { // Example: incorrect wires flicker
            wiresInRound.forEach(wire => {
                if (wire.dataset.color !== correctWireColor) {
                    wire.classList.add('flicker');
                }
            });
        } else if (cueType === 'wire-pulse-speed') {
            wiresInRound.forEach(wire => {
                wire.classList.add('pulse-speed');
                // Make correct wire pulse differently (e.g., faster)
                if (wire.dataset.color === correctWireColor) {
                    wire.style.animationDuration = '0.5s'; // Faster pulse
                } else {
                    wire.style.animationDuration = `${1 + Math.random()}s`; // Random slower pulse
                }
            });
            // You'd need a CSS rule for .pulse-speed
        } else if (cueType === 'wire-vibrate') {
            wiresInRound.forEach(wire => {
                if (wire.dataset.color === correctWireColor) {
                    wire.classList.add('vibrate'); // Only correct one vibrates (subtly)
                }
            });
            // You'd need a CSS rule for .vibrate
        } else if (cueType === 'wire-dim') {
            wiresInRound.forEach(wire => {
                if (wire.dataset.color === correctWireColor) {
                    wire.classList.add('bright'); // Correct wire is brighter
                } else {
                    wire.classList.add('dim'); // Incorrect ones are dimmer
                }
            });
            // You'd need a CSS rule for .bright and .dim
        }
    }


    function handleWireCut(event) {
        if (isPaused || wiresCutCount > 0) return;

        clearInterval(timerInterval);
        clearInterval(countdownInterval);
        tickSound.pause(); // Stop ticking sound
        
        wiresCutCount++;

        const selectedWire = event.target;
        selectedWire.classList.add('cut'); // Apply cut animation

        // Remove any active visual cues immediately
        bombImage.classList.remove('shake');
        flickerOverlay.classList.remove('active');
        wiresInRound.forEach(wire => {
            wire.classList.remove('flicker', 'pulse-speed', 'vibrate', 'dim', 'bright');
            wire.style.animationDuration = '';
        });

        const selectedColor = selectedWire.dataset.color;
        const reactionTime = (Date.now() - roundStartTime) / 1000;

        let outcome = {
            round: currentRound,
            correctWire: correctWireColor,
            selectedWire: selectedColor,
            reactionTime: reactionTime,
            success: false,
            timedOut: false,
            explosion: false,
            ambiguityType: currentRoundAmbiguityType,
            roundConfigUsed: shuffledRoundConfigs[currentRound - 1] // Store the full config for context
        };

        if (selectedColor === correctWireColor) {
            outcome.success = true;
            totalSuccessfulDefuses++;
            totalReactionTime += reactionTime;
            displayFeedback("Defused!", 'correct');
            successSound.play();
        } else {
            outcome.explosion = true;
            totalExplosions++;
            displayFeedback("BOOM! Wrong Wire!", 'incorrect');
            explosionSound.play();
            bombImage.classList.add('shake'); // Shake bomb on explosion for emphasis
        }
        gameData.push(outcome);
        console.log(`Round ${currentRound} Data:`, outcome);

        // Disable further clicks on wires for this round
        wiresInRound.forEach(wire => wire.removeEventListener('click', handleWireCut));

        // Wait a bit before showing next round button or ending game
        setTimeout(() => {
            nextRoundButton.classList.remove('hidden'); // Show next round button
            if (outcome.explosion) {
                // If explosion, don't wait for next round click, go straight to end game summary
                setTimeout(() => {
                    endGame(true); // true means game ended by explosion
                }, 1000); // Short delay to let feedback sink in
            }
        }, 800);
    }

    function handleTimeOut() {
        clearInterval(timerInterval);
        clearInterval(countdownInterval);
        tickSound.pause(); // Stop ticking sound
        
        // Remove any active visual cues immediately
        bombImage.classList.remove('shake');
        flickerOverlay.classList.remove('active');
        wiresInRound.forEach(wire => {
            wire.classList.remove('flicker', 'pulse-speed', 'vibrate', 'dim', 'bright');
            wire.style.animationDuration = '';
        });

        wiresInRound.forEach(wire => wire.removeEventListener('click', handleWireCut));

        const outcome = {
            round: currentRound,
            correctWire: correctWireColor,
            selectedWire: null,
            reactionTime: TIME_PER_ROUND_SECONDS, // Max time for timeout
            success: false,
            timedOut: true,
            explosion: true, // Treat timeout as failure/explosion
            ambiguityType: currentRoundAmbiguityType,
            roundConfigUsed: shuffledRoundConfigs[currentRound - 1]
        };
        gameData.push(outcome);
        console.log(`Round ${currentRound} Data:`, outcome);
        totalExplosions++; // Increment explosion count

        displayFeedback("Time's Up! BOOM!", 'incorrect');
        explosionSound.play();
        bombImage.classList.add('shake'); // Shake bomb on explosion

        // Directly go to end game summary after timeout explosion
        setTimeout(() => {
            endGame(true); // true means game ended by explosion
        }, 1000);
    }

    function displayFeedback(message, type) {
        feedbackMessage.textContent = message;
        feedbackMessage.classList.add(type);
        // Remove after animation to allow re-triggering next time
        feedbackMessage.addEventListener('animationend', () => {
            feedbackMessage.classList.remove(type);
        }, { once: true });
    }

    function togglePause() {
        if (isPaused) {
            // Resume
            isPaused = false;
            showScreen(gamePlayScreen); // Show game screen again
            // Resume timer by resetting roundStartTime
            roundStartTime = Date.now() - (TIME_PER_ROUND_SECONDS - timeRemaining) * 1000;
            // Restart countdown interval
            countdownInterval = setInterval(() => {
                if (!isPaused) {
                    timeRemaining = TIME_PER_ROUND_SECONDS - ((Date.now() - roundStartTime) / 1000);
                    updateTimerBar();
                    updateTimerText();
                    if (timeRemaining <= 0) {
                        clearInterval(countdownInterval);
                        clearInterval(timerInterval);
                        handleTimeOut();
                    } else if (timeRemaining < TIME_PER_ROUND_SECONDS * 0.3) {
                        timerBar.style.backgroundColor = 'var(--danger-color)';
                    }
                }
            }, 50);
            // Re-enable the main timer timeout if no wire has been cut yet
            if (wiresCutCount === 0) {
                 timerInterval = setTimeout(() => {
                    handleTimeOut();
                 }, timeRemaining * 1000); // Set timeout for remaining time
            }
            tickSound.play(); // Resume ticking sound
        } else {
            // Pause
            isPaused = true;
            showScreen(pauseOverlay); // Show pause overlay
            clearInterval(countdownInterval); // Stop countdown
            clearInterval(timerInterval); // Stop main timer
            tickSound.pause(); // Pause ticking sound
        }
    }

    function endGame(exploded = false) {
        clearInterval(timerInterval);
        clearInterval(countdownInterval);
        tickSound.pause();
        gameOverSound.play(); // Play game over sound

        // Remove any active visual cues immediately
        bombImage.classList.remove('shake');
        flickerOverlay.classList.remove('active');
        wiresInRound.forEach(wire => {
            wire.classList.remove('flicker', 'pulse-speed', 'vibrate', 'dim', 'bright');
            wire.style.animationDuration = '';
        });

        const avgReaction = totalSuccessfulDefuses > 0 ? (totalReactionTime / totalSuccessfulDefuses).toFixed(2) : 'N/A';

        // Set text for end game summary screen
        summaryWiresDefused.textContent = totalSuccessfulDefuses;
        summaryExplosions.textContent = totalExplosions;
        summaryAvgReactionTime.textContent = `${avgReaction}s`;

        // Encouraging statements based on performance
        if (totalSuccessfulDefuses === MAX_ROUNDS) {
            finalEncouragementText.textContent = "Outstanding! You are a master defuser, calm and precise under extreme pressure. Your cognitive control is exemplary!";
        } else if (totalSuccessfulDefuses >= MAX_ROUNDS / 2 && totalExplosions < 2) {
            finalEncouragementText.textContent = "Well done, Agent! You handled the pressure with good judgment. There's always room to refine your decision-making speed.";
        } else if (exploded && totalSuccessfulDefuses === 0) {
             finalEncouragementText.textContent = "Mission critical failure. The pressure was intense, but every attempt is a lesson learned. Analyze your actions and try again!";
        } else {
            finalEncouragementText.textContent = "Mission completed. Your performance showed resilience, but also highlighted areas for improved focus and pattern recognition under duress. Keep training!";
        }

        showScreen(endGameSummaryScreen);

        // Send data to backend for AI analysis
        sendGameDataToBackend(gameData);
    }

    function sendGameDataToBackend(data) {
        console.log("Attempting to send game data to backend:", data);
        fetch('YOUR_BACKEND_API_ENDPOINT_HERE/submit-game-data', { // <<< REPLACE WITH YOUR ACTUAL BACKEND ENDPOINT
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add authentication token if your backend requires it
                // 'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                // Log detailed error from server if possible
                return response.text().then(text => { throw new Error(`HTTP error! Status: ${response.status}, Message: ${text}`); });
            }
            return response.json();
        })
        .then(result => {
            console.log('Game data successfully submitted !', result);
            // Optionally, show a temporary success message
            displayGlobalMessage("Mission Data Logged!", 1500);
        })
        .catch(error => {
            console.error('Error submitting game data to backend:', error);
            // Show an error message to the user
            displayGlobalMessage(" Try Again.", 3000);
        });
    }

    function displayGlobalMessage(message, duration = 2000) {
        globalMessageText.textContent = message;
        globalMessageOverlay.classList.remove('hidden');
        globalMessageOverlay.classList.add('active');

        setTimeout(() => {
            globalMessageOverlay.classList.remove('active');
            setTimeout(() => {
                globalMessageOverlay.classList.add('hidden');
            }, 300); // Give time for fade out animation
        }, duration);
    }

    // --- Utility Functions ---
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }


    // --- Event Listeners ---
    startButton.addEventListener('click', startGame);
    pauseButton.addEventListener('click', togglePause);
    resumeButton.addEventListener('click', togglePause);
    restartGameFromPauseButton.addEventListener('click', startGame); // Restart from pause
    nextRoundButton.addEventListener('click', startRound);
    playAgainButton.addEventListener('click', startGame); // Play again from summary

    viewDetailedResultsButton.addEventListener('click', () => {
        // We still save to localStorage for the client-side results.html
        localStorage.setItem('redWireGameResults', JSON.stringify(gameData));
        window.location.href = 'results.html'; // Navigate to separate results page
    });


    // --- Dark Mode Logic ---
    const applyDarkMode = (isDark) => {
        if (isDark) {
            body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    };

    // Initialize dark mode based on localStorage or system preference
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
        darkModeToggle.checked = true;
        applyDarkMode(true);
    } else if (storedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // Default to system preference if no stored theme
        darkModeToggle.checked = true;
        applyDarkMode(true);
    } else {
        applyDarkMode(false);
    }

    darkModeToggle.addEventListener('change', (e) => {
        applyDarkMode(e.target.checked);
    });

    // Initial screen display
    showScreen(instructionsScreen);
});
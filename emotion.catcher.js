document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    const instructionsScreen = document.getElementById('instructions-screen');
    const gameScreen = document.getElementById('game-screen');
    const resultsScreen = document.getElementById('results-screen');

    const startButton = document.getElementById('startButton');
    const backgroundMusic = document.getElementById('backgroundMusic');
    const gameImage = document.getElementById('gameImage');
    const imageOverlay = document.querySelector('.image-overlay');
    const emotionOptionsContainer = document.querySelector('.emotion-options');
    const currentRoundSpan = document.getElementById('currentRound');
    const timerBar = document.getElementById('timerBar');

    const totalRoundsCompletedSpan = document.getElementById('totalRoundsCompleted');
    const correctScoreSpan = document.getElementById('correctScore');
    const totalPossibleSpan = document.getElementById('totalPossible');
    const avgReactionTimeSpan = document.getElementById('avgReactionTime');
    const restartButton = document.getElementById('restartButton');
    const dashboardButton = document.getElementById('dashboardButton');

    // --- Game Variables ---
    const MAX_ROUNDS = 10;
    const TIME_PER_ROUND_SECONDS = 15; // Time to react to each image
    let currentRound = 0;
    let gameData = []; // Stores data for each round
    let roundStartTime;
    let timerInterval;
    let currentImageCorrectEmotion; // For conceptual "correctness" if you define it
    let correctCount = 0; // For a basic score (can be adapted)

    // --- Image Data (Replace with your actual image paths and 'correct' emotions) ---
    // IMPORTANT: For mental health assessment, "correct" might mean "expected" or "most common perception."
    // You should use diverse images (facial expressions, abstract art, nature scenes, social interactions).
    const images = [
        { src: 'CalmConnect/gameImage/emotions/happy/h1.jpg', expectedEmotion: 'Happy' },
        { src: 'CalmConnect/gameImage/emotions/happy/h2.jpg', expectedEmotion: 'Happy' },
        { src: 'CalmConnect/gameImage/emotions/angry/a1.jpg', expectedEmotion: 'Anger' },
        { src: 'CalmConnect/gameImage/emotions/angry/a2.jpg', expectedEmotion: 'Angry' },
        { src: 'CalmConnect/gameImage/emotions/sad/sa1.jpg', expectedEmotion: 'Sad' },
        { src: 'CalmConnect/gameImage/emotions/sad/sa2.jpg', expectedEmotion: 'Sad' },
        { src: 'CalmConnect/gameImage/emotions/confused/c1.jpg', expectedEmotion: 'Confused' },
        { src: 'CalmConnect/gameImage/emotions/confused/c2.jpg', expectedEmotion: 'Confused' },
        { src: 'CalmConnect/gameImage/emotions/surprised/su1.jpg', expectedEmotion: 'Surprised' },
        { src: 'CalmConnect/gameImage/emotions/surprised/su2.jpg', expectedEmotion: 'Surprised' }
        // Add more images as needed. Ensure they are diverse and ethically sourced.
    ];

    // Shuffle images for random order each time
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    shuffleArray(images);

    // --- Emotion Options (You can customize these heavily) ---
    const emotionOptions = [
        'Happy', 'Sad', 'Angry', 'Surprised', 'Confused'
        // Add more nuanced emotions based on your assessment goals
    ].sort(() => 0.5 - Math.random()); // Shuffle emotions for variety each time

    // --- Functions ---

    function showScreen(screenToShow) {
        [instructionsScreen, gameScreen, resultsScreen].forEach(screen => {
            if (screen === screenToShow) {
                screen.classList.add('active');
                screen.classList.remove('hidden');
            } else {
                screen.classList.remove('active');
                screen.classList.add('hidden');
            }
        });
    }

    function startGame() {
        currentRound = 0;
        gameData = [];
        correctCount = 0;
        shuffleArray(images); // Reshuffle images for a new game
        showScreen(gameScreen);
        startRound();
    }
    

    function startRound() {
        if (currentRound >= MAX_ROUNDS) {
            endGame();
            return;
        }

        currentRound++;
        currentRoundSpan.textContent = currentRound;
        emotionOptionsContainer.innerHTML = ''; // Clear previous options

        const imageData = images[currentRound - 1];
        gameImage.src = imageData.src;
        currentImageCorrectEmotion = imageData.expectedEmotion; // Store correct emotion

        // Trigger subtle animation on image load
        gameImage.style.transform = 'scale(0.95)';
        gameImage.style.opacity = 0;
        setTimeout(() => {
            gameImage.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
            gameImage.style.transform = 'scale(1)';
            gameImage.style.opacity = 1;
        }, 100);

        // Reset timer bar and start animation
        timerBar.style.width = '100%';
        timerBar.style.transition = `width ${TIME_PER_ROUND_SECONDS}s linear`;

        // Start round timer
        roundStartTime = Date.now();
        clearInterval(timerInterval); // Clear any existing timer
        timerInterval = setTimeout(() => {
            // Time's up, record null response
            recordResponse(null, true);
        }, TIME_PER_ROUND_SECONDS * 1000);

        // Create emotion buttons
        emotionOptions.forEach(emotion => {
            const button = document.createElement('button');
            button.textContent = emotion;
            button.dataset.emotion = emotion; // Store emotion value
            button.addEventListener('click', () => {
                recordResponse(emotion);
            });
            emotionOptionsContainer.appendChild(button);
        });

        // Activate image overlay grounding effect
        imageOverlay.classList.add('active');
    }

    function recordResponse(selectedEmotion, timedOut = false) {
        clearInterval(timerInterval); // Stop the timer
        imageOverlay.classList.remove('active'); // Deactivate overlay

        const reactionTime = (Date.now() - roundStartTime) / 1000; // in seconds

        let isCorrect = false;
        if (selectedEmotion === currentImageCorrectEmotion) {
            isCorrect = true;
            correctCount++;
        }

        // Highlight selected button (optional, but good visual feedback)
        if (selectedEmotion) {
            const selectedButton = emotionOptionsContainer.querySelector(`[data-emotion="${selectedEmotion}"]`);
            if (selectedButton) {
                selectedButton.classList.add('selected');
            }
        }

        // Store data for the round
        gameData.push({
            round: currentRound,
            image: images[currentRound - 1].src,
            expectedEmotion: currentImageCorrectEmotion,
            selectedEmotion: selectedEmotion,
            reactionTime: reactionTime,
            timedOut: timedOut,
            isCorrect: isCorrect
        });

        console.log(`Round ${currentRound} Data:`, gameData[gameData.length - 1]); // Log to console for now

        // Wait a moment before next round for visual feedback
        setTimeout(() => {
            startRound();
        }, 800); // Short delay
    }
    function downloadGameData() {
        const dataStr = JSON.stringify(gameData, null, 2); // Pretty-printed
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'gameData.json';
        a.click();
        URL.revokeObjectURL(url); // Clean up after download
}


    function endGame() {
        showScreen(resultsScreen);

        const totalReactionTime = gameData.reduce((sum, entry) => sum + (entry.reactionTime || TIME_PER_ROUND_SECONDS), 0);
        const avgReaction = (totalReactionTime / gameData.length).toFixed(2);

        totalRoundsCompletedSpan.textContent = MAX_ROUNDS;
        correctScoreSpan.textContent = correctCount;
        totalPossibleSpan.textContent = MAX_ROUNDS; // Or gameData.length
        avgReactionTimeSpan.textContent = avgReaction;

        console.log("Game Over! All Data:", gameData);
         // Save game data to localStorage
        const existingData = JSON.parse(localStorage.getItem("allGameSessions")) || [];
        existingData.push(gameData); // Push the current session
        localStorage.setItem("allGameSessions", JSON.stringify(existingData));
        //downloadGameData();
        // Here you would typically send `gameData` to your server for AI model.
        // Example: fetch('/api/submit-game-data', { method: 'POST', body: JSON.stringify(gameData) });
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame); // Allows replaying
    dashboardButton.addEventListener('click', () => {
        // Redirect to your main dashboard or close the game
        alert("Navigating to Dashboard (Not implemented in this demo)");
        // window.location.href = 'your-dashboard-url.html';
    });


    // --- Dark Mode Logic ---
    const applyDarkMode = (isDark) => {
        const body = document.body; 
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

    // Ensure instructions screen is shown initially
    showScreen(instructionsScreen);
});
const nextGameButton = document.getElementById('nextGameButton');
nextGameButton.addEventListener('click', () => {
    window.location.href = 'memorymaze.html'; // Update to your actual HTML file name/path
});
darkModeToggle.addEventListener('change', () => {
  applyDarkMode(darkModeToggle.checked);
});
startButton.addEventListener('click', () => {
        backgroundMusic.play();
        startGame(); // your game logic
    });
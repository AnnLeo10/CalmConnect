import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDpVCWdASks0pqfvdbbHCjdzJii5vU19J8",
  authDomain: "healthweb-95c11.firebaseapp.com",
  projectId: "healthweb-95c11",
  storageBucket: "healthweb-95c11.appspot.com",
  messagingSenderId: "699762925564",
  appId: "1:699762925564:web:f86c3fa97358babd925c79",
  measurementId: "G-7JV31MTTPD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function saveGameSessionToFirestore(sessionData) {
  try {
    const sessionRef = await addDoc(collection(db, "GameResults2"), {
      playerName: "Vedika",
      timestamp: new Date().toISOString(),
      events: sessionData
    });
    console.log("✅ Game session stored with ID:", sessionRef.id);
  } catch (error) {
    console.error("❌ Error saving game session:", error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
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
  const gameOverScreen = document.getElementById('gameOverScreen');
  const nextGameButton = document.getElementById('nextGameButton');
  const gameArea = document.getElementById('gameArea');

  const GRID_SIZE = 4;
  const CELL_COUNT = GRID_SIZE * GRID_SIZE;
  const MEMORY_FLASH_DURATION_MS = 1000;
  const PATTERN_GAP_MS = 200;
  const LEVEL_INCREASE_PATTERN = 1;
  const MIN_PATTERN_LENGTH = 3;
  const MAX_LEVEL = 4;

  let currentLevel = 1;
  let patternSequence = [];
  let userClicks = [];
  let gameData = [];
  let isGameRunning = false;
  let isMemorizing = false;
  let isRecalling = false;
  let isPaused = false;
  let isResumed = false;

  let recallStartTime = 0;
  let lastClickTime = 0;
  let patternDisplayStartTime = 0;

  let flashPatternTimeout = null;
  let currentFlashIndex = 0;
  let resumeGameTimestamp = 0;

  let totalClicksMadeInLevel = 0;
  let totalErrorsInLevel = 0;

  function generateGrid() {
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
    for (let i = 0; i < CELL_COUNT; i++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell');
      cell.dataset.index = i;
      cell.addEventListener('click', handleCellClick);
      gridContainer.appendChild(cell);
    }
  }

  function getRandomPattern(length) {
    const pattern = [];
    const availableCells = Array.from({ length: CELL_COUNT }, (_, i) => i);
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * availableCells.length);
      const selectedCellIndex = availableCells.splice(randomIndex, 1)[0];
      pattern.push(selectedCellIndex);
    }
    return pattern;
  }

  function createCancelableDelay(ms) {
    return new Promise(resolve => {
      flashPatternTimeout = setTimeout(resolve, ms);
    });
  }

  async function flashPattern(pattern, startIndex = 0) {
    if (isPaused || !isMemorizing) return;
    statusDisplay.textContent = 'Memorize the pattern!';
    if (startIndex === 0) {
      document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.classList.remove('flashing', 'correct', 'incorrect');
      });
      patternDisplayStartTime = performance.now();
    }
    currentFlashIndex = startIndex;
    for (let i = startIndex; i < pattern.length; i++) {
      if (isPaused) {
        currentFlashIndex = i;
        return;
      }
      const cellIndex = pattern[i];
      const cell = gridContainer.children[cellIndex];
      if (cell) {
        cell.classList.add('flashing');
        await createCancelableDelay(MEMORY_FLASH_DURATION_MS - 50);
        cell.classList.remove('flashing');
        await createCancelableDelay(PATTERN_GAP_MS);
      }
    }
    flashPatternTimeout = null;
    isMemorizing = false;
    statusDisplay.textContent = 'Recall the pattern!';
    recallStartTime = performance.now();
    lastClickTime = performance.now();
    isRecalling = true;
    userClicks = [];
    totalClicksMadeInLevel = 0;
    totalErrorsInLevel = 0;
  }

  function recordGameData(eventType, data) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level: currentLevel,
      eventType,
      ...data
    };
    gameData.push(entry);
  }

  async function startGame() {
    if (isGameRunning) {
      if (!confirm("A game is already in progress. Restart?")) return;
      resetGame();
    }
    isGameRunning = true;
    startGameButton.textContent = 'Restart Game';
    gameOverScreen.style.display = 'none';
    gameArea.style.display = 'block';
    currentLevel = 1;
    levelDisplay.textContent = `${currentLevel} / ${MAX_LEVEL}`;
    gameData = [];
    await startLevel();
  }

  async function startLevel() {
    if (isPaused) {
      statusDisplay.textContent = 'Game Paused';
      return;
    }
    if (currentLevel > MAX_LEVEL) {
      gameOver();
      return;
    }
    statusDisplay.textContent = 'Generating pattern...';
    const patternLength = MIN_PATTERN_LENGTH + (currentLevel - 1) * LEVEL_INCREASE_PATTERN;
    patternSequence = getRandomPattern(patternLength);
    recordGameData('LevelStart', { pattern: patternSequence, patternLength });
    document.querySelectorAll('.grid-cell').forEach(cell => {
      cell.classList.remove('correct', 'incorrect', 'flashing');
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    isMemorizing = true;
    currentFlashIndex = 0;
    await flashPattern(patternSequence);
    statusDisplay.textContent = `Level ${currentLevel} - Memorize!`;
    enableInput();
  }

  function handleCellClick(event) {
    if (!isRecalling || isPaused) return;
    const clickedCell = event.target;
    const clickedIndex = parseInt(clickedCell.dataset.index);
    totalClicksMadeInLevel++;
    const currentTime = performance.now();
    const timeSinceLastClick = currentTime - lastClickTime;
    lastClickTime = currentTime;
    userClicks.push(clickedIndex);
    const currentExpectedPatternIndex = userClicks.length - 1;
    const expectedCellIndex = patternSequence[currentExpectedPatternIndex];
    let isCorrect = (clickedIndex === expectedCellIndex);
    let errorType = null;
    if (!isCorrect) {
      totalErrorsInLevel++;
      clickedCell.classList.add('incorrect');
      errorType = userClicks.length > patternSequence.length ? 'Perseveration' : 'IncorrectCell';
      recordGameData('RecallError', {
        clickedCell: clickedIndex,
        expectedCell: expectedCellIndex,
        clickOrder: userClicks.length,
        timeSinceRecallStart: currentTime - recallStartTime,
        timeSinceLastClick,
        errorType
      });
      setTimeout(() => {
        clickedCell.classList.remove('incorrect');
        statusDisplay.textContent = 'Incorrect! Try again from start.';
        userClicks = [];
        isRecalling = false;
        setTimeout(() => {
          if (isGameRunning && !isPaused) startLevel();
        }, 1500);
      }, 500);
      return;
    } else {
      clickedCell.classList.add('correct');
      recordGameData('RecallClick', {
        clickedCell: clickedIndex,
        expectedCell: expectedCellIndex,
        clickOrder: userClicks.length,
        timeSinceRecallStart: currentTime - recallStartTime,
        timeSinceLastClick,
        correct: true
      });
    }
    if (userClicks.length === patternSequence.length) {
      const recallEndTime = performance.now();
      recordGameData('LevelComplete', {
        pattern: patternSequence,
        userClicks,
        workingMemoryLoad: patternSequence.length,
        responseTime: recallEndTime - recallStartTime,
        errorRate: totalErrorsInLevel / patternSequence.length,
        totalClicksMade: totalClicksMadeInLevel
      });
      statusDisplay.textContent = 'Correct! Next Level...';
      isRecalling = false;
      setTimeout(() => {
        document.querySelectorAll('.grid-cell').forEach(cell => {
          cell.classList.remove('correct');
        });
        currentLevel++;
        levelDisplay.textContent = `${currentLevel} / ${MAX_LEVEL}`;
        if (isGameRunning && !isPaused) startLevel();
      }, 1000);
    }
  }

  function gameOver() {
    isGameRunning = false;
    isMemorizing = false;
    isRecalling = false;
    clearTimeout(flashPatternTimeout);
    flashPatternTimeout = null;
    gameArea.style.display = 'none';
    gameOverScreen.style.display = 'flex';
    recordGameData('GameOver', {
      finalLevelCompleted: MAX_LEVEL,
      totalGameDataEntries: gameData.length
    });
    console.log("Game Over! All data collected for this session:", gameData);
    saveGameSessionToFirestore(gameData);
  }

  function resetGame() {
    isGameRunning = false;
    isMemorizing = false;
    isRecalling = false;
    isPaused = false;
    currentLevel = 1;
    patternSequence = [];
    userClicks = [];
    gameData = [];
    clearTimeout(flashPatternTimeout);
    flashPatternTimeout = null;
    currentFlashIndex = 0;
    recallStartTime = 0;
    lastClickTime = 0;
    totalClicksMadeInLevel = 0;
    totalErrorsInLevel = 0;
    patternDisplayStartTime = 0;
    resumeGameTimestamp = 0;
    pausedOverlay.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameArea.style.display = 'block';
    startGameButton.textContent = 'Start Game';
    levelDisplay.textContent = `${currentLevel} / ${MAX_LEVEL}`;
    statusDisplay.textContent = 'Press Start';
    document.querySelectorAll('.grid-cell').forEach(cell => {
      cell.classList.remove('flashing', 'correct', 'incorrect');
    });
  }

  function enableInput() {
    // Placeholder for enabling UI if needed
  }

  // UI Controls
  startGameButton.addEventListener('click', () => {
    backgroundMusic.play();
    startGame();
  });

  generateGrid();
});

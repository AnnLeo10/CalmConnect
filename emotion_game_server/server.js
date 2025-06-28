// --- Step 1: Bring in the tools we installed ---
const express = require('express');             // For building the web server (our "Mailman")
const sqlite3 = require('sqlite3').verbose();   // For talking to the SQLite database (our "Storage Room")
const bodyParser = require('body-parser');      // To help us read data sent from the game
const cors = require('cors');                   // To allow cross-origin requests (important for frontend/backend communication)

// --- Step 2: Set up our Mailman (Express app) ---
const app = express();
const port = 3000; // This is the "door number" for our Mailman to listen on

// This tells our Mailman to understand data sent in JSON format
app.use(bodyParser.json());

// ✅ Allow requests from other origins
app.use(cors());

// --- Step 3: Connect to our Storage Room (SQLite Database) ---
const db = new sqlite3.Database('./game_data.db', (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
  } else {
    console.log('✅ Connected to the SQLite database.');

    // --- Step 4: Create the "Shelves" (Table) in our Storage Room ---
    db.run(`CREATE TABLE IF NOT EXISTS game_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number INTEGER,
      image_path TEXT,
      expected_emotion TEXT,
      selected_emotion TEXT,
      reaction_time REAL,
      timed_out BOOLEAN,
      is_correct BOOLEAN,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (createErr) => {
      if (createErr) {
        console.error('❌ Error creating table:', createErr.message);
      } else {
        console.log('✅ game_rounds table checked/created.');
      }
    });
  }
});

// --- Step 5: Define a "Receiving Desk" for the Mailman ---
app.post('/save-game-data', (req, res) => {
  const roundData = req.body;

  if (!roundData) {
    return res.status(400).json({ message: '❌ No data provided.' });
  }

  const {
    round,
    image,
    expectedEmotion,
    selectedEmotion,
    reactionTime,
    timedOut,
    isCorrect
  } = roundData;

  const sql = `
    INSERT INTO game_rounds 
    (round_number, image_path, expected_emotion, selected_emotion, reaction_time, timed_out, is_correct)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.run(
    sql,
    [round, image, expectedEmotion, selectedEmotion, reactionTime, timedOut, isCorrect],
    function (err) {
      if (err) {
        console.error('❌ Error inserting data:', err.message);
        return res.status(500).json({ message: 'Failed to save data.', error: err.message });
      }
      console.log(`✅ A new record has been inserted with ID: ${this.lastID}`);
      res.status(200).json({ message: 'Data saved successfully!', id: this.lastID });
    }
  );
});

// --- Step 7: Start the Mailman Listening for incoming requests ---
app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
  console.log(`🕹️ Ready to receive game data!`);
});


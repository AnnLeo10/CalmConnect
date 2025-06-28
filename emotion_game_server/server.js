// --- Step 1: Bring in the tools we installed ---
const express = require('express');        // For building the web server (our "Mailman")
const sqlite3 = require('sqlite3').verbose(); // For talking to the SQLite database (our "Storage Room")
const bodyParser = require('body-parser'); // To help us read data sent from the game

// --- Step 2: Set up our Mailman (Express app) ---
const app = express();
const port = 3000; // This is the "door number" for our Mailman to listen on

// This tells our Mailman to understand data sent in JSON format
app.use(bodyParser.json());

// --- Step 3: Connect to our Storage Room (SQLite Database) ---
// It will create 'game_data.db' file if it doesn't exist.
const db = new sqlite3.Database('./game_data.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // --- Step 4: Create the "Shelves" (Table) in our Storage Room ---
    // This SQL command creates a table named 'game_rounds' if it doesn't already exist.
    db.run(`CREATE TABLE IF NOT EXISTS game_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,    // A unique ID for each piece of data, automatically increases
      round_number INTEGER,                    // The round number from your game
      image_path TEXT,                         // The path/name of the image shown
      expected_emotion TEXT,                   // The correct emotion for that image
      selected_emotion TEXT,                   // The emotion the player picked
      reaction_time REAL,                      // How fast the player reacted (can have decimals)
      timed_out BOOLEAN,                       // TRUE if the player ran out of time, FALSE otherwise
      is_correct BOOLEAN,                      // TRUE if the player's choice was correct, FALSE otherwise
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP // Automatically records when this data was saved
    )`, (createErr) => {
      if (createErr) {
        console.error('Error creating table:', createErr.message);
      } else {
        console.log('Game_rounds table checked/created.');
      }
    });
  }
});

// --- Step 5: Define a "Receiving Desk" for the Mailman ---
// This tells the Mailman: "When someone sends a POST request to '/save-game-data'..."
app.post('/save-game-data', (req, res) => {
  const roundData = req.body; // The data sent from your game will be here

  // A quick check to make sure we actually received data
  if (!roundData) {
    return res.status(400).json({ message: 'No data provided.' });
  }

  // Extract individual pieces of data from the received object
  const {
    round,
    image,
    expectedEmotion,
    selectedEmotion,
    reactionTime,
    timedOut,
    isCorrect
  } = roundData;

  // --- Step 6: Prepare the Data to be Stored in the Storage Room ---
  // This is the SQL command to insert data into our table.
  // The '?' are placeholders to securely put your data into the database.
  const sql = `INSERT INTO game_rounds (round_number, image_path, expected_emotion, selected_emotion, reaction_time, timed_out, is_correct)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;

  // Execute the SQL command with your data
  db.run(
    sql,
    [round, image, expectedEmotion, selectedEmotion, reactionTime, timedOut, isCorrect],
    function(err) { // Use 'function' keyword here for 'this.lastID' to work correctly
      if (err) {
        console.error('Error inserting data:', err.message);
        // Tell the sender (your game) that there was an error
        return res.status(500).json({ message: 'Failed to save data.', error: err.message });
      }
      console.log(`A new record has been inserted with ID: ${this.lastID}`);
      // Tell the sender (your game) that the data was saved successfully
      res.status(200).json({ message: 'Data saved successfully!', id: this.lastID });
    }
  );
});

// --- Step 7: Start the Mailman Listening for incoming requests ---
app.listen(port, () => {
  console.log(`Mailman (server) listening at http://localhost:${port}`);
  console.log(`Open your game in a browser and it will send data here.`);
});
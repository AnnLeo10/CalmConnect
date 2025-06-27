// script.js (for the main dashboard/landing page)

document.addEventListener('DOMContentLoaded', () => {
    // Dark Mode Toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'enabled') {
        body.classList.add('dark-mode');
    }

    // Toggle dark mode on click
    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', 'disabled');
        }
    });

    // Start Assessment Button
    const startAssessmentButton = document.getElementById('startAssessmentButton');
    if (startAssessmentButton) {
        startAssessmentButton.addEventListener('click', () => {
            localStorage.clear(); // Clear any previous assessment data
            window.location.href = ' qhomepage.html '; // Navigate to the first game
        });
    }
});



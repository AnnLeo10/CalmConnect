document.addEventListener('DOMContentLoaded', () => {
    // This script can be used for future features like:
    // 1. Adding a click event listener to the buttons to track clicks.
    // 2. Dynamically loading content into the cards based on user location.
    // 3. Implementing a subtle animation on button clicks.

    console.log("Find Support page loaded. The user can choose between specialists and social services.");

    // Example of a simple event listener (not strictly needed since HTML links work, but good practice for interaction)
    const specialistBtn = document.querySelector('.specialists-card .btn');
    const ngoBtn = document.querySelector('.social-services-card .btn');

    specialistBtn.addEventListener('click', () => {
        console.log('User clicked "Find a Therapist". Redirecting to specialist contacts page.');
    });

    ngoBtn.addEventListener('click', () => {
        console.log('User clicked "Explore Services". Redirecting to NGO services page.');
    });
});
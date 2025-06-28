document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const submitButton = document.querySelector('.submit-btn');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent the default form submission

        // Show loading state on the button
        submitButton.classList.add('loading');
        submitButton.disabled = true;

        // Simulate a form submission delay (e.g., verifying credentials on a server)
        setTimeout(() => {
            // Remove loading state and show success state
            submitButton.classList.remove('loading');
            submitButton.classList.add('success');
            
            // Log success message and form data (for development)
            console.log('Login successful!');
            const formData = new FormData(loginForm);
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }

            // After a short delay, redirect the user to the dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html'; // Redirect to the dashboard page
            }, 1500); // Wait 1.5 seconds after the success animation
            
        }, 2500); // Simulates a 2.5-second network request
    });
});
document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    const submitButton = document.querySelector('.submit-btn');

    registrationForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent the default form submission

        // Show loading state on the button
        submitButton.classList.add('loading');
        submitButton.disabled = true;

        // Simulate a form submission delay (e.g., sending data to a server)
        setTimeout(() => {
            // Remove loading state and show success state
            submitButton.classList.remove('loading');
            submitButton.classList.add('success');
            
            // Log success message and form data (for development)
            console.log('Registration successful!');
            const formData = new FormData(registrationForm);
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }

            // After a short delay, redirect the user to the next page
            setTimeout(() => {
                window.location.href = 'intro.html'; // Redirect to the next page
            }, 1500); // Wait 1.5 seconds after the success animation
            
        }, 2500); // Simulates a 2.5-second network request
    });
});
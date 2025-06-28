document.addEventListener('DOMContentLoaded', () => {
    const passwordResetForm = document.getElementById('passwordResetForm');
    const submitButton = document.querySelector('.submit-btn');

    passwordResetForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent the default form submission

        // Show loading state on the button
        submitButton.classList.add('loading');
        submitButton.disabled = true;

        // Simulate a form submission delay (e.g., sending an email)
        setTimeout(() => {
            // Remove loading state and show success state
            submitButton.classList.remove('loading');
            submitButton.classList.add('success');
            
            console.log('Password reset link sent!');
            const formData = new FormData(passwordResetForm);
            console.log(`Email submitted: ${formData.get('email')}`);

            // After a short delay, redirect the user to a confirmation page
            setTimeout(() => {
                window.location.href = 'confirmation-page.html'; // Redirect to a confirmation page
            }, 1500); // Wait 1.5 seconds after the success animation
            
        }, 2500); // Simulates a 2.5-second network request
    });
});
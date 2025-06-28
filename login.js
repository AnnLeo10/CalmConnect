// This is your existing login.js content. Modify the fetch URL.

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const submitButton = document.querySelector('.submit-btn');
    const btnText = submitButton.querySelector('.btn-text'); // Get the span for the text

    loginForm.addEventListener('submit', async (e) => { // Added 'async' keyword
        e.preventDefault(); // Prevent the default form submission

        // Get form data
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Show loading state on the button
        submitButton.classList.add('loading');
        submitButton.disabled = true;
        btnText.textContent = ''; // Clear the text content to show spinner

        try {
            // Send login request to the backend
            // *** IMPORTANT: Ensure this URL matches your backend server's address and port ***
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json(); // Parse the JSON response from the backend

            if (response.ok && result.success) { // Check both response.ok (for 2xx status) and backend's success flag
                // Remove loading state and show success state
                submitButton.classList.remove('loading');
                submitButton.classList.add('success');
                // The checkmark will appear due to CSS
                console.log('Login successful!', result.message);

                // After a short delay, redirect the user to the dashboard
                setTimeout(() => {
                    // Use the redirectUrl provided by the backend, or default to 'dashboard.html'
                    window.location.href = result.redirectUrl || 'dashboard.html';
                }, 1500); // Wait 1.5 seconds after the success animation

            } else {
                // Handle login failure (e.g., 401 Unauthorized, or backend's success: false)
                submitButton.classList.remove('loading');
                submitButton.classList.remove('success'); // Ensure success class is removed
                submitButton.disabled = false; // Re-enable the button
                btnText.textContent = 'Log In'; // Restore button text

                // Display error message from backend or a generic one
                alert(`Login failed: ${result.message || 'Invalid credentials.'}`);
                console.error('Login failed:', result.message || 'Unknown error');
            }

        } catch (error) {
            // Handle network errors (e.g., server not reachable)
            submitButton.classList.remove('loading');
            submitButton.classList.remove('success'); // Ensure success class is removed
            submitButton.disabled = false; // Re-enable the button
            btnText.textContent = 'Log In'; // Restore button text

            alert('An error occurred during login. Please try again.');
            console.error('Network or server error:', error);
        }
    });
});

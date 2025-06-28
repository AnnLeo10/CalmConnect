document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    // Check for user's preferred theme on load
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
        body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }

    darkModeToggle.addEventListener('change', () => {
        body.classList.toggle('dark-mode');
        // Store the user's theme preference
        localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    // Optional: Subtle animation on the intro paragraph on load
    const introParagraph = document.querySelector('.intro-paragraph');
    if (introParagraph) {
        introParagraph.style.opacity = 0;
        setTimeout(() => {
            introParagraph.style.transition = 'opacity 1s ease-in-out';
            introParagraph.style.opacity = 1;
        }, 500); // Slight delay
    }
});
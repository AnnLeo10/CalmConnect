document.addEventListener('DOMContentLoaded', () => {

    // --- Simulated AI Result Data ---
    // In a real application, this data would come from your AI model's API.
    // We'll use a hardcoded object to demonstrate the functionality.
    const userAssessmentResult = {
        symptom: 'Anxiety', // e.g., 'Anxiety', 'Depression', 'Stress'
        reportText: `Based on your responses, you show signs of moderate anxiety. This can manifest as persistent worry, restlessness, and physical symptoms like a racing heart or muscle tension. It's important to remember that these feelings are valid and manageable. Many people experience similar symptoms, and with the right tools and support, you can learn to navigate them effectively.`,
        statistics: {
            // Stats about Anxiety for context (using real-world data from India)
            // Data from sources like WHO, National Mental Health Survey of India 2015-16, etc.
            stat1: { number: '13%', label: 'of Indians suffer from mental health issues (WHO, 2017)' },
            stat2: { number: '40%', label: 'of those with anxiety receive help (MHF)' },
            stat3: { number: '75%', label: 'of people feel isolated (Study)' }
        },
        resourcesLink: 'resources.html', // Placeholder
        specialistLink: 'videocall.html' // Link to your specialist page
    };

    // --- Dynamic Content Population ---
    const symptomResultEl = document.getElementById('symptom-result-text');
    const stat1NumberEl = document.getElementById('stat-1-number');
    const stat1LabelEl = document.getElementById('stat-1-label');
    const stat2NumberEl = document.getElementById('stat-2-number');
    const stat2LabelEl = document.getElementById('stat-2-label');
    const stat3NumberEl = document.getElementById('stat-3-number');
    const stat3LabelEl = document.getElementById('stat-3-label');
    const resourcesBtn = document.getElementById('resources-btn');
    const specialistBtn = document.querySelector('.action-card a[href="specialist-contacts.html"]');
    const chatbotBtn = document.getElementById('open-chatbot-btn');

    // Set the AI report text
    symptomResultEl.textContent = userAssessmentResult.reportText;

    // Set the statistics
    stat1NumberEl.textContent = userAssessmentResult.statistics.stat1.number;
    stat1LabelEl.textContent = userAssessmentResult.statistics.stat1.label;
    stat2NumberEl.textContent = userAssessmentResult.statistics.stat2.number;
    stat2LabelEl.textContent = userAssessmentResult.statistics.stat2.label;
    stat3NumberEl.textContent = userAssessmentResult.statistics.stat3.number;
    stat3LabelEl.textContent = userAssessmentResult.statistics.stat3.label;

    // Update button links
    resourcesBtn.href = userAssessmentResult.resourcesLink;
    specialistBtn.href = userAssessmentResult.specialistLink;

    // --- Event Listeners for Actions ---
    chatbotBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Here you would open a chatbot widget or redirect to a chatbot page.
        // For now, we'll use a friendly alert.
        alert('Launching your personal support chatbot! 💬');
        // Example: window.location.href = 'chatbot.html';
    });
    
    // --- Scroll Reveal Animation for Statistics ---
    const scrollElements = document.querySelectorAll('.scroll-reveal');

    const elementInView = (el, dividend = 1) => {
        const elementTop = el.getBoundingClientRect().top;
        return (
            elementTop <= (window.innerHeight || document.documentElement.clientHeight) / dividend
        );
    };

    const displayScrollElement = (element) => {
        element.classList.add('is-visible');
    };

    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 1.25)) { // Adjust dividend to control when animation triggers
                displayScrollElement(el);
            }
        });
    };

    // Initial check on load and on scroll
    handleScrollAnimation();
    window.addEventListener('scroll', handleScrollAnimation);
});
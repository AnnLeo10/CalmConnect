document.addEventListener('DOMContentLoaded', () => {

    // --- Navigation Bar Scroll Effect ---
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- Smooth Scrolling for Navigation Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            // Check if the link is an internal anchor link on the same page
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                const navLinks = document.querySelector('.nav-links');
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    document.querySelector('.menu-toggle i').classList.remove('fa-times');
                    document.querySelector('.menu-toggle i').classList.add('fa-bars');
                }
            }
            // If it's not an anchor link (e.g., "register.html"), let the default behavior happen
        });
    });

    // --- Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const menuIcon = menuToggle.querySelector('i');

    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        if (navLinks.classList.contains('active')) {
            menuIcon.classList.remove('fa-bars');
            menuIcon.classList.add('fa-times'); // Change to 'X' icon
        } else {
            menuIcon.classList.remove('fa-times');
            menuIcon.classList.add('fa-bars'); // Change back to hamburger icon
        }
    });

    // --- Active Nav Link on Scroll ---
    // This part is only relevant for the index.html page, but we keep it here as it doesn't cause issues on other pages.
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= sectionTop - sectionHeight / 3) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            // Check if the href points to a section on the same page
            if (item.getAttribute('href').includes(current) && item.getAttribute('href').startsWith('#')) {
                item.classList.add('active');
            }
        });
    });

    // --- Scroll Reveal Animation ---
    const scrollElements = document.querySelectorAll('.scroll-reveal, .section-title');

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
            if (elementInView(el, 1.25)) {
                displayScrollElement(el);
            }
        });
    };

    // Initial check on load
    handleScrollAnimation();

    // Add scroll event listener
    window.addEventListener('scroll', () => {
        handleScrollAnimation();
    });

});
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Initialize Visual Animations (AOS & Typed.js) ---
    
    // Initialize Scroll Animations
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true,
            offset: 100
        });
    }

    // Initialize Typing Effect
    if(document.getElementById('typing-text')) {
        new Typed('#typing-text', {
            strings: ['Web Developer', 'Data Analyst', 'Tech Enthusiast'],
            typeSpeed: 50,
            backSpeed: 30,
            backDelay: 2000,
            loop: true
        });
    }

    // --- 2. Mobile Menu Toggle (Responsive Logic) ---
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if(hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            // Toggle 'active' class for CSS transition (Best for Glassmorphism)
            navLinks.classList.toggle('active');
            
            // Animation for Hamburger Icon
            hamburger.classList.toggle('toggle');
        });

        // Close menu when clicking a link
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburger.classList.remove('toggle');
            });
        });
    }

    // --- 3. Form Submission Handling (Connected to MongoDB) ---
    const form = document.getElementById('contactForm');
    
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Page reload rokne ke liye
            
            // Submit Button par "Sending..." dikhana
            const btn = form.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Sending... <i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            // Get values
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;

            // Create data object
            const formData = { name, email, message };

            try {
                // Send data to backend using Fetch API
                const response = await fetch('/send-message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('✅ Message Sent Successfully!');
                    form.reset(); // Form clear karein
                } else {
                    alert('❌ Error: ' + (result.message || 'Failed to send message'));
                }

            } catch (error) {
                console.error('Error:', error);
                alert('❌ Server Error! Make sure Node.js is running.');
            } finally {
                // Button wapas normal karna
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
    /* ---------------------------------------------------
   ADVANCED PROTECTION: ANTI-DEBUG & KEY BLOCKER
--------------------------------------------------- */

(function() {
    // 1. Strict Mode On
    'use strict';

    // 2. Disable Right Click & Keys
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    document.addEventListener('keydown', e => {
        if (e.key === 'F12' || 
            (e.ctrlKey && ['u', 's', 'a', 'c', 'x', 'p', 'j', 'k', 'i'].includes(e.key.toLowerCase())) ||
            (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))) {
            e.preventDefault();
            return false;
        }
    });

    // 3. Prevent Content Selection
    document.addEventListener('selectstart', e => e.preventDefault());

    // 4. ANTI-DEBUGGER (Hacker Trap)
    // Jaise hi koi Inspect Element kholega, ye loop browser ko rok dega
    function detector() {
        const start = new Date().getTime();
        debugger; // Ye line DevTools khule hone par breakpoint trigger karegi
        const end = new Date().getTime();
        
        // Agar debugger hit hua, toh time diff badh jayega
        if (end - start > 100) {
            document.body.innerHTML = '<h1 style="color:red; text-align:center; margin-top:20%">Access Denied! Close DevTools.</h1>';
            window.location.reload(); // Page reload kar dega
        }
    }
    
    // Check every 1 second
    setInterval(detector, 1000);

    // 5. Console Warning Clear
    // Agar koi console kholta bhi hai, toh purana data clear ho jayega
    setInterval(() => {
        console.clear();
        console.log("%cSecurity Alert: This site is protected.", "color: red; font-size: 20px; font-weight: bold;");
    }, 2000);

})();
});
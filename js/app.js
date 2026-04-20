document.addEventListener('DOMContentLoaded', () => {
    // Dynamic Time Greeting
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    
    const greetingEl = document.getElementById('time-greeting');
    if (greetingEl) greetingEl.textContent = greeting;

    // Bottom Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            document.querySelector('.nav-item.active').classList.remove('active');
            item.classList.add('active');
            
            // We will add the fetch() routing for search/library in the next step
            const tab = item.getAttribute('data-tab');
            console.log(`Navigating to: ${tab}`); 
        });
    });
});

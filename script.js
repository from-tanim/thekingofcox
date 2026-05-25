let calendar = null;
let bookings = [];


// Preloader
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        // Animate progress
        let progress = 0;
        const progressFill = document.querySelector('.progress-fill');
        const percentageText = document.querySelector('.loading-percentage');
        
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            if (progressFill) progressFill.style.width = progress + '%';
            if (percentageText) percentageText.textContent = Math.floor(progress) + '%';
        }, 200);
        
        // Ensure minimum display time
        setTimeout(() => {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }, 1500);
    }
});

// PWA Installation
let deferredPrompt;
const installPrompt = document.getElementById('install-prompt');
const installBtn = document.getElementById('install-btn');
const closeInstall = document.getElementById('close-install');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install prompt
    if (installPrompt) {
        installPrompt.style.display = 'block';
    }
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        // Hide the install prompt
        if (installPrompt) installPrompt.style.display = 'none';
        // Show the install prompt
        if (deferredPrompt) {
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // Clear the deferred prompt
            deferredPrompt = null;
        }
    });
}

if (closeInstall) {
    closeInstall.addEventListener('click', () => {
        if (installPrompt) installPrompt.style.display = 'none';
    });
}

// Check if app is installed
window.addEventListener('appinstalled', (evt) => {
    console.log('App installed successfully');
    if (installPrompt) installPrompt.style.display = 'none';
});

// Handle URL parameters for direct navigation
const urlParams = new URLSearchParams(window.location.search);
const focus = urlParams.get('focus');
if (focus === 'calendar') {
    document.querySelector('[data-page="calendar"]').click();
} else if (focus === 'contact') {
    document.querySelector('[data-page="contact"]').click();
}



// Track mouse for cursor glow
document.addEventListener('mousemove', (e) => {
    const glow = document.querySelector('.cursor-glow');
    if (glow) {
        glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }
});

// Main function to load bookings from JSON file
async function loadBookingsFromJSON() {
    try {
        // Try multiple possible paths for GitHub Pages
        let response = null;
        const paths = [
            'data/bookings.json',
            './data/bookings.json',
            '/data/bookings.json',
            'bookings.json',
            './bookings.json'
        ];
        
        for (const path of paths) {
            try {
                response = await fetch(path + '?t=' + new Date().getTime(), {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                if (response.ok) {
                    console.log(`Successfully loaded from: ${path}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!response || !response.ok) {
            console.warn('Bookings JSON file not found, using demo data');
            loadDemoBookings();
            return;
        }
        
        const data = await response.json();
        
        if (data && data.bookings && Array.isArray(data.bookings)) {
            bookings = data.bookings;
            console.log(`Loaded ${bookings.length} bookings from JSON`);
            updateLastUpdated(data.lastUpdated);
            refreshCalendar();
        } else {
            console.warn('Invalid JSON format, using demo data');
            loadDemoBookings();
        }
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        loadDemoBookings();
    }
}

// Demo data function
function loadDemoBookings() {
    console.log('Loading demo booking data');
    bookings = [
        { date: getFormattedDate(0), shift: 'day', bookedBy: 'ABC Corp', eventType: 'Annual Conference' },
        { date: getFormattedDate(1), shift: 'night', bookedBy: 'XYZ Events', eventType: 'Gala Dinner' },
        { date: getFormattedDate(2), shift: 'day', bookedBy: 'Tech Solutions', eventType: 'Product Launch' },
        { date: getFormattedDate(3), shift: 'day', bookedBy: 'Rotary Club', eventType: 'Charity Event' },
        { date: getFormattedDate(4), shift: 'night', bookedBy: 'Smith Wedding', eventType: 'Reception' },
        { date: getFormattedDate(5), shift: 'day', bookedBy: 'Business Forum', eventType: 'Networking' },
        { date: getFormattedDate(7), shift: 'night', bookedBy: 'Christmas Gala', eventType: 'Celebration' },
        { date: getFormattedDate(10), shift: 'day', bookedBy: 'Tech Summit 2024', eventType: 'Conference' },
        { date: getFormattedDate(12), shift: 'night', bookedBy: 'New Year Celebration', eventType: 'Party' }
    ];
    updateLastUpdated(new Date().toISOString());
    refreshCalendar();
}

// Helper function to get formatted dates for demo
function getFormattedDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
}

// Update the last updated timestamp
function updateLastUpdated(timestamp) {
    const updatedSpan = document.getElementById('last-updated');
    if (updatedSpan) {
        if (timestamp) {
            const date = new Date(timestamp);
            updatedSpan.textContent = date.toLocaleString();
        } else {
            const now = new Date();
            updatedSpan.textContent = now.toLocaleString();
        }
    }
}

// Refresh calendar display
function refreshCalendar() {
    if (calendar) {
        calendar.refetchEvents();
        // Add a subtle refresh animation
        const calendarEl = document.getElementById('calendar');
        if (calendarEl) {
            calendarEl.style.animation = 'none';
            setTimeout(() => {
                calendarEl.style.animation = 'fadeInUp 0.3s ease';
            }, 10);
        }
    }
}

// Get events for FullCalendar
function getCalendarEvents() {
    const events = [];
    
    bookings.forEach(booking => {
        const isDayShift = booking.shift === 'day' || booking.shift === 'Day';
        // Create title with emoji and short name
        const title = `${isDayShift ? '🌞' : '🌙'} ${booking.bookedBy.substring(0, 25)}`;
        
        events.push({
            title: title,
            start: booking.date,
            allDay: true,
            backgroundColor: isDayShift ? '#ff9800' : '#2196f3',
            borderColor: isDayShift ? '#ff9800' : '#2196f3',
            textColor: 'white',
            extendedProps: {
                bookedBy: booking.bookedBy,
                shift: isDayShift ? 'day' : 'night',
                eventType: booking.eventType,
                date: booking.date
            }
        });
    });
    
    console.log(`Generated ${events.length} calendar events`);
    return events;
}

// Initialize FullCalendar
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
        console.error('Calendar element not found');
        return;
    }
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
        },
        events: getCalendarEvents(),
        eventClick: function(info) {
            const props = info.event.extendedProps;
            showBookingDetails(props, info.event.startStr);
        },
        eventDidMount: function(info) {
            // Add tooltip on hover
            const props = info.event.extendedProps;
            info.el.setAttribute('title', `${props.bookedBy} - ${props.eventType}`);
            
            // Add a subtle animation when event mounts
            info.el.style.animation = 'slideUp 0.3s ease';
        },
        height: 'auto',
        themeSystem: 'standard',
        dayMaxEvents: 3,
        weekends: true,
        eventDisplay: 'block',
        eventTimeFormat: {
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
        },
        buttonText: {
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day'
        },
        dayCellDidMount: function(info) {
            // Add hover effect to day cells
            info.el.style.transition = 'all 0.3s ease';
        }
    });
    
    calendar.render();
    console.log('Calendar initialized successfully');
}

// Show stylish booking details modal
function showBookingDetails(props, date) {
    const shiftIcon = props.shift === 'day' ? '🌞' : '🌙';
    const shiftName = props.shift === 'day' ? 'Day Shift (8AM - 8PM)' : 'Night Shift (8PM - 8AM)';
    const shiftColor = props.shift === 'day' ? '#ff9800' : '#2196f3';
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Create a custom modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        backdrop-filter: blur(20px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1e2a3a, #0f172a);
            padding: 2rem;
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            border: 2px solid ${shiftColor};
            animation: slideUp 0.3s ease;
            cursor: default;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            position: relative;
        ">
            <button onclick="this.closest('div').parentElement.remove()" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(255,255,255,0.1);
                border: none;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                color: white;
                font-size: 1.2rem;
                transition: all 0.3s;
            " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">×</button>
            
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 4rem;">${shiftIcon}</div>
                <h2 style="color: ${shiftColor}; margin-top: 0.5rem; font-size: 1.5rem;">
                    <i class="fas fa-calendar-check"></i> Booking Details
                </h2>
            </div>
            
            <div style="margin: 1.5rem 0; line-height: 2;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0.75rem 0;">
                    <strong style="font-size: 1rem;">📅 Date:</strong> 
                    <span style="color: #fff;">${formattedDate}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0.75rem 0;">
                    <strong style="font-size: 1rem;">${shiftIcon} Shift:</strong> 
                    <span style="color: ${shiftColor}; font-weight: bold;">${shiftName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0.75rem 0;">
                    <strong style="font-size: 1rem;">👤 Booked By:</strong> 
                    <span style="color: #d4af37;">${props.bookedBy}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0.75rem 0;">
                    <strong style="font-size: 1rem;">🎉 Event Type:</strong> 
                    <span style="color: #d4af37;">${props.eventType}</span>
                </div>
            </div>
            
            <button onclick="this.closest('div').parentElement.remove()" style="
                background: linear-gradient(135deg, ${shiftColor}, ${props.shift === 'day' ? '#cc7a00' : '#0056b3'});
                border: none;
                padding: 12px 24px;
                border-radius: 10px;
                cursor: pointer;
                width: 100%;
                font-weight: 600;
                font-size: 1rem;
                transition: transform 0.2s, box-shadow 0.2s;
                color: white;
                margin-top: 0.5rem;
            " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 5px 20px rgba(0,0,0,0.3)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Manual refresh function
async function manualRefresh() {
    const refreshBtn = document.getElementById('refresh-calendar');
    if (!refreshBtn) return;
    
    const originalHTML = refreshBtn.innerHTML;
    
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    await loadBookingsFromJSON();
    
    setTimeout(() => {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalHTML;
        
        // Show success feedback
        const originalBg = refreshBtn.style.background;
        refreshBtn.style.background = '#4caf50';
        setTimeout(() => {
            refreshBtn.style.background = originalBg;
        }, 1000);
    }, 500);
}

// Auto-refresh every 60 seconds
function startAutoRefresh() {
    setInterval(async () => {
        console.log('Auto-refreshing calendar at:', new Date().toLocaleTimeString());
        await loadBookingsFromJSON();
    }, 60000); // Refresh every 60 seconds
}

// Navigation setup
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = btn.dataset.page;
            
            // Update active button
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show active page
            pages.forEach(page => page.classList.remove('active'));
            const targetPage = document.getElementById(`${pageId}-page`);
            if (targetPage) {
                targetPage.classList.add('active');
            }
            
            // Refresh calendar when switching to calendar view
            if (pageId === 'calendar' && calendar) {
                setTimeout(() => {
                    calendar.updateSize();
                    calendar.refetchEvents();
                }, 100);
            }
        });
    });
}

// Contact form setup
function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const btn = form.querySelector('.submit-btn');
        const originalHTML = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        btn.disabled = true;
        
        // Simulate sending (replace with actual API call)
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-check"></i> Message Sent Successfully!';
            btn.style.background = '#4caf50';
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
                btn.disabled = false;
                form.reset();
                
                // Show success message
                showNotification('Message sent successfully! We will contact you soon.', 'success');
            }, 2000);
        }, 1000);
    });
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        z-index: 10001;
        animation: slideUp 0.3s ease;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        font-weight: 500;
    `;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeIn 0.3s reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations to document
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .fa-spin {
        animation: spin 1s linear infinite;
    }
    
    /* Calendar event hover effect */
    .fc-event {
        transition: transform 0.2s, filter 0.2s !important;
        cursor: pointer !important;
    }
    
    .fc-event:hover {
        transform: scale(1.02) !important;
        filter: brightness(1.1) !important;
    }
    
    /* Day cell hover effect */
    .fc-daygrid-day {
        transition: background 0.3s ease !important;
    }
    
    .fc-daygrid-day:hover {
        background: rgba(212, 175, 55, 0.1) !important;
    }
`;
document.head.appendChild(style);

// Initialize everything when DOM is ready
async function init() {
    console.log('Initializing King of Cox Convention Hall website...');
    setupNavigation();
    setupContactForm();
    await loadBookingsFromJSON();
    initCalendar();
    startAutoRefresh();
}

// Start the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

let calendar = null;
let bookings = [];

// Load bookings from local file via Electron API
async function loadBookingsFromFile() {
    try {
        if (window.api) {
            const data = await window.api.readBookings();
            if (data && data.bookings && Array.isArray(data.bookings)) {
                bookings = data.bookings;
                console.log(`Loaded ${bookings.length} bookings from local file`);
                updateLastUpdated(data.lastUpdated);
                refreshCalendar();
            } else {
                console.warn('No bookings found, using demo data');
                loadDemoBookings();
            }
        } else {
            console.warn('Electron API not available, using demo data');
            loadDemoBookings();
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        loadDemoBookings();
    }
}

// Save bookings to local file
async function saveBookingsToFile() {
    if (window.api) {
        const result = await window.api.writeBookings(bookings);
        if (result.success) {
            console.log('Bookings saved successfully');
            updateLastUpdated(new Date().toISOString());
            showNotification('Bookings saved successfully!', 'success');
        } else {
            console.error('Failed to save bookings:', result.error);
            showNotification('Failed to save bookings!', 'error');
        }
    }
}

// Add new booking
function addNewBooking(bookingData) {
    bookings.push(bookingData);
    saveBookingsToFile();
    refreshCalendar();
    showNotification('Booking added successfully!', 'success');
}

// Delete booking
function deleteBooking(date, shift) {
    const index = bookings.findIndex(b => b.date === date && b.shift === shift);
    if (index !== -1) {
        bookings.splice(index, 1);
        saveBookingsToFile();
        refreshCalendar();
        showNotification('Booking deleted successfully!', 'success');
    }
}

// Update existing booking
function updateBooking(oldDate, oldShift, newBookingData) {
    const index = bookings.findIndex(b => b.date === oldDate && b.shift === oldShift);
    if (index !== -1) {
        bookings[index] = newBookingData;
        saveBookingsToFile();
        refreshCalendar();
        showNotification('Booking updated successfully!', 'success');
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
        { date: getFormattedDate(7), shift: 'night', bookedBy: 'Christmas Gala', eventType: 'Celebration' }
    ];
    updateLastUpdated(new Date().toISOString());
    refreshCalendar();
}

// Helper function to get formatted dates
function getFormattedDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
}

// Update last updated timestamp
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
        const title = `${isDayShift ? '🌞' : '🌙'} ${booking.bookedBy.substring(0, 25)}`;
        
        events.push({
            id: `${booking.date}-${booking.shift}`,
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
            showBookingDetailsModal(props, info.event.startStr);
        },
        eventDidMount: function(info) {
            const props = info.event.extendedProps;
            info.el.setAttribute('title', `${props.bookedBy} - ${props.eventType}`);
            info.el.style.animation = 'slideUp 0.3s ease';
        },
        height: 'auto',
        themeSystem: 'standard',
        dayMaxEvents: 3,
        weekends: true,
        eventDisplay: 'block',
        buttonText: {
            today: 'Today',
            month: 'Month',
            week: 'Week'
        }
    });
    
    calendar.render();
    console.log('Calendar initialized successfully');
}

// Show booking details with edit/delete options
function showBookingDetailsModal(props, date) {
    const shiftIcon = props.shift === 'day' ? '🌞' : '🌙';
    const shiftName = props.shift === 'day' ? 'Day Shift (8AM - 8PM)' : 'Night Shift (8PM - 8AM)';
    const shiftColor = props.shift === 'day' ? '#ff9800' : '#2196f3';
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
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
        ">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 4rem;">${shiftIcon}</div>
                <h2 style="color: ${shiftColor}; margin-top: 0.5rem;">Booking Details</h2>
            </div>
            
            <div style="margin: 1.5rem 0; line-height: 2;">
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <strong>📅 Date:</strong> <span>${formattedDate}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <strong>${shiftIcon} Shift:</strong> <span style="color: ${shiftColor}">${shiftName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <strong>👤 Booked By:</strong> <span style="color: #d4af37;">${props.bookedBy}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0;">
                    <strong>🎉 Event:</strong> <span style="color: #d4af37;">${props.eventType}</span>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button onclick="this.closest('div').parentElement.remove()" style="
                    flex: 1;
                    background: #4caf50;
                    border: none;
                    padding: 10px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 600;
                    color: white;
                ">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Add Booking Modal
function showAddBookingModal() {
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
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1e2a3a, #0f172a);
            padding: 2rem;
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            border: 2px solid #d4af37;
            animation: slideUp 0.3s ease;
        ">
            <h2 style="color: #d4af37; margin-bottom: 1.5rem; text-align: center;">
                <i class="fas fa-plus-circle"></i> Add New Booking
            </h2>
            
            <form id="add-booking-form">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #d4af37;">📅 Date:</label>
                    <input type="date" id="booking-date" required style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #d4af37;">⏰ Shift:</label>
                    <select id="booking-shift" required style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="day">🌞 Day Shift (8AM - 8PM)</option>
                        <option value="night">🌙 Night Shift (8PM - 8AM)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #d4af37;">👤 Booked By:</label>
                    <input type="text" id="booking-bookedby" placeholder="Customer/Organization Name" required style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #d4af37;">🎉 Event Type:</label>
                    <input type="text" id="booking-eventtype" placeholder="Wedding, Conference, Party, etc." required style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <button type="submit" style="
                        flex: 1;
                        background: linear-gradient(135deg, #d4af37, #b8960c);
                        border: none;
                        padding: 12px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 1rem;
                    ">Add Booking</button>
                    <button type="button" onclick="this.closest('div').parentElement.remove()" style="
                        flex: 1;
                        background: #666;
                        border: none;
                        padding: 12px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 1rem;
                        color: white;
                    ">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = modal.querySelector('#add-booking-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newBooking = {
            date: document.getElementById('booking-date').value,
            shift: document.getElementById('booking-shift').value,
            bookedBy: document.getElementById('booking-bookedby').value,
            eventType: document.getElementById('booking-eventtype').value
        };
        
        addNewBooking(newBooking);
        modal.remove();
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

// Manual refresh
async function manualRefresh() {
    const refreshBtn = document.getElementById('refresh-calendar');
    if (!refreshBtn) return;
    
    const originalHTML = refreshBtn.innerHTML;
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    await loadBookingsFromFile();
    
    setTimeout(() => {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalHTML;
        showNotification('Calendar refreshed!', 'success');
    }, 500);
}

// Setup navigation
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = btn.dataset.page;
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            pages.forEach(page => page.classList.remove('active'));
            const targetPage = document.getElementById(`${pageId}-page`);
            if (targetPage) targetPage.classList.add('active');
            if (pageId === 'calendar' && calendar) {
                setTimeout(() => {
                    calendar.updateSize();
                    calendar.refetchEvents();
                }, 100);
            }
        });
    });
}

// Setup contact form
function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        showNotification('Message sent! We will contact you soon.', 'success');
        form.reset();
    });
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N for new booking
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            showAddBookingModal();
        }
        // Ctrl/Cmd + R for refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            manualRefresh();
        }
    });
}

// Initialize app
async function init() {
    console.log('Initializing King of Cox Convention Hall Desktop App...');
    setupNavigation();
    setupContactForm();
    setupKeyboardShortcuts();
    await loadBookingsFromFile();
    initCalendar();
    
    // Setup Electron IPC listeners
    if (window.api) {
        window.api.onRefreshBookings(() => {
            manualRefresh();
        });
        
        window.api.onAddBooking(() => {
            showAddBookingModal();
        });
    }
    
    // Add "Add Booking" button to UI
    const addButton = document.createElement('button');
    addButton.innerHTML = '<i class="fas fa-plus"></i> Add Booking';
    addButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #d4af37, #b8960c);
        border: none;
        padding: 12px 20px;
        border-radius: 50px;
        cursor: pointer;
        font-weight: 600;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        transition: transform 0.2s;
    `;
    addButton.onmouseover = () => addButton.style.transform = 'scale(1.05)';
    addButton.onmouseout = () => addButton.style.transform = 'scale(1)';
    addButton.onclick = () => showAddBookingModal();
    document.body.appendChild(addButton);
}

// Start the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

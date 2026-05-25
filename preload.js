const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
    // Read bookings from file
    readBookings: () => ipcRenderer.invoke('read-bookings'),
    
    // Write bookings to file
    writeBookings: (bookings) => ipcRenderer.invoke('write-bookings', bookings),
    
    // Listen for refresh events
    onRefreshBookings: (callback) => {
        ipcRenderer.on('refresh-bookings', () => callback());
    },
    
    // Listen for add booking events
    onAddBooking: (callback) => {
        ipcRenderer.on('open-add-booking', () => callback());
    },
    
    // Remove listeners
    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('refresh-bookings');
        ipcRenderer.removeAllListeners('open-add-booking');
    }
});

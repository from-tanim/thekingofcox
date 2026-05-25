const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Initialize storage for settings
const store = new Store();

let mainWindow;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        title: 'King of Cox Convention Hall',
        frame: true,
        backgroundColor: '#0a0f1c'
    });

    // Load the index.html file
    mainWindow.loadFile('index.html');

    // Open DevTools in development (optional)
    // mainWindow.webContents.openDevTools();

    // Create application menu
    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Refresh Bookings',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.webContents.send('refresh-bookings');
                    }
                },
                {
                    label: 'Edit Bookings File',
                    click: () => {
                        openBookingsFile();
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Toggle Full Screen',
                    accelerator: 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        mainWindow.webContents.zoomFactor += 0.1;
                    }
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        mainWindow.webContents.zoomFactor -= 0.1;
                    }
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        mainWindow.webContents.zoomFactor = 1;
                    }
                }
            ]
        },
        {
            label: 'Bookings',
            submenu: [
                {
                    label: 'Add New Booking',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('open-add-booking');
                    }
                },
                {
                    label: 'Export Bookings',
                    click: () => {
                        exportBookings();
                    }
                },
                {
                    label: 'Import Bookings',
                    click: () => {
                        importBookings();
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About King of Cox Convention Hall',
                            message: 'King of Cox Convention Hall Desktop App',
                            detail: 'Version 1.0.0\n\nA complete booking management system for convention hall operations.\n\n© 2024 King of Cox Convention Hall',
                            buttons: ['OK']
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Open the bookings.json file in default editor
function openBookingsFile() {
    const filePath = path.join(__dirname, 'data', 'bookings.json');
    const { shell } = require('electron');
    shell.openPath(filePath);
}

// Export bookings to a JSON file
async function exportBookings() {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Bookings',
        defaultPath: `bookings_export_${new Date().toISOString().split('T')[0]}.json`,
        filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (!canceled && filePath) {
        const sourcePath = path.join(__dirname, 'data', 'bookings.json');
        fs.copyFileSync(sourcePath, filePath);
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Export Successful',
            message: `Bookings exported successfully to:\n${filePath}`,
            buttons: ['OK']
        });
    }
}

// Import bookings from a JSON file
async function importBookings() {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Bookings',
        filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    });

    if (!canceled && filePaths.length > 0) {
        const targetPath = path.join(__dirname, 'data', 'bookings.json');
        fs.copyFileSync(filePaths[0], targetPath);
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Import Successful',
            message: 'Bookings imported successfully! Refreshing calendar...',
            buttons: ['OK']
        });
        mainWindow.webContents.send('refresh-bookings');
    }
}

// IPC handlers for reading/writing bookings
ipcMain.handle('read-bookings', () => {
    try {
        const filePath = path.join(__dirname, 'data', 'bookings.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading bookings:', error);
        return { bookings: [] };
    }
});

ipcMain.handle('write-bookings', async (event, bookingsData) => {
    try {
        const filePath = path.join(__dirname, 'data', 'bookings.json');
        const data = {
            lastUpdated: new Date().toISOString(),
            version: "1.0",
            bookings: bookingsData
        };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Error writing bookings:', error);
        return { success: false, error: error.message };
    }
});

// App event handlers
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

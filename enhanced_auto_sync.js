
// Enhanced Aviation Warehouse Management System
// Automatic Google Sheets Integration

class AutomaticWarehouseManager extends WarehouseManager {

    constructor() {
        super();
        this.autoSyncEnabled = true;
        this.syncInterval = null;
        this.webhookUrl = null;
        this.setupAutomaticSync();
    }

    // Initialize automatic sync based on user preferences
    setupAutomaticSync() {
        const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');

        if (config.connected && config.autoSync) {
            this.startAutomaticSync(config.syncFrequency || 'hourly');
        }
    }

    // Start automatic synchronization
    startAutomaticSync(frequency = 'hourly') {
        console.log(`Starting automatic sync with frequency: ${frequency}`);

        // Clear any existing intervals
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        switch (frequency) {
            case 'realtime':
                this.setupRealtimeSync();
                break;
            case 'minute':
                this.syncInterval = setInterval(() => this.autoSyncData(), 60000); // 1 minute
                break;
            case 'hourly':
                this.syncInterval = setInterval(() => this.autoSyncData(), 3600000); // 1 hour
                break;
            case 'daily':
                this.syncInterval = setInterval(() => this.autoSyncData(), 86400000); // 24 hours
                break;
        }

        // Initial sync
        setTimeout(() => this.autoSyncData(), 5000);
    }

    // Setup real-time sync using webhooks or immediate triggers
    setupRealtimeSync() {
        console.log('Setting up real-time sync...');

        // Override data saving methods to trigger immediate sync
        const originalSaveData = this.saveData.bind(this);

        this.saveData = (data) => {
            originalSaveData(data);

            // Trigger immediate sync after data changes
            setTimeout(() => {
                console.log('Data changed - triggering automatic sync');
                this.autoSyncData();
            }, 1000); // Small delay to avoid too frequent syncs
        };
    }

    // Automatic sync function that runs without user intervention
    async autoSyncData() {
        const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');

        if (!config.connected || !config.autoSync) {
            console.log('Automatic sync is disabled');
            return;
        }

        try {
            console.log('🔄 Starting automatic sync to Google Sheets...');

            const data = this.getData();

            // Check if data has changed since last sync
            const dataHash = this.generateDataHash(data);
            if (dataHash === config.lastDataHash) {
                console.log('📊 No data changes detected, skipping sync');
                return;
            }

            // Proceed with sync
            const success = await this.syncToGoogleSheetsAPI(data);

            if (success) {
                // Update config with sync timestamp and data hash
                config.lastSync = new Date().toISOString();
                config.lastDataHash = dataHash;
                config.syncCount = (config.syncCount || 0) + 1;

                localStorage.setItem('google_sheets_config', JSON.stringify(config));

                console.log('✅ Automatic sync completed successfully');
                this.showNotification('Data automatically synced to Google Sheets', 'success');

                // Update sync status in UI
                this.updateSyncStatus('success', new Date());

            } else {
                console.error('❌ Automatic sync failed');
                this.showNotification('Automatic sync failed - will retry next cycle', 'warning');
                this.updateSyncStatus('error', new Date());
            }

        } catch (error) {
            console.error('Auto-sync error:', error);
            this.showNotification(`Auto-sync error: ${error.message}`, 'error');
            this.updateSyncStatus('error', new Date());
        }
    }

    // Generate a hash of the data to detect changes
    generateDataHash(data) {
        const dataString = JSON.stringify({
            materialsCount: data.materials.length,
            racksCount: data.racks.length,
            placementsCount: data.placements.length,
            lastMaterial: data.materials[data.materials.length - 1]?.timestamp || null,
            lastRack: data.racks[data.racks.length - 1]?.timestamp || null,
            lastPlacement: data.placements[data.placements.length - 1]?.timestamp || null
        });

        // Simple hash function
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    // Enhanced sync method using Google Sheets API
    async syncToGoogleSheetsAPI(data) {
        const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');

        if (!config.sheetId) {
            throw new Error('Sheet ID not configured');
        }

        try {
            // Prepare data for Google Sheets API
            const sheetsData = this.prepareDataForSheetsAPI(data);

            // Method 1: Use Google Apps Script Web App (Recommended)
            if (config.webAppUrl) {
                return await this.syncViaWebApp(config.webAppUrl, sheetsData);
            }

            // Method 2: Direct API call (requires CORS handling)
            return await this.syncViaDirectAPI(config.sheetId, sheetsData);

        } catch (error) {
            console.error('Sheets API sync error:', error);
            return false;
        }
    }

    // Sync via Google Apps Script Web App (Most reliable method)
    async syncViaWebApp(webAppUrl, sheetsData) {
        try {
            const response = await fetch(webAppUrl, {
                method: 'POST',
                mode: 'no-cors', // Important for cross-origin requests
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateSheets',
                    data: sheetsData,
                    timestamp: new Date().toISOString()
                })
            });

            // Note: With no-cors mode, we can't read the response
            // but we assume success if no error is thrown
            console.log('Data sent to Google Apps Script Web App');
            return true;

        } catch (error) {
            console.error('Web App sync error:', error);
            return false;
        }
    }

    // Prepare data in the format expected by Google Sheets
    prepareDataForSheetsAPI(data) {
        return {
            materials: this.formatMaterialsForSheets(data.materials),
            racks: this.formatRacksForSheets(data.racks),
            placements: this.formatPlacementsForSheets(data.placements),
            summary: this.generateSummaryData(data)
        };
    }

    // Format materials data for Google Sheets
    formatMaterialsForSheets(materials) {
        const headers = ['ID', 'Part Number', 'Serial Number', 'Type', 'Description', 'Supplier', 'Date Received', 'Barcode', 'Created By', 'Timestamp'];
        const rows = materials.map(item => [
            item.id,
            item.partNumber || '',
            item.serialNumber || '',
            item.type || '',
            item.description || '',
            item.supplier || '',
            item.dateReceived || '',
            item.barcode || '',
            item.createdBy || 'System',
            new Date(item.timestamp).toLocaleString()
        ]);

        return [headers, ...rows];
    }

    // Format racks data for Google Sheets
    formatRacksForSheets(racks) {
        const headers = ['ID', 'Zone', 'Aisle', 'Section', 'Level', 'Position', 'Barcode', 'Created By', 'Timestamp'];
        const rows = racks.map(item => [
            item.id,
            item.zone || '',
            item.aisle || '',
            item.section || '',
            item.level || '',
            item.position || '',
            item.barcode || '',
            item.createdBy || 'System',
            new Date(item.timestamp).toLocaleString()
        ]);

        return [headers, ...rows];
    }

    // Format placements data for Google Sheets
    formatPlacementsForSheets(placements) {
        const headers = ['ID', 'Material ID', 'Rack ID', 'Quantity', 'Status', 'Created By', 'Timestamp'];
        const rows = placements.map(item => [
            item.id,
            item.materialId || '',
            item.rackId || '',
            item.quantity || 1,
            item.status || 'Active',
            item.createdBy || 'System',
            new Date(item.timestamp).toLocaleString()
        ]);

        return [headers, ...rows];
    }

    // Generate summary data
    generateSummaryData(data) {
        return [
            ['Metric', 'Value', 'Last Updated'],
            ['Total Materials', data.materials.length, new Date().toLocaleString()],
            ['Total Racks', data.racks.length, new Date().toLocaleString()],
            ['Total Placements', data.placements.length, new Date().toLocaleString()],
            ['Last Sync', new Date().toISOString(), new Date().toLocaleString()]
        ];
    }

    // Update sync status in the UI
    updateSyncStatus(status, timestamp) {
        const statusElement = document.getElementById('sync-status');
        const timestampElement = document.getElementById('last-sync-time');

        if (statusElement) {
            statusElement.textContent = status === 'success' ? '✅ Synced' : '❌ Error';
            statusElement.className = `status status--${status === 'success' ? 'success' : 'error'}`;
        }

        if (timestampElement) {
            timestampElement.textContent = `Last sync: ${timestamp.toLocaleString()}`;
        }

        // Update sync indicator
        this.updateSyncIndicator(status);
    }

    // Update visual sync indicator
    updateSyncIndicator(status) {
        const indicator = document.getElementById('sync-indicator');
        if (!indicator) return;

        indicator.className = `sync-indicator sync-indicator--${status}`;

        if (status === 'syncing') {
            indicator.innerHTML = '🔄 Syncing...';
        } else if (status === 'success') {
            indicator.innerHTML = '✅ Synced';
        } else {
            indicator.innerHTML = '❌ Error';
        }
    }

    // Configure automatic sync settings
    configureAutoSync(settings) {
        const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');

        config.autoSync = settings.enabled;
        config.syncFrequency = settings.frequency;
        config.webAppUrl = settings.webAppUrl;

        localStorage.setItem('google_sheets_config', JSON.stringify(config));

        if (settings.enabled) {
            this.startAutomaticSync(settings.frequency);
            this.showNotification('Automatic sync enabled', 'success');
        } else {
            this.stopAutomaticSync();
            this.showNotification('Automatic sync disabled', 'info');
        }
    }

    // Stop automatic sync
    stopAutomaticSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        console.log('Automatic sync stopped');
    }

    // Enhanced notification system for auto-sync
    showAutoSyncNotification(message, type = 'info', duration = 3000) {
        // Only show notifications for important events to avoid spam
        if (type === 'error' || type === 'warning') {
            this.showNotification(message, type, duration);
        }
    }

    // Get sync statistics
    getSyncStats() {
        const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');

        return {
            enabled: config.autoSync || false,
            frequency: config.syncFrequency || 'not set',
            lastSync: config.lastSync ? new Date(config.lastSync) : null,
            syncCount: config.syncCount || 0,
            status: config.lastSyncStatus || 'unknown'
        };
    }
}

// Initialize the enhanced warehouse manager
let warehouseManager;

document.addEventListener('DOMContentLoaded', () => {
    warehouseManager = new AutomaticWarehouseManager();

    // Setup auto-sync configuration UI
    setupAutoSyncUI();
});

// Setup UI for auto-sync configuration
function setupAutoSyncUI() {
    const autoSyncToggle = document.getElementById('auto-sync-toggle');
    const frequencySelect = document.getElementById('sync-frequency');

    if (autoSyncToggle) {
        autoSyncToggle.addEventListener('change', (e) => {
            const settings = {
                enabled: e.target.checked,
                frequency: frequencySelect?.value || 'hourly',
                webAppUrl: document.getElementById('web-app-url')?.value
            };

            warehouseManager.configureAutoSync(settings);
        });
    }

    if (frequencySelect) {
        frequencySelect.addEventListener('change', (e) => {
            const stats = warehouseManager.getSyncStats();
            if (stats.enabled) {
                warehouseManager.startAutomaticSync(e.target.value);
            }
        });
    }
}

// Export functions for global access
window.configureAutoSync = function(settings) {
    if (warehouseManager) {
        warehouseManager.configureAutoSync(settings);
    }
};

window.getSyncStats = function() {
    return warehouseManager ? warehouseManager.getSyncStats() : null;
};

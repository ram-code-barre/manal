// Aviation Warehouse Management System JavaScript - Enhanced with Auto-Sync

class WarehouseManager {
    constructor() {
        this.currentPlacement = {};
        this.currentUser = 'Admin'; // Default user
        this.searchFilters = {
            materials: '',
            racks: '',
            placements: ''
        };
        this.pagination = {
            materials: { page: 1, itemsPerPage: 10 },
            racks: { page: 1, itemsPerPage: 10 },
            placements: { page: 1, itemsPerPage: 10 }
        };
        // Auto-sync configuration
        this.autoSyncConfig = {
            enabled: false,
            frequency: 'hourly', // 'realtime', 'minute', 'hourly', 'daily'
            webAppUrl: '',
            lastSync: null,
            syncInProgress: false,
            lastDataHash: null
        };
        this.dataChangeDetected = false;
        this.syncInterval = null;
        this.init();
    }

    init() {
        this.initializeData();
        this.setupEventListeners();
        this.updateStats();
        this.displayAllData();
        this.setCurrentDate();
        this.loadGoogleSheetsConfig();
        this.loadAutoSyncConfig();
    }

    // Load auto-sync configuration
    loadAutoSyncConfig() {
        const config = JSON.parse(localStorage.getItem('auto_sync_config') || '{}');
        
        if (config.enabled) {
            this.autoSyncConfig = { ...this.autoSyncConfig, ...config };
            this.startAutomaticSync(config.frequency);
            this.showNotification('Auto-sync configuration loaded', 'info');
        }
    }

    // Configure automatic sync settings
    configureAutoSync(settings) {
        this.autoSyncConfig = {
            ...this.autoSyncConfig,
            enabled: settings.enabled,
            frequency: settings.frequency,
            webAppUrl: settings.webAppUrl || this.autoSyncConfig.webAppUrl
        };

        localStorage.setItem('auto_sync_config', JSON.stringify(this.autoSyncConfig));

        if (settings.enabled) {
            this.startAutomaticSync(settings.frequency);
            this.showNotification('Automatic sync enabled', 'success');
        } else {
            this.stopAutomaticSync();
            this.showNotification('Automatic sync disabled', 'info');
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

        // Initial sync after 5 seconds
        setTimeout(() => this.autoSyncData(), 5000);
    }

    // Setup real-time sync
    setupRealtimeSync() {
        console.log('Setting up real-time sync...');
        // Real-time sync is handled in the enhanced saveData method
    }

    // Stop automatic sync
    stopAutomaticSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        console.log('Automatic sync stopped');
    }

    // Automatic sync function that runs without user intervention
    async autoSyncData() {
        if (!this.autoSyncConfig.enabled || this.autoSyncConfig.syncInProgress) {
            return;
        }

        try {
            console.log('🔄 Starting automatic sync to Google Sheets...');
            this.autoSyncConfig.syncInProgress = true;
            this.updateSyncStatus('syncing', new Date());

            const data = this.getData();

            // Check if data has changed since last sync
            const dataHash = this.generateDataHash(data);
            if (dataHash === this.autoSyncConfig.lastDataHash) {
                console.log('📊 No data changes detected, skipping sync');
                this.autoSyncConfig.syncInProgress = false;
                return;
            }

            // Proceed with sync
            const success = await this.syncToGoogleSheetsAPI(data);

            if (success) {
                // Update config with sync timestamp and data hash
                this.autoSyncConfig.lastSync = new Date().toISOString();
                this.autoSyncConfig.lastDataHash = dataHash;
                this.autoSyncConfig.syncCount = (this.autoSyncConfig.syncCount || 0) + 1;

                localStorage.setItem('auto_sync_config', JSON.stringify(this.autoSyncConfig));

                console.log('✅ Automatic sync completed successfully');
                this.showAutoSyncNotification('Data automatically synced to Google Sheets', 'success');
                this.updateSyncStatus('success', new Date());

            } else {
                console.error('❌ Automatic sync failed');
                this.showAutoSyncNotification('Automatic sync failed - will retry next cycle', 'warning');
                this.updateSyncStatus('error', new Date());
            }

        } catch (error) {
            console.error('Auto-sync error:', error);
            this.showAutoSyncNotification(`Auto-sync error: ${error.message}`, 'error');
            this.updateSyncStatus('error', new Date());
        } finally {
            this.autoSyncConfig.syncInProgress = false;
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

        if (!config.sheetId && !this.autoSyncConfig.webAppUrl) {
            throw new Error('Sheet ID or Web App URL not configured');
        }

        try {
            // Prepare data for Google Sheets API
            const sheetsData = this.prepareDataForSheetsAPI(data);

            // Method 1: Use Google Apps Script Web App (Recommended)
            if (this.autoSyncConfig.webAppUrl) {
                return await this.syncViaWebApp(this.autoSyncConfig.webAppUrl, sheetsData);
            }

            // Method 2: Use existing Google Sheets integration
            return await this.updateGoogleSheetDirect(config.sheetId, sheetsData);

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
        const headers = ['ID', 'Zone', 'Row', 'Level', 'Code', 'Description', 'Barcode', 'Created By', 'Timestamp'];
        const rows = racks.map(item => [
            item.id,
            item.zone || '',
            item.row || '',
            item.level || '',
            item.code || '',
            item.description || '',
            item.barcode || '',
            item.createdBy || 'System',
            new Date(item.timestamp).toLocaleString()
        ]);

        return [headers, ...rows];
    }

    // Format placements data for Google Sheets
    formatPlacementsForSheets(placements) {
        const headers = ['ID', 'Material ID', 'Rack ID', 'Material Barcode', 'Rack Barcode', 'User', 'Created By', 'Timestamp'];
        const rows = placements.map(item => [
            item.id,
            item.materialId || '',
            item.rackId || '',
            item.materialBarcode || '',
            item.rackBarcode || '',
            item.user || '',
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
            statusElement.textContent = status === 'success' ? '✅ Synced' : 
                                      status === 'syncing' ? '🔄 Syncing' : '❌ Error';
            statusElement.className = `status status--${status === 'success' ? 'success' : 
                                                       status === 'syncing' ? 'info' : 'error'}`;
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

    // Enhanced notification system for auto-sync
    showAutoSyncNotification(message, type = 'info', duration = 3000) {
        // Only show notifications for important events to avoid spam
        if (type === 'error' || type === 'warning') {
            this.showNotification(message, type, duration);
        }
    }

    // Get sync statistics
    getSyncStats() {
        return {
            enabled: this.autoSyncConfig.enabled || false,
            frequency: this.autoSyncConfig.frequency || 'not set',
            lastSync: this.autoSyncConfig.lastSync ? new Date(this.autoSyncConfig.lastSync) : null,
            syncCount: this.autoSyncConfig.syncCount || 0,
            webAppUrl: this.autoSyncConfig.webAppUrl || 'not set'
        };
    }

    // Enhanced saveData method with auto-sync trigger
    saveData(data) {
        localStorage.setItem('warehouse_data', JSON.stringify(data));
        this.updateStats();
        this.displayAllData();

        // Trigger auto-sync for real-time mode
        if (this.autoSyncConfig.enabled && this.autoSyncConfig.frequency === 'realtime') {
            setTimeout(() => {
                console.log('Data changed - triggering automatic sync');
                this.autoSyncData();
            }, 1000); // Small delay to avoid too frequent syncs
        }

        // Auto-sync with existing Google Sheets integration if real-time sync is enabled
        const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');
        if (config.connected && config.syncFrequency === 'realtime') {
            setTimeout(() => {
                this.syncWithGoogleSheets();
            }, 1000); // Delay to avoid too frequent syncs
        }
    }

    // Data Management
    initializeData() {
        if (!localStorage.getItem('warehouse_data')) {
            const initialData = {
                materials: [],
                racks: [],
                placements: [],
                auditLog: []
            };
            localStorage.setItem('warehouse_data', JSON.stringify(initialData));
        }
    }

    // Input Sanitization
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
    }

    // Audit Trail
    addAuditEntry(action, entityType, entityId, details = {}) {
        const data = this.getData();
        const auditEntry = {
            id: this.generateId('AUDIT'),
            timestamp: new Date().toISOString(),
            user: this.currentUser,
            action: action,
            entityType: entityType,
            entityId: entityId,
            details: details
        };
        
        if (!data.auditLog) data.auditLog = [];
        data.auditLog.push(auditEntry);
        this.saveData(data);
    }

    // Search functionality
    searchMaterials(query) {
        const data = this.getData();
        if (!query) return data.materials;
        
        const searchTerm = query.toLowerCase();
        return data.materials.filter(material => 
            material.partNumber.toLowerCase().includes(searchTerm) ||
            material.serialNumber.toLowerCase().includes(searchTerm) ||
            material.type.toLowerCase().includes(searchTerm) ||
            (material.supplier && material.supplier.toLowerCase().includes(searchTerm)) ||
            (material.description && material.description.toLowerCase().includes(searchTerm))
        );
    }

    searchRacks(query) {
        const data = this.getData();
        if (!query) return data.racks;
        
        const searchTerm = query.toLowerCase();
        return data.racks.filter(rack => 
            rack.code.toLowerCase().includes(searchTerm) ||
            rack.zone.toLowerCase().includes(searchTerm) ||
            (rack.description && rack.description.toLowerCase().includes(searchTerm))
        );
    }

    searchPlacements(query) {
        const data = this.getData();
        if (!query) return data.placements;
        
        const searchTerm = query.toLowerCase();
        return data.placements.filter(placement => {
            const material = data.materials.find(m => m.id === placement.materialId);
            const rack = data.racks.find(r => r.id === placement.rackId);
            
            return (material && (
                material.partNumber.toLowerCase().includes(searchTerm) ||
                material.serialNumber.toLowerCase().includes(searchTerm)
            )) || (rack && rack.code.toLowerCase().includes(searchTerm));
        });
    }

    getData() {
        return JSON.parse(localStorage.getItem('warehouse_data'));
    }

    generateId(prefix) {
        const data = this.getData();
        let maxId = 0;
        
        if (prefix === 'MAT') {
            data.materials.forEach(item => {
                const num = parseInt(item.id.replace('MAT', ''));
                if (num > maxId) maxId = num;
            });
        } else if (prefix === 'RACK') {
            data.racks.forEach(item => {
                const num = parseInt(item.id.replace('RACK', ''));
                if (num > maxId) maxId = num;
            });
        } else if (prefix === 'PLACE') {
            data.placements.forEach(item => {
                const num = parseInt(item.id.replace('PLACE', ''));
                if (num > maxId) maxId = num;
            });
        } else if (prefix === 'AUDIT') {
            if (data.auditLog) {
                data.auditLog.forEach(item => {
                    const num = parseInt(item.id.replace('AUDIT', ''));
                    if (num > maxId) maxId = num;
                });
            }
        }
        
        return prefix + String(maxId + 1).padStart(3, '0');
    }

    // Event Listeners
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Dashboard cards
        document.querySelectorAll('.dashboard-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const tabName = e.currentTarget.getAttribute('data-tab');
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });

        // Forms
        const materialForm = document.getElementById('material-form');
        if (materialForm) {
            materialForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleMaterialSubmission();
            });
        }

        const rackForm = document.getElementById('rack-form');
        if (rackForm) {
            rackForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRackSubmission();
            });
        }

        // Placement inputs
        const materialBarcodeInput = document.getElementById('material-barcode-input');
        if (materialBarcodeInput) {
            materialBarcodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.processMaterialBarcode();
                }
            });
        }

        const rackBarcodeInput = document.getElementById('rack-barcode-input');
        if (rackBarcodeInput) {
            rackBarcodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.processRackBarcode();
                }
            });
        }
    }

    setCurrentDate() {
        const dateInput = document.getElementById('date-received');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    // Tab Management
    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(tabName);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }

    // Statistics
    updateStats() {
        const data = this.getData();
        
        const totalMaterials = document.getElementById('total-materials');
        const totalRacks = document.getElementById('total-racks');
        const totalPlacements = document.getElementById('total-placements');
        const dashboardMaterials = document.getElementById('dashboard-materials');
        const dashboardRacks = document.getElementById('dashboard-racks');
        const dashboardPlacements = document.getElementById('dashboard-placements');
        
        if (totalMaterials) totalMaterials.textContent = data.materials.length;
        if (totalRacks) totalRacks.textContent = data.racks.length;
        if (totalPlacements) totalPlacements.textContent = data.placements.length;
        if (dashboardMaterials) dashboardMaterials.textContent = data.materials.length;
        if (dashboardRacks) dashboardRacks.textContent = data.racks.length;
        if (dashboardPlacements) dashboardPlacements.textContent = data.placements.length;
    }

    // Material Reception
    handleMaterialSubmission() {
        const partNumberEl = document.getElementById('part-number');
        const serialNumberEl = document.getElementById('serial-number');
        const materialTypeEl = document.getElementById('material-type');
        const descriptionEl = document.getElementById('description');
        const supplierEl = document.getElementById('supplier');
        const dateReceivedEl = document.getElementById('date-received');

        if (!partNumberEl || !serialNumberEl) {
            this.showNotification('Form elements not found', 'error');
            return;
        }

        // Sanitize inputs
        const partNumber = this.sanitizeInput(partNumberEl.value.trim());
        const serialNumber = this.sanitizeInput(serialNumberEl.value.trim());
        const materialType = materialTypeEl ? this.sanitizeInput(materialTypeEl.value) : 'Electronic';
        const description = descriptionEl ? this.sanitizeInput(descriptionEl.value.trim()) : '';
        const supplier = supplierEl ? this.sanitizeInput(supplierEl.value.trim()) : '';
        const dateReceived = dateReceivedEl ? dateReceivedEl.value : new Date().toISOString().split('T')[0];

        // Enhanced validation
        if (!partNumber || !serialNumber) {
            this.showNotification('Part Number and Serial Number are required', 'error');
            return;
        }

        if (partNumber.length < 3 || serialNumber.length < 3) {
            this.showNotification('Part Number and Serial Number must be at least 3 characters', 'error');
            return;
        }

        // Check for duplicates
        const data = this.getData();
        const existingMaterial = data.materials.find(m => 
            m.partNumber === partNumber && m.serialNumber === serialNumber
        );
        
        if (existingMaterial) {
            this.showNotification('Material with this Part Number and Serial Number already exists', 'error');
            return;
        }

        const materialId = this.generateId('MAT');
        const barcode = `${materialId}-${partNumber}-${serialNumber}`;
        
        const material = {
            id: materialId,
            partNumber: partNumber,
            serialNumber: serialNumber,
            type: materialType,
            description: description,
            supplier: supplier,
            dateReceived: dateReceived,
            barcode: barcode,
            timestamp: new Date().toISOString(),
            createdBy: this.currentUser
        };

        data.materials.push(material);
        this.saveData(data);

        // Add audit entry
        this.addAuditEntry('CREATE', 'MATERIAL', materialId, {
            partNumber: partNumber,
            serialNumber: serialNumber,
            type: materialType
        });

        this.generateMaterialBarcode(material);
        this.showNotification('Material registered successfully', 'success');
        this.displayMaterials();
    }

    generateMaterialBarcode(material) {
        const canvas = document.getElementById('material-barcode');
        
        if (!canvas) {
            this.showNotification('Barcode canvas not found', 'error');
            return;
        }

        try {
            JsBarcode(canvas, material.barcode, {
                format: "CODE128",
                width: 2,
                height: 100,
                displayValue: true,
                fontSize: 14,
                margin: 10
            });

            const barcodeInfo = document.getElementById('material-barcode-info');
            if (barcodeInfo) {
                barcodeInfo.innerHTML = `
                    <strong>Material ID:</strong> ${material.id}<br>
                    <strong>P/N:</strong> ${material.partNumber}<br>
                    <strong>S/N:</strong> ${material.serialNumber}<br>
                    <strong>Type:</strong> ${material.type}<br>
                    <strong>Barcode:</strong> ${material.barcode}
                `;
            }

            const barcodeSection = document.getElementById('material-barcode-section');
            if (barcodeSection) {
                barcodeSection.style.display = 'block';
            }
        } catch (error) {
            this.showNotification('Error generating barcode: ' + error.message, 'error');
        }
    }

    // Rack Management
    handleRackSubmission() {
        const zoneEl = document.getElementById('zone');
        const rowEl = document.getElementById('row');
        const levelEl = document.getElementById('level');
        const rackDescriptionEl = document.getElementById('rack-description');

        if (!zoneEl || !rowEl || !levelEl) {
            this.showNotification('Form elements not found', 'error');
            return;
        }

        const zone = this.sanitizeInput(zoneEl.value);
        const row = this.sanitizeInput(rowEl.value);
        const level = this.sanitizeInput(levelEl.value);
        const rackDescription = rackDescriptionEl ? this.sanitizeInput(rackDescriptionEl.value.trim()) : '';

        const data = this.getData();
        const rackCode = `${zone}-${row}-${level}`;
        
        // Check if rack already exists
        const existingRack = data.racks.find(rack => rack.code === rackCode);
        if (existingRack) {
            this.showNotification('Rack location already exists', 'error');
            return;
        }

        const rackId = this.generateId('RACK');
        const rack = {
            id: rackId,
            zone: zone,
            row: row,
            level: level,
            code: rackCode,
            description: rackDescription,
            barcode: rackCode,
            timestamp: new Date().toISOString(),
            createdBy: this.currentUser
        };

        data.racks.push(rack);
        this.saveData(data);

        // Add audit entry
        this.addAuditEntry('CREATE', 'RACK', rackId, {
            code: rackCode,
            zone: zone,
            row: row,
            level: level
        });

        this.generateRackBarcode(rack);
        this.showNotification('Rack location created successfully', 'success');
        this.displayRacks();
    }

    generateRackBarcode(rack) {
        const canvas = document.getElementById('rack-barcode');
        
        if (!canvas) {
            this.showNotification('Rack barcode canvas not found', 'error');
            return;
        }

        try {
            JsBarcode(canvas, rack.barcode, {
                format: "CODE128",
                width: 2,
                height: 100,
                displayValue: true,
                fontSize: 14,
                margin: 10
            });

            const barcodeInfo = document.getElementById('rack-barcode-info');
            if (barcodeInfo) {
                barcodeInfo.innerHTML = `
                    <strong>Rack ID:</strong> ${rack.id}<br>
                    <strong>Location:</strong> Zone ${rack.zone}, Row ${rack.row}, Level ${rack.level}<br>
                    <strong>Code:</strong> ${rack.code}<br>
                    ${rack.description ? `<strong>Description:</strong> ${rack.description}<br>` : ''}
                    <strong>Barcode:</strong> ${rack.barcode}
                `;
            }

            const barcodeSection = document.getElementById('rack-barcode-section');
            if (barcodeSection) {
                barcodeSection.style.display = 'block';
            }
        } catch (error) {
            this.showNotification('Error generating barcode: ' + error.message, 'error');
        }
    }

    // Placement Management
    processMaterialBarcode() {
        const barcodeInput = document.getElementById('material-barcode-input');
        if (!barcodeInput) {
            this.showNotification('Material barcode input not found', 'error');
            return;
        }

        const barcode = barcodeInput.value.trim();
        if (!barcode) {
            this.showNotification('Please enter a material barcode', 'error');
            return;
        }

        const data = this.getData();
        const material = data.materials.find(mat => mat.barcode === barcode);
        
        if (!material) {
            this.showNotification('Material not found', 'error');
            return;
        }

        this.currentPlacement.material = material;
        
        const selectedMaterialDisplay = document.getElementById('selected-material-display');
        if (selectedMaterialDisplay) {
            selectedMaterialDisplay.innerHTML = `
                <div class="item-card">
                    <div class="item-header">
                        <span class="item-title">Selected Material</span>

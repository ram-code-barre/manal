// Aviation Warehouse Management System JavaScript

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
		// Auto-sync runtime state
		this.syncInterval = null;
		this.lastDataHash = null;
        this.init();
    }

    init() {
        this.initializeData();
        this.setupEventListeners();
        this.updateStats();
        this.displayAllData();
        this.setCurrentDate();
        this.loadGoogleSheetsConfig();
		this.setupSyncUIListeners();
        this.restoreUserPrefs();
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

    setData(data) { localStorage.setItem('warehouse_data', JSON.stringify(data)); }

    // User prefs (persist matricules and UI settings)
    restoreUserPrefs() {
        const prefs = JSON.parse(localStorage.getItem('user_prefs') || '{}');
        if (prefs.receptionMatricule) {
            const el = document.getElementById('reception-matricule');
            if (el) el.value = prefs.receptionMatricule;
        }
        if (prefs.placementMatricule) {
            const el = document.getElementById('magasinier-matricule');
            if (el) el.value = prefs.placementMatricule;
        }
    }

    saveUserPref(key, value) {
        const prefs = JSON.parse(localStorage.getItem('user_prefs') || '{}');
        prefs[key] = value;
        localStorage.setItem('user_prefs', JSON.stringify(prefs));
    }

	// Find material from a scanned/typed value with multiple fallbacks
	findMaterialByScanInput(inputValue) {
		const data = this.getData();
		if (!inputValue) return null;

		const raw = String(inputValue).trim();
		const valueLc = raw.toLowerCase();

		// 1) Exact barcode match
		let matches = data.materials.filter(m => (m.barcode || '').toLowerCase() === valueLc);
		if (matches.length === 1) return matches[0];
		if (matches.length > 1) return matches.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))[0];

		// 2) Match by ID
		matches = data.materials.filter(m => (m.id || '').toLowerCase() === valueLc);
		if (matches.length) return matches.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))[0];

		// 3) Match by Part Number or Serial Number
		matches = data.materials.filter(m =>
			(m.partNumber && m.partNumber.toLowerCase() === valueLc) ||
			(m.serialNumber && m.serialNumber.toLowerCase() === valueLc)
		);
		if (matches.length) return matches.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))[0];

		// 4) Combined patterns PN-SN or SN-PN
		matches = data.materials.filter(m => {
			const pn = (m.partNumber || '').toLowerCase();
			const sn = (m.serialNumber || '').toLowerCase();
			return valueLc === `${pn}-${sn}` || valueLc === `${sn}-${pn}`;
		});
		if (matches.length) return matches.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))[0];

		// 5) Loose numeric match against Serial Number (common scanner entry)
		if (/^\d{4,}$/.test(raw)) {
			matches = data.materials.filter(m => (m.serialNumber || '').replace(/\s+/g,'') === raw);
			if (matches.length) return matches.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))[0];
		}

		return null;
    }

    saveData(data) {
        localStorage.setItem('warehouse_data', JSON.stringify(data));
        this.updateStats();
        this.displayAllData();
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

	// Wire auto-sync UI controls
	setupSyncUIListeners() {
		const autoSyncToggle = document.getElementById('auto-sync-toggle');
		const frequencySelect = document.getElementById('sync-frequency');
		const webAppUrlInput = document.getElementById('web-app-url');
		const sheetsUrlInput = document.getElementById('sheets-url');

		if (autoSyncToggle) {
			autoSyncToggle.addEventListener('change', (e) => {
				this.configureAutoSync({
					enabled: e.target.checked,
					frequency: (frequencySelect && frequencySelect.value) || 'manual',
					webAppUrl: webAppUrlInput ? webAppUrlInput.value : undefined
				});
			});
		}

		if (frequencySelect) {
			frequencySelect.addEventListener('change', (e) => {
				const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');
				config.syncFrequency = e.target.value;
				localStorage.setItem('google_sheets_config', JSON.stringify(config));
				if (autoSyncToggle && autoSyncToggle.checked) {
					this.setupAutoSync(e.target.value);
				}
			});
		}

		if (webAppUrlInput) {
			webAppUrlInput.addEventListener('blur', (e) => {
				const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');
				config.webAppUrl = e.target.value;
				localStorage.setItem('google_sheets_config', JSON.stringify(config));
			});
		}

		if (sheetsUrlInput) {
			sheetsUrlInput.addEventListener('blur', (e) => {
				const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');
				config.sheetsUrl = e.target.value;
				localStorage.setItem('google_sheets_config', JSON.stringify(config));
			});
		}

		// Auto Excel toggle
		const autoExcelToggle = document.getElementById('auto-excel-toggle');
		if (autoExcelToggle) {
			autoExcelToggle.addEventListener('change', (e) => {
				const prefs = JSON.parse(localStorage.getItem('user_prefs') || '{}');
				prefs.autoExcel = !!e.target.checked;
				localStorage.setItem('user_prefs', JSON.stringify(prefs));
			});
			// restore
			const prefs = JSON.parse(localStorage.getItem('user_prefs') || '{}');
			autoExcelToggle.checked = !!prefs.autoExcel;
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
        const receptionMatriculeEl = document.getElementById('reception-matricule');
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
        const receptionMatricule = receptionMatriculeEl ? this.sanitizeInput(receptionMatriculeEl.value.trim()) : '';
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
            receptionMatricule: receptionMatricule,
            dateReceived: dateReceived,
            barcode: barcode,
            timestamp: new Date().toISOString(),
            createdBy: this.currentUser
        };

        data.materials.push(material);
        this.saveData(data);

        // remember matricule
        if (receptionMatricule) this.saveUserPref('receptionMatricule', receptionMatricule);

        // Add audit entry
        this.addAuditEntry('CREATE', 'MATERIAL', materialId, {
            partNumber: partNumber,
            serialNumber: serialNumber,
            type: materialType,
            receptionMatricule: receptionMatricule
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
                width: 3,
                height: 120,
                displayValue: true,
                fontSize: 16,
                margin: 16
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
            capacityNote: '',
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
                width: 3,
                height: 120,
                displayValue: true,
                fontSize: 16,
                margin: 16
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

        const material = this.findMaterialByScanInput(barcode);
        
        if (!material) {
            this.showNotification('Material not found. Tip: scan the printed barcode or enter ID, P/N, or S/N.', 'error');
            return;
        }

        this.currentPlacement.material = material;
        
        const selectedMaterialDisplay = document.getElementById('selected-material-display');
        if (selectedMaterialDisplay) {
            selectedMaterialDisplay.innerHTML = `
                <div class="item-card">
                    <div class="item-header">
                        <span class="item-title">Selected Material</span>
                    </div>
                    <div class="item-details">
                        <div class="item-detail"><strong>ID:</strong> ${material.id}</div>
                        <div class="item-detail"><strong>P/N:</strong> ${material.partNumber}</div>
                        <div class="item-detail"><strong>S/N:</strong> ${material.serialNumber}</div>
                        <div class="item-detail"><strong>Type:</strong> ${material.type}</div>
                    </div>
                </div>
            `;
        }

        this.updatePlacementStep(2);
        this.showNotification('Material selected successfully', 'success');
    }

    processRackBarcode() {
        const barcodeInput = document.getElementById('rack-barcode-input');
        if (!barcodeInput) {
            this.showNotification('Rack barcode input not found', 'error');
            return;
        }

        const barcode = barcodeInput.value.trim();
        if (!barcode) {
            this.showNotification('Please enter a rack barcode', 'error');
            return;
        }

        const data = this.getData();
        const valueLc = barcode.toLowerCase();
        let rack = data.racks.find(r => (r.barcode || '').toLowerCase() === valueLc);
        if (!rack) {
            // fallback: match by code
            rack = data.racks.find(r => (r.code || '').toLowerCase() === valueLc);
        }
        
        if (!rack) {
            this.showNotification('Rack location not found. Tip: enter rack code (e.g., A-01-01).', 'error');
            return;
        }

        this.currentPlacement.rack = rack;
        
        const placementConfirmation = document.getElementById('placement-confirmation');
        if (placementConfirmation) {
            placementConfirmation.innerHTML = `
                <div class="confirmation-item">
                    <span class="confirmation-label">Material:</span>
                    <span class="confirmation-value">${this.currentPlacement.material.partNumber} (${this.currentPlacement.material.serialNumber})</span>
                </div>
                <div class="confirmation-item">
                    <span class="confirmation-label">Rack Location:</span>
                    <span class="confirmation-value">${rack.code} - Zone ${rack.zone}, Row ${rack.row}, Level ${rack.level}</span>
                </div>
                <div class="confirmation-item">
                    <span class="confirmation-label">Material Type:</span>
                    <span class="confirmation-value">${this.currentPlacement.material.type}</span>
                </div>
                ${rack.description ? `
                <div class="confirmation-item">
                    <span class="confirmation-label">Rack Description:</span>
                    <span class="confirmation-value">${rack.description}</span>
                </div>
                ` : ''}
            `;
        }

        this.updatePlacementStep(3);
        this.showNotification('Ready to confirm placement', 'success');
    }

    confirmPlacement() {
        const data = this.getData();
        const matriculeInput = document.getElementById('magasinier-matricule');
        const matricule = matriculeInput ? this.sanitizeInput(matriculeInput.value.trim()) : '';

        if (!matricule) {
            this.showNotification('Please enter your Magasinier Matricule', 'error');
            if (matriculeInput) matriculeInput.focus();
            return;
        }

        // remember matricule
        this.saveUserPref('placementMatricule', matricule);
        const placementId = this.generateId('PLACE');
        
        const placement = {
            id: placementId,
            materialId: this.currentPlacement.material.id,
            rackId: this.currentPlacement.rack.id,
            materialBarcode: this.currentPlacement.material.barcode,
            rackBarcode: this.currentPlacement.rack.barcode,
            timestamp: new Date().toISOString(),
            user: this.currentUser,
            magasinierMatricule: matricule,
            createdBy: this.currentUser
        };

        data.placements.push(placement);
        this.saveData(data);

        // Add audit entry
        this.addAuditEntry('CREATE', 'PLACEMENT', placementId, {
            materialId: this.currentPlacement.material.id,
            rackId: this.currentPlacement.rack.id,
            materialBarcode: this.currentPlacement.material.barcode,
            rackBarcode: this.currentPlacement.rack.barcode,
            magasinierMatricule: matricule
        });

        this.showNotification('Placement recorded successfully', 'success');
        this.displayPlacements();
        this.resetPlacement();
    }

    resetPlacement() {
        this.currentPlacement = {};
        
        const materialBarcodeInput = document.getElementById('material-barcode-input');
        const rackBarcodeInput = document.getElementById('rack-barcode-input');
        const matriculeInput = document.getElementById('magasinier-matricule');
        const selectedMaterialDisplay = document.getElementById('selected-material-display');
        const placementConfirmation = document.getElementById('placement-confirmation');
        
        if (materialBarcodeInput) materialBarcodeInput.value = '';
        if (rackBarcodeInput) rackBarcodeInput.value = '';
        if (matriculeInput) matriculeInput.value = '';
        if (selectedMaterialDisplay) selectedMaterialDisplay.innerHTML = '';
        if (placementConfirmation) placementConfirmation.innerHTML = '';
        
        this.updatePlacementStep(1);
    }

    updatePlacementStep(step) {
        // Update step indicators
        document.querySelectorAll('.step').forEach((stepEl, index) => {
            stepEl.classList.toggle('active', index + 1 <= step);
        });

        // Update step content
        document.querySelectorAll('.placement-step').forEach((stepEl, index) => {
            stepEl.classList.toggle('active', index + 1 === step);
        });
    }

    // Display Functions
    displayAllData() {
        this.displayMaterials();
        this.displayRacks();
        this.displayPlacements();
        this.displayDataTables();
    }

    displayMaterials() {
        const searchQuery = this.searchFilters.materials;
        const materials = searchQuery ? this.searchMaterials(searchQuery) : this.getData().materials;
        const container = document.getElementById('materials-display');
        
        if (!container) return;
        
        if (materials.length === 0) {
            container.innerHTML = searchQuery ? 
                '<p>No materials found matching your search.</p>' : 
                '<p>No materials registered yet.</p>';
            return;
        }

        const { page, itemsPerPage } = this.pagination.materials;
        const startIndex = (page - 1) * itemsPerPage;
        const paginatedMaterials = materials
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(startIndex, startIndex + itemsPerPage);

        const totalPages = Math.ceil(materials.length / itemsPerPage);

        container.innerHTML = `
            ${this.renderPaginationControls('materials', page, totalPages)}
            ${paginatedMaterials.map(material => `
                <div class="item-card">
                    <div class="item-header">
                        <span class="item-title">${this.escapeHtml(material.partNumber)} - ${this.escapeHtml(material.serialNumber)}</span>
                        <span class="item-timestamp">${new Date(material.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div class="item-details">
                        <div class="item-detail"><strong>Type:</strong> ${this.escapeHtml(material.type)}</div>
                        <div class="item-detail"><strong>ID:</strong> ${material.id}</div>
                        <div class="item-detail"><strong>Supplier:</strong> ${this.escapeHtml(material.supplier || 'N/A')}</div>
                        <div class="item-detail"><strong>Barcode:</strong> ${material.barcode}</div>
                        ${material.receptionMatricule ? `<div class="item-detail"><strong>Matricule:</strong> ${this.escapeHtml(material.receptionMatricule)}</div>` : ''}
                        <div class="item-detail"><strong>Created By:</strong> ${this.escapeHtml(material.createdBy || 'Unknown')}</div>
                    </div>
                    ${material.description ? `<div class="item-detail"><strong>Description:</strong> ${this.escapeHtml(material.description)}</div>` : ''}
                </div>
            `).join('')}
            ${this.renderPaginationControls('materials', page, totalPages)}
        `;
    }

    displayRacks() {
        const searchQuery = this.searchFilters.racks;
        const racks = searchQuery ? this.searchRacks(searchQuery) : this.getData().racks;
        const container = document.getElementById('racks-display');
        
        if (!container) return;
        
        if (racks.length === 0) {
            container.innerHTML = searchQuery ? 
                '<p>No racks found matching your search.</p>' : 
                '<p>No rack locations created yet.</p>';
            return;
        }

        const { page, itemsPerPage } = this.pagination.racks;
        const startIndex = (page - 1) * itemsPerPage;
        const paginatedRacks = racks
            .sort((a, b) => a.code.localeCompare(b.code))
            .slice(startIndex, startIndex + itemsPerPage);

        const totalPages = Math.ceil(racks.length / itemsPerPage);

        container.innerHTML = `
            ${this.renderPaginationControls('racks', page, totalPages)}
            ${paginatedRacks.map(rack => `
                <div class="item-card">
                    <div class="item-header">
                        <span class="item-title">${this.escapeHtml(rack.code)}</span>
                        <span class="item-timestamp">${new Date(rack.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div class="item-details">
                        <div class="item-detail"><strong>Zone:</strong> ${this.escapeHtml(rack.zone)}</div>
                        <div class="item-detail"><strong>Row:</strong> ${this.escapeHtml(rack.row)}</div>
                        <div class="item-detail"><strong>Level:</strong> ${this.escapeHtml(rack.level)}</div>
                        <div class="item-detail"><strong>ID:</strong> ${rack.id}</div>
                        ${rack.capacityNote ? `<div class="item-detail"><strong>Capacity:</strong> ${this.escapeHtml(rack.capacityNote)}</div>` : ''}
                        <div class="item-detail"><strong>Created By:</strong> ${this.escapeHtml(rack.createdBy || 'Unknown')}</div>
                    </div>
                    ${rack.description ? `<div class="item-detail"><strong>Description:</strong> ${this.escapeHtml(rack.description)}</div>` : ''}
                </div>
            `).join('')}
            ${this.renderPaginationControls('racks', page, totalPages)}
        `;
    }

    displayPlacements() {
        const data = this.getData();
        const searchQuery = this.searchFilters.placements;
        const placements = searchQuery ? this.searchPlacements(searchQuery) : data.placements;
        const container = document.getElementById('placements-display');
        
        if (!container) return;
        
        if (placements.length === 0) {
            container.innerHTML = searchQuery ? 
                '<p>No placements found matching your search.</p>' : 
                '<p>No placements recorded yet.</p>';
            return;
        }

        const { page, itemsPerPage } = this.pagination.placements;
        const startIndex = (page - 1) * itemsPerPage;
        const paginatedPlacements = placements
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(startIndex, startIndex + itemsPerPage);

        const totalPages = Math.ceil(placements.length / itemsPerPage);

        container.innerHTML = `
            ${this.renderPaginationControls('placements', page, totalPages)}
            ${paginatedPlacements.map(placement => {
                const material = data.materials.find(m => m.id === placement.materialId);
                const rack = data.racks.find(r => r.id === placement.rackId);
                
                return `
                    <div class="item-card">
                        <div class="item-header">
                            <span class="item-title">Placement ${placement.id}</span>
                            <span class="item-timestamp">${new Date(placement.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="item-details">
                            <div class="item-detail"><strong>Material:</strong> ${material ? `${this.escapeHtml(material.partNumber)} (${this.escapeHtml(material.serialNumber)})` : 'N/A'}</div>
                            <div class="item-detail"><strong>Location:</strong> ${rack ? this.escapeHtml(rack.code) : 'N/A'}</div>
                            <div class="item-detail"><strong>User:</strong> ${this.escapeHtml(placement.user)}</div>
                            ${placement.magasinierMatricule ? `<div class="item-detail"><strong>Matricule:</strong> ${this.escapeHtml(placement.magasinierMatricule)}</div>` : ''}
                            <div class="item-detail"><strong>Created By:</strong> ${this.escapeHtml(placement.createdBy || 'Unknown')}</div>
                        </div>
                    </div>
                `;
            }).join('')}
            ${this.renderPaginationControls('placements', page, totalPages)}
        `;
    }

    // Undo last placement (simple rollback)
    undoLastPlacement() {
        const data = this.getData();
        if (!data.placements || data.placements.length === 0) {
            this.showNotification('No placements to undo', 'info');
            return;
        }
        const last = data.placements[data.placements.length - 1];
        if (!confirm(`Undo last placement ${last.id}?`)) return;
        data.placements.pop();
        this.saveData(data);
        this.addAuditEntry('DELETE', 'PLACEMENT', last.id, { reason: 'User undo last placement' });
        this.showNotification('Last placement removed', 'success');
        this.displayPlacements();
    }

    displayDataTables() {
        const data = this.getData();
        
        this.displayTable('materials-table', data.materials, [
            'id', 'partNumber', 'serialNumber', 'type', 'supplier', 'dateReceived', 'barcode', 'createdBy'
        ]);
        
        this.displayTable('racks-table', data.racks, [
            'id', 'zone', 'row', 'level', 'code', 'description', 'barcode', 'createdBy'
        ]);
        
        this.displayTable('placements-table', data.placements, [
            'id', 'materialId', 'rackId', 'materialBarcode', 'rackBarcode', 'user', 'createdBy', 'timestamp'
        ]);

        // Display audit log
        const auditContainer = document.getElementById('audit-log-display');
        if (auditContainer) {
            auditContainer.innerHTML = this.displayAuditLog();
        }
    }

    displayTable(containerId, dataArray, columns) {
        const container = document.getElementById(containerId);
        
        if (!container) return;
        
        if (dataArray.length === 0) {
            container.innerHTML = '<p>No data available.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, ' $1');
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Body
        const tbody = document.createElement('tbody');
        dataArray.forEach(item => {
            const row = document.createElement('tr');
            columns.forEach(col => {
                const td = document.createElement('td');
                let value = item[col] || '';
                if (col === 'timestamp' && value) {
                    value = new Date(value).toLocaleString();
                }
                td.textContent = value;
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        container.innerHTML = '';
        container.appendChild(table);
    }

    // Export/Import Functions
    exportToCSV(type) {
        const data = this.getData();
        let csvContent = '';
        let filename = '';
        
        if (type === 'materials') {
            const headers = ['ID', 'Part Number', 'Serial Number', 'Type', 'Description', 'Supplier', 'Date Received', 'Barcode', 'Timestamp'];
            csvContent = headers.join(',') + '\n';
            data.materials.forEach(item => {
                const row = [
                    item.id,
                    `"${item.partNumber}"`,
                    `"${item.serialNumber}"`,
                    `"${item.type}"`,
                    `"${item.description || ''}"`,
                    `"${item.supplier || ''}"`,
                    item.dateReceived,
                    `"${item.barcode}"`,
                    new Date(item.timestamp).toISOString()
                ];
                csvContent += row.join(',') + '\n';
            });
            filename = 'materials.csv';
        } else if (type === 'racks') {
            const headers = ['ID', 'Zone', 'Row', 'Level', 'Code', 'Description', 'Barcode', 'Timestamp'];
            csvContent = headers.join(',') + '\n';
            data.racks.forEach(item => {
                const row = [
                    item.id,
                    item.zone,
                    item.row,
                    item.level,
                    `"${item.code}"`,
                    `"${item.description || ''}"`,
                    `"${item.barcode}"`,
                    new Date(item.timestamp).toISOString()
                ];
                csvContent += row.join(',') + '\n';
            });
            filename = 'racks.csv';
        } else if (type === 'placements') {
            const headers = ['ID', 'Material ID', 'Rack ID', 'Material Barcode', 'Rack Barcode', 'User', 'Timestamp'];
            csvContent = headers.join(',') + '\n';
            data.placements.forEach(item => {
                const row = [
                    item.id,
                    item.materialId,
                    item.rackId,
                    `"${item.materialBarcode}"`,
                    `"${item.rackBarcode}"`,
                    `"${item.user}"`,
                    new Date(item.timestamp).toISOString()
                ];
                csvContent += row.join(',') + '\n';
            });
            filename = 'placements.csv';
        }
        
        this.downloadCSV(csvContent, filename);
        this.showNotification(`${type} data exported successfully`, 'success');
    }

    exportAllData() {
        const data = this.getData();
        const csvContent = JSON.stringify(data, null, 2);
        this.downloadFile(csvContent, 'warehouse_data.json', 'application/json');
        this.showNotification('All data exported successfully', 'success');
    }

    // Excel export: builds worksheets for materials, racks, placements, audit
    exportAllToExcel() {
        try {
            const data = this.getData();
            const wb = XLSX.utils.book_new();

            const matCols = ['id','partNumber','serialNumber','type','description','supplier','receptionMatricule','dateReceived','barcode','createdBy','timestamp'];
            const rackCols = ['id','zone','row','level','code','description','capacityNote','barcode','createdBy','timestamp'];
            const plcCols = ['id','materialId','rackId','materialBarcode','rackBarcode','user','magasinierMatricule','createdBy','timestamp'];
            const audCols = ['id','timestamp','user','action','entityType','entityId','details'];

            const mats = data.materials.map(m => matCols.reduce((o,k)=>{o[k]=m[k]||'';return o;},{}));
            const racks = data.racks.map(r => rackCols.reduce((o,k)=>{o[k]=r[k]||'';return o;},{}));
            const plcs = data.placements.map(p => plcCols.reduce((o,k)=>{o[k]=typeof p[k]==='object'?JSON.stringify(p[k]):(p[k]||'');return o;},{}));
            const audits = (data.auditLog||[]).map(a => audCols.reduce((o,k)=>{o[k]=typeof a[k]==='object'?JSON.stringify(a[k]):(a[k]||'');return o;},{}));

            const ws1 = XLSX.utils.json_to_sheet(mats, { header: matCols });
            const ws2 = XLSX.utils.json_to_sheet(racks, { header: rackCols });
            const ws3 = XLSX.utils.json_to_sheet(plcs, { header: plcCols });
            const ws4 = XLSX.utils.json_to_sheet(audits, { header: audCols });

            XLSX.utils.book_append_sheet(wb, ws1, 'Materials');
            XLSX.utils.book_append_sheet(wb, ws2, 'Racks');
            XLSX.utils.book_append_sheet(wb, ws3, 'Placements');
            XLSX.utils.book_append_sheet(wb, ws4, 'Audit');

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `warehouse_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showNotification('Excel exported successfully', 'success');
        } catch (err) {
            console.error('Excel export error', err);
            this.showNotification('Failed to export Excel', 'error');
        }
    }

    downloadCSV(content, filename) {
        this.downloadFile(content, filename, 'text/csv');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData() {
        const fileInput = document.getElementById('import-file');
        if (!fileInput) {
            this.showNotification('Import file input not found', 'error');
            return;
        }

        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('Please select a file to import', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate data structure
                if (!importedData.materials || !importedData.racks || !importedData.placements) {
                    throw new Error('Invalid data format');
                }
                
                if (confirm('This will replace all existing data. Are you sure?')) {
                    this.saveData(importedData);
                    this.showNotification('Data imported successfully', 'success');
                    fileInput.value = '';
                }
            } catch (error) {
                this.showNotification('Error importing data: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    clearAllData() {
        if (confirm('This will permanently delete all data. Are you sure?')) {
            if (confirm('This action cannot be undone. Continue?')) {
                const emptyData = {
                    materials: [],
                    racks: [],
                    placements: [],
                    auditLog: []
                };
                this.saveData(emptyData);
                this.showNotification('All data cleared successfully', 'warning');
                
                // Clear barcode sections
                const materialBarcodeSection = document.getElementById('material-barcode-section');
                const rackBarcodeSection = document.getElementById('rack-barcode-section');
                
                if (materialBarcodeSection) materialBarcodeSection.style.display = 'none';
                if (rackBarcodeSection) rackBarcodeSection.style.display = 'none';
                
                // Reset placement workflow
                this.resetPlacement();
            }
        }
    }

    // Utility Functions
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            if (formId === 'material-form') {
                const materialBarcodeSection = document.getElementById('material-barcode-section');
                if (materialBarcodeSection) materialBarcodeSection.style.display = 'none';
                this.setCurrentDate();
            } else if (formId === 'rack-form') {
                const rackBarcodeSection = document.getElementById('rack-barcode-section');
                if (rackBarcodeSection) rackBarcodeSection.style.display = 'none';
            }
        }
    }

    printBarcode(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            this.showNotification('Barcode not found', 'error');
            return;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Barcode</title>
                    <style>
                        body { 
                            margin: 0; 
                            padding: 20px; 
                            text-align: center; 
                            font-family: Arial, sans-serif; 
                        }
                        .barcode-container { 
                            border: 1px solid #000; 
                            padding: 20px; 
                            display: inline-block; 
                            background: white; 
                        }
                        .print-info { 
                            margin-bottom: 20px; 
                            font-size: 12px; 
                        }
                    </style>
                </head>
                <body>
                    <div class="barcode-container">
                        <div class="print-info">Aviation Warehouse Management System</div>
                        <img src="${canvas.toDataURL()}" />
                        <div class="print-info">Generated: ${new Date().toLocaleString()}</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            }
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    downloadCertificate() {
        const data = this.getData();
        const material = data.materials[data.materials.length - 1];
        
        if (!material) {
            this.showNotification('No material data available for certificate', 'error');
            return;
        }

        const canvas = document.getElementById('material-barcode');
        if (!canvas) {
            this.showNotification('Barcode not available', 'error');
            return;
        }
        
        const certificateContent = `
            <html>
                <head>
                    <title>Material Certificate</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            padding: 40px; 
                            background: white; 
                        }
                        .certificate { 
                            border: 2px solid #000; 
                            padding: 30px; 
                            text-align: center; 
                        }
                        .header { 
                            font-size: 24px; 
                            font-weight: bold; 
                            margin-bottom: 30px; 
                        }
                        .material-info { 
                            text-align: left; 
                            margin: 20px 0; 
                            line-height: 2; 
                        }
                        .barcode-section { 
                            margin: 30px 0; 
                            text-align: center; 
                        }
                    </style>
                </head>
                <body>
                    <div class="certificate">
                        <div class="header">AVIATION MATERIAL CERTIFICATE</div>
                        <div class="material-info">
                            <strong>Material ID:</strong> ${material.id}<br>
                            <strong>Part Number (P/N):</strong> ${material.partNumber}<br>
                            <strong>Serial Number (S/N):</strong> ${material.serialNumber}<br>
                            <strong>Material Type:</strong> ${material.type}<br>
                            <strong>Supplier:</strong> ${material.supplier || 'N/A'}<br>
                            <strong>Date Received:</strong> ${material.dateReceived}<br>
                            <strong>Description:</strong> ${material.description || 'N/A'}
                        </div>
                        <div class="barcode-section">
                            <img src="${canvas.toDataURL()}" />
                        </div>
                        <div style="margin-top: 30px; font-size: 12px;">
                            Generated: ${new Date().toLocaleString()}<br>
                            Aviation Warehouse Management System
                        </div>
                    </div>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(certificateContent);
        printWindow.document.close();
        printWindow.print();
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const messageEl = document.querySelector('.notification-message');
        
        if (notification && messageEl) {
            messageEl.textContent = message;
            notification.className = `notification ${type}`;
            
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 5000);
        }
    }

    hideNotification() {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.classList.add('hidden');
        }
    }

    // HTML escaping for security
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Pagination controls
    renderPaginationControls(type, currentPage, totalPages) {
        if (totalPages <= 1) return '';
        
        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        const nextDisabled = currentPage === totalPages ? 'disabled' : '';
        
        return `
            <div class="pagination-controls">
                <button class="btn btn--sm ${prevDisabled}" onclick="warehouseManager.changePage('${type}', ${currentPage - 1})" ${prevDisabled}>Previous</button>
                <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
                <button class="btn btn--sm ${nextDisabled}" onclick="warehouseManager.changePage('${type}', ${currentPage + 1})" ${nextDisabled}>Next</button>
            </div>
        `;
    }

    changePage(type, newPage) {
        const data = this.getData();
        const searchQuery = this.searchFilters[type];
        let totalItems;
        
        if (type === 'materials') {
            const materials = searchQuery ? this.searchMaterials(searchQuery) : data.materials;
            totalItems = materials.length;
        } else if (type === 'racks') {
            const racks = searchQuery ? this.searchRacks(searchQuery) : data.racks;
            totalItems = racks.length;
        } else if (type === 'placements') {
            const placements = searchQuery ? this.searchPlacements(searchQuery) : data.placements;
            totalItems = placements.length;
        }
        
        const totalPages = Math.ceil(totalItems / this.pagination[type].itemsPerPage);
        
        if (newPage < 1 || newPage > totalPages) return;
        
        this.pagination[type].page = newPage;
        
        if (type === 'materials') this.displayMaterials();
        else if (type === 'racks') this.displayRacks();
        else if (type === 'placements') this.displayPlacements();
    }

    // Enhanced search with filters
    setSearchFilter(type, query) {
        this.searchFilters[type] = query;
        this.pagination[type].page = 1; // Reset to first page
        
        if (type === 'materials') this.displayMaterials();
        else if (type === 'racks') this.displayRacks();
        else if (type === 'placements') this.displayPlacements();
    }

    // Backup functionality
    createBackup() {
        const data = this.getData();
        const backup = {
            ...data,
            backupDate: new Date().toISOString(),
            version: '1.0'
        };
        
        this.downloadFile(JSON.stringify(backup, null, 2), `warehouse_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        this.showNotification('Backup created successfully', 'success');
    }

    // Camera Scanner functionality
    openBarcodeScanner(type) {
        // Check if camera is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showNotification('Camera not supported on this device', 'error');
            return;
        }

        // Create scanner modal
        const modal = document.createElement('div');
        modal.className = 'scanner-modal';
        modal.innerHTML = `
            <div class="scanner-content">
                <h3>Scan ${type === 'material' ? 'Material' : 'Rack'} Barcode</h3>
                <video id="scanner-video" class="scanner-video" autoplay playsinline></video>
                <div class="scanner-actions">
                    <button class="btn btn--primary" onclick="closeBarcodeScanner()">Close</button>
                    <button class="btn btn--secondary" onclick="switchCamera()">Switch Camera</button>
                    <button class="btn btn--secondary" onclick="toggleTorch()">Toggle Torch</button>
                    <label class="btn btn--secondary" style="margin-bottom:0;">
                        From Photo
                        <input id="scanner-image-input" type="file" accept="image/*" capture="environment" style="display:none;" />
                    </label>
                </div>
                <p style="font-size: 12px; color: var(--color-text-secondary); margin-top: 16px;">
                    Tips: Good light, fill the frame, hold steady. Printed label should be at least 4–5 cm wide with a blank margin around it.
                </p>
            </div>
        `;

        document.body.appendChild(modal);

        // Hook image input for decoding from photo
        const imgInput = modal.querySelector('#scanner-image-input');
        if (imgInput) {
            imgInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) this.decodeFromImageFile(file, type);
            });
        }

        // Start camera
        this.startCamera(type);
    }

    async startCamera(type, deviceId = null) {
        try {
            const video = document.getElementById('scanner-video');
            this.scannerType = type;
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: deviceId ? undefined : { ideal: 'environment' },
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    advanced: [ { focusMode: 'continuous' } ]
                }
            };

            if (this.currentStream) {
                this.currentStream.getTracks().forEach(t => t.stop());
                this.currentStream = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            this.currentStream = stream;

            await this.listCameras();
            if (deviceId) this.currentCameraDeviceId = deviceId;

            if (window.ZXing && ZXing.BrowserMultiFormatReader) {
                const codeReader = new ZXing.BrowserMultiFormatReader();
                try {
                    const formats = [
                        ZXing.BarcodeFormat.CODE_128,
                        ZXing.BarcodeFormat.CODE_39,
                        ZXing.BarcodeFormat.EAN_13,
                        ZXing.BarcodeFormat.EAN_8,
                        ZXing.BarcodeFormat.ITF
                    ];
                    codeReader.hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
                } catch(_) {}
                this.codeReader = codeReader;

                await codeReader.decodeFromVideoDevice(deviceId || null, 'scanner-video', (result, err) => {
                    if (result && result.getText) {
                        const text = result.getText();
                        const inputId = type === 'material' ? 'material-barcode-input' : 'rack-barcode-input';
                        const input = document.getElementById(inputId);
                        if (input) input.value = text;
                        this.showNotification('Barcode scanned successfully', 'success');
                        this.closeBarcodeScanner();
                    }
                });
            }
        } catch (error) {
            this.showNotification('Error accessing camera: ' + error.message, 'error');
            this.closeBarcodeScanner();
        }
    }

    async listCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableCameras = devices.filter(d => d.kind === 'videoinput');
            if (this.availableCameras.length > 0 && this.currentCameraIndex == null) {
                this.currentCameraIndex = 0;
            }
        } catch(_) {
            this.availableCameras = [];
        }
    }

    // ZXing replaces the previous simulated detection

    closeBarcodeScanner() {
        const modal = document.querySelector('.scanner-modal');
        if (modal) {
            // Stop camera stream
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
                this.currentStream = null;
            }
            if (this.codeReader && this.codeReader.reset) {
                try { this.codeReader.reset(); } catch(_) {}
            }
            modal.remove();
        }
    }

    switchCamera() {
        if (!this.availableCameras || this.availableCameras.length < 2) {
            this.showNotification('No alternate camera found', 'info');
            return;
        }
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
        const next = this.availableCameras[this.currentCameraIndex];
        this.startCamera(this.scannerType || 'material', next.deviceId);
    }

    async toggleTorch() {
        try {
            if (!this.currentStream) return;
            const track = this.currentStream.getVideoTracks()[0];
            const caps = track.getCapabilities ? track.getCapabilities() : {};
            if (!('torch' in caps)) {
                this.showNotification('Torch not supported on this device', 'info');
                return;
            }
            this.torchOn = !this.torchOn;
            await track.applyConstraints({ advanced: [{ torch: this.torchOn }] });
        } catch(e) {
            this.showNotification('Unable to toggle torch', 'error');
        }
    }

    async decodeFromImageFile(file, type) {
        try {
            if (!(window.ZXing && ZXing.BrowserMultiFormatReader)) return;
            const url = URL.createObjectURL(file);
            const codeReader = new ZXing.BrowserMultiFormatReader();
            const result = await codeReader.decodeFromImageUrl(url);
            URL.revokeObjectURL(url);
            if (result && result.getText) {
                const inputId = type === 'material' ? 'material-barcode-input' : 'rack-barcode-input';
                const input = document.getElementById(inputId);
                if (input) input.value = result.getText();
                this.showNotification('Barcode decoded from photo', 'success');
                this.closeBarcodeScanner();
            } else {
                this.showNotification('No barcode found in photo', 'error');
            }
        } catch (e) {
            this.showNotification('Failed to decode from photo', 'error');
        }
    }

    // Load saved Google Sheets configuration on page load
    loadGoogleSheetsConfig() {
        const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');
        
            const sheetsUrlInput = document.getElementById('sheets-url');
            const syncFrequencySelect = document.getElementById('sync-frequency');
		const webAppUrlInput = document.getElementById('web-app-url');
		const autoSyncToggle = document.getElementById('auto-sync-toggle');
            
		if (sheetsUrlInput && config.sheetsUrl) sheetsUrlInput.value = config.sheetsUrl;
		if (webAppUrlInput && config.webAppUrl) webAppUrlInput.value = config.webAppUrl;
            if (syncFrequencySelect) syncFrequencySelect.value = config.syncFrequency || 'manual';
		if (autoSyncToggle) autoSyncToggle.checked = !!config.autoSync;
            
            // Setup auto-sync if enabled
		if (config.autoSync && config.syncFrequency) {
            this.setupAutoSync(config.syncFrequency);
		}

		// Initialize sync status UI
		const lastSyncStr = config.lastSync ? new Date(config.lastSync) : null;
		this.updateSyncStatus(config.lastSyncStatus || 'info', lastSyncStr || new Date(0));
    }

    // Google Sheets Integration
    connectGoogleSheets() {
        const sheetsUrl = document.getElementById('sheets-url').value;
        const syncFrequency = document.getElementById('sync-frequency').value;

        if (!sheetsUrl) {
            this.showNotification('Please enter a Google Sheets URL', 'error');
            return;
        }

        // Validate Google Sheets URL and extract sheet ID
        const sheetIdMatch = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!sheetIdMatch) {
            this.showNotification('Please enter a valid Google Sheets URL', 'error');
            return;
        }

        const sheetId = sheetIdMatch[1];

        // Store Google Sheets configuration
        const config = {
            sheetsUrl: sheetsUrl,
            sheetId: sheetId,
            syncFrequency: syncFrequency,
            connected: true,
            lastSync: new Date().toISOString()
        };

        localStorage.setItem('google_sheets_config', JSON.stringify(config));
        
		// Respect auto-sync toggle
		const autoSyncToggle = document.getElementById('auto-sync-toggle');
		if (autoSyncToggle && autoSyncToggle.checked) {
        this.setupAutoSync(syncFrequency);
		}
        
        this.showNotification('Connected to Google Sheets successfully', 'success');
        
        // Initial sync after connection
        setTimeout(() => {
            this.syncWithGoogleSheets();
        }, 1000);
    }

    setupAutoSync(frequency) {
        // Clear existing interval
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        if (frequency === 'realtime') {
            // Sync on every data change (already handled in saveData method)
            this.autoSyncEnabled = true;
			this.syncInterval = null;
		} else if (frequency === 'minute') {
			this.syncInterval = setInterval(() => {
				this.syncWithGoogleSheets();
			}, 60 * 1000);
        } else if (frequency === 'hourly') {
            this.syncInterval = setInterval(() => {
                this.syncWithGoogleSheets();
            }, 60 * 60 * 1000); // 1 hour
        } else if (frequency === 'daily') {
            this.syncInterval = setInterval(() => {
                this.syncWithGoogleSheets();
            }, 24 * 60 * 60 * 1000); // 24 hours
		} else {
			// manual
			this.autoSyncEnabled = false;
			this.syncInterval = null;
        }
    }

    async syncWithGoogleSheets() {
        const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');
        
        if (!config.connected) {
            this.showNotification('Please connect to Google Sheets first', 'error');
            return;
        }

        this.showNotification('Syncing with Google Sheets...', 'info');
		this.updateSyncStatus('syncing', new Date());
        
        try {
            const data = this.getData();
            
			// Change detection: skip if unchanged
			const currentHash = this.generateDataHash(data);
			if (config.lastDataHash && config.lastDataHash === currentHash && config.syncFrequency !== 'realtime') {
				this.showNotification('No changes detected since last sync', 'info');
				this.updateSyncStatus('success', new Date());
				return;
			}
            
			let success = false;
			// If a Web App URL is configured, use it (most reliable)
			if (config.webAppUrl) {
				const payload = {
					action: 'updateSheets',
					data: {
						materials: this.createCSVData('materials', data.materials),
						racks: this.createCSVData('racks', data.racks),
						placements: this.createCSVData('placements', data.placements),
						summary: [
							['Metric', 'Value', 'Last Updated'],
							['Total Materials', data.materials.length, new Date().toLocaleString()],
							['Total Racks', data.racks.length, new Date().toLocaleString()],
							['Total Placements', data.placements.length, new Date().toLocaleString()],
							['Last Sync', new Date().toISOString(), new Date().toLocaleString()]
						]
					}
				};
				try {
					await fetch(config.webAppUrl, {
						method: 'POST',
						mode: 'no-cors',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(payload)
					});
					success = true; // assume success in no-cors
				} catch (err) {
					success = false;
				}
			} else {
				// Fallback to current direct helper (opens instruction window)
				success = await this.sendToGoogleSheets(config.sheetId, {
					materials: this.createCSVData('materials', data.materials),
					racks: this.createCSVData('racks', data.racks),
					placements: this.createCSVData('placements', data.placements)
				});
			}

            if (success) {
				// Update sync stats
                config.lastSync = new Date().toISOString();
				config.lastDataHash = currentHash;
				config.syncCount = (config.syncCount || 0) + 1;
				config.lastSyncStatus = 'success';
                localStorage.setItem('google_sheets_config', JSON.stringify(config));
				this.updateSyncStatus('success', new Date());
                this.showNotification('Data synced to Google Sheets successfully', 'success');
            } else {
				config.lastSyncStatus = 'error';
				localStorage.setItem('google_sheets_config', JSON.stringify(config));
				this.updateSyncStatus('error', new Date());
                this.showNotification('Failed to sync with Google Sheets. Please check your sheet permissions.', 'error');
            }
        } catch (error) {
            console.error('Google Sheets sync error:', error);
			this.updateSyncStatus('error', new Date());
            this.showNotification('Error syncing with Google Sheets: ' + error.message, 'error');
        }
    }

    createCSVData(type, dataArray) {
        if (dataArray.length === 0) return '';

        let headers = [];
        let rows = [];

        if (type === 'materials') {
            headers = ['ID', 'Part Number', 'Serial Number', 'Type', 'Description', 'Supplier', 'Date Received', 'Barcode', 'Created By', 'Timestamp'];
            rows = dataArray.map(item => [
                item.id,
                item.partNumber,
                item.serialNumber,
                item.type,
                item.description || '',
                item.supplier || '',
                item.dateReceived,
                item.barcode,
                item.createdBy || 'Unknown',
                new Date(item.timestamp).toLocaleString()
            ]);
        } else if (type === 'racks') {
            headers = ['ID', 'Zone', 'Row', 'Level', 'Code', 'Description', 'Barcode', 'Created By', 'Timestamp'];
            rows = dataArray.map(item => [
                item.id,
                item.zone,
                item.row,
                item.level,
                item.code,
                item.description || '',
                item.barcode,
                item.createdBy || 'Unknown',
                new Date(item.timestamp).toLocaleString()
            ]);
        } else if (type === 'placements') {
            headers = ['ID', 'Material ID', 'Rack ID', 'Material Barcode', 'Rack Barcode', 'User', 'Created By', 'Timestamp'];
            rows = dataArray.map(item => [
                item.id,
                item.materialId,
                item.rackId,
                item.materialBarcode,
                item.rackBarcode,
                item.user,
                item.createdBy || 'Unknown',
                new Date(item.timestamp).toLocaleString()
            ]);
        }

        return [headers, ...rows];
    }

    async sendToGoogleSheets(sheetId, data) {
        try {
            // Method 1: Try using Google Sheets API directly (requires CORS to be disabled or proper API setup)
            const apiKey = 'YOUR_GOOGLE_SHEETS_API_KEY'; // User would need to provide this
            
            // For now, we'll use a different approach - Google Apps Script Web App
            // The user needs to create a Google Apps Script with the following code:
            /*
            function doPost(e) {
                const data = JSON.parse(e.postData.contents);
                const ss = SpreadsheetApp.openById(data.sheetId);
                
                // Clear existing data and add new data for each sheet
                if (data.materials && data.materials.length > 0) {
                    const materialsSheet = ss.getSheetByName('Materials') || ss.insertSheet('Materials');
                    materialsSheet.clear();
                    materialsSheet.getRange(1, 1, data.materials.length, data.materials[0].length).setValues(data.materials);
                }
                
                if (data.racks && data.racks.length > 0) {
                    const racksSheet = ss.getSheetByName('Racks') || ss.insertSheet('Racks');
                    racksSheet.clear();
                    racksSheet.getRange(1, 1, data.racks.length, data.racks[0].length).setValues(data.racks);
                }
                
                if (data.placements && data.placements.length > 0) {
                    const placementsSheet = ss.getSheetByName('Placements') || ss.insertSheet('Placements');
                    placementsSheet.clear();
                    placementsSheet.getRange(1, 1, data.placements.length, data.placements[0].length).setValues(data.placements);
                }
                
                return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
            }
            */

            // For demonstration, we'll use a fallback method that works with public sheets
            const response = await this.updateGoogleSheetDirect(sheetId, data);
            return response;

        } catch (error) {
            console.error('Error sending to Google Sheets:', error);
            return false;
        }
    }

    async updateGoogleSheetDirect(sheetId, data) {
        try {
            const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');
            
            // Create properly formatted table data for each sheet
            let materialsTable = '';
            let racksTable = '';
            let placementsTable = '';
            
            // Format Materials as HTML table
            if (data.materials && data.materials.length > 0) {
                materialsTable = this.createHTMLTable('Materials', data.materials);
            }
            
            // Format Racks as HTML table
            if (data.racks && data.racks.length > 0) {
                racksTable = this.createHTMLTable('Racks', data.racks);
            }
            
            // Format Placements as HTML table
            if (data.placements && data.placements.length > 0) {
                placementsTable = this.createHTMLTable('Placements', data.placements);
            }
            
            // Create CSV data for copying
            let csvContent = '';
            
            // Materials section
            if (data.materials && data.materials.length > 0) {
                data.materials.forEach(row => {
                    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
                });
                csvContent += '\n';
            }
            
            // Racks section
            if (data.racks && data.racks.length > 0) {
                data.racks.forEach(row => {
                    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
                });
                csvContent += '\n';
            }
            
            // Placements section
            if (data.placements && data.placements.length > 0) {
                data.placements.forEach(row => {
                    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
                });
            }

            // Respect quiet mode: do not open window if webAppUrl or quiet flag is set
            if (config.webAppUrl || config.quietSync) {
                return false; // skip opening helper window
            }

            // Open enhanced Google Sheets integration window (manual helper)
            const instructionsWindow = window.open('', '_blank');
            if (!instructionsWindow) {
                return false;
            }
            instructionsWindow.document.write(`
                <html>
                    <head>
                        <title>Aviation Warehouse - Google Sheets Integration</title>
                        <style>
                            body { 
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                                padding: 20px; 
                                max-width: 1200px; 
                                margin: 0 auto; 
                                background: #f8f9fa;
                            }
                            .header {
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                padding: 30px;
                                border-radius: 10px;
                                margin-bottom: 30px;
                                text-align: center;
                            }
                            .step { 
                                margin: 20px 0; 
                                padding: 20px; 
                                background: white; 
                                border-radius: 10px; 
                                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            }
                            .step h3 {
                                color: #333;
                                margin-top: 0;
                                border-bottom: 2px solid #667eea;
                                padding-bottom: 10px;
                            }
                            .table-container { 
                                background: #fff; 
                                border: 1px solid #ddd; 
                                border-radius: 8px;
                                margin: 15px 0; 
                                max-height: 400px; 
                                overflow: auto;
                                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                            }
                            .data-table { 
                                width: 100%; 
                                border-collapse: collapse; 
                                font-size: 12px;
                            }
                            .data-table th { 
                                background: #667eea; 
                                color: white; 
                                padding: 12px 8px; 
                                text-align: left; 
                                font-weight: 600;
                                position: sticky;
                                top: 0;
                                z-index: 10;
                            }
                            .data-table td { 
                                padding: 10px 8px; 
                                border-bottom: 1px solid #eee;
                                vertical-align: top;
                            }
                            .data-table tr:hover { 
                                background: #f8f9ff; 
                            }
                            .button { 
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white; 
                                padding: 12px 24px; 
                                border: none; 
                                border-radius: 6px; 
                                cursor: pointer; 
                                margin: 8px; 
                                font-size: 14px;
                                font-weight: 500;
                                transition: all 0.3s ease;
                                text-decoration: none;
                                display: inline-block;
                            }
                            .button:hover { 
                                transform: translateY(-2px);
                                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                            }
                            .button.secondary {
                                background: #6c757d;
                            }
                            .button.success {
                                background: #28a745;
                            }
                            .tabs {
                                display: flex;
                                margin-bottom: 20px;
                                border-bottom: 2px solid #eee;
                            }
                            .tab {
                                padding: 12px 24px;
                                cursor: pointer;
                                border-bottom: 3px solid transparent;
                                transition: all 0.3s ease;
                                font-weight: 500;
                            }
                            .tab.active {
                                border-bottom-color: #667eea;
                                color: #667eea;
                            }
                            .tab-content {
                                display: none;
                            }
                            .tab-content.active {
                                display: block;
                            }
                            .stats {
                                display: flex;
                                gap: 20px;
                                margin: 20px 0;
                            }
                            .stat {
                                background: white;
                                padding: 15px;
                                border-radius: 8px;
                                text-align: center;
                                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                                flex: 1;
                            }
                            .stat-number {
                                font-size: 24px;
                                font-weight: bold;
                                color: #667eea;
                            }
                            .stat-label {
                                font-size: 12px;
                                color: #666;
                                margin-top: 5px;
                            }
                            .copy-success {
                                background: #d4edda;
                                color: #155724;
                                padding: 10px;
                                border-radius: 5px;
                                margin: 10px 0;
                                display: none;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>🛩️ Aviation Warehouse Management System</h1>
                            <p>Google Sheets Integration Dashboard</p>
                            <div class="stats">
                                <div class="stat">
                                    <div class="stat-number">${data.materials ? data.materials.length - 1 : 0}</div>
                                    <div class="stat-label">Materials</div>
                                </div>
                                <div class="stat">
                                    <div class="stat-number">${data.racks ? data.racks.length - 1 : 0}</div>
                                    <div class="stat-label">Racks</div>
                                </div>
                                <div class="stat">
                                    <div class="stat-number">${data.placements ? data.placements.length - 1 : 0}</div>
                                    <div class="stat-label">Placements</div>
                                </div>
                            </div>
                        </div>

                        <div class="step">
                            <h3>📊 Data Preview & Actions</h3>
                            <div class="tabs">
                                <div class="tab active" onclick="showTab('materials')">Materials</div>
                                <div class="tab" onclick="showTab('racks')">Racks</div>
                                <div class="tab" onclick="showTab('placements')">Placements</div>
                            </div>
                            
                            <div id="materials" class="tab-content active">
                                ${materialsTable}
                            </div>
                            <div id="racks" class="tab-content">
                                ${racksTable}
                            </div>
                            <div id="placements" class="tab-content">
                                ${placementsTable}
                            </div>
                            
                            <div style="margin-top: 20px;">
                                <button class="button success" onclick="copyAllData()">📋 Copy All Data</button>
                                <button class="button secondary" onclick="downloadCSV()">💾 Download CSV</button>
                                <a href="${config.sheetsUrl}" target="_blank" class="button">🔗 Open Google Sheet</a>
                            </div>
                            <div id="copySuccess" class="copy-success">
                                ✅ Data copied to clipboard! You can now paste it into your Google Sheet.
                            </div>
                        </div>

                        <div class="step">
                            <h3>🚀 Quick Setup Instructions</h3>
                            <ol style="line-height: 1.8;">
                                <li><strong>Copy the data</strong> using the "Copy All Data" button above</li>
                                <li><strong>Open your Google Sheet</strong> by clicking the "Open Google Sheet" link</li>
                                <li><strong>Select cell A1</strong> in your Google Sheet</li>
                                <li><strong>Paste the data</strong> (Ctrl+V or Cmd+V)</li>
                                <li><strong>Format as needed</strong> - Google Sheets will automatically create columns</li>
                            </ol>
                        </div>

                        <div class="step">
                            <h3>💡 Pro Tips</h3>
                            <ul style="line-height: 1.8;">
                                <li>Data is automatically formatted with headers for easy sorting and filtering</li>
                                <li>Each data type (Materials, Racks, Placements) is clearly separated</li>
                                <li>Timestamps are formatted for easy reading</li>
                                <li>Use Google Sheets' built-in filters and pivot tables for advanced analysis</li>
                                <li>Set up automatic syncing in the main application for real-time updates</li>
                            </ul>
                        </div>
                        
                        <script>
                            function showTab(tabName) {
                                // Hide all tab contents
                                document.querySelectorAll('.tab-content').forEach(content => {
                                    content.classList.remove('active');
                                });
                                document.querySelectorAll('.tab').forEach(tab => {
                                    tab.classList.remove('active');
                                });
                                
                                // Show selected tab
                                document.getElementById(tabName).classList.add('active');
                                event.target.classList.add('active');
                            }
                            
                            function copyAllData() {
                                const csvData = \`${csvContent}\`;
                                navigator.clipboard.writeText(csvData).then(function() {
                                    document.getElementById('copySuccess').style.display = 'block';
                                    setTimeout(() => {
                                        document.getElementById('copySuccess').style.display = 'none';
                                    }, 3000);
                                }).catch(function(err) {
                                    alert('Failed to copy data. Please try the download option.');
                                });
                            }
                            
                            function downloadCSV() {
                                const csvData = \`${csvContent}\`;
                                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'aviation_warehouse_data_' + new Date().toISOString().split('T')[0] + '.csv';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            }
                        </script>
                    </body>
                </html>
            `);
            
            return true;
        } catch (error) {
            console.error('Error in direct Google Sheets update:', error);
            return false;
        }
    }

    // Helper method to create HTML tables
    createHTMLTable(title, data) {
        if (!data || data.length === 0) return `<p>No ${title.toLowerCase()} data available.</p>`;
        
        const headers = data[0];
        const rows = data.slice(1);
        
        let tableHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${row.map(cell => `<td>${cell || ''}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        return tableHTML;
    }

    exportToGoogleSheets() {
        const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');
        
        if (!config.connected) {
            this.showNotification('Please connect to Google Sheets first', 'error');
            return;
        }

        this.syncWithGoogleSheets();
    }

    // Override saveData to include auto-sync
    saveData(data) {
        localStorage.setItem('warehouse_data', JSON.stringify(data));
        this.updateStats();
        this.displayAllData();

        // Auto-sync if real-time sync is enabled — only when Web App URL is configured
        const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');
        if (config.connected && config.syncFrequency === 'realtime' && config.webAppUrl) {
            setTimeout(() => {
                this.syncWithGoogleSheets();
            }, 1000); // Delay to avoid too frequent syncs
        }

        // Optional: Auto export to Excel (rate-limited)
        const prefs = JSON.parse(localStorage.getItem('user_prefs') || '{}');
        if (prefs.autoExcel && window.XLSX) {
            clearTimeout(this._excelTimer);
            this._excelTimer = setTimeout(() => {
                try { this.exportAllToExcel(); } catch (_) {}
            }, 1500);
        }
    }

    // Audit log display
    displayAuditLog() {
        const data = this.getData();
        const auditLog = data.auditLog || [];
        
        if (auditLog.length === 0) {
            return '<p>No audit entries found.</p>';
        }

        return auditLog
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50) // Show last 50 entries
            .map(entry => `
                <div class="audit-entry">
                    <div class="audit-header">
                        <span class="audit-action">${entry.action}</span>
                        <span class="audit-timestamp">${new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="audit-details">
                        <strong>User:</strong> ${this.escapeHtml(entry.user)} | 
                        <strong>Type:</strong> ${entry.entityType} | 
                        <strong>ID:</strong> ${entry.entityId}
                        ${Object.keys(entry.details).length > 0 ? `<br><strong>Details:</strong> ${JSON.stringify(entry.details)}` : ''}
                    </div>
                </div>
            `).join('');
    }

	// Compute a simple hash of the current data to detect changes between syncs
	generateDataHash(data) {
		const signature = JSON.stringify({
			materialsCount: data.materials.length,
			racksCount: data.racks.length,
			placementsCount: data.placements.length,
			lastMaterial: data.materials[data.materials.length - 1]?.timestamp || null,
			lastRack: data.racks[data.racks.length - 1]?.timestamp || null,
			lastPlacement: data.placements[data.placements.length - 1]?.timestamp || null
		});
		let hash = 0;
		for (let i = 0; i < signature.length; i++) {
			hash = ((hash << 5) - hash) + signature.charCodeAt(i);
			hash |= 0;
		}
		return hash.toString();
	}

	// Update sync status UI elements if present
	updateSyncStatus(status, timestamp) {
		const indicator = document.getElementById('sync-indicator');
		const statusEl = document.getElementById('sync-status');
		const lastSyncEl = document.getElementById('last-sync-time');

		if (indicator) {
			indicator.className = `sync-indicator sync-indicator--${status}`;
			indicator.textContent = status === 'success' ? '✅ Synced' : status === 'syncing' ? '🔄 Syncing...' : status === 'error' ? '❌ Error' : '⚪ Not Connected';
		}
		if (statusEl) {
			statusEl.textContent = status === 'success' ? '✅ Synced' : status === 'syncing' ? '🔄 Syncing' : status === 'error' ? '❌ Error' : 'Disconnected';
			statusEl.className = `status ${status === 'success' ? 'status--success' : status === 'error' ? 'status--error' : 'status--info'}`;
		}
		if (lastSyncEl && timestamp) {
			lastSyncEl.textContent = `Last sync: ${timestamp.toLocaleString()}`;
		}
	}

	// Configure automatic sync behavior
	configureAutoSync(settings) {
		const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');
		config.autoSync = !!settings.enabled;
		if (settings.frequency) config.syncFrequency = settings.frequency;
		if (settings.webAppUrl) config.webAppUrl = settings.webAppUrl;
		localStorage.setItem('google_sheets_config', JSON.stringify(config));

		if (config.autoSync) {
			this.setupAutoSync(config.syncFrequency || 'manual');
			this.showNotification('Automatic sync enabled', 'success');
		} else {
			if (this.syncInterval) clearInterval(this.syncInterval);
			this.syncInterval = null;
			this.showNotification('Automatic sync disabled', 'info');
		}
	}

	getSyncStats() {
		const config = JSON.parse(localStorage.getItem('google_sheets_config') || '{}');
		return {
			enabled: !!config.autoSync,
			frequency: config.syncFrequency || 'manual',
			lastSync: config.lastSync ? new Date(config.lastSync) : null,
			syncCount: config.syncCount || 0,
			status: config.lastSyncStatus || 'info'
		};
    }
}

// Initialize the application
let warehouseManager;

// Auto-sync configuration functions
window.configureAutoSync = function(settings) {
    if (warehouseManager) {
        warehouseManager.configureAutoSync(settings);
    }
};

window.getSyncStats = function() {
    return warehouseManager ? warehouseManager.getSyncStats() : null;
};

// Quick undo handler
window.undoLastPlacement = function() {
    if (warehouseManager) {
        warehouseManager.undoLastPlacement();
    }
};

window.showAutoSyncSetup = function() {
    // Open the complete setup guide
    window.open('COMPLETE_SETUP_GUIDE.md', '_blank');
};

// Global functions for HTML onclick handlers
window.switchTab = function(tabName) {
    if (warehouseManager) {
        warehouseManager.switchTab(tabName);
    }
};

window.clearForm = function(formId) {
    if (warehouseManager) {
        warehouseManager.clearForm(formId);
    }
};

window.processMaterialBarcode = function() {
    if (warehouseManager) {
        warehouseManager.processMaterialBarcode();
    }
};

window.processRackBarcode = function() {
    if (warehouseManager) {
        warehouseManager.processRackBarcode();
    }
};

window.confirmPlacement = function() {
    if (warehouseManager) {
        warehouseManager.confirmPlacement();
    }
};

window.resetPlacement = function() {
    if (warehouseManager) {
        warehouseManager.resetPlacement();
    }
};

window.printBarcode = function(canvasId) {
    if (warehouseManager) {
        warehouseManager.printBarcode(canvasId);
    }
};

window.downloadCertificate = function() {
    if (warehouseManager) {
        warehouseManager.downloadCertificate();
    }
};

window.exportToCSV = function(type) {
    if (warehouseManager) {
        warehouseManager.exportToCSV(type);
    }
};

window.exportAllData = function() {
    if (warehouseManager) {
        warehouseManager.exportAllData();
    }
};

window.importData = function() {
    if (warehouseManager) {
        warehouseManager.importData();
    }
};

window.clearAllData = function() {
    if (warehouseManager) {
        warehouseManager.clearAllData();
    }
};

window.hideNotification = function() {
    if (warehouseManager) {
        warehouseManager.hideNotification();
    }
};

window.createBackup = function() {
    if (warehouseManager) {
        warehouseManager.createBackup();
    }
};

window.setSearchFilter = function(type, query) {
    if (warehouseManager) {
        warehouseManager.setSearchFilter(type, query);
    }
};

window.changePage = function(type, page) {
    if (warehouseManager) {
        warehouseManager.changePage(type, page);
    }
};

// Camera Scanner Functions
window.openBarcodeScanner = function(type) {
    if (warehouseManager) {
        warehouseManager.openBarcodeScanner(type);
    }
};

window.closeBarcodeScanner = function() {
    if (warehouseManager) {
        warehouseManager.closeBarcodeScanner();
    }
};

window.switchCamera = function() {
    if (warehouseManager) {
        warehouseManager.switchCamera();
    }
};

// Google Sheets Functions
window.connectGoogleSheets = function() {
    if (warehouseManager) {
        warehouseManager.connectGoogleSheets();
    }
};

window.syncWithGoogleSheets = function() {
    if (warehouseManager) {
        warehouseManager.syncWithGoogleSheets();
    }
};

window.exportToGoogleSheets = function() {
    if (warehouseManager) {
        warehouseManager.exportToGoogleSheets();
    }
};

window.exportAllToExcel = function() {
    if (warehouseManager) {
        warehouseManager.exportAllToExcel();
    }
};

// Microsoft Graph upload (OneDrive/SharePoint) — requires app registration
window.uploadExcelToOneDrive = async function() {
    try {
        if (!window.XLSX) { alert('Excel library not loaded'); return; }

        // 1) Create workbook in-memory (reuse exporter)
        const data = warehouseManager.getData();
        const wb = XLSX.utils.book_new();
        const matCols = ['id','partNumber','serialNumber','type','description','supplier','receptionMatricule','dateReceived','barcode','createdBy','timestamp'];
        const rackCols = ['id','zone','row','level','code','description','capacityNote','barcode','createdBy','timestamp'];
        const plcCols = ['id','materialId','rackId','materialBarcode','rackBarcode','user','magasinierMatricule','createdBy','timestamp'];
        const audCols = ['id','timestamp','user','action','entityType','entityId','details'];
        const mats = data.materials.map(m => matCols.reduce((o,k)=>{o[k]=m[k]||'';return o;},{}));
        const racks = data.racks.map(r => rackCols.reduce((o,k)=>{o[k]=r[k]||'';return o;},{}));
        const plcs = data.placements.map(p => plcCols.reduce((o,k)=>{o[k]=typeof p[k]==='object'?JSON.stringify(p[k]):(p[k]||'');return o;},{}));
        const audits = (data.auditLog||[]).map(a => audCols.reduce((o,k)=>{o[k]=typeof a[k]==='object'?JSON.stringify(a[k]):(a[k]||'');return o;},{}));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mats, { header: matCols }), 'Materials');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(racks, { header: rackCols }), 'Racks');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plcs, { header: plcCols }), 'Placements');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(audits, { header: audCols }), 'Audit');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

        // 2) Authenticate with MSAL (Public Client)
        const msalConfig = {
            auth: {
                clientId: 'YOUR_AZURE_AD_APP_CLIENT_ID', // Replace with your actual client ID
                authority: 'https://login.microsoftonline.com/consumers', // For personal Microsoft accounts
                redirectUri: window.location.origin
            }
        };
        const msalInstance = new msal.PublicClientApplication(msalConfig);
        
        try {
            const loginResp = await msalInstance.loginPopup({ 
                scopes: ['Files.ReadWrite.All', 'offline_access'],
                prompt: 'select_account'
            });
            const account = loginResp.account;
            const tokenResp = await msalInstance.acquireTokenSilent({ 
                scopes: ['Files.ReadWrite.All'], 
                account 
            }).catch(() => msalInstance.acquireTokenPopup({ 
                scopes: ['Files.ReadWrite.All'] 
            }));
            const token = tokenResp.accessToken;

        // 3) Upload to OneDrive root (or your SharePoint drive)
        const fileName = `warehouse_${new Date().toISOString().replace(/[:.]/g,'-')}.xlsx`;
        const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(fileName)}:/content`;
        const resp = await fetch(uploadUrl, { 
            method: 'PUT', 
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            }, 
            body: wbout 
        });

        if (!resp.ok) { throw new Error('Upload failed: ' + resp.status); }
        alert('Uploaded to OneDrive: ' + fileName);
        } catch (err) {
            console.error(err);
            alert('OneDrive upload failed. Configure Azure AD client ID and try again.');
        }
    } catch (err) {
        console.error(err);
        alert('OneDrive upload failed. Configure Azure AD client ID and try again.');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    warehouseManager = new WarehouseManager();
    // Register service worker for PWA/offline
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
});

// Global search: Enter key triggers a cross-entity filter
window.globalSearchEnter = function(e) {
    if (e && e.key === 'Enter') {
        const val = e.target.value || '';
        if (warehouseManager) {
            warehouseManager.setSearchFilter('materials', val);
            warehouseManager.setSearchFilter('racks', val);
            warehouseManager.setSearchFilter('placements', val);
        }
    }
};

// Bulk reception: simple paste JSON/CSV scaffold
window.openBulkReception = function() {
    const hint = 'Paste JSON array of materials (partNumber, serialNumber, type, supplier, description, dateReceived, receptionMatricule).';
    const input = prompt(hint + '\nExample: [{"partNumber":"PN-1","serialNumber":"SN-1"}]');
    if (!input) return;
    try {
        const arr = JSON.parse(input);
        if (!Array.isArray(arr)) throw new Error('Invalid data');
        const data = warehouseManager.getData();
        const now = new Date().toISOString();
        arr.forEach(item => {
            const pn = warehouseManager.sanitizeInput(String(item.partNumber||'').trim());
            const sn = warehouseManager.sanitizeInput(String(item.serialNumber||'').trim());
            if (!pn || !sn) return;
            const id = warehouseManager.generateId('MAT');
            const barcode = `${id}-${pn}-${sn}`;
            data.materials.push({
                id,
                partNumber: pn,
                serialNumber: sn,
                type: String(item.type||'Electronic'),
                description: String(item.description||''),
                supplier: String(item.supplier||''),
                receptionMatricule: String(item.receptionMatricule||''),
                dateReceived: String(item.dateReceived||new Date().toISOString().split('T')[0]),
                barcode,
                timestamp: now,
                createdBy: warehouseManager.currentUser
            });
        });
        warehouseManager.saveData(data);
        alert('Bulk reception completed.');
    } catch (err) {
        alert('Invalid JSON. Please try again.');
    }
};

// Modal-based bulk reception with CSV/JSON parsing
window.openBulkReceptionModal = function() {
    const modal = document.getElementById('bulk-modal');
    if (modal) modal.style.display = 'flex';
};

window.closeBulkReceptionModal = function() {
    const modal = document.getElementById('bulk-modal');
    if (modal) modal.style.display = 'none';
    const file = document.getElementById('bulk-file');
    const text = document.getElementById('bulk-text');
    if (file) file.value = '';
    if (text) text.value = '';
};

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const cols = line.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
        return obj;
    });
}

function toArray(input) {
    if (!input) return [];
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
        const asJson = JSON.parse(trimmed);
        return Array.isArray(asJson) ? asJson : [];
    } catch (_) {
        // Try CSV
        return parseCSV(trimmed);
    }
}

window.importBulkReception = function() {
    const fileEl = document.getElementById('bulk-file');
    const textEl = document.getElementById('bulk-text');

    const process = (rows) => {
        if (!rows || rows.length === 0) { alert('No rows found.'); return; }
        const data = warehouseManager.getData();
        let added = 0;
        rows.forEach(item => {
            const pn = warehouseManager.sanitizeInput(String(item.partNumber||'').trim());
            const sn = warehouseManager.sanitizeInput(String(item.serialNumber||'').trim());
            if (!pn || !sn) return;

            // Skip duplicates PN+SN
            const exists = data.materials.some(m => m.partNumber === pn && m.serialNumber === sn);
            if (exists) return;

            const id = warehouseManager.generateId('MAT');
            const barcode = `${id}-${pn}-${sn}`;
            data.materials.push({
                id,
                partNumber: pn,
                serialNumber: sn,
                type: String(item.type||'Electronic'),
                description: String(item.description||''),
                supplier: String(item.supplier||''),
                receptionMatricule: String(item.receptionMatricule||''),
                dateReceived: String(item.dateReceived||new Date().toISOString().split('T')[0]),
                barcode,
                timestamp: new Date().toISOString(),
                createdBy: warehouseManager.currentUser
            });
            added++;
        });
        warehouseManager.saveData(data);
        alert(`Imported ${added} materials.`);
        closeBulkReceptionModal();
    };

    if (fileEl && fileEl.files && fileEl.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const rows = parseCSV(e.target.result || '');
            process(rows);
        };
        reader.readAsText(fileEl.files[0]);
        return;
    }

    const rows = toArray(textEl ? textEl.value : '');
    process(rows);
};

// Prompt to set capacity note for a rack by code
window.promptRackCapacity = function() {
    const code = prompt('Enter rack code to set capacity note (e.g., A-01-01)');
    if (!code) return;
    const note = prompt('Enter capacity note for ' + code + ' (e.g., Max 20 items / Bulky only)');
    if (note === null) return;
    const data = warehouseManager.getData();
    const rack = data.racks.find(r => (r.code||'').toLowerCase() === code.toLowerCase());
    if (!rack) { alert('Rack not found'); return; }
    rack.capacityNote = note;
    warehouseManager.saveData(data);
    warehouseManager.addAuditEntry('UPDATE', 'RACK', rack.id, { capacityNote: note });
    alert('Capacity note saved for ' + rack.code);
};

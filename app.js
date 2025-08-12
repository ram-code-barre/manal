// Aviation Warehouse Management System JavaScript

class WarehouseManager {
    constructor() {
        this.currentPlacement = {};
        this.init();
    }

    init() {
        this.initializeData();
        this.setupEventListeners();
        this.updateStats();
        this.displayAllData();
        this.setCurrentDate();
    }

    // Data Management
    initializeData() {
        if (!localStorage.getItem('warehouse_data')) {
            const initialData = {
                materials: [],
                racks: [],
                placements: []
            };
            localStorage.setItem('warehouse_data', JSON.stringify(initialData));
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem('warehouse_data'));
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

        const partNumber = partNumberEl.value.trim();
        const serialNumber = serialNumberEl.value.trim();
        const materialType = materialTypeEl ? materialTypeEl.value : 'Electronic';
        const description = descriptionEl ? descriptionEl.value.trim() : '';
        const supplier = supplierEl ? supplierEl.value.trim() : '';
        const dateReceived = dateReceivedEl ? dateReceivedEl.value : new Date().toISOString().split('T')[0];

        if (!partNumber || !serialNumber) {
            this.showNotification('Part Number and Serial Number are required', 'error');
            return;
        }

        const data = this.getData();
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
            timestamp: new Date().toISOString()
        };

        data.materials.push(material);
        this.saveData(data);

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

        const zone = zoneEl.value;
        const row = rowEl.value;
        const level = levelEl.value;
        const rackDescription = rackDescriptionEl ? rackDescriptionEl.value.trim() : '';

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
            timestamp: new Date().toISOString()
        };

        data.racks.push(rack);
        this.saveData(data);

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
        const rack = data.racks.find(r => r.barcode === barcode);
        
        if (!rack) {
            this.showNotification('Rack location not found', 'error');
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
        const placementId = this.generateId('PLACE');
        
        const placement = {
            id: placementId,
            materialId: this.currentPlacement.material.id,
            rackId: this.currentPlacement.rack.id,
            materialBarcode: this.currentPlacement.material.barcode,
            rackBarcode: this.currentPlacement.rack.barcode,
            timestamp: new Date().toISOString(),
            user: 'User'
        };

        data.placements.push(placement);
        this.saveData(data);

        this.showNotification('Placement recorded successfully', 'success');
        this.displayPlacements();
        this.resetPlacement();
    }

    resetPlacement() {
        this.currentPlacement = {};
        
        const materialBarcodeInput = document.getElementById('material-barcode-input');
        const rackBarcodeInput = document.getElementById('rack-barcode-input');
        const selectedMaterialDisplay = document.getElementById('selected-material-display');
        const placementConfirmation = document.getElementById('placement-confirmation');
        
        if (materialBarcodeInput) materialBarcodeInput.value = '';
        if (rackBarcodeInput) rackBarcodeInput.value = '';
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
        const data = this.getData();
        const container = document.getElementById('materials-display');
        
        if (!container) return;
        
        if (data.materials.length === 0) {
            container.innerHTML = '<p>No materials registered yet.</p>';
            return;
        }

        container.innerHTML = data.materials
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10)
            .map(material => `
                <div class="item-card">
                    <div class="item-header">
                        <span class="item-title">${material.partNumber} - ${material.serialNumber}</span>
                        <span class="item-timestamp">${new Date(material.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div class="item-details">
                        <div class="item-detail"><strong>Type:</strong> ${material.type}</div>
                        <div class="item-detail"><strong>ID:</strong> ${material.id}</div>
                        <div class="item-detail"><strong>Supplier:</strong> ${material.supplier || 'N/A'}</div>
                        <div class="item-detail"><strong>Barcode:</strong> ${material.barcode}</div>
                    </div>
                    ${material.description ? `<div class="item-detail"><strong>Description:</strong> ${material.description}</div>` : ''}
                </div>
            `).join('');
    }

    displayRacks() {
        const data = this.getData();
        const container = document.getElementById('racks-display');
        
        if (!container) return;
        
        if (data.racks.length === 0) {
            container.innerHTML = '<p>No rack locations created yet.</p>';
            return;
        }

        container.innerHTML = data.racks
            .sort((a, b) => a.code.localeCompare(b.code))
            .map(rack => `
                <div class="item-card">
                    <div class="item-header">
                        <span class="item-title">${rack.code}</span>
                        <span class="item-timestamp">${new Date(rack.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div class="item-details">
                        <div class="item-detail"><strong>Zone:</strong> ${rack.zone}</div>
                        <div class="item-detail"><strong>Row:</strong> ${rack.row}</div>
                        <div class="item-detail"><strong>Level:</strong> ${rack.level}</div>
                        <div class="item-detail"><strong>ID:</strong> ${rack.id}</div>
                    </div>
                    ${rack.description ? `<div class="item-detail"><strong>Description:</strong> ${rack.description}</div>` : ''}
                </div>
            `).join('');
    }

    displayPlacements() {
        const data = this.getData();
        const container = document.getElementById('placements-display');
        
        if (!container) return;
        
        if (data.placements.length === 0) {
            container.innerHTML = '<p>No placements recorded yet.</p>';
            return;
        }

        container.innerHTML = data.placements
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10)
            .map(placement => {
                const material = data.materials.find(m => m.id === placement.materialId);
                const rack = data.racks.find(r => r.id === placement.rackId);
                
                return `
                    <div class="item-card">
                        <div class="item-header">
                            <span class="item-title">Placement ${placement.id}</span>
                            <span class="item-timestamp">${new Date(placement.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="item-details">
                            <div class="item-detail"><strong>Material:</strong> ${material ? `${material.partNumber} (${material.serialNumber})` : 'N/A'}</div>
                            <div class="item-detail"><strong>Location:</strong> ${rack ? rack.code : 'N/A'}</div>
                            <div class="item-detail"><strong>User:</strong> ${placement.user}</div>
                        </div>
                    </div>
                `;
            }).join('');
    }

    displayDataTables() {
        const data = this.getData();
        
        this.displayTable('materials-table', data.materials, [
            'id', 'partNumber', 'serialNumber', 'type', 'supplier', 'dateReceived', 'barcode'
        ]);
        
        this.displayTable('racks-table', data.racks, [
            'id', 'zone', 'row', 'level', 'code', 'description', 'barcode'
        ]);
        
        this.displayTable('placements-table', data.placements, [
            'id', 'materialId', 'rackId', 'materialBarcode', 'rackBarcode', 'user', 'timestamp'
        ]);
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
                    placements: []
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
}

// Initialize the application
let warehouseManager;

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

document.addEventListener('DOMContentLoaded', () => {
    warehouseManager = new WarehouseManager();
});
// Excel Exporter for Aviation Warehouse Management System
// Exports database tables to Excel files with proper formatting

class ExcelExporter {
    constructor() {
        this.workbook = null;
        this.worksheet = null;
        this.currentRow = 1;
        this.styles = this.initializeStyles();
    }

    // Initialize default styles for Excel
    initializeStyles() {
        return {
            header: {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { rgb: '4472C4' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
            },
            subHeader: {
                font: { bold: true, color: { rgb: '000000' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'D9E1F2' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
            },
            data: {
                border: {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                },
                alignment: { vertical: 'middle' }
            },
            number: {
                border: {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                },
                alignment: { horizontal: 'right', vertical: 'middle' },
                numFmt: '#,##0'
            },
            date: {
                border: {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                },
                alignment: { horizontal: 'center', vertical: 'middle' },
                numFmt: 'dd/mm/yyyy hh:mm'
            },
            status: {
                border: {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                },
                alignment: { horizontal: 'center', vertical: 'middle' }
            }
        };
    }

    // Export single table to Excel
    async exportTableToExcel(tableName, data, options = {}) {
        try {
            console.log(`Exporting table ${tableName} with ${data.length} records...`);
            
            // Create workbook and worksheet
            this.workbook = new ExcelJS.Workbook();
            this.worksheet = this.workbook.addWorksheet(tableName);
            
            // Set up worksheet properties
            this.setupWorksheet(tableName, options);
            
            // Add title and metadata
            this.addTitle(tableName, options);
            this.addMetadata(data, options);
            
            // Add headers
            this.addHeaders(data, options);
            
            // Add data rows
            this.addDataRows(data, options);
            
            // Auto-fit columns
            this.autoFitColumns();
            
            // Add summary and statistics
            this.addSummary(data, options);
            
            // Generate and download file
            return await this.generateAndDownload(tableName);
            
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    // Export multiple tables to separate worksheets
    async exportMultipleTablesToExcel(tablesData, options = {}) {
        try {
            console.log(`Exporting ${Object.keys(tablesData).length} tables...`);
            
            // Create workbook
            this.workbook = new ExcelJS.Workbook();
            this.workbook.creator = 'Aviation Warehouse System';
            this.workbook.lastModifiedBy = 'System';
            this.workbook.created = new Date();
            this.workbook.modified = new Date();
            
            // Add each table as a worksheet
            for (const [tableName, data] of Object.entries(tablesData)) {
                this.worksheet = this.workbook.addWorksheet(tableName);
                this.currentRow = 1;
                
                this.setupWorksheet(tableName, options);
                this.addTitle(tableName, options);
                this.addMetadata(data, options);
                this.addHeaders(data, options);
                this.addDataRows(data, options);
                this.autoFitColumns();
                this.addSummary(data, options);
            }
            
            // Add summary worksheet
            this.addSummaryWorksheet(tablesData, options);
            
            // Generate and download file
            return await this.generateAndDownload('Warehouse_Complete_Export');
            
        } catch (error) {
            console.error('Multi-table export failed:', error);
            throw error;
        }
    }

    // Setup worksheet properties
    setupWorksheet(tableName, options) {
        // Set column widths based on table type
        const columnWidths = this.getColumnWidths(tableName);
        this.worksheet.columns = columnWidths;
        
        // Set page setup
        this.worksheet.pageSetup.paperSize = 9; // A4
        this.worksheet.pageSetup.orientation = 'landscape';
        this.worksheet.pageSetup.fitToPage = true;
        this.worksheet.pageSetup.fitToWidth = 1;
        this.worksheet.pageSetup.fitToHeight = 0;
        
        // Set margins
        this.worksheet.pageSetup.margins = {
            top: 0.5,
            left: 0.5,
            bottom: 0.5,
            right: 0.5,
            header: 0.3,
            footer: 0.3
        };
    }

    // Get appropriate column widths for different table types
    getColumnWidths(tableName) {
        const defaultWidths = {
            materials: [
                { key: 'id', width: 15 },
                { key: 'part_number', width: 20 },
                { key: 'serial_number', width: 20 },
                { key: 'type', width: 15 },
                { key: 'description', width: 30 },
                { key: 'supplier', width: 20 },
                { key: 'quantity', width: 12 },
                { key: 'unit', width: 10 },
                { key: 'location', width: 15 },
                { key: 'condition_status', width: 15 },
                { key: 'created_at', width: 20 },
                { key: 'updated_at', width: 20 }
            ],
            racks: [
                { key: 'id', width: 15 },
                { key: 'code', width: 15 },
                { key: 'zone', width: 15 },
                { key: 'level', width: 12 },
                { key: 'position', width: 15 },
                { key: 'description', width: 25 },
                { key: 'capacity', width: 12 },
                { key: 'current_usage', width: 15 },
                { key: 'status', width: 15 },
                { key: 'security_level', width: 15 }
            ],
            placements: [
                { key: 'id', width: 15 },
                { key: 'material_id', width: 15 },
                { key: 'rack_id', width: 15 },
                { key: 'quantity', width: 12 },
                { key: 'placement_date', width: 20 },
                { key: 'status', width: 15 },
                { key: 'notes', width: 25 }
            ],
            audit_log: [
                { key: 'id', width: 15 },
                { key: 'timestamp', width: 20 },
                { key: 'user_id', width: 15 },
                { key: 'action', width: 15 },
                { key: 'entity_type', width: 15 },
                { key: 'entity_id', width: 15 },
                { key: 'details', width: 30 }
            ]
        };
        
        return defaultWidths[tableName] || defaultWidths.materials;
    }

    // Add title to worksheet
    addTitle(tableName, options) {
        const title = options.title || `${tableName.charAt(0).toUpperCase() + tableName.slice(1)} Report`;
        
        // Add title row
        const titleRow = this.worksheet.addRow([title]);
        titleRow.height = 30;
        titleRow.getCell(1).font = { size: 16, bold: true };
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Merge title cells
        this.worksheet.mergeCells(`A${this.currentRow}:Z${this.currentRow}`);
        
        this.currentRow += 2;
    }

    // Add metadata information
    addMetadata(data, options) {
        const metadata = [
            ['Generated Date:', new Date().toLocaleString()],
            ['Total Records:', data.length],
            ['Generated By:', options.user || 'System'],
            ['Report Type:', options.reportType || 'Standard Export']
        ];
        
        metadata.forEach(([label, value]) => {
            const row = this.worksheet.addRow([label, value]);
            row.getCell(1).font = { bold: true };
            row.getCell(2).font = { italic: true };
        });
        
        this.currentRow += metadata.length + 1;
    }

    // Add headers to worksheet
    addHeaders(data, options) {
        if (data.length === 0) return;
        
        // Get headers from first data item
        const headers = Object.keys(data[0]);
        
        // Add header row
        const headerRow = this.worksheet.addRow(headers);
        headerRow.height = 25;
        
        // Apply header styling
        headers.forEach((header, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.style = this.styles.header;
            cell.value = this.formatHeaderName(header);
        });
        
        this.currentRow++;
    }

    // Format header names for better readability
    formatHeaderName(header) {
        return header
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Add data rows to worksheet
    addDataRows(data, options) {
        data.forEach((rowData, rowIndex) => {
            const row = this.worksheet.addRow(Object.values(rowData));
            row.height = 20;
            
            // Apply styling to each cell
            Object.values(rowData).forEach((value, colIndex) => {
                const cell = row.getCell(colIndex + 1);
                this.applyCellStyling(cell, value, colIndex);
            });
        });
        
        this.currentRow += data.length;
    }

    // Apply appropriate styling to cells based on data type
    applyCellStyling(cell, value, columnIndex) {
        // Determine data type and apply appropriate styling
        if (value === null || value === undefined) {
            cell.value = '';
            cell.style = this.styles.data;
        } else if (typeof value === 'number') {
            cell.style = this.styles.number;
        } else if (value instanceof Date || this.isDateString(value)) {
            cell.style = this.styles.date;
            if (typeof value === 'string') {
                cell.value = new Date(value);
            }
        } else if (this.isStatusField(value)) {
            cell.style = this.styles.status;
            this.applyStatusColor(cell, value);
        } else {
            cell.style = this.styles.data;
        }
    }

    // Check if value is a date string
    isDateString(value) {
        if (typeof value !== 'string') return false;
        const date = new Date(value);
        return !isNaN(date.getTime()) && value.includes('-');
    }

    // Check if value is a status field
    isStatusField(value) {
        if (typeof value !== 'string') return false;
        const statusValues = ['Active', 'Inactive', 'Pending', 'Completed', 'Cancelled', 'New', 'Good', 'Fair', 'Poor', 'Damaged'];
        return statusValues.includes(value);
    }

    // Apply color coding to status fields
    applyStatusColor(cell, value) {
        const statusColors = {
            'Active': '90EE90',    // Light green
            'Good': '90EE90',      // Light green
            'New': '87CEEB',       // Light blue
            'Pending': 'FFD700',   // Gold
            'Fair': 'FFA500',      // Orange
            'Poor': 'FF6347',      // Tomato
            'Damaged': 'DC143C',   // Crimson
            'Inactive': 'D3D3D3',  // Light gray
            'Cancelled': 'FF0000'  // Red
        };
        
        if (statusColors[value]) {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { rgb: statusColors[value] }
            };
        }
    }

    // Auto-fit columns
    autoFitColumns() {
        this.worksheet.columns.forEach(column => {
            if (column.width) {
                column.width = Math.min(Math.max(column.width, 8), 50);
            }
        });
    }

    // Add summary information
    addSummary(data, options) {
        if (data.length === 0) return;
        
        this.currentRow += 2;
        
        // Add summary section
        const summaryRow = this.worksheet.addRow(['Summary Information']);
        summaryRow.getCell(1).font = { bold: true, size: 14 };
        summaryRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { rgb: 'E6E6FA' }
        };
        
        this.currentRow++;
        
        // Add summary statistics
        const summaryStats = this.calculateSummaryStats(data);
        Object.entries(summaryStats).forEach(([key, value]) => {
            const row = this.worksheet.addRow([key, value]);
            row.getCell(1).font = { bold: true };
        });
        
        this.currentRow += summaryStats.length + 1;
    }

    // Calculate summary statistics for data
    calculateSummaryStats(data) {
        const stats = {
            'Total Records': data.length,
            'Export Date': new Date().toLocaleDateString(),
            'Export Time': new Date().toLocaleTimeString()
        };
        
        // Add specific stats based on data type
        if (data.length > 0) {
            const firstItem = data[0];
            
            if (firstItem.quantity !== undefined) {
                const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
                stats['Total Quantity'] = totalQuantity;
            }
            
            if (firstItem.created_at !== undefined) {
                const dates = data.map(item => new Date(item.created_at || item.updated_at)).filter(date => !isNaN(date.getTime()));
                if (dates.length > 0) {
                    const oldestDate = new Date(Math.min(...dates));
                    const newestDate = new Date(Math.max(...dates));
                    stats['Date Range'] = `${oldestDate.toLocaleDateString()} - ${newestDate.toLocaleDateString()}`;
                }
            }
        }
        
        return stats;
    }

    // Add summary worksheet for multi-table exports
    addSummaryWorksheet(tablesData, options) {
        this.worksheet = this.workbook.addWorksheet('Summary');
        this.currentRow = 1;
        
        // Add title
        const titleRow = this.worksheet.addRow(['Warehouse System Complete Export Summary']);
        titleRow.getCell(1).font = { size: 16, bold: true };
        titleRow.getCell(1).alignment = { horizontal: 'center' };
        this.worksheet.mergeCells(`A${this.currentRow}:Z${this.currentRow}`);
        
        this.currentRow += 2;
        
        // Add table summary
        const summaryHeaders = ['Table Name', 'Record Count', 'Last Updated', 'Status'];
        const headerRow = this.worksheet.addRow(summaryHeaders);
        headerRow.getCell(1).style = this.styles.header;
        headerRow.getCell(2).style = this.styles.header;
        headerRow.getCell(3).style = this.styles.header;
        headerRow.getCell(4).style = this.styles.header;
        
        this.currentRow++;
        
        // Add data for each table
        Object.entries(tablesData).forEach(([tableName, data]) => {
            const lastUpdated = data.length > 0 ? 
                new Date(Math.max(...data.map(item => new Date(item.created_at || item.updated_at || 0).getTime()))) : 
                new Date(0);
            
            const row = this.worksheet.addRow([
                tableName.charAt(0).toUpperCase() + tableName.slice(1),
                data.length,
                lastUpdated.toLocaleDateString(),
                data.length > 0 ? 'Active' : 'Empty'
            ]);
            
            // Apply status color
            if (data.length > 0) {
                row.getCell(4).style = this.styles.status;
                this.applyStatusColor(row.getCell(4), 'Active');
            }
        });
        
        // Auto-fit columns
        this.autoFitColumns();
    }

    // Generate Excel file and trigger download
    async generateAndDownload(filename) {
        try {
            // Generate buffer
            const buffer = await this.workbook.xlsx.writeBuffer();
            
            // Create blob and download
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(url);
            
            console.log(`Excel file generated successfully: ${filename}`);
            return { success: true, filename: link.download };
            
        } catch (error) {
            console.error('File generation failed:', error);
            throw error;
        }
    }

    // Export specific report types
    async exportInventoryReport(data, options = {}) {
        options.reportType = 'Inventory Report';
        options.title = 'Aviation Warehouse Inventory Report';
        return await this.exportTableToExcel('materials', data, options);
    }

    async exportRackUtilizationReport(data, options = {}) {
        options.reportType = 'Rack Utilization Report';
        options.title = 'Warehouse Rack Utilization Report';
        return await this.exportTableToExcel('racks', data, options);
    }

    async exportAuditTrailReport(data, options = {}) {
        options.reportType = 'Audit Trail Report';
        options.title = 'System Audit Trail Report';
        return await this.exportTableToExcel('audit_log', data, options);
    }

    // Export filtered data with custom options
    async exportFilteredData(tableName, data, filters, options = {}) {
        options.reportType = `Filtered ${tableName} Report`;
        options.title = `${tableName.charAt(0).toUpperCase() + tableName.slice(1)} Report - Filtered`;
        options.filters = filters;
        
        return await this.exportTableToExcel(tableName, data, options);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelExporter;
}

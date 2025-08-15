// Database and Excel Integration for Aviation Warehouse Management System
// Combines database operations with Excel export functionality

class DatabaseExcelIntegration {
    constructor() {
        this.databaseManager = new DatabaseManager();
        this.excelExporter = new ExcelExporter();
        this.initialized = false;
        this.init();
    }

    // Initialize the integration system
    async init() {
        try {
            // Initialize database tables
            await this.databaseManager.initializeTables();
            
            // Set current user
            this.databaseManager.setCurrentUser('Admin');
            
            this.initialized = true;
            console.log('Database and Excel integration initialized successfully');
            
            // Load sample data if tables are empty
            await this.loadSampleDataIfNeeded();
            
        } catch (error) {
            console.error('Integration initialization failed:', error);
            throw error;
        }
    }

    // Load sample data if tables are empty
    async loadSampleDataIfNeeded() {
        try {
            const stats = await this.databaseManager.getDatabaseStats();
            
            // Check if materials table is empty
            if (stats.materials.count === 0) {
                await this.loadSampleMaterials();
            }
            
            // Check if racks table is empty
            if (stats.racks.count === 0) {
                await this.loadSampleRacks();
            }
            
            // Check if suppliers table is empty
            if (stats.suppliers.count === 0) {
                await this.loadSampleSuppliers();
            }
            
            console.log('Sample data loaded successfully');
            
        } catch (error) {
            console.error('Failed to load sample data:', error);
        }
    }

    // Load sample materials data
    async loadSampleMaterials() {
        const sampleMaterials = [
            {
                part_number: 'AP-001',
                serial_number: 'SN-2024-001',
                type: 'Aircraft Part',
                description: 'Landing Gear Component',
                supplier: 'Aviation Parts Inc.',
                quantity: 5,
                unit: 'PCS',
                min_stock_level: 2,
                max_stock_level: 20,
                location: 'Zone A',
                condition_status: 'New',
                certification_required: true,
                certification_expiry: '2025-12-31'
            },
            {
                part_number: 'AP-002',
                serial_number: 'SN-2024-002',
                type: 'Engine Component',
                description: 'Turbine Blade Set',
                supplier: 'Global Aerospace',
                quantity: 3,
                unit: 'SET',
                min_stock_level: 1,
                max_stock_level: 10,
                location: 'Zone B',
                condition_status: 'Good',
                certification_required: true,
                certification_expiry: '2025-06-30'
            },
            {
                part_number: 'AP-003',
                serial_number: 'SN-2024-003',
                type: 'Avionics',
                description: 'Navigation System',
                supplier: 'Pacific Aviation',
                quantity: 2,
                unit: 'PCS',
                min_stock_level: 1,
                max_stock_level: 5,
                location: 'Zone C',
                condition_status: 'Good',
                certification_required: false
            }
        ];

        for (const material of sampleMaterials) {
            await this.databaseManager.addMaterial(material);
        }
    }

    // Load sample racks data
    async loadSampleRacks() {
        const sampleRacks = [
            {
                code: 'RACK-A1',
                zone: 'Zone A',
                level: 'Level 1',
                position: 'Position 1',
                description: 'High-value parts storage',
                capacity: 50,
                current_usage: 5,
                status: 'Active',
                temperature_controlled: true,
                humidity_controlled: true,
                security_level: 'High'
            },
            {
                code: 'RACK-B1',
                zone: 'Zone B',
                level: 'Level 1',
                position: 'Position 1',
                description: 'Engine components storage',
                capacity: 30,
                current_usage: 3,
                status: 'Active',
                temperature_controlled: false,
                humidity_controlled: true,
                security_level: 'Medium'
            },
            {
                code: 'RACK-C1',
                zone: 'Zone C',
                level: 'Level 1',
                position: 'Position 1',
                description: 'General parts storage',
                capacity: 100,
                current_usage: 2,
                status: 'Active',
                temperature_controlled: false,
                humidity_controlled: false,
                security_level: 'Low'
            }
        ];

        for (const rack of sampleRacks) {
            await this.databaseManager.addRack(rack);
        }
    }

    // Load sample suppliers data
    async loadSampleSuppliers() {
        const sampleSuppliers = [
            {
                name: 'Aviation Parts Inc.',
                code: 'API',
                contact_person: 'John Smith',
                email: 'john.smith@aviationparts.com',
                phone: '+1-555-0123',
                address: '123 Aviation Blvd, Los Angeles, CA 90210',
                country: 'USA',
                certification_required: true,
                rating: 'A'
            },
            {
                name: 'Global Aerospace',
                code: 'GAS',
                contact_person: 'Maria Schmidt',
                email: 'm.schmidt@globalaerospace.de',
                phone: '+49-30-1234567',
                address: '456 Aerospace Strasse, Berlin, Germany',
                country: 'Germany',
                certification_required: true,
                rating: 'A'
            },
            {
                name: 'Pacific Aviation',
                code: 'PAC',
                contact_person: 'Yuki Tanaka',
                email: 'y.tanaka@pacificaviation.jp',
                phone: '+81-3-1234-5678',
                address: '789 Aviation Street, Tokyo, Japan',
                country: 'Japan',
                certification_required: false,
                rating: 'B'
            }
        ];

        for (const supplier of sampleSuppliers) {
            await this.databaseManager.addSupplier(supplier);
        }
    }

    // CRUD Operations with Excel Export Integration

    // Add material and export to Excel
    async addMaterialWithExport(materialData, exportOptions = {}) {
        try {
            // Add to database
            const newMaterial = await this.databaseManager.addMaterial(materialData);
            
            // Export to Excel if requested
            if (exportOptions.exportAfterAdd) {
                const materials = await this.databaseManager.getMaterials();
                await this.excelExporter.exportInventoryReport(materials, {
                    ...exportOptions,
                    user: this.databaseManager.getCurrentUser()
                });
            }
            
            return newMaterial;
        } catch (error) {
            console.error('Failed to add material with export:', error);
            throw error;
        }
    }

    // Update material and export to Excel
    async updateMaterialWithExport(id, updateData, exportOptions = {}) {
        try {
            // Update in database
            const updatedMaterial = await this.databaseManager.updateMaterial(id, updateData);
            
            // Export to Excel if requested
            if (exportOptions.exportAfterUpdate) {
                const materials = await this.databaseManager.getMaterials();
                await this.excelExporter.exportInventoryReport(materials, {
                    ...exportOptions,
                    user: this.databaseManager.getCurrentUser()
                });
            }
            
            return updatedMaterial;
        } catch (error) {
            console.error('Failed to update material with export:', error);
            throw error;
        }
    }

    // Add rack and export to Excel
    async addRackWithExport(rackData, exportOptions = {}) {
        try {
            // Add to database
            const newRack = await this.databaseManager.addRack(rackData);
            
            // Export to Excel if requested
            if (exportOptions.exportAfterAdd) {
                const racks = await this.databaseManager.getRacks();
                await this.excelExporter.exportRackUtilizationReport(racks, {
                    ...exportOptions,
                    user: this.databaseManager.getCurrentUser()
                });
            }
            
            return newRack;
        } catch (error) {
            console.error('Failed to add rack with export:', error);
            throw error;
        }
    }

    // Export Operations

    // Export single table to Excel
    async exportTable(tableName, options = {}) {
        try {
            const data = await this.databaseManager.getTableData(tableName);
            
            switch (tableName) {
                case 'materials':
                    return await this.excelExporter.exportInventoryReport(data, {
                        ...options,
                        user: this.databaseManager.getCurrentUser()
                    });
                case 'racks':
                    return await this.excelExporter.exportRackUtilizationReport(data, {
                        ...options,
                        user: this.databaseManager.getCurrentUser()
                    });
                case 'audit_log':
                    return await this.excelExporter.exportAuditTrailReport(data, {
                        ...options,
                        user: this.databaseManager.getCurrentUser()
                    });
                default:
                    return await this.excelExporter.exportTableToExcel(tableName, data, {
                        ...options,
                        user: this.databaseManager.getCurrentUser()
                    });
            }
        } catch (error) {
            console.error(`Failed to export table ${tableName}:`, error);
            throw error;
        }
    }

    // Export all tables to Excel
    async exportAllTables(options = {}) {
        try {
            const tables = ['materials', 'racks', 'placements', 'audit_log', 'users', 'suppliers', 'material_movements', 'maintenance_records', 'certifications'];
            const tablesData = {};
            
            // Gather data from all tables
            for (const table of tables) {
                tablesData[table] = await this.databaseManager.getTableData(table);
            }
            
            // Export all tables
            return await this.excelExporter.exportMultipleTablesToExcel(tablesData, {
                ...options,
                user: this.databaseManager.getCurrentUser()
            });
        } catch (error) {
            console.error('Failed to export all tables:', error);
            throw error;
        }
    }

    // Export filtered data
    async exportFilteredData(tableName, filters, options = {}) {
        try {
            let data;
            
            switch (tableName) {
                case 'materials':
                    data = await this.databaseManager.getMaterials(filters);
                    break;
                case 'racks':
                    data = await this.databaseManager.getRacks(filters);
                    break;
                case 'placements':
                    data = await this.databaseManager.getPlacements(filters);
                    break;
                default:
                    data = await this.databaseManager.getTableData(tableName);
            }
            
            return await this.excelExporter.exportFilteredData(tableName, data, filters, {
                ...options,
                user: this.databaseManager.getCurrentUser()
            });
        } catch (error) {
            console.error(`Failed to export filtered data for ${tableName}:`, error);
            throw error;
        }
    }

    // Export specific report types

    // Export inventory report with filters
    async exportInventoryReport(filters = {}, options = {}) {
        try {
            const materials = await this.databaseManager.getMaterials(filters);
            return await this.excelExporter.exportInventoryReport(materials, {
                ...options,
                user: this.databaseManager.getCurrentUser(),
                filters: filters
            });
        } catch (error) {
            console.error('Failed to export inventory report:', error);
            throw error;
        }
    }

    // Export rack utilization report
    async exportRackUtilizationReport(filters = {}, options = {}) {
        try {
            const racks = await this.databaseManager.getRacks(filters);
            return await this.excelExporter.exportRackUtilizationReport(racks, {
                ...options,
                user: this.databaseManager.getCurrentUser(),
                filters: filters
            });
        } catch (error) {
            console.error('Failed to export rack utilization report:', error);
            throw error;
        }
    }

    // Export audit trail report
    async exportAuditTrailReport(filters = {}, options = {}) {
        try {
            const auditLog = await this.databaseManager.getTableData('audit_log');
            let filteredData = auditLog;
            
            // Apply filters if provided
            if (Object.keys(filters).length > 0) {
                filteredData = auditLog.filter(log => {
                    return Object.entries(filters).every(([key, value]) => {
                        if (!value) return true;
                        return String(log[key]).toLowerCase().includes(String(value).toLowerCase());
                    });
                });
            }
            
            return await this.excelExporter.exportAuditTrailReport(filteredData, {
                ...options,
                user: this.databaseManager.getCurrentUser(),
                filters: filters
            });
        } catch (error) {
            console.error('Failed to export audit trail report:', error);
            throw error;
        }
    }

    // Export custom report
    async exportCustomReport(reportName, data, options = {}) {
        try {
            return await this.excelExporter.exportTableToExcel(reportName, data, {
                ...options,
                user: this.databaseManager.getCurrentUser(),
                title: options.title || `${reportName} Report`
            });
        } catch (error) {
            console.error(`Failed to export custom report ${reportName}:`, error);
            throw error;
        }
    }

    // Database Management Operations

    // Get database statistics
    async getDatabaseStats() {
        return await this.databaseManager.getDatabaseStats();
    }

    // Backup database
    async backupDatabase() {
        return await this.databaseManager.backupDatabase();
    }

    // Restore database
    async restoreDatabase(backupData) {
        return await this.databaseManager.restoreDatabase(backupData);
    }

    // Export database backup to Excel
    async exportDatabaseBackupToExcel(options = {}) {
        try {
            const backup = await this.databaseManager.backupDatabase();
            
            // Create a summary of the backup
            const backupSummary = {
                backupDate: backup.metadata.backupDate,
                totalTables: backup.metadata.totalTables,
                version: backup.metadata.version,
                tableDetails: []
            };
            
            // Add details for each table
            Object.entries(backup).forEach(([tableName, data]) => {
                if (tableName !== 'metadata') {
                    backupSummary.tableDetails.push({
                        tableName: tableName.charAt(0).toUpperCase() + tableName.slice(1),
                        recordCount: data.length,
                        lastUpdated: data.length > 0 ? 
                            new Date(Math.max(...data.map(item => new Date(item.created_at || item.updated_at || 0).getTime()))) : 
                            'N/A'
                    });
                }
            });
            
            return await this.excelExporter.exportCustomReport('Database_Backup', [backupSummary], {
                ...options,
                title: 'Database Backup Summary',
                reportType: 'Database Backup Report'
            });
        } catch (error) {
            console.error('Failed to export database backup to Excel:', error);
            throw error;
        }
    }

    // Utility Methods

    // Check if system is ready
    isReady() {
        return this.initialized && this.databaseManager.isConnected;
    }

    // Get current user
    getCurrentUser() {
        return this.databaseManager.getCurrentUser();
    }

    // Set current user
    setCurrentUser(username) {
        this.databaseManager.setCurrentUser(username);
    }

    // Close connections
    async close() {
        await this.databaseManager.close();
    }

    // Get available export options
    getExportOptions() {
        return {
            singleTable: ['materials', 'racks', 'placements', 'audit_log', 'users', 'suppliers', 'material_movements', 'maintenance_records', 'certifications'],
            reportTypes: ['Inventory Report', 'Rack Utilization Report', 'Audit Trail Report', 'Custom Report'],
            exportFormats: ['Excel (.xlsx)'],
            filters: {
                materials: ['part_number', 'type', 'supplier', 'condition_status', 'location'],
                racks: ['code', 'zone', 'status', 'security_level'],
                audit_log: ['action', 'entity_type', 'user_id', 'timestamp']
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseExcelIntegration;
}

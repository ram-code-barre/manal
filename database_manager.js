// Database Manager for Aviation Warehouse Management System
// Handles all SQL database operations and data management

class DatabaseManager {
    constructor() {
        this.connection = null;
        this.isConnected = false;
        this.config = {
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'aviation_warehouse',
            port: 3306
        };
        this.init();
    }

    // Initialize database connection
    async init() {
        try {
            // For browser-based applications, we'll use a proxy approach
            // In production, this would connect to a real MySQL server
            console.log('Database manager initialized');
            this.setupLocalStorageFallback();
        } catch (error) {
            console.error('Database initialization failed:', error);
            this.setupLocalStorageFallback();
        }
    }

    // Setup localStorage fallback for development/testing
    setupLocalStorageFallback() {
        console.log('Using localStorage fallback for database operations');
        this.isConnected = true;
        this.connection = 'localStorage';
    }

    // Generate unique ID
    generateId(prefix = 'ID') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Generic query executor
    async executeQuery(query, params = []) {
        if (this.connection === 'localStorage') {
            return this.executeLocalStorageQuery(query, params);
        }
        
        // Real database connection would go here
        throw new Error('Database connection not available');
    }

    // Execute queries using localStorage fallback
    executeLocalStorageQuery(query, params = []) {
        try {
            // Parse the query to determine the operation
            const queryType = this.parseQueryType(query);
            
            switch (queryType.operation) {
                case 'SELECT':
                    return this.handleSelect(queryType, params);
                case 'INSERT':
                    return this.handleInsert(queryType, params);
                case 'UPDATE':
                    return this.handleUpdate(queryType, params);
                case 'DELETE':
                    return this.handleDelete(queryType, params);
                default:
                    throw new Error(`Unsupported query operation: ${queryType.operation}`);
            }
        } catch (error) {
            console.error('Query execution error:', error);
            throw error;
        }
    }

    // Parse SQL query to determine operation type
    parseQueryType(query) {
        const upperQuery = query.trim().toUpperCase();
        const operation = upperQuery.split(' ')[0];
        
        return {
            operation,
            originalQuery: query,
            table: this.extractTableName(query)
        };
    }

    // Extract table name from query
    extractTableName(query) {
        const fromMatch = query.match(/FROM\s+(\w+)/i);
        const intoMatch = query.match(/INTO\s+(\w+)/i);
        const updateMatch = query.match(/UPDATE\s+(\w+)/i);
        
        return fromMatch?.[1] || intoMatch?.[1] || updateMatch?.[1];
    }

    // Handle SELECT queries
    handleSelect(queryType, params) {
        const table = queryType.table;
        const data = this.getTableData(table);
        
        // Simple filtering - in a real implementation, this would parse WHERE clauses
        if (params.length > 0) {
            return data.filter(item => {
                return params.some(param => 
                    Object.values(item).some(value => 
                        String(value).toLowerCase().includes(String(param).toLowerCase())
                    )
                );
            });
        }
        
        return data;
    }

    // Handle INSERT queries
    handleInsert(queryType, params) {
        const table = queryType.table;
        const data = this.getTableData(table);
        
        // Generate new record
        const newRecord = {
            id: this.generateId(table.toUpperCase().substr(0, 3)),
            ...params[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        data.push(newRecord);
        this.saveTableData(table, data);
        
        return {
            insertId: newRecord.id,
            affectedRows: 1,
            record: newRecord
        };
    }

    // Handle UPDATE queries
    handleUpdate(queryType, params) {
        const table = queryType.table;
        const data = this.getTableData(table);
        
        // Simple update - in real implementation, parse SET and WHERE clauses
        const updateData = params[0];
        const whereCondition = params[1];
        
        let affectedRows = 0;
        data.forEach(item => {
            if (this.matchesWhereCondition(item, whereCondition)) {
                Object.assign(item, updateData, { updated_at: new Date().toISOString() });
                affectedRows++;
            }
        });
        
        this.saveTableData(table, data);
        
        return { affectedRows };
    }

    // Handle DELETE queries
    handleDelete(queryType, params) {
        const table = queryType.table;
        const data = this.getTableData(table);
        
        const whereCondition = params[0];
        const originalLength = data.length;
        
        // Filter out matching records
        const filteredData = data.filter(item => 
            !this.matchesWhereCondition(item, whereCondition)
        );
        
        const affectedRows = originalLength - filteredData.length;
        this.saveTableData(table, filteredData);
        
        return { affectedRows };
    }

    // Check if item matches WHERE condition
    matchesWhereCondition(item, whereCondition) {
        if (!whereCondition) return true;
        
        return Object.entries(whereCondition).every(([key, value]) => {
            return item[key] === value;
        });
    }

    // Get data from localStorage table
    getTableData(table) {
        const key = `db_${table}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    // Save data to localStorage table
    saveTableData(table, data) {
        const key = `db_${table}`;
        localStorage.setItem(key, JSON.stringify(data));
    }

    // Initialize default tables if they don't exist
    initializeTables() {
        const tables = ['materials', 'racks', 'placements', 'audit_log', 'users', 'suppliers', 'material_movements', 'maintenance_records', 'certifications'];
        
        tables.forEach(table => {
            if (!localStorage.getItem(`db_${table}`)) {
                this.saveTableData(table, []);
            }
        });
    }

    // CRUD Operations for Materials
    async getMaterials(filters = {}) {
        const materials = this.getTableData('materials');
        
        if (Object.keys(filters).length === 0) {
            return materials;
        }
        
        return materials.filter(material => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                return String(material[key]).toLowerCase().includes(String(value).toLowerCase());
            });
        });
    }

    async addMaterial(materialData) {
        const materials = this.getTableData('materials');
        const newMaterial = {
            id: this.generateId('MAT'),
            ...materialData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: this.getCurrentUser() || 'System',
            updated_by: this.getCurrentUser() || 'System'
        };
        
        materials.push(newMaterial);
        this.saveTableData('materials', materials);
        
        // Add audit log
        this.addAuditLog('CREATE', 'materials', newMaterial.id, materialData);
        
        return newMaterial;
    }

    async updateMaterial(id, updateData) {
        const materials = this.getTableData('materials');
        const index = materials.findIndex(m => m.id === id);
        
        if (index === -1) {
            throw new Error(`Material with ID ${id} not found`);
        }
        
        materials[index] = {
            ...materials[index],
            ...updateData,
            updated_at: new Date().toISOString(),
            updated_by: this.getCurrentUser() || 'System'
        };
        
        this.saveTableData('materials', materials);
        
        // Add audit log
        this.addAuditLog('UPDATE', 'materials', id, updateData);
        
        return materials[index];
    }

    async deleteMaterial(id) {
        const materials = this.getTableData('materials');
        const index = materials.findIndex(m => m.id === id);
        
        if (index === -1) {
            throw new Error(`Material with ID ${id} not found`);
        }
        
        const deletedMaterial = materials.splice(index, 1)[0];
        this.saveTableData('materials', materials);
        
        // Add audit log
        this.addAuditLog('DELETE', 'materials', id, deletedMaterial);
        
        return deletedMaterial;
    }

    // CRUD Operations for Racks
    async getRacks(filters = {}) {
        const racks = this.getTableData('racks');
        
        if (Object.keys(filters).length === 0) {
            return racks;
        }
        
        return racks.filter(rack => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                return String(rack[key]).toLowerCase().includes(String(value).toLowerCase());
            });
        });
    }

    async addRack(rackData) {
        const racks = this.getTableData('racks');
        const newRack = {
            id: this.generateId('RACK'),
            ...rackData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: this.getCurrentUser() || 'System',
            updated_by: this.getCurrentUser() || 'System'
        };
        
        racks.push(newRack);
        this.saveTableData('racks', racks);
        
        this.addAuditLog('CREATE', 'racks', newRack.id, rackData);
        
        return newRack;
    }

    // CRUD Operations for Placements
    async getPlacements(filters = {}) {
        const placements = this.getTableData('placements');
        
        if (Object.keys(filters).length === 0) {
            return placements;
        }
        
        return placements.filter(placement => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                return String(placement[key]).toLowerCase().includes(String(value).toLowerCase());
            });
        });
    }

    async addPlacement(placementData) {
        const placements = this.getTableData('placements');
        const newPlacement = {
            id: this.generateId('PLACE'),
            ...placementData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: this.getCurrentUser() || 'System',
            updated_by: this.getCurrentUser() || 'System'
        };
        
        placements.push(newPlacement);
        this.saveTableData('placements', placements);
        
        this.addAuditLog('CREATE', 'placements', newPlacement.id, placementData);
        
        return newPlacement;
    }

    // Audit logging
    async addAuditLog(action, entityType, entityId, details = {}) {
        const auditLog = this.getTableData('audit_log');
        const newLog = {
            id: this.generateId('AUDIT'),
            timestamp: new Date().toISOString(),
            user_id: this.getCurrentUser() || 'System',
            action: action,
            entity_type: entityType,
            entity_id: entityId,
            details: details,
            ip_address: '127.0.0.1', // In real app, get actual IP
            user_agent: navigator.userAgent
        };
        
        auditLog.push(newLog);
        this.saveTableData('audit_log', auditLog);
        
        return newLog;
    }

    // Get current user (placeholder - integrate with your auth system)
    getCurrentUser() {
        return localStorage.getItem('current_user') || 'System';
    }

    // Set current user
    setCurrentUser(username) {
        localStorage.setItem('current_user', username);
    }

    // Get database statistics
    async getDatabaseStats() {
        const tables = ['materials', 'racks', 'placements', 'audit_log', 'users', 'suppliers', 'material_movements', 'maintenance_records', 'certifications'];
        const stats = {};
        
        tables.forEach(table => {
            const data = this.getTableData(table);
            stats[table] = {
                count: data.length,
                lastUpdated: data.length > 0 ? Math.max(...data.map(item => new Date(item.created_at || item.updated_at).getTime())) : null
            };
        });
        
        return stats;
    }

    // Export table data to JSON
    async exportTableToJSON(tableName) {
        const data = this.getTableData(tableName);
        return JSON.stringify(data, null, 2);
    }

    // Import table data from JSON
    async importTableFromJSON(tableName, jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.saveTableData(tableName, data);
            return { success: true, importedRows: data.length };
        } catch (error) {
            throw new Error(`Invalid JSON data: ${error.message}`);
        }
    }

    // Backup entire database
    async backupDatabase() {
        const tables = ['materials', 'racks', 'placements', 'audit_log', 'users', 'suppliers', 'material_movements', 'maintenance_records', 'certifications'];
        const backup = {};
        
        tables.forEach(table => {
            backup[table] = this.getTableData(table);
        });
        
        backup.metadata = {
            backupDate: new Date().toISOString(),
            version: '1.0.0',
            totalTables: tables.length
        };
        
        return backup;
    }

    // Restore database from backup
    async restoreDatabase(backupData) {
        try {
            const tables = Object.keys(backupData).filter(key => key !== 'metadata');
            
            tables.forEach(table => {
                if (Array.isArray(backupData[table])) {
                    this.saveTableData(table, backupData[table]);
                }
            });
            
            return { success: true, restoredTables: tables.length };
        } catch (error) {
            throw new Error(`Restore failed: ${error.message}`);
        }
    }

    // Close database connection
    async close() {
        if (this.connection && this.connection !== 'localStorage') {
            // Close real database connection
            this.isConnected = false;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseManager;
}

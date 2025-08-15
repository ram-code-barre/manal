# Aviation Warehouse Management System - Database & Excel Export

## Overview

This system provides a comprehensive SQL database solution for aviation warehouse management with direct Excel export functionality. It includes a complete database schema, management classes, and Excel export capabilities.

## Features

### 🗄️ Database Management
- **Complete SQL Schema**: 9 main tables with proper relationships
- **CRUD Operations**: Full Create, Read, Update, Delete functionality
- **Audit Logging**: Complete tracking of all system activities
- **Data Validation**: Input sanitization and validation
- **Backup/Restore**: Full database backup and restore capabilities

### 📊 Excel Export
- **Professional Formatting**: Beautiful Excel files with proper styling
- **Multiple Report Types**: Inventory, Rack Utilization, Audit Trail reports
- **Filtered Exports**: Export data based on custom filters
- **Multi-table Export**: Export all tables to separate worksheets
- **Auto-styling**: Automatic cell formatting based on data types

### 🔄 Integration
- **Seamless Integration**: Works with existing warehouse system
- **Real-time Sync**: Automatic data synchronization
- **Sample Data**: Pre-loaded sample data for testing
- **User Management**: Role-based access control

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                     │
├─────────────────────────────────────────────────────────────┤
│                Database & Excel Integration                 │
├─────────────────────────────────────────────────────────────┤
│  Database Manager  │  Excel Exporter  │  Audit System     │
├─────────────────────────────────────────────────────────────┤
│                Data Storage Layer                          │
│  MySQL Database   │  localStorage    │  File System       │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

#### 1. Materials Table
- **Purpose**: Stores all inventory items
- **Key Fields**: part_number, serial_number, type, quantity, supplier
- **Features**: Stock level tracking, certification management

#### 2. Racks Table
- **Purpose**: Storage location management
- **Key Fields**: code, zone, level, capacity, security_level
- **Features**: Temperature/humidity control, security levels

#### 3. Placements Table
- **Purpose**: Tracks where materials are stored
- **Key Fields**: material_id, rack_id, quantity, status
- **Features**: Placement history, transfer tracking

#### 4. Audit Log Table
- **Purpose**: Complete system activity tracking
- **Key Fields**: timestamp, user_id, action, entity_type
- **Features**: IP tracking, user agent logging

#### 5. Users Table
- **Purpose**: System user management
- **Key Fields**: username, email, role, department
- **Features**: Role-based access control

#### 6. Suppliers Table
- **Purpose**: Vendor information management
- **Key Fields**: name, code, contact_person, rating
- **Features**: Certification requirements, rating system

#### 7. Material Movements Table
- **Purpose**: Inventory movement tracking
- **Key Fields**: movement_type, quantity, from_rack, to_rack
- **Features**: Movement history, reason tracking

#### 8. Maintenance Records Table
- **Purpose**: Equipment maintenance tracking
- **Key Fields**: maintenance_type, scheduled_date, technician
- **Features**: Cost tracking, status management

#### 9. Certifications Table
- **Purpose**: Material certification management
- **Key Fields**: certification_type, issued_date, expiry_date
- **Features**: Expiry tracking, document management

### Database Views

#### Material Inventory View
- Combines materials with placement and rack information
- Provides stock status (Low Stock, Normal, Overstocked)
- Includes location and zone information

#### Rack Utilization View
- Shows rack capacity and current usage
- Calculates utilization percentage
- Tracks active placements per rack

## Installation & Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- ExcelJS library (automatically loaded from CDN)
- Local storage enabled

### Quick Start

1. **Download Files**
   ```bash
   # Core system files
   database_schema.sql          # Database schema
   database_manager.js          # Database management
   excel_exporter.js           # Excel export functionality
   database_excel_integration.js # Integration layer
   database_excel_ui.html      # User interface
   ```

2. **Open Interface**
   ```bash
   # Open the HTML file in your browser
   open database_excel_ui.html
   ```

3. **System Initialization**
   - The system automatically initializes
   - Sample data is loaded if tables are empty
   - Database statistics are displayed

## Usage Guide

### Database Operations

#### Adding Materials
```javascript
// Add a new material
const materialData = {
    part_number: 'AP-001',
    serial_number: 'SN-2024-001',
    type: 'Aircraft Part',
    description: 'Landing Gear Component',
    supplier: 'Aviation Parts Inc.',
    quantity: 5,
    unit: 'PCS'
};

await dbIntegration.addMaterial(materialData);
```

#### Adding Racks
```javascript
// Add a new rack
const rackData = {
    code: 'RACK-A1',
    zone: 'Zone A',
    level: 'Level 1',
    capacity: 50,
    security_level: 'High'
};

await dbIntegration.addRack(rackData);
```

#### Querying Data
```javascript
// Get all materials
const materials = await dbIntegration.databaseManager.getMaterials();

// Get filtered materials
const filteredMaterials = await dbIntegration.databaseManager.getMaterials({
    type: 'Aircraft Part',
    supplier: 'Aviation Parts Inc.'
});
```

### Excel Export Operations

#### Single Table Export
```javascript
// Export materials table
await dbIntegration.exportTable('materials');

// Export racks table
await dbIntegration.exportTable('racks');
```

#### Report Export
```javascript
// Export inventory report
await dbIntegration.exportInventoryReport();

// Export rack utilization report
await dbIntegration.exportRackUtilizationReport();

// Export audit trail report
await dbIntegration.exportAuditTrailReport();
```

#### Filtered Export
```javascript
// Export filtered materials
await dbIntegration.exportFilteredData('materials', {
    type: 'Aircraft Part',
    supplier: 'Aviation Parts Inc.'
});
```

#### Complete Export
```javascript
// Export all tables
await dbIntegration.exportAllTables();
```

### Database Management

#### Backup Database
```javascript
// Create backup
const backup = await dbIntegration.backupDatabase();

// Export backup to Excel
await dbIntegration.exportDatabaseBackupToExcel();
```

#### Restore Database
```javascript
// Restore from backup data
await dbIntegration.restoreDatabase(backupData);
```

## Excel Export Features

### Professional Formatting
- **Headers**: Blue background with white text
- **Data Rows**: Clean borders and proper alignment
- **Status Fields**: Color-coded for better visibility
- **Numbers**: Proper number formatting with thousands separators
- **Dates**: Consistent date/time formatting

### Automatic Styling
- **Status Colors**: Green for active/good, red for damaged/cancelled
- **Column Widths**: Optimized for each table type
- **Page Setup**: Landscape orientation with proper margins
- **Auto-fit**: Columns automatically sized for content

### Report Types
1. **Inventory Report**: Complete materials listing with stock status
2. **Rack Utilization Report**: Storage capacity and usage analysis
3. **Audit Trail Report**: Complete system activity log
4. **Custom Reports**: User-defined report formats

## API Reference

### DatabaseManager Class

#### Core Methods
- `init()`: Initialize database connection
- `executeQuery(query, params)`: Execute SQL queries
- `getTableData(tableName)`: Get all data from a table
- `saveTableData(tableName, data)`: Save data to a table

#### CRUD Operations
- `addMaterial(materialData)`: Add new material
- `updateMaterial(id, updateData)`: Update existing material
- `deleteMaterial(id)`: Delete material
- `addRack(rackData)`: Add new rack
- `addPlacement(placementData)`: Add new placement

#### Utility Methods
- `generateId(prefix)`: Generate unique IDs
- `getDatabaseStats()`: Get table statistics
- `backupDatabase()`: Create database backup
- `restoreDatabase(backupData)`: Restore from backup

### ExcelExporter Class

#### Export Methods
- `exportTableToExcel(tableName, data, options)`: Export single table
- `exportMultipleTablesToExcel(tablesData, options)`: Export multiple tables
- `exportInventoryReport(data, options)`: Export inventory report
- `exportRackUtilizationReport(data, options)`: Export rack report
- `exportAuditTrailReport(data, options)`: Export audit report

#### Styling Methods
- `initializeStyles()`: Set up default Excel styles
- `applyCellStyling(cell, value, columnIndex)`: Apply cell formatting
- `autoFitColumns()`: Auto-size columns for content

### DatabaseExcelIntegration Class

#### Integration Methods
- `addMaterialWithExport(materialData, exportOptions)`: Add material with optional export
- `updateMaterialWithExport(id, updateData, exportOptions)`: Update with optional export
- `exportFilteredData(tableName, filters, options)`: Export filtered data
- `exportAllTables(options)`: Export all tables

## Configuration Options

### Database Configuration
```javascript
const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aviation_warehouse',
    port: 3306
};
```

### Export Options
```javascript
const exportOptions = {
    title: 'Custom Report Title',
    user: 'Current User',
    reportType: 'Custom Report',
    exportAfterAdd: true,
    exportAfterUpdate: true
};
```

### Filter Options
```javascript
const filters = {
    type: 'Aircraft Part',
    supplier: 'Aviation Parts Inc.',
    condition_status: 'Good'
};
```

## Sample Data

The system automatically loads sample data including:

### Sample Materials
- Landing Gear Component (AP-001)
- Turbine Blade Set (AP-002)
- Navigation System (AP-003)

### Sample Racks
- RACK-A1: High-value parts storage (Zone A)
- RACK-B1: Engine components storage (Zone B)
- RACK-C1: General parts storage (Zone C)

### Sample Suppliers
- Aviation Parts Inc. (USA)
- Global Aerospace (Germany)
- Pacific Aviation (Japan)

## Troubleshooting

### Common Issues

#### System Not Ready
**Problem**: "System not ready" error
**Solution**: Wait for initialization to complete, check browser console for errors

#### Export Fails
**Problem**: Excel export fails
**Solution**: Ensure ExcelJS library is loaded, check browser compatibility

#### Database Errors
**Problem**: Database operations fail
**Solution**: Check localStorage availability, clear browser data if needed

#### Performance Issues
**Problem**: Slow operations with large datasets
**Solution**: Use filters, export smaller datasets, check browser performance

### Error Messages

- **"Database connection not available"**: System using localStorage fallback
- **"Table not found"**: Table not initialized, restart system
- **"Export failed"**: Check ExcelJS library and browser compatibility

## Browser Compatibility

- **Chrome**: 80+ (Recommended)
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

## Performance Considerations

- **Data Size**: Optimal performance with <10,000 records per table
- **Export Size**: Excel files limited by browser memory
- **Real-time Updates**: Use filters for large datasets
- **Backup Size**: Large backups may take time to process

## Security Features

- **Input Sanitization**: All user inputs are sanitized
- **Audit Logging**: Complete activity tracking
- **User Management**: Role-based access control
- **Data Validation**: Server-side validation (when implemented)

## Future Enhancements

- **Real Database**: MySQL/PostgreSQL integration
- **Cloud Storage**: Cloud-based backup and restore
- **Advanced Reports**: Charts and graphs in Excel
- **API Integration**: REST API for external systems
- **Mobile Support**: Responsive mobile interface

## Support & Maintenance

### Regular Tasks
- Monitor audit logs for unusual activity
- Regular database backups
- Clean up old audit log entries
- Update sample data as needed

### When to Get Help
- System initialization fails repeatedly
- Export functionality stops working
- Performance issues with large datasets
- Integration problems with existing systems

## License

This system is provided as-is for educational and development purposes. Modify and use according to your needs.

## Contributing

To contribute to this system:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Note**: This system is designed for development and testing. For production use, implement proper security measures and database connections.

-- Aviation Warehouse Management System Database Schema
-- This file contains all the SQL tables needed for the warehouse system

-- Create database
CREATE DATABASE IF NOT EXISTS aviation_warehouse;
USE aviation_warehouse;

-- Materials table - stores all inventory items
CREATE TABLE materials (
    id VARCHAR(50) PRIMARY KEY,
    part_number VARCHAR(100) NOT NULL UNIQUE,
    serial_number VARCHAR(100) UNIQUE,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    supplier VARCHAR(200),
    quantity INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'PCS',
    min_stock_level INT DEFAULT 0,
    max_stock_level INT DEFAULT 1000,
    location VARCHAR(100),
    condition_status ENUM('New', 'Good', 'Fair', 'Poor', 'Damaged') DEFAULT 'Good',
    certification_required BOOLEAN DEFAULT FALSE,
    certification_expiry DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    INDEX idx_part_number (part_number),
    INDEX idx_serial_number (serial_number),
    INDEX idx_type (type),
    INDEX idx_supplier (supplier),
    INDEX idx_location (location)
);

-- Racks table - stores storage locations
CREATE TABLE racks (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    zone VARCHAR(100) NOT NULL,
    level VARCHAR(50),
    position VARCHAR(50),
    description TEXT,
    capacity INT DEFAULT 0,
    current_usage INT DEFAULT 0,
    status ENUM('Active', 'Maintenance', 'Full', 'Inactive') DEFAULT 'Active',
    temperature_controlled BOOLEAN DEFAULT FALSE,
    humidity_controlled BOOLEAN DEFAULT FALSE,
    security_level ENUM('Low', 'Medium', 'High', 'Restricted') DEFAULT 'Medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    INDEX idx_code (code),
    INDEX idx_zone (zone),
    INDEX idx_status (status)
);

-- Placements table - tracks where materials are stored
CREATE TABLE placements (
    id VARCHAR(50) PRIMARY KEY,
    material_id VARCHAR(50) NOT NULL,
    rack_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    placement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removal_date TIMESTAMP NULL,
    status ENUM('Active', 'Removed', 'Transferred') DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (rack_id) REFERENCES racks(id) ON DELETE CASCADE,
    INDEX idx_material_id (material_id),
    INDEX idx_rack_id (rack_id),
    INDEX idx_status (status),
    INDEX idx_placement_date (placement_date)
);

-- Audit log table - tracks all system activities
CREATE TABLE audit_log (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    INDEX idx_timestamp (timestamp),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id)
);

-- Users table - system users
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(200) NOT NULL UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    role ENUM('Admin', 'Manager', 'Operator', 'Viewer') DEFAULT 'Operator',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Suppliers table - vendor information
CREATE TABLE suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    contact_person VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    country VARCHAR(100),
    certification_required BOOLEAN DEFAULT FALSE,
    rating ENUM('A', 'B', 'C', 'D') DEFAULT 'B',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_code (code),
    INDEX idx_country (country)
);

-- Material movements table - tracks inventory movements
CREATE TABLE material_movements (
    id VARCHAR(50) PRIMARY KEY,
    material_id VARCHAR(50) NOT NULL,
    movement_type ENUM('In', 'Out', 'Transfer', 'Adjustment', 'Return') NOT NULL,
    quantity INT NOT NULL,
    from_rack_id VARCHAR(50),
    to_rack_id VARCHAR(50),
    reference_number VARCHAR(100),
    reason TEXT,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (from_rack_id) REFERENCES racks(id) ON DELETE SET NULL,
    FOREIGN KEY (to_rack_id) REFERENCES racks(id) ON DELETE SET NULL,
    INDEX idx_material_id (material_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_movement_date (movement_date),
    INDEX idx_user_id (user_id)
);

-- Maintenance records table - tracks equipment maintenance
CREATE TABLE maintenance_records (
    id VARCHAR(50) PRIMARY KEY,
    rack_id VARCHAR(50),
    material_id VARCHAR(50),
    maintenance_type ENUM('Preventive', 'Corrective', 'Inspection', 'Calibration') NOT NULL,
    description TEXT NOT NULL,
    scheduled_date DATE,
    completed_date DATE,
    technician VARCHAR(200),
    cost DECIMAL(10,2),
    status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    FOREIGN KEY (rack_id) REFERENCES racks(id) ON DELETE SET NULL,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
    INDEX idx_rack_id (rack_id),
    INDEX idx_material_id (material_id),
    INDEX idx_maintenance_type (maintenance_type),
    INDEX idx_status (status),
    INDEX idx_scheduled_date (scheduled_date)
);

-- Certifications table - tracks material certifications
CREATE TABLE certifications (
    id VARCHAR(50) PRIMARY KEY,
    material_id VARCHAR(50) NOT NULL,
    certification_type VARCHAR(100) NOT NULL,
    certificate_number VARCHAR(100),
    issued_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    issuing_authority VARCHAR(200),
    status ENUM('Valid', 'Expired', 'Pending', 'Suspended') DEFAULT 'Valid',
    document_path VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    INDEX idx_material_id (material_id),
    INDEX idx_certification_type (certification_type),
    INDEX idx_status (status),
    INDEX idx_expiry_date (expiry_date)
);

-- Create views for common queries
CREATE VIEW material_inventory AS
SELECT 
    m.id,
    m.part_number,
    m.serial_number,
    m.type,
    m.description,
    m.supplier,
    m.quantity,
    m.unit,
    m.location,
    m.condition_status,
    r.zone,
    r.code as rack_code,
    m.min_stock_level,
    m.max_stock_level,
    CASE 
        WHEN m.quantity <= m.min_stock_level THEN 'Low Stock'
        WHEN m.quantity >= m.max_stock_level THEN 'Overstocked'
        ELSE 'Normal'
    END as stock_status
FROM materials m
LEFT JOIN placements p ON m.id = p.material_id AND p.status = 'Active'
LEFT JOIN racks r ON p.rack_id = r.id;

CREATE VIEW rack_utilization AS
SELECT 
    r.id,
    r.code,
    r.zone,
    r.level,
    r.capacity,
    r.current_usage,
    ROUND((r.current_usage / r.capacity) * 100, 2) as utilization_percentage,
    r.status,
    COUNT(p.id) as active_placements
FROM racks r
LEFT JOIN placements p ON r.id = p.rack_id AND p.status = 'Active'
GROUP BY r.id, r.code, r.zone, r.level, r.capacity, r.current_usage, r.status;

-- Insert sample data
INSERT INTO users (id, username, email, full_name, role) VALUES
('USR001', 'admin', 'admin@warehouse.com', 'System Administrator', 'Admin'),
('USR002', 'manager', 'manager@warehouse.com', 'Warehouse Manager', 'Manager'),
('USR003', 'operator', 'operator@warehouse.com', 'Warehouse Operator', 'Operator');

INSERT INTO suppliers (id, name, code, country) VALUES
('SUP001', 'Aviation Parts Inc.', 'API', 'USA'),
('SUP002', 'Global Aerospace', 'GAS', 'Germany'),
('SUP003', 'Pacific Aviation', 'PAC', 'Japan');

-- Create indexes for better performance
CREATE INDEX idx_materials_created_at ON materials(created_at);
CREATE INDEX idx_placements_rack_material ON placements(rack_id, material_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_material_movements_date_type ON material_movements(movement_date, movement_type);

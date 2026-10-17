CREATE DATABASE IF NOT EXISTS agribridge
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE agribridge;

CREATE TABLE IF NOT EXISTS procurement_centres (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL UNIQUE,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  taluk VARCHAR(100),
  pincode VARCHAR(12),
  daily_capacity_quintals DECIMAL(12,2) NOT NULL,
  daily_slot_capacity INT UNSIGNED NOT NULL DEFAULT 100,
  operating_status ENUM('Operational', 'High Traffic', 'Maintenance', 'Closed') NOT NULL DEFAULT 'Operational',
  contact_person VARCHAR(255),
  phone VARCHAR(32),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  average_wait_minutes INT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role ENUM('farmer', 'officer', 'buyer', 'admin', 'assisted') NOT NULL,
  identifier VARCHAR(64) NOT NULL UNIQUE,
  mobile VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  land_acres DECIMAL(12,2),
  bank_account_number VARCHAR(64),
  ifsc_code VARCHAR(20),
  avatar_data MEDIUMTEXT,
  gstin VARCHAR(32),
  trade_category VARCHAR(120),
  csc_kiosk_id VARCHAR(64),
  gov_cadre VARCHAR(120),
  assigned_centre_id CHAR(36),
  verification_status ENUM('verified', 'pending', 'requires_review') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_assigned_centre FOREIGN KEY (assigned_centre_id) REFERENCES procurement_centres(id) ON DELETE SET NULL,
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS centre_crops (
  centre_id CHAR(36) NOT NULL,
  crop_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (centre_id, crop_name),
  CONSTRAINT fk_centre_crops_centre FOREIGN KEY (centre_id) REFERENCES procurement_centres(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS farmer_crops (
  id CHAR(36) PRIMARY KEY,
  farmer_id CHAR(36) NOT NULL,
  crop_name VARCHAR(100) NOT NULL,
  variety VARCHAR(100),
  season VARCHAR(40),
  acreage DECIMAL(12,2),
  estimated_quantity_quintals DECIMAL(12,2),
  harvest_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_farmer_crops_farmer FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_farmer_crops_farmer (farmer_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id CHAR(36) PRIMARY KEY,
  token_number VARCHAR(32) NOT NULL UNIQUE,
  farmer_id CHAR(36) NOT NULL,
  crop_name VARCHAR(100) NOT NULL,
  quantity_quintals DECIMAL(12,2) NOT NULL,
  centre_id CHAR(36) NOT NULL,
  booking_date DATE NOT NULL,
  slot_time VARCHAR(100) NOT NULL,
  status ENUM('booking_confirmed', 'token_generated', 'waiting', 'called', 'weighing', 'quality_check', 'approved', 'rejected', 'payment_processing', 'paid', 'completed') NOT NULL DEFAULT 'booking_confirmed',
  queue_position INT UNSIGNED,
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_farmer FOREIGN KEY (farmer_id) REFERENCES users(id),
  CONSTRAINT fk_bookings_centre FOREIGN KEY (centre_id) REFERENCES procurement_centres(id),
  INDEX idx_bookings_farmer_created (farmer_id, created_at),
  INDEX idx_bookings_centre_slot (centre_id, booking_date, slot_time, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quality_assessments (
  id CHAR(36) PRIMARY KEY,
  booking_id CHAR(36) NOT NULL UNIQUE,
  moisture_percentage DECIMAL(5,2) NOT NULL,
  foreign_matter_percentage DECIMAL(5,2) NOT NULL,
  damaged_grains_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  grade ENUM('FAQ (Fair Average Quality)', 'Grade A', 'Sub-Standard') NOT NULL,
  tested_by CHAR(36) NOT NULL,
  remarks TEXT,
  tested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_quality_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_quality_officer FOREIGN KEY (tested_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS weigh_slips (
  id CHAR(36) PRIMARY KEY,
  booking_id CHAR(36) NOT NULL UNIQUE,
  slip_number VARCHAR(40) NOT NULL UNIQUE,
  gross_weight_kg DECIMAL(12,2) NOT NULL,
  tare_weight_kg DECIMAL(12,2) NOT NULL,
  net_weight_kg DECIMAL(12,2) NOT NULL,
  net_weight_quintals DECIMAL(12,2) NOT NULL,
  deduction_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  final_procured_quintals DECIMAL(12,2) NOT NULL,
  weighbridge_operator VARCHAR(255) NOT NULL,
  vehicle_number VARCHAR(32),
  weighed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_weigh_slip_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) PRIMARY KEY,
  booking_id CHAR(36) NOT NULL UNIQUE,
  transaction_id VARCHAR(64) NOT NULL UNIQUE,
  amount DECIMAL(14,2) NOT NULL,
  rate_per_quintal DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  status ENUM('Pending', 'Processing', 'Credited to Farmer', 'Failed') NOT NULL DEFAULT 'Pending',
  bank_name VARCHAR(100),
  account_ending VARCHAR(8),
  reference_no VARCHAR(100),
  payment_date TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  INDEX idx_transactions_status (status, created_at)
) ENGINE=InnoDB;

INSERT IGNORE INTO procurement_centres
  (id, name, code, state, district, taluk, pincode, daily_capacity_quintals, daily_slot_capacity, operating_status, contact_person, phone)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Taraori Grain Market', 'HR-KNL-01', 'Haryana', 'Karnal', 'Taraori', '132116', 5000, 100, 'Operational', 'Procurement Desk', ''),
  ('22222222-2222-4222-8222-222222222222', 'Karnal Main Mandi', 'HR-KNL-02', 'Haryana', 'Karnal', 'Karnal', '132001', 4000, 80, 'Operational', 'Procurement Desk', ''),
  ('33333333-3333-4333-8333-333333333333', 'Indri Procurement Centre', 'HR-KNL-03', 'Haryana', 'Karnal', 'Indri', '132041', 2500, 50, 'Operational', 'Procurement Desk', '');

INSERT IGNORE INTO centre_crops (centre_id, crop_name) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Paddy (Dhan)'),
  ('11111111-1111-4111-8111-111111111111', 'Wheat (Gehun)'),
  ('11111111-1111-4111-8111-111111111111', 'Maize (Makka)'),
  ('22222222-2222-4222-8222-222222222222', 'Paddy (Dhan)'),
  ('22222222-2222-4222-8222-222222222222', 'Wheat (Gehun)'),
  ('22222222-2222-4222-8222-222222222222', 'Mustard'),
  ('33333333-3333-4333-8333-333333333333', 'Paddy (Dhan)'),
  ('33333333-3333-4333-8333-333333333333', 'Gram (Chana)');

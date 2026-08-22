-- Create admin_users table (idempotent)
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin user (idempotent)
-- Username: asma, Password: Algorythms
INSERT IGNORE INTO admin_users (username, password_hash)
VALUES ('asma', '$2y$10$ntxzmbVRTS9sZAQXz.JN5eQr3SjPZDQ3hWpSqMPZbbDfPK3bnFXJe');

-- Create categories table (idempotent)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    image_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_name (name)
);

-- Create company_info table (idempotent)
CREATE TABLE IF NOT EXISTS company_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default company settings (idempotent)
INSERT IGNORE INTO company_info (setting_key, setting_value) VALUES
('contact_number1', '+919876543210'),
('contact_number2', ''),
('instagram_link', ''),
('pinterest_link', ''),
('email_address', ''),
('address', ''),
('google_map_location_url', '');

-- Create products table (idempotent)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT NULL,
    available_sizes VARCHAR(255) DEFAULT NULL,
    images_urls TEXT DEFAULT NULL,
    price_from DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_category_id (category_id),
    KEY idx_name (name),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE
);

-- Create co_categories table (idempotent)
CREATE TABLE IF NOT EXISTS co_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_co_categories_name (name)
);

-- Create co_custom_measurements table (idempotent)
CREATE TABLE IF NOT EXISTS co_custom_measurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_co_custom_measurements_category_id (category_id),
    KEY idx_co_custom_measurements_name (name),
    KEY idx_co_custom_measurements_sort (category_id, sort_order),
    CONSTRAINT fk_co_custom_measurements_category FOREIGN KEY (category_id) REFERENCES co_categories(id) ON UPDATE CASCADE
);

-- Add sort_order to co_custom_measurements if it does not exist (idempotent)
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'co_custom_measurements'
      AND COLUMN_NAME  = 'sort_order'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE co_custom_measurements ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER name',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Create custom_orders table (idempotent)
CREATE TABLE IF NOT EXISTS custom_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_data JSON NOT NULL,
    status ENUM('PENDING','IN-PROGRESS','DONE') NOT NULL DEFAULT 'PENDING',
    modified_by VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_custom_orders_status (status),
    KEY idx_custom_orders_created (created_at)
);

-- Add status column to custom_orders if it does not exist (idempotent)
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'custom_orders'
      AND COLUMN_NAME  = 'status'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE custom_orders ADD COLUMN status ENUM('PENDING','IN-PROGRESS','DONE') NOT NULL DEFAULT 'PENDING' AFTER order_data",
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Create services table (idempotent)
CREATE TABLE IF NOT EXISTS services (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(200)    NOT NULL,
    summary       VARCHAR(500)    DEFAULT NULL,
    description   LONGTEXT        DEFAULT NULL,
    photo_urls    TEXT            DEFAULT NULL,
    starting_price DECIMAL(10,2)  DEFAULT NULL,
    last_modified TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    KEY idx_services_title (title)
);

-- Create contact_inquiries table (idempotent)
CREATE TABLE IF NOT EXISTS contact_inquiries (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(200)  NOT NULL,
    email        VARCHAR(255)  NOT NULL,
    phone        VARCHAR(50)   DEFAULT NULL,
    enquiry_type VARCHAR(100)  DEFAULT NULL,
    event        VARCHAR(255)  DEFAULT NULL,
    message      TEXT          NOT NULL,
    modified     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    KEY idx_contact_inquiries_email (email),
    KEY idx_contact_inquiries_type  (enquiry_type),
    KEY idx_contact_inquiries_created (created_at)
);

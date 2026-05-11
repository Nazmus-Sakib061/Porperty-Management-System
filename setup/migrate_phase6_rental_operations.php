<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script must be run from the command line.\n");
}

function table_exists(string $table): bool
{
    $statement = db()->prepare('SHOW TABLES LIKE :table_name');
    $statement->execute(['table_name' => $table]);

    return $statement->fetch() !== false;
}

function column_exists(string $table, string $column): bool
{
    $quotedColumn = db()->quote($column);
    $statement = db()->query("SHOW COLUMNS FROM {$table} LIKE {$quotedColumn}");

    return $statement->fetch() !== false;
}

function ensure_column(string $table, string $column, string $sql): void
{
    if (!column_exists($table, $column)) {
        db()->exec($sql);
    }
}

try {
    db()->exec(
        <<<'SQL'
CREATE TABLE IF NOT EXISTS tenant_leases (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    lease_start_date DATE NOT NULL,
    lease_end_date DATE NOT NULL,
    notice_date DATE NULL,
    move_out_date DATE NULL,
    rent_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    security_deposit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    service_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    electricity_meter_no VARCHAR(80) NULL,
    gas_meter_no VARCHAR(80) NULL,
    status ENUM('draft', 'active', 'expiring', 'ended', 'notice') NOT NULL DEFAULT 'draft',
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY tenant_leases_tenant_index (tenant_id),
    KEY tenant_leases_unit_index (unit_id),
    KEY tenant_leases_status_index (status),
    KEY tenant_leases_end_date_index (lease_end_date),
    CONSTRAINT tenant_leases_tenant_fk
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT tenant_leases_unit_fk
        FOREIGN KEY (unit_id) REFERENCES units (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT tenant_leases_created_by_fk
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lease_documents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    lease_id BIGINT UNSIGNED NOT NULL,
    document_path VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    caption VARCHAR(191) NULL,
    mime_type VARCHAR(191) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY lease_documents_lease_index (lease_id, created_at),
    CONSTRAINT lease_documents_lease_fk
        FOREIGN KEY (lease_id) REFERENCES tenant_leases (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_utilities (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    lease_id BIGINT UNSIGNED NOT NULL,
    utility_type ENUM('electricity', 'gas', 'water', 'internet', 'service_charge', 'other') NOT NULL DEFAULT 'electricity',
    meter_no VARCHAR(80) NULL,
    opening_reading DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    closing_reading DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    rate_per_unit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    bill_month DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('open', 'submitted', 'paid', 'waived') NOT NULL DEFAULT 'open',
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY tenant_utilities_lease_index (lease_id),
    KEY tenant_utilities_month_index (bill_month),
    KEY tenant_utilities_status_index (status),
    CONSTRAINT tenant_utilities_lease_fk
        FOREIGN KEY (lease_id) REFERENCES tenant_leases (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT tenant_utilities_created_by_fk
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_bills (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    lease_id BIGINT UNSIGNED NOT NULL,
    bill_month DATE NOT NULL,
    base_rent DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    service_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    utility_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    late_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    adjustment DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    arrears_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'waived') NOT NULL DEFAULT 'draft',
    due_date DATE NULL,
    paid_at TIMESTAMP NULL DEFAULT NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY tenant_bills_lease_index (lease_id),
    KEY tenant_bills_month_index (bill_month),
    KEY tenant_bills_status_index (status),
    KEY tenant_bills_due_date_index (due_date),
    CONSTRAINT tenant_bills_lease_fk
        FOREIGN KEY (lease_id) REFERENCES tenant_leases (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT tenant_bills_created_by_fk
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_arrears (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    bill_id BIGINT UNSIGNED NOT NULL,
    lease_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('open', 'notified', 'resolved', 'written_off') NOT NULL DEFAULT 'open',
    notice_date DATE NULL,
    resolved_at TIMESTAMP NULL DEFAULT NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY tenant_arrears_bill_index (bill_id),
    KEY tenant_arrears_lease_index (lease_id),
    KEY tenant_arrears_status_index (status),
    CONSTRAINT tenant_arrears_bill_fk
        FOREIGN KEY (bill_id) REFERENCES tenant_bills (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT tenant_arrears_lease_fk
        FOREIGN KEY (lease_id) REFERENCES tenant_leases (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT tenant_arrears_created_by_fk
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_notices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id BIGINT UNSIGNED NOT NULL,
    lease_id BIGINT UNSIGNED NULL,
    notice_type ENUM('move_out', 'payment_due', 'arrears', 'general') NOT NULL DEFAULT 'general',
    notice_text TEXT NOT NULL,
    notice_date DATE NOT NULL,
    due_date DATE NULL,
    status ENUM('draft', 'sent', 'acknowledged', 'closed') NOT NULL DEFAULT 'draft',
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY tenant_notices_tenant_index (tenant_id),
    KEY tenant_notices_lease_index (lease_id),
    KEY tenant_notices_status_index (status),
    CONSTRAINT tenant_notices_tenant_fk
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT tenant_notices_lease_fk
        FOREIGN KEY (lease_id) REFERENCES tenant_leases (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT tenant_notices_created_by_fk
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL
    );

    ensure_column('properties', 'deleted_at', "ALTER TABLE properties ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at");
    ensure_column('properties', 'deleted_by', "ALTER TABLE properties ADD COLUMN deleted_by BIGINT UNSIGNED NULL AFTER deleted_at");

    if (!column_exists('tenant_leases', 'status') && table_exists('tenant_leases')) {
        db()->exec("ALTER TABLE tenant_leases ADD COLUMN status ENUM('draft', 'active', 'expiring', 'ended', 'notice') NOT NULL DEFAULT 'draft' AFTER gas_meter_no");
    }

    fwrite(STDOUT, "Phase 6 rental operations migration completed.\n");
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

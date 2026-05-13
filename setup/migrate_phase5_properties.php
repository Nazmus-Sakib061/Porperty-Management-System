<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script must be run from the command line.\n");
}

function property_column_exists(string $column): bool
{
    $quoted = db()->quote($column);
    $statement = db()->query("SHOW COLUMNS FROM properties LIKE {$quoted}");

    return $statement->fetch() !== false;
}

function property_index_exists(string $index): bool
{
    $quoted = db()->quote($index);
    $statement = db()->query("SHOW INDEX FROM properties WHERE Key_name = {$quoted}");

    return $statement->fetch() !== false;
}

try {
    $columns = [
        'area' => "ALTER TABLE properties ADD COLUMN area VARCHAR(100) NULL AFTER description",
        'thika_no' => "ALTER TABLE properties ADD COLUMN thika_no VARCHAR(80) NULL AFTER country",
        'deed_no' => "ALTER TABLE properties ADD COLUMN deed_no VARCHAR(120) NULL AFTER thika_no",
        'land_tax' => "ALTER TABLE properties ADD COLUMN land_tax DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER deed_no",
        'total_floors' => "ALTER TABLE properties ADD COLUMN total_floors INT UNSIGNED NOT NULL DEFAULT 0 AFTER country",
        'total_units' => "ALTER TABLE properties ADD COLUMN total_units INT UNSIGNED NOT NULL DEFAULT 0 AFTER total_floors",
        'garage_count' => "ALTER TABLE properties ADD COLUMN garage_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER total_units",
        'rent_min' => "ALTER TABLE properties ADD COLUMN rent_min DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER area_sqft",
        'rent_max' => "ALTER TABLE properties ADD COLUMN rent_max DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER rent_min",
        'image' => "ALTER TABLE properties ADD COLUMN image VARCHAR(255) NULL AFTER security_deposit",
        'deleted_at' => "ALTER TABLE properties ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at",
        'deleted_by' => "ALTER TABLE properties ADD COLUMN deleted_by BIGINT UNSIGNED NULL AFTER deleted_at",
    ];

    foreach ($columns as $column => $sql) {
        if (!property_column_exists($column)) {
            db()->exec($sql);
        }
    }

    db()->exec(
        'UPDATE properties
         SET rent_min = CASE WHEN rent_min = 0.00 THEN monthly_rent ELSE rent_min END,
             rent_max = CASE WHEN rent_max = 0.00 THEN monthly_rent ELSE rent_max END'
    );

    if (!property_index_exists('properties_deleted_at_index')) {
        db()->exec('ALTER TABLE properties ADD KEY properties_deleted_at_index (deleted_at)');
    }

    fwrite(STDOUT, "Phase 5 property migration completed.\n");
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script must be run from the command line.\n");
}

function table_column_exists(string $column): bool
{
    $statement = db()->prepare(
        'SELECT COUNT(*) AS total
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = :table_name
           AND column_name = :column_name'
    );
    $statement->execute([
        'table_name' => 'users',
        'column_name' => $column,
    ]);
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0) > 0;
}

function table_index_exists(string $indexName): bool
{
    $statement = db()->prepare(
        'SELECT COUNT(*) AS total
         FROM information_schema.statistics
         WHERE table_schema = DATABASE()
           AND table_name = :table_name
           AND index_name = :index_name'
    );
    $statement->execute([
        'table_name' => 'users',
        'index_name' => $indexName,
    ]);
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0) > 0;
}

function add_column_if_missing(string $columnName, string $definition, ?string $after = null): void
{
    if (table_column_exists($columnName)) {
        fwrite(STDOUT, "Column already exists: {$columnName}\n");
        return;
    }

    $sql = 'ALTER TABLE users ADD COLUMN ' . $definition;

    if ($after !== null) {
        $sql .= ' AFTER ' . $after;
    }

    db()->exec($sql);
    fwrite(STDOUT, "Added column: {$columnName}\n");
}

function add_index_if_missing(string $indexName, string $definition): void
{
    if (table_index_exists($indexName)) {
        fwrite(STDOUT, "Index already exists: {$indexName}\n");
        return;
    }

    db()->exec('ALTER TABLE users ADD INDEX ' . $definition);
    fwrite(STDOUT, "Added index: {$indexName}\n");
}

add_column_if_missing('phone', 'phone VARCHAR(32) NULL', 'status');
add_column_if_missing('profile_photo_path', 'profile_photo_path VARCHAR(255) NULL', 'phone');
add_column_if_missing('must_change_password', 'must_change_password TINYINT(1) NOT NULL DEFAULT 0', 'profile_photo_path');
add_column_if_missing('last_login_at', 'last_login_at TIMESTAMP NULL DEFAULT NULL', 'must_change_password');
add_column_if_missing('password_changed_at', 'password_changed_at TIMESTAMP NULL DEFAULT NULL', 'last_login_at');
add_column_if_missing('failed_login_attempts', 'failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0', 'password_changed_at');
add_column_if_missing('locked_until', 'locked_until TIMESTAMP NULL DEFAULT NULL', 'failed_login_attempts');
add_index_if_missing('users_locked_until_index', 'users_locked_until_index (locked_until)');

$statement = db()->prepare(
    "UPDATE users
     SET role = 'owner'
     WHERE LOWER(role) IN ('admin', 'administrator')"
);
$statement->execute();

fwrite(STDOUT, "Phase 1 auth migration completed.\n");

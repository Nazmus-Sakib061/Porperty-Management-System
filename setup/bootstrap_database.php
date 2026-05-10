<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script must be run from the command line.\n");
}

$databaseConfig = require __DIR__ . '/../config/database.php';
$host = (string) ($databaseConfig['host'] ?? '127.0.0.1');
$port = (string) ($databaseConfig['port'] ?? '3306');
$database = (string) ($databaseConfig['database'] ?? 'property_management');
$username = (string) ($databaseConfig['username'] ?? 'root');
$password = (string) ($databaseConfig['password'] ?? '');
$charset = (string) ($databaseConfig['charset'] ?? 'utf8mb4');

try {
    $server = new PDO(
        sprintf('mysql:host=%s;port=%s;charset=%s', $host, $port, $charset),
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    $server->exec(
        sprintf(
            'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
            str_replace('`', '``', $database)
        )
    );

    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $host, $port, $database, $charset),
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    $schema = file_get_contents(__DIR__ . '/../database/schema.sql');

    if ($schema === false) {
        throw new RuntimeException('Unable to read database/schema.sql.');
    }

    $pdo->exec($schema);

    fwrite(STDOUT, "Database initialized successfully.\n");
    fwrite(STDOUT, "Database: {$database}\n");
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

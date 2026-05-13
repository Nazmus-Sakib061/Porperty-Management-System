<?php

declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = (array) config('database');
    $driver = (string) ($config['driver'] ?? 'mysql');

    if ($driver !== 'mysql') {
        throw new RuntimeException('Unsupported database driver: ' . $driver);
    }

    $dsn = sprintf(
        '%s:host=%s;port=%s;dbname=%s;charset=%s',
        $driver,
        $config['host'] ?? '127.0.0.1',
        $config['port'] ?? '3306',
        $config['database'] ?? '',
        $config['charset'] ?? 'utf8mb4'
    );

    try {
        $pdo = new PDO(
            $dsn,
            (string) ($config['username'] ?? 'root'),
            (string) ($config['password'] ?? ''),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (PDOException $exception) {
        throw new RuntimeException(
            'Database connection failed. Check config/database.php and your MySQL service.',
            (int) $exception->getCode(),
            $exception
        );
    }

    return $pdo;
}

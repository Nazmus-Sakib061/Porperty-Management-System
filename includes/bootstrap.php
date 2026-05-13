<?php

declare(strict_types=1);

function load_env_file(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $values = parse_ini_file($path, false, INI_SCANNER_RAW);

    if ($values === false) {
        return;
    }

    foreach ($values as $key => $value) {
        $key = trim((string) $key);

        if ($key === '') {
            continue;
        }

        if (getenv($key) !== false) {
            continue;
        }

        $stringValue = is_array($value) ? '' : (string) $value;
        putenv($key . '=' . $stringValue);
        $_ENV[$key] = $stringValue;
        $_SERVER[$key] = $stringValue;
    }
}

load_env_file(__DIR__ . '/../.env');

$GLOBALS['config'] = [
    'app' => require __DIR__ . '/../config/app.php',
    'database' => require __DIR__ . '/../config/database.php',
];

$appConfig = $GLOBALS['config']['app'];

date_default_timezone_set($appConfig['timezone']);

ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.use_trans_sid', '0');
ini_set('session.cookie_httponly', '1');
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);
session_cache_limiter('nocache');

// Keep PHP session files inside the project so the local Windows setup can write them safely.
$sessionSavePath = __DIR__ . '/../logs/sessions';
if (!is_dir($sessionSavePath)) {
    mkdir($sessionSavePath, 0777, true);
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name($appConfig['session_name']);
    session_save_path($sessionSavePath);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => (bool) ($appConfig['session_secure'] ?? false) || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/users.php';
require_once __DIR__ . '/oauth.php';
require_once __DIR__ . '/properties.php';
require_once __DIR__ . '/units.php';
require_once __DIR__ . '/tenants.php';
require_once __DIR__ . '/leases.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/layout.php';

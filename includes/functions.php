<?php

declare(strict_types=1);

function config(string $group, ?string $key = null, mixed $default = null): mixed
{
    $groupConfig = $GLOBALS['config'][$group] ?? [];

    if ($key === null) {
        return $groupConfig;
    }

    return $groupConfig[$key] ?? $default;
}

function app_config(?string $key = null, mixed $default = null): mixed
{
    return config('app', $key, $default);
}

function env(string $key, mixed $default = null): mixed
{
    $value = getenv($key);

    return $value === false ? $default : $value;
}

function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function app_url(string $path = ''): string
{
    $base = rtrim((string) app_config('base_url', '/'), '/');
    $path = ltrim($path, '/');

    if ($path === '') {
        return $base === '' ? '/' : $base . '/';
    }

    if ($base === '') {
        return '/' . $path;
    }

    return $base . '/' . $path;
}

function redirect(string $path): void
{
    header('Location: ' . app_url($path));
    exit;
}

function set_flash(string $key, mixed $value): void
{
    if (!isset($_SESSION['flash'])) {
        $_SESSION['flash'] = [];
    }

    $_SESSION['flash'][$key] = $value;
}

function flash(string $key, mixed $default = null): mixed
{
    if (!isset($_SESSION['flash'][$key])) {
        return $default;
    }

    $value = $_SESSION['flash'][$key];
    unset($_SESSION['flash'][$key]);

    return $value;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return (string) $_SESSION['csrf_token'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . e(csrf_token()) . '">';
}

function verify_csrf_token(?string $token): bool
{
    $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

    return is_string($token) && $sessionToken !== '' && hash_equals($sessionToken, $token);
}

function role_label(?string $role): string
{
    $role = strtolower(trim((string) $role));

    if ($role === '' || $role === 'admin' || $role === 'administrator') {
        $role = $role === '' ? '' : 'owner';
    }

    if ($role === '') {
        return 'Guest';
    }

    $roles = (array) app_config('roles', []);

    return $roles[$role] ?? ucwords(str_replace('_', ' ', $role));
}

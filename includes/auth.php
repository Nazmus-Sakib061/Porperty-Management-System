<?php

declare(strict_types=1);

function current_user(): ?array
{
    if (array_key_exists('_current_user_cache', $GLOBALS)) {
        return $GLOBALS['_current_user_cache'];
    }

    $sessionUser = $_SESSION['user'] ?? null;

    if (!is_array($sessionUser) || (int) ($sessionUser['id'] ?? 0) <= 0) {
        $GLOBALS['_current_user_cache'] = null;

        return null;
    }

    try {
        $record = load_user_record_by_id((int) $sessionUser['id']);
    } catch (Throwable $exception) {
        logout_user();

        return null;
    }

    if ($record === null || strtolower((string) ($record['status'] ?? 'inactive')) !== 'active') {
        logout_user();

        return null;
    }

    $record['logged_in_at'] = (int) ($sessionUser['logged_in_at'] ?? time());
    $user = build_user_payload($record);
    $_SESSION['user'] = build_session_user_payload($record);
    $_SESSION['user']['logged_in_at'] = $record['logged_in_at'];
    $GLOBALS['_current_user_cache'] = $user;

    return $user;
}

function login_user(array $user): void
{
    session_regenerate_id(true);

    $user['logged_in_at'] = time();
    $_SESSION['user'] = build_session_user_payload($user);
    unset($_SESSION['csrf_token']);
    csrf_token();
    $GLOBALS['_current_user_cache'] = build_user_payload($user);
}

function is_logged_in(): bool
{
    return current_user() !== null;
}

function logout_user(): void
{
    unset($GLOBALS['_current_user_cache']);
    $_SESSION = [];

    if (session_status() !== PHP_SESSION_ACTIVE) {
        return;
    }

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'] ?? '/',
            'domain' => $params['domain'] ?? '',
            'secure' => (bool) ($params['secure'] ?? false),
            'httponly' => (bool) ($params['httponly'] ?? true),
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);
    }

    session_destroy();
}

function require_login(?string $redirectPath = null): void
{
    if (current_user() !== null) {
        return;
    }

    set_flash('error', 'Please sign in to continue.');
    redirect($redirectPath ?? (string) app_config('login_path', 'pages/login.php'));
}

function has_role(string|array $roles, ?array $user = null): bool
{
    $user = $user ?? current_user();

    if ($user === null) {
        return false;
    }

    $currentRole = normalize_role((string) ($user['role'] ?? ''));

    if ($currentRole === 'owner') {
        return true;
    }

    $roles = array_map(
        static fn (string $role): string => normalize_role($role),
        (array) $roles
    );

    return in_array($currentRole, $roles, true);
}

function require_role(string|array $roles, ?string $redirectPath = null): void
{
    require_login();

    if (has_role($roles)) {
        return;
    }

    set_flash('error', 'You do not have permission to access that page.');
    redirect($redirectPath ?? (string) app_config('unauthorized_path', 'pages/unauthorized.php'));
}

function authenticate_user(string $email, string $password): ?array
{
    $email = normalize_email($email);

    if ($email === '' || $password === '') {
        return null;
    }

    $record = load_user_record_by_email($email, true);

    if ($record === null) {
        return null;
    }

    $record['role'] = normalize_role((string) ($record['role'] ?? 'staff'));

    if (strtolower((string) ($record['status'] ?? 'inactive')) !== 'active') {
        return null;
    }

    if (user_is_locked($record)) {
        return null;
    }

    $storedHash = (string) ($record['password'] ?? '');

    if ($storedHash === '' || !password_verify($password, $storedHash)) {
        mark_login_failure((int) $record['id'], (int) ($record['failed_login_attempts'] ?? 0));

        return null;
    }

    try {
        clear_login_attempts((int) $record['id']);
        touch_user_last_login((int) $record['id']);

        if (password_needs_rehash($storedHash, PASSWORD_DEFAULT)) {
            update_user_password_hash((int) $record['id'], password_hash($password, PASSWORD_DEFAULT));
        }
    } catch (Throwable $exception) {
        // Do not block a valid login if a non-critical audit update fails.
    }

    unset($record['password']);

    return $record;
}

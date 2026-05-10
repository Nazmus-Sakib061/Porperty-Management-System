<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);
$sessionUser = api_require_login();

$data = api_input();
$csrfToken = (string) ($data['csrfToken'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

$password = (string) ($data['currentPassword'] ?? $data['current_password'] ?? '');

if ($password === '') {
    api_response([
        'ok' => false,
        'message' => 'Please confirm your current password to save profile changes.',
    ], 422);
}

$authRecord = load_user_record_by_id((int) $sessionUser['id'], true);

if ($authRecord === null || !password_verify($password, (string) ($authRecord['password'] ?? ''))) {
    api_response([
        'ok' => false,
        'message' => 'Current password is incorrect.',
    ], 422);
}

try {
    $updatedUser = update_user_profile((int) $sessionUser['id'], [
        'name' => $data['name'] ?? '',
        'email' => $data['email'] ?? '',
        'phone' => $data['phone'] ?? null,
    ]);
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The profile could not be updated.',
    ], 500);
}

$updatedUser['logged_in_at'] = (int) ($sessionUser['logged_in_at'] ?? time());
$_SESSION['user'] = build_session_user_payload($updatedUser);
$GLOBALS['_current_user_cache'] = build_user_payload($updatedUser);

api_response([
    'ok' => true,
    'message' => 'Profile updated successfully.',
    'csrfToken' => csrf_token(),
    'user' => api_user_payload($updatedUser),
]);

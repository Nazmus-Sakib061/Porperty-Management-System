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

$currentPassword = (string) ($data['currentPassword'] ?? $data['current_password'] ?? '');
$newPassword = (string) ($data['newPassword'] ?? $data['new_password'] ?? '');
$confirmPassword = (string) ($data['confirmPassword'] ?? $data['confirm_password'] ?? '');

if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
    api_response([
        'ok' => false,
        'message' => 'Please complete all password fields.',
    ], 422);
}

$authRecord = load_user_record_by_id((int) $sessionUser['id'], true);

if ($authRecord === null || !password_verify($currentPassword, (string) ($authRecord['password'] ?? ''))) {
    api_response([
        'ok' => false,
        'message' => 'Current password is incorrect.',
    ], 422);
}

if ($newPassword !== $confirmPassword) {
    api_response([
        'ok' => false,
        'message' => 'Password confirmation does not match.',
    ], 422);
}

if (password_verify($newPassword, (string) ($authRecord['password'] ?? ''))) {
    api_response([
        'ok' => false,
        'message' => 'The new password must be different from the current password.',
    ], 422);
}

try {
    $validatedPassword = validate_password_policy($newPassword);
    update_user_password_hash((int) $sessionUser['id'], hash_password_secure($validatedPassword));
    session_regenerate_id(true);
    $freshRecord = load_user_record_by_id((int) $sessionUser['id']);

    if ($freshRecord !== null) {
        $freshRecord['logged_in_at'] = (int) ($sessionUser['logged_in_at'] ?? time());
        $_SESSION['user'] = build_session_user_payload($freshRecord);
        $GLOBALS['_current_user_cache'] = build_user_payload($freshRecord);
    }
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The password could not be changed.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Password changed successfully.',
    'csrfToken' => csrf_token(),
    'user' => api_user_payload(current_user()),
]);

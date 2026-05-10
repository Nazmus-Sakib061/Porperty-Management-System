<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);
$sessionUser = api_require_login();

$csrfToken = (string) ($_POST['csrfToken'] ?? $_POST['csrf_token'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

$file = $_FILES['photo'] ?? $_FILES['profilePhoto'] ?? null;

if (!is_array($file)) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a profile photo.',
    ], 422);
}

$existingRecord = load_user_record_by_id((int) $sessionUser['id']);
$previousPhoto = $existingRecord['profile_photo_path'] ?? null;

try {
    $upload = store_profile_photo_upload((int) $sessionUser['id'], $file);
    $updatedUser = update_user_profile_photo((int) $sessionUser['id'], $upload['relativePath']);

    if ($previousPhoto !== null && $previousPhoto !== $upload['relativePath']) {
        delete_profile_photo_file($previousPhoto);
    }
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    if (isset($upload['relativePath'])) {
        delete_profile_photo_file($upload['relativePath']);
    }

    api_response([
        'ok' => false,
        'message' => 'The profile photo could not be uploaded.',
    ], 500);
}

$updatedUser['logged_in_at'] = (int) ($sessionUser['logged_in_at'] ?? time());
$_SESSION['user'] = build_session_user_payload($updatedUser);
$GLOBALS['_current_user_cache'] = build_user_payload($updatedUser);

api_response([
    'ok' => true,
    'message' => 'Profile photo updated successfully.',
    'csrfToken' => csrf_token(),
    'user' => api_user_payload($updatedUser),
]);

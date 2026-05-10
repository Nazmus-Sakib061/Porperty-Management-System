<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);

$data = api_input();
$email = trim((string) ($data['email'] ?? ''));
$password = (string) ($data['password'] ?? '');
$csrfToken = (string) ($data['csrfToken'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

try {
    $user = authenticate_user($email, $password);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'Database connection failed. Check the backend config.',
    ], 500);
}

if ($user === null) {
    api_response([
        'ok' => false,
        'message' => 'Invalid credentials or inactive account.',
    ], 401);
}

login_user($user);

api_response([
    'ok' => true,
    'message' => 'Welcome back.',
    'csrfToken' => csrf_token(),
    'user' => api_user_payload($user),
]);

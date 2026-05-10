<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);

$data = api_input();
$name = (string) ($data['name'] ?? '');
$email = (string) ($data['email'] ?? '');
$password = (string) ($data['password'] ?? '');
$confirmPassword = (string) ($data['confirmPassword'] ?? $data['confirm_password'] ?? '');
$csrfToken = (string) ($data['csrfToken'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

if (count_owner_accounts() > 0) {
    api_response([
        'ok' => false,
        'message' => 'Owner registration is closed. Sign in with an existing account.',
    ], 403);
}

if ($password !== $confirmPassword) {
    api_response([
        'ok' => false,
        'message' => 'Password confirmation does not match.',
    ], 422);
}

try {
    $user = create_user_record([
        'name' => $name,
        'email' => $email,
        'password' => $password,
        'role' => 'owner',
        'status' => 'active',
        'must_change_password' => false,
    ]);
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The owner account could not be created. Please try again.',
    ], 500);
}

login_user($user);

api_response([
    'ok' => true,
    'message' => 'Owner account created successfully.',
    'csrfToken' => csrf_token(),
    'user' => api_user_payload($user),
]);

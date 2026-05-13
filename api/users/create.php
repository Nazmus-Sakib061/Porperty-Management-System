<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);
$currentUser = api_require_role('owner');

$data = api_input();
$csrfToken = (string) ($data['csrfToken'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

$requestedRole = normalize_role((string) ($data['role'] ?? 'staff'));

if (!can_assign_role($currentUser['role'] ?? null, $requestedRole)) {
    api_response([
        'ok' => false,
        'message' => 'You cannot create an account with that role.',
    ], 403);
}

$password = trim((string) ($data['password'] ?? ''));
$confirmPassword = trim((string) ($data['confirmPassword'] ?? $data['confirm_password'] ?? ''));
$generatePassword = filter_var($data['generatePassword'] ?? false, FILTER_VALIDATE_BOOL);
$mustChangePassword = filter_var($data['mustChangePassword'] ?? false, FILTER_VALIDATE_BOOL);
$temporaryPassword = null;

if ($generatePassword) {
    $password = generate_temporary_password();
    $confirmPassword = $password;
    $mustChangePassword = true;
}

if ($password === '') {
    api_response([
        'ok' => false,
        'message' => 'Please enter a password or enable secure password generation.',
    ], 422);
}

if ($password !== $confirmPassword) {
    api_response([
        'ok' => false,
        'message' => 'Password confirmation does not match.',
    ], 422);
}

try {
    $user = create_user_record([
        'name' => $data['name'] ?? '',
        'email' => $data['email'] ?? '',
        'password' => $password,
        'role' => $requestedRole,
        'status' => 'active',
        'phone' => $data['phone'] ?? null,
        'must_change_password' => $mustChangePassword,
    ]);

    if ($generatePassword) {
        $temporaryPassword = $password;
    }
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The account could not be created. Please try again.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'User account created successfully.',
    'user' => api_user_payload($user),
    'temporaryPassword' => $temporaryPassword,
]);

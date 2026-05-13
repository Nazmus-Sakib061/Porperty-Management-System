<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);

$data = api_input();
$csrfToken = (string) ($data['csrfToken'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

logout_user();

api_response([
    'ok' => true,
    'message' => 'Signed out successfully.',
]);

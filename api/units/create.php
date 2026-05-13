<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);
$currentUser = api_require_role(['owner', 'manager']);

$data = api_input();
$csrfToken = (string) ($data['csrfToken'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

try {
    $unit = create_unit_record($data, (int) ($currentUser['id'] ?? 0));
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The unit could not be created.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Unit created successfully.',
    'csrfToken' => csrf_token(),
    'unit' => build_unit_payload($unit),
]);

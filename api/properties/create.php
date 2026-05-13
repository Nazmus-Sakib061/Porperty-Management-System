<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);
$currentUser = api_require_role(['owner', 'manager', 'staff']);

$data = api_input();
$csrfToken = (string) ($data['csrfToken'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

try {
    $property = create_property_record($data, (int) ($currentUser['id'] ?? 0));
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The property could not be created.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Property created successfully.',
    'csrfToken' => csrf_token(),
    'property' => build_property_payload($property),
]);

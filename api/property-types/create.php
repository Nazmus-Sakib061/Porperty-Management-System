<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);
api_require_role('owner');

$data = api_input();
$csrfToken = (string) ($data['csrfToken'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

try {
    $type = create_property_type_record($data);
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The property type could not be created.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Property type created successfully.',
    'csrfToken' => csrf_token(),
    'propertyType' => build_property_type_payload($type),
]);


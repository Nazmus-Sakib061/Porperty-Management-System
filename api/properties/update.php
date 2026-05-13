<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);
api_require_role(['owner', 'manager', 'staff']);

$data = api_input();
$csrfToken = (string) ($data['csrfToken'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

$propertyId = (int) ($data['id'] ?? $data['propertyId'] ?? $data['property_id'] ?? 0);

if ($propertyId <= 0) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a property.',
    ], 422);
}

try {
    $property = update_property_record($propertyId, $data);
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The property could not be updated.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Property updated successfully.',
    'csrfToken' => csrf_token(),
    'property' => build_property_payload($property),
]);

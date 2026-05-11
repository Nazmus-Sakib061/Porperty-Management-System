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

$propertyId = (int) ($data['propertyId'] ?? $data['property_id'] ?? 0);
$imageId = (int) ($data['imageId'] ?? $data['image_id'] ?? 0);

if ($propertyId <= 0 || $imageId <= 0) {
    api_response([
        'ok' => false,
        'message' => 'Please choose an image to delete.',
    ], 422);
}

try {
    delete_property_image_record($propertyId, $imageId);
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The property image could not be deleted.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Property image deleted successfully.',
    'csrfToken' => csrf_token(),
    'deletedId' => $imageId,
    'property' => build_property_payload(load_property_record_by_id($propertyId) ?? []),
]);

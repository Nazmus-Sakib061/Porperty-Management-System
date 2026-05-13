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

$typeId = (int) ($data['id'] ?? $data['propertyTypeId'] ?? $data['property_type_id'] ?? 0);

if ($typeId <= 0) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a property type.',
    ], 422);
}

try {
    delete_property_type_record($typeId);
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The property type could not be deleted.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Property type deleted successfully.',
    'csrfToken' => csrf_token(),
    'deletedId' => $typeId,
]);


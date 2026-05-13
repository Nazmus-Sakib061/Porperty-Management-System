<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);
api_require_role(['owner', 'manager']);

$data = api_input();
$csrfToken = (string) ($data['csrfToken'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

$leaseId = (int) ($data['id'] ?? $data['leaseId'] ?? $data['lease_id'] ?? 0);

if ($leaseId <= 0) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a lease.',
    ], 422);
}

try {
    delete_lease_record($leaseId);
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The lease could not be deleted.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Lease deleted successfully.',
    'csrfToken' => csrf_token(),
    'deletedId' => $leaseId,
]);

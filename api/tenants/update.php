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

$tenantId = (int) ($data['id'] ?? $data['tenantId'] ?? $data['tenant_id'] ?? 0);

if ($tenantId <= 0) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a tenant.',
    ], 422);
}

try {
    $tenant = update_tenant_record($tenantId, $data);
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The tenant could not be updated.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Tenant updated successfully.',
    'csrfToken' => csrf_token(),
    'tenant' => build_tenant_payload($tenant),
]);

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

$tenantId = (int) ($data['tenantId'] ?? $data['tenant_id'] ?? 0);
$documentId = (int) ($data['documentId'] ?? $data['document_id'] ?? 0);

if ($tenantId <= 0 || $documentId <= 0) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a document to delete.',
    ], 422);
}

try {
    delete_tenant_document_record($tenantId, $documentId);
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The tenant document could not be deleted.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Tenant document deleted successfully.',
    'csrfToken' => csrf_token(),
    'deletedId' => $documentId,
    'tenant' => build_tenant_payload(load_tenant_record_by_id($tenantId) ?? []),
]);

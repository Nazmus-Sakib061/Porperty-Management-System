<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);
api_require_role(['owner', 'manager']);

$csrfToken = (string) ($_POST['csrfToken'] ?? $_POST['csrf_token'] ?? '');

if (!verify_csrf_token($csrfToken)) {
    api_response([
        'ok' => false,
        'message' => 'Security token expired. Refresh the page and try again.',
    ], 419);
}

$tenantId = (int) ($_POST['tenantId'] ?? $_POST['tenant_id'] ?? 0);
$caption = validate_tenant_caption($_POST['caption'] ?? null);
$file = $_FILES['document'] ?? $_FILES['file'] ?? null;

if ($tenantId <= 0) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a tenant.',
    ], 422);
}

if (load_tenant_record_by_id($tenantId) === null) {
    api_error('The selected tenant does not exist.', 404);
}

if (!is_array($file)) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a document.',
    ], 422);
}

$upload = null;

try {
    $upload = store_tenant_document_upload($tenantId, $file);
    $document = insert_tenant_document_record($tenantId, $upload, $caption, (string) ($file['name'] ?? 'document'));
} catch (InvalidArgumentException $exception) {
    if (is_array($upload) && isset($upload['relativePath'])) {
        delete_tenant_document_file($upload['relativePath']);
    }

    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    if (is_array($upload) && isset($upload['relativePath'])) {
        delete_tenant_document_file($upload['relativePath']);
    }

    api_response([
        'ok' => false,
        'message' => 'The tenant document could not be uploaded.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Tenant document uploaded successfully.',
    'csrfToken' => csrf_token(),
    'document' => build_tenant_document_payload($document),
    'tenant' => build_tenant_payload(load_tenant_record_by_id($tenantId) ?? []),
]);

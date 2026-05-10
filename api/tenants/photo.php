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
$file = $_FILES['photo'] ?? $_FILES['image'] ?? null;

if ($tenantId <= 0) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a tenant.',
    ], 422);
}

$tenant = load_tenant_record_by_id($tenantId);

if ($tenant === null) {
    api_error('The selected tenant does not exist.', 404);
}

if (!is_array($file)) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a tenant photo.',
    ], 422);
}

$upload = null;

try {
    $upload = store_tenant_photo_upload($tenantId, $file);
    $oldPhotoPath = $tenant['profile_photo_path'] ?? null;

    $statement = db()->prepare(
        'UPDATE tenants
         SET profile_photo_path = :profile_photo_path
         WHERE id = :id'
    );
    $statement->execute([
        'id' => $tenantId,
        'profile_photo_path' => $upload['relativePath'],
    ]);

    if ($oldPhotoPath !== null && $oldPhotoPath !== $upload['relativePath']) {
        delete_tenant_photo_file((string) $oldPhotoPath);
    }
} catch (InvalidArgumentException $exception) {
    if (is_array($upload) && isset($upload['relativePath'])) {
        delete_tenant_photo_file($upload['relativePath']);
    }

    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    if (is_array($upload) && isset($upload['relativePath'])) {
        delete_tenant_photo_file($upload['relativePath']);
    }

    api_response([
        'ok' => false,
        'message' => 'The tenant photo could not be uploaded.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Tenant photo uploaded successfully.',
    'csrfToken' => csrf_token(),
    'tenant' => build_tenant_payload(load_tenant_record_by_id($tenantId) ?? []),
]);

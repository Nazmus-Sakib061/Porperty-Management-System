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

$propertyId = (int) ($_POST['propertyId'] ?? $_POST['property_id'] ?? 0);
$caption = validate_optional_property_text($_POST['caption'] ?? null, 191);
$makePrimary = filter_var($_POST['makePrimary'] ?? $_POST['make_primary'] ?? false, FILTER_VALIDATE_BOOL);
$file = $_FILES['image'] ?? $_FILES['photo'] ?? null;

if ($propertyId <= 0) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a property.',
    ], 422);
}

if (load_property_record_by_id($propertyId) === null) {
    api_response([
        'ok' => false,
        'message' => 'The selected property does not exist.',
    ], 404);
}

if (!is_array($file)) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a property image.',
    ], 422);
}

$upload = null;

try {
    $upload = store_property_image_upload($propertyId, $file);
    $image = insert_property_image_record($propertyId, $upload, $caption, (bool) $makePrimary);
} catch (InvalidArgumentException $exception) {
    if (is_array($upload) && isset($upload['relativePath'])) {
        delete_property_image_file($upload['relativePath']);
    }

    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    if (is_array($upload) && isset($upload['relativePath'])) {
        delete_property_image_file($upload['relativePath']);
    }

    api_response([
        'ok' => false,
        'message' => 'The property image could not be uploaded.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Property image uploaded successfully.',
    'csrfToken' => csrf_token(),
    'image' => build_property_image_payload($image),
    'property' => build_property_payload(load_property_record_by_id($propertyId) ?? []),
]);


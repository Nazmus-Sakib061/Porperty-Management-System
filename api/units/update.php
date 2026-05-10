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

$unitId = (int) ($data['id'] ?? $data['unitId'] ?? $data['unit_id'] ?? 0);

if ($unitId <= 0) {
    api_response([
        'ok' => false,
        'message' => 'Please choose a unit.',
    ], 422);
}

try {
    $unit = update_unit_record($unitId, $data);
} catch (InvalidArgumentException $exception) {
    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    api_response([
        'ok' => false,
        'message' => 'The unit could not be updated.',
    ], 500);
}

api_response([
    'ok' => true,
    'message' => 'Unit updated successfully.',
    'csrfToken' => csrf_token(),
    'unit' => build_unit_payload($unit),
]);

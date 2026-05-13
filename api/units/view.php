<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);
api_require_login();

$unitId = (int) ($_GET['id'] ?? $_GET['unitId'] ?? $_GET['unit_id'] ?? 0);

if ($unitId <= 0) {
    api_error('Please choose a unit.', 422);
}

$unit = load_unit_record_by_id($unitId);

if ($unit === null) {
    api_error('The selected unit does not exist.', 404);
}

api_response([
    'ok' => true,
    'unit' => build_unit_payload($unit),
    'properties' => list_property_records(100, 0, null, null, null),
    'statusOptions' => allowed_unit_statuses(),
]);

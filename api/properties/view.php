<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);
api_require_login();

$propertyId = (int) ($_GET['id'] ?? $_GET['propertyId'] ?? $_GET['property_id'] ?? 0);

if ($propertyId <= 0) {
    api_error('Please choose a property.', 422);
}

$property = load_property_record_by_id($propertyId);

if ($property === null) {
    api_error('The selected property does not exist.', 404);
}

api_response([
    'ok' => true,
    'property' => build_property_payload($property),
    'propertyTypes' => list_property_type_records(),
    'statusOptions' => allowed_property_statuses(),
]);


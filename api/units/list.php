<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);
api_require_login();

$query = trim((string) ($_GET['q'] ?? ''));
$status = trim((string) ($_GET['status'] ?? ''));
$propertyId = (int) ($_GET['propertyId'] ?? $_GET['property_id'] ?? 0);
$limit = (int) ($_GET['limit'] ?? 50);
$offset = (int) ($_GET['offset'] ?? 0);

api_response([
    'ok' => true,
    'units' => list_unit_records(
        $limit,
        $offset,
        $query !== '' ? $query : null,
        $status !== '' ? $status : null,
        $propertyId > 0 ? $propertyId : null
    ),
    'properties' => list_property_records(100, 0, null, null, null),
    'statusOptions' => allowed_unit_statuses(),
    'meta' => [
        'search' => $query,
        'status' => $status,
        'propertyId' => $propertyId > 0 ? $propertyId : null,
        'limit' => $limit,
        'offset' => $offset,
    ],
]);

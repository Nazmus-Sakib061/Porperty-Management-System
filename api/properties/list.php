<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);
api_require_login();

$query = trim((string) ($_GET['q'] ?? ''));
$status = trim((string) ($_GET['status'] ?? ''));
$propertyTypeId = (int) ($_GET['propertyTypeId'] ?? $_GET['property_type_id'] ?? 0);
$limit = (int) ($_GET['limit'] ?? 50);
$offset = (int) ($_GET['offset'] ?? 0);

api_response([
    'ok' => true,
    'properties' => list_property_records(
        $limit,
        $offset,
        $query !== '' ? $query : null,
        $status !== '' ? $status : null,
        $propertyTypeId > 0 ? $propertyTypeId : null
    ),
    'propertyTypes' => list_property_type_records(),
    'statusOptions' => allowed_property_statuses(),
    'meta' => [
        'search' => $query,
        'status' => $status,
        'propertyTypeId' => $propertyTypeId > 0 ? $propertyTypeId : null,
        'limit' => $limit,
        'offset' => $offset,
    ],
]);


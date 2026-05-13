<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);
api_require_login();

$propertyId = (int) ($_GET['propertyId'] ?? $_GET['property_id'] ?? 0);
$limit = (int) ($_GET['limit'] ?? 50);
$offset = (int) ($_GET['offset'] ?? 0);

api_response([
    'ok' => true,
    'leases' => list_lease_records(
        $limit,
        $offset,
        $propertyId > 0 ? $propertyId : null
    ),
    'statusOptions' => allowed_lease_statuses(),
    'meta' => [
        'propertyId' => $propertyId > 0 ? $propertyId : null,
        'limit' => $limit,
        'offset' => $offset,
    ],
]);

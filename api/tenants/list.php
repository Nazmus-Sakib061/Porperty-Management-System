<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);
api_require_login();

$query = trim((string) ($_GET['q'] ?? ''));
$status = trim((string) ($_GET['status'] ?? ''));
$unitId = (int) ($_GET['unitId'] ?? $_GET['unit_id'] ?? 0);
$limit = (int) ($_GET['limit'] ?? 50);
$offset = (int) ($_GET['offset'] ?? 0);

api_response([
    'ok' => true,
    'tenants' => list_tenant_records(
        $limit,
        $offset,
        $query !== '' ? $query : null,
        $status !== '' ? $status : null,
        $unitId > 0 ? $unitId : null
    ),
    'units' => list_tenant_unit_options(),
    'statusOptions' => allowed_tenant_statuses(),
    'meta' => [
        'search' => $query,
        'status' => $status,
        'unitId' => $unitId > 0 ? $unitId : null,
        'limit' => $limit,
        'offset' => $offset,
    ],
]);

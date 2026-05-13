<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);
api_require_login();

$leaseId = (int) ($_GET['id'] ?? $_GET['leaseId'] ?? $_GET['lease_id'] ?? 0);

if ($leaseId <= 0) {
    api_error('Please choose a lease.', 422);
}

$lease = load_lease_record_by_id($leaseId);

if ($lease === null) {
    api_error('The selected lease does not exist.', 404);
}

api_response([
    'ok' => true,
    'lease' => build_lease_payload($lease),
    'statusOptions' => allowed_lease_statuses(),
]);

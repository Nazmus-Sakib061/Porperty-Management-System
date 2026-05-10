<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);
api_require_login();

$tenantId = (int) ($_GET['id'] ?? $_GET['tenantId'] ?? $_GET['tenant_id'] ?? 0);

if ($tenantId <= 0) {
    api_error('Please choose a tenant.', 422);
}

$tenant = load_tenant_record_by_id($tenantId);

if ($tenant === null) {
    api_error('The selected tenant does not exist.', 404);
}

api_response([
    'ok' => true,
    'tenant' => build_tenant_payload($tenant),
    'units' => list_tenant_unit_options(),
    'statusOptions' => allowed_tenant_statuses(),
]);

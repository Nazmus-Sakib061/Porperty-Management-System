<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);
api_require_login();

try {
    $stats = db()->query(
        'SELECT
            COUNT(*) AS total_users,
            SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) AS active_users,
            SUM(CASE WHEN LOWER(role) IN ("owner", "admin", "administrator") THEN 1 ELSE 0 END) AS owner_users,
            SUM(CASE WHEN LOWER(role) = "manager" THEN 1 ELSE 0 END) AS manager_users,
            SUM(CASE WHEN LOWER(role) = "staff" THEN 1 ELSE 0 END) AS staff_users
         FROM users'
    )->fetch() ?: [];
} catch (Throwable $exception) {
    $stats = [];
}

try {
    $propertyStats = property_summary_stats();
} catch (Throwable $exception) {
    $propertyStats = [
        'properties' => [
            'total' => 0,
            'available' => 0,
            'occupied' => 0,
            'maintenance' => 0,
            'inactive' => 0,
            'withArea' => 0,
        ],
        'types' => [
            'total' => 0,
            'active' => 0,
            'inactive' => 0,
        ],
    ];
}

try {
    $unitStats = unit_summary_stats();
} catch (Throwable $exception) {
    $unitStats = [
        'units' => [
            'total' => 0,
            'available' => 0,
            'occupied' => 0,
            'maintenance' => 0,
            'inactive' => 0,
            'linkedProperties' => 0,
        ],
    ];
}

try {
    $tenantStats = tenant_summary_stats();
} catch (Throwable $exception) {
    $tenantStats = [
        'tenants' => [
            'total' => 0,
            'active' => 0,
            'inactive' => 0,
            'assigned' => 0,
            'unassigned' => 0,
        ],
        'documents' => [
            'total' => 0,
        ],
    ];
}

$summary = [
    'cards' => [
        [
            'label' => 'Total users',
            'value' => (int) ($stats['total_users'] ?? 0),
            'tone' => 'indigo',
        ],
        [
            'label' => 'Properties',
            'value' => (int) ($propertyStats['properties']['total'] ?? 0),
            'tone' => 'emerald',
        ],
        [
            'label' => 'Units',
            'value' => (int) ($unitStats['units']['total'] ?? 0),
            'tone' => 'violet',
        ],
        [
            'label' => 'Tenants',
            'value' => (int) ($tenantStats['tenants']['total'] ?? 0),
            'tone' => 'emerald',
        ],
        [
            'label' => 'Available units',
            'value' => (int) ($unitStats['units']['available'] ?? 0),
            'tone' => 'amber',
        ],
        [
            'label' => 'Assigned tenants',
            'value' => (int) ($tenantStats['tenants']['assigned'] ?? 0),
            'tone' => 'indigo',
        ],
        [
            'label' => 'Property types',
            'value' => (int) ($propertyStats['types']['total'] ?? 0),
            'tone' => 'indigo',
        ],
    ],
    'roleBreakdown' => [
        'owner' => (int) ($stats['owner_users'] ?? 0),
        'manager' => (int) ($stats['manager_users'] ?? 0),
        'staff' => (int) ($stats['staff_users'] ?? 0),
    ],
    'highlights' => [
        'Passwords are hashed with PHP and login attempts are rate-limited by account.',
        'Role-based access control is enforced server-side, not just hidden in the UI.',
        'Profile updates, password changes, and photo uploads all require CSRF tokens.',
        'Properties, units, tenants, and tenant documents are backed by dedicated tables with foreign keys.',
    ],
    'propertyBreakdown' => $propertyStats,
    'unitBreakdown' => $unitStats,
    'tenantBreakdown' => $tenantStats,
];

api_response([
    'ok' => true,
    'user' => api_user_payload(),
    'summary' => $summary,
]);

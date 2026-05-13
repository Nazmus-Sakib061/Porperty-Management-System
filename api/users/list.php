<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);
$currentUser = api_require_role('owner');

$query = trim((string) ($_GET['q'] ?? ''));
$limit = (int) ($_GET['limit'] ?? 50);
$offset = (int) ($_GET['offset'] ?? 0);
$users = list_user_records($limit, $offset, $query !== '' ? $query : null);

api_response([
    'ok' => true,
    'users' => $users,
    'meta' => [
        'total' => count($users),
        'roles' => allowed_roles(),
        'createRoles' => allowed_child_roles_for_role($currentUser['role'] ?? null),
        'search' => $query,
    ],
]);

<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);

api_response([
    'ok' => true,
    'app' => [
        'name' => (string) app_config('name', 'Property Management System'),
    ],
    'csrfToken' => csrf_token(),
    'user' => api_user_payload(),
    'setup' => (static function (): array {
        try {
            return [
                'ownerRegistrationOpen' => count_owner_accounts() === 0,
                'roles' => allowed_roles(),
                'dbAvailable' => true,
            ];
        } catch (Throwable $exception) {
            return [
                'ownerRegistrationOpen' => false,
                'roles' => allowed_roles(),
                'dbAvailable' => false,
            ];
        }
    })(),
]);

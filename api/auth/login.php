<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);

api_response([
    'ok' => false,
    'message' => 'Password login is disabled. Use Google sign-in instead.',
], 410);

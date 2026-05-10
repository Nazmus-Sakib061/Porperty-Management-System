<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);
api_require_login();

api_response([
    'ok' => true,
    'propertyTypes' => list_property_type_records(),
]);


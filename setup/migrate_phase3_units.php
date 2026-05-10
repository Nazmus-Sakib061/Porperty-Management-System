<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script must be run from the command line.\n");
}

try {
    $schema = file_get_contents(__DIR__ . '/../database/schema.sql');

    if ($schema === false) {
        throw new RuntimeException('Unable to read database/schema.sql.');
    }

    db()->exec($schema);

    fwrite(STDOUT, "Phase 3 unit migration completed.\n");
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

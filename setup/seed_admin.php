<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script must be run from the command line.\n");
}

function cli_arg(string $name, ?string $default = null): ?string
{
    global $argv;

    foreach ($argv as $argument) {
        if (str_starts_with($argument, '--' . $name . '=')) {
            return substr($argument, strlen($name) + 3);
        }
    }

    return $default;
}

function cli_value(string $name, ?string $default = null): ?string
{
    $value = cli_arg($name, $default);

    return $value === null ? null : trim($value);
}

$name = cli_value('name', 'Owner') ?? 'Owner';
$email = normalize_email((string) cli_value('email'));
$password = (string) cli_value('password');
$role = normalize_role((string) cli_value('role', 'owner'));

if ($email === '' || $password === '') {
    fwrite(STDERR, "Email and password are required.\n");
    exit(1);
}

try {
    $name = validate_person_name($name);
    $email = validate_email_address($email);
    $password = validate_password_policy($password);
} catch (InvalidArgumentException $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

if (!is_allowed_role($role)) {
    fwrite(STDERR, "Role must be one of: owner, manager, staff.\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$statement = db()->prepare(
    'INSERT INTO users (name, email, password, role, status)
     VALUES (:name, :email, :password, :role, :status)
     ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password = VALUES(password),
         role = VALUES(role),
         status = VALUES(status)'
);

$statement->execute([
    'name' => $name,
    'email' => $email,
    'password' => $hash,
    'role' => $role,
    'status' => 'active',
]);

fwrite(STDOUT, "Owner account ready.\n");
fwrite(STDOUT, "Email: {$email}\n");
fwrite(STDOUT, "Role: {$role}\n");

<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function api_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    exit;
}

function api_method(array $allowedMethods): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if (!in_array($method, $allowedMethods, true)) {
        api_response([
            'ok' => false,
            'message' => 'Method not allowed.',
        ], 405);
    }
}

function api_error(string $message, int $status): void
{
    api_response([
        'ok' => false,
        'message' => $message,
    ], $status);
}

function api_require_login(): array
{
    $user = current_user();

    if ($user === null) {
        api_error('Authentication required.', 401);
    }

    return $user;
}

function api_require_role(string|array $roles): array
{
    $user = api_require_login();

    if (!has_role($roles, $user)) {
        api_error('You do not have permission to access that resource.', 403);
    }

    return $user;
}

function api_input(): array
{
    $body = file_get_contents('php://input');
    $json = json_decode($body ?: '', true);

    if (is_array($json)) {
        return $json;
    }

    return $_POST;
}

function api_user_payload(?array $user = null): ?array
{
    $user = $user ?? current_user();

    if ($user === null) {
        return null;
    }

    if (isset($user['roleLabel'])) {
        return $user;
    }

    return build_user_payload($user);
}

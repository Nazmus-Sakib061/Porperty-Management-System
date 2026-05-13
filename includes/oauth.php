<?php

declare(strict_types=1);

function google_oauth_config(?string $key = null, mixed $default = null): mixed
{
    $config = (array) app_config('oauth', []);
    $google = (array) ($config['google'] ?? []);

    if ($key === null) {
        return $google;
    }

    return $google[$key] ?? $default;
}

function google_oauth_enabled(): bool
{
    return trim((string) google_oauth_config('client_id', '')) !== ''
        && trim((string) google_oauth_config('client_secret', '')) !== ''
        && trim((string) google_oauth_config('redirect_uri', '')) !== '';
}

function google_identity_client_id(): string
{
    return trim((string) google_oauth_config('client_id', ''));
}

function google_identity_enabled(): bool
{
    return google_identity_client_id() !== '';
}

function google_oauth_authorize_url(string $state): string
{
    $query = http_build_query(
        [
            'client_id' => (string) google_oauth_config('client_id', ''),
            'redirect_uri' => (string) google_oauth_config('redirect_uri', ''),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'access_type' => 'online',
            'prompt' => 'select_account',
            'state' => $state,
        ],
        '',
        '&',
        PHP_QUERY_RFC3986
    );

    return 'https://accounts.google.com/o/oauth2/v2/auth?' . $query;
}

function google_oauth_post_login_redirect(): string
{
    $redirect = trim((string) google_oauth_config('post_login_redirect', ''));

    if ($redirect === '') {
        return app_url('/');
    }

    if (filter_var($redirect, FILTER_VALIDATE_URL)) {
        return $redirect;
    }

    return app_url($redirect);
}

function google_oauth_http_request(string $url, array $fields = [], array $headers = [], string $method = 'POST'): array
{
    $requestHeaders = array_merge([
        'Accept: application/json',
        'User-Agent: PropertyManagementSystem/1.0',
    ], $headers);

    $options = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $requestHeaders),
            'ignore_errors' => true,
            'timeout' => 20,
        ],
    ];

    if ($method !== 'GET' && $fields !== []) {
        $options['http']['content'] = http_build_query($fields, '', '&', PHP_QUERY_RFC3986);
        $requestHeaders[] = 'Content-Type: application/x-www-form-urlencoded';
        $options['http']['header'] = implode("\r\n", $requestHeaders);
    }

    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);

    if ($response === false) {
        throw new RuntimeException('Unable to contact Google.');
    }

    // file_get_contents() exposes response headers through the local-scope
    // $http_response_header variable for this request.
    $responseHeaders = $http_response_header ?? [];
    $statusLine = (string) ($responseHeaders[0] ?? '');
    preg_match('/\s(\d{3})\s/', $statusLine, $matches);
    $statusCode = isset($matches[1]) ? (int) $matches[1] : 0;

    $decoded = json_decode($response, true);

    if (!is_array($decoded)) {
        throw new RuntimeException('Google returned an invalid response.');
    }

    if ($statusCode < 200 || $statusCode >= 300) {
        $message = (string) ($decoded['error_description'] ?? $decoded['error'] ?? 'Google authentication failed.');
        throw new RuntimeException($message);
    }

    return $decoded;
}

function google_oauth_exchange_code(string $code): array
{
    return google_oauth_http_request(
        'https://oauth2.googleapis.com/token',
        [
            'code' => $code,
            'client_id' => (string) google_oauth_config('client_id', ''),
            'client_secret' => (string) google_oauth_config('client_secret', ''),
            'redirect_uri' => (string) google_oauth_config('redirect_uri', ''),
            'grant_type' => 'authorization_code',
        ]
    );
}

function google_oauth_fetch_userinfo(string $accessToken): array
{
    return google_oauth_http_request(
        'https://openidconnect.googleapis.com/v1/userinfo',
        [],
        [
            'Authorization: Bearer ' . $accessToken,
        ],
        'GET'
    );
}

function google_oauth_fetch_id_token_profile(string $idToken): array
{
    $tokenInfo = google_oauth_http_request(
        'https://oauth2.googleapis.com/tokeninfo?' . http_build_query(
            ['id_token' => $idToken],
            '',
            '&',
            PHP_QUERY_RFC3986
        ),
        [],
        [],
        'GET'
    );

    $audience = trim((string) ($tokenInfo['aud'] ?? ''));

    if ($audience === '' || !hash_equals(google_identity_client_id(), $audience)) {
        throw new RuntimeException('Google token audience does not match this app.');
    }

    return [
        'email' => $tokenInfo['email'] ?? '',
        'email_verified' => $tokenInfo['email_verified'] ?? false,
        'name' => $tokenInfo['name'] ?? '',
        'picture' => $tokenInfo['picture'] ?? '',
    ];
}

function count_total_users(): int
{
    $statement = db()->query('SELECT COUNT(*) AS total FROM users');
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0);
}

function create_google_user_record(array $data): array
{
    $name = validate_person_name((string) ($data['name'] ?? ''));
    $email = validate_email_address((string) ($data['email'] ?? ''));
    $role = normalize_role((string) ($data['role'] ?? 'staff'));
    $status = strtolower(trim((string) ($data['status'] ?? 'active')));
    $phone = array_key_exists('phone', $data) ? validate_phone_number((string) $data['phone']) : null;
    $mustChangePassword = (bool) ($data['must_change_password'] ?? false);

    if (!is_allowed_role($role)) {
        throw new InvalidArgumentException('Please choose a valid role.');
    }

    if (!in_array($status, ['active', 'inactive'], true)) {
        $status = 'active';
    }

    if (user_email_exists($email)) {
        throw new InvalidArgumentException('That email address is already in use.');
    }

    $temporaryHash = hash_password_secure(generate_temporary_password());

    $statement = db()->prepare(
        'INSERT INTO users (
            name,
            email,
            password,
            role,
            status,
            phone,
            must_change_password,
            failed_login_attempts,
            locked_until,
            password_changed_at
        ) VALUES (
            :name,
            :email,
            :password,
            :role,
            :status,
            :phone,
            :must_change_password,
            0,
            NULL,
            CURRENT_TIMESTAMP
        )'
    );

    $statement->execute([
        'name' => $name,
        'email' => $email,
        'password' => $temporaryHash,
        'role' => $role,
        'status' => $status,
        'phone' => $phone,
        'must_change_password' => $mustChangePassword ? 1 : 0,
    ]);

    $userId = (int) db()->lastInsertId();
    $record = load_user_record_by_id($userId);

    if ($record === null) {
        throw new RuntimeException('The Google user account could not be created.');
    }

    return $record;
}

function login_user_from_google_profile(array $profile): array
{
    $email = validate_email_address((string) ($profile['email'] ?? ''));
    $name = trim((string) ($profile['name'] ?? ''));
    $picture = trim((string) ($profile['picture'] ?? ''));
    $emailVerified = filter_var($profile['email_verified'] ?? true, FILTER_VALIDATE_BOOL);

    if (!$emailVerified) {
        throw new InvalidArgumentException('Please verify your Google account email first.');
    }

    if ($name === '') {
        $name = preg_replace('/@.*$/', '', $email) ?: $email;
    }

    $existingUser = load_user_record_by_email($email, true);

    if ($existingUser !== null) {
        if (strtolower((string) ($existingUser['status'] ?? 'inactive')) !== 'active') {
            throw new InvalidArgumentException('That Google account is inactive.');
        }

        return $existingUser;
    }

    // The first privileged account should be owner even if other non-owner
    // accounts already exist in the database.
    $role = count_owner_accounts() === 0 ? 'owner' : 'staff';

    $user = create_google_user_record([
        'name' => $name,
        'email' => $email,
        'role' => $role,
        'status' => 'active',
        'must_change_password' => false,
    ]);

    if ($picture !== '' && !filter_var($picture, FILTER_VALIDATE_URL)) {
        // Ignore unexpected picture values. The user can upload a local profile photo later.
    }

    return $user;
}

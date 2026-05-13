<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET', 'POST']);

$frontendRedirect = google_oauth_post_login_redirect();

function redirect_with_message(string $redirect, string $message): void
{
    $separator = str_contains($redirect, '?') ? '&' : '?';
    header('Location: ' . $redirect . $separator . 'auth=' . rawurlencode($message));
    exit;
}

if (!google_oauth_enabled()) {
    redirect_with_message($frontendRedirect, 'google_disabled');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $credential = trim((string) ($_POST['credential'] ?? ''));

    if ($credential === '') {
        redirect_with_message($frontendRedirect, 'google_failed');
    }

    try {
        $profile = google_oauth_fetch_id_token_profile($credential);
        $user = login_user_from_google_profile($profile);

        login_user($user);
        redirect_with_message($frontendRedirect, 'google_success');
    } catch (Throwable $exception) {
        redirect_with_message($frontendRedirect, 'google_failed');
    }
}

$error = (string) ($_GET['error'] ?? '');
$state = (string) ($_GET['state'] ?? '');
$code = (string) ($_GET['code'] ?? '');
$expectedState = (string) ($_SESSION['google_oauth_state'] ?? '');

unset($_SESSION['google_oauth_state'], $_SESSION['google_oauth_started_at']);

if ($error !== '') {
    redirect_with_message($frontendRedirect, 'google_failed');
}

if ($code === '' || $state === '' || $expectedState === '' || !hash_equals($expectedState, $state)) {
    redirect_with_message($frontendRedirect, 'google_failed');
}

try {
    $tokenResponse = google_oauth_exchange_code($code);
    $accessToken = trim((string) ($tokenResponse['access_token'] ?? ''));

    if ($accessToken === '') {
        throw new RuntimeException('Google did not return an access token.');
    }

    $profile = google_oauth_fetch_userinfo($accessToken);
    $user = login_user_from_google_profile($profile);

    login_user($user);
    redirect_with_message($frontendRedirect, 'google_success');
} catch (Throwable $exception) {
    redirect_with_message($frontendRedirect, 'google_failed');
}

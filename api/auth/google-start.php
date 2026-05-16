<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['GET']);

if (is_logged_in()) {
    redirect(google_oauth_post_login_redirect());
}

if (!google_oauth_enabled()) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Google sign-in is not configured.";
    exit;
}

$_SESSION['google_oauth_state'] = bin2hex(random_bytes(24));
$_SESSION['google_oauth_started_at'] = time();

$authorizeUrl = google_oauth_authorize_url((string) $_SESSION['google_oauth_state']);
error_log('Google OAuth authorize URL: ' . $authorizeUrl);
header('Location: ' . $authorizeUrl);
exit;

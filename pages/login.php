<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

if (is_logged_in()) {
    redirect((string) app_config('dashboard_path', 'pages/dashboard.php'));
}

$googleLoginEnabled = google_oauth_enabled();
render_auth_start('Sign in with Google', 'Use your Google account to continue.');

echo '<p class="lead">Password login and manual registration are removed. Only Google sign-in remains active.</p>';
echo '<div class="google-login-cta">';

if ($googleLoginEnabled) {
    echo '<a class="google-login-button" href="' . e(app_url('api/auth/google-start.php')) . '">';
    echo '<span class="google-login-badge" aria-hidden="true">G</span>';
    echo '<span>Continue with Google</span>';
    echo '</a>';
    echo '<p class="google-login-note">You will be redirected to Google and returned here after sign-in.</p>';
} else {
    echo '<button class="google-login-button" type="button" disabled>';
    echo '<span class="google-login-badge" aria-hidden="true">G</span>';
    echo '<span>Continue with Google</span>';
    echo '</button>';
    echo '<p class="google-login-note">Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to enable login.</p>';
}

echo '</div>';

render_auth_end();

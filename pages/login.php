<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

if (is_logged_in()) {
    redirect((string) app_config('dashboard_path', 'pages/dashboard.php'));
}

$error = null;
$emailValue = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $emailValue = trim((string) ($_POST['email'] ?? ''));

    if (!verify_csrf_token($_POST['csrf_token'] ?? null)) {
        $error = 'Security token expired. Please refresh and try again.';
    } else {
        try {
            $user = authenticate_user($emailValue, (string) ($_POST['password'] ?? ''));

            if ($user === null) {
                $error = 'Invalid email or password, or the account is inactive.';
            } else {
                login_user($user);
                set_flash('success', 'Welcome back, ' . ($user['name'] ?? 'user') . '.');
                redirect((string) app_config('dashboard_path', 'pages/dashboard.php'));
            }
        } catch (Throwable $exception) {
            $error = 'Authentication is not ready yet. Please verify the database connection and users table.';
        }
    }
}

render_auth_start('Sign in');
render_flash_messages();

if ($error !== null) {
    echo '<div class="alert alert-danger">' . e($error) . '</div>';
}
?>
                <form class="auth-form" method="post" novalidate>
                    <?= csrf_field() ?>

                    <div class="form-group">
                        <label for="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value="<?= e($emailValue) ?>"
                            placeholder="name@example.com"
                            autocomplete="email"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Enter your password"
                            autocomplete="current-password"
                            required
                        >
                    </div>

                    <button class="button" type="submit">Sign in</button>
                </form>

                <p class="auth-footer">
                    Phase 1 security is active. Use the React app for owner registration and account management.
                </p>
<?php
render_auth_end();

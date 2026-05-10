<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

render_auth_start('Access denied', 'You do not have permission to view this area.');
render_flash_messages();
?>
                <div class="card">
                    <p>
                        The requested page is protected by role-based access control.
                        If you believe this is a mistake, sign in again with a different account.
                    </p>

                    <div class="button-row">
                        <a class="button" href="<?= e(app_url((string) app_config('dashboard_path', 'pages/dashboard.php'))) ?>">Back to dashboard</a>
                        <a class="button button-ghost" href="<?= e(app_url((string) app_config('login_path', 'pages/login.php'))) ?>">Sign in again</a>
                    </div>
                </div>
<?php
render_auth_end();

<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

set_flash('success', 'You have been signed out.');
logout_user();

redirect((string) app_config('login_path', 'pages/login.php'));

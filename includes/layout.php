<?php

declare(strict_types=1);

function page_title(string $title = ''): string
{
    $title = trim($title);
    $appName = (string) app_config('name', 'Property Management System');

    return $title === '' ? $appName : $title . ' | ' . $appName;
}

function render_html_head(string $title): void
{
    ?>
    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title><?= e($title) ?></title>
        <link rel="stylesheet" href="<?= e(app_url('assets/css/main.css')) ?>">
    </head>
    <?php
}

function render_flash_messages(): void
{
    $classes = [
        'success' => 'success',
        'error' => 'danger',
        'warning' => 'warning',
        'info' => 'info',
    ];

    foreach ($classes as $key => $class) {
        $message = flash($key);

        if ($message === null || $message === '') {
            continue;
        }

        echo '<div class="alert alert-' . e($class) . '">' . e((string) $message) . '</div>';
    }
}

function sidebar_link(string $label, string $path, string $key, string $activeKey, string|array|null $roles = null): string
{
    if ($roles !== null && !has_role($roles)) {
        return '';
    }

    $class = $key === $activeKey ? 'nav-link active' : 'nav-link';

    return '<a class="' . e($class) . '" href="' . e(app_url($path)) . '">' . e($label) . '</a>';
}

function render_app_start(string $title, string $activeKey = ''): void
{
    $user = current_user() ?? [];
    $appName = (string) app_config('name', 'Property Management System');
    ?>
    <?php render_html_head(page_title($title)); ?>
    <body class="app-page">
        <div class="app-shell">
            <aside class="sidebar">
                <div class="brand-lockup">
                    <span class="brand-mark">PM</span>
                    <div>
                        <strong><?= e($appName) ?></strong>
                        <span>Operations console</span>
                    </div>
                </div>

                <nav class="sidebar-nav">
                    <?= sidebar_link('Dashboard', (string) app_config('dashboard_path', 'pages/dashboard.php'), 'dashboard', $activeKey) ?>
                    <?= sidebar_link('Owner Panel', 'pages/admin.php', 'owner', $activeKey, 'owner') ?>
                </nav>

                <div class="sidebar-meta">
                    <span class="meta-label">Signed in as</span>
                    <strong><?= e($user['name'] ?? 'Guest') ?></strong>
                    <span><?= e(role_label($user['role'] ?? null)) ?></span>
                </div>
            </aside>

            <main class="workspace">
                <header class="topbar">
                    <div>
                        <p class="eyebrow">Property Management</p>
                        <h1><?= e($title) ?></h1>
                    </div>

                    <div class="topbar-actions">
                        <div class="user-pill">
                            <span><?= e($user['name'] ?? 'Guest') ?></span>
                            <small><?= e(role_label($user['role'] ?? null)) ?></small>
                        </div>
                        <a class="button button-ghost" href="<?= e(app_url((string) app_config('logout_path', 'logout.php'))) ?>">Logout</a>
                    </div>
                </header>

                <section class="workspace-body">
    <?php
}

function render_app_end(): void
{
    ?>
                </section>
            </main>
        </div>
    </body>
    </html>
    <?php
}

function render_auth_start(string $title, string $subtitle = 'Use your account credentials to continue.'): void
{
    $appName = (string) app_config('name', 'Property Management System');
    ?>
    <?php render_html_head(page_title($title)); ?>
    <body class="auth-page">
        <div class="auth-shell">
            <section class="auth-card">
                <div class="auth-brand">
                    <span class="brand-mark">PM</span>
                    <div>
                        <strong><?= e($appName) ?></strong>
                        <span>Secure access</span>
                    </div>
                </div>

                <p class="eyebrow">Welcome</p>
                <h1><?= e($title) ?></h1>
                <p class="lead"><?= e($subtitle) ?></p>
    <?php
}

function render_auth_end(): void
{
    ?>
            </section>
        </div>
    </body>
    </html>
    <?php
}

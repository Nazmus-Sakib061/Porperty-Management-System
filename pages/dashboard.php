<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_login();

$user = current_user() ?? [];

render_app_start('Dashboard', 'dashboard');
render_flash_messages();
?>
                    <div class="hero-card">
                        <div class="card">
                            <p class="eyebrow">Current session</p>
                            <h2><?= e($user['name'] ?? 'User') ?></h2>
                            <p class="lead">
                                You are signed in as <strong><?= e(role_label($user['role'] ?? null)) ?></strong>.
                            </p>
                            <p>
                                This base now includes shared configuration, a PDO database connection,
                                session-based authentication, and reusable layout rendering.
                            </p>
                        </div>

                        <div class="kpi-grid">
                            <article class="kpi-card">
                                <span>Email</span>
                                <strong><?= e($user['email'] ?? 'n/a') ?></strong>
                            </article>
                            <article class="kpi-card">
                                <span>Role</span>
                                <strong><?= e(role_label($user['role'] ?? null)) ?></strong>
                            </article>
                            <article class="kpi-card">
                                <span>Status</span>
                                <strong>Ready</strong>
                            </article>
                        </div>
                    </div>

                    <div class="content-grid">
                        <article class="card">
                            <p class="eyebrow">Foundation</p>
                            <h3>Phase 0 is in place</h3>
                            <p>
                                The app now has a common layout, a login flow, and an access control helper
                                that can guard future modules.
                            </p>
                        </article>

                        <article class="card">
                            <p class="eyebrow">RBAC preview</p>
                            <h3>Owner-only areas are protected</h3>
                            <p>
                                The sidebar exposes the owner panel only for the owner role, and the page itself
                                is guarded by <code>require_role()</code>.
                            </p>
                        </article>
                    </div>

                    <?php if (has_role('owner')): ?>
                        <article class="card">
                            <p class="eyebrow">Owner shortcut</p>
                            <h3>Role-based access control is active</h3>
                            <p>
                                You can open the protected owner panel to verify that owner-only routing works.
                            </p>
                            <a class="button" href="<?= e(app_url('pages/admin.php')) ?>">Open Owner Panel</a>
                        </article>
                    <?php endif; ?>
<?php
render_app_end();

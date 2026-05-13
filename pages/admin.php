<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_role('owner');

render_app_start('Owner Panel', 'owner');
render_flash_messages();
?>
                    <article class="card">
                        <p class="eyebrow">Protected area</p>
                        <h2>Owner access confirmed</h2>
                        <p>
                            This page is visible only to users with the owner role. It is a simple
                            proof that the role guard is working before we add real management screens.
                        </p>
                        <ul class="feature-list">
                            <li>Shared auth session is loaded from the bootstrap file.</li>
                            <li>Non-owner users are redirected to the unauthorized page.</li>
                            <li>Future owner tools can reuse the same guard helper.</li>
                        </ul>
                    </article>
<?php
render_app_end();

<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

$apiPaths = [
    '/api/auth/me.php',
    '/api/auth/login.php',
    '/api/auth/register.php',
    '/api/auth/logout.php',
    '/api/dashboard/summary.php',
    '/api/users/list.php',
    '/api/users/create.php',
    '/api/users/profile.php',
    '/api/users/password.php',
    '/api/users/photo.php',
    '/api/properties/list.php',
    '/api/properties/view.php',
    '/api/properties/create.php',
    '/api/properties/update.php',
    '/api/properties/delete.php',
    '/api/properties/image-upload.php',
    '/api/properties/image-delete.php',
    '/api/units/list.php',
    '/api/units/view.php',
    '/api/units/create.php',
    '/api/units/update.php',
    '/api/units/delete.php',
    '/api/property-types/list.php',
    '/api/property-types/create.php',
    '/api/property-types/update.php',
    '/api/property-types/delete.php',
];
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e(page_title('Backend Ready')) ?></title>
    <style>
        body {
            margin: 0;
            font-family: "Segoe UI", Arial, sans-serif;
            background: linear-gradient(180deg, #08111f 0%, #0f172a 100%);
            color: #e5eef9;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
        }
        .card {
            width: min(900px, 100%);
            padding: 32px;
            border-radius: 24px;
            background: rgba(15, 23, 42, 0.78);
            border: 1px solid rgba(148, 163, 184, 0.18);
            box-shadow: 0 30px 90px rgba(0, 0, 0, 0.35);
        }
        h1, h2 {
            margin-top: 0;
            font-family: Georgia, "Times New Roman", serif;
        }
        p, li {
            color: #95a3b8;
            line-height: 1.7;
        }
        code {
            background: rgba(255, 255, 255, 0.08);
            padding: 0.15rem 0.35rem;
            border-radius: 6px;
        }
        ul {
            padding-left: 20px;
        }
        .grid {
            display: grid;
            gap: 20px;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            margin-top: 24px;
        }
        .panel {
            padding: 18px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
        }
        a {
            color: #2dd4bf;
        }
    </style>
</head>
<body>
    <main class="card">
        <p style="text-transform:uppercase;letter-spacing:.18em;color:#2dd4bf;font-weight:700;margin:0 0 10px;">Backend Ready</p>
        <h1>Property Management System</h1>
        <p>
            The PHP backend is ready. The React frontend lives in <code>/frontend</code> and talks to the API under <code>/api</code>.
        </p>

        <div class="grid">
            <section class="panel">
                <h2>Run it</h2>
                <p>
                    1. Start PHP:
                    <br>
                    <code>C:\xampp\php\php.exe -S localhost:8000 -t .</code>
                </p>
                <p>
                    2. Start React:
                    <br>
                    <code>cd frontend && npm install && npm run dev</code>
                </p>
            </section>

            <section class="panel">
                <h2>API endpoints</h2>
                <ul>
                    <?php foreach ($apiPaths as $path): ?>
                        <li><a href="<?= e($path) ?>"><?= e($path) ?></a></li>
                    <?php endforeach; ?>
                </ul>
            </section>

            <section class="panel">
                <h2>First login</h2>
                <p>
                    Seed an owner account with:
                    <br>
                    <code>C:\xampp\php\php.exe setup\seed_admin.php --name="Owner" --email="owner@example.com" --password="Use-A-Strong-Password-123!" --role="owner"</code>
                </p>
            </section>
        </div>
    </main>
</body>
</html>

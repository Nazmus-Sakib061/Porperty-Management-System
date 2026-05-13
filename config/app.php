<?php

declare(strict_types=1);

return [
    'name' => 'Property Management System',
    'base_url' => getenv('APP_BASE_URL') ?: '/',
    'timezone' => getenv('APP_TIMEZONE') ?: 'Asia/Dhaka',
    'session_name' => getenv('APP_SESSION_NAME') ?: 'property_mgmt_session',
    'session_secure' => filter_var(getenv('APP_SESSION_SECURE') ?: '0', FILTER_VALIDATE_BOOL),
    'login_path' => getenv('APP_LOGIN_PATH') ?: 'pages/login.php',
    'dashboard_path' => getenv('APP_DASHBOARD_PATH') ?: 'pages/dashboard.php',
    'unauthorized_path' => getenv('APP_UNAUTHORIZED_PATH') ?: 'pages/unauthorized.php',
    'logout_path' => getenv('APP_LOGOUT_PATH') ?: 'logout.php',
    'roles' => [
        'owner' => 'Owner',
        'manager' => 'Manager',
        'staff' => 'Staff',
    ],
    'security' => [
        'password_min_length' => 12,
        'login_attempt_limit' => 5,
        'login_lock_minutes' => 15,
        'profile_photo_max_bytes' => 2 * 1024 * 1024,
        'profile_photo_directory' => 'uploads/profile-photos',
        'property_image_max_bytes' => 3 * 1024 * 1024,
        'property_image_directory' => 'uploads/properties',
        'tenant_photo_max_bytes' => 2 * 1024 * 1024,
        'tenant_photo_directory' => 'uploads/tenants/photos',
        'tenant_document_max_bytes' => 10 * 1024 * 1024,
        'tenant_document_directory' => 'uploads/tenants/documents',
        'property_default_country' => getenv('APP_PROPERTY_DEFAULT_COUNTRY') ?: 'Bangladesh',
    ],
    'oauth' => [
        'google' => [
            'client_id' => getenv('GOOGLE_CLIENT_ID') ?: '',
            'client_secret' => getenv('GOOGLE_CLIENT_SECRET') ?: '',
            'redirect_uri' => getenv('GOOGLE_REDIRECT_URI') ?: '',
            'post_login_redirect' => getenv('APP_POST_LOGIN_REDIRECT') ?: (getenv('APP_FRONTEND_URL') ?: 'http://localhost:5173/'),
        ],
    ],
    'legacy_roles' => [
        'admin' => 'owner',
    ],
];

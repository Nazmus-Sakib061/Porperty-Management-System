<?php

declare(strict_types=1);

function security_config(?string $key = null, mixed $default = null): mixed
{
    $config = (array) app_config('security', []);

    if ($key === null) {
        return $config;
    }

    return $config[$key] ?? $default;
}

function normalize_text(string $value): string
{
    $value = preg_replace('/\s+/u', ' ', trim($value));

    return $value === null ? trim($value) : $value;
}

function normalize_email(string $email): string
{
    return strtolower(trim($email));
}

function normalize_phone(string $phone): string
{
    return normalize_text($phone);
}

function normalize_role(?string $role): string
{
    $role = strtolower(trim((string) $role));

    return match ($role) {
        'admin', 'administrator', 'owner' => 'owner',
        'manager' => 'manager',
        'staff' => 'staff',
        default => $role,
    };
}

function allowed_roles(): array
{
    return array_keys((array) app_config('roles', []));
}

function is_allowed_role(string $role): bool
{
    return in_array(normalize_role($role), allowed_roles(), true);
}

function allowed_child_roles_for_role(?string $role): array
{
    return match (normalize_role($role)) {
        'owner' => ['manager', 'staff'],
        'manager' => ['staff'],
        default => [],
    };
}

function can_assign_role(?string $creatorRole, string $targetRole): bool
{
    return in_array(normalize_role($targetRole), allowed_child_roles_for_role($creatorRole), true);
}

function password_min_length(): int
{
    return max(8, (int) security_config('password_min_length', 12));
}

function validate_person_name(string $name): string
{
    $name = normalize_text($name);
    $length = function_exists('mb_strlen') ? mb_strlen($name) : strlen($name);

    if ($name === '' || $length < 2 || $length > 120) {
        throw new InvalidArgumentException('Please enter a valid name.');
    }

    if (preg_match('/[\x00-\x1F\x7F]/', $name)) {
        throw new InvalidArgumentException('The name contains invalid characters.');
    }

    return $name;
}

function validate_email_address(string $email): string
{
    $email = normalize_email($email);

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Please enter a valid email address.');
    }

    if (strlen($email) > 191) {
        throw new InvalidArgumentException('The email address is too long.');
    }

    return $email;
}

function validate_phone_number(string $phone): ?string
{
    $phone = normalize_phone($phone);

    if ($phone === '') {
        return null;
    }

    if (!preg_match('/^[0-9+\-().\s]{6,32}$/', $phone)) {
        throw new InvalidArgumentException('Please enter a valid phone number.');
    }

    return $phone;
}

function validate_password_policy(string $password): string
{
    $password = trim($password);
    $length = function_exists('mb_strlen') ? mb_strlen($password) : strlen($password);
    $minimum = password_min_length();

    if ($length < $minimum) {
        throw new InvalidArgumentException(
            sprintf('Password must be at least %d characters long.', $minimum)
        );
    }

    if (preg_match('/\s/', $password)) {
        throw new InvalidArgumentException('Password cannot contain spaces.');
    }

    if (!preg_match('/[A-Z]/', $password)) {
        throw new InvalidArgumentException('Password must contain at least one uppercase letter.');
    }

    if (!preg_match('/[a-z]/', $password)) {
        throw new InvalidArgumentException('Password must contain at least one lowercase letter.');
    }

    if (!preg_match('/[0-9]/', $password)) {
        throw new InvalidArgumentException('Password must contain at least one number.');
    }

    if (!preg_match('/[^a-zA-Z0-9]/', $password)) {
        throw new InvalidArgumentException('Password must contain at least one symbol.');
    }

    return $password;
}

function hash_password_secure(string $password): string
{
    return password_hash($password, PASSWORD_DEFAULT);
}

function generate_temporary_password(int $length = 16): string
{
    $length = max(12, $length);
    $sets = [
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'abcdefghijklmnopqrstuvwxyz',
        '23456789',
        '!@#$%^&*()-_=+',
    ];
    $password = [];

    foreach ($sets as $set) {
        $password[] = $set[random_int(0, strlen($set) - 1)];
    }

    $alphabet = implode('', $sets);
    $alphabetLength = strlen($alphabet) - 1;

    for ($index = count($password); $index < $length; $index++) {
        $password[] = $alphabet[random_int(0, $alphabetLength)];
    }

    shuffle($password);

    return implode('', $password);
}

function user_select_columns(bool $includePassword = false): string
{
    $columns = [
        'id',
        'name',
        'email',
        'role',
        'status',
        'phone',
        'profile_photo_path',
        'must_change_password',
        'last_login_at',
        'password_changed_at',
        'failed_login_attempts',
        'locked_until',
        'created_at',
        'updated_at',
    ];

    if ($includePassword) {
        array_splice($columns, 3, 0, ['password']);
    }

    return implode(', ', $columns);
}

function sanitize_relative_photo_path(?string $path): ?string
{
    $path = str_replace('\\', '/', trim((string) $path));

    if ($path === '' || str_contains($path, '..')) {
        return null;
    }

    $prefix = trim((string) security_config('profile_photo_directory', 'uploads/profile-photos'), '/');

    if ($prefix === '') {
        return null;
    }

    if (!str_starts_with($path, $prefix . '/')) {
        return null;
    }

    return $path;
}

function user_photo_url(?string $path): ?string
{
    $path = sanitize_relative_photo_path($path);

    if ($path === null) {
        return null;
    }

    return app_url($path);
}

function user_photo_storage_path(?string $relativePath = null): string
{
    $relativePath = $relativePath ?? (string) security_config('profile_photo_directory', 'uploads/profile-photos');
    $relativePath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, trim($relativePath, '/\\'));

    return dirname(__DIR__) . DIRECTORY_SEPARATOR . $relativePath;
}

function ensure_directory_exists(string $path): void
{
    if (is_dir($path)) {
        return;
    }

    if (!mkdir($path, 0777, true) && !is_dir($path)) {
        throw new RuntimeException('Unable to prepare the upload directory.');
    }
}

function upload_error_message(int $error): string
{
    return match ($error) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The uploaded photo is too large.',
        UPLOAD_ERR_PARTIAL => 'The photo upload was interrupted.',
        UPLOAD_ERR_NO_FILE => 'Please choose a profile photo.',
        UPLOAD_ERR_NO_TMP_DIR => 'The server cannot store uploaded files right now.',
        UPLOAD_ERR_CANT_WRITE => 'The server could not save the uploaded photo.',
        UPLOAD_ERR_EXTENSION => 'The upload was blocked by a server extension.',
        default => 'The photo upload failed.',
    };
}

function user_is_locked(array $record): bool
{
    $lockedUntil = (string) ($record['locked_until'] ?? '');

    if ($lockedUntil === '') {
        return false;
    }

    $lockedTimestamp = strtotime($lockedUntil);

    return $lockedTimestamp !== false && $lockedTimestamp > time();
}

function user_permissions_from_role(?string $role): array
{
    $role = normalize_role($role);

    return [
        'canViewDashboard' => true,
        'canViewUnits' => in_array($role, ['owner', 'manager', 'staff'], true),
        'canViewTenants' => in_array($role, ['owner', 'manager', 'staff'], true),
        'canManageUsers' => $role === 'owner',
        'canCreateManagerAccounts' => $role === 'owner',
        'canCreateStaffAccounts' => $role === 'owner',
        'canUpdateOwnProfile' => in_array($role, ['owner', 'manager', 'staff'], true),
        'canUploadPhoto' => true,
        'canChangeOwnPassword' => true,
        'canEditAnyUser' => $role === 'owner',
        'canViewProperties' => in_array($role, ['owner', 'manager', 'staff'], true),
        'canManageProperties' => in_array($role, ['owner', 'manager', 'staff'], true),
        'canManageUnits' => in_array($role, ['owner', 'manager', 'staff'], true),
        'canManageTenants' => in_array($role, ['owner', 'manager', 'staff'], true),
        'canManagePropertyTypes' => $role === 'owner',
        'canUploadPropertyImages' => in_array($role, ['owner', 'manager', 'staff'], true),
    ];
}

function build_user_payload(array $record): array
{
    $role = normalize_role((string) ($record['role'] ?? ''));
    $photoPath = sanitize_relative_photo_path(
        $record['profile_photo_path'] ?? $record['profilePhotoPath'] ?? null
    );

    return [
        'id' => (int) ($record['id'] ?? 0),
        'name' => (string) ($record['name'] ?? ''),
        'email' => (string) ($record['email'] ?? ''),
        'role' => $role,
        'roleLabel' => role_label($role),
        'status' => (string) ($record['status'] ?? 'inactive'),
        'phone' => (string) ($record['phone'] ?? ''),
        'profilePhotoPath' => $photoPath,
        'profilePhotoUrl' => user_photo_url($photoPath),
        'hasProfilePhoto' => $photoPath !== null,
        'mustChangePassword' => (bool) ($record['must_change_password'] ?? false),
        'lastLoginAt' => $record['last_login_at'] ?? null,
        'passwordChangedAt' => $record['password_changed_at'] ?? null,
        'lockedUntil' => $record['locked_until'] ?? null,
        'failedLoginAttempts' => (int) ($record['failed_login_attempts'] ?? 0),
        'isLocked' => user_is_locked($record),
        'createdAt' => $record['created_at'] ?? null,
        'updatedAt' => $record['updated_at'] ?? null,
        'permissions' => user_permissions_from_role($role),
        'allowedChildRoles' => allowed_child_roles_for_role($role),
    ];
}

function build_session_user_payload(array $record): array
{
    $role = normalize_role((string) ($record['role'] ?? ''));
    $photoPath = sanitize_relative_photo_path(
        $record['profile_photo_path'] ?? $record['profilePhotoPath'] ?? null
    );

    return [
        'id' => (int) ($record['id'] ?? 0),
        'name' => (string) ($record['name'] ?? ''),
        'email' => (string) ($record['email'] ?? ''),
        'role' => $role,
        'status' => (string) ($record['status'] ?? 'inactive'),
        'phone' => (string) ($record['phone'] ?? ''),
        'profile_photo_path' => $photoPath,
        'profile_photo_url' => user_photo_url($photoPath),
        'must_change_password' => (bool) ($record['must_change_password'] ?? $record['mustChangePassword'] ?? false),
        'logged_in_at' => (int) ($record['logged_in_at'] ?? time()),
    ];
}

function load_user_record_by_id(int $id, bool $includePassword = false): ?array
{
    $statement = db()->prepare(
        sprintf(
            'SELECT %s FROM users WHERE id = :id LIMIT 1',
            user_select_columns($includePassword)
        )
    );
    $statement->execute(['id' => $id]);

    $record = $statement->fetch();

    return $record === false ? null : $record;
}

function load_user_record_by_email(string $email, bool $includePassword = false): ?array
{
    $statement = db()->prepare(
        sprintf(
            'SELECT %s FROM users WHERE email = :email LIMIT 1',
            user_select_columns($includePassword)
        )
    );
    $statement->execute(['email' => normalize_email($email)]);

    $record = $statement->fetch();

    return $record === false ? null : $record;
}

function count_owner_accounts(): int
{
    $statement = db()->query(
        "SELECT COUNT(*) AS total
         FROM users
         WHERE LOWER(role) IN ('owner', 'admin', 'administrator')"
    );
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0);
}

function count_users_by_role(string $role): int
{
    $role = normalize_role($role);

    if ($role === 'owner') {
        return count_owner_accounts();
    }

    $statement = db()->prepare(
        'SELECT COUNT(*) AS total
         FROM users
         WHERE LOWER(role) = :role'
    );
    $statement->execute(['role' => $role]);
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0);
}

function list_user_records(int $limit = 50, int $offset = 0, ?string $search = null): array
{
    $limit = max(1, min(100, $limit));
    $offset = max(0, $offset);
    $search = $search !== null ? normalize_text($search) : null;
    $where = '';
    $params = [];

    if ($search !== null && $search !== '') {
        $where = 'WHERE name LIKE :search OR email LIKE :search';
        $params['search'] = '%' . $search . '%';
    }

    $statement = db()->prepare(
        sprintf(
            'SELECT %s FROM users %s ORDER BY created_at DESC LIMIT :limit OFFSET :offset',
            user_select_columns(false),
            $where
        )
    );

    foreach ($params as $key => $value) {
        $statement->bindValue(':' . $key, $value, PDO::PARAM_STR);
    }

    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
    $statement->execute();

    return array_map(
        static fn (array $record): array => build_user_payload($record),
        $statement->fetchAll() ?: []
    );
}

function user_email_exists(string $email, ?int $ignoreUserId = null): bool
{
    $statement = db()->prepare(
        'SELECT COUNT(*) AS total
         FROM users
         WHERE email = :email' . ($ignoreUserId !== null ? ' AND id <> :ignore_id' : '')
    );
    $statement->bindValue(':email', normalize_email($email), PDO::PARAM_STR);

    if ($ignoreUserId !== null) {
        $statement->bindValue(':ignore_id', $ignoreUserId, PDO::PARAM_INT);
    }

    $statement->execute();
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0) > 0;
}

function create_user_record(array $data): array
{
    $name = validate_person_name((string) ($data['name'] ?? ''));
    $email = validate_email_address((string) ($data['email'] ?? ''));
    $password = validate_password_policy((string) ($data['password'] ?? ''));
    $role = normalize_role((string) ($data['role'] ?? 'staff'));
    $status = strtolower(trim((string) ($data['status'] ?? 'active')));
    $phone = array_key_exists('phone', $data) ? validate_phone_number((string) $data['phone']) : null;
    $mustChangePassword = (bool) ($data['must_change_password'] ?? false);

    if (!is_allowed_role($role)) {
        throw new InvalidArgumentException('Please choose a valid role.');
    }

    if (!in_array($status, ['active', 'inactive'], true)) {
        $status = 'active';
    }

    if (user_email_exists($email)) {
        throw new InvalidArgumentException('That email address is already in use.');
    }

    $statement = db()->prepare(
        'INSERT INTO users (
            name,
            email,
            password,
            role,
            status,
            phone,
            must_change_password,
            failed_login_attempts,
            locked_until,
            password_changed_at
        ) VALUES (
            :name,
            :email,
            :password,
            :role,
            :status,
            :phone,
            :must_change_password,
            0,
            NULL,
            CURRENT_TIMESTAMP
        )'
    );

    $statement->execute([
        'name' => $name,
        'email' => $email,
        'password' => hash_password_secure($password),
        'role' => $role,
        'status' => $status,
        'phone' => $phone,
        'must_change_password' => $mustChangePassword ? 1 : 0,
    ]);

    $userId = (int) db()->lastInsertId();
    $record = load_user_record_by_id($userId);

    if ($record === null) {
        throw new RuntimeException('The user account could not be created.');
    }

    return $record;
}

function update_user_profile(int $userId, array $data): array
{
    $name = validate_person_name((string) ($data['name'] ?? ''));
    $email = validate_email_address((string) ($data['email'] ?? ''));
    $phone = array_key_exists('phone', $data) ? validate_phone_number((string) $data['phone']) : null;

    if (user_email_exists($email, $userId)) {
        throw new InvalidArgumentException('That email address is already in use.');
    }

    $statement = db()->prepare(
        'UPDATE users
         SET name = :name,
             email = :email,
             phone = :phone
         WHERE id = :id'
    );
    $statement->execute([
        'id' => $userId,
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
    ]);

    $record = load_user_record_by_id($userId);

    if ($record === null) {
        throw new RuntimeException('The user profile could not be updated.');
    }

    return $record;
}

function update_user_profile_photo(int $userId, ?string $relativePath): array
{
    $statement = db()->prepare(
        'UPDATE users
         SET profile_photo_path = :profile_photo_path
         WHERE id = :id'
    );
    $statement->execute([
        'id' => $userId,
        'profile_photo_path' => $relativePath,
    ]);

    $record = load_user_record_by_id($userId);

    if ($record === null) {
        throw new RuntimeException('The profile photo could not be updated.');
    }

    return $record;
}

function update_user_password_hash(int $userId, string $passwordHash): void
{
    $statement = db()->prepare(
        'UPDATE users
         SET password = :password,
             password_changed_at = CURRENT_TIMESTAMP,
             must_change_password = 0,
             failed_login_attempts = 0,
             locked_until = NULL
         WHERE id = :id'
    );
    $statement->execute([
        'id' => $userId,
        'password' => $passwordHash,
    ]);
}

function clear_login_attempts(int $userId): void
{
    $statement = db()->prepare(
        'UPDATE users
         SET failed_login_attempts = 0,
             locked_until = NULL
         WHERE id = :id'
    );
    $statement->execute(['id' => $userId]);
}

function mark_login_failure(int $userId, int $currentAttempts): void
{
    $attempts = $currentAttempts + 1;
    $lockThreshold = max(1, (int) security_config('login_attempt_limit', 5));
    $lockMinutes = max(1, (int) security_config('login_lock_minutes', 15));
    $lockedUntil = null;

    if ($attempts >= $lockThreshold) {
        $lockedUntil = date('Y-m-d H:i:s', time() + ($lockMinutes * 60));
    }

    $statement = db()->prepare(
        'UPDATE users
         SET failed_login_attempts = :failed_login_attempts,
             locked_until = :locked_until
         WHERE id = :id'
    );
    $statement->execute([
        'id' => $userId,
        'failed_login_attempts' => $attempts,
        'locked_until' => $lockedUntil,
    ]);
}

function touch_user_last_login(int $userId): void
{
    $statement = db()->prepare(
        'UPDATE users
         SET last_login_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $statement->execute(['id' => $userId]);
}

function user_photo_extension_for_mime(string $mimeType): ?string
{
    return match ($mimeType) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        default => null,
    };
}

function store_profile_photo_upload(int $userId, array $file): array
{
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException(upload_error_message($error));
    }

    $tmpPath = (string) ($file['tmp_name'] ?? '');

    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        throw new InvalidArgumentException('The uploaded file is not valid.');
    }

    $size = (int) ($file['size'] ?? 0);
    $maxSize = max(1, (int) security_config('profile_photo_max_bytes', 2 * 1024 * 1024));

    if ($size <= 0 || $size > $maxSize) {
        throw new InvalidArgumentException('The uploaded photo is too large.');
    }

    $imageInfo = @getimagesize($tmpPath);

    if ($imageInfo === false) {
        throw new InvalidArgumentException('Please upload a valid image file.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = (string) ($finfo->file($tmpPath) ?: '');
    $extension = user_photo_extension_for_mime($mimeType);

    if ($extension === null) {
        throw new InvalidArgumentException('Only JPEG, PNG, and WebP images are allowed.');
    }

    $directory = user_photo_storage_path();
    ensure_directory_exists($directory);

    $filename = sprintf(
        'user-%d-%s.%s',
        $userId,
        bin2hex(random_bytes(16)),
        $extension
    );

    $relativePath = trim((string) security_config('profile_photo_directory', 'uploads/profile-photos'), '/');
    $relativePath = $relativePath . '/' . $filename;
    $targetPath = user_photo_storage_path($relativePath);

    if (!move_uploaded_file($tmpPath, $targetPath)) {
        throw new RuntimeException('The uploaded photo could not be saved.');
    }

    return [
        'relativePath' => $relativePath,
        'absolutePath' => $targetPath,
        'mimeType' => $mimeType,
        'size' => $size,
    ];
}

function delete_profile_photo_file(?string $relativePath): void
{
    $relativePath = sanitize_relative_photo_path($relativePath);

    if ($relativePath === null) {
        return;
    }

    $absolutePath = user_photo_storage_path($relativePath);

    if (is_file($absolutePath)) {
        @unlink($absolutePath);
    }
}

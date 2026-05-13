<?php

declare(strict_types=1);

function tenant_security_config(?string $key = null, mixed $default = null): mixed
{
    $config = (array) security_config(null, []);

    if ($key === null) {
        return $config;
    }

    return $config[$key] ?? $default;
}

function allowed_tenant_statuses(): array
{
    return [
        'all' => 'All statuses',
        'active' => 'Active',
        'inactive' => 'Inactive',
    ];
}

function normalize_tenant_status(?string $status): string
{
    $status = strtolower(trim((string) $status));

    if ($status === '') {
        return 'active';
    }

    if ($status === 'all') {
        return 'all';
    }

    if (!array_key_exists($status, allowed_tenant_statuses())) {
        throw new InvalidArgumentException('Please choose a valid tenant status.');
    }

    return $status;
}

function tenant_status_label(?string $status): string
{
    $status = strtolower(trim((string) $status));

    return match ($status) {
        'active' => 'Active',
        'inactive' => 'Inactive',
        default => ucwords(str_replace('_', ' ', $status !== '' ? $status : 'inactive')),
    };
}

function tenant_photo_directory(): string
{
    $directory = trim((string) tenant_security_config('tenant_photo_directory', 'uploads/tenants/photos'), '/');

    return $directory === '' ? 'uploads/tenants/photos' : $directory;
}

function tenant_document_directory(): string
{
    $directory = trim((string) tenant_security_config('tenant_document_directory', 'uploads/tenants/documents'), '/');

    return $directory === '' ? 'uploads/tenants/documents' : $directory;
}

function tenant_photo_storage_path(?string $relativePath = null): string
{
    $relativePath = $relativePath ?? tenant_photo_directory();
    $relativePath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, trim($relativePath, '/\\'));

    return dirname(__DIR__) . DIRECTORY_SEPARATOR . $relativePath;
}

function tenant_document_storage_path(?string $relativePath = null): string
{
    $relativePath = $relativePath ?? tenant_document_directory();
    $relativePath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, trim($relativePath, '/\\'));

    return dirname(__DIR__) . DIRECTORY_SEPARATOR . $relativePath;
}

function sanitize_relative_tenant_photo_path(?string $path): ?string
{
    $path = str_replace('\\', '/', trim((string) $path));

    if ($path === '' || str_contains($path, '..')) {
        return null;
    }

    $prefix = tenant_photo_directory();

    if ($prefix === '' || !str_starts_with($path, $prefix . '/')) {
        return null;
    }

    return $path;
}

function sanitize_relative_tenant_document_path(?string $path): ?string
{
    $path = str_replace('\\', '/', trim((string) $path));

    if ($path === '' || str_contains($path, '..')) {
        return null;
    }

    $prefix = tenant_document_directory();

    if ($prefix === '' || !str_starts_with($path, $prefix . '/')) {
        return null;
    }

    return $path;
}

function tenant_photo_url(?string $path): ?string
{
    $path = sanitize_relative_tenant_photo_path($path);

    if ($path === null) {
        return null;
    }

    return app_url($path);
}

function tenant_document_url(?string $path): ?string
{
    $path = sanitize_relative_tenant_document_path($path);

    if ($path === null) {
        return null;
    }

    return app_url($path);
}

function tenant_photo_extension_for_mime(string $mimeType): ?string
{
    return match ($mimeType) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        default => null,
    };
}

function tenant_document_extension_for_mime(string $mimeType): ?string
{
    return match ($mimeType) {
        'application/pdf' => 'pdf',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'text/plain' => 'txt',
        default => null,
    };
}

function tenant_upload_error_message(int $error, string $label): string
{
    return match ($error) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The uploaded ' . $label . ' is too large.',
        UPLOAD_ERR_PARTIAL => 'The ' . $label . ' upload was interrupted.',
        UPLOAD_ERR_NO_FILE => 'Please choose a ' . $label . '.',
        UPLOAD_ERR_NO_TMP_DIR => 'The server cannot store uploaded files right now.',
        UPLOAD_ERR_CANT_WRITE => 'The server could not save the uploaded ' . $label . '.',
        UPLOAD_ERR_EXTENSION => 'The upload was blocked by a server extension.',
        default => 'The ' . $label . ' upload failed.',
    };
}

function format_bytes(int $bytes): string
{
    if ($bytes <= 0) {
        return '0 B';
    }

    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $value = (float) $bytes;
    $unitIndex = 0;

    while ($value >= 1024 && $unitIndex < count($units) - 1) {
        $value /= 1024;
        $unitIndex++;
    }

    return $unitIndex === 0
        ? number_format($value, 0) . ' ' . $units[$unitIndex]
        : rtrim(rtrim(number_format($value, 1, '.', ''), '0'), '.') . ' ' . $units[$unitIndex];
}

function sanitize_upload_original_name(string $name): string
{
    $name = basename(trim(str_replace(["\r", "\n", "\0"], '', $name)));
    $name = preg_replace('/[[:cntrl:]]/', '', $name) ?: '';
    $name = trim($name);

    if ($name === '') {
        return 'document';
    }

    if (function_exists('mb_strlen') && function_exists('mb_substr')) {
        return mb_strlen($name) > 255 ? mb_substr($name, 0, 255) : $name;
    }

    return strlen($name) > 255 ? substr($name, 0, 255) : $name;
}

function validate_tenant_full_name(string $value): string
{
    return validate_person_name($value);
}

function validate_tenant_email(mixed $value): ?string
{
    $value = trim((string) $value);

    if ($value === '') {
        return null;
    }

    return validate_email_address($value);
}

function validate_tenant_phone(mixed $value): ?string
{
    $value = trim((string) $value);

    if ($value === '') {
        return null;
    }

    return validate_phone_number($value);
}

function validate_tenant_move_in_date(mixed $value): ?string
{
    $value = trim((string) $value);

    if ($value === '') {
        return null;
    }

    $date = DateTimeImmutable::createFromFormat('Y-m-d', $value);
    $errors = DateTimeImmutable::getLastErrors();

    if (
        $date === false
        || (is_array($errors) && ((int) ($errors['warning_count'] ?? 0) > 0 || (int) ($errors['error_count'] ?? 0) > 0))
    ) {
        throw new InvalidArgumentException('Please choose a valid move-in date.');
    }

    return $date->format('Y-m-d');
}

function validate_tenant_notes(mixed $value): ?string
{
    return validate_optional_property_text(is_string($value) ? $value : null, 5000);
}

function validate_tenant_caption(mixed $value): ?string
{
    return validate_optional_property_text(is_string($value) ? $value : null, 191);
}

function tenant_email_exists(string $email, ?int $ignoreTenantId = null): bool
{
    $statement = db()->prepare(
        'SELECT COUNT(*) AS total
         FROM tenants
         WHERE LOWER(email) = LOWER(:email)' . ($ignoreTenantId !== null ? ' AND id <> :ignore_id' : '')
    );
    $statement->bindValue(':email', normalize_email($email), PDO::PARAM_STR);

    if ($ignoreTenantId !== null) {
        $statement->bindValue(':ignore_id', $ignoreTenantId, PDO::PARAM_INT);
    }

    $statement->execute();
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0) > 0;
}

function tenant_unit_exists(int $unitId, ?int $ignoreTenantId = null): bool
{
    $sql = 'SELECT COUNT(*) AS total FROM tenants WHERE unit_id = :unit_id';

    if ($ignoreTenantId !== null) {
        $sql .= ' AND id <> :ignore_id';
    }

    $statement = db()->prepare($sql);
    $statement->bindValue(':unit_id', $unitId, PDO::PARAM_INT);

    if ($ignoreTenantId !== null) {
        $statement->bindValue(':ignore_id', $ignoreTenantId, PDO::PARAM_INT);
    }

    $statement->execute();
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0) > 0;
}

function tenant_unit_allows_assignment(int $unitId, ?int $currentTenantId = null): bool
{
    $unit = load_unit_record_by_id($unitId);

    if ($unit === null) {
        return false;
    }

    if ($currentTenantId !== null && tenant_unit_exists($unitId, $currentTenantId)) {
        return false;
    }

    $status = strtolower((string) ($unit['status'] ?? 'available'));

    return in_array($status, ['available', 'occupied'], true);
}

function update_unit_status_for_tenant_assignment(int $unitId, string $status): void
{
    $statement = db()->prepare(
        'UPDATE units
         SET status = :status
         WHERE id = :id'
    );
    $statement->execute([
        'id' => $unitId,
        'status' => normalize_unit_status($status),
    ]);
}

function tenant_base_columns(): string
{
    return implode(', ', [
        't.id',
        't.unit_id',
        't.full_name',
        't.email',
        't.phone',
        't.status',
        't.move_in_date',
        't.notes',
        't.profile_photo_path',
        't.created_by',
        't.created_at',
        't.updated_at',
        '(SELECT COUNT(*) FROM tenant_documents td WHERE td.tenant_id = t.id) AS document_count',
        'u.id AS unit_record_id',
        'u.unit_number AS unit_number',
        'u.status AS unit_status',
        'u.description AS unit_description',
        'u.monthly_rent AS unit_monthly_rent',
        'u.security_deposit AS unit_security_deposit',
        'p.id AS property_id',
        'p.name AS property_name',
        'p.slug AS property_slug',
        'p.status AS property_status',
        'p.address_line1 AS property_address_line1',
        'p.address_line2 AS property_address_line2',
        'p.city AS property_city',
        'p.state AS property_state',
        'p.postal_code AS property_postal_code',
        'p.country AS property_country',
        'pt.id AS property_type_id',
        'pt.name AS property_type_name',
        'pt.slug AS property_type_slug',
        'pt.description AS property_type_description',
        'pt.is_active AS property_type_is_active',
        'cu.name AS created_by_name',
        'cu.email AS created_by_email',
        'cu.role AS created_by_role',
    ]);
}

function build_tenant_unit_payload(array $record): ?array
{
    $unitId = (int) ($record['unit_record_id'] ?? $record['unit_id'] ?? 0);

    if ($unitId <= 0) {
        return null;
    }

    $propertyId = (int) ($record['property_id'] ?? 0);
    $propertyStatus = strtolower((string) ($record['property_status'] ?? 'available'));
    $unitStatus = normalize_unit_status((string) ($record['unit_status'] ?? 'available'));

    $addressParts = array_filter([
        (string) ($record['property_address_line1'] ?? ''),
        $record['property_address_line2'] !== null ? (string) $record['property_address_line2'] : null,
        trim((string) ($record['property_city'] ?? '') . ', ' . (string) ($record['property_state'] ?? '')),
        trim((string) ($record['property_postal_code'] ?? '') . ', ' . (string) ($record['property_country'] ?? '')),
    ]);

    return [
        'id' => $unitId,
        'propertyId' => $propertyId,
        'unitNumber' => (string) ($record['unit_number'] ?? ''),
        'status' => $unitStatus,
        'statusLabel' => unit_status_label($unitStatus),
        'description' => $record['unit_description'] !== null ? (string) $record['unit_description'] : null,
        'monthlyRent' => (float) ($record['unit_monthly_rent'] ?? 0),
        'securityDeposit' => (float) ($record['unit_security_deposit'] ?? 0),
        'property' => [
            'id' => $propertyId,
            'name' => (string) ($record['property_name'] ?? ''),
            'slug' => (string) ($record['property_slug'] ?? ''),
            'status' => $propertyStatus,
            'statusLabel' => property_status_label($propertyStatus),
            'propertyTypeId' => (int) ($record['property_type_id'] ?? 0),
            'propertyType' => [
                'id' => (int) ($record['property_type_id'] ?? 0),
                'name' => (string) ($record['property_type_name'] ?? ''),
                'slug' => (string) ($record['property_type_slug'] ?? ''),
                'description' => $record['property_type_description'] !== null ? (string) $record['property_type_description'] : null,
                'isActive' => (bool) ($record['property_type_is_active'] ?? true),
            ],
            'addressLine1' => (string) ($record['property_address_line1'] ?? ''),
            'addressLine2' => $record['property_address_line2'] !== null ? (string) $record['property_address_line2'] : null,
            'city' => (string) ($record['property_city'] ?? ''),
            'state' => (string) ($record['property_state'] ?? ''),
            'postalCode' => (string) ($record['property_postal_code'] ?? ''),
            'country' => (string) ($record['property_country'] ?? ''),
            'addressLabel' => implode(', ', $addressParts),
        ],
        'addressLabel' => implode(', ', $addressParts),
        'unitLabel' => trim((string) ($record['property_name'] ?? '') . ' • ' . (string) ($record['unit_number'] ?? ''), " •"),
    ];
}

function build_tenant_document_payload(array $record): array
{
    $path = sanitize_relative_tenant_document_path($record['document_path'] ?? null);
    $originalName = sanitize_upload_original_name((string) ($record['original_name'] ?? 'document'));
    $size = (int) ($record['file_size'] ?? 0);

    return [
        'id' => (int) ($record['id'] ?? 0),
        'tenantId' => (int) ($record['tenant_id'] ?? 0),
        'documentPath' => $path,
        'documentUrl' => tenant_document_url($path),
        'originalName' => $originalName,
        'caption' => $record['caption'] !== null ? (string) $record['caption'] : null,
        'mimeType' => (string) ($record['mime_type'] ?? ''),
        'fileSize' => $size,
        'fileSizeLabel' => format_bytes($size),
        'extension' => pathinfo($originalName, PATHINFO_EXTENSION) ?: null,
        'createdAt' => $record['created_at'] ?? null,
        'updatedAt' => $record['updated_at'] ?? null,
    ];
}

function build_tenant_payload(array $record, bool $includeDocuments = true): array
{
    $unit = build_tenant_unit_payload($record);
    $status = normalize_tenant_status((string) ($record['status'] ?? 'active'));
    $photoPath = sanitize_relative_tenant_photo_path(
        $record['profile_photo_path'] ?? $record['profilePhotoPath'] ?? null
    );
    $documents = [];

    if ($includeDocuments && (int) ($record['id'] ?? 0) > 0) {
        $documents = list_tenant_documents((int) $record['id']);
    }

    $createdBy = null;

    if ((int) ($record['created_by'] ?? 0) > 0) {
        $createdBy = [
            'id' => (int) $record['created_by'],
            'name' => (string) ($record['created_by_name'] ?? ''),
            'email' => (string) ($record['created_by_email'] ?? ''),
            'role' => normalize_role((string) ($record['created_by_role'] ?? '')),
        ];
    }

    return [
        'id' => (int) ($record['id'] ?? 0),
        'unitId' => (int) ($record['unit_id'] ?? 0) ?: null,
        'unit' => $unit,
        'unitLabel' => $unit['unitLabel'] ?? ($unit ? $unit['addressLabel'] : 'Unassigned'),
        'fullName' => (string) ($record['full_name'] ?? ''),
        'email' => $record['email'] !== null ? (string) $record['email'] : null,
        'phone' => $record['phone'] !== null ? (string) $record['phone'] : null,
        'status' => $status,
        'statusLabel' => tenant_status_label($status),
        'moveInDate' => $record['move_in_date'] ?? null,
        'notes' => $record['notes'] !== null ? (string) $record['notes'] : null,
        'profilePhotoPath' => $photoPath,
        'profilePhotoUrl' => tenant_photo_url($photoPath),
        'hasProfilePhoto' => $photoPath !== null,
        'documentCount' => (int) ($record['document_count'] ?? count($documents)),
        'documents' => $documents,
        'createdBy' => $createdBy,
        'createdAt' => $record['created_at'] ?? null,
        'updatedAt' => $record['updated_at'] ?? null,
    ];
}

function load_tenant_record_by_id(int $id): ?array
{
    $statement = db()->prepare(
        'SELECT ' . tenant_base_columns() . '
         FROM tenants t
         LEFT JOIN units u ON u.id = t.unit_id
         LEFT JOIN properties p ON p.id = u.property_id
         LEFT JOIN property_types pt ON pt.id = p.property_type_id
         LEFT JOIN users cu ON cu.id = t.created_by
         WHERE t.id = :id
         LIMIT 1'
    );
    $statement->execute(['id' => $id]);

    $record = $statement->fetch();

    return $record === false ? null : $record;
}

function load_tenant_document_record_by_id(int $id): ?array
{
    $statement = db()->prepare(
        'SELECT
            id,
            tenant_id,
            document_path,
            original_name,
            caption,
            mime_type,
            file_size,
            created_at,
            updated_at
         FROM tenant_documents
         WHERE id = :id
         LIMIT 1'
    );
    $statement->execute(['id' => $id]);

    $record = $statement->fetch();

    return $record === false ? null : $record;
}

function tenant_assignment_map(): array
{
    $statement = db()->query(
        'SELECT id, unit_id, full_name, status, profile_photo_path
         FROM tenants
         WHERE unit_id IS NOT NULL'
    );

    $map = [];

    foreach ($statement->fetchAll() ?: [] as $record) {
        $map[(int) ($record['unit_id'] ?? 0)] = [
            'id' => (int) ($record['id'] ?? 0),
            'fullName' => (string) ($record['full_name'] ?? ''),
            'status' => normalize_tenant_status((string) ($record['status'] ?? 'active')),
            'statusLabel' => tenant_status_label((string) ($record['status'] ?? 'active')),
            'profilePhotoPath' => sanitize_relative_tenant_photo_path($record['profile_photo_path'] ?? null),
        ];
    }

    return $map;
}

function build_tenant_unit_option_payload(array $unit, ?array $assignment = null): array
{
    $property = (array) ($unit['property'] ?? []);
    $unitStatus = normalize_unit_status((string) ($unit['status'] ?? 'available'));
    $unitId = (int) ($unit['id'] ?? 0);

    return [
        'id' => $unitId,
        'unitNumber' => (string) ($unit['unitNumber'] ?? ''),
        'status' => $unitStatus,
        'statusLabel' => unit_status_label($unitStatus),
        'propertyId' => (int) ($unit['propertyId'] ?? 0),
        'property' => $property,
        'addressLabel' => (string) ($unit['addressLabel'] ?? ''),
        'unitLabel' => (string) ($unit['unitLabel'] ?? trim((string) ($property['name'] ?? '') . ' • ' . (string) ($unit['unitNumber'] ?? ''), " •")),
        'assignedTenantId' => $assignment['id'] ?? null,
        'assignedTenantName' => $assignment['fullName'] ?? null,
        'assignedTenantStatus' => $assignment['status'] ?? null,
        'assignedTenantStatusLabel' => $assignment['statusLabel'] ?? null,
        'assignedTenantPhotoPath' => $assignment['profilePhotoPath'] ?? null,
        'isAssigned' => $assignment !== null,
        'isSelectable' => in_array($unitStatus, ['available', 'occupied'], true),
    ];
}

function list_tenant_unit_options(): array
{
    $units = list_unit_records(1000, 0, null, null, null);
    $assignments = tenant_assignment_map();

    return array_map(
        static function (array $unit) use ($assignments): array {
            $assignment = $assignments[(int) ($unit['id'] ?? 0)] ?? null;

            return build_tenant_unit_option_payload($unit, $assignment);
        },
        $units
    );
}

function list_tenant_documents(int $tenantId): array
{
    $statement = db()->prepare(
        'SELECT
            id,
            tenant_id,
            document_path,
            original_name,
            caption,
            mime_type,
            file_size,
            created_at,
            updated_at
         FROM tenant_documents
         WHERE tenant_id = :tenant_id
         ORDER BY created_at DESC, id DESC'
    );
    $statement->execute(['tenant_id' => $tenantId]);

    return array_map(
        static fn (array $record): array => build_tenant_document_payload($record),
        $statement->fetchAll() ?: []
    );
}

function list_tenant_records(int $limit = 50, int $offset = 0, ?string $search = null, ?string $status = null, ?int $unitId = null): array
{
    $limit = max(1, min(500, $limit));
    $offset = max(0, $offset);
    $search = $search !== null ? normalize_text($search) : null;
    $status = $status !== null && $status !== '' && strtolower($status) !== 'all' ? normalize_tenant_status($status) : null;
    $unitId = $unitId !== null && $unitId > 0 ? $unitId : null;

    $where = ['1 = 1'];
    $params = [];

    if ($search !== null && $search !== '') {
        $where[] = '(
            t.full_name LIKE :search
            OR t.email LIKE :search
            OR t.phone LIKE :search
            OR u.unit_number LIKE :search
            OR p.name LIKE :search
            OR p.city LIKE :search
            OR p.state LIKE :search
        )';
        $params['search'] = '%' . $search . '%';
    }

    if ($status !== null) {
        $where[] = 't.status = :status';
        $params['status'] = $status;
    }

    if ($unitId !== null) {
        $where[] = 't.unit_id = :unit_id';
        $params['unit_id'] = $unitId;
    }

    $statement = db()->prepare(
        'SELECT ' . tenant_base_columns() . '
         FROM tenants t
         LEFT JOIN units u ON u.id = t.unit_id
         LEFT JOIN properties p ON p.id = u.property_id
         LEFT JOIN property_types pt ON pt.id = p.property_type_id
         LEFT JOIN users cu ON cu.id = t.created_by
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY t.updated_at DESC, t.created_at DESC
         LIMIT :limit OFFSET :offset'
    );

    foreach ($params as $key => $value) {
        $statement->bindValue(':' . $key, $value, PDO::PARAM_STR);
    }

    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
    $statement->execute();

    return array_map(
        static fn (array $record): array => build_tenant_payload($record, false),
        $statement->fetchAll() ?: []
    );
}

function normalize_tenant_payload(array $data, ?int $ignoreId = null): array
{
    $currentTenant = $ignoreId !== null ? load_tenant_record_by_id($ignoreId) : null;
    $currentUnitId = $currentTenant !== null ? (int) ($currentTenant['unit_id'] ?? 0) : 0;

    $unitId = validate_property_integer(
        $data['unitId'] ?? $data['unit_id'] ?? null,
        'unit',
        1,
        PHP_INT_MAX,
        null
    );
    $fullName = validate_tenant_full_name((string) ($data['fullName'] ?? $data['full_name'] ?? ''));
    $email = validate_tenant_email($data['email'] ?? null);
    $phone = validate_tenant_phone($data['phone'] ?? null);
    $status = normalize_tenant_status((string) ($data['status'] ?? 'active'));
    $moveInDate = validate_tenant_move_in_date($data['moveInDate'] ?? $data['move_in_date'] ?? null);
    $notes = validate_tenant_notes($data['notes'] ?? null);
    $status = $status === 'all' ? 'active' : $status;

    if ($email !== null && tenant_email_exists($email, $ignoreId)) {
        throw new InvalidArgumentException('That email address is already in use.');
    }

    if ($unitId !== null) {
        $unit = load_unit_record_by_id($unitId);

        if ($unit === null) {
            throw new InvalidArgumentException('The selected unit does not exist.');
        }

        if ($currentUnitId !== $unitId && !tenant_unit_allows_assignment($unitId, $ignoreId)) {
            throw new InvalidArgumentException('The selected unit is not available for tenant assignment.');
        }

        if ($ignoreId === null && tenant_unit_exists($unitId)) {
            throw new InvalidArgumentException('That unit is already assigned to another tenant.');
        }
    }

    return [
        'unit_id' => $unitId,
        'full_name' => $fullName,
        'email' => $email,
        'phone' => $phone,
        'status' => $status,
        'move_in_date' => $moveInDate,
        'notes' => $notes,
    ];
}

function create_tenant_record(array $data, ?int $creatorId = null): array
{
    $payload = normalize_tenant_payload($data);
    $pdo = db();
    $tenantId = null;

    try {
        $pdo->beginTransaction();

        $statement = $pdo->prepare(
            'INSERT INTO tenants (
                unit_id,
                full_name,
                email,
                phone,
                status,
                move_in_date,
                notes,
                created_by
            ) VALUES (
                :unit_id,
                :full_name,
                :email,
                :phone,
                :status,
                :move_in_date,
                :notes,
                :created_by
            )'
        );
        $statement->execute([
            'unit_id' => $payload['unit_id'],
            'full_name' => $payload['full_name'],
            'email' => $payload['email'],
            'phone' => $payload['phone'],
            'status' => $payload['status'],
            'move_in_date' => $payload['move_in_date'],
            'notes' => $payload['notes'],
            'created_by' => $creatorId,
        ]);

        $tenantId = (int) $pdo->lastInsertId();

        if ($payload['unit_id'] !== null) {
            update_unit_status_for_tenant_assignment((int) $payload['unit_id'], 'occupied');
        }

        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $exception;
    }

    $record = load_tenant_record_by_id((int) $tenantId);

    if ($record === null) {
        throw new RuntimeException('The tenant could not be created.');
    }

    return $record;
}

function update_tenant_record(int $id, array $data): array
{
    $existing = load_tenant_record_by_id($id);

    if ($existing === null) {
        throw new InvalidArgumentException('The selected tenant does not exist.');
    }

    $payload = normalize_tenant_payload($data, $id);
    $oldUnitId = (int) ($existing['unit_id'] ?? 0);
    $newUnitId = $payload['unit_id'] !== null ? (int) $payload['unit_id'] : 0;
    $pdo = db();

    try {
        $pdo->beginTransaction();

        $statement = $pdo->prepare(
            'UPDATE tenants
             SET unit_id = :unit_id,
                 full_name = :full_name,
                 email = :email,
                 phone = :phone,
                 status = :status,
                 move_in_date = :move_in_date,
                 notes = :notes
             WHERE id = :id'
        );
        $statement->execute([
            'id' => $id,
            'unit_id' => $payload['unit_id'],
            'full_name' => $payload['full_name'],
            'email' => $payload['email'],
            'phone' => $payload['phone'],
            'status' => $payload['status'],
            'move_in_date' => $payload['move_in_date'],
            'notes' => $payload['notes'],
        ]);

        if ($oldUnitId > 0 && $oldUnitId !== $newUnitId) {
            update_unit_status_for_tenant_assignment($oldUnitId, 'available');
        }

        if ($newUnitId > 0 && $oldUnitId !== $newUnitId) {
            update_unit_status_for_tenant_assignment($newUnitId, 'occupied');
        }

        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $exception;
    }

    $record = load_tenant_record_by_id($id);

    if ($record === null) {
        throw new RuntimeException('The tenant could not be updated.');
    }

    return $record;
}

function delete_tenant_record(int $id): void
{
    $existing = load_tenant_record_by_id($id);

    if ($existing === null) {
        throw new InvalidArgumentException('The selected tenant does not exist.');
    }

    $documents = list_tenant_documents($id);
    $photoPath = $existing['profile_photo_path'] ?? null;
    $unitId = (int) ($existing['unit_id'] ?? 0);
    $pdo = db();

    try {
        $pdo->beginTransaction();

        $statement = $pdo->prepare('DELETE FROM tenants WHERE id = :id');
        $statement->execute(['id' => $id]);

        if ($unitId > 0) {
            update_unit_status_for_tenant_assignment($unitId, 'available');
        }

        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $exception;
    }

    delete_tenant_photo_file($photoPath !== null ? (string) $photoPath : null);

    foreach ($documents as $document) {
        delete_tenant_document_file($document['documentPath'] ?? null);
    }
}

function store_tenant_photo_upload(int $tenantId, array $file): array
{
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException(tenant_upload_error_message($error, 'photo'));
    }

    $tmpPath = (string) ($file['tmp_name'] ?? '');

    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        throw new InvalidArgumentException('The uploaded file is not valid.');
    }

    $size = (int) ($file['size'] ?? 0);
    $maxSize = max(1, (int) tenant_security_config('tenant_photo_max_bytes', 2 * 1024 * 1024));

    if ($size <= 0 || $size > $maxSize) {
        throw new InvalidArgumentException('The uploaded photo is too large.');
    }

    $imageInfo = @getimagesize($tmpPath);

    if ($imageInfo === false) {
        throw new InvalidArgumentException('Please upload a valid image file.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = (string) ($finfo->file($tmpPath) ?: '');
    $extension = tenant_photo_extension_for_mime($mimeType);

    if ($extension === null) {
        throw new InvalidArgumentException('Only JPEG, PNG, and WebP images are allowed.');
    }

    $directory = tenant_photo_storage_path();
    ensure_directory_exists($directory);

    $filename = sprintf(
        'tenant-%d-%s.%s',
        $tenantId,
        bin2hex(random_bytes(16)),
        $extension
    );

    $relativePath = tenant_photo_directory() . '/' . $filename;
    $targetPath = tenant_photo_storage_path($relativePath);

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

function delete_tenant_photo_file(?string $relativePath): void
{
    $relativePath = sanitize_relative_tenant_photo_path($relativePath);

    if ($relativePath === null) {
        return;
    }

    $absolutePath = tenant_photo_storage_path($relativePath);

    if (is_file($absolutePath)) {
        @unlink($absolutePath);
    }
}

function store_tenant_document_upload(int $tenantId, array $file): array
{
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException(tenant_upload_error_message($error, 'document'));
    }

    $tmpPath = (string) ($file['tmp_name'] ?? '');

    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        throw new InvalidArgumentException('The uploaded file is not valid.');
    }

    $size = (int) ($file['size'] ?? 0);
    $maxSize = max(1, (int) tenant_security_config('tenant_document_max_bytes', 10 * 1024 * 1024));

    if ($size <= 0 || $size > $maxSize) {
        throw new InvalidArgumentException('The uploaded document is too large.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = (string) ($finfo->file($tmpPath) ?: '');
    $extension = tenant_document_extension_for_mime($mimeType);

    if ($extension === null) {
        throw new InvalidArgumentException('Only PDF, Word, text, and image documents are allowed.');
    }

    $directory = tenant_document_storage_path();
    ensure_directory_exists($directory);

    $filename = sprintf(
        'tenant-%d-%s.%s',
        $tenantId,
        bin2hex(random_bytes(16)),
        $extension
    );

    $relativePath = tenant_document_directory() . '/' . $filename;
    $targetPath = tenant_document_storage_path($relativePath);
    $originalName = sanitize_upload_original_name((string) ($file['name'] ?? 'document'));

    if (!move_uploaded_file($tmpPath, $targetPath)) {
        throw new RuntimeException('The uploaded document could not be saved.');
    }

    return [
        'relativePath' => $relativePath,
        'absolutePath' => $targetPath,
        'mimeType' => $mimeType,
        'size' => $size,
        'originalName' => $originalName,
        'extension' => $extension,
    ];
}

function delete_tenant_document_file(?string $relativePath): void
{
    $relativePath = sanitize_relative_tenant_document_path($relativePath);

    if ($relativePath === null) {
        return;
    }

    $absolutePath = tenant_document_storage_path($relativePath);

    if (is_file($absolutePath)) {
        @unlink($absolutePath);
    }
}

function insert_tenant_document_record(int $tenantId, array $upload, ?string $caption, ?string $originalName = null): array
{
    $statement = db()->prepare(
        'INSERT INTO tenant_documents (
            tenant_id,
            document_path,
            original_name,
            caption,
            mime_type,
            file_size
        ) VALUES (
            :tenant_id,
            :document_path,
            :original_name,
            :caption,
            :mime_type,
            :file_size
        )'
    );
    $statement->execute([
        'tenant_id' => $tenantId,
        'document_path' => $upload['relativePath'],
        'original_name' => sanitize_upload_original_name((string) ($originalName ?? $upload['originalName'] ?? 'document')),
        'caption' => $caption,
        'mime_type' => $upload['mimeType'],
        'file_size' => $upload['size'],
    ]);

    $document = load_tenant_document_record_by_id((int) db()->lastInsertId());

    if ($document === null) {
        throw new RuntimeException('The tenant document could not be saved.');
    }

    return $document;
}

function delete_tenant_document_record(int $tenantId, int $documentId): void
{
    $document = load_tenant_document_record_by_id($documentId);

    if ($document === null || (int) ($document['tenant_id'] ?? 0) !== $tenantId) {
        throw new InvalidArgumentException('The selected document does not exist.');
    }

    delete_tenant_document_file($document['document_path'] ?? null);

    $statement = db()->prepare('DELETE FROM tenant_documents WHERE id = :id AND tenant_id = :tenant_id');
    $statement->execute([
        'id' => $documentId,
        'tenant_id' => $tenantId,
    ]);
}

function load_tenant_document_records(int $tenantId): array
{
    $statement = db()->prepare(
        'SELECT
            id,
            tenant_id,
            document_path,
            original_name,
            caption,
            mime_type,
            file_size,
            created_at,
            updated_at
         FROM tenant_documents
         WHERE tenant_id = :tenant_id
         ORDER BY created_at DESC, id DESC'
    );
    $statement->execute(['tenant_id' => $tenantId]);

    return $statement->fetchAll() ?: [];
}

function tenant_summary_stats(): array
{
    $tenantRow = db()->query(
        'SELECT
            COUNT(*) AS total_tenants,
            COALESCE(SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END), 0) AS active_tenants,
            COALESCE(SUM(CASE WHEN status = "inactive" THEN 1 ELSE 0 END), 0) AS inactive_tenants,
            COALESCE(SUM(CASE WHEN unit_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS assigned_tenants,
            COALESCE(SUM(CASE WHEN unit_id IS NULL THEN 1 ELSE 0 END), 0) AS unassigned_tenants
         FROM tenants'
    )->fetch() ?: [];

    $documentRow = db()->query(
        'SELECT COUNT(*) AS total_documents
         FROM tenant_documents'
    )->fetch() ?: [];

    return [
        'tenants' => [
            'total' => (int) ($tenantRow['total_tenants'] ?? 0),
            'active' => (int) ($tenantRow['active_tenants'] ?? 0),
            'inactive' => (int) ($tenantRow['inactive_tenants'] ?? 0),
            'assigned' => (int) ($tenantRow['assigned_tenants'] ?? 0),
            'unassigned' => (int) ($tenantRow['unassigned_tenants'] ?? 0),
        ],
        'documents' => [
            'total' => (int) ($documentRow['total_documents'] ?? 0),
        ],
    ];
}

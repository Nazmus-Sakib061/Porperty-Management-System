<?php

declare(strict_types=1);

function property_security_config(?string $key = null, mixed $default = null): mixed
{
    $config = (array) app_config('security', []);

    if ($key === null) {
        return $config;
    }

    return $config[$key] ?? $default;
}

function property_default_country(): string
{
    return trim((string) property_security_config('property_default_country', 'Bangladesh'));
}

function allowed_property_statuses(): array
{
    return [
        'available' => 'Available',
        'occupied' => 'Occupied',
        'maintenance' => 'Maintenance',
        'inactive' => 'Inactive',
    ];
}

function normalize_property_status(?string $status): string
{
    $status = strtolower(trim((string) $status));

    if ($status === '') {
        $status = 'available';
    }

    if (!array_key_exists($status, allowed_property_statuses())) {
        throw new InvalidArgumentException('Please choose a valid property status.');
    }

    return $status;
}

function property_status_label(?string $status): string
{
    $status = normalize_property_status($status);

    return allowed_property_statuses()[$status] ?? ucwords(str_replace('_', ' ', $status));
}

function normalize_property_text(string $value): string
{
    return normalize_text($value);
}

function validate_property_text(string $value, int $minLength, int $maxLength, string $message): string
{
    $value = normalize_property_text($value);
    $length = function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);

    if ($value === '' || $length < $minLength || $length > $maxLength) {
        throw new InvalidArgumentException($message);
    }

    if (preg_match('/[\x00-\x1F\x7F]/', $value)) {
        throw new InvalidArgumentException($message);
    }

    return $value;
}

function validate_optional_property_text(?string $value, int $maxLength): ?string
{
    $value = normalize_property_text((string) $value);
    $length = function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);

    if ($value === '') {
        return null;
    }

    if ($length > $maxLength || preg_match('/[\x00-\x1F\x7F]/', $value)) {
        throw new InvalidArgumentException('The value is too long or contains invalid characters.');
    }

    return $value;
}

function validate_property_name(string $name): string
{
    return validate_property_text($name, 2, 160, 'Please enter a valid property name.');
}

function validate_property_type_name(string $name): string
{
    return validate_property_text($name, 2, 120, 'Please enter a valid property type name.');
}

function validate_property_line(string $value, string $fieldLabel): string
{
    return validate_property_text($value, 3, 191, 'Please enter a valid ' . $fieldLabel . '.');
}

function validate_property_city(string $value): string
{
    return validate_property_text($value, 2, 120, 'Please enter a valid city.');
}

function validate_property_state(string $value): string
{
    return validate_property_text($value, 2, 120, 'Please enter a valid state or province.');
}

function validate_property_country(string $value): string
{
    return validate_property_text($value, 2, 120, 'Please enter a valid country.');
}

function validate_property_postal_code(string $value): string
{
    $value = normalize_property_text($value);
    $length = function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);

    if ($value === '' || $length > 32) {
        throw new InvalidArgumentException('Please enter a valid postal code.');
    }

    if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9\s\-.,]{1,31}$/', $value)) {
        throw new InvalidArgumentException('Please enter a valid postal code.');
    }

    return $value;
}

function validate_property_description(?string $value): ?string
{
    return validate_optional_property_text($value, 5000);
}

function validate_property_notes(?string $value): ?string
{
    return validate_optional_property_text($value, 5000);
}

function validate_property_type_description(?string $value): ?string
{
    return validate_optional_property_text($value, 255);
}

function validate_property_integer(mixed $value, string $fieldLabel, int $min, int $max, ?int $default = null): ?int
{
    $value = trim((string) $value);

    if ($value === '') {
        return $default;
    }

    if (!preg_match('/^-?\d+$/', $value)) {
        throw new InvalidArgumentException('Please enter a valid ' . $fieldLabel . '.');
    }

    $number = (int) $value;

    if ($number < $min || $number > $max) {
        throw new InvalidArgumentException('Please enter a valid ' . $fieldLabel . '.');
    }

    return $number;
}

function validate_property_decimal(mixed $value, string $fieldLabel, int $decimals, float $min = 0.0, float $max = 999999999.99, ?string $default = null): string
{
    $value = trim((string) $value);

    if ($value === '') {
        return $default ?? number_format(0, $decimals, '.', '');
    }

    if (!is_numeric($value)) {
        throw new InvalidArgumentException('Please enter a valid ' . $fieldLabel . '.');
    }

    $number = (float) $value;

    if ($number < $min || $number > $max) {
        throw new InvalidArgumentException('Please enter a valid ' . $fieldLabel . '.');
    }

    return number_format($number, $decimals, '.', '');
}

function slugify_text(string $value, string $fallback = 'item'): string
{
    $value = normalize_property_text($value);
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/i', '-', $value) ?? '';
    $value = trim($value, '-');
    $value = preg_replace('/-+/', '-', $value) ?? $value;

    if ($value === '') {
        $value = $fallback;
    }

    return substr($value, 0, 160);
}

function property_type_slug_exists(string $slug, ?int $ignoreId = null): bool
{
    $sql = 'SELECT COUNT(*) AS total FROM property_types WHERE slug = :slug';

    if ($ignoreId !== null) {
        $sql .= ' AND id <> :ignore_id';
    }

    $statement = db()->prepare($sql);
    $statement->bindValue(':slug', $slug, PDO::PARAM_STR);

    if ($ignoreId !== null) {
        $statement->bindValue(':ignore_id', $ignoreId, PDO::PARAM_INT);
    }

    $statement->execute();
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0) > 0;
}

function property_type_name_exists(string $name, ?int $ignoreId = null): bool
{
    $sql = 'SELECT COUNT(*) AS total FROM property_types WHERE LOWER(name) = LOWER(:name)';

    if ($ignoreId !== null) {
        $sql .= ' AND id <> :ignore_id';
    }

    $statement = db()->prepare($sql);
    $statement->bindValue(':name', normalize_property_text($name), PDO::PARAM_STR);

    if ($ignoreId !== null) {
        $statement->bindValue(':ignore_id', $ignoreId, PDO::PARAM_INT);
    }

    $statement->execute();
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0) > 0;
}

function property_slug_exists(string $slug, ?int $ignoreId = null): bool
{
    $sql = 'SELECT COUNT(*) AS total FROM properties WHERE slug = :slug';

    if ($ignoreId !== null) {
        $sql .= ' AND id <> :ignore_id';
    }

    $statement = db()->prepare($sql);
    $statement->bindValue(':slug', $slug, PDO::PARAM_STR);

    if ($ignoreId !== null) {
        $statement->bindValue(':ignore_id', $ignoreId, PDO::PARAM_INT);
    }

    $statement->execute();
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0) > 0;
}

function property_type_property_count(int $typeId): int
{
    $statement = db()->prepare(
        'SELECT COUNT(*) AS total
         FROM properties
         WHERE property_type_id = :property_type_id'
    );
    $statement->execute(['property_type_id' => $typeId]);
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0);
}

function property_type_in_use(int $typeId): bool
{
    return property_type_property_count($typeId) > 0;
}

function unique_property_type_slug(string $name, ?int $ignoreId = null): string
{
    $base = slugify_text($name, 'type');
    $candidate = $base;
    $suffix = 2;

    while (property_type_slug_exists($candidate, $ignoreId)) {
        $candidate = $base . '-' . $suffix;
        $suffix++;
    }

    return $candidate;
}

function unique_property_slug(string $name, string $city = '', ?int $ignoreId = null): string
{
    $seed = trim($name . ' ' . $city);
    $base = slugify_text($seed, 'property');
    $candidate = $base;
    $suffix = 2;

    while (property_slug_exists($candidate, $ignoreId)) {
        $candidate = $base . '-' . $suffix;
        $suffix++;
    }

    return $candidate;
}

function property_image_directory(): string
{
    $directory = trim((string) property_security_config('property_image_directory', 'uploads/properties'), '/');

    return $directory === '' ? 'uploads/properties' : $directory;
}

function property_image_storage_path(?string $relativePath = null): string
{
    $relativePath = $relativePath ?? property_image_directory();
    $relativePath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, trim($relativePath, '/\\'));

    return dirname(__DIR__) . DIRECTORY_SEPARATOR . $relativePath;
}

function sanitize_relative_property_image_path(?string $path): ?string
{
    $path = str_replace('\\', '/', trim((string) $path));

    if ($path === '' || str_contains($path, '..')) {
        return null;
    }

    $prefix = property_image_directory();

    if ($prefix === '' || !str_starts_with($path, $prefix . '/')) {
        return null;
    }

    return $path;
}

function property_image_url(?string $path): ?string
{
    $path = sanitize_relative_property_image_path($path);

    if ($path === null) {
        return null;
    }

    return app_url($path);
}

function property_image_extension_for_mime(string $mimeType): ?string
{
    return match ($mimeType) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        default => null,
    };
}

function property_base_columns(): string
{
    return implode(', ', [
        'p.id',
        'p.property_type_id',
        'p.name',
        'p.slug',
        'p.status',
        'p.description',
        'p.address_line1',
        'p.address_line2',
        'p.city',
        'p.state',
        'p.postal_code',
        'p.country',
        'p.bedrooms',
        'p.bathrooms',
        'p.area_sqft',
        'p.monthly_rent',
        'p.security_deposit',
        'p.notes',
        'p.created_by',
        'p.created_at',
        'p.updated_at',
        'pt.name AS property_type_name',
        'pt.slug AS property_type_slug',
        'pt.description AS property_type_description',
        'pt.is_active AS property_type_is_active',
        'u.name AS created_by_name',
        'u.email AS created_by_email',
        'u.role AS created_by_role',
    ]);
}

function property_list_columns(): string
{
    return property_base_columns() . ', ' . implode(', ', [
        '(SELECT COUNT(*) FROM property_images pi WHERE pi.property_id = p.id) AS image_count',
        '(SELECT pi.image_path FROM property_images pi WHERE pi.property_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC LIMIT 1) AS cover_image_path',
        '(SELECT pi.caption FROM property_images pi WHERE pi.property_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC LIMIT 1) AS cover_image_caption',
    ]);
}

function build_property_type_payload(array $record): array
{
    return [
        'id' => (int) ($record['id'] ?? 0),
        'name' => (string) ($record['name'] ?? ''),
        'slug' => (string) ($record['slug'] ?? ''),
        'description' => $record['description'] !== null ? (string) $record['description'] : null,
        'isActive' => (bool) ($record['is_active'] ?? false),
        'propertyCount' => (int) ($record['property_count'] ?? 0),
        'availableCount' => (int) ($record['available_count'] ?? 0),
        'occupiedCount' => (int) ($record['occupied_count'] ?? 0),
        'maintenanceCount' => (int) ($record['maintenance_count'] ?? 0),
        'inactivePropertyCount' => (int) ($record['inactive_property_count'] ?? 0),
        'createdAt' => $record['created_at'] ?? null,
        'updatedAt' => $record['updated_at'] ?? null,
    ];
}

function build_property_image_payload(array $record): array
{
    $path = sanitize_relative_property_image_path($record['image_path'] ?? null);

    return [
        'id' => (int) ($record['id'] ?? 0),
        'propertyId' => (int) ($record['property_id'] ?? 0),
        'imagePath' => $path,
        'imageUrl' => property_image_url($path),
        'caption' => $record['caption'] !== null ? (string) $record['caption'] : null,
        'isPrimary' => (bool) ($record['is_primary'] ?? false),
        'sortOrder' => (int) ($record['sort_order'] ?? 0),
        'createdAt' => $record['created_at'] ?? null,
        'updatedAt' => $record['updated_at'] ?? null,
    ];
}

function build_property_payload(array $record): array
{
    $images = array_map(
        static fn (array $image): array => build_property_image_payload($image),
        (array) ($record['images'] ?? [])
    );

    $coverImagePath = sanitize_relative_property_image_path(
        $record['cover_image_path'] ?? $record['coverImagePath'] ?? null
    );
    $coverImageUrl = $coverImagePath !== null ? property_image_url($coverImagePath) : null;
    $propertyTypeId = (int) ($record['property_type_id'] ?? 0);
    $propertyType = [
        'id' => $propertyTypeId,
        'name' => (string) ($record['property_type_name'] ?? ''),
        'slug' => (string) ($record['property_type_slug'] ?? ''),
        'description' => $record['property_type_description'] !== null ? (string) $record['property_type_description'] : null,
        'isActive' => (bool) ($record['property_type_is_active'] ?? true),
    ];

    $createdBy = null;
    if ((int) ($record['created_by'] ?? 0) > 0) {
        $createdBy = [
            'id' => (int) $record['created_by'],
            'name' => (string) ($record['created_by_name'] ?? ''),
            'email' => (string) ($record['created_by_email'] ?? ''),
            'role' => normalize_role((string) ($record['created_by_role'] ?? '')),
        ];
    }

    $addressParts = array_filter([
        (string) ($record['address_line1'] ?? ''),
        (string) ($record['address_line2'] ?? ''),
        trim((string) ($record['city'] ?? '') . ', ' . (string) ($record['state'] ?? '')),
        trim((string) ($record['postal_code'] ?? '') . ', ' . (string) ($record['country'] ?? '')),
    ]);

    $specParts = [];
    $bedrooms = (int) ($record['bedrooms'] ?? 0);
    $bathrooms = (float) ($record['bathrooms'] ?? 0);
    $areaSqft = $record['area_sqft'] !== null ? (int) $record['area_sqft'] : null;

    if ($bedrooms > 0) {
        $specParts[] = $bedrooms . ' bed';
    }

    $bathroomLabel = rtrim(rtrim(number_format($bathrooms, 1, '.', ''), '0'), '.');
    if ($bathrooms > 0) {
        $specParts[] = $bathroomLabel . ' bath';
    }

    if ($areaSqft !== null && $areaSqft > 0) {
        $specParts[] = number_format($areaSqft) . ' sqft';
    }

    return [
        'id' => (int) ($record['id'] ?? 0),
        'propertyTypeId' => $propertyTypeId,
        'propertyType' => $propertyType,
        'name' => (string) ($record['name'] ?? ''),
        'slug' => (string) ($record['slug'] ?? ''),
        'status' => normalize_property_status((string) ($record['status'] ?? 'available')),
        'statusLabel' => property_status_label((string) ($record['status'] ?? 'available')),
        'description' => $record['description'] !== null ? (string) $record['description'] : null,
        'addressLine1' => (string) ($record['address_line1'] ?? ''),
        'addressLine2' => $record['address_line2'] !== null ? (string) $record['address_line2'] : null,
        'city' => (string) ($record['city'] ?? ''),
        'state' => (string) ($record['state'] ?? ''),
        'postalCode' => (string) ($record['postal_code'] ?? ''),
        'country' => (string) ($record['country'] ?? ''),
        'addressLabel' => implode(', ', $addressParts),
        'bedrooms' => $bedrooms,
        'bathrooms' => $bathrooms,
        'areaSqft' => $areaSqft,
        'monthlyRent' => (float) ($record['monthly_rent'] ?? 0),
        'securityDeposit' => (float) ($record['security_deposit'] ?? 0),
        'notes' => $record['notes'] !== null ? (string) $record['notes'] : null,
        'specSummary' => implode(' • ', $specParts),
        'coverImagePath' => $coverImagePath,
        'coverImageUrl' => $coverImageUrl,
        'coverImageCaption' => $record['cover_image_caption'] !== null ? (string) $record['cover_image_caption'] : null,
        'imageCount' => (int) ($record['image_count'] ?? count($images)),
        'images' => $images,
        'createdBy' => $createdBy,
        'createdAt' => $record['created_at'] ?? null,
        'updatedAt' => $record['updated_at'] ?? null,
    ];
}

function load_property_type_record_by_id(int $id): ?array
{
    $statement = db()->prepare(
        'SELECT
            pt.id,
            pt.name,
            pt.slug,
            pt.description,
            pt.is_active,
            pt.created_at,
            pt.updated_at,
            COUNT(p.id) AS property_count,
            COALESCE(SUM(CASE WHEN p.status = "available" THEN 1 ELSE 0 END), 0) AS available_count,
            COALESCE(SUM(CASE WHEN p.status = "occupied" THEN 1 ELSE 0 END), 0) AS occupied_count,
            COALESCE(SUM(CASE WHEN p.status = "maintenance" THEN 1 ELSE 0 END), 0) AS maintenance_count,
            COALESCE(SUM(CASE WHEN p.status = "inactive" THEN 1 ELSE 0 END), 0) AS inactive_property_count
         FROM property_types pt
         LEFT JOIN properties p ON p.property_type_id = pt.id
         WHERE pt.id = :id
         GROUP BY
            pt.id,
            pt.name,
            pt.slug,
            pt.description,
            pt.is_active,
            pt.created_at,
            pt.updated_at
         LIMIT 1'
    );
    $statement->execute(['id' => $id]);

    $record = $statement->fetch();

    return $record === false ? null : $record;
}

function load_property_record_by_id(int $id): ?array
{
    $statement = db()->prepare(
        'SELECT ' . property_base_columns() . '
         FROM properties p
         INNER JOIN property_types pt ON pt.id = p.property_type_id
         LEFT JOIN users u ON u.id = p.created_by
         WHERE p.id = :id
         LIMIT 1'
    );
    $statement->execute(['id' => $id]);

    $record = $statement->fetch();

    if ($record === false) {
        return null;
    }

    $record['images'] = list_property_images((int) $record['id']);

    return $record;
}

function list_property_images(int $propertyId): array
{
    $statement = db()->prepare(
        'SELECT
            id,
            property_id,
            image_path,
            caption,
            is_primary,
            sort_order,
            created_at,
            updated_at
         FROM property_images
         WHERE property_id = :property_id
         ORDER BY is_primary DESC, sort_order ASC, id ASC'
    );
    $statement->execute(['property_id' => $propertyId]);

    $records = $statement->fetchAll() ?: [];

    return array_map(
        static fn (array $record): array => $record,
        $records
    );
}

function list_property_type_records(): array
{
    $statement = db()->query(
        'SELECT
            pt.id,
            pt.name,
            pt.slug,
            pt.description,
            pt.is_active,
            pt.created_at,
            pt.updated_at,
            COUNT(p.id) AS property_count,
            COALESCE(SUM(CASE WHEN p.status = "available" THEN 1 ELSE 0 END), 0) AS available_count,
            COALESCE(SUM(CASE WHEN p.status = "occupied" THEN 1 ELSE 0 END), 0) AS occupied_count,
            COALESCE(SUM(CASE WHEN p.status = "maintenance" THEN 1 ELSE 0 END), 0) AS maintenance_count,
            COALESCE(SUM(CASE WHEN p.status = "inactive" THEN 1 ELSE 0 END), 0) AS inactive_property_count
         FROM property_types pt
         LEFT JOIN properties p ON p.property_type_id = pt.id
         GROUP BY
            pt.id,
            pt.name,
            pt.slug,
            pt.description,
            pt.is_active,
            pt.created_at,
            pt.updated_at
         ORDER BY pt.is_active DESC, pt.name ASC'
    );

    return array_map(
        static fn (array $record): array => build_property_type_payload($record),
        $statement->fetchAll() ?: []
    );
}

function list_property_records(int $limit = 50, int $offset = 0, ?string $search = null, ?string $status = null, ?int $propertyTypeId = null): array
{
    $limit = max(1, min(100, $limit));
    $offset = max(0, $offset);
    $search = $search !== null ? normalize_property_text($search) : null;
    $status = $status !== null && $status !== '' && strtolower($status) !== 'all' ? normalize_property_status($status) : null;
    $propertyTypeId = $propertyTypeId !== null && $propertyTypeId > 0 ? $propertyTypeId : null;

    $where = ['1 = 1'];
    $params = [];

    if ($search !== null && $search !== '') {
        $where[] = '(
            p.name LIKE :search
            OR p.address_line1 LIKE :search
            OR COALESCE(p.address_line2, "") LIKE :search
            OR p.city LIKE :search
            OR p.state LIKE :search
            OR p.postal_code LIKE :search
            OR pt.name LIKE :search
        )';
        $params['search'] = '%' . $search . '%';
    }

    if ($status !== null) {
        $where[] = 'p.status = :status';
        $params['status'] = $status;
    }

    if ($propertyTypeId !== null) {
        $where[] = 'p.property_type_id = :property_type_id';
        $params['property_type_id'] = $propertyTypeId;
    }

    $statement = db()->prepare(
        'SELECT ' . property_list_columns() . '
         FROM properties p
         INNER JOIN property_types pt ON pt.id = p.property_type_id
         LEFT JOIN users u ON u.id = p.created_by
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY p.updated_at DESC, p.created_at DESC
         LIMIT :limit OFFSET :offset'
    );

    foreach ($params as $key => $value) {
        $statement->bindValue(':' . $key, $value, PDO::PARAM_STR);
    }

    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
    $statement->execute();

    return array_map(
        static fn (array $record): array => build_property_payload($record),
        $statement->fetchAll() ?: []
    );
}

function property_summary_stats(): array
{
    $propertyRow = db()->query(
        'SELECT
            COUNT(*) AS total_properties,
            COALESCE(SUM(CASE WHEN status = "available" THEN 1 ELSE 0 END), 0) AS available_properties,
            COALESCE(SUM(CASE WHEN status = "occupied" THEN 1 ELSE 0 END), 0) AS occupied_properties,
            COALESCE(SUM(CASE WHEN status = "maintenance" THEN 1 ELSE 0 END), 0) AS maintenance_properties,
            COALESCE(SUM(CASE WHEN status = "inactive" THEN 1 ELSE 0 END), 0) AS inactive_properties,
            COALESCE(SUM(CASE WHEN area_sqft IS NOT NULL THEN 1 ELSE 0 END), 0) AS has_area_properties
         FROM properties'
    )->fetch() ?: [];

    $typeRow = db()->query(
        'SELECT
            COUNT(*) AS total_types,
            COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) AS active_types,
            COALESCE(SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END), 0) AS inactive_types
         FROM property_types'
    )->fetch() ?: [];

    return [
        'properties' => [
            'total' => (int) ($propertyRow['total_properties'] ?? 0),
            'available' => (int) ($propertyRow['available_properties'] ?? 0),
            'occupied' => (int) ($propertyRow['occupied_properties'] ?? 0),
            'maintenance' => (int) ($propertyRow['maintenance_properties'] ?? 0),
            'inactive' => (int) ($propertyRow['inactive_properties'] ?? 0),
            'withArea' => (int) ($propertyRow['has_area_properties'] ?? 0),
        ],
        'types' => [
            'total' => (int) ($typeRow['total_types'] ?? 0),
            'active' => (int) ($typeRow['active_types'] ?? 0),
            'inactive' => (int) ($typeRow['inactive_types'] ?? 0),
        ],
    ];
}

function normalize_property_type_payload(array $data, ?int $ignoreId = null): array
{
    $name = validate_property_type_name((string) ($data['name'] ?? ''));
    $description = validate_property_type_description($data['description'] ?? $data['details'] ?? null);
    $isActiveValue = filter_var($data['isActive'] ?? $data['is_active'] ?? true, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
    $isActive = $isActiveValue ?? true;

    if (property_type_name_exists($name, $ignoreId)) {
        throw new InvalidArgumentException('That property type already exists.');
    }

    $slug = unique_property_type_slug($name, $ignoreId);

    return [
        'name' => $name,
        'slug' => $slug,
        'description' => $description,
        'is_active' => $isActive ? 1 : 0,
    ];
}

function normalize_property_payload(array $data, ?int $ignoreId = null): array
{
    $propertyTypeId = validate_property_integer(
        $data['propertyTypeId'] ?? $data['property_type_id'] ?? null,
        'property type',
        1,
        PHP_INT_MAX
    );

    if ($propertyTypeId === null) {
        throw new InvalidArgumentException('Please choose a property type.');
    }

    if (load_property_type_record_by_id($propertyTypeId) === null) {
        throw new InvalidArgumentException('The selected property type does not exist.');
    }

    $name = validate_property_name((string) ($data['name'] ?? ''));
    $status = normalize_property_status((string) ($data['status'] ?? 'available'));
    $description = validate_property_description($data['description'] ?? null);
    $addressLine1 = validate_property_line((string) ($data['addressLine1'] ?? $data['address_line1'] ?? ''), 'address line 1');
    $addressLine2 = validate_optional_property_text($data['addressLine2'] ?? $data['address_line2'] ?? null, 191);
    $city = validate_property_city((string) ($data['city'] ?? ''));
    $state = validate_property_state((string) ($data['state'] ?? ''));
    $postalCode = validate_property_postal_code((string) ($data['postalCode'] ?? $data['postal_code'] ?? ''));
    $countryInput = trim((string) ($data['country'] ?? ''));
    $country = $countryInput === '' ? property_default_country() : validate_property_country($countryInput);
    $bedrooms = validate_property_integer($data['bedrooms'] ?? 0, 'bedrooms', 0, 999, 0) ?? 0;
    $bathrooms = validate_property_decimal($data['bathrooms'] ?? 0, 'bathrooms', 1, 0, 999, '0.0');
    $areaSqft = validate_property_integer($data['areaSqft'] ?? $data['area_sqft'] ?? null, 'area', 0, 1000000, null);
    $monthlyRent = validate_property_decimal($data['monthlyRent'] ?? $data['monthly_rent'] ?? 0, 'monthly rent', 2, 0, 999999999.99, '0.00');
    $securityDeposit = validate_property_decimal($data['securityDeposit'] ?? $data['security_deposit'] ?? 0, 'security deposit', 2, 0, 999999999.99, '0.00');
    $notes = validate_property_notes($data['notes'] ?? null);
    $slug = unique_property_slug($name, $city, $ignoreId);

    return [
        'property_type_id' => $propertyTypeId,
        'name' => $name,
        'slug' => $slug,
        'status' => $status,
        'description' => $description,
        'address_line1' => $addressLine1,
        'address_line2' => $addressLine2,
        'city' => $city,
        'state' => $state,
        'postal_code' => $postalCode,
        'country' => $country,
        'bedrooms' => $bedrooms,
        'bathrooms' => $bathrooms,
        'area_sqft' => $areaSqft,
        'monthly_rent' => $monthlyRent,
        'security_deposit' => $securityDeposit,
        'notes' => $notes,
    ];
}

function create_property_type_record(array $data): array
{
    $payload = normalize_property_type_payload($data);

    $statement = db()->prepare(
        'INSERT INTO property_types (
            name,
            slug,
            description,
            is_active
        ) VALUES (
            :name,
            :slug,
            :description,
            :is_active
        )'
    );
    $statement->execute($payload);

    $record = load_property_type_record_by_id((int) db()->lastInsertId());

    if ($record === null) {
        throw new RuntimeException('The property type could not be created.');
    }

    return $record;
}

function update_property_type_record(int $id, array $data): array
{
    if (load_property_type_record_by_id($id) === null) {
        throw new InvalidArgumentException('The selected property type does not exist.');
    }

    $payload = normalize_property_type_payload($data, $id);

    $statement = db()->prepare(
        'UPDATE property_types
         SET name = :name,
             slug = :slug,
             description = :description,
             is_active = :is_active
         WHERE id = :id'
    );
    $statement->execute([
        'id' => $id,
        'name' => $payload['name'],
        'slug' => $payload['slug'],
        'description' => $payload['description'],
        'is_active' => $payload['is_active'],
    ]);

    $record = load_property_type_record_by_id($id);

    if ($record === null) {
        throw new RuntimeException('The property type could not be updated.');
    }

    return $record;
}

function delete_property_type_record(int $id): void
{
    if (load_property_type_record_by_id($id) === null) {
        throw new InvalidArgumentException('The selected property type does not exist.');
    }

    if (property_type_in_use($id)) {
        throw new InvalidArgumentException('Move or delete the properties that use this type first.');
    }

    $statement = db()->prepare('DELETE FROM property_types WHERE id = :id');
    $statement->execute(['id' => $id]);
}

function create_property_record(array $data, ?int $creatorId = null): array
{
    $payload = normalize_property_payload($data);

    $statement = db()->prepare(
        'INSERT INTO properties (
            property_type_id,
            name,
            slug,
            status,
            description,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            country,
            bedrooms,
            bathrooms,
            area_sqft,
            monthly_rent,
            security_deposit,
            notes,
            created_by
        ) VALUES (
            :property_type_id,
            :name,
            :slug,
            :status,
            :description,
            :address_line1,
            :address_line2,
            :city,
            :state,
            :postal_code,
            :country,
            :bedrooms,
            :bathrooms,
            :area_sqft,
            :monthly_rent,
            :security_deposit,
            :notes,
            :created_by
        )'
    );
    $statement->execute([
        'property_type_id' => $payload['property_type_id'],
        'name' => $payload['name'],
        'slug' => $payload['slug'],
        'status' => $payload['status'],
        'description' => $payload['description'],
        'address_line1' => $payload['address_line1'],
        'address_line2' => $payload['address_line2'],
        'city' => $payload['city'],
        'state' => $payload['state'],
        'postal_code' => $payload['postal_code'],
        'country' => $payload['country'],
        'bedrooms' => $payload['bedrooms'],
        'bathrooms' => $payload['bathrooms'],
        'area_sqft' => $payload['area_sqft'],
        'monthly_rent' => $payload['monthly_rent'],
        'security_deposit' => $payload['security_deposit'],
        'notes' => $payload['notes'],
        'created_by' => $creatorId,
    ]);

    $record = load_property_record_by_id((int) db()->lastInsertId());

    if ($record === null) {
        throw new RuntimeException('The property could not be created.');
    }

    return $record;
}

function update_property_record(int $id, array $data): array
{
    if (load_property_record_by_id($id) === null) {
        throw new InvalidArgumentException('The selected property does not exist.');
    }

    $payload = normalize_property_payload($data, $id);

    $statement = db()->prepare(
        'UPDATE properties
         SET property_type_id = :property_type_id,
             name = :name,
             slug = :slug,
             status = :status,
             description = :description,
             address_line1 = :address_line1,
             address_line2 = :address_line2,
             city = :city,
             state = :state,
             postal_code = :postal_code,
             country = :country,
             bedrooms = :bedrooms,
             bathrooms = :bathrooms,
             area_sqft = :area_sqft,
             monthly_rent = :monthly_rent,
             security_deposit = :security_deposit,
             notes = :notes
         WHERE id = :id'
    );
    $statement->execute([
        'id' => $id,
        'property_type_id' => $payload['property_type_id'],
        'name' => $payload['name'],
        'slug' => $payload['slug'],
        'status' => $payload['status'],
        'description' => $payload['description'],
        'address_line1' => $payload['address_line1'],
        'address_line2' => $payload['address_line2'],
        'city' => $payload['city'],
        'state' => $payload['state'],
        'postal_code' => $payload['postal_code'],
        'country' => $payload['country'],
        'bedrooms' => $payload['bedrooms'],
        'bathrooms' => $payload['bathrooms'],
        'area_sqft' => $payload['area_sqft'],
        'monthly_rent' => $payload['monthly_rent'],
        'security_deposit' => $payload['security_deposit'],
        'notes' => $payload['notes'],
    ]);

    $record = load_property_record_by_id($id);

    if ($record === null) {
        throw new RuntimeException('The property could not be updated.');
    }

    return $record;
}

function delete_property_record(int $id): void
{
    $property = load_property_record_by_id($id);

    if ($property === null) {
        throw new InvalidArgumentException('The selected property does not exist.');
    }

    $imagePaths = array_column($property['images'], 'imagePath');

    $statement = db()->prepare('DELETE FROM properties WHERE id = :id');
    $statement->execute(['id' => $id]);

    foreach ($imagePaths as $path) {
        delete_property_image_file($path);
    }
}

function store_property_image_upload(int $propertyId, array $file): array
{
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException(match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The uploaded image is too large.',
            UPLOAD_ERR_PARTIAL => 'The image upload was interrupted.',
            UPLOAD_ERR_NO_FILE => 'Please choose a property image.',
            UPLOAD_ERR_NO_TMP_DIR => 'The server cannot store uploaded files right now.',
            UPLOAD_ERR_CANT_WRITE => 'The server could not save the uploaded image.',
            UPLOAD_ERR_EXTENSION => 'The upload was blocked by a server extension.',
            default => 'The image upload failed.',
        });
    }

    $tmpPath = (string) ($file['tmp_name'] ?? '');

    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        throw new InvalidArgumentException('The uploaded file is not valid.');
    }

    $size = (int) ($file['size'] ?? 0);
    $maxSize = max(1, (int) property_security_config('property_image_max_bytes', 3 * 1024 * 1024));

    if ($size <= 0 || $size > $maxSize) {
        throw new InvalidArgumentException('The uploaded image is too large.');
    }

    $imageInfo = @getimagesize($tmpPath);

    if ($imageInfo === false) {
        throw new InvalidArgumentException('Please upload a valid image file.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = (string) ($finfo->file($tmpPath) ?: '');
    $extension = property_image_extension_for_mime($mimeType);

    if ($extension === null) {
        throw new InvalidArgumentException('Only JPEG, PNG, and WebP images are allowed.');
    }

    $directory = property_image_storage_path();
    ensure_directory_exists($directory);

    $filename = sprintf(
        'property-%d-%s.%s',
        $propertyId,
        bin2hex(random_bytes(16)),
        $extension
    );

    $relativePath = property_image_directory() . '/' . $filename;
    $targetPath = property_image_storage_path($relativePath);

    if (!move_uploaded_file($tmpPath, $targetPath)) {
        throw new RuntimeException('The uploaded image could not be saved.');
    }

    return [
        'relativePath' => $relativePath,
        'absolutePath' => $targetPath,
        'mimeType' => $mimeType,
        'size' => $size,
    ];
}

function delete_property_image_file(?string $relativePath): void
{
    $relativePath = sanitize_relative_property_image_path($relativePath);

    if ($relativePath === null) {
        return;
    }

    $absolutePath = property_image_storage_path($relativePath);

    if (is_file($absolutePath)) {
        @unlink($absolutePath);
    }
}

function insert_property_image_record(int $propertyId, array $upload, ?string $caption, bool $makePrimary = false): array
{
    $statement = db()->prepare(
        'SELECT COALESCE(MAX(sort_order), -1) AS max_sort_order
         FROM property_images
         WHERE property_id = :property_id'
    );
    $statement->execute(['property_id' => $propertyId]);
    $row = $statement->fetch() ?: [];
    $sortOrder = ((int) ($row['max_sort_order'] ?? -1)) + 1;

    $needsPrimary = $makePrimary;
    $countStatement = db()->prepare(
        'SELECT COUNT(*) AS total
         FROM property_images
         WHERE property_id = :property_id'
    );
    $countStatement->execute(['property_id' => $propertyId]);
    $countRow = $countStatement->fetch() ?: [];

    if ((int) ($countRow['total'] ?? 0) === 0) {
        $needsPrimary = true;
    }

    $statement = db()->prepare(
        'INSERT INTO property_images (
            property_id,
            image_path,
            caption,
            is_primary,
            sort_order
        ) VALUES (
            :property_id,
            :image_path,
            :caption,
            :is_primary,
            :sort_order
        )'
    );
    $statement->execute([
        'property_id' => $propertyId,
        'image_path' => $upload['relativePath'],
        'caption' => $caption,
        'is_primary' => $needsPrimary ? 1 : 0,
        'sort_order' => $sortOrder,
    ]);

    $imageId = (int) db()->lastInsertId();

    if ($needsPrimary) {
        set_primary_property_image_record($propertyId, $imageId);
    }

    $image = load_property_image_record_by_id($imageId);

    if ($image === null) {
        throw new RuntimeException('The property image could not be saved.');
    }

    return $image;
}

function load_property_image_record_by_id(int $imageId): ?array
{
    $statement = db()->prepare(
        'SELECT
            id,
            property_id,
            image_path,
            caption,
            is_primary,
            sort_order,
            created_at,
            updated_at
         FROM property_images
         WHERE id = :id
         LIMIT 1'
    );
    $statement->execute(['id' => $imageId]);

    $record = $statement->fetch();

    return $record === false ? null : $record;
}

function set_primary_property_image_record(int $propertyId, int $imageId): void
{
    $statement = db()->prepare(
        'UPDATE property_images
         SET is_primary = CASE WHEN id = :image_id THEN 1 ELSE 0 END
         WHERE property_id = :property_id'
    );
    $statement->execute([
        'property_id' => $propertyId,
        'image_id' => $imageId,
    ]);
}

function delete_property_image_record(int $propertyId, int $imageId): void
{
    $image = load_property_image_record_by_id($imageId);

    if ($image === null || (int) $image['property_id'] !== $propertyId) {
        throw new InvalidArgumentException('The selected image does not exist.');
    }

    $statement = db()->prepare('DELETE FROM property_images WHERE id = :id');
    $statement->execute(['id' => $imageId]);

    delete_property_image_file($image['image_path'] ?? null);

    if ((bool) ($image['is_primary'] ?? false)) {
        $next = load_next_primary_property_image($propertyId);

        if ($next !== null) {
            set_primary_property_image_record($propertyId, (int) $next['id']);
        }
    }
}

function load_next_primary_property_image(int $propertyId): ?array
{
    $statement = db()->prepare(
        'SELECT
            id,
            property_id,
            image_path,
            caption,
            is_primary,
            sort_order,
            created_at,
            updated_at
         FROM property_images
         WHERE property_id = :property_id
         ORDER BY is_primary DESC, sort_order ASC, id ASC
         LIMIT 1'
    );
    $statement->execute(['property_id' => $propertyId]);

    $record = $statement->fetch();

    return $record === false ? null : $record;
}


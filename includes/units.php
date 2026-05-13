<?php

declare(strict_types=1);

function allowed_unit_statuses(): array
{
    return ['all' => 'All statuses'] + allowed_property_statuses();
}

function normalize_unit_status(?string $status): string
{
    return normalize_property_status($status);
}

function unit_status_label(?string $status): string
{
    return property_status_label($status);
}

function validate_unit_number(string $value): string
{
    return validate_property_text($value, 1, 120, 'Please enter a valid unit number.');
}

function validate_unit_description(?string $value): ?string
{
    return validate_optional_property_text($value, 5000);
}

function validate_unit_notes(?string $value): ?string
{
    return validate_optional_property_text($value, 5000);
}

function validate_unit_area_sqft(mixed $value): ?int
{
    return validate_property_integer($value, 'unit size', 1, PHP_INT_MAX);
}

function validate_unit_rent(mixed $value): string
{
    return validate_property_decimal($value, 'monthly rent', 2, 0, 999999999.99, '0.00');
}

function validate_unit_deposit(mixed $value): string
{
    return validate_property_decimal($value, 'security deposit', 2, 0, 999999999.99, '0.00');
}

function unit_number_exists(int $propertyId, string $unitNumber, ?int $ignoreId = null): bool
{
    $sql = 'SELECT COUNT(*) AS total FROM units WHERE property_id = :property_id AND LOWER(unit_number) = LOWER(:unit_number)';

    if ($ignoreId !== null) {
        $sql .= ' AND id <> :ignore_id';
    }

    $statement = db()->prepare($sql);
    $statement->bindValue(':property_id', $propertyId, PDO::PARAM_INT);
    $statement->bindValue(':unit_number', normalize_property_text($unitNumber), PDO::PARAM_STR);

    if ($ignoreId !== null) {
        $statement->bindValue(':ignore_id', $ignoreId, PDO::PARAM_INT);
    }

    $statement->execute();
    $row = $statement->fetch() ?: [];

    return (int) ($row['total'] ?? 0) > 0;
}

function unit_number_from_sequence(int $floor, int $indexOnFloor): string
{
    $letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    $letter = $letters[max(0, min(count($letters) - 1, $indexOnFloor))];

    return $floor . '-' . $letter;
}

function unit_sequence_from_number(string $unitNumber): ?array
{
    if (!preg_match('/^(\d+)\s*-\s*([A-G])$/i', trim($unitNumber), $matches)) {
        return null;
    }

    return [
        'floor' => (int) $matches[1],
        'letter' => strtoupper($matches[2]),
    ];
}

function unit_default_number_for_property(array $property, int $offset = 0): string
{
    $floors = max(1, (int) ($property['total_floors'] ?? 0));
    $unitsPerFloor = 7;
    $sequence = max(0, $offset);
    $floor = min($floors, intdiv($sequence, $unitsPerFloor) + 1);
    $indexOnFloor = $sequence % $unitsPerFloor;

    return unit_number_from_sequence($floor, $indexOnFloor);
}

function unit_next_number_for_property(int $propertyId): string
{
    $property = load_property_record_by_id($propertyId);

    if ($property === null) {
        throw new InvalidArgumentException('The selected property does not exist.');
    }

    $statement = db()->prepare('SELECT COUNT(*) AS total FROM units WHERE property_id = :property_id');
    $statement->execute(['property_id' => $propertyId]);
    $count = (int) (($statement->fetch() ?: [])['total'] ?? 0);

    return unit_default_number_for_property($property, $count);
}

function unit_base_columns(): string
{
    return implode(', ', [
        'u.id',
        'u.property_id',
        'u.unit_number',
        'u.status',
        'u.area_sqft',
        'u.description',
        'u.monthly_rent',
        'u.security_deposit',
        'u.notes',
        'u.created_by',
        'u.created_at',
        'u.updated_at',
        'p.name AS property_name',
        'p.slug AS property_slug',
        'p.status AS property_status',
        'p.address_line1 AS property_address_line1',
        'p.address_line2 AS property_address_line2',
        'p.city AS property_city',
        'p.state AS property_state',
        'p.postal_code AS property_postal_code',
        'p.country AS property_country',
        'p.bedrooms AS property_bedrooms',
        'p.bathrooms AS property_bathrooms',
        'p.area_sqft AS property_area_sqft',
        'p.property_type_id AS property_type_id',
        'pt.name AS property_type_name',
        'pt.slug AS property_type_slug',
        'pt.description AS property_type_description',
        'pt.is_active AS property_type_is_active',
        'cu.name AS created_by_name',
        'cu.email AS created_by_email',
        'cu.role AS created_by_role',
    ]);
}

function build_unit_property_payload(array $record): array
{
    $propertyTypeId = (int) ($record['property_type_id'] ?? 0);
    $propertyStatus = normalize_property_status((string) ($record['property_status'] ?? 'available'));
    $addressParts = array_filter([
        (string) ($record['property_address_line1'] ?? ''),
        $record['property_address_line2'] !== null ? (string) $record['property_address_line2'] : null,
        trim((string) ($record['property_city'] ?? '') . ', ' . (string) ($record['property_state'] ?? '')),
        trim((string) ($record['property_postal_code'] ?? '') . ', ' . (string) ($record['property_country'] ?? '')),
    ]);

    return [
        'id' => (int) ($record['property_id'] ?? 0),
        'name' => (string) ($record['property_name'] ?? ''),
        'slug' => (string) ($record['property_slug'] ?? ''),
        'status' => $propertyStatus,
        'statusLabel' => property_status_label($propertyStatus),
        'propertyTypeId' => $propertyTypeId,
        'propertyType' => [
            'id' => $propertyTypeId,
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
        'bedrooms' => (int) ($record['property_bedrooms'] ?? 0),
        'bathrooms' => (float) ($record['property_bathrooms'] ?? 0),
        'areaSqft' => $record['property_area_sqft'] !== null ? (int) $record['property_area_sqft'] : null,
    ];
}

function build_unit_payload(array $record): array
{
    $property = build_unit_property_payload($record);
    $status = normalize_unit_status((string) ($record['status'] ?? 'available'));
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
        'propertyId' => (int) ($record['property_id'] ?? 0),
        'property' => $property,
        'unitNumber' => (string) ($record['unit_number'] ?? ''),
        'status' => $status,
        'statusLabel' => unit_status_label($status),
        'areaSqft' => $record['area_sqft'] !== null ? (int) $record['area_sqft'] : null,
        'description' => $record['description'] !== null ? (string) $record['description'] : null,
        'monthlyRent' => (float) ($record['monthly_rent'] ?? 0),
        'securityDeposit' => (float) ($record['security_deposit'] ?? 0),
        'notes' => $record['notes'] !== null ? (string) $record['notes'] : null,
        'createdBy' => $createdBy,
        'createdAt' => $record['created_at'] ?? null,
        'updatedAt' => $record['updated_at'] ?? null,
    ];
}

function load_unit_record_by_id(int $id): ?array
{
    $statement = db()->prepare(
        'SELECT ' . unit_base_columns() . '
         FROM units u
         INNER JOIN properties p ON p.id = u.property_id
         LEFT JOIN property_types pt ON pt.id = p.property_type_id
         LEFT JOIN users cu ON cu.id = u.created_by
         WHERE u.id = :id
         LIMIT 1'
    );
    $statement->execute(['id' => $id]);

    $record = $statement->fetch();

    return $record === false ? null : $record;
}

function list_unit_records(int $limit = 50, int $offset = 0, ?string $search = null, ?string $status = null, ?int $propertyId = null): array
{
    $limit = max(1, min(500, $limit));
    $offset = max(0, $offset);
    $search = $search !== null ? normalize_property_text($search) : null;
    $status = $status !== null && $status !== '' && strtolower($status) !== 'all' ? normalize_unit_status($status) : null;
    $propertyId = $propertyId !== null && $propertyId > 0 ? $propertyId : null;

    $where = ['1 = 1'];
    $params = [];

    if ($search !== null && $search !== '') {
        $where[] = '(
            u.unit_number LIKE :search
            OR p.name LIKE :search
            OR p.city LIKE :search
            OR p.state LIKE :search
            OR p.address_line1 LIKE :search
            OR pt.name LIKE :search
        )';
        $params['search'] = '%' . $search . '%';
    }

    if ($status !== null) {
        $where[] = 'u.status = :status';
        $params['status'] = $status;
    }

    if ($propertyId !== null) {
        $where[] = 'u.property_id = :property_id';
        $params['property_id'] = $propertyId;
    }

    $statement = db()->prepare(
        'SELECT ' . unit_base_columns() . '
         FROM units u
         INNER JOIN properties p ON p.id = u.property_id
         LEFT JOIN property_types pt ON pt.id = p.property_type_id
         LEFT JOIN users cu ON cu.id = u.created_by
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY u.updated_at DESC, u.created_at DESC
         LIMIT :limit OFFSET :offset'
    );

    foreach ($params as $key => $value) {
        $statement->bindValue(':' . $key, $value, PDO::PARAM_STR);
    }

    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
    $statement->execute();

    return array_map(
        static fn (array $record): array => build_unit_payload($record),
        $statement->fetchAll() ?: []
    );
}

function normalize_unit_payload(array $data, ?int $ignoreId = null): array
{
    $propertyId = validate_property_integer(
        $data['propertyId'] ?? $data['property_id'] ?? null,
        'property',
        1,
        PHP_INT_MAX
    );

    if ($propertyId === null) {
        throw new InvalidArgumentException('Please choose a property.');
    }

    if (load_property_record_by_id($propertyId) === null) {
        throw new InvalidArgumentException('The selected property does not exist.');
    }

    $rawUnitNumber = trim((string) ($data['unitNumber'] ?? $data['unit_number'] ?? ''));
    if ($rawUnitNumber === '') {
        $rawUnitNumber = unit_next_number_for_property($propertyId);
    }

    $unitNumber = validate_unit_number($rawUnitNumber);
    $status = normalize_unit_status((string) ($data['status'] ?? 'available'));
    $areaSqft = validate_unit_area_sqft($data['areaSqft'] ?? $data['area_sqft'] ?? null);
    $description = validate_unit_description($data['description'] ?? null);
    $monthlyRent = validate_unit_rent($data['monthlyRent'] ?? $data['monthly_rent'] ?? 0);
    $securityDeposit = validate_unit_deposit($data['securityDeposit'] ?? $data['security_deposit'] ?? 0);
    $notes = validate_unit_notes($data['notes'] ?? null);

    if (unit_number_exists($propertyId, $unitNumber, $ignoreId)) {
        throw new InvalidArgumentException('That unit number already exists for this property.');
    }

    return [
        'property_id' => $propertyId,
        'unit_number' => $unitNumber,
        'status' => $status,
        'area_sqft' => $areaSqft,
        'description' => $description,
        'monthly_rent' => $monthlyRent,
        'security_deposit' => $securityDeposit,
        'notes' => $notes,
    ];
}

function create_unit_record(array $data, ?int $creatorId = null): array
{
    $payload = normalize_unit_payload($data);

    $statement = db()->prepare(
        'INSERT INTO units (
            property_id,
            unit_number,
            status,
            area_sqft,
            description,
            monthly_rent,
            security_deposit,
            notes,
            created_by
        ) VALUES (
            :property_id,
            :unit_number,
            :status,
            :area_sqft,
            :description,
            :monthly_rent,
            :security_deposit,
            :notes,
            :created_by
        )'
    );
    $statement->execute([
        'property_id' => $payload['property_id'],
        'unit_number' => $payload['unit_number'],
        'status' => $payload['status'],
        'area_sqft' => $payload['area_sqft'],
        'description' => $payload['description'],
        'monthly_rent' => $payload['monthly_rent'],
        'security_deposit' => $payload['security_deposit'],
        'notes' => $payload['notes'],
        'created_by' => $creatorId,
    ]);

    $record = load_unit_record_by_id((int) db()->lastInsertId());

    if ($record === null) {
        throw new RuntimeException('The unit could not be created.');
    }

    return $record;
}

function update_unit_record(int $id, array $data): array
{
    if (load_unit_record_by_id($id) === null) {
        throw new InvalidArgumentException('The selected unit does not exist.');
    }

    $payload = normalize_unit_payload($data, $id);

    $statement = db()->prepare(
        'UPDATE units
         SET property_id = :property_id,
             unit_number = :unit_number,
             status = :status,
             area_sqft = :area_sqft,
             description = :description,
             monthly_rent = :monthly_rent,
             security_deposit = :security_deposit,
             notes = :notes
         WHERE id = :id'
    );
    $statement->execute([
        'id' => $id,
        'property_id' => $payload['property_id'],
        'unit_number' => $payload['unit_number'],
        'status' => $payload['status'],
        'area_sqft' => $payload['area_sqft'],
        'description' => $payload['description'],
        'monthly_rent' => $payload['monthly_rent'],
        'security_deposit' => $payload['security_deposit'],
        'notes' => $payload['notes'],
    ]);

    $record = load_unit_record_by_id($id);

    if ($record === null) {
        throw new RuntimeException('The unit could not be updated.');
    }

    return $record;
}

function delete_unit_record(int $id): void
{
    if (load_unit_record_by_id($id) === null) {
        throw new InvalidArgumentException('The selected unit does not exist.');
    }

    $statement = db()->prepare('DELETE FROM units WHERE id = :id');
    $statement->execute(['id' => $id]);
}

function unit_summary_stats(): array
{
    $row = db()->query(
        'SELECT
            COUNT(*) AS total_units,
            COALESCE(SUM(CASE WHEN status = "available" THEN 1 ELSE 0 END), 0) AS available_units,
            COALESCE(SUM(CASE WHEN status = "occupied" THEN 1 ELSE 0 END), 0) AS occupied_units,
            COALESCE(SUM(CASE WHEN status = "maintenance" THEN 1 ELSE 0 END), 0) AS maintenance_units,
            COALESCE(SUM(CASE WHEN status = "inactive" THEN 1 ELSE 0 END), 0) AS inactive_units,
            COUNT(DISTINCT property_id) AS linked_properties
         FROM units'
    )->fetch() ?: [];

    return [
        'units' => [
            'total' => (int) ($row['total_units'] ?? 0),
            'available' => (int) ($row['available_units'] ?? 0),
            'occupied' => (int) ($row['occupied_units'] ?? 0),
            'maintenance' => (int) ($row['maintenance_units'] ?? 0),
            'inactive' => (int) ($row['inactive_units'] ?? 0),
            'linkedProperties' => (int) ($row['linked_properties'] ?? 0),
        ],
    ];
}

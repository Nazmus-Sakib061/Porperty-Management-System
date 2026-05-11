<?php

declare(strict_types=1);

function allowed_lease_statuses(): array
{
    return [
        'draft' => 'Draft',
        'active' => 'Active',
        'expiring' => 'Expiring',
        'ended' => 'Ended',
        'notice' => 'Notice Sent',
    ];
}

function normalize_lease_status(?string $status): string
{
    $status = strtolower(trim((string) $status));

    if ($status === '') {
        $status = 'draft';
    }

    if (!array_key_exists($status, allowed_lease_statuses())) {
        throw new InvalidArgumentException('Please choose a valid lease status.');
    }

    return $status;
}

function lease_status_label(?string $status): string
{
    $status = normalize_lease_status($status);

    return allowed_lease_statuses()[$status] ?? ucwords(str_replace('_', ' ', $status));
}

function lease_base_columns(): string
{
    return implode(', ', [
        'l.id',
        'l.tenant_id',
        'l.unit_id',
        'l.lease_start_date',
        'l.lease_end_date',
        'l.notice_date',
        'l.move_out_date',
        'l.rent_amount',
        'l.security_deposit',
        'l.service_charge',
        'l.electricity_meter_no',
        'l.gas_meter_no',
        'l.status',
        'l.notes',
        'l.created_by',
        'l.created_at',
        'l.updated_at',
        't.full_name AS tenant_full_name',
        't.email AS tenant_email',
        't.phone AS tenant_phone',
        'u.unit_number AS unit_number',
        'u.status AS unit_status',
        'p.id AS property_id',
        'p.name AS property_name',
        'p.city AS property_city',
        'pt.name AS property_type_name',
        'cu.name AS created_by_name',
        'cu.email AS created_by_email',
    ]);
}

function build_lease_payload(array $record): array
{
    $status = normalize_lease_status((string) ($record['status'] ?? 'draft'));

    return [
        'id' => (int) ($record['id'] ?? 0),
        'tenantId' => (int) ($record['tenant_id'] ?? 0),
        'unitId' => (int) ($record['unit_id'] ?? 0),
        'leaseStartDate' => $record['lease_start_date'] ?? null,
        'leaseEndDate' => $record['lease_end_date'] ?? null,
        'noticeDate' => $record['notice_date'] ?? null,
        'moveOutDate' => $record['move_out_date'] ?? null,
        'rentAmount' => (float) ($record['rent_amount'] ?? 0),
        'securityDeposit' => (float) ($record['security_deposit'] ?? 0),
        'serviceCharge' => (float) ($record['service_charge'] ?? 0),
        'electricityMeterNo' => $record['electricity_meter_no'] !== null ? (string) $record['electricity_meter_no'] : null,
        'gasMeterNo' => $record['gas_meter_no'] !== null ? (string) $record['gas_meter_no'] : null,
        'status' => $status,
        'statusLabel' => lease_status_label($status),
        'notes' => $record['notes'] !== null ? (string) $record['notes'] : null,
        'tenant' => [
            'id' => (int) ($record['tenant_id'] ?? 0),
            'fullName' => (string) ($record['tenant_full_name'] ?? ''),
            'email' => $record['tenant_email'] !== null ? (string) $record['tenant_email'] : null,
            'phone' => $record['tenant_phone'] !== null ? (string) $record['tenant_phone'] : null,
        ],
        'unit' => [
            'id' => (int) ($record['unit_id'] ?? 0),
            'unitNumber' => (string) ($record['unit_number'] ?? ''),
            'status' => normalize_unit_status((string) ($record['unit_status'] ?? 'available')),
            'statusLabel' => unit_status_label((string) ($record['unit_status'] ?? 'available')),
        ],
        'property' => [
            'id' => (int) ($record['property_id'] ?? 0),
            'name' => (string) ($record['property_name'] ?? ''),
            'city' => (string) ($record['property_city'] ?? ''),
            'propertyTypeName' => (string) ($record['property_type_name'] ?? ''),
        ],
        'createdBy' => $record['created_by_name'] !== null ? [
            'name' => (string) ($record['created_by_name'] ?? ''),
            'email' => (string) ($record['created_by_email'] ?? ''),
        ] : null,
        'createdAt' => $record['created_at'] ?? null,
        'updatedAt' => $record['updated_at'] ?? null,
    ];
}

function list_lease_records(int $limit = 50, int $offset = 0, ?int $propertyId = null): array
{
    $limit = max(1, min(100, $limit));
    $offset = max(0, $offset);
    $propertyId = $propertyId !== null && $propertyId > 0 ? $propertyId : null;

    $where = ['1 = 1'];
    $params = [];

    if ($propertyId !== null) {
        $where[] = 'l.unit_id IN (SELECT id FROM units WHERE property_id = :property_id)';
        $params['property_id'] = $propertyId;
    }

    $statement = db()->prepare(
        'SELECT ' . lease_base_columns() . '
         FROM tenant_leases l
         INNER JOIN tenants t ON t.id = l.tenant_id
         INNER JOIN units u ON u.id = l.unit_id
         INNER JOIN properties p ON p.id = u.property_id
         LEFT JOIN property_types pt ON pt.id = p.property_type_id
         LEFT JOIN users cu ON cu.id = l.created_by
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY l.updated_at DESC, l.created_at DESC
         LIMIT :limit OFFSET :offset'
    );

    foreach ($params as $key => $value) {
        $statement->bindValue(':' . $key, $value, PDO::PARAM_INT);
    }

    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
    $statement->execute();

    return array_map(static fn (array $record): array => build_lease_payload($record), $statement->fetchAll() ?: []);
}

function load_lease_record_by_id(int $id): ?array
{
    $statement = db()->prepare(
        'SELECT ' . lease_base_columns() . '
         FROM tenant_leases l
         INNER JOIN tenants t ON t.id = l.tenant_id
         INNER JOIN units u ON u.id = l.unit_id
         INNER JOIN properties p ON p.id = u.property_id
         LEFT JOIN property_types pt ON pt.id = p.property_type_id
         LEFT JOIN users cu ON cu.id = l.created_by
         WHERE l.id = :id
         LIMIT 1'
    );
    $statement->execute(['id' => $id]);
    $record = $statement->fetch();

    return $record === false ? null : $record;
}

function normalize_lease_payload(array $data): array
{
    $tenantId = validate_property_integer($data['tenantId'] ?? $data['tenant_id'] ?? null, 'tenant', 1, PHP_INT_MAX);
    $unitId = validate_property_integer($data['unitId'] ?? $data['unit_id'] ?? null, 'unit', 1, PHP_INT_MAX);

    if ($tenantId === null || $unitId === null) {
        throw new InvalidArgumentException('Please choose a tenant and unit.');
    }

    $tenant = load_tenant_record_by_id($tenantId);
    $unit = load_unit_record_by_id($unitId);

    if ($tenant === null) {
        throw new InvalidArgumentException('The selected tenant does not exist.');
    }

    if ($unit === null) {
        throw new InvalidArgumentException('The selected unit does not exist.');
    }

    $leaseStart = validate_tenant_move_in_date($data['leaseStartDate'] ?? $data['lease_start_date'] ?? '');
    $leaseEnd = validate_tenant_move_in_date($data['leaseEndDate'] ?? $data['lease_end_date'] ?? '');
    $noticeDate = validate_tenant_move_in_date($data['noticeDate'] ?? $data['notice_date'] ?? '');
    $moveOutDate = validate_tenant_move_in_date($data['moveOutDate'] ?? $data['move_out_date'] ?? '');
    $rentAmount = validate_property_decimal($data['rentAmount'] ?? $data['rent_amount'] ?? 0, 'rent amount', 2, 0, 999999999.99, '0.00');
    $securityDeposit = validate_property_decimal($data['securityDeposit'] ?? $data['security_deposit'] ?? 0, 'security deposit', 2, 0, 999999999.99, '0.00');
    $serviceCharge = validate_property_decimal($data['serviceCharge'] ?? $data['service_charge'] ?? 0, 'service charge', 2, 0, 999999999.99, '0.00');
    $electricityMeterNo = validate_optional_property_text($data['electricityMeterNo'] ?? $data['electricity_meter_no'] ?? null, 80);
    $gasMeterNo = validate_optional_property_text($data['gasMeterNo'] ?? $data['gas_meter_no'] ?? null, 80);
    $status = normalize_lease_status((string) ($data['status'] ?? 'draft'));
    $notes = validate_optional_property_text($data['notes'] ?? null, 5000);

    return [
        'tenant_id' => $tenantId,
        'unit_id' => $unitId,
        'lease_start_date' => $leaseStart,
        'lease_end_date' => $leaseEnd,
        'notice_date' => $noticeDate,
        'move_out_date' => $moveOutDate,
        'rent_amount' => $rentAmount,
        'security_deposit' => $securityDeposit,
        'service_charge' => $serviceCharge,
        'electricity_meter_no' => $electricityMeterNo,
        'gas_meter_no' => $gasMeterNo,
        'status' => $status,
        'notes' => $notes,
    ];
}

function create_lease_record(array $data, ?int $creatorId = null): array
{
    $payload = normalize_lease_payload($data);

    $statement = db()->prepare(
        'INSERT INTO tenant_leases (
            tenant_id,
            unit_id,
            lease_start_date,
            lease_end_date,
            notice_date,
            move_out_date,
            rent_amount,
            security_deposit,
            service_charge,
            electricity_meter_no,
            gas_meter_no,
            status,
            notes,
            created_by
        ) VALUES (
            :tenant_id,
            :unit_id,
            :lease_start_date,
            :lease_end_date,
            :notice_date,
            :move_out_date,
            :rent_amount,
            :security_deposit,
            :service_charge,
            :electricity_meter_no,
            :gas_meter_no,
            :status,
            :notes,
            :created_by
        )'
    );
    $statement->execute([
        'tenant_id' => $payload['tenant_id'],
        'unit_id' => $payload['unit_id'],
        'lease_start_date' => $payload['lease_start_date'],
        'lease_end_date' => $payload['lease_end_date'],
        'notice_date' => $payload['notice_date'],
        'move_out_date' => $payload['move_out_date'],
        'rent_amount' => $payload['rent_amount'],
        'security_deposit' => $payload['security_deposit'],
        'service_charge' => $payload['service_charge'],
        'electricity_meter_no' => $payload['electricity_meter_no'],
        'gas_meter_no' => $payload['gas_meter_no'],
        'status' => $payload['status'],
        'notes' => $payload['notes'],
        'created_by' => $creatorId,
    ]);

    $record = load_lease_record_by_id((int) db()->lastInsertId());

    if ($record === null) {
        throw new RuntimeException('The lease could not be created.');
    }

    return $record;
}

function update_lease_record(int $id, array $data): array
{
    if (load_lease_record_by_id($id) === null) {
        throw new InvalidArgumentException('The selected lease does not exist.');
    }

    $payload = normalize_lease_payload($data);

    $statement = db()->prepare(
        'UPDATE tenant_leases
         SET tenant_id = :tenant_id,
             unit_id = :unit_id,
             lease_start_date = :lease_start_date,
             lease_end_date = :lease_end_date,
             notice_date = :notice_date,
             move_out_date = :move_out_date,
             rent_amount = :rent_amount,
             security_deposit = :security_deposit,
             service_charge = :service_charge,
             electricity_meter_no = :electricity_meter_no,
             gas_meter_no = :gas_meter_no,
             status = :status,
             notes = :notes
         WHERE id = :id'
    );
    $statement->execute([
        'id' => $id,
        'tenant_id' => $payload['tenant_id'],
        'unit_id' => $payload['unit_id'],
        'lease_start_date' => $payload['lease_start_date'],
        'lease_end_date' => $payload['lease_end_date'],
        'notice_date' => $payload['notice_date'],
        'move_out_date' => $payload['move_out_date'],
        'rent_amount' => $payload['rent_amount'],
        'security_deposit' => $payload['security_deposit'],
        'service_charge' => $payload['service_charge'],
        'electricity_meter_no' => $payload['electricity_meter_no'],
        'gas_meter_no' => $payload['gas_meter_no'],
        'status' => $payload['status'],
        'notes' => $payload['notes'],
    ]);

    $record = load_lease_record_by_id($id);

    if ($record === null) {
        throw new RuntimeException('The lease could not be updated.');
    }

    return $record;
}

function delete_lease_record(int $id): void
{
    if (load_lease_record_by_id($id) === null) {
        throw new InvalidArgumentException('The selected lease does not exist.');
    }

    $statement = db()->prepare('DELETE FROM tenant_leases WHERE id = :id');
    $statement->execute(['id' => $id]);
}

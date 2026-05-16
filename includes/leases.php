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

function lease_document_directory(): string
{
    return 'uploads/leases/documents';
}

function lease_document_storage_path(?string $relativePath = null): string
{
    $relativePath = $relativePath ?? lease_document_directory();
    $relativePath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, trim($relativePath, '/\\'));

    return dirname(__DIR__) . DIRECTORY_SEPARATOR . $relativePath;
}

function sanitize_relative_lease_document_path(?string $path): ?string
{
    $path = str_replace('\\', '/', trim((string) $path));

    if ($path === '' || str_contains($path, '..')) {
        return null;
    }

    $prefix = lease_document_directory();

    if ($prefix === '' || !str_starts_with($path, $prefix . '/')) {
        return null;
    }

    return $path;
}

function lease_document_url(?string $path): ?string
{
    $path = sanitize_relative_lease_document_path($path);

    if ($path === null) {
        return null;
    }

    return app_url($path);
}

function lease_file_extension_for_mime(string $mimeType): ?string
{
    return match ($mimeType) {
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        default => null,
    };
}

function lease_upload_error_message(int $error, string $label): string
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

function store_lease_upload_file(int $leaseId, array $file, string $label, bool $allowPdf = true): array
{
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException(lease_upload_error_message($error, $label));
    }

    $tmpPath = (string) ($file['tmp_name'] ?? '');

    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        throw new InvalidArgumentException('The uploaded file is not valid.');
    }

    $size = (int) ($file['size'] ?? 0);
    $maxSize = 5 * 1024 * 1024;

    if ($size <= 0 || $size > $maxSize) {
        throw new InvalidArgumentException('The uploaded ' . $label . ' is too large.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = (string) ($finfo->file($tmpPath) ?: '');
    $extension = lease_file_extension_for_mime($mimeType);

    if ($extension === null) {
        throw new InvalidArgumentException(
            $allowPdf
                ? 'Only JPEG, PNG, WebP, GIF, and PDF files are allowed.'
                : 'Only JPEG, PNG, and WebP images are allowed.'
        );
    }

    if (!$allowPdf && $extension === 'pdf') {
        throw new InvalidArgumentException('Only JPEG, PNG, and WebP images are allowed.');
    }

    $directory = lease_document_storage_path();
    ensure_directory_exists($directory);

    $filename = sprintf(
        'lease-%d-%s.%s',
        $leaseId,
        bin2hex(random_bytes(16)),
        $extension
    );

    $relativePath = lease_document_directory() . '/' . $filename;
    $targetPath = lease_document_storage_path($relativePath);

    if (!move_uploaded_file($tmpPath, $targetPath)) {
        throw new RuntimeException('The uploaded file could not be saved.');
    }

    return [
        'relativePath' => $relativePath,
        'absolutePath' => $targetPath,
        'mimeType' => $mimeType,
        'size' => $size,
        'originalName' => sanitize_upload_original_name((string) ($file['name'] ?? $label)),
    ];
}

function delete_lease_file(?string $relativePath): void
{
    $relativePath = sanitize_relative_lease_document_path($relativePath);

    if ($relativePath === null) {
        return;
    }

    $absolutePath = lease_document_storage_path($relativePath);

    if (is_file($absolutePath)) {
        @unlink($absolutePath);
    }
}

function build_lease_file_payload(?string $path, ?string $label = null): ?array
{
    $path = sanitize_relative_lease_document_path($path);

    if ($path === null) {
        return null;
    }

    return [
        'path' => $path,
        'url' => lease_document_url($path),
        'name' => $label,
    ];
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
        'l.whatsapp_number',
        'l.email',
        'l.nid_number',
        'l.nid_card_path',
        'l.customer_photo_path',
        'l.occupation',
        'l.permanent_address',
        'l.business_certificate_or_job_id_path',
        'l.emergency_contact_name',
        'l.emergency_contact_number',
        'l.agreement_file_path',
        'l.payment_due_day',
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
        'whatsappNumber' => $record['whatsapp_number'] !== null ? (string) $record['whatsapp_number'] : null,
        'email' => $record['email'] !== null ? (string) $record['email'] : null,
        'nidNumber' => $record['nid_number'] !== null ? (string) $record['nid_number'] : null,
        'nidCardPath' => $record['nid_card_path'] !== null ? (string) $record['nid_card_path'] : null,
        'nidCardUrl' => lease_document_url($record['nid_card_path'] ?? null),
        'customerPhotoPath' => $record['customer_photo_path'] !== null ? (string) $record['customer_photo_path'] : null,
        'customerPhotoUrl' => lease_document_url($record['customer_photo_path'] ?? null),
        'occupation' => $record['occupation'] !== null ? (string) $record['occupation'] : null,
        'permanentAddress' => $record['permanent_address'] !== null ? (string) $record['permanent_address'] : null,
        'businessCertificateOrJobIdPath' => $record['business_certificate_or_job_id_path'] !== null ? (string) $record['business_certificate_or_job_id_path'] : null,
        'businessCertificateOrJobIdUrl' => lease_document_url($record['business_certificate_or_job_id_path'] ?? null),
        'emergencyContactName' => $record['emergency_contact_name'] !== null ? (string) $record['emergency_contact_name'] : null,
        'emergencyContactNumber' => $record['emergency_contact_number'] !== null ? (string) $record['emergency_contact_number'] : null,
        'agreementFilePath' => $record['agreement_file_path'] !== null ? (string) $record['agreement_file_path'] : null,
        'agreementFileUrl' => lease_document_url($record['agreement_file_path'] ?? null),
        'paymentDueDay' => $record['payment_due_day'] !== null ? (int) $record['payment_due_day'] : null,
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
    $whatsappNumber = validate_tenant_phone($data['whatsappNumber'] ?? $data['whatsapp_number'] ?? null);
    $customerEmail = validate_tenant_email($data['email'] ?? null);
    $nidNumber = validate_optional_property_text($data['nidNumber'] ?? $data['nid_number'] ?? null, 120);
    $occupation = validate_optional_property_text($data['occupation'] ?? null, 120);
    $permanentAddress = validate_optional_property_text($data['permanentAddress'] ?? $data['permanent_address'] ?? null, 5000);
    $emergencyContactName = validate_optional_property_text($data['emergencyContactName'] ?? $data['emergency_contact_name'] ?? null, 120);
    $emergencyContactNumber = validate_tenant_phone($data['emergencyContactNumber'] ?? $data['emergency_contact_number'] ?? null);
    $paymentDueDayRaw = $data['paymentDueDay'] ?? $data['payment_due_day'] ?? null;
    $paymentDueDay = trim((string) $paymentDueDayRaw);

    if ($paymentDueDay === '') {
        $paymentDueDay = null;
    } elseif (!ctype_digit($paymentDueDay) || (int) $paymentDueDay < 1 || (int) $paymentDueDay > 31) {
        throw new InvalidArgumentException('Please choose a valid payment due day.');
    } else {
        $paymentDueDay = (int) $paymentDueDay;
    }

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
        'whatsapp_number' => $whatsappNumber,
        'email' => $customerEmail,
        'nid_number' => $nidNumber,
        'occupation' => $occupation,
        'permanent_address' => $permanentAddress,
        'emergency_contact_name' => $emergencyContactName,
        'emergency_contact_number' => $emergencyContactNumber,
        'payment_due_day' => $paymentDueDay,
        'status' => $status,
        'notes' => $notes,
    ];
}

function create_lease_record(array $data, ?int $creatorId = null): array
{
    $payload = normalize_lease_payload($data);
    $pdo = db();

    $statement = $pdo->prepare(
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
            whatsapp_number,
            email,
            nid_number,
            occupation,
            permanent_address,
            emergency_contact_name,
            emergency_contact_number,
            payment_due_day,
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
            :whatsapp_number,
            :email,
            :nid_number,
            :occupation,
            :permanent_address,
            :emergency_contact_name,
            :emergency_contact_number,
            :payment_due_day,
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
        'whatsapp_number' => $payload['whatsapp_number'],
        'email' => $payload['email'],
        'nid_number' => $payload['nid_number'],
        'occupation' => $payload['occupation'],
        'permanent_address' => $payload['permanent_address'],
        'emergency_contact_name' => $payload['emergency_contact_name'],
        'emergency_contact_number' => $payload['emergency_contact_number'],
        'payment_due_day' => $payload['payment_due_day'],
        'status' => $payload['status'],
        'notes' => $payload['notes'],
        'created_by' => $creatorId,
    ]);

    $leaseId = (int) $pdo->lastInsertId();

    foreach ([
        'nid_card_file' => ['column' => 'nid_card_path', 'allowPdf' => true],
        'customer_photo' => ['column' => 'customer_photo_path', 'allowPdf' => false],
        'business_certificate_or_job_id' => ['column' => 'business_certificate_or_job_id_path', 'allowPdf' => true],
        'agreement_file' => ['column' => 'agreement_file_path', 'allowPdf' => true],
    ] as $field => $config) {
        $file = $_FILES[$field] ?? null;

        if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            continue;
        }

        $upload = store_lease_upload_file($leaseId, $file, $field, (bool) $config['allowPdf']);
        $column = $config['column'];

        $update = $pdo->prepare("UPDATE tenant_leases SET {$column} = :path WHERE id = :id");
        $update->execute([
            'id' => $leaseId,
            'path' => $upload['relativePath'],
        ]);
    }

    $record = load_lease_record_by_id($leaseId);

    if ($record === null) {
        throw new RuntimeException('The lease could not be created.');
    }

    return $record;
}

function update_lease_record(int $id, array $data): array
{
    $existing = load_lease_record_by_id($id);

    if ($existing === null) {
        throw new InvalidArgumentException('The selected lease does not exist.');
    }

    $payload = normalize_lease_payload($data);
    $pdo = db();

    $statement = $pdo->prepare(
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
             whatsapp_number = :whatsapp_number,
             email = :email,
             nid_number = :nid_number,
             occupation = :occupation,
             permanent_address = :permanent_address,
             emergency_contact_name = :emergency_contact_name,
             emergency_contact_number = :emergency_contact_number,
             payment_due_day = :payment_due_day,
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
        'whatsapp_number' => $payload['whatsapp_number'],
        'email' => $payload['email'],
        'nid_number' => $payload['nid_number'],
        'occupation' => $payload['occupation'],
        'permanent_address' => $payload['permanent_address'],
        'emergency_contact_name' => $payload['emergency_contact_name'],
        'emergency_contact_number' => $payload['emergency_contact_number'],
        'payment_due_day' => $payload['payment_due_day'],
        'status' => $payload['status'],
        'notes' => $payload['notes'],
    ]);

    foreach ([
        'nid_card_file' => ['column' => 'nid_card_path', 'allowPdf' => true],
        'customer_photo' => ['column' => 'customer_photo_path', 'allowPdf' => false],
        'business_certificate_or_job_id' => ['column' => 'business_certificate_or_job_id_path', 'allowPdf' => true],
        'agreement_file' => ['column' => 'agreement_file_path', 'allowPdf' => true],
    ] as $field => $config) {
        $file = $_FILES[$field] ?? null;

        if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            continue;
        }

        $upload = store_lease_upload_file($id, $file, $field, (bool) $config['allowPdf']);
        $column = $config['column'];

        $update = $pdo->prepare("UPDATE tenant_leases SET {$column} = :path WHERE id = :id");
        $update->execute([
            'id' => $id,
            'path' => $upload['relativePath'],
        ]);
    }

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

import { useEffect, useMemo, useState } from 'react';
import {
  createTenant,
  deleteTenant,
  deleteTenantDocument,
  getTenants,
  getTenant,
  updateTenant,
  uploadTenantDocument,
  uploadTenantPhoto
} from './api';

const TENANT_STATUS_OPTIONS = {
  all: 'All statuses',
  active: 'Active',
  inactive: 'Inactive'
};

const defaultTenantForm = {
  fullName: '',
  email: '',
  phone: '',
  status: 'active',
  unitId: '',
  moveInDate: '',
  notes: ''
};

function formatDateTime(value) {
  if (!value) {
    return 'Never';
  }

  const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function formatDate(value) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium'
  }).format(date);
}

function formatAmount(value) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return '0.00';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
}

function initials(name) {
  return (name || 'Tenant')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function statusBadgeClass(status) {
  switch (status) {
    case 'active':
      return 'status-badge active';
    case 'inactive':
    default:
      return 'status-badge muted';
  }
}

function unitStatusBadgeClass(status) {
  switch (status) {
    case 'available':
      return 'status-badge active';
    case 'occupied':
      return 'status-badge warning';
    case 'maintenance':
      return 'status-badge danger';
    case 'inactive':
    default:
      return 'status-badge muted';
  }
}

function tenantFormFromTenant(tenant) {
  if (!tenant) {
    return defaultTenantForm;
  }

  return {
    fullName: tenant.fullName || '',
    email: tenant.email || '',
    phone: tenant.phone || '',
    status: tenant.status || 'active',
    unitId: String(tenant.unitId || tenant.unit?.id || ''),
    moveInDate: tenant.moveInDate || '',
    notes: tenant.notes || ''
  };
}

function tenantUnitLabel(tenant) {
  if (!tenant?.unit) {
    return 'No unit assigned';
  }

  return tenant.unit.unitLabel || [tenant.unit.property?.name, tenant.unit.unitNumber].filter(Boolean).join(' • ');
}

function unitOptionLabel(unit) {
  const propertyName = unit.property?.name || 'Property';
  const parts = [propertyName, unit.unitNumber].filter(Boolean);
  const label = parts.join(' • ');
  const status = unit.statusLabel || 'Unknown';

  if (unit.isAssigned) {
    return `${label} • Assigned to ${unit.assignedTenantName || 'tenant'}`;
  }

  return `${label} • ${status}`;
}

function tenantStatusSummary(status) {
  switch (status) {
    case 'active':
      return 'Ready for occupancy';
    case 'inactive':
    default:
      return 'Archived record';
  }
}

function TenantCard({ tenant, canManageTenants, isSelected, onSelect, onEdit, onDelete }) {
  return (
    <article className={isSelected ? 'property-card selected glass' : 'property-card glass'}>
      <button className="property-card-media" type="button" onClick={() => onSelect(tenant.id)}>
        {tenant.profilePhotoUrl ? (
          <img src={tenant.profilePhotoUrl} alt={tenant.fullName} />
        ) : (
          <div className="property-card-placeholder">
            <span>{initials(tenant.fullName)}</span>
          </div>
        )}
      </button>

      <div className="property-card-body">
        <div className="property-card-topline">
          <div>
            <strong>{tenant.fullName}</strong>
            <span>{tenantUnitLabel(tenant)}</span>
          </div>
          <span className={statusBadgeClass(tenant.status)}>{tenant.statusLabel}</span>
        </div>

        <p className="property-card-address">
          {tenant.email || tenant.phone || tenantStatusSummary(tenant.status)}
        </p>

        <dl className="property-card-meta">
          <div>
            <dt>Unit</dt>
            <dd>{tenant.unit?.unitNumber || 'Unassigned'}</dd>
          </div>
          <div>
            <dt>Docs</dt>
            <dd>{tenant.documentCount ?? 0}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDateTime(tenant.updatedAt)}</dd>
          </div>
        </dl>

        <div className="property-card-actions">
          <button className="secondary-btn" type="button" onClick={() => onSelect(tenant.id)}>
            View
          </button>
          {canManageTenants ? (
            <>
              <button className="secondary-btn" type="button" onClick={() => onEdit(tenant)}>
                Edit
              </button>
              <button className="secondary-btn danger-btn" type="button" onClick={() => onDelete(tenant)}>
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function TenantDetail({
  tenant,
  canManageTenants,
  loading,
  onEdit,
  onDelete,
  onUploadPhoto,
  onUploadDocument,
  onDeleteDocument,
  photoBusy,
  documentBusy,
  photoFile,
  photoInputKey,
  documentFile,
  documentCaption,
  documentInputKey,
  setPhotoFile,
  setDocumentFile,
  setDocumentCaption
}) {
  if (!tenant) {
    return (
      <section className="glass content-card property-detail">
        <p className="eyebrow">Tenant detail</p>
        <h2>{loading ? 'Loading tenant details...' : 'No tenant selected'}</h2>
        <p className="muted">
          {loading
            ? 'Fetching the tenant record, unit mapping, and uploaded documents.'
            : 'Pick a tenant from the list to review their profile, uploads, and unit assignment.'}
        </p>
      </section>
    );
  }

  return (
    <section className="glass content-card property-detail">
      <div className="section-header">
        <div>
          <p className="eyebrow">Tenant detail</p>
          <h2>{tenant.fullName}</h2>
          <p className="muted">{tenantUnitLabel(tenant)}</p>
        </div>

        <div className="section-tools">
          <span className={statusBadgeClass(tenant.status)}>{tenant.statusLabel}</span>
          {tenant.unit ? <span className={unitStatusBadgeClass(tenant.unit.status)}>{tenant.unit.statusLabel}</span> : null}
        </div>
      </div>

      <div className="property-hero">
        <div className="property-hero-media">
          {tenant.profilePhotoUrl ? (
            <img src={tenant.profilePhotoUrl} alt={tenant.fullName} />
          ) : (
            <div className="property-hero-placeholder">
              <span>{initials(tenant.fullName)}</span>
            </div>
          )}
        </div>

        <dl className="property-meta-grid">
          <div>
            <dt>Email</dt>
            <dd>{tenant.email || 'Not set'}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{tenant.phone || 'Not set'}</dd>
          </div>
          <div>
            <dt>Unit</dt>
            <dd>{tenant.unit?.unitNumber || 'Unassigned'}</dd>
          </div>
          <div>
            <dt>Rent</dt>
            <dd>{tenant.unit ? formatAmount(tenant.unit.monthlyRent) : '0.00'}</dd>
          </div>
          <div>
            <dt>Deposit</dt>
            <dd>{tenant.unit ? formatAmount(tenant.unit.securityDeposit) : '0.00'}</dd>
          </div>
          <div>
            <dt>Move-in</dt>
            <dd>{formatDate(tenant.moveInDate)}</dd>
          </div>
          <div>
            <dt>Documents</dt>
            <dd>{tenant.documentCount ?? 0}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDateTime(tenant.updatedAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="property-info-grid">
        <article className="helper-card">
          <strong>Assignment</strong>
          <span>{tenant.unit?.property?.addressLabel || 'No unit assignment yet'}</span>
        </article>

        <article className="helper-card">
          <strong>Status</strong>
          <span>{tenantStatusSummary(tenant.status)}</span>
        </article>

        <article className="helper-card">
          <strong>Created</strong>
          <span>{formatDateTime(tenant.createdAt)}</span>
        </article>

        <article className="helper-card">
          <strong>Created by</strong>
          <span>{tenant.createdBy?.name || 'Unknown'}</span>
        </article>
      </div>

      {tenant.notes ? (
        <article className="helper-card">
          <strong>Notes</strong>
          <span>{tenant.notes}</span>
        </article>
      ) : null}

      {canManageTenants ? (
        <div className="property-detail-actions">
          <button className="primary-btn" type="button" onClick={() => onEdit(tenant)}>
            Edit tenant
          </button>
          <button className="secondary-btn danger-btn" type="button" onClick={() => onDelete(tenant)}>
            Delete tenant
          </button>
        </div>
      ) : null}

      <article className="property-gallery">
        <div className="section-header">
          <div>
            <p className="eyebrow">Profile photo</p>
            <h3>Tenant photo upload</h3>
          </div>
          <span className="pill">{tenant.profilePhotoUrl ? 'Photo on file' : 'No photo yet'}</span>
        </div>

        {canManageTenants ? (
          <form className="form-grid upload-form" onSubmit={onUploadPhoto}>
            <label className="photo-dropzone">
              <input
                accept="image/jpeg,image/png,image/webp"
                key={photoInputKey}
                type="file"
                onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
              />
              <div>
                <strong>{photoFile ? photoFile.name : 'Choose a photo to upload'}</strong>
                <span>JPEG, PNG, or WebP up to 2 MB.</span>
              </div>
            </label>

            <button className="primary-btn" type="submit" disabled={photoBusy}>
              {photoBusy ? 'Uploading...' : 'Upload photo'}
            </button>
          </form>
        ) : null}
      </article>

      <article className="property-gallery">
        <div className="section-header">
          <div>
            <p className="eyebrow">Documents</p>
            <h3>Tenant document library</h3>
          </div>
          <span className="pill">{tenant.documents?.length || 0} files</span>
        </div>

        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Size</th>
                <th>Uploaded</th>
                {canManageTenants ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {(tenant.documents || []).map((document) => (
                <tr key={document.id}>
                  <td>
                    <div className="table-user">
                      <div className="session-avatar session-avatar-small">
                        <span>DOC</span>
                      </div>
                      <div>
                        <strong>{document.caption || document.originalName}</strong>
                        <small>{document.originalName}</small>
                      </div>
                    </div>
                  </td>
                  <td>{document.mimeType || 'n/a'}</td>
                  <td>{document.fileSizeLabel || '0 B'}</td>
                  <td>{formatDateTime(document.createdAt)}</td>
                  {canManageTenants ? (
                    <td>
                      <button
                        className="secondary-btn danger-btn"
                        type="button"
                        onClick={() => onDeleteDocument(document)}
                      >
                        Remove
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}

              {!tenant.documents?.length ? (
                <tr>
                  <td colSpan={canManageTenants ? 5 : 4}>
                    <div className="empty-state">
                      <strong>No documents yet.</strong>
                      <span>Upload lease records, IDs, or other tenant paperwork here.</span>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {canManageTenants ? (
          <form className="form-grid upload-form" onSubmit={onUploadDocument}>
            <label className="photo-dropzone">
              <input
                accept=".pdf,.doc,.docx,.txt,image/jpeg,image/png,image/webp"
                key={documentInputKey}
                type="file"
                onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
              />
              <div>
                <strong>{documentFile ? documentFile.name : 'Choose a document to upload'}</strong>
                <span>PDF, Word, text, or image files up to 10 MB.</span>
              </div>
            </label>

            <label>
              Caption
              <input
                type="text"
                value={documentCaption}
                onChange={(event) => setDocumentCaption(event.target.value)}
                placeholder="Optional caption"
              />
            </label>

            <button className="primary-btn" type="submit" disabled={documentBusy}>
              {documentBusy ? 'Uploading...' : 'Upload document'}
            </button>
          </form>
        ) : null}
      </article>
    </section>
  );
}

function TenantForm({
  mode,
  busy,
  canManageTenants,
  currentTenantId,
  onCancel,
  onSubmit,
  setTenantForm,
  tenantForm,
  unitOptions,
  statusOptions
}) {
  const title = mode === 'create' ? 'Add tenant' : 'Edit tenant';
  const formStatusOptions = Object.entries(statusOptions).filter(([key]) => key !== 'all');

  return (
    <section className="glass content-card property-form-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Tenant editor</p>
          <h2>{title}</h2>
        </div>
        <button className="secondary-btn" type="button" onClick={onCancel}>
          Back to detail
        </button>
      </div>

      {!canManageTenants ? (
        <div className="alert warning">You can view tenants, but only managers and owners can edit them.</div>
      ) : null}

      <form className="form-grid property-form" onSubmit={onSubmit}>
        <label>
          Full name
          <input
            required
            type="text"
            value={tenantForm.fullName}
            onChange={(event) =>
              setTenantForm((current) => ({ ...current, fullName: event.target.value }))
            }
          />
        </label>

        <div className="form-two-up">
          <label>
            Email
            <input
              type="email"
              value={tenantForm.email}
              onChange={(event) =>
                setTenantForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="name@example.com"
            />
          </label>

          <label>
            Phone
            <input
              type="text"
              value={tenantForm.phone}
              onChange={(event) =>
                setTenantForm((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="+880 1..."
            />
          </label>
        </div>

        <div className="form-two-up">
          <label>
            Status
            <select
              value={tenantForm.status}
              onChange={(event) =>
                setTenantForm((current) => ({ ...current, status: event.target.value }))
              }
            >
              {formStatusOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Move-in date
            <input
              type="date"
              value={tenantForm.moveInDate}
              onChange={(event) =>
                setTenantForm((current) => ({ ...current, moveInDate: event.target.value }))
              }
            />
          </label>
        </div>

        <label>
          Unit mapping
          <select
            value={tenantForm.unitId}
            onChange={(event) =>
              setTenantForm((current) => ({ ...current, unitId: event.target.value }))
            }
          >
            <option value="">Unassigned</option>
            {unitOptions.map((unit) => {
              const assignedToOtherTenant =
                unit.assignedTenantId && String(unit.assignedTenantId) !== String(currentTenantId || '');
              const disabled = assignedToOtherTenant || (!unit.isSelectable && String(unit.assignedTenantId || '') !== String(currentTenantId || ''));

              return (
                <option key={unit.id} value={String(unit.id)} disabled={disabled}>
                  {unitOptionLabel(unit)}
                  {disabled && assignedToOtherTenant ? ' (assigned)' : ''}
                </option>
              );
            })}
          </select>
        </label>

        <label>
          Notes
          <textarea
            rows="4"
            value={tenantForm.notes}
            onChange={(event) =>
              setTenantForm((current) => ({ ...current, notes: event.target.value }))
            }
          />
        </label>

        <p className="helper-text">
          Units that are already assigned to another tenant are disabled. The selected tenant can keep their
          current unit even if it has moved into maintenance.
        </p>

        <div className="property-form-actions">
          <button className="primary-btn" type="submit" disabled={busy || !canManageTenants}>
            {busy ? 'Saving...' : mode === 'create' ? 'Create tenant' : 'Save changes'}
          </button>
          <button className="secondary-btn" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function TenantsScreen({ csrfToken, setCsrfToken, session }) {
  const canManageTenants = Boolean(session?.permissions?.canManageTenants);

  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [statusOptions, setStatusOptions] = useState(TENANT_STATUS_OPTIONS);
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantFormMode, setTenantFormMode] = useState('detail');
  const [tenantForm, setTenantForm] = useState(defaultTenantForm);
  const [filters, setFilters] = useState({
    query: '',
    status: 'all',
    unitId: ''
  });
  const [searchInput, setSearchInput] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingTenant, setLoadingTenant] = useState(false);
  const [tenantBusy, setTenantBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentCaption, setDocumentCaption] = useState('');
  const [documentInputKey, setDocumentInputKey] = useState(0);

  const unitOptions = useMemo(
    () => [...units].sort((left, right) => (left.unitLabel || '').localeCompare(right.unitLabel || '')),
    [units]
  );

  const visibleTenantCount = tenants.length;
  const unitCount = unitOptions.length;

  async function loadCatalog(nextSelectedId = null) {
    setLoadingCatalog(true);
    setError('');

    try {
      const data = await getTenants({
        query: filters.query,
        status: filters.status,
        unitId: filters.unitId
      });

      const nextTenants = data.tenants || [];
      const nextUnits = data.units || [];
      const nextStatusOptions = data.statusOptions || TENANT_STATUS_OPTIONS;
      const visibleIds = new Set(nextTenants.map((tenant) => tenant.id));
      let resolvedSelectedId = null;

      setTenants(nextTenants);
      setUnits(nextUnits);
      setStatusOptions(nextStatusOptions);

      setSelectedTenantId((current) => {
        if (nextSelectedId !== null && visibleIds.has(nextSelectedId)) {
          resolvedSelectedId = nextSelectedId;
          return nextSelectedId;
        }

        if (current !== null && visibleIds.has(current)) {
          resolvedSelectedId = current;
          return current;
        }

        resolvedSelectedId = nextTenants[0]?.id ?? null;
        return resolvedSelectedId;
      });

      if (!nextTenants.length) {
        setSelectedTenant(null);
        setLoadingTenant(false);
      }

      return resolvedSelectedId;
    } catch (err) {
      setError(err.message || 'Failed to load tenants.');
      return null;
    } finally {
      setLoadingCatalog(false);
    }
  }

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, filters.status, filters.unitId]);

  useEffect(() => {
    if (!selectedTenantId) {
      setSelectedTenant(null);
      setLoadingTenant(false);
      return;
    }

    let mounted = true;

    async function loadSelectedTenant() {
      setLoadingTenant(true);

      try {
        const data = await getTenant(selectedTenantId);

        if (mounted) {
          setSelectedTenant(data.tenant || null);
          setUnits(data.units || []);
          setStatusOptions(data.statusOptions || TENANT_STATUS_OPTIONS);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load tenant details.');
        }
      } finally {
        if (mounted) {
          setLoadingTenant(false);
        }
      }
    }

    loadSelectedTenant();

    return () => {
      mounted = false;
    };
  }, [selectedTenantId]);

  useEffect(() => {
    if (tenantFormMode !== 'create' || unitOptions.length === 0) {
      return;
    }

    setTenantForm((current) => {
      if (current.unitId && unitOptions.some((unit) => String(unit.id) === current.unitId)) {
        return current;
      }

      return defaultTenantForm;
    });
  }, [tenantFormMode, unitOptions]);

  useEffect(() => {
    if (!selectedTenant) {
      return;
    }

    if (tenantFormMode === 'edit') {
      setTenantForm(tenantFormFromTenant(selectedTenant));
    }

    setPhotoFile(null);
    setPhotoInputKey((current) => current + 1);
    setDocumentFile(null);
    setDocumentCaption('');
    setDocumentInputKey((current) => current + 1);
  }, [selectedTenant, tenantFormMode]);

  function resetMessages() {
    setError('');
    setNotice('');
  }

  function startCreateTenant() {
    if (!canManageTenants) {
      return;
    }

    resetMessages();
    setTenantFormMode('create');
    setSelectedTenantId(null);
    setSelectedTenant(null);
    setTenantForm(defaultTenantForm);
  }

  function startEditTenant(tenant) {
    if (!canManageTenants) {
      return;
    }

    resetMessages();
    setTenantFormMode('edit');
    setSelectedTenantId(tenant.id);
    setSelectedTenant(tenant);
    setTenantForm(tenantFormFromTenant(tenant));
  }

  function cancelTenantForm() {
    setTenantFormMode('detail');

    if (selectedTenant) {
      setTenantForm(tenantFormFromTenant(selectedTenant));
    } else {
      setTenantForm(defaultTenantForm);
    }
  }

  async function refreshAfterMutation(selectTenantId = null) {
    const resolvedId = await loadCatalog(selectTenantId);
    const detailId = selectTenantId ?? resolvedId;

    if (detailId !== null) {
      try {
        const data = await getTenant(detailId);
        setSelectedTenant(data.tenant || null);
        setUnits(data.units || []);
        setStatusOptions(data.statusOptions || TENANT_STATUS_OPTIONS);
      } catch {
        setSelectedTenant(null);
      }
    } else {
      setSelectedTenant(null);
    }
  }

  async function handleTenantSubmit(event) {
    event.preventDefault();

    if (!canManageTenants) {
      return;
    }

    resetMessages();
    setTenantBusy(true);

    try {
      const payload = {
        ...tenantForm,
        csrfToken
      };

      const response =
        tenantFormMode === 'create'
          ? await createTenant(payload)
          : await updateTenant({
              ...payload,
              id: selectedTenantId
            });

      setCsrfToken(response.csrfToken || csrfToken);
      setNotice(response.message || (tenantFormMode === 'create' ? 'Tenant created successfully.' : 'Tenant updated successfully.'));
      setTenantFormMode('detail');
      setTenantForm(tenantFormFromTenant(response.tenant));
      await refreshAfterMutation(response.tenant?.id ?? selectedTenantId);
    } catch (err) {
      setError(err.message || 'The tenant could not be saved.');
    } finally {
      setTenantBusy(false);
    }
  }

  async function handleDeleteTenant(tenant) {
    if (!canManageTenants) {
      return;
    }

    if (!window.confirm(`Delete ${tenant.fullName}? This cannot be undone.`)) {
      return;
    }

    resetMessages();
    setTenantBusy(true);

    try {
      const response = await deleteTenant({
        csrfToken,
        id: tenant.id
      });

      setCsrfToken(response.csrfToken || csrfToken);
      setNotice(response.message || 'Tenant deleted successfully.');
      setTenantFormMode('detail');

      if (selectedTenantId === tenant.id) {
        setSelectedTenantId(null);
        setSelectedTenant(null);
      }

      await loadCatalog();
    } catch (err) {
      setError(err.message || 'The tenant could not be deleted.');
    } finally {
      setTenantBusy(false);
    }
  }

  async function handlePhotoUpload(event) {
    event.preventDefault();

    if (!selectedTenantId) {
      setError('Please choose a tenant first.');
      return;
    }

    if (!photoFile) {
      setError('Please choose a tenant photo.');
      return;
    }

    resetMessages();
    setPhotoBusy(true);

    try {
      const formData = new FormData();
      formData.append('csrfToken', csrfToken);
      formData.append('tenantId', String(selectedTenantId));
      formData.append('photo', photoFile);

      const response = await uploadTenantPhoto(formData);
      setCsrfToken(response.csrfToken || csrfToken);
      setPhotoFile(null);
      setPhotoInputKey((current) => current + 1);
      setNotice(response.message || 'Tenant photo uploaded successfully.');
      await refreshAfterMutation(response.tenant?.id ?? selectedTenantId);
    } catch (err) {
      setError(err.message || 'Photo upload failed.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleDocumentUpload(event) {
    event.preventDefault();

    if (!selectedTenantId) {
      setError('Please choose a tenant first.');
      return;
    }

    if (!documentFile) {
      setError('Please choose a tenant document.');
      return;
    }

    resetMessages();
    setDocumentBusy(true);

    try {
      const formData = new FormData();
      formData.append('csrfToken', csrfToken);
      formData.append('tenantId', String(selectedTenantId));
      formData.append('document', documentFile);
      formData.append('caption', documentCaption);

      const response = await uploadTenantDocument(formData);
      setCsrfToken(response.csrfToken || csrfToken);
      setDocumentFile(null);
      setDocumentCaption('');
      setDocumentInputKey((current) => current + 1);
      setNotice(response.message || 'Tenant document uploaded successfully.');
      await refreshAfterMutation(response.tenant?.id ?? selectedTenantId);
    } catch (err) {
      setError(err.message || 'Document upload failed.');
    } finally {
      setDocumentBusy(false);
    }
  }

  async function handleDeleteDocument(document) {
    if (!canManageTenants || !selectedTenantId) {
      return;
    }

    if (!window.confirm(`Delete ${document.caption || document.originalName}? This cannot be undone.`)) {
      return;
    }

    resetMessages();
    setDocumentBusy(true);

    try {
      const response = await deleteTenantDocument({
        csrfToken,
        tenantId: selectedTenantId,
        documentId: document.id
      });

      setCsrfToken(response.csrfToken || csrfToken);
      setNotice(response.message || 'Tenant document deleted successfully.');
      await refreshAfterMutation(response.tenant?.id ?? selectedTenantId);
    } catch (err) {
      setError(err.message || 'The document could not be deleted.');
    } finally {
      setDocumentBusy(false);
    }
  }

  async function handleTenantSearch(event) {
    event.preventDefault();
    setFilters((current) => ({ ...current, query: searchInput.trim() }));
  }

  function handleTenantSelect(tenantId) {
    setSelectedTenantId(tenantId);
    setTenantFormMode('detail');
  }

  if (loadingCatalog && !tenants.length) {
    return (
      <section className="dashboard-grid">
        <div className="glass content-card">
          <p className="eyebrow">Tenants</p>
          <h2>Loading tenant workspace</h2>
          <p className="muted">Fetching tenant records, unit mappings, and the detail view.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-grid">
      <header className="glass content-card property-header">
        <div className="section-header">
          <div>
            <p className="eyebrow">Phase 4</p>
            <h2>Tenant management</h2>
            <p className="muted">
              Add, edit, delete, and inspect tenants with photo uploads, documents, and unit mapping.
            </p>
          </div>

          <div className="section-tools">
            <span className="pill">{visibleTenantCount} visible tenants</span>
            <span className="pill">{unitCount} units</span>
            {canManageTenants ? (
              <button className="primary-btn" type="button" onClick={startCreateTenant}>
                Add tenant
              </button>
            ) : null}
          </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {notice ? <div className="alert success">{notice}</div> : null}
      </header>

      <div className="property-layout">
        <div className="content-grid property-controls">
          <article className="glass content-card">
            <p className="eyebrow">Search</p>
            <form className="search-row property-search" onSubmit={handleTenantSearch}>
              <input
                placeholder="Search by tenant name, email, or unit"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                type="search"
              />
              <button className="secondary-btn" type="submit">
                Search
              </button>
            </form>
          </article>

          <article className="glass content-card">
            <p className="eyebrow">Refine</p>
            <div className="form-two-up property-filter-grid">
              <label>
                Status
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  {Object.entries(statusOptions).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Unit
                <select
                  value={filters.unitId}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, unitId: event.target.value }))
                  }
                >
                  <option value="">All units</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={String(unit.id)}>
                      {unitOptionLabel(unit)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="helper-text">The tenant list updates whenever filters change.</p>
          </article>
        </div>

        <div className="property-main-grid">
          <section className="property-list-column">
            <div className="glass content-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Tenant list</p>
                  <h2>Tenant records and unit assignments</h2>
                </div>
                <div className="section-tools">
                  {loadingCatalog ? <span className="pill">Refreshing...</span> : null}
                  <span className="pill">{tenants.length} records</span>
                </div>
              </div>

              <div className="property-card-grid">
                {tenants.map((tenant) => (
                  <TenantCard
                    key={tenant.id}
                    canManageTenants={canManageTenants}
                    isSelected={tenant.id === selectedTenantId}
                    onDelete={handleDeleteTenant}
                    onEdit={startEditTenant}
                    onSelect={handleTenantSelect}
                    tenant={tenant}
                  />
                ))}
              </div>

              {!loadingCatalog && !tenants.length ? (
                <div className="empty-state">
                  <strong>No tenants found.</strong>
                  <span>Try a different filter or add the first tenant record.</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="property-detail-column">
            {tenantFormMode === 'create' || tenantFormMode === 'edit' ? (
              <TenantForm
                busy={tenantBusy}
                canManageTenants={canManageTenants}
                currentTenantId={selectedTenantId}
                mode={tenantFormMode}
                onCancel={cancelTenantForm}
                onSubmit={handleTenantSubmit}
                setTenantForm={setTenantForm}
                statusOptions={statusOptions}
                tenantForm={tenantForm}
                unitOptions={unitOptions}
              />
            ) : (
              <TenantDetail
                canManageTenants={canManageTenants}
                documentBusy={documentBusy}
                documentCaption={documentCaption}
                documentFile={documentFile}
                documentInputKey={documentInputKey}
                loading={loadingTenant}
                onDelete={handleDeleteTenant}
                onDeleteDocument={handleDeleteDocument}
                onEdit={startEditTenant}
                onUploadDocument={handleDocumentUpload}
                onUploadPhoto={handlePhotoUpload}
                photoBusy={photoBusy}
                photoFile={photoFile}
                photoInputKey={photoInputKey}
                setDocumentCaption={setDocumentCaption}
                setDocumentFile={setDocumentFile}
                setPhotoFile={setPhotoFile}
                tenant={selectedTenant}
              />
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default TenantsScreen;

import { useEffect, useMemo, useState } from 'react';
import { createUnit, deleteUnit, getUnit, getUnits, updateUnit } from './api';

const UNIT_STATUS_OPTIONS = {
  all: 'All statuses',
  available: 'Available',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
  inactive: 'Inactive'
};

const defaultUnitForm = (properties = []) => ({
  propertyId: properties[0]?.id ? String(properties[0].id) : '',
  unitNumber: '',
  status: 'available',
  monthlyRent: '0',
  securityDeposit: '0',
  description: '',
  notes: ''
});

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

function statusBadgeClass(status) {
  switch (status) {
    case 'available':
      return 'status-badge active';
    case 'occupied':
      return 'status-badge warning';
    case 'maintenance':
      return 'status-badge danger';
    case 'inactive':
      return 'status-badge muted';
    default:
      return 'status-badge muted';
  }
}

function propertyOptionLabel(property) {
  if (!property) {
    return 'Untitled property';
  }

  const parts = [property.name || 'Untitled property'];

  if (property.city) {
    parts.push(property.city);
  }

  if (property.propertyType?.name) {
    parts.push(property.propertyType.name);
  }

  if (property.statusLabel) {
    parts.push(property.statusLabel);
  }

  return parts.join(' • ');
}

function unitFormFromUnit(unit) {
  if (!unit) {
    return defaultUnitForm();
  }

  return {
    propertyId: String(unit.propertyId || unit.property?.id || ''),
    unitNumber: unit.unitNumber || '',
    status: unit.status || 'available',
    monthlyRent: String(unit.monthlyRent ?? 0),
    securityDeposit: String(unit.securityDeposit ?? 0),
    description: unit.description || '',
    notes: unit.notes || ''
  };
}

function UnitCard({ unit, canManageUnits, isSelected, onSelect, onEdit, onDelete }) {
  return (
    <article className={isSelected ? 'property-card selected glass' : 'property-card glass'}>
      <button className="property-card-media" type="button" onClick={() => onSelect(unit.id)}>
        <div className="property-card-placeholder">
          <span>{(unit.unitNumber || 'UT').slice(0, 2).toUpperCase()}</span>
        </div>
      </button>

      <div className="property-card-body">
        <div className="property-card-topline">
          <div>
            <strong>{unit.unitNumber}</strong>
            <span>{unit.property?.name || 'Unlinked property'}</span>
          </div>
          <span className={statusBadgeClass(unit.status)}>{unit.statusLabel}</span>
        </div>

        <p className="property-card-address">{unit.property?.addressLabel || 'No property address found'}</p>

        <dl className="property-card-meta">
          <div>
            <dt>Rent</dt>
            <dd>{formatAmount(unit.monthlyRent)}</dd>
          </div>
          <div>
            <dt>Deposit</dt>
            <dd>{formatAmount(unit.securityDeposit)}</dd>
          </div>
          <div>
            <dt>Property type</dt>
            <dd>{unit.property?.propertyType?.name || 'Untyped'}</dd>
          </div>
        </dl>

        <div className="property-card-actions">
          <button className="secondary-btn" type="button" onClick={() => onSelect(unit.id)}>
            View
          </button>
          {canManageUnits ? (
            <>
              <button className="secondary-btn" type="button" onClick={() => onEdit(unit)}>
                Edit
              </button>
              <button className="secondary-btn danger-btn" type="button" onClick={() => onDelete(unit)}>
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function UnitDetail({ unit, canManageUnits, loading, onEdit, onDelete }) {
  if (!unit) {
    return (
      <section className="glass content-card property-detail">
        <p className="eyebrow">Unit detail</p>
        <h2>{loading ? 'Loading unit details...' : 'No unit selected'}</h2>
        <p className="muted">
          {loading
            ? 'Fetching the full unit record from the backend.'
            : 'Select a unit from the list to see its property link, rent, deposit, and status.'}
        </p>
      </section>
    );
  }

  return (
    <section className="glass content-card property-detail">
      <div className="section-header">
        <div>
          <p className="eyebrow">Unit detail</p>
          <h2>{unit.unitNumber}</h2>
          <p className="muted">{unit.property?.name || 'Unlinked property'}</p>
        </div>

        <div className="section-tools">
          <span className={statusBadgeClass(unit.status)}>{unit.statusLabel}</span>
          {unit.property?.propertyType ? (
            <span className={unit.property.propertyType.isActive ? 'status-badge active' : 'status-badge muted'}>
              {unit.property.propertyType.name}
            </span>
          ) : null}
        </div>
      </div>

      <div className="property-hero">
        <div className="property-hero-media">
          <div className="property-hero-placeholder">
            <span>{unit.unitNumber}</span>
          </div>
        </div>

        <dl className="property-meta-grid">
          <div>
            <dt>Rent</dt>
            <dd>{formatAmount(unit.monthlyRent)}</dd>
          </div>
          <div>
            <dt>Deposit</dt>
            <dd>{formatAmount(unit.securityDeposit)}</dd>
          </div>
          <div>
            <dt>Property</dt>
            <dd>{unit.property?.name || 'Unlinked'}</dd>
          </div>
          <div>
            <dt>Property status</dt>
            <dd>{unit.property?.statusLabel || 'Unknown'}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDateTime(unit.updatedAt)}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDateTime(unit.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="property-info-grid">
        <article className="helper-card">
          <strong>Property link</strong>
          <span>{unit.property?.addressLabel || 'No linked property address found'}</span>
        </article>

        <article className="helper-card">
          <strong>Description</strong>
          <span>{unit.description || 'No description yet'}</span>
        </article>

        <article className="helper-card">
          <strong>Notes</strong>
          <span>{unit.notes || 'No notes yet'}</span>
        </article>

        <article className="helper-card">
          <strong>Created by</strong>
          <span>{unit.createdBy?.name || 'Unknown'}</span>
        </article>
      </div>

      <div className="property-detail-actions">
        {canManageUnits ? (
          <>
            <button className="primary-btn" type="button" onClick={() => onEdit(unit)}>
              Edit unit
            </button>
            <button className="secondary-btn danger-btn" type="button" onClick={() => onDelete(unit)}>
              Delete unit
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}

function UnitForm({
  busy,
  canManageUnits,
  mode,
  onCancel,
  onSubmit,
  propertyOptions,
  setUnitForm,
  statusOptions,
  unitForm
}) {
  const title = mode === 'create' ? 'Add unit' : 'Edit unit';
  const formStatusOptions = Object.entries(statusOptions).filter(([key]) => key !== 'all');

  return (
    <section className="glass content-card property-form-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Unit editor</p>
          <h2>{title}</h2>
        </div>
        <button className="secondary-btn" type="button" onClick={onCancel}>
          Back to detail
        </button>
      </div>

      {!canManageUnits ? (
        <div className="alert warning">You can view units, but only managers and owners can edit them.</div>
      ) : null}

      <form className="form-grid property-form" onSubmit={onSubmit}>
        <label>
          Property
          <select
            required
            value={unitForm.propertyId}
            onChange={(event) =>
              setUnitForm((current) => ({ ...current, propertyId: event.target.value }))
            }
          >
            <option value="">Select a property</option>
            {propertyOptions.map((property) => (
              <option key={property.id} value={String(property.id)}>
                {propertyOptionLabel(property)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Unit number
          <input
            required
            type="text"
            value={unitForm.unitNumber}
            onChange={(event) =>
              setUnitForm((current) => ({ ...current, unitNumber: event.target.value }))
            }
          />
        </label>

        <label>
          Status
          <select
            value={unitForm.status}
            onChange={(event) => setUnitForm((current) => ({ ...current, status: event.target.value }))}
          >
            {formStatusOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="form-two-up">
          <label>
            Monthly rent
            <input
              min="0"
              step="0.01"
              type="number"
              value={unitForm.monthlyRent}
              onChange={(event) =>
                setUnitForm((current) => ({ ...current, monthlyRent: event.target.value }))
              }
            />
          </label>

          <label>
            Security deposit
            <input
              min="0"
              step="0.01"
              type="number"
              value={unitForm.securityDeposit}
              onChange={(event) =>
                setUnitForm((current) => ({ ...current, securityDeposit: event.target.value }))
              }
            />
          </label>
        </div>

        <label>
          Description
          <textarea
            rows="4"
            value={unitForm.description}
            onChange={(event) =>
              setUnitForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </label>

        <label>
          Notes
          <textarea
            rows="3"
            value={unitForm.notes}
            onChange={(event) => setUnitForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>

        <div className="property-form-actions">
          <button className="primary-btn" type="submit" disabled={busy || !canManageUnits}>
            {busy ? 'Saving...' : mode === 'create' ? 'Create unit' : 'Save changes'}
          </button>
          <button className="secondary-btn" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function UnitsScreen({ csrfToken, setCsrfToken, session }) {
  const canManageUnits = Boolean(session?.permissions?.canManageUnits);

  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [statusOptions, setStatusOptions] = useState(UNIT_STATUS_OPTIONS);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitFormMode, setUnitFormMode] = useState('detail');
  const [unitForm, setUnitForm] = useState(defaultUnitForm());
  const [filters, setFilters] = useState({
    query: '',
    status: 'all',
    propertyId: ''
  });
  const [searchInput, setSearchInput] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [unitBusy, setUnitBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const propertyOptions = useMemo(
    () => [...properties].sort((left, right) => (left.name || '').localeCompare(right.name || '')),
    [properties]
  );
  const visibleUnitCount = units.length;
  const propertyCount = propertyOptions.length;

  async function loadCatalog(nextSelectedId = null) {
    setLoadingCatalog(true);
    setError('');

    try {
      const data = await getUnits({
        query: filters.query,
        status: filters.status,
        propertyId: filters.propertyId
      });

      const nextUnits = data.units || [];
      const nextProperties = data.properties || [];
      const nextStatusOptions = data.statusOptions || UNIT_STATUS_OPTIONS;
      const visibleIds = new Set(nextUnits.map((unit) => unit.id));
      let resolvedSelectedId = null;

      setUnits(nextUnits);
      setProperties(nextProperties);
      setStatusOptions(nextStatusOptions);

      setSelectedUnitId((current) => {
        if (nextSelectedId !== null && visibleIds.has(nextSelectedId)) {
          resolvedSelectedId = nextSelectedId;
          return nextSelectedId;
        }

        if (current !== null && visibleIds.has(current)) {
          resolvedSelectedId = current;
          return current;
        }

        resolvedSelectedId = nextUnits[0]?.id ?? null;
        return resolvedSelectedId;
      });

      if (!nextUnits.length) {
        setSelectedUnit(null);
        setLoadingUnit(false);
      }

      return resolvedSelectedId;
    } catch (err) {
      setError(err.message || 'Failed to load units.');
      return null;
    } finally {
      setLoadingCatalog(false);
    }
  }

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, filters.status, filters.propertyId]);

  useEffect(() => {
    if (!selectedUnitId) {
      setSelectedUnit(null);
      setLoadingUnit(false);
      return;
    }

    let mounted = true;

    async function loadSelectedUnit() {
      setLoadingUnit(true);

      try {
        const data = await getUnit(selectedUnitId);

        if (mounted) {
          setSelectedUnit(data.unit || null);
          setProperties(data.properties || []);
          setStatusOptions(data.statusOptions || UNIT_STATUS_OPTIONS);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load unit details.');
        }
      } finally {
        if (mounted) {
          setLoadingUnit(false);
        }
      }
    }

    loadSelectedUnit();

    return () => {
      mounted = false;
    };
  }, [selectedUnitId]);

  useEffect(() => {
    if (unitFormMode !== 'create' || propertyOptions.length === 0) {
      return;
    }

    setUnitForm((current) => {
      if (current.propertyId && propertyOptions.some((property) => String(property.id) === current.propertyId)) {
        return current;
      }

      return defaultUnitForm(propertyOptions);
    });
  }, [propertyOptions, unitFormMode]);

  useEffect(() => {
    if (!selectedUnit) {
      return;
    }

    if (unitFormMode === 'edit') {
      setUnitForm(unitFormFromUnit(selectedUnit));
    }
  }, [selectedUnit, unitFormMode]);

  function resetMessages() {
    setError('');
    setNotice('');
  }

  function startCreateUnit() {
    if (!canManageUnits) {
      return;
    }

    if (propertyOptions.length === 0) {
      setError('Create a property before adding units.');
      return;
    }

    resetMessages();
    setUnitFormMode('create');
    setSelectedUnitId(null);
    setSelectedUnit(null);
    setUnitForm(defaultUnitForm(propertyOptions));
  }

  function startEditUnit(unit) {
    if (!canManageUnits) {
      return;
    }

    resetMessages();
    setUnitFormMode('edit');
    setSelectedUnitId(unit.id);
    setSelectedUnit(unit);
    setUnitForm(unitFormFromUnit(unit));
  }

  function cancelUnitForm() {
    setUnitFormMode('detail');

    if (selectedUnit) {
      setUnitForm(unitFormFromUnit(selectedUnit));
    } else {
      setUnitForm(defaultUnitForm(propertyOptions));
    }
  }

  async function refreshAfterMutation(selectUnitId = null) {
    const resolvedId = await loadCatalog(selectUnitId);
    const detailId = selectUnitId ?? resolvedId;

    if (detailId !== null) {
      try {
        const data = await getUnit(detailId);
        setSelectedUnit(data.unit || null);
        setStatusOptions(data.statusOptions || UNIT_STATUS_OPTIONS);
        setProperties(data.properties || []);
      } catch {
        setSelectedUnit(null);
      }
    } else {
      setSelectedUnit(null);
    }
  }

  async function handleUnitSubmit(event) {
    event.preventDefault();

    if (!canManageUnits) {
      return;
    }

    if (!unitForm.propertyId) {
      setError('Please choose a property.');
      return;
    }

    resetMessages();
    setUnitBusy(true);

    try {
      const payload = {
        csrfToken,
        ...unitForm
      };

      const response =
        unitFormMode === 'create'
          ? await createUnit(payload)
          : await updateUnit({
              ...payload,
              id: selectedUnitId
            });

      setCsrfToken(response.csrfToken || csrfToken);
      setNotice(response.message || (unitFormMode === 'create' ? 'Unit created successfully.' : 'Unit updated successfully.'));
      setUnitFormMode('detail');
      setUnitForm(unitFormFromUnit(response.unit));
      await refreshAfterMutation(response.unit?.id ?? selectedUnitId);
    } catch (err) {
      setError(err.message || 'The unit could not be saved.');
    } finally {
      setUnitBusy(false);
    }
  }

  async function handleDeleteUnit(unit) {
    if (!canManageUnits) {
      return;
    }

    if (!window.confirm(`Delete ${unit.unitNumber}? This cannot be undone.`)) {
      return;
    }

    resetMessages();
    setUnitBusy(true);

    try {
      const response = await deleteUnit({
        csrfToken,
        id: unit.id
      });

      setCsrfToken(response.csrfToken || csrfToken);
      setNotice(response.message || 'Unit deleted successfully.');
      setUnitFormMode('detail');

      if (selectedUnitId === unit.id) {
        setSelectedUnitId(null);
        setSelectedUnit(null);
      }

      await loadCatalog();
    } catch (err) {
      setError(err.message || 'The unit could not be deleted.');
    } finally {
      setUnitBusy(false);
    }
  }

  async function handleUnitSearch(event) {
    event.preventDefault();
    setFilters((current) => ({ ...current, query: searchInput.trim() }));
  }

  function handleUnitSelect(unitId) {
    setSelectedUnitId(unitId);
    setUnitFormMode('detail');
  }

  if (loadingCatalog && !units.length) {
    return (
      <section className="dashboard-grid">
        <div className="glass content-card">
          <p className="eyebrow">Units</p>
          <h2>Loading unit workspace</h2>
          <p className="muted">Fetching unit records, linked properties, and the current detail view.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-grid">
      <header className="glass content-card property-header">
        <div className="section-header">
          <div>
            <p className="eyebrow">Phase 3</p>
            <h2>Unit management</h2>
            <p className="muted">
              Add, edit, delete, and inspect units with property links, status control, and rent plus
              deposit fields.
            </p>
          </div>

          <div className="section-tools">
            <span className="pill">{visibleUnitCount} visible units</span>
            <span className="pill">{propertyCount} properties</span>
            {canManageUnits ? (
              propertyOptions.length > 0 ? (
                <button className="primary-btn" type="button" onClick={startCreateUnit}>
                  Add unit
                </button>
              ) : (
                <span className="pill">Create a property first</span>
              )
            ) : null}
          </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {notice ? <div className="alert success">{notice}</div> : null}
      </header>

      <div className="property-layout">
        <div className="content-grid property-controls">
          <article className="glass content-card">
            <p className="eyebrow">Filters</p>
            <form className="search-row property-search" onSubmit={handleUnitSearch}>
              <input
                placeholder="Search by unit number or property"
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
                Property
                <select
                  value={filters.propertyId}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, propertyId: event.target.value }))
                  }
                >
                  <option value="">All properties</option>
                  {propertyOptions.map((property) => (
                    <option key={property.id} value={String(property.id)}>
                      {propertyOptionLabel(property)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="helper-text">The list updates from the database whenever filters change.</p>
          </article>
        </div>

        <div className="property-main-grid">
          <section className="property-list-column">
            <div className="glass content-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Unit list</p>
                  <h2>Database-backed unit inventory</h2>
                </div>
                <div className="section-tools">
                  {loadingCatalog ? <span className="pill">Refreshing...</span> : null}
                  <span className="pill">{units.length} records</span>
                </div>
              </div>

              <div className="property-card-grid">
                {units.map((unit) => (
                  <UnitCard
                    key={unit.id}
                    canManageUnits={canManageUnits}
                    isSelected={unit.id === selectedUnitId}
                    onDelete={handleDeleteUnit}
                    onEdit={startEditUnit}
                    onSelect={handleUnitSelect}
                    unit={unit}
                  />
                ))}
              </div>

              {!loadingCatalog && !units.length ? (
                <div className="empty-state">
                  <strong>No units found.</strong>
                  <span>Try a different filter or create the first unit record.</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="property-detail-column">
            {unitFormMode === 'create' || unitFormMode === 'edit' ? (
              <UnitForm
                busy={unitBusy}
                canManageUnits={canManageUnits}
                mode={unitFormMode}
                onCancel={cancelUnitForm}
                onSubmit={handleUnitSubmit}
                propertyOptions={propertyOptions}
                setUnitForm={setUnitForm}
                statusOptions={statusOptions}
                unitForm={unitForm}
              />
            ) : (
              <UnitDetail
                canManageUnits={canManageUnits}
                loading={loadingUnit}
                onDelete={handleDeleteUnit}
                onEdit={startEditUnit}
                unit={selectedUnit}
              />
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default UnitsScreen;

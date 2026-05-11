import { useEffect, useMemo, useState } from 'react';
import { createLease, deleteLease, getLeases, getProperties, getTenants, getUnits, updateLease } from './api';

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

function formatDate(value) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}

function opStatusClass(status) {
  switch (status) {
    case 'occupied':
      return 'status-badge warning';
    case 'maintenance':
      return 'status-badge danger';
    case 'inactive':
      return 'status-badge muted';
    case 'active':
    default:
      return 'status-badge active';
  }
}

function leaseStatusClass(status) {
  switch (status) {
    case 'active':
      return 'status-badge active';
    case 'expiring':
    case 'notice':
      return 'status-badge warning';
    case 'ended':
      return 'status-badge muted';
    case 'draft':
    default:
      return 'status-badge blue';
  }
}

function OpsMetricCard({ label, value, hint }) {
  return (
    <article className="property-metric-card green">
      <div className="property-metric-top">
        <span className="property-metric-icon green" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4.5 20.25H19.5M6.75 18V8.25L12 4.5L17.25 8.25V18M9 18V13.5h6V18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="property-metric-copy">
          <span className="property-metric-label">{label}</span>
          <strong className="property-metric-value">{value}</strong>
        </div>
      </div>
      <div className="property-metric-bottom">
        <span className="property-metric-hint">{hint}</span>
      </div>
    </article>
  );
}

function OpsPanel({ eyebrow, title, children, tone = 'default' }) {
  return (
    <article className={`glass content-card ops-panel ${tone}`}>
      <div className="section-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
      </div>
      {children}
    </article>
  );
}

const defaultLeaseForm = {
  id: '',
  tenantId: '',
  unitId: '',
  leaseStartDate: '',
  leaseEndDate: '',
  noticeDate: '',
  moveOutDate: '',
  rentAmount: '',
  securityDeposit: '',
  serviceCharge: '',
  electricityMeterNo: '',
  gasMeterNo: '',
  status: 'draft',
  notes: ''
};

export default function OperationsScreen({ csrfToken = '' }) {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [leases, setLeases] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [leaseLoading, setLeaseLoading] = useState(false);
  const [leaseSaving, setLeaseSaving] = useState(false);
  const [error, setError] = useState('');
  const [leaseError, setLeaseError] = useState('');
  const [leaseForm, setLeaseForm] = useState(defaultLeaseForm);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const [propertiesResponse, unitsResponse, tenantsResponse] = await Promise.all([
          getProperties({ limit: 100 }),
          getUnits({ limit: 100 }),
          getTenants({ limit: 100 })
        ]);

        if (!mounted) {
          return;
        }

        setProperties(propertiesResponse.properties || []);
        setUnits(unitsResponse.units || []);
        setTenants(tenantsResponse.tenants || []);
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load operations workspace.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadLeases() {
      setLeaseLoading(true);
      setLeaseError('');

      try {
        const data = await getLeases({ limit: 100, propertyId: selectedPropertyId || '' });

        if (mounted) {
          setLeases(data.leases || []);
        }
      } catch (err) {
        if (mounted) {
          setLeaseError(err.message || 'Failed to load lease records.');
        }
      } finally {
        if (mounted) {
          setLeaseLoading(false);
        }
      }
    }

    loadLeases();

    return () => {
      mounted = false;
    };
  }, [selectedPropertyId]);

  const selectedProperty = useMemo(
    () => properties.find((property) => String(property.id) === String(selectedPropertyId)) || null,
    [properties, selectedPropertyId]
  );

  const filteredUnits = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return units.filter((unit) => {
      const propertyMatch = !selectedPropertyId || String(unit.propertyId) === String(selectedPropertyId);
      if (!propertyMatch) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        unit.unitNumber,
        unit.property?.name,
        unit.property?.city,
        unit.property?.propertyType?.name,
        unit.statusLabel
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [query, selectedPropertyId, units]);

  const filteredTenants = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return tenants.filter((tenant) => {
      const propertyMatch =
        !selectedPropertyId ||
        String(tenant.unit?.propertyId || tenant.unit?.property?.id || '') === String(selectedPropertyId);

      if (!propertyMatch) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [tenant.fullName, tenant.email, tenant.phone, tenant.unit?.unitNumber, tenant.unit?.property?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [query, selectedPropertyId, tenants]);

  const filteredLeases = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return leases.filter((lease) => {
      const propertyMatch =
        !selectedPropertyId || String(lease.property?.id || '') === String(selectedPropertyId);

      if (!propertyMatch) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        lease.tenant?.fullName,
        lease.unit?.unitNumber,
        lease.property?.name,
        lease.property?.city,
        lease.statusLabel,
        lease.notes
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [leases, query, selectedPropertyId]);

  const stats = useMemo(() => {
    const occupiedUnits = units.filter((unit) => unit.status === 'occupied').length;
    const vacantUnits = units.filter((unit) => unit.status === 'available').length;
    const activeTenants = tenants.filter((tenant) => tenant.status === 'active').length;
    const leaseReadyUnits = units.filter((unit) => unit.status === 'available').length;
    const expiringLeases = tenants.filter((tenant) => tenant.moveInDate && tenant.status === 'active').length;
    const activeLeases = leases.filter((lease) => lease.status === 'active').length;
    const noticeLeases = leases.filter((lease) => lease.status === 'notice').length;

    return {
      buildings: properties.length,
      units: units.length,
      occupiedUnits,
      vacantUnits,
      activeTenants,
      leaseReadyUnits,
      expiringLeases,
      activeLeases,
      noticeLeases
    };
  }, [leases, properties.length, tenants, units]);

  const propertyOptions = useMemo(() => [{ id: '', name: 'All buildings' }, ...properties], [properties]);
  const unitOptions = useMemo(() => {
    const baseUnits = selectedPropertyId
      ? units.filter((unit) => String(unit.propertyId) === String(selectedPropertyId))
      : units;

    return baseUnits.map((unit) => ({
      id: unit.id,
      label: `${unit.unitNumber} · ${unit.property?.name || 'Property'}`
    }));
  }, [selectedPropertyId, units]);

  const tenantOptions = useMemo(() => {
    const baseTenants = selectedPropertyId
      ? tenants.filter(
          (tenant) => String(tenant.unit?.propertyId || tenant.unit?.property?.id || '') === String(selectedPropertyId)
        )
      : tenants;

    return baseTenants.map((tenant) => ({
      id: tenant.id,
      label: `${tenant.fullName} · ${tenant.unit?.unitNumber || 'No unit'}`
    }));
  }, [selectedPropertyId, tenants]);

  function resetLeaseForm() {
    setLeaseForm(defaultLeaseForm);
    setLeaseError('');
  }

  function handleLeaseEdit(lease) {
    setLeaseForm({
      id: lease.id,
      tenantId: String(lease.tenantId || lease.tenant?.id || ''),
      unitId: String(lease.unitId || lease.unit?.id || ''),
      leaseStartDate: lease.leaseStartDate || '',
      leaseEndDate: lease.leaseEndDate || '',
      noticeDate: lease.noticeDate || '',
      moveOutDate: lease.moveOutDate || '',
      rentAmount: lease.rentAmount ?? '',
      securityDeposit: lease.securityDeposit ?? '',
      serviceCharge: lease.serviceCharge ?? '',
      electricityMeterNo: lease.electricityMeterNo || '',
      gasMeterNo: lease.gasMeterNo || '',
      status: lease.status || 'draft',
      notes: lease.notes || ''
    });
  }

  async function handleLeaseSubmit(event) {
    event.preventDefault();
    setLeaseSaving(true);
    setLeaseError('');

    try {
      const payload = {
        ...leaseForm,
        csrfToken,
        id: leaseForm.id ? Number(leaseForm.id) : undefined,
        tenantId: Number(leaseForm.tenantId),
        unitId: Number(leaseForm.unitId)
      };

      const response = leaseForm.id ? await updateLease(payload) : await createLease(payload);
      const updatedLease = response.lease;

      setLeases((current) => {
        const rest = current.filter((item) => String(item.id) !== String(updatedLease.id));
        return [updatedLease, ...rest].sort(
          (left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0)
        );
      });
      resetLeaseForm();
    } catch (err) {
      setLeaseError(err.message || 'Failed to save lease.');
    } finally {
      setLeaseSaving(false);
    }
  }

  async function handleLeaseDelete(leaseId) {
    const confirmed = window.confirm('Delete this lease record?');
    if (!confirmed) {
      return;
    }

    setLeaseSaving(true);
    setLeaseError('');

    try {
      await deleteLease({ id: leaseId, csrfToken });
      setLeases((current) => current.filter((item) => String(item.id) !== String(leaseId)));
      if (String(leaseForm.id) === String(leaseId)) {
        resetLeaseForm();
      }
    } catch (err) {
      setLeaseError(err.message || 'Failed to delete lease.');
    } finally {
      setLeaseSaving(false);
    }
  }

  return (
    <section className="dashboard-grid">
      <header className="glass content-card property-header">
        <div className="section-header">
          <div>
            <p className="eyebrow">Operations</p>
            <h2>Rental Operations</h2>
            <p className="muted">
              Buildings, units, tenants, and the lease lifecycle in one operational workspace.
            </p>
          </div>
          <div className="section-tools">
            <button className="secondary-btn ghost-btn" type="button">
              Lease Studio
            </button>
            <button className="primary-btn" type="button">
              Add building
            </button>
          </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}

        <div className="property-metrics-grid">
          <OpsMetricCard label="Buildings" value={stats.buildings} hint="Active property records" />
          <OpsMetricCard label="Units / Shops" value={stats.units} hint="Units available in the system" />
          <OpsMetricCard label="Occupied" value={stats.occupiedUnits} hint="Currently leased out" />
          <OpsMetricCard label="Vacant" value={stats.vacantUnits} hint="Ready for assignment" />
        </div>
      </header>

      <article className="glass content-card ops-lease-workspace">
        <div className="section-header">
          <div>
            <p className="eyebrow">Leases</p>
            <h2>Lease planning and active agreements</h2>
            <p className="muted">
              Create lease records, set notice and move-out dates, and keep meter references linked to each unit.
            </p>
          </div>
          <div className="section-tools">
            <span className="pill">{stats.activeLeases} active</span>
            <span className="pill">{stats.noticeLeases} notice</span>
            <button className="secondary-btn ghost-btn" type="button" onClick={resetLeaseForm}>
              New lease
            </button>
          </div>
        </div>

        {leaseError ? <div className="alert error">{leaseError}</div> : null}

        <div className="ops-lease-grid">
          <article className="lease-form-card">
            <div className="section-header compact">
              <div>
                <p className="eyebrow">{leaseForm.id ? 'Edit lease' : 'Create lease'}</p>
                <h3>{leaseForm.id ? 'Update rental agreement' : 'Add a tenant to a unit'}</h3>
              </div>
            </div>

            <form className="form-grid lease-form-grid" onSubmit={handleLeaseSubmit}>
              <label>
                Tenant
                <select
                  required
                  value={leaseForm.tenantId}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, tenantId: event.target.value }))}
                >
                  <option value="">Choose tenant</option>
                  {tenantOptions.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Unit
                <select
                  required
                  value={leaseForm.unitId}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, unitId: event.target.value }))}
                >
                  <option value="">Choose unit</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Lease start
                <input
                  required
                  type="date"
                  value={leaseForm.leaseStartDate}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, leaseStartDate: event.target.value }))}
                />
              </label>

              <label>
                Lease end
                <input
                  type="date"
                  value={leaseForm.leaseEndDate}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, leaseEndDate: event.target.value }))}
                />
              </label>

              <label>
                Notice date
                <input
                  type="date"
                  value={leaseForm.noticeDate}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, noticeDate: event.target.value }))}
                />
              </label>

              <label>
                Move-out date
                <input
                  type="date"
                  value={leaseForm.moveOutDate}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, moveOutDate: event.target.value }))}
                />
              </label>

              <label>
                Monthly rent
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={leaseForm.rentAmount}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, rentAmount: event.target.value }))}
                />
              </label>

              <label>
                Security deposit
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={leaseForm.securityDeposit}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, securityDeposit: event.target.value }))}
                />
              </label>

              <label>
                Service charge
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={leaseForm.serviceCharge}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, serviceCharge: event.target.value }))}
                />
              </label>

              <label>
                Electricity meter
                <input
                  type="text"
                  value={leaseForm.electricityMeterNo}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, electricityMeterNo: event.target.value }))}
                />
              </label>

              <label>
                Gas meter
                <input
                  type="text"
                  value={leaseForm.gasMeterNo}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, gasMeterNo: event.target.value }))}
                />
              </label>

              <label>
                Status
                <select
                  value={leaseForm.status}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="expiring">Expiring</option>
                  <option value="notice">Notice Sent</option>
                  <option value="ended">Ended</option>
                </select>
              </label>

              <label className="lease-notes-field">
                Notes
                <textarea
                  rows="4"
                  value={leaseForm.notes}
                  onChange={(event) => setLeaseForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Agreement notes, reminders, special terms, or move-out instructions."
                />
              </label>

              <div className="lease-form-actions">
                <button className="primary-btn" type="submit" disabled={leaseSaving}>
                  {leaseSaving ? 'Saving...' : leaseForm.id ? 'Update lease' : 'Create lease'}
                </button>
                <button className="secondary-btn" type="button" onClick={resetLeaseForm} disabled={leaseSaving}>
                  Clear
                </button>
              </div>
            </form>
          </article>

          <article className="lease-list-card">
            <div className="section-header compact">
              <div>
                <p className="eyebrow">Lease records</p>
                <h3>{selectedProperty ? selectedProperty.name : 'All leases'}</h3>
              </div>
              <div className="section-tools">
                <span className="pill">{filteredLeases.length} records</span>
                {leaseLoading ? <span className="pill">Refreshing...</span> : null}
              </div>
            </div>

            <div className="table-wrap">
              <table className="property-table lease-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Unit</th>
                    <th>Dates</th>
                    <th>Rent</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeases.map((lease) => (
                    <tr key={lease.id}>
                      <td>
                        <div className="property-location-cell">
                          <strong>{lease.tenant?.fullName || 'Unknown tenant'}</strong>
                          <span>{lease.tenant?.email || lease.tenant?.phone || 'No contact'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="property-location-cell">
                          <strong>{lease.unit?.unitNumber || 'Unknown unit'}</strong>
                          <span>{lease.property?.name || 'No property'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="property-location-cell">
                          <strong>{formatDate(lease.leaseStartDate)}</strong>
                          <span>{lease.leaseEndDate ? `Ends ${formatDate(lease.leaseEndDate)}` : 'Open ended'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="property-units-cell">
                          <strong>{formatAmount(lease.rentAmount)}</strong>
                          <span>Deposit {formatAmount(lease.securityDeposit)}</span>
                        </div>
                      </td>
                      <td>
                        <span className={leaseStatusClass(lease.status)}>{lease.statusLabel}</span>
                      </td>
                      <td>
                        <div className="property-row-actions">
                          <button className="icon-btn" type="button" onClick={() => handleLeaseEdit(lease)}>
                            Edit
                          </button>
                          <button className="icon-btn danger" type="button" onClick={() => handleLeaseDelete(lease.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!leaseLoading && filteredLeases.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <div className="empty-state property-empty-state">
                          <strong>No lease records yet.</strong>
                          <span>Create the first lease to start tracking dates, meters, and billing.</span>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </article>

      <div className="property-layout">
        <article className="glass content-card property-toolbar">
          <div className="property-toolbar-heading">
            <p className="eyebrow">Search</p>
            <h3>Track a building, unit, or tenant</h3>
          </div>

          <form className="property-toolbar-row" onSubmit={(event) => event.preventDefault()}>
            <label className="property-search-field">
              <span className="sr-only">Search operations</span>
              <input
                placeholder="Search by building, unit, tenant, or city..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
              />
            </label>

            <label className="property-select-field">
              <span className="sr-only">Building filter</span>
              <select value={selectedPropertyId} onChange={(event) => setSelectedPropertyId(event.target.value)}>
                {propertyOptions.map((property) => (
                  <option key={property.id || 'all'} value={String(property.id)}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>

            <button className="secondary-btn property-filter-btn" type="button" disabled={loading}>
              {loading ? 'Loading...' : 'Filters'}
            </button>
          </form>
        </article>

        <section className="glass content-card property-list-column property-list-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Buildings</p>
              <h2>{selectedProperty ? selectedProperty.name : 'All properties'}</h2>
              <p className="muted">
                {selectedProperty
                  ? 'Use this view to drive a future lease, utility, and billing workflow.'
                  : 'Pick a building to inspect the unit and tenant structure underneath it.'}
              </p>
            </div>
            <div className="section-tools">
              <span className="pill">{filteredUnits.length} units</span>
              <span className="pill">{filteredTenants.length} tenants</span>
            </div>
          </div>

          <div className="property-table-wrap">
            <div className="table-wrap">
              <table className="property-table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Property</th>
                    <th>Tenant</th>
                    <th>Lease</th>
                    <th>Utilities</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && filteredUnits.length
                    ? filteredUnits.map((unit) => {
                        const tenant = tenants.find((item) => String(item.unit?.id || '') === String(unit.id)) || null;
                        return (
                          <tr key={unit.id}>
                            <td>
                              <div className="property-location-cell">
                                <strong>{unit.unitNumber}</strong>
                                <span>{unit.property?.propertyType?.name || 'Untyped'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="property-location-cell">
                                <strong>{unit.property?.name || 'Unknown'}</strong>
                                <span>{unit.property?.city || 'No city'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="property-location-cell">
                                <strong>{tenant?.fullName || 'No tenant'}</strong>
                                <span>{tenant?.moveInDate ? `Move-in ${formatDate(tenant.moveInDate)}` : 'Vacant or new unit'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="property-units-cell">
                                <strong>{tenant?.moveInDate ? 'Lease active' : 'No lease yet'}</strong>
                                <span>{tenant?.statusLabel || 'Awaiting assignment'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="property-rent-cell">
                                <strong>{formatAmount(unit.monthlyRent)}</strong>
                                <span>Base rent</span>
                              </div>
                            </td>
                            <td>
                              <span className={opStatusClass(unit.status)}>{unit.statusLabel}</span>
                            </td>
                          </tr>
                        );
                      })
                    : null}
                  {!loading && !filteredUnits.length ? (
                    <tr>
                      <td colSpan="6">
                        <div className="empty-state property-empty-state">
                          <strong>No operational records yet.</strong>
                          <span>Add buildings, units, and tenants to start the lease workflow.</span>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="property-table-footer">
            <span>
              Buildings: {properties.length} | Units: {units.length} | Tenants: {tenants.length}
            </span>
            <span className="pill">Future-ready for leases, bills, arrears, and notices</span>
          </div>
        </section>

        <div className="operations-grid">
          <OpsPanel eyebrow="Lease lifecycle" title="Active and upcoming leases" tone="green">
            <div className="operations-stack">
              <div className="helper-card">
                <strong>Lease ready units</strong>
                <span>{stats.leaseReadyUnits} units can accept new tenants right now.</span>
              </div>
              <div className="helper-card">
                <strong>Expiring soon</strong>
                <span>{stats.expiringLeases} tenant records are active and ready for lease tracking.</span>
              </div>
              <div className="helper-card">
                <strong>Move-out notices</strong>
                <span>Connect notice dates and move-out workflows from the next lease module.</span>
              </div>
            </div>
          </OpsPanel>

          <OpsPanel eyebrow="Documents" title="Tenant files and identity records" tone="blue">
            <div className="operations-stack">
              <div className="helper-card">
                <strong>Agreement copies</strong>
                <span>Store lease agreements, renewals, and signed addendums per tenant.</span>
              </div>
              <div className="helper-card">
                <strong>National ID / Trade license</strong>
                <span>Attach tenant identity documents and commercial trade licences.</span>
              </div>
              <div className="helper-card">
                <strong>File retention</strong>
                <span>Keep every document linked to its building, unit, and lease record.</span>
              </div>
            </div>
          </OpsPanel>

          <OpsPanel eyebrow="Billing" title="Utilities, totals, and arrears" tone="amber">
            <div className="operations-stack">
              <div className="helper-card">
                <strong>Monthly utility build-up</strong>
                <span>Electricity, gas, service charge, and add-ons will roll into the monthly bill.</span>
              </div>
              <div className="helper-card">
                <strong>Arrears tracking</strong>
                <span>Overdue amounts can generate notices and remain visible until resolved.</span>
              </div>
              <div className="helper-card">
                <strong>Payment due dates</strong>
                <span>Store bill month, due date, paid amount, and outstanding balance per lease.</span>
              </div>
            </div>
          </OpsPanel>
        </div>
      </div>
    </section>
  );
}

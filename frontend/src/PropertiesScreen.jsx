import { useEffect, useMemo, useState } from 'react';
import {
  createProperty,
  createPropertyType,
  deleteProperty,
  deletePropertyImage,
  deletePropertyType,
  getProperties,
  getProperty,
  listPropertyTypes,
  updateProperty,
  updatePropertyType,
  uploadPropertyImage
} from './api';

const PROPERTY_STATUS_OPTIONS = {
  all: 'All statuses',
  available: 'Available',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
  inactive: 'Inactive'
};

const defaultPropertyForm = (propertyTypes = []) => ({
  propertyTypeId: propertyTypes[0]?.id ? String(propertyTypes[0].id) : '',
  name: '',
  status: 'available',
  description: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Bangladesh',
  bedrooms: '0',
  bathrooms: '0',
  areaSqft: '',
  monthlyRent: '0',
  securityDeposit: '0',
  notes: ''
});

const defaultPropertyTypeForm = {
  name: '',
  description: '',
  isActive: true
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

function formatArea(value) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number) || number <= 0) {
    return 'n/a';
  }

  return new Intl.NumberFormat('en-US').format(number) + ' sqft';
}

function formatAddress(property) {
  if (!property) {
    return 'No property selected';
  }

  return property.addressLabel || [property.addressLine1, property.city, property.state].filter(Boolean).join(', ');
}

function propertyTypeLabel(type) {
  if (!type) {
    return 'Untyped';
  }

  return type.name || 'Untyped';
}

function propertyTypeBadge(type) {
  if (!type) {
    return 'status-badge muted';
  }

  return type.isActive ? 'status-badge active' : 'status-badge muted';
}

function propertyStatusClass(status) {
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

function propertyFormFromProperty(property, propertyTypes = []) {
  if (!property) {
    return defaultPropertyForm(propertyTypes);
  }

  return {
    propertyTypeId: String(property.propertyTypeId || property.propertyType?.id || ''),
    name: property.name || '',
    status: property.status || 'available',
    description: property.description || '',
    addressLine1: property.addressLine1 || '',
    addressLine2: property.addressLine2 || '',
    city: property.city || '',
    state: property.state || '',
    postalCode: property.postalCode || '',
    country: property.country || 'Bangladesh',
    bedrooms: String(property.bedrooms ?? 0),
    bathrooms: String(property.bathrooms ?? 0),
    areaSqft: property.areaSqft ? String(property.areaSqft) : '',
    monthlyRent: String(property.monthlyRent ?? 0),
    securityDeposit: String(property.securityDeposit ?? 0),
    notes: property.notes || ''
  };
}

function propertyTypeFormFromType(type) {
  if (!type) {
    return defaultPropertyTypeForm;
  }

  return {
    name: type.name || '',
    description: type.description || '',
    isActive: Boolean(type.isActive)
  };
}

function PropertyCard({ property, canManageProperties, isSelected, onSelect, onEdit, onDelete }) {
  return (
    <article className={isSelected ? 'property-card selected glass' : 'property-card glass'}>
      <button className="property-card-media" type="button" onClick={() => onSelect(property.id)}>
        {property.coverImageUrl ? (
          <img src={property.coverImageUrl} alt={property.coverImageCaption || property.name} />
        ) : (
          <div className="property-card-placeholder">
            <span>{property.propertyType?.name ? property.propertyType.name.slice(0, 2).toUpperCase() : 'PR'}</span>
          </div>
        )}
      </button>

      <div className="property-card-body">
        <div className="property-card-topline">
          <div>
            <strong>{property.name}</strong>
            <span>{propertyTypeLabel(property.propertyType)}</span>
          </div>
          <span className={propertyStatusClass(property.status)}>{property.statusLabel}</span>
        </div>

        <p className="property-card-address">{formatAddress(property)}</p>

        <dl className="property-card-meta">
          <div>
            <dt>Rent</dt>
            <dd>{formatAmount(property.monthlyRent)}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{formatArea(property.areaSqft)}</dd>
          </div>
          <div>
            <dt>Images</dt>
            <dd>{property.imageCount ?? 0}</dd>
          </div>
        </dl>

        <div className="property-card-actions">
          <button className="secondary-btn" type="button" onClick={() => onSelect(property.id)}>
            View
          </button>
          {canManageProperties ? (
            <>
              <button className="secondary-btn" type="button" onClick={() => onEdit(property)}>
                Edit
              </button>
              <button className="secondary-btn danger-btn" type="button" onClick={() => onDelete(property)}>
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PropertyDetail({
  property,
  canManageProperties,
  loading,
  onEdit,
  onDelete,
  onUploadImage,
  onDeleteImage,
  imageState,
  setImageState,
  uploadBusy
}) {
  if (!property) {
    return (
      <section className="glass content-card property-detail">
        <p className="eyebrow">Property detail</p>
        <h2>{loading ? 'Loading property details...' : 'No property selected'}</h2>
        <p className="muted">
          {loading
            ? 'Fetching the full property record from the backend.'
            : 'Pick a property from the list to see its details, gallery, and actions.'}
        </p>
      </section>
    );
  }

  return (
    <section className="glass content-card property-detail">
      <div className="section-header">
        <div>
          <p className="eyebrow">Property detail</p>
          <h2>{property.name}</h2>
          <p className="muted">{formatAddress(property)}</p>
        </div>

        <div className="section-tools">
          <span className={propertyStatusClass(property.status)}>{property.statusLabel}</span>
          {property.propertyType ? <span className={propertyTypeBadge(property.propertyType)}>{property.propertyType.name}</span> : null}
        </div>
      </div>

      <div className="property-hero">
        <div className="property-hero-media">
          {property.coverImageUrl ? (
            <img src={property.coverImageUrl} alt={property.coverImageCaption || property.name} />
          ) : (
            <div className="property-hero-placeholder">
              <span>No image yet</span>
            </div>
          )}
        </div>

        <dl className="property-meta-grid">
          <div>
            <dt>Rent</dt>
            <dd>{formatAmount(property.monthlyRent)}</dd>
          </div>
          <div>
            <dt>Deposit</dt>
            <dd>{formatAmount(property.securityDeposit)}</dd>
          </div>
          <div>
            <dt>Bedrooms</dt>
            <dd>{property.bedrooms ?? 0}</dd>
          </div>
          <div>
            <dt>Bathrooms</dt>
            <dd>{property.bathrooms ?? 0}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{formatArea(property.areaSqft)}</dd>
          </div>
          <div>
            <dt>Images</dt>
            <dd>{property.imageCount ?? 0}</dd>
          </div>
        </dl>
      </div>

      <div className="property-info-grid">
        <article className="helper-card">
          <strong>Address</strong>
          <span>{formatAddress(property)}</span>
        </article>

        <article className="helper-card">
          <strong>Type</strong>
          <span>{property.propertyType?.name || 'Untyped'}</span>
        </article>

        <article className="helper-card">
          <strong>Last updated</strong>
          <span>{formatDateTime(property.updatedAt)}</span>
        </article>

        <article className="helper-card">
          <strong>Created</strong>
          <span>{formatDateTime(property.createdAt)}</span>
        </article>

        {property.createdBy ? (
          <article className="helper-card">
            <strong>Created by</strong>
            <span>{property.createdBy.name || 'Unknown'}</span>
          </article>
        ) : null}
      </div>

      {property.description ? (
        <article className="helper-card">
          <strong>Description</strong>
          <span>{property.description}</span>
        </article>
      ) : null}

      {property.notes ? (
        <article className="helper-card">
          <strong>Notes</strong>
          <span>{property.notes}</span>
        </article>
      ) : null}

      {canManageProperties ? (
        <div className="property-detail-actions">
          <button className="primary-btn" type="button" onClick={() => onEdit(property)}>
            Edit property
          </button>
          <button className="secondary-btn danger-btn" type="button" onClick={() => onDelete(property)}>
            Delete property
          </button>
        </div>
      ) : null}

      <article className="property-gallery">
        <div className="section-header">
          <div>
            <p className="eyebrow">Gallery</p>
            <h3>Property images</h3>
          </div>
          <span className="pill">{property.images?.length || 0} images</span>
        </div>

        <div className="gallery-grid">
          {(property.images || []).map((image) => (
            <figure key={image.id} className={image.isPrimary ? 'gallery-item primary' : 'gallery-item'}>
              {image.imageUrl ? <img src={image.imageUrl} alt={image.caption || property.name} /> : null}
              <figcaption>
                <strong>{image.caption || 'Untitled image'}</strong>
                <span>{image.isPrimary ? 'Primary image' : 'Secondary image'}</span>
              </figcaption>
              {canManageProperties ? (
                <button className="secondary-btn danger-btn gallery-delete" type="button" onClick={() => onDeleteImage(image)}>
                  Remove
                </button>
              ) : null}
            </figure>
          ))}

          {!property.images?.length ? (
            <div className="empty-state gallery-empty">
              <strong>No images yet.</strong>
              <span>Upload one to give the property a gallery cover.</span>
            </div>
          ) : null}
        </div>

        {canManageProperties ? (
          <form className="form-grid upload-form" onSubmit={onUploadImage}>
            <label className="photo-dropzone">
              <input
                accept="image/jpeg,image/png,image/webp"
                key={imageState.fileInputKey}
                type="file"
                onChange={(event) => setImageState((current) => ({ ...current, file: event.target.files?.[0] ?? null }))}
              />
              <div>
                <strong>{imageState.file ? imageState.file.name : 'Choose an image to upload'}</strong>
                <span>JPEG, PNG, or WebP up to 3 MB.</span>
              </div>
            </label>

            <label>
              Caption
              <input
                type="text"
                value={imageState.caption}
                onChange={(event) => setImageState((current) => ({ ...current, caption: event.target.value }))}
                placeholder="Optional caption"
              />
            </label>

            <label className="checkbox-field">
              <input
                checked={imageState.makePrimary}
                type="checkbox"
                onChange={(event) => setImageState((current) => ({ ...current, makePrimary: event.target.checked }))}
              />
              <span>Make this the primary image</span>
            </label>

            <button className="primary-btn" type="submit" disabled={uploadBusy}>
              {uploadBusy ? 'Uploading...' : 'Upload image'}
            </button>
          </form>
        ) : null}
      </article>
    </section>
  );
}

function PropertyForm({ mode, canManageProperties, propertyForm, propertyTypes, setPropertyForm, onSubmit, onCancel, busy }) {
  const title = mode === 'create' ? 'Add property' : 'Edit property';

  return (
    <section className="glass content-card property-form-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Property editor</p>
          <h2>{title}</h2>
        </div>
        <button className="secondary-btn" type="button" onClick={onCancel}>
          Back to detail
        </button>
      </div>

      {!canManageProperties ? (
        <div className="alert warning">You can view properties, but only managers and owners can edit them.</div>
      ) : null}

      <form className="form-grid property-form" onSubmit={onSubmit}>
        <label>
          Property type
          <select
            required
            value={propertyForm.propertyTypeId}
            onChange={(event) =>
              setPropertyForm((current) => ({ ...current, propertyTypeId: event.target.value }))
            }
          >
            <option value="">Select a type</option>
            {propertyTypes.map((type) => (
              <option key={type.id} value={String(type.id)}>
                {type.name}
                {type.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </select>
        </label>

        <label>
          Property name
          <input
            required
            type="text"
            value={propertyForm.name}
            onChange={(event) =>
              setPropertyForm((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>

        <label>
          Status
          <select
            value={propertyForm.status}
            onChange={(event) =>
              setPropertyForm((current) => ({ ...current, status: event.target.value }))
            }
          >
            {Object.entries(PROPERTY_STATUS_OPTIONS).filter(([key]) => key !== 'all').map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Address line 1
          <input
            required
            type="text"
            value={propertyForm.addressLine1}
            onChange={(event) =>
              setPropertyForm((current) => ({ ...current, addressLine1: event.target.value }))
            }
          />
        </label>

        <label>
          Address line 2
          <input
            type="text"
            value={propertyForm.addressLine2}
            onChange={(event) =>
              setPropertyForm((current) => ({ ...current, addressLine2: event.target.value }))
            }
          />
        </label>

        <div className="form-two-up">
          <label>
            City
            <input
              required
              type="text"
              value={propertyForm.city}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, city: event.target.value }))
              }
            />
          </label>

          <label>
            State
            <input
              required
              type="text"
              value={propertyForm.state}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, state: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="form-two-up">
          <label>
            Postal code
            <input
              required
              type="text"
              value={propertyForm.postalCode}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, postalCode: event.target.value }))
              }
            />
          </label>

          <label>
            Country
            <input
              required
              type="text"
              value={propertyForm.country}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, country: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="form-three-up">
          <label>
            Bedrooms
            <input
              min="0"
              type="number"
              value={propertyForm.bedrooms}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, bedrooms: event.target.value }))
              }
            />
          </label>

          <label>
            Bathrooms
            <input
              min="0"
              step="0.5"
              type="number"
              value={propertyForm.bathrooms}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, bathrooms: event.target.value }))
              }
            />
          </label>

          <label>
            Area sqft
            <input
              min="0"
              type="number"
              value={propertyForm.areaSqft}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, areaSqft: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="form-two-up">
          <label>
            Monthly rent
            <input
              min="0"
              step="0.01"
              type="number"
              value={propertyForm.monthlyRent}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, monthlyRent: event.target.value }))
              }
            />
          </label>

          <label>
            Security deposit
            <input
              min="0"
              step="0.01"
              type="number"
              value={propertyForm.securityDeposit}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, securityDeposit: event.target.value }))
              }
            />
          </label>
        </div>

        <label>
          Description
          <textarea
            rows="4"
            value={propertyForm.description}
            onChange={(event) =>
              setPropertyForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </label>

        <label>
          Notes
          <textarea
            rows="3"
            value={propertyForm.notes}
            onChange={(event) =>
              setPropertyForm((current) => ({ ...current, notes: event.target.value }))
            }
          />
        </label>

        <div className="property-form-actions">
          <button className="primary-btn" type="submit" disabled={busy || !canManageProperties}>
            {busy ? 'Saving...' : mode === 'create' ? 'Create property' : 'Save changes'}
          </button>
          <button className="secondary-btn" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function PropertyTypesPanel({ canManagePropertyTypes, propertyTypes, typeFormMode, typeForm, setTypeForm, onCreateType, onEditType, onDeleteType, onSubmitType, onCancelType, busy }) {
  return (
    <section className="dashboard-grid">
      <div className="content-grid">
        <article className="glass content-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Type management</p>
              <h2>Property types</h2>
            </div>
            {canManagePropertyTypes ? (
              <button className="secondary-btn" type="button" onClick={onCreateType}>
                Add type
              </button>
            ) : null}
          </div>

          {!canManagePropertyTypes ? (
            <div className="alert warning">Only the owner can create, edit, or delete property types.</div>
          ) : null}

          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Properties</th>
                  <th>Updated</th>
                  {canManagePropertyTypes ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {propertyTypes.map((type) => (
                  <tr key={type.id}>
                    <td>
                      <strong>{type.name}</strong>
                      <small>{type.description || 'No description yet'}</small>
                    </td>
                    <td>
                      <span className={type.isActive ? 'status-badge active' : 'status-badge muted'}>
                        {type.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{type.propertyCount ?? 0}</td>
                    <td>{formatDateTime(type.updatedAt)}</td>
                    {canManagePropertyTypes ? (
                      <td>
                        <div className="table-security">
                          <button className="secondary-btn" type="button" onClick={() => onEditType(type)}>
                            Edit
                          </button>
                          <button className="secondary-btn danger-btn" type="button" onClick={() => onDeleteType(type)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}

                {!propertyTypes.length ? (
                  <tr>
                    <td colSpan={canManagePropertyTypes ? 5 : 4}>
                      <div className="empty-state">
                        <strong>No property types found.</strong>
                        <span>Create one to start organizing properties.</span>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        {canManagePropertyTypes ? (
          <article className="glass content-card">
            <p className="eyebrow">{typeFormMode === 'edit' ? 'Edit type' : 'Add type'}</p>
            <h2>{typeFormMode === 'edit' ? 'Update property type' : 'Create property type'}</h2>

            <form className="form-grid" onSubmit={onSubmitType}>
              <label>
                Type name
                <input
                  required
                  type="text"
                  value={typeForm.name}
                  onChange={(event) => setTypeForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label>
                Description
                <textarea
                  rows="4"
                  value={typeForm.description}
                  onChange={(event) =>
                    setTypeForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>

              <label className="checkbox-field">
                <input
                  checked={typeForm.isActive}
                  type="checkbox"
                  onChange={(event) =>
                    setTypeForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                <span>Type is active</span>
              </label>

              <div className="property-form-actions">
                <button className="primary-btn" type="submit" disabled={busy}>
                  {busy ? 'Saving...' : typeFormMode === 'edit' ? 'Save type' : 'Create type'}
                </button>
                <button className="secondary-btn" type="button" onClick={onCancelType}>
                  Cancel
                </button>
              </div>
            </form>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function PropertiesScreen({ csrfToken, setCsrfToken, session }) {
  const canManageProperties = Boolean(session?.permissions?.canManageProperties);
  const canManagePropertyTypes = Boolean(session?.permissions?.canManagePropertyTypes);

  const [activeTab, setActiveTab] = useState('properties');
  const [properties, setProperties] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [propertyFormMode, setPropertyFormMode] = useState('detail');
  const [propertyForm, setPropertyForm] = useState(defaultPropertyForm());
  const [typeFormMode, setTypeFormMode] = useState('');
  const [typeForm, setTypeForm] = useState(defaultPropertyTypeForm);
  const [typeEditingId, setTypeEditingId] = useState(null);
  const [filters, setFilters] = useState({
    query: '',
    status: 'all',
    propertyTypeId: ''
  });
  const [searchInput, setSearchInput] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingProperty, setLoadingProperty] = useState(false);
  const [propertyBusy, setPropertyBusy] = useState(false);
  const [propertyTypeBusy, setPropertyTypeBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageState, setImageState] = useState({
    file: null,
    fileInputKey: 0,
    caption: '',
    makePrimary: true
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const propertyTypeOptions = useMemo(() => propertyTypes, [propertyTypes]);
  const currentPropertyCount = properties.length;
  const activeTypeCount = propertyTypes.filter((type) => type.isActive).length;

  async function loadCatalog(nextSelectedId = null) {
    setLoadingCatalog(true);
    setError('');

    try {
      const [propertiesResponse, typesResponse] = await Promise.all([
        getProperties({
          query: filters.query,
          status: filters.status,
          propertyTypeId: filters.propertyTypeId
        }),
        listPropertyTypes()
      ]);

      const nextProperties = propertiesResponse.properties || [];
      const nextTypes = typesResponse.propertyTypes || [];

      setProperties(nextProperties);
      setPropertyTypes(nextTypes);

      const visibleIds = new Set(nextProperties.map((property) => property.id));

      setSelectedPropertyId((current) => {
        if (nextSelectedId !== null && visibleIds.has(nextSelectedId)) {
          return nextSelectedId;
        }

        if (current !== null && visibleIds.has(current)) {
          return current;
        }

        return nextProperties[0]?.id ?? null;
      });

      if (!nextProperties.length) {
        setSelectedProperty(null);
        setLoadingProperty(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load properties.');
    } finally {
      setLoadingCatalog(false);
    }
  }

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, filters.status, filters.propertyTypeId]);

  useEffect(() => {
    if (!selectedPropertyId) {
      setSelectedProperty(null);
      setLoadingProperty(false);
      return;
    }

    let mounted = true;

    async function loadSelectedProperty() {
      setLoadingProperty(true);

      try {
        const data = await getProperty(selectedPropertyId);

        if (mounted) {
          setSelectedProperty(data.property || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load property details.');
        }
      } finally {
        if (mounted) {
          setLoadingProperty(false);
        }
      }
    }

    loadSelectedProperty();

    return () => {
      mounted = false;
    };
  }, [selectedPropertyId]);

  useEffect(() => {
    if (!selectedProperty) {
      return;
    }

    if (propertyFormMode === 'edit') {
      setPropertyForm(propertyFormFromProperty(selectedProperty, propertyTypeOptions));
    }
  }, [propertyFormMode, propertyTypeOptions, selectedProperty]);

  function resetMessages() {
    setError('');
    setNotice('');
  }

  function startCreateProperty() {
    if (!canManageProperties) {
      return;
    }

    resetMessages();
    setPropertyFormMode('create');
    setPropertyForm(defaultPropertyForm(propertyTypeOptions));
    setSelectedPropertyId(null);
    setSelectedProperty(null);
  }

  function startEditProperty(property) {
    if (!canManageProperties) {
      return;
    }

    resetMessages();
    setPropertyFormMode('edit');
    setSelectedPropertyId(property.id);
    setSelectedProperty(property);
    setPropertyForm(propertyFormFromProperty(property, propertyTypeOptions));
  }

  function cancelPropertyForm() {
    setPropertyFormMode('detail');

    if (selectedProperty) {
      setPropertyForm(propertyFormFromProperty(selectedProperty, propertyTypeOptions));
    } else {
      setPropertyForm(defaultPropertyForm(propertyTypeOptions));
    }
  }

  function startCreateType() {
    if (!canManagePropertyTypes) {
      return;
    }

    resetMessages();
    setTypeFormMode('create');
    setTypeEditingId(null);
    setTypeForm(defaultPropertyTypeForm);
  }

  function startEditType(type) {
    if (!canManagePropertyTypes) {
      return;
    }

    resetMessages();
    setTypeFormMode('edit');
    setTypeEditingId(type.id);
    setTypeForm(propertyTypeFormFromType(type));
  }

  function cancelTypeForm() {
    setTypeFormMode('');
    setTypeEditingId(null);
    setTypeForm(defaultPropertyTypeForm);
  }

  async function refreshAfterMutation(selectPropertyId = null) {
    await loadCatalog(selectPropertyId);

    if (selectPropertyId !== null) {
      setSelectedPropertyId(selectPropertyId);
      try {
        const data = await getProperty(selectPropertyId);
        setSelectedProperty(data.property || null);
      } catch {
        setSelectedProperty(null);
      }
    } else if (selectedPropertyId !== null) {
      try {
        const data = await getProperty(selectedPropertyId);
        setSelectedProperty(data.property || null);
      } catch {
        setSelectedProperty(null);
      }
    }
  }

  async function handlePropertySubmit(event) {
    event.preventDefault();

    if (!canManageProperties) {
      return;
    }

    resetMessages();
    setPropertyBusy(true);

    try {
      const payload = {
        csrfToken,
        ...propertyForm
      };

      const response =
        propertyFormMode === 'create'
          ? await createProperty(payload)
          : await updateProperty({
              ...payload,
              id: selectedPropertyId
            });

      setCsrfToken(response.csrfToken || csrfToken);
      setNotice(response.message || (propertyFormMode === 'create' ? 'Property created successfully.' : 'Property updated successfully.'));
      setPropertyFormMode('detail');
      setPropertyForm(propertyFormFromProperty(response.property, propertyTypeOptions));
      await refreshAfterMutation(response.property?.id ?? selectedPropertyId);
    } catch (err) {
      setError(err.message || 'The property could not be saved.');
    } finally {
      setPropertyBusy(false);
    }
  }

  async function handleDeleteProperty(property) {
    if (!canManageProperties) {
      return;
    }

    if (!window.confirm(`Delete ${property.name}? This cannot be undone.`)) {
      return;
    }

    resetMessages();
    setPropertyBusy(true);

    try {
      const response = await deleteProperty({
        csrfToken,
        id: property.id
      });

      setCsrfToken(response.csrfToken || csrfToken);
      setNotice(response.message || 'Property deleted successfully.');
      setPropertyFormMode('detail');
      setSelectedPropertyId(null);
      setSelectedProperty(null);
      await loadCatalog();
    } catch (err) {
      setError(err.message || 'The property could not be deleted.');
    } finally {
      setPropertyBusy(false);
    }
  }

  async function handleImageUpload(event) {
    event.preventDefault();

    if (!canManageProperties || !selectedPropertyId) {
      return;
    }

    if (!imageState.file) {
      setError('Please choose an image to upload.');
      return;
    }

    resetMessages();
    setImageBusy(true);

    try {
      const formData = new FormData();
      formData.append('csrfToken', csrfToken);
      formData.append('propertyId', String(selectedPropertyId));
      formData.append('image', imageState.file);
      formData.append('caption', imageState.caption);
      formData.append('makePrimary', imageState.makePrimary ? '1' : '0');

      const response = await uploadPropertyImage(formData);
      setCsrfToken(response.csrfToken || csrfToken);
      setNotice(response.message || 'Property image uploaded successfully.');
      setImageState((current) => ({
        file: null,
        fileInputKey: current.fileInputKey + 1,
        caption: '',
        makePrimary: true
      }));
      await loadCatalog(selectedPropertyId);
      const detail = await getProperty(selectedPropertyId);
      setSelectedProperty(detail.property || null);
    } catch (err) {
      setError(err.message || 'The property image could not be uploaded.');
    } finally {
      setImageBusy(false);
    }
  }

  async function handleDeleteImage(image) {
    if (!canManageProperties || !selectedPropertyId) {
      return;
    }

    if (!window.confirm('Delete this property image?')) {
      return;
    }

    resetMessages();
    setImageBusy(true);

    try {
      const response = await deletePropertyImage({
        csrfToken,
        propertyId: selectedPropertyId,
        imageId: image.id
      });

      setCsrfToken(response.csrfToken || csrfToken);
      setNotice(response.message || 'Property image deleted successfully.');
      await loadCatalog(selectedPropertyId);
      const detail = await getProperty(selectedPropertyId);
      setSelectedProperty(detail.property || null);
    } catch (err) {
      setError(err.message || 'The property image could not be deleted.');
    } finally {
      setImageBusy(false);
    }
  }

  async function handleTypeSubmit(event) {
    event.preventDefault();

    if (!canManagePropertyTypes) {
      return;
    }

    resetMessages();
    setPropertyTypeBusy(true);

    try {
      const payload = {
        csrfToken,
        ...typeForm
      };

      const response =
        typeFormMode === 'edit'
          ? await updatePropertyType({
              ...payload,
              id: typeEditingId
            })
          : await createPropertyType(payload);

      setCsrfToken(response.csrfToken || csrfToken);
      setNotice(response.message || (typeFormMode === 'edit' ? 'Property type updated successfully.' : 'Property type created successfully.'));
      cancelTypeForm();
      await loadCatalog(selectedPropertyId);
    } catch (err) {
      setError(err.message || 'The property type could not be saved.');
    } finally {
      setPropertyTypeBusy(false);
    }
  }

  async function handleDeleteType(type) {
    if (!canManagePropertyTypes) {
      return;
    }

    if (!window.confirm(`Delete ${type.name}? Properties using this type must be moved first.`)) {
      return;
    }

    resetMessages();
    setPropertyTypeBusy(true);

    try {
      const response = await deletePropertyType({
        csrfToken,
        id: type.id
      });

      setCsrfToken(response.csrfToken || csrfToken);
      setNotice(response.message || 'Property type deleted successfully.');
      if (typeEditingId === type.id) {
        cancelTypeForm();
      }
      await loadCatalog(selectedPropertyId);
    } catch (err) {
      setError(err.message || 'The property type could not be deleted.');
    } finally {
      setPropertyTypeBusy(false);
    }
  }

  async function handlePropertySearch(event) {
    event.preventDefault();
    setFilters((current) => ({ ...current, query: searchInput.trim() }));
  }

  function handlePropertySelect(propertyId) {
    setSelectedPropertyId(propertyId);
    setPropertyFormMode('detail');
  }

  if (loadingCatalog && !properties.length) {
    return (
      <section className="dashboard-grid">
        <div className="glass content-card">
          <p className="eyebrow">Properties</p>
          <h2>Loading property workspace</h2>
          <p className="muted">Fetching property records, property types, and the current detail view.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-grid">
      <header className="glass content-card property-header">
        <div className="section-header">
          <div>
            <p className="eyebrow">Phase 2</p>
            <h2>Property management</h2>
            <p className="muted">
              Add, edit, delete, and inspect properties with dedicated type and image management.
            </p>
          </div>

          <div className="section-tools">
            <span className="pill">{currentPropertyCount} visible properties</span>
            <span className="pill">{activeTypeCount} active types</span>
            {canManageProperties ? (
              <button className="primary-btn" type="button" onClick={startCreateProperty}>
                Add property
              </button>
            ) : null}
          </div>
        </div>

        <div className="auth-tabs property-tabs">
          <button
            className={activeTab === 'properties' ? 'auth-tab active' : 'auth-tab'}
            type="button"
            onClick={() => setActiveTab('properties')}
          >
            Properties
          </button>
          {canManagePropertyTypes ? (
            <button
              className={activeTab === 'types' ? 'auth-tab active' : 'auth-tab'}
              type="button"
              onClick={() => setActiveTab('types')}
            >
              Types
            </button>
          ) : null}
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {notice ? <div className="alert success">{notice}</div> : null}
      </header>

      {activeTab === 'properties' ? (
        <div className="property-layout">
          <div className="content-grid property-controls">
            <article className="glass content-card">
              <p className="eyebrow">Filters</p>
              <form className="search-row property-search" onSubmit={handlePropertySearch}>
                <input
                  placeholder="Search by name, city, state, or address"
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
                    {Object.entries(PROPERTY_STATUS_OPTIONS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Type
                  <select
                    value={filters.propertyTypeId}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, propertyTypeId: event.target.value }))
                    }
                  >
                    <option value="">All types</option>
                    {propertyTypeOptions.map((type) => (
                      <option key={type.id} value={String(type.id)}>
                        {type.name}
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
                    <p className="eyebrow">Property list</p>
                    <h2>Database-backed inventory</h2>
                  </div>
                  <div className="section-tools">
                    {loadingCatalog ? <span className="pill">Refreshing...</span> : null}
                    <span className="pill">{properties.length} records</span>
                  </div>
                </div>

                <div className="property-card-grid">
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      canManageProperties={canManageProperties}
                      isSelected={property.id === selectedPropertyId}
                      onDelete={handleDeleteProperty}
                      onEdit={startEditProperty}
                      onSelect={handlePropertySelect}
                      property={property}
                    />
                  ))}
                </div>

                {!loadingCatalog && !properties.length ? (
                  <div className="empty-state">
                    <strong>No properties found.</strong>
                    <span>Try a different filter or create the first property record.</span>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="property-detail-column">
              {propertyFormMode === 'create' || propertyFormMode === 'edit' ? (
                <PropertyForm
                  busy={propertyBusy}
                  canManageProperties={canManageProperties}
                  mode={propertyFormMode}
                  onCancel={cancelPropertyForm}
                  onSubmit={handlePropertySubmit}
                  propertyForm={propertyForm}
                  propertyTypes={propertyTypeOptions}
                  setPropertyForm={setPropertyForm}
                />
              ) : (
                <PropertyDetail
                  canManageProperties={canManageProperties}
                  loading={loadingProperty}
                  imageState={imageState}
                  onDelete={handleDeleteProperty}
                  onDeleteImage={handleDeleteImage}
                  onEdit={startEditProperty}
                  onUploadImage={handleImageUpload}
                  property={selectedProperty}
                  setImageState={setImageState}
                  uploadBusy={imageBusy}
                />
              )}
            </section>
          </div>
        </div>
      ) : (
        <PropertyTypesPanel
          busy={propertyTypeBusy}
          canManagePropertyTypes={canManagePropertyTypes}
          onCancelType={cancelTypeForm}
          onCreateType={startCreateType}
          onDeleteType={handleDeleteType}
          onEditType={startEditType}
          onSubmitType={handleTypeSubmit}
          propertyTypes={propertyTypes}
          setTypeForm={setTypeForm}
          typeForm={typeForm}
          typeFormMode={typeFormMode || 'create'}
        />
      )}
    </section>
  );
}

export default PropertiesScreen;

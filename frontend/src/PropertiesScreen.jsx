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
  available: 'Active',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
  inactive: 'Inactive'
};

const PROPERTY_STATUS_LABELS = {
  available: 'Active',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
  inactive: 'Inactive'
};

const defaultPropertyForm = (propertyTypes = []) => ({
  propertyTypeId: propertyTypes[0]?.id ? String(propertyTypes[0].id) : '',
  name: '',
  status: 'available',
  description: '',
  area: '',
  thikaNo: '',
  deedNo: '',
  landTax: '0',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Bangladesh',
  totalFloors: '0',
  totalUnits: '0',
  garageCount: '0',
  bedrooms: '0',
  bathrooms: '0',
  areaSqft: '',
  rentMin: '0',
  rentMax: '0',
  monthlyRent: '0',
  securityDeposit: '0',
  image: '',
  notes: '',
  bootstrapUnits: true
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

function formatRentRange(property) {
  const min = Number(property?.rentMin ?? 0);
  const max = Number(property?.rentMax ?? property?.monthlyRent ?? 0);

  if (!Number.isFinite(min) && !Number.isFinite(max)) {
    return '$0';
  }

  if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0 && max !== min) {
    return `${formatAmount(min)} - ${formatAmount(max)}`;
  }

  return formatAmount(max || min || 0);
}

function formatAddress(property) {
  if (!property) {
    return 'No property selected';
  }

  return property.addressLabel || property.address || [property.addressLine1, property.city, property.state].filter(Boolean).join(', ');
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

function PropertyGlyph({ tone = 'green' }) {
  return (
    <span className={`property-metric-icon ${tone}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          d="M4.5 20.25H19.5M6.75 18V8.25L12 4.5L17.25 8.25V18M9.75 18V12.75H14.25V18M9 9.75H9.75M14.25 9.75H15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function RowActionIcon({ name }) {
  switch (name) {
    case 'view':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M2.75 12S6.25 6.75 12 6.75 21.25 12 21.25 12 17.75 17.25 12 17.25 2.75 12 2.75 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case 'edit':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4.75 19.25H8.5L18.25 9.5 14.5 5.75 4.75 15.5V19.25Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M12.75 7.5 16.5 11.25" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'delete':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5.75 7.25H18.25M9.25 7.25V5.75H14.75V7.25M8.25 10V17.5M12 10V17.5M15.75 10V17.5M7 7.25 7.75 19.25H16.25L17 7.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
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
    area: property.area || '',
    thikaNo: property.thikaNo || property.thika_no || '',
    deedNo: property.deedNo || property.deed_no || '',
    landTax: String(property.landTax ?? property.land_tax ?? 0),
    addressLine1: property.addressLine1 || '',
    addressLine2: property.addressLine2 || '',
    city: property.city || '',
    state: property.state || '',
    postalCode: property.postalCode || '',
    country: property.country || 'Bangladesh',
    totalFloors: String(property.totalFloors ?? 0),
    totalUnits: String(property.totalUnits ?? 0),
    garageCount: String(property.garageCount ?? property.garage_count ?? 0),
    bedrooms: String(property.bedrooms ?? 0),
    bathrooms: String(property.bathrooms ?? 0),
    areaSqft: property.areaSqft ? String(property.areaSqft) : '',
    rentMin: String(property.rentMin ?? property.monthlyRent ?? 0),
    rentMax: String(property.rentMax ?? property.monthlyRent ?? 0),
    monthlyRent: String(property.monthlyRent ?? 0),
    securityDeposit: String(property.securityDeposit ?? 0),
    image: property.image || property.imageUrl || property.coverImageUrl || '',
    notes: property.notes || '',
    bootstrapUnits: true
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
        {property.coverImageUrl || property.imageUrl || property.image ? (
          <img
            src={property.coverImageUrl || property.imageUrl || property.image}
            alt={property.coverImageCaption || property.name}
          />
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
          <span className={propertyStatusClass(property.status)}>{PROPERTY_STATUS_LABELS[property.status] || property.statusLabel}</span>
        </div>

        <p className="property-card-address">{formatAddress(property)}</p>

        <dl className="property-card-meta">
          <div>
            <dt>Rent range</dt>
            <dd>{formatRentRange(property)}</dd>
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

function PropertyTableRow({ property, canManageProperties, isSelected, onSelect, onEdit, onDelete }) {
  const imageSrc = property.coverImageUrl || property.imageUrl || property.image || '';

  return (
    <tr className={isSelected ? 'property-table-row selected' : 'property-table-row'}>
      <td>
        <button className="property-table-title" type="button" onClick={() => onSelect(property.id)}>
          <span className="property-table-thumb">
            {imageSrc ? (
              <img src={imageSrc} alt={property.coverImageCaption || property.name} />
            ) : (
              <span>{property.propertyType?.name ? property.propertyType.name.slice(0, 2).toUpperCase() : 'PR'}</span>
            )}
          </span>
          <span className="property-table-title-body">
            <strong>{property.name}</strong>
            <small>ID: {property.id}</small>
          </span>
        </button>
      </td>
      <td>
        <span className="property-type-chip">{propertyTypeLabel(property.propertyType)}</span>
      </td>
      <td>
        <div className="property-location-cell">
          <strong>{property.addressLine1 || property.address || 'No address'}</strong>
          <span>{property.city ? `${property.city}${property.state ? `, ${property.state}` : ''}` : 'No city'}</span>
        </div>
      </td>
      <td>
        <div className="property-units-cell">
          <strong>{property.totalUnits ?? 0} Units</strong>
          <span>{property.totalFloors ?? 0} Floors</span>
        </div>
      </td>
      <td>
        <div className="property-rent-cell">
          <strong>{formatRentRange(property)}</strong>
          <span>Per Month</span>
        </div>
      </td>
      <td>
        <span className={propertyStatusClass(property.status)}>{PROPERTY_STATUS_LABELS[property.status] || property.statusLabel}</span>
      </td>
      <td>
        <div className="property-row-actions">
          <button className="icon-action-btn" type="button" onClick={() => onSelect(property.id)} aria-label={`View ${property.name}`}>
            <RowActionIcon name="view" />
          </button>
          {canManageProperties ? (
            <>
              <button className="icon-action-btn" type="button" onClick={() => onEdit(property)} aria-label={`Edit ${property.name}`}>
                <RowActionIcon name="edit" />
              </button>
              <button className="icon-action-btn danger" type="button" onClick={() => onDelete(property)} aria-label={`Delete ${property.name}`}>
                <RowActionIcon name="delete" />
              </button>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function PropertyMetricCard({ label, value, hint, tone = 'default', delta, deltaTone = 'positive' }) {
  return (
    <article className={`property-metric-card ${tone}`}>
      <div className="property-metric-top">
        <PropertyGlyph tone={tone} />
        <div className="property-metric-copy">
          <span className="property-metric-label">{label}</span>
          <strong className="property-metric-value">{value}</strong>
        </div>
      </div>
      <div className="property-metric-bottom">
        {hint ? <span className="property-metric-hint">{hint}</span> : <span />}
        {delta ? <span className={`property-metric-delta ${deltaTone}`}>{delta}</span> : null}
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
          <span className={propertyStatusClass(property.status)}>{PROPERTY_STATUS_LABELS[property.status] || property.statusLabel}</span>
          {property.propertyType ? <span className={propertyTypeBadge(property.propertyType)}>{property.propertyType.name}</span> : null}
        </div>
      </div>

      <div className="property-hero">
        <div className="property-hero-media">
          {property.coverImageUrl || property.imageUrl || property.image ? (
            <img
              src={property.coverImageUrl || property.imageUrl || property.image}
              alt={property.coverImageCaption || property.name}
            />
          ) : (
            <div className="property-hero-placeholder">
              <span>No image yet</span>
            </div>
          )}
        </div>

        <dl className="property-meta-grid">
          <div>
            <dt>Rent range</dt>
            <dd>{formatRentRange(property)}</dd>
          </div>
          <div>
            <dt>Thika no.</dt>
            <dd>{property.thikaNo || property.thika_no || 'n/a'}</dd>
          </div>
          <div>
            <dt>Deed no.</dt>
            <dd>{property.deedNo || property.deed_no || 'n/a'}</dd>
          </div>
          <div>
            <dt>Total floors</dt>
            <dd>{property.totalFloors ?? 0}</dd>
          </div>
          <div>
            <dt>Total units</dt>
            <dd>{property.totalUnits ?? 0}</dd>
          </div>
          <div>
            <dt>Garage count</dt>
            <dd>{property.garageCount ?? property.garage_count ?? 0}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{property.area || formatArea(property.areaSqft) || 'n/a'}</dd>
          </div>
          <div>
            <dt>Khajna</dt>
            <dd>{formatAmount(property.landTax ?? property.land_tax ?? 0)}</dd>
          </div>
          <div>
            <dt>Images</dt>
            <dd>{property.imageCount ?? 0}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{PROPERTY_STATUS_LABELS[property.status] || property.statusLabel}</dd>
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
          <strong>Area</strong>
          <span>{property.area || formatArea(property.areaSqft) || 'n/a'}</span>
        </article>

        <article className="helper-card">
          <strong>Rent range</strong>
          <span>{formatRentRange(property)}</span>
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

      {property.image || property.imageUrl ? (
        <article className="helper-card">
          <strong>Image reference</strong>
          <span>{property.image || property.imageUrl}</span>
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
  const title = mode === 'create' ? 'Add building' : 'Edit building';

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
          Area
          <input
            type="text"
            value={propertyForm.area}
            onChange={(event) =>
              setPropertyForm((current) => ({ ...current, area: event.target.value }))
            }
            placeholder="Example: Gulshan, Block C"
          />
        </label>

        <label>
          Thika / Holding No.
          <input
            type="text"
            value={propertyForm.thikaNo}
            onChange={(event) =>
              setPropertyForm((current) => ({ ...current, thikaNo: event.target.value }))
            }
            placeholder="Example: 12/A"
          />
        </label>

        <label>
          Deed No.
          <input
            type="text"
            value={propertyForm.deedNo}
            onChange={(event) =>
              setPropertyForm((current) => ({ ...current, deedNo: event.target.value }))
            }
            placeholder="Property deed reference"
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
          Address
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

        <div className="form-three-up">
          <label>
            Land tax / Khajna
            <input
              min="0"
              step="0.01"
              type="number"
              value={propertyForm.landTax}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, landTax: event.target.value }))
              }
            />
          </label>

          <label>
            Garage count
            <input
              min="0"
              type="number"
              value={propertyForm.garageCount}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, garageCount: event.target.value }))
              }
            />
          </label>

          <label className="checkbox-field property-bootstrap-field">
            <input
              checked={propertyForm.bootstrapUnits}
              type="checkbox"
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, bootstrapUnits: event.target.checked }))
              }
            />
            <span>Auto-create unit structure after building save</span>
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
            Total floors
            <input
              min="0"
              type="number"
              value={propertyForm.totalFloors}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, totalFloors: event.target.value }))
              }
            />
          </label>

          <label>
            Total units
            <input
              min="0"
              type="number"
              value={propertyForm.totalUnits}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, totalUnits: event.target.value }))
              }
            />
          </label>

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
            Rent min
            <input
              min="0"
              step="0.01"
              type="number"
              value={propertyForm.rentMin}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, rentMin: event.target.value }))
              }
            />
          </label>

          <label>
            Rent max
            <input
              min="0"
              step="0.01"
              type="number"
              value={propertyForm.rentMax}
              onChange={(event) =>
                setPropertyForm((current) => ({ ...current, rentMax: event.target.value }))
              }
            />
          </label>
        </div>

        <label>
          Image URL
          <input
            type="text"
            value={propertyForm.image}
            onChange={(event) =>
              setPropertyForm((current) => ({ ...current, image: event.target.value }))
            }
            placeholder="Optional temporary image URL"
          />
        </label>

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
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const propertyTypeOptions = useMemo(() => propertyTypes, [propertyTypes]);
  const currentPropertyCount = properties.length;
  const activeTypeCount = propertyTypes.filter((type) => type.isActive).length;
  const propertyStats = useMemo(() => {
    const active = properties.filter((property) => property.status === 'available').length;
    const occupied = properties.filter((property) => property.status === 'occupied').length;
    const maintenance = properties.filter((property) => property.status === 'maintenance').length;
    const inactive = properties.filter((property) => property.status === 'inactive').length;

    return {
      total: properties.length,
      active,
      vacant: active,
      occupied,
      maintenance,
      inactive
    };
  }, [properties]);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(properties.length / pageSize));
  const pagedProperties = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return properties.slice(start, start + pageSize);
  }, [currentPage, properties]);
  const visibleRangeStart = properties.length ? (currentPage - 1) * pageSize + 1 : 0;
  const visibleRangeEnd = properties.length ? Math.min(currentPage * pageSize, properties.length) : 0;

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, Math.max(1, Math.ceil(properties.length / pageSize))));
  }, [properties.length]);

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
            <p className="eyebrow">Property</p>
            <h2>Property Management</h2>
            <p className="muted">
              Manage all your properties, update details and track performance.
            </p>
          </div>

        <div className="section-tools">
          {canManagePropertyTypes ? (
            <button
              className={activeTab === 'types' ? 'secondary-btn' : 'secondary-btn ghost-btn'}
              type="button"
              onClick={() => setActiveTab(activeTab === 'types' ? 'properties' : 'types')}
            >
              {activeTab === 'types' ? 'Back to properties' : 'Property types'}
            </button>
          ) : null}
          {canManageProperties ? (
            <button className="primary-btn" type="button" onClick={startCreateProperty}>
              Add building
            </button>
          ) : null}
        </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {notice ? <div className="alert success">{notice}</div> : null}

        <div className="property-metrics-grid">
          <PropertyMetricCard
            label="Total Properties"
            value={propertyStats.total}
            hint="All properties"
            tone="green"
            delta={`↑ ${Math.max(4.1, propertyStats.total ? ((propertyStats.active / propertyStats.total) * 12.5).toFixed(1) : '0.0')}%`}
          />
          <PropertyMetricCard
            label="Active Properties"
            value={propertyStats.active}
            hint="Currently active"
            tone="blue"
            delta={`↑ ${Math.max(3.2, propertyStats.total ? ((propertyStats.active / propertyStats.total) * 10.3).toFixed(1) : '0.0')}%`}
          />
          <PropertyMetricCard
            label="Vacant Units"
            value={propertyStats.vacant}
            hint="Units available"
            tone="amber"
            delta={`↓ ${Math.max(1.4, propertyStats.total ? ((propertyStats.maintenance / Math.max(propertyStats.total, 1)) * 8.4).toFixed(1) : '0.0')}%`}
            deltaTone="negative"
          />
          <PropertyMetricCard
            label="Occupied Units"
            value={propertyStats.occupied}
            hint="Units occupied"
            tone="violet"
            delta={`↑ ${Math.max(2.8, propertyStats.total ? ((propertyStats.occupied / Math.max(propertyStats.total, 1)) * 8.7).toFixed(1) : '0.0')}%`}
          />
        </div>
      </header>

      {activeTab === 'properties' ? (
        <div className="property-layout">
          <article className="glass content-card property-toolbar">
            <div className="property-toolbar-heading">
              <p className="eyebrow">Search and filters</p>
              <h3>Find, sort, and focus your inventory</h3>
            </div>

            <form className="property-toolbar-row" onSubmit={handlePropertySearch}>
              <label className="property-search-field">
                <span className="sr-only">Search properties</span>
                <input
                  placeholder="Search by name, address, city or area..."
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    setCurrentPage(1);
                  }}
                  type="search"
                />
              </label>

              <label className="property-select-field">
                <span className="sr-only">Status filter</span>
                <select
                  value={filters.status}
                  onChange={(event) => {
                    setCurrentPage(1);
                    setFilters((current) => ({ ...current, status: event.target.value }));
                  }}
                >
                  {Object.entries(PROPERTY_STATUS_OPTIONS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="property-select-field">
                <span className="sr-only">Type filter</span>
                <select
                  value={filters.propertyTypeId}
                  onChange={(event) => {
                    setCurrentPage(1);
                    setFilters((current) => ({ ...current, propertyTypeId: event.target.value }));
                  }}
                >
                  <option value="">All types</option>
                  {propertyTypeOptions.map((type) => (
                    <option key={type.id} value={String(type.id)}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>

              <button className="secondary-btn property-filter-btn" type="submit">
                Filters
              </button>
            </form>

            <p className="helper-text">Search is matched against the property name, address, city, and area fields.</p>
          </article>

          <section className="glass content-card property-list-column property-list-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Property list</p>
                <h2>Database-backed inventory</h2>
                <p className="muted">Search and filter the list below, then open any property for details.</p>
              </div>
              <div className="section-tools">
                {loadingCatalog ? <span className="pill">Refreshing...</span> : null}
                <span className="pill">{properties.length} records</span>
              </div>
            </div>

            <div className="table-wrap property-table-wrap">
              <table className="property-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Units</th>
                    <th>Rent Range</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedProperties.map((property) => (
                    <PropertyTableRow
                      key={property.id}
                      canManageProperties={canManageProperties}
                      isSelected={property.id === selectedPropertyId}
                      onDelete={handleDeleteProperty}
                      onEdit={startEditProperty}
                      onSelect={handlePropertySelect}
                      property={property}
                    />
                  ))}

                  {!loadingCatalog && !pagedProperties.length ? (
                    <tr>
                      <td colSpan="7">
                        <div className="empty-state property-empty-state">
                          <strong>No properties found.</strong>
                          <span>Try a different filter or create the first property record.</span>
                          {canManageProperties ? (
                            <button className="primary-btn" type="button" onClick={startCreateProperty}>
                              Create property
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="property-table-footer">
              <span>
                Showing {visibleRangeStart} to {visibleRangeEnd} of {properties.length} results
              </span>
              <div className="property-pagination">
                <button
                  className="page-chip"
                  type="button"
                  onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 5).map((page) => (
                  <button
                    key={page}
                    className={page === currentPage ? 'page-chip active' : 'page-chip'}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="page-chip"
                  type="button"
                  onClick={() => setCurrentPage((current) => Math.min(pageCount, current + 1))}
                  disabled={currentPage === pageCount}
                  aria-label="Next page"
                >
                  ›
                </button>
                <span className="page-size-chip">5 / page</span>
              </div>
            </div>
          </section>

          {propertyFormMode === 'create' || propertyFormMode === 'edit' ? (
            <div
              className="property-modal-backdrop"
              role="presentation"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  cancelPropertyForm();
                }
              }}
            >
              <div
                className="property-modal-sheet"
                role="dialog"
                aria-modal="true"
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
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
              </div>
            </div>
          ) : null}

          {propertyFormMode === 'detail' && selectedProperty ? (
            <div
              className="property-modal-backdrop"
              role="presentation"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setPropertyFormMode('detail');
                }
              }}
            >
              <div
                className="property-modal-sheet property-modal-sheet-wide"
                role="dialog"
                aria-modal="true"
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
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
              </div>
            </div>
          ) : null}
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

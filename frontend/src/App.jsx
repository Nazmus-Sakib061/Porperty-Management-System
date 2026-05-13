import { useEffect, useMemo, useRef, useState } from 'react';
import {
  changePassword,
  createUser,
  getDashboardSummary,
  getSession,
  getProperties,
  listUsers,
  loginWithGoogleCode,
  logout,
  registerOwner,
  updateProfile,
  uploadPhoto
} from './api';
import PropertiesScreen from './PropertiesScreen';
import OperationsScreen from './OperationsScreen';
import UnitsScreen from './UnitsScreen';
import TenantsScreen from './TenantsScreen';

const defaultRegisterForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
};

const defaultProfileForm = {
  name: '',
  email: '',
  phone: '',
  currentPassword: ''
};

const defaultPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

const defaultSetup = {
  ownerRegistrationOpen: false,
  roles: [],
  googleLoginEnabled: false,
  googleOauthEnabled: false,
  googleClientId: ''
};

const APP_SCREENS = new Set(['dashboard', 'properties', 'operations', 'units', 'tenants', 'users', 'profile']);

function getInitialScreen() {
  if (typeof window === 'undefined') {
    return 'dashboard';
  }

  const hash = window.location.hash.replace('#', '').trim();

  return APP_SCREENS.has(hash) ? hash : 'dashboard';
}

function syncScreenHash(screen) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);

  if (screen === 'dashboard') {
    url.hash = '';
  } else {
    url.hash = screen;
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

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

function initials(name) {
  return (name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

const DASHBOARD_STATUS_META = {
  available: { label: 'Available', tone: 'emerald', color: '#8bc34a' },
  occupied: { label: 'Occupied', tone: 'blue', color: '#18a1f3' },
  maintenance: { label: 'Maintenance', tone: 'amber', color: '#f59e0b' },
  inactive: { label: 'Inactive', tone: 'violet', color: '#8b5cf6' }
};

const DASHBOARD_ART_PALETTES = [
  { sky: ['#d9f1ff', '#9ed9ff'], ground: ['#f7fbff', '#d6eaf8'], roof: '#f4a62a', wall: '#ffffff', accent: '#2d86ff' },
  { sky: ['#ebf5d9', '#cdeca7'], ground: ['#f7fbef', '#dff0c3'], roof: '#8cc63f', wall: '#ffffff', accent: '#59a81f' },
  { sky: ['#ffe9cf', '#ffd2a0'], ground: ['#fff6eb', '#ffe2bb'], roof: '#f59e0b', wall: '#ffffff', accent: '#ff8a00' },
  { sky: ['#ece0ff', '#d3c0ff'], ground: ['#f9f4ff', '#eadcff'], roof: '#8b5cf6', wall: '#ffffff', accent: '#6d28d9' }
];

function formatCurrency(value) {
  const number = Number(value ?? 0);
  const decimals = Number.isInteger(number) ? 0 : 2;

  if (!Number.isFinite(number)) {
    return '$0';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
}

function formatWholeNumber(value) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return '0';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(number);
}

function statusCount(properties, status) {
  return properties.filter((property) => property.status === status).length;
}

function sumMonthlyRent(properties) {
  return properties.reduce((total, property) => total + Number(property.monthlyRent || 0), 0);
}

function normalizeSearch(value) {
  return value.trim().toLowerCase();
}

function propertyMatchesSearch(property, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    property.name,
    property.addressLabel,
    property.city,
    property.state,
    property.propertyType?.name,
    property.statusLabel
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function fallbackPropertyArt(property, index = 0) {
  const palette = DASHBOARD_ART_PALETTES[index % DASHBOARD_ART_PALETTES.length];
  const rawLabel = String(property?.name || property?.propertyType?.name || 'Property');
  const safeLabel = rawLabel.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const initialsText = rawLabel
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'PR';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" role="img" aria-label="${safeLabel}">
      <defs>
        <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.sky[0]}" />
          <stop offset="100%" stop-color="${palette.sky[1]}" />
        </linearGradient>
        <linearGradient id="ground" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.ground[0]}" />
          <stop offset="100%" stop-color="${palette.ground[1]}" />
        </linearGradient>
      </defs>
      <rect width="640" height="480" rx="32" fill="url(#sky)" />
      <circle cx="520" cy="104" r="68" fill="#ffffff" opacity="0.58" />
      <rect x="0" y="308" width="640" height="172" fill="url(#ground)" />
      <path d="M118 300L240 220L358 300H118Z" fill="${palette.roof}" />
      <rect x="148" y="300" width="184" height="116" rx="16" fill="${palette.wall}" />
      <rect x="198" y="334" width="26" height="44" rx="5" fill="${palette.accent}" />
      <rect x="168" y="318" width="28" height="24" rx="4" fill="#dff4ff" />
      <rect x="238" y="318" width="28" height="24" rx="4" fill="#dff4ff" />
      <path d="M320 286L420 214L520 286H320Z" fill="#f8fafc" opacity="0.9" />
      <rect x="345" y="286" width="156" height="112" rx="16" fill="#f8fbff" />
      <rect x="392" y="320" width="28" height="48" rx="5" fill="${palette.accent}" />
      <rect x="360" y="302" width="26" height="22" rx="4" fill="#d5e9ff" />
      <rect x="428" y="302" width="26" height="22" rx="4" fill="#d5e9ff" />
      <g transform="translate(42 48)">
        <rect x="0" y="0" width="98" height="42" rx="21" fill="#ffffff" opacity="0.68" />
        <text x="49" y="27" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700" fill="#23314d">${initialsText}</text>
      </g>
      <text x="46" y="452" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" fill="rgba(18, 32, 56, 0.32)">${safeLabel}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function AllegroMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 72 72" aria-hidden="true">
      <path d="M8 50L36 20l28 30" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 58L36 36l20 22" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
      <path d="M24 64L36 52l12 12" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

function UIIcon({ name }) {
  switch (name) {
    case 'search':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16.5 16.5L21 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 15V11a6 6 0 0 1 12 0v4l1.5 2H4.5L6 15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 18a3 3 0 0 0 6 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'menu':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 6.75H19.5M4.5 12H19.5M4.5 17.25H14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'more':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="1.9" fill="currentColor" />
          <circle cx="12" cy="12" r="1.9" fill="currentColor" />
          <circle cx="12" cy="19" r="1.9" fill="currentColor" />
        </svg>
      );
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="6" height="6" rx="1.5" fill="currentColor" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.72" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.72" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" fill="currentColor" />
        </svg>
      );
    case 'property':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 20V8l7-4 7 4v12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 20v-6h8v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.5 10.5h1.5M13 10.5h1.5M9.5 13.5h1.5M13 13.5h1.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'clients':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 8 11Zm8 0a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z" fill="currentColor" />
          <path d="M3.5 19.5c.5-3 2.8-5 4.5-5s4 2 4.5 5M13.5 19.5c.4-2.5 2.2-4 3.7-4 1.6 0 3.4 1.5 3.8 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'listing':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="4" width="14" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 8h8M8 12h8M8 16h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'rent':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12L12 6l7 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 11v8h10v-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10 19v-4h4v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'sale':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 8h2l1 9h8l1-6H8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7.5 8a1.5 1.5 0 0 1 3 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="16.5" cy="17" r="1.4" fill="currentColor" />
        </svg>
      );
    case 'reports':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 17v-5M12 17V7M17 17v-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M19.2 13.2v-2.4l-1.7-.5a5.8 5.8 0 0 0-.7-1.8l.9-1.6-1.7-1.7-1.6.9a5.8 5.8 0 0 0-1.8-.7L11.4 4h-2.4l-.5 1.7c-.6.2-1.2.4-1.8.7l-1.6-.9-1.7 1.7.9 1.6c-.3.6-.5 1.2-.7 1.8L4 10.8v2.4l1.7.5c.2.6.4 1.2.7 1.8l-.9 1.6 1.7 1.7 1.6-.9c.6.3 1.2.5 1.8.7l.5 1.7h2.4l.5-1.7c.6-.2 1.2-.4 1.8-.7l1.6.9 1.7-1.7-.9-1.6c.3-.6.5-1.2.7-1.8l1.7-.5Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" opacity="0.9" />
        </svg>
      );
    case 'revenue':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 10c0-1.2 1.1-2 3-2s3 .7 3 1.7c0 2.5-6 1.4-6 4 0 1.1 1.2 1.8 3 1.8s3-.7 3-1.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function App() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [setup, setSetup] = useState(defaultSetup);
  const [summary, setSummary] = useState(null);
  const [dashboardProperties, setDashboardProperties] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [screen, setScreen] = useState(getInitialScreen);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [registerForm, setRegisterForm] = useState(defaultRegisterForm);
  const [profileForm, setProfileForm] = useState(defaultProfileForm);
  const [passwordForm, setPasswordForm] = useState(defaultPasswordForm);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff',
    generatePassword: true,
    password: '',
    confirmPassword: '',
    mustChangePassword: true
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [busyTask, setBusyTask] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [usersSearchInput, setUsersSearchInput] = useState('');
  const [usersQuery, setUsersQuery] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const roleLabel = useMemo(() => session?.roleLabel || 'Guest', [session]);
  const googleOauthEnabled = Boolean(setup.googleOauthEnabled);
  const canManageUsers = Boolean(session?.permissions?.canManageUsers);
  const canViewTenants = Boolean(session?.permissions?.canViewTenants);
  const ownerRegistrationOpen = Boolean(setup.ownerRegistrationOpen);
  const userPhoto = session?.profilePhotoUrl || '';
  const screenTitle = useMemo(
    () =>
      screen === 'dashboard'
        ? 'Dashboard'
        : screen === 'properties'
          ? 'Property'
          : screen === 'operations'
            ? 'Operations'
          : screen === 'units'
            ? 'Listing'
            : screen === 'tenants'
              ? 'Clients'
            : screen === 'users'
              ? 'Reports'
              : 'Setting',
    [screen]
  );
  const navItems = useMemo(() => {
    const items = [{ key: 'dashboard', label: 'Dashboard', icon: 'dashboard' }];
    items.push({ key: 'properties', label: 'Property', icon: 'property' });
    items.push({ key: 'operations', label: 'Operations', icon: 'reports' });
    if (canViewTenants) {
      items.push({ key: 'tenants', label: 'Clients', icon: 'clients' });
    }

    items.push({ key: 'units', label: 'Listing', icon: 'listing' });

    if (canManageUsers) {
      items.push({ key: 'users', label: 'Reports', icon: 'reports' });
    }

    items.push({ key: 'profile', label: 'Setting', icon: 'settings' });

    return items;
  }, [canManageUsers, canViewTenants]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const data = await getSession();

        if (!mounted) {
          return;
        }

        setCsrfToken(data.csrfToken || '');
        setSetup(data.setup || defaultSetup);
        setSession(data.user || null);

        if (data.user) {
          const dashboard = await getDashboardSummary();

          if (mounted) {
            setSummary(dashboard.summary);
            if (data.user.mustChangePassword) {
              setScreen('profile');
            }
          }
        } else if (data.setup?.dbAvailable === false) {
          setError('The backend database is not ready yet. Import the schema and start MySQL.');
        } else if (data.setup?.ownerRegistrationOpen) {
          setAuthMode('register');
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to initialize session.');
        }
      } finally {
        if (mounted) {
          setBooting(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    syncScreenHash(screen);
  }, [screen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    function handleHashChange() {
      const nextScreen = getInitialScreen();
      setScreen((current) => (current === nextScreen ? current : nextScreen));
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const authMessage = url.searchParams.get('auth');

    if (!authMessage) {
      return;
    }

    if (authMessage === 'google_failed') {
      setError('Google sign-in failed. Please try again.');
    } else if (authMessage === 'google_disabled') {
      setError('Google sign-in is not configured yet. Check the Google settings in .env.');
    } else if (authMessage === 'google_success') {
      setNotice('Signed in with Google.');
    }

    url.searchParams.delete('auth');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || booting || session) {
      return;
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    const authError = url.searchParams.get('error') || '';

    if (!code && !authError) {
      return;
    }

    let mounted = true;

    async function finishGoogleRedirectLogin() {
      if (authError) {
        setError('Google sign-in was cancelled or blocked. Please try again.');
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('scope');
        url.searchParams.delete('authuser');
        url.searchParams.delete('prompt');
        url.searchParams.delete('error');
        url.searchParams.delete('error_description');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        return;
      }

      resetStatus();
      setBusyTask('google');

      try {
        const data = await loginWithGoogleCode(code, state);

        if (!mounted) {
          return;
        }

        setSession(data.user || null);
        setCsrfToken(data.csrfToken || '');
        setSetup((current) => ({ ...current, ownerRegistrationOpen: false }));
        setSummary(null);
        setDashboardProperties([]);
        setScreen(data.user?.mustChangePassword ? 'profile' : 'dashboard');
        setNotice('Signed in with Google.');
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Google sign-in failed.');
        }
      } finally {
        if (mounted) {
          setBusyTask('');
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          url.searchParams.delete('scope');
          url.searchParams.delete('authuser');
          url.searchParams.delete('prompt');
          url.searchParams.delete('error');
          url.searchParams.delete('error_description');
          window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        }
      }
    }

    finishGoogleRedirectLogin();

    return () => {
      mounted = false;
    };
  }, [booting, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    setProfileForm({
      name: session.name || '',
      email: session.email || '',
      phone: session.phone || '',
      currentPassword: ''
    });

    setPasswordForm(defaultPasswordForm);
    setPhotoFile(null);
    setPhotoInputKey((current) => current + 1);
    setCreateForm((current) => ({
      ...current,
      role: session.allowedChildRoles?.includes(current.role)
        ? current.role
        : session.allowedChildRoles?.includes('staff')
          ? 'staff'
          : session.allowedChildRoles?.[0] || 'staff'
    }));

    if (!canManageUsers && screen === 'users') {
      setScreen('dashboard');
    }
  }, [canManageUsers, screen, session]);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    function handlePointerDown(event) {
      const menu = profileMenuRef.current;

      if (menu && !menu.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!session || screen !== 'users' || !canManageUsers) {
      return;
    }

    let mounted = true;

    async function load() {
      setUsersLoading(true);

      try {
        const data = await listUsers(usersQuery);

        if (mounted) {
          setUsers(data.users || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load users.');
        }
      } finally {
        if (mounted) {
          setUsersLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [canManageUsers, screen, session, usersQuery]);

  async function refreshDashboard() {
    setDashboardLoading(true);

    try {
      const [dashboardData, propertyData] = await Promise.all([
        getDashboardSummary(),
        getProperties({ limit: 12 })
      ]);

      setSummary(dashboardData.summary);
      setDashboardProperties(propertyData.properties || []);
    } finally {
      setDashboardLoading(false);
    }
  }

  useEffect(() => {
    if (!session || screen !== 'dashboard') {
      return;
    }

    let mounted = true;

    async function loadDashboard() {
      setDashboardLoading(true);

      try {
        const [dashboardData, propertyData] = await Promise.all([
          getDashboardSummary(),
          getProperties({ limit: 12 })
        ]);

        if (!mounted) {
          return;
        }

        setSummary(dashboardData.summary);
        setDashboardProperties(propertyData.properties || []);
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load dashboard data.');
        }
      } finally {
        if (mounted) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [screen, session]);

  function resetStatus() {
    setError('');
    setNotice('');
    setTemporaryPassword('');
  }

  function handleGoogleLogin() {
    if (!googleOauthEnabled) {
      setError('Configure Google sign-in in .env to continue.');
      return;
    }

    resetStatus();

    try {
      window.location.assign('/api/auth/google-start.php');
    } catch (err) {
      setError(err.message || 'Google sign-in is not configured yet.');
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    resetStatus();
    setBusyTask('register');

    try {
      const data = await registerOwner({
        ...registerForm,
        csrfToken
      });
      setSession(data.user || null);
      setCsrfToken(data.csrfToken || csrfToken);
      setSetup((current) => ({ ...current, ownerRegistrationOpen: false }));
      setSummary(null);
      setDashboardProperties([]);
      setScreen(data.user?.mustChangePassword ? 'profile' : 'dashboard');
      setNotice('Owner account created successfully.');
      setRegisterForm(defaultRegisterForm);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setBusyTask('');
    }
  }

  async function handleLogout() {
    resetStatus();
    setBusyTask('logout');
    setProfileMenuOpen(false);

    try {
      await logout(csrfToken);
      const data = await getSession();
      setSession(data.user || null);
      setCsrfToken(data.csrfToken || '');
      setSetup(data.setup || defaultSetup);
      setSummary(null);
      setDashboardProperties([]);
      setDashboardSearch('');
      setDashboardLoading(false);
      setUsers([]);
      setScreen('dashboard');
      setAuthMode(data.setup?.ownerRegistrationOpen ? 'register' : 'login');
      setRegisterForm(defaultRegisterForm);
      setProfileForm(defaultProfileForm);
      setPasswordForm(defaultPasswordForm);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        role: 'staff',
        generatePassword: true,
        password: '',
        confirmPassword: '',
        mustChangePassword: true
      });
      setNotice('Signed out successfully.');
    } catch (err) {
      setError(err.message || 'Logout failed.');
    } finally {
      setBusyTask('');
      setProfileMenuOpen(false);
    }
  }

  async function handleProfileUpdate(event) {
    event.preventDefault();
    resetStatus();
    setBusyTask('profile');

    try {
      const data = await updateProfile({
        ...profileForm,
        csrfToken
      });
      setSession(data.user || null);
      setCsrfToken(data.csrfToken || csrfToken);
      setNotice('Profile updated successfully.');
      setProfileForm((current) => ({ ...current, currentPassword: '' }));
    } catch (err) {
      setError(err.message || 'Profile update failed.');
    } finally {
      setBusyTask('');
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    resetStatus();
    setBusyTask('password');

    try {
      const data = await changePassword({
        ...passwordForm,
        csrfToken
      });
      setSession(data.user || null);
      setCsrfToken(data.csrfToken || csrfToken);
      setPasswordForm(defaultPasswordForm);
      setNotice('Password changed successfully.');
    } catch (err) {
      setError(err.message || 'Password change failed.');
    } finally {
      setBusyTask('');
    }
  }

  async function handlePhotoUpload(event) {
    event.preventDefault();
    resetStatus();

    if (!photoFile) {
      setError('Please choose a profile photo.');
      return;
    }

    setBusyTask('photo');

    try {
      const formData = new FormData();
      formData.append('csrfToken', csrfToken);
      formData.append('photo', photoFile);

      const data = await uploadPhoto(formData);
      setSession(data.user || null);
      setCsrfToken(data.csrfToken || csrfToken);
      setPhotoFile(null);
      setPhotoInputKey((current) => current + 1);
      setNotice('Profile photo updated successfully.');
    } catch (err) {
      setError(err.message || 'Photo upload failed.');
    } finally {
      setBusyTask('');
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    resetStatus();
    setBusyTask('create-user');

    try {
      const payload = {
        ...createForm,
        csrfToken
      };

      if (createForm.generatePassword) {
        delete payload.password;
        delete payload.confirmPassword;
      }

      const data = await createUser(payload);
      setUsers((current) => [data.user, ...current]);
      setCsrfToken(data.csrfToken || csrfToken);
      setTemporaryPassword(data.temporaryPassword || '');
      setNotice('User account created successfully.');
      setCreateForm((current) => ({
        name: '',
        email: '',
        phone: '',
        role: session?.allowedChildRoles?.includes('staff') ? 'staff' : session?.allowedChildRoles?.[0] || 'staff',
        generatePassword: true,
        password: '',
        confirmPassword: '',
        mustChangePassword: true
      }));
    } catch (err) {
      setError(err.message || 'User creation failed.');
    } finally {
      setBusyTask('');
    }
  }

  async function handleUserSearch(event) {
    event.preventDefault();
    setUsersQuery(usersSearchInput.trim());
  }

  if (booting) {
    return (
      <div className="app-surface auth-surface">
        <section className="loading-panel glass">
          <p className="eyebrow">Booting</p>
          <h1>Loading secure workspace</h1>
          <p>Checking session integrity, refreshing CSRF, and preparing the dashboard.</p>
        </section>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        error={error}
        googleOauthEnabled={googleOauthEnabled}
        busyTask={busyTask}
        notice={notice}
        onGoogleLogin={handleGoogleLogin}
      />
    );
  }

  return (
    <div className="app-surface app-layout">
      <aside className="sidebar glass">
        <div className="brand-lockup">
          <div className="brand-mark">
            <AllegroMark />
          </div>
          <div>
            <strong>Allegro</strong>
            <span>Property management</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
              <button
                key={item.key}
                className={screen === item.key ? 'nav-item active' : 'nav-item'}
                onClick={() => setScreen(item.key)}
                type="button"
              >
              <span className="nav-icon" aria-hidden="true">
                <UIIcon name={item.icon} />
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-meta">
          <div className="sidebar-promo-card">
            <div className="sidebar-promo-illustration">
              <AllegroMark />
            </div>
            <strong>Grow your property business</strong>
            <span>Manage properties, tenants and finances in one place.</span>
            <button className="secondary-btn sidebar-promo-btn" type="button">
              Upgrade Plan
            </button>
          </div>
          <div className="sidebar-help-card">
            <strong>Need help?</strong>
            <span>Contact support</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar glass">
          <button className="icon-btn topbar-menu-btn" type="button" aria-label="Open navigation">
            <UIIcon name="menu" />
          </button>
          <form className="topbar-search" onSubmit={(event) => event.preventDefault()}>
            <span className="topbar-search-icon" aria-hidden="true">
              <UIIcon name="search" />
            </span>
            <input
              aria-label="Search dashboard"
              placeholder="Search properties, tenants, or anything..."
              value={dashboardSearch}
              onChange={(event) => setDashboardSearch(event.target.value)}
              type="search"
            />
            <span className="topbar-search-shortcut">Ctrl + K</span>
          </form>

          <div className="topbar-actions">
            <button className="icon-btn bell-btn" type="button" aria-label="Notifications">
              <UIIcon name="bell" />
              <span className="notification-dot" />
            </button>
            <div className="profile-menu" ref={profileMenuRef}>
              <button
                className="profile-menu-trigger profile-menu-card"
                type="button"
                aria-label="Account menu"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                onClick={() => setProfileMenuOpen((current) => !current)}
              >
                <span className="session-avatar session-avatar-inline">
                  {userPhoto ? <img src={userPhoto} alt="" /> : <span>{initials(session.name)}</span>}
                </span>
                <span className="profile-menu-card-copy">
                  <strong>{session.name}</strong>
                  <small>{roleLabel}</small>
                </span>
              </button>
              {profileMenuOpen ? (
                <div className="profile-menu-popover" role="menu" aria-label="Account actions">
                  <div className="profile-menu-user">
                    <strong>{session.name}</strong>
                    <span>{session.email}</span>
                  </div>
                  <button
                    className="profile-menu-item profile-menu-item-danger"
                    type="button"
                    onClick={handleLogout}
                    disabled={busyTask !== ''}
                    role="menuitem"
                  >
                    {busyTask === 'logout' ? 'Signing out...' : 'Logout'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {screen !== 'dashboard' ? (
            <div className="topbar-context">
              <p className="eyebrow">Workspace</p>
              <h1>{screenTitle}</h1>
              <p className="muted">
                Manage properties, tenants, listings, and account settings in one secure dashboard.
              </p>
            </div>
          ) : null}

          {dashboardLoading ? (
            <div className="topbar-context topbar-context-inline">
              <span className="pill">Refreshing live data...</span>
            </div>
          ) : null}
        </header>

        {error ? <div className="alert error">{error}</div> : null}
        {notice ? <div className="alert success">{notice}</div> : null}

        {session.mustChangePassword ? (
          <div className="alert warning">
            This account is marked for a password refresh. Please update your password in Profile.
          </div>
        ) : null}

        {screen === 'dashboard' ? (
          <DashboardScreen
            dashboardLoading={dashboardLoading}
            dashboardSearch={dashboardSearch}
            dashboardProperties={dashboardProperties}
            onOpenProperties={() => setScreen('properties')}
            summary={summary}
          />
        ) : screen === 'properties' ? (
          <PropertiesScreen
            csrfToken={csrfToken}
            setCsrfToken={setCsrfToken}
            session={session}
          />
        ) : screen === 'operations' ? (
          <OperationsScreen
            csrfToken={csrfToken}
            session={session}
          />
        ) : screen === 'units' ? (
          <UnitsScreen
            csrfToken={csrfToken}
            setCsrfToken={setCsrfToken}
            session={session}
          />
        ) : screen === 'tenants' ? (
          canViewTenants ? (
            <TenantsScreen
              csrfToken={csrfToken}
              setCsrfToken={setCsrfToken}
              session={session}
            />
          ) : (
            <section className="glass content-card">
              <p className="eyebrow">Restricted</p>
              <h2>Tenant access required</h2>
              <p>
                Your account cannot view tenant records.
              </p>
            </section>
          )
        ) : screen === 'users' ? (
          canManageUsers ? (
            <UsersScreen
              busyTask={busyTask}
              createForm={createForm}
              onCreate={handleCreateUser}
              onRefreshUsers={() => setUsersQuery((current) => current)}
              onSearch={handleUserSearch}
              setCreateForm={setCreateForm}
              setUsersSearchInput={setUsersSearchInput}
              temporaryPassword={temporaryPassword}
              users={users}
              usersLoading={usersLoading}
              usersSearchInput={usersSearchInput}
              session={session}
            />
          ) : (
            <section className="glass content-card">
              <p className="eyebrow">Restricted</p>
              <h2>Owner access required</h2>
              <p>
                Only the owner account can create manager and staff users in this phase.
              </p>
            </section>
          )
        ) : (
          <ProfileScreen
            busyTask={busyTask}
            onPasswordChange={handlePasswordChange}
            onPhotoUpload={handlePhotoUpload}
            onProfileUpdate={handleProfileUpdate}
            passwordForm={passwordForm}
            photoFile={photoFile}
            photoInputKey={photoInputKey}
            profileForm={profileForm}
            setPasswordForm={setPasswordForm}
            setPhotoFile={setPhotoFile}
            setProfileForm={setProfileForm}
            session={session}
          />
        )}
      </main>
    </div>
  );
}

function AuthScreen({
  busyTask,
  error,
  googleOauthEnabled,
  notice,
  onGoogleLogin
}) {
  return (
    <div className="app-surface auth-surface">
      <section className="auth-layout auth-layout-google">
        <div className="auth-copy">
          <div className="auth-brand">
            <div className="brand-mark brand-mark-large">
              <AllegroMark />
            </div>
            <div>
              <strong>Allegro</strong>
              <span>Property dashboard</span>
            </div>
          </div>
          <p className="eyebrow">Flexible access</p>
          <h1>Sign in with Google.</h1>
          <p>Pick your Google account, approve access, and we will create or load your session automatically.</p>

          <div className="feature-list">
            <div>
              <strong>Google OAuth</strong>
              <span>Use the Google button when a Google client id is configured.</span>
            </div>
            <div>
              <strong>Session-backed access</strong>
              <span>The backend still owns sessions, roles, and permission checks after login.</span>
            </div>
            <div>
              <strong>Auto sign-up</strong>
              <span>First-time Google sign-in creates your account automatically.</span>
            </div>
          </div>
        </div>

        <div className="glass auth-card auth-card-google">
          <div className="auth-brand auth-brand-card">
            <div className="brand-mark brand-mark-large">
              <AllegroMark />
            </div>
            <div>
              <strong>Sign in</strong>
              <span>Continue with your Google account</span>
            </div>
          </div>

          <p className="eyebrow">Google sign-in</p>
          <h2>Use your Google account</h2>
          <p className="muted">
            We will redirect you to Google, then return you here after approval.
          </p>

          <div className="google-official-wrap">
            {googleOauthEnabled ? (
              <button
                className="google-btn"
                type="button"
                onClick={onGoogleLogin}
                disabled={busyTask === 'google'}
              >
                <span className="google-badge" aria-hidden="true">
                  G
                </span>
                <span>{busyTask === 'google' ? 'Connecting...' : 'Continue with Google'}</span>
              </button>
            ) : (
              <button className="google-btn" type="button" disabled>
                <span className="google-badge" aria-hidden="true">
                  G
                </span>
                <span>Continue with Google</span>
              </button>
            )}
          </div>

          {!googleOauthEnabled ? (
            <p className="helper-text">
              Configure `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` in `.env` to enable login.
            </p>
          ) : (
            <p className="helper-text">
              Redirect URI: http://localhost:8000/api/auth/google-callback.php
            </p>
          )}

          {error ? <div className="alert error">{error}</div> : null}
          {notice ? <div className="alert success">{notice}</div> : null}
        </div>
      </section>
    </div>
  );
}

function DashboardScreen({
  dashboardLoading,
  dashboardSearch,
  dashboardProperties,
  onOpenProperties,
  summary
}) {
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const searchQuery = normalizeSearch(dashboardSearch);
  const summaryProperties = summary?.propertyBreakdown?.properties || {};
  const visibleProperties = useMemo(
    () =>
      searchQuery
        ? dashboardProperties.filter((property) => propertyMatchesSearch(property, searchQuery))
        : dashboardProperties,
    [dashboardProperties, searchQuery]
  );

  const metricCounts = useMemo(() => {
    if (searchQuery || visibleProperties.length > 0) {
      return {
        total: visibleProperties.length,
        available: statusCount(visibleProperties, 'available'),
        occupied: statusCount(visibleProperties, 'occupied'),
        maintenance: statusCount(visibleProperties, 'maintenance'),
        inactive: statusCount(visibleProperties, 'inactive')
      };
    }

    return {
      total: Number(summaryProperties.total || 0),
      available: Number(summaryProperties.available || 0),
      occupied: Number(summaryProperties.occupied || 0),
      maintenance: Number(summaryProperties.maintenance || 0),
      inactive: Number(summaryProperties.inactive || 0)
    };
  }, [searchQuery, summaryProperties, visibleProperties]);

  const totalRevenue = searchQuery || visibleProperties.length > 0 ? sumMonthlyRent(visibleProperties) : 0;
  const chartTotal = metricCounts.available + metricCounts.occupied + metricCounts.maintenance + metricCounts.inactive;
  const chartSegments = [
    { key: 'available', ...DASHBOARD_STATUS_META.available, count: metricCounts.available },
    { key: 'occupied', ...DASHBOARD_STATUS_META.occupied, count: metricCounts.occupied },
    { key: 'maintenance', ...DASHBOARD_STATUS_META.maintenance, count: metricCounts.maintenance },
    { key: 'inactive', ...DASHBOARD_STATUS_META.inactive, count: metricCounts.inactive }
  ];
  const chartStyle =
    chartTotal > 0
      ? {
          background: `conic-gradient(${chartSegments
            .map((segment) => {
              const start = chartSegments
                .slice(0, chartSegments.indexOf(segment))
                .reduce((sum, item) => sum + (item.count / chartTotal) * 100, 0);
              const end = start + (segment.count / chartTotal) * 100;
              return `${segment.color} ${start}% ${end}%`;
            })
            .join(', ')})`
        }
      : { background: 'linear-gradient(180deg, #edf2f7 0%, #f8fafc 100%)' };

  const currentCards = [
    {
      label: 'Total Properties',
      value: formatWholeNumber(metricCounts.total),
      tone: 'blue',
      icon: 'property',
      background: 'linear-gradient(180deg, #d9f0ff 0%, #c8e9ff 100%)',
      iconBackground: '#0ea5e9'
    },
    {
      label: 'Properties for Rent',
      value: formatWholeNumber(metricCounts.available),
      tone: 'emerald',
      icon: 'rent',
      background: 'linear-gradient(180deg, #eef8d7 0%, #e7f2bf 100%)',
      iconBackground: '#8bc34a'
    },
    {
      label: 'Properties for Sale',
      value: formatWholeNumber(metricCounts.occupied),
      tone: 'amber',
      icon: 'sale',
      background: 'linear-gradient(180deg, #fff0d9 0%, #ffe6c1 100%)',
      iconBackground: '#ff9800'
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      tone: 'violet',
      icon: 'revenue',
      background: 'linear-gradient(180deg, #ece1ff 0%, #decdfc 100%)',
      iconBackground: '#8b5cf6'
    }
  ];

  const sourceProperties = visibleProperties;
  const featuredCount = Math.min(3, sourceProperties.length);
  const featuredProperties = useMemo(() => {
    if (!featuredCount) {
      return [];
    }

    const start = sourceProperties.length ? featuredIndex % sourceProperties.length : 0;
    return Array.from({ length: featuredCount }, (_, offset) => sourceProperties[(start + offset) % sourceProperties.length]);
  }, [featuredCount, featuredIndex, sourceProperties]);

  const recentProperties = useMemo(() => sourceProperties.slice(0, 3), [sourceProperties]);
  const galleryProperties = useMemo(() => {
    if (!sourceProperties.length) {
      return [];
    }

    if (sourceProperties.length >= 4) {
      return sourceProperties.slice(0, 4);
    }

    return Array.from({ length: 4 }, (_, index) => sourceProperties[index % sourceProperties.length]);
  }, [sourceProperties]);

  useEffect(() => {
    setFeaturedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (sourceProperties.length === 0) {
      return;
    }

    setFeaturedIndex((current) => current % sourceProperties.length);
  }, [sourceProperties.length]);

  function cycleFeatured(direction) {
    if (!sourceProperties.length) {
      return;
    }

    setFeaturedIndex((current) => (current + direction + sourceProperties.length) % sourceProperties.length);
  }

  return (
    <section className="dashboard-grid">
      <div className="stats-grid dashboard-stats">
        {currentCards.map((card) => (
          <article
            key={card.label}
            className={`stat-card glass stat-card-${card.tone}`}
            style={{ background: card.background }}
          >
            <span className="stat-card-icon" style={{ background: card.iconBackground }}>
              <UIIcon name={card.icon} />
            </span>
            <div>
              <span className="stat-label">{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="dashboard-main-grid">
        <article className="glass content-card dashboard-property-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Property List</p>
              <h2>Featured properties</h2>
              <p className="muted">A quick visual pass across the most recent portfolio entries.</p>
            </div>
            <div className="section-tools">
              <button className="icon-btn" type="button" onClick={() => cycleFeatured(-1)} aria-label="Previous property">
                <span aria-hidden="true">‹</span>
              </button>
              <button className="icon-btn" type="button" onClick={() => cycleFeatured(1)} aria-label="Next property">
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>

          <div className="property-card-grid property-card-grid-dashboard">
            {featuredProperties.length ? (
              featuredProperties.map((property, index) => (
                <article key={`${property.id}-${index}`} className="property-card dashboard-property-card">
                  <button
                    aria-label={`Open ${property.name}`}
                    className="property-card-media dashboard-property-media"
                    type="button"
                    onClick={onOpenProperties}
                  >
                    <img
                      src={property.coverImageUrl || fallbackPropertyArt(property, index)}
                      alt={property.coverImageCaption || property.name}
                    />
                    <span className="property-card-price">{formatCurrency(property.monthlyRent)}</span>
                  </button>

                  <div className="property-card-body dashboard-property-body">
                    <div className="property-card-topline">
                      <div>
                        <strong>{property.name}</strong>
                        <span>{property.propertyType?.name || 'Property'}</span>
                      </div>
                      <span className={`status-badge ${DASHBOARD_STATUS_META[property.status]?.tone || 'muted'}`}>
                        {property.statusLabel}
                      </span>
                    </div>

                    <p className="property-card-address">{property.addressLabel}</p>
                    <dl className="property-card-meta">
                      <div>
                        <dt>Rent</dt>
                        <dd>{formatCurrency(property.monthlyRent)}</dd>
                      </div>
                      <div>
                        <dt>Area</dt>
                        <dd>{property.areaSqft ? `${formatWholeNumber(property.areaSqft)} sqft` : 'n/a'}</dd>
                      </div>
                      <div>
                        <dt>Images</dt>
                        <dd>{property.imageCount ?? 0}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state dashboard-empty">
                <strong>{dashboardLoading ? 'Loading property portfolio...' : 'No properties match the current search.'}</strong>
                <span>
                  {dashboardLoading
                    ? 'Refreshing the dashboard with live portfolio data.'
                    : 'Try a different search term or open the Properties screen to explore the catalog.'}
                </span>
              </div>
            )}
          </div>
        </article>

        <aside className="dashboard-side-column">
          <article className="glass content-card dashboard-report-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Sales report</p>
                <h2>Portfolio mix</h2>
              </div>
              <button className="icon-btn" type="button" aria-label="More report options">
                <UIIcon name="more" />
              </button>
            </div>

            <div className="report-card-layout">
              <div className="report-chart" style={chartStyle}>
                <div>
                  <strong>{formatCurrency(totalRevenue)}</strong>
                  <span>Gross monthly rent</span>
                </div>
              </div>

              <div className="report-legend">
                {chartSegments.map((segment) => {
                  const percent = chartTotal > 0 ? Math.round((segment.count / chartTotal) * 100) : 0;

                  return (
                    <div key={segment.key} className="report-legend-row">
                      <span className="report-legend-dot" style={{ background: segment.color }} />
                      <span className="report-legend-label">{segment.label}</span>
                      <span className="report-legend-value">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>

          <article className="glass content-card dashboard-recent-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Recent Sale</p>
                <h2>Latest listings</h2>
              </div>
              <button className="icon-btn" type="button" aria-label="More recent activity options">
                <UIIcon name="more" />
              </button>
            </div>

            <div className="recent-list">
              {recentProperties.length ? (
                recentProperties.map((property, index) => (
                  <article key={`${property.id}-${index}`} className="recent-list-item">
                    <div className="recent-list-thumb">
                      <img
                        src={property.coverImageUrl || fallbackPropertyArt(property, index + 1)}
                        alt={property.coverImageCaption || property.name}
                      />
                    </div>
                    <div className="recent-list-body">
                      <strong>{property.name}</strong>
                      <span>{property.addressLabel}</span>
                      <div className="recent-list-meta">
                        <span>{property.statusLabel}</span>
                        <strong>{formatCurrency(property.monthlyRent)}</strong>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state recent-empty">
                  <strong>No recent listings</strong>
                  <span>The search filter returned no properties.</span>
                </div>
              )}
            </div>
          </article>
        </aside>
      </div>

      <div className="dashboard-foot-grid">
        <article className="glass content-card dashboard-gallery-card">
          <p className="eyebrow">Images Used</p>
          <div className="dashboard-gallery">
            {galleryProperties.length ? (
              galleryProperties.map((property, index) => (
                <div key={`${property.id}-${index}`} className="dashboard-gallery-tile">
                  <img
                    src={property.coverImageUrl || fallbackPropertyArt(property, index + 2)}
                    alt={property.coverImageCaption || property.name}
                  />
                </div>
              ))
            ) : (
              <div className="empty-state gallery-empty">
                <strong>No gallery images</strong>
                <span>Matching properties will appear here.</span>
              </div>
            )}
          </div>
        </article>

        <article className="glass content-card dashboard-logo-card">
          <p className="eyebrow">Logo Used</p>
          <div className="logo-preview">
            <AllegroMark className="logo-preview-mark" />
            <div>
              <strong>Allegro</strong>
              <span>Property management dashboard</span>
            </div>
          </div>
        </article>
      </div>

      <p className="dashboard-footnote">Property Management Dashboard - Allegro HD Design</p>
    </section>
  );
}

function UsersScreen({
  busyTask,
  createForm,
  onCreate,
  onSearch,
  setCreateForm,
  setUsersSearchInput,
  temporaryPassword,
  users,
  usersLoading,
  usersSearchInput,
  session
}) {
  const allowedRoles = session.allowedChildRoles || [];
  const canGenerate = Boolean(createForm.generatePassword);

  return (
    <section className="dashboard-grid">
      <div className="content-grid">
        <article className="glass content-card">
          <p className="eyebrow">Create account</p>
          <h2>Manager and staff onboarding</h2>
          <p className="muted">
            The owner can create manager or staff accounts. Use a generated password for the
            strongest setup.
          </p>

          <form className="form-grid" onSubmit={onCreate}>
            <label>
              Full name
              <input
                required
                type="text"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>

            <label>
              Email
              <input
                required
                type="email"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>

            <label>
              Phone
              <input
                type="text"
                value={createForm.phone}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </label>

            <label>
              Role
              <select
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, role: event.target.value }))
                }
              >
                {allowedRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="checkbox-field">
              <input
                checked={createForm.generatePassword}
                type="checkbox"
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    generatePassword: event.target.checked,
                    mustChangePassword: event.target.checked ? true : current.mustChangePassword
                  }))
                }
              />
              <span>Generate a secure password</span>
            </label>

            {!canGenerate ? (
              <>
                <label>
                  Password
                  <input
                    autoComplete="new-password"
                    required
                    type="password"
                    value={createForm.password}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Confirm password
                  <input
                    autoComplete="new-password"
                    required
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value
                      }))
                    }
                  />
                </label>
              </>
            ) : (
              <p className="helper-text">
                The backend will generate a strong password and return it once after creation.
              </p>
            )}

            <label className="checkbox-field">
              <input
                checked={createForm.mustChangePassword}
                disabled={createForm.generatePassword}
                type="checkbox"
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    mustChangePassword: event.target.checked
                  }))
                }
              />
              <span>Force password change on first login</span>
            </label>

            <button className="primary-btn" type="submit" disabled={busyTask === 'create-user'}>
              {busyTask === 'create-user' ? 'Creating user...' : 'Create user'}
            </button>
          </form>

          {temporaryPassword ? (
            <div className="admin-callout">
              <strong>Temporary password</strong>
              <span>{temporaryPassword}</span>
            </div>
          ) : null}
        </article>

        <article className="glass content-card">
          <p className="eyebrow">Search</p>
          <h2>Existing accounts</h2>
          <form className="search-row" onSubmit={onSearch}>
            <input
              placeholder="Search name or email"
              value={usersSearchInput}
              onChange={(event) => setUsersSearchInput(event.target.value)}
              type="search"
            />
            <button className="secondary-btn" type="submit">
              Search
            </button>
          </form>
          <p className="helper-text">Showing the latest verified user list from the database.</p>
        </article>
      </div>

      <article className="glass content-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Users table</p>
            <h2>Database-backed account list</h2>
          </div>
          <div className="section-tools">
            <span className="pill">{users.length} records</span>
            {usersLoading ? <span className="pill">Refreshing...</span> : null}
          </div>
        </div>

        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Status</th>
                <th>Security</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="table-user">
                      <div className="session-avatar session-avatar-small">
                        {user.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt="" /> : <span>{initials(user.name)}</span>}
                      </div>
                      <div>
                        <strong>{user.name}</strong>
                        <small>{formatDateTime(user.createdAt)}</small>
                      </div>
                    </div>
                  </td>
                  <td>{user.roleLabel}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={user.status === 'active' ? 'status-badge active' : 'status-badge muted'}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-security">
                      {user.mustChangePassword ? <span className="status-badge warning">Temp password</span> : null}
                      {user.isLocked ? <span className="status-badge danger">Locked</span> : null}
                      {!user.mustChangePassword && !user.isLocked ? (
                        <span className="status-badge active">Secure</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {!usersLoading && users.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state">
                      <strong>No users found.</strong>
                      <span>Try a different search or create the first staff account.</span>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function ProfileScreen({
  busyTask,
  onPasswordChange,
  onPhotoUpload,
  onProfileUpdate,
  passwordForm,
  photoFile,
  photoInputKey,
  profileForm,
  setPasswordForm,
  setPhotoFile,
  setProfileForm,
  session
}) {
  return (
    <section className="dashboard-grid">
      <div className="content-grid">
        <article className="glass content-card">
          <p className="eyebrow">Profile</p>
          <div className="profile-hero">
            <div className="session-avatar session-avatar-xl">
              {session.profilePhotoUrl ? <img src={session.profilePhotoUrl} alt="" /> : <span>{initials(session.name)}</span>}
            </div>
            <div>
              <h2>{session.name}</h2>
              <p className="muted">{session.roleLabel}</p>
              <dl className="profile-meta">
                <div>
                  <dt>Email</dt>
                  <dd>{session.email}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{session.status}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDateTime(session.createdAt)}</dd>
                </div>
                <div>
                  <dt>Last login</dt>
                  <dd>{formatDateTime(session.lastLoginAt)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </article>

        <article className="glass content-card">
          <p className="eyebrow">Update profile</p>
          <form className="form-grid" onSubmit={onProfileUpdate}>
            <label>
              Full name
              <input
                required
                type="text"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>

            <label>
              Email
              <input
                required
                type="email"
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>

            <label>
              Phone
              <input
                type="text"
                value={profileForm.phone}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </label>

            <label>
              Current password
              <input
                autoComplete="current-password"
                required
                type="password"
                value={profileForm.currentPassword}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, currentPassword: event.target.value }))
                }
              />
            </label>

            <button className="primary-btn" type="submit" disabled={busyTask === 'profile'}>
              {busyTask === 'profile' ? 'Saving profile...' : 'Save profile'}
            </button>
          </form>
        </article>
      </div>

      <div className="content-grid">
        <article className="glass content-card">
          <p className="eyebrow">Change password</p>
          <form className="form-grid" onSubmit={onPasswordChange}>
            <label>
              Current password
              <input
                autoComplete="current-password"
                required
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                }
              />
            </label>

            <label>
              New password
              <input
                autoComplete="new-password"
                required
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                }
              />
            </label>

            <label>
              Confirm new password
              <input
                autoComplete="new-password"
                required
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value
                  }))
                }
              />
            </label>

            <button className="primary-btn" type="submit" disabled={busyTask === 'password'}>
              {busyTask === 'password' ? 'Updating password...' : 'Change password'}
            </button>
          </form>
        </article>

        <article className="glass content-card">
          <p className="eyebrow">Profile photo</p>
          <form className="form-grid" onSubmit={onPhotoUpload}>
            <label className="photo-dropzone">
              <input
                key={photoInputKey}
                accept="image/jpeg,image/png,image/webp"
                type="file"
                onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
              />
              <div>
                <strong>{photoFile ? photoFile.name : 'Choose a JPG, PNG, or WebP photo'}</strong>
                <span>Maximum 2 MB. Images are validated again on the server.</span>
              </div>
            </label>

            <button className="primary-btn" type="submit" disabled={busyTask === 'photo'}>
              {busyTask === 'photo' ? 'Uploading...' : 'Upload photo'}
            </button>
          </form>

          <div className="helper-card">
            <strong>Security note</strong>
            <span>Only image files are accepted, and upload names are randomized.</span>
          </div>
        </article>

        <article className="glass content-card">
          <p className="eyebrow">Tenant activity</p>
          <dl className="session-dl">
            <div>
              <dt>Total tenants</dt>
              <dd>{tenantBreakdown.tenants?.total ?? 0}</dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>{tenantBreakdown.tenants?.active ?? 0}</dd>
            </div>
            <div>
              <dt>Assigned</dt>
              <dd>{tenantBreakdown.tenants?.assigned ?? 0}</dd>
            </div>
            <div>
              <dt>Documents</dt>
              <dd>{tenantBreakdown.documents?.total ?? 0}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}

export default App;

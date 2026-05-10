import { useEffect, useMemo, useState } from 'react';
import {
  changePassword,
  createUser,
  getDashboardSummary,
  getSession,
  listUsers,
  login,
  logout,
  registerOwner,
  updateProfile,
  uploadPhoto
} from './api';
import PropertiesScreen from './PropertiesScreen';
import UnitsScreen from './UnitsScreen';
import TenantsScreen from './TenantsScreen';

const defaultLoginForm = {
  email: '',
  password: ''
};

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

function App() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [setup, setSetup] = useState({ ownerRegistrationOpen: false, roles: [] });
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [screen, setScreen] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
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

  const roleLabel = useMemo(() => session?.roleLabel || 'Guest', [session]);
  const canManageUsers = Boolean(session?.permissions?.canManageUsers);
  const canViewTenants = Boolean(session?.permissions?.canViewTenants);
  const ownerRegistrationOpen = Boolean(setup.ownerRegistrationOpen);
  const userPhoto = session?.profilePhotoUrl || '';
  const screenTitle = useMemo(
    () =>
      screen === 'dashboard'
        ? 'Dashboard'
        : screen === 'properties'
          ? 'Properties'
          : screen === 'units'
            ? 'Units'
            : screen === 'tenants'
              ? 'Tenants'
            : screen === 'users'
              ? 'Users'
              : 'Profile',
    [screen]
  );
  const navItems = useMemo(() => {
    const items = [{ key: 'dashboard', label: 'Dashboard' }];
    items.push({ key: 'properties', label: 'Properties' });
    items.push({ key: 'units', label: 'Units' });
    if (canViewTenants) {
      items.push({ key: 'tenants', label: 'Tenants' });
    }

    if (canManageUsers) {
      items.push({ key: 'users', label: 'Users' });
    }

    items.push({ key: 'profile', label: 'Profile' });

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
        setSetup(data.setup || { ownerRegistrationOpen: false, roles: [] });
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
    const data = await getDashboardSummary();
    setSummary(data.summary);
  }

  function resetStatus() {
    setError('');
    setNotice('');
    setTemporaryPassword('');
  }

  async function handleLogin(event) {
    event.preventDefault();
    resetStatus();
    setBusyTask('login');

    try {
      const data = await login(loginForm.email, loginForm.password, csrfToken);
      setSession(data.user || null);
      setCsrfToken(data.csrfToken || csrfToken);
      setSetup((current) => ({ ...current, ownerRegistrationOpen: false }));
      try {
        await refreshDashboard();
      } catch {
        setSummary(null);
      }
      setScreen(data.user?.mustChangePassword ? 'profile' : 'dashboard');
      setNotice('Welcome back.');
      setLoginForm(defaultLoginForm);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusyTask('');
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
      try {
        await refreshDashboard();
      } catch {
        setSummary(null);
      }
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

    try {
      await logout(csrfToken);
      const data = await getSession();
      setSession(data.user || null);
      setCsrfToken(data.csrfToken || '');
      setSetup(data.setup || { ownerRegistrationOpen: false, roles: [] });
      setSummary(null);
      setUsers([]);
      setScreen('dashboard');
      setAuthMode(data.setup?.ownerRegistrationOpen ? 'register' : 'login');
      setLoginForm(defaultLoginForm);
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
        authMode={authMode}
        busyTask={busyTask}
        error={error}
        notice={notice}
        loginForm={loginForm}
        onLogin={handleLogin}
        onRegister={handleRegister}
        ownerRegistrationOpen={ownerRegistrationOpen}
        registerForm={registerForm}
        setAuthMode={setAuthMode}
        setLoginForm={setLoginForm}
        setRegisterForm={setRegisterForm}
      />
    );
  }

  return (
    <div className="app-surface app-layout">
      <aside className="sidebar glass">
        <div className="brand-lockup">
          <div className="session-avatar session-avatar-large">
            {userPhoto ? <img src={userPhoto} alt="" /> : <span>{initials(session.name)}</span>}
          </div>
          <div>
            <strong>Property Management</strong>
            <span>{roleLabel}</span>
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
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-meta">
          <small>Signed in as</small>
          <strong>{session.name}</strong>
          <span>{session.email}</span>
          <span>{roleLabel}</span>
          <button className="secondary-btn" type="button" onClick={handleLogout} disabled={busyTask !== ''}>
            {busyTask === 'logout' ? 'Signing out...' : 'Logout'}
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar glass">
          <div>
            <p className="eyebrow">Secure operations</p>
            <h1>{screenTitle}</h1>
            <p className="muted">
              Owner-first RBAC, property operations, unit operations, and verified account management.
            </p>
          </div>

          <div className="topbar-actions">
            <div className="topbar-pill">
              <span>{session.email}</span>
              <small>{roleLabel}</small>
            </div>
            <div className="session-avatar session-avatar-inline">
              {userPhoto ? <img src={userPhoto} alt="" /> : <span>{initials(session.name)}</span>}
            </div>
          </div>
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
            onOpenProfile={() => setScreen('profile')}
            onOpenProperties={() => setScreen('properties')}
            onOpenUnits={() => setScreen('units')}
            onOpenTenants={() => setScreen('tenants')}
            onOpenUsers={() => setScreen('users')}
            roleLabel={roleLabel}
            session={session}
            summary={summary}
          />
        ) : screen === 'properties' ? (
          <PropertiesScreen
            csrfToken={csrfToken}
            setCsrfToken={setCsrfToken}
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
  authMode,
  busyTask,
  error,
  loginForm,
  notice,
  onLogin,
  onRegister,
  ownerRegistrationOpen,
  registerForm,
  setAuthMode,
  setLoginForm,
  setRegisterForm
}) {
  const showRegister = ownerRegistrationOpen;

  return (
    <div className="app-surface auth-surface">
      <section className="auth-layout">
        <div className="auth-copy">
          <span className="brand-badge">PM</span>
          <p className="eyebrow">React + PHP</p>
          <h1>Property management, secured from the first request.</h1>
          <p>
            PHP owns the session, password verification, and role checks. React only renders the
            interface and talks to the API through CSRF-protected requests.
          </p>

          <div className="feature-list">
            <div>
              <strong>Strict sessions</strong>
              <span>Session IDs rotate on login and sensitive updates.</span>
            </div>
            <div>
              <strong>Owner registration</strong>
              <span>Only the very first owner can register publicly.</span>
            </div>
            <div>
              <strong>Verified user management</strong>
              <span>Profile changes, password updates, and uploads are checked server-side.</span>
            </div>
          </div>
        </div>

        <div className="glass auth-card">
          <div className="auth-tabs">
            <button
              className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
              type="button"
              onClick={() => setAuthMode('login')}
            >
              Sign in
            </button>
            {showRegister ? (
              <button
                className={authMode === 'register' ? 'auth-tab active' : 'auth-tab'}
                type="button"
                onClick={() => setAuthMode('register')}
              >
                Owner registration
              </button>
            ) : null}
          </div>

          {authMode === 'register' && showRegister ? (
            <form className="auth-form" onSubmit={onRegister}>
              <p className="eyebrow">First owner</p>
              <h2>Create the owner account</h2>
              <p className="muted">Registration is open only while the system has no owner yet.</p>

              <label>
                Full name
                <input
                  autoComplete="name"
                  required
                  type="text"
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>

              <label>
                Email
                <input
                  autoComplete="email"
                  required
                  type="email"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>

              <label>
                Password
                <input
                  autoComplete="new-password"
                  required
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>

              <label>
                Confirm password
                <input
                  autoComplete="new-password"
                  required
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value
                    }))
                  }
                />
              </label>

              <p className="helper-text">
                Use a unique password with uppercase, lowercase, a number, and a symbol.
              </p>

              <button className="primary-btn" type="submit" disabled={busyTask === 'register'}>
                {busyTask === 'register' ? 'Creating account...' : 'Create owner account'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={onLogin}>
              <p className="eyebrow">Sign in</p>
              <h2>Welcome back</h2>
              <p className="muted">Use your active account credentials to continue.</p>

              <label>
                Email
                <input
                  autoComplete="email"
                  required
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>

              <label>
                Password
                <input
                  autoComplete="current-password"
                  required
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>

              {ownerRegistrationOpen ? (
                <p className="helper-text">
                  A first-time owner account can also be created from the registration tab.
                </p>
              ) : null}

              <button className="primary-btn" type="submit" disabled={busyTask === 'login'}>
                {busyTask === 'login' ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {error ? <div className="alert error">{error}</div> : null}
          {notice ? <div className="alert success">{notice}</div> : null}
        </div>
      </section>
    </div>
  );
}

function DashboardScreen({
  onOpenProfile,
  onOpenProperties,
  onOpenUnits,
  onOpenTenants,
  onOpenUsers,
  roleLabel,
  session,
  summary
}) {
  const cards = summary?.cards || [];
  const roleBreakdown = summary?.roleBreakdown || {};
  const tenantBreakdown = summary?.tenantBreakdown || {};

  return (
    <section className="dashboard-grid">
      <div className="hero-panel glass">
        <p className="eyebrow">Current session</p>
        <div className="session-hero">
          <div>
            <h2>{session.name}</h2>
            <p>
              You are signed in as <strong>{roleLabel}</strong>. The backend verifies this role on
              every protected request.
            </p>
          </div>
          <button className="secondary-btn" type="button" onClick={onOpenProfile}>
            Edit profile
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map((card) => (
          <article key={card.label} className={`stat-card glass tone-${card.tone}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="content-grid">
        <article className="glass content-card">
          <p className="eyebrow">Security posture</p>
          <ul className="bullet-list">
            {(summary?.highlights || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="glass content-card">
          <p className="eyebrow">Role breakdown</p>
          <dl className="session-dl">
            <div>
              <dt>Owner</dt>
              <dd>{roleBreakdown.owner ?? 0}</dd>
            </div>
            <div>
              <dt>Manager</dt>
              <dd>{roleBreakdown.manager ?? 0}</dd>
            </div>
            <div>
              <dt>Staff</dt>
              <dd>{roleBreakdown.staff ?? 0}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="content-grid">
        <article className="glass content-card">
          <p className="eyebrow">Identity</p>
          <dl className="session-dl">
            <div>
              <dt>Name</dt>
              <dd>{session.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{session.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{roleLabel}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{session.status}</dd>
            </div>
          </dl>
        </article>

        <article className="glass content-card">
          <p className="eyebrow">Next steps</p>
          <div className="admin-callout">
            <strong>Profile and account control</strong>
            <span>Update your profile, change your password, or upload a photo from the sidebar.</span>
          </div>
          <div className="admin-callout muted">
            <strong>Property workspace</strong>
            <span>Move into the property list, detail view, and type management area.</span>
            <button className="secondary-btn" type="button" onClick={onOpenProperties}>
              Open Properties
            </button>
          </div>
          <div className="admin-callout muted">
            <strong>Unit workspace</strong>
            <span>Manage individual units, link them to properties, and track rent plus deposits.</span>
            <button className="secondary-btn" type="button" onClick={onOpenUnits}>
              Open Units
            </button>
          </div>
          <div className="admin-callout muted">
            <strong>Tenant workspace</strong>
            <span>Manage tenant profiles, unit assignments, photos, and supporting documents.</span>
            <button className="secondary-btn" type="button" onClick={onOpenTenants}>
              Open Tenants
            </button>
          </div>
          {session.permissions?.canManageUsers ? (
            <div className="admin-callout muted">
              <strong>Owner access confirmed</strong>
              <span>You can create manager and staff accounts from the Users screen.</span>
              <button className="secondary-btn" type="button" onClick={onOpenUsers}>
                Open Users
              </button>
            </div>
          ) : null}
        </article>
      </div>
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

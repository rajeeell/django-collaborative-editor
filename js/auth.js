// Authentication Functions - CollabEdit with Persistent Storage

// Configuration
const AUTH_CONFIG = {
    API_BASE: 'http://localhost:8000',
    TOKEN_KEY: 'collabedit_token',
    USER_KEY: 'collabedit_user',
    USERS_DB_KEY: 'collabedit_users_db',
    DOCUMENTS_DB_KEY: 'collabedit_documents_db'
};

// Authentication state
let currentUser = null;
let authToken = null;
let usersDatabase = [];
let documentsDatabase = [];

// Initialize authentication and load persistent data
function initAuth() {
    // Load saved databases
    usersDatabase = Storage.get(AUTH_CONFIG.USERS_DB_KEY, []);
    documentsDatabase = Storage.get(AUTH_CONFIG.DOCUMENTS_DB_KEY, []);
    
    // Load saved user and token
    authToken = Storage.get(AUTH_CONFIG.TOKEN_KEY);
    currentUser = Storage.get(AUTH_CONFIG.USER_KEY);
    
    // Initialize with demo users if database is empty
    if (usersDatabase.length === 0) {
        initializeDemoUsers();
    }
    
    if (authToken && currentUser) {
        // Verify user still exists in database
        const userExists = usersDatabase.find(u => u.id === currentUser.id);
        if (userExists) {
            showDashboard();
        } else {
            // Clear invalid session
            clearAuthData();
        }
    }
}

// Initialize demo users for testing
function initializeDemoUsers() {
    const demoUsers = [
        {
            id: 'demo_user_1',
            username: 'demo',
            email: 'demo@collabedit.com',
            password: hashPassword('demo123'),
            createdAt: new Date().toISOString(),
            documents: []
        },
        {
            id: 'alice_user_1',
            username: 'alice_dev',
            email: 'alice@test.com',
            password: hashPassword('demo123'),
            createdAt: new Date().toISOString(),
            documents: []
        },
        {
            id: 'bob_user_1',
            username: 'bob_designer',
            email: 'bob@test.com',
            password: hashPassword('demo123'),
            createdAt: new Date().toISOString(),
            documents: []
        }
    ];
    
    usersDatabase = demoUsers;
    saveUsersDatabase();
}

// Simple password hashing (for demo - use proper hashing in production)
function hashPassword(password) {
    // Simple hash for demo purposes
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return 'hash_' + Math.abs(hash).toString(36);
}

// Verify password
function verifyPassword(password, hashedPassword) {
    return hashPassword(password) === hashedPassword;
}

// Set authentication mode (login/register)
function setAuthMode(mode) {
    const loginForm = DOM.select('#loginForm');
    const registerForm = DOM.select('#registerForm');
    const buttons = DOM.selectAll('.auth-toggle button');

    // Update button states
    buttons.forEach(btn => DOM.removeClass(btn, 'active'));
    event.target.classList.add('active');

    // Show/hide forms
    if (mode === 'login') {
        DOM.show(loginForm);
        DOM.hide(registerForm);
    } else {
        DOM.hide(loginForm);
        DOM.show(registerForm);
    }
}

// Real login with persistent users
async function simulateLogin() {
    const email = DOM.select('#loginEmail').value;
    const password = DOM.select('#loginPassword').value;

    // Validate input
    if (!Validator.required(email) || !Validator.required(password)) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    if (!Validator.email(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }

    try {
        // Find user in database
        const user = usersDatabase.find(u => u.email === email);
        
        if (!user) {
            showMessage('User not found. Please register first.', 'error');
            return;
        }
        
        // Verify password
        if (!verifyPassword(password, user.password)) {
            showMessage('Invalid password. Please try again.', 'error');
            return;
        }

        // Generate session token
        const token = `token_${user.id}_${Date.now()}`;

        // Save authentication data
        setAuthData(user, token);
        
        showMessage(`Welcome back, ${user.username}!`, 'success');
        showDashboard();
        
        // Load user's documents
        loadUserDocuments();
        
        // Initialize collaboration features
        if (typeof initializeCollaboration === 'function') {
            initializeCollaboration();
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login failed. Please try again.', 'error');
    }
}

// Real registration with persistent storage
async function simulateRegister() {
    const username = DOM.select('#regUsername').value;
    const email = DOM.select('#regEmail').value;
    const password = DOM.select('#regPassword').value;

    // Validate input
    if (!Validator.required(username) || !Validator.required(email) || !Validator.required(password)) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    if (!Validator.username(username)) {
        showMessage('Username must be at least 3 characters and contain only letters, numbers, and underscores', 'error');
        return;
    }

    if (!Validator.email(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }

    if (!Validator.password(password)) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }

    try {
        // Check if user already exists
        const existingUser = usersDatabase.find(u => u.email === email || u.username === username);
        if (existingUser) {
            showMessage('User with this email or username already exists', 'error');
            return;
        }

        // Create new user
        const newUser = {
            id: generateId(),
            username: username,
            email: email,
            password: hashPassword(password),
            createdAt: new Date().toISOString(),
            documents: []
        };

        // Add to database
        usersDatabase.push(newUser);
        saveUsersDatabase();

        showMessage('Account created successfully! Please login.', 'success');
        
        // Pre-fill login form
        DOM.select('#loginEmail').value = email;
        DOM.select('#loginPassword').value = password;
        
        // Switch to login mode
        setAuthMode('login');
        
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Registration failed. Please try again.', 'error');
    }
}

// Real login function for Django backend
async function loginToDjango(email, password) {
    try {
        const response = await API.post(`${AUTH_CONFIG.API_BASE}/api/auth/login/`, {
            email: email,
            password: password
        });

        if (response.success) {
            const { access, user } = response.data;
            setAuthData(user, access);
            showMessage('Login successful!', 'success');
            showDashboard();
            return true;
        } else {
            showMessage(response.error || 'Login failed', 'error');
            return false;
        }
    } catch (error) {
        console.error('Django login error:', error);
        showMessage('Network error. Please check if Django server is running.', 'error');
        return false;
    }
}

// Real registration function for Django backend
async function registerToDjango(username, email, password) {
    try {
        const response = await API.post(`${AUTH_CONFIG.API_BASE}/api/auth/register/`, {
            username: username,
            email: email,
            password: password
        });

        if (response.success) {
            showMessage('Registration successful! Please login.', 'success');
            setAuthMode('login');
            return true;
        } else {
            showMessage(response.error || 'Registration failed', 'error');
            return false;
        }
    } catch (error) {
        console.error('Django registration error:', error);
        showMessage('Network error. Please check if Django server is running.', 'error');
        return false;
    }
}

// Save users database to localStorage
function saveUsersDatabase() {
    Storage.set(AUTH_CONFIG.USERS_DB_KEY, usersDatabase);
}

// Save documents database to localStorage
function saveDocumentsDatabase() {
    Storage.set(AUTH_CONFIG.DOCUMENTS_DB_KEY, documentsDatabase);
}

// Load user's documents
function loadUserDocuments() {
    if (!currentUser) return;
    
    // Filter documents for current user
    const userDocuments = documentsDatabase.filter(doc => 
        doc.createdBy === currentUser.id || 
        doc.collaborators.includes(currentUser.id)
    );
    
    // Update global documents array
    window.documents = userDocuments;
    
    // Update UI if function exists
    if (typeof updateDocumentList === 'function') {
        updateDocumentList();
    }
}

// Add document to user's collection
function addDocumentToUser(documentId) {
    if (!currentUser) return;
    
    const user = usersDatabase.find(u => u.id === currentUser.id);
    if (user && !user.documents.includes(documentId)) {
        user.documents.push(documentId);
        saveUsersDatabase();
    }
}

// Set authentication data
function setAuthData(user, token) {
    currentUser = user;
    authToken = token;
    
    // Save to localStorage
    Storage.set(AUTH_CONFIG.TOKEN_KEY, token);
    Storage.set(AUTH_CONFIG.USER_KEY, user);
}

// Clear authentication data
function clearAuthData() {
    currentUser = null;
    authToken = null;
    
    // Remove from localStorage
    Storage.remove(AUTH_CONFIG.TOKEN_KEY);
    Storage.remove(AUTH_CONFIG.USER_KEY);
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Get auth token
function getAuthToken() {
    return authToken;
}

// Check if user is authenticated
function isAuthenticated() {
    return !!(currentUser && authToken);
}

// Show dashboard after successful login
function showDashboard() {
    // Hide authentication section
    DOM.hide(DOM.select('.auth-section'));
    
    // Show document controls
    DOM.show(DOM.select('#documentControls'));
    
    // Add current user to active users
    if (currentUser && typeof addActiveUser === 'function') {
        addActiveUser(currentUser);
    }
}

// Logout function
function logout() {
    // Clear authentication data
    clearAuthData();
    
    // Reset UI
    DOM.show(DOM.select('.auth-section'));
    DOM.hide(DOM.select('#documentControls'));
    
    // Clear forms
    DOM.select('#loginEmail').value = '';
    DOM.select('#loginPassword').value = '';
    DOM.select('#regUsername').value = '';
    DOM.select('#regEmail').value = '';
    DOM.select('#regPassword').value = '';
    
    // Clear document state
    if (typeof clearDocumentState === 'function') {
        clearDocumentState();
    }
    
    // Close WebSocket connection
    if (window.collaborationWS) {
        window.collaborationWS.close();
    }
    
    showMessage('Logged out successfully', 'info');
}

// Get authorization headers for API calls
function getAuthHeaders() {
    if (!authToken) {
        return {};
    }
    
    return {
        'Authorization': `Bearer ${authToken}`
    };
}

// Refresh token function (for production use)
async function refreshToken() {
    if (!authToken) {
        return false;
    }
    
    try {
        const response = await API.post(`${AUTH_CONFIG.API_BASE}/api/auth/refresh/`, {
            refresh: authToken
        });
        
        if (response.success) {
            const { access } = response.data;
            authToken = access;
            Storage.set(AUTH_CONFIG.TOKEN_KEY, access);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
}

// Check token validity
async function validateToken() {
    if (!authToken) {
        return false;
    }
    
    try {
        const response = await API.get(`${AUTH_CONFIG.API_BASE}/api/auth/verify/`, getAuthHeaders());
        return response.success;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

// Auto-refresh token before expiry
function setupTokenRefresh() {
    // Refresh token every 20 minutes
    setInterval(async () => {
        if (isAuthenticated()) {
            const isValid = await validateToken();
            if (!isValid) {
                const refreshed = await refreshToken();
                if (!refreshed) {
                    showMessage('Session expired. Please login again.', 'error');
                    logout();
                }
            }
        }
    }, 20 * 60 * 1000); // 20 minutes
}

// Handle authentication errors
function handleAuthError(error) {
    console.error('Authentication error:', error);
    
    if (error.status === 401) {
        showMessage('Session expired. Please login again.', 'error');
        logout();
    } else if (error.status === 403) {
        showMessage('Access denied.', 'error');
    } else {
        showMessage('Authentication error occurred.', 'error');
    }
}

// Get all users (for admin purposes)
function getAllUsers() {
    return usersDatabase.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        documentCount: user.documents.length
    }));
}

// Find user by ID
function findUserById(userId) {
    return usersDatabase.find(u => u.id === userId);
}

// Find user by email
function findUserByEmail(email) {
    return usersDatabase.find(u => u.email === email);
}

// Reset database (for testing)
function resetDatabase() {
    if (confirm('This will delete all users and documents. Continue?')) {
        usersDatabase = [];
        documentsDatabase = [];
        Storage.remove(AUTH_CONFIG.USERS_DB_KEY);
        Storage.remove(AUTH_CONFIG.DOCUMENTS_DB_KEY);
        clearAuthData();
        initializeDemoUsers();
        showMessage('Database reset successfully', 'success');
        window.location.reload();
    }
}

// Export database (for backup)
function exportDatabase() {
    const data = {
        users: usersDatabase,
        documents: documentsDatabase,
        exportedAt: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collabedit-database-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('Database exported successfully', 'success');
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    setupTokenRefresh();
});

// Export functions for global use
window.authFunctions = {
    setAuthMode,
    simulateLogin,
    simulateRegister,
    loginToDjango,
    registerToDjango,
    logout,
    getCurrentUser,
    getAuthToken,
    isAuthenticated,
    getAuthHeaders,
    getAllUsers,
    findUserById,
    findUserByEmail,
    addDocumentToUser,
    saveUsersDatabase,
    saveDocumentsDatabase,
    resetDatabase,
    exportDatabase,
    refreshToken,
    validateToken,
    handleAuthError
};
// Main Application Logic - CollabEdit

// Application state
const app = {
    initialized: false,
    version: '1.0.0',
    
    // Initialize the application
    init() {
        if (this.initialized) return;
        
        console.log('🚀 Initializing CollabEdit v' + this.version);
        
        try {
            // Initialize core modules
            this.initializeModules();
            
            // Setup global event listeners
            this.setupEventListeners();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Setup periodic tasks
            this.setupPeriodicTasks();
            
            // Show welcome message
            this.showWelcomeMessage();
            
            this.initialized = true;
            console.log('✅ CollabEdit initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize CollabEdit:', error);
            showMessage('Failed to initialize application', 'error');
        }
    },
    
    // Initialize core modules
    initializeModules() {
        // Initialize authentication
        if (typeof initAuth === 'function') {
            initAuth();
        }
        
        // Initialize documents
        if (typeof initializeDocuments === 'function') {
            initializeDocuments();
        }
        
        // Initialize collaboration
        if (typeof initializeCollaboration === 'function') {
            initializeCollaboration();
        }
    },
    
    // Setup global event listeners
    setupEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Page hidden - pausing real-time updates');
            } else {
                console.log('Page visible - resuming real-time updates');
                // Refresh connection status
                if (window.collaborationManager && getCurrentDocument()) {
                    window.collaborationManager.connect(getCurrentDocument().id);
                }
            }
        });
        
        // Handle online/offline events
        window.addEventListener('online', () => {
            showMessage('Connection restored', 'success');
            updateConnectionStatus(true);
        });
        
        window.addEventListener('offline', () => {
            showMessage('You are offline', 'error');
            updateConnectionStatus(false);
        });
        
        // Handle beforeunload (page close)
        window.addEventListener('beforeunload', (e) => {
            if (getCurrentDocument()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
        
        // Handle errors globally
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            showMessage('An unexpected error occurred', 'error');
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            e.preventDefault();
        });
    },
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Check if user is typing in an input field
            const activeElement = document.activeElement;
            const isInputField = activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.contentEditable === 'true'
            );
            
            // Global shortcuts (work everywhere)
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '/':
                        e.preventDefault();
                        this.showKeyboardShortcuts();
                        break;
                    case 'k':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                }
            }
            
            // Shortcuts that work when not typing
            if (!isInputField) {
                switch (e.key) {
                    case 'n':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            DOM.select('#docTitle')?.focus();
                        }
                        break;
                    case 'j':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            DOM.select('#joinDocId')?.focus();
                        }
                        break;
                    case 'Escape':
                        this.handleEscapeKey();
                        break;
                }
            }
            
            // Editor-specific shortcuts
            if (activeElement && activeElement.id === 'documentContent') {
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key) {
                        case 's':
                            e.preventDefault();
                            if (typeof saveDocument === 'function') {
                                saveDocument();
                            }
                            break;
                        case 'e':
                            e.preventDefault();
                            if (typeof exportDocument === 'function') {
                                exportDocument('md');
                            }
                            break;
                        case 'd':
                            e.preventDefault();
                            this.duplicateLine();
                            break;
                    }
                }
            }
        });
    },
    
    // Setup periodic tasks
    setupPeriodicTasks() {
        // Auto-save every 30 seconds
        setInterval(() => {
            if (getCurrentDocument() && typeof saveDocument === 'function') {
                saveDocument();
            }
        }, 30000);
        
        // Clean up old operations every 5 minutes
        setInterval(() => {
            if (window.operationHistory && window.operationHistory.length > 50) {
                window.operationHistory = window.operationHistory.slice(0, 50);
                if (typeof updateOperationLog === 'function') {
                    updateOperationLog();
                }
            }
        }, 300000);
        
        // Update relative timestamps every minute
        setInterval(() => {
            if (typeof updateDocumentList === 'function') {
                updateDocumentList();
            }
        }, 60000);
    },
    
    // Show welcome message
    showWelcomeMessage() {
        setTimeout(() => {
            showMessage('🎉 Welcome to CollabEdit! Press Ctrl+/ for keyboard shortcuts', 'info');
        }, 1000);
        
        // Show feature hints for new users
        if (!Storage.get('user_onboarded')) {
            setTimeout(() => {
                this.showOnboardingHints();
            }, 3000);
        }
    },
    
    // Show onboarding hints
    showOnboardingHints() {
        const hints = [
            'Try creating a new document or joining an existing one',
            'Watch the operation log to see real-time collaboration',
            'Multiple users can edit the same document simultaneously',
            'All changes are automatically saved and synchronized'
        ];
        
        hints.forEach((hint, index) => {
            setTimeout(() => {
                showMessage(hint, 'info');
            }, index * 4000);
        });
        
        // Mark user as onboarded
        Storage.set('user_onboarded', true);
    },
    
    // Show keyboard shortcuts
    showKeyboardShortcuts() {
        const shortcuts = `
**Keyboard Shortcuts:**

**Global:**
• Ctrl+/ - Show this help
• Ctrl+K - Focus search
• Ctrl+N - New document
• Ctrl+J - Join document
• Esc - Cancel/Close

**Editor:**
• Ctrl+S - Save document
• Ctrl+E - Export as Markdown
• Ctrl+D - Duplicate line

**Tips:**
• Use Tab for indentation
• All changes auto-save every 30s
• Watch operation log for real-time updates
        `;
        
        showMessage(shortcuts.trim(), 'info');
    },
    
    // Focus search (if implemented)
    focusSearch() {
        // For future search functionality
        showMessage('Search functionality coming soon!', 'info');
    },
    
    // Handle escape key
    handleEscapeKey() {
        // Close any open modals or cancel operations
        const activeElement = document.activeElement;
        if (activeElement && activeElement.blur) {
            activeElement.blur();
        }
    },
    
    // Duplicate current line in editor
    duplicateLine() {
        const editor = DOM.select('#documentContent');
        if (!editor) return;
        
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        
        // Find the current line
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = text.indexOf('\n', end);
        const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
        
        const currentLine = text.substring(lineStart, actualLineEnd);
        const newText = text.substring(0, actualLineEnd) + '\n' + currentLine + text.substring(actualLineEnd);
        
        editor.value = newText;
        editor.setSelectionRange(actualLineEnd + 1, actualLineEnd + 1 + currentLine.length);
        
        // Trigger change event
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    },
    
    // Get application statistics
    getStats() {
        return {
            version: this.version,
            initialized: this.initialized,
            documentsCount: window.documents?.length || 0,
            activeUsersCount: window.activeUsers?.length || 0,
            operationsCount: window.operationHistory?.length || 0,
            isAuthenticated: typeof isAuthenticated === 'function' ? isAuthenticated() : false,
            currentDocument: getCurrentDocument()?.title || null,
            uptime: Date.now() - (this.startTime || Date.now())
        };
    },
    
    // Debug information
    debug() {
        console.group('🐛 CollabEdit Debug Info');
        console.log('App Stats:', this.getStats());
        console.log('Current User:', getCurrentUser());
        console.log('Current Document:', getCurrentDocument());
        console.log('Active Users:', window.activeUsers);
        console.log('Recent Operations:', window.operationHistory?.slice(0, 5));
        console.log('Storage:', {
            token: !!Storage.get('collabedit_token'),
            user: !!Storage.get('collabedit_user'),
            onboarded: Storage.get('user_onboarded')
        });
        console.groupEnd();
    },
    
    // Reset application state
    reset() {
        if (confirm('This will clear all data and reset the application. Continue?')) {
            // Clear storage
            Storage.clear();
            
            // Reset state
            if (typeof clearDocumentState === 'function') {
                clearDocumentState();
            }
            
            if (typeof cleanupCollaboration === 'function') {
                cleanupCollaboration();
            }
            
            // Reload page
            window.location.reload();
        }
    },
    
    // Export data
    exportData() {
        try {
            const data = {
                version: this.version,
                exportedAt: new Date().toISOString(),
                user: getCurrentUser(),
                documents: window.documents || [],
                settings: {
                    onboarded: Storage.get('user_onboarded')
                }
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `collabedit-data-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showMessage('Data exported successfully', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            showMessage('Failed to export data', 'error');
        }
    }
};

// Performance monitoring
const performance = {
    metrics: {
        operationsPerSecond: 0,
        averageLatency: 0,
        memoryUsage: 0
    },
    
    startMonitoring() {
        // Monitor operations per second
        setInterval(() => {
            // Implementation would track operation frequency
        }, 1000);
        
        // Monitor memory usage
        if ('memory' in performance) {
            setInterval(() => {
                this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
            }, 5000);
        }
    },
    
    getMetrics() {
        return { ...this.metrics };
    }
};

// Console commands for debugging and admin functions
window.collabedit = {
    debug: () => app.debug(),
    stats: () => app.getStats(),
    reset: () => app.reset(),
    export: () => app.exportData(),
    performance: () => performance.getMetrics(),
    
    // User management
    users: () => {
        if (window.authFunctions) {
            return window.authFunctions.getAllUsers();
        }
        return [];
    },
    
    createUser: (username, email, password) => {
        // Simulate user creation
        const userData = { username, email, password };
        console.log('User creation data:', userData);
        showMessage(`User creation simulation for ${username}`, 'info');
    },
    
    // Document management
    documents: () => {
        return window.documentsDatabase || [];
    },
    
    // Developer utilities
    simulateOperation: (type, position, content) => {
        if (window.collaborationManager) {
            window.collaborationManager.addOperationToLog({
                operation: { type, position, content },
                username: 'Developer',
                version: (getDocumentVersion() || 0) + 1
            });
        }
    },
    
    simulateUser: (username) => {
        if (typeof addActiveUser === 'function') {
            addActiveUser({
                id: 'sim_' + Date.now(),
                username: username || 'SimulatedUser',
                email: `${username || 'user'}@example.com`
            });
        }
    },
    
    demoOT: () => {
        if (typeof demonstrateOperationalTransform === 'function') {
            demonstrateOperationalTransform();
        }
    }
};

// Admin functions accessible from UI
function showAllUsers() {
    if (!window.authFunctions) {
        showMessage('User system not initialized', 'error');
        return;
    }
    
    const users = window.authFunctions.getAllUsers();
    let userList = `📊 **All Registered Users (${users.length}):**\n\n`;
    
    users.forEach((user, index) => {
        userList += `${index + 1}. **${user.username}** (${user.email})\n`;
        userList += `   • Created: ${new Date(user.createdAt).toLocaleDateString()}\n`;
        userList += `   • Documents: ${user.documentCount}\n\n`;
    });
    
    if (users.length === 0) {
        userList += 'No users registered yet.';
    }
    
    showMessage(userList, 'info');
    console.log('All Users:', users);
}

function showSystemStats() {
    const stats = {
        users: window.authFunctions ? window.authFunctions.getAllUsers().length : 0,
        documents: window.documentsDatabase ? window.documentsDatabase.length : 0,
        activeUsers: window.activeUsers ? window.activeUsers.length : 0,
        currentUser: getCurrentUser()?.username || 'None',
        currentDocument: getCurrentDocument()?.title || 'None',
        operationHistory: window.operationHistory ? window.operationHistory.length : 0
    };
    
    let statsText = `📈 **System Statistics:**\n\n`;
    statsText += `• Total Users: ${stats.users}\n`;
    statsText += `• Total Documents: ${stats.documents}\n`;
    statsText += `• Active Users: ${stats.activeUsers}\n`;
    statsText += `• Current User: ${stats.currentUser}\n`;
    statsText += `• Current Document: ${stats.currentDocument}\n`;
    statsText += `• Operations Logged: ${stats.operationHistory}\n`;
    
    showMessage(statsText, 'info');
    console.log('System Stats:', stats);
}

function exportDatabase() {
    if (window.authFunctions && window.authFunctions.exportDatabase) {
        window.authFunctions.exportDatabase();
    } else {
        showMessage('Export function not available', 'error');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.startTime = Date.now();
    app.init();
    performance.startMonitoring();
});

// Initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
} else {
    // DOM is already loaded
    app.startTime = Date.now();
    app.init();
    performance.startMonitoring();
}

// Export app for global access
window.app = app;
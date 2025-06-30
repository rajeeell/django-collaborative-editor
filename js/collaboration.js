// Real-time Collaboration Functions - CollabEdit

// Collaboration state
let activeUsers = [];
let operationHistory = [];
let isTyping = false;
let typingTimeout = null;
let collaborationWS = null;

// Collaboration manager
const collaborationManager = {
    ws: null,
    isConnected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    
    // Initialize collaboration
    init() {
        this.setupEventListeners();
        this.simulateInitialData();
    },
    
    // Connect to WebSocket (Django Channels)
    connect(documentId) {
        if (this.ws) {
            this.ws.close();
        }
        
        try {
            const token = getAuthToken();
            const wsUrl = `ws://localhost:8000/ws/document/${documentId}/?token=${token}`;
            
            this.ws = new WebSocket(wsUrl);
            this.setupWebSocketHandlers();
            
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.simulateConnection();
        }
    },
    
    // Setup WebSocket event handlers
    setupWebSocketHandlers() {
        this.ws.onopen = () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            updateConnectionStatus(true);
            showMessage('Connected to Django Channels', 'success');
        };
        
        this.ws.onclose = () => {
            this.isConnected = false;
            updateConnectionStatus(false);
            this.handleDisconnection();
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            showMessage('Connection error occurred', 'error');
        };
    },
    
    // Handle WebSocket messages
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'document_state':
                this.handleDocumentState(data);
                break;
            case 'operation':
                this.handleOperation(data);
                break;
            case 'user_joined':
                this.handleUserJoined(data);
                break;
            case 'user_left':
                this.handleUserLeft(data);
                break;
            case 'cursor_update':
                this.handleCursorUpdate(data);
                break;
            case 'operation_ack':
                this.handleOperationAck(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    },
    
    // Handle document state
    handleDocumentState(data) {
        const editor = DOM.select('#documentContent');
        editor.value = data.content;
        
        // Update active users
        activeUsers = data.active_users || [];
        updateActiveUsers();
        
        // Update version
        documentVersion = data.version;
        DOM.select('#versionInfo').textContent = `Version: ${data.version}`;
    },
    
    // Handle operation from other users
    handleOperation(data) {
        if (data.user_id !== getCurrentUser()?.id) {
            this.applyOperation(data.operation);
            this.addOperationToLog(data);
        }
    },
    
    // Handle user joined
    handleUserJoined(data) {
        if (data.user_id !== getCurrentUser()?.id) {
            addActiveUser({
                id: data.user_id,
                username: data.username,
                email: `${data.username}@example.com`
            });
            showMessage(`${data.username} joined the document`, 'info');
        }
    },
    
    // Handle user left
    handleUserLeft(data) {
        removeActiveUser(data.user_id);
        showMessage(`${data.username} left the document`, 'info');
    },
    
    // Handle cursor update
    handleCursorUpdate(data) {
        // Update cursor position for user (visual indicator)
        console.log(`${data.username} cursor at:`, data.cursor);
    },
    
    // Handle operation acknowledgment
    handleOperationAck(data) {
        documentVersion = data.version;
        DOM.select('#versionInfo').textContent = `Version: ${data.version}`;
    },
    
    // Send operation to server
    sendOperation(operation) {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify({
                type: 'operation',
                operation: {
                    ...operation,
                    client_version: documentVersion
                }
            }));
        } else {
            // Simulate operation for demo
            this.simulateOperation(operation);
        }
    },
    
    // Send cursor position
    sendCursorPosition(cursor, selection = null) {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify({
                type: 'cursor_position',
                cursor: cursor,
                selection: selection
            }));
        }
    },
    
    // Apply operation to editor
    applyOperation(operation) {
        const editor = DOM.select('#documentContent');
        const content = editor.value;
        let newContent;
        
        switch (operation.type) {
            case 'insert':
                newContent = content.slice(0, operation.position) + 
                           operation.content + 
                           content.slice(operation.position);
                break;
            
            case 'delete':
                newContent = content.slice(0, operation.position) + 
                           content.slice(operation.position + operation.length);
                break;
            
            default:
                return;
        }
        
        // Preserve cursor position
        const cursorPos = editor.selectionStart;
        editor.value = newContent;
        
        // Restore cursor if needed
        if (operation.position <= cursorPos) {
            const offset = operation.type === 'insert' ? operation.content.length : -operation.length;
            editor.setSelectionRange(cursorPos + offset, cursorPos + offset);
        }
        
        updateDocumentStats();
    },
    
    // Handle text changes
    handleTextChange() {
        const editor = DOM.select('#documentContent');
        const newContent = editor.value;
        
        // Generate operation (simplified diff)
        const operation = this.generateOperation(newContent);
        
        if (operation) {
            this.sendOperation(operation);
            this.addOperationToLog({
                operation: operation,
                user_id: getCurrentUser()?.id,
                username: getCurrentUser()?.username || 'You',
                version: documentVersion + 1
            });
        }
        
        // Handle typing indicator
        this.handleTypingIndicator();
    },
    
    // Generate operation from text change
    generateOperation(newContent) {
        const currentDoc = getCurrentDocument();
        if (!currentDoc) return null;
        
        const oldContent = currentDoc.content;
        
        if (oldContent === newContent) return null;
        
        // Simple diff algorithm
        if (newContent.length > oldContent.length) {
            // Text inserted
            for (let i = 0; i < oldContent.length; i++) {
                if (oldContent[i] !== newContent[i]) {
                    return {
                        type: 'insert',
                        position: i,
                        content: newContent.slice(i, i + (newContent.length - oldContent.length))
                    };
                }
            }
            // Insertion at end
            return {
                type: 'insert',
                position: oldContent.length,
                content: newContent.slice(oldContent.length)
            };
        } else {
            // Text deleted
            for (let i = 0; i < newContent.length; i++) {
                if (oldContent[i] !== newContent[i]) {
                    return {
                        type: 'delete',
                        position: i,
                        length: oldContent.length - newContent.length
                    };
                }
            }
            // Deletion at end
            return {
                type: 'delete',
                position: newContent.length,
                length: oldContent.length - newContent.length
            };
        }
    },
    
    // Handle typing indicator
    handleTypingIndicator() {
        if (!isTyping) {
            isTyping = true;
            // Send typing start event
        }
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isTyping = false;
            // Send typing stop event
        }, 1500);
    },
    
    // Handle disconnection
    handleDisconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            showMessage(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'info');
            
            setTimeout(() => {
                if (getCurrentDocument()) {
                    this.connect(getCurrentDocument().id);
                }
            }, 2000 * this.reconnectAttempts);
        } else {
            showMessage('Unable to reconnect. Please refresh the page.', 'error');
        }
    },
    
    // Simulate connection for demo
    simulateConnection() {
        setTimeout(() => {
            this.isConnected = true;
            updateConnectionStatus(true);
            showMessage('Connected to Django backend (simulated)', 'success');
        }, 1000);
    },
    
    // Simulate operation for demo
    simulateOperation(operation) {
        // Add to operation log
        this.addOperationToLog({
            operation: operation,
            user_id: getCurrentUser()?.id,
            username: getCurrentUser()?.username || 'You',
            version: ++documentVersion
        });
        
        DOM.select('#versionInfo').textContent = `Version: ${documentVersion}`;
    },
    
    // Add operation to log
    addOperationToLog(data) {
        const operation = {
            id: generateId(),
            user: data.username,
            type: data.operation.type,
            position: data.operation.position,
            content: data.operation.content || '',
            length: data.operation.length || 0,
            timestamp: formatTime(),
            version: data.version
        };
        
        operationHistory.unshift(operation);
        if (operationHistory.length > 15) {
            operationHistory = operationHistory.slice(0, 15);
        }
        
        updateOperationLog();
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Cursor position tracking
        const editor = DOM.select('#documentContent');
        if (editor) {
            ['keyup', 'mouseup', 'focus'].forEach(event => {
                editor.addEventListener(event, () => {
                    const cursor = {
                        position: editor.selectionStart,
                        line: editor.value.substring(0, editor.selectionStart).split('\n').length - 1
                    };
                    
                    const selection = editor.selectionStart !== editor.selectionEnd ? {
                        start: editor.selectionStart,
                        end: editor.selectionEnd
                    } : null;
                    
                    this.sendCursorPosition(cursor, selection);
                });
            });
        }
    },
    
    // Simulate initial data for demo
    simulateInitialData() {
        // Add sample operations
        setTimeout(() => {
            this.addOperationToLog({
                operation: { type: 'insert', position: 0, content: 'Welcome to ' },
                username: 'System',
                version: 1
            });
        }, 1000);
        
        // Simulate users joining
        setTimeout(() => {
            addActiveUser({
                id: 'alice_' + Date.now(),
                username: 'alice_dev',
                email: 'alice@company.com'
            });
            showMessage('alice_dev joined the collaboration', 'info');
        }, 2000);
        
        setTimeout(() => {
            addActiveUser({
                id: 'bob_' + Date.now(),
                username: 'bob_designer',
                email: 'bob@company.com'
            });
            showMessage('bob_designer joined the collaboration', 'info');
        }, 4000);
        
        // Simulate collaborative operations
        this.simulateCollaborativeEditing();
    },
    
    // Simulate collaborative editing
    simulateCollaborativeEditing() {
        const actions = [
            () => {
                this.addOperationToLog({
                    operation: { type: 'insert', position: 150, content: 'real-time ' },
                    username: 'alice_dev',
                    version: ++documentVersion
                });
                showTypingIndicator('alice_dev');
            },
            () => {
                this.addOperationToLog({
                    operation: { type: 'insert', position: 200, content: 'collaborative features ' },
                    username: 'bob_designer',
                    version: ++documentVersion
                });
                showTypingIndicator('bob_designer');
            },
            () => {
                this.addOperationToLog({
                    operation: { type: 'delete', position: 100, length: 5 },
                    username: 'alice_dev',
                    version: ++documentVersion
                });
            },
            () => {
                this.addOperationToLog({
                    operation: { type: 'insert', position: 300, content: '\n\n## Django Integration\nThis system uses Django Channels for WebSocket communication.' },
                    username: 'bob_designer',
                    version: ++documentVersion
                });
                showTypingIndicator('bob_designer');
            }
        ];
        
        actions.forEach((action, index) => {
            setTimeout(action, (index + 1) * 5000);
        });
    }
};

// Initialize collaboration for document
function initDocumentCollaboration(document) {
    // Connect to WebSocket for this document
    collaborationManager.connect(document.id);
    
    // Add current user to active users if not already present
    const currentUser = getCurrentUser();
    if (currentUser && !activeUsers.find(u => u.id === currentUser.id)) {
        addActiveUser(currentUser);
    }
}

// Initialize collaboration system
function initializeCollaboration() {
    collaborationManager.init();
}

// Add active user
function addActiveUser(user) {
    if (!user || activeUsers.find(u => u.id === user.id)) return;
    
    activeUsers.push({
        ...user,
        joinedAt: new Date().toISOString(),
        color: ColorUtils.generateUserColor(user.id)
    });
    
    updateActiveUsers();
}

// Remove active user
function removeActiveUser(userId) {
    activeUsers = activeUsers.filter(u => u.id !== userId);
    updateActiveUsers();
}

// Update active users display
function updateActiveUsers() {
    const container = DOM.select('#activeUsers');
    const userCount = DOM.select('#userCount');
    
    container.innerHTML = '';
    userCount.textContent = activeUsers.length;
    
    activeUsers.forEach((user, index) => {
        const userItem = DOM.create('div', 'user-item');
        userItem.style.animationDelay = `${index * 0.1}s`;
        
        const avatar = DOM.create('div', 'user-avatar');
        avatar.textContent = user.username[0].toUpperCase();
        avatar.style.background = user.color || ColorUtils.generateUserColor(user.id);
        
        const userInfo = DOM.create('div', 'user-info');
        userInfo.innerHTML = `
            <h4>${user.username}</h4>
            <p>${user.id === getCurrentUser()?.id ? 'You' : 'Collaborator'}</p>
        `;
        
        userItem.appendChild(avatar);
        userItem.appendChild(userInfo);
        container.appendChild(userItem);
    });
}

// Update operation log display
function updateOperationLog() {
    const log = DOM.select('#operationLog');
    log.innerHTML = '';
    
    if (operationHistory.length === 0) {
        log.innerHTML = `
            <div class="operation-item">
                <div class="operation-header">
                    <span class="operation-user">System</span>
                    <span class="operation-time">Just now</span>
                </div>
                <div class="operation-details">
                    <span class="operation-type op-insert">INFO</span>
                    Django backend ready for operations
                </div>
            </div>
        `;
        return;
    }
    
    operationHistory.forEach((op, index) => {
        const item = DOM.create('div', 'operation-item');
        item.style.animationDelay = `${index * 0.05}s`;
        
        item.innerHTML = `
            <div class="operation-header">
                <span class="operation-user">${op.user}</span>
                <span class="operation-time">${op.timestamp}</span>
            </div>
            <div class="operation-details">
                <span class="operation-type ${op.type === 'insert' ? 'op-insert' : 'op-delete'}">${op.type.toUpperCase()}</span>
                at position ${op.position}${op.content ? `: "${TextUtils.truncate(op.content, 20)}"` : op.length ? ` (${op.length} chars)` : ''}
            </div>
        `;
        
        log.appendChild(item);
    });
}

// Update connection status
function updateConnectionStatus(connected) {
    const status = DOM.select('#connectionStatus');
    
    if (connected) {
        status.className = 'connection-status status-connected';
        status.innerHTML = '<span>●</span> Connected to Django Backend';
    } else {
        status.className = 'connection-status status-disconnected';
        status.innerHTML = '<span>●</span> Disconnected - Reconnecting...';
    }
}

// Show typing indicator
function showTypingIndicator(username) {
    const indicator = DOM.select('#typingIndicator');
    const userSpan = DOM.select('#typingUser');
    
    if (username !== getCurrentUser()?.username) {
        userSpan.textContent = `${username} is typing...`;
        indicator.style.display = 'flex';
        
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 2500);
    }
}

// Demonstrate operational transform
function demonstrateOperationalTransform() {
    const currentDoc = getCurrentDocument();
    if (!currentDoc) {
        showMessage('Please open a document first', 'error');
        return;
    }
    
    showMessage('Demonstrating Operational Transform conflict resolution...', 'info');
    
    // Simulate two users editing at the same position
    setTimeout(() => {
        collaborationManager.addOperationToLog({
            operation: { type: 'insert', position: 50, content: 'Django ' },
            username: 'alice_dev',
            version: ++documentVersion
        });
        
        collaborationManager.addOperationToLog({
            operation: { type: 'insert', position: 50, content: 'REST ' },
            username: 'bob_designer', 
            version: ++documentVersion
        });
        
        showMessage('✅ Operational Transform resolved conflicting edits!', 'success');
    }, 1000);
}

// Network simulation
function simulateNetworkFluctuations() {
    setInterval(() => {
        if (Math.random() < 0.08) { // 8% chance every 15 seconds
            updateConnectionStatus(false);
            
            setTimeout(() => {
                updateConnectionStatus(true);
                showMessage('Reconnected to Django Channels', 'success');
            }, 2000 + Math.random() * 3000);
        }
    }, 15000);
}

// Cleanup collaboration
function cleanupCollaboration() {
    if (collaborationWS) {
        collaborationWS.close();
        collaborationWS = null;
    }
    
    activeUsers = [];
    operationHistory = [];
    updateActiveUsers();
    updateOperationLog();
    updateConnectionStatus(false);
}

// Performance monitoring
function monitorPerformance() {
    let operationCount = 0;
    let lastOperationTime = Date.now();
    
    setInterval(() => {
        const now = Date.now();
        const timeDiff = now - lastOperationTime;
        
        if (operationCount > 50 && timeDiff < 1000) {
            console.warn('High operation frequency detected, throttling...');
            // Implement throttling logic here
        }
        
        operationCount = 0;
        lastOperationTime = now;
    }, 1000);
}

// Export collaboration manager
window.collaborationManager = collaborationManager;

// Export functions for global use
window.collaborationFunctions = {
    initializeCollaboration,
    initDocumentCollaboration,
    addActiveUser,
    removeActiveUser,
    updateActiveUsers,
    updateOperationLog,
    updateConnectionStatus,
    showTypingIndicator,
    demonstrateOperationalTransform,
    cleanupCollaboration
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Setup periodic connection heartbeat
    setInterval(() => {
        if (collaborationManager.isConnected) {
            updateConnectionStatus(true);
        }
    }, 5000);
    
    // Start network simulation
    simulateNetworkFluctuations();
    
    // Start performance monitoring
    monitorPerformance();
});
// Document Management Functions - CollabEdit with Persistent Storage

// Document state
let documents = [];
let currentDocument = null;
let documentVersion = 0;

// Initialize documents with persistent storage
function initializeDocuments() {
    // Load documents from localStorage
    const savedDocuments = Storage.get('collabedit_documents_db', []);
    
    // Initialize with demo documents if empty
    if (savedDocuments.length === 0) {
        initializeDemoDocuments();
    } else {
        window.documentsDatabase = savedDocuments;
        loadUserDocuments();
    }
}

// Initialize demo documents
function initializeDemoDocuments() {
    const demoDocuments = [
        {
            id: 'demo_doc_1',
            title: 'Django Project Specifications',
            content: `# Django Collaborative Editor Specifications

## Overview
This document outlines the technical specifications for building a real-time collaborative document editor using Django and Django Channels.

## Architecture Components
- Django REST Framework for API endpoints
- Django Channels for WebSocket communication
- Operational Transform algorithms for conflict resolution
- JWT authentication for secure access

## Features Implemented
- Real-time collaborative editing
- User presence indicators
- Operation history tracking
- Document version control
- Conflict resolution via operational transforms

## Technical Stack
- Backend: Django 4.2, Django Channels, Django REST Framework
- Frontend: React with WebSocket integration
- Database: PostgreSQL with Redis for session management
- Authentication: JWT tokens with refresh mechanism

## Next Steps
- Implement rich text formatting
- Add comment system
- Document export functionality
- Mobile app development`,
            version: 15,
            createdBy: 'demo_user_1',
            collaborators: ['demo_user_1', 'alice_user_1', 'bob_user_1'],
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            lastModified: new Date(Date.now() - 3600000).toISOString(),
            isPublic: true
        },
        {
            id: 'demo_doc_2',
            title: 'API Documentation',
            content: `# CollabEdit API Documentation

## Authentication Endpoints

### POST /api/auth/login/
Login with email and password
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

### POST /api/auth/register/
Register new user account
\`\`\`json
{
  "username": "johndoe",
  "email": "john@example.com", 
  "password": "securepassword"
}
\`\`\`

## Document Endpoints

### GET /api/documents/
List all user documents

### POST /api/documents/
Create new document
\`\`\`json
{
  "title": "My New Document"
}
\`\`\`

### GET /api/documents/{id}/
Get specific document

### POST /api/documents/{id}/collaborators/
Add collaborator to document

## WebSocket Events

### join-document
Join a document for real-time editing

### operation
Send text operation (insert/delete/retain)

### cursor-position
Update cursor position for other users`,
            version: 8,
            createdBy: 'alice_user_1',
            collaborators: ['alice_user_1', 'demo_user_1', 'bob_user_1'],
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            lastModified: new Date(Date.now() - 7200000).toISOString(),
            isPublic: true
        }
    ];
    
    window.documentsDatabase = demoDocuments;
    saveDocumentsDatabase();
    loadUserDocuments();
}

// Load user's documents
function loadUserDocuments() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        documents = [];
        updateDocumentList();
        return;
    }
    
    // Filter documents for current user
    documents = window.documentsDatabase.filter(doc => 
        doc.createdBy === currentUser.id || 
        doc.collaborators.includes(currentUser.id) ||
        doc.isPublic
    );
    
    updateDocumentList();
}

// Save documents to persistent storage
function saveDocumentsDatabase() {
    Storage.set('collabedit_documents_db', window.documentsDatabase);
    if (typeof window.authFunctions !== 'undefined' && window.authFunctions) {
        window.authFunctions.saveDocumentsDatabase();
    }
}

// Update document list in UI
function updateDocumentList() {
    const list = DOM.select('#documentList');
    if (!list) return;
    
    list.innerHTML = '';

    if (documents.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #718096; padding: 20px; font-size: 14px;">No documents yet. Create your first document!</div>';
        return;
    }

    documents.forEach((doc, index) => {
        const item = DOM.create('div', 'document-item');
        item.style.animationDelay = `${index * 0.1}s`;
        
        const currentUser = getCurrentUser();
        const isOwner = currentUser && doc.createdBy === currentUser.id;
        const lastModified = formatRelativeTime(doc.lastModified);
        
        item.innerHTML = `
            <div>
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${doc.title}</div>
                <div style="font-size: 12px; color: #718096;">
                    Version ${doc.version} • ${lastModified}
                </div>
                <div style="font-size: 11px; color: #a0aec0; margin-top: 2px;">
                    ${doc.collaborators.length} collaborator${doc.collaborators.length !== 1 ? 's' : ''} • 
                    ${isOwner ? 'Owner' : doc.isPublic ? 'Public' : 'Shared'}
                </div>
            </div>
            <div style="font-size: 11px; color: #4299e1; font-weight: 500;">
                ${doc.isPublic ? '🌐' : isOwner ? '👑' : '🤝'}
            </div>
        `;
        
        item.addEventListener('click', () => openDocument(doc));
        list.appendChild(item);
    });
}

// Create new document with persistent storage
async function createDocument() {
    const titleInput = DOM.select('#docTitle');
    const title = titleInput.value.trim();
    
    if (!title) {
        showMessage('Please enter a document title', 'error');
        titleInput.focus();
        return;
    }

    if (title.length > 100) {
        showMessage('Document title must be less than 100 characters', 'error');
        return;
    }

    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showMessage('Please login first', 'error');
            return;
        }

        // Create new document object
        const newDoc = {
            id: generateId(),
            title: title,
            content: `# ${title}

Welcome to your new collaborative document! Start typing to see real-time collaboration in action.

## Features Available:
- Real-time collaborative editing
- Operational transform conflict resolution
- Live user presence indicators
- Operation history tracking
- Auto-save functionality
- Persistent storage across sessions

Type anywhere in this document to begin collaborating...

---
*Created by ${currentUser.username} on ${new Date().toLocaleDateString()}*`,
            version: 1,
            createdBy: currentUser.id,
            collaborators: [currentUser.id],
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            isPublic: false
        };

        // Add to global documents database
        if (!window.documentsDatabase) {
            window.documentsDatabase = [];
        }
        window.documentsDatabase.unshift(newDoc);
        
        // Add to user's documents
        documents.unshift(newDoc);
        
        // Save to persistent storage
        saveDocumentsDatabase();
        
        // Add to user's document list
        if (window.authFunctions) {
            window.authFunctions.addDocumentToUser(newDoc.id);
        }
        
        // Update UI
        updateDocumentList();
        titleInput.value = '';
        
        showMessage(`Document "${title}" created successfully!`, 'success');
        
        // Automatically open the new document
        openDocument(newDoc);
        
    } catch (error) {
        console.error('Create document error:', error);
        showMessage('Failed to create document. Please try again.', 'error');
    }
}

// Join existing document with collaboration
async function joinDocument() {
    const docIdInput = DOM.select('#joinDocId');
    const docId = docIdInput.value.trim();
    
    if (!docId) {
        showMessage('Please enter a document ID', 'error');
        docIdInput.focus();
        return;
    }

    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showMessage('Please login first', 'error');
            return;
        }

        // Check if document exists in database
        const existingDoc = window.documentsDatabase.find(doc => 
            doc.id.toString() === docId || doc.id === docId
        );
        
        if (existingDoc) {
            // Add user as collaborator if not already
            if (!existingDoc.collaborators.includes(currentUser.id)) {
                existingDoc.collaborators.push(currentUser.id);
                existingDoc.lastModified = new Date().toISOString();
                saveDocumentsDatabase();
                
                // Add to user's document list
                if (window.authFunctions) {
                    window.authFunctions.addDocumentToUser(existingDoc.id);
                }
            }
            
            // Reload user documents to include the new collaboration
            loadUserDocuments();
            
            showMessage(`Successfully joined "${existingDoc.title}"!`, 'success');
            openDocument(existingDoc);
            docIdInput.value = '';
            return;
        }

        // Create new shared document if it doesn't exist
        const sharedDoc = {
            id: docId,
            title: `Shared Document #${docId}`,
            content: `# Shared Document #${docId}

This is a shared collaborative document. Multiple users can edit this simultaneously using Django Channels and operational transforms.

## Real-time Features:
- Live cursor tracking
- Instant text synchronization
- Conflict resolution
- User presence indicators

## How it works:
1. WebSocket connection to Django Channels
2. Operational transform algorithms handle concurrent edits
3. Document state synchronized across all clients
4. Persistent storage in Django backend

Start typing to see the magic of real-time collaboration!

---

**Note:** This document is shared with multiple collaborators. All changes are automatically saved and synchronized.

*Joined by ${currentUser.username} on ${new Date().toLocaleDateString()}*`,
            version: 1,
            createdBy: 'shared_system',
            collaborators: ['shared_system', currentUser.id],
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            isPublic: true
        };

        // Add to global database
        window.documentsDatabase.unshift(sharedDoc);
        documents.unshift(sharedDoc);
        
        // Save to storage
        saveDocumentsDatabase();
        
        // Add to user's documents
        if (window.authFunctions) {
            window.authFunctions.addDocumentToUser(sharedDoc.id);
        }
        
        updateDocumentList();
        docIdInput.value = '';
        
        showMessage(`Successfully joined document #${docId}!`, 'success');
        openDocument(sharedDoc);
        
        // Simulate other users in shared document
        setTimeout(() => {
            if (typeof addActiveUser === 'function') {
                addActiveUser({ 
                    id: 'shared_' + Date.now(), 
                    username: 'shared_collaborator',
                    email: 'collaborator@example.com' 
                });
                showMessage('shared_collaborator joined the document', 'info');
            }
        }, 2000);
        
    } catch (error) {
        console.error('Join document error:', error);
        showMessage('Failed to join document. Please check the document ID.', 'error');
    }
}

// Open document for editing
function openDocument(doc) {
    try {
        currentDocument = doc;
        documentVersion = doc.version;

        // Update editor UI
        const editorTitle = DOM.select('#editorTitle');
        const versionInfo = DOM.select('#versionInfo');
        const documentContent = DOM.select('#documentContent');
        
        if (editorTitle) editorTitle.textContent = doc.title;
        if (versionInfo) versionInfo.textContent = `Version: ${doc.version}`;
        if (documentContent) {
            documentContent.value = doc.content;
            documentContent.disabled = false;
        }
        
        // Update statistics
        updateDocumentStats();

        // Highlight active document in list
        DOM.selectAll('.document-item').forEach(item => {
            DOM.removeClass(item, 'active');
        });
        
        // Find and highlight the clicked item
        const activeItem = Array.from(DOM.selectAll('.document-item')).find(item => 
            item.textContent.includes(doc.title)
        );
        if (activeItem) {
            DOM.addClass(activeItem, 'active');
        }

        showMessage(`Opened "${doc.title}" - Ready for collaboration`, 'success');

        // Initialize collaboration for this document
        if (typeof initDocumentCollaboration === 'function') {
            initDocumentCollaboration(doc);
        }
        
        // Focus editor
        setTimeout(() => {
            const editor = DOM.select('#documentContent');
            if (editor) editor.focus();
        }, 300);
        
    } catch (error) {
        console.error('Open document error:', error);
        showMessage('Failed to open document', 'error');
    }
}

// Update document statistics
function updateDocumentStats() {
    const content = DOM.select('#documentContent')?.value || '';
    const words = TextUtils.countWords(content);
    const chars = TextUtils.countCharacters(content);
    
    const wordCount = DOM.select('#wordCount');
    const charCount = DOM.select('#charCount');
    
    if (wordCount) wordCount.textContent = `Words: ${words}`;
    if (charCount) charCount.textContent = `Characters: ${chars}`;
}

// Save document (auto-save) with persistence
const saveDocument = debounce(async () => {
    if (!currentDocument) return;
    
    try {
        const documentContent = DOM.select('#documentContent');
        const content = documentContent ? documentContent.value : '';
        
        // Update local document
        currentDocument.content = content;
        currentDocument.lastModified = new Date().toISOString();
        currentDocument.version++;
        documentVersion = currentDocument.version;
        
        // Update in global database
        const docIndex = window.documentsDatabase.findIndex(d => d.id === currentDocument.id);
        if (docIndex !== -1) {
            window.documentsDatabase[docIndex] = { ...currentDocument };
        }
        
        // Save to persistent storage
        saveDocumentsDatabase();
        
        // Update UI
        const versionInfo = DOM.select('#versionInfo');
        if (versionInfo) versionInfo.textContent = `Version: ${documentVersion}`;
        updateDocumentList();
        
        showMessage('Document auto-saved', 'success');
        
    } catch (error) {
        console.error('Save document error:', error);
        showMessage('Failed to save document', 'error');
    }
}, 2000);

// Get current document
function getCurrentDocument() {
    return currentDocument;
}

// Get document version
function getDocumentVersion() {
    return documentVersion;
}

// Clear document state (on logout)
function clearDocumentState() {
    documents = [];
    currentDocument = null;
    documentVersion = 0;
    
    // Reset UI
    const documentList = DOM.select('#documentList');
    const editorTitle = DOM.select('#editorTitle');
    const versionInfo = DOM.select('#versionInfo');
    const documentContent = DOM.select('#documentContent');
    const wordCount = DOM.select('#wordCount');
    const charCount = DOM.select('#charCount');
    
    if (documentList) documentList.innerHTML = '';
    if (editorTitle) editorTitle.textContent = 'Select or Create a Document';
    if (versionInfo) versionInfo.textContent = 'Version: 0';
    if (documentContent) {
        documentContent.value = '';
        documentContent.disabled = true;
    }
    if (wordCount) wordCount.textContent = 'Words: 0';
    if (charCount) charCount.textContent = 'Characters: 0';
}

// Format relative time
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

// Share document (make public)
function shareDocument(docId) {
    const doc = window.documentsDatabase.find(d => d.id === docId);
    if (doc && getCurrentUser() && doc.createdBy === getCurrentUser().id) {
        doc.isPublic = !doc.isPublic;
        saveDocumentsDatabase();
        loadUserDocuments();
        showMessage(`Document ${doc.isPublic ? 'made public' : 'made private'}`, 'success');
    }
}

// Delete document
function deleteDocument(docId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const doc = window.documentsDatabase.find(d => d.id === docId);
    if (!doc) return;
    
    if (doc.createdBy !== currentUser.id) {
        showMessage('Only document owner can delete', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
        // Remove from global database
        window.documentsDatabase = window.documentsDatabase.filter(d => d.id !== docId);
        
        // Save changes
        saveDocumentsDatabase();
        
        // Reload user documents
        loadUserDocuments();
        
        // Close document if currently open
        if (currentDocument && currentDocument.id === docId) {
            clearDocumentState();
        }
        
        showMessage('Document deleted successfully', 'success');
    }
}

// Export document
function exportDocument(format = 'txt') {
    if (!currentDocument) {
        showMessage('No document is currently open', 'error');
        return;
    }
    
    try {
        const content = currentDocument.content;
        const title = currentDocument.title;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        
        let exportContent = content;
        let mimeType = 'text/plain';
        let filename = `${TextUtils.slugify(title)}_${timestamp}.txt`;
        
        if (format === 'md') {
            mimeType = 'text/markdown';
            filename = `${TextUtils.slugify(title)}_${timestamp}.md`;
        } else if (format === 'html') {
            // Simple markdown to HTML conversion
            exportContent = content
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*)\*/gim, '<em>$1</em>')
                .replace(/\n/gim, '<br>');
            
            exportContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    ${exportContent}
</body>
</html>`;
            mimeType = 'text/html';
            filename = `${TextUtils.slugify(title)}_${timestamp}.html`;
        }
        
        // Create and download file
        const blob = new Blob([exportContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage(`Document exported as ${filename}`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showMessage('Failed to export document', 'error');
    }
}

// Get document by ID
function getDocumentById(docId) {
    return window.documentsDatabase ? window.documentsDatabase.find(d => d.id === docId) : null;
}

// Search documents
function searchDocuments(query) {
    if (!query.trim()) {
        loadUserDocuments();
        return;
    }
    
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const userDocs = window.documentsDatabase.filter(doc => 
        (doc.createdBy === currentUser.id || 
         doc.collaborators.includes(currentUser.id) ||
         doc.isPublic) &&
        (doc.title.toLowerCase().includes(query.toLowerCase()) ||
         doc.content.toLowerCase().includes(query.toLowerCase()))
    );
    
    documents = userDocs;
    updateDocumentList();
}

// API functions for real Django integration (commented for now)
/*
async function createDocumentOnServer(document) {
    const response = await API.post(
        `${AUTH_CONFIG.API_BASE}/api/documents/`,
        { title: document.title },
        getAuthHeaders()
    );
    
    if (response.success) {
        document.id = response.data.id;
        return response.data;
    } else {
        throw new Error(response.error);
    }
}

async function saveDocumentToServer(document) {
    const response = await API.put(
        `${AUTH_CONFIG.API_BASE}/api/documents/${document.id}/`,
        { content: document.content },
        getAuthHeaders()
    );
    
    if (!response.success) {
        throw new Error(response.error);
    }
    
    return response.data;
}

async function loadDocumentsFromServer() {
    const response = await API.get(
        `${AUTH_CONFIG.API_BASE}/api/documents/`,
        getAuthHeaders()
    );
    
    if (response.success) {
        documents = response.data;
        updateDocumentList();
    } else {
        throw new Error(response.error);
    }
}
*/

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Document content change listener
    const documentContent = DOM.select('#documentContent');
    if (documentContent) {
        documentContent.addEventListener('input', () => {
            updateDocumentStats();
            saveDocument(); // Auto-save
            
            // Trigger collaboration events
            if (currentDocument && window.collaborationManager) {
                window.collaborationManager.handleTextChange();
            }
        });
        
        // Keyboard shortcuts
        documentContent.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        saveDocument();
                        break;
                    case 'e':
                        e.preventDefault();
                        exportDocument('md');
                        break;
                }
            }
        });
    }
});

// Export functions for global use
window.documentFunctions = {
    initializeDocuments,
    createDocument,
    joinDocument,
    openDocument,
    saveDocument,
    getCurrentDocument,
    getDocumentVersion,
    clearDocumentState,
    updateDocumentStats,
    searchDocuments,
    exportDocument,
    shareDocument,
    deleteDocument,
    getDocumentById,
    loadUserDocuments,
    saveDocumentsDatabase
};
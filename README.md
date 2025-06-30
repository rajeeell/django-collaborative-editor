# CollabEdit Django Backend

Real-time collaborative document editor backend built with Django and Django Channels.

## Features

- **Django REST Framework** - RESTful API endpoints
- **Django Channels** - WebSocket support for real-time collaboration
- **JWT Authentication** - Secure token-based authentication
- **Operational Transforms** - Conflict resolution algorithms
- **Real-time Document Editing** - Multiple users can edit simultaneously
- **User Management** - Registration, profiles, and permissions

## Quick Setup

### 1. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Variables
Create `.env` file:
```bash
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

### 4. Database Setup
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### 5. Run Server
```bash
# Development server
python manage.py runserver

# For WebSocket support in production
daphne -b 0.0.0.0 -p 8000 collaborative_editor.asgi:application
```

## API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Refresh JWT token
- `POST /api/auth/register/` - User registration

### Documents
- `GET /api/documents/` - List user documents
- `POST /api/documents/` - Create new document
- `GET /api/documents/{id}/` - Get specific document
- `PUT /api/documents/{id}/` - Update document
- `DELETE /api/documents/{id}/` - Delete document

### Collaboration
- `POST /api/documents/{id}/join/` - Join document as collaborator
- `POST /api/documents/{id}/collaborators/` - Add collaborator
- `GET /api/documents/{id}/sessions/` - Get active sessions
- `GET /api/documents/{id}/operations/` - Get operation history

### WebSocket
- `ws://localhost:8000/ws/document/{id}/` - Real-time collaboration

## WebSocket Events

### Client to Server
```json
{
  "type": "operation",
  "operation": {
    "type": "insert",
    "position": 10,
    "content": "Hello World"
  }
}
```

### Server to Client
```json
{
  "type": "operation",
  "operation": {...},
  "user_id": 123,
  "username": "alice",
  "version": 15
}
```

## Production Deployment

### 1. Environment Setup
```bash
DEBUG=False
SECRET_KEY=production-secret-key
ALLOWED_HOSTS=yourdomain.com
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### 2. Static Files
```bash
python manage.py collectstatic
```

### 3. Database Migration
```bash
python manage.py migrate
```

### 4. Run with Daphne
```bash
daphne -b 0.0.0.0 -p 8000 collaborative_editor.asgi:application
```

## Architecture

```
┌─────────────────┐
│   Django Views  │ ← REST API endpoints
├─────────────────┤
│ Django Channels │ ← WebSocket handling
├─────────────────┤
│ Operational     │ ← Conflict resolution
│ Transforms      │
├─────────────────┤
│   Database      │ ← PostgreSQL/SQLite
│   (Models)      │
└─────────────────┘
```

## Models

### Document
- `id` - UUID primary key
- `title` - Document title
- `content` - Document content
- `created_by` - Document owner
- `collaborators` - M2M relationship with users
- `version` - Document version number
- `is_public` - Public access flag

### Operation
- `document` - Foreign key to document
- `user` - User who performed operation
- `operation_type` - insert/delete/retain
- `position` - Position in document
- `content` - Content for operation
- `version` - Document version when operation occurred

### DocumentSession
- `document` - Foreign key to document
- `user` - Active user
- `cursor_position` - User's cursor position
- `is_active` - Session status

## Development

### Running Tests
```bash
python manage.py test
```

### Database Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Create Superuser
```bash
python manage.py createsuperuser
```

### Django Shell
```bash
python manage.py shell
```

## Troubleshooting

### Common Issues

**ASGI/WebSocket not working:**
- Ensure `daphne` is installed
- Check `ASGI_APPLICATION` setting
- Verify channel layers configuration

**Database errors:**
- Run migrations: `python manage.py migrate`
- Check database permissions
- Verify connection settings

**Authentication issues:**
- Check JWT settings in `settings.py`
- Ensure token is being sent in WebSocket auth
- Verify user permissions

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit pull request

## License

MIT License - see LICENSE file for details.
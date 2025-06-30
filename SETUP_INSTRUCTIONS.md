# CollabEdit - Setup Instructions

## Prerequisites
- Python 3.8+ 
- pip
- Git (optional)

## Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Create .env file** (already provided)
Make sure the `.env` file is in the backend directory

5. **Run database migrations**
```bash
python manage.py makemigrations
python manage.py migrate
```

6. **Create superuser (optional)**
```bash
python manage.py createsuperuser
```

7. **Start Django development server**
```bash
python manage.py runserver
```

## Frontend Setup

1. **Open the project in browser**
   - Simply open `index.html` in your web browser
   - Or use a simple HTTP server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js (if you have it)
npx serve .
```

2. **Access the application**
   - Frontend: `http://localhost:8080` (or just open index.html)
   - Backend API: `http://localhost:8000`
   - Django Admin: `http://localhost:8000/admin`

## Demo Account Credentials

The system comes with pre-configured demo accounts:

- **Email:** `demo@collabedit.com` **Password:** `demo123`
- **Email:** `alice@test.com` **Password:** `demo123`  
- **Email:** `bob@test.com` **Password:** `demo123`

## Testing the Application

1. **Login** with any demo account
2. **Create a new document** or **join an existing one**
3. **Start typing** to see real-time collaboration features
4. **Open multiple browser tabs** to test multi-user editing
5. **Use admin functions** to view users and system stats

## Features to Test

### Authentication
- ✅ User registration and login
- ✅ JWT token authentication
- ✅ Persistent sessions

### Document Management
- ✅ Create new documents
- ✅ Join shared documents
- ✅ Auto-save functionality
- ✅ Export documents (TXT, MD, HTML)

### Real-time Collaboration
- ✅ Live editing synchronization
- ✅ User presence indicators
- ✅ Operation history logging
- ✅ Operational transform algorithms

### Backend Integration
- ✅ Django REST API endpoints
- ✅ WebSocket connections (simulated)
- ✅ Database persistence
- ✅ Admin interface

## Production Deployment

### Environment Variables
Update `.env` file for production:
```env
DEBUG=False
SECRET_KEY=your-production-secret-key
ALLOWED_HOSTS=your-domain.com
REDIS_URL=redis://your-redis-server:6379
```

### Database
For production, switch to PostgreSQL:
```bash
pip install psycopg2-binary
```

Update `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/collabedit_db
```

### Redis Setup
Install and configure Redis for Channels:
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Start Redis
redis-server
```

### Static Files
```bash
python manage.py collectstatic
```

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Make sure virtual environment is activated
   - Run `pip install -r requirements.txt`

2. **Database errors**
   - Run `python manage.py migrate`
   - Delete `db.sqlite3` and run migrations again

3. **WebSocket connection issues**
   - Check if Django Channels is properly installed
   - Verify Redis is running (for production)

4. **CORS errors**
   - Check `CORS_ALLOWED_ORIGINS` in settings
   - Make sure frontend and backend URLs match

### Development Tips

- Use Django admin at `/admin` to inspect data
- Check browser console for JavaScript errors  
- Monitor Django logs for backend issues
- Use `collabedit.debug()` in browser console for app state

## API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration  
- `POST /api/auth/refresh/` - Refresh JWT token

### Documents
- `GET /api/documents/` - List user documents
- `POST /api/documents/` - Create new document
- `GET /api/documents/{id}/` - Get document details
- `PUT /api/documents/{id}/` - Update document
- `DELETE /api/documents/{id}/` - Delete document

### Collaboration
- `POST /api/documents/{id}/join/` - Join document
- `POST /api/documents/{id}/leave/` - Leave document
- `POST /api/documents/{id}/collaborators/` - Add collaborator
- `GET /api/documents/{id}/operations/` - Get operation history

### WebSocket
- `ws://localhost:8000/ws/document/{id}/?token={jwt}` - Document WebSocket

## File Structure
```
collaborative-editor-frontend/
├── backend/
│   ├── accounts/           # User authentication
│   ├── documents/          # Document management  
│   ├── collaborative_editor/  # Main Django project
│   ├── requirements.txt    # Python dependencies
│   ├── .env               # Environment variables
│   └── manage.py          # Django management script
├── css/                   # Frontend styles
├── js/                    # Frontend JavaScript
├── index.html            # Main HTML file
└── README.md            # Project documentation
```

## Next Steps

1. **Enable real WebSocket** connections by starting Redis
2. **Add rich text editing** with a WYSIWYG editor
3. **Implement document versioning** and history
4. **Add user permissions** and document sharing controls  
5. **Deploy to production** using Docker or cloud platforms

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Django and Channels documentation
3. Use browser dev tools to debug frontend issues
4. Check Django logs for backend problems
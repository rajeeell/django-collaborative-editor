# Django Collaborative Editor

A real-time collaborative document editor built with Django, Django Channels, and JavaScript. Multiple users can edit documents simultaneously with live synchronization and conflict resolution.

![Demo](https://img.shields.io/badge/Demo-Live-green)
![Django](https://img.shields.io/badge/Django-4.2.7-blue)
![WebSocket](https://img.shields.io/badge/WebSocket-Channels-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🚀 Features

### ✨ Real-Time Collaboration
- **Multi-user editing** with live synchronization
- **Operational Transform** algorithms for conflict resolution
- **User presence indicators** showing who's online
- **Live cursor tracking** and user awareness
- **Operation history** with detailed change logs

### 🔐 User Management
- **User registration and authentication**
- **JWT token-based security**
- **Persistent user sessions**
- **User profiles and preferences**
- **Document permissions** (public/private)

### 📝 Document Features
- **Create and share documents**
- **Auto-save functionality**
- **Version control** with incremental versioning
- **Document collaboration** via ID sharing
- **Export documents** (TXT, MD, HTML)

### ⚡ Technical Features
- **Django Channels** for WebSocket communication
- **RESTful API** design
- **Operational Transform** implementation
- **Real-time data synchronization**
- **Scalable architecture** ready for production

## 🛠️ Tech Stack

### Backend
- **Django 4.2.7** - Web framework
- **Django Channels** - WebSocket support
- **Django REST Framework** - API development
- **SQLite/PostgreSQL** - Database
- **JWT Authentication** - Secure token-based auth

### Frontend
- **Vanilla JavaScript** - Core functionality
- **WebSocket API** - Real-time communication
- **Responsive CSS** - Modern UI design
- **Local Storage** - Client-side persistence

### Infrastructure
- **Redis** (production) - Channel layer scaling
- **Daphne** - ASGI server
- **CORS** - Cross-origin resource sharing

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/django-collaborative-editor.git
cd django-collaborative-editor
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Database Setup**
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

4. **Start Django Server**
```bash
python manage.py runserver
```

5. **Open Frontend**
- Open `index.html` in your browser
- Or serve with: `python -m http.server 8080`

## 🎯 Demo Accounts

```
Email: demo@collabedit.com
Password: demo123

Email: alice@test.com
Password: demo123

Email: bob@test.com
Password: demo123
```

## 📱 Usage

### Creating Documents
1. **Login** with your account
2. **Enter document title**
3. **Click "Create"**
4. **Start editing** - auto-saves every 2 seconds

### Collaboration
1. **Share document ID** with collaborators
2. **Others join** using "Join Document" feature
3. **Edit simultaneously** - see real-time updates
4. **View active users** and operation history

### Administration
- **Django Admin:** http://localhost:8000/admin
- **API Health:** http://localhost:8000/health
- **User Management:** Admin panel
- **Document Analytics:** Operation logs

## 🏗️ Architecture

### System Design
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Django API    │    │   Database      │
│   JavaScript    │◄──►│   REST + WS     │◄──►│   SQLite/PG     │
│   WebSocket     │    │   Channels      │    │   Models        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
1. **User Action** → Frontend JavaScript
2. **WebSocket Message** → Django Channels Consumer
3. **Operational Transform** → Conflict Resolution
4. **Database Update** → Model Persistence
5. **Broadcast Update** → All Connected Users

## 🧪 API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `POST /api/auth/refresh/` - Token refresh

### Documents
- `GET /api/documents/` - List user documents
- `POST /api/documents/` - Create new document
- `GET /api/documents/{id}/` - Get document details
- `PUT /api/documents/{id}/` - Update document
- `DELETE /api/documents/{id}/` - Delete document

### Collaboration
- `WS /ws/document/{id}/` - WebSocket connection
- `POST /api/documents/{id}/join/` - Join document
- `GET /api/documents/{id}/operations/` - Operation history

## 🔧 Development

### Project Structure
```
django-collaborative-editor/
├── backend/                 # Django backend
│   ├── accounts/           # User management
│   ├── documents/          # Document management
│   ├── collaborative_editor/  # Main project
│   ├── requirements.txt    # Dependencies
│   └── manage.py          # Django CLI
├── frontend/              # Frontend assets
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript modules
│   └── index.html        # Main interface
└── README.md             # This file
```

### Key Components
- **WebSocket Consumer** - Real-time message handling
- **Operational Transform** - Conflict resolution algorithm
- **Document Models** - Data persistence layer
- **Authentication System** - User management
- **REST API** - HTTP endpoints

## 🚀 Production Deployment

### Environment Variables
```bash
DEBUG=False
SECRET_KEY=your-production-secret
ALLOWED_HOSTS=your-domain.com
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://localhost:6379
```

### Docker Deployment
```dockerfile
# Example Dockerfile structure
FROM python:3.9
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["daphne", "collaborative_editor.asgi:application"]
```

### Scaling Considerations
- **Redis** for channel layer scaling
- **PostgreSQL** for production database
- **Load balancer** for multiple instances
- **CDN** for static assets

## 🤝 Contributing

1. **Fork** the repository
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Interview Highlights

This project demonstrates:
- ✅ **Advanced Django** concepts (Channels, WebSockets)
- ✅ **Real-time systems** design and implementation
- ✅ **Database modeling** and relationships
- ✅ **API design** and RESTful principles
- ✅ **Authentication** and security
- ✅ **Frontend integration** with backend services
- ✅ **Production-ready** architecture patterns

## 📞 Contact

**Developer:** [Your Name]  
**Email:** your.email@example.com  
**LinkedIn:** [Your LinkedIn Profile]  
**Portfolio:** [Your Portfolio Website]

---

⭐ **Star this repository** if you found it helpful for your Django learning journey!

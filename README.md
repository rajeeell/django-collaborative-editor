# Django Collaborative Editor

Real-time collaborative document editor built with Django, Django Channels, and JavaScript. Multiple users can edit documents simultaneously with live synchronization and conflict resolution.

[![Django](https://img.shields.io/badge/Django-4.2.7-092E20?logo=django&logoColor=white)](https://djangoproject.com/)
[![Channels](https://img.shields.io/badge/Django_Channels-4.0.0-blue)](https://channels.readthedocs.io/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-green)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

## 🚀 Features

- **Real-time multi-user editing** with live synchronization
- **Operational Transform algorithms** for conflict resolution
- **User authentication** with JWT tokens
- **Document sharing** via unique IDs
- **Auto-save** functionality
- **Export documents** (TXT, MD, HTML)
- **Django admin** panel for management

## 🛠️ Tech Stack

**Backend:** Django 4.2.7, Django Channels, Django REST Framework, SQLite  
**Frontend:** JavaScript, WebSocket API, CSS3  
**Real-time:** WebSocket communication, Operational Transform

## ⚡ Quick Start

```bash
# Clone repository
git clone https://github.com/rajeeell/django-collaborative-editor.git
cd django-collaborative-editor

# Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Database setup
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Start server
python manage.py runserver
```

**Open `index.html` in your browser**

## 🎯 Demo Accounts

```
Email: demo@collabedit.com     Password: demo123
Email: alice@test.com          Password: demo123
Email: bob@test.com            Password: demo123
```

## 📱 Usage

1. **Login** with demo account or register new user
2. **Create document** by entering title and clicking "Create"
3. **Share document ID** with collaborators
4. **Others join** using "Join Document" feature
5. **Edit simultaneously** - see real-time updates

## 🏗️ Architecture

```
Frontend (JS) ↔ Django API ↔ Database
     ↓              ↓
WebSocket ↔ Django Channels
```

- **WebSocket** for real-time communication
- **Operational Transform** for conflict resolution
- **REST API** for document management
- **JWT authentication** for security

## 🌐 API Endpoints

- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `GET /api/documents/` - List documents
- `POST /api/documents/` - Create document
- `WS /ws/document/{id}/` - Real-time collaboration

---

**Developer:** [@rajeeell](https://github.com/rajeeell)

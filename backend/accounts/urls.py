from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('register/', views.UserRegisterView.as_view(), name='user-register'),
    
    # User profile
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    path('me/', views.current_user, name='current-user'),
    
    # User management
    path('change-password/', views.change_password, name='change-password'),
    path('delete-account/', views.delete_account, name='delete-account'),
    
    # User search and discovery
    path('search/', views.search_users, name='search-users'),
    path('users/<str:username>/', views.UserDetailView.as_view(), name='user-detail'),
]
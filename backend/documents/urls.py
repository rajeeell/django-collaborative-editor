from django.urls import path
from . import views

urlpatterns = [
    # Document CRUD
    path('', views.DocumentListCreateView.as_view(), name='document-list-create'),
    path('<uuid:pk>/', views.DocumentDetailView.as_view(), name='document-detail'),
    
    # Document collaboration
    path('<uuid:document_id>/join/', views.join_document, name='join-document'),
    path('<uuid:document_id>/leave/', views.leave_document, name='leave-document'),
    path('<uuid:document_id>/toggle-public/', views.toggle_document_public, name='toggle-document-public'),
    
    # Collaborator management
    path('<uuid:document_id>/collaborators/', views.add_collaborator, name='add-collaborator'),
    path('<uuid:document_id>/collaborators/<int:user_id>/', views.remove_collaborator, name='remove-collaborator'),
    
    # Document history and sessions
    path('<uuid:document_id>/operations/', views.document_operations, name='document-operations'),
    path('<uuid:document_id>/sessions/', views.document_sessions, name='document-sessions'),
]
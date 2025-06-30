from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db.models import Q  # Add this import
from .models import Document, Operation, DocumentSession
from .serializers import (
    DocumentSerializer, 
    DocumentCreateSerializer,
    OperationSerializer,
    DocumentSessionSerializer
)
import logging

logger = logging.getLogger(__name__)

class DocumentListCreateView(generics.ListCreateAPIView):
    """List documents and create new documents"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get documents accessible to the current user"""
        user = self.request.user
        return Document.objects.filter(
            Q(created_by=user) | Q(collaborators=user) | Q(is_public=True),
            is_active=True
        ).distinct().select_related('created_by').prefetch_related('collaborators')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on request method"""
        if self.request.method == 'POST':
            return DocumentCreateSerializer
        return DocumentSerializer
    
    def perform_create(self, serializer):
        """Create a new document"""
        document = serializer.save(created_by=self.request.user)
        document.collaborators.add(self.request.user)
        logger.info(f"Document '{document.title}' created by {self.request.user.username}")

class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a specific document"""
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get documents accessible to the current user"""
        user = self.request.user
        return Document.objects.filter(
            Q(created_by=user) | Q(collaborators=user) | Q(is_public=True),
            is_active=True
        ).select_related('created_by').prefetch_related('collaborators')
    
    def perform_update(self, serializer):
        """Update document and increment version"""
        document = serializer.save()
        document.increment_version()
        logger.info(f"Document '{document.title}' updated by {self.request.user.username}")
    
    def perform_destroy(self, instance):
        """Soft delete document (mark as inactive)"""
        if instance.created_by != self.request.user:
            return Response(
                {'error': 'Only document owner can delete'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.is_active = False
        instance.save()
        logger.info(f"Document '{instance.title}' deleted by {self.request.user.username}")

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_collaborator(request, document_id):
    """Add a collaborator to a document"""
    document = get_object_or_404(Document, id=document_id, is_active=True)
    
    # Check if user is document owner
    if document.created_by != request.user:
        return Response(
            {'error': 'Only document owner can add collaborators'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    user_id = request.data.get('user_id')
    email = request.data.get('email')
    
    # Find user by ID or email
    collaborator = None
    if user_id:
        try:
            collaborator = User.objects.get(id=user_id)
        except User.DoesNotExist:
            pass
    elif email:
        try:
            collaborator = User.objects.get(email=email)
        except User.DoesNotExist:
            pass
    
    if not collaborator:
        return Response(
            {'error': 'User not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if user is already a collaborator
    if collaborator in document.collaborators.all():
        return Response(
            {'error': 'User is already a collaborator'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    document.add_collaborator(collaborator)
    logger.info(f"User {collaborator.username} added as collaborator to '{document.title}'")
    
    return Response({
        'message': 'Collaborator added successfully',
        'collaborator': {
            'id': collaborator.id,
            'username': collaborator.username,
            'email': collaborator.email
        }
    })

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def remove_collaborator(request, document_id, user_id):
    """Remove a collaborator from a document"""
    document = get_object_or_404(Document, id=document_id, is_active=True)
    
    # Check if user is document owner
    if document.created_by != request.user:
        return Response(
            {'error': 'Only document owner can remove collaborators'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        collaborator = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    document.remove_collaborator(collaborator)
    logger.info(f"User {collaborator.username} removed from '{document.title}'")
    
    return Response({'message': 'Collaborator removed successfully'})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def document_operations(request, document_id):
    """Get operation history for a document"""
    document = get_object_or_404(Document, id=document_id, is_active=True)
    
    # Check document access
    if not document.has_access(request.user):
        return Response(
            {'error': 'Access denied'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get recent operations
    limit = int(request.GET.get('limit', 50))
    operations = Operation.objects.filter(
        document=document
    ).select_related('user').order_by('-timestamp')[:limit]
    
    serializer = OperationSerializer(operations, many=True)
    return Response({
        'operations': serializer.data,
        'total_count': operations.count()
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def document_sessions(request, document_id):
    """Get active sessions for a document"""
    document = get_object_or_404(Document, id=document_id, is_active=True)
    
    # Check document access
    if not document.has_access(request.user):
        return Response(
            {'error': 'Access denied'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get active sessions
    sessions = DocumentSession.objects.filter(
        document=document,
        is_active=True
    ).select_related('user').order_by('-last_seen')
    
    serializer = DocumentSessionSerializer(sessions, many=True)
    return Response({
        'active_sessions': serializer.data,
        'total_active': sessions.count()
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def join_document(request, document_id):
    """Join a document as a collaborator"""
    try:
        document = Document.objects.get(id=document_id, is_active=True)
    except Document.DoesNotExist:
        return Response(
            {'error': 'Document not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if document is public or user has access
    if not document.is_public and not document.has_access(request.user):
        return Response(
            {'error': 'Access denied'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Add user as collaborator if not already
    if request.user not in document.collaborators.all():
        document.add_collaborator(request.user)
        logger.info(f"User {request.user.username} joined document '{document.title}'")
    
    serializer = DocumentSerializer(document)
    return Response({
        'message': 'Successfully joined document',
        'document': serializer.data
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def leave_document(request, document_id):
    """Leave a document (remove self as collaborator)"""
    document = get_object_or_404(Document, id=document_id, is_active=True)
    
    # Owner cannot leave their own document
    if document.created_by == request.user:
        return Response(
            {'error': 'Document owner cannot leave their own document'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    document.remove_collaborator(request.user)
    
    # Mark session as inactive
    DocumentSession.objects.filter(
        document=document,
        user=request.user
    ).update(is_active=False)
    
    logger.info(f"User {request.user.username} left document '{document.title}'")
    
    return Response({'message': 'Successfully left document'})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_document_public(request, document_id):
    """Toggle document public/private status"""
    document = get_object_or_404(Document, id=document_id, is_active=True)
    
    # Only owner can change public status
    if document.created_by != request.user:
        return Response(
            {'error': 'Only document owner can change public status'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    document.is_public = not document.is_public
    document.save(update_fields=['is_public'])
    
    status_text = 'public' if document.is_public else 'private'
    logger.info(f"Document '{document.title}' made {status_text} by {request.user.username}")
    
    return Response({
        'message': f'Document made {status_text}',
        'is_public': document.is_public
    })
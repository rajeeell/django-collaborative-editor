from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db.models import Q  # Add this import
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile
from .serializers import (
    UserSerializer, 
    UserProfileSerializer, 
    UserRegisterSerializer,
    UserDetailSerializer,
    PasswordChangeSerializer
)
import logging

logger = logging.getLogger(__name__)

class UserRegisterView(generics.CreateAPIView):
    """User registration endpoint"""
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        """Create new user account"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create user
        user = serializer.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        logger.info(f"New user registered: {user.username}")
        
        return Response({
            'message': 'User created successfully',
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(access_token),
        }, status=status.HTTP_201_CREATED)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """User profile management"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """Get current user's profile"""
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

class UserDetailView(generics.RetrieveAPIView):
    """Get user details"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'username'

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    """Get current authenticated user"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """Change user password"""
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not current_password or not new_password:
        return Response(
            {'error': 'Both current and new passwords are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verify current password
    if not request.user.check_password(current_password):
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate new password
    if len(new_password) < 6:
        return Response(
            {'error': 'Password must be at least 6 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Update password
    request.user.set_password(new_password)
    request.user.save()
    
    logger.info(f"Password changed for user: {request.user.username}")
    
    return Response({'message': 'Password changed successfully'})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def search_users(request):
    """Search for users by username or email"""
    query = request.GET.get('q', '').strip()
    
    if not query or len(query) < 2:
        return Response(
            {'error': 'Search query must be at least 2 characters'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Search users (exclude current user)
    users = User.objects.filter(
        Q(username__icontains=query) | Q(email__icontains=query)
    ).exclude(id=request.user.id)[:10]  # Limit to 10 results
    
    serializer = UserSerializer(users, many=True)
    return Response({
        'users': serializer.data,
        'total': users.count()
    })

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_account(request):
    """Delete user account"""
    password = request.data.get('password')
    
    if not password:
        return Response(
            {'error': 'Password is required to delete account'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verify password
    if not request.user.check_password(password):
        return Response(
            {'error': 'Password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    username = request.user.username
    
    # Delete user account
    request.user.delete()
    
    logger.info(f"User account deleted: {username}")
    
    return Response({'message': 'Account deleted successfully'})
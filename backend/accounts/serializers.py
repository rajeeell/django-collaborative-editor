from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    display_name = serializers.CharField(source='profile.display_name', read_only=True)
    avatar = serializers.URLField(source='profile.avatar', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'date_joined', 'display_name', 'avatar'
        ]
        read_only_fields = ['id', 'date_joined']

class UserRegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate_username(self, value):
        """Validate username"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate_email(self, value):
        """Validate email"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        return attrs
    
    def create(self, validated_data):
        """Create new user"""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    
    class Meta:
        model = UserProfile
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'bio', 'avatar', 'preferred_name', 'timezone', 'theme',
            'email_notifications', 'created_at', 'updated_at'
        ]
        read_only_fields = ['username', 'email', 'created_at', 'updated_at']
    
    def update(self, instance, validated_data):
        """Update user profile and related user fields"""
        # Update User model fields
        user_data = {}
        if 'user' in validated_data:
            user_data = validated_data.pop('user')
        
        for attr, value in user_data.items():
            setattr(instance.user, attr, value)
        instance.user.save()
        
        # Update UserProfile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance

class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer with profile information"""
    profile = UserProfileSerializer(read_only=True)
    document_count = serializers.SerializerMethodField()
    collaboration_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'date_joined', 'profile', 'document_count', 'collaboration_count'
        ]
    
    def get_document_count(self, obj):
        """Get number of documents created by user"""
        return obj.created_documents.filter(is_active=True).count()
    
    def get_collaboration_count(self, obj):
        """Get number of documents user collaborates on"""
        return obj.collaborated_documents.filter(is_active=True).count()

class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    
    def validate_current_password(self, value):
        """Validate current password"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect")
        return value
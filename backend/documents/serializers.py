from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Document, Operation, DocumentSession, DocumentInvite

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']

class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document model"""
    created_by = UserSerializer(read_only=True)
    collaborators = UserSerializer(many=True, read_only=True)
    collaborator_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'title', 'content', 'created_by', 'collaborators',
            'created_at', 'last_modified', 'version', 'is_public',
            'collaborator_count', 'is_owner', 'user_role'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_at', 'last_modified', 'version',
            'collaborator_count', 'is_owner', 'user_role'
        ]
    
    def get_collaborator_count(self, obj):
        """Get number of collaborators"""
        return obj.collaborators.count()
    
    def get_is_owner(self, obj):
        """Check if current user is the owner"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.created_by == request.user
        return False
    
    def get_user_role(self, obj):
        """Get current user's role in the document"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if obj.created_by == request.user:
                return 'owner'
            elif request.user in obj.collaborators.all():
                return 'collaborator'
            elif obj.is_public:
                return 'viewer'
        return 'none'

class DocumentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating documents"""
    class Meta:
        model = Document
        fields = ['title', 'content', 'is_public']
        
    def validate_title(self, value):
        """Validate document title"""
        if not value.strip():
            raise serializers.ValidationError("Title cannot be empty")
        if len(value) > 255:
            raise serializers.ValidationError("Title is too long")
        return value.strip()

class DocumentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for document lists"""
    created_by = serializers.StringRelatedField()
    collaborator_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'title', 'created_by', 'created_at', 'last_modified',
            'version', 'is_public', 'collaborator_count', 'is_owner'
        ]
    
    def get_collaborator_count(self, obj):
        return obj.collaborators.count()
    
    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.created_by == request.user
        return False

class OperationSerializer(serializers.ModelSerializer):
    """Serializer for Operation model"""
    user = UserSerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Operation
        fields = [
            'id', 'operation_type', 'position', 'content', 'length',
            'version', 'timestamp', 'user', 'username'
        ]
        read_only_fields = ['id', 'timestamp', 'user', 'username']

class DocumentSessionSerializer(serializers.ModelSerializer):
    """Serializer for DocumentSession model"""
    user = UserSerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = DocumentSession
        fields = [
            'id', 'user', 'username', 'cursor_position', 'selection',
            'joined_at', 'last_seen', 'is_active'
        ]
        read_only_fields = ['id', 'user', 'username', 'joined_at']

class DocumentInviteSerializer(serializers.ModelSerializer):
    """Serializer for DocumentInvite model"""
    document = DocumentListSerializer(read_only=True)
    invited_by = UserSerializer(read_only=True)
    invited_user = UserSerializer(read_only=True)
    
    class Meta:
        model = DocumentInvite
        fields = [
            'id', 'document', 'invited_by', 'invited_user',
            'created_at', 'accepted_at', 'is_accepted'
        ]
        read_only_fields = ['id', 'created_at', 'accepted_at']

class AddCollaboratorSerializer(serializers.Serializer):
    """Serializer for adding collaborators"""
    user_id = serializers.IntegerField(required=False)
    email = serializers.EmailField(required=False)
    
    def validate(self, data):
        """Validate that either user_id or email is provided"""
        if not data.get('user_id') and not data.get('email'):
            raise serializers.ValidationError(
                "Either user_id or email must be provided"
            )
        return data

class DocumentContentUpdateSerializer(serializers.Serializer):
    """Serializer for updating document content"""
    content = serializers.CharField()
    version = serializers.IntegerField(required=False)
    
    def validate_content(self, value):
        """Validate content length"""
        if len(value) > 1000000:  # 1MB limit
            raise serializers.ValidationError("Content is too large")
        return value
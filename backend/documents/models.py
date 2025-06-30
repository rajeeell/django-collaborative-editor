from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid

class Document(models.Model):
    """Document model for collaborative editing"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content = models.TextField(default='')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_documents')
    collaborators = models.ManyToManyField(User, related_name='collaborated_documents', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    version = models.PositiveIntegerField(default=0)
    is_public = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-last_modified']
        indexes = [
            models.Index(fields=['created_by', '-last_modified']),
            models.Index(fields=['is_public', '-last_modified']),
        ]

    def __str__(self):
        return f"{self.title} (v{self.version})"

    def add_collaborator(self, user):
        """Add a user as collaborator"""
        self.collaborators.add(user)
        return True

    def remove_collaborator(self, user):
        """Remove a user from collaborators"""
        self.collaborators.remove(user)
        return True

    def has_access(self, user):
        """Check if user has access to this document"""
        return (
            self.created_by == user or 
            user in self.collaborators.all() or 
            self.is_public
        )

    def increment_version(self):
        """Increment document version"""
        self.version += 1
        self.last_modified = timezone.now()
        self.save(update_fields=['version', 'last_modified'])

class Operation(models.Model):
    """Operation model for tracking document changes"""
    OPERATION_TYPES = [
        ('insert', 'Insert'),
        ('delete', 'Delete'),
        ('retain', 'Retain'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='operations')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    operation_type = models.CharField(max_length=10, choices=OPERATION_TYPES)
    position = models.PositiveIntegerField()
    content = models.TextField(blank=True)
    length = models.PositiveIntegerField(default=0)
    version = models.PositiveIntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['document', 'timestamp']),
            models.Index(fields=['document', 'version']),
        ]

    def __str__(self):
        return f"{self.operation_type} by {self.user.username} at {self.position}"

    def to_dict(self):
        """Convert operation to dictionary for JSON serialization"""
        return {
            'id': str(self.id),
            'type': self.operation_type,
            'position': self.position,
            'content': self.content,
            'length': self.length,
            'user_id': self.user.id,
            'username': self.user.username,
            'version': self.version,
            'timestamp': self.timestamp.isoformat()
        }

class DocumentSession(models.Model):
    """Track active user sessions in documents"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='sessions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    cursor_position = models.JSONField(default=dict)
    selection = models.JSONField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    channel_name = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ('document', 'user')
        indexes = [
            models.Index(fields=['document', 'is_active']),
            models.Index(fields=['last_seen']),
        ]

    def __str__(self):
        return f"{self.user.username} in {self.document.title}"

    def update_cursor(self, cursor, selection=None):
        """Update cursor position and selection"""
        self.cursor_position = cursor
        self.selection = selection
        self.last_seen = timezone.now()
        self.save(update_fields=['cursor_position', 'selection', 'last_seen'])

    def mark_inactive(self):
        """Mark session as inactive"""
        self.is_active = False
        self.save(update_fields=['is_active'])

class DocumentInvite(models.Model):
    """Document invitation model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='invites')
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invites')
    invited_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_invites')
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    is_accepted = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('document', 'invited_user')
        indexes = [
            models.Index(fields=['invited_user', 'is_accepted']),
        ]

    def accept(self):
        """Accept the invitation"""
        self.is_accepted = True
        self.accepted_at = timezone.now()
        self.save()
        self.document.add_collaborator(self.invited_user)

    def __str__(self):
        return f"Invite to {self.document.title} for {self.invited_user.username}"
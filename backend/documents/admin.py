from django.contrib import admin
from django.utils.html import format_html
from .models import Document, Operation, DocumentSession, DocumentInvite

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    """Admin for Document model"""
    list_display = ['title', 'created_by', 'version', 'collaborator_count', 'is_public', 'is_active', 'created_at']
    list_filter = ['is_public', 'is_active', 'created_at', 'last_modified']
    search_fields = ['title', 'created_by__username', 'created_by__email']
    readonly_fields = ['id', 'version', 'created_at', 'last_modified', 'collaborator_list']
    filter_horizontal = ['collaborators']
    
    fieldsets = (
        ('Document Info', {
            'fields': ('title', 'content', 'created_by')
        }),
        ('Collaboration', {
            'fields': ('collaborators', 'collaborator_list', 'is_public')
        }),
        ('Status', {
            'fields': ('version', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'last_modified'),
            'classes': ('collapse',)
        })
    )
    
    def collaborator_count(self, obj):
        """Get number of collaborators"""
        return obj.collaborators.count()
    collaborator_count.short_description = 'Collaborators'
    
    def collaborator_list(self, obj):
        """Display list of collaborators"""
        collaborators = obj.collaborators.all()
        if collaborators:
            return format_html('<br>'.join([f'• {user.username} ({user.email})' for user in collaborators]))
        return 'No collaborators'
    collaborator_list.short_description = 'Collaborator List'
    
    def get_queryset(self, request):
        """Optimize queryset"""
        return super().get_queryset(request).select_related('created_by').prefetch_related('collaborators')

@admin.register(Operation)
class OperationAdmin(admin.ModelAdmin):
    """Admin for Operation model"""
    list_display = ['document_title', 'user', 'operation_type', 'position', 'content_preview', 'version', 'timestamp']
    list_filter = ['operation_type', 'timestamp', 'document__title']
    search_fields = ['document__title', 'user__username', 'content']
    readonly_fields = ['id', 'timestamp']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Operation Info', {
            'fields': ('document', 'user', 'operation_type', 'position')
        }),
        ('Content', {
            'fields': ('content', 'length')
        }),
        ('Metadata', {
            'fields': ('version', 'timestamp'),
            'classes': ('collapse',)
        })
    )
    
    def document_title(self, obj):
        """Get document title"""
        return obj.document.title
    document_title.short_description = 'Document'
    
    def content_preview(self, obj):
        """Show preview of content"""
        if obj.content:
            return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
        return f'{obj.operation_type} operation'
    content_preview.short_description = 'Content Preview'
    
    def get_queryset(self, request):
        """Optimize queryset"""
        return super().get_queryset(request).select_related('document', 'user')

@admin.register(DocumentSession)
class DocumentSessionAdmin(admin.ModelAdmin):
    """Admin for DocumentSession model"""
    list_display = ['document_title', 'user', 'is_active', 'cursor_info', 'joined_at', 'last_seen']
    list_filter = ['is_active', 'joined_at', 'last_seen']
    search_fields = ['document__title', 'user__username']
    readonly_fields = ['id', 'joined_at', 'cursor_display']
    
    fieldsets = (
        ('Session Info', {
            'fields': ('document', 'user', 'is_active', 'channel_name')
        }),
        ('Cursor Data', {
            'fields': ('cursor_position', 'selection', 'cursor_display')
        }),
        ('Timestamps', {
            'fields': ('joined_at', 'last_seen'),
            'classes': ('collapse',)
        })
    )
    
    def document_title(self, obj):
        """Get document title"""
        return obj.document.title
    document_title.short_description = 'Document'
    
    def cursor_info(self, obj):
        """Display cursor position info"""
        if obj.cursor_position:
            pos = obj.cursor_position.get('position', 'N/A')
            line = obj.cursor_position.get('line', 'N/A')
            return f'Pos: {pos}, Line: {line}'
        return 'No cursor data'
    cursor_info.short_description = 'Cursor'
    
    def cursor_display(self, obj):
        """Display full cursor data"""
        if obj.cursor_position:
            return format_html('<pre>{}</pre>', str(obj.cursor_position))
        return 'No cursor data'
    cursor_display.short_description = 'Cursor Details'
    
    def get_queryset(self, request):
        """Optimize queryset"""
        return super().get_queryset(request).select_related('document', 'user')

@admin.register(DocumentInvite)
class DocumentInviteAdmin(admin.ModelAdmin):
    """Admin for DocumentInvite model"""
    list_display = ['document_title', 'invited_user', 'invited_by', 'is_accepted', 'created_at', 'accepted_at']
    list_filter = ['is_accepted', 'created_at', 'accepted_at']
    search_fields = ['document__title', 'invited_user__username', 'invited_by__username']
    readonly_fields = ['id', 'created_at', 'accepted_at']
    
    fieldsets = (
        ('Invite Info', {
            'fields': ('document', 'invited_user', 'invited_by')
        }),
        ('Status', {
            'fields': ('is_accepted', 'created_at', 'accepted_at')
        })
    )
    
    def document_title(self, obj):
        """Get document title"""
        return obj.document.title
    document_title.short_description = 'Document'
    
    def get_queryset(self, request):
        """Optimize queryset"""
        return super().get_queryset(request).select_related('document', 'invited_user', 'invited_by')
    
    actions = ['accept_invites']
    
    def accept_invites(self, request, queryset):
        """Action to accept selected invites"""
        count = 0
        for invite in queryset.filter(is_accepted=False):
            invite.accept()
            count += 1
        self.message_user(request, f'{count} invites accepted successfully.')
    accept_invites.short_description = 'Accept selected invites'
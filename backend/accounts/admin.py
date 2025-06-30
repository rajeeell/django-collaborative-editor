from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile

class UserProfileInline(admin.StackedInline):
    """Inline admin for user profile"""
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = ('bio', 'avatar', 'preferred_name', 'timezone', 'theme', 'email_notifications')

class UserAdmin(BaseUserAdmin):
    """Enhanced User admin with profile"""
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'date_joined', 'get_theme')
    list_filter = BaseUserAdmin.list_filter + ('profile__theme',)
    
    def get_theme(self, obj):
        """Get user's theme preference"""
        if hasattr(obj, 'profile'):
            return obj.profile.theme
        return 'light'
    get_theme.short_description = 'Theme'

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin for user profiles"""
    list_display = ['user', 'preferred_name', 'theme', 'email_notifications', 'created_at']
    list_filter = ['theme', 'email_notifications', 'timezone', 'created_at']
    search_fields = ['user__username', 'user__email', 'preferred_name', 'bio']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('User Info', {
            'fields': ('user', 'preferred_name', 'bio', 'avatar')
        }),
        ('Preferences', {
            'fields': ('theme', 'timezone', 'email_notifications')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
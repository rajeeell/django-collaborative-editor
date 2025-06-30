# Signal handlers for documents app
# Future signal handlers can be added here

from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models import Document, Operation, DocumentSession

# Example signal handler (can be uncommented if needed)
# @receiver(post_save, sender=Document)
# def document_created_handler(sender, instance, created, **kwargs):
#     """Handle document creation"""
#     if created:
#         # Do something when a new document is created
#         pass

# @receiver(pre_delete, sender=Document)
# def document_deleted_handler(sender, instance, **kwargs):
#     """Handle document deletion"""
#     # Clean up related data when document is deleted
#     pass
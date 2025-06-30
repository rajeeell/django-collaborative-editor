# Signal handlers for accounts app
# Currently empty - signals are handled in models.py
# Future signal handlers can be added here

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile

# User profile creation signals are already in models.py
# This file exists to prevent import errors and for future expansion
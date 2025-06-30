import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .models import Document, DocumentSession, Operation
from .operational_transform import OperationalTransform

logger = logging.getLogger(__name__)

class DocumentConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time document collaboration"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.document_id = self.scope['url_route']['kwargs']['document_id']
        self.document_group_name = f'document_{self.document_id}'
        self.user = None
        self.document = None
        
        # Authenticate user
        await self.authenticate_user()
        
        if not self.user:
            await self.close()
            return
        
        # Check document access
        has_access = await self.check_document_access()
        if not has_access:
            await self.close()
            return
        
        # Join document group
        await self.channel_layer.group_add(
            self.document_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Create or update document session
        await self.create_or_update_session()
        
        # Send current document state
        await self.send_document_state()
        
        # Notify other users
        await self.channel_layer.group_send(
            self.document_group_name,
            {
                'type': 'user_joined',
                'user_id': self.user.id,
                'username': self.user.username,
                'sender_channel': self.channel_name
            }
        )
        
        logger.info(f"User {self.user.username} connected to document {self.document_id}")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'document_group_name') and self.user:
            # Mark session as inactive
            await self.deactivate_session()
            
            # Notify other users
            await self.channel_layer.group_send(
                self.document_group_name,
                {
                    'type': 'user_left',
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'sender_channel': self.channel_name
                }
            )
            
            # Leave document group
            await self.channel_layer.group_discard(
                self.document_group_name,
                self.channel_name
            )
            
            logger.info(f"User {self.user.username} disconnected from document {self.document_id}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'operation':
                await self.handle_operation(data)
            elif message_type == 'cursor_position':
                await self.handle_cursor_update(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
        except Exception as e:
            logger.error(f"Error handling message: {e}")

    async def handle_operation(self, data):
        """Handle text operation from client"""
        operation = data.get('operation')
        if not operation:
            return
        
        try:
            # Apply operation using operational transform
            result = await self.apply_operation_with_transform(operation)
            
            if result:
                # Broadcast to other users
                await self.channel_layer.group_send(
                    self.document_group_name,
                    {
                        'type': 'operation_broadcast',
                        'operation': result['operation'],
                        'version': result['version'],
                        'user_id': self.user.id,
                        'username': self.user.username,
                        'sender_channel': self.channel_name
                    }
                )
                
                # Acknowledge to sender
                await self.send(text_data=json.dumps({
                    'type': 'operation_ack',
                    'version': result['version'],
                    'server_time': result['timestamp']
                }))
                
        except Exception as e:
            logger.error(f"Error handling operation: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to process operation'
            }))

    async def handle_cursor_update(self, data):
        """Handle cursor position update"""
        cursor = data.get('cursor')
        selection = data.get('selection')
        
        await self.update_cursor_position(cursor, selection)
        
        # Broadcast cursor position to other users
        await self.channel_layer.group_send(
            self.document_group_name,
            {
                'type': 'cursor_update',
                'user_id': self.user.id,
                'username': self.user.username,
                'cursor': cursor,
                'selection': selection,
                'sender_channel': self.channel_name
            }
        )

    # Group message handlers
    async def operation_broadcast(self, event):
        """Broadcast operation to client"""
        if event.get('sender_channel') != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'operation',
                'operation': event['operation'],
                'version': event['version'],
                'user_id': event['user_id'],
                'username': event['username']
            }))

    async def cursor_update(self, event):
        """Broadcast cursor update to client"""
        if event.get('sender_channel') != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'cursor_update',
                'user_id': event['user_id'],
                'username': event['username'],
                'cursor': event['cursor'],
                'selection': event['selection']
            }))

    async def user_joined(self, event):
        """Notify client about user joining"""
        if event.get('sender_channel') != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user_id': event['user_id'],
                'username': event['username']
            }))

    async def user_left(self, event):
        """Notify client about user leaving"""
        if event.get('sender_channel') != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'user_left',
                'user_id': event['user_id'],
                'username': event['username']
            }))

    # Database operations
    async def authenticate_user(self):
        """Authenticate user from token in query string"""
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        token = None
        
        # Parse token from query string
        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param[6:]  # Remove 'token='
                break
        
        if token:
            try:
                # Validate JWT token
                UntypedToken(token)
                self.user = await self.get_user_from_token(token)
            except (InvalidToken, TokenError) as e:
                logger.warning(f"Invalid token: {e}")
                self.user = None

    @database_sync_to_async
    def get_user_from_token(self, token):
        """Get user from JWT token"""
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
        except Exception as e:
            logger.error(f"Error getting user from token: {e}")
            return None

    @database_sync_to_async
    def check_document_access(self):
        """Check if user has access to document"""
        try:
            self.document = Document.objects.get(id=self.document_id, is_active=True)
            return self.document.has_access(self.user)
        except Document.DoesNotExist:
            logger.warning(f"Document {self.document_id} not found")
            return False

    @database_sync_to_async
    def create_or_update_session(self):
        """Create or update document session"""
        session, created = DocumentSession.objects.get_or_create(
            document=self.document,
            user=self.user,
            defaults={
                'is_active': True,
                'channel_name': self.channel_name
            }
        )
        if not created:
            session.is_active = True
            session.channel_name = self.channel_name
            session.save(update_fields=['is_active', 'channel_name', 'last_seen'])

    @database_sync_to_async
    def deactivate_session(self):
        """Mark session as inactive"""
        DocumentSession.objects.filter(
            document=self.document,
            user=self.user
        ).update(is_active=False)

    @database_sync_to_async
    def send_document_state(self):
        """Send current document state to client"""
        # Get active users
        active_sessions = DocumentSession.objects.filter(
            document=self.document,
            is_active=True
        ).select_related('user')
        
        users_data = [{
            'id': session.user.id,
            'username': session.user.username,
            'cursor': session.cursor_position,
            'selection': session.selection
        } for session in active_sessions]
        
        # Send document state
        self.send(text_data=json.dumps({
            'type': 'document_state',
            'content': self.document.content,
            'version': self.document.version,
            'active_users': users_data
        }))

    @database_sync_to_async
    def apply_operation_with_transform(self, operation):
        """Apply operation with operational transform"""
        try:
            # Get pending operations from other users
            pending_operations = Operation.objects.filter(
                document=self.document,
                version__gt=operation.get('client_version', self.document.version)
            ).exclude(user=self.user).order_by('timestamp')
            
            transformed_op = operation.copy()
            
            # Apply operational transforms
            for pending_op in pending_operations:
                pending_op_dict = pending_op.to_dict()
                result = OperationalTransform.transform(transformed_op, pending_op_dict)
                transformed_op = result['op1']
            
            # Apply operation to document
            self.document.content = OperationalTransform.apply_operation(
                self.document.content, transformed_op
            )
            self.document.increment_version()
            
            # Save operation to history
            op_record = Operation.objects.create(
                document=self.document,
                user=self.user,
                operation_type=transformed_op['type'],
                position=transformed_op['position'],
                content=transformed_op.get('content', ''),
                length=transformed_op.get('length', 0),
                version=self.document.version
            )
            
            return {
                'operation': transformed_op,
                'version': self.document.version,
                'timestamp': op_record.timestamp.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error applying operation: {e}")
            return None

    @database_sync_to_async
    def update_cursor_position(self, cursor, selection):
        """Update cursor position in session"""
        DocumentSession.objects.filter(
            document=self.document,
            user=self.user
        ).update(
            cursor_position=cursor or {},
            selection=selection
        )
"""
Operational Transform implementation for collaborative editing
"""

class OperationalTransform:
    """
    Operational Transform algorithms for handling concurrent document operations
    """
    
    @staticmethod
    def transform(op1, op2):
        """
        Transform two operations against each other to maintain consistency
        
        Args:
            op1: First operation dict with keys: type, position, content/length
            op2: Second operation dict with keys: type, position, content/length
            
        Returns:
            dict: {'op1': transformed_op1, 'op2': transformed_op2}
        """
        
        # Ensure operations have required fields
        op1 = OperationalTransform._normalize_operation(op1)
        op2 = OperationalTransform._normalize_operation(op2)
        
        # Transform based on operation types
        if op1['type'] == 'insert' and op2['type'] == 'insert':
            return OperationalTransform._transform_insert_insert(op1, op2)
        elif op1['type'] == 'delete' and op2['type'] == 'delete':
            return OperationalTransform._transform_delete_delete(op1, op2)
        elif op1['type'] == 'insert' and op2['type'] == 'delete':
            return OperationalTransform._transform_insert_delete(op1, op2)
        elif op1['type'] == 'delete' and op2['type'] == 'insert':
            result = OperationalTransform._transform_insert_delete(op2, op1)
            return {'op1': result['op2'], 'op2': result['op1']}
        else:
            # Unknown operation types, return as-is
            return {'op1': op1, 'op2': op2}
    
    @staticmethod
    def _normalize_operation(op):
        """Ensure operation has all required fields"""
        normalized = {
            'type': op.get('type', 'retain'),
            'position': op.get('position', 0),
            'content': op.get('content', ''),
            'length': op.get('length', 0)
        }
        
        # Auto-calculate length for insert operations
        if normalized['type'] == 'insert' and normalized['length'] == 0:
            normalized['length'] = len(normalized['content'])
            
        return normalized
    
    @staticmethod
    def _transform_insert_insert(op1, op2):
        """Transform two insert operations"""
        if op1['position'] <= op2['position']:
            # op1 comes before op2, adjust op2's position
            return {
                'op1': op1.copy(),
                'op2': {
                    **op2,
                    'position': op2['position'] + len(op1['content'])
                }
            }
        else:
            # op2 comes before op1, adjust op1's position
            return {
                'op1': {
                    **op1,
                    'position': op1['position'] + len(op2['content'])
                },
                'op2': op2.copy()
            }
    
    @staticmethod
    def _transform_delete_delete(op1, op2):
        """Transform two delete operations"""
        op1_end = op1['position'] + op1['length']
        op2_end = op2['position'] + op2['length']
        
        if op1_end <= op2['position']:
            # op1 is completely before op2
            return {
                'op1': op1.copy(),
                'op2': {
                    **op2,
                    'position': op2['position'] - op1['length']
                }
            }
        elif op2_end <= op1['position']:
            # op2 is completely before op1
            return {
                'op1': {
                    **op1,
                    'position': op1['position'] - op2['length']
                },
                'op2': op2.copy()
            }
        else:
            # Operations overlap - complex case
            return OperationalTransform._handle_overlapping_deletes(op1, op2)
    
    @staticmethod
    def _transform_insert_delete(insert_op, delete_op):
        """Transform insert and delete operations"""
        delete_end = delete_op['position'] + delete_op['length']
        
        if insert_op['position'] <= delete_op['position']:
            # Insert is before delete range
            return {
                'op1': insert_op.copy(),
                'op2': {
                    **delete_op,
                    'position': delete_op['position'] + len(insert_op['content'])
                }
            }
        elif insert_op['position'] >= delete_end:
            # Insert is after delete range
            return {
                'op1': {
                    **insert_op,
                    'position': insert_op['position'] - delete_op['length']
                },
                'op2': delete_op.copy()
            }
        else:
            # Insert is within delete range
            return {
                'op1': {
                    **insert_op,
                    'position': delete_op['position']
                },
                'op2': {
                    **delete_op,
                    'length': delete_op['length'] + len(insert_op['content'])
                }
            }
    
    @staticmethod
    def _handle_overlapping_deletes(op1, op2):
        """Handle overlapping delete operations"""
        op1_end = op1['position'] + op1['length']
        op2_end = op2['position'] + op2['length']
        
        # Find the overlap region
        overlap_start = max(op1['position'], op2['position'])
        overlap_end = min(op1_end, op2_end)
        overlap_length = max(0, overlap_end - overlap_start)
        
        # Adjust operations based on overlap
        new_op1 = op1.copy()
        new_op2 = op2.copy()
        
        if op1['position'] < op2['position']:
            # op1 starts first
            new_op1['length'] = op2['position'] - op1['position']
            new_op2['position'] = op1['position']
            new_op2['length'] = max(0, op2['length'] - overlap_length)
        else:
            # op2 starts first
            new_op2['length'] = op1['position'] - op2['position']
            new_op1['position'] = op2['position']
            new_op1['length'] = max(0, op1['length'] - overlap_length)
        
        return {'op1': new_op1, 'op2': new_op2}
    
    @staticmethod
    def apply_operation(content, operation):
        """
        Apply an operation to document content
        
        Args:
            content: Current document content (string)
            operation: Operation dict with type, position, content/length
            
        Returns:
            str: Modified content
        """
        op = OperationalTransform._normalize_operation(operation)
        
        if op['type'] == 'insert':
            pos = max(0, min(op['position'], len(content)))
            return content[:pos] + op['content'] + content[pos:]
        
        elif op['type'] == 'delete':
            pos = max(0, min(op['position'], len(content)))
            end_pos = max(pos, min(pos + op['length'], len(content)))
            return content[:pos] + content[end_pos:]
        
        elif op['type'] == 'retain':
            # Retain operation - no change to content
            return content
        
        else:
            # Unknown operation type
            return content
    
    @staticmethod
    def compose_operations(ops):
        """
        Compose multiple operations into a single operation
        
        Args:
            ops: List of operation dicts
            
        Returns:
            list: Simplified list of operations
        """
        if not ops:
            return []
        
        composed = []
        
        for op in ops:
            normalized_op = OperationalTransform._normalize_operation(op)
            
            if not composed:
                composed.append(normalized_op)
                continue
            
            last_op = composed[-1]
            
            # Try to merge with last operation
            if (last_op['type'] == 'insert' and 
                normalized_op['type'] == 'insert' and 
                last_op['position'] + len(last_op['content']) == normalized_op['position']):
                # Merge consecutive inserts
                composed[-1] = {
                    'type': 'insert',
                    'position': last_op['position'],
                    'content': last_op['content'] + normalized_op['content'],
                    'length': len(last_op['content']) + len(normalized_op['content'])
                }
            elif (last_op['type'] == 'delete' and 
                  normalized_op['type'] == 'delete' and 
                  last_op['position'] == normalized_op['position']):
                # Merge consecutive deletes at same position
                composed[-1] = {
                    'type': 'delete',
                    'position': last_op['position'],
                    'content': '',
                    'length': last_op['length'] + normalized_op['length']
                }
            else:
                composed.append(normalized_op)
        
        return composed
    
    @staticmethod
    def invert_operation(operation):
        """
        Create the inverse of an operation
        
        Args:
            operation: Operation dict
            
        Returns:
            dict: Inverse operation
        """
        op = OperationalTransform._normalize_operation(operation)
        
        if op['type'] == 'insert':
            return {
                'type': 'delete',
                'position': op['position'],
                'content': '',
                'length': len(op['content'])
            }
        elif op['type'] == 'delete':
            return {
                'type': 'insert',
                'position': op['position'],
                'content': op.get('deleted_content', ''),
                'length': 0
            }
        else:
            return op.copy()
    
    @staticmethod
    def validate_operation(operation, content_length):
        """
        Validate that an operation is valid for the given content
        
        Args:
            operation: Operation dict
            content_length: Length of current content
            
        Returns:
            bool: True if operation is valid
        """
        op = OperationalTransform._normalize_operation(operation)
        
        # Check position bounds
        if op['position'] < 0 or op['position'] > content_length:
            return False
        
        # Check delete operation bounds
        if op['type'] == 'delete':
            if op['position'] + op['length'] > content_length:
                return False
        
        return True
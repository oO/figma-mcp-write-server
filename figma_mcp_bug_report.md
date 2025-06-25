# Figma MCP Server - QA Bug Report

## Testing Summary
**Total Tools Tested**: 20
**Critical Issues**: 0
**Medium Issues**: 5
**Low Issues**: 1

## Medium Issues

### Bug #1 - create_node Documentation Mismatch
**Severity**: Medium
**Tool**: create_node
**Issue**: Tool documentation incomplete for supported node types
**Symptoms**: 
- Documentation shows enum: ["rectangle", "ellipse", "frame"]
- Implementation supports: ["rectangle", "ellipse", "frame", "text", "star", "polygon"]
**Success Criteria**: Documentation should match implementation capabilities
**Action Required**: Update tool schema to include all supported node types

### Bug #2 - update_node Error Handling
**Severity**: Medium
**Tool**: update_node
**Issue**: Cryptic error message for invalid node ID
**Symptoms**: 
- Error message "invalid 'in' operand" is unclear
- No indication that node ID is the problem
**Success Criteria**: Error should clearly state "Node ID not found" or similar
**Action Required**: Improve error handling for invalid node IDs

### Bug #3 - manage_nodes Documentation Mismatch
**Severity**: Medium
**Tool**: manage_nodes
**Issue**: Tool documentation missing bulk operations
**Symptoms**: 
- Documentation shows: ["move", "delete", "duplicate"]
- Implementation supports: ["move", "delete", "duplicate", "move_bulk", "delete_bulk", "duplicate_bulk"]
**Success Criteria**: Documentation should include all supported operations
**Action Required**: Update documentation to include bulk operations

### Bug #4 - manage_styles Documentation Mismatch
**Severity**: Medium
**Tool**: manage_styles
**Issue**: Tool documentation missing operations
**Symptoms**: 
- Documentation shows: ["create", "list", "apply", "delete", "get"]
- Implementation supports: ["create", "update", "delete", "get", "list", "apply", "apply_bulk"]
**Success Criteria**: Documentation should include all supported operations
**Action Required**: Update documentation to include "update" and "apply_bulk" operations

### Bug #5 - manage_variables Documentation Clarity
**Severity**: Medium
**Tool**: manage_variables
**Issue**: Documentation unclear about required parameters per operation
**Symptoms**: 
- Error indicates collectionId required for list operation
- Documentation doesn't specify parameter requirements per operation type
**Success Criteria**: Documentation should specify required parameters for each operation
**Action Required**: Update documentation with parameter requirements matrix

## Low Issues

### Bug #6 - get_page_nodes Parameter Validation
**Severity**: Low
**Tool**: get_page_nodes
**Issue**: Invalid detail parameter accepted without validation
**Symptoms**: 
- Tool accepts "invalid_detail" parameter
- Returns detailed output instead of error or default behavior
**Success Criteria**: Should validate detail parameter and return error for invalid values
**Action Required**: Add parameter validation for detail enum values

## Tools With Good Error Handling
The following tools demonstrated proper error handling and validation:
- set_selection (clear error for invalid node IDs)
- manage_hierarchy (proper validation for group requirements)
- manage_alignment (good enum validation)
- manage_constraints (proper enum validation)
- manage_instances (clear error for invalid component ID)
- manage_auto_layout (clear error for wrong node types)
- manage_vector_operations (good node type validation)

## Recommendations

1. **Standardize Error Messages**: Implement consistent error message format across all tools
2. **Documentation Sync**: Establish process to keep tool documentation in sync with implementation
3. **Testing Coverage**: Add automated tests to catch documentation/implementation mismatches

## Testing Notes
- All core functionality works as expected when parameters are valid
- Error handling is generally good but inconsistent in message clarity
- No crashes or major functional failures detected
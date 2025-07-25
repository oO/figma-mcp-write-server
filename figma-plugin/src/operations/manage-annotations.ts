import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { logger } from '../utils/plugin-logger.js';

/**
 * Utility function to resolve label/labelMarkdown conflicts according to Figma's validation rules
 * Rules:
 * 1. If label == labelMarkdown → remove labelMarkdown (keep simpler label)
 * 2. If labelMarkdown == "" → remove labelMarkdown (keep label)
 * 3. Otherwise → remove label (preserve markdown formatting)
 */
function resolveAnnotationLabelConflict(annotation: any): any {
  const cleaned = { ...annotation };
  
  // Only resolve conflicts when both properties exist and are non-null strings
  if (cleaned.label !== undefined && cleaned.label !== null && 
      cleaned.labelMarkdown !== undefined && cleaned.labelMarkdown !== null) {
    if (cleaned.label === cleaned.labelMarkdown) {
      // If they're identical, remove labelMarkdown (keep the simpler label)
      delete cleaned.labelMarkdown;
    } else if (cleaned.labelMarkdown === "") {
      // If labelMarkdown is empty, keep label
      delete cleaned.labelMarkdown;
    } else {
      // If they're different and labelMarkdown is not empty, remove label
      delete cleaned.label;
    }
  }
  
  return cleaned;
}

/**
 * Handle ANNOTATION_OPERATION - manage dev mode annotations
 */
export async function handleAnnotationOperation(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('annotationOperation', params, async () => {
    
    BaseOperation.validateParams(params, ['operation']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['add_annotation', 'edit_annotation', 'remove_annotation', 'list_annotations', 'list_categories', 'cleanup_orphaned']
    );
    
    // Validate required parameters based on operation
    if (['add_annotation', 'edit_annotation', 'remove_annotation'].includes(operation) && !params.annotationId) {
      throw new Error(`${operation} requires an annotationId parameter (node ID)`);
    }
    
    // Validate label/labelMarkdown exclusivity
    if (params.label !== undefined && params.labelMarkdown !== undefined) {
      throw new Error('Only one of label or labelMarkdown should be provided, not both');
    }
    
    // Check if we're in dev mode - writing operations are restricted
    const isDevMode = figma.editorType === 'dev';
    
    switch (operation) {
      case 'add_annotation':
        if (isDevMode) {
          return {
            message: 'Annotation creation is not supported in Dev Mode',
            note: 'Annotations can only be created in Design Mode',
            operation: 'add_annotation'
          };
        }
        
        // Get the target node
        const nodeId = params.annotationId;
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        
        // Check if node supports annotations
        if (!('annotations' in node)) {
          throw new Error(`Node type ${node.type} does not support annotations`);
        }
        
        // Create new annotation using Figma's native API
        const newAnnotation: any = {};
        
        if (params.label) {
          newAnnotation.label = params.label;
        }
        
        if (params.labelMarkdown) {
          newAnnotation.labelMarkdown = params.labelMarkdown;
        }
        
        if (params.pinProperty) {
          // Convert simple string array to Figma API format
          const pinPropertyArray = Array.isArray(params.pinProperty) ? params.pinProperty : [params.pinProperty];
          
          // Filter out properties that don't apply to this node type
          const nodeType = node.type;
          const validProperties = pinPropertyArray
            .filter(prop => typeof prop === 'string')
            .filter(prop => {
              // Filter out properties that don't apply to this node type
              if (nodeType === 'FRAME' && ['effects', 'strokes'].includes(prop)) {
                return false; // FRAME nodes don't support effects or strokes
              }
              if (nodeType === 'TEXT' && ['cornerRadius'].includes(prop)) {
                return false; // TEXT nodes don't support corner radius
              }
              return true;
            })
            .map(prop => ({ type: prop }));
          
          if (validProperties.length > 0) {
            newAnnotation.properties = validProperties;
          }
        }
        
        if (params.categoryId) {
          // Validate categoryId exists before creating annotation
          try {
            const availableCategories = await figma.annotations.getAnnotationCategoriesAsync();
            const validCategoryIds = availableCategories.map(cat => cat.id);
            
            if (!validCategoryIds.includes(params.categoryId)) {
              const categoryList = availableCategories.map(cat => `${cat.label || cat.id} (${cat.id})`).join(', ');
              throw new Error(`Invalid categoryId: "${params.categoryId}". Available categories: ${categoryList}`);
            }
            
            newAnnotation.categoryId = params.categoryId;
          } catch (error) {
            // If it's already our validation error, re-throw it
            if (error.message.includes('Invalid categoryId')) {
              throw error;
            }
            // If we can't get categories, proceed but with warning
            logger.warn('Could not validate categoryId:', error.message);
            newAnnotation.categoryId = params.categoryId;
          }
        }
        
        // Add annotation to node's annotations array
        const existingAnnotations = node.annotations || [];
        
        // Clean existing annotations to ensure no label/labelMarkdown conflicts
        const cleanedExistingAnnotations = existingAnnotations.map(resolveAnnotationLabelConflict);
        
        const updatedAnnotations = [...cleanedExistingAnnotations, newAnnotation];
        
        try {
          (node as any).annotations = updatedAnnotations;
        
        } catch (error) {
          // Provide clear error message with context
          const errorMessage = error.message || error.toString();
          
          // Log detailed error info for debugging
          logger.error('Annotation creation failed:', {
            error: errorMessage,
            newAnnotation,
            existingCount: existingAnnotations.length,
            hasConflicts: existingAnnotations.some(a => a.label && a.labelMarkdown)
          });
          
          throw new Error(`Failed to create annotation: ${errorMessage}`);
        }
        
        return {
          message: 'Annotation created successfully using Figma native API',
          operation: 'add_annotation',
          nodeId: nodeId,
          annotation: newAnnotation,
          totalAnnotations: updatedAnnotations.length
        };
        
      case 'edit_annotation':
        if (isDevMode) {
          return {
            message: 'Annotation editing is not supported in Dev Mode',
            note: 'Annotations can only be edited in Design Mode',
            operation: 'edit_annotation'
          };
        }
        
        const editNodeId = params.annotationId;
        const editNode = await figma.getNodeByIdAsync(editNodeId);
        if (!editNode) {
          throw new Error(`Node with ID ${editNodeId} not found`);
        }
        
        if (!('annotations' in editNode)) {
          throw new Error(`Node type ${editNode.type} does not support annotations`);
        }
        
        const nodeAnnotations = editNode.annotations || [];
        if (nodeAnnotations.length === 0) {
          throw new Error(`No annotations found on node ${editNodeId}`);
        }
        
        
        // Since Figma API doesn't provide annotation IDs, we'll update the first annotation
        // or find by label/categoryId match
        let annotationToUpdate = nodeAnnotations[0];
        const targetLabel = params.label;
        const targetCategoryId = params.categoryId;
        
        // Try to find specific annotation by existing label or categoryId
        if (targetLabel || targetCategoryId) {
          const foundAnnotation = nodeAnnotations.find(a => 
            (targetLabel && a.label === targetLabel) ||
            (targetCategoryId && a.categoryId === targetCategoryId)
          );
          if (foundAnnotation) {
            annotationToUpdate = foundAnnotation;
          }
        }
        
        // Update annotation properties
        let updatedAnnotation = { ...annotationToUpdate };
        
        // Handle label/labelMarkdown exclusivity
        if (params.label !== undefined) {
          updatedAnnotation.label = params.label;
        }
        
        if (params.labelMarkdown !== undefined) {
          updatedAnnotation.labelMarkdown = params.labelMarkdown;
        }
        
        // Apply conflict resolution logic
        updatedAnnotation = resolveAnnotationLabelConflict(updatedAnnotation);
        
        if (params.pinProperty) {
          // Convert simple string array to Figma API format
          const pinPropertyArray = Array.isArray(params.pinProperty) ? params.pinProperty : [params.pinProperty];
          const validProperties = pinPropertyArray
            .filter(prop => typeof prop === 'string')
            .map(prop => ({ type: prop }));
          
          if (validProperties.length > 0) {
            updatedAnnotation.properties = validProperties;
          }
        }
        
        if (params.categoryId !== undefined) {
          updatedAnnotation.categoryId = params.categoryId;
        }
        
        // Replace the annotation in the array and clean all annotations
        const annotationIndex = nodeAnnotations.indexOf(annotationToUpdate);
        const editedAnnotations = [...nodeAnnotations];
        editedAnnotations[annotationIndex] = updatedAnnotation;
        
        // Clean all annotations to ensure no label/labelMarkdown conflicts
        const cleanedAnnotations = editedAnnotations.map(resolveAnnotationLabelConflict);
        
        (editNode as any).annotations = cleanedAnnotations;
        
        return {
          message: 'Annotation updated successfully using Figma native API',
          operation: 'edit_annotation',
          nodeId: editNodeId,
          annotation: updatedAnnotation,
          annotationIndex: annotationIndex
        };
        
      case 'remove_annotation':
        if (isDevMode) {
          return {
            message: 'Annotation deletion is not supported in Dev Mode',
            note: 'Annotations can only be deleted in Design Mode',
            operation: 'remove_annotation'
          };
        }
        
        const removeNodeId = params.annotationId;
        const removeNode = await figma.getNodeByIdAsync(removeNodeId);
        if (!removeNode) {
          throw new Error(`Node with ID ${removeNodeId} not found`);
        }
        
        if (!('annotations' in removeNode)) {
          throw new Error(`Node type ${removeNode.type} does not support annotations`);
        }
        
        const currentAnnotations = removeNode.annotations || [];
        if (currentAnnotations.length === 0) {
          throw new Error(`No annotations found on node ${removeNodeId}`);
        }
        
        // Remove annotations by matching label or categoryId, or remove all
        const removeLabel = params.label;
        const removeCategoryId = params.categoryId;
        let remainingAnnotations;
        
        if (removeLabel || removeCategoryId) {
          // Remove specific annotation(s) by label or categoryId
          remainingAnnotations = currentAnnotations.filter(a => 
            !(removeLabel && a.label === removeLabel) &&
            !(removeCategoryId && a.categoryId === removeCategoryId)
          );
          
          if (remainingAnnotations.length === currentAnnotations.length) {
            throw new Error(`No annotations found matching the specified criteria`);
          }
        } else {
          // Remove all annotations
          remainingAnnotations = [];
        }
        
        // Clean remaining annotations to ensure no label/labelMarkdown conflicts
        const cleanedRemainingAnnotations = remainingAnnotations.map(resolveAnnotationLabelConflict);
        
        (removeNode as any).annotations = cleanedRemainingAnnotations;
        
        return {
          message: 'Annotation removed successfully using Figma native API',
          operation: 'remove_annotation',
          nodeId: removeNodeId,
          removedCount: currentAnnotations.length - remainingAnnotations.length,
          remainingCount: remainingAnnotations.length
        };
        
      case 'list_annotations':
        // Reading is always allowed, even in Dev Mode
        const targetNodeId = params.annotationId;
        
        if (targetNodeId) {
          // List annotations for specific node
          const targetNode = await figma.getNodeByIdAsync(targetNodeId);
          if (!targetNode) {
            throw new Error(`Node with ID ${targetNodeId} not found`);
          }
          
          if (!('annotations' in targetNode)) {
            return {
              annotations: [],
              count: 0,
              message: `Node type ${targetNode.type} does not support annotations`,
              operation: 'list_annotations'
            };
          }
          
          const annotations = targetNode.annotations || [];
          return {
            annotations: annotations,
            count: annotations.length,
            nodeId: targetNodeId,
            message: `Found ${annotations.length} annotations on node ${targetNodeId}`,
            operation: 'list_annotations'
          };
        } else {
          // List all annotations across all nodes (this is expensive, but useful for debugging)
          const allNodes = figma.root.findAll();
          const allAnnotations: any[] = [];
          
          for (const node of allNodes) {
            if ('annotations' in node && node.annotations && node.annotations.length > 0) {
              node.annotations.forEach(annotation => {
                allAnnotations.push({
                  ...annotation,
                  nodeId: node.id,
                  nodeName: node.name,
                  nodeType: node.type
                });
              });
            }
          }
          
          return {
            annotations: allAnnotations,
            count: allAnnotations.length,
            message: `Found ${allAnnotations.length} annotations across all nodes`,
            operation: 'list_annotations'
          };
        }
        
      case 'list_categories':
        // List available annotation categories
        try {
          const availableCategories = await figma.annotations.getAnnotationCategoriesAsync();
          
          const categoriesWithLabels = availableCategories.map(cat => ({
            id: cat.id,
            label: cat.label || `Category ${cat.id}`,
            color: cat.color,
            isPreset: cat.isPreset
          }));
          
          return {
            categories: categoriesWithLabels,
            count: availableCategories.length,
            message: `Found ${availableCategories.length} annotation categories`,
            operation: 'list_categories'
          };
        } catch (error) {
          throw new Error(`Failed to retrieve annotation categories: ${error.message}`);
        }
        
      case 'cleanup_orphaned':
        // Special cleanup operation to remove orphaned annotations from old pluginData system
        const orphanedAnnotations = JSON.parse(figma.root.getPluginData('annotations') || '[]');
        
        if (orphanedAnnotations.length === 0) {
          return {
            message: 'No orphaned annotations found in pluginData',
            operation: 'cleanup_orphaned',
            cleanedCount: 0
          };
        }
        
        // Clear the old pluginData
        figma.root.setPluginData('annotations', '[]');
        
        return {
          message: `Cleaned up ${orphanedAnnotations.length} orphaned annotations from pluginData`,
          operation: 'cleanup_orphaned',
          cleanedCount: orphanedAnnotations.length,
          cleanedAnnotations: orphanedAnnotations
        };
        
      default:
        throw new Error(`Unknown annotation operation: ${operation}`);
    }
  });
}
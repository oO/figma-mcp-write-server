// Helper function to check if we're in Dev Mode
function isDevMode(): boolean {
  return figma.editorType === 'dev';
}

// Helper function to generate unique IDs using timestamp + random
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomPart}`;
}

export async function performAnnotationOperation(payload: any): Promise<any> {
  try {
    const { operation, nodeId, annotationId, label, labelMarkdown, properties, categoryId } = payload;

    switch (operation) {
      case 'add_annotation':
        if (!nodeId) {
          return { success: false, error: 'nodeId required for add_annotation operation' };
        }

        const node = figma.getNodeById(nodeId);
        if (!node) {
          return { success: false, error: `Node ${nodeId} not found` };
        }

        // Check if node supports annotations
        if (!('annotations' in node)) {
          return {
            success: false,
            error: 'Node type does not support annotations. Only frames, components, instances, and shape nodes support annotations.'
          };
        }

        const annotationData: any = {};
        if (label) annotationData.label = label;
        if (labelMarkdown) annotationData.labelMarkdown = labelMarkdown;
        if (properties) annotationData.properties = properties;
        if (categoryId) annotationData.categoryId = categoryId;

        try {
          // Try native Dev Mode annotation first
          const annotationNode = node as any;
          const newAnnotationId = generateId();
          
          // Store annotation data in plugin data as fallback
          const existingAnnotations = JSON.parse(
            figma.root.getPluginData('annotations') || '[]'
          );
          
          const annotation = {
            id: newAnnotationId,
            nodeId: nodeId,
            ...annotationData,
            createdAt: new Date().toISOString()
          };
          
          existingAnnotations.push(annotation);
          figma.root.setPluginData('annotations', JSON.stringify(existingAnnotations));

          return {
            success: true,
            data: {
              annotationId: newAnnotationId,
              nodeId: nodeId,
              ...annotationData,
              operation: 'add_annotation',
              devMode: isDevMode()
            }
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to add annotation: ${error.message}`
          };
        }

      case 'edit_annotation':
        if (!annotationId) {
          return { success: false, error: 'annotationId required for edit_annotation operation' };
        }

        const existingAnnotations = JSON.parse(
          figma.root.getPluginData('annotations') || '[]'
        );
        
        const annotationIndex = existingAnnotations.findIndex((a: any) => a.id === annotationId);
        if (annotationIndex === -1) {
          return { success: false, error: `Annotation ${annotationId} not found` };
        }

        // Update annotation
        const updatedAnnotation = { ...existingAnnotations[annotationIndex] };
        if (label !== undefined) updatedAnnotation.label = label;
        if (labelMarkdown !== undefined) updatedAnnotation.labelMarkdown = labelMarkdown;
        if (properties !== undefined) updatedAnnotation.properties = properties;
        if (categoryId !== undefined) updatedAnnotation.categoryId = categoryId;
        updatedAnnotation.updatedAt = new Date().toISOString();

        existingAnnotations[annotationIndex] = updatedAnnotation;
        figma.root.setPluginData('annotations', JSON.stringify(existingAnnotations));

        return {
          success: true,
          data: {
            ...updatedAnnotation,
            operation: 'edit_annotation'
          }
        };

      case 'remove_annotation':
        if (!annotationId) {
          return { success: false, error: 'annotationId required for remove_annotation operation' };
        }

        const allAnnotations = JSON.parse(
          figma.root.getPluginData('annotations') || '[]'
        );
        
        const filteredAnnotations = allAnnotations.filter((a: any) => a.id !== annotationId);
        figma.root.setPluginData('annotations', JSON.stringify(filteredAnnotations));

        return {
          success: true,
          data: {
            annotationId: annotationId,
            operation: 'remove_annotation',
            removed: true
          }
        };

      case 'list_annotations':
        const annotations = JSON.parse(
          figma.root.getPluginData('annotations') || '[]'
        );
        
        // Filter by nodeId if provided
        const filteredByNode = nodeId 
          ? annotations.filter((a: any) => a.nodeId === nodeId)
          : annotations;

        return {
          success: true,
          data: {
            annotations: filteredByNode,
            count: filteredByNode.length,
            operation: 'list_annotations',
            devMode: isDevMode()
          }
        };

      default:
        return {
          success: false,
          error: `Unknown annotation operation: ${operation}`
        };
    }

  } catch (error) {
    return {
      success: false,
      error: `Annotation operation failed: ${error.message}`
    };
  }
}

export async function performMeasurementOperation(payload: any): Promise<any> {
  try {
    const { operation, measurementId, fromNodeId, toNodeId, direction, label, customValue, pageId } = payload;

    switch (operation) {
      case 'add_measurement':
        if (!fromNodeId) {
          return { success: false, error: 'fromNodeId required for add_measurement operation' };
        }

        const fromNode = figma.getNodeById(fromNodeId);
        if (!fromNode) {
          return { success: false, error: `From node ${fromNodeId} not found` };
        }

        const toNode = toNodeId ? figma.getNodeById(toNodeId) : null;
        
        const newMeasurementId = generateId();
        const currentPageId = pageId || figma.currentPage.id;

        // Store measurement data in plugin data
        const existingMeasurements = JSON.parse(
          figma.root.getPluginData('measurements') || '[]'
        );

        const measurement = {
          id: newMeasurementId,
          fromNodeId: fromNodeId,
          toNodeId: toNodeId || null,
          direction: direction || 'distance',
          label: label,
          customValue: customValue,
          pageId: currentPageId,
          createdAt: new Date().toISOString(),
          devMode: isDevMode()
        };

        existingMeasurements.push(measurement);
        figma.root.setPluginData('measurements', JSON.stringify(existingMeasurements));

        return {
          success: true,
          data: {
            ...measurement,
            operation: 'add_measurement'
          }
        };

      case 'edit_measurement':
        if (!measurementId) {
          return { success: false, error: 'measurementId required for edit_measurement operation' };
        }

        const measurements = JSON.parse(
          figma.root.getPluginData('measurements') || '[]'
        );
        
        const measurementIndex = measurements.findIndex((m: any) => m.id === measurementId);
        if (measurementIndex === -1) {
          return { success: false, error: `Measurement ${measurementId} not found` };
        }

        // Update measurement
        const updatedMeasurement = { ...measurements[measurementIndex] };
        if (direction !== undefined) updatedMeasurement.direction = direction;
        if (label !== undefined) updatedMeasurement.label = label;
        if (customValue !== undefined) updatedMeasurement.customValue = customValue;
        updatedMeasurement.updatedAt = new Date().toISOString();

        measurements[measurementIndex] = updatedMeasurement;
        figma.root.setPluginData('measurements', JSON.stringify(measurements));

        return {
          success: true,
          data: {
            ...updatedMeasurement,
            operation: 'edit_measurement'
          }
        };

      case 'remove_measurement':
        if (!measurementId) {
          return { success: false, error: 'measurementId required for remove_measurement operation' };
        }

        const allMeasurements = JSON.parse(
          figma.root.getPluginData('measurements') || '[]'
        );
        
        const filteredMeasurements = allMeasurements.filter((m: any) => m.id !== measurementId);
        figma.root.setPluginData('measurements', JSON.stringify(filteredMeasurements));

        return {
          success: true,
          data: {
            measurementId: measurementId,
            operation: 'remove_measurement',
            removed: true
          }
        };

      case 'list_measurements':
        const allPageMeasurements = JSON.parse(
          figma.root.getPluginData('measurements') || '[]'
        );
        
        const currentPage = pageId || figma.currentPage.id;
        const pageMeasurements = allPageMeasurements.filter((m: any) => m.pageId === currentPage);

        return {
          success: true,
          data: {
            measurements: pageMeasurements,
            count: pageMeasurements.length,
            pageId: currentPage,
            operation: 'list_measurements',
            devMode: isDevMode()
          }
        };

      default:
        return {
          success: false,
          error: `Unknown measurement operation: ${operation}`
        };
    }

  } catch (error) {
    return {
      success: false,
      error: `Measurement operation failed: ${error.message}`
    };
  }
}

export async function performDevResourceOperation(payload: any): Promise<any> {
  try {
    const { operation, nodeId, status, linkUrl, linkTitle, linkId, cssOptions } = payload;

    switch (operation) {
      case 'generate_css':
        if (!nodeId) {
          return { success: false, error: 'nodeId required for generate_css operation' };
        }

        const node = figma.getNodeById(nodeId);
        if (!node) {
          return { success: false, error: `Node ${nodeId} not found` };
        }

        try {
          // Try to get CSS using Figma's getCSSAsync method
          const css = await (node as any).getCSSAsync(cssOptions || {});
          
          return {
            success: true,
            data: {
              nodeId: nodeId,
              css: css,
              nodeName: node.name,
              nodeType: node.type,
              options: cssOptions || {},
              operation: 'generate_css',
              generatedAt: new Date().toISOString()
            }
          };
        } catch (error) {
          return {
            success: false,
            error: `CSS generation failed: ${error.message}. This node type may not support CSS generation.`
          };
        }

      case 'set_dev_status':
        if (!nodeId) {
          return { success: false, error: 'nodeId required for set_dev_status operation' };
        }
        if (!status) {
          return { success: false, error: 'status required for set_dev_status operation' };
        }

        const targetNode = figma.getNodeById(nodeId);
        if (!targetNode) {
          return { success: false, error: `Node ${nodeId} not found` };
        }

        // Store dev status in plugin data
        const devStatuses = JSON.parse(
          figma.root.getPluginData('devStatuses') || '{}'
        );

        devStatuses[nodeId] = {
          status: status,
          updatedAt: new Date().toISOString(),
          nodeName: targetNode.name
        };

        figma.root.setPluginData('devStatuses', JSON.stringify(devStatuses));

        return {
          success: true,
          data: {
            nodeId: nodeId,
            status: status,
            nodeName: targetNode.name,
            operation: 'set_dev_status',
            updatedAt: devStatuses[nodeId].updatedAt
          }
        };

      case 'add_dev_link':
        if (!nodeId) {
          return { success: false, error: 'nodeId required for add_dev_link operation' };
        }
        if (!linkUrl) {
          return { success: false, error: 'linkUrl required for add_dev_link operation' };
        }

        const linkNode = figma.getNodeById(nodeId);
        if (!linkNode) {
          return { success: false, error: `Node ${nodeId} not found` };
        }

        const devLinks = JSON.parse(
          figma.root.getPluginData('devLinks') || '{}'
        );

        if (!devLinks[nodeId]) {
          devLinks[nodeId] = [];
        }

        const newLinkId = generateId();
        const link = {
          id: newLinkId,
          url: linkUrl,
          title: linkTitle || linkUrl,
          createdAt: new Date().toISOString()
        };

        devLinks[nodeId].push(link);
        figma.root.setPluginData('devLinks', JSON.stringify(devLinks));

        return {
          success: true,
          data: {
            linkId: newLinkId,
            nodeId: nodeId,
            ...link,
            operation: 'add_dev_link'
          }
        };

      case 'remove_dev_link':
        if (!nodeId) {
          return { success: false, error: 'nodeId required for remove_dev_link operation' };
        }
        if (!linkId) {
          return { success: false, error: 'linkId required for remove_dev_link operation' };
        }

        const allDevLinks = JSON.parse(
          figma.root.getPluginData('devLinks') || '{}'
        );

        if (!allDevLinks[nodeId]) {
          return { success: false, error: `No links found for node ${nodeId}` };
        }

        allDevLinks[nodeId] = allDevLinks[nodeId].filter((link: any) => link.id !== linkId);
        figma.root.setPluginData('devLinks', JSON.stringify(allDevLinks));

        return {
          success: true,
          data: {
            linkId: linkId,
            nodeId: nodeId,
            operation: 'remove_dev_link',
            removed: true
          }
        };

      case 'get_dev_resources':
        const resources: any = {
          operation: 'get_dev_resources',
          devMode: isDevMode(),
          retrievedAt: new Date().toISOString()
        };

        if (nodeId) {
          const resourceNode = figma.getNodeById(nodeId);
          if (!resourceNode) {
            return { success: false, error: `Node ${nodeId} not found` };
          }

          // Get status for specific node
          const statuses = JSON.parse(figma.root.getPluginData('devStatuses') || '{}');
          const links = JSON.parse(figma.root.getPluginData('devLinks') || '{}');

          resources.nodeId = nodeId;
          resources.nodeName = resourceNode.name;
          resources.status = statuses[nodeId] || null;
          resources.links = links[nodeId] || [];
        } else {
          // Get all resources
          resources.allStatuses = JSON.parse(figma.root.getPluginData('devStatuses') || '{}');
          resources.allLinks = JSON.parse(figma.root.getPluginData('devLinks') || '{}');
          resources.annotations = JSON.parse(figma.root.getPluginData('annotations') || '[]');
          resources.measurements = JSON.parse(figma.root.getPluginData('measurements') || '[]');
        }

        return {
          success: true,
          data: resources
        };

      default:
        return {
          success: false,
          error: `Unknown dev resource operation: ${operation}`
        };
    }

  } catch (error) {
    return {
      success: false,
      error: `Dev resource operation failed: ${error.message}`
    };
  }
}
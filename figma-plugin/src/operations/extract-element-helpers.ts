// Helper functions for extract_element operation

// Helper function to calculate bounding box of vertices
function calculateVertexBounds(vertices: number[]): { minX: number, minY: number, maxX: number, maxY: number } {
  if (vertices.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  
  let minX = vertices[0], minY = vertices[1];
  let maxX = vertices[0], maxY = vertices[1];
  
  for (let i = 0; i < vertices.length; i += 2) {
    const x = vertices[i];
    const y = vertices[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  
  return { minX, minY, maxX, maxY };
}

// Helper function to extract a region and its dependencies
export function extractRegionFromSparse(sourceSparse: any, regionIndex: number, removeFromSource: boolean) {
  const targetRegion = sourceSparse.regions[regionIndex];
  
  // Always need to remap the extracted data for clean vertex indices
  // Only difference: when removeFromSource=false, we don't modify the source
  
  // Find all vertices used by this region
  const usedVertexIndices = new Set<number>();
  targetRegion.loops.forEach((loopStr: string) => {
    const loop = JSON.parse(loopStr);
    loop.forEach((vertexIndex: number) => usedVertexIndices.add(vertexIndex));
  });
  
  // Extract vertex coordinates for used vertices
  const sourceVertices = JSON.parse(sourceSparse.vertices);
  const extractedVertices = [];
  const vertexMapping = new Map<number, number>(); // old index -> new index
  
  Array.from(usedVertexIndices).sort((a, b) => a - b).forEach((oldIndex, newIndex) => {
    extractedVertices.push(sourceVertices[oldIndex * 2], sourceVertices[oldIndex * 2 + 1]);
    vertexMapping.set(oldIndex, newIndex);
  });
  
  // Calculate position offset to maintain visual position
  const originalBounds = calculateVertexBounds(sourceVertices);
  const extractedBounds = calculateVertexBounds(extractedVertices);
  const positionOffset = {
    x: originalBounds.minX - extractedBounds.minX,
    y: originalBounds.minY - extractedBounds.minY
  };
  
  // Remap region loops to new vertex indices
  const remappedLoops = targetRegion.loops.map((loopStr: string) => {
    const loop = JSON.parse(loopStr);
    const remappedLoop = loop.map((oldIndex: number) => vertexMapping.get(oldIndex));
    return JSON.stringify(remappedLoop);
  });
  
  // Create extracted data
  const extractedData: any = {
    vertices: JSON.stringify(extractedVertices),
    regions: [{
      loops: remappedLoops,
      windingRule: targetRegion.windingRule || 'EVENODD',
      fillIndex: 0 // Reset to first fill
    }]
  };
  
  // Extract fills associated with this region
  if (sourceSparse.fills && targetRegion.fillIndex !== undefined && sourceSparse.fills[targetRegion.fillIndex]) {
    extractedData.fills = [sourceSparse.fills[targetRegion.fillIndex]];
  }
  
  // Extract handles for used vertices
  if (sourceSparse.handles) {
    const extractedHandles: any = {};
    Array.from(usedVertexIndices).forEach(oldIndex => {
      if (sourceSparse.handles[oldIndex.toString()]) {
        const newIndex = vertexMapping.get(oldIndex);
        extractedHandles[newIndex.toString()] = sourceSparse.handles[oldIndex.toString()];
      }
    });
    if (Object.keys(extractedHandles).length > 0) {
      extractedData.handles = extractedHandles;
    }
  }
  
  // Extract vertex properties for used vertices
  if (sourceSparse.vertexProps) {
    const extractedVertexProps: any = {};
    Array.from(usedVertexIndices).forEach(oldIndex => {
      if (sourceSparse.vertexProps[oldIndex.toString()]) {
        const newIndex = vertexMapping.get(oldIndex);
        extractedVertexProps[newIndex.toString()] = sourceSparse.vertexProps[oldIndex.toString()];
      }
    });
    if (Object.keys(extractedVertexProps).length > 0) {
      extractedData.vertexProps = extractedVertexProps;
    }
  }
  
  let remainingData = null;
  if (removeFromSource) {
    // Create remaining data without the extracted region
    const remainingRegions = sourceSparse.regions.filter((_: any, index: number) => index !== regionIndex);
    
    // If no regions left, create a minimal vector
    if (remainingRegions.length === 0) {
      remainingData = {
        vertices: "[0,0,10,0,10,10,0,10]", // Small square
        regions: [{
          loops: ["[0,1,2,3]"],
          windingRule: 'EVENODD'
        }]
      };
    } else {
      remainingData = {
        ...sourceSparse,
        regions: remainingRegions
      };
    }
  }
  // When removeFromSource=false, remainingData stays null and source is unchanged
  
  return { extracted: extractedData, remaining: remainingData, positionOffset };
}

// Helper function to extract a path and its dependencies  
export function extractPathFromSparse(sourceSparse: any, pathIndex: number, removeFromSource: boolean) {
  const targetPath = sourceSparse.paths[pathIndex];
  
  // Always need to remap the extracted data for clean vertex indices
  // Only difference: when removeFromSource=false, we don't modify the source
  const pathVertices = JSON.parse(targetPath);
  
  // Find all vertices used by this path
  const usedVertexIndices = new Set<number>();
  pathVertices.forEach((vertexIndex: number) => usedVertexIndices.add(vertexIndex));
  
  // Extract vertex coordinates for used vertices
  const sourceVertices = JSON.parse(sourceSparse.vertices);
  const extractedVertices = [];
  const vertexMapping = new Map<number, number>(); // old index -> new index
  
  Array.from(usedVertexIndices).sort((a, b) => a - b).forEach((oldIndex, newIndex) => {
    extractedVertices.push(sourceVertices[oldIndex * 2], sourceVertices[oldIndex * 2 + 1]);
    vertexMapping.set(oldIndex, newIndex);
  });
  
  // Calculate position offset to maintain visual position
  const originalBounds = calculateVertexBounds(sourceVertices);
  const extractedBounds = calculateVertexBounds(extractedVertices);
  const positionOffset = {
    x: originalBounds.minX - extractedBounds.minX,
    y: originalBounds.minY - extractedBounds.minY
  };
  
  // Remap path to new vertex indices
  const remappedPath = pathVertices.map((oldIndex: number) => vertexMapping.get(oldIndex));
  
  // Create extracted data
  const extractedData: any = {
    vertices: JSON.stringify(extractedVertices),
    paths: [JSON.stringify(remappedPath)]
  };
  
  // Extract handles for used vertices
  if (sourceSparse.handles) {
    const extractedHandles: any = {};
    Array.from(usedVertexIndices).forEach(oldIndex => {
      if (sourceSparse.handles[oldIndex.toString()]) {
        const newIndex = vertexMapping.get(oldIndex);
        extractedHandles[newIndex.toString()] = sourceSparse.handles[oldIndex.toString()];
      }
    });
    if (Object.keys(extractedHandles).length > 0) {
      extractedData.handles = extractedHandles;
    }
  }
  
  // Extract vertex properties for used vertices
  if (sourceSparse.vertexProps) {
    const extractedVertexProps: any = {};
    Array.from(usedVertexIndices).forEach(oldIndex => {
      if (sourceSparse.vertexProps[oldIndex.toString()]) {
        const newIndex = vertexMapping.get(oldIndex);
        extractedVertexProps[newIndex.toString()] = sourceSparse.vertexProps[oldIndex.toString()];
      }
    });
    if (Object.keys(extractedVertexProps).length > 0) {
      extractedData.vertexProps = extractedVertexProps;
    }
  }
  
  let remainingData = null;
  if (removeFromSource) {
    // Create remaining data without the extracted path
    const remainingPaths = sourceSparse.paths.filter((_: any, index: number) => index !== pathIndex);
    
    // If no paths left, create a minimal path
    if (remainingPaths.length === 0) {
      remainingData = {
        vertices: "[0,0,10,0]", // Simple line
        paths: ["[0,1]"]
      };
    } else {
      remainingData = {
        ...sourceSparse,
        paths: remainingPaths
      };
    }
  }
  // When removeFromSource=false, remainingData stays null and source is unchanged
  
  return { extracted: extractedData, remaining: remainingData, positionOffset };
}
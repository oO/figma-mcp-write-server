/**
 * Vector Sparse Format Conversion Utilities
 * 
 * Converts between Figma's verbose VectorNetwork format and our compact sparse format
 * optimized for AI agents and reduced token usage.
 */

import { cleanEmptyPropertiesAsync } from './node-utils.js';

/**
 * Recursively remove Symbol properties that cause postMessage serialization errors
 */
export function removeSymbols(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeSymbols(item));
  }
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip symbol keys and symbol values
    if (typeof key === 'symbol' || typeof value === 'symbol') {
      continue;
    }
    cleaned[key] = removeSymbols(value);
  }
  
  return cleaned;
}
import { createSolidPaint } from './color-utils.js';
import { logger } from '../logger.js';

/**
 * Create a hash key for Paint arrays for deduplication
 * JSON.stringify returns empty objects for Figma Paint objects, so we manually serialize key properties
 */
function createFillHash(fills: Paint[]): string {
  return fills.map(fill => {
    const serializable: any = {
      type: fill.type,
      visible: fill.visible,
      opacity: fill.opacity,
      blendMode: fill.blendMode
    };
    
    // Add type-specific properties
    if (fill.type === 'SOLID') {
      const solidFill = fill as SolidPaint;
      serializable.color = solidFill.color;
    } else if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL' || 
               fill.type === 'GRADIENT_ANGULAR' || fill.type === 'GRADIENT_DIAMOND') {
      const gradientFill = fill as GradientPaint;
      serializable.gradientStops = gradientFill.gradientStops;
      serializable.gradientTransform = gradientFill.gradientTransform;
    } else if (fill.type === 'IMAGE') {
      const imageFill = fill as ImagePaint;
      serializable.imageHash = imageFill.imageHash;
      serializable.scaleMode = imageFill.scaleMode;
      serializable.scalingFactor = imageFill.scalingFactor;
      serializable.rotation = imageFill.rotation;
      serializable.imageTransform = imageFill.imageTransform;
      serializable.filters = imageFill.filters;
    }
    
    return JSON.stringify(serializable);
  }).join('|');
}

/**
 * Create default fills for vector regions when fillColor is provided  
 * Consistent with figma_nodes and other operations
 */
export function createDefaultVectorFill(fillColor?: string): Paint[] {
  if (!fillColor) {
    return []; // No default fill - let Figma handle automatic fills for closed regions
  }
  
  return [createSolidPaint(fillColor)];
}

export interface SparseVectorNetwork {
  // Core geometry (always present)
  vertices: string; // JSON array string: "[x,y,x,y,x,y...]"
  
  // Path definitions
  regions?: Array<{
    loops: string[];  // ["[0,1,2,3]", "[4,5,6,7]"] for [outer_loop, hole1, hole2, ...]
    windingRule?: "EVENODD" | "NONZERO"; // default: NONZERO
    fillIndex?: number; // Reference to fills array index
  }>;
  
  paths?: string[]; // Open paths: ["[0,1,2]", "[5,6,7]"]
  
  // Sparse customizations (only when different from defaults)
  handles?: {
    [vertexIndex: string]: string; // "1": "[inTangentX,inTangentY,outTangentX,outTangentY]"
  };
  
  vertexProps?: {
    [vertexIndex: string]: {
      cornerRadius?: number;
      strokeCap?: "NONE" | "ROUND" | "SQUARE";
      strokeJoin?: "MITER" | "BEVEL" | "ROUND";
      handleMirroring?: "NONE" | "ANGLE" | "ANGLE_AND_LENGTH";
    };
  };
  
  // Fill palette (deduplicated)
  fills?: Paint[][]; // Array of Paint arrays (each fill can have multiple paints)
}

/**
 * Convert Figma's verbose VectorNetwork to our sparse format
 */
export async function figmaToSparse(figmaNetwork: VectorNetwork): Promise<SparseVectorNetwork> {
  const sparse: SparseVectorNetwork = {
    // Convert vertices to JSON array string
    vertices: JSON.stringify(figmaNetwork.vertices.flatMap(v => [v.x, v.y]))
  };
  
  // Process regions if they exist
  if (figmaNetwork.regions && figmaNetwork.regions.length > 0) {
    sparse.regions = [];
    const fillMap = new Map<string, number>(); // Fill hash -> fills array index
    const fills: Paint[][] = [];
    
    for (let regionIndex = 0; regionIndex < figmaNetwork.regions.length; regionIndex++) {
      const region = figmaNetwork.regions[regionIndex];
      const sparseRegion: any = {
        loops: region.loops.map(loop => JSON.stringify(loop))
      };
      
      // Only include windingRule if not default
      if (region.windingRule !== "NONZERO") {
        sparseRegion.windingRule = region.windingRule;
      }
      
      // Handle fills if present
      if (region.fills && region.fills.length > 0) {
        // Create a hash of the fill array for deduplication
        const fillHash = createFillHash(region.fills);
        
        if (fillMap.has(fillHash)) {
          // Reuse existing fill
          sparseRegion.fillIndex = fillMap.get(fillHash);
        } else {
          // Add new fill to palette - remove symbols then clean
          const fillIndex = fills.length;
          const symbolFreeFills = removeSymbols(region.fills);
          const cleanedFills = await cleanEmptyPropertiesAsync(symbolFreeFills) || symbolFreeFills;
          fills.push(cleanedFills);
          fillMap.set(fillHash, fillIndex);
          sparseRegion.fillIndex = fillIndex;
        }
      }
      
      sparse.regions.push(sparseRegion);
    }
    
    // Only include fills array if we have any
    if (fills.length > 0) {
      sparse.fills = fills;
    }
  }
  
  // Find open paths (segments not used in any region)
  if (figmaNetwork.segments && figmaNetwork.segments.length > 0) {
    const usedSegments = new Set<string>();
    
    // Mark segments used in regions
    if (figmaNetwork.regions) {
      figmaNetwork.regions.forEach(region => {
        region.loops.forEach(loop => {
          for (let i = 0; i < loop.length; i++) {
            const start = loop[i];
            const end = loop[(i + 1) % loop.length];
            usedSegments.add(`${start}-${end}`);
          }
        });
      });
    }
    
    // Find unused segments and trace open paths
    const openPaths: string[] = [];
    const processedSegments = new Set<number>();
    
    figmaNetwork.segments.forEach((segment, segmentIndex) => {
      if (processedSegments.has(segmentIndex)) return;
      
      const segmentKey = `${segment.start}-${segment.end}`;
      if (!usedSegments.has(segmentKey)) {
        // This is part of an open path - trace it
        const path = traceOpenPath(figmaNetwork.segments, segmentIndex, processedSegments);
        if (path.length > 0) {
          openPaths.push(JSON.stringify(path));
        }
      }
    });
    
    if (openPaths.length > 0) {
      sparse.paths = openPaths;
    }
  }
  
  // Process vertex handles (collect incoming/outgoing tangents per vertex)
  if (figmaNetwork.segments) {
    const vertexHandles: { [vertexIndex: string]: [number, number, number, number] } = {};
    
    // Initialize all vertices with zero handles
    for (let i = 0; i < figmaNetwork.vertices.length; i++) {
      vertexHandles[i.toString()] = [0, 0, 0, 0]; // [inX, inY, outX, outY]
    }
    
    // Collect handles from segments
    figmaNetwork.segments.forEach(segment => {
      const startVertex = segment.start.toString();
      const endVertex = segment.end.toString();
      
      // Set outgoing handle for start vertex
      if (segment.tangentStart && (segment.tangentStart.x !== 0 || segment.tangentStart.y !== 0)) {
        vertexHandles[startVertex][2] = segment.tangentStart.x; // outX
        vertexHandles[startVertex][3] = segment.tangentStart.y; // outY
      }
      
      // Set incoming handle for end vertex  
      if (segment.tangentEnd && (segment.tangentEnd.x !== 0 || segment.tangentEnd.y !== 0)) {
        vertexHandles[endVertex][0] = segment.tangentEnd.x; // inX
        vertexHandles[endVertex][1] = segment.tangentEnd.y; // inY
      }
    });
    
    // Only include vertices that have non-zero handles
    const handles: { [key: string]: string } = {};
    Object.entries(vertexHandles).forEach(([vertexIndex, [inX, inY, outX, outY]]) => {
      if (inX !== 0 || inY !== 0 || outX !== 0 || outY !== 0) {
        handles[vertexIndex] = JSON.stringify([inX, inY, outX, outY]);
      }
    });
    
    if (Object.keys(handles).length > 0) {
      sparse.handles = handles;
    }
  }
  
  // Process vertex properties (only non-defaults)
  if (figmaNetwork.vertices) {
    const vertexProps: { [key: string]: any } = {};
    
    figmaNetwork.vertices.forEach((vertex, index) => {
      const props: any = {};
      
      if (vertex.cornerRadius !== 0) {
        props.cornerRadius = vertex.cornerRadius;
      }
      if (vertex.strokeCap !== "NONE") {
        props.strokeCap = vertex.strokeCap;
      }
      if (vertex.strokeJoin !== "MITER") {
        props.strokeJoin = vertex.strokeJoin;
      }
      if (vertex.handleMirroring !== "NONE") {
        props.handleMirroring = vertex.handleMirroring;
      }
      
      if (Object.keys(props).length > 0) {
        vertexProps[index.toString()] = props;
      }
    });
    
    if (Object.keys(vertexProps).length > 0) {
      sparse.vertexProps = vertexProps;
    }
  }
  
  // Clean up empty properties and remove Symbol properties for serialization safety
  const symbolFreeSparse = removeSymbols(sparse);
  const cleanedSparse = await cleanEmptyPropertiesAsync(symbolFreeSparse);
  return cleanedSparse || symbolFreeSparse;
}

/**
 * Trace an open path from a starting segment
 */
function traceOpenPath(
  segments: readonly VectorSegment[], 
  startSegmentIndex: number, 
  processedSegments: Set<number>
): number[] {
  const path: number[] = [];
  const segment = segments[startSegmentIndex];
  
  path.push(segment.start, segment.end);
  processedSegments.add(startSegmentIndex);
  
  // Try to extend the path forward
  let currentEnd = segment.end;
  while (true) {
    const nextSegmentIndex = segments.findIndex((seg, index) => 
      !processedSegments.has(index) && seg.start === currentEnd
    );
    
    if (nextSegmentIndex === -1) break;
    
    const nextSegment = segments[nextSegmentIndex];
    path.push(nextSegment.end);
    processedSegments.add(nextSegmentIndex);
    currentEnd = nextSegment.end;
  }
  
  // Try to extend the path backward
  let currentStart = segment.start;
  while (true) {
    const prevSegmentIndex = segments.findIndex((seg, index) => 
      !processedSegments.has(index) && seg.end === currentStart
    );
    
    if (prevSegmentIndex === -1) break;
    
    const prevSegment = segments[prevSegmentIndex];
    path.unshift(prevSegment.start);
    processedSegments.add(prevSegmentIndex);
    currentStart = prevSegment.start;
  }
  
  return path;
}

/**
 * Convert sparse format back to Figma's verbose VectorNetwork format
 */
export function sparseToFigma(sparse: SparseVectorNetwork): VectorNetwork {
  const figmaNetwork: any = {
    vertices: [],
    segments: [],
    regions: []
  };
  
  // Validate and parse vertices
  if (!sparse.vertices || typeof sparse.vertices !== 'string') {
    throw new Error('vertices must be a JSON array string like "[0,0,100,0,50,100]"');
  }
  
  let vertexValues: number[];
  try {
    vertexValues = JSON.parse(sparse.vertices) as number[];
    if (!Array.isArray(vertexValues)) {
      throw new Error('vertices must be a JSON array');
    }
    if (vertexValues.length % 2 !== 0) {
      throw new Error('vertices array must contain pairs of x,y coordinates');
    }
  } catch (parseError) {
    logger.debug('JSON parse error for vertices:', parseError);
    throw new Error(`Invalid vertices format: must be a valid JSON array string like "[0,0,100,0,50,100]"`);
  }
  
  for (let i = 0; i < vertexValues.length; i += 2) {
    const vertex: any = {
      x: vertexValues[i],
      y: vertexValues[i + 1],
      strokeCap: "NONE", // Use NONE to match UI-created vectors
      strokeJoin: "MITER", 
      cornerRadius: 0,
      handleMirroring: "NONE"
    };
    
    // Apply vertex properties if any
    const vertexIndex = Math.floor(i / 2);
    if (sparse.vertexProps && sparse.vertexProps[vertexIndex.toString()]) {
      const props = sparse.vertexProps[vertexIndex.toString()];
      Object.assign(vertex, props);
    }
    
    figmaNetwork.vertices.push(vertex);
  }
  
  // Convert regions and create segments
  if (sparse.regions) {
    sparse.regions.forEach((region, regionIndex) => {
      // Validate region loops
      if (!region.loops || !Array.isArray(region.loops)) {
        throw new Error(`Region ${regionIndex}: loops must be an array of JSON strings like ["[0,1,2,3]"]`);
      }
      
      let parsedLoops: number[][];
      try {
        parsedLoops = region.loops.map(loopStr => {
          if (typeof loopStr !== 'string') {
            throw new Error('loop must be a JSON string');
          }
          const parsed = JSON.parse(loopStr) as number[];
          if (!Array.isArray(parsed)) {
            throw new Error('loop must contain a JSON array');
          }
          // Validate vertex indices
          parsed.forEach(vertexIndex => {
            if (typeof vertexIndex !== 'number' || vertexIndex < 0 || vertexIndex >= vertexValues.length / 2) {
              throw new Error(`invalid vertex index ${vertexIndex} - must reference a valid vertex (0-${Math.floor(vertexValues.length / 2) - 1})`);
            }
          });
          return parsed;
        });
      } catch (parseError) {
        throw new Error(`Region ${regionIndex}: ${parseError.message}. Expected format: loops: ["[0,1,2,3]"]`);
      }
      
      const figmaRegion: any = {
        windingRule: region.windingRule || "NONZERO",
        loops: parsedLoops,
        fillStyleId: "",
        fills: []
      };
      
      // Add fills if specified
      if (region.fillIndex !== undefined && sparse.fills && sparse.fills[region.fillIndex]) {
        figmaRegion.fills = sparse.fills[region.fillIndex];
      }
      
      figmaNetwork.regions.push(figmaRegion);
      
      // Create segments for this region's loops
      parsedLoops.forEach(loop => {
        for (let i = 0; i < loop.length; i++) {
          const start = loop[i];
          const end = loop[(i + 1) % loop.length];
          
          const segment: any = {
            start,
            end,
            tangentStart: { x: 0, y: 0 },
            tangentEnd: { x: 0, y: 0 }
          };
          
          // Apply handles from vertex-based format
          // Get outgoing handle from start vertex
          if (sparse.handles && sparse.handles[start.toString()]) {
            const startHandles = JSON.parse(sparse.handles[start.toString()]) as number[];
            segment.tangentStart = { x: startHandles[2], y: startHandles[3] }; // outX, outY
          }
          
          // Get incoming handle from end vertex
          if (sparse.handles && sparse.handles[end.toString()]) {
            const endHandles = JSON.parse(sparse.handles[end.toString()]) as number[];
            segment.tangentEnd = { x: endHandles[0], y: endHandles[1] }; // inX, inY
          }
          
          figmaNetwork.segments.push(segment);
        }
      });
    });
  }
  
  // Convert open paths to segments
  if (sparse.paths) {
    sparse.paths.forEach(pathStr => {
      const path = JSON.parse(pathStr) as number[];
      for (let i = 0; i < path.length - 1; i++) {
        const start = path[i];
        const end = path[i + 1];
        
        // Validate vertex indices for paths
        if (start < 0 || start >= vertexValues.length / 2 || end < 0 || end >= vertexValues.length / 2) {
          throw new Error(`Path contains invalid vertex indices: ${start}-${end}. Valid range: 0-${Math.floor(vertexValues.length / 2) - 1}`);
        }
        
        const segment: any = {
          start,
          end,
          tangentStart: { x: 0, y: 0 },
          tangentEnd: { x: 0, y: 0 }
        };
        
        // Apply handles from vertex-based format
        // Get outgoing handle from start vertex
        if (sparse.handles && sparse.handles[start.toString()]) {
          const startHandles = JSON.parse(sparse.handles[start.toString()]) as number[];
          segment.tangentStart = { x: startHandles[2], y: startHandles[3] }; // outX, outY
        }
        
        // Get incoming handle from end vertex
        if (sparse.handles && sparse.handles[end.toString()]) {
          const endHandles = JSON.parse(sparse.handles[end.toString()]) as number[];
          segment.tangentEnd = { x: endHandles[0], y: endHandles[1] }; // inX, inY
        }
        
        figmaNetwork.segments.push(segment);
      }
    });
  }
  
  return figmaNetwork as VectorNetwork;
}
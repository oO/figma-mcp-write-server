// TypeScript definitions for Figma MCP Plugin

// Global constants injected by build system
declare const PLUGIN_VERSION: string;

export interface PluginMessage {
  type: string;
  operation?: string;
  payload?: any;
  id?: string;
}

export interface OperationResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface NodeParams {
  // === IDENTIFICATION ===
  nodeId?: string;
  
  // === BASIC PROPERTIES ===
  nodeType?: string;
  name?: string;
  
  // === SIZE & POSITION ===
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  
  // === CORNER PROPERTIES ===
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
  cornerSmoothing?: number;
  
  // === BASIC STYLING ===
  fillColor?: string;
  fillOpacity?: number;
  opacity?: number;
  visible?: boolean;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  
  // === TRANSFORM ===
  rotation?: number;
  
  // === INTERACTION ===
  locked?: boolean;
  
  // === FRAME-SPECIFIC PROPERTIES ===
  clipsContent?: boolean;
  
  // === SHAPE-SPECIFIC PROPERTIES ===
  pointCount?: number;
  innerRadius?: number;
}

export interface TextParams extends NodeParams {
  content?: string;
  characters?: string;
  fontName?: FontName;
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textCase?: string;
  textDecoration?: string;
  letterSpacing?: number;
  lineHeight?: LineHeight;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  fills?: Paint[];
  styleRanges?: TextStyleRange[];
  createStyle?: boolean;
  styleName?: string;
  textTruncation?: string;
  maxLines?: number;
  // Note: OpenType features (ligatures, kerning) are read-only in Figma Plugin API
}

export interface FontName {
  family: string;
  style: string;
}

export interface LineHeight {
  value: number;
  unit: string;
}

export interface TextStyleRange {
  start: number;
  end: number;
  fontName?: FontName;
  fontSize?: number;
  textCase?: string;
  textDecoration?: string;
  letterSpacing?: number;
  lineHeight?: LineHeight;
  fills?: Paint[];
}

export interface Paint {
  type: string;
  color?: RGB;
  opacity?: number;
  gradientStops?: GradientStop[];
  gradientTransform?: Transform;
  scaleMode?: string;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface GradientStop {
  position: number;
  color: RGBA;
}

export interface Transform extends Array<number> {
  readonly length: 6;
}

export interface StyleParams {
  operation: string;
  styleType?: string;
  styleName?: string;
  styleId?: string;
  nodeId?: string;
  paintType?: string;
  color?: string;
  opacity?: number;
  gradientStops?: any[];
  gradientTransform?: number[];
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  effects?: Effect[];
  layoutGrids?: LayoutGrid[];
}

export interface Effect {
  type: string;
  visible?: boolean;
  color?: RGBA;
  offset?: Vector2;
  radius?: number;
  spread?: number;
  blendMode?: string;
  showShadowBehindNode?: boolean;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface LayoutGrid {
  pattern: string;
  visible?: boolean;
  sectionSize?: number;
  color?: RGBA;
  alignment?: string;
  gutterSize?: number;
  offset?: number;
  count?: number;
}

export interface HierarchyParams {
  operation: string;
  nodeId?: string;
  nodeIds?: string[];
  targetNodeId?: string;
  newParentId?: string;
  newIndex?: number;
  name?: string;
  groupType?: string;
}

export interface AutoLayoutParams {
  operation: string;
  nodeId: string;
  direction?: string;
  spacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  primaryAlignment?: string;
  counterAlignment?: string;
  resizingWidth?: string;
  resizingHeight?: string;
  strokesIncludedInLayout?: boolean;
  layoutWrap?: string;
}

export interface Padding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface Resizing {
  width?: string;
  height?: string;
}

export interface ConstraintsParams {
  operation: string;
  nodeId: string;
  horizontal?: string;
  vertical?: string;
}

export interface SelectionParams {
  nodeIds?: string[];
}

export interface ExportParams {
  nodeId: string;
  format?: string;
  scale?: number;
}

export interface UpdateNodeParams {
  nodeId: string;
  properties: Record<string, any>;
}

export interface MoveNodeParams {
  nodeId: string;
  x: number;
  y: number;
}

export interface DuplicateNodeParams {
  nodeId: string;
  offsetX?: number;
  offsetY?: number;
}

export interface SimpleNodeInfo {
  id: string;
  name: string;
  type: string;
}

export interface NodeInfo extends SimpleNodeInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  depth?: number;
  parentId?: string;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  rotation?: number;
  cornerRadius?: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  // Paint arrays for complete fill/stroke information
  fills?: readonly Paint[];
  strokes?: readonly Paint[];
  strokeWeight?: number;
  strokeAlign?: 'CENTER' | 'INSIDE' | 'OUTSIDE';
  
  // CRITICAL: Variable binding information
  boundVariables?: any;
  
  // Additional corner radius properties
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
  
  // Layout properties for frames
  spacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  
  // Typography properties for text nodes
  characters?: string;
  fontSize?: number;
  fontName?: FontName;
  textCase?: string;
  textDecoration?: string;
  letterSpacing?: any; // Can be number or LetterSpacing object
  lineHeight?: any; // Can be number or LineHeight object
}

export interface DetailedNodeInfo extends NodeInfo {
  absoluteX?: number;
  absoluteY?: number;
  absoluteTransform?: number[][];
  relativeTransform?: number[][];
  effects?: any[];
  fills?: any[];
  strokes?: any[];
  constraints?: any;
  layoutMode?: string;
  layoutGrow?: number;
  layoutAlign?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  clipsContent?: boolean;
  characters?: string; // for text nodes
  fontSize?: number;
  fontName?: any;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
}

export interface GetPageNodesParams {
  detail?: 'simple' | 'standard' | 'detailed';
  includeHidden?: boolean;
  includePages?: boolean;
  nodeTypes?: string[];
  maxDepth?: number;
}

export interface PageNodesResult {
  nodes: NodeInfo[];
  totalCount: number;
  topLevelCount: number;
}

export interface StyleInfo {
  id: string;
  name: string;
  type: string;
  description?: string;
  paints?: Paint[];
  fontName?: FontName;
  fontSize?: number;
  effects?: Effect[];
  layoutGrids?: LayoutGrid[];
}

export type OperationHandler = (params: any) => Promise<OperationResult>;

export interface AlignmentParams {
  horizontalOperation?: 'position' | 'align' | 'distribute';
  horizontalDirection?: 'left' | 'center' | 'right';
  horizontalReferencePoint?: 'left' | 'center' | 'right';
  horizontalAlignmentPoint?: 'left' | 'center' | 'right';
  horizontalSpacing?: number;
  verticalOperation?: 'position' | 'align' | 'distribute';
  verticalDirection?: 'top' | 'middle' | 'bottom';
  verticalReferencePoint?: 'top' | 'middle' | 'bottom';
  verticalAlignmentPoint?: 'top' | 'middle' | 'bottom';
  verticalSpacing?: number;
  nodeIds: string[];
  referenceMode?: 'bounds' | 'key_object' | 'relative';
  referenceNodeId?: string;
  margin?: number;
}

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface AlignmentResult {
  nodeId: string;
  name: string;
  operation: string;
  newPosition: {
    x: number;
    y: number;
  };
  originalPosition: {
    x: number;
    y: number;
  };
}

export interface HandlerRegistry {
  [operation: string]: OperationHandler;
}
// TypeScript definitions for Figma MCP Plugin

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
  nodeType?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
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
  padding?: Padding;
  primaryAlignment?: string;
  counterAlignment?: string;
  resizing?: Resizing;
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

export interface NodeInfo {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth?: number;
  parentId?: string;
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

export interface HandlerRegistry {
  [operation: string]: OperationHandler;
}
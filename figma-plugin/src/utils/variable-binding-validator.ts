/**
 * Declarative Variable Binding Validation System
 * 
 * This module provides a maintainable, declarative approach to validating
 * variable bindings and generating helpful suggestions for users.
 */

// ================================================================================
// Type Definitions
// ================================================================================

export interface VariableInfo {
  id: string;
  name: string;
  type: 'FLOAT' | 'STRING' | 'COLOR' | 'BOOLEAN';
  collectionName?: string;
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: ValidationSuggestions;
}

export interface ValidationSuggestions {
  validVariables?: VariableInfo[];
  validProperties?: string[];
  nodeTypeRequirement?: string;
  alternativeNodeTypes?: string[];
  explanation?: string;
}

// ================================================================================
// Declarative Binding Rules Configuration
// ================================================================================

/**
 * Comprehensive binding rules defining which variable types can be bound
 * to which properties on which node types. This serves as the single source
 * of truth for all variable binding validation.
 */
export const BINDING_RULES: Record<string, Record<string, string[]>> = {
  // Text nodes support the most comprehensive text styling
  TEXT: {
    FLOAT: [
      'fontSize', 'letterSpacing', 'lineHeight',
      'width', 'height', 'x', 'y', 'opacity', 'rotation'
    ],
    STRING: [
      'fontFamily', 'fontStyle', 'textCase', 'textDecoration'
    ],
    COLOR: [], // Colors are handled via fills/strokes, not direct binding
    BOOLEAN: ['visible']
  },

  // Rectangle nodes support size, position, and corner radius
  RECTANGLE: {
    FLOAT: [
      'width', 'height', 'x', 'y', 
      'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
      'opacity', 'rotation', 'strokeWidth'
    ],
    STRING: [],
    COLOR: [], // Colors are handled via fills/strokes
    BOOLEAN: ['visible']
  },

  // Ellipse nodes support size, position, and basic properties
  ELLIPSE: {
    FLOAT: [
      'width', 'height', 'x', 'y', 
      'opacity', 'rotation', 'strokeWidth'
    ],
    STRING: [],
    COLOR: [], // Colors are handled via fills/strokes
    BOOLEAN: ['visible']
  },

  // Frame nodes support size, position, corner radius, and layout
  FRAME: {
    FLOAT: [
      'width', 'height', 'x', 'y',
      'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
      'opacity', 'rotation', 'strokeWidth',
      'spacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'
    ],
    STRING: [],
    COLOR: [], // Colors are handled via fills/strokes
    BOOLEAN: ['visible']
  },

  // Component nodes support most properties like frames
  COMPONENT: {
    FLOAT: [
      'width', 'height', 'x', 'y',
      'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
      'opacity', 'rotation', 'strokeWidth',
      'spacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'
    ],
    STRING: [],
    COLOR: [], // Colors are handled via fills/strokes
    BOOLEAN: ['visible']
  },

  // Instance nodes support most properties like components
  INSTANCE: {
    FLOAT: [
      'width', 'height', 'x', 'y',
      'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
      'opacity', 'rotation', 'strokeWidth',
      'spacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'
    ],
    STRING: [],
    COLOR: [], // Colors are handled via fills/strokes
    BOOLEAN: ['visible']
  },

  // Group nodes support minimal properties
  GROUP: {
    FLOAT: ['x', 'y', 'opacity', 'rotation'],
    STRING: [],
    COLOR: [],
    BOOLEAN: ['visible']
  },

  // Vector nodes support basic properties
  VECTOR: {
    FLOAT: [
      'width', 'height', 'x', 'y', 
      'opacity', 'rotation', 'strokeWidth'
    ],
    STRING: [],
    COLOR: [], // Colors are handled via fills/strokes
    BOOLEAN: ['visible']
  },

  // Star nodes support basic properties
  STAR: {
    FLOAT: [
      'width', 'height', 'x', 'y', 
      'opacity', 'rotation', 'strokeWidth'
    ],
    STRING: [],
    COLOR: [], // Colors are handled via fills/strokes
    BOOLEAN: ['visible']
  },

  // Polygon nodes support basic properties
  POLYGON: {
    FLOAT: [
      'width', 'height', 'x', 'y', 
      'opacity', 'rotation', 'strokeWidth'
    ],
    STRING: [],
    COLOR: [], // Colors are handled via fills/strokes
    BOOLEAN: ['visible']
  },

  // Line nodes support basic properties
  LINE: {
    FLOAT: [
      'x', 'y', 'opacity', 'rotation', 'strokeWidth'
    ],
    STRING: [],
    COLOR: [], // Colors are handled via fills/strokes
    BOOLEAN: ['visible']
  }
};

/**
 * Special property handling rules for complex properties like fills, strokes, effects, and grids
 * These properties require special handling via setBoundVariableForPaint, setBoundVariableForEffect, etc.
 */
export const SPECIAL_PROPERTIES = {
  fills: {
    supportedTypes: ['COLOR'],
    supportedNodes: ['TEXT', 'RECTANGLE', 'ELLIPSE', 'FRAME', 'COMPONENT', 'INSTANCE', 'VECTOR', 'STAR', 'POLYGON'],
    handlingType: 'paint' as const
  },
  strokes: {
    supportedTypes: ['COLOR'],
    supportedNodes: ['TEXT', 'RECTANGLE', 'ELLIPSE', 'FRAME', 'COMPONENT', 'INSTANCE', 'VECTOR', 'STAR', 'POLYGON', 'LINE'],
    handlingType: 'paint' as const
  },
  effects: {
    supportedTypes: ['FLOAT', 'COLOR'],
    supportedNodes: ['TEXT', 'RECTANGLE', 'ELLIPSE', 'FRAME', 'COMPONENT', 'INSTANCE', 'VECTOR', 'STAR', 'POLYGON', 'LINE'],
    handlingType: 'effect' as const,
    fields: {
      FLOAT: ['radius', 'spread', 'offsetX', 'offsetY'],
      COLOR: ['color']
    }
  },
  layoutGrids: {
    supportedTypes: ['FLOAT'],
    supportedNodes: ['FRAME', 'COMPONENT', 'INSTANCE'],
    handlingType: 'grid' as const,
    fields: {
      FLOAT: ['sectionSize', 'count', 'offset', 'gutterSize']
    }
  }
};

// ================================================================================
// Style Binding Rules
// ================================================================================

export const STYLE_BINDING_RULES = {
  PAINT: {
    FLOAT: [],
    STRING: [],
    COLOR: ['color', 'paints'],
    BOOLEAN: []
  },
  TEXT: {
    FLOAT: ['fontSize', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent'],
    STRING: [],
    COLOR: [],
    BOOLEAN: []
  },
  EFFECT: {
    FLOAT: [],
    STRING: [],
    COLOR: [],
    BOOLEAN: []
  }
};

// ================================================================================
// Validation Engine
// ================================================================================

export class DeclarativeBindingValidator {
  private variableCache = new Map<string, VariableInfo[]>();
  private cacheExpiry = 5000; // 5 seconds
  private lastCacheTime = 0;

  /**
   * Validate a variable binding and provide comprehensive suggestions
   */
  async validateBinding(
    nodeType: string,
    property: string,
    variableType: string,
    targetType: 'node' | 'style' = 'node',
    styleType?: string
  ): Promise<ValidationResult> {
    try {
      // Check if binding is valid according to rules
      const isValid = this.isValidBinding(nodeType, property, variableType, targetType, styleType);
      
      if (isValid) {
        return { isValid: true };
      }

      // Generate comprehensive error message and suggestions
      const error = this.generateErrorMessage(nodeType, property, variableType, targetType, styleType);
      const suggestions = await this.generateSuggestions(nodeType, property, variableType, targetType, styleType);

      return {
        isValid: false,
        error,
        suggestions
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Validation failed: ${error.toString()}`
      };
    }
  }

  /**
   * Check if a binding is valid according to the rules
   */
  private isValidBinding(
    nodeType: string,
    property: string,
    variableType: string,
    targetType: 'node' | 'style',
    styleType?: string
  ): boolean {
    if (targetType === 'style' && styleType) {
      const styleRules = STYLE_BINDING_RULES[styleType as keyof typeof STYLE_BINDING_RULES];
      return styleRules?.[variableType as keyof typeof styleRules]?.includes(property) || false;
    }

    // Check special properties first
    if (SPECIAL_PROPERTIES[property as keyof typeof SPECIAL_PROPERTIES]) {
      const specialRule = SPECIAL_PROPERTIES[property as keyof typeof SPECIAL_PROPERTIES];
      return specialRule.supportedTypes.includes(variableType) && 
             specialRule.supportedNodes.includes(nodeType);
    }

    // Check regular node properties
    const nodeRules = BINDING_RULES[nodeType];
    if (!nodeRules) return false;

    const typeRules = nodeRules[variableType];
    if (!typeRules) return false;

    return typeRules.includes(property);
  }

  /**
   * Generate a helpful error message
   */
  private generateErrorMessage(
    nodeType: string,
    property: string,
    variableType: string,
    targetType: 'node' | 'style',
    styleType?: string
  ): string {
    if (targetType === 'style') {
      return `Property "${property}" cannot be bound to a ${variableType} variable on ${styleType} styles`;
    }

    // Check if it's a node type issue
    const validNodeTypes = this.getValidNodeTypesForProperty(property, variableType);
    if (validNodeTypes.length > 0 && !validNodeTypes.includes(nodeType)) {
      return `Property "${property}" with ${variableType} variables is only supported on ${validNodeTypes.join(', ')} nodes, got ${nodeType}`;
    }

    // Check if it's a variable type issue
    const validVariableTypes = this.getValidVariableTypesForProperty(nodeType, property);
    if (validVariableTypes.length > 0 && !validVariableTypes.includes(variableType)) {
      return `Property "${property}" on ${nodeType} nodes requires ${validVariableTypes.join(' or ')} variables, got ${variableType}`;
    }

    // Check if property is supported at all
    const allSupportedProperties = this.getAllSupportedProperties(nodeType);
    if (!allSupportedProperties.includes(property)) {
      return `Property "${property}" is not supported for variable binding on ${nodeType} nodes`;
    }

    return `Cannot bind ${variableType} variable to property "${property}" on ${nodeType} node`;
  }

  /**
   * Generate comprehensive suggestions for fixing the binding
   */
  private async generateSuggestions(
    nodeType: string,
    property: string,
    variableType: string,
    targetType: 'node' | 'style',
    styleType?: string
  ): Promise<ValidationSuggestions> {
    const suggestions: ValidationSuggestions = {};

    // Get valid variables for this property/node combination
    const validVariableTypes = targetType === 'style' 
      ? this.getValidVariableTypesForStyleProperty(styleType!, property)
      : this.getValidVariableTypesForProperty(nodeType, property);

    if (validVariableTypes.length > 0) {
      suggestions.validVariables = await this.getVariablesByTypes(validVariableTypes);
    }

    // Get valid properties for this node/variable combination
    if (targetType === 'node') {
      suggestions.validProperties = this.getValidPropertiesForNodeAndVariable(nodeType, variableType);
    } else {
      suggestions.validProperties = this.getValidPropertiesForStyleAndVariable(styleType!, variableType);
    }

    // Get alternative node types that support this property/variable combination
    if (targetType === 'node') {
      const alternativeNodeTypes = this.getValidNodeTypesForProperty(property, variableType);
      if (alternativeNodeTypes.length > 0 && !alternativeNodeTypes.includes(nodeType)) {
        suggestions.alternativeNodeTypes = alternativeNodeTypes;
        suggestions.nodeTypeRequirement = `Property "${property}" with ${variableType} variables requires ${alternativeNodeTypes.join(' or ')} nodes`;
      }
    }

    // Add explanation
    suggestions.explanation = this.generateExplanation(nodeType, property, variableType, targetType, styleType);

    return suggestions;
  }

  /**
   * Get all valid variable types for a specific property on a node
   */
  private getValidVariableTypesForProperty(nodeType: string, property: string): string[] {
    // Check special properties first
    if (SPECIAL_PROPERTIES[property as keyof typeof SPECIAL_PROPERTIES]) {
      const specialRule = SPECIAL_PROPERTIES[property as keyof typeof SPECIAL_PROPERTIES];
      if (specialRule.supportedNodes.includes(nodeType)) {
        return specialRule.supportedTypes;
      }
    }

    // Check regular properties
    const nodeRules = BINDING_RULES[nodeType];
    if (!nodeRules) return [];

    const validTypes: string[] = [];
    for (const [variableType, properties] of Object.entries(nodeRules)) {
      if (properties.includes(property)) {
        validTypes.push(variableType);
      }
    }
    return validTypes;
  }

  /**
   * Get all valid variable types for a specific property on a style
   */
  private getValidVariableTypesForStyleProperty(styleType: string, property: string): string[] {
    const styleRules = STYLE_BINDING_RULES[styleType as keyof typeof STYLE_BINDING_RULES];
    if (!styleRules) return [];

    const validTypes: string[] = [];
    for (const [variableType, properties] of Object.entries(styleRules)) {
      if (properties.includes(property)) {
        validTypes.push(variableType);
      }
    }
    return validTypes;
  }

  /**
   * Get all valid node types for a specific property/variable combination
   */
  private getValidNodeTypesForProperty(property: string, variableType: string): string[] {
    const validNodeTypes: string[] = [];

    // Check special properties first
    if (SPECIAL_PROPERTIES[property as keyof typeof SPECIAL_PROPERTIES]) {
      const specialRule = SPECIAL_PROPERTIES[property as keyof typeof SPECIAL_PROPERTIES];
      if (specialRule.supportedTypes.includes(variableType)) {
        return specialRule.supportedNodes;
      }
    }

    // Check regular properties
    for (const [nodeType, rules] of Object.entries(BINDING_RULES)) {
      if (rules[variableType]?.includes(property)) {
        validNodeTypes.push(nodeType);
      }
    }
    return validNodeTypes;
  }

  /**
   * Get all valid properties for a specific node/variable combination
   */
  private getValidPropertiesForNodeAndVariable(nodeType: string, variableType: string): string[] {
    const properties: string[] = [];

    // Add regular properties
    const nodeRules = BINDING_RULES[nodeType];
    if (nodeRules?.[variableType]) {
      properties.push(...nodeRules[variableType]);
    }

    // Add special properties
    for (const [property, rule] of Object.entries(SPECIAL_PROPERTIES)) {
      if (rule.supportedTypes.includes(variableType) && rule.supportedNodes.includes(nodeType)) {
        properties.push(property);
      }
    }

    return properties.sort();
  }

  /**
   * Get all valid properties for a specific style/variable combination
   */
  private getValidPropertiesForStyleAndVariable(styleType: string, variableType: string): string[] {
    const styleRules = STYLE_BINDING_RULES[styleType as keyof typeof STYLE_BINDING_RULES];
    return styleRules?.[variableType as keyof typeof styleRules] || [];
  }

  /**
   * Get all supported properties for a node type
   */
  private getAllSupportedProperties(nodeType: string): string[] {
    const properties: string[] = [];

    // Add regular properties
    const nodeRules = BINDING_RULES[nodeType];
    if (nodeRules) {
      for (const typeProperties of Object.values(nodeRules)) {
        properties.push(...typeProperties);
      }
    }

    // Add special properties
    for (const [property, rule] of Object.entries(SPECIAL_PROPERTIES)) {
      if (rule.supportedNodes.includes(nodeType)) {
        properties.push(property);
      }
    }

    return [...new Set(properties)].sort();
  }

  /**
   * Get variables by specific types (with caching)
   */
  private async getVariablesByTypes(types: string[]): Promise<VariableInfo[]> {
    // Check cache
    const now = Date.now();
    if (now - this.lastCacheTime < this.cacheExpiry) {
      const cachedVariables = this.variableCache.get(types.join(','));
      if (cachedVariables) {
        return cachedVariables;
      }
    }

    // Fetch fresh data
    const allVariables: VariableInfo[] = [];
    const collections = await figma.variables.getLocalVariableCollectionsAsync();

    for (const collection of collections) {
      for (const variableId of collection.variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        if (variable && types.includes(variable.resolvedType)) {
          allVariables.push({
            id: variable.id,
            name: variable.name,
            type: variable.resolvedType,
            collectionName: collection.name,
            description: variable.description || undefined
          });
        }
      }
    }

    // Update cache
    this.variableCache.set(types.join(','), allVariables);
    this.lastCacheTime = now;

    return allVariables;
  }

  /**
   * Generate helpful explanation text
   */
  private generateExplanation(
    nodeType: string,
    property: string,
    variableType: string,
    targetType: 'node' | 'style',
    styleType?: string
  ): string {
    if (targetType === 'style') {
      return `${styleType} styles support specific variable types for different properties. Check the valid properties list for ${variableType} variables.`;
    }

    // Check if it's a text-specific property
    const textOnlyProperties = ['fontFamily', 'fontStyle', 'textCase', 'textDecoration', 'fontSize', 'letterSpacing', 'lineHeight'];
    if (textOnlyProperties.includes(property) && nodeType !== 'TEXT') {
      return `Text styling properties like "${property}" can only be used on TEXT nodes. Convert your ${nodeType} to a TEXT node or use a different property.`;
    }

    // Check if it's a special property
    if (SPECIAL_PROPERTIES[property as keyof typeof SPECIAL_PROPERTIES]) {
      return `Property "${property}" uses special binding methods and supports specific variable types and node combinations.`;
    }

    return `Each node type supports different properties with different variable types. Check the suggestions above for compatible combinations.`;
  }
}

// ================================================================================
// Singleton Instance
// ================================================================================

export const bindingValidator = new DeclarativeBindingValidator();
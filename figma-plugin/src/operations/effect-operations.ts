import { OperationResult, Effect, RGBA, Vector2 } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { hexToRgb, parseHexColor } from '../utils/color-utils.js';
import { findNodeById, formatNodeResponse } from '../utils/node-utils.js';
import { modifyEffects } from '../utils/figma-property-utils.js';

/**
 * Effect operation parameters interface
 */
export interface EffectParams {
  // Required for all operations
  operation?: string;
  owner?: string;
  
  // Required for create operations
  effectType?: string;
  
  // Required for update/delete/reorder/duplicate operations
  effectIndex?: number;
  newIndex?: number;
  
  // Effect properties
  color?: string;
  offsetX?: number;
  offsetY?: number;
  radius?: number;
  spread?: number;
  size?: number;
  density?: number;
  opacity?: number;
  visible?: boolean;
  showShadowBehindNode?: boolean;
  blendMode?: string;
  noiseType?: string;
  secondaryColor?: string;
  clipToShape?: boolean;
  
  // Bulk operation controls
  failFast?: boolean;
}

/**
 * Handle CREATE_EFFECT operation
 */
export async function handleCreateEffect(params: EffectParams): Promise<OperationResult> {
  return BaseOperation.executeOperation('createEffect', params, async () => {
    BaseOperation.validateParams(params, ['owner', 'effectType']);
    
    const { owner, effectType } = params;
    const target = await getEffectTarget(owner!);
    
    // Check if target is a node with effect style linkage
    if ('effectStyleId' in target && target.effectStyleId) {
      // Node is linked to an effect style - need to unlink before modifying
      target.effectStyleId = '';
    }
    
    const effect = buildEffectFromParams(effectType!, params);
    
    // Add effect using Figma property utility
    modifyEffects(target, manager => manager.push(effect));
    
    return {
      message: 'Effect created successfully',
      effectId: `effect-${Date.now()}`,
      type: effectType,
      owner: owner
    };
  });
}

/**
 * Handle UPDATE_EFFECT operation
 */
export async function handleUpdateEffect(params: EffectParams): Promise<OperationResult> {
  return BaseOperation.executeOperation('updateEffect', params, async () => {
    BaseOperation.validateParams(params, ['owner', 'effectIndex']);
    
    const { owner, effectIndex } = params;
    const target = await getEffectTarget(owner!);
    
    // Check if target is a node with effect style linkage
    const hadEffectStyle = 'effectStyleId' in target && target.effectStyleId;
    if (hadEffectStyle) {
      // Node is linked to an effect style - need to unlink before modifying
      target.effectStyleId = '';
    }
    
    const effects = target.effects || [];
    if (effectIndex! >= effects.length || effectIndex! < 0) {
      throw new Error(`Effect index ${effectIndex} out of bounds. Available indices: 0-${effects.length - 1}`);
    }
    
    // Update effect using Figma property utility
    modifyEffects(target, manager => {
      const existingEffect = manager.get(effectIndex!);
      const updatedEffect = updateEffectWithParams(existingEffect, params);
      manager.update(effectIndex!, updatedEffect);
    });
    
    return {
      message: 'Effect updated successfully',
      effectIndex: effectIndex,
      owner: owner,
      ...(hadEffectStyle && { note: 'Effect style linkage removed to allow direct modification' })
    };
  });
}

/**
 * Handle DELETE_EFFECT operation
 */
export async function handleDeleteEffect(params: EffectParams): Promise<OperationResult> {
  return BaseOperation.executeOperation('deleteEffect', params, async () => {
    BaseOperation.validateParams(params, ['owner', 'effectIndex']);
    
    const { owner, effectIndex } = params;
    const target = await getEffectTarget(owner!);
    
    // Check if target is a node with effect style linkage
    if ('effectStyleId' in target && target.effectStyleId) {
      // Node is linked to an effect style - need to unlink before modifying
      target.effectStyleId = '';
    }
    
    const effects = target.effects || [];
    if (effectIndex! >= effects.length || effectIndex! < 0) {
      throw new Error(`Effect index ${effectIndex} out of bounds. Available indices: 0-${effects.length - 1}`);
    }
    
    let deletedEffect: any;
    // Delete effect using Figma property utility
    modifyEffects(target, manager => {
      deletedEffect = manager.get(effectIndex!);
      manager.remove(effectIndex!);
    });
    
    return {
      message: 'Effect deleted successfully',
      deletedEffect: deletedEffect.type,
      effectIndex: effectIndex,
      owner: owner
    };
  });
}

/**
 * Handle GET_EFFECTS operation
 */
export async function handleGetEffects(params: EffectParams): Promise<OperationResult> {
  return BaseOperation.executeOperation('getEffects', params, async () => {
    BaseOperation.validateParams(params, ['owner']);
    
    const { owner } = params;
    const target = await getEffectTarget(owner!);
    
    const effects = target.effects || [];
    
    return {
      message: 'Effects retrieved successfully',
      owner: owner,
      effects: effects.map((effect, index) => {
        const baseEffect = {
          index,
          effectType: effect.type,
          visible: effect.visible
        };

        // Handle color effects (DROP_SHADOW, INNER_SHADOW)
        if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
          return {
            ...baseEffect,
            color: effect.color ? `#${Math.round(effect.color.r * 255).toString(16).padStart(2, '0')}${Math.round(effect.color.g * 255).toString(16).padStart(2, '0')}${Math.round(effect.color.b * 255).toString(16).padStart(2, '0')}` : undefined,
            opacity: effect.color?.a,
            offsetX: effect.offset?.x,
            offsetY: effect.offset?.y,
            radius: effect.radius,
            spread: (effect as any).spread,
            blendMode: effect.blendMode,
            ...(effect.type === 'DROP_SHADOW' && { showShadowBehindNode: (effect as any).showShadowBehindNode })
          };
        }

        // Handle blur effects (LAYER_BLUR, BACKGROUND_BLUR)
        if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
          return {
            ...baseEffect,
            radius: effect.radius
          };
        }

        // Handle NOISE effect
        if (effect.type === 'NOISE') {
          const noiseEffect: any = {
            ...baseEffect,
            size: (effect as any).noiseSize,
            density: (effect as any).density,
            noiseType: (effect as any).noiseType
          };
          
          // Add color properties based on noise type
          if ((effect as any).color) {
            noiseEffect.color = `#${Math.round((effect as any).color.r * 255).toString(16).padStart(2, '0')}${Math.round((effect as any).color.g * 255).toString(16).padStart(2, '0')}${Math.round((effect as any).color.b * 255).toString(16).padStart(2, '0')}`;
            noiseEffect.opacity = (effect as any).color.a;
          }
          
          if ((effect as any).secondaryColor) {
            noiseEffect.secondaryColor = `#${Math.round((effect as any).secondaryColor.r * 255).toString(16).padStart(2, '0')}${Math.round((effect as any).secondaryColor.g * 255).toString(16).padStart(2, '0')}${Math.round((effect as any).secondaryColor.b * 255).toString(16).padStart(2, '0')}`;
            noiseEffect.secondaryOpacity = (effect as any).secondaryColor.a;
          }
          
          // Add opacity for MULTITONE
          if ((effect as any).noiseType === 'MULTITONE' && (effect as any).opacity !== undefined) {
            noiseEffect.opacity = (effect as any).opacity;
          }
          
          return noiseEffect;
        }

        // Handle TEXTURE effect
        if (effect.type === 'TEXTURE') {
          return {
            ...baseEffect,
            size: (effect as any).noiseSize,
            radius: effect.radius,
            clipToShape: (effect as any).clipToShape
          };
        }

        // Fallback for unknown effect types
        return baseEffect;
      })
    };
  });
}

/**
 * Handle REORDER_EFFECT operation
 */
export async function handleReorderEffect(params: EffectParams): Promise<OperationResult> {
  return BaseOperation.executeOperation('reorderEffect', params, async () => {
    BaseOperation.validateParams(params, ['owner', 'effectIndex', 'newIndex']);
    
    const { owner, effectIndex, newIndex } = params;
    const target = await getEffectTarget(owner!);
    
    // Check if target is a node with effect style linkage
    if ('effectStyleId' in target && target.effectStyleId) {
      // Node is linked to an effect style - need to unlink before modifying
      target.effectStyleId = '';
    }
    
    const effects = target.effects || [];
    if (effectIndex! >= effects.length || effectIndex! < 0) {
      throw new Error(`Effect index ${effectIndex} out of bounds. Available indices: 0-${effects.length - 1}`);
    }
    if (newIndex! >= effects.length || newIndex! < 0) {
      throw new Error(`New index ${newIndex} out of bounds. Available indices: 0-${effects.length - 1}`);
    }
    
    // Reorder effect using Figma property utility
    modifyEffects(target, manager => {
      manager.move(effectIndex!, newIndex!);
    });
    
    return {
      message: 'Effect reordered successfully',
      effectIndex: effectIndex,
      newIndex: newIndex,
      owner: owner
    };
  });
}

/**
 * Handle DUPLICATE_EFFECT operation
 */
export async function handleDuplicateEffect(params: EffectParams): Promise<OperationResult> {
  return BaseOperation.executeOperation('duplicateEffect', params, async () => {
    BaseOperation.validateParams(params, ['owner', 'effectIndex', 'newIndex']);
    
    const { owner, effectIndex, newIndex } = params;
    const target = await getEffectTarget(owner!);
    
    // Check if target is a node with effect style linkage
    if ('effectStyleId' in target && target.effectStyleId) {
      // Node is linked to an effect style - need to unlink before modifying
      target.effectStyleId = '';
    }
    
    const effects = target.effects || [];
    if (effectIndex! >= effects.length || effectIndex! < 0) {
      throw new Error(`Effect index ${effectIndex} out of bounds. Available indices: 0-${effects.length - 1}`);
    }
    if (newIndex! > effects.length || newIndex! < 0) {
      throw new Error(`New index ${newIndex} out of bounds. Available indices: 0-${effects.length}`);
    }
    
    // Duplicate effect using Figma property utility
    modifyEffects(target, manager => {
      manager.duplicate(effectIndex!, newIndex!);
    });
    
    return {
      message: 'Effect duplicated successfully',
      sourceIndex: effectIndex,
      newIndex: newIndex,
      owner: owner
    };
  });
}

/**
 * Get the target node or style for effect operations
 */
async function getEffectTarget(owner: string): Promise<any> {
  const [ownerType, ...idParts] = owner.split(':');
  const id = idParts.join(':');
  
  if (ownerType === 'node') {
    const node = await findNodeById(id);
    if (!node) {
      throw new Error(`Node with ID ${id} not found`);
    }
    return node;
  } else if (ownerType === 'style') {
    // Use getLocalEffectStyles instead of deprecated getStyleById
    const cleanId = id.replace(/,$/, ''); // Remove trailing comma
    const effectStyles = figma.getLocalEffectStyles();
    const style = effectStyles.find(s => s.id.replace(/,$/, '') === cleanId);
    console.log(`[DEBUG] Found effect style with ID ${cleanId}:`, style ? `"${style.name}"` : 'not found');
    console.log(`[DEBUG] Available effect styles:`, effectStyles.map(s => `${s.id.replace(/,$/, '')}:"${s.name}"`));
    if (!style) {
      throw new Error(`Effect style with ID ${cleanId} not found`);
    }
    return style;
  } else {
    throw new Error(`Invalid owner type: ${ownerType}. Expected 'node' or 'style'`);
  }
}

/**
 * Build effect object from parameters using proper Figma API structure
 */
function buildEffectFromParams(effectType: string, params: EffectParams): any {
  // Base effect properties
  const baseEffect: any = {
    type: effectType,
    visible: params.visible !== undefined ? params.visible : true
  };
  
  // Build effect based on Figma API requirements
  switch (effectType) {
    case 'DROP_SHADOW':
      const dropShadowColor = params.color ? hexToRgba(params.color) : { r: 0, g: 0, b: 0, a: 0.25 };
      if (params.opacity !== undefined) {
        dropShadowColor.a = params.opacity;
      }
      return {
        ...baseEffect,
        color: dropShadowColor,
        offset: {
          x: params.offsetX !== undefined ? params.offsetX : 0,
          y: params.offsetY !== undefined ? params.offsetY : 2
        },
        radius: params.radius !== undefined ? params.radius : 4,
        spread: params.spread !== undefined ? params.spread : 0,
        blendMode: params.blendMode || 'NORMAL',
        ...(params.showShadowBehindNode !== undefined && { showShadowBehindNode: params.showShadowBehindNode })
      };
      
    case 'INNER_SHADOW':
      const innerShadowColor = params.color ? hexToRgba(params.color) : { r: 0, g: 0, b: 0, a: 0.25 };
      if (params.opacity !== undefined) {
        innerShadowColor.a = params.opacity;
      }
      return {
        ...baseEffect,
        color: innerShadowColor,
        offset: {
          x: params.offsetX !== undefined ? params.offsetX : 0,
          y: params.offsetY !== undefined ? params.offsetY : 2
        },
        radius: params.radius !== undefined ? params.radius : 4,
        spread: params.spread !== undefined ? params.spread : 0,
        blendMode: params.blendMode || 'NORMAL'
      };
      
    case 'LAYER_BLUR':
    case 'BACKGROUND_BLUR':
      return {
        ...baseEffect,
        radius: params.radius !== undefined ? params.radius : 4
      };
      
    case 'NOISE':
      const noiseType = params.noiseType || 'MONOTONE';
      const noiseEffect: any = {
        ...baseEffect,
        noiseSize: params.size !== undefined ? params.size : 1,
        density: params.density !== undefined ? params.density : 0.5,
        noiseType: noiseType,
        color: params.color ? hexToRgba(params.color) : { r: 0, g: 0, b: 0, a: 1 }
      };
      
      // Add additional required properties based on noise type
      if (noiseType === 'DUOTONE') {
        noiseEffect.secondaryColor = params.secondaryColor ? hexToRgba(params.secondaryColor) : { r: 1, g: 1, b: 1, a: 1 };
      } else if (noiseType === 'MULTITONE') {
        noiseEffect.opacity = params.opacity !== undefined ? params.opacity : 1;
      }
      
      return noiseEffect;
      
    case 'TEXTURE':
      return {
        ...baseEffect,
        noiseSize: params.size !== undefined ? params.size : 1,
        radius: params.radius !== undefined ? params.radius : 4,
        clipToShape: params.clipToShape !== undefined ? params.clipToShape : true
      };
      
    default:
      throw new Error(`Unsupported effect type: ${effectType}`);
  }
}

/**
 * Update existing effect with new parameters
 */
function updateEffectWithParams(existingEffect: Effect, params: EffectParams): Effect {
  // Create entirely new effect object instead of modifying existing one
  const effectType = existingEffect.type;
  
  // Handle color with opacity override
  let effectColor = params.color;
  if (!effectColor && existingEffect.color) {
    // Convert existing color to hex
    const r = Math.round(existingEffect.color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(existingEffect.color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(existingEffect.color.b * 255).toString(16).padStart(2, '0');
    let alpha = existingEffect.color.a;
    
    // If opacity parameter is provided, use it to override the alpha
    if (params.opacity !== undefined) {
      alpha = params.opacity;
    }
    
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    effectColor = `#${r}${g}${b}${a}`;
  }
  
  // Merge existing properties with new parameters
  const mergedParams = {
    effectType: effectType,
    visible: params.visible !== undefined ? params.visible : existingEffect.visible,
    color: effectColor,
    offsetX: params.offsetX !== undefined ? params.offsetX : (existingEffect.offset?.x || 0),
    offsetY: params.offsetY !== undefined ? params.offsetY : (existingEffect.offset?.y || 0),
    radius: params.radius !== undefined ? params.radius : existingEffect.radius,
    spread: params.spread !== undefined ? params.spread : (existingEffect as any).spread,
    blendMode: params.blendMode || existingEffect.blendMode,
    showShadowBehindNode: params.showShadowBehindNode !== undefined ? params.showShadowBehindNode : (existingEffect as any).showShadowBehindNode,
    size: params.size !== undefined ? params.size : (existingEffect as any).noiseSize,
    density: params.density !== undefined ? params.density : (existingEffect as any).density,
    noiseType: params.noiseType || (existingEffect as any).noiseType,
    secondaryColor: params.secondaryColor || (existingEffect as any).secondaryColor,
    opacity: params.opacity !== undefined ? params.opacity : (existingEffect as any).opacity,
    clipToShape: params.clipToShape !== undefined ? params.clipToShape : (existingEffect as any).clipToShape
  };
  
  // Use the same build function to create a completely new effect
  return buildEffectFromParams(effectType, mergedParams);
}


/**
 * Convert hex color to RGBA using existing color utils
 */
function hexToRgba(hex: string): RGBA {
  const parsed = parseHexColor(hex);
  const rgb = hexToRgb(parsed.rgb);
  return {
    r: rgb.r,
    g: rgb.g, 
    b: rgb.b,
    a: parsed.alpha
  };
}
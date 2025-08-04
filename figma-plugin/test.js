"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/logger.ts
  var PluginLogger, logger2;
  var init_logger = __esm({
    "src/logger.ts"() {
      "use strict";
      PluginLogger = class {
        constructor() {
          this.criticalBuffer = [];
          this.maxBufferSize = 100;
          // Limit buffer to prevent memory issues
          this.messageRouter = null;
        }
        /**
         * Initialize logger with message router
         */
        initialize(messageRouter) {
          this.messageRouter = messageRouter;
        }
        /**
         * Log a message with specified type
         */
        log(message, type = "message", data) {
          const emoji = type === "error" ? "\u274C" : type === "warning" ? "\u26A0\uFE0F" : type === "debug" ? "\u{1F41B}" : "\u2705";
          const consoleMethod = type === "error" ? console.error : type === "warning" ? console.warn : console.log;
          consoleMethod(`${emoji} ${message}`, data);
          if (this.messageRouter?.isConnected()) {
            this.flushCriticalBuffer();
            this.sendToServer(message, data, type);
          } else if (type === "error") {
            this.addToCriticalBuffer({ message, data, type, timestamp: Date.now() });
          }
        }
        /**
         * Log a regular message (alias for log)
         */
        info(message, data) {
          this.log(message, "message", data);
        }
        /**
         * Log a warning
         */
        warn(message, data) {
          this.log(message, "warning", data);
        }
        /**
         * Log an error
         */
        error(message, data) {
          this.log(message, "error", data);
        }
        /**
         * Log debug information
         */
        debug(message, data) {
          this.log(message, "debug", data);
        }
        /**
         * Flush critical buffer when connection is restored
         */
        onConnectionRestored() {
          if (this.messageRouter?.isConnected()) {
            this.flushCriticalBuffer();
          }
        }
        /**
         * Get current buffer status (for debugging)
         */
        getBufferStatus() {
          return {
            criticalBufferSize: this.criticalBuffer.length,
            maxBufferSize: this.maxBufferSize,
            isConnected: this.messageRouter?.isConnected() || false
          };
        }
        sendToServer(message, data, type) {
          if (!this.messageRouter) return;
          this.messageRouter.send({
            type: "LOG_MESSAGE",
            payload: { message, data, type, timestamp: Date.now() }
          }).catch(() => {
          });
        }
        addToCriticalBuffer(logMessage) {
          this.criticalBuffer.push(logMessage);
          if (this.criticalBuffer.length > this.maxBufferSize) {
            this.criticalBuffer.shift();
          }
        }
        flushCriticalBuffer() {
          if (this.criticalBuffer.length === 0 || !this.messageRouter?.isConnected()) {
            return;
          }
          for (const logMessage of this.criticalBuffer) {
            this.sendToServer(logMessage.message, logMessage.data, logMessage.type);
          }
          this.criticalBuffer = [];
        }
      };
      logger2 = new PluginLogger();
    }
  });

  // src/utils/figma-property-utils.ts
  function clone(val) {
    if (val === null || typeof val !== "object") return val;
    if (val instanceof Array) return val.map(clone);
    if (typeof val === "object") {
      const cloned = {};
      for (const key in val) {
        cloned[key] = clone(val[key]);
      }
      return cloned;
    }
    return val;
  }
  function cleanClone(val) {
    if (val === null || typeof val !== "object") return val;
    if (val instanceof Array) return val.map(cleanClone);
    if (typeof val === "object") {
      const cloned = {};
      for (const key in val) {
        if (key === "boundVariables") continue;
        cloned[key] = cleanClone(val[key]);
      }
      return cloned;
    }
    return val;
  }
  function modifyEffects(target, modifier) {
    FigmaPropertyManager.modify(target, "effects", modifier);
  }
  function modifyFills(target, modifier) {
    FigmaPropertyManager.modify(target, "fills", modifier);
  }
  function modifyStrokes(target, modifier) {
    FigmaPropertyManager.modify(target, "strokes", modifier);
  }
  function modifyBackgrounds(target, modifier) {
    FigmaPropertyManager.modify(target, "backgrounds", modifier);
  }
  function modifyPrototypeBackgrounds(target, modifier) {
    FigmaPropertyManager.modify(target, "prototypeBackgrounds", modifier);
  }
  function modifyExportSettings(target, modifier) {
    FigmaPropertyManager.modify(target, "exportSettings", modifier);
  }
  var FigmaPropertyManager;
  var init_figma_property_utils = __esm({
    "src/utils/figma-property-utils.ts"() {
      "use strict";
      FigmaPropertyManager = class _FigmaPropertyManager {
        constructor(target, propertyName) {
          this.target = target;
          this.propertyName = propertyName;
          const cloneFn = propertyName === "effects" ? cleanClone : clone;
          this.clonedArray = cloneFn(target[propertyName] || []);
        }
        /**
         * Get the current array (cloned)
         */
        get array() {
          return this.clonedArray;
        }
        /**
         * Get item at index
         */
        get(index) {
          return this.clonedArray[index];
        }
        /**
         * Add item to end of array
         */
        push(item) {
          this.clonedArray.push(item);
          return this;
        }
        /**
         * Add item at specific index
         */
        insert(index, item) {
          this.clonedArray.splice(index, 0, item);
          return this;
        }
        /**
         * Update item at index
         */
        update(index, item) {
          if (index >= 0 && index < this.clonedArray.length) {
            this.clonedArray[index] = item;
          }
          return this;
        }
        /**
         * Remove item at index
         */
        remove(index) {
          if (index >= 0 && index < this.clonedArray.length) {
            return this.clonedArray.splice(index, 1)[0];
          }
          return void 0;
        }
        /**
         * Move item from one index to another
         */
        move(fromIndex, toIndex) {
          if (fromIndex >= 0 && fromIndex < this.clonedArray.length && toIndex >= 0 && toIndex < this.clonedArray.length) {
            const item = this.clonedArray.splice(fromIndex, 1)[0];
            this.clonedArray.splice(toIndex, 0, item);
          }
          return this;
        }
        /**
         * Duplicate item at index to new index
         */
        duplicate(fromIndex, toIndex) {
          if (fromIndex >= 0 && fromIndex < this.clonedArray.length && toIndex >= 0 && toIndex <= this.clonedArray.length) {
            const cloneFn = this.propertyName === "effects" ? cleanClone : clone;
            const item = cloneFn(this.clonedArray[fromIndex]);
            this.clonedArray.splice(toIndex, 0, item);
          }
          return this;
        }
        /**
         * Get array length
         */
        get length() {
          return this.clonedArray.length;
        }
        /**
         * Check if index is valid
         */
        isValidIndex(index) {
          return index >= 0 && index < this.clonedArray.length;
        }
        /**
         * Apply all changes back to the Figma property
         */
        commit() {
          try {
            this.target[this.propertyName] = this.clonedArray;
          } catch (error) {
            if (error.toString().includes("Invalid discriminator value") && this.propertyName === "fills" && this.clonedArray.some((item) => item.type === "PATTERN")) {
              throw new Error("Pattern fills are currently not supported due to a known Figma Plugin API bug. While pattern fills are available in the Figma UI and documented in the API, the Plugin API validation rejects PATTERN type fills. This is a Figma API limitation, not an implementation issue. Reference: https://forum.figma.com/report-a-problem-6/plugin-api-bug-fills-assignment-fails-when-there-s-a-pattern-fill-in-the-array-40378");
            }
            throw error;
          }
        }
        /**
         * Static convenience method for simple operations
         */
        static modify(target, propertyName, modifier) {
          const manager = new _FigmaPropertyManager(target, propertyName);
          modifier(manager);
          manager.commit();
        }
      };
    }
  });

  // src/utils/color-utils.ts
  var color_utils_exports = {};
  __export(color_utils_exports, {
    applyImageFilters: () => applyImageFilters2,
    convertFlattenedHandles: () => convertFlattenedHandles,
    convertStopArrays: () => convertStopArrays,
    createDefaultGradientStops: () => createDefaultGradientStops,
    createGradientPaint: () => createGradientPaint,
    createGradientTransform: () => createGradientTransform,
    createImageFromBytes: () => createImageFromBytes2,
    createImageFromUrl: () => createImageFromUrl2,
    createImagePaint: () => createImagePaint2,
    createPatternPaint: () => createPatternPaint,
    createSolidPaint: () => createSolidPaint2,
    extractAlphaFromHex: () => extractAlphaFromHex,
    extractFlattenedImageParams: () => extractFlattenedImageParams,
    flattenedToImageMatrix: () => flattenedToImageMatrix,
    flattenedToMatrix: () => flattenedToMatrix,
    getImageDimensions: () => getImageDimensions,
    hexToRgb: () => hexToRgb,
    hexToRgba: () => hexToRgba,
    imageMatrixToFlattened: () => imageMatrixToFlattened,
    isPaintType: () => isPaintType,
    matrixToFlattened: () => matrixToFlattened,
    normalizeHexColor: () => normalizeHexColor,
    parseHexColor: () => parseHexColor,
    rgbToHex: () => rgbToHex,
    stripAlphaFromHex: () => stripAlphaFromHex,
    validateHexColor: () => validateHexColor,
    validatePaint: () => validatePaint
  });
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      };
    } else {
      return { r: 0.5, g: 0.5, b: 0.5 };
    }
  }
  function hexToRgba(hex, alpha = 1) {
    const rgb = hexToRgb(hex);
    return Object.assign({}, rgb, { a: alpha });
  }
  function rgbToHex(color) {
    const toHex = (c) => {
      const normalized = Math.round(c * 255);
      const hex = normalized.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }
  function validateHexColor(hex) {
    if (!hex) return false;
    return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4})$/.test(hex);
  }
  function normalizeHexColor(hex) {
    if (!validateHexColor(hex)) {
      throw new Error(`Invalid hex color: ${hex}`);
    }
    let cleanHex = hex.replace(/^#/, "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split("").map((char) => char + char).join("");
    } else if (cleanHex.length === 4) {
      cleanHex = cleanHex.split("").map((char) => char + char).join("");
    }
    return `#${cleanHex.toUpperCase()}`;
  }
  function extractAlphaFromHex(hex) {
    const cleanHex = hex.replace(/^#/, "");
    if (cleanHex.length === 8) {
      const alphaHex = cleanHex.substring(6, 8);
      return parseInt(alphaHex, 16) / 255;
    } else if (cleanHex.length === 4) {
      const normalizedHex = normalizeHexColor(hex).replace(/^#/, "");
      const alphaHex = normalizedHex.substring(6, 8);
      return parseInt(alphaHex, 16) / 255;
    }
    return 1;
  }
  function stripAlphaFromHex(hex) {
    const cleanHex = hex.replace(/^#/, "");
    if (cleanHex.length === 8) {
      return `#${cleanHex.substring(0, 6)}`;
    } else if (cleanHex.length === 4) {
      return `#${cleanHex.substring(0, 3)}`;
    }
    return hex.startsWith("#") ? hex : `#${hex}`;
  }
  function parseHexColor(hex) {
    const alpha = extractAlphaFromHex(hex);
    const rgb = stripAlphaFromHex(hex);
    return { rgb, alpha };
  }
  function createSolidPaint2(hex, opacity) {
    const finalOpacity = opacity !== void 0 ? opacity : extractAlphaFromHex(hex);
    const rgbHex = stripAlphaFromHex(hex);
    return {
      type: "SOLID",
      color: hexToRgb(rgbHex),
      opacity: finalOpacity
    };
  }
  function createGradientPaint(type, stops, transform) {
    const paint = {
      type: type.toUpperCase(),
      gradientStops: stops.map((stop) => ({
        position: stop.position,
        color: hexToRgba(stop.color, stop.opacity || 1)
      }))
    };
    if (transform) {
      paint.gradientTransform = transform;
    }
    return paint;
  }
  function getTransformStrategy(scaleMode) {
    switch (scaleMode.toUpperCase()) {
      case "CROP":
        return "MATRIX_TRANSFORM";
      case "TILE":
        return "INDIVIDUAL_PROPERTIES";
      case "FILL":
      case "FIT":
        return "ROTATION_LIMITED";
      default:
        return "MATRIX_TRANSFORM";
    }
  }
  function validateTransformParams(scaleMode, params) {
    const warnings = [];
    const upperScaleMode = scaleMode.toUpperCase();
    switch (upperScaleMode) {
      case "CROP":
        return { valid: true, warnings: [] };
      case "TILE":
        if (params.transformRotation && params.transformRotation % 90 !== 0) {
          warnings.push("TILE mode rotation rounded to nearest 90\xB0 increment");
        }
        return {
          valid: true,
          warnings,
          rotation: params.transformRotation ? Math.round(params.transformRotation / 90) * 90 : 0
        };
      case "FILL":
      case "FIT":
        if (params.transformScale || params.transformScaleX || params.transformScaleY) {
          warnings.push(`Scaling ignored in ${upperScaleMode} mode (auto-computed by Figma)`);
        }
        if (params.transformSkewX || params.transformSkewY) {
          warnings.push(`Skewing not supported in ${upperScaleMode} mode`);
        }
        if (params.transformOffsetX || params.transformOffsetY || params.imageTranslateX || params.imageTranslateY) {
          warnings.push(`Translation ignored in ${upperScaleMode} mode (auto-computed by Figma)`);
        }
        if (params.transformRotation && params.transformRotation % 90 !== 0) {
          warnings.push(`${upperScaleMode} mode rotation rounded to nearest 90\xB0 increment`);
        }
        return {
          valid: true,
          warnings,
          rotation: params.transformRotation ? Math.round(params.transformRotation / 90) * 90 : 0
        };
      default:
        return { valid: true, warnings: [] };
    }
  }
  function generateIndividualProperties(params, validation) {
    const result = {};
    if (validation.rotation !== void 0) {
      result.rotation = validation.rotation;
    }
    if (params.transformScale && params.transformScale !== 1) {
      result.scalingFactor = params.transformScale;
    }
    return result;
  }
  function createPatternPaint(sourceNodeId, tileType = "RECTANGULAR", scalingFactor = 1, spacingX = 0, spacingY = 0, horizontalAlignment = "START") {
    return {
      type: "PATTERN",
      sourceNodeId,
      tileType: tileType.toUpperCase(),
      scalingFactor,
      spacing: { x: spacingX, y: spacingY },
      horizontalAlignment: horizontalAlignment.toUpperCase(),
      visible: true,
      opacity: 1
    };
  }
  function createImagePaint2(imageHash, scaleMode = "FILL", transformParams, filters) {
    const paint = {
      type: "IMAGE",
      imageHash,
      scaleMode: scaleMode.toUpperCase()
    };
    let warnings = [];
    if (transformParams) {
      const strategy = getTransformStrategy(scaleMode);
      const validation = validateTransformParams(scaleMode, transformParams);
      warnings = validation.warnings;
      switch (strategy) {
        case "MATRIX_TRANSFORM":
          paint.imageTransform = flattenedToImageMatrix(transformParams);
          break;
        case "INDIVIDUAL_PROPERTIES":
          const tileProps = generateIndividualProperties(transformParams, validation);
          if (tileProps.rotation !== void 0) {
            paint.rotation = tileProps.rotation;
          }
          if (tileProps.scalingFactor !== void 0) {
            paint.scalingFactor = tileProps.scalingFactor;
          }
          break;
        case "ROTATION_LIMITED":
          if (validation.rotation !== void 0 && validation.rotation !== 0) {
            paint.rotation = validation.rotation;
          }
          break;
      }
    }
    if (filters) {
      paint.filters = filters;
    }
    return { paint, warnings };
  }
  function extractFlattenedImageParams(paint) {
    const scaleMode = paint.scaleMode || "FILL";
    const result = {};
    switch (scaleMode.toUpperCase()) {
      case "CROP":
        if (paint.imageTransform) {
          const flattened = imageMatrixToFlattened(paint.imageTransform);
          result.transformOffsetX = flattened.transformOffsetX;
          result.transformOffsetY = flattened.transformOffsetY;
          result.transformScaleX = flattened.transformScaleX;
          result.transformScaleY = flattened.transformScaleY;
          result.transformRotation = flattened.transformRotation;
          result.transformSkewX = flattened.transformSkewX;
          result.transformSkewY = flattened.transformSkewY;
        }
        break;
      case "TILE":
        if ("rotation" in paint && paint.rotation !== void 0) {
          result.transformRotation = paint.rotation;
        }
        if ("scalingFactor" in paint && paint.scalingFactor !== void 0) {
          result.transformScale = paint.scalingFactor;
        }
        break;
      case "FILL":
      case "FIT":
        if ("rotation" in paint && paint.rotation !== void 0) {
          result.transformRotation = paint.rotation;
        }
        break;
      default:
        break;
    }
    return result;
  }
  async function createImageFromUrl2(url) {
    try {
      const image = await figma.createImageAsync(url);
      const size = await image.getSizeAsync();
      return {
        imageHash: image.hash,
        dimensions: { width: size.width, height: size.height }
      };
    } catch (error) {
      throw new Error(`Failed to create image from URL: ${error}`);
    }
  }
  async function createImageFromBytes2(bytes) {
    try {
      logger2.log("\u{1F504} createImageFromBytes called with bytes length:", bytes.length);
      logger2.log("\u{1F504} Checking figma object:", typeof figma);
      logger2.log("\u{1F504} Checking figma.createImage:", typeof figma.createImage);
      if (typeof figma.createImage !== "function") {
        throw new Error(`figma.createImage is not a function, it is: ${typeof figma.createImage}`);
      }
      logger2.log("\u{1F504} About to call figma.createImage...");
      const image = figma.createImage(bytes);
      logger2.log("\u{1F504} figma.createImage successful, got image:", !!image);
      logger2.log("\u{1F504} Image hash:", image.hash);
      logger2.log("\u{1F504} About to get size...");
      const size = await image.getSizeAsync();
      logger2.log("\u{1F504} getSizeAsync successful, size:", size);
      return {
        imageHash: image.hash,
        dimensions: { width: size.width, height: size.height }
      };
    } catch (error) {
      logger2.log("\u274C Error in createImageFromBytes:", error.toString());
      throw new Error(`Failed to create image from bytes: ${error.toString()}`);
    }
  }
  function validatePaint(paint) {
    if (!paint || typeof paint !== "object" || !paint.type) {
      return false;
    }
    switch (paint.type) {
      case "SOLID":
        return !!paint.color;
      case "GRADIENT_LINEAR":
      case "GRADIENT_RADIAL":
      case "GRADIENT_ANGULAR":
      case "GRADIENT_DIAMOND":
        return Array.isArray(paint.gradientStops);
      case "IMAGE":
        return !!paint.imageHash;
      default:
        return false;
    }
  }
  function isPaintType(paint, type) {
    return paint.type === type.toUpperCase();
  }
  async function getImageDimensions(imageHash) {
    try {
      const image = figma.getImageByHash(imageHash);
      if (!image) return null;
      const size = await image.getSizeAsync();
      return { width: size.width, height: size.height };
    } catch (error) {
      return null;
    }
  }
  function applyImageFilters2(paint, filterValues) {
    const clonedPaint = clone(paint);
    if (filterValues) {
      clonedPaint.filters = {
        // Start with existing filters (if any)
        ...clonedPaint.filters,
        // Override with new filter values (using !== undefined to allow 0 values)
        ...filterValues.filterExposure !== void 0 && { exposure: filterValues.filterExposure },
        ...filterValues.filterContrast !== void 0 && { contrast: filterValues.filterContrast },
        ...filterValues.filterSaturation !== void 0 && { saturation: filterValues.filterSaturation },
        ...filterValues.filterTemperature !== void 0 && { temperature: filterValues.filterTemperature },
        ...filterValues.filterTint !== void 0 && { tint: filterValues.filterTint },
        ...filterValues.filterHighlights !== void 0 && { highlights: filterValues.filterHighlights },
        ...filterValues.filterShadows !== void 0 && { shadows: filterValues.filterShadows }
      };
    }
    return clonedPaint;
  }
  function convertStopArrays(positions, colors) {
    if (positions.length !== colors.length) {
      throw new Error("Position and color arrays must have the same length");
    }
    return positions.map((position, index) => ({
      position,
      color: hexToRgba(colors[index])
    }));
  }
  function convertFlattenedHandles(flattenedHandles) {
    return [
      { x: flattenedHandles.gradientStartX || 0, y: flattenedHandles.gradientStartY || 0.5 },
      { x: flattenedHandles.gradientEndX || 1, y: flattenedHandles.gradientEndY || 0.5 },
      { x: flattenedHandles.gradientWidthX || 0.5, y: flattenedHandles.gradientWidthY || 0 }
    ];
  }
  function createGradientTransform(gradientType, coordinates) {
    const type = gradientType.toUpperCase();
    if (coordinates.gradientStartX !== void 0 || coordinates.gradientStartY !== void 0 || coordinates.gradientEndX !== void 0 || coordinates.gradientEndY !== void 0 || coordinates.gradientScale !== void 0) {
      return flattenedToMatrix(coordinates);
    }
    switch (type) {
      case "GRADIENT_LINEAR":
        return [[1, 0, 0], [0, 1, 0]];
      case "GRADIENT_RADIAL":
        return [[0.5, 0, 0.5], [0, 0.5, 0.5]];
      case "GRADIENT_ANGULAR":
        return [[0.5, 0, 0.5], [0, 0.5, 0.5]];
      case "GRADIENT_DIAMOND":
        return [[0.5, 0, 0.5], [0, 0.5, 0.5]];
      default:
        return [[1, 0, 0], [0, 1, 0]];
    }
  }
  function createDefaultGradientStops() {
    return [
      { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
      // white
      { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } }
      // black
    ];
  }
  function flattenedToMatrix(params) {
    const startX = params.gradientStartX ?? 0;
    const startY = params.gradientStartY ?? 0.5;
    const endX = params.gradientEndX ?? 1;
    const endY = params.gradientEndY ?? 0.5;
    const explicitScale = params.gradientScale;
    const directionX = endX - startX;
    const directionY = endY - startY;
    let gradientVectorX, gradientVectorY;
    if (explicitScale !== void 0) {
      const naturalLength = Math.sqrt(directionX * directionX + directionY * directionY);
      const normalizedX = naturalLength > 0 ? directionX / naturalLength : 1;
      const normalizedY = naturalLength > 0 ? directionY / naturalLength : 0;
      gradientVectorX = normalizedX * explicitScale;
      gradientVectorY = normalizedY * explicitScale;
    } else {
      gradientVectorX = directionX;
      gradientVectorY = directionY;
    }
    const perpendicularX = -gradientVectorY;
    const perpendicularY = gradientVectorX;
    return [
      [gradientVectorX, perpendicularX, startX],
      [gradientVectorY, perpendicularY, startY]
    ];
  }
  function matrixToFlattened(matrix) {
    const [[vectorX, perpX, startX], [vectorY, perpY, startY]] = matrix;
    const gradientStartX = startX;
    const gradientStartY = startY;
    const vectorLength = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
    const gradientEndX = gradientStartX + vectorX;
    const gradientEndY = gradientStartY + vectorY;
    return {
      gradientStartX: Number(gradientStartX.toFixed(3)),
      gradientStartY: Number(gradientStartY.toFixed(3)),
      gradientEndX: Number(gradientEndX.toFixed(3)),
      gradientEndY: Number(gradientEndY.toFixed(3)),
      gradientScale: Number(vectorLength.toFixed(3))
    };
  }
  function imageMatrixToFlattened(matrix) {
    const [[m11, m12, tx], [m21, m22, ty]] = matrix;
    const imageTranslateX = tx;
    const imageTranslateY = ty;
    const scaleX = Math.sqrt(m11 * m11 + m12 * m12) * Math.sign(m11 || 1);
    const scaleY = Math.sqrt(m21 * m21 + m22 * m22) * Math.sign(m22 || 1);
    const averageScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
    const rotationRadians = Math.atan2(m12, m11);
    const rotationDegrees = rotationRadians * (180 / Math.PI);
    const cosRotation = Math.cos(-rotationRadians);
    const sinRotation = Math.sin(-rotationRadians);
    const derotatedYx = m21 * cosRotation - m22 * sinRotation;
    const derotatedYy = m21 * sinRotation + m22 * cosRotation;
    const skewRadians = Math.abs(scaleX) > 0 ? Math.atan2(derotatedYx, Math.abs(scaleX)) : 0;
    const skewDegrees = skewRadians * (180 / Math.PI);
    const offsetX = Math.max(-1, Math.min(1, imageTranslateX / 200));
    const offsetY = Math.max(-1, Math.min(1, imageTranslateY / 200));
    return {
      transformOffsetX: Number(offsetX.toFixed(3)),
      transformOffsetY: Number(offsetY.toFixed(3)),
      transformScale: Number(averageScale.toFixed(3)),
      transformScaleX: Number(scaleX.toFixed(3)),
      transformScaleY: Number(scaleY.toFixed(3)),
      transformRotation: Number(rotationDegrees.toFixed(1)),
      transformSkewX: Number(skewDegrees.toFixed(1)),
      transformSkewY: 0,
      // Y-skew is typically absorbed into X-skew for 2D transforms
      imageTranslateX: Number(imageTranslateX.toFixed(1)),
      imageTranslateY: Number(imageTranslateY.toFixed(1))
    };
  }
  function flattenedToImageMatrix(params) {
    const rotation = (params.transformRotation ?? 0) * Math.PI / 180;
    const skewX = (params.transformSkewX ?? 0) * Math.PI / 180;
    const skewY = (params.transformSkewY ?? 0) * Math.PI / 180;
    let scaleX = params.transformScaleX ?? params.transformScale ?? 1;
    let scaleY = params.transformScaleY ?? params.transformScale ?? 1;
    if (params.imageFlipHorizontal) scaleX *= -1;
    if (params.imageFlipVertical) scaleY *= -1;
    let translateX = 0;
    let translateY = 0;
    if (params.imageTranslateX !== void 0) {
      translateX = params.imageTranslateX;
    } else if (params.transformOffsetX !== void 0) {
      translateX = params.transformOffsetX * 200;
    }
    if (params.imageTranslateY !== void 0) {
      translateY = params.imageTranslateY;
    } else if (params.transformOffsetY !== void 0) {
      translateY = params.transformOffsetY * 200;
    }
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const tanSkewX = Math.tan(skewX);
    const tanSkewY = Math.tan(skewY);
    const a = scaleX * cos - scaleY * tanSkewY * sin;
    const b = scaleX * sin + scaleY * tanSkewY * cos;
    const c = scaleY * tanSkewX * cos - scaleX * tanSkewX * cos + scaleY * sin;
    const d = scaleY * tanSkewX * sin - scaleX * tanSkewX * sin + scaleY * cos;
    if (Math.abs(tanSkewX) < 1e-3 && Math.abs(tanSkewY) < 1e-3) {
      return [
        [scaleX * cos, scaleX * sin, translateX],
        [-scaleY * sin, scaleY * cos, translateY]
      ];
    }
    return [
      [a, b, translateX],
      [c, d, translateY]
    ];
  }
  var init_color_utils = __esm({
    "src/utils/color-utils.ts"() {
      "use strict";
      init_logger();
      init_figma_property_utils();
    }
  });

  // src/utils/variable-binding-validator.ts
  var variable_binding_validator_exports = {};
  __export(variable_binding_validator_exports, {
    BINDING_RULES: () => BINDING_RULES,
    DeclarativeBindingValidator: () => DeclarativeBindingValidator,
    SPECIAL_PROPERTIES: () => SPECIAL_PROPERTIES,
    STYLE_BINDING_RULES: () => STYLE_BINDING_RULES,
    bindingValidator: () => bindingValidator
  });
  var BINDING_RULES, SPECIAL_PROPERTIES, STYLE_BINDING_RULES, DeclarativeBindingValidator, bindingValidator;
  var init_variable_binding_validator = __esm({
    "src/utils/variable-binding-validator.ts"() {
      "use strict";
      BINDING_RULES = {
        // Text nodes support the most comprehensive text styling
        TEXT: {
          FLOAT: [
            "fontSize",
            "letterSpacing",
            "lineHeight",
            "width",
            "height",
            "x",
            "y",
            "opacity",
            "rotation"
          ],
          STRING: [
            "fontFamily",
            "fontStyle",
            "textCase",
            "textDecoration"
          ],
          COLOR: [],
          // Colors are handled via fills/strokes, not direct binding
          BOOLEAN: ["visible"]
        },
        // Rectangle nodes support size, position, and corner radius
        RECTANGLE: {
          FLOAT: [
            "width",
            "height",
            "x",
            "y",
            "cornerRadius",
            "topLeftRadius",
            "topRightRadius",
            "bottomLeftRadius",
            "bottomRightRadius",
            "opacity",
            "rotation",
            "strokeWidth"
          ],
          STRING: [],
          COLOR: [],
          // Colors are handled via fills/strokes
          BOOLEAN: ["visible"]
        },
        // Ellipse nodes support size, position, and basic properties
        ELLIPSE: {
          FLOAT: [
            "width",
            "height",
            "x",
            "y",
            "opacity",
            "rotation",
            "strokeWidth"
          ],
          STRING: [],
          COLOR: [],
          // Colors are handled via fills/strokes
          BOOLEAN: ["visible"]
        },
        // Frame nodes support size, position, corner radius, and layout
        FRAME: {
          FLOAT: [
            "width",
            "height",
            "x",
            "y",
            "cornerRadius",
            "topLeftRadius",
            "topRightRadius",
            "bottomLeftRadius",
            "bottomRightRadius",
            "opacity",
            "rotation",
            "strokeWidth",
            "spacing",
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft"
          ],
          STRING: [],
          COLOR: [],
          // Colors are handled via fills/strokes
          BOOLEAN: ["visible"]
        },
        // Component nodes support most properties like frames
        COMPONENT: {
          FLOAT: [
            "width",
            "height",
            "x",
            "y",
            "cornerRadius",
            "topLeftRadius",
            "topRightRadius",
            "bottomLeftRadius",
            "bottomRightRadius",
            "opacity",
            "rotation",
            "strokeWidth",
            "spacing",
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft"
          ],
          STRING: [],
          COLOR: [],
          // Colors are handled via fills/strokes
          BOOLEAN: ["visible"]
        },
        // Instance nodes support most properties like components
        INSTANCE: {
          FLOAT: [
            "width",
            "height",
            "x",
            "y",
            "cornerRadius",
            "topLeftRadius",
            "topRightRadius",
            "bottomLeftRadius",
            "bottomRightRadius",
            "opacity",
            "rotation",
            "strokeWidth",
            "spacing",
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft"
          ],
          STRING: [],
          COLOR: [],
          // Colors are handled via fills/strokes
          BOOLEAN: ["visible"]
        },
        // Group nodes support minimal properties
        GROUP: {
          FLOAT: ["x", "y", "opacity", "rotation"],
          STRING: [],
          COLOR: [],
          BOOLEAN: ["visible"]
        },
        // Vector nodes support basic properties
        VECTOR: {
          FLOAT: [
            "width",
            "height",
            "x",
            "y",
            "opacity",
            "rotation",
            "strokeWidth"
          ],
          STRING: [],
          COLOR: [],
          // Colors are handled via fills/strokes
          BOOLEAN: ["visible"]
        },
        // Star nodes support basic properties
        STAR: {
          FLOAT: [
            "width",
            "height",
            "x",
            "y",
            "opacity",
            "rotation",
            "strokeWidth"
          ],
          STRING: [],
          COLOR: [],
          // Colors are handled via fills/strokes
          BOOLEAN: ["visible"]
        },
        // Polygon nodes support basic properties
        POLYGON: {
          FLOAT: [
            "width",
            "height",
            "x",
            "y",
            "opacity",
            "rotation",
            "strokeWidth"
          ],
          STRING: [],
          COLOR: [],
          // Colors are handled via fills/strokes
          BOOLEAN: ["visible"]
        },
        // Line nodes support basic properties
        LINE: {
          FLOAT: [
            "x",
            "y",
            "opacity",
            "rotation",
            "strokeWidth"
          ],
          STRING: [],
          COLOR: [],
          // Colors are handled via fills/strokes
          BOOLEAN: ["visible"]
        }
      };
      SPECIAL_PROPERTIES = {
        fills: {
          supportedTypes: ["COLOR"],
          supportedNodes: ["TEXT", "RECTANGLE", "ELLIPSE", "FRAME", "COMPONENT", "INSTANCE", "VECTOR", "STAR", "POLYGON"],
          handlingType: "paint"
        },
        strokes: {
          supportedTypes: ["COLOR"],
          supportedNodes: ["TEXT", "RECTANGLE", "ELLIPSE", "FRAME", "COMPONENT", "INSTANCE", "VECTOR", "STAR", "POLYGON", "LINE"],
          handlingType: "paint"
        },
        effects: {
          supportedTypes: ["FLOAT", "COLOR"],
          supportedNodes: ["TEXT", "RECTANGLE", "ELLIPSE", "FRAME", "COMPONENT", "INSTANCE", "VECTOR", "STAR", "POLYGON", "LINE"],
          handlingType: "effect",
          fields: {
            FLOAT: ["radius", "spread", "offsetX", "offsetY"],
            COLOR: ["color"]
          }
        },
        layoutGrids: {
          supportedTypes: ["FLOAT"],
          supportedNodes: ["FRAME", "COMPONENT", "INSTANCE"],
          handlingType: "grid",
          fields: {
            FLOAT: ["sectionSize", "count", "offset", "gutterSize"]
          }
        }
      };
      STYLE_BINDING_RULES = {
        PAINT: {
          FLOAT: [],
          STRING: [],
          COLOR: ["color", "paints"],
          BOOLEAN: []
        },
        TEXT: {
          FLOAT: ["fontSize", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent"],
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
      DeclarativeBindingValidator = class {
        constructor() {
          this.variableCache = /* @__PURE__ */ new Map();
          this.cacheExpiry = 5e3;
          // 5 seconds
          this.lastCacheTime = 0;
        }
        /**
         * Validate a variable binding and provide comprehensive suggestions
         */
        async validateBinding(nodeType, property, variableType, targetType = "node", styleType) {
          try {
            const isValid = this.isValidBinding(nodeType, property, variableType, targetType, styleType);
            if (isValid) {
              return { isValid: true };
            }
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
        isValidBinding(nodeType, property, variableType, targetType, styleType) {
          if (targetType === "style" && styleType) {
            const styleRules = STYLE_BINDING_RULES[styleType];
            return styleRules?.[variableType]?.includes(property) || false;
          }
          if (SPECIAL_PROPERTIES[property]) {
            const specialRule = SPECIAL_PROPERTIES[property];
            return specialRule.supportedTypes.includes(variableType) && specialRule.supportedNodes.includes(nodeType);
          }
          const nodeRules = BINDING_RULES[nodeType];
          if (!nodeRules) return false;
          const typeRules = nodeRules[variableType];
          if (!typeRules) return false;
          return typeRules.includes(property);
        }
        /**
         * Generate a helpful error message
         */
        generateErrorMessage(nodeType, property, variableType, targetType, styleType) {
          if (targetType === "style") {
            return `Property "${property}" cannot be bound to a ${variableType} variable on ${styleType} styles`;
          }
          const validNodeTypes = this.getValidNodeTypesForProperty(property, variableType);
          if (validNodeTypes.length > 0 && !validNodeTypes.includes(nodeType)) {
            return `Property "${property}" with ${variableType} variables is only supported on ${validNodeTypes.join(", ")} nodes, got ${nodeType}`;
          }
          const validVariableTypes = this.getValidVariableTypesForProperty(nodeType, property);
          if (validVariableTypes.length > 0 && !validVariableTypes.includes(variableType)) {
            return `Property "${property}" on ${nodeType} nodes requires ${validVariableTypes.join(" or ")} variables, got ${variableType}`;
          }
          const allSupportedProperties = this.getAllSupportedProperties(nodeType);
          if (!allSupportedProperties.includes(property)) {
            return `Property "${property}" is not supported for variable binding on ${nodeType} nodes`;
          }
          return `Cannot bind ${variableType} variable to property "${property}" on ${nodeType} node`;
        }
        /**
         * Generate comprehensive suggestions for fixing the binding
         */
        async generateSuggestions(nodeType, property, variableType, targetType, styleType) {
          const suggestions = {};
          const validVariableTypes = targetType === "style" ? this.getValidVariableTypesForStyleProperty(styleType, property) : this.getValidVariableTypesForProperty(nodeType, property);
          if (validVariableTypes.length > 0) {
            suggestions.validVariables = await this.getVariablesByTypes(validVariableTypes);
          }
          if (targetType === "node") {
            suggestions.validProperties = this.getValidPropertiesForNodeAndVariable(nodeType, variableType);
          } else {
            suggestions.validProperties = this.getValidPropertiesForStyleAndVariable(styleType, variableType);
          }
          if (targetType === "node") {
            const alternativeNodeTypes = this.getValidNodeTypesForProperty(property, variableType);
            if (alternativeNodeTypes.length > 0 && !alternativeNodeTypes.includes(nodeType)) {
              suggestions.alternativeNodeTypes = alternativeNodeTypes;
              suggestions.nodeTypeRequirement = `Property "${property}" with ${variableType} variables requires ${alternativeNodeTypes.join(" or ")} nodes`;
            }
          }
          suggestions.explanation = this.generateExplanation(nodeType, property, variableType, targetType, styleType);
          return suggestions;
        }
        /**
         * Get all valid variable types for a specific property on a node
         */
        getValidVariableTypesForProperty(nodeType, property) {
          if (SPECIAL_PROPERTIES[property]) {
            const specialRule = SPECIAL_PROPERTIES[property];
            if (specialRule.supportedNodes.includes(nodeType)) {
              return specialRule.supportedTypes;
            }
          }
          const nodeRules = BINDING_RULES[nodeType];
          if (!nodeRules) return [];
          const validTypes = [];
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
        getValidVariableTypesForStyleProperty(styleType, property) {
          const styleRules = STYLE_BINDING_RULES[styleType];
          if (!styleRules) return [];
          const validTypes = [];
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
        getValidNodeTypesForProperty(property, variableType) {
          const validNodeTypes = [];
          if (SPECIAL_PROPERTIES[property]) {
            const specialRule = SPECIAL_PROPERTIES[property];
            if (specialRule.supportedTypes.includes(variableType)) {
              return specialRule.supportedNodes;
            }
          }
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
        getValidPropertiesForNodeAndVariable(nodeType, variableType) {
          const properties = [];
          const nodeRules = BINDING_RULES[nodeType];
          if (nodeRules?.[variableType]) {
            properties.push(...nodeRules[variableType]);
          }
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
        getValidPropertiesForStyleAndVariable(styleType, variableType) {
          const styleRules = STYLE_BINDING_RULES[styleType];
          return styleRules?.[variableType] || [];
        }
        /**
         * Get all supported properties for a node type
         */
        getAllSupportedProperties(nodeType) {
          const properties = [];
          const nodeRules = BINDING_RULES[nodeType];
          if (nodeRules) {
            for (const typeProperties of Object.values(nodeRules)) {
              properties.push(...typeProperties);
            }
          }
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
        async getVariablesByTypes(types) {
          const now = Date.now();
          if (now - this.lastCacheTime < this.cacheExpiry) {
            const cachedVariables = this.variableCache.get(types.join(","));
            if (cachedVariables) {
              return cachedVariables;
            }
          }
          const allVariables = [];
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
                  description: variable.description || void 0
                });
              }
            }
          }
          this.variableCache.set(types.join(","), allVariables);
          this.lastCacheTime = now;
          return allVariables;
        }
        /**
         * Generate helpful explanation text
         */
        generateExplanation(nodeType, property, variableType, targetType, styleType) {
          if (targetType === "style") {
            return `${styleType} styles support specific variable types for different properties. Check the valid properties list for ${variableType} variables.`;
          }
          const textOnlyProperties = ["fontFamily", "fontStyle", "textCase", "textDecoration", "fontSize", "letterSpacing", "lineHeight"];
          if (textOnlyProperties.includes(property) && nodeType !== "TEXT") {
            return `Text styling properties like "${property}" can only be used on TEXT nodes. Convert your ${nodeType} to a TEXT node or use a different property.`;
          }
          if (SPECIAL_PROPERTIES[property]) {
            return `Property "${property}" uses special binding methods and supports specific variable types and node combinations.`;
          }
          return `Each node type supports different properties with different variable types. Check the suggestions above for compatible combinations.`;
        }
      };
      bindingValidator = new DeclarativeBindingValidator();
    }
  });

  // src/operation-router.ts
  init_logger();

  // src/operations/export-settings-operations.ts
  var export_settings_operations_exports = {};
  __export(export_settings_operations_exports, {
    MANAGE_EXPORTS: () => MANAGE_EXPORTS
  });

  // src/operations/base-operation.ts
  var BaseOperation = class {
    /**
     * Execute an operation with consistent error handling and logging
     * KISS: Returns data directly or throws errors (no success wrappers)
     */
    static async executeOperation(operationName, params, operation) {
      const startTime = Date.now();
      try {
        const result = await operation();
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(errorMessage);
      }
    }
    /**
     * Validate required parameters
     */
    static validateParams(params, requiredFields) {
      for (const field of requiredFields) {
        if (params[field] === void 0 || params[field] === null) {
          throw new Error(`Missing required parameter: ${field}`);
        }
      }
    }
    /**
     * Validate string parameter with allowed values
     */
    static validateStringParam(value, paramName, allowedValues) {
      if (typeof value !== "string") {
        throw new Error(`Parameter '${paramName}' must be a string`);
      }
      if (!allowedValues.includes(value)) {
        throw new Error(`Parameter '${paramName}' must be one of: ${allowedValues.join(", ")}`);
      }
      return value;
    }
    /**
     * Validate numeric parameter with optional range
     */
    static validateNumericParam(value, paramName, min, max) {
      if (typeof value !== "number" || isNaN(value)) {
        throw new Error(`Parameter '${paramName}' must be a valid number`);
      }
      if (min !== void 0 && value < min) {
        throw new Error(`Parameter '${paramName}' must be >= ${min}`);
      }
      if (max !== void 0 && value > max) {
        throw new Error(`Parameter '${paramName}' must be <= ${max}`);
      }
      return value;
    }
  };

  // src/utils/node-utils.ts
  init_color_utils();
  init_logger();
  var EXPORTABLE_NODE_TYPES = [
    "FRAME",
    "GROUP",
    "COMPONENT",
    "COMPONENT_SET",
    "INSTANCE",
    "RECTANGLE",
    "ELLIPSE",
    "POLYGON",
    "STAR",
    "VECTOR",
    "TEXT",
    "LINE",
    "BOOLEAN_OPERATION",
    "SLICE",
    "SECTION"
  ];
  function isSceneNode(node) {
    return EXPORTABLE_NODE_TYPES.includes(node.type);
  }
  function findNodeById(nodeId) {
    try {
      const node = figma.getNodeById(nodeId);
      if (!node) {
        return null;
      }
      return isSceneNode(node) ? node : null;
    } catch (error) {
      return null;
    }
  }
  function findNodeInPage(page, nodeId) {
    try {
      const node = figma.getNodeById(nodeId);
      if (!node || !isSceneNode(node)) {
        return null;
      }
      let current = node;
      while (current.parent) {
        if (current.parent.id === page.id) {
          return node;
        }
        current = current.parent;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  function findNodeOrPageById(id) {
    try {
      const node = findNodeById(id);
      if (node) {
        return node;
      }
      const page = Array.from(figma.root.children).find((child) => child.id === id);
      if (page && page.type === "PAGE") {
        return page;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  function applyCornerRadius(node, params, index = 0) {
    const cornerRadius = Array.isArray(params.cornerRadius) ? params.cornerRadius[index] : params.cornerRadius;
    if (cornerRadius !== void 0) {
      try {
        node.cornerRadius = cornerRadius;
      } catch (error) {
      }
    }
    const topLeftRadius = Array.isArray(params.topLeftRadius) ? params.topLeftRadius[index] : params.topLeftRadius;
    if (topLeftRadius !== void 0 && "topLeftRadius" in node) {
      node.topLeftRadius = topLeftRadius;
    }
    const topRightRadius = Array.isArray(params.topRightRadius) ? params.topRightRadius[index] : params.topRightRadius;
    if (topRightRadius !== void 0 && "topRightRadius" in node) {
      node.topRightRadius = topRightRadius;
    }
    const bottomLeftRadius = Array.isArray(params.bottomLeftRadius) ? params.bottomLeftRadius[index] : params.bottomLeftRadius;
    if (bottomLeftRadius !== void 0 && "bottomLeftRadius" in node) {
      node.bottomLeftRadius = bottomLeftRadius;
    }
    const bottomRightRadius = Array.isArray(params.bottomRightRadius) ? params.bottomRightRadius[index] : params.bottomRightRadius;
    if (bottomRightRadius !== void 0 && "bottomRightRadius" in node) {
      node.bottomRightRadius = bottomRightRadius;
    }
    const cornerSmoothing = Array.isArray(params.cornerSmoothing) ? params.cornerSmoothing[index] : params.cornerSmoothing;
    if (cornerSmoothing !== void 0 && "cornerSmoothing" in node) {
      node.cornerSmoothing = cornerSmoothing;
    }
  }
  function extractCornerRadiusProperties(node) {
    const cornerProps = {};
    if ("cornerRadius" in node) {
      try {
        cornerProps.cornerRadius = node.cornerRadius;
      } catch (error) {
      }
    }
    if ("topLeftRadius" in node) cornerProps.topLeftRadius = node.topLeftRadius;
    if ("topRightRadius" in node) cornerProps.topRightRadius = node.topRightRadius;
    if ("bottomLeftRadius" in node) cornerProps.bottomLeftRadius = node.bottomLeftRadius;
    if ("bottomRightRadius" in node) cornerProps.bottomRightRadius = node.bottomRightRadius;
    return cornerProps;
  }
  async function formatNodeResponseAsync(node, message) {
    const nodeData = formatNodeResponse(node, message);
    return await cleanEmptyPropertiesAsync(nodeData) || nodeData;
  }
  function formatNodeResponse(node, message) {
    const response = {
      id: node.id,
      name: node.name,
      type: node.type,
      x: "x" in node ? node.x : 0,
      y: "y" in node ? node.y : 0,
      width: "width" in node ? node.width : 0,
      height: "height" in node ? node.height : 0
    };
    if ("visible" in node) response.visible = node.visible;
    if ("locked" in node) response.locked = node.locked;
    if ("opacity" in node) response.opacity = node.opacity;
    if ("fills" in node) response.fills = node.fills;
    if ("strokes" in node) {
      const strokes = node.strokes;
      if (strokes && strokes.length > 0) {
        response.strokes = strokes;
        if ("strokeWeight" in node) response.strokeWeight = node.strokeWeight;
        if ("strokeAlign" in node) response.strokeAlign = node.strokeAlign;
      }
    }
    const cornerProps = extractCornerRadiusProperties(node);
    Object.assign(response, cornerProps);
    if ("boundVariables" in node) {
      const boundVars = node.boundVariables;
      if (boundVars && Object.keys(boundVars).length > 0) {
        response.boundVariables = boundVars;
      }
    }
    if ("rotation" in node) response.rotation = node.rotation;
    if ("strokeWeight" in node && !response.strokeWeight) response.strokeWeight = node.strokeWeight;
    if (node.type === "TEXT") {
      if ("characters" in node) response.characters = node.characters;
      if ("fontSize" in node) response.fontSize = node.fontSize;
      if ("fontName" in node) response.fontName = node.fontName;
      if ("textCase" in node) response.textCase = node.textCase;
      if ("textDecoration" in node) response.textDecoration = node.textDecoration;
      if ("letterSpacing" in node) response.letterSpacing = node.letterSpacing;
      if ("lineHeight" in node) response.lineHeight = node.lineHeight;
    }
    if ("spacing" in node) response.spacing = node.spacing;
    if ("paddingTop" in node) response.paddingTop = node.paddingTop;
    if ("paddingRight" in node) response.paddingRight = node.paddingRight;
    if ("paddingBottom" in node) response.paddingBottom = node.paddingBottom;
    if ("paddingLeft" in node) response.paddingLeft = node.paddingLeft;
    if (message) {
      response.message = message;
    }
    return response;
  }
  function validateNodeType(node, expectedTypes) {
    if (!expectedTypes.includes(node.type)) {
      throw new Error(`Expected node type to be one of [${expectedTypes.join(", ")}], but got ${node.type}`);
    }
  }
  function getAllNodes(node, detail = "standard", includeHidden = false, maxDepth = null, depth = 0, parentId = null) {
    if (maxDepth !== null && depth > maxDepth) {
      return [];
    }
    if (!includeHidden && "visible" in node && !node.visible) {
      return [];
    }
    const nodeData = createNodeData(node, detail, depth, parentId);
    const result = [nodeData];
    if ("children" in node) {
      for (const child of node.children) {
        result.push(...getAllNodes(child, detail, includeHidden, maxDepth, depth + 1, node.id));
      }
    }
    return result;
  }
  function createNodeData(node, detail, depth, parentId) {
    if (detail === "minimal") {
      return {
        id: node.id,
        name: node.name,
        parentId: parentId || void 0,
        // Include essential properties needed for filtering
        type: node.type,
        visible: "visible" in node ? node.visible : true
      };
    }
    const baseData = {
      id: node.id,
      name: node.name,
      type: node.type
    };
    const standardData = {
      ...baseData,
      x: "x" in node ? node.x : 0,
      y: "y" in node ? node.y : 0,
      width: "width" in node ? node.width : 0,
      height: "height" in node ? node.height : 0,
      depth,
      parentId: parentId || void 0,
      visible: "visible" in node ? node.visible : true,
      locked: "locked" in node ? node.locked : false
    };
    if (detail === "standard") {
      return standardData;
    }
    const detailedData = { ...standardData };
    if ("boundVariables" in node) {
      detailedData.boundVariables = node.boundVariables;
    }
    if ("opacity" in node) detailedData.opacity = node.opacity;
    if ("rotation" in node) detailedData.rotation = node.rotation;
    if ("cornerRadius" in node) detailedData.cornerRadius = node.cornerRadius;
    if ("fills" in node) detailedData.fills = node.fills;
    if ("strokes" in node) detailedData.strokes = node.strokes;
    if ("effects" in node) detailedData.effects = node.effects;
    if ("constraints" in node) detailedData.constraints = node.constraints;
    if ("absoluteTransform" in node) detailedData.absoluteTransform = node.absoluteTransform;
    if ("relativeTransform" in node) detailedData.relativeTransform = node.relativeTransform;
    if ("layoutMode" in node) detailedData.layoutMode = node.layoutMode;
    if ("itemSpacing" in node) detailedData.itemSpacing = node.itemSpacing;
    if ("paddingLeft" in node) detailedData.paddingLeft = node.paddingLeft;
    if ("paddingRight" in node) detailedData.paddingRight = node.paddingRight;
    if ("paddingTop" in node) detailedData.paddingTop = node.paddingTop;
    if ("paddingBottom" in node) detailedData.paddingBottom = node.paddingBottom;
    if ("clipsContent" in node) detailedData.clipsContent = node.clipsContent;
    if ("characters" in node) detailedData.characters = node.characters;
    if ("fontSize" in node) detailedData.fontSize = node.fontSize;
    if ("fontName" in node) detailedData.fontName = node.fontName;
    if ("textAlignHorizontal" in node) detailedData.textAlignHorizontal = node.textAlignHorizontal;
    if ("textAlignVertical" in node) detailedData.textAlignVertical = node.textAlignVertical;
    return cleanEmptyProperties(detailedData) || detailedData;
  }
  function selectAndFocus(nodes) {
    figma.currentPage.selection = nodes;
    if (nodes.length > 0) {
      figma.viewport.scrollAndZoomIntoView(nodes);
    }
  }
  function moveNodeToPosition(node, x, y) {
    if ("x" in node && "y" in node) {
      node.x = x;
      node.y = y;
    } else {
      throw new Error(`Node type ${node.type} does not support positioning`);
    }
  }
  function resizeNode(node, width, height) {
    if ("resize" in node) {
      node.resize(width, height);
    } else {
      throw new Error(`Node type ${node.type} does not support resizing`);
    }
  }
  async function enhanceImageMetadata(imageHash) {
    try {
      logger2.log("\u{1F5BC}\uFE0F Processing imageHash:", imageHash);
      const image = figma.getImageByHash(imageHash);
      if (image) {
        const size = await image.getSizeAsync();
        logger2.log("\u{1F4CF} Image dimensions:", size);
        const bytes = await image.getBytesAsync();
        logger2.log("\u{1F4E6} Image file size:", bytes.length, "bytes");
        return {
          imageSizeX: size.width,
          imageSizeY: size.height,
          imageFileSize: bytes.length
        };
      }
    } catch (error) {
      logger2.log("\u274C Failed to get image metadata:", error);
    }
    return {};
  }
  function formatColorCompact(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = Math.round(color.a * 100) / 100;
    if (a === 1) {
      return `rgb(${r},${g},${b})`;
    } else {
      return `rgba(${r},${g},${b},${a})`;
    }
  }
  function formatGradientStopsCompact(gradientStops) {
    return gradientStops.map((stop) => {
      const colorStr = formatColorCompact(stop.color);
      return `${colorStr} ${Math.round(stop.position * 100)}%`;
    }).join(", ");
  }
  function isRGBAColor(obj) {
    return obj && typeof obj === "object" && typeof obj.r === "number" && typeof obj.g === "number" && typeof obj.b === "number" && typeof obj.a === "number";
  }
  function isColorStopArray(obj) {
    return Array.isArray(obj) && obj.length > 0 && obj.every(
      (stop) => stop && typeof stop === "object" && typeof stop.position === "number" && isRGBAColor(stop.color)
    );
  }
  async function cleanEmptyPropertiesAsync(obj) {
    try {
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      if (isRGBAColor(obj)) {
        return formatColorCompact(obj);
      }
      if (Array.isArray(obj)) {
        if (isColorStopArray(obj)) {
          return formatGradientStopsCompact(obj);
        }
        const cleaned2 = [];
        for (const item of obj) {
          const cleanedItem = await cleanEmptyPropertiesAsync(item);
          if (cleanedItem !== void 0) {
            cleaned2.push(cleanedItem);
          }
        }
        return cleaned2.length > 0 ? cleaned2 : void 0;
      }
      const cleaned = {};
      let hasProperties = false;
      let enhancedObj = obj;
      if (obj.type === "IMAGE" && obj.imageHash) {
        try {
          const imageMetadata = await enhanceImageMetadata(obj.imageHash);
          enhancedObj = JSON.parse(JSON.stringify(obj));
          Object.assign(enhancedObj, imageMetadata);
        } catch (error) {
          enhancedObj = obj;
        }
      }
      if (enhancedObj.type === "IMAGE") {
        try {
          const flatParams = extractFlattenedImageParams(enhancedObj);
          Object.assign(cleaned, flatParams);
          hasProperties = true;
        } catch (error) {
        }
      }
      for (const [key, value] of Object.entries(enhancedObj)) {
        if (value === null || value === void 0) {
          continue;
        }
        if (key === "gradientTransform") {
          if (enhancedObj.type && enhancedObj.type.startsWith("GRADIENT_")) {
            try {
              const { matrixToFlattened: matrixToFlattened2 } = (init_color_utils(), __toCommonJS(color_utils_exports));
              const flattened = matrixToFlattened2(value);
              cleaned["gradientStartX"] = Number(flattened.gradientStartX.toFixed(3));
              cleaned["gradientStartY"] = Number(flattened.gradientStartY.toFixed(3));
              cleaned["gradientEndX"] = Number(flattened.gradientEndX.toFixed(3));
              cleaned["gradientEndY"] = Number(flattened.gradientEndY.toFixed(3));
              cleaned["gradientScale"] = Number(flattened.gradientScale.toFixed(3));
              hasProperties = true;
            } catch (error) {
            }
          }
          continue;
        }
        if (key === "spacing") {
          if (enhancedObj.type && enhancedObj.type === "PATTERN") {
            try {
              cleaned["patternSpacingX"] = Number((value.x || 0).toFixed(3));
              cleaned["patternSpacingY"] = Number((value.y || 0).toFixed(3));
              hasProperties = true;
            } catch (error) {
            }
          }
          continue;
        }
        if (key === "filters") {
          if (enhancedObj.type && enhancedObj.type === "IMAGE") {
            try {
              if (value.exposure !== void 0) cleaned["filterExposure"] = Number(value.exposure.toFixed(3));
              if (value.contrast !== void 0) cleaned["filterContrast"] = Number(value.contrast.toFixed(3));
              if (value.saturation !== void 0) cleaned["filterSaturation"] = Number(value.saturation.toFixed(3));
              if (value.temperature !== void 0) cleaned["filterTemperature"] = Number(value.temperature.toFixed(3));
              if (value.tint !== void 0) cleaned["filterTint"] = Number(value.tint.toFixed(3));
              if (value.highlights !== void 0) cleaned["filterHighlights"] = Number(value.highlights.toFixed(3));
              if (value.shadows !== void 0) cleaned["filterShadows"] = Number(value.shadows.toFixed(3));
              hasProperties = true;
            } catch (error) {
            }
          }
          continue;
        }
        if (key === "imageHash") {
          cleaned[key] = value;
          hasProperties = true;
          continue;
        }
        if (key === "imageTransform" || key === "rotation" || key === "scalingFactor" || key === "scaleMode") {
          if (enhancedObj.type && enhancedObj.type === "IMAGE") {
            continue;
          }
        }
        if (Array.isArray(value)) {
          if (value.length > 0) {
            const cleanedArray = await cleanEmptyPropertiesAsync(value);
            if (cleanedArray !== void 0) {
              cleaned[key] = cleanedArray;
              hasProperties = true;
            }
          }
        } else if (typeof value === "object") {
          if (Object.keys(value).length > 0) {
            const cleanedObj = await cleanEmptyPropertiesAsync(value);
            if (cleanedObj !== void 0 && Object.keys(cleanedObj).length > 0) {
              cleaned[key] = cleanedObj;
              hasProperties = true;
            }
          }
        } else {
          cleaned[key] = value;
          hasProperties = true;
        }
      }
      return hasProperties ? cleaned : void 0;
    } catch (error) {
      throw error;
    }
  }
  function cleanEmptyProperties(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (isRGBAColor(obj)) {
      return formatColorCompact(obj);
    }
    if (Array.isArray(obj)) {
      if (isColorStopArray(obj)) {
        return formatGradientStopsCompact(obj);
      }
      const cleaned2 = obj.map(cleanEmptyProperties).filter((item) => item !== void 0);
      return cleaned2.length > 0 ? cleaned2 : void 0;
    }
    const cleaned = {};
    let hasProperties = false;
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === void 0) {
        continue;
      }
      if (key === "gradientTransform") {
        if (obj.type && obj.type.startsWith("GRADIENT_")) {
          try {
            const { matrixToFlattened: matrixToFlattened2 } = (init_color_utils(), __toCommonJS(color_utils_exports));
            const flattened = matrixToFlattened2(value);
            cleaned["gradientStartX"] = Number(flattened.gradientStartX.toFixed(3));
            cleaned["gradientStartY"] = Number(flattened.gradientStartY.toFixed(3));
            cleaned["gradientEndX"] = Number(flattened.gradientEndX.toFixed(3));
            cleaned["gradientEndY"] = Number(flattened.gradientEndY.toFixed(3));
            cleaned["gradientScale"] = Number(flattened.gradientScale.toFixed(3));
            hasProperties = true;
          } catch (error) {
          }
        }
        continue;
      }
      if (key === "spacing") {
        if (obj.type && obj.type === "PATTERN") {
          try {
            cleaned["patternSpacingX"] = Number((value.x || 0).toFixed(3));
            cleaned["patternSpacingY"] = Number((value.y || 0).toFixed(3));
            hasProperties = true;
          } catch (error) {
          }
        }
        continue;
      }
      if (key === "filters") {
        if (obj.type && obj.type === "IMAGE") {
          try {
            if (value.exposure !== void 0) cleaned["filterExposure"] = Number(value.exposure.toFixed(3));
            if (value.contrast !== void 0) cleaned["filterContrast"] = Number(value.contrast.toFixed(3));
            if (value.saturation !== void 0) cleaned["filterSaturation"] = Number(value.saturation.toFixed(3));
            if (value.temperature !== void 0) cleaned["filterTemperature"] = Number(value.temperature.toFixed(3));
            if (value.tint !== void 0) cleaned["filterTint"] = Number(value.tint.toFixed(3));
            if (value.highlights !== void 0) cleaned["filterHighlights"] = Number(value.highlights.toFixed(3));
            if (value.shadows !== void 0) cleaned["filterShadows"] = Number(value.shadows.toFixed(3));
            hasProperties = true;
          } catch (error) {
          }
        }
        continue;
      }
      if (key === "imageHash") {
        cleaned[key] = value;
        hasProperties = true;
        continue;
      }
      if (key === "imageTransform" || key === "rotation" || key === "scalingFactor" || key === "scaleMode") {
        if (obj.type && obj.type === "IMAGE") {
          continue;
        }
      }
      if (Array.isArray(value)) {
        if (value.length > 0) {
          const cleanedArray = cleanEmptyProperties(value);
          if (cleanedArray !== void 0) {
            cleaned[key] = cleanedArray;
            hasProperties = true;
          }
        }
      } else if (typeof value === "object") {
        if (Object.keys(value).length > 0) {
          const cleanedObj = cleanEmptyProperties(value);
          if (cleanedObj !== void 0 && Object.keys(cleanedObj).length > 0) {
            cleaned[key] = cleanedObj;
            hasProperties = true;
          }
        }
      } else {
        cleaned[key] = value;
        hasProperties = true;
      }
    }
    return hasProperties ? cleaned : void 0;
  }

  // src/operations/export-settings-operations.ts
  init_figma_property_utils();
  async function MANAGE_EXPORTS(params) {
    return BaseOperation.executeOperation("manageExports", params, async () => {
      const { operation, id, nodeId, exportIndex, newIndex, fromNodeId, toNodeId, fromId, toId } = params;
      const targetId = id || nodeId;
      const sourceId = fromId || fromNodeId;
      const destinationId = toId || toNodeId;
      switch (operation) {
        case "get_setting":
          return handleGetSetting(params);
        case "create_setting":
          return handleCreateSetting(params);
        case "update_setting":
          return handleUpdateSetting(params);
        case "delete_setting":
          return handleDeleteSetting(params);
        case "reorder_setting":
          return handleReorderSetting(params);
        case "clear_settings":
          return handleClearSettings(params);
        case "duplicate_setting":
          return handleDuplicateSetting(params);
        case "export":
          return handleExport(params);
        default:
          throw new Error(`Unknown export operation: ${operation}`);
      }
    });
  }
  function handleGetSetting(params) {
    const { id, nodeId, exportIndex } = params;
    const targetId = id || nodeId;
    const target = findNodeOrPageById(targetId);
    if (!target) {
      throw new Error(`Node or page with ID ${targetId} not found`);
    }
    if (exportIndex !== void 0) {
      if (exportIndex < 0 || exportIndex >= target.exportSettings.length) {
        throw new Error(`Export setting index ${exportIndex} out of range. Node has ${target.exportSettings.length} export settings.`);
      }
      return {
        id: targetId,
        nodeId: targetId,
        // Legacy compatibility
        nodeName: target.name,
        exportIndex,
        setting: target.exportSettings[exportIndex],
        message: `Retrieved export setting ${exportIndex} from ${target.type.toLowerCase()} "${target.name}"`
      };
    } else {
      return {
        id: targetId,
        nodeId: targetId,
        // Legacy compatibility
        nodeName: target.name,
        settings: target.exportSettings,
        count: target.exportSettings.length,
        message: `Retrieved ${target.exportSettings.length} export settings from ${target.type.toLowerCase()} "${target.name}"`
      };
    }
  }
  function handleCreateSetting(params) {
    const { nodeId, format } = params;
    const node = findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }
    const exportSettings = buildExportSettingsFromParams(params);
    modifyExportSettings(node, (manager) => {
      manager.push(exportSettings);
    });
    const newIndex = node.exportSettings.length - 1;
    return {
      nodeId,
      nodeName: node.name,
      exportIndex: newIndex,
      setting: exportSettings,
      totalSettings: node.exportSettings.length,
      message: `Created new ${format} export setting for node "${node.name}" at index ${newIndex}`
    };
  }
  function handleUpdateSetting(params) {
    const { id, nodeId, exportIndex } = params;
    const targetId = id || nodeId;
    const target = findNodeOrPageById(targetId);
    if (!target) {
      throw new Error(`Node or page with ID ${targetId} not found`);
    }
    if (exportIndex < 0 || exportIndex >= target.exportSettings.length) {
      throw new Error(`Export setting index ${exportIndex} out of range. Target has ${target.exportSettings.length} export settings.`);
    }
    const existingSetting = target.exportSettings[exportIndex];
    const updatedSettings = buildExportSettingsFromParams(params, existingSetting);
    modifyExportSettings(target, (manager) => {
      manager.update(exportIndex, updatedSettings);
    });
    return {
      id: targetId,
      nodeId: targetId,
      // Legacy compatibility
      nodeName: target.name,
      exportIndex,
      setting: updatedSettings,
      previousSetting: existingSetting,
      message: `Updated export setting ${exportIndex} for ${target.type.toLowerCase()} "${target.name}"`
    };
  }
  function handleDeleteSetting(params) {
    const { id, nodeId, exportIndex } = params;
    const targetId = id || nodeId;
    const target = findNodeOrPageById(targetId);
    if (!target) {
      throw new Error(`Node or page with ID ${targetId} not found`);
    }
    if (exportIndex < 0 || exportIndex >= target.exportSettings.length) {
      throw new Error(`Export setting index ${exportIndex} out of range. Target has ${target.exportSettings.length} export settings.`);
    }
    const deletedSetting = target.exportSettings[exportIndex];
    modifyExportSettings(target, (manager) => {
      manager.remove(exportIndex);
    });
    return {
      id: targetId,
      nodeId: targetId,
      // Legacy compatibility
      nodeName: target.name,
      exportIndex,
      deletedSetting,
      remainingSettings: target.exportSettings.length,
      message: `Deleted export setting ${exportIndex} from ${target.type.toLowerCase()} "${target.name}". ${target.exportSettings.length} settings remaining.`
    };
  }
  function handleReorderSetting(params) {
    const { id, nodeId, exportIndex, newIndex } = params;
    const targetId = id || nodeId;
    const target = findNodeOrPageById(targetId);
    if (!target) {
      throw new Error(`Node or page with ID ${targetId} not found`);
    }
    if (exportIndex < 0 || exportIndex >= target.exportSettings.length) {
      throw new Error(`Export setting index ${exportIndex} out of range. Target has ${target.exportSettings.length} export settings.`);
    }
    if (newIndex < 0 || newIndex >= target.exportSettings.length) {
      throw new Error(`New index ${newIndex} out of range. Target has ${target.exportSettings.length} export settings.`);
    }
    const movedSetting = target.exportSettings[exportIndex];
    modifyExportSettings(target, (manager) => {
      manager.move(exportIndex, newIndex);
    });
    return {
      id: targetId,
      nodeId: targetId,
      // Legacy compatibility
      nodeName: target.name,
      exportIndex,
      newIndex,
      movedSetting,
      message: `Moved export setting from index ${exportIndex} to ${newIndex} for ${target.type.toLowerCase()} "${target.name}"`
    };
  }
  function handleClearSettings(params) {
    const { id, nodeId } = params;
    const targetId = id || nodeId;
    const target = findNodeOrPageById(targetId);
    if (!target) {
      throw new Error(`Node or page with ID ${targetId} not found`);
    }
    const clearedCount = target.exportSettings.length;
    modifyExportSettings(target, (manager) => {
      manager.clear();
    });
    return {
      id: targetId,
      nodeId: targetId,
      // Legacy compatibility
      nodeName: target.name,
      clearedCount,
      message: `Cleared ${clearedCount} export settings from ${target.type.toLowerCase()} "${target.name}"`
    };
  }
  function handleDuplicateSetting(params) {
    const { fromId, fromNodeId, toId, toNodeId, exportIndex } = params;
    const sourceId = fromId || fromNodeId;
    const destinationId = toId || toNodeId;
    const fromTarget = findNodeOrPageById(sourceId);
    if (!fromTarget) {
      throw new Error(`Source node or page with ID ${sourceId} not found`);
    }
    const toTargetIds = Array.isArray(destinationId) ? destinationId : [destinationId];
    const results = [];
    for (const targetId of toTargetIds) {
      const toTarget = findNodeOrPageById(targetId);
      if (!toTarget) {
        results.push({
          id: targetId,
          nodeId: targetId,
          // Legacy compatibility
          success: false,
          error: "Node or page not found"
        });
        continue;
      }
      try {
        const settingsToCopy = exportIndex !== void 0 ? [fromTarget.exportSettings[exportIndex]] : fromTarget.exportSettings;
        if (exportIndex !== void 0 && (exportIndex < 0 || exportIndex >= fromTarget.exportSettings.length)) {
          throw new Error(`Export setting index ${exportIndex} out of range. Source has ${fromTarget.exportSettings.length} export settings.`);
        }
        modifyExportSettings(toTarget, (manager) => {
          settingsToCopy.forEach((setting) => {
            manager.push({ ...setting });
          });
        });
        results.push({
          id: targetId,
          nodeId: targetId,
          // Legacy compatibility
          nodeName: toTarget.name,
          success: true,
          copiedSettings: settingsToCopy.length,
          totalSettings: toTarget.exportSettings.length,
          message: `Copied ${settingsToCopy.length} export settings to ${toTarget.type.toLowerCase()} "${toTarget.name}"`
        });
      } catch (error) {
        results.push({
          id: targetId,
          nodeId: targetId,
          // Legacy compatibility
          success: false,
          error: error.toString()
        });
      }
    }
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    return {
      fromId: sourceId,
      fromNodeId: sourceId,
      // Legacy compatibility
      fromNodeName: fromTarget.name,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount
      },
      message: `Duplicated export settings from ${fromTarget.type.toLowerCase()} "${fromTarget.name}" to ${successCount} targets (${failCount} failed)`
    };
  }
  async function handleExport(params) {
    const { id, nodeId, target = "FILE", exportIndex } = params;
    const targetId = id || nodeId;
    const targetIds = Array.isArray(targetId) ? targetId : [targetId];
    const results = [];
    for (const singleId of targetIds) {
      const exportTarget = findNodeOrPageById(singleId);
      if (!exportTarget) {
        results.push({
          id: singleId,
          nodeId: singleId,
          // Legacy compatibility
          success: false,
          error: "Node or page not found"
        });
        continue;
      }
      if (!("exportAsync" in exportTarget) || typeof exportTarget.exportAsync !== "function") {
        results.push({
          id: singleId,
          nodeId: singleId,
          // Legacy compatibility
          success: false,
          error: `${exportTarget.type} does not support export operations`
        });
        continue;
      }
      try {
        if (exportTarget.type === "PAGE" && "loadAsync" in exportTarget) {
          await exportTarget.loadAsync();
        }
        let exportSettings;
        if (exportIndex !== void 0) {
          if (exportIndex < 0 || exportIndex >= exportTarget.exportSettings.length) {
            throw new Error(`Export setting index ${exportIndex} out of range. Target has ${exportTarget.exportSettings.length} export settings.`);
          }
          exportSettings = exportTarget.exportSettings[exportIndex];
        } else if (params.format || params.constraintType || params.constraintValue || params.contentsOnly !== void 0 || params.useAbsoluteBounds !== void 0 || params.colorProfile || params.suffix !== void 0 || params.svgOutlineText !== void 0 || params.svgIdAttribute !== void 0 || params.svgSimplifyStroke !== void 0) {
          const baseSetting = exportTarget.exportSettings && exportTarget.exportSettings.length > 0 ? { ...exportTarget.exportSettings[0] } : { format: "PNG", contentsOnly: true };
          exportSettings = buildExportSettingsFromParams(params, baseSetting);
          if (!exportSettings.format || !["PNG", "JPG", "PDF", "SVG", "SVG_STRING"].includes(exportSettings.format)) {
            exportSettings.format = "PNG";
          }
        } else {
          if (exportTarget.exportSettings && exportTarget.exportSettings.length > 0) {
            exportSettings = exportTarget.exportSettings[0];
          } else {
            results.push({
              id: singleId,
              nodeId: singleId,
              // Legacy compatibility
              success: false,
              error: `No export settings found for ${exportTarget.type.toLowerCase()} "${exportTarget.name}". Use format parameter to specify export settings.`
            });
            continue;
          }
        }
        if (exportSettings.format === "SVG") {
          exportSettings.format = target === "DATA" ? "SVG_STRING" : "SVG";
        }
        const exportedData = await exportTarget.exportAsync(exportSettings);
        let data, dataFormat;
        if (exportSettings.format === "SVG_STRING") {
          data = exportedData;
          dataFormat = "string";
        } else {
          data = figma.base64Encode(exportedData);
          dataFormat = "base64";
        }
        const filename = generateFilename(exportTarget, exportSettings.format, params);
        results.push({
          id: singleId,
          nodeId: singleId,
          // Legacy compatibility
          nodeName: exportTarget.name,
          nodeType: exportTarget.type,
          success: true,
          format: exportSettings.format,
          settings: exportSettings,
          data,
          dataFormat,
          filename,
          size: exportedData.length,
          target,
          message: `Successfully exported ${exportTarget.type.toLowerCase()} "${exportTarget.name}" as ${exportSettings.format}`
        });
      } catch (error) {
        results.push({
          id: singleId,
          nodeId: singleId,
          // Legacy compatibility
          success: false,
          error: error.toString()
        });
      }
    }
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    if (targetIds.length === 1) {
      return results[0];
    }
    return {
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount
      },
      target,
      message: `Bulk export completed: ${successCount} successful, ${failCount} failed`
    };
  }
  function buildExportSettingsFromParams(params, existingSetting) {
    const settings = existingSetting ? { ...existingSetting } : {};
    if (params.format) settings.format = params.format;
    if (params.contentsOnly !== void 0) settings.contentsOnly = params.contentsOnly;
    if (params.useAbsoluteBounds !== void 0) settings.useAbsoluteBounds = params.useAbsoluteBounds;
    if (params.colorProfile) settings.colorProfile = params.colorProfile;
    if (params.suffix !== void 0) settings.suffix = params.suffix;
    const finalFormat = params.format || existingSetting?.format;
    if (finalFormat === "SVG" || finalFormat === "SVG_STRING") {
      delete settings.constraint;
      if (params.svgOutlineText !== void 0) settings.svgOutlineText = params.svgOutlineText;
      if (params.svgIdAttribute !== void 0) settings.svgIdAttribute = params.svgIdAttribute;
      if (params.svgSimplifyStroke !== void 0) settings.svgSimplifyStroke = params.svgSimplifyStroke;
    } else if (finalFormat === "PNG" || finalFormat === "JPG") {
      if (params.constraintType && params.constraintValue) {
        settings.constraint = {
          type: params.constraintType,
          value: params.constraintValue
        };
      }
      delete settings.svgOutlineText;
      delete settings.svgIdAttribute;
      delete settings.svgSimplifyStroke;
    } else if (finalFormat === "PDF") {
      delete settings.constraint;
      delete settings.svgOutlineText;
      delete settings.svgIdAttribute;
      delete settings.svgSimplifyStroke;
    }
    return settings;
  }
  function generateFilename(node, format, params) {
    const sanitizedName = node.name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_").replace(/_{2,}/g, "_").replace(/^_|_$/g, "");
    const baseName = sanitizedName || `node_${node.id}`;
    let suffix = "";
    if (params.suffix) {
      suffix = `_${params.suffix}`;
    }
    const extension = format.toLowerCase().replace("_string", "");
    return `${baseName}${suffix}.${extension}`;
  }

  // src/operations/extract-element-helpers.ts
  var extract_element_helpers_exports = {};
  __export(extract_element_helpers_exports, {
    extractPathFromSparse: () => extractPathFromSparse,
    extractRegionFromSparse: () => extractRegionFromSparse
  });
  function calculateVertexBounds(vertices) {
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
  function extractRegionFromSparse(sourceSparse, regionIndex, removeFromSource) {
    const targetRegion = sourceSparse.regions[regionIndex];
    const usedVertexIndices = /* @__PURE__ */ new Set();
    targetRegion.loops.forEach((loopStr) => {
      const loop = JSON.parse(loopStr);
      loop.forEach((vertexIndex) => usedVertexIndices.add(vertexIndex));
    });
    const sourceVertices = JSON.parse(sourceSparse.vertices);
    const extractedVertices = [];
    const vertexMapping = /* @__PURE__ */ new Map();
    Array.from(usedVertexIndices).sort((a, b) => a - b).forEach((oldIndex, newIndex) => {
      extractedVertices.push(sourceVertices[oldIndex * 2], sourceVertices[oldIndex * 2 + 1]);
      vertexMapping.set(oldIndex, newIndex);
    });
    const originalBounds = calculateVertexBounds(sourceVertices);
    const extractedBounds = calculateVertexBounds(extractedVertices);
    const positionOffset = {
      x: originalBounds.minX - extractedBounds.minX,
      y: originalBounds.minY - extractedBounds.minY
    };
    const remappedLoops = targetRegion.loops.map((loopStr) => {
      const loop = JSON.parse(loopStr);
      const remappedLoop = loop.map((oldIndex) => vertexMapping.get(oldIndex));
      return JSON.stringify(remappedLoop);
    });
    const extractedData = {
      vertices: JSON.stringify(extractedVertices),
      regions: [{
        loops: remappedLoops,
        windingRule: targetRegion.windingRule || "EVENODD",
        fillIndex: 0
        // Reset to first fill
      }]
    };
    if (sourceSparse.fills && targetRegion.fillIndex !== void 0 && sourceSparse.fills[targetRegion.fillIndex]) {
      extractedData.fills = [sourceSparse.fills[targetRegion.fillIndex]];
    }
    if (sourceSparse.handles) {
      const extractedHandles = {};
      Array.from(usedVertexIndices).forEach((oldIndex) => {
        if (sourceSparse.handles[oldIndex.toString()]) {
          const newIndex = vertexMapping.get(oldIndex);
          extractedHandles[newIndex.toString()] = sourceSparse.handles[oldIndex.toString()];
        }
      });
      if (Object.keys(extractedHandles).length > 0) {
        extractedData.handles = extractedHandles;
      }
    }
    if (sourceSparse.vertexProps) {
      const extractedVertexProps = {};
      Array.from(usedVertexIndices).forEach((oldIndex) => {
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
      const remainingRegions = sourceSparse.regions.filter((_, index) => index !== regionIndex);
      if (remainingRegions.length === 0) {
        remainingData = {
          vertices: "[0,0,10,0,10,10,0,10]",
          // Small square
          regions: [{
            loops: ["[0,1,2,3]"],
            windingRule: "EVENODD"
          }]
        };
      } else {
        remainingData = {
          ...sourceSparse,
          regions: remainingRegions
        };
      }
    }
    return { extracted: extractedData, remaining: remainingData, positionOffset };
  }
  function extractPathFromSparse(sourceSparse, pathIndex, removeFromSource) {
    const targetPath = sourceSparse.paths[pathIndex];
    const pathVertices = JSON.parse(targetPath);
    const usedVertexIndices = /* @__PURE__ */ new Set();
    pathVertices.forEach((vertexIndex) => usedVertexIndices.add(vertexIndex));
    const sourceVertices = JSON.parse(sourceSparse.vertices);
    const extractedVertices = [];
    const vertexMapping = /* @__PURE__ */ new Map();
    Array.from(usedVertexIndices).sort((a, b) => a - b).forEach((oldIndex, newIndex) => {
      extractedVertices.push(sourceVertices[oldIndex * 2], sourceVertices[oldIndex * 2 + 1]);
      vertexMapping.set(oldIndex, newIndex);
    });
    const originalBounds = calculateVertexBounds(sourceVertices);
    const extractedBounds = calculateVertexBounds(extractedVertices);
    const positionOffset = {
      x: originalBounds.minX - extractedBounds.minX,
      y: originalBounds.minY - extractedBounds.minY
    };
    const remappedPath = pathVertices.map((oldIndex) => vertexMapping.get(oldIndex));
    const extractedData = {
      vertices: JSON.stringify(extractedVertices),
      paths: [JSON.stringify(remappedPath)]
    };
    if (sourceSparse.handles) {
      const extractedHandles = {};
      Array.from(usedVertexIndices).forEach((oldIndex) => {
        if (sourceSparse.handles[oldIndex.toString()]) {
          const newIndex = vertexMapping.get(oldIndex);
          extractedHandles[newIndex.toString()] = sourceSparse.handles[oldIndex.toString()];
        }
      });
      if (Object.keys(extractedHandles).length > 0) {
        extractedData.handles = extractedHandles;
      }
    }
    if (sourceSparse.vertexProps) {
      const extractedVertexProps = {};
      Array.from(usedVertexIndices).forEach((oldIndex) => {
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
      const remainingPaths = sourceSparse.paths.filter((_, index) => index !== pathIndex);
      if (remainingPaths.length === 0) {
        remainingData = {
          vertices: "[0,0,10,0]",
          // Simple line
          paths: ["[0,1]"]
        };
      } else {
        remainingData = {
          ...sourceSparse,
          paths: remainingPaths
        };
      }
    }
    return { extracted: extractedData, remaining: remainingData, positionOffset };
  }

  // src/operations/manage-alignment.ts
  var manage_alignment_exports = {};
  __export(manage_alignment_exports, {
    MANAGE_ALIGNMENT: () => MANAGE_ALIGNMENT
  });
  async function MANAGE_ALIGNMENT(payload) {
    return BaseOperation.executeOperation("manageAlignment", payload, async () => {
      BaseOperation.validateParams(payload, ["nodeIds"]);
      if (!payload.nodeIds || payload.nodeIds.length === 0) {
        throw new Error("At least one node ID is required");
      }
      const { nodes } = validateAndGetNodes(payload.nodeIds);
      const referenceBounds = await calculateReferenceBounds(payload, nodes);
      const results = await calculateAlignmentPositions(payload, nodes, referenceBounds);
      for (const result of results) {
        const node = nodes.find((n) => n.id === result.nodeId);
        if (node) {
          node.x = result.newPosition.x;
          node.y = result.newPosition.y;
        }
      }
      return {
        operation: "manage_alignment",
        results,
        totalNodes: nodes.length,
        referenceBounds,
        message: `Aligned ${nodes.length} node${nodes.length === 1 ? "" : "s"}`
      };
    });
  }
  function validateAndGetNodes(nodeIds) {
    const nodes = [];
    let commonParent = null;
    for (const nodeId of nodeIds) {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }
      if (!("x" in node) || !("y" in node) || !("width" in node) || !("height" in node)) {
        throw new Error(`Node ${nodeId} does not support positioning`);
      }
      if (commonParent === null) {
        commonParent = node.parent;
      } else if (node.parent !== commonParent) {
        throw new Error(`All nodes must share the same parent for alignment operations. Node ${nodeId} has a different parent.`);
      }
      nodes.push(node);
    }
    return { nodes, commonParent };
  }
  async function calculateReferenceBounds(params, nodes) {
    const referenceMode = params.referenceMode || "bounds";
    switch (referenceMode) {
      case "key_object":
        if (!params.referenceNodeId) throw new Error("Reference node ID required for key_object mode");
        const keyNode = findNodeById(params.referenceNodeId);
        if (!keyNode || !("x" in keyNode)) throw new Error("Reference node not found or does not support positioning");
        return getNodeBounds(keyNode);
      case "relative":
        if (!params.referenceNodeId) throw new Error("Reference node ID required for relative mode");
        const relativeNode = findNodeById(params.referenceNodeId);
        if (!relativeNode || !("x" in relativeNode)) throw new Error("Reference node not found or does not support positioning");
        return getNodeBounds(relativeNode);
      case "bounds":
      default:
        if (nodes.length === 1) return getParentBounds(nodes[0]);
        return calculateBoundingBox(nodes);
    }
  }
  function getNodeBounds(node) {
    return {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      left: node.x,
      right: node.x + node.width,
      top: node.y,
      bottom: node.y + node.height,
      centerX: node.x + node.width / 2,
      centerY: node.y + node.height / 2
    };
  }
  function getParentBounds(node) {
    const parent = node.parent;
    if (!parent) return { x: 0, y: 0, width: 1920, height: 1080, left: 0, right: 1920, top: 0, bottom: 1080, centerX: 960, centerY: 540 };
    if (parent.type === "FRAME" || parent.type === "GROUP" || parent.type === "COMPONENT" || parent.type === "INSTANCE") {
      const p = parent;
      return { x: 0, y: 0, width: p.width, height: p.height, left: 0, right: p.width, top: 0, bottom: p.height, centerX: p.width / 2, centerY: p.height / 2 };
    }
    if ("width" in parent) {
      const p = parent;
      return { x: p.x, y: p.y, width: p.width, height: p.height, left: p.x, right: p.x + p.width, top: p.y, bottom: p.y + p.height, centerX: p.x + p.width / 2, centerY: p.y + p.height / 2 };
    }
    return { x: 0, y: 0, width: 1920, height: 1080, left: 0, right: 1920, top: 0, bottom: 1080, centerX: 960, centerY: 540 };
  }
  function calculateBoundingBox(nodes) {
    if (nodes.length === 0) throw new Error("No nodes provided for bounding box calculation");
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      const bounds = getNodeBounds(node);
      minX = Math.min(minX, bounds.left);
      minY = Math.min(minY, bounds.top);
      maxX = Math.max(maxX, bounds.right);
      maxY = Math.max(maxY, bounds.bottom);
    }
    const width = maxX - minX;
    const height = maxY - minY;
    return { x: minX, y: minY, width, height, left: minX, right: maxX, top: minY, bottom: maxY, centerX: minX + width / 2, centerY: minY + height / 2 };
  }
  async function calculateAlignmentPositions(params, nodes, referenceBounds) {
    if (params.spreadDirection) {
      return calculateSpreadPositions(params, nodes);
    }
    const results = [];
    for (const node of nodes) {
      const bounds = getNodeBounds(node);
      let newX = bounds.x, newY = bounds.y;
      if (params.horizontalOperation) {
        newX = calculateHorizontalPosition(params, bounds, referenceBounds, nodes);
      }
      if (params.verticalOperation) {
        newY = calculateVerticalPosition(params, bounds, referenceBounds, nodes);
      }
      results.push({
        nodeId: node.id,
        name: node.name,
        operation: `${params.horizontalOperation || "none"}/${params.verticalOperation || "none"}`,
        newPosition: { x: newX, y: newY },
        originalPosition: { x: bounds.x, y: bounds.y }
      });
    }
    return results;
  }
  function calculateHorizontalPosition(params, nodeBounds, referenceBounds, allNodes) {
    const { horizontalOperation, horizontalDirection, horizontalReferencePoint, horizontalAlignmentPoint, horizontalSpacing, margin } = params;
    const spacing = horizontalSpacing || 0;
    const marginValue = margin || 0;
    switch (horizontalOperation) {
      case "align":
        return calculateAlignHorizontal(horizontalDirection, horizontalReferencePoint, horizontalAlignmentPoint, nodeBounds, referenceBounds);
      case "position":
        return calculatePositionHorizontal(horizontalDirection, horizontalReferencePoint, horizontalAlignmentPoint, nodeBounds, referenceBounds, spacing, marginValue);
      case "distribute":
        return calculateDistributeHorizontal(horizontalDirection || "center", nodeBounds, allNodes, spacing);
      case "spread":
        return nodeBounds.x;
      default:
        return nodeBounds.x;
    }
  }
  function calculateVerticalPosition(params, nodeBounds, referenceBounds, allNodes) {
    const { verticalOperation, verticalDirection, verticalReferencePoint, verticalAlignmentPoint, verticalSpacing, margin } = params;
    const spacing = verticalSpacing || 0;
    const marginValue = margin || 0;
    switch (verticalOperation) {
      case "align":
        return calculateAlignVertical(verticalDirection, verticalReferencePoint, verticalAlignmentPoint, nodeBounds, referenceBounds);
      case "position":
        return calculatePositionVertical(verticalDirection, verticalReferencePoint, verticalAlignmentPoint, nodeBounds, referenceBounds, spacing, marginValue);
      case "distribute":
        return calculateDistributeVertical(verticalDirection || "middle", nodeBounds, allNodes, spacing);
      case "spread":
        return nodeBounds.y;
      default:
        return nodeBounds.y;
    }
  }
  function calculateAlignHorizontal(direction, referencePoint, alignmentPoint, nodeBounds, referenceBounds) {
    const refPoint = referencePoint || direction || "center";
    const alignPoint = alignmentPoint || direction || "center";
    let referenceX;
    switch (refPoint) {
      case "left":
        referenceX = referenceBounds.left;
        break;
      case "center":
        referenceX = referenceBounds.centerX;
        break;
      case "right":
        referenceX = referenceBounds.right;
        break;
      default:
        referenceX = referenceBounds.centerX;
    }
    switch (alignPoint) {
      case "left":
        return referenceX;
      case "center":
        return referenceX - nodeBounds.width / 2;
      case "right":
        return referenceX - nodeBounds.width;
      default:
        return referenceX - nodeBounds.width / 2;
    }
  }
  function calculatePositionHorizontal(direction, referencePoint, alignmentPoint, nodeBounds, referenceBounds, spacing, margin) {
    const refPoint = referencePoint || direction || "center";
    const alignPoint = alignmentPoint || direction || "center";
    let referenceX;
    switch (refPoint) {
      case "left":
        referenceX = referenceBounds.left;
        break;
      case "center":
        referenceX = referenceBounds.centerX;
        break;
      case "right":
        referenceX = referenceBounds.right;
        break;
      default:
        referenceX = referenceBounds.centerX;
    }
    let offsetX = 0;
    if (direction === "left") offsetX = -(spacing + margin);
    else if (direction === "right") offsetX = spacing + margin;
    switch (alignPoint) {
      case "left":
        return referenceX + offsetX;
      case "center":
        return referenceX - nodeBounds.width / 2 + offsetX;
      case "right":
        return referenceX - nodeBounds.width + offsetX;
      default:
        return referenceX - nodeBounds.width / 2 + offsetX;
    }
  }
  function calculateAlignVertical(direction, referencePoint, alignmentPoint, nodeBounds, referenceBounds) {
    const refPoint = referencePoint || direction || "middle";
    const alignPoint = alignmentPoint || direction || "middle";
    let referenceY;
    switch (refPoint) {
      case "top":
        referenceY = referenceBounds.top;
        break;
      case "middle":
        referenceY = referenceBounds.centerY;
        break;
      case "bottom":
        referenceY = referenceBounds.bottom;
        break;
      default:
        referenceY = referenceBounds.centerY;
    }
    switch (alignPoint) {
      case "top":
        return referenceY;
      case "middle":
        return referenceY - nodeBounds.height / 2;
      case "bottom":
        return referenceY - nodeBounds.height;
      default:
        return referenceY - nodeBounds.height / 2;
    }
  }
  function calculatePositionVertical(direction, referencePoint, alignmentPoint, nodeBounds, referenceBounds, spacing, margin) {
    const refPoint = referencePoint || direction || "middle";
    const alignPoint = alignmentPoint || direction || "middle";
    let referenceY;
    switch (refPoint) {
      case "top":
        referenceY = referenceBounds.top;
        break;
      case "middle":
        referenceY = referenceBounds.centerY;
        break;
      case "bottom":
        referenceY = referenceBounds.bottom;
        break;
      default:
        referenceY = referenceBounds.centerY;
    }
    let offsetY = 0;
    if (direction === "top") offsetY = -(spacing + margin);
    else if (direction === "bottom") offsetY = spacing + margin;
    switch (alignPoint) {
      case "top":
        return referenceY + offsetY;
      case "middle":
        return referenceY - nodeBounds.height / 2 + offsetY;
      case "bottom":
        return referenceY - nodeBounds.height + offsetY;
      default:
        return referenceY - nodeBounds.height / 2 + offsetY;
    }
  }
  function calculateDistributeHorizontal(direction, nodeBounds, allNodes, spacing) {
    const sortedNodes = allNodes.map((node) => getNodeBounds(node)).sort((a, b) => a.centerX - b.centerX);
    const nodeIndex = sortedNodes.findIndex((bounds) => bounds.centerX === nodeBounds.centerX && bounds.centerY === nodeBounds.centerY);
    if (nodeIndex === -1 || sortedNodes.length < 2) return nodeBounds.x;
    const totalWidth = sortedNodes[sortedNodes.length - 1].right - sortedNodes[0].left;
    const totalNodeWidths = sortedNodes.reduce((sum, bounds) => sum + bounds.width, 0);
    const availableSpace = totalWidth - totalNodeWidths;
    const gaps = sortedNodes.length - 1;
    const gapSize = gaps > 0 ? Math.max(spacing, availableSpace / gaps) : 0;
    let currentX = sortedNodes[0].left;
    for (let i = 0; i < nodeIndex; i++) {
      currentX += sortedNodes[i].width + gapSize;
    }
    return currentX;
  }
  function calculateDistributeVertical(direction, nodeBounds, allNodes, spacing) {
    const sortedNodes = allNodes.map((node) => getNodeBounds(node)).sort((a, b) => a.centerY - b.centerY);
    const nodeIndex = sortedNodes.findIndex((bounds) => bounds.centerX === nodeBounds.centerX && bounds.centerY === nodeBounds.centerY);
    if (nodeIndex === -1 || sortedNodes.length < 2) return nodeBounds.y;
    const totalHeight = sortedNodes[sortedNodes.length - 1].bottom - sortedNodes[0].top;
    const totalNodeHeights = sortedNodes.reduce((sum, bounds) => sum + bounds.height, 0);
    const availableSpace = totalHeight - totalNodeHeights;
    const gaps = sortedNodes.length - 1;
    const gapSize = gaps > 0 ? Math.max(spacing, availableSpace / gaps) : 0;
    let currentY = sortedNodes[0].top;
    for (let i = 0; i < nodeIndex; i++) {
      currentY += sortedNodes[i].height + gapSize;
    }
    return currentY;
  }
  function calculateSpreadPositions(params, nodes) {
    const { spreadDirection = "horizontal", spacing = 20 } = params;
    if (nodes.length < 2) {
      return nodes.map((node) => ({
        nodeId: node.id,
        name: node.name,
        operation: `spread_${spreadDirection}`,
        newPosition: { x: node.x, y: node.y },
        originalPosition: { x: node.x, y: node.y }
      }));
    }
    const nodeBounds = nodes.map((node) => ({
      node,
      bounds: getNodeBounds(node)
    }));
    const results = [];
    let currentPosition = 0;
    for (let i = 0; i < nodeBounds.length; i++) {
      const { node, bounds } = nodeBounds[i];
      if (i === 0) {
        if (spreadDirection === "horizontal") {
          currentPosition = bounds.left;
          results.push({
            nodeId: node.id,
            name: node.name,
            operation: `spread_${spreadDirection}`,
            newPosition: { x: bounds.x, y: bounds.y },
            originalPosition: { x: bounds.x, y: bounds.y }
          });
          currentPosition = bounds.right + spacing;
        } else {
          currentPosition = bounds.top;
          results.push({
            nodeId: node.id,
            name: node.name,
            operation: `spread_${spreadDirection}`,
            newPosition: { x: bounds.x, y: bounds.y },
            originalPosition: { x: bounds.x, y: bounds.y }
          });
          currentPosition = bounds.bottom + spacing;
        }
      } else {
        if (spreadDirection === "horizontal") {
          const newX = currentPosition;
          const newY = bounds.y;
          results.push({
            nodeId: node.id,
            name: node.name,
            operation: `spread_${spreadDirection}`,
            newPosition: { x: newX, y: newY },
            originalPosition: { x: bounds.x, y: bounds.y }
          });
          currentPosition = newX + bounds.width + spacing;
        } else {
          const newX = bounds.x;
          const newY = currentPosition;
          results.push({
            nodeId: node.id,
            name: node.name,
            operation: `spread_${spreadDirection}`,
            newPosition: { x: newX, y: newY },
            originalPosition: { x: bounds.x, y: bounds.y }
          });
          currentPosition = newY + bounds.height + spacing;
        }
      }
    }
    return results;
  }

  // src/operations/manage-annotations.ts
  var manage_annotations_exports = {};
  __export(manage_annotations_exports, {
    ANNOTATION_OPERATION: () => ANNOTATION_OPERATION
  });
  init_logger();
  function resolveAnnotationLabelConflict(annotation) {
    const cleaned = { ...annotation };
    if (cleaned.label !== void 0 && cleaned.label !== null && cleaned.labelMarkdown !== void 0 && cleaned.labelMarkdown !== null) {
      if (cleaned.label === cleaned.labelMarkdown) {
        delete cleaned.labelMarkdown;
      } else if (cleaned.labelMarkdown === "") {
        delete cleaned.labelMarkdown;
      } else {
        delete cleaned.label;
      }
    }
    return cleaned;
  }
  async function ANNOTATION_OPERATION(params) {
    return BaseOperation.executeOperation("annotationOperation", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        ["add_annotation", "edit_annotation", "remove_annotation", "list_annotations", "list_categories", "cleanup_orphaned"]
      );
      if (["add_annotation", "edit_annotation", "remove_annotation"].includes(operation) && !params.annotationId) {
        throw new Error(`${operation} requires an annotationId parameter (node ID)`);
      }
      if (params.label !== void 0 && params.labelMarkdown !== void 0) {
        throw new Error("Only one of label or labelMarkdown should be provided, not both");
      }
      const isDevMode = figma.editorType === "dev";
      switch (operation) {
        case "add_annotation":
          if (isDevMode) {
            return {
              message: "Annotation creation is not supported in Dev Mode",
              note: "Annotations can only be created in Design Mode",
              operation: "add_annotation"
            };
          }
          const nodeId = params.annotationId;
          const node = await figma.getNodeByIdAsync(nodeId);
          if (!node) {
            throw new Error(`Node with ID ${nodeId} not found`);
          }
          if (!("annotations" in node)) {
            throw new Error(`Node type ${node.type} does not support annotations`);
          }
          const newAnnotation = {};
          if (params.label) {
            newAnnotation.label = params.label;
          }
          if (params.labelMarkdown) {
            newAnnotation.labelMarkdown = params.labelMarkdown;
          }
          if (params.pinProperty) {
            const pinPropertyArray = Array.isArray(params.pinProperty) ? params.pinProperty : [params.pinProperty];
            const nodeType = node.type;
            const validProperties = pinPropertyArray.filter((prop) => typeof prop === "string").filter((prop) => {
              if (nodeType === "FRAME" && ["effects", "strokes"].includes(prop)) {
                return false;
              }
              if (nodeType === "TEXT" && ["cornerRadius"].includes(prop)) {
                return false;
              }
              return true;
            }).map((prop) => ({ type: prop }));
            if (validProperties.length > 0) {
              newAnnotation.properties = validProperties;
            }
          }
          if (params.categoryId) {
            try {
              const availableCategories = await figma.annotations.getAnnotationCategoriesAsync();
              const validCategoryIds = availableCategories.map((cat) => cat.id);
              if (!validCategoryIds.includes(params.categoryId)) {
                const categoryList = availableCategories.map((cat) => `${cat.label || cat.id} (${cat.id})`).join(", ");
                throw new Error(`Invalid categoryId: "${params.categoryId}". Available categories: ${categoryList}`);
              }
              newAnnotation.categoryId = params.categoryId;
            } catch (error) {
              if (error.message.includes("Invalid categoryId")) {
                throw error;
              }
              logger2.warn("Could not validate categoryId:", error.message);
              newAnnotation.categoryId = params.categoryId;
            }
          }
          const existingAnnotations = node.annotations || [];
          const cleanedExistingAnnotations = existingAnnotations.map(resolveAnnotationLabelConflict);
          const updatedAnnotations = [...cleanedExistingAnnotations, newAnnotation];
          try {
            node.annotations = updatedAnnotations;
          } catch (error) {
            const errorMessage = error.message || error.toString();
            logger2.error("Annotation creation failed:", {
              error: errorMessage,
              newAnnotation,
              existingCount: existingAnnotations.length,
              hasConflicts: existingAnnotations.some((a) => a.label && a.labelMarkdown)
            });
            throw new Error(`Failed to create annotation: ${errorMessage}`);
          }
          return {
            message: "Annotation created successfully using Figma native API",
            operation: "add_annotation",
            nodeId,
            annotation: newAnnotation,
            totalAnnotations: updatedAnnotations.length
          };
        case "edit_annotation":
          if (isDevMode) {
            return {
              message: "Annotation editing is not supported in Dev Mode",
              note: "Annotations can only be edited in Design Mode",
              operation: "edit_annotation"
            };
          }
          const editNodeId = params.annotationId;
          const editNode = await figma.getNodeByIdAsync(editNodeId);
          if (!editNode) {
            throw new Error(`Node with ID ${editNodeId} not found`);
          }
          if (!("annotations" in editNode)) {
            throw new Error(`Node type ${editNode.type} does not support annotations`);
          }
          const nodeAnnotations = editNode.annotations || [];
          if (nodeAnnotations.length === 0) {
            throw new Error(`No annotations found on node ${editNodeId}`);
          }
          let annotationToUpdate = nodeAnnotations[0];
          const targetLabel = params.label;
          const targetCategoryId = params.categoryId;
          if (targetLabel || targetCategoryId) {
            const foundAnnotation = nodeAnnotations.find(
              (a) => targetLabel && a.label === targetLabel || targetCategoryId && a.categoryId === targetCategoryId
            );
            if (foundAnnotation) {
              annotationToUpdate = foundAnnotation;
            }
          }
          let updatedAnnotation = { ...annotationToUpdate };
          if (params.label !== void 0) {
            updatedAnnotation.label = params.label;
          }
          if (params.labelMarkdown !== void 0) {
            updatedAnnotation.labelMarkdown = params.labelMarkdown;
          }
          updatedAnnotation = resolveAnnotationLabelConflict(updatedAnnotation);
          if (params.pinProperty) {
            const pinPropertyArray = Array.isArray(params.pinProperty) ? params.pinProperty : [params.pinProperty];
            const validProperties = pinPropertyArray.filter((prop) => typeof prop === "string").map((prop) => ({ type: prop }));
            if (validProperties.length > 0) {
              updatedAnnotation.properties = validProperties;
            }
          }
          if (params.categoryId !== void 0) {
            updatedAnnotation.categoryId = params.categoryId;
          }
          const annotationIndex = nodeAnnotations.indexOf(annotationToUpdate);
          const editedAnnotations = [...nodeAnnotations];
          editedAnnotations[annotationIndex] = updatedAnnotation;
          const cleanedAnnotations = editedAnnotations.map(resolveAnnotationLabelConflict);
          editNode.annotations = cleanedAnnotations;
          return {
            message: "Annotation updated successfully using Figma native API",
            operation: "edit_annotation",
            nodeId: editNodeId,
            annotation: updatedAnnotation,
            annotationIndex
          };
        case "remove_annotation":
          if (isDevMode) {
            return {
              message: "Annotation deletion is not supported in Dev Mode",
              note: "Annotations can only be deleted in Design Mode",
              operation: "remove_annotation"
            };
          }
          const removeNodeId = params.annotationId;
          const removeNode = await figma.getNodeByIdAsync(removeNodeId);
          if (!removeNode) {
            throw new Error(`Node with ID ${removeNodeId} not found`);
          }
          if (!("annotations" in removeNode)) {
            throw new Error(`Node type ${removeNode.type} does not support annotations`);
          }
          const currentAnnotations = removeNode.annotations || [];
          if (currentAnnotations.length === 0) {
            throw new Error(`No annotations found on node ${removeNodeId}`);
          }
          const removeLabel = params.label;
          const removeCategoryId = params.categoryId;
          let remainingAnnotations;
          if (removeLabel || removeCategoryId) {
            remainingAnnotations = currentAnnotations.filter(
              (a) => !(removeLabel && a.label === removeLabel) && !(removeCategoryId && a.categoryId === removeCategoryId)
            );
            if (remainingAnnotations.length === currentAnnotations.length) {
              throw new Error(`No annotations found matching the specified criteria`);
            }
          } else {
            remainingAnnotations = [];
          }
          const cleanedRemainingAnnotations = remainingAnnotations.map(resolveAnnotationLabelConflict);
          removeNode.annotations = cleanedRemainingAnnotations;
          return {
            message: "Annotation removed successfully using Figma native API",
            operation: "remove_annotation",
            nodeId: removeNodeId,
            removedCount: currentAnnotations.length - remainingAnnotations.length,
            remainingCount: remainingAnnotations.length
          };
        case "list_annotations":
          const targetNodeId = params.annotationId;
          if (targetNodeId) {
            const targetNode = await figma.getNodeByIdAsync(targetNodeId);
            if (!targetNode) {
              throw new Error(`Node with ID ${targetNodeId} not found`);
            }
            if (!("annotations" in targetNode)) {
              return {
                annotations: [],
                count: 0,
                message: `Node type ${targetNode.type} does not support annotations`,
                operation: "list_annotations"
              };
            }
            const annotations = targetNode.annotations || [];
            return {
              annotations,
              count: annotations.length,
              nodeId: targetNodeId,
              message: `Found ${annotations.length} annotations on node ${targetNodeId}`,
              operation: "list_annotations"
            };
          } else {
            const allNodes = figma.root.findAll();
            const allAnnotations = [];
            for (const node2 of allNodes) {
              if ("annotations" in node2 && node2.annotations && node2.annotations.length > 0) {
                node2.annotations.forEach((annotation) => {
                  allAnnotations.push({
                    ...annotation,
                    nodeId: node2.id,
                    nodeName: node2.name,
                    nodeType: node2.type
                  });
                });
              }
            }
            return {
              annotations: allAnnotations,
              count: allAnnotations.length,
              message: `Found ${allAnnotations.length} annotations across all nodes`,
              operation: "list_annotations"
            };
          }
        case "list_categories":
          try {
            const availableCategories = await figma.annotations.getAnnotationCategoriesAsync();
            const categoriesWithLabels = availableCategories.map((cat) => ({
              id: cat.id,
              label: cat.label || `Category ${cat.id}`,
              color: cat.color,
              isPreset: cat.isPreset
            }));
            return {
              categories: categoriesWithLabels,
              count: availableCategories.length,
              message: `Found ${availableCategories.length} annotation categories`,
              operation: "list_categories"
            };
          } catch (error) {
            throw new Error(`Failed to retrieve annotation categories: ${error.message}`);
          }
        case "cleanup_orphaned":
          const orphanedAnnotations = JSON.parse(figma.root.getPluginData("annotations") || "[]");
          if (orphanedAnnotations.length === 0) {
            return {
              message: "No orphaned annotations found in pluginData",
              operation: "cleanup_orphaned",
              cleanedCount: 0
            };
          }
          figma.root.setPluginData("annotations", "[]");
          return {
            message: `Cleaned up ${orphanedAnnotations.length} orphaned annotations from pluginData`,
            operation: "cleanup_orphaned",
            cleanedCount: orphanedAnnotations.length,
            cleanedAnnotations: orphanedAnnotations
          };
        default:
          throw new Error(`Unknown annotation operation: ${operation}`);
      }
    });
  }

  // src/operations/manage-auto-layout.ts
  var manage_auto_layout_exports = {};
  __export(manage_auto_layout_exports, {
    MANAGE_AUTO_LAYOUT: () => MANAGE_AUTO_LAYOUT
  });
  async function MANAGE_AUTO_LAYOUT(params) {
    return BaseOperation.executeOperation("manageAutoLayout", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        ["get", "set_horizontal", "set_vertical", "set_grid", "set_freeform", "set_child", "reorder_children"]
      );
      if (["get", "set_horizontal", "set_vertical", "set_grid", "set_freeform"].includes(operation)) {
        const nodeId = params.nodeId;
        if (!nodeId) {
          throw new Error('Parameter "nodeId" is required for container operations');
        }
      } else if (["set_child", "reorder_children"].includes(operation)) {
        const containerId = params.containerId;
        if (!containerId) {
          throw new Error('Parameter "containerId" is required for child operations');
        }
      }
      if (["get", "set_horizontal", "set_vertical", "set_grid", "set_freeform"].includes(operation)) {
        const nodeId = params.nodeId;
        const nodes = Array.isArray(nodeId) ? nodeId : [nodeId];
        const results = [];
        for (const id of nodes) {
          const node = findNodeById(id);
          if (!node) {
            throw new Error(`Node ${id} not found`);
          }
          validateNodeType(node, ["FRAME", "COMPONENT", "INSTANCE"]);
          switch (operation) {
            case "get":
              results.push(await getLayoutProperties(node));
              break;
            case "set_horizontal":
              results.push(await setHorizontalLayout(node, params));
              break;
            case "set_vertical":
              results.push(await setVerticalLayout(node, params));
              break;
            case "set_grid":
              results.push(await setGridLayout(node, params));
              break;
            case "set_freeform":
              results.push(await setFreeformLayout(node));
              break;
          }
        }
        return Array.isArray(params.nodeId) ? results : results[0];
      }
      switch (operation) {
        case "set_child":
          if (!params.containerId && params.nodeId) {
            return await handleBulkChildPropertiesAcrossParents(params);
          }
          const containerId = params.containerId;
          const container = findNodeById(containerId);
          if (!container) {
            throw new Error(`Container ${containerId} not found`);
          }
          validateNodeType(container, ["FRAME", "COMPONENT", "INSTANCE"]);
          return await handleBulkChildProperties(container, params);
        case "reorder_children":
          const containerIdReorder = params.containerId;
          const containerReorder = findNodeById(containerIdReorder);
          if (!containerReorder) {
            throw new Error(`Container ${containerIdReorder} not found`);
          }
          validateNodeType(containerReorder, ["FRAME", "COMPONENT", "INSTANCE"]);
          return await reorderChildren(containerReorder, params);
        default:
          throw new Error(`Unknown auto layout operation: ${operation}`);
      }
    });
  }
  async function getLayoutProperties(frame) {
    const isAutoLayout = frame.layoutMode !== "NONE";
    const result = {
      operation: "get",
      nodeId: frame.id,
      name: frame.name,
      layoutMode: frame.layoutMode.toLowerCase(),
      properties: {},
      children: frame.children.map((child, index) => ({
        index,
        id: child.id,
        name: child.name,
        type: child.type
      }))
    };
    if (isAutoLayout) {
      result.properties = {
        spacing: frame.itemSpacing,
        paddingTop: frame.paddingTop,
        paddingRight: frame.paddingRight,
        paddingBottom: frame.paddingBottom,
        paddingLeft: frame.paddingLeft,
        primaryAxisAlignItems: frame.primaryAxisAlignItems,
        counterAxisAlignItems: frame.counterAxisAlignItems,
        primaryAxisSizingMode: frame.primaryAxisSizingMode,
        counterAxisSizingMode: frame.counterAxisSizingMode,
        strokesIncludedInLayout: frame.strokesIncludedInLayout,
        itemReverseZIndex: frame.itemReverseZIndex
      };
      if (frame.layoutMode === "HORIZONTAL" || frame.layoutMode === "VERTICAL") {
        result.properties.layoutWrap = frame.layoutWrap;
        if (frame.layoutWrap === "WRAP") {
          result.properties.counterAxisSpacing = frame.counterAxisSpacing;
        }
      }
      if (frame.layoutMode === "GRID") {
        result.properties.gridRowCount = frame.gridRowCount;
        result.properties.gridColumnCount = frame.gridColumnCount;
        result.properties.gridRowGap = frame.gridRowGap;
        result.properties.gridColumnGap = frame.gridColumnGap;
      }
    }
    return result;
  }
  async function setHorizontalLayout(frame, params) {
    frame.layoutMode = "HORIZONTAL";
    if (params.horizontalSpacing !== void 0) {
      frame.itemSpacing = params.horizontalSpacing === "AUTO" ? "AUTO" : params.horizontalSpacing;
    }
    setPaddingProperties(frame, params);
    if (params.horizontalAlignment !== void 0) {
      frame.primaryAxisAlignItems = params.horizontalAlignment.toUpperCase();
    }
    if (params.verticalAlignment !== void 0) {
      frame.counterAxisAlignItems = params.verticalAlignment.toUpperCase();
    }
    if (params.fixedWidth !== void 0) {
      frame.primaryAxisSizingMode = params.fixedWidth ? "FIXED" : "AUTO";
    }
    if (params.fixedHeight !== void 0) {
      frame.counterAxisSizingMode = params.fixedHeight ? "FIXED" : "AUTO";
    }
    if (params.wrapLayout !== void 0) {
      frame.layoutWrap = params.wrapLayout ? "WRAP" : "NO_WRAP";
    }
    if (params.verticalSpacing !== void 0 && frame.layoutWrap === "WRAP") {
      frame.counterAxisSpacing = params.verticalSpacing === "AUTO" ? "AUTO" : params.verticalSpacing;
    }
    setAdvancedProperties(frame, params);
    return {
      operation: "set_horizontal",
      nodeId: frame.id,
      name: frame.name,
      layoutMode: "horizontal",
      properties: getLayoutSummary(frame),
      message: `Set horizontal layout on frame: ${frame.name}`
    };
  }
  async function setVerticalLayout(frame, params) {
    frame.layoutMode = "VERTICAL";
    if (params.verticalSpacing !== void 0) {
      frame.itemSpacing = params.verticalSpacing === "AUTO" ? "AUTO" : params.verticalSpacing;
    }
    setPaddingProperties(frame, params);
    if (params.verticalAlignment !== void 0) {
      frame.primaryAxisAlignItems = params.verticalAlignment.toUpperCase();
    }
    if (params.horizontalAlignment !== void 0) {
      frame.counterAxisAlignItems = params.horizontalAlignment.toUpperCase();
    }
    if (params.fixedHeight !== void 0) {
      frame.primaryAxisSizingMode = params.fixedHeight ? "FIXED" : "AUTO";
    }
    if (params.fixedWidth !== void 0) {
      frame.counterAxisSizingMode = params.fixedWidth ? "FIXED" : "AUTO";
    }
    if (params.wrapLayout !== void 0) {
      frame.layoutWrap = params.wrapLayout ? "WRAP" : "NO_WRAP";
    }
    if (params.horizontalSpacing !== void 0 && frame.layoutWrap === "WRAP") {
      frame.counterAxisSpacing = params.horizontalSpacing === "AUTO" ? "AUTO" : params.horizontalSpacing;
    }
    setAdvancedProperties(frame, params);
    return {
      operation: "set_vertical",
      nodeId: frame.id,
      name: frame.name,
      layoutMode: "vertical",
      properties: getLayoutSummary(frame),
      message: `Set vertical layout on frame: ${frame.name}`
    };
  }
  async function setGridLayout(frame, params) {
    frame.layoutMode = "GRID";
    if (params.rows !== void 0) {
      frame.gridRowCount = params.rows;
    }
    if (params.columns !== void 0) {
      frame.gridColumnCount = params.columns;
    }
    if (params.rowSpacing !== void 0) {
      frame.gridRowGap = params.rowSpacing === "AUTO" ? "AUTO" : params.rowSpacing;
    }
    if (params.columnSpacing !== void 0) {
      frame.gridColumnGap = params.columnSpacing === "AUTO" ? "AUTO" : params.columnSpacing;
    }
    setPaddingProperties(frame, params);
    if (params.fixedWidth !== void 0) {
      frame.primaryAxisSizingMode = params.fixedWidth ? "FIXED" : "AUTO";
    }
    if (params.fixedHeight !== void 0) {
      frame.counterAxisSizingMode = params.fixedHeight ? "FIXED" : "AUTO";
    }
    setAdvancedProperties(frame, params);
    return {
      operation: "set_grid",
      nodeId: frame.id,
      name: frame.name,
      layoutMode: "grid",
      properties: getLayoutSummary(frame),
      message: `Set grid layout on frame: ${frame.name}`
    };
  }
  async function setFreeformLayout(frame) {
    frame.layoutMode = "NONE";
    return {
      operation: "set_freeform",
      nodeId: frame.id,
      name: frame.name,
      layoutMode: "none",
      message: `Set freeform layout on frame: ${frame.name}`
    };
  }
  async function handleBulkChildPropertiesAcrossParents(params) {
    const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const childId = nodeIds[i];
      const child = findNodeById(childId);
      if (!child) {
        throw new Error(`Child node ${childId} not found`);
      }
      const parent = child.parent;
      if (!parent || !["FRAME", "COMPONENT", "INSTANCE"].includes(parent.type)) {
        throw new Error(`Child node ${childId} (${child.name}) does not have a valid auto-layout parent`);
      }
      const container = parent;
      if (container.layoutMode === "NONE") {
        throw new Error(`Parent ${container.id} (${container.name}) does not have auto layout enabled`);
      }
      const childIndex = container.children.findIndex((c) => c.id === childId);
      if (childIndex === -1) {
        throw new Error(`Child node ${childId} not found in parent ${container.id}`);
      }
      const individualParams = {
        ...params,
        containerId: container.id,
        nodeId: childId,
        childIndex,
        // Extract individual values for bulk parameters
        horizontalSizing: Array.isArray(params.horizontalSizing) ? params.horizontalSizing[i] : params.horizontalSizing,
        verticalSizing: Array.isArray(params.verticalSizing) ? params.verticalSizing[i] : params.verticalSizing,
        layoutGrow: Array.isArray(params.layoutGrow) ? params.layoutGrow[i] : params.layoutGrow,
        layoutAlign: Array.isArray(params.layoutAlign) ? params.layoutAlign[i] : params.layoutAlign,
        rowSpan: Array.isArray(params.rowSpan) ? params.rowSpan[i] : params.rowSpan,
        columnSpan: Array.isArray(params.columnSpan) ? params.columnSpan[i] : params.columnSpan,
        rowAnchor: Array.isArray(params.rowAnchor) ? params.rowAnchor[i] : params.rowAnchor,
        columnAnchor: Array.isArray(params.columnAnchor) ? params.columnAnchor[i] : params.columnAnchor,
        horizontalAlign: Array.isArray(params.horizontalAlign) ? params.horizontalAlign[i] : params.horizontalAlign,
        verticalAlign: Array.isArray(params.verticalAlign) ? params.verticalAlign[i] : params.verticalAlign
      };
      results.push(await setChildProperties(container, individualParams));
    }
    return nodeIds.length === 1 ? results[0] : results;
  }
  async function handleBulkChildProperties(container, params) {
    const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : params.nodeId ? [params.nodeId] : [];
    const childIndices = Array.isArray(params.childIndex) ? params.childIndex : params.childIndex !== void 0 ? [params.childIndex] : [];
    if (nodeIds.length > 0) {
      const results = [];
      for (let i = 0; i < nodeIds.length; i++) {
        const individualParams = {
          ...params,
          nodeId: nodeIds[i],
          childIndex: void 0,
          // Let auto-lookup handle this
          // Extract individual values for bulk parameters
          horizontalSizing: Array.isArray(params.horizontalSizing) ? params.horizontalSizing[i] : params.horizontalSizing,
          verticalSizing: Array.isArray(params.verticalSizing) ? params.verticalSizing[i] : params.verticalSizing,
          layoutGrow: Array.isArray(params.layoutGrow) ? params.layoutGrow[i] : params.layoutGrow,
          layoutAlign: Array.isArray(params.layoutAlign) ? params.layoutAlign[i] : params.layoutAlign,
          rowSpan: Array.isArray(params.rowSpan) ? params.rowSpan[i] : params.rowSpan,
          columnSpan: Array.isArray(params.columnSpan) ? params.columnSpan[i] : params.columnSpan,
          rowAnchor: Array.isArray(params.rowAnchor) ? params.rowAnchor[i] : params.rowAnchor,
          columnAnchor: Array.isArray(params.columnAnchor) ? params.columnAnchor[i] : params.columnAnchor,
          horizontalAlign: Array.isArray(params.horizontalAlign) ? params.horizontalAlign[i] : params.horizontalAlign,
          verticalAlign: Array.isArray(params.verticalAlign) ? params.verticalAlign[i] : params.verticalAlign
        };
        results.push(await setChildProperties(container, individualParams));
      }
      return nodeIds.length === 1 ? results[0] : results;
    }
    if (childIndices.length > 0) {
      const results = [];
      for (let i = 0; i < childIndices.length; i++) {
        const individualParams = {
          ...params,
          childIndex: childIndices[i],
          nodeId: void 0,
          // Extract individual values for bulk parameters
          horizontalSizing: Array.isArray(params.horizontalSizing) ? params.horizontalSizing[i] : params.horizontalSizing,
          verticalSizing: Array.isArray(params.verticalSizing) ? params.verticalSizing[i] : params.verticalSizing,
          layoutGrow: Array.isArray(params.layoutGrow) ? params.layoutGrow[i] : params.layoutGrow,
          layoutAlign: Array.isArray(params.layoutAlign) ? params.layoutAlign[i] : params.layoutAlign,
          rowSpan: Array.isArray(params.rowSpan) ? params.rowSpan[i] : params.rowSpan,
          columnSpan: Array.isArray(params.columnSpan) ? params.columnSpan[i] : params.columnSpan,
          rowAnchor: Array.isArray(params.rowAnchor) ? params.rowAnchor[i] : params.rowAnchor,
          columnAnchor: Array.isArray(params.columnAnchor) ? params.columnAnchor[i] : params.columnAnchor,
          horizontalAlign: Array.isArray(params.horizontalAlign) ? params.horizontalAlign[i] : params.horizontalAlign,
          verticalAlign: Array.isArray(params.verticalAlign) ? params.verticalAlign[i] : params.verticalAlign
        };
        results.push(await setChildProperties(container, individualParams));
      }
      return childIndices.length === 1 ? results[0] : results;
    }
    return await setChildProperties(container, params);
  }
  async function setChildProperties(container, params) {
    let childIndex = params.childIndex;
    if (params.nodeId && childIndex === void 0) {
      childIndex = container.children.findIndex((child2) => child2.id === params.nodeId);
      if (childIndex === -1) {
        throw new Error(`Child node ${params.nodeId} not found in container ${container.id} (${container.name})`);
      }
    }
    if (childIndex === void 0) {
      throw new Error('Either "childIndex" or "nodeId" is required for set_child operation');
    }
    if (childIndex < 0 || childIndex >= container.children.length) {
      throw new Error(`Child index ${childIndex} is out of bounds (0-${container.children.length - 1})`);
    }
    const child = container.children[childIndex];
    if (params.layoutGrow !== void 0) {
      child.layoutGrow = params.layoutGrow;
    }
    if (params.layoutAlign !== void 0) {
      child.layoutAlign = params.layoutAlign.toUpperCase();
    }
    if (params.horizontalSizing !== void 0) {
      child.layoutSizingHorizontal = params.horizontalSizing.toUpperCase();
    }
    if (params.verticalSizing !== void 0) {
      child.layoutSizingVertical = params.verticalSizing.toUpperCase();
    }
    if (container.layoutMode === "GRID") {
      if (params.rowSpan !== void 0) {
        child.gridRowSpan = params.rowSpan;
      }
      if (params.columnSpan !== void 0) {
        child.gridColumnSpan = params.columnSpan;
      }
      if (params.rowAnchor !== void 0) {
        child.gridRowAnchorIndex = params.rowAnchor;
      }
      if (params.columnAnchor !== void 0) {
        child.gridColumnAnchorIndex = params.columnAnchor;
      }
      if (params.horizontalAlign !== void 0) {
        child.gridChildHorizontalAlign = params.horizontalAlign.toUpperCase();
      }
      if (params.verticalAlign !== void 0) {
        child.gridChildVerticalAlign = params.verticalAlign.toUpperCase();
      }
    }
    return {
      operation: "set_child",
      containerId: container.id,
      containerName: container.name,
      childIndex,
      childId: child.id,
      childName: child.name,
      targetedBy: params.nodeId ? "nodeId" : "childIndex",
      message: `Updated child properties for ${child.name} (${child.id}) at index ${childIndex} in container ${container.name}`
    };
  }
  async function reorderChildren(container, params) {
    if (params.fromIndex === void 0 || params.toIndex === void 0) {
      throw new Error('Parameters "fromIndex" and "toIndex" are required for reorder_children operation');
    }
    const fromIndex = params.fromIndex;
    const toIndex = params.toIndex;
    if (fromIndex < 0 || fromIndex >= container.children.length) {
      throw new Error(`fromIndex ${fromIndex} is out of bounds (0-${container.children.length - 1})`);
    }
    if (toIndex < 0 || toIndex >= container.children.length) {
      throw new Error(`toIndex ${toIndex} is out of bounds (0-${container.children.length - 1})`);
    }
    const child = container.children[fromIndex];
    container.insertChild(toIndex, child);
    return {
      operation: "reorder_children",
      containerId: container.id,
      containerName: container.name,
      fromIndex,
      toIndex,
      childId: child.id,
      childName: child.name,
      message: `Moved ${child.name} from index ${fromIndex} to ${toIndex} in container ${container.name}`
    };
  }
  function setPaddingProperties(frame, params) {
    if (params.paddingTop !== void 0) {
      frame.paddingTop = params.paddingTop;
    }
    if (params.paddingRight !== void 0) {
      frame.paddingRight = params.paddingRight;
    }
    if (params.paddingBottom !== void 0) {
      frame.paddingBottom = params.paddingBottom;
    }
    if (params.paddingLeft !== void 0) {
      frame.paddingLeft = params.paddingLeft;
    }
  }
  function setAdvancedProperties(frame, params) {
    if (params.strokesIncludedInLayout !== void 0) {
      frame.strokesIncludedInLayout = params.strokesIncludedInLayout;
    }
    if (params.lastOnTop !== void 0) {
      frame.itemReverseZIndex = params.lastOnTop;
    }
  }
  function getLayoutSummary(frame) {
    const summary = {
      spacing: frame.itemSpacing,
      paddingTop: frame.paddingTop,
      paddingRight: frame.paddingRight,
      paddingBottom: frame.paddingBottom,
      paddingLeft: frame.paddingLeft,
      primaryAxisAlignItems: frame.primaryAxisAlignItems,
      counterAxisAlignItems: frame.counterAxisAlignItems,
      primaryAxisSizingMode: frame.primaryAxisSizingMode,
      counterAxisSizingMode: frame.counterAxisSizingMode,
      strokesIncludedInLayout: frame.strokesIncludedInLayout,
      itemReverseZIndex: frame.itemReverseZIndex
    };
    if (frame.layoutMode === "HORIZONTAL" || frame.layoutMode === "VERTICAL") {
      summary.layoutWrap = frame.layoutWrap;
      if (frame.layoutWrap === "WRAP") {
        summary.counterAxisSpacing = frame.counterAxisSpacing;
      }
    }
    if (frame.layoutMode === "GRID") {
      summary.gridRowCount = frame.gridRowCount;
      summary.gridColumnCount = frame.gridColumnCount;
      summary.gridRowGap = frame.gridRowGap;
      summary.gridColumnGap = frame.gridColumnGap;
    }
    return summary;
  }

  // src/operations/manage-boolean.ts
  var manage_boolean_exports = {};
  __export(manage_boolean_exports, {
    BOOLEAN_OPERATION: () => BOOLEAN_OPERATION
  });
  async function BOOLEAN_OPERATION(params) {
    return BaseOperation.executeOperation("booleanOperation", params, async () => {
      BaseOperation.validateParams(params, ["operation", "nodeIds"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        ["union", "subtract", "intersect", "exclude"]
      );
      const nodeIds = Array.isArray(params.nodeIds) ? params.nodeIds : [params.nodeIds];
      const preserveOriginal = params.preserveOriginal === true;
      if (nodeIds.length < 2) {
        throw new Error("Boolean operations require at least 2 nodes");
      }
      const nodes = [];
      for (const nodeId of nodeIds) {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (!("fills" in node) || node.type === "GROUP") {
          throw new Error(`Node ${nodeId} (${node.type}) does not support boolean operations`);
        }
        nodes.push(node);
      }
      const workingNodes = preserveOriginal ? nodes.map((node) => node.clone()) : nodes;
      let booleanNode;
      switch (operation) {
        case "union":
          booleanNode = figma.union(workingNodes, figma.currentPage);
          break;
        case "subtract":
          booleanNode = figma.subtract(workingNodes, figma.currentPage);
          break;
        case "intersect":
          booleanNode = figma.intersect(workingNodes, figma.currentPage);
          break;
        case "exclude":
          booleanNode = figma.exclude(workingNodes, figma.currentPage);
          break;
        default:
          throw new Error(`Unknown boolean operation: ${operation}`);
      }
      booleanNode.name = params.name || `Boolean ${operation}`;
      return formatNodeResponse(booleanNode, `Boolean ${operation} operation completed successfully`);
    });
  }

  // src/operations/manage-components.ts
  var manage_components_exports = {};
  __export(manage_components_exports, {
    MANAGE_COMPONENTS: () => MANAGE_COMPONENTS
  });
  async function MANAGE_COMPONENTS(params) {
    return BaseOperation.executeOperation("manageComponents", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const validOperations = ["create", "create_set", "update", "delete", "publish", "list", "get"];
      if (!validOperations.includes(params.operation)) {
        throw new Error(`Unknown component operation: ${params.operation}. Valid operations: ${validOperations.join(", ")}`);
      }
      switch (params.operation) {
        case "create":
          return await createComponent(params);
        case "create_set":
          return await createComponentSet(params);
        case "update":
          return await updateComponent(params);
        case "delete":
          return await deleteComponent(params);
        case "publish":
          return await publishComponent(params);
        case "list":
          return await listComponents(params);
        case "get":
          return await getComponent(params);
        default:
          throw new Error(`Unknown component operation: ${params.operation}`);
      }
    });
  }
  async function createComponent(params) {
    BaseOperation.validateParams(params, ["componentId"]);
    const node = findNodeById(params.componentId);
    if (!node) {
      throw new Error(`Node with ID ${params.componentId} not found`);
    }
    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
      throw new Error("Node is already a component or component set");
    }
    const component = figma.createComponentFromNode(node);
    if (params.name) component.name = params.name;
    if (params.description) component.description = params.description;
    return {
      componentId: component.id,
      name: component.name,
      type: component.type,
      description: component.description,
      message: `Successfully created component "${component.name}"`
    };
  }
  async function createComponentSet(params) {
    BaseOperation.validateParams(params, ["componentIds"]);
    if (!params.componentIds || params.componentIds.length === 0) {
      throw new Error("componentIds is required for create_set operation");
    }
    if (params.componentIds.length < 2) {
      throw new Error("At least 2 components are required to create a component set");
    }
    if (params.variantProperties) {
      if (params.variantProperties.length !== params.componentIds.length) {
        throw new Error(`variantProperties array length (${params.variantProperties.length}) must match componentIds array length (${params.componentIds.length})`);
      }
    }
    const components = [];
    for (const id of params.componentIds) {
      const componentNode = findNodeById(id);
      if (!componentNode) {
        throw new Error(`Component with ID ${id} not found`);
      }
      if (componentNode.type !== "COMPONENT") {
        throw new Error(`Node ${id} is not a component`);
      }
      components.push(componentNode);
    }
    const originalNames = components.map((comp) => comp.name);
    try {
      if (params.variantProperties) {
        for (let i = 0; i < components.length; i++) {
          const component = components[i];
          const variantString = params.variantProperties[i];
          if (params.name) {
            component.name = `${params.name}, ${variantString}`;
          } else {
            component.name = variantString;
          }
        }
      }
      const componentSet = figma.combineAsVariants(components, figma.currentPage);
      if (params.name) {
        componentSet.name = params.name;
      }
      const extractedVariantProperties = extractVariantPropertiesFromSet(componentSet);
      return {
        componentSetId: componentSet.id,
        name: componentSet.name,
        type: componentSet.type,
        componentCount: componentSet.children.length,
        componentIds: componentSet.children.map((child) => child.id),
        variantProperties: extractedVariantProperties,
        childComponents: componentSet.children.map((child) => ({
          id: child.id,
          name: child.name,
          variantProperties: child.variantProperties || {}
        })),
        appliedVariantStrings: params.variantProperties || [],
        message: `Successfully created component set "${componentSet.name}" with ${componentSet.children.length} variants`
      };
    } catch (error) {
      for (let i = 0; i < components.length; i++) {
        if (originalNames[i]) {
          components[i].name = originalNames[i];
        }
      }
      throw new Error(`Failed to create component set: ${error.toString()}`);
    }
  }
  async function updateComponent(params) {
    BaseOperation.validateParams(params, ["componentId"]);
    const node = findNodeById(params.componentId);
    if (!node) {
      throw new Error(`Node with ID ${params.componentId} not found`);
    }
    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
      return await updateComponentNode(node, params);
    } else {
      throw new Error(`Node ${params.componentId} must be a component or component set`);
    }
  }
  async function updateComponentNode(component, params) {
    if (params.name) component.name = params.name;
    if (params.description !== void 0) component.description = params.description;
    return {
      componentId: component.id,
      name: component.name,
      type: component.type,
      description: component.description,
      message: `Successfully updated ${component.type.toLowerCase()} "${component.name}"`
    };
  }
  async function deleteComponent(params) {
    BaseOperation.validateParams(params, ["componentId"]);
    const node = findNodeById(params.componentId);
    if (!node) {
      throw new Error(`Node with ID ${params.componentId} not found`);
    }
    if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") {
      throw new Error(`Node ${params.componentId} is not a component or component set (found: ${node.type})`);
    }
    const nodeName = node.name;
    const nodeType = node.type;
    let additionalInfo = {};
    node.remove();
    return {
      deletedNodeId: params.componentId,
      name: nodeName,
      type: nodeType,
      ...additionalInfo,
      message: `Successfully deleted ${nodeType.toLowerCase()} "${nodeName}"`
    };
  }
  async function publishComponent(params) {
    BaseOperation.validateParams(params, ["componentId"]);
    const component = findNodeById(params.componentId);
    if (!component) {
      throw new Error(`Node with ID ${params.componentId} not found`);
    }
    if (component.type !== "COMPONENT" && component.type !== "COMPONENT_SET") {
      throw new Error(`Node ${params.componentId} is not a component or component set`);
    }
    try {
      if (params.description) {
        component.description = params.description;
      }
      return {
        componentId: component.id,
        name: component.name,
        type: component.type,
        status: "ready_for_publishing",
        message: `Component "${component.name}" is ready for publishing to team library`
      };
    } catch (error) {
      throw new Error(`Failed to prepare component for publishing: ${error.toString()}`);
    }
  }
  async function listComponents(params) {
    const { includeInstances = false, filterType = "all" } = params;
    const components = [];
    const instances = [];
    function traverseNode(node) {
      if (node.type === "COMPONENT") {
        const comp = node;
        components.push({
          id: comp.id,
          name: comp.name,
          type: "COMPONENT",
          description: comp.description || "",
          parent: comp.parent?.name || "Page",
          instanceCount: comp.instances?.length || 0
        });
      } else if (node.type === "COMPONENT_SET") {
        const compSet = node;
        components.push({
          id: compSet.id,
          name: compSet.name,
          type: "COMPONENT_SET",
          description: compSet.description || "",
          parent: compSet.parent?.name || "Page",
          variantCount: compSet.children.length,
          componentPropertyDefinitions: compSet.componentPropertyDefinitions
        });
      } else if (node.type === "INSTANCE" && includeInstances) {
        const inst = node;
        instances.push({
          id: inst.id,
          name: inst.name,
          type: "INSTANCE",
          mainComponentId: inst.mainComponent?.id,
          mainComponentName: inst.mainComponent?.name || "Unknown",
          parent: inst.parent?.name || "Page"
        });
      }
      if ("children" in node) {
        for (const child of node.children) {
          traverseNode(child);
        }
      }
    }
    for (const page of figma.root.children) {
      traverseNode(page);
    }
    let filteredComponents = components;
    if (filterType === "components") {
      filteredComponents = components.filter((c) => c.type === "COMPONENT");
    } else if (filterType === "component_sets") {
      filteredComponents = components.filter((c) => c.type === "COMPONENT_SET");
    }
    const result = {
      components: filteredComponents,
      summary: {
        totalComponents: components.filter((c) => c.type === "COMPONENT").length,
        totalComponentSets: components.filter((c) => c.type === "COMPONENT_SET").length,
        totalFiltered: filteredComponents.length
      }
    };
    if (includeInstances) {
      result.instances = instances;
      result.summary.totalInstances = instances.length;
    }
    return result;
  }
  async function getComponent(params) {
    BaseOperation.validateParams(params, ["componentId"]);
    const node = findNodeById(params.componentId);
    if (!node) {
      throw new Error(`Node with ID ${params.componentId} not found`);
    }
    switch (node.type) {
      case "COMPONENT":
        return await getComponentDetails(node);
      case "COMPONENT_SET":
        return await getComponentSetDetails(node);
      default:
        throw new Error(`Node ${params.componentId} is not a component or component set (found: ${node.type})`);
    }
  }
  async function getComponentDetails(component) {
    try {
      const instances = await component.getInstancesAsync();
      const instanceIds = instances.map((inst) => inst.id);
      return {
        id: component.id,
        name: component.name,
        type: component.type,
        description: component.description || "",
        x: component.x,
        y: component.y,
        width: component.width,
        height: component.height,
        rotation: component.rotation || 0,
        // Figma API stores degrees directly
        opacity: component.opacity || 1,
        visible: component.visible !== false,
        locked: component.locked || false,
        // Component-specific fields
        instanceCount: instances.length,
        instanceIds,
        parentSet: component.parent?.type === "COMPONENT_SET" ? component.parent.id : void 0,
        variantProperties: component.variantProperties || void 0,
        message: `Component "${component.name}" retrieved with ${instances.length} instances`
      };
    } catch (error) {
      throw new Error(`Failed to get component details: ${error.toString()}`);
    }
  }
  async function getComponentSetDetails(componentSet) {
    try {
      const childComponents = componentSet.children.filter((child) => child.type === "COMPONENT");
      let totalInstanceCount = 0;
      for (const child of childComponents) {
        if (child.type === "COMPONENT") {
          const instances = await child.getInstancesAsync();
          totalInstanceCount += instances.length;
        }
      }
      return {
        id: componentSet.id,
        name: componentSet.name,
        type: componentSet.type,
        description: componentSet.description || "",
        x: componentSet.x,
        y: componentSet.y,
        width: componentSet.width,
        height: componentSet.height,
        rotation: componentSet.rotation || 0,
        // Figma API stores degrees directly
        opacity: componentSet.opacity || 1,
        visible: componentSet.visible !== false,
        locked: componentSet.locked || false,
        // Component set-specific fields
        variantProperties: componentSet.variantProperties,
        childComponents: childComponents.map((comp) => ({
          id: comp.id,
          name: comp.name,
          variantProperties: comp.variantProperties || {}
        })),
        instanceCount: totalInstanceCount,
        message: `Component set "${componentSet.name}" retrieved with ${childComponents.length} variants and ${totalInstanceCount} total instances`
      };
    } catch (error) {
      throw new Error(`Failed to get component set details: ${error.toString()}`);
    }
  }
  function extractVariantPropertiesFromSet(componentSet) {
    let variantProperties = {};
    try {
      const figmaVariantProps = componentSet.variantProperties;
      if (figmaVariantProps && Object.keys(figmaVariantProps).length > 0) {
        for (const [propName, propValue] of Object.entries(figmaVariantProps)) {
          if (typeof propValue === "string") {
            variantProperties[propName] = [propValue];
          }
        }
      } else {
        const componentNames = componentSet.children.map((child) => child.name);
        variantProperties = parseVariantPropertiesFromNames(componentNames);
      }
    } catch (error) {
      logger.warn("Failed to extract variant properties:", error);
    }
    return variantProperties;
  }
  function parseVariantPropertiesFromNames(componentNames) {
    const properties = {};
    for (const name of componentNames) {
      const pairs = name.split(",").map((pair) => pair.trim());
      for (const pair of pairs) {
        const equalIndex = pair.indexOf("=");
        if (equalIndex > 0) {
          const propName = pair.substring(0, equalIndex).trim();
          const propValue = pair.substring(equalIndex + 1).trim();
          if (!properties[propName]) {
            properties[propName] = /* @__PURE__ */ new Set();
          }
          properties[propName].add(propValue);
        }
      }
    }
    const result = {};
    for (const [propName, valueSet] of Object.entries(properties)) {
      result[propName] = Array.from(valueSet).sort();
    }
    return result;
  }

  // src/operations/manage-constraints.ts
  var manage_constraints_exports = {};
  __export(manage_constraints_exports, {
    MANAGE_CONSTRAINTS: () => MANAGE_CONSTRAINTS
  });

  // src/utils/parameter-utils.ts
  function unwrapArrayParam(param) {
    return Array.isArray(param) ? param[0] : param;
  }
  function cleanStyleId(id) {
    return id?.replace(/,$/, "") || id;
  }

  // src/operations/manage-constraints.ts
  async function MANAGE_CONSTRAINTS(params) {
    return BaseOperation.executeOperation("manageConstraints", params, async () => {
      BaseOperation.validateParams(params, ["operation", "nodeId"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        ["get", "set", "reset"]
      );
      const nodeId = unwrapArrayParam(params.nodeId);
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }
      switch (operation) {
        case "get":
          return await getConstraints(node);
        case "set":
          return await setConstraints(node, params);
        case "reset":
          return await resetConstraints(node);
        default:
          throw new Error(`Unknown constraints operation: ${operation}`);
      }
    });
  }
  async function setConstraints(node, params) {
    if (!("constraints" in node)) {
      throw new Error(`Node type ${node.type} does not support constraints`);
    }
    const constraints = Object.assign({}, node.constraints);
    const horizontal = unwrapArrayParam(params.horizontalConstraint);
    const vertical = unwrapArrayParam(params.verticalConstraint);
    if (horizontal) {
      const validHorizontal = ["MIN", "MAX", "STRETCH", "CENTER", "SCALE"];
      if (!validHorizontal.includes(horizontal)) {
        throw new Error(`Invalid horizontal constraint: ${horizontal}. Valid values: ${validHorizontal.join(", ")}`);
      }
      constraints.horizontal = horizontal;
    }
    if (vertical) {
      const validVertical = ["MIN", "MAX", "STRETCH", "CENTER", "SCALE"];
      if (!validVertical.includes(vertical)) {
        throw new Error(`Invalid vertical constraint: ${vertical}. Valid values: ${validVertical.join(", ")}`);
      }
      constraints.vertical = vertical;
    }
    node.constraints = constraints;
    return {
      operation: "set",
      nodeId: node.id,
      name: node.name,
      horizontalConstraint: constraints.horizontal,
      verticalConstraint: constraints.vertical,
      message: `Set constraints for node: ${node.name}`
    };
  }
  async function getConstraints(node) {
    const parent = node.parent;
    return {
      operation: "get",
      nodeId: node.id,
      name: node.name,
      nodeType: node.type,
      supportsConstraints: "constraints" in node,
      x: "x" in node ? node.x : 0,
      y: "y" in node ? node.y : 0,
      width: "width" in node ? node.width : 0,
      height: "height" in node ? node.height : 0,
      parentName: parent?.name || "Unknown",
      parentType: parent?.type || "Unknown",
      parentWidth: parent && "width" in parent ? parent.width : null,
      parentHeight: parent && "height" in parent ? parent.height : null,
      horizontalConstraint: "constraints" in node ? node.constraints.horizontal : null,
      verticalConstraint: "constraints" in node ? node.constraints.vertical : null
    };
  }
  async function resetConstraints(node) {
    if (!("constraints" in node)) {
      throw new Error(`Node type ${node.type} does not support constraints`);
    }
    node.constraints = {
      horizontal: "MIN",
      vertical: "MIN"
    };
    return {
      operation: "reset",
      nodeId: node.id,
      name: node.name,
      horizontalConstraint: "MIN",
      verticalConstraint: "MIN",
      message: `Reset constraints for node: ${node.name}`
    };
  }

  // src/operations/manage-dev-resources.ts
  var manage_dev_resources_exports = {};
  __export(manage_dev_resources_exports, {
    DEV_RESOURCE_OPERATION: () => DEV_RESOURCE_OPERATION
  });
  async function DEV_RESOURCE_OPERATION(params) {
    return BaseOperation.executeOperation("devResourceOperation", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        ["generate_css", "set_dev_status", "add_dev_link", "remove_dev_link", "get_dev_resources"]
      );
      switch (operation) {
        case "generate_css":
          return await generateCss(params);
        case "set_dev_status":
          return await setDevStatus(params);
        case "add_dev_link":
          return await addDevLink(params);
        case "remove_dev_link":
          return await removeDevLink(params);
        case "get_dev_resources":
          return await getDevResources(params);
        default:
          throw new Error(`Unknown dev resource operation: ${operation}`);
      }
    });
  }
  async function generateCss(params) {
    if (!params.nodeId) {
      throw new Error("nodeId parameter is required for generate_css operation");
    }
    const node = findNodeById(params.nodeId);
    if (!node) {
      throw new Error(`Node ${params.nodeId} not found`);
    }
    const cssOptions = params.cssOptions || {};
    const includeChildren = cssOptions.includeChildren || false;
    const includeComments = cssOptions.includeComments !== false;
    const useFlexbox = cssOptions.useFlexbox !== false;
    let css = "";
    if (includeComments) {
      css += `/* CSS for ${node.name} (${node.type}) */
`;
    }
    const className = node.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    css += `.${className} {
`;
    if ("width" in node && "height" in node) {
      css += `  width: ${node.width}px;
`;
      css += `  height: ${node.height}px;
`;
    }
    if ("fills" in node && node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === "SOLID") {
        const { r, g, b, a } = fill.color;
        const alpha = fill.opacity !== void 0 ? fill.opacity : a || 1;
        if (alpha === 1) {
          css += `  background: rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)});
`;
        } else {
          css += `  background: rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha});
`;
        }
      }
    }
    if (useFlexbox && "layoutMode" in node && node.layoutMode !== "NONE") {
      css += `  display: flex;
`;
      css += `  flex-direction: ${node.layoutMode === "HORIZONTAL" ? "row" : "column"};
`;
      if ("itemSpacing" in node) {
        css += `  gap: ${node.itemSpacing}px;
`;
      }
    }
    css += `}
`;
    return {
      operation: "generate_css",
      nodeId: node.id,
      nodeName: node.name,
      css,
      cssOptions: {
        includeChildren,
        includeComments,
        useFlexbox
      },
      message: `Generated CSS for node: ${node.name}`
    };
  }
  async function setDevStatus(params) {
    if (!params.nodeId) {
      throw new Error("nodeId parameter is required for set_dev_status operation");
    }
    if (!params.status) {
      throw new Error("status parameter is required for set_dev_status operation");
    }
    const node = findNodeById(params.nodeId);
    if (!node) {
      throw new Error(`Node ${params.nodeId} not found`);
    }
    const validStatuses = ["ready_for_dev", "in_progress", "dev_complete"];
    if (!validStatuses.includes(params.status)) {
      throw new Error(`Invalid status: ${params.status}. Valid statuses: ${validStatuses.join(", ")}`);
    }
    return {
      operation: "set_dev_status",
      nodeId: node.id,
      nodeName: node.name,
      status: params.status,
      message: `Set dev status to "${params.status}" for node: ${node.name}`,
      note: "Dev status setting requires Figma desktop app with dev mode for full functionality"
    };
  }
  async function addDevLink(params) {
    if (!params.nodeId) {
      throw new Error("nodeId parameter is required for add_dev_link operation");
    }
    if (!params.linkUrl) {
      throw new Error("linkUrl parameter is required for add_dev_link operation");
    }
    const node = findNodeById(params.nodeId);
    if (!node) {
      throw new Error(`Node ${params.nodeId} not found`);
    }
    const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      operation: "add_dev_link",
      nodeId: node.id,
      nodeName: node.name,
      linkId,
      linkUrl: params.linkUrl,
      linkTitle: params.linkTitle || params.linkUrl,
      message: `Added dev link "${params.linkTitle || params.linkUrl}" to node: ${node.name}`,
      note: "Dev link management requires Figma desktop app with dev mode for full functionality"
    };
  }
  async function removeDevLink(params) {
    if (!params.linkId) {
      throw new Error("linkId parameter is required for remove_dev_link operation");
    }
    return {
      operation: "remove_dev_link",
      linkId: params.linkId,
      message: `Removed dev link with ID: ${params.linkId}`,
      note: "Dev link management requires Figma desktop app with dev mode for full functionality"
    };
  }
  async function getDevResources(params) {
    if (!params.nodeId) {
      throw new Error("nodeId parameter is required for get_dev_resources operation");
    }
    const node = findNodeById(params.nodeId);
    if (!node) {
      throw new Error(`Node ${params.nodeId} not found`);
    }
    return {
      operation: "get_dev_resources",
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      devResources: {
        status: "unknown",
        links: [],
        specs: {
          width: "width" in node ? node.width : null,
          height: "height" in node ? node.height : null,
          x: "x" in node ? node.x : null,
          y: "y" in node ? node.y : null
        }
      },
      message: `Retrieved dev resources for node: ${node.name}`,
      note: "Full dev resource information requires Figma desktop app with dev mode"
    };
  }

  // src/operations/manage-effects.ts
  var manage_effects_exports = {};
  __export(manage_effects_exports, {
    CREATE_EFFECT: () => CREATE_EFFECT,
    DELETE_EFFECT: () => DELETE_EFFECT,
    DUPLICATE_EFFECT: () => DUPLICATE_EFFECT,
    GET_EFFECTS: () => GET_EFFECTS,
    REORDER_EFFECT: () => REORDER_EFFECT,
    UPDATE_EFFECT: () => UPDATE_EFFECT
  });
  init_color_utils();
  init_figma_property_utils();
  async function CREATE_EFFECT(params) {
    return BaseOperation.executeOperation("createEffect", params, async () => {
      BaseOperation.validateParams(params, ["owner", "effectType"]);
      const { owner, effectType } = params;
      const target = await getEffectTarget(owner);
      if ("effectStyleId" in target && target.effectStyleId) {
        target.effectStyleId = "";
      }
      const effect = buildEffectFromParams(effectType, params);
      modifyEffects(target, (manager) => manager.push(effect));
      return {
        message: "Effect created successfully",
        effectId: `effect-${Date.now()}`,
        type: effectType,
        owner
      };
    });
  }
  async function UPDATE_EFFECT(params) {
    return BaseOperation.executeOperation("updateEffect", params, async () => {
      BaseOperation.validateParams(params, ["owner", "effectIndex"]);
      const { owner, effectIndex } = params;
      const target = await getEffectTarget(owner);
      const hadEffectStyle = "effectStyleId" in target && target.effectStyleId;
      if (hadEffectStyle) {
        target.effectStyleId = "";
      }
      const effects = target.effects || [];
      if (effectIndex >= effects.length || effectIndex < 0) {
        throw new Error(`Effect index ${effectIndex} out of bounds. Available indices: 0-${effects.length - 1}`);
      }
      modifyEffects(target, (manager) => {
        const existingEffect = manager.get(effectIndex);
        const updatedEffect = updateEffectWithParams(existingEffect, params);
        manager.update(effectIndex, updatedEffect);
      });
      return {
        message: "Effect updated successfully",
        effectIndex,
        owner,
        ...hadEffectStyle && { note: "Effect style linkage removed to allow direct modification" }
      };
    });
  }
  async function DELETE_EFFECT(params) {
    return BaseOperation.executeOperation("deleteEffect", params, async () => {
      BaseOperation.validateParams(params, ["owner", "effectIndex"]);
      const { owner, effectIndex } = params;
      const target = await getEffectTarget(owner);
      if ("effectStyleId" in target && target.effectStyleId) {
        target.effectStyleId = "";
      }
      const effects = target.effects || [];
      if (effectIndex >= effects.length || effectIndex < 0) {
        throw new Error(`Effect index ${effectIndex} out of bounds. Available indices: 0-${effects.length - 1}`);
      }
      let deletedEffect;
      modifyEffects(target, (manager) => {
        deletedEffect = manager.get(effectIndex);
        manager.remove(effectIndex);
      });
      return {
        message: "Effect deleted successfully",
        deletedEffect: deletedEffect.type,
        effectIndex,
        owner
      };
    });
  }
  async function GET_EFFECTS(params) {
    return BaseOperation.executeOperation("getEffects", params, async () => {
      BaseOperation.validateParams(params, ["owner"]);
      const { owner } = params;
      const target = await getEffectTarget(owner);
      const effects = target.effects || [];
      return {
        message: "Effects retrieved successfully",
        owner,
        effects: effects.map((effect, index) => {
          const baseEffect = {
            index,
            effectType: effect.type,
            visible: effect.visible
          };
          if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
            return {
              ...baseEffect,
              color: effect.color ? `#${Math.round(effect.color.r * 255).toString(16).padStart(2, "0")}${Math.round(effect.color.g * 255).toString(16).padStart(2, "0")}${Math.round(effect.color.b * 255).toString(16).padStart(2, "0")}` : void 0,
              opacity: effect.color?.a,
              offsetX: effect.offset?.x,
              offsetY: effect.offset?.y,
              radius: effect.radius,
              spread: effect.spread,
              blendMode: effect.blendMode,
              ...effect.type === "DROP_SHADOW" && { showShadowBehindNode: effect.showShadowBehindNode }
            };
          }
          if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
            return {
              ...baseEffect,
              radius: effect.radius
            };
          }
          if (effect.type === "NOISE") {
            const noiseEffect = {
              ...baseEffect,
              size: effect.noiseSize,
              density: effect.density,
              noiseType: effect.noiseType
            };
            if (effect.color) {
              noiseEffect.color = `#${Math.round(effect.color.r * 255).toString(16).padStart(2, "0")}${Math.round(effect.color.g * 255).toString(16).padStart(2, "0")}${Math.round(effect.color.b * 255).toString(16).padStart(2, "0")}`;
              noiseEffect.opacity = effect.color.a;
            }
            if (effect.secondaryColor) {
              noiseEffect.secondaryColor = `#${Math.round(effect.secondaryColor.r * 255).toString(16).padStart(2, "0")}${Math.round(effect.secondaryColor.g * 255).toString(16).padStart(2, "0")}${Math.round(effect.secondaryColor.b * 255).toString(16).padStart(2, "0")}`;
              noiseEffect.secondaryOpacity = effect.secondaryColor.a;
            }
            if (effect.noiseType === "MULTITONE" && effect.opacity !== void 0) {
              noiseEffect.opacity = effect.opacity;
            }
            return noiseEffect;
          }
          if (effect.type === "TEXTURE") {
            return {
              ...baseEffect,
              size: effect.noiseSize,
              radius: effect.radius,
              clipToShape: effect.clipToShape
            };
          }
          return baseEffect;
        })
      };
    });
  }
  async function REORDER_EFFECT(params) {
    return BaseOperation.executeOperation("reorderEffect", params, async () => {
      BaseOperation.validateParams(params, ["owner", "effectIndex", "newIndex"]);
      const { owner, effectIndex, newIndex } = params;
      const target = await getEffectTarget(owner);
      if ("effectStyleId" in target && target.effectStyleId) {
        target.effectStyleId = "";
      }
      const effects = target.effects || [];
      if (effectIndex >= effects.length || effectIndex < 0) {
        throw new Error(`Effect index ${effectIndex} out of bounds. Available indices: 0-${effects.length - 1}`);
      }
      if (newIndex >= effects.length || newIndex < 0) {
        throw new Error(`New index ${newIndex} out of bounds. Available indices: 0-${effects.length - 1}`);
      }
      modifyEffects(target, (manager) => {
        manager.move(effectIndex, newIndex);
      });
      return {
        message: "Effect reordered successfully",
        effectIndex,
        newIndex,
        owner
      };
    });
  }
  async function DUPLICATE_EFFECT(params) {
    return BaseOperation.executeOperation("duplicateEffect", params, async () => {
      BaseOperation.validateParams(params, ["owner", "effectIndex", "newIndex"]);
      const { owner, effectIndex, newIndex } = params;
      const target = await getEffectTarget(owner);
      if ("effectStyleId" in target && target.effectStyleId) {
        target.effectStyleId = "";
      }
      const effects = target.effects || [];
      if (effectIndex >= effects.length || effectIndex < 0) {
        throw new Error(`Effect index ${effectIndex} out of bounds. Available indices: 0-${effects.length - 1}`);
      }
      if (newIndex > effects.length || newIndex < 0) {
        throw new Error(`New index ${newIndex} out of bounds. Available indices: 0-${effects.length}`);
      }
      modifyEffects(target, (manager) => {
        manager.duplicate(effectIndex, newIndex);
      });
      return {
        message: "Effect duplicated successfully",
        sourceIndex: effectIndex,
        newIndex,
        owner
      };
    });
  }
  async function getEffectTarget(owner) {
    const [ownerType, ...idParts] = owner.split(":");
    const id = idParts.join(":");
    if (ownerType === "node") {
      const node = await findNodeById(id);
      if (!node) {
        throw new Error(`Node with ID ${id} not found`);
      }
      return node;
    } else if (ownerType === "style") {
      const cleanId = cleanStyleId(id);
      const effectStyles = figma.getLocalEffectStyles();
      const style = effectStyles.find((s) => cleanStyleId(s.id) === cleanId);
      if (!style) {
        throw new Error(`Effect style with ID ${cleanId} not found`);
      }
      return style;
    } else {
      throw new Error(`Invalid owner type: ${ownerType}. Expected 'node' or 'style'`);
    }
  }
  function buildEffectFromParams(effectType, params) {
    const baseEffect = {
      type: effectType,
      visible: params.visible !== void 0 ? params.visible : true
    };
    switch (effectType) {
      case "DROP_SHADOW":
        const dropShadowColor = params.color ? hexToRgba2(params.color) : { r: 0, g: 0, b: 0, a: 0.25 };
        if (params.opacity !== void 0) {
          dropShadowColor.a = params.opacity;
        }
        return {
          ...baseEffect,
          color: dropShadowColor,
          offset: {
            x: params.offsetX !== void 0 ? params.offsetX : 0,
            y: params.offsetY !== void 0 ? params.offsetY : 2
          },
          radius: params.radius !== void 0 ? params.radius : 4,
          spread: params.spread !== void 0 ? params.spread : 0,
          blendMode: params.blendMode || "NORMAL",
          ...params.showShadowBehindNode !== void 0 && { showShadowBehindNode: params.showShadowBehindNode }
        };
      case "INNER_SHADOW":
        const innerShadowColor = params.color ? hexToRgba2(params.color) : { r: 0, g: 0, b: 0, a: 0.25 };
        if (params.opacity !== void 0) {
          innerShadowColor.a = params.opacity;
        }
        return {
          ...baseEffect,
          color: innerShadowColor,
          offset: {
            x: params.offsetX !== void 0 ? params.offsetX : 0,
            y: params.offsetY !== void 0 ? params.offsetY : 2
          },
          radius: params.radius !== void 0 ? params.radius : 4,
          spread: params.spread !== void 0 ? params.spread : 0,
          blendMode: params.blendMode || "NORMAL"
        };
      case "LAYER_BLUR":
      case "BACKGROUND_BLUR":
        return {
          ...baseEffect,
          radius: params.radius !== void 0 ? params.radius : 4
        };
      case "NOISE":
        const noiseType = params.noiseType || "MONOTONE";
        const noiseEffect = {
          ...baseEffect,
          noiseSize: params.size !== void 0 ? params.size : 1,
          density: params.density !== void 0 ? params.density : 0.5,
          noiseType,
          color: params.color ? hexToRgba2(params.color) : { r: 0, g: 0, b: 0, a: 1 }
        };
        if (noiseType === "DUOTONE") {
          noiseEffect.secondaryColor = params.secondaryColor ? hexToRgba2(params.secondaryColor) : { r: 1, g: 1, b: 1, a: 1 };
        } else if (noiseType === "MULTITONE") {
          noiseEffect.opacity = params.opacity !== void 0 ? params.opacity : 1;
        }
        return noiseEffect;
      case "TEXTURE":
        return {
          ...baseEffect,
          noiseSize: params.size !== void 0 ? params.size : 1,
          radius: params.radius !== void 0 ? params.radius : 4,
          clipToShape: params.clipToShape !== void 0 ? params.clipToShape : true
        };
      default:
        throw new Error(`Unsupported effect type: ${effectType}`);
    }
  }
  function updateEffectWithParams(existingEffect, params) {
    const effectType = existingEffect.type;
    let effectColor = params.color;
    if (!effectColor && existingEffect.color) {
      const r = Math.round(existingEffect.color.r * 255).toString(16).padStart(2, "0");
      const g = Math.round(existingEffect.color.g * 255).toString(16).padStart(2, "0");
      const b = Math.round(existingEffect.color.b * 255).toString(16).padStart(2, "0");
      let alpha = existingEffect.color.a;
      if (params.opacity !== void 0) {
        alpha = params.opacity;
      }
      const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
      effectColor = `#${r}${g}${b}${a}`;
    }
    const mergedParams = {
      effectType,
      visible: params.visible !== void 0 ? params.visible : existingEffect.visible,
      color: effectColor,
      offsetX: params.offsetX !== void 0 ? params.offsetX : existingEffect.offset?.x || 0,
      offsetY: params.offsetY !== void 0 ? params.offsetY : existingEffect.offset?.y || 0,
      radius: params.radius !== void 0 ? params.radius : existingEffect.radius,
      spread: params.spread !== void 0 ? params.spread : existingEffect.spread,
      blendMode: params.blendMode || existingEffect.blendMode,
      showShadowBehindNode: params.showShadowBehindNode !== void 0 ? params.showShadowBehindNode : existingEffect.showShadowBehindNode,
      size: params.size !== void 0 ? params.size : existingEffect.noiseSize,
      density: params.density !== void 0 ? params.density : existingEffect.density,
      noiseType: params.noiseType || existingEffect.noiseType,
      secondaryColor: params.secondaryColor || existingEffect.secondaryColor,
      opacity: params.opacity !== void 0 ? params.opacity : existingEffect.opacity,
      clipToShape: params.clipToShape !== void 0 ? params.clipToShape : existingEffect.clipToShape
    };
    return buildEffectFromParams(effectType, mergedParams);
  }
  function hexToRgba2(hex) {
    const parsed = parseHexColor(hex);
    const rgb = hexToRgb(parsed.rgb);
    return {
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      a: parsed.alpha
    };
  }

  // src/operations/manage-exports.ts
  var manage_exports_exports = {};
  __export(manage_exports_exports, {
    EXPORT_BULK: () => EXPORT_BULK,
    EXPORT_NODE: () => EXPORT_NODE,
    EXPORT_SINGLE: () => EXPORT_SINGLE
  });
  async function EXPORT_SINGLE(params) {
    return BaseOperation.executeOperation("exportSingle", params, async () => {
      const nodeId = params.id;
      BaseOperation.validateParams({ ...params, nodeId }, ["nodeId"]);
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found or is not exportable`);
      }
      if (!("exportAsync" in node) || typeof node.exportAsync !== "function") {
        throw new Error(`Node type '${node.type}' does not support export operations. Only scene nodes (frames, groups, components, etc.) can be exported.`);
      }
      const format = BaseOperation.validateStringParam(
        params.format || "PNG",
        "format",
        ["PNG", "JPG", "SVG", "PDF"]
      );
      const exportSettings = buildExportSettings(params, format);
      try {
        const exportedData = await node.exportAsync(exportSettings);
        const base64Data = figma.base64Encode(exportedData);
        const filename = generateFilename2(node, format, params);
        return {
          nodeId,
          nodeName: node.name,
          format,
          settings: exportSettings,
          data: base64Data,
          dataFormat: "base64",
          filename,
          size: exportedData.length,
          message: `Successfully exported ${node.type} "${node.name}" as ${format}`
        };
      } catch (error) {
        throw new Error(`Export failed: ${error.toString()}`);
      }
    });
  }
  async function EXPORT_NODE(params) {
    return BaseOperation.executeOperation("exportNode", params, async () => {
      const nodeId = params.id;
      BaseOperation.validateParams({ ...params, nodeId }, ["nodeId"]);
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found or is not exportable`);
      }
      if (!("exportAsync" in node) || typeof node.exportAsync !== "function") {
        throw new Error(`Node type '${node.type}' does not support export operations. Only scene nodes (frames, groups, components, etc.) can be exported.`);
      }
      const format = BaseOperation.validateStringParam(
        params.format || "PNG",
        "format",
        ["PNG", "JPG", "SVG", "PDF"]
      );
      const exportSettings = buildExportSettings(params, format);
      try {
        const exportedData = await node.exportAsync(exportSettings);
        const base64Data = figma.base64Encode(exportedData);
        const filename = generateFilename2(node, format, params);
        return {
          nodeId,
          nodeName: node.name,
          format,
          settings: exportSettings,
          data: base64Data,
          dataFormat: "base64",
          filename,
          size: exportedData.length,
          message: `Successfully exported ${node.type} "${node.name}" as ${format}`
        };
      } catch (error) {
        throw new Error(`Export failed: ${error.toString()}`);
      }
    });
  }
  async function EXPORT_BULK(params) {
    return BaseOperation.executeOperation("exportBulk", params, async () => {
      const nodeIds = params.id;
      BaseOperation.validateParams({ ...params, nodeIds }, ["nodeIds"]);
      const nodeIdList = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
      const format = BaseOperation.validateStringParam(
        params.format || "PNG",
        "format",
        ["PNG", "JPG", "SVG", "PDF"]
      );
      const results = [];
      const failures = [];
      const exportSettings = buildExportSettings(params, format);
      for (const nodeId of nodeIdList) {
        try {
          const node = findNodeById(nodeId);
          if (!node) {
            failures.push({
              nodeId,
              error: "Node not found"
            });
            continue;
          }
          if (!("exportAsync" in node) || typeof node.exportAsync !== "function") {
            failures.push({
              nodeId,
              nodeName: node.name,
              error: `Node type '${node.type}' does not support export`
            });
            continue;
          }
          const exportedData = await node.exportAsync(exportSettings);
          const base64Data = figma.base64Encode(exportedData);
          const filename = generateFilename2(node, format, params);
          results.push({
            nodeId,
            nodeName: node.name,
            nodeType: node.type,
            format,
            data: base64Data,
            dataFormat: "base64",
            filename,
            size: exportedData.length
          });
        } catch (error) {
          failures.push({
            nodeId,
            error: error.toString()
          });
        }
      }
      return {
        results,
        failures,
        summary: {
          total: nodeIdList.length,
          successful: results.length,
          failed: failures.length
        },
        format,
        settings: exportSettings,
        message: `Bulk export completed: ${results.length} successful, ${failures.length} failed`
      };
    });
  }
  function buildExportSettings(params, format) {
    const settings = {
      format
    };
    if (params.scale && params.scale !== 1) {
      settings.constraint = {
        type: "SCALE",
        value: params.scale
      };
    } else if (params.width || params.height) {
      if (params.width && params.height) {
        settings.constraint = {
          type: "WIDTH_AND_HEIGHT",
          value: { width: params.width, height: params.height }
        };
      } else if (params.width) {
        settings.constraint = {
          type: "WIDTH",
          value: params.width
        };
      } else {
        settings.constraint = {
          type: "HEIGHT",
          value: params.height
        };
      }
    }
    if (format === "PNG" && params.useAbsoluteBounds !== void 0) {
      settings.useAbsoluteBounds = params.useAbsoluteBounds;
    }
    if (format === "SVG") {
      if (params.svgIdAttribute !== void 0) {
        settings.svgIdAttribute = params.svgIdAttribute;
      }
      if (params.svgSimplifyStroke !== void 0) {
        settings.svgSimplifyStroke = params.svgSimplifyStroke;
      }
    }
    return settings;
  }
  function generateFilename2(node, format, params) {
    const sanitizedName = node.name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_").replace(/_{2,}/g, "_").replace(/^_|_$/g, "");
    const baseName = sanitizedName || `node_${node.id}`;
    let suffix = "";
    if (params.scale && params.scale !== 1) {
      suffix = `_${params.scale}x`;
    }
    if (params.suffix) {
      suffix += `_${params.suffix}`;
    }
    const extension = format.toLowerCase();
    return `${baseName}${suffix}.${extension}`;
  }

  // src/operations/manage-fills.ts
  var manage_fills_exports = {};
  __export(manage_fills_exports, {
    MANAGE_FILLS: () => MANAGE_FILLS
  });
  init_color_utils();
  init_figma_property_utils();
  init_logger();

  // src/utils/fill-utils.ts
  var FILL_DEFAULTS = {
    opacity: 1,
    visible: true,
    blendMode: "NORMAL"
  };
  var ERROR_MESSAGES = {
    NODE_NOT_FOUND: (nodeId) => `Node not found: ${nodeId}`,
    NODE_NO_FILLS: (nodeId) => `Node ${nodeId} does not support fills`,
    NODE_MIXED_FILLS: (nodeId) => `Node ${nodeId} has mixed fills`,
    FILL_INDEX_OUT_OF_BOUNDS: (index, max) => `Fill index ${index} out of bounds (0-${max})`,
    FILL_INDEX_REQUIRED: (nodeId, fillCount) => `Node ${nodeId} has ${fillCount} fills. Please specify fillIndex (0-${fillCount - 1}) to update a specific fill.`,
    NO_FILLS_TO_UPDATE: (nodeId) => `Node ${nodeId} has no fills to update`,
    UNKNOWN_OPERATION: (operation) => `Unknown fill operation: ${operation}`,
    INVALID_FILL_TYPE: (index, actualType, expectedType) => `Fill at index ${index} is not a ${expectedType} fill (type: ${actualType}). Use ${expectedType === "solid" ? "update_solid" : expectedType === "gradient" ? "update_gradient" : "update_image"} for ${actualType} fill types.`,
    MISSING_IMAGE_SOURCE: () => "Must provide imageUrl, imagePath, imageHash, or imageBytes",
    MISMATCHED_STOP_ARRAYS: () => "stopPositions and stopColors arrays must have the same length"
  };
  function validateNodeForFills(nodeId) {
    const node = figma.getNodeById(nodeId);
    if (!node) {
      throw new Error(ERROR_MESSAGES.NODE_NOT_FOUND(nodeId));
    }
    if (!("fills" in node)) {
      throw new Error(ERROR_MESSAGES.NODE_NO_FILLS(nodeId));
    }
    const fills = node.fills;
    if (!Array.isArray(fills)) {
      throw new Error(ERROR_MESSAGES.NODE_MIXED_FILLS(nodeId));
    }
    return { node, fills };
  }
  function resolveFillIndex(params, fills) {
    let fillIndex;
    if (params.fillIndex !== void 0 && params.fillIndex !== null) {
      fillIndex = params.fillIndex;
    } else {
      if (fills.length === 0) {
        throw new Error(ERROR_MESSAGES.NO_FILLS_TO_UPDATE(params.nodeId));
      } else if (fills.length === 1) {
        fillIndex = 0;
      } else {
        throw new Error(ERROR_MESSAGES.FILL_INDEX_REQUIRED(params.nodeId, fills.length));
      }
    }
    if (fillIndex < 0 || fillIndex >= fills.length) {
      throw new Error(ERROR_MESSAGES.FILL_INDEX_OUT_OF_BOUNDS(fillIndex, fills.length - 1));
    }
    return fillIndex;
  }
  function validateFillType(fills, fillIndex, expectedType) {
    const currentFill = fills[fillIndex];
    if (currentFill.type !== expectedType.toUpperCase()) {
      throw new Error(ERROR_MESSAGES.INVALID_FILL_TYPE(
        fillIndex,
        currentFill.type,
        expectedType.toLowerCase()
      ));
    }
  }
  function validateImageSource(params) {
    if (!params.imageUrl && !params.imagePath && !params.imageHash && !params.imageBytes) {
      throw new Error(ERROR_MESSAGES.MISSING_IMAGE_SOURCE());
    }
  }
  function validateGradientStops(stopPositions, stopColors) {
    if (stopPositions && stopColors && stopPositions.length !== stopColors.length) {
      throw new Error(ERROR_MESSAGES.MISMATCHED_STOP_ARRAYS());
    }
  }
  async function createFillOperationResponse(nodeId, fillIndex, updatedFill, totalFills, additionalData) {
    const baseResponse = {
      nodeId,
      ...fillIndex !== void 0 && { fillIndex },
      ...updatedFill && { updatedFill },
      ...totalFills !== void 0 && { totalFills },
      ...additionalData
    };
    return await cleanEmptyPropertiesAsync(baseResponse) || baseResponse;
  }
  async function createFillListResponse(nodeId, fills, filteredCount, filterType) {
    const response = {
      nodeId,
      fills,
      totalFills: fills.length,
      ...filteredCount !== void 0 && { filteredCount },
      ...filterType && { filterType }
    };
    return await cleanEmptyPropertiesAsync(response) || response;
  }
  async function createFillAddResponse(nodeId, fillAdded, insertIndex, totalFills) {
    const response = {
      nodeId,
      fillAdded,
      insertIndex,
      totalFills
    };
    return await cleanEmptyPropertiesAsync(response) || response;
  }
  async function createFillUpdateResponse(nodeId, fillIndex, updatedFill, totalFills) {
    return createFillOperationResponse(nodeId, fillIndex, updatedFill, totalFills);
  }

  // src/utils/paint-properties.ts
  function applyCommonPaintProperties(paint, params) {
    if (params.opacity !== void 0) paint.opacity = params.opacity;
    if (params.visible !== void 0) paint.visible = params.visible;
    if (params.blendMode) paint.blendMode = params.blendMode;
  }
  function setDefaultPaintProperties(paint) {
    if (paint.opacity === void 0) paint.opacity = FILL_DEFAULTS.opacity;
    if (paint.visible === void 0) paint.visible = FILL_DEFAULTS.visible;
    if (!paint.blendMode) paint.blendMode = FILL_DEFAULTS.blendMode;
  }
  function normalizeToArray(value) {
    return Array.isArray(value) ? value : [value];
  }
  function createBasePaint(type, params) {
    const basePaint = {
      type
    };
    setDefaultPaintProperties(basePaint);
    applyCommonPaintProperties(basePaint, params);
    return basePaint;
  }

  // src/utils/bulk-operations.ts
  function handleBulkError(error, nodeId, results) {
    results.push({
      nodeId,
      error: error.toString()
    });
  }
  function createBulkSummary(results, totalNodes) {
    const successfulNodes = results.filter((r) => !r.error).length;
    const failedNodes = results.filter((r) => r.error).length;
    return {
      results,
      totalNodes,
      processedNodes: results.length,
      successfulNodes,
      failedNodes
    };
  }

  // src/operations/manage-fills.ts
  async function formatFillResponse(responseData) {
    return await cleanEmptyPropertiesAsync(responseData) || responseData;
  }
  function applyScaleModeAwareTransforms(imageHash, scaleMode, params, existingPaint) {
    const transformParams = {
      transformOffsetX: params.transformOffsetX,
      transformOffsetY: params.transformOffsetY,
      transformScale: params.transformScale,
      transformScaleX: params.transformScaleX,
      transformScaleY: params.transformScaleY,
      transformRotation: params.transformRotation,
      transformSkewX: params.transformSkewX,
      transformSkewY: params.transformSkewY,
      imageTransform: params.imageTransform
      // Allow explicit matrix override
    };
    const { paint: transformedPaint, warnings } = createImagePaint2(
      imageHash,
      scaleMode,
      transformParams
    );
    if (existingPaint) {
      const updatedPaint = clone(existingPaint);
      updatedPaint.scaleMode = transformedPaint.scaleMode;
      if ("imageTransform" in transformedPaint) {
        updatedPaint.imageTransform = transformedPaint.imageTransform;
      }
      if ("rotation" in transformedPaint) {
        updatedPaint.rotation = transformedPaint.rotation;
      }
      if ("scalingFactor" in transformedPaint) {
        updatedPaint.scalingFactor = transformedPaint.scalingFactor;
      }
      const upperScaleMode = scaleMode.toUpperCase();
      if (upperScaleMode === "CROP") {
        delete updatedPaint.rotation;
        delete updatedPaint.scalingFactor;
      } else {
        delete updatedPaint.imageTransform;
      }
      return { paint: updatedPaint, warnings };
    }
    return { paint: transformedPaint, warnings };
  }
  async function MANAGE_FILLS(params) {
    return BaseOperation.executeOperation("manageFills", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        ["get", "list", "add_solid", "add_gradient", "add_image", "add_pattern", "update", "update_solid", "update_gradient", "update_image", "update_pattern", "delete", "reorder", "clear", "duplicate"]
      );
      switch (operation) {
        case "get":
          return await getFill(params);
        case "list":
          return await listFills(params);
        case "add_solid":
          return await addSolidFill(params);
        case "add_gradient":
          return await addGradientFill(params);
        case "add_image":
          return await addImageFill(params);
        case "add_pattern":
          return await addPatternFill(params);
        case "update":
          return await updateFillCommon(params);
        case "update_solid":
          return await updateSolidFill(params);
        case "update_gradient":
          return await updateGradientFill(params);
        case "update_image":
          return await updateImageFill(params);
        case "update_pattern":
          return await updatePatternFill(params);
        case "delete":
          return await deleteFill(params);
        case "reorder":
          return await reorderFill(params);
        case "clear":
          return await clearFills(params);
        case "duplicate":
          return await duplicateFills(params);
        default:
          throw new Error(`Unknown fill operation: ${operation}`);
      }
    });
  }
  async function getFill(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const { node, fills } = validateNodeForFills(params.nodeId);
    if (params.fillIndex !== void 0 && params.fillIndex !== null) {
      const fillIndex = resolveFillIndex(params, fills);
      const fill = fills[fillIndex];
      return await createFillOperationResponse(
        params.nodeId,
        fillIndex,
        fill,
        fills.length,
        {
          nodeName: node.name,
          fillType: fill.type
        }
      );
    }
    let filteredFills = fills;
    if (params.filterType) {
      const filterType = params.filterType.toUpperCase();
      filteredFills = fills.filter((fill) => fill.type === filterType);
    }
    return await createFillListResponse(
      params.nodeId,
      filteredFills,
      filteredFills.length,
      params.filterType
    );
  }
  async function listFills(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (const nodeId of nodeIds) {
      try {
        const { node, fills } = validateNodeForFills(nodeId);
        let filteredFills = fills;
        if (params.filterType) {
          const filterType = params.filterType.toUpperCase();
          filteredFills = fills.filter((fill) => fill.type === filterType);
        }
        const nodeResult = await createFillListResponse(
          nodeId,
          filteredFills,
          filteredFills.length,
          params.filterType
        );
        results.push(nodeResult);
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    const summary = createBulkSummary(results, nodeIds.length);
    return await formatFillResponse(summary);
  }
  async function addSolidFill(params) {
    BaseOperation.validateParams(params, ["nodeId", "color"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (const nodeId of nodeIds) {
      try {
        const { node } = validateNodeForFills(nodeId);
        const solidPaint = createSolidPaint2(params.color, params.opacity);
        applyCommonPaintProperties(solidPaint, params);
        let insertIndex;
        modifyFills(node, (manager) => {
          if (params.insertIndex !== void 0) {
            manager.insert(params.insertIndex, solidPaint);
            insertIndex = params.insertIndex;
          } else {
            manager.push(solidPaint);
            insertIndex = manager.length - 1;
          }
        });
        const result = await createFillAddResponse(
          nodeId,
          solidPaint,
          insertIndex,
          node.fills.length
        );
        results.push(result);
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    const summary = createBulkSummary(results, nodeIds.length);
    return summary;
  }
  async function addGradientFill(params) {
    BaseOperation.validateParams(params, ["nodeId", "gradientType"]);
    if (params.stopPositions && params.stopColors) {
      validateGradientStops(params.stopPositions, params.stopColors);
      if (params.stopPositions.length < 2) {
        throw new Error("Gradient fills must have at least 2 color stops");
      }
    }
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (const nodeId of nodeIds) {
      try {
        const { node } = validateNodeForFills(nodeId);
        let gradientStops;
        if (params.stopPositions && params.stopColors) {
          gradientStops = convertStopArrays(params.stopPositions, params.stopColors);
        } else {
          gradientStops = createDefaultGradientStops();
        }
        const gradientTransform = createGradientTransform(
          params.gradientType,
          {
            gradientStartX: params.gradientStartX,
            gradientStartY: params.gradientStartY,
            gradientEndX: params.gradientEndX,
            gradientEndY: params.gradientEndY,
            gradientScale: params.gradientScale
          }
        );
        const gradientPaint = createBasePaint(params.gradientType.toUpperCase(), params);
        gradientPaint.gradientStops = gradientStops;
        gradientPaint.gradientTransform = gradientTransform;
        modifyFills(node, (manager) => {
          if (params.insertIndex !== void 0) {
            manager.insert(params.insertIndex, gradientPaint);
          } else {
            manager.push(gradientPaint);
          }
        });
        const insertIndex = params.insertIndex ?? node.fills.length - 1;
        const response = await createFillAddResponse(nodeId, gradientPaint, insertIndex, node.fills.length);
        results.push(response);
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }
  async function addPatternFill(params) {
    BaseOperation.validateParams(params, ["nodeId", "sourceNodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (const nodeId of nodeIds) {
      try {
        const { node } = validateNodeForFills(nodeId);
        const sourceNode = figma.getNodeById(params.sourceNodeId);
        if (!sourceNode) {
          throw new Error(`Source node not found: ${params.sourceNodeId}`);
        }
        const patternPaint = createPatternPaint(
          params.sourceNodeId,
          params.patternTileType,
          params.patternScalingFactor,
          params.patternSpacingX ?? 0,
          params.patternSpacingY ?? 0,
          params.patternHorizontalAlignment
        );
        applyCommonPaintProperties(patternPaint, params);
        let insertIndex;
        modifyFills(node, (manager) => {
          if (params.insertIndex !== void 0) {
            manager.insert(params.insertIndex, patternPaint);
            insertIndex = params.insertIndex;
          } else {
            manager.push(patternPaint);
            insertIndex = manager.length - 1;
          }
        });
        const result = await createFillAddResponse(
          nodeId,
          patternPaint,
          insertIndex,
          node.fills.length
        );
        results.push(result);
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    const summary = createBulkSummary(results, nodeIds.length);
    return summary;
  }
  async function addImageFill(params) {
    logger2.log("\u{1F50D} addImageFill called with params:", {
      hasImageUrl: !!params.imageUrl,
      hasImagePath: !!params.imagePath,
      hasImageHash: !!params.imageHash,
      hasImageBytes: !!params.imageBytes,
      imageUrl: params.imageUrl,
      imagePath: params.imagePath,
      imageHash: params.imageHash,
      imageBytesType: typeof params.imageBytes,
      imageBytesLength: typeof params.imageBytes === "string" ? params.imageBytes.length : Array.isArray(params.imageBytes) ? params.imageBytes.length : "unknown",
      allParamKeys: Object.keys(params)
    });
    validateImageSource(params);
    logger2.log("\u2705 addImageFill validation passed");
    if (params.nodeId) {
      BaseOperation.validateParams(params, ["nodeId"]);
    }
    let imageHash;
    let imageDimensions = null;
    if (params.imageUrl) {
      const result = await createImageFromUrl2(params.imageUrl);
      imageHash = result.imageHash;
      imageDimensions = result.dimensions;
    } else if (params.imageBytes) {
      logger2.log("\u{1F504} Sending Base64 to UI for conversion, length:", typeof params.imageBytes === "string" ? params.imageBytes.length : "not string");
      try {
        const base64String = typeof params.imageBytes === "string" ? params.imageBytes : params.imageBytes[0];
        const bytesArray = await new Promise((resolve, reject) => {
          const messageId = Math.random().toString(36).substr(2, 9);
          const handleMessage = (msg) => {
            if (msg?.id === messageId) {
              figma.ui.off("message", handleMessage);
              if (msg.error) {
                reject(new Error(msg.error));
              } else {
                logger2.log("\u2705 Received Uint8Array from UI, length:", msg.result.length);
                resolve(new Uint8Array(msg.result));
              }
            }
          };
          figma.ui.on("message", handleMessage);
          figma.ui.postMessage({
            type: "CONVERT_BASE64_TO_UINT8ARRAY",
            id: messageId,
            base64: base64String
          });
          setTimeout(() => {
            figma.ui.off("message", handleMessage);
            reject(new Error("Base64 conversion timeout"));
          }, 5e3);
        });
        const result = await createImageFromBytes2(bytesArray);
        logger2.log("\u2705 createImageFromBytes successful, hash:", result.imageHash);
        imageHash = result.imageHash;
        imageDimensions = result.dimensions;
      } catch (bytesError) {
        logger2.log("\u274C Error in imageBytes processing:", bytesError.toString());
        throw new Error(`Failed to process imageBytes: ${bytesError.toString()}`);
      }
    } else if (params.imagePath) {
      throw new Error("imagePath must be handled by server - use imageUrl, imageHash, or imageBytes instead");
    } else {
      imageHash = params.imageHash;
    }
    let nodeIds;
    if (!params.nodeId) {
      const rect = figma.createRectangle();
      rect.x = params.x ?? 0;
      rect.y = params.y ?? 0;
      if (imageDimensions) {
        rect.resize(imageDimensions.width, imageDimensions.height);
      } else {
        rect.resize(100, 100);
      }
      figma.currentPage.appendChild(rect);
      nodeIds = [rect.id];
    } else {
      nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
    }
    const results = [];
    for (const nodeId of nodeIds) {
      try {
        const node = figma.getNodeById(nodeId);
        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }
        if (!("fills" in node)) {
          throw new Error(`Node ${nodeId} does not support fills`);
        }
        const { paint: basePaint, warnings } = applyScaleModeAwareTransforms(
          imageHash,
          params.imageScaleMode ?? "FILL",
          params
        );
        if (warnings.length > 0) {
          logger2.log("\u26A0\uFE0F Image transform warnings:", warnings);
        }
        let imagePaint = basePaint;
        if (params.filterExposure !== void 0 || params.filterContrast !== void 0 || params.filterSaturation !== void 0 || params.filterTemperature !== void 0 || params.filterTint !== void 0 || params.filterHighlights !== void 0 || params.filterShadows !== void 0) {
          imagePaint = applyImageFilters2(imagePaint, params);
        }
        applyCommonPaintProperties(imagePaint, params);
        modifyFills(node, (manager) => {
          if (params.insertIndex !== void 0) {
            manager.insert(params.insertIndex, imagePaint);
          } else {
            manager.push(imagePaint);
          }
        });
        const insertIndex = params.insertIndex ?? node.fills.length - 1;
        const response = await createFillAddResponse(nodeId, imagePaint, insertIndex, node.fills.length);
        Object.assign(response, {
          imageHash,
          imageDimensions,
          transformWarnings: warnings.length > 0 ? warnings : void 0
        });
        results.push(response);
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    const allWarnings = results.flatMap((r) => r.transformWarnings || []);
    const bulkSummary = createBulkSummary(results, nodeIds.length);
    return {
      ...bulkSummary,
      imageHash,
      imageDimensions,
      transformWarnings: allWarnings.length > 0 ? allWarnings : void 0
    };
  }
  async function updateFillCommon(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const { node, fills } = validateNodeForFills(params.nodeId);
    const fillIndex = resolveFillIndex(params, fills);
    const currentFill = fills[fillIndex];
    if (params.color || params.stopColors || params.stopPositions || params.gradientType || params.imageScaleMode || params.filterExposure !== void 0) {
      const fillType = currentFill.type;
      let suggestedOperation = "";
      if (fillType === "SOLID") {
        suggestedOperation = "update_solid";
      } else if (fillType.startsWith("GRADIENT_")) {
        suggestedOperation = "update_gradient";
      } else if (fillType === "IMAGE") {
        suggestedOperation = "update_image";
      }
      throw new Error(`Cannot update ${fillType.toLowerCase()} fill properties with generic 'update' operation. Use '${suggestedOperation}' instead for type-specific updates.`);
    }
    modifyFills(node, (manager) => {
      const updatedFill = clone(currentFill);
      applyCommonPaintProperties(updatedFill, params);
      manager.update(fillIndex, updatedFill);
    });
    return await createFillUpdateResponse(
      params.nodeId,
      fillIndex,
      node.fills[fillIndex],
      node.fills.length
    );
  }
  async function updateSolidFill(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const { node, fills } = validateNodeForFills(params.nodeId);
    const fillIndex = resolveFillIndex(params, fills);
    validateFillType(fills, fillIndex, "SOLID");
    const currentFill = fills[fillIndex];
    modifyFills(node, (manager) => {
      const updatedFill = clone(currentFill);
      if (params.color) {
        updatedFill.color = createSolidPaint2(params.color).color;
      }
      applyCommonPaintProperties(updatedFill, params);
      manager.update(fillIndex, updatedFill);
    });
    return await createFillUpdateResponse(
      params.nodeId,
      fillIndex,
      node.fills[fillIndex],
      node.fills.length
    );
  }
  async function updateGradientFill(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const { node, fills } = validateNodeForFills(params.nodeId);
    const fillIndex = resolveFillIndex(params, fills);
    const currentFill = fills[fillIndex];
    if (!currentFill.type.startsWith("GRADIENT_")) {
      throw new Error(ERROR_MESSAGES.INVALID_FILL_TYPE(fillIndex, currentFill.type, "gradient"));
    }
    modifyFills(node, (manager) => {
      const updatedFill = clone(currentFill);
      if (params.stopColors) {
        if (params.stopPositions) {
          validateGradientStops(params.stopPositions, params.stopColors);
          updatedFill.gradientStops = convertStopArrays(params.stopPositions, params.stopColors);
        } else {
          const existingStops = updatedFill.gradientStops || [];
          const positions = existingStops.length === params.stopColors.length ? existingStops.map((stop) => stop.position) : params.stopColors.map((_, i) => i / Math.max(1, params.stopColors.length - 1));
          updatedFill.gradientStops = convertStopArrays(positions, params.stopColors);
        }
      } else if (params.stopPositions) {
        const existingStops = updatedFill.gradientStops || [];
        if (existingStops.length === params.stopPositions.length) {
          const colors = existingStops.map((stop) => {
            const color = stop.color;
            return `rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})`;
          });
          validateGradientStops(params.stopPositions, colors);
          updatedFill.gradientStops = convertStopArrays(params.stopPositions, colors);
        } else {
          throw new Error("Cannot update positions without colors when stop count differs");
        }
      }
      if (params.gradientType) {
        updatedFill.type = params.gradientType.toUpperCase();
      }
      if (params.gradientStartX !== void 0 || params.gradientStartY !== void 0 || params.gradientEndX !== void 0 || params.gradientEndY !== void 0 || params.gradientScale !== void 0) {
        updatedFill.gradientTransform = createGradientTransform(
          updatedFill.type,
          {
            gradientStartX: params.gradientStartX,
            gradientStartY: params.gradientStartY,
            gradientEndX: params.gradientEndX,
            gradientEndY: params.gradientEndY,
            gradientScale: params.gradientScale
          }
        );
      }
      applyCommonPaintProperties(updatedFill, params);
      manager.update(fillIndex, updatedFill);
    });
    return await createFillUpdateResponse(
      params.nodeId,
      fillIndex,
      node.fills[fillIndex],
      node.fills.length
    );
  }
  async function updateImageFill(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const node = figma.getNodeById(params.nodeId);
    if (!node) {
      throw new Error(`Node not found: ${params.nodeId}`);
    }
    if (!("fills" in node)) {
      throw new Error(`Node ${params.nodeId} does not support fills`);
    }
    const fills = node.fills;
    if (!Array.isArray(fills)) {
      throw new Error(`Node ${params.nodeId} has mixed fills`);
    }
    let fillIndex;
    if (params.fillIndex !== void 0 && params.fillIndex !== null) {
      fillIndex = params.fillIndex;
    } else {
      if (fills.length === 0) {
        throw new Error(`Node ${params.nodeId} has no fills to update`);
      } else if (fills.length === 1) {
        fillIndex = 0;
      } else {
        throw new Error(`Node ${params.nodeId} has ${fills.length} fills. Please specify fillIndex (0-${fills.length - 1}) to update a specific fill.`);
      }
    }
    if (fillIndex < 0 || fillIndex >= fills.length) {
      throw new Error(`Fill index ${fillIndex} out of bounds (0-${fills.length - 1})`);
    }
    const currentFill = fills[fillIndex];
    if (currentFill.type !== "IMAGE") {
      throw new Error(`Fill at index ${fillIndex} is not an image fill (type: ${currentFill.type}). Use update_solid or update_gradient for other fill types.`);
    }
    modifyFills(node, (manager) => {
      const updatedFill = clone(currentFill);
      if (params.imageScaleMode) {
        updatedFill.scaleMode = params.imageScaleMode.toUpperCase();
      }
      if (params.imageScaleMode || params.imageTransform || params.transformOffsetX !== void 0 || params.transformOffsetY !== void 0 || params.transformScale !== void 0 || params.transformScaleX !== void 0 || params.transformScaleY !== void 0 || params.transformRotation !== void 0 || params.transformSkewX !== void 0 || params.transformSkewY !== void 0 || params.imageTranslateX !== void 0 || params.imageTranslateY !== void 0 || params.imageFlipHorizontal !== void 0 || params.imageFlipVertical !== void 0) {
        const targetScaleMode = params.imageScaleMode?.toUpperCase() || updatedFill.scaleMode || "FILL";
        const { paint: transformedPaint, warnings } = applyScaleModeAwareTransforms(
          updatedFill.imageHash,
          targetScaleMode,
          params,
          updatedFill
          // Pass existing paint for property preservation
        );
        Object.assign(updatedFill, transformedPaint);
        if (warnings.length > 0) {
          logger2.warn("Transform warnings:", warnings.join(", "));
        }
      }
      if (params.filterExposure !== void 0 || params.filterContrast !== void 0 || params.filterSaturation !== void 0 || params.filterTemperature !== void 0 || params.filterTint !== void 0 || params.filterHighlights !== void 0 || params.filterShadows !== void 0) {
        const filteredPaint = applyImageFilters2(updatedFill, params);
        Object.assign(updatedFill, filteredPaint);
      }
      if (params.opacity !== void 0) updatedFill.opacity = params.opacity;
      if (params.visible !== void 0) updatedFill.visible = params.visible;
      if (params.blendMode) updatedFill.blendMode = params.blendMode;
      manager.update(fillIndex, updatedFill);
    });
    const responseData = {
      nodeId: params.nodeId,
      fillIndex,
      updatedFill: node.fills[fillIndex],
      totalFills: node.fills.length
    };
    return await formatFillResponse(responseData);
  }
  async function updatePatternFill(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const { node, fills } = validateNodeForFills(params.nodeId);
    const fillIndex = resolveFillIndex(params, fills);
    const currentFill = fills[fillIndex];
    if (currentFill.type !== "PATTERN") {
      throw new Error(`Fill at index ${fillIndex} is not a pattern fill (type: ${currentFill.type}). Use update_solid, update_gradient, or update_image for other fill types.`);
    }
    modifyFills(node, (manager) => {
      const updatedFill = clone(currentFill);
      if (params.sourceNodeId) {
        const sourceNode = figma.getNodeById(params.sourceNodeId);
        if (!sourceNode) {
          throw new Error(`Source node not found: ${params.sourceNodeId}`);
        }
        updatedFill.sourceNodeId = params.sourceNodeId;
      }
      if (params.patternTileType) {
        updatedFill.tileType = params.patternTileType.toUpperCase();
      }
      if (params.patternScalingFactor !== void 0) {
        updatedFill.scalingFactor = params.patternScalingFactor;
      }
      if (params.patternSpacingX !== void 0 || params.patternSpacingY !== void 0) {
        updatedFill.spacing = {
          x: params.patternSpacingX ?? (updatedFill.spacing?.x ?? 0),
          y: params.patternSpacingY ?? (updatedFill.spacing?.y ?? 0)
        };
      }
      if (params.patternHorizontalAlignment) {
        updatedFill.horizontalAlignment = params.patternHorizontalAlignment.toUpperCase();
      }
      applyCommonPaintProperties(updatedFill, params);
      manager.update(fillIndex, updatedFill);
    });
    return await createFillUpdateResponse(
      params.nodeId,
      fillIndex,
      node.fills[fillIndex],
      node.fills.length
    );
  }
  async function deleteFill(params) {
    BaseOperation.validateParams(params, ["nodeId", "fillIndex"]);
    const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
    const results = [];
    for (const nodeId of nodeIds) {
      try {
        const node = figma.getNodeById(nodeId);
        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }
        if (!("fills" in node)) {
          throw new Error(`Node ${nodeId} does not support fills`);
        }
        const fills = node.fills;
        if (!Array.isArray(fills)) {
          throw new Error(`Node ${nodeId} has mixed fills`);
        }
        if (params.fillIndex < 0 || params.fillIndex >= fills.length) {
          throw new Error(`Fill index ${params.fillIndex} out of bounds (0-${fills.length - 1})`);
        }
        let deletedFill;
        modifyFills(node, (manager) => {
          deletedFill = manager.remove(params.fillIndex);
        });
        results.push({
          nodeId,
          deletedFill,
          fillIndex: params.fillIndex,
          remainingFills: node.fills.length
        });
      } catch (error) {
        results.push({
          nodeId,
          error: error.toString()
        });
      }
    }
    return {
      results,
      totalNodes: nodeIds.length,
      successfulNodes: results.filter((r) => !r.error).length
    };
  }
  async function reorderFill(params) {
    BaseOperation.validateParams(params, ["nodeId", "fillIndex", "newIndex"]);
    const node = figma.getNodeById(params.nodeId);
    if (!node) {
      throw new Error(`Node not found: ${params.nodeId}`);
    }
    if (!("fills" in node)) {
      throw new Error(`Node ${params.nodeId} does not support fills`);
    }
    const fills = node.fills;
    if (!Array.isArray(fills)) {
      throw new Error(`Node ${params.nodeId} has mixed fills`);
    }
    if (params.fillIndex < 0 || params.fillIndex >= fills.length) {
      throw new Error(`Fill index ${params.fillIndex} out of bounds (0-${fills.length - 1})`);
    }
    if (params.newIndex < 0 || params.newIndex >= fills.length) {
      throw new Error(`New index ${params.newIndex} out of bounds (0-${fills.length - 1})`);
    }
    modifyFills(node, (manager) => {
      manager.move(params.fillIndex, params.newIndex);
    });
    return {
      nodeId: params.nodeId,
      fromIndex: params.fillIndex,
      toIndex: params.newIndex,
      reorderedFill: fills[params.newIndex],
      totalFills: fills.length
    };
  }
  async function clearFills(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
    const results = [];
    for (const nodeId of nodeIds) {
      try {
        const node = figma.getNodeById(nodeId);
        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }
        if (!("fills" in node)) {
          throw new Error(`Node ${nodeId} does not support fills`);
        }
        const originalFillsCount = Array.isArray(node.fills) ? node.fills.length : 0;
        node.fills = [];
        results.push({
          nodeId,
          clearedFillsCount: originalFillsCount
        });
      } catch (error) {
        results.push({
          nodeId,
          error: error.toString()
        });
      }
    }
    return {
      results,
      totalNodes: nodeIds.length,
      successfulNodes: results.filter((r) => !r.error).length
    };
  }
  async function duplicateFills(params) {
    BaseOperation.validateParams(params, ["fromNodeId", "toNodeId"]);
    const sourceNodeIds = Array.isArray(params.fromNodeId) ? params.fromNodeId : [params.fromNodeId];
    const sourceResults = [];
    let allFillsToCopy = [];
    for (const sourceNodeId of sourceNodeIds) {
      try {
        const sourceNode = figma.getNodeById(sourceNodeId);
        if (!sourceNode) {
          throw new Error(`Source node not found: ${sourceNodeId}`);
        }
        if (!("fills" in sourceNode)) {
          throw new Error(`Source node ${sourceNodeId} does not support fills`);
        }
        const sourceFills = sourceNode.fills;
        if (!Array.isArray(sourceFills)) {
          throw new Error(`Source node ${sourceNodeId} has mixed fills`);
        }
        let nodeSpecificFills;
        if (params.fillIndex !== void 0) {
          if (params.fillIndex < 0 || params.fillIndex >= sourceFills.length) {
            throw new Error(`Fill index ${params.fillIndex} out of bounds (0-${sourceFills.length - 1}) for source node ${sourceNodeId}`);
          }
          nodeSpecificFills = [sourceFills[params.fillIndex]];
        } else {
          nodeSpecificFills = sourceFills;
        }
        allFillsToCopy.push(...nodeSpecificFills);
        sourceResults.push({
          sourceNodeId,
          sourceNodeName: sourceNode.name,
          sourceFillsCount: sourceFills.length,
          duplicatedFillsCount: nodeSpecificFills.length
        });
      } catch (error) {
        sourceResults.push({
          sourceNodeId,
          error: error.toString()
        });
      }
    }
    if (allFillsToCopy.length === 0) {
      if (sourceResults.some((r) => r.error)) {
        throw new Error(`No fills could be collected from source nodes due to errors`);
      } else {
        throw new Error(`No fills found in source nodes to duplicate`);
      }
    }
    const fillsToCopy = allFillsToCopy;
    const targetNodeIds = Array.isArray(params.toNodeId) ? params.toNodeId : [params.toNodeId];
    const results = [];
    const overwrite = params.overwrite || "NONE";
    for (const targetNodeId of targetNodeIds) {
      try {
        const targetNode = figma.getNodeById(targetNodeId);
        if (!targetNode) {
          throw new Error(`Target node not found: ${targetNodeId}`);
        }
        if (!("fills" in targetNode)) {
          throw new Error(`Target node ${targetNodeId} does not support fills`);
        }
        const targetFills = targetNode.fills;
        if (!Array.isArray(targetFills)) {
          throw new Error(`Target node ${targetNodeId} has mixed fills`);
        }
        const clonedFills = fillsToCopy.map((fill) => clone(fill));
        let finalFills;
        let originalFillsCount = targetFills.length;
        if (overwrite === "ALL") {
          finalFills = clonedFills;
        } else if (overwrite === "SINGLE" && params.fillIndex !== void 0) {
          if (params.fillIndex < targetFills.length) {
            finalFills = [...targetFills];
            finalFills[params.fillIndex] = clonedFills[0];
          } else {
            finalFills = [...targetFills, ...clonedFills];
          }
        } else {
          finalFills = [...targetFills, ...clonedFills];
        }
        targetNode.fills = finalFills;
        results.push({
          targetNodeId,
          targetNodeName: targetNode.name,
          overwrite,
          originalFillsCount,
          duplicatedFillsCount: clonedFills.length,
          finalFillsCount: finalFills.length,
          duplicatedFills: clonedFills
        });
      } catch (error) {
        results.push({
          targetNodeId,
          error: error.toString()
        });
      }
    }
    const responseData = {
      // Updated to support bulk source operations
      sourceNodes: sourceResults,
      totalSourceNodes: sourceNodeIds.length,
      successfulSourceNodes: sourceResults.filter((r) => !r.error).length,
      totalFillsCollected: fillsToCopy.length,
      // Target operation results
      overwrite,
      fillSelection: params.fillIndex !== void 0 ? "single" : "all",
      targetResults: results,
      totalTargetNodes: targetNodeIds.length,
      successfulTargetNodes: results.filter((r) => !r.error).length,
      // Legacy fields for backward compatibility (single source scenarios)
      ...sourceNodeIds.length === 1 && sourceResults.length === 1 && !sourceResults[0].error ? {
        sourceNodeId: sourceNodeIds[0],
        sourceNodeName: sourceResults[0].sourceNodeName,
        sourceFillsCount: sourceResults[0].sourceFillsCount,
        duplicatedFillsCount: sourceResults[0].duplicatedFillsCount,
        results
        // Legacy field name
      } : {}
    };
    return await formatFillResponse(responseData);
  }

  // src/operations/manage-fonts.ts
  var manage_fonts_exports = {};
  __export(manage_fonts_exports, {
    MANAGE_FONTS: () => MANAGE_FONTS
  });

  // src/utils/font-utils.ts
  async function loadFont(fontName) {
    try {
      await figma.loadFontAsync(fontName);
    } catch (error) {
      throw new Error(`Font '${fontName.family} ${fontName.style}' is not available in this Figma file. Check the Figma font menu for available fonts.`);
    }
  }
  function createFontName(family, style = "Regular") {
    return { family, style };
  }
  function validateFontName(fontName) {
    return !!(fontName.family && fontName.style);
  }
  function normalizeFontStyle(style) {
    const styleMap = {
      "regular": "Regular",
      "bold": "Bold",
      "italic": "Italic",
      "medium": "Medium",
      "light": "Light",
      "semibold": "SemiBold",
      "extrabold": "ExtraBold",
      "black": "Black",
      "thin": "Thin"
    };
    return styleMap[style.toLowerCase()] || style;
  }
  async function ensureFontLoaded(fontName) {
    const normalizedFont = {
      family: fontName.family || "Inter",
      style: normalizeFontStyle(fontName.style || "Regular")
    };
    await loadFont(normalizedFont);
    return normalizedFont;
  }
  function getFontFromParams(params) {
    if (params.fontName) {
      return params.fontName;
    }
    return createFontName(
      params.fontFamily || "Inter",
      params.fontStyle || "Regular"
    );
  }
  async function loadDefaultFont() {
    const defaultFont = createFontName("Inter", "Regular");
    await loadFont(defaultFont);
    return defaultFont;
  }
  function getFontKey(fontName) {
    return `${fontName.family}:${fontName.style}`;
  }
  var FontCache = class {
    static async loadAndCache(fontName) {
      const key = getFontKey(fontName);
      if (!this.cache.has(key)) {
        await loadFont(fontName);
        this.cache.add(key);
      }
    }
    static isLoaded(fontName) {
      return this.cache.has(getFontKey(fontName));
    }
    static clear() {
      this.cache.clear();
    }
  };
  FontCache.cache = /* @__PURE__ */ new Set();

  // src/operations/manage-fonts.ts
  async function MANAGE_FONTS(params) {
    return BaseOperation.executeOperation("manageFonts", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const validOperations = ["search_fonts", "check_availability", "get_missing", "get_font_styles", "validate_font", "get_font_info", "preload_fonts", "get_project_fonts", "get_font_count"];
      if (!validOperations.includes(params.operation)) {
        throw new Error(`Unknown font operation: ${params.operation}. Valid operations: ${validOperations.join(", ")}`);
      }
      switch (params.operation) {
        case "search_fonts":
          return await searchFonts(params);
        case "check_availability":
          return await checkAvailability(params);
        case "get_missing":
          return await getMissing(params);
        case "get_font_styles":
          return await getFontStyles(params);
        case "validate_font":
          return await validateFont(params);
        case "get_font_info":
          return await getFontInfo(params);
        case "preload_fonts":
          return await preloadFonts(params);
        case "get_project_fonts":
          return await getProjectFonts(params);
        case "get_font_count":
          return await getFontCount(params);
        default:
          throw new Error(`Unknown font operation: ${params.operation}`);
      }
    });
  }
  async function searchFonts(params) {
    const {
      query,
      source,
      includeGoogle = true,
      includeSystem = true,
      includeCustom = true,
      hasStyle,
      minStyleCount,
      limit = 20,
      sortBy = "alphabetical"
    } = params;
    if (!query && !source && !includeGoogle && !includeSystem && !includeCustom && !hasStyle && !minStyleCount) {
      throw new Error("At least one search parameter is required");
    }
    const availableFonts = await figma.listAvailableFontsAsync();
    const familiesMap = /* @__PURE__ */ new Map();
    for (const font of availableFonts) {
      const family = font.fontName.family;
      const category = categorizeFontFamily(family);
      if (!familiesMap.has(family)) {
        familiesMap.set(family, {
          styles: /* @__PURE__ */ new Set(),
          category,
          loaded: true
        });
      }
      familiesMap.get(family).styles.add(font.fontName.style);
    }
    let filteredFamilies = Array.from(familiesMap.entries()).filter(([family, data]) => {
      if (query) {
        const regex = new RegExp(query, "i");
        if (!regex.test(family)) return false;
      }
      if (source) {
        if (data.category !== source) return false;
      } else {
        if (!includeGoogle && data.category === "google") return false;
        if (!includeSystem && data.category === "system") return false;
        if (!includeCustom && data.category === "custom") return false;
      }
      if (hasStyle) {
        if (!data.styles.has(hasStyle)) return false;
      }
      if (minStyleCount && data.styles.size < minStyleCount) {
        return false;
      }
      return true;
    });
    switch (sortBy) {
      case "alphabetical":
        filteredFamilies.sort(([a], [b]) => a.localeCompare(b));
        break;
      case "style_count":
        filteredFamilies.sort(([, a], [, b]) => b.styles.size - a.styles.size);
        break;
      case "source":
        filteredFamilies.sort(([, a], [, b]) => a.category.localeCompare(b.category));
        break;
    }
    const totalFound = filteredFamilies.length;
    const hasMore = totalFound > limit;
    const returnedFamilies = filteredFamilies.slice(0, limit);
    const fonts = returnedFamilies.map(([family, data]) => ({
      family,
      source: data.category,
      styleCount: data.styles.size,
      availableStyles: Array.from(data.styles).sort(),
      isLoaded: data.loaded
    }));
    const appliedFilters = [];
    if (query) appliedFilters.push(`Query: '${query}'`);
    if (source) appliedFilters.push(`Source: ${source}`);
    if (hasStyle) appliedFilters.push(`Has style: ${hasStyle}`);
    if (minStyleCount) appliedFilters.push(`Min styles: ${minStyleCount}`);
    appliedFilters.push(`Limit: ${limit}`);
    let searchSummary = `Found ${totalFound} font${totalFound !== 1 ? "s" : ""}`;
    if (query) searchSummary += ` matching '${query}'`;
    if (source) searchSummary += ` from ${source} fonts`;
    if (hasStyle) searchSummary += ` with ${hasStyle} style`;
    if (minStyleCount) searchSummary += ` with ${minStyleCount}+ styles`;
    if (hasMore) {
      searchSummary += `, showing first ${fonts.length}`;
    } else {
      searchSummary += totalFound === fonts.length ? ", showing all results" : `, showing ${fonts.length}`;
    }
    return {
      fonts,
      totalFound,
      totalReturned: fonts.length,
      hasMore,
      searchSummary,
      searchCriteria: {
        appliedFilters,
        resultLimit: limit
      }
    };
  }
  async function checkAvailability(params) {
    BaseOperation.validateParams(params, ["fontFamily", "fontStyle"]);
    const { fontFamily, fontStyle, fallbackSuggestions = false } = params;
    const families = Array.isArray(fontFamily) ? fontFamily : [fontFamily];
    const styles = Array.isArray(fontStyle) ? fontStyle : [fontStyle];
    const fontPairs = [];
    const maxLength = Math.max(families.length, styles.length);
    for (let i = 0; i < maxLength; i++) {
      const family = families[i] || families[families.length - 1];
      const style = styles[i] || styles[styles.length - 1];
      fontPairs.push({ family, style });
    }
    const results = [];
    for (const { family, style } of fontPairs) {
      const fontName = createFontName(family, style);
      let fontInfo;
      try {
        await figma.loadFontAsync(fontName);
        fontInfo = {
          family: fontName.family,
          style: fontName.style,
          status: "available",
          category: categorizeFontFamily(fontName.family)
        };
      } catch (error) {
        fontInfo = {
          family: fontName.family,
          style: fontName.style,
          status: "missing",
          category: categorizeFontFamily(fontName.family)
        };
        if (fallbackSuggestions) {
          const suggestions = await getSimilarFonts(fontName);
          if (suggestions.length > 0) {
            fontInfo.metadata = { suggestions };
          }
        }
      }
      results.push(fontInfo);
    }
    return results;
  }
  async function getMissing(params) {
    const { fallbackSuggestions = false } = params;
    const allNodes = getAllTextNodes(figma.root);
    const usedFonts = /* @__PURE__ */ new Set();
    const missingFonts = [];
    const suggestions = [];
    for (const node of allNodes) {
      if (node.type === "TEXT") {
        const fontName = node.fontName;
        if (fontName && typeof fontName === "object") {
          usedFonts.add(getFontKey(fontName));
        }
      }
    }
    for (const fontKey of usedFonts) {
      const [family, style] = fontKey.split(":");
      const fontName = createFontName(family, style);
      try {
        await figma.loadFontAsync(fontName);
      } catch (error) {
        const missingFont = {
          family: fontName.family,
          style: fontName.style,
          status: "missing",
          category: categorizeFontFamily(fontName.family)
        };
        missingFonts.push(missingFont);
        if (fallbackSuggestions) {
          const alternatives = await getSimilarFonts(fontName);
          if (alternatives.length > 0) {
            suggestions.push({
              missing: missingFont,
              alternatives: alternatives.map((alt) => ({
                family: alt.family,
                style: alt.style,
                status: "available",
                category: categorizeFontFamily(alt.family)
              }))
            });
          }
        }
      }
    }
    const result = { missingFonts };
    if (fallbackSuggestions && suggestions.length > 0) {
      result.suggestions = suggestions;
    }
    return result;
  }
  async function getFontStyles(params) {
    BaseOperation.validateParams(params, ["fontFamily"]);
    const { fontFamily } = params;
    const availableFonts = await figma.listAvailableFontsAsync();
    const styles = availableFonts.filter((font) => font.fontName.family === fontFamily).map((font) => font.fontName.style).sort();
    if (styles.length === 0) {
      throw new Error(`Font family '${fontFamily}' not found`);
    }
    return {
      family: fontFamily,
      styles,
      styleCount: styles.length,
      category: categorizeFontFamily(fontFamily)
    };
  }
  async function validateFont(params) {
    BaseOperation.validateParams(params, ["fontFamily", "fontStyle"]);
    const { fontFamily, fontStyle } = params;
    const fontName = createFontName(fontFamily, fontStyle);
    try {
      validateFontName(fontName);
      await figma.loadFontAsync(fontName);
      return {
        isValid: true,
        fontName,
        category: categorizeFontFamily(fontFamily),
        message: `Font '${fontFamily}' ${fontStyle} is valid and available`
      };
    } catch (error) {
      return {
        isValid: false,
        fontName,
        error: error.toString(),
        message: `Font '${fontFamily}' ${fontStyle} is not available`
      };
    }
  }
  async function getFontInfo(params) {
    BaseOperation.validateParams(params, ["fontFamily", "fontStyle"]);
    const { fontFamily, fontStyle } = params;
    const fontName = createFontName(fontFamily, fontStyle);
    try {
      await figma.loadFontAsync(fontName);
      const info = {
        family: fontName.family,
        style: fontName.style,
        status: "available",
        category: categorizeFontFamily(fontName.family)
      };
      return info;
    } catch (error) {
      const info = {
        family: fontName.family,
        style: fontName.style,
        status: "missing",
        category: categorizeFontFamily(fontName.family)
      };
      return info;
    }
  }
  async function preloadFonts(params) {
    BaseOperation.validateParams(params, ["fontFamily", "fontStyle"]);
    const { fontFamily, fontStyle } = params;
    const families = Array.isArray(fontFamily) ? fontFamily : [fontFamily];
    const styles = Array.isArray(fontStyle) ? fontStyle : [fontStyle];
    const fontPairs = [];
    const maxLength = Math.max(families.length, styles.length);
    for (let i = 0; i < maxLength; i++) {
      const family = families[i] || families[families.length - 1];
      const style = styles[i] || styles[styles.length - 1];
      fontPairs.push({ family, style });
    }
    const results = [];
    let loaded = 0;
    let failed = 0;
    for (const { family, style } of fontPairs) {
      const fontName = createFontName(family, style);
      try {
        await figma.loadFontAsync(fontName);
        results.push({
          family: fontName.family,
          style: fontName.style,
          status: "loaded"
        });
        loaded++;
      } catch (error) {
        results.push({
          family: fontName.family,
          style: fontName.style,
          status: "failed",
          error: error.toString()
        });
        failed++;
      }
    }
    return {
      results,
      summary: {
        total: fontPairs.length,
        loaded,
        failed
      },
      message: `Preloaded ${loaded}/${fontPairs.length} fonts successfully`
    };
  }
  async function getProjectFonts(params) {
    const { includeUnused = false } = params;
    const allNodes = getAllTextNodes(figma.root);
    const usedFonts = /* @__PURE__ */ new Set();
    const fontUsage = /* @__PURE__ */ new Map();
    for (const node of allNodes) {
      if (node.type === "TEXT") {
        const fontName = node.fontName;
        if (fontName && typeof fontName === "object") {
          const fontKey = getFontKey(fontName);
          usedFonts.add(fontKey);
          fontUsage.set(fontKey, (fontUsage.get(fontKey) || 0) + 1);
        }
      }
    }
    const projectFonts = [];
    for (const fontKey of usedFonts) {
      const [family, style] = fontKey.split(":");
      const fontName = createFontName(family, style);
      let status;
      try {
        await figma.loadFontAsync(fontName);
        status = "available";
      } catch (error) {
        status = "missing";
      }
      projectFonts.push({
        family: fontName.family,
        style: fontName.style,
        status,
        usageCount: fontUsage.get(fontKey) || 0,
        category: categorizeFontFamily(fontName.family)
      });
    }
    projectFonts.sort((a, b) => b.usageCount - a.usageCount);
    const availableFonts = includeUnused ? await figma.listAvailableFontsAsync() : [];
    const unusedFonts = [];
    if (includeUnused) {
      for (const font of availableFonts) {
        const fontKey = getFontKey(font.fontName);
        if (!usedFonts.has(fontKey)) {
          unusedFonts.push({
            family: font.fontName.family,
            style: font.fontName.style,
            status: "available",
            usageCount: 0,
            category: categorizeFontFamily(font.fontName.family)
          });
        }
      }
    }
    return {
      usedFonts: projectFonts,
      unusedFonts: includeUnused ? unusedFonts : void 0,
      summary: {
        totalUsed: projectFonts.length,
        totalUnused: unusedFonts.length,
        totalAvailable: availableFonts.length
      }
    };
  }
  async function getFontCount(params) {
    const availableFonts = await figma.listAvailableFontsAsync();
    const familiesMap = /* @__PURE__ */ new Map();
    for (const font of availableFonts) {
      const family = font.fontName.family;
      if (!familiesMap.has(family)) {
        familiesMap.set(family, /* @__PURE__ */ new Set());
      }
      familiesMap.get(family).add(font.fontName.style);
    }
    const categoryCounts = { google: 0, system: 0, custom: 0 };
    for (const family of familiesMap.keys()) {
      const category = categorizeFontFamily(family);
      categoryCounts[category]++;
    }
    const totalFamilies = familiesMap.size;
    const totalStyles = availableFonts.length;
    return {
      count: totalFamilies,
      summary: `${totalFamilies} font families available (${totalStyles} total styles: ${categoryCounts.google} Google, ${categoryCounts.system} System, ${categoryCounts.custom} Custom)`
    };
  }
  function categorizeFontFamily(family) {
    const googleFonts = [
      "Roboto",
      "Open Sans",
      "Lato",
      "Montserrat",
      "Source Sans Pro",
      "Roboto Condensed",
      "Raleway",
      "Roboto Slab",
      "Merriweather",
      "PT Sans",
      "Ubuntu",
      "Playfair Display",
      "Poppins",
      "Nunito",
      "Lora",
      "Mukti",
      "Rubik",
      "Work Sans",
      "Fira Sans",
      "Noto Sans"
    ];
    const systemFonts = [
      "Arial",
      "Helvetica",
      "Times",
      "Times New Roman",
      "Courier",
      "Courier New",
      "Verdana",
      "Georgia",
      "Palatino",
      "Garamond",
      "Bookman",
      "Trebuchet MS",
      "Arial Narrow",
      "Century Gothic",
      "Impact",
      "Lucida Console",
      "Tahoma",
      "Monaco",
      "Optima",
      "Avenir",
      "Menlo",
      "SF Pro Display",
      "SF Pro Text",
      "Helvetica Neue",
      "System Font",
      ".SF NS Text",
      ".SF NS Display"
    ];
    if (googleFonts.some((gFont) => family.includes(gFont))) {
      return "google";
    }
    if (systemFonts.some((sFont) => family.includes(sFont))) {
      return "system";
    }
    return "custom";
  }
  function getAllTextNodes(node) {
    const textNodes = [];
    if (node.type === "TEXT") {
      textNodes.push(node);
    }
    if ("children" in node) {
      for (const child of node.children) {
        textNodes.push(...getAllTextNodes(child));
      }
    }
    return textNodes;
  }
  async function getSimilarFonts(targetFont, maxSuggestions = 3) {
    const availableFonts = await figma.listAvailableFontsAsync();
    const suggestions = [];
    const targetFamily = targetFont.family.toLowerCase();
    const targetStyle = targetFont.style.toLowerCase();
    const sameStyleFonts = availableFonts.filter(
      (font) => font.fontName.style.toLowerCase() === targetStyle && font.fontName.family.toLowerCase() !== targetFamily
    );
    const similarFamilyFonts = availableFonts.filter((font) => {
      const family = font.fontName.family.toLowerCase();
      return family.includes(targetFamily.split(" ")[0]) || targetFamily.includes(family.split(" ")[0]);
    });
    const combined = [...sameStyleFonts, ...similarFamilyFonts];
    const seen = /* @__PURE__ */ new Set();
    for (const font of combined) {
      const key = getFontKey(font.fontName);
      if (!seen.has(key) && suggestions.length < maxSuggestions) {
        suggestions.push(font.fontName);
        seen.add(key);
      }
    }
    return suggestions;
  }

  // src/operations/manage-hierarchy.ts
  var manage_hierarchy_exports = {};
  __export(manage_hierarchy_exports, {
    MANAGE_HIERARCHY: () => MANAGE_HIERARCHY
  });
  async function MANAGE_HIERARCHY(params) {
    return BaseOperation.executeOperation("manageHierarchy", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        ["group", "ungroup", "parent", "unparent", "order_by_index", "order_by_depth", "move_to_page"]
      );
      switch (operation) {
        case "group":
          return await groupNodes(params);
        case "ungroup":
          return await ungroupNode(params);
        case "parent":
          return await parentNode(params);
        case "unparent":
          return await unparentNode(params);
        case "order_by_index":
          return await orderByIndex(params);
        case "order_by_depth":
          return await orderByDepth(params);
        case "move_to_page":
          return await moveToPage(params);
        default:
          throw new Error(`Unknown hierarchy operation: ${operation}`);
      }
    });
  }
  async function groupNodes(params) {
    if (!params.nodeIds || !Array.isArray(params.nodeIds) || params.nodeIds.length === 0) {
      throw new Error('Parameter "nodeIds" is required for group operation and must be a non-empty array');
    }
    const nodes = [];
    let commonParent = null;
    for (const nodeId of params.nodeIds) {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }
      if (commonParent === null) {
        commonParent = node.parent;
      } else if (node.parent !== commonParent) {
        throw new Error(`All nodes must have the same parent to be grouped. Node ${nodeId} has a different parent.`);
      }
      nodes.push(node);
    }
    if (nodes.length < 2) {
      throw new Error("At least 2 nodes are required to create a group");
    }
    const group = figma.group(nodes, commonParent);
    if (params.name) {
      group.name = params.name;
    }
    return {
      operation: "group",
      groupId: group.id,
      id: group.id,
      name: group.name,
      nodeIds: params.nodeIds,
      message: `Created group "${group.name}" with ${nodes.length} nodes`
    };
  }
  async function ungroupNode(params) {
    const nodeId = params.nodeId;
    if (!nodeId) {
      throw new Error('Parameter "id" is required for ungroup operation');
    }
    const node = findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    if (node.type !== "GROUP") {
      throw new Error(`Node ${nodeId} is not a group and cannot be ungrouped`);
    }
    if ("locked" in node && node.locked) {
      throw new Error(`Group "${node.name}" (${nodeId}) is locked and cannot be ungrouped`);
    }
    let parentCheck = node.parent;
    while (parentCheck) {
      if (parentCheck.type === "INSTANCE") {
        throw new Error(`Group "${node.name}" (${nodeId}) is inside a component instance and cannot be ungrouped`);
      }
      parentCheck = parentCheck.parent;
    }
    const group = node;
    const groupName = group.name;
    let ungroupedChildren;
    try {
      ungroupedChildren = figma.ungroup(group);
    } catch (error) {
      throw new Error(`Failed to ungroup "${groupName}" (${nodeId}): ${error.toString()}. The group may be locked, part of a component, or cannot be ungrouped.`);
    }
    const childIds = ungroupedChildren.map((child) => child.id);
    return {
      operation: "ungroup",
      id: nodeId,
      name: groupName,
      childIds,
      message: `Ungrouped "${groupName}" releasing ${ungroupedChildren.length} child nodes`
    };
  }
  async function parentNode(params) {
    const nodeId = params.nodeId;
    if (!nodeId) {
      throw new Error('Parameter "id" is required for parent operation');
    }
    if (!params.parentId) {
      throw new Error('Parameter "parentId" is required for parent operation');
    }
    const node = findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    const newParent = findNodeById(params.parentId);
    if (!newParent) {
      throw new Error(`Parent node ${params.parentId} not found`);
    }
    if (!("appendChild" in newParent)) {
      throw new Error(`Node ${params.parentId} cannot contain child nodes`);
    }
    const oldParent = node.parent;
    const oldParentName = oldParent?.name || "unknown";
    newParent.appendChild(node);
    return {
      operation: "parent",
      id: nodeId,
      name: node.name,
      oldParentId: oldParent?.id,
      oldParentName,
      parentId: params.parentId,
      parentName: newParent.name,
      message: `Changed parent of "${node.name}" from "${oldParentName}" to "${newParent.name}"`
    };
  }
  async function unparentNode(params) {
    const nodeId = params.nodeId;
    if (!nodeId) {
      throw new Error('Parameter "id" is required for unparent operation');
    }
    const node = findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    const oldParent = node.parent;
    const oldParentName = oldParent?.name || "unknown";
    const currentPage = figma.currentPage;
    currentPage.appendChild(node);
    return {
      operation: "unparent",
      id: nodeId,
      name: node.name,
      oldParentId: oldParent?.id,
      oldParentName,
      newParentId: currentPage.id,
      newParentName: currentPage.name,
      message: `Unparented "${node.name}" from "${oldParentName}" to page "${currentPage.name}"`
    };
  }
  async function orderByIndex(params) {
    const nodeId = params.nodeId;
    if (!nodeId) {
      throw new Error('Parameter "id" is required for order_by_index operation');
    }
    if (params.index === void 0) {
      throw new Error('Parameter "index" is required for order_by_index operation');
    }
    const node = findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    const parent = node.parent;
    if (!parent || !("children" in parent)) {
      throw new Error(`Node ${nodeId} does not have a valid parent for reordering`);
    }
    const parentNode2 = parent;
    const children = [...parentNode2.children];
    const currentIndex = children.indexOf(node);
    const newIndex = Math.max(0, Math.min(params.index, children.length - 1));
    if (currentIndex === newIndex) {
      return {
        operation: "order_by_index",
        id: nodeId,
        name: node.name,
        currentIndex,
        newIndex,
        message: `Node "${node.name}" is already at index ${newIndex}`
      };
    }
    parentNode2.insertChild(newIndex, node);
    return {
      operation: "order_by_index",
      id: nodeId,
      name: node.name,
      currentIndex,
      newIndex,
      parentId: parent.id,
      parentName: parent.name,
      message: `Reordered "${node.name}" from index ${currentIndex} to ${newIndex} in "${parent.name}"`
    };
  }
  async function orderByDepth(params) {
    const nodeId = params.nodeId;
    if (!nodeId) {
      throw new Error('Parameter "id" is required for order_by_depth operation');
    }
    if (!params.position) {
      throw new Error('Parameter "position" is required for order_by_depth operation');
    }
    const node = findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    const parent = node.parent;
    if (!parent || !("children" in parent)) {
      throw new Error(`Node ${nodeId} does not have a valid parent for depth ordering`);
    }
    const parentNode2 = parent;
    const children = [...parentNode2.children];
    const currentIndex = children.indexOf(node);
    let newIndex;
    switch (params.position.toLowerCase()) {
      case "front":
        newIndex = children.length - 1;
        break;
      case "back":
        newIndex = 0;
        break;
      case "forward":
        newIndex = Math.min(currentIndex + 1, children.length - 1);
        break;
      case "backward":
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      default:
        throw new Error(`Invalid position "${params.position}". Must be: front, back, forward, backward`);
    }
    if (currentIndex === newIndex) {
      return {
        operation: "order_by_depth",
        id: nodeId,
        name: node.name,
        currentIndex,
        newIndex,
        position: params.position,
        message: `Node "${node.name}" is already at ${params.position} position`
      };
    }
    parentNode2.insertChild(newIndex, node);
    return {
      operation: "order_by_depth",
      id: nodeId,
      name: node.name,
      currentIndex,
      newIndex,
      position: params.position,
      parentId: parent.id,
      parentName: parent.name,
      message: `Moved "${node.name}" ${params.position} from index ${currentIndex} to ${newIndex} in "${parent.name}"`
    };
  }
  async function moveToPage(params) {
    const nodeId = params.nodeId;
    if (!nodeId) {
      throw new Error('Parameter "id" is required for move_to_page operation');
    }
    if (!params.targetId) {
      throw new Error('Parameter "targetId" is required for move_to_page operation');
    }
    const node = findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    const targetPage = Array.from(figma.root.children).find((child) => child.id === params.targetId);
    if (!targetPage) {
      throw new Error(`Target page ${params.targetId} not found`);
    }
    if (targetPage.type !== "PAGE") {
      throw new Error(`Target ${params.targetId} is not a page node`);
    }
    const oldPage = node.parent;
    const oldPageName = oldPage?.name || "unknown";
    if ("loadAsync" in targetPage) {
      await targetPage.loadAsync();
    }
    if (params.index !== void 0) {
      targetPage.insertChild(params.index, node);
    } else {
      targetPage.appendChild(node);
    }
    return {
      operation: "move_to_page",
      id: nodeId,
      name: node.name,
      oldPageId: oldPage?.id,
      oldPageName,
      targetId: params.targetId,
      targetName: targetPage.name,
      index: params.index,
      message: `Moved "${node.name}" from page "${oldPageName}" to page "${targetPage.name}"${params.index !== void 0 ? ` at index ${params.index}` : ""}`
    };
  }

  // src/operations/manage-images.ts
  var manage_images_exports = {};
  __export(manage_images_exports, {
    MANAGE_IMAGES: () => MANAGE_IMAGES
  });
  init_logger();
  async function findImageUsage(root, imageMap, includeMetadata, filterByHash, filterByNode) {
    const nodesToProcess = [root];
    while (nodesToProcess.length > 0) {
      const node = nodesToProcess.pop();
      if (filterByNode && filterByNode.length > 0 && !filterByNode.includes(node.id)) {
        if ("children" in node) {
          nodesToProcess.push(...node.children);
        }
        continue;
      }
      if ("fills" in node && Array.isArray(node.fills)) {
        for (let index = 0; index < node.fills.length; index++) {
          const fill = node.fills[index];
          if (fill.type === "IMAGE" && fill.imageHash) {
            if (filterByHash && filterByHash.length > 0 && !filterByHash.includes(fill.imageHash)) {
              continue;
            }
            if (!imageMap.has(fill.imageHash)) {
              imageMap.set(fill.imageHash, {
                hash: fill.imageHash,
                usage: { nodes: [], styles: [], components: [], instances: [] }
              });
            }
            const imageInfo = imageMap.get(fill.imageHash);
            const nodeUsage = {
              id: node.id,
              name: node.name,
              type: node.type,
              fillIndex: index
            };
            if (node.parent && node.parent.type !== "PAGE" && node.parent.type !== "DOCUMENT") {
              nodeUsage.parent = {
                id: node.parent.id,
                name: node.parent.name,
                type: node.parent.type
              };
            }
            imageInfo.usage.nodes.push(nodeUsage);
            if (node.type === "COMPONENT") {
              imageInfo.usage.components.push({
                id: node.id,
                name: node.name,
                key: node.key
              });
            }
            if (node.type === "INSTANCE") {
              const mainComponent = await node.getMainComponentAsync();
              imageInfo.usage.instances.push({
                id: node.id,
                name: node.name,
                mainComponentId: node.mainComponent?.id || "",
                mainComponentName: mainComponent?.name
              });
            }
          }
        }
      }
      if ("strokes" in node && Array.isArray(node.strokes)) {
        for (let index = 0; index < node.strokes.length; index++) {
          const stroke = node.strokes[index];
          if (stroke.type === "IMAGE" && stroke.imageHash) {
            if (filterByHash && filterByHash.length > 0 && !filterByHash.includes(stroke.imageHash)) {
              return;
            }
            if (!imageMap.has(stroke.imageHash)) {
              imageMap.set(stroke.imageHash, {
                hash: stroke.imageHash,
                usage: { nodes: [], styles: [], components: [], instances: [] }
              });
            }
            const imageInfo = imageMap.get(stroke.imageHash);
            const nodeUsage = {
              id: node.id,
              name: node.name,
              type: node.type,
              strokeIndex: index
            };
            if (node.parent && node.parent.type !== "PAGE" && node.parent.type !== "DOCUMENT") {
              nodeUsage.parent = {
                id: node.parent.id,
                name: node.parent.name,
                type: node.parent.type
              };
            }
            imageInfo.usage.nodes.push(nodeUsage);
          }
        }
      }
      if ("children" in node) {
        nodesToProcess.push(...node.children);
      }
    }
  }
  async function findStyleImageUsage(imageMap, filterByHash) {
    const paintStyles = await figma.getLocalPaintStylesAsync();
    for (const style of paintStyles) {
      for (const paint of style.paints) {
        if (paint.type === "IMAGE" && paint.imageHash) {
          if (filterByHash && filterByHash.length > 0 && !filterByHash.includes(paint.imageHash)) {
            continue;
          }
          if (!imageMap.has(paint.imageHash)) {
            imageMap.set(paint.imageHash, {
              hash: paint.imageHash,
              usage: { nodes: [], styles: [], components: [], instances: [] }
            });
          }
          const imageInfo = imageMap.get(paint.imageHash);
          imageInfo.usage.styles.push({
            id: style.id,
            name: style.name,
            type: "PAINT",
            key: style.key
          });
        }
      }
    }
  }
  async function getImageMetadata(imageMap) {
    for (const [hash, info] of imageMap) {
      try {
        const image = figma.getImageByHash(hash);
        if (image) {
          const size = await image.getSizeAsync();
          info.width = size.width;
          info.height = size.height;
          info.bytesEstimate = Math.round(size.width * size.height * 3);
        }
      } catch (error) {
        logger2.debug(`Failed to get metadata for image ${hash}:`, error);
      }
    }
  }
  async function MANAGE_IMAGES(payload) {
    const {
      operation,
      pageId,
      includeMetadata = true,
      includeUsage = true,
      filterByHash,
      filterByNode
    } = payload;
    logger2.log("\u{1F5BC}\uFE0F MANAGE_IMAGES operation:", operation);
    switch (operation) {
      case "list": {
        let targetPage;
        if (pageId) {
          const page = figma.root.children.find((p) => p.id === pageId);
          if (!page) {
            throw new Error(`Page not found: ${pageId}`);
          }
          targetPage = page;
        } else {
          targetPage = figma.currentPage;
        }
        const imageMap = /* @__PURE__ */ new Map();
        if (includeUsage) {
          await findImageUsage(targetPage, imageMap, includeMetadata, filterByHash, filterByNode);
          if (!filterByNode || filterByNode.length === 0) {
            await findStyleImageUsage(imageMap, filterByHash);
          }
        } else if (filterByHash && filterByHash.length > 0) {
          for (const hash of filterByHash) {
            imageMap.set(hash, {
              hash,
              usage: { nodes: [], styles: [], components: [], instances: [] }
            });
          }
        }
        if (includeMetadata) {
          await getImageMetadata(imageMap);
        }
        const images = Array.from(imageMap.values()).sort((a, b) => {
          const aUsageCount = a.usage.nodes.length + a.usage.styles.length;
          const bUsageCount = b.usage.nodes.length + b.usage.styles.length;
          return bUsageCount - aUsageCount;
        });
        return {
          pageId: targetPage.id,
          pageName: targetPage.name,
          imageCount: images.length,
          images
        };
      }
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  // src/operations/manage-instances.ts
  var manage_instances_exports = {};
  __export(manage_instances_exports, {
    MANAGE_INSTANCES: () => MANAGE_INSTANCES
  });
  async function MANAGE_INSTANCES(params) {
    return BaseOperation.executeOperation("manageInstances", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const validOperations = ["create", "update", "duplicate", "detach", "swap", "reset_overrides", "get", "list"];
      if (!validOperations.includes(params.operation)) {
        throw new Error(`Unknown instance operation: ${params.operation}. Valid operations: ${validOperations.join(", ")}`);
      }
      switch (params.operation) {
        case "create":
          return await createInstance(params);
        case "update":
          return await updateInstance(params);
        case "duplicate":
          return await duplicateInstance(params);
        case "detach":
          return await detachInstance(params);
        case "swap":
          return await swapInstance(params);
        case "reset_overrides":
          return await resetInstanceOverrides(params);
        case "get":
          return await getInstance(params);
        case "list":
          return await listInstances(params);
        default:
          throw new Error(`Unknown instance operation: ${params.operation}`);
      }
    });
  }
  async function createInstance(params) {
    BaseOperation.validateParams(params, ["componentId"]);
    const node = findNodeById(params.componentId);
    if (!node) {
      throw new Error(`Node with ID ${params.componentId} not found`);
    }
    let targetComponent;
    if (node.type === "COMPONENT") {
      targetComponent = node;
    } else if (node.type === "COMPONENT_SET") {
      const componentSet = node;
      const firstComponent = componentSet.children.find((child) => child.type === "COMPONENT");
      if (!firstComponent) {
        throw new Error(`Component set ${params.componentId} has no components`);
      }
      targetComponent = firstComponent;
    } else {
      throw new Error(`Node ${params.componentId} is not a component or component set`);
    }
    const instance = targetComponent.createInstance();
    if (params.x !== void 0) instance.x = params.x;
    if (params.y !== void 0) instance.y = params.y;
    if (params.name) instance.name = params.name;
    if (params.overrides && typeof params.overrides === "object") {
      try {
        for (const [propertyName, value] of Object.entries(params.overrides)) {
          if (instance.componentProperties && instance.componentProperties[propertyName] !== void 0) {
            instance.componentProperties[propertyName] = value;
          }
        }
      } catch (error) {
        logger.warn(`Failed to apply some overrides: ${error}`);
      }
    }
    figma.currentPage.appendChild(instance);
    return {
      ...formatNodeResponse(instance),
      sourceComponentId: targetComponent.id,
      sourceComponentName: targetComponent.name,
      sourceComponentSetId: node.type === "COMPONENT_SET" ? node.id : void 0,
      sourceComponentSetName: node.type === "COMPONENT_SET" ? node.name : void 0,
      usedDefaultComponent: node.type === "COMPONENT_SET",
      appliedOverrides: params.overrides || {},
      message: "Instance created successfully"
    };
  }
  async function updateInstance(params) {
    BaseOperation.validateParams(params, ["instanceId"]);
    const instance = findNodeById(params.instanceId);
    if (!instance) {
      throw new Error(`Instance with ID ${params.instanceId} not found`);
    }
    if (instance.type !== "INSTANCE") {
      throw new Error(`Node ${params.instanceId} is not an instance`);
    }
    const instanceNode = instance;
    const previousProperties = { ...instanceNode.componentProperties };
    const updates = {};
    if (params.name) {
      instanceNode.name = params.name;
      updates.name = params.name;
    }
    if (params.x !== void 0) {
      instanceNode.x = params.x;
      updates.x = params.x;
    }
    if (params.y !== void 0) {
      instanceNode.y = params.y;
      updates.y = params.y;
    }
    if (params.overrides && typeof params.overrides === "object") {
      try {
        for (const [propertyName, value] of Object.entries(params.overrides)) {
          if (instanceNode.componentProperties && instanceNode.componentProperties[propertyName] !== void 0) {
            instanceNode.componentProperties[propertyName] = value;
            updates[`override_${propertyName}`] = value;
          }
        }
      } catch (error) {
        logger.warn(`Failed to apply some overrides: ${error}`);
      }
    }
    return {
      instanceId: instanceNode.id,
      name: instanceNode.name,
      type: instanceNode.type,
      updates,
      previousProperties,
      updatedProperties: instanceNode.componentProperties || {},
      message: `Successfully updated instance "${instanceNode.name}"`
    };
  }
  async function duplicateInstance(params) {
    BaseOperation.validateParams(params, ["instanceId"]);
    const instance = findNodeById(params.instanceId);
    if (!instance) {
      throw new Error(`Instance with ID ${params.instanceId} not found`);
    }
    if (instance.type !== "INSTANCE") {
      throw new Error(`Node ${params.instanceId} is not an instance`);
    }
    const instanceNode = instance;
    const duplicatedInstance = instanceNode.clone();
    if (params.x !== void 0) {
      duplicatedInstance.x = params.x;
    } else {
      duplicatedInstance.x = instanceNode.x + 20;
    }
    if (params.y !== void 0) {
      duplicatedInstance.y = params.y;
    } else {
      duplicatedInstance.y = instanceNode.y + 20;
    }
    if (params.name) {
      duplicatedInstance.name = params.name;
    } else {
      duplicatedInstance.name = `${instanceNode.name} Copy`;
    }
    figma.currentPage.appendChild(duplicatedInstance);
    return {
      ...formatNodeResponse(duplicatedInstance),
      originalInstanceId: instanceNode.id,
      originalInstanceName: instanceNode.name,
      sourceComponentId: instanceNode.mainComponent?.id,
      sourceComponentName: instanceNode.mainComponent?.name,
      message: `Successfully duplicated instance "${instanceNode.name}"`
    };
  }
  async function detachInstance(params) {
    BaseOperation.validateParams(params, ["instanceId"]);
    const instance = findNodeById(params.instanceId);
    if (!instance) {
      throw new Error(`Instance with ID ${params.instanceId} not found`);
    }
    if (instance.type !== "INSTANCE") {
      throw new Error(`Node ${params.instanceId} is not an instance`);
    }
    const instanceNode = instance;
    const mainComponentName = instanceNode.mainComponent?.name || "Unknown";
    const instanceInfo = {
      id: instanceNode.id,
      name: instanceNode.name,
      originalType: instanceNode.type
    };
    const detachedNode = instanceNode.detachInstance();
    return {
      nodeId: instanceInfo.id,
      name: instanceInfo.name,
      type: detachedNode.type,
      // Use the detached node's new type
      previousMainComponent: mainComponentName,
      previousType: instanceInfo.originalType,
      message: `Successfully detached instance from component "${mainComponentName}"`
    };
  }
  async function swapInstance(params) {
    BaseOperation.validateParams(params, ["instanceId", "mainComponentId"]);
    const instance = findNodeById(params.instanceId);
    if (!instance) {
      throw new Error(`Instance with ID ${params.instanceId} not found`);
    }
    if (instance.type !== "INSTANCE") {
      throw new Error(`Node ${params.instanceId} is not an instance`);
    }
    const newComponent = findNodeById(params.mainComponentId);
    if (!newComponent) {
      throw new Error(`Component with ID ${params.mainComponentId} not found`);
    }
    if (newComponent.type !== "COMPONENT") {
      throw new Error(`Node ${params.mainComponentId} is not a component`);
    }
    const instanceNode = instance;
    const componentNode = newComponent;
    const oldComponentName = instanceNode.mainComponent?.name || "Unknown";
    instanceNode.swapComponent(componentNode);
    return {
      instanceId: instanceNode.id,
      name: instanceNode.name,
      oldComponent: oldComponentName,
      newComponent: componentNode.name,
      newComponentId: componentNode.id,
      message: `Successfully swapped instance from "${oldComponentName}" to "${componentNode.name}"`
    };
  }
  async function resetInstanceOverrides(params) {
    BaseOperation.validateParams(params, ["instanceId"]);
    const instance = findNodeById(params.instanceId);
    if (!instance) {
      throw new Error(`Instance with ID ${params.instanceId} not found`);
    }
    if (instance.type !== "INSTANCE") {
      throw new Error(`Node ${params.instanceId} is not an instance`);
    }
    const instanceNode = instance;
    const previousOverrides = { ...instanceNode.componentProperties };
    if (instanceNode.componentProperties) {
      const mainComponent = instanceNode.mainComponent;
      if (mainComponent && mainComponent.componentPropertyDefinitions) {
        for (const [propertyName, definition] of Object.entries(mainComponent.componentPropertyDefinitions)) {
          if (instanceNode.componentProperties[propertyName] !== void 0) {
            instanceNode.componentProperties[propertyName] = definition.defaultValue;
          }
        }
      }
    }
    return {
      instanceId: instanceNode.id,
      name: instanceNode.name,
      previousOverrides,
      currentOverrides: instanceNode.componentProperties || {},
      resetCount: Object.keys(previousOverrides).length,
      message: `Successfully reset ${Object.keys(previousOverrides).length} overrides for instance "${instanceNode.name}"`
    };
  }
  async function getInstance(params) {
    BaseOperation.validateParams(params, ["instanceId"]);
    const instance = findNodeById(params.instanceId);
    if (!instance) {
      throw new Error(`Instance with ID ${params.instanceId} not found`);
    }
    if (instance.type !== "INSTANCE") {
      throw new Error(`Node ${params.instanceId} is not an instance`);
    }
    const instanceNode = instance;
    try {
      const mainComponent = await instanceNode.getMainComponentAsync();
      const componentProperties = instanceNode.componentProperties || {};
      const overrides = {};
      for (const [propName, propValue] of Object.entries(componentProperties)) {
        overrides[propName] = propValue;
      }
      return {
        id: instanceNode.id,
        name: instanceNode.name,
        type: instanceNode.type,
        x: instanceNode.x,
        y: instanceNode.y,
        width: instanceNode.width,
        height: instanceNode.height,
        rotation: instanceNode.rotation || 0,
        // Figma API stores degrees directly
        opacity: instanceNode.opacity || 1,
        visible: instanceNode.visible !== false,
        locked: instanceNode.locked || false,
        // Instance-specific fields
        sourceComponentId: mainComponent?.id || null,
        sourceComponentName: mainComponent?.name || null,
        sourceComponentType: mainComponent?.type || null,
        overrides,
        position: { x: instanceNode.x, y: instanceNode.y },
        dimensions: { width: instanceNode.width, height: instanceNode.height },
        componentPropertyNames: Object.keys(componentProperties),
        message: `Instance "${instanceNode.name}" retrieved with source component "${mainComponent?.name || "unknown"}"`
      };
    } catch (error) {
      throw new Error(`Failed to get instance details: ${error.toString()}`);
    }
  }
  async function listInstances(params) {
    try {
      const instances = [];
      for (const page of figma.root.children) {
        if (page.type === "PAGE") {
          const pageInstances = findInstancesRecursive(page);
          instances.push(...pageInstances);
        }
      }
      instances.sort((a, b) => a.name.localeCompare(b.name));
      return {
        instances,
        totalCount: instances.length,
        pages: figma.root.children.length,
        message: `Found ${instances.length} instances across ${figma.root.children.length} pages`
      };
    } catch (error) {
      throw new Error(`Failed to list instances: ${error.toString()}`);
    }
  }
  function findInstancesRecursive(node) {
    const instances = [];
    if (node.type === "INSTANCE") {
      const instanceNode = node;
      instances.push({
        id: instanceNode.id,
        name: instanceNode.name,
        type: instanceNode.type,
        x: instanceNode.x,
        y: instanceNode.y,
        width: instanceNode.width,
        height: instanceNode.height,
        sourceComponentId: instanceNode.mainComponent?.id || null,
        sourceComponentName: instanceNode.mainComponent?.name || null,
        overrideCount: instanceNode.componentProperties ? Object.keys(instanceNode.componentProperties).length : 0,
        parentId: instanceNode.parent?.id || null,
        parentName: instanceNode.parent?.name || null,
        parentType: instanceNode.parent?.type || null
      });
    }
    if ("children" in node) {
      for (const child of node.children) {
        instances.push(...findInstancesRecursive(child));
      }
    }
    return instances;
  }

  // src/operations/manage-measurements.ts
  var manage_measurements_exports = {};
  __export(manage_measurements_exports, {
    MEASUREMENT_OPERATION: () => MEASUREMENT_OPERATION
  });
  async function MEASUREMENT_OPERATION(params) {
    return BaseOperation.executeOperation("measurementOperation", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        ["add_measurement", "edit_measurement", "remove_measurement", "list_measurements"]
      );
      switch (operation) {
        case "add_measurement":
          return await addMeasurement(params);
        case "edit_measurement":
          return await editMeasurement(params);
        case "remove_measurement":
          return await removeMeasurement(params);
        case "list_measurements":
          return await listMeasurements(params);
        default:
          throw new Error(`Unknown measurement operation: ${operation}`);
      }
    });
  }
  async function addMeasurement(params) {
    BaseOperation.validateParams(params, ["fromNodeId", "toNodeId", "direction"]);
    const fromNode = findNodeById(params.fromNodeId);
    const toNode = findNodeById(params.toNodeId);
    if (!fromNode || !toNode) {
      throw new Error("One or both nodes not found");
    }
    if (!("x" in fromNode) || !("x" in toNode)) {
      throw new Error("Both nodes must be scene nodes with position");
    }
    const direction = BaseOperation.validateStringParam(
      params.direction,
      "direction",
      ["horizontal", "vertical", "distance"]
    );
    let value;
    let unit = "px";
    switch (direction) {
      case "horizontal":
        value = Math.abs(toNode.x - fromNode.x);
        break;
      case "vertical":
        value = Math.abs(toNode.y - fromNode.y);
        break;
      case "distance":
        const deltaX = toNode.x - fromNode.x;
        const deltaY = toNode.y - fromNode.y;
        value = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        break;
      default:
        throw new Error(`Unknown direction: ${direction}`);
    }
    const measurementId = `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const measurementData = {
      id: measurementId,
      fromNodeId: params.fromNodeId,
      toNodeId: params.toNodeId,
      direction,
      value: Math.round(value * 100) / 100,
      unit,
      label: params.label || `${direction} measurement`,
      customValue: params.customValue || void 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    fromNode.setPluginData("measurement_" + measurementId, JSON.stringify(measurementData));
    toNode.setPluginData("measurement_" + measurementId, JSON.stringify(measurementData));
    return {
      measurementId,
      fromNode: { id: fromNode.id, name: fromNode.name },
      toNode: { id: toNode.id, name: toNode.name },
      direction,
      value: measurementData.value,
      unit,
      label: measurementData.label,
      customValue: measurementData.customValue,
      message: "Measurement added successfully"
    };
  }
  async function editMeasurement(params) {
    BaseOperation.validateParams(params, ["measurementId"]);
    const measurementId = params.measurementId;
    let measurementData = null;
    let ownerNode = null;
    const allNodes = figma.currentPage.findAll(() => true);
    for (const node of allNodes) {
      const data = node.getPluginData("measurement_" + measurementId);
      if (data) {
        measurementData = JSON.parse(data);
        ownerNode = node;
        break;
      }
    }
    if (!measurementData) {
      throw new Error(`Measurement with ID ${measurementId} not found`);
    }
    if (params.label !== void 0) {
      measurementData.label = params.label;
    }
    if (params.customValue !== void 0) {
      measurementData.customValue = params.customValue;
    }
    measurementData.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const fromNode = findNodeById(measurementData.fromNodeId);
    const toNode = findNodeById(measurementData.toNodeId);
    if (fromNode && toNode) {
      fromNode.setPluginData("measurement_" + measurementId, JSON.stringify(measurementData));
      toNode.setPluginData("measurement_" + measurementId, JSON.stringify(measurementData));
    }
    return {
      measurementId,
      label: measurementData.label,
      customValue: measurementData.customValue,
      direction: measurementData.direction,
      value: measurementData.value,
      unit: measurementData.unit,
      message: "Measurement updated successfully"
    };
  }
  async function removeMeasurement(params) {
    BaseOperation.validateParams(params, ["measurementId"]);
    const measurementId = params.measurementId;
    let measurementData = null;
    let removedCount = 0;
    const allNodes = figma.currentPage.findAll(() => true);
    for (const node of allNodes) {
      const data = node.getPluginData("measurement_" + measurementId);
      if (data) {
        if (!measurementData) {
          measurementData = JSON.parse(data);
        }
        node.setPluginData("measurement_" + measurementId, "");
        removedCount++;
      }
    }
    if (!measurementData) {
      throw new Error(`Measurement with ID ${measurementId} not found`);
    }
    return {
      measurementId,
      removedFromNodes: removedCount,
      label: measurementData.label,
      direction: measurementData.direction,
      message: "Measurement removed successfully"
    };
  }
  async function listMeasurements(params) {
    const pageId = params.pageId || figma.currentPage.id;
    const page = pageId === figma.currentPage.id ? figma.currentPage : figma.getNodeById(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }
    const measurements = [];
    const measurementIds = /* @__PURE__ */ new Set();
    const allNodes = page.findAll(() => true);
    for (const node of allNodes) {
      const pluginDataKeys = node.getPluginDataKeys();
      for (const key of pluginDataKeys) {
        if (key.startsWith("measurement_")) {
          const measurementId = key.replace("measurement_", "");
          if (!measurementIds.has(measurementId)) {
            measurementIds.add(measurementId);
            const data = node.getPluginData(key);
            if (data) {
              try {
                const measurementData = JSON.parse(data);
                measurements.push({
                  id: measurementData.id,
                  fromNodeId: measurementData.fromNodeId,
                  toNodeId: measurementData.toNodeId,
                  direction: measurementData.direction,
                  value: measurementData.value,
                  unit: measurementData.unit,
                  label: measurementData.label,
                  customValue: measurementData.customValue,
                  createdAt: measurementData.createdAt,
                  updatedAt: measurementData.updatedAt
                });
              } catch (e) {
              }
            }
          }
        }
      }
    }
    return {
      pageId,
      pageName: page.name,
      measurementCount: measurements.length,
      measurements,
      message: `Found ${measurements.length} measurements`
    };
  }

  // src/operations/manage-nodes.ts
  var manage_nodes_exports = {};
  __export(manage_nodes_exports, {
    MANAGE_NODES: () => MANAGE_NODES,
    getNodesFromParams: () => getNodesFromParams
  });
  init_color_utils();

  // src/utils/smart-positioning.ts
  function getNodeBounds2(node) {
    if ("x" in node && "y" in node && "width" in node && "height" in node) {
      return {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
      };
    }
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  function getNodeBoundsRelativeToParent(node, container) {
    if (!("x" in node && "y" in node && "width" in node && "height" in node)) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    if (container === figma.currentPage) {
      return getNodeBounds2(node);
    }
    return {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
    };
  }
  function boundsOverlap(bounds1, bounds2, buffer = 0) {
    const b1 = {
      x: bounds1.x - buffer,
      y: bounds1.y - buffer,
      width: bounds1.width + 2 * buffer,
      height: bounds1.height + 2 * buffer
    };
    return !(b1.x + b1.width <= bounds2.x || bounds2.x + bounds2.width <= b1.x || b1.y + b1.height <= bounds2.y || bounds2.y + bounds2.height <= b1.y);
  }
  function checkForOverlaps(proposedBounds, parent, buffer = 20) {
    const overlappingNodes = [];
    if (!("children" in parent)) {
      return {
        hasOverlap: false,
        overlappingNodeIds: [],
        overlappingNodes: []
      };
    }
    for (const child of parent.children) {
      if ("x" in child && "y" in child && "width" in child && "height" in child) {
        if (child.type === "SLICE") {
          continue;
        }
        const childBounds = getNodeBounds2(child);
        if (boundsOverlap(proposedBounds, childBounds, buffer)) {
          overlappingNodes.push({
            id: child.id,
            name: child.name,
            bounds: childBounds
          });
        }
      }
    }
    return {
      hasOverlap: overlappingNodes.length > 0,
      overlappingNodeIds: overlappingNodes.map((n) => n.id),
      overlappingNodes
    };
  }
  function findMostRecentNode() {
    const currentPage = figma.currentPage;
    if (!currentPage.children.length) {
      return null;
    }
    const selection = figma.currentPage.selection;
    if (selection.length > 0) {
      return selection[selection.length - 1];
    }
    for (let i = currentPage.children.length - 1; i >= 0; i--) {
      const child = currentPage.children[i];
      if ("x" in child && "y" in child && child.type !== "SLICE") {
        return child;
      }
    }
    return null;
  }
  function findMostRecentNodeInContainer(container) {
    if (!("children" in container) || !container.children.length) {
      return null;
    }
    const selection = figma.currentPage.selection;
    for (let i = selection.length - 1; i >= 0; i--) {
      const selectedNode = selection[i];
      if (selectedNode.parent === container && "x" in selectedNode && "y" in selectedNode) {
        return selectedNode;
      }
    }
    for (let i = container.children.length - 1; i >= 0; i--) {
      const child = container.children[i];
      if ("x" in child && "y" in child && child.type !== "SLICE") {
        return child;
      }
    }
    return null;
  }
  function generatePositionCandidates(referenceBounds, newNodeSize, spacing = 20) {
    const candidates = [];
    candidates.push({
      x: referenceBounds.x + referenceBounds.width + spacing,
      y: referenceBounds.y,
      reason: "Placed to the right of most recent node"
    });
    candidates.push({
      x: referenceBounds.x,
      y: referenceBounds.y + referenceBounds.height + spacing,
      reason: "Placed below most recent node"
    });
    candidates.push({
      x: referenceBounds.x,
      y: referenceBounds.y - newNodeSize.height - spacing,
      reason: "Placed above most recent node"
    });
    candidates.push({
      x: referenceBounds.x - newNodeSize.width - spacing,
      y: referenceBounds.y,
      reason: "Placed to the left of most recent node"
    });
    candidates.push({
      x: referenceBounds.x + referenceBounds.width + spacing,
      y: referenceBounds.y + referenceBounds.height + spacing,
      reason: "Placed diagonally down-right from most recent node"
    });
    candidates.push({
      x: referenceBounds.x - newNodeSize.width - spacing,
      y: referenceBounds.y - newNodeSize.height - spacing,
      reason: "Placed diagonally up-left from most recent node"
    });
    return candidates;
  }
  function findSmartPosition(newNodeSize, parent = figma.currentPage, spacing = 20) {
    const recentNode = parent === figma.currentPage ? findMostRecentNode() : findMostRecentNodeInContainer(parent);
    if (!recentNode) {
      return {
        x: 0,
        y: 0,
        reason: parent === figma.currentPage ? "No existing nodes found, placed at origin" : `No existing nodes in container "${parent.name}", placed at container origin`
      };
    }
    const referenceBounds = getNodeBoundsRelativeToParent(recentNode, parent);
    const candidates = generatePositionCandidates(referenceBounds, newNodeSize, spacing);
    for (const candidate of candidates) {
      const proposedBounds = {
        x: candidate.x,
        y: candidate.y,
        width: newNodeSize.width,
        height: newNodeSize.height
      };
      const overlapInfo = checkForOverlaps(proposedBounds, parent, 0);
      if (!overlapInfo.hasOverlap) {
        return {
          ...candidate,
          reason: parent === figma.currentPage ? candidate.reason : candidate.reason.replace("most recent node", `most recent node in "${parent.name}"`)
        };
      }
    }
    return findGridBasedPosition(newNodeSize, parent, spacing);
  }
  function findGridBasedPosition(newNodeSize, parent, spacing = 20) {
    const gridSize = Math.max(newNodeSize.width, newNodeSize.height) + spacing;
    for (let ring = 0; ring < 10; ring++) {
      for (let i = 0; i <= ring * 2; i++) {
        const positions = [
          { x: ring * gridSize, y: i * gridSize },
          { x: i * gridSize, y: ring * gridSize },
          { x: -ring * gridSize, y: -i * gridSize },
          { x: -i * gridSize, y: -ring * gridSize }
        ];
        for (const pos of positions) {
          const proposedBounds = {
            x: pos.x,
            y: pos.y,
            width: newNodeSize.width,
            height: newNodeSize.height
          };
          const overlapInfo = checkForOverlaps(proposedBounds, parent, 0);
          if (!overlapInfo.hasOverlap) {
            const containerName2 = parent === figma.currentPage ? "page" : `"${parent.name}"`;
            return {
              x: pos.x,
              y: pos.y,
              reason: `Grid-based positioning in ${containerName2} (${ring + 1} rings from origin)`
            };
          }
        }
      }
    }
    const containerName = parent === figma.currentPage ? "page" : `"${parent.name}"`;
    return {
      x: 1e3,
      y: 1e3,
      reason: `Fallback position in ${containerName} - all nearby positions were occupied`
    };
  }
  function createOverlapWarning(overlapInfo, proposedPosition) {
    if (!overlapInfo.hasOverlap) {
      return "";
    }
    const nodeDetails = overlapInfo.overlappingNodes.map((node) => `"${node.name}" (${node.id})`).join(", ");
    return `\u26A0\uFE0F  Node positioned at (${proposedPosition.x}, ${proposedPosition.y}) overlaps with existing nodes: ${nodeDetails}. Consider adjusting position or verify if overlap is intentional.`;
  }

  // src/utils/response-utils.ts
  function formatNodeInfo(node) {
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      x: "x" in node ? node.x : 0,
      y: "y" in node ? node.y : 0,
      width: "width" in node ? node.width : 0,
      height: "height" in node ? node.height : 0
    };
  }
  function formatSelection(selection) {
    return selection.map(formatNodeInfo);
  }
  function formatStyleResponse(style) {
    const response = {
      id: cleanStyleId(style.id),
      // Fix: Remove trailing comma from style ID
      name: style.name,
      type: style.type,
      description: style.description || ""
    };
    if (style.type === "PAINT") {
      response.paints = style.paints;
    } else if (style.type === "TEXT") {
      const textStyle = style;
      response.fontName = textStyle.fontName;
      response.fontSize = textStyle.fontSize;
      response.letterSpacing = textStyle.letterSpacing;
      response.lineHeight = textStyle.lineHeight;
    } else if (style.type === "EFFECT") {
      response.effects = style.effects;
    } else if (style.type === "GRID") {
      response.layoutGrids = style.layoutGrids;
    }
    return cleanEmptyProperties(response) || response;
  }
  function createPageNodesResponse(nodes, detail = "standard") {
    const topLevelNodes = nodes.filter((node) => node.depth === 1);
    const response = {
      nodes,
      totalCount: nodes.length,
      topLevelCount: topLevelNodes.length,
      detail
    };
    if (detail === "simple") {
      response.nodeList = nodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type
      }));
    }
    return response;
  }
  function createOperationSuccessMessage(id, operation, result) {
    return {
      type: "OPERATION_RESPONSE",
      id,
      operation,
      result
    };
  }
  function createOperationErrorMessage(id, operation, error) {
    return {
      type: "OPERATION_RESPONSE",
      id,
      operation,
      error: error instanceof Error ? error.toString() : "Unknown error"
    };
  }
  function createUnknownOperationMessage(id, operation) {
    return {
      type: "OPERATION_RESPONSE",
      id: id || "unknown",
      operation: operation || "unknown",
      success: false,
      error: `Unknown operation: ${operation || "undefined"}`
    };
  }

  // src/utils/vector-sparse-format.ts
  init_color_utils();
  init_logger();
  function removeSymbols(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => removeSymbols(item));
    }
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof key === "symbol" || typeof value === "symbol") {
        continue;
      }
      cleaned[key] = removeSymbols(value);
    }
    return cleaned;
  }
  function createFillHash(fills) {
    return fills.map((fill) => {
      const serializable = {
        type: fill.type,
        visible: fill.visible,
        opacity: fill.opacity,
        blendMode: fill.blendMode
      };
      if (fill.type === "SOLID") {
        const solidFill = fill;
        serializable.color = solidFill.color;
      } else if (fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL" || fill.type === "GRADIENT_ANGULAR" || fill.type === "GRADIENT_DIAMOND") {
        const gradientFill = fill;
        serializable.gradientStops = gradientFill.gradientStops;
        serializable.gradientTransform = gradientFill.gradientTransform;
      } else if (fill.type === "IMAGE") {
        const imageFill = fill;
        serializable.imageHash = imageFill.imageHash;
        serializable.scaleMode = imageFill.scaleMode;
        serializable.scalingFactor = imageFill.scalingFactor;
        serializable.rotation = imageFill.rotation;
        serializable.imageTransform = imageFill.imageTransform;
        serializable.filters = imageFill.filters;
      }
      return JSON.stringify(serializable);
    }).join("|");
  }
  function createDefaultVectorFill(fillColor) {
    if (!fillColor) {
      return [];
    }
    return [createSolidPaint2(fillColor)];
  }
  async function figmaToSparse(figmaNetwork) {
    const sparse = {
      // Convert vertices to JSON array string
      vertices: JSON.stringify(figmaNetwork.vertices.flatMap((v) => [v.x, v.y]))
    };
    if (figmaNetwork.regions && figmaNetwork.regions.length > 0) {
      sparse.regions = [];
      const fillMap = /* @__PURE__ */ new Map();
      const fills = [];
      for (let regionIndex = 0; regionIndex < figmaNetwork.regions.length; regionIndex++) {
        const region = figmaNetwork.regions[regionIndex];
        const sparseRegion = {
          loops: region.loops.map((loop) => JSON.stringify(loop))
        };
        if (region.windingRule !== "NONZERO") {
          sparseRegion.windingRule = region.windingRule;
        }
        if (region.fills && region.fills.length > 0) {
          const fillHash = createFillHash(region.fills);
          if (fillMap.has(fillHash)) {
            sparseRegion.fillIndex = fillMap.get(fillHash);
          } else {
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
      if (fills.length > 0) {
        sparse.fills = fills;
      }
    }
    if (figmaNetwork.segments && figmaNetwork.segments.length > 0) {
      const usedSegments = /* @__PURE__ */ new Set();
      if (figmaNetwork.regions) {
        figmaNetwork.regions.forEach((region) => {
          region.loops.forEach((loop) => {
            for (let i = 0; i < loop.length; i++) {
              const start = loop[i];
              const end = loop[(i + 1) % loop.length];
              usedSegments.add(`${start}-${end}`);
            }
          });
        });
      }
      const openPaths = [];
      const processedSegments = /* @__PURE__ */ new Set();
      figmaNetwork.segments.forEach((segment, segmentIndex) => {
        if (processedSegments.has(segmentIndex)) return;
        const segmentKey = `${segment.start}-${segment.end}`;
        if (!usedSegments.has(segmentKey)) {
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
    if (figmaNetwork.segments) {
      const vertexHandles = {};
      for (let i = 0; i < figmaNetwork.vertices.length; i++) {
        vertexHandles[i.toString()] = [0, 0, 0, 0];
      }
      figmaNetwork.segments.forEach((segment) => {
        const startVertex = segment.start.toString();
        const endVertex = segment.end.toString();
        if (segment.tangentStart && (segment.tangentStart.x !== 0 || segment.tangentStart.y !== 0)) {
          vertexHandles[startVertex][2] = segment.tangentStart.x;
          vertexHandles[startVertex][3] = segment.tangentStart.y;
        }
        if (segment.tangentEnd && (segment.tangentEnd.x !== 0 || segment.tangentEnd.y !== 0)) {
          vertexHandles[endVertex][0] = segment.tangentEnd.x;
          vertexHandles[endVertex][1] = segment.tangentEnd.y;
        }
      });
      const handles = {};
      Object.entries(vertexHandles).forEach(([vertexIndex, [inX, inY, outX, outY]]) => {
        if (inX !== 0 || inY !== 0 || outX !== 0 || outY !== 0) {
          handles[vertexIndex] = JSON.stringify([inX, inY, outX, outY]);
        }
      });
      if (Object.keys(handles).length > 0) {
        sparse.handles = handles;
      }
    }
    if (figmaNetwork.vertices) {
      const vertexProps = {};
      figmaNetwork.vertices.forEach((vertex, index) => {
        const props = {};
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
    const symbolFreeSparse = removeSymbols(sparse);
    const cleanedSparse = await cleanEmptyPropertiesAsync(symbolFreeSparse);
    return cleanedSparse || symbolFreeSparse;
  }
  function traceOpenPath(segments, startSegmentIndex, processedSegments) {
    const path = [];
    const segment = segments[startSegmentIndex];
    path.push(segment.start, segment.end);
    processedSegments.add(startSegmentIndex);
    let currentEnd = segment.end;
    while (true) {
      const nextSegmentIndex = segments.findIndex(
        (seg, index) => !processedSegments.has(index) && seg.start === currentEnd
      );
      if (nextSegmentIndex === -1) break;
      const nextSegment = segments[nextSegmentIndex];
      path.push(nextSegment.end);
      processedSegments.add(nextSegmentIndex);
      currentEnd = nextSegment.end;
    }
    let currentStart = segment.start;
    while (true) {
      const prevSegmentIndex = segments.findIndex(
        (seg, index) => !processedSegments.has(index) && seg.end === currentStart
      );
      if (prevSegmentIndex === -1) break;
      const prevSegment = segments[prevSegmentIndex];
      path.unshift(prevSegment.start);
      processedSegments.add(prevSegmentIndex);
      currentStart = prevSegment.start;
    }
    return path;
  }
  function sparseToFigma(sparse) {
    const figmaNetwork = {
      vertices: [],
      segments: [],
      regions: []
    };
    if (!sparse.vertices || typeof sparse.vertices !== "string") {
      throw new Error('vertices must be a JSON array string like "[0,0,100,0,50,100]"');
    }
    let vertexValues;
    try {
      vertexValues = JSON.parse(sparse.vertices);
      if (!Array.isArray(vertexValues)) {
        throw new Error("vertices must be a JSON array");
      }
      if (vertexValues.length % 2 !== 0) {
        throw new Error("vertices array must contain pairs of x,y coordinates");
      }
    } catch (parseError) {
      logger2.debug("JSON parse error for vertices:", parseError);
      throw new Error(`Invalid vertices format: must be a valid JSON array string like "[0,0,100,0,50,100]"`);
    }
    for (let i = 0; i < vertexValues.length; i += 2) {
      const vertex = {
        x: vertexValues[i],
        y: vertexValues[i + 1],
        strokeCap: "NONE",
        // Use NONE to match UI-created vectors
        strokeJoin: "MITER",
        cornerRadius: 0,
        handleMirroring: "NONE"
      };
      const vertexIndex = Math.floor(i / 2);
      if (sparse.vertexProps && sparse.vertexProps[vertexIndex.toString()]) {
        const props = sparse.vertexProps[vertexIndex.toString()];
        Object.assign(vertex, props);
      }
      figmaNetwork.vertices.push(vertex);
    }
    if (sparse.regions) {
      sparse.regions.forEach((region, regionIndex) => {
        if (!region.loops || !Array.isArray(region.loops)) {
          throw new Error(`Region ${regionIndex}: loops must be an array of JSON strings like ["[0,1,2,3]"]`);
        }
        let parsedLoops;
        try {
          parsedLoops = region.loops.map((loopStr) => {
            if (typeof loopStr !== "string") {
              throw new Error("loop must be a JSON string");
            }
            const parsed = JSON.parse(loopStr);
            if (!Array.isArray(parsed)) {
              throw new Error("loop must contain a JSON array");
            }
            parsed.forEach((vertexIndex) => {
              if (typeof vertexIndex !== "number" || vertexIndex < 0 || vertexIndex >= vertexValues.length / 2) {
                throw new Error(`invalid vertex index ${vertexIndex} - must reference a valid vertex (0-${Math.floor(vertexValues.length / 2) - 1})`);
              }
            });
            return parsed;
          });
        } catch (parseError) {
          throw new Error(`Region ${regionIndex}: ${parseError.message}. Expected format: loops: ["[0,1,2,3]"]`);
        }
        const figmaRegion = {
          windingRule: region.windingRule || "NONZERO",
          loops: parsedLoops,
          fillStyleId: "",
          fills: []
        };
        if (region.fillIndex !== void 0 && sparse.fills && sparse.fills[region.fillIndex]) {
          figmaRegion.fills = sparse.fills[region.fillIndex];
        }
        figmaNetwork.regions.push(figmaRegion);
        parsedLoops.forEach((loop) => {
          for (let i = 0; i < loop.length; i++) {
            const start = loop[i];
            const end = loop[(i + 1) % loop.length];
            const segment = {
              start,
              end,
              tangentStart: { x: 0, y: 0 },
              tangentEnd: { x: 0, y: 0 }
            };
            if (sparse.handles && sparse.handles[start.toString()]) {
              const startHandles = JSON.parse(sparse.handles[start.toString()]);
              segment.tangentStart = { x: startHandles[2], y: startHandles[3] };
            }
            if (sparse.handles && sparse.handles[end.toString()]) {
              const endHandles = JSON.parse(sparse.handles[end.toString()]);
              segment.tangentEnd = { x: endHandles[0], y: endHandles[1] };
            }
            figmaNetwork.segments.push(segment);
          }
        });
      });
    }
    if (sparse.paths) {
      sparse.paths.forEach((pathStr) => {
        const path = JSON.parse(pathStr);
        for (let i = 0; i < path.length - 1; i++) {
          const start = path[i];
          const end = path[i + 1];
          if (start < 0 || start >= vertexValues.length / 2 || end < 0 || end >= vertexValues.length / 2) {
            throw new Error(`Path contains invalid vertex indices: ${start}-${end}. Valid range: 0-${Math.floor(vertexValues.length / 2) - 1}`);
          }
          const segment = {
            start,
            end,
            tangentStart: { x: 0, y: 0 },
            tangentEnd: { x: 0, y: 0 }
          };
          if (sparse.handles && sparse.handles[start.toString()]) {
            const startHandles = JSON.parse(sparse.handles[start.toString()]);
            segment.tangentStart = { x: startHandles[2], y: startHandles[3] };
          }
          if (sparse.handles && sparse.handles[end.toString()]) {
            const endHandles = JSON.parse(sparse.handles[end.toString()]);
            segment.tangentEnd = { x: endHandles[0], y: endHandles[1] };
          }
          figmaNetwork.segments.push(segment);
        }
      });
    }
    return figmaNetwork;
  }

  // src/operations/manage-nodes.ts
  function addNodeToParent(node, parentId) {
    if (parentId) {
      const parentNode2 = findNodeById(parentId);
      if (!parentNode2) {
        throw new Error(`Parent node with ID ${parentId} not found`);
      }
      const containerTypes = ["DOCUMENT", "PAGE", "FRAME", "GROUP", "COMPONENT", "COMPONENT_SET", "SLIDE", "SLIDE_ROW", "SECTION", "STICKY", "SHAPE_WITH_TEXT", "TABLE", "CODE_BLOCK"];
      if (!containerTypes.includes(parentNode2.type)) {
        throw new Error(`Parent node type '${parentNode2.type}' cannot contain child nodes. Valid container types: ${containerTypes.join(", ")}`);
      }
      parentNode2.appendChild(node);
      return parentNode2;
    } else {
      figma.currentPage.appendChild(node);
      return figma.currentPage;
    }
  }
  async function MANAGE_NODES(params) {
    return BaseOperation.executeOperation("manageNodes", params, async () => {
      if (!params.operation) {
        throw new Error("operation parameter is required");
      }
      const validOperations = [
        "get",
        "list",
        "update",
        "delete",
        "duplicate",
        "create_rectangle",
        "create_ellipse",
        "create_frame",
        "create_section",
        "create_slice",
        "create_star",
        "create_polygon",
        "update_rectangle",
        "update_ellipse",
        "update_frame",
        "update_section",
        "update_slice",
        "update_star",
        "update_polygon"
      ];
      if (!validOperations.includes(params.operation)) {
        throw new Error(`Unknown node operation: ${params.operation}. Valid operations: ${validOperations.join(", ")}`);
      }
      switch (params.operation) {
        case "get":
          return await getNode(params);
        case "list":
          return await listNodes(params);
        case "update":
          return await updateNode(params);
        case "delete":
          return await deleteNode(params);
        case "duplicate":
          return await duplicateNode(params);
        case "create_rectangle":
          return await createRectangle(params);
        case "create_ellipse":
          return await createEllipse(params);
        case "create_frame":
          return await createFrame(params);
        case "create_section":
          return await createSection(params);
        case "create_slice":
          return await createSlice(params);
        case "create_star":
          return await createStar(params);
        case "create_polygon":
          return await createPolygon(params);
        case "update_rectangle":
          return await updateRectangle(params);
        case "update_ellipse":
          return await updateEllipse(params);
        case "update_frame":
          return await updateFrame(params);
        case "update_section":
          return await updateSection(params);
        case "update_slice":
          return await updateSlice(params);
        case "update_star":
          return await updateStar(params);
        case "update_polygon":
          return await updatePolygon(params);
        default:
          throw new Error(`Unknown node operation: ${params.operation}`);
      }
    });
  }
  async function getNode(params) {
    return BaseOperation.executeOperation("getNode", params, async () => {
      BaseOperation.validateParams(params, ["nodeId"]);
      const nodeIds = normalizeToArray(params.nodeId);
      const results = [];
      for (let i = 0; i < nodeIds.length; i++) {
        try {
          const nodeId = nodeIds[i];
          const node = findNodeById(nodeId);
          if (!node) {
            throw new Error(`Node with ID ${nodeId} not found`);
          }
          const nodeData = formatNodeResponse(node);
          const cleanData = removeSymbols(nodeData);
          results.push(cleanData);
        } catch (error) {
          handleBulkError(error, results, i, "get", nodeIds[i]);
        }
      }
      return createBulkSummary(results, "get");
    });
  }
  async function getNodesFromParams(params, detail = "standard") {
    const pageId = params && params.pageId !== null && params.pageId !== void 0 ? params.pageId : void 0;
    const nodeId = params && params.nodeId !== null && params.nodeId !== void 0 ? params.nodeId : void 0;
    const traversal = params && params.traversal !== null && params.traversal !== void 0 ? params.traversal : void 0;
    const filterByType = params && params.filterByType !== null && params.filterByType !== void 0 ? params.filterByType : [];
    const filterByName = params && params.filterByName !== null && params.filterByName !== void 0 ? params.filterByName : void 0;
    const filterByVisibility = params && params.filterByVisibility !== null && params.filterByVisibility !== void 0 ? params.filterByVisibility : "visible";
    const filterByLockedState = params && params.filterByLockedState !== null && params.filterByLockedState !== void 0 ? params.filterByLockedState : void 0;
    const maxDepth = params && params.maxDepth !== null && params.maxDepth !== void 0 ? params.maxDepth : null;
    const maxResults = params && params.maxResults !== null && params.maxResults !== void 0 ? params.maxResults : void 0;
    const includeAllPages = params && params.includeAllPages !== null && params.includeAllPages !== void 0 ? params.includeAllPages : false;
    let allNodes = [];
    let targetPage;
    if (pageId) {
      await figma.loadAllPagesAsync();
      const foundPage = figma.root.children.find((page) => page.id === pageId && page.type === "PAGE");
      if (!foundPage) {
        throw new Error(`Page not found: ${pageId}. Available pages: ${figma.root.children.filter((p) => p.type === "PAGE").map((p) => `${p.name} (${p.id})`).join(", ")}`);
      }
      targetPage = foundPage;
      await targetPage.loadAsync();
    } else {
      targetPage = figma.currentPage;
    }
    if (includeAllPages) {
      await figma.loadAllPagesAsync();
    }
    const startingIds = nodeId;
    if (startingIds) {
      const ids = Array.isArray(startingIds) ? startingIds : [startingIds];
      for (const id of ids) {
        let startNode = null;
        if (pageId && !includeAllPages) {
          startNode = findNodeInPage(targetPage, id);
          if (!startNode) {
            throw new Error(`Node not found in page "${targetPage.name}" (${targetPage.id}): ${id}`);
          }
        } else {
          startNode = findNodeById(id);
          if (!startNode) {
            throw new Error(`Node not found: ${id}`);
          }
        }
        if (traversal === "children") {
          if (startNode.type === "PAGE") {
            await startNode.loadAsync();
          }
          if ("children" in startNode) {
            const children = startNode.children;
            allNodes.push(...children);
          }
        } else if (traversal === "ancestors") {
          let current = startNode.parent;
          while (current && current.type !== "PAGE") {
            allNodes.push(current);
            current = current.parent;
          }
        } else if (traversal === "siblings") {
          const parent = startNode.parent;
          if (parent && "children" in parent) {
            allNodes.push(...parent.children.filter((child) => child.id !== startNode.id));
          }
        } else if (traversal === "descendants" || !traversal) {
          const includeHidden = filterByVisibility !== "visible";
          if (startNode.type === "PAGE") {
            await startNode.loadAsync();
            if ("children" in startNode) {
              for (const child of startNode.children) {
                allNodes.push(...getAllNodes(child, detail, includeHidden, maxDepth, 1, startNode.id));
              }
            }
          } else {
            allNodes.push(...getAllNodes(startNode, detail, includeHidden, maxDepth));
          }
        }
      }
    } else {
      const includeHidden = filterByVisibility !== "visible";
      if (includeAllPages) {
        for (const page of figma.root.children) {
          if (page.type === "PAGE") {
            await page.loadAsync();
            const pageNodes = getAllNodes(page, detail, includeHidden, maxDepth);
            allNodes.push(...pageNodes);
          }
        }
      } else {
        allNodes = getAllNodes(targetPage, detail, includeHidden, maxDepth);
      }
    }
    if (filterByVisibility === "visible") {
      allNodes = allNodes.filter((node) => node.visible);
    } else if (filterByVisibility === "hidden") {
      allNodes = allNodes.filter((node) => !node.visible);
    }
    if (!includeAllPages) {
      allNodes = allNodes.filter((node) => node.type !== "PAGE");
    }
    if (filterByType.length > 0) {
      const normalizedTypes = filterByType.map((type) => type.toUpperCase());
      allNodes = allNodes.filter((node) => normalizedTypes.includes(node.type));
    }
    if (filterByName) {
      const nameRegex = new RegExp(filterByName, "i");
      allNodes = allNodes.filter((node) => nameRegex.test(node.name));
    }
    if (filterByLockedState !== void 0) {
      allNodes = allNodes.filter((node) => node.locked === filterByLockedState);
    }
    if (maxResults && allNodes.length > maxResults) {
      allNodes = allNodes.slice(0, maxResults);
    }
    return allNodes;
  }
  async function listNodes(params = {}) {
    return BaseOperation.executeOperation("listNodes", params, async () => {
      const nodeIdFilter = params && params.nodeId !== null && params.nodeId !== void 0;
      const traversalFilter = params && params.traversal !== null && params.traversal !== void 0;
      const typeFilter = params && params.filterByType !== null && params.filterByType !== void 0 && Array.isArray(params.filterByType) && params.filterByType.length > 0;
      const nameFilter = params && params.filterByName !== null && params.filterByName !== void 0;
      const visibilityFilter = params && params.filterByVisibility !== null && params.filterByVisibility !== void 0 && params.filterByVisibility !== "visible";
      const lockedFilter = params && params.filterByLockedState !== null && params.filterByLockedState !== void 0;
      const maxResultsFilter = params && params.maxResults !== null && params.maxResults !== void 0;
      const includeAllPagesFilter = params && params.includeAllPages !== null && params.includeAllPages !== void 0 && params.includeAllPages === true;
      const hasFilters = nodeIdFilter || traversalFilter || typeFilter || nameFilter || visibilityFilter || lockedFilter || maxResultsFilter || includeAllPagesFilter;
      const detail = params && params.detail !== null && params.detail !== void 0 ? params.detail : hasFilters ? "standard" : "minimal";
      const allNodes = await getNodesFromParams(params, detail);
      const cleanNodes = allNodes.map((node) => removeSymbols(node));
      const pageData = createPageNodesResponse(cleanNodes, detail);
      return pageData;
    });
  }
  async function updateNode(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (const nodeId of nodeIds) {
      try {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (params.name !== void 0) {
          node.name = params.name;
        }
        if (params.x !== void 0 || params.y !== void 0) {
          const currentX = "x" in node ? node.x : 0;
          const currentY = "y" in node ? node.y : 0;
          moveNodeToPosition(
            node,
            params.x !== void 0 ? params.x : currentX,
            params.y !== void 0 ? params.y : currentY
          );
        }
        if (params.width !== void 0 || params.height !== void 0) {
          const currentWidth = "width" in node ? node.width : 100;
          const currentHeight = "height" in node ? node.height : 100;
          resizeNode(
            node,
            params.width !== void 0 ? params.width : currentWidth,
            params.height !== void 0 ? params.height : currentHeight
          );
        }
        if (params.rotation !== void 0) {
          node.rotation = params.rotation;
        }
        if (params.visible !== void 0) {
          node.visible = params.visible;
        }
        if (params.locked !== void 0) {
          node.locked = params.locked;
        }
        if (params.opacity !== void 0) {
          node.opacity = params.opacity;
        }
        if (params.blendMode !== void 0) {
          node.blendMode = params.blendMode;
        }
        await applyCommonNodeProperties(node, params, 0);
        results.push(formatNodeResponse(node));
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }
  async function deleteNode(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (const nodeId of nodeIds) {
      try {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        const nodeInfo = formatNodeResponse(node);
        node.remove();
        results.push(nodeInfo);
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }
  async function duplicateNode(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (const nodeId of nodeIds) {
      try {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        const count = params.count || 1;
        const offsetX = params.offsetX ?? 10;
        const offsetY = params.offsetY ?? 10;
        if (count > 1) {
          const duplicates = [];
          for (let i = 0; i < count; i++) {
            const duplicate = node.clone();
            if ("x" in duplicate && "y" in duplicate) {
              duplicate.x = node.x + offsetX * (i + 1);
              duplicate.y = node.y + offsetY * (i + 1);
            }
            if (node.parent) {
              const index = node.parent.children.indexOf(node);
              node.parent.insertChild(index + 1 + i, duplicate);
            }
            duplicates.push(formatNodeResponse(duplicate));
          }
          results.push(...duplicates);
        } else {
          const duplicate = node.clone();
          if ("x" in duplicate && "y" in duplicate) {
            duplicate.x = node.x + offsetX;
            duplicate.y = node.y + offsetY;
          }
          if (node.parent) {
            const index = node.parent.children.indexOf(node);
            node.parent.insertChild(index + 1, duplicate);
          }
          results.push(formatNodeResponse(duplicate));
        }
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }
  async function createRectangle(params) {
    const results = [];
    const count = Array.isArray(params.name) ? params.name.length : Array.isArray(params.x) ? params.x.length : Array.isArray(params.y) ? params.y.length : 1;
    for (let i = 0; i < count; i++) {
      try {
        const rect = figma.createRectangle();
        rect.name = Array.isArray(params.name) ? params.name[i] : params.name || "Rectangle";
        const width = Array.isArray(params.width) ? params.width[i] : params.width || 100;
        const height = Array.isArray(params.height) ? params.height[i] : params.height || 100;
        resizeNode(rect, width, height);
        const parentContainer = addNodeToParent(rect, params.parentId);
        const x = Array.isArray(params.x) ? params.x[i] : params.x;
        const y = Array.isArray(params.y) ? params.y[i] : params.y;
        const positionResult = handleNodePositioning(rect, { x, y }, { width, height }, parentContainer);
        await applyCommonNodeProperties(rect, params, i);
        const response = formatNodeResponse(rect);
        if (positionResult.warning) response.warning = positionResult.warning;
        if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
        results.push(response);
      } catch (error) {
        handleBulkError(error, `rectangle_${i}`, results);
      }
    }
    return createBulkSummary(results, count);
  }
  async function createEllipse(params) {
    const results = [];
    const count = Array.isArray(params.name) ? params.name.length : Array.isArray(params.x) ? params.x.length : Array.isArray(params.y) ? params.y.length : 1;
    for (let i = 0; i < count; i++) {
      try {
        const ellipse = figma.createEllipse();
        ellipse.name = Array.isArray(params.name) ? params.name[i] : params.name || "Ellipse";
        const width = Array.isArray(params.width) ? params.width[i] : params.width || 100;
        const height = Array.isArray(params.height) ? params.height[i] : params.height || 100;
        resizeNode(ellipse, width, height);
        const parentContainer = addNodeToParent(ellipse, params.parentId);
        const x = Array.isArray(params.x) ? params.x[i] : params.x;
        const y = Array.isArray(params.y) ? params.y[i] : params.y;
        const positionResult = handleNodePositioning(ellipse, { x, y }, { width, height }, parentContainer);
        await applyCommonNodeProperties(ellipse, params, i);
        const response = formatNodeResponse(ellipse);
        if (positionResult.warning) response.warning = positionResult.warning;
        if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
        results.push(response);
      } catch (error) {
        handleBulkError(error, `ellipse_${i}`, results);
      }
    }
    return createBulkSummary(results, count);
  }
  async function createFrame(params) {
    const results = [];
    const count = Array.isArray(params.name) ? params.name.length : Array.isArray(params.x) ? params.x.length : Array.isArray(params.y) ? params.y.length : 1;
    for (let i = 0; i < count; i++) {
      try {
        const frame = figma.createFrame();
        frame.name = Array.isArray(params.name) ? params.name[i] : params.name || "Frame";
        const width = Array.isArray(params.width) ? params.width[i] : params.width || 200;
        const height = Array.isArray(params.height) ? params.height[i] : params.height || 200;
        resizeNode(frame, width, height);
        const parentContainer = addNodeToParent(frame, params.parentId);
        const x = Array.isArray(params.x) ? params.x[i] : params.x;
        const y = Array.isArray(params.y) ? params.y[i] : params.y;
        const positionResult = handleNodePositioning(frame, { x, y }, { width, height }, parentContainer);
        await applyFrameProperties(frame, params, i);
        await applyCommonNodeProperties(frame, params, i);
        const response = formatNodeResponse(frame);
        if (positionResult.warning) response.warning = positionResult.warning;
        if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
        results.push(response);
      } catch (error) {
        handleBulkError(error, `frame_${i}`, results);
      }
    }
    return createBulkSummary(results, count);
  }
  async function createSection(params) {
    const results = [];
    const count = Array.isArray(params.name) ? params.name.length : Array.isArray(params.x) ? params.x.length : Array.isArray(params.y) ? params.y.length : 1;
    for (let i = 0; i < count; i++) {
      try {
        const section = figma.createSection();
        section.name = Array.isArray(params.name) ? params.name[i] : params.name || "Section";
        const width = Array.isArray(params.width) ? params.width[i] : params.width || 300;
        const height = Array.isArray(params.height) ? params.height[i] : params.height || 200;
        section.resizeWithoutConstraints(width, height);
        const parentContainer = addNodeToParent(section, params.parentId);
        const x = Array.isArray(params.x) ? params.x[i] : params.x;
        const y = Array.isArray(params.y) ? params.y[i] : params.y;
        const positionResult = handleNodePositioning(section, { x, y }, { width, height }, parentContainer);
        await applySectionProperties(section, params, i);
        await applyCommonNodeProperties(section, params, i);
        const response = formatNodeResponse(section);
        if (positionResult.warning) response.warning = positionResult.warning;
        if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
        results.push(response);
      } catch (error) {
        handleBulkError(error, `section_${i}`, results);
      }
    }
    return createBulkSummary(results, count);
  }
  async function createSlice(params) {
    const results = [];
    const count = Array.isArray(params.name) ? params.name.length : Array.isArray(params.x) ? params.x.length : Array.isArray(params.y) ? params.y.length : 1;
    for (let i = 0; i < count; i++) {
      try {
        const slice = figma.createSlice();
        slice.name = Array.isArray(params.name) ? params.name[i] : params.name || "Slice";
        const width = Array.isArray(params.width) ? params.width[i] : params.width || 100;
        const height = Array.isArray(params.height) ? params.height[i] : params.height || 100;
        resizeNode(slice, width, height);
        const parentContainer = addNodeToParent(slice, params.parentId);
        const x = Array.isArray(params.x) ? params.x[i] : params.x;
        const y = Array.isArray(params.y) ? params.y[i] : params.y;
        const positionResult = handleNodePositioning(slice, { x, y }, { width, height }, parentContainer);
        await applyCommonNodeProperties(slice, params, i);
        const response = formatNodeResponse(slice);
        if (positionResult.warning) response.warning = positionResult.warning;
        if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
        results.push(response);
      } catch (error) {
        handleBulkError(error, `slice_${i}`, results);
      }
    }
    return createBulkSummary(results, count);
  }
  async function createStar(params) {
    const results = [];
    const count = Array.isArray(params.name) ? params.name.length : Array.isArray(params.x) ? params.x.length : Array.isArray(params.y) ? params.y.length : 1;
    for (let i = 0; i < count; i++) {
      try {
        const star = figma.createStar();
        star.name = Array.isArray(params.name) ? params.name[i] : params.name || "Star";
        const width = Array.isArray(params.width) ? params.width[i] : params.width || 100;
        const height = Array.isArray(params.height) ? params.height[i] : params.height || 100;
        resizeNode(star, width, height);
        const parentContainer = addNodeToParent(star, params.parentId);
        const x = Array.isArray(params.x) ? params.x[i] : params.x;
        const y = Array.isArray(params.y) ? params.y[i] : params.y;
        const positionResult = handleNodePositioning(star, { x, y }, { width, height }, parentContainer);
        await applyStarProperties(star, params, i);
        await applyCommonNodeProperties(star, params, i);
        const response = formatNodeResponse(star);
        if (positionResult.warning) response.warning = positionResult.warning;
        if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
        results.push(response);
      } catch (error) {
        handleBulkError(error, `star_${i}`, results);
      }
    }
    return createBulkSummary(results, count);
  }
  async function createPolygon(params) {
    const results = [];
    const count = Array.isArray(params.name) ? params.name.length : Array.isArray(params.x) ? params.x.length : Array.isArray(params.y) ? params.y.length : 1;
    for (let i = 0; i < count; i++) {
      try {
        const polygon = figma.createPolygon();
        polygon.name = Array.isArray(params.name) ? params.name[i] : params.name || "Polygon";
        const width = Array.isArray(params.width) ? params.width[i] : params.width || 100;
        const height = Array.isArray(params.height) ? params.height[i] : params.height || 100;
        resizeNode(polygon, width, height);
        const parentContainer = addNodeToParent(polygon, params.parentId);
        const x = Array.isArray(params.x) ? params.x[i] : params.x;
        const y = Array.isArray(params.y) ? params.y[i] : params.y;
        const positionResult = handleNodePositioning(polygon, { x, y }, { width, height }, parentContainer);
        await applyPolygonProperties(polygon, params, i);
        await applyCommonNodeProperties(polygon, params, i);
        const response = formatNodeResponse(polygon);
        if (positionResult.warning) response.warning = positionResult.warning;
        if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
        results.push(response);
      } catch (error) {
        handleBulkError(error, `polygon_${i}`, results);
      }
    }
    return createBulkSummary(results, count);
  }
  async function updateRectangle(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      try {
        const nodeId = nodeIds[i];
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (node.type !== "RECTANGLE") {
          throw new Error(`Node ${nodeId} is not a rectangle (type: ${node.type})`);
        }
        applyCornerRadius(node, params, i);
        results.push(formatNodeResponse(node));
      } catch (error) {
        handleBulkError(error, results, i, "update_rectangle", nodeIds[i]);
      }
    }
    return createBulkSummary(results, "update_rectangle");
  }
  async function updateEllipse(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    return await updateNode(params);
  }
  async function updateFrame(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      try {
        const nodeId = nodeIds[i];
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (node.type !== "FRAME") {
          throw new Error(`Node ${nodeId} is not a frame (type: ${node.type})`);
        }
        await applyFrameProperties(node, params, i);
        results.push(formatNodeResponse(node));
      } catch (error) {
        handleBulkError(error, results, i, "update_frame", nodeIds[i]);
      }
    }
    return createBulkSummary(results, "update_frame");
  }
  async function updateSection(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      try {
        const nodeId = nodeIds[i];
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (node.type !== "SECTION") {
          throw new Error(`Node ${nodeId} is not a section (type: ${node.type})`);
        }
        await applySectionProperties(node, params, i);
        results.push(formatNodeResponse(node));
      } catch (error) {
        handleBulkError(error, results, i, "update_section", nodeIds[i]);
      }
    }
    return createBulkSummary(results, "update_section");
  }
  async function updateSlice(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    return await updateNode(params);
  }
  async function updateStar(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      try {
        const nodeId = nodeIds[i];
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (node.type !== "STAR") {
          throw new Error(`Node ${nodeId} is not a star (type: ${node.type})`);
        }
        await applyStarProperties(node, params, i);
        results.push(formatNodeResponse(node));
      } catch (error) {
        handleBulkError(error, results, i, "update_star", nodeIds[i]);
      }
    }
    return createBulkSummary(results, "update_star");
  }
  async function updatePolygon(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      try {
        const nodeId = nodeIds[i];
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (node.type !== "POLYGON") {
          throw new Error(`Node ${nodeId} is not a polygon (type: ${node.type})`);
        }
        await applyPolygonProperties(node, params, i);
        results.push(formatNodeResponse(node));
      } catch (error) {
        handleBulkError(error, results, i, "update_polygon", nodeIds[i]);
      }
    }
    return createBulkSummary(results, "update_polygon");
  }
  async function applyCommonNodeProperties(node, params, index) {
    const rotation = Array.isArray(params.rotation) ? params.rotation[index] : params.rotation;
    if (rotation !== void 0) {
      node.rotation = rotation;
    }
    const visible = Array.isArray(params.visible) ? params.visible[index] : params.visible;
    if (visible !== void 0) {
      node.visible = visible;
    }
    const locked = Array.isArray(params.locked) ? params.locked[index] : params.locked;
    if (locked !== void 0) {
      node.locked = locked;
    }
    const opacity = Array.isArray(params.opacity) ? params.opacity[index] : params.opacity;
    if (opacity !== void 0) {
      node.opacity = opacity;
    }
    const fillColor = Array.isArray(params.fillColor) ? params.fillColor[index] : params.fillColor;
    if (fillColor && "fills" in node) {
      const solidPaint = createSolidPaint2(fillColor);
      node.fills = [solidPaint];
    }
    const fillOpacity = Array.isArray(params.fillOpacity) ? params.fillOpacity[index] : params.fillOpacity;
    if (fillOpacity !== void 0 && "fills" in node && node.fills.length > 0) {
      const fills = [...node.fills];
      fills[0] = { ...fills[0], opacity: fillOpacity };
      node.fills = fills;
    }
    const strokeColor = Array.isArray(params.strokeColor) ? params.strokeColor[index] : params.strokeColor;
    if (strokeColor && "strokes" in node) {
      const strokePaint = createSolidPaint2(strokeColor);
      node.strokes = [strokePaint];
    }
    const strokeOpacity = Array.isArray(params.strokeOpacity) ? params.strokeOpacity[index] : params.strokeOpacity;
    if (strokeOpacity !== void 0 && "strokes" in node && node.strokes.length > 0) {
      const strokes = [...node.strokes];
      strokes[0] = { ...strokes[0], opacity: strokeOpacity };
      node.strokes = strokes;
    }
    const strokeWeight = Array.isArray(params.strokeWeight) ? params.strokeWeight[index] : params.strokeWeight;
    if (strokeWeight !== void 0 && "strokeWeight" in node) {
      node.strokeWeight = Math.max(0, strokeWeight);
    }
    const strokeAlign = Array.isArray(params.strokeAlign) ? params.strokeAlign[index] : params.strokeAlign;
    if (strokeAlign !== void 0 && "strokeAlign" in node) {
      node.strokeAlign = strokeAlign;
    }
    const blendMode = Array.isArray(params.blendMode) ? params.blendMode[index] : params.blendMode;
    if (blendMode !== void 0 && "blendMode" in node) {
      node.blendMode = blendMode;
    }
  }
  async function applyFrameProperties(frame, params, index) {
    const clipsContent = Array.isArray(params.clipsContent) ? params.clipsContent[index] : params.clipsContent;
    if (clipsContent !== void 0) {
      frame.clipsContent = clipsContent;
    }
    applyCornerRadius(frame, params, index);
  }
  async function applySectionProperties(section, params, index) {
    const sectionContentsHidden = Array.isArray(params.sectionContentsHidden) ? params.sectionContentsHidden[index] : params.sectionContentsHidden;
    if (sectionContentsHidden !== void 0) {
      section.sectionContentsHidden = sectionContentsHidden;
    }
    const devStatus = Array.isArray(params.devStatus) ? params.devStatus[index] : params.devStatus;
    if (devStatus !== void 0) {
      section.devStatus = devStatus;
    }
  }
  async function applyStarProperties(star, params, index) {
    const pointCount = Array.isArray(params.pointCount) ? params.pointCount[index] : params.pointCount;
    if (pointCount !== void 0) {
      star.pointCount = Math.max(3, pointCount);
    }
    const innerRadius = Array.isArray(params.innerRadius) ? params.innerRadius[index] : params.innerRadius;
    if (innerRadius !== void 0) {
      star.innerRadius = Math.max(0, Math.min(1, innerRadius));
    }
  }
  async function applyPolygonProperties(polygon, params, index) {
    const pointCount = Array.isArray(params.pointCount) ? params.pointCount[index] : params.pointCount;
    if (pointCount !== void 0) {
      polygon.pointCount = Math.max(3, pointCount);
    }
  }
  function handleNodePositioning(node, position, size, parentContainer) {
    let finalX;
    let finalY;
    let positionReason;
    let warning;
    if (position.x !== void 0 && position.x !== null || position.y !== void 0 && position.y !== null) {
      finalX = position.x || 0;
      finalY = position.y || 0;
      const overlapInfo = checkForOverlaps(
        { x: finalX, y: finalY, width: size.width, height: size.height },
        parentContainer
      );
      if (overlapInfo.hasOverlap) {
        warning = createOverlapWarning(overlapInfo, { x: finalX, y: finalY });
      }
    } else {
      const smartPosition = findSmartPosition(size, parentContainer);
      finalX = smartPosition.x;
      finalY = smartPosition.y;
      positionReason = smartPosition.reason;
    }
    moveNodeToPosition(node, finalX, finalY);
    return { warning, positionReason };
  }

  // src/operations/manage-pages.ts
  var manage_pages_exports = {};
  __export(manage_pages_exports, {
    MANAGE_PAGES: () => MANAGE_PAGES
  });
  init_figma_property_utils();
  async function MANAGE_PAGES(params) {
    return BaseOperation.executeOperation("managePages", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        ["list", "get", "create", "update", "delete", "duplicate", "switch", "reorder", "create_divider", "get_current"]
      );
      switch (operation) {
        case "list":
          return await listPages(params);
        case "get":
          return await getPage(params);
        case "get_current":
          return await getCurrentPage(params);
        case "create":
          return await createPage(params);
        case "update":
          return await updatePage(params);
        case "delete":
          return await deletePage(params);
        case "duplicate":
          return await duplicatePage(params);
        case "switch":
          return await switchPage(params);
        case "reorder":
          return await reorderPage(params);
        case "create_divider":
          return await createPageDivider(params);
        default:
          throw new Error(`Unknown pages operation: ${operation}`);
      }
    });
  }
  async function listPages(params) {
    const detail = params.detail?.toLowerCase() || "minimal";
    const document = figma.root;
    const currentPage = figma.currentPage;
    const pages = Array.from(document.children);
    const documentInfo = {
      name: document.name,
      id: document.id,
      documentColorProfile: document.documentColorProfile,
      totalPages: pages.length,
      currentPageId: currentPage.id
    };
    const formatPage = (page, index) => {
      const baseInfo = {
        id: page.id,
        name: page.name,
        type: page.type,
        isPageDivider: page.isPageDivider,
        index,
        current: page.id === currentPage.id
      };
      if (detail === "minimal") {
        return baseInfo;
      }
      const standardInfo = {
        ...baseInfo,
        childrenCount: page.children.length
      };
      if (detail === "standard") {
        return standardInfo;
      }
      return {
        ...standardInfo,
        backgrounds: page.backgrounds,
        prototypeBackgrounds: page.prototypeBackgrounds,
        guides: page.guides,
        selection: page.selection.map((node) => node.id),
        flowStartingPoints: page.flowStartingPoints
      };
    };
    const formattedPages = pages.map((page, index) => formatPage(page, index));
    return {
      operation: "list",
      document: documentInfo,
      pages: formattedPages,
      message: `Listed ${pages.length} pages with ${detail} detail level`
    };
  }
  async function getPage(params) {
    const pageId = params.pageId;
    if (!pageId) {
      throw new Error('Parameter "pageId" is required for get operation');
    }
    const page = Array.from(figma.root.children).find((child) => child.id === pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    if (page.type !== "PAGE") {
      throw new Error(`Node ${pageId} is not a page`);
    }
    if ("loadAsync" in page) {
      await page.loadAsync();
    }
    return {
      operation: "get",
      pageId: page.id,
      name: page.name,
      type: page.type,
      isPageDivider: page.isPageDivider,
      childrenCount: page.children.length,
      backgrounds: page.backgrounds,
      prototypeBackgrounds: page.prototypeBackgrounds,
      guides: page.guides,
      selection: page.selection.map((node) => node.id),
      flowStartingPoints: page.flowStartingPoints,
      current: page.id === figma.currentPage.id,
      message: `Retrieved page "${page.name}"`
    };
  }
  async function getCurrentPage(params) {
    const currentPage = figma.currentPage;
    return {
      operation: "get_current",
      pageId: currentPage.id,
      name: currentPage.name,
      type: currentPage.type,
      isPageDivider: currentPage.isPageDivider,
      childrenCount: currentPage.children.length,
      backgrounds: currentPage.backgrounds,
      prototypeBackgrounds: currentPage.prototypeBackgrounds,
      guides: currentPage.guides,
      selection: currentPage.selection.map((node) => node.id),
      flowStartingPoints: currentPage.flowStartingPoints,
      current: true,
      message: `Current page is "${currentPage.name}"`
    };
  }
  async function createPage(params) {
    const name = params.name || "New Page";
    try {
      const newPage = figma.createPage();
      newPage.name = name;
      if (params.insertIndex !== void 0) {
        const document = figma.root;
        const targetIndex = Math.max(0, Math.min(params.insertIndex, document.children.length));
        document.insertChild(targetIndex, newPage);
      }
      await applyPageProperties(newPage, params);
      const insertIndex = Array.from(figma.root.children).indexOf(newPage);
      return {
        operation: "create",
        pageId: newPage.id,
        name: newPage.name,
        type: newPage.type,
        isPageDivider: newPage.isPageDivider,
        index: insertIndex,
        childrenCount: 0,
        message: `Created page "${newPage.name}" at position ${insertIndex}`
      };
    } catch (error) {
      if (error.toString().includes("Limited to 3 pages only")) {
        throw new Error("Cannot create page: Your Figma plan is limited to 3 pages. Upgrade to a paid plan to create more pages.");
      }
      throw error;
    }
  }
  async function updatePage(params) {
    const pageId = params.pageId;
    if (!pageId) {
      throw new Error('Parameter "pageId" is required for update operation');
    }
    const page = Array.from(figma.root.children).find((child) => child.id === pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    if (page.type !== "PAGE") {
      throw new Error(`Node ${pageId} is not a page`);
    }
    if ("loadAsync" in page) {
      await page.loadAsync();
    }
    if (params.name) {
      page.name = params.name;
    }
    await applyPageProperties(page, params);
    return {
      operation: "update",
      pageId: page.id,
      name: page.name,
      type: page.type,
      isPageDivider: page.isPageDivider,
      childrenCount: page.children.length,
      message: `Updated page "${page.name}"`
    };
  }
  async function deletePage(params) {
    const pageId = params.pageId;
    if (!pageId) {
      throw new Error('Parameter "pageId" is required for delete operation');
    }
    if (!params.switchToPageId) {
      throw new Error('Parameter "switchToPageId" is required for delete operation');
    }
    const page = Array.from(figma.root.children).find((child) => child.id === pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    if (page.type !== "PAGE") {
      throw new Error(`Node ${pageId} is not a page`);
    }
    const switchToPage = Array.from(figma.root.children).find((child) => child.id === params.switchToPageId);
    if (!switchToPage) {
      throw new Error(`Switch target page ${params.switchToPageId} not found`);
    }
    if (switchToPage.type !== "PAGE") {
      throw new Error(`Switch target ${params.switchToPageId} is not a page`);
    }
    if (page.id === figma.currentPage.id) {
      await figma.setCurrentPageAsync(switchToPage);
    }
    const pageName = page.name;
    page.remove();
    return {
      operation: "delete",
      pageId,
      name: pageName,
      switchedToPageId: params.switchToPageId,
      switchedToPageName: switchToPage.name,
      message: `Deleted page "${pageName}" and switched to "${switchToPage.name}"`
    };
  }
  async function duplicatePage(params) {
    const pageId = params.pageId;
    if (!pageId) {
      throw new Error('Parameter "pageId" is required for duplicate operation');
    }
    const originalPage = Array.from(figma.root.children).find((child) => child.id === pageId);
    if (!originalPage) {
      throw new Error(`Page ${pageId} not found`);
    }
    if (originalPage.type !== "PAGE") {
      throw new Error(`Node ${pageId} is not a page`);
    }
    if ("loadAsync" in originalPage) {
      await originalPage.loadAsync();
    }
    try {
      const duplicatedPage = originalPage.clone();
      if (params.name) {
        duplicatedPage.name = params.name;
      } else {
        duplicatedPage.name = `Copy of ${originalPage.name}`;
      }
      const insertIndex = Array.from(figma.root.children).indexOf(duplicatedPage);
      return {
        operation: "duplicate",
        pageId: duplicatedPage.id,
        name: duplicatedPage.name,
        originalPageId: pageId,
        originalName: originalPage.name,
        type: duplicatedPage.type,
        isPageDivider: duplicatedPage.isPageDivider,
        index: insertIndex,
        childrenCount: duplicatedPage.children.length,
        message: `Duplicated page "${originalPage.name}" as "${duplicatedPage.name}"`
      };
    } catch (error) {
      if (error.toString().includes("Limited to 3 pages only")) {
        throw new Error("Cannot duplicate page: Your Figma plan is limited to 3 pages. Upgrade to a paid plan to create more pages.");
      }
      throw error;
    }
  }
  async function switchPage(params) {
    const pageId = params.pageId;
    if (!pageId) {
      throw new Error('Parameter "pageId" is required for switch operation');
    }
    const page = Array.from(figma.root.children).find((child) => child.id === pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    if (page.type !== "PAGE") {
      throw new Error(`Node ${pageId} is not a page`);
    }
    const previousPage = figma.currentPage;
    await figma.setCurrentPageAsync(page);
    return {
      operation: "switch",
      pageId: page.id,
      name: page.name,
      previousPageId: previousPage.id,
      previousPageName: previousPage.name,
      current: true,
      message: `Switched from "${previousPage.name}" to "${page.name}"`
    };
  }
  async function reorderPage(params) {
    const pageId = params.pageId;
    if (!pageId) {
      throw new Error('Parameter "pageId" is required for reorder operation');
    }
    if (params.newIndex === void 0) {
      throw new Error('Parameter "newIndex" is required for reorder operation');
    }
    const page = Array.from(figma.root.children).find((child) => child.id === pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    if (page.type !== "PAGE") {
      throw new Error(`Node ${pageId} is not a page`);
    }
    const document = figma.root;
    const pages = Array.from(document.children);
    const currentIndex = pages.indexOf(page);
    const newIndex = Math.max(0, Math.min(params.newIndex, pages.length - 1));
    if (currentIndex === newIndex) {
      return {
        operation: "reorder",
        pageId,
        name: page.name,
        currentIndex,
        newIndex,
        message: `Page "${page.name}" is already at index ${newIndex}`
      };
    }
    document.insertChild(newIndex, page);
    return {
      operation: "reorder",
      pageId,
      name: page.name,
      currentIndex,
      newIndex,
      message: `Reordered page "${page.name}" from index ${currentIndex} to ${newIndex}`
    };
  }
  async function createPageDivider(params) {
    const name = params.name || "---";
    try {
      const divider = figma.createPageDivider(name);
      if (params.insertIndex !== void 0) {
        const document = figma.root;
        const targetIndex = Math.max(0, Math.min(params.insertIndex, document.children.length));
        document.insertChild(targetIndex, divider);
      }
      const insertIndex = Array.from(figma.root.children).indexOf(divider);
      return {
        operation: "create_divider",
        pageId: divider.id,
        name: divider.name,
        type: divider.type,
        isPageDivider: divider.isPageDivider,
        index: insertIndex,
        message: `Created page divider "${divider.name}" at position ${insertIndex}`
      };
    } catch (error) {
      if (error.toString().includes("Limited to 3 pages only")) {
        throw new Error("Cannot create page divider: Your Figma plan is limited to 3 pages. Upgrade to a paid plan to create more pages.");
      }
      throw error;
    }
  }
  async function applyPageProperties(page, params) {
    if (params.backgroundColor || params.backgroundOpacity !== void 0) {
      modifyBackgrounds(page, (manager) => {
        if (manager.length === 0 || manager.get(0)?.type !== "SOLID") {
          const newBackground = {
            type: "SOLID",
            color: { r: 1, g: 1, b: 1 },
            // Default white
            opacity: 1
          };
          if (manager.length === 0) {
            manager.push(newBackground);
          } else {
            manager.update(0, newBackground);
          }
        }
        const currentBg = manager.get(0);
        const updatedBg = {
          type: "SOLID",
          color: currentBg.color,
          opacity: currentBg.opacity
        };
        if (params.backgroundColor) {
          const hex = params.backgroundColor.replace("#", "");
          updatedBg.color = {
            r: parseInt(hex.substr(0, 2), 16) / 255,
            g: parseInt(hex.substr(2, 2), 16) / 255,
            b: parseInt(hex.substr(4, 2), 16) / 255
          };
        }
        if (params.backgroundOpacity !== void 0) {
          updatedBg.opacity = params.backgroundOpacity;
        }
        manager.update(0, updatedBg);
      });
    }
    if (params.prototypeBackgroundColor || params.prototypeBackgroundOpacity !== void 0) {
      modifyPrototypeBackgrounds(page, (manager) => {
        if (manager.length === 0 || manager.get(0)?.type !== "SOLID") {
          const newBackground = {
            type: "SOLID",
            color: { r: 0, g: 0, b: 0 },
            // Default black for prototype
            opacity: 1
          };
          if (manager.length === 0) {
            manager.push(newBackground);
          } else {
            manager.update(0, newBackground);
          }
        }
        const currentBg = manager.get(0);
        const updatedBg = {
          type: "SOLID",
          color: currentBg.color,
          opacity: currentBg.opacity
        };
        if (params.prototypeBackgroundColor) {
          const hex = params.prototypeBackgroundColor.replace("#", "");
          updatedBg.color = {
            r: parseInt(hex.substr(0, 2), 16) / 255,
            g: parseInt(hex.substr(2, 2), 16) / 255,
            b: parseInt(hex.substr(4, 2), 16) / 255
          };
        }
        if (params.prototypeBackgroundOpacity !== void 0) {
          updatedBg.opacity = params.prototypeBackgroundOpacity;
        }
        manager.update(0, updatedBg);
      });
    }
    if (params.guideAxis && params.guideOffset !== void 0) {
      const guides = [...page.guides];
      const axis = params.guideAxis.toUpperCase();
      guides.push({
        axis,
        offset: params.guideOffset
      });
      page.guides = guides;
    }
    if (params.backgrounds) {
      page.backgrounds = params.backgrounds;
    }
    if (params.prototypeBackgrounds) {
      page.prototypeBackgrounds = params.prototypeBackgrounds;
    }
    if (params.guides) {
      page.guides = params.guides;
    }
    if (params.flowStartingPoints) {
      page.flowStartingPoints = params.flowStartingPoints;
    }
  }

  // src/operations/manage-selection.ts
  var manage_selection_exports = {};
  __export(manage_selection_exports, {
    MANAGE_SELECTION: () => MANAGE_SELECTION
  });
  async function MANAGE_SELECTION(params) {
    return BaseOperation.executeOperation("manageSelection", params, async () => {
      if (!params || typeof params !== "object") {
        throw new Error("Invalid parameters object");
      }
      if (!params.operation) {
        throw new Error("operation parameter is required");
      }
      const validOperations = ["get_selection", "set_selection"];
      if (!validOperations.includes(params.operation)) {
        throw new Error(`Unknown selection operation: ${params.operation}. Valid operations: ${validOperations.join(", ")}`);
      }
      switch (params.operation) {
        case "get_selection":
          return await getSelection(params);
        case "set_selection":
          return await setSelection(params);
        default:
          throw new Error(`Unknown selection operation: ${params.operation}`);
      }
    });
  }
  async function getSelection(params) {
    const detail = params && params.detail !== null && params.detail !== void 0 ? params.detail : "standard";
    const focus = params && params.focus !== null && params.focus !== void 0 ? params.focus : true;
    const selection = figma.currentPage.selection;
    const selectionData = selection.map(
      (node) => createNodeData(node, detail, 0, null)
    );
    return {
      selection: selectionData,
      count: selection.length,
      detail,
      focus,
      message: `${selection.length} node(s) selected`
    };
  }
  async function setSelection(params) {
    return BaseOperation.executeOperation("setSelection", params, async () => {
      const nodes = await getNodesFromParams(params, "standard");
      const selectableNodes = nodes.filter((node) => "x" in node);
      figma.currentPage.selection = selectableNodes;
      selectAndFocus(selectableNodes);
      return {
        selectedNodes: formatSelection(selectableNodes),
        count: selectableNodes.length,
        totalFound: nodes.length,
        message: `Selected ${selectableNodes.length} of ${nodes.length} found node(s)`
      };
    });
  }

  // src/operations/manage-strokes.ts
  var manage_strokes_exports = {};
  __export(manage_strokes_exports, {
    MANAGE_STROKES: () => MANAGE_STROKES
  });

  // src/utils/shared-paint-operations.ts
  init_color_utils();
  init_figma_property_utils();
  var SharedPaintOperations = class {
    constructor(config) {
      this.config = config;
    }
    /**
     * Add solid paint operation
     */
    async addSolid(params) {
      const { node, paints } = this.config.validateNode(params.nodeId);
      const solidPaint = createSolidPaint2(params.color);
      applyCommonPaintProperties(solidPaint, params);
      let actualPaintIndex;
      let totalPaints;
      this.config.modifyPaints(node, (manager) => {
        if (params.insertIndex !== void 0) {
          manager.insert(params.insertIndex, solidPaint);
          actualPaintIndex = params.insertIndex;
        } else {
          manager.push(solidPaint);
          actualPaintIndex = paints.length;
        }
        totalPaints = manager.length;
      });
      const response = await this.config.createAddResponse(
        params.nodeId,
        solidPaint,
        actualPaintIndex,
        totalPaints
      );
      return {
        success: true,
        data: response
      };
    }
    /**
     * Add gradient paint operation
     */
    async addGradient(params) {
      const { node, paints } = this.config.validateNode(params.nodeId);
      if (params.stopPositions || params.stopColors) {
        validateGradientStops(params.stopPositions, params.stopColors);
      }
      const stopPositions = params.stopPositions || [0, 1];
      const stopColors = params.stopColors || ["#FFFFFF", "#000000"];
      const gradientStops = convertStopArrays(stopPositions, stopColors);
      const coordinates = {
        gradientStartX: params.gradientStartX,
        gradientStartY: params.gradientStartY,
        gradientEndX: params.gradientEndX,
        gradientEndY: params.gradientEndY,
        gradientScale: params.gradientScale
      };
      const gradientTransform = createGradientTransform(params.gradientType, coordinates);
      const gradientPaint = createGradientPaint(
        params.gradientType,
        gradientStops,
        gradientTransform
      );
      applyCommonPaintProperties(gradientPaint, params);
      let actualPaintIndex;
      let totalPaints;
      this.config.modifyPaints(node, (manager) => {
        if (params.insertIndex !== void 0) {
          manager.insert(params.insertIndex, gradientPaint);
          actualPaintIndex = params.insertIndex;
        } else {
          manager.push(gradientPaint);
          actualPaintIndex = paints.length;
        }
        totalPaints = manager.length;
      });
      const response = await this.config.createAddResponse(
        params.nodeId,
        gradientPaint,
        actualPaintIndex,
        totalPaints
      );
      return {
        success: true,
        data: response
      };
    }
    /**
     * Add image paint operation
     */
    async addImage(params) {
      const { node, paints } = this.config.validateNode(params.nodeId);
      validateImageSource(params);
      let imageHash;
      if (params.imageUrl) {
        const result = await createImageFromUrl2(params.imageUrl);
        imageHash = result.imageHash;
      } else if (params.imageBytes) {
        figma.ui.postMessage({
          type: "CONVERT_BASE64_TO_BYTES",
          base64: params.imageBytes,
          requestId: `image_${Date.now()}`
        });
        const result = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Base64 conversion timeout")), 1e4);
          function handleMessage(event) {
            if (event.data.type === "BASE64_CONVERSION_RESULT") {
              clearTimeout(timeout);
              figma.ui.off("message", handleMessage);
              if (event.data.success) {
                createImageFromBytes2(event.data.bytes).then((result2) => {
                  resolve(result2);
                }).catch(reject);
              } else {
                reject(new Error(event.data.error || "Base64 conversion failed"));
              }
            }
          }
          figma.ui.on("message", handleMessage);
        });
        imageHash = result.imageHash;
      } else if (params.imageHash) {
        imageHash = params.imageHash;
      } else {
        throw new Error("Must provide imageUrl, imageBytes, or imageHash");
      }
      const { paint: imagePaint, warnings } = this.applyScaleModeAwareTransforms(
        imageHash,
        params.imageScaleMode || "FILL",
        params
      );
      if (params.filterExposure !== void 0 || params.filterContrast !== void 0 || params.filterSaturation !== void 0 || params.filterTemperature !== void 0 || params.filterTint !== void 0 || params.filterHighlights !== void 0 || params.filterShadows !== void 0) {
        applyImageFilters2(imagePaint, {
          exposure: params.filterExposure,
          contrast: params.filterContrast,
          saturation: params.filterSaturation,
          temperature: params.filterTemperature,
          tint: params.filterTint,
          highlights: params.filterHighlights,
          shadows: params.filterShadows
        });
      }
      applyCommonPaintProperties(imagePaint, params);
      let actualPaintIndex;
      let totalPaints;
      this.config.modifyPaints(node, (manager) => {
        if (params.insertIndex !== void 0) {
          manager.insert(params.insertIndex, imagePaint);
          actualPaintIndex = params.insertIndex;
        } else {
          manager.push(imagePaint);
          actualPaintIndex = paints.length;
        }
        totalPaints = manager.length;
      });
      const response = await this.config.createAddResponse(
        params.nodeId,
        imagePaint,
        actualPaintIndex,
        totalPaints
      );
      if (warnings.length > 0) {
        response.warnings = warnings;
      }
      return {
        success: true,
        data: response
      };
    }
    /**
     * Update solid paint operation
     */
    async updateSolid(params) {
      const { node, paints } = this.config.validateNode(params.nodeId);
      const paintIndex = this.config.resolvePaintIndex(params, paints);
      this.config.validatePaintType(paints, paintIndex, "SOLID");
      let updatedPaint;
      this.config.modifyPaints(node, (manager) => {
        const paint = manager.get(paintIndex);
        if (paint) {
          if (params.color !== void 0) {
            const solidPaint = createSolidPaint2(params.color);
            paint.color = solidPaint.color;
          }
          applyCommonPaintProperties(paint, params);
          manager.update(paintIndex, paint);
          updatedPaint = paint;
        }
      });
      const response = await this.config.createUpdateResponse(
        params.nodeId,
        updatedPaint,
        paintIndex,
        void 0,
        paints.length
      );
      return {
        success: true,
        data: response
      };
    }
    /**
     * Update gradient paint operation - THE CRITICAL SHARED LOGIC
     */
    async updateGradient(params) {
      const { node, paints } = this.config.validateNode(params.nodeId);
      const paintIndex = this.config.resolvePaintIndex(params, paints);
      const currentPaint = paints[paintIndex];
      if (!currentPaint.type.startsWith("GRADIENT_")) {
        this.config.validatePaintType(paints, paintIndex, "GRADIENT");
      }
      let updatedPaint;
      this.config.modifyPaints(node, (manager) => {
        const paint = manager.get(paintIndex);
        if (paint) {
          if (params.stopPositions || params.stopColors) {
            validateGradientStops(params.stopPositions, params.stopColors);
            if (params.stopPositions && params.stopColors) {
              paint.gradientStops = convertStopArrays(params.stopPositions, params.stopColors);
            } else if (params.stopColors) {
              const positions = paint.gradientStops.map((stop) => stop.position);
              paint.gradientStops = convertStopArrays(positions, params.stopColors);
            }
          }
          if (params.gradientType) {
            paint.type = params.gradientType.toUpperCase();
          }
          if (params.gradientStartX !== void 0 || params.gradientStartY !== void 0 || params.gradientEndX !== void 0 || params.gradientEndY !== void 0 || params.gradientScale !== void 0) {
            const handles = convertFlattenedHandles(
              params.gradientStartX ?? paint.gradientHandlePositions[0]?.x ?? 0,
              params.gradientStartY ?? paint.gradientHandlePositions[0]?.y ?? 0.5,
              params.gradientEndX ?? paint.gradientHandlePositions[1]?.x ?? 1,
              params.gradientEndY ?? paint.gradientHandlePositions[1]?.y ?? 0.5,
              params.gradientScale ?? 1
            );
            paint.gradientHandlePositions = handles;
          }
          applyCommonPaintProperties(paint, params);
          manager.update(paintIndex, paint);
          updatedPaint = paint;
        }
      });
      const response = await this.config.createUpdateResponse(
        params.nodeId,
        updatedPaint,
        paintIndex,
        void 0,
        paints.length
      );
      return {
        success: true,
        data: response
      };
    }
    /**
     * Delete paint operation
     */
    async delete(params) {
      const { node, paints } = this.config.validateNode(params.nodeId);
      const paintIndex = this.config.resolvePaintIndex(params, paints);
      this.config.modifyPaints(node, (manager) => {
        manager.remove(paintIndex);
      });
      const response = await this.config.createDeleteResponse(
        params.nodeId,
        paintIndex,
        paints.length - 1
      );
      return {
        success: true,
        data: response
      };
    }
    /**
     * Clear all paints operation
     */
    async clear(params) {
      const { node, paints } = this.config.validateNode(params.nodeId);
      this.config.modifyPaints(node, (manager) => {
        while (manager.length > 0) {
          manager.remove(0);
        }
      });
      const response = {
        nodeId: params.nodeId,
        operation: "clear",
        clearedCount: paints.length,
        totalPaints: 0
      };
      return {
        success: true,
        data: response
      };
    }
    /**
     * Apply scale mode-aware transform processing to an image paint
     * (Same logic used by both fills and strokes)
     */
    applyScaleModeAwareTransforms(imageHash, scaleMode, params, existingPaint) {
      const transformParams = {
        transformOffsetX: params.transformOffsetX,
        transformOffsetY: params.transformOffsetY,
        transformScale: params.transformScale,
        transformScaleX: params.transformScaleX,
        transformScaleY: params.transformScaleY,
        transformRotation: params.transformRotation,
        transformSkewX: params.transformSkewX,
        transformSkewY: params.transformSkewY,
        imageTransform: params.imageTransform
        // Allow explicit matrix override
      };
      const { paint: transformedPaint, warnings } = createImagePaint2(
        imageHash,
        scaleMode,
        transformParams
      );
      if (existingPaint) {
        const updatedPaint = clone(existingPaint);
        updatedPaint.scaleMode = transformedPaint.scaleMode;
        if ("imageTransform" in transformedPaint) {
          updatedPaint.imageTransform = transformedPaint.imageTransform;
        }
        if ("rotation" in transformedPaint) {
          updatedPaint.rotation = transformedPaint.rotation;
        }
        if ("scalingFactor" in transformedPaint) {
          updatedPaint.scalingFactor = transformedPaint.scalingFactor;
        }
        return { paint: updatedPaint, warnings };
      }
      return { paint: transformedPaint, warnings };
    }
  };

  // src/operations/manage-strokes.ts
  init_figma_property_utils();

  // src/utils/stroke-utils.ts
  var ERROR_MESSAGES2 = {
    NODE_NOT_FOUND: (nodeId) => `Node not found: ${nodeId}`,
    NODE_NO_STROKES: (nodeId) => `Node ${nodeId} does not support strokes`,
    NODE_MIXED_STROKES: (nodeId) => `Node ${nodeId} has mixed strokes`,
    PAINT_INDEX_OUT_OF_BOUNDS: (nodeId, index, max) => `Paint index ${index} out of bounds for node ${nodeId} (valid range: 0-${max - 1})`,
    PAINT_INDEX_REQUIRED: (nodeId, paintCount) => `Node ${nodeId} has ${paintCount} stroke paints. Please specify paintIndex (0-${paintCount - 1}) to update a specific paint.`,
    NO_STROKES_TO_UPDATE: (nodeId) => `Node ${nodeId} has no stroke paints to update`,
    UNKNOWN_OPERATION: (operation) => `Unknown stroke operation: ${operation}`,
    INVALID_PAINT_TYPE: (index, actualType, expectedType) => `Paint at index ${index} is not a ${expectedType} paint (type: ${actualType}). Use ${expectedType === "solid" ? "update_solid" : expectedType === "gradient" ? "update_gradient" : "update_image"} for ${actualType} paint types.`,
    MISSING_IMAGE_SOURCE: () => "Must provide imageUrl, imagePath, imageHash, or imageBytes",
    MISMATCHED_STOP_ARRAYS: () => "stopPositions and stopColors arrays must have the same length",
    INVALID_STROKE_WEIGHT: (weight) => `Stroke weight must be non-negative, got ${weight}`,
    INVALID_STROKE_ALIGN: (align) => `Invalid stroke alignment '${align}'. Valid values: INSIDE, OUTSIDE, CENTER`,
    INVALID_STROKE_CAP: (cap) => `Invalid stroke cap '${cap}'. Valid values: NONE, ROUND, SQUARE, ARROW_LINES, ARROW_EQUILATERAL`,
    INVALID_STROKE_JOIN: (join) => `Invalid stroke join '${join}'. Valid values: MITER, BEVEL, ROUND`,
    INVALID_STROKE_MITER_LIMIT: (limit) => `Stroke miter limit must be at least 1, got ${limit}`,
    STROKE_PAINT_REQUIRED: (nodeId) => `Node ${nodeId} requires at least one stroke paint to be visible`
  };
  function validateNodeForStrokes(nodeId) {
    const node = figma.getNodeById(nodeId);
    if (!node) {
      throw new Error(ERROR_MESSAGES2.NODE_NOT_FOUND(nodeId));
    }
    if (!("strokes" in node)) {
      throw new Error(ERROR_MESSAGES2.NODE_NO_STROKES(nodeId));
    }
    const strokes = node.strokes;
    if (!Array.isArray(strokes)) {
      throw new Error(ERROR_MESSAGES2.NODE_MIXED_STROKES(nodeId));
    }
    return { node, strokes };
  }
  function resolvePaintIndex(params, strokes) {
    let paintIndex;
    if (params.paintIndex !== void 0 && params.paintIndex !== null) {
      paintIndex = params.paintIndex;
    } else {
      if (strokes.length === 0) {
        throw new Error(ERROR_MESSAGES2.NO_STROKES_TO_UPDATE(params.nodeId));
      } else if (strokes.length === 1) {
        paintIndex = 0;
      } else {
        throw new Error(ERROR_MESSAGES2.PAINT_INDEX_REQUIRED(params.nodeId, strokes.length));
      }
    }
    if (paintIndex < 0 || paintIndex >= strokes.length) {
      throw new Error(ERROR_MESSAGES2.PAINT_INDEX_OUT_OF_BOUNDS(params.nodeId, paintIndex, strokes.length));
    }
    return paintIndex;
  }
  function validatePaintType(strokes, paintIndex, expectedType) {
    const paint = strokes[paintIndex];
    if (!paint) {
      throw new Error(`Paint at index ${paintIndex} does not exist`);
    }
    if (paint.type !== expectedType) {
      throw new Error(`Expected paint type '${expectedType}' but found '${paint.type}' at index ${paintIndex}`);
    }
  }
  function validateStrokeWeight(strokeWeight) {
    if (strokeWeight < 0) {
      throw new Error(`Stroke weight must be non-negative, got ${strokeWeight}`);
    }
  }
  function validateStrokeAlign(strokeAlign) {
    const validValues = ["INSIDE", "OUTSIDE", "CENTER"];
    if (!validValues.includes(strokeAlign.toUpperCase())) {
      throw new Error(`Invalid stroke alignment '${strokeAlign}'. Valid values: ${validValues.join(", ")}`);
    }
  }
  function validateStrokeCap(strokeCap) {
    const validValues = ["NONE", "ROUND", "SQUARE", "ARROW_LINES", "ARROW_EQUILATERAL"];
    if (!validValues.includes(strokeCap.toUpperCase())) {
      throw new Error(`Invalid stroke cap '${strokeCap}'. Valid values: ${validValues.join(", ")}`);
    }
  }
  function validateStrokeJoin(strokeJoin) {
    const validValues = ["MITER", "BEVEL", "ROUND"];
    if (!validValues.includes(strokeJoin.toUpperCase())) {
      throw new Error(`Invalid stroke join '${strokeJoin}'. Valid values: ${validValues.join(", ")}`);
    }
  }
  function validateStrokeMiterLimit(strokeMiterLimit) {
    if (strokeMiterLimit < 1) {
      throw new Error(`Stroke miter limit must be at least 1, got ${strokeMiterLimit}`);
    }
  }
  function safeGetProperty(node, propertyName) {
    if (!(propertyName in node) || node[propertyName] === void 0) {
      return void 0;
    }
    const value = node[propertyName];
    if (typeof value === "symbol" || typeof value === "function") {
      return void 0;
    }
    return value;
  }
  async function createStrokeOperationResponse(nodeId, paintIndex, updatedPaint, totalPaints, strokeProperties, additionalData) {
    const baseResponse = {
      nodeId,
      ...paintIndex !== void 0 && { paintIndex },
      ...updatedPaint && { updatedPaint },
      ...totalPaints !== void 0 && { totalPaints },
      ...strokeProperties && { strokeProperties },
      ...additionalData
    };
    return await cleanEmptyPropertiesAsync(baseResponse) || baseResponse;
  }
  async function createStrokeListResponse(nodeId, strokes, strokeProperties, filteredCount, filterType) {
    const response = {
      nodeId,
      stroke: strokeProperties,
      strokePaints: strokes,
      totalStrokePaints: strokes.length,
      ...filteredCount !== void 0 && { filteredCount },
      ...filterType && { filterType }
    };
    return await cleanEmptyPropertiesAsync(response) || response;
  }
  async function createStrokeAddResponse(nodeId, addedPaint, paintIndex, totalPaints) {
    return await createStrokeOperationResponse(
      nodeId,
      paintIndex,
      addedPaint,
      totalPaints,
      void 0,
      { operation: "add" }
    );
  }
  async function createStrokeUpdateResponse(nodeId, updatedPaint, paintIndex, strokeProperties, totalPaints) {
    return await createStrokeOperationResponse(
      nodeId,
      paintIndex,
      updatedPaint,
      totalPaints,
      strokeProperties,
      { operation: "update" }
    );
  }
  async function createStrokeDeleteResponse(nodeId, deletedPaintIndex, totalPaints) {
    return await createStrokeOperationResponse(
      nodeId,
      void 0,
      void 0,
      totalPaints,
      void 0,
      {
        operation: "delete",
        deletedPaintIndex
      }
    );
  }
  function extractStrokeProperties(node) {
    const strokeProperties = {};
    const strokeWeight = safeGetProperty(node, "strokeWeight");
    if (strokeWeight !== void 0) strokeProperties.strokeWeight = strokeWeight;
    const strokeAlign = safeGetProperty(node, "strokeAlign");
    if (strokeAlign !== void 0) strokeProperties.strokeAlign = strokeAlign;
    const strokeCap = safeGetProperty(node, "strokeCap");
    if (strokeCap !== void 0) strokeProperties.strokeCap = strokeCap;
    const startCap = safeGetProperty(node, "connectorStartStrokeCap");
    if (startCap !== void 0) strokeProperties.startCap = startCap;
    const endCap = safeGetProperty(node, "connectorEndStrokeCap");
    if (endCap !== void 0) strokeProperties.endCap = endCap;
    const strokeJoin = safeGetProperty(node, "strokeJoin");
    if (strokeJoin !== void 0) strokeProperties.strokeJoin = strokeJoin;
    const strokeMiterLimit = safeGetProperty(node, "strokeMiterLimit");
    if (strokeMiterLimit !== void 0) strokeProperties.strokeMiterLimit = strokeMiterLimit;
    const dashPattern = safeGetProperty(node, "dashPattern");
    if (dashPattern !== void 0) strokeProperties.dashPattern = dashPattern;
    const strokeTopWeight = safeGetProperty(node, "strokeTopWeight");
    if (strokeTopWeight !== void 0) strokeProperties.strokeTopWeight = strokeTopWeight;
    const strokeRightWeight = safeGetProperty(node, "strokeRightWeight");
    if (strokeRightWeight !== void 0) strokeProperties.strokeRightWeight = strokeRightWeight;
    const strokeBottomWeight = safeGetProperty(node, "strokeBottomWeight");
    if (strokeBottomWeight !== void 0) strokeProperties.strokeBottomWeight = strokeBottomWeight;
    const strokeLeftWeight = safeGetProperty(node, "strokeLeftWeight");
    if (strokeLeftWeight !== void 0) strokeProperties.strokeLeftWeight = strokeLeftWeight;
    return strokeProperties;
  }

  // src/operations/manage-strokes.ts
  init_color_utils();
  async function formatStrokeResponse(responseData) {
    return await cleanEmptyPropertiesAsync(responseData) || responseData;
  }
  var strokePaintConfig = {
    modifyPaints: modifyStrokes,
    validateNode: (nodeId) => {
      const result = validateNodeForStrokes(nodeId);
      return { node: result.node, paints: result.strokes };
    },
    resolvePaintIndex,
    validatePaintType,
    createAddResponse: async (nodeId, paint, paintIndex, totalPaints) => {
      return await formatStrokeResponse(await createStrokeAddResponse(nodeId, paint, paintIndex, totalPaints));
    },
    createUpdateResponse: async (nodeId, paint, paintIndex, extraProps, totalPaints) => {
      return await formatStrokeResponse(await createStrokeUpdateResponse(nodeId, paint, paintIndex, extraProps, totalPaints));
    },
    createDeleteResponse: async (nodeId, paintIndex, totalPaints) => {
      return await formatStrokeResponse(await createStrokeDeleteResponse(nodeId, paintIndex, totalPaints));
    }
  };
  var strokePaintOperations = new SharedPaintOperations(strokePaintConfig);
  function applyScaleModeAwareTransforms2(imageHash, scaleMode, params, existingPaint) {
    const transformParams = {
      transformOffsetX: params.transformOffsetX,
      transformOffsetY: params.transformOffsetY,
      transformScale: params.transformScale,
      transformScaleX: params.transformScaleX,
      transformScaleY: params.transformScaleY,
      transformRotation: params.transformRotation,
      transformSkewX: params.transformSkewX,
      transformSkewY: params.transformSkewY,
      imageTransform: params.imageTransform
      // Allow explicit matrix override
    };
    const { paint: transformedPaint, warnings } = createImagePaint(
      imageHash,
      scaleMode,
      transformParams
    );
    if (existingPaint) {
      const updatedPaint = clone(existingPaint);
      updatedPaint.scaleMode = transformedPaint.scaleMode;
      if ("imageTransform" in transformedPaint) {
        updatedPaint.imageTransform = transformedPaint.imageTransform;
      }
      if ("rotation" in transformedPaint) {
        updatedPaint.rotation = transformedPaint.rotation;
      }
      if ("scalingFactor" in transformedPaint) {
        updatedPaint.scalingFactor = transformedPaint.scalingFactor;
      }
      return { paint: updatedPaint, warnings };
    }
    return { paint: transformedPaint, warnings };
  }
  function applyStrokeProperties(node, params) {
    if (params.strokeWeight !== void 0) {
      validateStrokeWeight(params.strokeWeight);
      node.strokeWeight = params.strokeWeight;
    }
    if (params.strokeAlign !== void 0) {
      validateStrokeAlign(params.strokeAlign);
      node.strokeAlign = params.strokeAlign.toUpperCase();
    }
    if (params.strokeCap !== void 0) {
      validateStrokeCap(params.strokeCap);
      node.strokeCap = params.strokeCap.toUpperCase();
    }
    if (params.strokeJoin !== void 0) {
      validateStrokeJoin(params.strokeJoin);
      node.strokeJoin = params.strokeJoin.toUpperCase();
    }
    if (params.strokeMiterLimit !== void 0) {
      validateStrokeMiterLimit(params.strokeMiterLimit);
      node.strokeMiterLimit = params.strokeMiterLimit;
    }
    if (params.dashPattern !== void 0) {
      if (!Array.isArray(params.dashPattern)) {
        throw new Error("dashPattern must be an array of numbers");
      }
      node.dashPattern = params.dashPattern;
    }
  }
  async function MANAGE_STROKES(params) {
    try {
      const { operation, nodeId } = params;
      switch (operation.toLowerCase()) {
        case "get":
          return await handleGetStrokes(params);
        case "add_solid":
          return await strokePaintOperations.addSolid(params);
        case "add_gradient":
          return await strokePaintOperations.addGradient(params);
        case "add_image":
          return await strokePaintOperations.addImage(params);
        case "add_pattern":
          return await handleAddPatternStroke(params);
        case "update":
          return await handleUpdateStroke(params);
        case "update_solid":
          return await strokePaintOperations.updateSolid(params);
        case "update_gradient":
          return await strokePaintOperations.updateGradient(params);
        case "update_image":
          return await handleUpdateImageStroke(params);
        case "update_pattern":
          return await handleUpdatePatternStroke(params);
        case "delete":
          return await strokePaintOperations.delete(params);
        case "reorder":
          return await handleReorderStroke(params);
        case "clear":
          return await strokePaintOperations.clear(params);
        case "duplicate":
          return await handleDuplicateStrokes(params);
        default:
          throw new Error(ERROR_MESSAGES2.UNKNOWN_OPERATION(operation));
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.toString() : String(error),
        data: {}
      };
    }
  }
  async function handleGetStrokes(params) {
    const { node, strokes } = validateNodeForStrokes(params.nodeId);
    const strokeProperties = extractStrokeProperties(node);
    let filteredStrokes = strokes;
    if (params.filterType) {
      filteredStrokes = strokes.filter((stroke) => stroke.type === params.filterType.toUpperCase());
    }
    if (params.paintIndex !== void 0) {
      const paintIndex = resolvePaintIndex(params, filteredStrokes);
      filteredStrokes = [filteredStrokes[paintIndex]];
    }
    const response = await createStrokeListResponse(
      params.nodeId,
      filteredStrokes,
      strokeProperties,
      params.filterType ? filteredStrokes.length : void 0,
      params.filterType
    );
    return {
      success: true,
      data: await formatStrokeResponse(response)
    };
  }
  async function handleAddPatternStroke(params) {
    const { node, strokes } = validateNodeForStrokes(params.nodeId);
    const patternPaint = createPatternPaint(
      params.sourceNodeId,
      {
        tileType: params.patternTileType,
        scalingFactor: params.patternScalingFactor,
        spacingX: params.patternSpacingX,
        spacingY: params.patternSpacingY,
        horizontalAlignment: params.patternHorizontalAlignment
      }
    );
    applyCommonPaintProperties(patternPaint, params);
    modifyStrokes(node, (manager) => {
      manager.push(patternPaint);
    });
    const paintIndex = strokes.length;
    const response = await createStrokeAddResponse(
      params.nodeId,
      patternPaint,
      paintIndex,
      paintIndex + 1
    );
    return {
      success: true,
      data: await formatStrokeResponse(response)
    };
  }
  async function handleUpdateStroke(params) {
    const { node, strokes } = validateNodeForStrokes(params.nodeId);
    const hasStrokeProperties = params.strokeWeight !== void 0 || params.strokeAlign !== void 0 || params.strokeCap !== void 0 || params.strokeJoin !== void 0 || params.strokeMiterLimit !== void 0 || params.dashPattern !== void 0;
    const hasPaintProperties = params.opacity !== void 0 || params.visible !== void 0 || params.blendMode !== void 0 || params.color !== void 0 || params.gradientType !== void 0 || params.imageUrl !== void 0 || params.imagePath !== void 0 || params.imageBytes !== void 0 || params.imageHash !== void 0 || params.sourceNodeId !== void 0;
    if (hasStrokeProperties) {
      applyStrokeProperties(node, params);
    }
    let updatedPaint;
    let paintIndex;
    if (hasPaintProperties) {
      if (params.paintIndex === void 0) {
        if (strokes.length === 0) {
          throw new Error("Node has no stroke paints. Add a paint first using add_solid, add_gradient, etc.");
        } else if (strokes.length > 1) {
          throw new Error(
            `Node has ${strokes.length} stroke paints. Specify paintIndex to avoid ambiguity.
\u2022 Use paintIndex: 0 to update first paint
\u2022 Use update_solid with paintIndex for type-specific updates`
          );
        }
        paintIndex = 0;
      } else {
        paintIndex = resolvePaintIndex(params, strokes);
      }
      modifyStrokes(node, (manager) => {
        const paint = manager.get(paintIndex);
        if (paint) {
          if (params.color !== void 0 && paint.type === "SOLID") {
            const solidPaint = paint;
            const color = createSolidPaint(params.color, solidPaint.opacity);
            Object.assign(solidPaint, color);
          }
          applyCommonPaintProperties(paint, params);
          manager.update(paintIndex, paint);
          updatedPaint = paint;
        }
      });
    }
    const strokeProperties = hasStrokeProperties ? extractStrokeProperties(node) : void 0;
    const response = await createStrokeUpdateResponse(
      params.nodeId,
      updatedPaint,
      paintIndex,
      strokeProperties,
      strokes.length
    );
    return {
      success: true,
      data: await formatStrokeResponse(response)
    };
  }
  async function handleUpdateImageStroke(params) {
    const { node, strokes } = validateNodeForStrokes(params.nodeId);
    const paintIndex = resolvePaintIndex(params, strokes);
    validatePaintType(strokes, paintIndex, "IMAGE");
    let updatedPaint;
    modifyStrokes(node, (manager) => {
      const paint = manager.get(paintIndex);
      if (paint) {
        let imageHash = paint.imageHash;
        if (params.imageUrl || params.imagePath || params.imageBytes || params.imageHash) {
          if (params.imageHash) {
            imageHash = params.imageHash;
          }
        }
        let updatedImagePaint = paint;
        if (params.imageScaleMode !== void 0 || params.transformOffsetX !== void 0 || params.transformOffsetY !== void 0 || params.transformScale !== void 0 || params.transformScaleX !== void 0 || params.transformScaleY !== void 0 || params.transformRotation !== void 0 || params.transformSkewX !== void 0 || params.transformSkewY !== void 0 || params.imageTransform !== void 0) {
          const { paint: transformedPaint } = applyScaleModeAwareTransforms2(
            imageHash,
            params.imageScaleMode || paint.scaleMode,
            params,
            paint
          );
          updatedImagePaint = transformedPaint;
        }
        if (params.filterExposure !== void 0 || params.filterContrast !== void 0 || params.filterSaturation !== void 0 || params.filterTemperature !== void 0 || params.filterTint !== void 0 || params.filterHighlights !== void 0 || params.filterShadows !== void 0) {
          applyImageFilters(updatedImagePaint, {
            exposure: params.filterExposure,
            contrast: params.filterContrast,
            saturation: params.filterSaturation,
            temperature: params.filterTemperature,
            tint: params.filterTint,
            highlights: params.filterHighlights,
            shadows: params.filterShadows
          });
        }
        applyCommonPaintProperties(updatedImagePaint, params);
        manager.update(paintIndex, updatedImagePaint);
        updatedPaint = updatedImagePaint;
      }
    });
    const response = await createStrokeUpdateResponse(
      params.nodeId,
      updatedPaint,
      paintIndex,
      void 0,
      strokes.length
    );
    return {
      success: true,
      data: await formatStrokeResponse(response)
    };
  }
  async function handleUpdatePatternStroke(params) {
    const { node, strokes } = validateNodeForStrokes(params.nodeId);
    const paintIndex = resolvePaintIndex(params, strokes);
    validatePaintType(strokes, paintIndex, "PATTERN");
    let updatedPaint;
    modifyStrokes(node, (manager) => {
      const paint = manager.get(paintIndex);
      if (paint) {
        if (params.patternScalingFactor !== void 0 && "scalingFactor" in paint) {
          paint.scalingFactor = params.patternScalingFactor;
        }
        if (params.patternSpacingX !== void 0 && "spacingX" in paint) {
          paint.spacingX = params.patternSpacingX;
        }
        if (params.patternSpacingY !== void 0 && "spacingY" in paint) {
          paint.spacingY = params.patternSpacingY;
        }
        if (params.patternHorizontalAlignment !== void 0 && "horizontalAlignment" in paint) {
          paint.horizontalAlignment = params.patternHorizontalAlignment.toUpperCase();
        }
        applyCommonPaintProperties(paint, params);
        manager.update(paintIndex, paint);
        updatedPaint = paint;
      }
    });
    const response = await createStrokeUpdateResponse(
      params.nodeId,
      updatedPaint,
      paintIndex,
      void 0,
      strokes.length
    );
    return {
      success: true,
      data: await formatStrokeResponse(response)
    };
  }
  async function handleReorderStroke(params) {
    const { node, strokes } = validateNodeForStrokes(params.nodeId);
    const paintIndex = resolvePaintIndex(params, strokes);
    const newIndex = params.newIndex;
    if (newIndex < 0 || newIndex >= strokes.length) {
      throw new Error(`New index ${newIndex} out of bounds (0-${strokes.length - 1})`);
    }
    modifyStrokes(node, (manager) => {
      manager.move(paintIndex, newIndex);
    });
    const response = await createStrokeOperationResponse(
      params.nodeId,
      newIndex,
      strokes[newIndex],
      strokes.length,
      void 0,
      { operation: "reorder", oldIndex: paintIndex, newIndex }
    );
    return {
      success: true,
      data: await formatStrokeResponse(response)
    };
  }
  async function handleDuplicateStrokes(params) {
    const { node: sourceNode, strokes: sourceStrokes } = validateNodeForStrokes(params.fromNodeId);
    const { node: targetNode, strokes: targetStrokes } = validateNodeForStrokes(params.toNodeId);
    let paintsToCopy;
    if (params.paintIndex !== void 0) {
      const paintIndex = resolvePaintIndex({ ...params, nodeId: params.fromNodeId }, sourceStrokes);
      paintsToCopy = [sourceStrokes[paintIndex]];
    } else {
      paintsToCopy = sourceStrokes;
    }
    const overwrite = params.overwrite?.toUpperCase() || "NONE";
    modifyStrokes(targetNode, (manager) => {
      if (overwrite === "ALL") {
        while (manager.length > 0) {
          manager.remove(0);
        }
      } else if (overwrite === "SINGLE" && params.paintIndex !== void 0) {
        const targetIndex = params.paintIndex < manager.length ? params.paintIndex : manager.length - 1;
        if (targetIndex >= 0) {
          manager.remove(targetIndex);
        }
      }
      for (const paint of paintsToCopy) {
        const clonedPaint = clone(paint);
        if (overwrite === "SINGLE" && params.paintIndex !== void 0) {
          manager.insert(params.paintIndex, clonedPaint);
        } else {
          manager.push(clonedPaint);
        }
      }
    });
    const response = await createStrokeOperationResponse(
      params.toNodeId,
      void 0,
      void 0,
      targetNode.strokes.length,
      void 0,
      {
        operation: "duplicate",
        sourceNodeId: params.fromNodeId,
        copiedCount: paintsToCopy.length,
        overwriteMode: overwrite
      }
    );
    return {
      success: true,
      data: await formatStrokeResponse(response)
    };
  }

  // src/operations/manage-styles.ts
  var manage_styles_exports = {};
  __export(manage_styles_exports, {
    MANAGE_STYLES: () => MANAGE_STYLES
  });
  init_color_utils();
  init_logger();
  async function MANAGE_STYLES(params) {
    return BaseOperation.executeOperation("manageStyles", params, async () => {
      if (!params.operation) {
        throw new Error("operation parameter is required");
      }
      const validOperations = ["create", "update", "list", "apply", "delete", "get", "duplicate"];
      if (!validOperations.includes(params.operation)) {
        throw new Error(`Unknown style operation: ${params.operation}. Valid operations: ${validOperations.join(", ")}`);
      }
      switch (params.operation) {
        case "create":
          return await createStyle(params);
        case "update":
          return await updateStyle(params);
        case "list":
          return await listStyles(params);
        case "apply":
          return await applyStyle(params);
        case "delete":
          return await deleteStyle(params);
        case "get":
          return await getStyle(params);
        case "duplicate":
          return await duplicateStyle(params);
        default:
          throw new Error(`Unknown style operation: ${params.operation}`);
      }
    });
  }
  async function createStyle(params) {
    if (!params.type || !params.name) {
      throw new Error("styleType and styleName parameters are required for create operation");
    }
    const validStyleTypes = ["paint", "text", "effect", "grid"];
    if (!validStyleTypes.includes(params.type)) {
      throw new Error(`Unknown style type: ${params.type}. Valid types: ${validStyleTypes.join(", ")}`);
    }
    switch (params.type) {
      case "paint":
        return await createPaintStyle(params);
      case "text":
        return await createTextStyle(params);
      case "effect":
        return await createEffectStyle(params);
      case "grid":
        return await createGridStyle(params);
      default:
        throw new Error(`Unknown style type: ${params.type}`);
    }
  }
  async function updateStyle(params) {
    if (!params.styleId) {
      throw new Error("styleId parameter is required for update operation");
    }
    const styleId = cleanStyleId(params.styleId);
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
    const style = allStyles.find((s) => cleanStyleId(s.id) === styleId);
    if (!style) {
      throw new Error(`Style with ID ${styleId} not found`);
    }
    if (params.name) {
      style.name = params.name;
    }
    if (params.description !== void 0) {
      style.description = unwrapArrayParam(params.description);
    }
    if (style.type === "PAINT") {
      await updatePaintStyle(style, params);
    } else if (style.type === "TEXT") {
      await updateTextStyle(style, params);
    } else if (style.type === "EFFECT") {
      await updateEffectStyle(style, params);
    } else if (style.type === "GRID") {
      await updateGridStyle(style, params);
    }
    return {
      id: style.id,
      name: style.name,
      description: style.description || "",
      type: style.type,
      message: `Updated ${style.type.toLowerCase()} style: ${style.name}`
    };
  }
  async function updatePaintStyle(style, params) {
    if (params.color || params.opacity !== void 0 || params.paintType) {
      const currentPaint = style.paints[0];
      const isCurrentSolid = currentPaint?.type === "SOLID";
      const paintParams = {
        ...params,
        color: params.color ? unwrapArrayParam(params.color) : isCurrentSolid && currentPaint.color ? rgbToHex(currentPaint.color) : "#000000",
        opacity: params.opacity !== void 0 ? unwrapArrayParam(params.opacity) : currentPaint?.opacity !== void 0 ? currentPaint.opacity : 1,
        paintType: params.paintType ? unwrapArrayParam(params.paintType) : "SOLID"
      };
      const paint = await createPaint(paintParams);
      style.paints = [paint];
    }
  }
  async function updateTextStyle(style, params) {
    if (params.fontFamily && params.fontStyle) {
      const fontFamily = unwrapArrayParam(params.fontFamily);
      const fontStyle = unwrapArrayParam(params.fontStyle);
      const fontName = { family: fontFamily, style: fontStyle };
      await ensureFontLoaded(fontName);
      style.fontName = fontName;
    }
    if (params.fontSize !== void 0) {
      style.fontSize = unwrapArrayParam(params.fontSize);
    }
    if (params.letterSpacing !== void 0) {
      const letterSpacing = unwrapArrayParam(params.letterSpacing);
      style.letterSpacing = { unit: "PIXELS", value: letterSpacing };
    }
    if (params.lineHeight !== void 0) {
      const lineHeight = unwrapArrayParam(params.lineHeight);
      style.lineHeight = { unit: "PIXELS", value: lineHeight };
    }
    if (params.paragraphSpacing !== void 0) {
      style.paragraphSpacing = unwrapArrayParam(params.paragraphSpacing);
    }
    if (params.textCase !== void 0) {
      style.textCase = unwrapArrayParam(params.textCase);
    }
    if (params.textDecoration !== void 0) {
      style.textDecoration = unwrapArrayParam(params.textDecoration);
    }
  }
  async function updateEffectStyle(style, params) {
    if (params.effects) {
      throw new Error("Effect style effects cannot be updated via figma_styles. Use the figma_effects tool to manage individual effects. Style container properties (name, description) can be updated here.");
    }
  }
  async function updateGridStyle(style, params) {
    if (params.layoutGrids && params.layoutGrids.length > 0) {
      style.layoutGrids = params.layoutGrids.map((grid) => createLayoutGrid(grid));
    }
  }
  async function createPaintStyle(params) {
    const style = figma.createPaintStyle();
    style.name = params.name;
    if (params.description) {
      style.description = unwrapArrayParam(params.description);
    }
    if (params.color) {
      const paintParams = {
        ...params,
        color: unwrapArrayParam(params.color),
        opacity: unwrapArrayParam(params.opacity),
        paintType: unwrapArrayParam(params.paintType)
      };
      const paint = await createPaint(paintParams);
      style.paints = [paint];
      return {
        id: style.id,
        name: style.name,
        description: style.description || "",
        type: style.type,
        message: `Created paint style: ${style.name}`
      };
    } else {
      return {
        id: style.id,
        name: style.name,
        description: style.description || "",
        type: style.type,
        message: `Created paint style: ${style.name} (NO FILL COLOR PROVIDED)`,
        warning: "Paint style created without fillColor - paints array will be empty"
      };
    }
  }
  async function createTextStyle(params) {
    try {
      const style = figma.createTextStyle();
      style.name = params.name;
      if (params.description) {
        style.description = unwrapArrayParam(params.description);
      }
      if (params.fontFamily && params.fontStyle) {
        const fontFamily = unwrapArrayParam(params.fontFamily);
        const fontStyle = unwrapArrayParam(params.fontStyle);
        const fontName = { family: fontFamily, style: fontStyle };
        try {
          await ensureFontLoaded(fontName);
          style.fontName = fontName;
        } catch (fontError) {
          throw new Error(`Failed to load font ${fontFamily} ${fontStyle}: ${fontError}`);
        }
      }
      if (params.fontSize !== void 0) {
        const fontSize = unwrapArrayParam(params.fontSize);
        if (typeof fontSize !== "number" || fontSize <= 0) {
          throw new Error(`Invalid fontSize: ${fontSize}. Must be a positive number.`);
        }
        style.fontSize = fontSize;
      }
      if (params.letterSpacing !== void 0) {
        const letterSpacing = unwrapArrayParam(params.letterSpacing);
        if (typeof letterSpacing !== "number") {
          throw new Error(`Invalid letterSpacing: ${letterSpacing}. Must be a number.`);
        }
        style.letterSpacing = { unit: "PIXELS", value: letterSpacing };
      }
      if (params.lineHeight !== void 0) {
        const lineHeight = unwrapArrayParam(params.lineHeight);
        if (typeof lineHeight !== "number" || lineHeight <= 0) {
          throw new Error(`Invalid lineHeight: ${lineHeight}. Must be a positive number.`);
        }
        style.lineHeight = { unit: "PIXELS", value: lineHeight };
      }
      if (params.paragraphSpacing !== void 0) {
        const paragraphSpacing = unwrapArrayParam(params.paragraphSpacing);
        if (typeof paragraphSpacing !== "number" || paragraphSpacing < 0) {
          throw new Error(`Invalid paragraphSpacing: ${paragraphSpacing}. Must be a non-negative number.`);
        }
        style.paragraphSpacing = paragraphSpacing;
      }
      if (params.textCase !== void 0) {
        const textCase = unwrapArrayParam(params.textCase);
        const validCases = ["ORIGINAL", "UPPER", "LOWER", "TITLE"];
        if (!validCases.includes(textCase)) {
          throw new Error(`Invalid textCase: ${textCase}. Must be one of: ${validCases.join(", ")}`);
        }
        style.textCase = textCase;
      }
      if (params.textDecoration !== void 0) {
        const textDecoration = unwrapArrayParam(params.textDecoration);
        const validDecorations = ["NONE", "UNDERLINE", "STRIKETHROUGH"];
        if (!validDecorations.includes(textDecoration)) {
          throw new Error(`Invalid textDecoration: ${textDecoration}. Must be one of: ${validDecorations.join(", ")}`);
        }
        style.textDecoration = textDecoration;
      }
      if (!style.id) {
        throw new Error("Text style creation failed - no ID assigned");
      }
      return {
        id: style.id,
        name: style.name,
        description: style.description || "",
        type: style.type,
        message: `Created text style: ${style.name}`
      };
    } catch (error) {
      throw new Error(`Text style creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async function createEffectStyle(params) {
    try {
      const style = figma.createEffectStyle();
      style.name = params.name;
      if (params.description) {
        style.description = unwrapArrayParam(params.description);
      }
      let message = `Created empty effect style: ${style.name}. Use figma_effects tool to add effects to this style.`;
      if (params.effects && params.effects.length > 0) {
        message = `Created empty effect style: ${style.name}. Effects parameter ignored - use figma_effects tool to add effects to this style.`;
      }
      if (!style.id) {
        throw new Error("Effect style creation failed - no ID assigned");
      }
      const allEffectStyles = figma.getLocalEffectStyles();
      const foundStyle = allEffectStyles.find((s) => cleanStyleId(s.id) === cleanStyleId(style.id));
      logger2.log(`[DEBUG] Created effect style with ID: ${style.id}`);
      logger2.log(`[DEBUG] Style immediately findable via getLocalEffectStyles: ${foundStyle ? "YES" : "NO"}`);
      logger2.log(`[DEBUG] Total effect styles after creation: ${allEffectStyles.length}`);
      return {
        id: style.id,
        name: style.name,
        description: style.description || "",
        type: style.type,
        message
      };
    } catch (error) {
      throw new Error(`Effect style creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async function createGridStyle(params) {
    try {
      const style = figma.createGridStyle();
      style.name = params.name;
      if (params.description) {
        style.description = unwrapArrayParam(params.description);
      }
      if (params.layoutGrids && params.layoutGrids.length > 0) {
        style.layoutGrids = params.layoutGrids.map((grid) => createLayoutGrid(grid));
      }
      if (!style.id) {
        throw new Error("Grid style creation failed - no ID assigned");
      }
      return {
        id: style.id,
        name: style.name,
        description: style.description || "",
        type: style.type,
        message: `Created grid style: ${style.name}`
      };
    } catch (error) {
      throw new Error(`Grid style creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async function createPaint(params) {
    const paintType = params.paintType || "SOLID";
    switch (paintType) {
      case "SOLID":
        return {
          type: "SOLID",
          color: hexToRgb(params.color),
          opacity: params.opacity !== void 0 ? params.opacity : 1
        };
      case "GRADIENT_LINEAR":
      case "GRADIENT_RADIAL":
      case "GRADIENT_ANGULAR":
      case "GRADIENT_DIAMOND":
        return {
          type: paintType,
          gradientStops: params.gradientStops?.map((stop) => ({
            position: stop.position,
            color: hexToRgba(stop.color, stop.opacity || 1)
          })) || [],
          gradientTransform: params.gradientTransform
        };
      default:
        throw new Error(`Unsupported paint type: ${paintType}. Valid types: SOLID, GRADIENT_LINEAR, GRADIENT_RADIAL, GRADIENT_ANGULAR, GRADIENT_DIAMOND`);
    }
  }
  function createLayoutGrid(gridData) {
    const grid = {
      pattern: gridData.pattern,
      visible: gridData.visible !== void 0 ? gridData.visible : true
    };
    if (gridData.sectionSize !== void 0) grid.sectionSize = gridData.sectionSize;
    if (gridData.color) grid.color = hexToRgba(gridData.color);
    if (gridData.alignment) grid.alignment = gridData.alignment;
    if (gridData.gutterSize !== void 0) grid.gutterSize = gridData.gutterSize;
    if (gridData.offset !== void 0) grid.offset = gridData.offset;
    if (gridData.count !== void 0) grid.count = gridData.count;
    return grid;
  }
  async function listStyles(params) {
    const styleType = params.type;
    let styles = [];
    switch (styleType) {
      case "paint":
        styles = figma.getLocalPaintStyles();
        break;
      case "text":
        styles = figma.getLocalTextStyles();
        break;
      case "effect":
        styles = figma.getLocalEffectStyles();
        break;
      case "grid":
        styles = figma.getLocalGridStyles();
        break;
      default:
        const paintStyles = figma.getLocalPaintStyles();
        const textStyles = figma.getLocalTextStyles();
        const effectStyles = figma.getLocalEffectStyles();
        const gridStyles = figma.getLocalGridStyles();
        styles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
    }
    return {
      styles: styles.map((style) => formatStyleResponse(style)),
      count: styles.length,
      styleType: styleType || "all"
    };
  }
  async function applyStyle(params) {
    if (!params.nodeId) {
      throw new Error("nodeId parameter is required for apply operation");
    }
    const node = findNodeById(params.nodeId);
    let style;
    if (params.styleId) {
      const paintStyles = figma.getLocalPaintStyles();
      const textStyles = figma.getLocalTextStyles();
      const effectStyles = figma.getLocalEffectStyles();
      const gridStyles = figma.getLocalGridStyles();
      const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
      style = allStyles.find((s) => cleanStyleId(s.id) === params.styleId);
    } else if (params.name) {
      const paintStyles = figma.getLocalPaintStyles();
      const textStyles = figma.getLocalTextStyles();
      const effectStyles = figma.getLocalEffectStyles();
      const gridStyles = figma.getLocalGridStyles();
      const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
      style = allStyles.find((s) => s.name === params.name);
    }
    if (!style) {
      throw new Error("Style not found");
    }
    switch (style.type) {
      case "PAINT":
        if ("fillStyleId" in node) {
          node.fillStyleId = style.id;
        }
        break;
      case "TEXT":
        if (node.type === "TEXT") {
          node.textStyleId = style.id;
        }
        break;
      case "EFFECT":
        if ("effectStyleId" in node) {
          node.effectStyleId = style.id;
        }
        break;
      case "GRID":
        if ("gridStyleId" in node) {
          node.gridStyleId = style.id;
        }
        break;
    }
    return {
      nodeId: params.nodeId,
      nodeName: node.name,
      styleId: style.id,
      styleName: style.name,
      styleType: style.type.toLowerCase(),
      message: `Applied ${style.type.toLowerCase()} style "${style.name}" to node`
    };
  }
  async function deleteStyle(params) {
    if (!params.styleId) {
      throw new Error("styleId parameter is required for delete operation");
    }
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
    const style = allStyles.find((s) => cleanStyleId(s.id) === params.styleId);
    if (!style) {
      throw new Error(`Style not found with ID: ${params.styleId}. Found ${allStyles.length} total styles in file.`);
    }
    const styleInfo = {
      id: cleanStyleId(style.id),
      // Clean ID for response
      name: style.name,
      type: style.type
    };
    try {
      styleInfo.description = style.description || "";
    } catch (e) {
      styleInfo.description = "";
    }
    if (style.type === "TEXT") {
      try {
        const textStyle = style;
        styleInfo.fontName = textStyle.fontName;
        styleInfo.fontSize = textStyle.fontSize;
        styleInfo.letterSpacing = textStyle.letterSpacing;
        styleInfo.lineHeight = textStyle.lineHeight;
      } catch (e) {
      }
    }
    style.remove();
    return {
      deletedStyle: styleInfo,
      message: `Successfully deleted ${styleInfo.type.toLowerCase()} style "${styleInfo.name}"`
    };
  }
  async function getStyle(params) {
    if (!params.styleId) {
      throw new Error("styleId parameter is required for get operation");
    }
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
    const style = allStyles.find((s) => cleanStyleId(s.id) === params.styleId);
    if (!style) {
      throw new Error(`Style not found with ID: ${params.styleId}`);
    }
    return formatStyleResponse(style);
  }
  async function duplicateStyle(params) {
    if (!params.styleId) {
      throw new Error("styleId parameter is required for duplicate operation");
    }
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
    const originalStyle = allStyles.find((s) => cleanStyleId(s.id) === cleanStyleId(params.styleId));
    if (!originalStyle) {
      throw new Error(`Style not found with ID: ${params.styleId}`);
    }
    let duplicatedStyle;
    switch (originalStyle.type) {
      case "PAINT":
        duplicatedStyle = duplicatePaintStyle(originalStyle, params);
        break;
      case "TEXT":
        duplicatedStyle = await duplicateTextStyle(originalStyle, params);
        break;
      case "EFFECT":
        duplicatedStyle = duplicateEffectStyle(originalStyle, params);
        break;
      case "GRID":
        duplicatedStyle = duplicateGridStyle(originalStyle, params);
        break;
      default:
        throw new Error(`Unsupported style type for duplication: ${originalStyle.type}`);
    }
    return {
      id: duplicatedStyle.id,
      name: duplicatedStyle.name,
      description: duplicatedStyle.description || "",
      type: duplicatedStyle.type,
      originalId: originalStyle.id,
      originalName: originalStyle.name,
      message: `Duplicated ${originalStyle.type.toLowerCase()} style "${originalStyle.name}" as "${duplicatedStyle.name}"`
    };
  }
  function duplicatePaintStyle(originalStyle, params) {
    const newStyle = figma.createPaintStyle();
    newStyle.name = params.name || `Copy of ${originalStyle.name}`;
    newStyle.description = params.description || originalStyle.description || "";
    newStyle.paints = [...originalStyle.paints];
    return newStyle;
  }
  async function duplicateTextStyle(originalStyle, params) {
    const newStyle = figma.createTextStyle();
    newStyle.name = params.name || `Copy of ${originalStyle.name}`;
    newStyle.description = params.description || originalStyle.description || "";
    try {
      await ensureFontLoaded(originalStyle.fontName);
      newStyle.fontName = originalStyle.fontName;
    } catch (e) {
      logger2.warn(`Failed to load font for duplicated text style: ${e}`);
    }
    newStyle.fontSize = originalStyle.fontSize;
    newStyle.letterSpacing = originalStyle.letterSpacing;
    newStyle.lineHeight = originalStyle.lineHeight;
    newStyle.paragraphSpacing = originalStyle.paragraphSpacing;
    newStyle.textCase = originalStyle.textCase;
    newStyle.textDecoration = originalStyle.textDecoration;
    return newStyle;
  }
  function duplicateEffectStyle(originalStyle, params) {
    const newStyle = figma.createEffectStyle();
    newStyle.name = params.name || `Copy of ${originalStyle.name}`;
    newStyle.description = params.description || originalStyle.description || "";
    newStyle.effects = [...originalStyle.effects];
    return newStyle;
  }
  function duplicateGridStyle(originalStyle, params) {
    const newStyle = figma.createGridStyle();
    newStyle.name = params.name || `Copy of ${originalStyle.name}`;
    newStyle.description = params.description || originalStyle.description || "";
    newStyle.layoutGrids = [...originalStyle.layoutGrids];
    return newStyle;
  }

  // src/operations/manage-text.ts
  var manage_text_exports = {};
  __export(manage_text_exports, {
    MANAGE_TEXT: () => MANAGE_TEXT
  });
  init_color_utils();
  function addTextNodeToParent(node, parentId) {
    if (parentId) {
      const parentNode2 = findNodeById(parentId);
      if (!parentNode2) {
        throw new Error(`Parent node with ID ${parentId} not found`);
      }
      const containerTypes = ["DOCUMENT", "PAGE", "FRAME", "GROUP", "COMPONENT", "COMPONENT_SET", "SLIDE", "SLIDE_ROW", "SECTION", "STICKY", "SHAPE_WITH_TEXT", "TABLE", "CODE_BLOCK"];
      if (!containerTypes.includes(parentNode2.type)) {
        throw new Error(`Parent node type '${parentNode2.type}' cannot contain child nodes. Valid container types: ${containerTypes.join(", ")}`);
      }
      parentNode2.appendChild(node);
      return parentNode2;
    } else {
      figma.currentPage.appendChild(node);
      return figma.currentPage;
    }
  }
  async function MANAGE_TEXT(params) {
    return BaseOperation.executeOperation("manageText", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        ["create", "update", "get", "delete", "set_range", "get_range", "delete_range", "insert_text", "delete_text", "search_text", "apply_text_style", "create_text_style"]
      );
      switch (operation) {
        case "create":
          return await createTextNode(params);
        case "update":
          return await updateTextNode(params);
        case "get":
          return await getTextContent(params);
        case "delete":
          return await deleteTextNode(params);
        case "set_range":
          return await handleSetRange(params);
        case "get_range":
          return await handleGetRange(params);
        case "delete_range":
          return await handleDeleteRange(params);
        case "insert_text":
          return await handleInsertText(params);
        case "delete_text":
          return await handleDeleteText(params);
        case "search_text":
          return await handleSearchText(params);
        case "apply_text_style":
          return await handleApplyTextStyle(params);
        case "create_text_style":
          return await handleCreateTextStyle(params);
        default:
          throw new Error(`Unknown text operation: ${operation}`);
      }
    });
  }
  async function createTextNode(params) {
    const characters = unwrapArrayParam(params.characters);
    const fontFamily = unwrapArrayParam(params.fontFamily);
    const fontStyle = unwrapArrayParam(params.fontStyle);
    const x = unwrapArrayParam(params.x);
    const y = unwrapArrayParam(params.y);
    const name = unwrapArrayParam(params.name);
    const width = unwrapArrayParam(params.width);
    const height = unwrapArrayParam(params.height);
    const fontSize = unwrapArrayParam(params.fontSize);
    const autoRename = unwrapArrayParam(params.autoRename);
    if (!characters || characters.trim() === "") {
      throw new Error("Text nodes must have non-empty characters content");
    }
    let text = null;
    try {
      text = figma.createText();
      const fontResult = await loadFontWithFallback(fontFamily, fontStyle);
      text.fontName = fontResult.fontName;
      text.characters = characters;
      const parentContainer = addTextNodeToParent(text, unwrapArrayParam(params.parentId));
      let finalX;
      let finalY;
      let positionReason;
      let warning;
      const estimatedWidth = Math.max(characters.length * ((fontSize || 16) * 0.6), 100);
      const textHeight = (fontSize || 16) * 1.2;
      if (x !== void 0 || y !== void 0) {
        finalX = x || 0;
        finalY = y || 0;
        const overlapInfo = checkForOverlaps(
          { x: finalX, y: finalY, width: estimatedWidth, height: textHeight },
          parentContainer
        );
        if (overlapInfo.hasOverlap) {
          warning = createOverlapWarning(overlapInfo, { x: finalX, y: finalY });
        }
      } else {
        const smartPosition = findSmartPosition({ width: estimatedWidth, height: textHeight }, parentContainer);
        finalX = smartPosition.x;
        finalY = smartPosition.y;
        positionReason = smartPosition.reason;
      }
      text.x = finalX;
      text.y = finalY;
      text.fontSize = fontSize || 16;
      if (autoRename !== void 0) {
        text.autoRename = autoRename;
      }
      if (autoRename === true) {
      } else {
        text.name = name || "Text";
      }
      if (width !== void 0) text.resize(width, text.height);
      if (height !== void 0) text.resize(text.width, height);
      if (width !== void 0 && height !== void 0) text.resize(width, height);
      await applyTextProperties(text, params);
      if (params.textStyleId) {
        const allTextStyles = figma.getLocalTextStyles();
        const targetStyle = allTextStyles.find((s) => cleanStyleId(s.id) === params.textStyleId);
        if (targetStyle) {
          await text.setTextStyleIdAsync(targetStyle.id);
        } else {
          throw new Error(`Text style with ID ${params.textStyleId} not found`);
        }
      }
      if (params.characterRanges && params.characterRanges.length > 0) {
        await applyCharacterRanges(text, params.characterRanges);
      }
      if (params.hyperlink) {
        applyHyperlink(text, params.hyperlink);
      }
      if (params.styleName) {
        await createTextStyleFromNode(text, {
          name: params.styleName,
          description: params.styleDescription
        });
      }
      const response = {
        ...formatNodeResponse(text, "created"),
        appliedFont: {
          requested: fontFamily ? `${fontFamily} ${fontStyle || "Regular"}` : "Inter Regular",
          actual: `${fontResult.fontName.family} ${fontResult.fontName.style}`,
          substituted: fontResult.substituted,
          reason: fontResult.reason
        }
      };
      if (warning) {
        response.warning = warning;
      }
      if (positionReason) {
        response.positionReason = positionReason;
      }
      return response;
    } catch (error) {
      if (text) {
        try {
          text.remove();
        } catch (removeError) {
        }
      }
      throw error;
    }
  }
  async function updateTextNode(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeId = unwrapArrayParam(params.nodeId);
    const node = findNodeById(nodeId);
    if (!node || node.type !== "TEXT") {
      throw new Error(`Text node with ID ${nodeId} not found`);
    }
    const textNode = node;
    if (textNode.fontName !== figma.mixed) {
      await figma.loadFontAsync(textNode.fontName);
    }
    const characters = unwrapArrayParam(params.characters);
    const name = unwrapArrayParam(params.name);
    const x = unwrapArrayParam(params.x);
    const y = unwrapArrayParam(params.y);
    const fontFamily = unwrapArrayParam(params.fontFamily);
    const fontStyle = unwrapArrayParam(params.fontStyle);
    const fontSize = unwrapArrayParam(params.fontSize);
    const width = unwrapArrayParam(params.width);
    const height = unwrapArrayParam(params.height);
    const autoRename = unwrapArrayParam(params.autoRename);
    if (characters !== void 0) {
      textNode.characters = characters;
    }
    if (autoRename !== void 0) {
      textNode.autoRename = autoRename;
    }
    if (name !== void 0 && autoRename !== true) {
      textNode.name = name;
    }
    if (x !== void 0) textNode.x = x;
    if (y !== void 0) textNode.y = y;
    if (fontFamily || fontStyle) {
      const font = getFontFromParams({ fontFamily, fontStyle });
      await ensureFontLoaded(font);
      textNode.fontName = font;
    }
    if (fontSize) {
      textNode.fontSize = BaseOperation.validateNumericParam(fontSize, "fontSize", 1, 400);
    }
    if (width !== void 0 || height !== void 0) {
      const newWidth = width !== void 0 ? width : textNode.width;
      const newHeight = height !== void 0 ? height : textNode.height;
      textNode.resize(newWidth, newHeight);
    }
    await applyTextProperties(textNode, params);
    return formatNodeResponse(textNode, "updated");
  }
  async function getTextContent(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeId = unwrapArrayParam(params.nodeId);
    const node = findNodeById(nodeId);
    if (!node || node.type !== "TEXT") {
      throw new Error(`Text node with ID ${nodeId} not found`);
    }
    const textNode = node;
    const safeMixed = (value, propName) => {
      if (value === figma.mixed) {
        logger.log(`DEBUG: Property ${propName} is figma.mixed (symbol)`);
        return "MIXED";
      }
      return value;
    };
    return {
      id: textNode.id,
      name: textNode.name,
      characters: textNode.characters,
      fontSize: safeMixed(textNode.fontSize, "fontSize"),
      fontName: safeMixed(textNode.fontName, "fontName"),
      textCase: safeMixed(textNode.textCase, "textCase"),
      textDecoration: safeMixed(textNode.textDecoration, "textDecoration"),
      letterSpacing: safeMixed(textNode.letterSpacing, "letterSpacing"),
      lineHeight: safeMixed(textNode.lineHeight, "lineHeight"),
      fills: safeMixed(textNode.fills, "fills"),
      x: textNode.x,
      y: textNode.y,
      width: textNode.width,
      height: textNode.height,
      // Missing alignment properties
      textAlignHorizontal: textNode.textAlignHorizontal,
      textAlignVertical: textNode.textAlignVertical,
      textAutoResize: textNode.textAutoResize,
      // Missing paragraph properties
      paragraphSpacing: textNode.paragraphSpacing,
      paragraphIndent: textNode.paragraphIndent,
      // Missing list properties
      listSpacing: textNode.listSpacing,
      // Missing advanced typography properties
      hangingPunctuation: textNode.hangingPunctuation,
      hangingList: textNode.hangingList,
      leadingTrim: textNode.leadingTrim,
      autoRename: textNode.autoRename,
      // Missing text overflow properties
      textTruncation: textNode.textTruncation,
      maxLines: textNode.maxLines,
      // Additional useful properties
      hasMissingFont: textNode.hasMissingFont,
      type: textNode.type
    };
  }
  async function deleteTextNode(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeId = unwrapArrayParam(params.nodeId);
    const node = findNodeById(nodeId);
    if (!node || node.type !== "TEXT") {
      throw new Error(`Text node with ID ${nodeId} not found`);
    }
    const textNode = node;
    const nodeInfo = formatNodeResponse(textNode, "deleted");
    textNode.remove();
    return nodeInfo;
  }
  async function handleSetRange(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeId = unwrapArrayParam(params.nodeId);
    const node = findNodeById(nodeId);
    if (!node || node.type !== "TEXT") {
      throw new Error(`Text node with ID ${nodeId} not found`);
    }
    const textNode = node;
    if (textNode.fontName !== figma.mixed) {
      await figma.loadFontAsync(textNode.fontName);
    }
    const characterRanges = buildCharacterRanges(params);
    if (characterRanges.length > 0) {
      await applyCharacterRanges(textNode, characterRanges);
    }
    return {
      id: textNode.id,
      name: textNode.name,
      type: textNode.type,
      message: "range styling applied",
      x: textNode.x,
      y: textNode.y,
      width: textNode.width,
      height: textNode.height
    };
  }
  async function handleGetRange(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeId = unwrapArrayParam(params.nodeId);
    const rangeStart = unwrapArrayParam(params.rangeStart);
    const rangeEnd = unwrapArrayParam(params.rangeEnd);
    const node = findNodeById(nodeId);
    if (!node || node.type !== "TEXT") {
      throw new Error(`Text node with ID ${nodeId} not found`);
    }
    const textNode = node;
    const textLength = textNode.characters.length;
    if (rangeStart !== void 0 && rangeEnd !== void 0) {
      if (rangeStart < 0 || rangeEnd > textLength || rangeStart >= rangeEnd) {
        throw new Error(`Invalid character range: ${rangeStart}-${rangeEnd} for text length ${textLength}`);
      }
      return getCharacterRangeStyling(textNode, rangeStart, rangeEnd);
    }
    return analyzeAllCharacterStyling(textNode);
  }
  function getCharacterRangeStyling(textNode, start, end) {
    const fields = ["fontSize", "fontName", "textCase", "textDecoration", "letterSpacing", "fills"];
    const segments = textNode.getStyledTextSegments(fields, start, end);
    let rangeHyperlink;
    try {
      rangeHyperlink = textNode.getRangeHyperlink(start, end);
    } catch (error) {
      logger.warn(`Failed to get hyperlink for range ${start}-${end}: ${error.toString()}`);
      rangeHyperlink = null;
    }
    const safeMixed = (value, propName) => {
      if (value === figma.mixed) {
        logger.log(`DEBUG: Property ${propName} is figma.mixed (symbol) in range ${start}-${end}`);
        return "MIXED";
      }
      return value;
    };
    const safeHyperlink = (hyperlink) => {
      if (hyperlink === null) {
        return null;
      }
      if (hyperlink === figma.mixed) {
        return "MIXED";
      }
      if (hyperlink && typeof hyperlink === "object" && hyperlink.type && hyperlink.value) {
        return {
          type: hyperlink.type,
          value: hyperlink.value
        };
      }
      logger.warn(`Unexpected hyperlink structure: ${JSON.stringify(hyperlink)}`);
      return hyperlink;
    };
    if (segments.length === 1) {
      const segment = segments[0];
      return {
        nodeId: textNode.id,
        rangeStart: start,
        rangeEnd: end,
        characters: textNode.characters.substring(start, end),
        // Get characters directly from text node
        fontSize: safeMixed(segment.fontSize, "fontSize"),
        fontName: safeMixed(segment.fontName, "fontName"),
        textCase: safeMixed(segment.textCase, "textCase"),
        textDecoration: safeMixed(segment.textDecoration, "textDecoration"),
        letterSpacing: safeMixed(segment.letterSpacing, "letterSpacing"),
        fills: safeMixed(segment.fills, "fills"),
        hyperlink: safeHyperlink(rangeHyperlink)
      };
    }
    const characterRanges = segments.map((segment) => {
      let segmentHyperlink;
      try {
        segmentHyperlink = textNode.getRangeHyperlink(segment.start, segment.end);
      } catch (error) {
        logger.warn(`Failed to get hyperlink for segment ${segment.start}-${segment.end}: ${error.toString()}`);
        segmentHyperlink = null;
      }
      return {
        rangeStart: segment.start,
        rangeEnd: segment.end,
        characters: textNode.characters.substring(segment.start, segment.end),
        // Get characters directly from text node
        fontSize: safeMixed(segment.fontSize, "fontSize"),
        fontName: safeMixed(segment.fontName, "fontName"),
        textCase: safeMixed(segment.textCase, "textCase"),
        textDecoration: safeMixed(segment.textDecoration, "textDecoration"),
        letterSpacing: safeMixed(segment.letterSpacing, "letterSpacing"),
        fills: safeMixed(segment.fills, "fills"),
        hyperlink: safeHyperlink(segmentHyperlink)
      };
    });
    return {
      nodeId: textNode.id,
      requestedRange: { start, end },
      hasMixedStyling: true,
      characterRanges
    };
  }
  function analyzeAllCharacterStyling(textNode) {
    const fields = ["fontSize", "fontName", "textCase", "textDecoration", "letterSpacing", "fills"];
    const segments = textNode.getStyledTextSegments(fields);
    const safeMixed = (value, propName) => {
      if (value === figma.mixed) {
        logger.log(`DEBUG: Property ${propName} is figma.mixed (symbol) in segments`);
        return "MIXED";
      }
      return value;
    };
    const safeHyperlink = (hyperlink) => {
      if (hyperlink === null) {
        return null;
      }
      if (hyperlink === figma.mixed) {
        return "MIXED";
      }
      if (hyperlink && typeof hyperlink === "object" && hyperlink.type && hyperlink.value) {
        return {
          type: hyperlink.type,
          value: hyperlink.value
        };
      }
      logger.warn(`Unexpected hyperlink structure: ${JSON.stringify(hyperlink)}`);
      return hyperlink;
    };
    const characterRanges = segments.map((segment) => {
      let segmentHyperlink;
      try {
        segmentHyperlink = textNode.getRangeHyperlink(segment.start, segment.end);
      } catch (error) {
        logger.warn(`Failed to get hyperlink for segment ${segment.start}-${segment.end}: ${error.toString()}`);
        segmentHyperlink = null;
      }
      return {
        nodeId: textNode.id,
        rangeStart: segment.start,
        rangeEnd: segment.end,
        characters: textNode.characters.substring(segment.start, segment.end),
        // Get characters directly from text node
        fontSize: safeMixed(segment.fontSize, "fontSize"),
        fontName: safeMixed(segment.fontName, "fontName"),
        textCase: safeMixed(segment.textCase, "textCase"),
        textDecoration: safeMixed(segment.textDecoration, "textDecoration"),
        letterSpacing: safeMixed(segment.letterSpacing, "letterSpacing"),
        fills: safeMixed(segment.fills, "fills"),
        hyperlink: safeHyperlink(segmentHyperlink)
      };
    });
    return {
      nodeId: textNode.id,
      textLength: textNode.characters.length,
      characters: textNode.characters,
      characterRanges
    };
  }
  async function handleDeleteRange(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeId = unwrapArrayParam(params.nodeId);
    const rangeStart = unwrapArrayParam(params.rangeStart);
    const rangeEnd = unwrapArrayParam(params.rangeEnd);
    const node = findNodeById(nodeId);
    if (!node || node.type !== "TEXT") {
      throw new Error(`Text node with ID ${nodeId} not found`);
    }
    const textNode = node;
    const textLength = textNode.characters.length;
    if (textNode.fontName !== figma.mixed) {
      await figma.loadFontAsync(textNode.fontName);
    }
    if (rangeStart !== void 0 && rangeEnd !== void 0) {
      if (rangeStart < 0 || rangeEnd > textLength || rangeStart >= rangeEnd) {
        throw new Error(`Invalid character range: ${rangeStart}-${rangeEnd} for text length ${textLength}`);
      }
      await resetCharacterRangeStyling(textNode, rangeStart, rangeEnd);
      return {
        nodeId: textNode.id,
        message: `Range styling deleted for range ${rangeStart}-${rangeEnd}`,
        rangeStart,
        rangeEnd,
        affectedCharacters: textNode.characters.substring(rangeStart, rangeEnd)
      };
    }
    await resetAllCharacterStyling(textNode);
    return {
      nodeId: textNode.id,
      message: "All range styling deleted - text now has uniform styling",
      textLength,
      characters: textNode.characters
    };
  }
  async function resetCharacterRangeStyling(textNode, start, end) {
    await loadAllFontsInRange(textNode, start, end);
    const defaultFontSize = typeof textNode.fontSize === "number" ? textNode.fontSize : 16;
    const defaultFontName = textNode.fontName !== figma.mixed ? textNode.fontName : { family: "Inter", style: "Regular" };
    await figma.loadFontAsync(defaultFontName);
    textNode.setRangeFontSize(start, end, defaultFontSize);
    textNode.setRangeFontName(start, end, defaultFontName);
    textNode.setRangeTextCase(start, end, "ORIGINAL");
    textNode.setRangeTextDecoration(start, end, "NONE");
    textNode.setRangeLetterSpacing(start, end, { value: 0, unit: "PERCENT" });
    const defaultFills = textNode.fills !== figma.mixed ? textNode.fills : [createSolidPaint2("#000000")];
    textNode.setRangeFills(start, end, defaultFills);
    textNode.setRangeHyperlink(start, end, null);
  }
  async function loadAllFontsInRange(textNode, start, end) {
    try {
      const fontNames = textNode.getRangeAllFontNames(start, end);
      await Promise.all(fontNames.map(figma.loadFontAsync));
    } catch (error) {
      logger.warn(`Could not load fonts for range ${start}-${end}: ${error}`);
      await loadFontsIndividually(textNode, start, end);
    }
  }
  async function loadFontsIndividually(textNode, start, end) {
    const uniqueFonts = /* @__PURE__ */ new Set();
    for (let i = start; i < end; i++) {
      try {
        const fontName = textNode.getRangeFontName(i, i + 1);
        if (fontName !== figma.mixed && typeof fontName === "object" && fontName.family && fontName.style) {
          const fontKey = `${fontName.family}:${fontName.style}`;
          uniqueFonts.add(fontKey);
        }
      } catch (error) {
        logger.warn(`Could not read font for character ${i}: ${error}`);
      }
    }
    const fontLoadPromises = Array.from(uniqueFonts).map(async (fontKey) => {
      const [family, style] = fontKey.split(":");
      try {
        await figma.loadFontAsync({ family, style });
      } catch (error) {
        logger.warn(`Could not load font ${family} ${style}: ${error}`);
      }
    });
    await Promise.all(fontLoadPromises);
  }
  async function applyAdvancedTextDecoration(textNode, params) {
    const textDecorationStyle = unwrapArrayParam(params.textDecorationStyle);
    const textDecorationOffset = unwrapArrayParam(params.textDecorationOffset);
    const textDecorationOffsetUnit = unwrapArrayParam(params.textDecorationOffsetUnit);
    const textDecorationThickness = unwrapArrayParam(params.textDecorationThickness);
    const textDecorationThicknessUnit = unwrapArrayParam(params.textDecorationThicknessUnit);
    const textDecorationColor = unwrapArrayParam(params.textDecorationColor);
    const textDecorationColorAuto = unwrapArrayParam(params.textDecorationColorAuto);
    const textDecorationSkipInk = unwrapArrayParam(params.textDecorationSkipInk);
    if (textDecorationStyle !== void 0) {
      const validatedStyle = BaseOperation.validateStringParam(
        textDecorationStyle,
        "textDecorationStyle",
        ["SOLID", "WAVY", "DOTTED"]
      );
      textNode.textDecorationStyle = validatedStyle;
    }
    if (textDecorationOffset !== void 0 || textDecorationOffsetUnit !== void 0) {
      const unit = textDecorationOffsetUnit || "PIXELS";
      const validatedUnit = BaseOperation.validateStringParam(
        unit,
        "textDecorationOffsetUnit",
        ["PIXELS", "PERCENT", "AUTO"]
      );
      if (validatedUnit === "AUTO") {
        textNode.textDecorationOffset = { unit: "AUTO" };
      } else {
        const value = textDecorationOffset || 0;
        textNode.textDecorationOffset = {
          value: BaseOperation.validateNumericParam(value, "textDecorationOffset", -1e3, 1e3),
          unit: validatedUnit
        };
      }
    }
    if (textDecorationThickness !== void 0 || textDecorationThicknessUnit !== void 0) {
      const unit = textDecorationThicknessUnit || "PIXELS";
      const validatedUnit = BaseOperation.validateStringParam(
        unit,
        "textDecorationThicknessUnit",
        ["PIXELS", "PERCENT", "AUTO"]
      );
      if (validatedUnit === "AUTO") {
        textNode.textDecorationThickness = { unit: "AUTO" };
      } else {
        const value = textDecorationThickness || 1;
        textNode.textDecorationThickness = {
          value: BaseOperation.validateNumericParam(value, "textDecorationThickness", 0, 100),
          unit: validatedUnit
        };
      }
    }
    if (textDecorationColorAuto === true) {
      textNode.textDecorationColor = { value: "AUTO" };
    } else if (textDecorationColor !== void 0) {
      const { r, g, b } = hexToRgb(textDecorationColor);
      textNode.textDecorationColor = {
        value: createSolidPaint2(`#${textDecorationColor.replace("#", "")}`)
      };
    }
    if (textDecorationSkipInk !== void 0) {
      textNode.textDecorationSkipInk = textDecorationSkipInk;
    }
  }
  async function applyRangeAdvancedTextDecoration(textNode, start, end, range) {
    if (range.textDecorationStyle !== void 0) {
      const validatedStyle = BaseOperation.validateStringParam(
        range.textDecorationStyle,
        "textDecorationStyle",
        ["SOLID", "WAVY", "DOTTED"]
      );
      textNode.setRangeTextDecorationStyle(start, end, validatedStyle);
    }
    if (range.textDecorationOffset !== void 0 || range.textDecorationOffsetUnit !== void 0) {
      const unit = range.textDecorationOffsetUnit || "PIXELS";
      const validatedUnit = BaseOperation.validateStringParam(
        unit,
        "textDecorationOffsetUnit",
        ["PIXELS", "PERCENT", "AUTO"]
      );
      if (validatedUnit === "AUTO") {
        textNode.setRangeTextDecorationOffset(start, end, { unit: "AUTO" });
      } else {
        const value = range.textDecorationOffset || 0;
        textNode.setRangeTextDecorationOffset(start, end, {
          value: BaseOperation.validateNumericParam(value, "textDecorationOffset", -1e3, 1e3),
          unit: validatedUnit
        });
      }
    }
    if (range.textDecorationThickness !== void 0 || range.textDecorationThicknessUnit !== void 0) {
      const unit = range.textDecorationThicknessUnit || "PIXELS";
      const validatedUnit = BaseOperation.validateStringParam(
        unit,
        "textDecorationThicknessUnit",
        ["PIXELS", "PERCENT", "AUTO"]
      );
      if (validatedUnit === "AUTO") {
        textNode.setRangeTextDecorationThickness(start, end, { unit: "AUTO" });
      } else {
        const value = range.textDecorationThickness || 1;
        textNode.setRangeTextDecorationThickness(start, end, {
          value: BaseOperation.validateNumericParam(value, "textDecorationThickness", 0, 100),
          unit: validatedUnit
        });
      }
    }
    if (range.textDecorationColorAuto === true) {
      textNode.setRangeTextDecorationColor(start, end, { value: "AUTO" });
    } else if (range.textDecorationColor !== void 0) {
      textNode.setRangeTextDecorationColor(start, end, {
        value: createSolidPaint2(`#${range.textDecorationColor.replace("#", "")}`)
      });
    }
    if (range.textDecorationSkipInk !== void 0) {
      textNode.setRangeTextDecorationSkipInk(start, end, range.textDecorationSkipInk);
    }
  }
  async function resetAllCharacterStyling(textNode) {
    const textLength = textNode.characters.length;
    if (textLength === 0) return;
    await resetCharacterRangeStyling(textNode, 0, textLength);
  }
  async function handleInsertText(params) {
    BaseOperation.validateParams(params, ["nodeId", "insertPosition", "insertText"]);
    const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
    const insertPositions = Array.isArray(params.insertPosition) ? params.insertPosition : [params.insertPosition];
    const insertTexts = Array.isArray(params.insertText) ? params.insertText : [params.insertText];
    const insertUseStyles = Array.isArray(params.insertUseStyle) ? params.insertUseStyle : [params.insertUseStyle];
    const maxLength = Math.max(nodeIds.length, insertPositions.length, insertTexts.length);
    const operations = [];
    for (let i = 0; i < maxLength; i++) {
      operations.push({
        nodeId: nodeIds[i] || nodeIds[nodeIds.length - 1],
        insertPosition: insertPositions[i] || insertPositions[insertPositions.length - 1],
        insertText: insertTexts[i] || insertTexts[insertTexts.length - 1],
        insertUseStyle: insertUseStyles[i] || insertUseStyles[insertUseStyles.length - 1],
        originalIndex: i
      });
    }
    const operationsByNode = /* @__PURE__ */ new Map();
    operations.forEach((op) => {
      if (!operationsByNode.has(op.nodeId)) {
        operationsByNode.set(op.nodeId, []);
      }
      operationsByNode.get(op.nodeId).push(op);
    });
    operationsByNode.forEach((ops) => {
      ops.sort((a, b) => b.insertPosition - a.insertPosition);
    });
    const results = [];
    for (const [nodeId, nodeOps] of operationsByNode) {
      try {
        const node = findNodeById(nodeId);
        if (!node || node.type !== "TEXT") {
          throw new Error(`Text node with ID ${nodeId} not found`);
        }
        const textNode = node;
        if (textNode.fontName !== figma.mixed) {
          await figma.loadFontAsync(textNode.fontName);
        } else {
          await loadDefaultFont();
        }
        for (const op of nodeOps) {
          try {
            const currentTextLength = textNode.characters.length;
            if (op.insertPosition < 0 || op.insertPosition > currentTextLength) {
              throw new Error(`Invalid insert position: ${op.insertPosition} for text length ${currentTextLength}`);
            }
            if (op.insertUseStyle && ["BEFORE", "AFTER"].includes(op.insertUseStyle.toUpperCase())) {
              textNode.insertCharacters(op.insertPosition, op.insertText, op.insertUseStyle.toUpperCase());
            } else {
              textNode.insertCharacters(op.insertPosition, op.insertText);
            }
            results[op.originalIndex] = {
              nodeId: textNode.id,
              insertPosition: op.insertPosition,
              insertText: op.insertText,
              insertUseStyle: op.insertUseStyle || "default",
              newLength: textNode.characters.length,
              success: true
            };
          } catch (error) {
            results[op.originalIndex] = {
              nodeId: op.nodeId,
              insertPosition: op.insertPosition,
              insertText: op.insertText,
              success: false,
              error: error.toString()
            };
          }
        }
      } catch (error) {
        nodeOps.forEach((op) => {
          results[op.originalIndex] = {
            nodeId: op.nodeId,
            insertPosition: op.insertPosition,
            insertText: op.insertText,
            success: false,
            error: error.toString()
          };
        });
      }
    }
    return {
      operation: "insert_text",
      results: results.filter((r) => r !== void 0),
      // Remove any undefined entries
      totalNodes: maxLength,
      successfulNodes: results.filter((r) => r && r.success).length
    };
  }
  async function handleDeleteText(params) {
    BaseOperation.validateParams(params, ["nodeId", "deleteStart", "deleteEnd"]);
    const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
    const deleteStarts = Array.isArray(params.deleteStart) ? params.deleteStart : [params.deleteStart];
    const deleteEnds = Array.isArray(params.deleteEnd) ? params.deleteEnd : [params.deleteEnd];
    const maxLength = Math.max(nodeIds.length, deleteStarts.length, deleteEnds.length);
    const operations = [];
    for (let i = 0; i < maxLength; i++) {
      operations.push({
        nodeId: nodeIds[i] || nodeIds[nodeIds.length - 1],
        deleteStart: deleteStarts[i] || deleteStarts[deleteStarts.length - 1],
        deleteEnd: deleteEnds[i] || deleteEnds[deleteEnds.length - 1],
        originalIndex: i
      });
    }
    const operationsByNode = /* @__PURE__ */ new Map();
    operations.forEach((op) => {
      if (!operationsByNode.has(op.nodeId)) {
        operationsByNode.set(op.nodeId, []);
      }
      operationsByNode.get(op.nodeId).push(op);
    });
    operationsByNode.forEach((ops) => {
      ops.sort((a, b) => b.deleteStart - a.deleteStart);
    });
    const results = [];
    for (const [nodeId, nodeOps] of operationsByNode) {
      try {
        const node = findNodeById(nodeId);
        if (!node || node.type !== "TEXT") {
          throw new Error(`Text node with ID ${nodeId} not found`);
        }
        const textNode = node;
        if (textNode.fontName !== figma.mixed) {
          await figma.loadFontAsync(textNode.fontName);
        } else {
          await loadDefaultFont();
        }
        for (const op of nodeOps) {
          try {
            const currentTextLength = textNode.characters.length;
            if (op.deleteStart < 0 || op.deleteEnd > currentTextLength || op.deleteStart >= op.deleteEnd) {
              throw new Error(`Invalid delete range: ${op.deleteStart}-${op.deleteEnd} for text length ${currentTextLength}`);
            }
            const deletedText = textNode.characters.substring(op.deleteStart, op.deleteEnd);
            textNode.deleteCharacters(op.deleteStart, op.deleteEnd);
            results[op.originalIndex] = {
              nodeId: textNode.id,
              deleteStart: op.deleteStart,
              deleteEnd: op.deleteEnd,
              deletedText,
              deletedLength: op.deleteEnd - op.deleteStart,
              newLength: textNode.characters.length,
              success: true
            };
          } catch (error) {
            results[op.originalIndex] = {
              nodeId: op.nodeId,
              deleteStart: op.deleteStart,
              deleteEnd: op.deleteEnd,
              success: false,
              error: error.toString()
            };
          }
        }
      } catch (error) {
        nodeOps.forEach((op) => {
          results[op.originalIndex] = {
            nodeId: op.nodeId,
            deleteStart: op.deleteStart,
            deleteEnd: op.deleteEnd,
            success: false,
            error: error.toString()
          };
        });
      }
    }
    return {
      operation: "delete_text",
      results: results.filter((r) => r !== void 0),
      // Remove any undefined entries
      totalNodes: maxLength,
      successfulNodes: results.filter((r) => r && r.success).length
    };
  }
  async function handleSearchText(params) {
    BaseOperation.validateParams(params, ["searchQuery"]);
    const isGlobalSearch = !params.nodeId;
    if (isGlobalSearch) {
      return await performGlobalSearch(params);
    }
    const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
    const searchQueries = Array.isArray(params.searchQuery) ? params.searchQuery : [params.searchQuery];
    const searchCaseSensitives = Array.isArray(params.searchCaseSensitive) ? params.searchCaseSensitive : [params.searchCaseSensitive];
    const searchWholeWords = Array.isArray(params.searchWholeWord) ? params.searchWholeWord : [params.searchWholeWord];
    const searchMaxResultsList = Array.isArray(params.searchMaxResults) ? params.searchMaxResults : [params.searchMaxResults];
    const maxLength = Math.max(nodeIds.length, searchQueries.length);
    const operations = [];
    for (let i = 0; i < maxLength; i++) {
      operations.push({
        nodeId: nodeIds[i] || nodeIds[nodeIds.length - 1],
        searchQuery: searchQueries[i] || searchQueries[searchQueries.length - 1],
        searchCaseSensitive: searchCaseSensitives[i] !== void 0 ? searchCaseSensitives[i] : searchCaseSensitives[searchCaseSensitives.length - 1] || false,
        searchWholeWord: searchWholeWords[i] !== void 0 ? searchWholeWords[i] : searchWholeWords[searchWholeWords.length - 1] || false,
        searchMaxResults: searchMaxResultsList[i] || searchMaxResultsList[searchMaxResultsList.length - 1] || 100,
        originalIndex: i
      });
    }
    const results = [];
    for (const op of operations) {
      try {
        const node = findNodeById(op.nodeId);
        if (!node || node.type !== "TEXT") {
          throw new Error(`Text node with ID ${op.nodeId} not found`);
        }
        const textNode = node;
        const text = textNode.characters;
        const matches = searchText(text, op.searchQuery, {
          caseSensitive: op.searchCaseSensitive,
          wholeWord: op.searchWholeWord,
          maxResults: op.searchMaxResults
        });
        results[op.originalIndex] = {
          nodeId: textNode.id,
          searchQuery: op.searchQuery,
          textLength: text.length,
          matches,
          matchCount: matches.length,
          caseSensitive: op.searchCaseSensitive,
          wholeWord: op.searchWholeWord,
          success: true
        };
      } catch (error) {
        results[op.originalIndex] = {
          nodeId: op.nodeId,
          searchQuery: op.searchQuery,
          success: false,
          error: error.toString()
        };
      }
    }
    return {
      operation: "search_text",
      results: results.filter((r) => r !== void 0),
      totalNodes: maxLength,
      successfulNodes: results.filter((r) => r && r.success).length
    };
  }
  async function performGlobalSearch(params) {
    const searchQuery = unwrapArrayParam(params.searchQuery);
    const searchCaseSensitive = unwrapArrayParam(params.searchCaseSensitive);
    const searchWholeWord = unwrapArrayParam(params.searchWholeWord);
    const searchMaxResults = unwrapArrayParam(params.searchMaxResults);
    const textNodes = figma.root.findAllWithCriteria({ types: ["TEXT"] });
    if (textNodes.length === 0) {
      return {
        operation: "search_text",
        searchQuery,
        results: [],
        totalNodes: 0,
        successfulNodes: 0,
        totalMatches: 0
      };
    }
    const results = [];
    let totalMatches = 0;
    let successfulNodes = 0;
    for (const textNode of textNodes) {
      try {
        const text = textNode.characters;
        const matches = searchText(text, searchQuery, {
          caseSensitive: searchCaseSensitive || false,
          wholeWord: searchWholeWord || false,
          maxResults: searchMaxResults || 100
        });
        if (matches.length > 0) {
          results.push({
            nodeId: textNode.id,
            nodeName: textNode.name,
            textLength: text.length,
            matches,
            matchCount: matches.length,
            caseSensitive: searchCaseSensitive || false,
            wholeWord: searchWholeWord || false,
            success: true
          });
          totalMatches += matches.length;
          successfulNodes++;
        }
      } catch (error) {
        results.push({
          nodeId: textNode.id,
          nodeName: textNode.name,
          searchQuery,
          success: false,
          error: error.toString()
        });
      }
    }
    return {
      operation: "search_text",
      searchQuery,
      results: results.filter((r) => r.matchCount > 0 || !r.success),
      // Filter out nodes with no matches (unless there was an error)
      totalNodes: textNodes.length,
      successfulNodes,
      totalMatches,
      caseSensitive: searchCaseSensitive || false,
      wholeWord: searchWholeWord || false,
      maxResults: searchMaxResults || 100
    };
  }
  function searchText(text, query, options = {}) {
    const { caseSensitive = false, wholeWord = false, maxResults = 100 } = options;
    if (!query || query.length === 0) {
      return [];
    }
    const searchText2 = caseSensitive ? text : text.toLowerCase();
    const searchPattern = caseSensitive ? query : query.toLowerCase();
    const patternLength = searchPattern.length;
    const textLength = searchText2.length;
    if (patternLength > textLength) {
      return [];
    }
    const matches = [];
    const badCharTable = /* @__PURE__ */ new Map();
    for (let i = 0; i < patternLength - 1; i++) {
      badCharTable.set(searchPattern[i], patternLength - 1 - i);
    }
    let textIndex = 0;
    while (textIndex <= textLength - patternLength && matches.length < maxResults) {
      let patternIndex = patternLength - 1;
      while (patternIndex >= 0 && searchText2[textIndex + patternIndex] === searchPattern[patternIndex]) {
        patternIndex--;
      }
      if (patternIndex < 0) {
        const rangeStart = textIndex;
        const rangeEnd = textIndex + patternLength;
        const matchText = text.substring(rangeStart, rangeEnd);
        if (!wholeWord || isWholeWordMatch(text, rangeStart, rangeEnd)) {
          matches.push({ rangeStart, rangeEnd, match: matchText });
        }
        textIndex++;
      } else {
        const badChar = searchText2[textIndex + patternIndex];
        const skip = badCharTable.get(badChar) || patternLength;
        textIndex += Math.max(1, skip);
      }
    }
    return matches;
  }
  function isWholeWordMatch(text, rangeStart, rangeEnd) {
    const wordBoundaryRegex = /\w/;
    if (rangeStart > 0) {
      const prevChar = text[rangeStart - 1];
      const matchStartChar = text[rangeStart];
      if (wordBoundaryRegex.test(prevChar) && wordBoundaryRegex.test(matchStartChar)) {
        return false;
      }
    }
    if (rangeEnd < text.length) {
      const nextChar = text[rangeEnd];
      const matchEndChar = text[rangeEnd - 1];
      if (wordBoundaryRegex.test(nextChar) && wordBoundaryRegex.test(matchEndChar)) {
        return false;
      }
    }
    return true;
  }
  async function handleApplyTextStyle(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeId = unwrapArrayParam(params.nodeId);
    const node = findNodeById(nodeId);
    if (!node || node.type !== "TEXT") {
      throw new Error(`Text node with ID ${nodeId} not found`);
    }
    const textNode = node;
    if (params.textStyleId) {
      const allTextStyles = figma.getLocalTextStyles();
      const targetStyle = allTextStyles.find((s) => cleanStyleId(s.id) === params.textStyleId);
      if (targetStyle) {
        await textNode.setTextStyleIdAsync(targetStyle.id);
      } else {
        throw new Error(`Text style with ID ${params.textStyleId} not found`);
      }
    }
    return formatNodeResponse(textNode, "text style applied");
  }
  async function handleCreateTextStyle(params) {
    BaseOperation.validateParams(params, ["styleName"]);
    let sourceNode = null;
    if (params.nodeId) {
      const nodeId = unwrapArrayParam(params.nodeId);
      const node = findNodeById(nodeId);
      if (!node || node.type !== "TEXT") {
        throw new Error(`Text node with ID ${nodeId} not found`);
      }
      sourceNode = node;
    }
    const result = await createTextStyleFromNode(sourceNode, {
      name: params.styleName,
      description: params.styleDescription
    });
    return result;
  }
  async function applyTextProperties(textNode, params) {
    const textCase = unwrapArrayParam(params.textCase);
    const textDecoration = unwrapArrayParam(params.textDecoration);
    const letterSpacing = unwrapArrayParam(params.letterSpacing);
    const lineHeight = unwrapArrayParam(params.lineHeight);
    const textAlignHorizontal = unwrapArrayParam(params.textAlignHorizontal);
    const textAlignVertical = unwrapArrayParam(params.textAlignVertical);
    const textAutoResize = unwrapArrayParam(params.textAutoResize);
    const paragraphSpacing = unwrapArrayParam(params.paragraphSpacing);
    const paragraphIndent = unwrapArrayParam(params.paragraphIndent);
    const listSpacing = unwrapArrayParam(params.listSpacing);
    const hangingPunctuation = unwrapArrayParam(params.hangingPunctuation);
    const hangingList = unwrapArrayParam(params.hangingList);
    const leadingTrim = unwrapArrayParam(params.leadingTrim);
    const autoRename = unwrapArrayParam(params.autoRename);
    if (textCase !== void 0) {
      const validatedTextCase = BaseOperation.validateStringParam(
        textCase,
        "textCase",
        ["ORIGINAL", "UPPER", "LOWER", "TITLE"]
      );
      textNode.textCase = validatedTextCase;
    }
    if (textDecoration !== void 0) {
      const validatedTextDecoration = BaseOperation.validateStringParam(
        textDecoration,
        "textDecoration",
        ["NONE", "UNDERLINE", "STRIKETHROUGH"]
      );
      textNode.textDecoration = validatedTextDecoration;
    }
    await applyAdvancedTextDecoration(textNode, params);
    if (letterSpacing !== void 0) {
      if (typeof letterSpacing === "number") {
        textNode.letterSpacing = { value: letterSpacing, unit: "PIXELS" };
      }
    }
    if (lineHeight !== void 0) {
      if (typeof lineHeight === "number") {
        textNode.lineHeight = { value: lineHeight, unit: "PIXELS" };
      }
    }
    if (params.fillColor) {
      const fillColor = unwrapArrayParam(params.fillColor);
      textNode.fills = [createSolidPaint2(fillColor)];
    }
    if (params.textTruncation !== void 0) {
      const textTruncation = unwrapArrayParam(params.textTruncation);
      const validatedTruncation = BaseOperation.validateStringParam(
        textTruncation,
        "textTruncation",
        ["DISABLED", "ENDING"]
      );
      textNode.textTruncation = validatedTruncation;
    }
    if (params.maxLines !== void 0) {
      const maxLines = unwrapArrayParam(params.maxLines);
      textNode.maxLines = BaseOperation.validateNumericParam(maxLines, "maxLines", 1, 1e3);
    }
    if (params.fills && params.fills.length > 0) {
      textNode.fills = params.fills.map((fill) => createPaintFromFill(fill));
    }
    if (textAlignHorizontal !== void 0) {
      const alignment = BaseOperation.validateStringParam(
        textAlignHorizontal,
        "textAlignHorizontal",
        ["LEFT", "CENTER", "RIGHT", "JUSTIFIED"]
      );
      textNode.textAlignHorizontal = alignment;
    }
    if (textAlignVertical !== void 0) {
      const alignment = BaseOperation.validateStringParam(
        textAlignVertical,
        "textAlignVertical",
        ["TOP", "CENTER", "BOTTOM"]
      );
      textNode.textAlignVertical = alignment;
    }
    if (textAutoResize !== void 0) {
      const autoResize = BaseOperation.validateStringParam(
        textAutoResize,
        "textAutoResize",
        ["NONE", "WIDTH_AND_HEIGHT", "HEIGHT"]
      );
      textNode.textAutoResize = autoResize;
    }
    if (paragraphSpacing !== void 0) {
      textNode.paragraphSpacing = BaseOperation.validateNumericParam(paragraphSpacing, "paragraphSpacing", 0, 1e3);
    }
    if (paragraphIndent !== void 0) {
      textNode.paragraphIndent = BaseOperation.validateNumericParam(paragraphIndent, "paragraphIndent", 0, 1e3);
    }
    if (params.listType && textNode.characters.length > 0) {
      const listType = unwrapArrayParam(params.listType);
      const validatedListType = BaseOperation.validateStringParam(
        listType,
        "listType",
        ["ORDERED", "UNORDERED", "NONE"]
      );
      try {
        if (textNode.fontName !== figma.mixed) {
          await figma.loadFontAsync(textNode.fontName);
        }
        textNode.setRangeListOptions(0, textNode.characters.length, {
          type: validatedListType
        });
      } catch (error) {
        logger.warn(`Failed to set list options: ${error.toString()}`);
        throw new Error(`Failed to set list type '${validatedListType}': ${error.toString()}`);
      }
    }
    if (listSpacing !== void 0) {
      textNode.listSpacing = BaseOperation.validateNumericParam(listSpacing, "listSpacing", 0, 1e3);
    }
    if (hangingPunctuation !== void 0) {
      textNode.hangingPunctuation = hangingPunctuation;
    }
    if (hangingList !== void 0) {
      textNode.hangingList = hangingList;
    }
    if (leadingTrim !== void 0) {
      const validatedLeadingTrim = BaseOperation.validateStringParam(
        leadingTrim,
        "leadingTrim",
        ["NONE", "CAP_HEIGHT", "BASELINE", "BOTH"]
      );
      textNode.leadingTrim = validatedLeadingTrim;
    }
    if (autoRename !== void 0) {
      textNode.autoRename = autoRename;
    }
  }
  function buildCharacterRanges(params) {
    if (!params.rangeStart && !params.rangeEnd) {
      return [];
    }
    const starts = Array.isArray(params.rangeStart) ? params.rangeStart : [params.rangeStart];
    const ends = Array.isArray(params.rangeEnd) ? params.rangeEnd : [params.rangeEnd];
    if (starts[0] === void 0 || ends[0] === void 0) {
      return [];
    }
    const maxLength = Math.max(starts.length, ends.length);
    const ranges = [];
    for (let i = 0; i < maxLength; i++) {
      const range = {
        start: starts[i] || starts[starts.length - 1],
        end: ends[i] || ends[ends.length - 1]
      };
      if (params.rangeFontSize !== void 0) {
        const fontSizes = Array.isArray(params.rangeFontSize) ? params.rangeFontSize : [params.rangeFontSize];
        range.fontSize = fontSizes[i] || fontSizes[fontSizes.length - 1];
      }
      if (params.rangeFontFamily !== void 0) {
        const fontFamilies = Array.isArray(params.rangeFontFamily) ? params.rangeFontFamily : [params.rangeFontFamily];
        range.fontFamily = fontFamilies[i] || fontFamilies[fontFamilies.length - 1];
      }
      if (params.rangeFontStyle !== void 0) {
        const fontStyles = Array.isArray(params.rangeFontStyle) ? params.rangeFontStyle : [params.rangeFontStyle];
        range.fontStyle = fontStyles[i] || fontStyles[fontStyles.length - 1];
      }
      if (params.rangeTextCase !== void 0) {
        const textCases = Array.isArray(params.rangeTextCase) ? params.rangeTextCase : [params.rangeTextCase];
        range.textCase = textCases[i] || textCases[textCases.length - 1];
      }
      if (params.rangeTextDecoration !== void 0) {
        const textDecorations = Array.isArray(params.rangeTextDecoration) ? params.rangeTextDecoration : [params.rangeTextDecoration];
        range.textDecoration = textDecorations[i] || textDecorations[textDecorations.length - 1];
      }
      if (params.rangeTextDecorationStyle !== void 0) {
        const textDecorationStyles = Array.isArray(params.rangeTextDecorationStyle) ? params.rangeTextDecorationStyle : [params.rangeTextDecorationStyle];
        range.textDecorationStyle = textDecorationStyles[i] || textDecorationStyles[textDecorationStyles.length - 1];
      }
      if (params.rangeTextDecorationOffset !== void 0) {
        const textDecorationOffsets = Array.isArray(params.rangeTextDecorationOffset) ? params.rangeTextDecorationOffset : [params.rangeTextDecorationOffset];
        range.textDecorationOffset = textDecorationOffsets[i] || textDecorationOffsets[textDecorationOffsets.length - 1];
      }
      if (params.rangeTextDecorationOffsetUnit !== void 0) {
        const textDecorationOffsetUnits = Array.isArray(params.rangeTextDecorationOffsetUnit) ? params.rangeTextDecorationOffsetUnit : [params.rangeTextDecorationOffsetUnit];
        range.textDecorationOffsetUnit = textDecorationOffsetUnits[i] || textDecorationOffsetUnits[textDecorationOffsetUnits.length - 1];
      }
      if (params.rangeTextDecorationThickness !== void 0) {
        const textDecorationThicknesses = Array.isArray(params.rangeTextDecorationThickness) ? params.rangeTextDecorationThickness : [params.rangeTextDecorationThickness];
        range.textDecorationThickness = textDecorationThicknesses[i] || textDecorationThicknesses[textDecorationThicknesses.length - 1];
      }
      if (params.rangeTextDecorationThicknessUnit !== void 0) {
        const textDecorationThicknessUnits = Array.isArray(params.rangeTextDecorationThicknessUnit) ? params.rangeTextDecorationThicknessUnit : [params.rangeTextDecorationThicknessUnit];
        range.textDecorationThicknessUnit = textDecorationThicknessUnits[i] || textDecorationThicknessUnits[textDecorationThicknessUnits.length - 1];
      }
      if (params.rangeTextDecorationColor !== void 0) {
        const textDecorationColors = Array.isArray(params.rangeTextDecorationColor) ? params.rangeTextDecorationColor : [params.rangeTextDecorationColor];
        range.textDecorationColor = textDecorationColors[i] || textDecorationColors[textDecorationColors.length - 1];
      }
      if (params.rangeTextDecorationColorAuto !== void 0) {
        const textDecorationColorAutos = Array.isArray(params.rangeTextDecorationColorAuto) ? params.rangeTextDecorationColorAuto : [params.rangeTextDecorationColorAuto];
        range.textDecorationColorAuto = textDecorationColorAutos[i] || textDecorationColorAutos[textDecorationColorAutos.length - 1];
      }
      if (params.rangeTextDecorationSkipInk !== void 0) {
        const textDecorationSkipInks = Array.isArray(params.rangeTextDecorationSkipInk) ? params.rangeTextDecorationSkipInk : [params.rangeTextDecorationSkipInk];
        range.textDecorationSkipInk = textDecorationSkipInks[i] || textDecorationSkipInks[textDecorationSkipInks.length - 1];
      }
      if (params.rangeLetterSpacing !== void 0) {
        const letterSpacings = Array.isArray(params.rangeLetterSpacing) ? params.rangeLetterSpacing : [params.rangeLetterSpacing];
        range.letterSpacing = letterSpacings[i] || letterSpacings[letterSpacings.length - 1];
      }
      if (params.rangeFillColor !== void 0) {
        const fillColors = Array.isArray(params.rangeFillColor) ? params.rangeFillColor : [params.rangeFillColor];
        const fillColor = fillColors[i] || fillColors[fillColors.length - 1];
        range.fillColor = fillColor;
      }
      if (params.rangeHyperlinkType !== void 0 && params.rangeHyperlinkValue !== void 0) {
        const hyperlinkTypes = Array.isArray(params.rangeHyperlinkType) ? params.rangeHyperlinkType : [params.rangeHyperlinkType];
        const hyperlinkValues = Array.isArray(params.rangeHyperlinkValue) ? params.rangeHyperlinkValue : [params.rangeHyperlinkValue];
        const hyperlinkType = hyperlinkTypes[i] || hyperlinkTypes[hyperlinkTypes.length - 1];
        const hyperlinkValue = hyperlinkValues[i] || hyperlinkValues[hyperlinkValues.length - 1];
        range.hyperlink = {
          type: hyperlinkType.toUpperCase(),
          value: hyperlinkValue
        };
      }
      ranges.push(range);
    }
    return ranges;
  }
  async function loadFontWithFallback(fontFamily, fontStyle) {
    try {
      if (fontFamily && fontStyle) {
        const fontName = { family: fontFamily, style: fontStyle };
        await figma.loadFontAsync(fontName);
        return { fontName, substituted: false };
      } else if (fontFamily) {
        const fontName = { family: fontFamily, style: "Regular" };
        await figma.loadFontAsync(fontName);
        return { fontName, substituted: fontStyle ? true : false, reason: fontStyle ? `Style '${fontStyle}' not found, using Regular` : void 0 };
      }
    } catch (error) {
    }
    try {
      const defaultFont = await loadDefaultFont();
      if (defaultFont && defaultFont.family && defaultFont.style) {
        return { fontName: defaultFont, substituted: true, reason: `Font '${fontFamily || "specified"} ${fontStyle || ""}' not available, using default` };
      }
    } catch (error) {
    }
    const fallbackFont = { family: "Inter", style: "Regular" };
    await figma.loadFontAsync(fallbackFont);
    return { fontName: fallbackFont, substituted: true, reason: `Font '${fontFamily || "specified"} ${fontStyle || ""}' not available, using Inter Regular` };
  }
  async function applyCharacterRanges(textNode, ranges) {
    for (const range of ranges) {
      const { start, end } = range;
      if (start < 0 || end > textNode.characters.length || start >= end) {
        throw new Error(`Invalid character range: ${start}-${end} for text length ${textNode.characters.length}`);
      }
      if (range.fontFamily || range.fontStyle) {
        const fontName = {
          family: range.fontFamily || textNode.fontName.family,
          style: range.fontStyle || textNode.fontName.style
        };
        await ensureFontLoaded(fontName);
        textNode.setRangeFontName(start, end, fontName);
      }
      if (range.fontSize !== void 0) {
        textNode.setRangeFontSize(start, end, range.fontSize);
      }
      if (range.textCase !== void 0) {
        textNode.setRangeTextCase(start, end, range.textCase);
      }
      if (range.textDecoration !== void 0) {
        textNode.setRangeTextDecoration(start, end, range.textDecoration);
      }
      await applyRangeAdvancedTextDecoration(textNode, start, end, range);
      if (range.letterSpacing !== void 0) {
        const spacing = typeof range.letterSpacing === "number" ? { value: range.letterSpacing, unit: "PIXELS" } : range.letterSpacing;
        textNode.setRangeLetterSpacing(start, end, spacing);
      }
      if (range.fillColor) {
        const paint = createSolidPaint2(range.fillColor);
        textNode.setRangeFills(start, end, [paint]);
      }
      if (range.hyperlink) {
        const validatedType = BaseOperation.validateStringParam(
          range.hyperlink.type,
          "hyperlinkType",
          ["URL", "NODE"]
        );
        const hyperlinkTarget = {
          type: validatedType,
          value: range.hyperlink.value
        };
        textNode.setRangeHyperlink(start, end, hyperlinkTarget);
      }
    }
  }
  function applyHyperlink(textNode, hyperlink) {
    const { type, url, nodeId } = hyperlink;
    if (type === "URL" && url) {
      textNode.hyperlink = { type: "URL", url };
    } else if (type === "NODE" && nodeId) {
      const targetNode = figma.getNodeById(nodeId);
      if (targetNode) {
        textNode.hyperlink = { type: "NODE", value: targetNode.id };
      }
    }
  }
  async function createTextStyleFromNode(textNode, styleOptions) {
    const textStyle = figma.createTextStyle();
    textStyle.name = styleOptions.name;
    if (styleOptions.description) {
      textStyle.description = styleOptions.description;
    }
    if (textNode) {
      textStyle.fontName = textNode.fontName;
      textStyle.fontSize = textNode.fontSize;
      textStyle.letterSpacing = textNode.letterSpacing;
      textStyle.lineHeight = textNode.lineHeight;
      textStyle.paragraphSpacing = textNode.paragraphSpacing;
      textStyle.paragraphIndent = textNode.paragraphIndent;
      textStyle.textCase = textNode.textCase;
      textStyle.textDecoration = textNode.textDecoration;
    }
    return {
      styleId: textStyle.id,
      styleName: textStyle.name,
      styleType: "text",
      message: `Created text style: ${textStyle.name}`
    };
  }
  function createPaintFromFill(fill) {
    switch (fill.type) {
      case "SOLID":
        const rgb = hexToRgb(fill.color || "#000000");
        return {
          type: "SOLID",
          color: { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 },
          opacity: fill.opacity !== void 0 ? fill.opacity : 1,
          visible: fill.visible !== void 0 ? fill.visible : true
        };
      default:
        throw new Error(`Unsupported fill type: ${fill.type}`);
    }
  }

  // src/operations/manage-variables.ts
  var manage_variables_exports = {};
  __export(manage_variables_exports, {
    MANAGE_COLLECTIONS: () => MANAGE_COLLECTIONS,
    MANAGE_VARIABLES: () => MANAGE_VARIABLES
  });
  init_variable_binding_validator();
  async function MANAGE_VARIABLES(params) {
    return BaseOperation.executeOperation("manageVariables", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        ["create_variable", "update_variable", "delete_variable", "get_variable", "list_variables", "bind_variable", "unbind_variable", "create_collection", "update_collection", "delete_collection", "duplicate_collection", "get_collection", "list_collections", "add_mode", "remove_mode", "rename_mode"]
      );
      switch (operation) {
        // Variable operations
        case "create_variable":
          return await createVariable(params);
        case "update_variable":
          return await updateVariable(params);
        case "delete_variable":
          return await deleteVariable(params);
        case "get_variable":
          return await getVariable(params);
        case "list_variables":
          return await listVariables(params);
        case "bind_variable":
          return await bindVariable(params);
        case "unbind_variable":
          return await unbindVariable(params);
        // Collection operations
        case "create_collection":
          return await createCollection(params);
        case "update_collection":
          return await updateCollection(params);
        case "delete_collection":
          return await deleteCollection(params);
        case "duplicate_collection":
          return await duplicateCollection(params);
        case "get_collection":
          return await getCollection(params);
        case "list_collections":
          return await listCollections(params);
        case "add_mode":
          return await addMode(params);
        case "remove_mode":
          return await removeMode(params);
        case "rename_mode":
          return await renameMode(params);
        default:
          throw new Error(`Unknown variable operation: ${operation}`);
      }
    });
  }
  function normalizeCollectionId(collectionId) {
    return collectionId.startsWith("VariableCollectionId:") ? collectionId : `VariableCollectionId:${collectionId}`;
  }
  function normalizeVariableId(variableId) {
    return variableId.startsWith("VariableID:") ? variableId : `VariableID:${variableId}`;
  }
  async function getVariableBindings(variableId) {
    const nodeBindings = [];
    const styleBindings = [];
    const allNodes = figma.currentPage.findAll();
    for (const node of allNodes) {
      if (node.boundVariables) {
        Object.entries(node.boundVariables).forEach(([property, binding]) => {
          if (Array.isArray(binding)) {
            binding.forEach((b, index) => {
              if (b && b.id === variableId) {
                nodeBindings.push({
                  type: "node",
                  nodeId: node.id,
                  nodeName: node.name,
                  nodeType: node.type,
                  property: `${property}[${index}]`,
                  bindingId: b.id
                });
              }
            });
          } else if (binding && binding.id === variableId) {
            nodeBindings.push({
              type: "node",
              nodeId: node.id,
              nodeName: node.name,
              nodeType: node.type,
              property,
              bindingId: binding.id
            });
          }
        });
      }
    }
    const paintStyles = figma.getLocalPaintStyles();
    paintStyles.forEach((style) => {
      if (style.boundVariables && style.boundVariables.paints) {
        const paintBinding = style.boundVariables.paints;
        if (paintBinding.id === variableId) {
          styleBindings.push({
            type: "style",
            styleId: style.id,
            styleName: style.name,
            styleType: "PAINT",
            property: "paints",
            bindingId: paintBinding.id
          });
        }
      }
    });
    const textStyles = figma.getLocalTextStyles();
    textStyles.forEach((style) => {
      if (style.boundVariables) {
        const boundVars = style.boundVariables;
        Object.entries(boundVars).forEach(([property, binding]) => {
          if (binding && binding.id === variableId) {
            styleBindings.push({
              type: "style",
              styleId: style.id,
              styleName: style.name,
              styleType: "TEXT",
              property,
              bindingId: binding.id
            });
          }
        });
      }
    });
    return { nodeBindings, styleBindings };
  }
  function parseColor(colorString) {
    const hex = colorString.replace("#", "");
    let normalizedHex = hex;
    if (hex.length === 3) {
      normalizedHex = hex.split("").map((char) => char + char).join("");
    }
    if (normalizedHex.length !== 6) {
      throw new Error(`Invalid color format: ${colorString}`);
    }
    const r = parseInt(normalizedHex.substr(0, 2), 16) / 255;
    const g = parseInt(normalizedHex.substr(2, 2), 16) / 255;
    const b = parseInt(normalizedHex.substr(4, 2), 16) / 255;
    return { r, g, b };
  }
  async function createVariable(params) {
    BaseOperation.validateParams(params, ["collectionId", "variableName", "variableType"]);
    const { collectionId, variableName, variableType, modeValues, description, scopes, codeSyntax, hiddenFromPublishing } = params;
    const collection = await figma.variables.getVariableCollectionByIdAsync(normalizeCollectionId(collectionId));
    if (!collection) {
      throw new Error("Variable collection not found");
    }
    const variable = figma.variables.createVariable(variableName, collection, variableType);
    if (description) {
      variable.description = description;
    }
    if (scopes && Array.isArray(scopes)) {
      variable.scopes = scopes;
    }
    if (codeSyntax) {
      variable.codeSyntax = codeSyntax;
    }
    if (hiddenFromPublishing !== void 0) {
      variable.hiddenFromPublishing = hiddenFromPublishing;
    }
    if (modeValues) {
      for (const [modeKey, value] of Object.entries(modeValues)) {
        let targetModeId = modeKey;
        const mode = collection.modes.find((m) => m.modeId === modeKey || m.name === modeKey);
        if (mode) {
          targetModeId = mode.modeId;
        }
        try {
          let processedValue = value;
          if (variableType === "COLOR" && typeof value === "string") {
            processedValue = parseColor(value);
          }
          variable.setValueForMode(targetModeId, processedValue);
        } catch (error) {
          if (error.toString().includes("Limited to 1 modes only")) {
            throw new Error("Cannot set variable value for multiple modes: Your Figma plan is limited to 1 mode per collection. Upgrade to a paid plan to use multiple modes.");
          }
          logger.warn(`Failed to set value for mode ${modeKey}:`, error);
        }
      }
    }
    return {
      variableId: variable.id,
      name: variable.name,
      type: variable.resolvedType,
      collectionId: variable.variableCollectionId,
      description: variable.description,
      scopes: variable.scopes,
      codeSyntax: variable.codeSyntax,
      hiddenFromPublishing: variable.hiddenFromPublishing,
      message: `Successfully created ${variableType.toLowerCase()} variable "${variableName}"`
    };
  }
  async function updateVariable(params) {
    BaseOperation.validateParams(params, ["variableId"]);
    const { variableId, variableName, description, scopes, codeSyntax, hiddenFromPublishing, modeValues } = params;
    const updateVariable2 = await figma.variables.getVariableByIdAsync(normalizeVariableId(variableId));
    if (!updateVariable2) {
      throw new Error("Variable not found");
    }
    if (variableName) {
      updateVariable2.name = variableName;
    }
    if (description !== void 0) {
      updateVariable2.description = description;
    }
    if (scopes && Array.isArray(scopes)) {
      updateVariable2.scopes = scopes;
    }
    if (codeSyntax) {
      updateVariable2.codeSyntax = codeSyntax;
    }
    if (hiddenFromPublishing !== void 0) {
      updateVariable2.hiddenFromPublishing = hiddenFromPublishing;
    }
    if (modeValues) {
      const varCollection = await figma.variables.getVariableCollectionByIdAsync(updateVariable2.variableCollectionId);
      if (varCollection) {
        for (const [modeKey, value] of Object.entries(modeValues)) {
          let targetModeId = modeKey;
          const mode = varCollection.modes.find((m) => m.modeId === modeKey || m.name === modeKey);
          if (mode) {
            targetModeId = mode.modeId;
          }
          try {
            let processedValue = value;
            if (updateVariable2.resolvedType === "COLOR" && typeof value === "string") {
              processedValue = parseColor(value);
            }
            updateVariable2.setValueForMode(targetModeId, processedValue);
          } catch (error) {
            if (error.toString().includes("Limited to 1 modes only")) {
              throw new Error("Cannot update variable value for multiple modes: Your Figma plan is limited to 1 mode per collection. Upgrade to a paid plan to use multiple modes.");
            }
            logger.warn(`Failed to update value for mode ${modeKey}:`, error);
          }
        }
      }
    }
    return {
      variableId: updateVariable2.id,
      name: updateVariable2.name,
      type: updateVariable2.resolvedType,
      message: `Successfully updated variable "${updateVariable2.name}"`
    };
  }
  async function deleteVariable(params) {
    BaseOperation.validateParams(params, ["variableId"]);
    const { variableId } = params;
    const deleteVariable2 = await figma.variables.getVariableByIdAsync(normalizeVariableId(variableId));
    if (!deleteVariable2) {
      throw new Error("Variable not found");
    }
    const deletedVariableName = deleteVariable2.name;
    deleteVariable2.remove();
    return {
      deletedVariableId: variableId,
      deletedName: deletedVariableName,
      message: `Successfully deleted variable "${deletedVariableName}"`
    };
  }
  async function getVariable(params) {
    BaseOperation.validateParams(params, ["variableId"]);
    const { variableId } = params;
    const getVariable2 = await figma.variables.getVariableByIdAsync(normalizeVariableId(variableId));
    if (!getVariable2) {
      throw new Error("Variable not found");
    }
    const getVarCollection = await figma.variables.getVariableCollectionByIdAsync(getVariable2.variableCollectionId);
    const modes = getVarCollection ? getVarCollection.modes : [];
    const valuesByMode = {};
    for (const mode of modes) {
      try {
        const value = getVariable2.valuesByMode[mode.modeId];
        valuesByMode[mode.name] = value;
      } catch (error) {
        logger.warn(`Failed to get value for mode ${mode.name}:`, error);
      }
    }
    const { nodeBindings, styleBindings } = await getVariableBindings(getVariable2.id);
    const allBindings = [...nodeBindings, ...styleBindings];
    return {
      id: getVariable2.id,
      name: getVariable2.name,
      type: getVariable2.resolvedType,
      collectionId: getVariable2.variableCollectionId,
      collectionName: getVarCollection?.name,
      description: getVariable2.description,
      scopes: getVariable2.scopes,
      codeSyntax: getVariable2.codeSyntax,
      hiddenFromPublishing: getVariable2.hiddenFromPublishing,
      valuesByMode,
      // Binding information (previously from get_variable_bindings)
      bindings: allBindings,
      totalBindings: allBindings.length,
      nodeBindings: nodeBindings.length,
      styleBindings: styleBindings.length,
      bindingSummary: `${allBindings.length} binding${allBindings.length !== 1 ? "s" : ""} (${nodeBindings.length} node${nodeBindings.length !== 1 ? "s" : ""}, ${styleBindings.length} style${styleBindings.length !== 1 ? "s" : ""})`
    };
  }
  async function listVariables(params) {
    const { collectionId } = params;
    if (collectionId) {
      const listCollection = await figma.variables.getVariableCollectionByIdAsync(normalizeCollectionId(collectionId));
      if (!listCollection) {
        throw new Error("Variable collection not found");
      }
      const variables = await Promise.all(
        listCollection.variableIds.map(async (id) => {
          const variable = await figma.variables.getVariableByIdAsync(id);
          if (!variable) return null;
          return {
            id: variable.id,
            name: variable.name,
            type: variable.resolvedType,
            description: variable.description,
            scopes: variable.scopes,
            hiddenFromPublishing: variable.hiddenFromPublishing,
            collectionId: listCollection.id,
            collectionName: listCollection.name
          };
        })
      );
      return {
        collectionId: listCollection.id,
        collectionName: listCollection.name,
        variables: variables.filter(Boolean),
        totalCount: variables.filter(Boolean).length
      };
    }
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const allVariables = [];
    for (const collection of collections) {
      const variables = await Promise.all(
        collection.variableIds.map(async (id) => {
          const variable = await figma.variables.getVariableByIdAsync(id);
          if (!variable) return null;
          return {
            id: variable.id,
            name: variable.name,
            type: variable.resolvedType,
            description: variable.description,
            scopes: variable.scopes,
            hiddenFromPublishing: variable.hiddenFromPublishing,
            collectionId: collection.id,
            collectionName: collection.name
          };
        })
      );
      allVariables.push(...variables.filter(Boolean));
    }
    return {
      variables: allVariables,
      totalCount: allVariables.length,
      collectionsCount: collections.length
    };
  }
  async function bindVariable(params) {
    BaseOperation.validateParams(params, ["variableId", "property"]);
    const { variableId, id, styleId, property } = params;
    if (!id && !styleId) {
      throw new Error("Either id or styleId is required for bind operation");
    }
    const bindVariable2 = await figma.variables.getVariableByIdAsync(normalizeVariableId(variableId));
    if (!bindVariable2) {
      throw new Error("Variable not found");
    }
    if (id) {
      const node = findNodeById(id);
      if (!node) {
        throw new Error("Node not found");
      }
      try {
        if (property === "fills") {
          const validationResult = await bindingValidator.validateBinding(
            node.type,
            property,
            bindVariable2.resolvedType,
            "node"
          );
          if (!validationResult.isValid) {
            let errorMessage = validationResult.error || `Cannot bind ${bindVariable2.resolvedType} variable to fills property`;
            if (validationResult.suggestions) {
              const suggestions = validationResult.suggestions;
              const errorDetails = [];
              if (suggestions.validVariables && suggestions.validVariables.length > 0) {
                const variableList = suggestions.validVariables.slice(0, 3).map((v) => `"${v.name}" (${v.type})`).join(", ");
                errorDetails.push(`Valid variables: ${variableList}`);
              }
              if (suggestions.explanation) {
                errorDetails.push(`Tip: ${suggestions.explanation}`);
              }
              if (errorDetails.length > 0) {
                errorMessage += `

Suggestions:
${errorDetails.map((detail) => `\u2022 ${detail}`).join("\n")}`;
              }
            }
            throw new Error(errorMessage);
          }
          const currentFills = node.fills || [];
          if (currentFills.length === 0) {
            throw new Error(`Cannot bind variable to fills: Node "${node.name}" has no fills. Use figma_paint tool to add fills first, then bind variables.`);
          }
          if (currentFills.length > 1) {
            throw new Error(`Cannot bind variable to fills: Node "${node.name}" has ${currentFills.length} fill paints. Multiple fills create ambiguity - specify which paint index to bind using a more specific tool or operation.`);
          }
          const targetFill = currentFills[0];
          if (targetFill.type !== "SOLID") {
            throw new Error(`Cannot bind variable to fills: Node "${node.name}" has ${targetFill.type} fill. Variables can only be bound to SOLID paint types.`);
          }
          const boundFill = figma.variables.setBoundVariableForPaint(targetFill, "color", bindVariable2);
          node.fills = [boundFill];
        } else if (property === "strokes") {
          const validationResult = await bindingValidator.validateBinding(
            node.type,
            property,
            bindVariable2.resolvedType,
            "node"
          );
          if (!validationResult.isValid) {
            let errorMessage = validationResult.error || `Cannot bind ${bindVariable2.resolvedType} variable to strokes property`;
            if (validationResult.suggestions) {
              const suggestions = validationResult.suggestions;
              const errorDetails = [];
              if (suggestions.validVariables && suggestions.validVariables.length > 0) {
                const variableList = suggestions.validVariables.slice(0, 3).map((v) => `"${v.name}" (${v.type})`).join(", ");
                errorDetails.push(`Valid variables: ${variableList}`);
              }
              if (suggestions.explanation) {
                errorDetails.push(`Tip: ${suggestions.explanation}`);
              }
              if (errorDetails.length > 0) {
                errorMessage += `

Suggestions:
${errorDetails.map((detail) => `\u2022 ${detail}`).join("\n")}`;
              }
            }
            throw new Error(errorMessage);
          }
          const currentStrokes = node.strokes || [];
          if (currentStrokes.length === 0) {
            throw new Error(`Cannot bind variable to strokes: Node "${node.name}" has no strokes. Use figma_paint tool to add strokes first, then bind variables.`);
          }
          if (currentStrokes.length > 1) {
            throw new Error(`Cannot bind variable to strokes: Node "${node.name}" has ${currentStrokes.length} stroke paints. Multiple strokes create ambiguity - specify which paint index to bind using a more specific tool or operation.`);
          }
          const targetStroke = currentStrokes[0];
          if (targetStroke.type !== "SOLID") {
            throw new Error(`Cannot bind variable to strokes: Node "${node.name}" has ${targetStroke.type} stroke. Variables can only be bound to SOLID paint types.`);
          }
          const boundStroke = figma.variables.setBoundVariableForPaint(targetStroke, "color", bindVariable2);
          node.strokes = [boundStroke];
        } else if (property === "effects") {
          const effectField = params.effectField || "color";
          const validationResult = await bindingValidator.validateBinding(
            node.type,
            property,
            bindVariable2.resolvedType,
            "node"
          );
          if (!validationResult.isValid) {
            let errorMessage = validationResult.error || `Cannot bind ${bindVariable2.resolvedType} variable to effects property`;
            if (validationResult.suggestions) {
              const suggestions = validationResult.suggestions;
              const errorDetails = [];
              if (suggestions.validVariables && suggestions.validVariables.length > 0) {
                const variableList = suggestions.validVariables.slice(0, 3).map((v) => `"${v.name}" (${v.type})`).join(", ");
                errorDetails.push(`Valid variables: ${variableList}`);
              }
              if (suggestions.explanation) {
                errorDetails.push(`Tip: ${suggestions.explanation}`);
              }
              if (errorDetails.length > 0) {
                errorMessage += `

Suggestions:
${errorDetails.map((detail) => `\u2022 ${detail}`).join("\n")}`;
              }
            }
            throw new Error(errorMessage);
          }
          const currentEffects = node.effects || [];
          if (currentEffects.length === 0) {
            throw new Error(`Cannot bind variable to effects: Node "${node.name}" has no effects. Use figma_effects tool to add effects first, then bind variables.`);
          }
          if (currentEffects.length > 1) {
            throw new Error(`Cannot bind variable to effects: Node "${node.name}" has ${currentEffects.length} effects. Multiple effects create ambiguity - specify which effect index to bind using a more specific tool or operation.`);
          }
          const targetEffect = currentEffects[0];
          const boundEffect = figma.variables.setBoundVariableForEffect(targetEffect, effectField, bindVariable2);
          const newEffects = [...currentEffects];
          newEffects[0] = boundEffect;
          node.effects = newEffects;
        } else if (property === "layoutGrids") {
          const gridField = params.gridField || "sectionSize";
          const validationResult = await bindingValidator.validateBinding(
            node.type,
            property,
            bindVariable2.resolvedType,
            "node"
          );
          if (!validationResult.isValid) {
            let errorMessage = validationResult.error || `Cannot bind ${bindVariable2.resolvedType} variable to layoutGrids property`;
            if (validationResult.suggestions) {
              const suggestions = validationResult.suggestions;
              const errorDetails = [];
              if (suggestions.validVariables && suggestions.validVariables.length > 0) {
                const variableList = suggestions.validVariables.slice(0, 3).map((v) => `"${v.name}" (${v.type})`).join(", ");
                errorDetails.push(`Valid variables: ${variableList}`);
              }
              if (suggestions.explanation) {
                errorDetails.push(`Tip: ${suggestions.explanation}`);
              }
              if (errorDetails.length > 0) {
                errorMessage += `

Suggestions:
${errorDetails.map((detail) => `\u2022 ${detail}`).join("\n")}`;
              }
            }
            throw new Error(errorMessage);
          }
          const currentGrids = node.layoutGrids || [];
          if (currentGrids.length === 0) {
            throw new Error(`Cannot bind variable to layoutGrids: Node "${node.name}" has no layout grids. Use figma_layout tool to add grids first, then bind variables.`);
          }
          if (currentGrids.length > 1) {
            throw new Error(`Cannot bind variable to layoutGrids: Node "${node.name}" has ${currentGrids.length} layout grids. Multiple grids create ambiguity - specify which grid index to bind using a more specific tool or operation.`);
          }
          const targetGrid = currentGrids[0];
          const boundGrid = figma.variables.setBoundVariableForLayoutGrid(targetGrid, gridField, bindVariable2);
          const newGrids = [...currentGrids];
          newGrids[0] = boundGrid;
          node.layoutGrids = newGrids;
        } else {
          const validationResult = await bindingValidator.validateBinding(
            node.type,
            property,
            bindVariable2.resolvedType,
            "node"
          );
          if (!validationResult.isValid) {
            let errorMessage = validationResult.error || `Cannot bind ${bindVariable2.resolvedType} variable to property "${property}" on ${node.type} node`;
            if (validationResult.suggestions) {
              const suggestions = validationResult.suggestions;
              const errorDetails = [];
              if (suggestions.validVariables && suggestions.validVariables.length > 0) {
                const variableList = suggestions.validVariables.slice(0, 5).map((v) => `"${v.name}" (${v.type}${v.collectionName ? ` from ${v.collectionName}` : ""})`).join(", ");
                errorDetails.push(`Valid variables: ${variableList}${suggestions.validVariables.length > 5 ? "..." : ""}`);
              }
              if (suggestions.validProperties && suggestions.validProperties.length > 0) {
                const propertyList = suggestions.validProperties.slice(0, 8).join(", ");
                errorDetails.push(`Valid properties for ${bindVariable2.resolvedType} on ${node.type}: ${propertyList}${suggestions.validProperties.length > 8 ? "..." : ""}`);
              }
              if (suggestions.alternativeNodeTypes && suggestions.alternativeNodeTypes.length > 0) {
                errorDetails.push(`Alternative node types: ${suggestions.alternativeNodeTypes.join(", ")}`);
              }
              if (suggestions.explanation) {
                errorDetails.push(`Tip: ${suggestions.explanation}`);
              }
              if (errorDetails.length > 0) {
                errorMessage += `

Suggestions:
${errorDetails.map((detail) => `\u2022 ${detail}`).join("\n")}`;
              }
            }
            throw new Error(errorMessage);
          }
          try {
            node.setBoundVariable(property, bindVariable2);
          } catch (error) {
            throw new Error(`Failed to bind variable: ${error.toString()}`);
          }
        }
        return {
          variableId: bindVariable2.id,
          nodeId: node.id,
          property,
          variableType: bindVariable2.resolvedType,
          message: `Successfully bound ${bindVariable2.resolvedType} variable "${bindVariable2.name}" to ${property} of node "${node.name}"`
        };
      } catch (error) {
        throw new Error(`Failed to bind variable to node property ${property}: ${error.toString()}`);
      }
    }
    if (styleId) {
      let style = null;
      try {
        style = await figma.getStyleByIdAsync(styleId);
      } catch (error) {
        const allPaintStyles = figma.getLocalPaintStyles();
        const allTextStyles = figma.getLocalTextStyles();
        const allEffectStyles = figma.getLocalEffectStyles();
        style = [...allPaintStyles, ...allTextStyles, ...allEffectStyles].find((s) => s.id === styleId || s.id.endsWith(styleId) || styleId.endsWith(s.id)) || null;
      }
      if (!style) {
        throw new Error(`Style not found. Searched for ID: ${styleId}`);
      }
      try {
        const validationResult = await bindingValidator.validateBinding(
          "",
          // nodeType not needed for style validation
          property,
          bindVariable2.resolvedType,
          "style",
          style.type
        );
        if (!validationResult.isValid) {
          let errorMessage = validationResult.error || `Cannot bind ${bindVariable2.resolvedType} variable to property "${property}" on ${style.type} style`;
          if (validationResult.suggestions) {
            const suggestions = validationResult.suggestions;
            const errorDetails = [];
            if (suggestions.validVariables && suggestions.validVariables.length > 0) {
              const variableList = suggestions.validVariables.slice(0, 5).map((v) => `"${v.name}" (${v.type}${v.collectionName ? ` from ${v.collectionName}` : ""})`).join(", ");
              errorDetails.push(`Valid variables: ${variableList}${suggestions.validVariables.length > 5 ? "..." : ""}`);
            }
            if (suggestions.validProperties && suggestions.validProperties.length > 0) {
              const propertyList = suggestions.validProperties.slice(0, 8).join(", ");
              errorDetails.push(`Valid properties for ${bindVariable2.resolvedType} on ${style.type} styles: ${propertyList}${suggestions.validProperties.length > 8 ? "..." : ""}`);
            }
            if (suggestions.explanation) {
              errorDetails.push(`Tip: ${suggestions.explanation}`);
            }
            if (errorDetails.length > 0) {
              errorMessage += `

Suggestions:
${errorDetails.map((detail) => `\u2022 ${detail}`).join("\n")}`;
            }
          }
          throw new Error(errorMessage);
        }
        if (style.type === "PAINT") {
          const paintStyle = style;
          if (property === "color" || property === "paints") {
            const paintsCopy = [...paintStyle.paints];
            if (paintsCopy.length === 0) {
              paintsCopy.push({ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } });
            }
            paintsCopy[0] = figma.variables.setBoundVariableForPaint(
              paintsCopy[0],
              "color",
              // property
              bindVariable2
            );
            paintStyle.paints = paintsCopy;
          }
        } else if (style.type === "TEXT") {
          const textStyle = style;
          textStyle.setBoundVariable(property, bindVariable2);
        }
        return {
          variableId: bindVariable2.id,
          styleId: style.id,
          styleType: style.type,
          property,
          variableType: bindVariable2.resolvedType,
          message: `Successfully bound ${bindVariable2.resolvedType} variable "${bindVariable2.name}" to ${property} of ${style.type.toLowerCase()} style "${style.name}"`
        };
      } catch (error) {
        throw new Error(`Failed to bind variable to style property ${property}: ${error.toString()}`);
      }
    }
    throw new Error("No valid binding target found");
  }
  async function unbindVariable(params) {
    BaseOperation.validateParams(params, []);
    const { id, styleId, property, variableId } = params;
    if (!id && !styleId) {
      throw new Error("Either id or styleId is required for unbind operation");
    }
    if (id) {
      const unbindNode = findNodeById(id);
      if (!unbindNode) {
        throw new Error("Node not found");
      }
      try {
        if (!property) {
          const boundVars2 = unbindNode.boundVariables;
          if (!boundVars2 || Object.keys(boundVars2).length === 0) {
            return {
              nodeId: unbindNode.id,
              message: `No variable bindings found on node "${unbindNode.name}" - no unbinding needed`,
              clearedProperties: []
            };
          }
          const clearedProperties = [];
          const failedProperties = [];
          for (const prop of Object.keys(boundVars2)) {
            try {
              if (variableId) {
                const boundVar = boundVars2[prop];
                const boundVarId = boundVar?.id || boundVar;
                if (boundVarId === variableId) {
                  await unbindSingleProperty(unbindNode, prop);
                  clearedProperties.push(prop);
                }
              } else {
                await unbindSingleProperty(unbindNode, prop);
                clearedProperties.push(prop);
              }
            } catch (error) {
              failedProperties.push(`${prop}: ${error.toString()}`);
            }
          }
          const message = clearedProperties.length > 0 ? `Successfully cleared variable bindings from ${clearedProperties.length} properties on node "${unbindNode.name}"` : `No matching variable bindings found on node "${unbindNode.name}"`;
          return {
            nodeId: unbindNode.id,
            message,
            clearedProperties,
            failedProperties: failedProperties.length > 0 ? failedProperties : void 0
          };
        }
        const boundVars = unbindNode.boundVariables;
        if (!boundVars || !boundVars[property]) {
          return {
            nodeId: unbindNode.id,
            property,
            message: `Property ${property} was not bound on node "${unbindNode.name}" - no unbinding needed`
          };
        }
        if (variableId) {
          const boundVar = boundVars[property];
          const boundVarId = boundVar?.id || boundVar;
          if (boundVarId !== variableId) {
            return {
              nodeId: unbindNode.id,
              property,
              message: `Property ${property} is not bound to variable ${variableId} on node "${unbindNode.name}" - no unbinding needed`
            };
          }
        }
        await unbindSingleProperty(unbindNode, property);
        return {
          nodeId: unbindNode.id,
          property,
          message: `Successfully unbound variable from ${property} of node "${unbindNode.name}"`
        };
      } catch (error) {
        throw new Error(`Failed to unbind variable from node: ${error.toString()}`);
      }
    }
    if (styleId) {
      let unbindStyle = null;
      try {
        unbindStyle = await figma.getStyleByIdAsync(styleId);
      } catch (error) {
        const allPaintStyles = figma.getLocalPaintStyles();
        const allTextStyles = figma.getLocalTextStyles();
        const allEffectStyles = figma.getLocalEffectStyles();
        unbindStyle = [...allPaintStyles, ...allTextStyles, ...allEffectStyles].find((s) => s.id === styleId || s.id.endsWith(styleId) || styleId.endsWith(s.id)) || null;
      }
      if (!unbindStyle) {
        throw new Error(`Style not found. Searched for ID: ${styleId}`);
      }
      try {
        if (unbindStyle.type === "PAINT") {
          const paintStyle = unbindStyle;
          if (property === "color" || property === "paints") {
            paintStyle.setBoundVariable("paints", null);
          } else {
            throw new Error(`Property "${property}" is not supported for paint style unbinding. Use "color" or "paints"`);
          }
        } else if (unbindStyle.type === "TEXT") {
          const textStyle = unbindStyle;
          const validTextProperties = ["fontSize", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent"];
          if (validTextProperties.includes(property)) {
            textStyle.setBoundVariable(property, null);
          } else {
            throw new Error(`Property "${property}" is not supported for text style unbinding. Supported: ${validTextProperties.join(", ")}`);
          }
        } else {
          throw new Error(`Style type ${unbindStyle.type} is not supported for variable unbinding`);
        }
        return {
          styleId: unbindStyle.id,
          styleType: unbindStyle.type,
          property,
          message: `Successfully unbound variable from ${property} of ${unbindStyle.type.toLowerCase()} style "${unbindStyle.name}"`
        };
      } catch (error) {
        throw new Error(`Failed to unbind variable from style property ${property}: ${error.toString()}`);
      }
    }
    throw new Error("No valid unbinding target found");
  }
  async function unbindSingleProperty(node, property) {
    try {
      if (property === "fills") {
        const currentFills = node.fills || [];
        const unboundFills = currentFills.map((fill) => {
          if (fill.type === "SOLID") {
            return { type: "SOLID", color: fill.color || { r: 0.5, g: 0.5, b: 0.5 }, opacity: fill.opacity || 1 };
          }
          return fill;
        });
        node.fills = unboundFills.length > 0 ? unboundFills : [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }];
      } else if (property === "strokes") {
        const currentStrokes = node.strokes || [];
        const unboundStrokes = currentStrokes.map((stroke) => {
          if (stroke.type === "SOLID") {
            return { type: "SOLID", color: stroke.color || { r: 0, g: 0, b: 0 }, opacity: stroke.opacity || 1 };
          }
          return stroke;
        });
        node.strokes = unboundStrokes;
      } else if (property === "effects") {
        const currentEffects = node.effects || [];
        const unboundEffects = currentEffects.map((effect) => {
          const staticEffect = { ...effect };
          if (effect.color) {
            staticEffect.color = effect.color;
          }
          return staticEffect;
        });
        node.effects = unboundEffects;
      } else if (property === "layoutGrids") {
        const currentGrids = node.layoutGrids || [];
        const unboundGrids = currentGrids.map((grid) => {
          return { ...grid };
        });
        node.layoutGrids = unboundGrids;
      } else {
        const boundVars = node.boundVariables;
        let isValidProperty = false;
        if (boundVars && boundVars[property]) {
          isValidProperty = true;
        } else {
          const { BINDING_RULES: BINDING_RULES2 } = await Promise.resolve().then(() => (init_variable_binding_validator(), variable_binding_validator_exports));
          const nodeTypeRules = BINDING_RULES2[node.type];
          if (nodeTypeRules) {
            for (const varType of ["FLOAT", "STRING", "COLOR", "BOOLEAN"]) {
              if (nodeTypeRules[varType] && nodeTypeRules[varType].includes(property)) {
                isValidProperty = true;
                break;
              }
            }
          }
        }
        if (!isValidProperty) {
          const validationResult = await bindingValidator.validateBinding(
            node.type,
            property,
            "FLOAT",
            // Use FLOAT as representative type for error suggestions
            "node"
          );
          let errorMessage = `Property "${property}" is not supported for variable unbinding on ${node.type} nodes`;
          if (validationResult.suggestions && validationResult.suggestions.validProperties) {
            const propertyList = validationResult.suggestions.validProperties.slice(0, 8).join(", ");
            errorMessage += `

Valid properties for ${node.type}: ${propertyList}`;
          }
          throw new Error(errorMessage);
        }
        try {
          node.setBoundVariable(property, null);
        } catch (error) {
          throw new Error(`Cannot unbind ${property} from ${node.type} node: ${error.toString()}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to unbind property ${property}: ${error.toString()}`);
    }
  }
  async function createCollection(params) {
    BaseOperation.validateParams(params, ["name"]);
    const { name, modes, description, hiddenFromPublishing } = params;
    const collection = figma.variables.createVariableCollection(name);
    if (description) {
      collection.description = description;
    }
    if (hiddenFromPublishing !== void 0) {
      collection.hiddenFromPublishing = hiddenFromPublishing;
    }
    const normalizedModes = modes ? Array.isArray(modes) ? modes : [modes] : null;
    if (normalizedModes && normalizedModes.length > 1) {
      try {
        for (let i = 1; i < normalizedModes.length; i++) {
          collection.addMode(normalizedModes[i]);
        }
        if (normalizedModes[0] && collection.modes.length > 0) {
          collection.renameMode(collection.modes[0].modeId, normalizedModes[0]);
        }
      } catch (error) {
        if (error.toString().includes("Limited to 1 modes only")) {
          throw new Error("Cannot create collection with multiple modes: Your Figma plan is limited to 1 mode per collection. Upgrade to a paid plan to use multiple modes.");
        }
        throw error;
      }
    } else if (normalizedModes && normalizedModes.length === 1) {
      if (collection.modes.length > 0) {
        collection.renameMode(collection.modes[0].modeId, normalizedModes[0]);
      }
    }
    return {
      collectionId: collection.id,
      name: collection.name,
      description: collection.description,
      modes: collection.modes.map((mode) => ({
        id: mode.modeId,
        name: mode.name
      })),
      defaultModeId: collection.defaultModeId,
      hiddenFromPublishing: collection.hiddenFromPublishing,
      message: `Successfully created variable collection "${collection.name}" with ${collection.modes.length} modes`
    };
  }
  async function updateCollection(params) {
    BaseOperation.validateParams(params, ["collectionId"]);
    const { collectionId, name, description, hiddenFromPublishing } = params;
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error("Variable collection not found");
    }
    if (name) {
      collection.name = name;
    }
    if (description !== void 0) {
      collection.description = description;
    }
    if (hiddenFromPublishing !== void 0) {
      collection.hiddenFromPublishing = hiddenFromPublishing;
    }
    return {
      collectionId: collection.id,
      name: collection.name,
      description: collection.description,
      hiddenFromPublishing: collection.hiddenFromPublishing,
      message: `Successfully updated collection "${collection.name}"`
    };
  }
  async function deleteCollection(params) {
    BaseOperation.validateParams(params, ["collectionId"]);
    const { collectionId } = params;
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error("Variable collection not found");
    }
    const deletedName = collection.name;
    collection.remove();
    return {
      deletedCollectionId: collectionId,
      deletedName,
      message: `Successfully deleted collection "${deletedName}"`
    };
  }
  async function duplicateCollection(params) {
    BaseOperation.validateParams(params, ["collectionId"]);
    const { collectionId, newName } = params;
    const sourceCollection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!sourceCollection) {
      throw new Error("Source collection not found");
    }
    const duplicateName = newName || `${sourceCollection.name} Copy`;
    const newCollection = figma.variables.createVariableCollection(duplicateName);
    if (sourceCollection.description) {
      newCollection.description = sourceCollection.description;
    }
    if (sourceCollection.hiddenFromPublishing !== void 0) {
      newCollection.hiddenFromPublishing = sourceCollection.hiddenFromPublishing;
    }
    const sourceModes = sourceCollection.modes;
    if (sourceModes.length > 1) {
      try {
        for (let i = 1; i < sourceModes.length; i++) {
          newCollection.addMode(sourceModes[i].name);
        }
        if (sourceModes.length > 0) {
          newCollection.renameMode(newCollection.modes[0].modeId, sourceModes[0].name);
        }
      } catch (error) {
        if (error.toString().includes("Limited to 1 modes only")) {
          throw new Error("Cannot duplicate collection with multiple modes: Your Figma plan is limited to 1 mode per collection. Only the first mode will be duplicated.");
        }
        throw error;
      }
    } else if (sourceModes.length === 1) {
      newCollection.renameMode(newCollection.modes[0].modeId, sourceModes[0].name);
    }
    const sourceVariables = await Promise.all(
      sourceCollection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id))
    );
    const copiedVariables = [];
    const failedVariables = [];
    for (const sourceVar of sourceVariables) {
      if (!sourceVar) continue;
      try {
        const newVariable = figma.variables.createVariable(
          sourceVar.name,
          newCollection,
          sourceVar.resolvedType
        );
        if (sourceVar.description) {
          newVariable.description = sourceVar.description;
        }
        if (sourceVar.hiddenFromPublishing !== void 0) {
          newVariable.hiddenFromPublishing = sourceVar.hiddenFromPublishing;
        }
        if (sourceVar.scopes && sourceVar.scopes.length > 0) {
          newVariable.scopes = sourceVar.scopes;
        }
        if (sourceVar.codeSyntax && Object.keys(sourceVar.codeSyntax).length > 0) {
          newVariable.codeSyntax = sourceVar.codeSyntax;
        }
        const modeMapping = {};
        for (let i = 0; i < Math.min(sourceModes.length, newCollection.modes.length); i++) {
          modeMapping[sourceModes[i].modeId] = newCollection.modes[i].modeId;
        }
        for (const [sourceModeId, targetModeId] of Object.entries(modeMapping)) {
          const sourceValue = sourceVar.valuesByMode[sourceModeId];
          if (sourceValue !== void 0) {
            try {
              newVariable.setValueForMode(targetModeId, sourceValue);
            } catch (error) {
              logger.warn(`Failed to copy value for mode ${sourceModeId}:`, error);
            }
          }
        }
        copiedVariables.push({
          originalId: sourceVar.id,
          originalName: sourceVar.name,
          newId: newVariable.id,
          newName: newVariable.name,
          type: newVariable.resolvedType
        });
      } catch (error) {
        failedVariables.push({
          originalId: sourceVar.id,
          originalName: sourceVar.name,
          error: error.toString()
        });
      }
    }
    return {
      sourceCollectionId: collectionId,
      sourceCollectionName: sourceCollection.name,
      newCollectionId: newCollection.id,
      newCollectionName: newCollection.name,
      modesCount: newCollection.modes.length,
      modes: newCollection.modes.map((mode) => ({
        id: mode.modeId,
        name: mode.name
      })),
      variablesCopied: copiedVariables.length,
      variablesFailed: failedVariables.length,
      copiedVariables,
      failedVariables: failedVariables.length > 0 ? failedVariables : void 0,
      message: `Successfully duplicated collection "${sourceCollection.name}" as "${newCollection.name}" with ${copiedVariables.length} variables`
    };
  }
  async function getCollection(params) {
    BaseOperation.validateParams(params, ["collectionId"]);
    const { collectionId } = params;
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error("Variable collection not found");
    }
    const variableIds = collection.variableIds;
    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      modes: collection.modes.map((mode) => ({
        id: mode.modeId,
        name: mode.name
      })),
      defaultModeId: collection.defaultModeId,
      hiddenFromPublishing: collection.hiddenFromPublishing,
      variableIds,
      variableCount: variableIds.length
    };
  }
  async function listCollections(params) {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    return {
      collections: collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        modeCount: collection.modes.length,
        variableCount: collection.variableIds.length,
        hiddenFromPublishing: collection.hiddenFromPublishing
      })),
      totalCount: collections.length
    };
  }
  async function addMode(params) {
    BaseOperation.validateParams(params, ["collectionId", "modeName"]);
    const { collectionId, modeName } = params;
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error("Variable collection not found");
    }
    try {
      const newModeId = collection.addMode(modeName);
      return {
        collectionId: collection.id,
        modeId: newModeId,
        modeName,
        totalModes: collection.modes.length,
        message: `Successfully added mode "${modeName}" to collection "${collection.name}"`
      };
    } catch (error) {
      if (error.toString().includes("Limited to 1 modes only")) {
        throw new Error("Cannot add mode: Your Figma plan is limited to 1 mode per collection. Upgrade to a paid plan to use multiple modes.");
      }
      throw error;
    }
  }
  async function removeMode(params) {
    BaseOperation.validateParams(params, ["collectionId", "modeId"]);
    const { collectionId, modeId } = params;
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error("Variable collection not found");
    }
    const modeToRemove = collection.modes.find((mode) => mode.modeId === modeId);
    const modeName = modeToRemove ? modeToRemove.name : "Unknown";
    collection.removeMode(modeId);
    return {
      collectionId: collection.id,
      removedModeId: modeId,
      removedModeName: modeName,
      remainingModes: collection.modes.length,
      message: `Successfully removed mode "${modeName}" from collection "${collection.name}"`
    };
  }
  async function renameMode(params) {
    BaseOperation.validateParams(params, ["collectionId", "modeId", "newModeName"]);
    const { collectionId, modeId, newModeName } = params;
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error("Variable collection not found");
    }
    const modeToRename = collection.modes.find((mode) => mode.modeId === modeId);
    if (!modeToRename) {
      throw new Error("Mode not found in collection");
    }
    const oldModeName = modeToRename.name;
    collection.renameMode(modeId, newModeName);
    return {
      collectionId: collection.id,
      modeId,
      oldModeName,
      newModeName,
      message: `Successfully renamed mode from "${oldModeName}" to "${newModeName}"`
    };
  }
  var MANAGE_COLLECTIONS = MANAGE_VARIABLES;

  // src/operations/manage-vectors.ts
  var manage_vectors_exports = {};
  __export(manage_vectors_exports, {
    MANAGE_VECTORS: () => MANAGE_VECTORS
  });
  init_color_utils();
  init_logger();
  function addNodeToParent2(node, parentId) {
    if (parentId) {
      const parentNode2 = findNodeById(parentId);
      if (!parentNode2) {
        throw new Error(`Parent node with ID ${parentId} not found`);
      }
      const containerTypes = ["DOCUMENT", "PAGE", "FRAME", "GROUP", "COMPONENT", "COMPONENT_SET", "SLIDE", "SLIDE_ROW", "SECTION", "STICKY", "SHAPE_WITH_TEXT", "TABLE", "CODE_BLOCK"];
      if (!containerTypes.includes(parentNode2.type)) {
        throw new Error(`Parent node type '${parentNode2.type}' cannot contain child nodes. Valid container types: ${containerTypes.join(", ")}`);
      }
      parentNode2.appendChild(node);
      return parentNode2;
    } else {
      figma.currentPage.appendChild(node);
      return figma.currentPage;
    }
  }
  async function MANAGE_VECTORS(params) {
    return BaseOperation.executeOperation("vectorsOperation", params, async () => {
      BaseOperation.validateParams(params, ["operation"]);
      const operation = BaseOperation.validateStringParam(
        params.operation,
        "operation",
        [
          // VectorNetwork Format  
          "create_vector",
          "get_vector",
          "update_vector",
          // Line Format
          "create_line",
          "get_line",
          "update_line",
          // Utility Operations
          "flatten",
          "convert_stroke",
          "convert_shape",
          "convert_text",
          "extract_element"
        ]
      );
      switch (operation) {
        // VectorNetwork Format operations
        case "create_vector":
          return await createVector(params);
        case "get_vector":
          return await getVector(params);
        case "update_vector":
          return await updateVector(params);
        // Line Format operations
        case "create_line":
          return await createLine(params);
        case "get_line":
          return await getLine(params);
        case "update_line":
          return await updateLine(params);
        // Utility operations
        case "flatten":
          return await flattenNodes(params);
        case "convert_stroke":
          return await convertStroke(params);
        case "convert_shape":
          return await convertShape(params);
        case "convert_text":
          return await convertText(params);
        case "extract_element":
          return await extractElement(params);
        default:
          throw new Error(`Unknown vectors operation: ${operation}`);
      }
    });
  }
  async function createVector(params) {
    if (params.vectorNetwork) {
      const sparseData2 = params.vectorNetwork;
      params.vertices = sparseData2.vertices;
      params.paths = sparseData2.paths;
      params.regions = sparseData2.regions;
      params.fills = sparseData2.fills;
      params.handles = sparseData2.handles;
      params.vertexProps = sparseData2.vertexProps;
    }
    BaseOperation.validateParams(params, ["vertices"]);
    const results = [];
    const count = Array.isArray(params.name) ? params.name.length : Array.isArray(params.x) ? params.x.length : Array.isArray(params.y) ? params.y.length : 1;
    for (let i = 0; i < count; i++) {
      try {
        const vectorNode = figma.createVector();
        vectorNode.name = Array.isArray(params.name) ? params.name[i] : params.name || "Vector Network";
        try {
          const sparseData2 = {
            vertices: params.vertices
            // Always string format
          };
          if (params.regions) {
            sparseData2.regions = Array.isArray(params.regions[0]) ? params.regions[i] : params.regions;
          }
          if (params.paths) {
            sparseData2.paths = Array.isArray(params.paths[0]) ? params.paths[i] : params.paths;
          }
          if (params.handles) {
            sparseData2.handles = params.handles;
          }
          if (params.vertexProps) {
            sparseData2.vertexProps = params.vertexProps;
          }
          if (params.fills) {
            sparseData2.fills = params.fills;
          }
          const vectorNetwork = sparseToFigma(sparseData2);
          vectorNode.vectorNetwork = vectorNetwork;
        } catch (error) {
          const errorMsg = error.toString();
          if (errorMsg.includes("JSON.parse") || errorMsg.includes("Unexpected token")) {
            throw new Error(`Invalid sparse format: vertices must be a valid JSON array string like "[0,0,100,0,50,100]", loops must be JSON arrays like "[0,1,2,3]"`);
          } else if (errorMsg.includes("segments") && errorMsg.includes("Expected number")) {
            throw new Error(`Invalid sparse format: region loops contain invalid vertex indices. Ensure all vertex indices in loops are valid numbers referencing the vertices array.`);
          } else if (errorMsg.includes("vectorNetwork")) {
            throw new Error(`Invalid sparse format: ${errorMsg.replace(/vectorNetwork|segments|Expected number, received string/g, "").trim()}`);
          } else {
            throw new Error(`Invalid sparse vector format: Please check that vertices is a JSON array string "[x,y,x,y...]" and region loops are JSON arrays "[0,1,2,3]"`);
          }
        }
        const parentId = Array.isArray(params.parentId) ? params.parentId[i] : params.parentId;
        const parentContainer = addNodeToParent2(vectorNode, parentId);
        const transformMode = Array.isArray(params.transformMode) ? params.transformMode[i] : params.transformMode || "absolute";
        const x = Array.isArray(params.x) ? params.x[i] : params.x;
        const y = Array.isArray(params.y) ? params.y[i] : params.y;
        if (x !== void 0 || y !== void 0) {
          const targetX = x !== void 0 ? x : 0;
          const targetY = y !== void 0 ? y : 0;
          moveNodeToPosition(vectorNode, targetX, targetY);
        } else {
          const position = findSmartPosition({ width: vectorNode.width, height: vectorNode.height }, parentContainer);
          moveNodeToPosition(vectorNode, position.x, position.y);
        }
        const width = Array.isArray(params.width) ? params.width[i] : params.width;
        const height = Array.isArray(params.height) ? params.height[i] : params.height;
        if (width !== void 0 || height !== void 0) {
          const targetWidth = width !== void 0 ? width : vectorNode.width;
          const targetHeight = height !== void 0 ? height : vectorNode.height;
          resizeNode(vectorNode, targetWidth, targetHeight);
        }
        const rotation = Array.isArray(params.rotation) ? params.rotation[i] : params.rotation;
        if (rotation !== void 0) {
          vectorNode.rotation = rotation * Math.PI / 180;
        }
        const fillColor = Array.isArray(params.fillColor) ? params.fillColor[i] : params.fillColor;
        const defaultFill = createDefaultVectorFill(fillColor);
        if (defaultFill.length > 0) {
          vectorNode.fills = defaultFill;
        }
        const strokeColor = Array.isArray(params.strokeColor) ? params.strokeColor[i] : params.strokeColor;
        if (strokeColor) {
          vectorNode.strokes = [{ type: "SOLID", color: hexToRgb(strokeColor) }];
        } else {
          const hasOpenPaths = sparseData.paths && sparseData.paths.length > 0;
          const hasRegions = sparseData.regions && sparseData.regions.length > 0;
          if (hasOpenPaths && !hasRegions) {
            vectorNode.strokes = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
            vectorNode.strokeWeight = 1;
          }
        }
        const strokeWidth = Array.isArray(params.strokeWidth) ? params.strokeWidth[i] : params.strokeWidth;
        if (strokeWidth !== void 0) {
          vectorNode.strokeWeight = strokeWidth;
        }
        const cornerRadius = Array.isArray(params.cornerRadius) ? params.cornerRadius[i] : params.cornerRadius;
        if (cornerRadius !== void 0) {
          vectorNode.cornerRadius = cornerRadius;
        }
        results.push(formatNodeResponse(vectorNode, "Vector network created with transforms applied"));
      } catch (error) {
        handleBulkError(error, `vector_${i}`, results);
      }
    }
    return createBulkSummary(results, count);
  }
  async function getVector(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      try {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (!("vectorNetwork" in node)) {
          throw new Error(`Node ${nodeId} is not a vector node`);
        }
        const vectorNode = node;
        const sparseNetwork = await figmaToSparse(vectorNode.vectorNetwork);
        const response = {
          nodeId: vectorNode.id,
          name: vectorNode.name,
          type: vectorNode.type,
          x: vectorNode.x,
          y: vectorNode.y,
          width: vectorNode.width,
          height: vectorNode.height,
          vectorNetwork: sparseNetwork,
          vertexCount: JSON.parse(sparseNetwork.vertices).length / 2,
          segmentCount: (sparseNetwork.regions?.reduce((sum, r) => sum + r.loops.reduce((loopSum, loop) => loopSum + JSON.parse(loop).length, 0), 0) || 0) + (sparseNetwork.paths?.reduce((sum, path) => sum + JSON.parse(path).length - 1, 0) || 0),
          regionCount: sparseNetwork.regions?.length || 0,
          pathCount: sparseNetwork.paths?.length || 0,
          visible: vectorNode.visible,
          locked: vectorNode.locked,
          opacity: vectorNode.opacity,
          fills: removeSymbols(vectorNode.fills),
          strokes: removeSymbols(vectorNode.strokes),
          strokeWeight: vectorNode.strokeWeight,
          strokeAlign: vectorNode.strokeAlign,
          rotation: vectorNode.rotation,
          message: "Vector network data retrieved in sparse format"
        };
        results.push(removeSymbols(response));
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }
  async function updateVector(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    if (params.vectorNetwork) {
      const sparseData2 = params.vectorNetwork;
      params.vertices = sparseData2.vertices;
      params.paths = sparseData2.paths;
      params.regions = sparseData2.regions;
      params.fills = sparseData2.fills;
      params.handles = sparseData2.handles;
      params.vertexProps = sparseData2.vertexProps;
    }
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      try {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (!("vectorNetwork" in node)) {
          throw new Error(`Node ${nodeId} is not a vector node`);
        }
        const vectorNode = node;
        try {
          if (params.vertices || params.regions || params.paths || params.handles || params.vertexProps) {
            const sparseData2 = {};
            if (params.vertices) {
              sparseData2.vertices = params.vertices;
            }
            if (params.regions) {
              sparseData2.regions = Array.isArray(params.regions[0]) ? params.regions[i] : params.regions;
            }
            if (params.paths) {
              sparseData2.paths = Array.isArray(params.paths[0]) ? params.paths[i] : params.paths;
            }
            if (params.handles) {
              sparseData2.handles = params.handles;
            }
            if (params.vertexProps) {
              sparseData2.vertexProps = params.vertexProps;
            }
            if (params.fills) {
              sparseData2.fills = params.fills;
            }
            if (!params.vertices) {
              const existingSparse = await figmaToSparse(vectorNode.vectorNetwork);
              if (sparseData2.regions && !sparseData2.fills && existingSparse.fills) {
                const mergedData = { ...existingSparse, ...sparseData2 };
                mergedData.fills = existingSparse.fills;
                vectorNode.vectorNetwork = sparseToFigma(mergedData);
              } else {
                Object.assign(existingSparse, sparseData2);
                vectorNode.vectorNetwork = sparseToFigma(existingSparse);
              }
            } else {
              vectorNode.vectorNetwork = sparseToFigma(sparseData2);
            }
          }
        } catch (error) {
          const errorMsg = error.toString();
          if (errorMsg.includes("JSON.parse") || errorMsg.includes("Unexpected token")) {
            throw new Error(`Invalid sparse format: vertices must be a valid JSON array string like "[0,0,100,0,50,100]", loops must be JSON arrays like "[0,1,2,3]"`);
          } else if (errorMsg.includes("segments") && errorMsg.includes("Expected number")) {
            throw new Error(`Invalid sparse format: region loops contain invalid vertex indices. Ensure all vertex indices in loops are valid numbers referencing the vertices array.`);
          } else if (errorMsg.includes("vectorNetwork")) {
            throw new Error(`Invalid sparse format: ${errorMsg.replace(/vectorNetwork|segments|Expected number, received string/g, "").trim()}`);
          } else {
            throw new Error(`Invalid sparse vector format: Please check that vertices is a JSON array string "[x,y,x,y...]" and region loops are JSON arrays "[0,1,2,3]"`);
          }
        }
        const cornerRadius = Array.isArray(params.cornerRadius) ? params.cornerRadius[i] : params.cornerRadius;
        if (cornerRadius !== void 0) {
          vectorNode.cornerRadius = cornerRadius;
        }
        const transformMode = Array.isArray(params.transformMode) ? params.transformMode[i] : params.transformMode || "absolute";
        const x = Array.isArray(params.x) ? params.x[i] : params.x;
        const y = Array.isArray(params.y) ? params.y[i] : params.y;
        if (x !== void 0 || y !== void 0) {
          const newX = transformMode === "relative" ? vectorNode.x + (x || 0) : x !== void 0 ? x : vectorNode.x;
          const newY = transformMode === "relative" ? vectorNode.y + (y || 0) : y !== void 0 ? y : vectorNode.y;
          moveNodeToPosition(vectorNode, newX, newY);
        }
        const width = Array.isArray(params.width) ? params.width[i] : params.width;
        const height = Array.isArray(params.height) ? params.height[i] : params.height;
        if (width !== void 0 || height !== void 0) {
          const newWidth = transformMode === "relative" ? vectorNode.width + (width || 0) : width !== void 0 ? width : vectorNode.width;
          const newHeight = transformMode === "relative" ? vectorNode.height + (height || 0) : height !== void 0 ? height : vectorNode.height;
          resizeNode(vectorNode, newWidth, newHeight);
        }
        const rotation = Array.isArray(params.rotation) ? params.rotation[i] : params.rotation;
        if (rotation !== void 0) {
          const currentRotationDegrees = vectorNode.rotation * 180 / Math.PI;
          const newRotationDegrees = transformMode === "relative" ? currentRotationDegrees + rotation : rotation;
          vectorNode.rotation = newRotationDegrees * Math.PI / 180;
        }
        results.push(formatNodeResponse(vectorNode, "Vector network and transforms updated"));
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }
  async function createLine(params) {
    const results = [];
    const count = Array.isArray(params.name) ? params.name.length : Array.isArray(params.startX) ? params.startX.length : Array.isArray(params.x) ? params.x.length : 1;
    for (let i = 0; i < count; i++) {
      try {
        const line = figma.createLine();
        line.name = Array.isArray(params.name) ? params.name[i] : params.name || "Line";
        let startX, startY, length, rotation;
        const hasStartEnd = params.startX !== void 0 || params.endX !== void 0 || params.startY !== void 0 || params.endY !== void 0;
        if (hasStartEnd) {
          startX = Array.isArray(params.startX) ? params.startX[i] : params.startX ?? (Array.isArray(params.x) ? params.x[i] : params.x || 0);
          startY = Array.isArray(params.startY) ? params.startY[i] : params.startY ?? (Array.isArray(params.y) ? params.y[i] : params.y || 0);
          const endX = Array.isArray(params.endX) ? params.endX[i] : params.endX ?? startX + 100;
          const endY = Array.isArray(params.endY) ? params.endY[i] : params.endY ?? startY;
          const deltaX = endX - startX;
          const deltaY = endY - startY;
          length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          rotation = Math.atan2(deltaY, deltaX);
        } else {
          length = Array.isArray(params.length) ? params.length[i] : params.length || 100;
          rotation = Array.isArray(params.rotation) ? params.rotation[i] * Math.PI / 180 : (params.rotation || 0) * Math.PI / 180;
          startX = Array.isArray(params.x) ? params.x[i] : params.x;
          startY = Array.isArray(params.y) ? params.y[i] : params.y;
        }
        line.resize(length, 0);
        line.rotation = rotation;
        const parentId = Array.isArray(params.parentId) ? params.parentId[i] : params.parentId;
        const parentContainer = addNodeToParent2(line, parentId);
        if (startX !== void 0 || startY !== void 0) {
          line.x = startX || 0;
          line.y = startY || 0;
        } else {
          const position = findSmartPosition({ width: length, height: 1 }, parentContainer);
          line.x = position.x;
          line.y = position.y;
        }
        const strokeColor = Array.isArray(params.strokeColor) ? params.strokeColor[i] : params.strokeColor;
        if (strokeColor) {
          line.strokes = [{ type: "SOLID", color: hexToRgb(strokeColor) }];
        }
        const strokeWidth = Array.isArray(params.strokeWidth) ? params.strokeWidth[i] : params.strokeWidth;
        if (strokeWidth !== void 0) {
          line.strokeWeight = strokeWidth;
        }
        const strokeDashPattern = Array.isArray(params.strokeDashPattern) ? params.strokeDashPattern[i] : params.strokeDashPattern;
        if (strokeDashPattern) {
          line.dashPattern = strokeDashPattern;
        }
        results.push(formatNodeResponse(line, "Line created successfully"));
      } catch (error) {
        handleBulkError(error, `line_${i}`, results);
      }
    }
    return createBulkSummary(results, count);
  }
  async function getLine(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      try {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (node.type !== "LINE") {
          throw new Error(`Node ${nodeId} is not a line node`);
        }
        const line = node;
        const endX = line.x + Math.cos(line.rotation) * line.width;
        const endY = line.y + Math.sin(line.rotation) * line.width;
        results.push({
          nodeId: line.id,
          name: line.name,
          startX: line.x,
          startY: line.y,
          endX,
          endY,
          length: line.width,
          rotation: line.rotation * 180 / Math.PI,
          // Convert to degrees
          strokeWeight: line.strokeWeight,
          strokeColor: line.strokes.length > 0 && line.strokes[0].type === "SOLID" ? rgbToHex(line.strokes[0].color) : null,
          dashPattern: line.dashPattern,
          message: "Line properties retrieved successfully"
        });
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }
  async function updateLine(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      try {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (node.type !== "LINE") {
          throw new Error(`Node ${nodeId} is not a line node`);
        }
        const line = node;
        const hasStartEnd = params.startX !== void 0 || params.endX !== void 0 || params.startY !== void 0 || params.endY !== void 0;
        if (hasStartEnd) {
          const startX = Array.isArray(params.startX) ? params.startX[i] : params.startX ?? line.x;
          const startY = Array.isArray(params.startY) ? params.startY[i] : params.startY ?? line.y;
          const currentEndX = line.x + Math.cos(line.rotation) * line.width;
          const currentEndY = line.y + Math.sin(line.rotation) * line.width;
          const endX = Array.isArray(params.endX) ? params.endX[i] : params.endX ?? currentEndX;
          const endY = Array.isArray(params.endY) ? params.endY[i] : params.endY ?? currentEndY;
          const deltaX = endX - startX;
          const deltaY = endY - startY;
          const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const rotation = Math.atan2(deltaY, deltaX);
          line.resize(length, 0);
          line.rotation = rotation;
          line.x = startX;
          line.y = startY;
        } else if (params.length !== void 0 || params.rotation !== void 0) {
          const length = Array.isArray(params.length) ? params.length[i] : params.length;
          if (length !== void 0) {
            line.resize(length, 0);
          }
          const rotation = Array.isArray(params.rotation) ? params.rotation[i] : params.rotation;
          if (rotation !== void 0) {
            line.rotation = rotation * Math.PI / 180;
          }
        }
        const strokeColor = Array.isArray(params.strokeColor) ? params.strokeColor[i] : params.strokeColor;
        if (strokeColor) {
          line.strokes = [{ type: "SOLID", color: hexToRgb(strokeColor) }];
        }
        const strokeWidth = Array.isArray(params.strokeWidth) ? params.strokeWidth[i] : params.strokeWidth;
        if (strokeWidth !== void 0) {
          line.strokeWeight = strokeWidth;
        }
        const strokeDashPattern = Array.isArray(params.strokeDashPattern) ? params.strokeDashPattern[i] : params.strokeDashPattern;
        if (strokeDashPattern) {
          line.dashPattern = strokeDashPattern;
        }
        results.push(formatNodeResponse(line, "Line updated successfully"));
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }
  async function flattenNodes(params) {
    BaseOperation.validateParams(params, ["nodeIds"]);
    if (!params.nodeIds || !Array.isArray(params.nodeIds)) {
      throw new Error("nodeIds must be an array of node IDs");
    }
    const results = [];
    try {
      const nodes = params.nodeIds.map((id) => {
        const node = findNodeById(id);
        if (!node) {
          throw new Error(`Node with ID ${id} not found`);
        }
        return node;
      });
      const replaceOriginal = params.replaceOriginal ?? true;
      const workingNodes = replaceOriginal ? nodes : nodes.map((n) => n.clone());
      const targetParent = nodes[0].parent;
      const hasMultipleParents = nodes.some((n) => n.parent !== targetParent);
      if (hasMultipleParents) {
        logger2.warn("Flattening nodes with different parents - result will be placed in first node's parent");
      }
      const flattened = figma.flatten(workingNodes, targetParent);
      if (!flattened) {
        throw new Error(`Failed to flatten nodes: ${params.nodeIds.join(", ")}`);
      }
      flattened.name = params.name || "Flattened Vector";
      const message = replaceOriginal ? `Nodes flattened - original nodes ${params.nodeIds.join(", ")} were replaced/consumed` : `Nodes flattened - original nodes ${params.nodeIds.join(", ")} were preserved, new vector created`;
      results.push(await formatNodeResponseAsync(flattened, message));
    } catch (error) {
      handleBulkError(error, "flatten", results);
    }
    return createBulkSummary(results, params.nodeIds.length);
  }
  async function convertStroke(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      try {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (!("strokes" in node) || !node.strokes || node.strokes.length === 0) {
          throw new Error(`Node ${nodeId} has no strokes to convert`);
        }
        const replaceOriginal = Array.isArray(params.replaceOriginal) ? params.replaceOriginal[i] : params.replaceOriginal ?? true;
        const originalName = node.name;
        const originalParent = node.parent;
        const originalX = node.x;
        const originalY = node.y;
        const workingNode = replaceOriginal ? node : node.clone();
        const strokeWidth = Array.isArray(params.strokeWidth) ? params.strokeWidth[i] : params.strokeWidth;
        if (strokeWidth !== void 0) {
          workingNode.strokeWeight = strokeWidth;
        }
        const outlined = figma.flatten([workingNode], originalParent);
        if (!outlined) {
          throw new Error(`Failed to convert stroke to outline for node ${nodeId}`);
        }
        if (!replaceOriginal) {
          outlined.x = originalX;
          outlined.y = originalY;
        }
        const name = Array.isArray(params.name) ? params.name[i] : params.name;
        outlined.name = name || `${originalName} Outlined`;
        const message = replaceOriginal ? `Stroke converted to outline - original node ${nodeId} was replaced/consumed` : `Stroke converted to outline - original node ${nodeId} was preserved, new vector created`;
        results.push(formatNodeResponse(outlined, message));
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }
  async function convertShape(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      try {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (!["RECTANGLE", "ELLIPSE", "POLYGON", "STAR"].includes(node.type)) {
          throw new Error(`Node ${nodeId} is not a convertible shape`);
        }
        const replaceOriginal = Array.isArray(params.replaceOriginal) ? params.replaceOriginal[i] : params.replaceOriginal ?? true;
        const originalName = node.name;
        const originalParent = node.parent;
        const originalX = node.x;
        const originalY = node.y;
        const workingNode = replaceOriginal ? node : node.clone();
        const vector = figma.flatten([workingNode], originalParent);
        if (!vector) {
          throw new Error(`Failed to flatten node ${nodeId} to vector`);
        }
        if (!replaceOriginal) {
          vector.x = originalX;
          vector.y = originalY;
        }
        const name = Array.isArray(params.name) ? params.name[i] : params.name || `${originalName} Vector`;
        vector.name = name;
        const message = replaceOriginal ? `Shape converted to vector - original node ${nodeId} was replaced/consumed` : `Shape converted to vector - original node ${nodeId} was preserved, new vector created`;
        results.push(formatNodeResponse(vector, message));
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }
  async function convertText(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      try {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (node.type !== "TEXT") {
          throw new Error(`Node ${nodeId} is not a text node`);
        }
        const replaceOriginal = Array.isArray(params.replaceOriginal) ? params.replaceOriginal[i] : params.replaceOriginal ?? true;
        const originalName = node.name;
        const originalParent = node.parent;
        const originalX = node.x;
        const originalY = node.y;
        const originalWidth = node.width;
        const originalHeight = node.height;
        const originalRotation = node.rotation;
        let workingNode = replaceOriginal ? node : node.clone();
        const vector = figma.flatten([workingNode], originalParent);
        if (!vector) {
          throw new Error(`Failed to convert text to vector for node ${nodeId}`);
        }
        if (!replaceOriginal) {
        }
        const name = Array.isArray(params.name) ? params.name[i] : params.name;
        vector.name = name || `${originalName} Vector`;
        const message = replaceOriginal ? `Text converted to vector - original node ${nodeId} was replaced/consumed` : `Text converted to vector - original node ${nodeId} was preserved, new vector created`;
        results.push(formatNodeResponse(vector, message));
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }
  async function extractElement(params) {
    BaseOperation.validateParams(params, ["nodeId"]);
    const nodeIds = normalizeToArray(params.nodeId);
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      try {
        const sourceNode = findNodeById(nodeId);
        if (!sourceNode) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        if (!("vectorNetwork" in sourceNode)) {
          throw new Error(`Node ${nodeId} is not a vector node`);
        }
        const sourceVector = sourceNode;
        const removeFromSource = Array.isArray(params.removeFromSource) ? params.removeFromSource[i] : params.removeFromSource ?? true;
        const pathIndex = Array.isArray(params.pathIndex) ? params.pathIndex[i] : params.pathIndex;
        const regionIndex = Array.isArray(params.regionIndex) ? params.regionIndex[i] : params.regionIndex;
        const sourceSparse = await figmaToSparse(sourceVector.vectorNetwork);
        if (pathIndex !== void 0 && regionIndex !== void 0) {
          throw new Error("Cannot specify both pathIndex and regionIndex. Choose one or neither (to extract all).");
        }
        if (pathIndex === void 0 && regionIndex === void 0) {
          const allResults = [];
          let extractedCount = 0;
          if (sourceSparse.regions && sourceSparse.regions.length > 0) {
            for (let ri = 0; ri < sourceSparse.regions.length; ri++) {
              const result = extractRegionFromSparse(sourceSparse, ri, false);
              const extractedVector2 = figma.createVector();
              const extractedName2 = Array.isArray(params.name) ? params.name[i] || `Region ${ri}` : params.name ? `${params.name} Region ${ri}` : `Region ${ri}`;
              extractedVector2.name = extractedName2;
              extractedVector2.x = sourceVector.x + result.positionOffset.x;
              extractedVector2.y = sourceVector.y + result.positionOffset.y;
              extractedVector2.vectorNetwork = sparseToFigma(result.extracted);
              if (sourceVector.parent) {
                sourceVector.parent.appendChild(extractedVector2);
              }
              allResults.push({
                extractedVector: formatNodeResponse(extractedVector2, `Region ${ri} extracted`),
                elementType: "region",
                elementIndex: ri
              });
              extractedCount++;
            }
          }
          if (sourceSparse.paths && sourceSparse.paths.length > 0) {
            for (let pi = 0; pi < sourceSparse.paths.length; pi++) {
              const result = extractPathFromSparse(sourceSparse, pi, false);
              const extractedVector2 = figma.createVector();
              const extractedName2 = Array.isArray(params.name) ? params.name[i] || `Path ${pi}` : params.name ? `${params.name} Path ${pi}` : `Path ${pi}`;
              extractedVector2.name = extractedName2;
              extractedVector2.x = sourceVector.x + result.positionOffset.x;
              extractedVector2.y = sourceVector.y + result.positionOffset.y;
              extractedVector2.vectorNetwork = sparseToFigma(result.extracted);
              if (sourceVector.parent) {
                sourceVector.parent.appendChild(extractedVector2);
              }
              allResults.push({
                extractedVector: formatNodeResponse(extractedVector2, `Path ${pi} extracted`),
                elementType: "path",
                elementIndex: pi
              });
              extractedCount++;
            }
          }
          if (extractedCount === 0) {
            throw new Error("No regions or paths found to extract");
          }
          if (removeFromSource) {
            sourceVector.remove();
          }
          results.push({
            extractedVectors: allResults,
            sourceVector: removeFromSource ? { id: nodeId, message: `Source vector deleted after extracting all ${extractedCount} elements (exploded)` } : formatNodeResponse(sourceVector, `All ${extractedCount} elements extracted (exploded)`),
            extractedCount,
            removedFromSource: removeFromSource
          });
          continue;
        }
        let extractedData;
        let remainingData = null;
        let positionOffset = null;
        let elementType;
        if (regionIndex !== void 0) {
          if (!sourceSparse.regions || regionIndex >= sourceSparse.regions.length || regionIndex < 0) {
            throw new Error(`Invalid regionIndex ${regionIndex}. Source has ${sourceSparse.regions?.length || 0} regions`);
          }
          const result = extractRegionFromSparse(sourceSparse, regionIndex, removeFromSource);
          extractedData = result.extracted;
          remainingData = result.remaining;
          positionOffset = result.positionOffset;
          elementType = "region";
        } else {
          if (!sourceSparse.paths || pathIndex >= sourceSparse.paths.length || pathIndex < 0) {
            throw new Error(`Invalid pathIndex ${pathIndex}. Source has ${sourceSparse.paths?.length || 0} paths`);
          }
          const result = extractPathFromSparse(sourceSparse, pathIndex, removeFromSource);
          extractedData = result.extracted;
          remainingData = result.remaining;
          positionOffset = result.positionOffset;
          elementType = "path";
        }
        const extractedVector = figma.createVector();
        const extractedName = Array.isArray(params.name) ? params.name[i] : params.name || `Extracted ${elementType}`;
        extractedVector.name = extractedName;
        extractedVector.x = sourceVector.x + positionOffset.x;
        extractedVector.y = sourceVector.y + positionOffset.y;
        extractedVector.vectorNetwork = sparseToFigma(extractedData);
        if (sourceVector.parent) {
          sourceVector.parent.appendChild(extractedVector);
        }
        const message = removeFromSource ? `${elementType} extracted and removed from source vector` : `${elementType} extracted while preserving source vector`;
        if (removeFromSource && remainingData) {
          sourceVector.vectorNetwork = sparseToFigma(remainingData);
        }
        results.push({
          extractedVector: formatNodeResponse(extractedVector, message),
          sourceVector: formatNodeResponse(sourceVector, `Source vector ${removeFromSource ? "modified" : "unchanged"}`),
          elementType,
          elementIndex: elementType === "region" ? params.regionIndex : params.pathIndex,
          removedFromSource: removeFromSource
        });
      } catch (error) {
        handleBulkError(error, nodeId, results);
      }
    }
    return createBulkSummary(results, nodeIds.length);
  }

  // src/operations/ping-test.ts
  var ping_test_exports = {};
  __export(ping_test_exports, {
    PING_TEST: () => PING_TEST
  });
  async function PING_TEST(params) {
    return BaseOperation.executeOperation("pingTest", params, async () => {
      const startTime = params.timestamp || Date.now();
      const responseTime = Date.now() - startTime;
      return {
        pong: true,
        roundTripTime: responseTime,
        pluginVersion: PLUGIN_VERSION,
        timestamp: Date.now()
      };
    });
  }

  // src/operations/plugin-status-operation.ts
  var plugin_status_operation_exports = {};
  __export(plugin_status_operation_exports, {
    PLUGIN_STATUS: () => PLUGIN_STATUS
  });
  async function PLUGIN_STATUS(params) {
    return BaseOperation.executeOperation("pluginStatus", params, async () => {
      const { operation } = params;
      switch (operation) {
        case "figma_info":
          const result = {
            pluginId: figma.pluginId,
            apiVersion: figma.apiVersion,
            editorType: figma.editorType,
            mode: figma.mode,
            pluginVersion: PLUGIN_VERSION
          };
          try {
            const fileKey = figma.fileKey;
            if (fileKey !== void 0 && fileKey !== null) {
              result.fileKey = fileKey;
            }
          } catch (error) {
          }
          try {
            if (figma.root && figma.root.name) {
              result.fileName = figma.root.name;
            }
          } catch (error) {
          }
          try {
            const currentPage = figma.currentPage;
            if (currentPage) {
              result.currentPage = {
                name: currentPage.name,
                id: currentPage.id
              };
            }
          } catch (error) {
          }
          try {
            const currentUser = figma.currentUser;
            if (currentUser !== void 0 && currentUser !== null) {
              result.currentUser = currentUser;
            }
          } catch (error) {
          }
          try {
            const paymentStatus = figma.payments.status;
            if (paymentStatus) {
              result.paymentStatus = {
                type: paymentStatus.type,
                isPaid: paymentStatus.type === "PAID",
                note: paymentStatus.type === "NOT_SUPPORTED" ? "Payment status could not be determined" : void 0
              };
            }
          } catch (error) {
          }
          try {
            const firstRunSecondsAgo = figma.payments.getUserFirstRanSecondsAgo();
            if (firstRunSecondsAgo !== void 0) {
              result.userUsage = {
                firstRunSecondsAgo,
                isFirstRun: firstRunSecondsAgo === 0,
                firstRunDate: firstRunSecondsAgo > 0 ? new Date(Date.now() - firstRunSecondsAgo * 1e3).toISOString() : null
              };
            }
          } catch (error) {
          }
          try {
            if (figma.editorType === "figjam" && figma.activeUsers) {
              result.activeUsers = figma.activeUsers;
            }
          } catch (error) {
          }
          return result;
        default:
          return {
            pluginId: figma.pluginId,
            apiVersion: figma.apiVersion,
            editorType: figma.editorType,
            mode: figma.mode,
            pluginVersion: PLUGIN_VERSION
          };
      }
    });
  }

  // src/operations/sync-fonts.ts
  var sync_fonts_exports = {};
  __export(sync_fonts_exports, {
    SYNC_FONTS: () => SYNC_FONTS
  });
  async function SYNC_FONTS(params) {
    return BaseOperation.executeOperation("syncFonts", params, async () => {
      const availableFonts = await figma.listAvailableFontsAsync();
      return {
        count: availableFonts.length,
        fonts: availableFonts,
        timestamp: Date.now(),
        message: `Retrieved ${availableFonts.length} available fonts`
      };
    });
  }

  // src/generated-operations.ts
  var OPERATION_FILES = [
    "_operation-template",
    "base-operation",
    "export-settings-operations",
    "extract-element-helpers",
    "manage-alignment",
    "manage-annotations",
    "manage-auto-layout",
    "manage-boolean",
    "manage-components",
    "manage-constraints",
    "manage-dev-resources",
    "manage-effects",
    "manage-exports",
    "manage-fills",
    "manage-fonts",
    "manage-hierarchy",
    "manage-images",
    "manage-instances",
    "manage-measurements",
    "manage-nodes",
    "manage-pages",
    "manage-selection",
    "manage-strokes",
    "manage-styles",
    "manage-text",
    "manage-variables",
    "manage-vectors",
    "ping-test",
    "plugin-status-operation",
    "sync-fonts"
  ];
  var OPERATION_MODULES = {
    "export-settings-operations": export_settings_operations_exports,
    "extract-element-helpers": extract_element_helpers_exports,
    "manage-alignment": manage_alignment_exports,
    "manage-annotations": manage_annotations_exports,
    "manage-auto-layout": manage_auto_layout_exports,
    "manage-boolean": manage_boolean_exports,
    "manage-components": manage_components_exports,
    "manage-constraints": manage_constraints_exports,
    "manage-dev-resources": manage_dev_resources_exports,
    "manage-effects": manage_effects_exports,
    "manage-exports": manage_exports_exports,
    "manage-fills": manage_fills_exports,
    "manage-fonts": manage_fonts_exports,
    "manage-hierarchy": manage_hierarchy_exports,
    "manage-images": manage_images_exports,
    "manage-instances": manage_instances_exports,
    "manage-measurements": manage_measurements_exports,
    "manage-nodes": manage_nodes_exports,
    "manage-pages": manage_pages_exports,
    "manage-selection": manage_selection_exports,
    "manage-strokes": manage_strokes_exports,
    "manage-styles": manage_styles_exports,
    "manage-text": manage_text_exports,
    "manage-variables": manage_variables_exports,
    "manage-vectors": manage_vectors_exports,
    "ping-test": ping_test_exports,
    "plugin-status-operation": plugin_status_operation_exports,
    "sync-fonts": sync_fonts_exports
  };
  function importOperation(fileName) {
    const module = OPERATION_MODULES[fileName];
    if (!module) {
      throw new Error(`Module not found: ${fileName}`);
    }
    return module;
  }

  // src/operation-router.ts
  var OperationRouter = class {
    constructor() {
      this.operations = {};
    }
    /**
     * Initialize the router by discovering all operations
     */
    initialize() {
      try {
        this.operations = this.importOperations();
        const operationCount = Object.keys(this.operations).length;
      } catch (error) {
        logger2.error("\u274C Failed to initialize operation router:", error);
        throw error;
      }
    }
    /**
     * Import all operations using convention-based discovery with build-time automation
     */
    importOperations() {
      const operations = {};
      const operationFiles = OPERATION_FILES.filter(
        (fileName) => !fileName.startsWith("_") && !fileName.includes("template") && fileName !== "base-operation"
      );
      for (const fileName of operationFiles) {
        try {
          const module = importOperation(fileName);
          for (const [exportName, exportValue] of Object.entries(module)) {
            if (typeof exportValue === "function" && this.isValidOperationName(exportName)) {
              operations[exportName] = exportValue;
            }
          }
        } catch (error) {
          logger2.warn(`\u26A0\uFE0F Failed to import operation module: ${fileName}`, error);
        }
      }
      return operations;
    }
    /**
     * Check if an export name is a valid operation name
     * Operations should be UPPER_CASE constants
     */
    isValidOperationName(name) {
      if (["default", "metadata", "BaseOperation"].includes(name)) {
        return false;
      }
      return /^[A-Z][A-Z0-9_]*$/.test(name);
    }
    /**
     * Get all discovered operations
     */
    getOperations() {
      return { ...this.operations };
    }
    /**
     * Get a specific operation handler
     */
    getOperation(operationType) {
      return this.operations[operationType];
    }
    /**
     * Check if an operation exists
     */
    hasOperation(operationType) {
      return operationType in this.operations;
    }
    /**
     * Get operation statistics
     */
    getStats() {
      return {
        totalOperations: Object.keys(this.operations).length,
        operationFiles: OPERATION_FILES.length
      };
    }
  };
  var operationRouter = new OperationRouter();

  // src/main.ts
  init_logger();

  // src/ui-message-bridge.ts
  var UIMessageBridge = class {
    constructor() {
      this.connected = false;
    }
    isConnected() {
      return this.connected;
    }
    async send(message) {
      return new Promise((resolve, reject) => {
        if (!this.connected) {
          reject(new Error("UI not connected"));
          return;
        }
        try {
          figma.ui.postMessage(message);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }
    setConnected(connected) {
      this.connected = connected;
    }
  };

  // src/utils/payload-utils.ts
  function sanitizePayload(obj) {
    if (obj === null || obj === void 0) {
      return void 0;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => sanitizePayload(item));
    }
    if (typeof obj === "object") {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value === null) {
          continue;
        }
        sanitized[key] = sanitizePayload(value);
      }
      return sanitized;
    }
    return obj;
  }

  // src/main.ts
  var uiMessageBridge = new UIMessageBridge();
  var FigmaPlugin = class {
    constructor() {
      this.handlers = {};
      logger2.initialize(uiMessageBridge);
      logger2.debug("Figma MCP Write Plugin starting...");
      this.initializePlugin();
      this.setupUIMessageHandler();
    }
    initializePlugin() {
      try {
        operationRouter.initialize();
        this.handlers = operationRouter.getOperations();
        logger2.debug(`Plugin initialized with ${Object.keys(this.handlers).length} operations`);
      } catch (error) {
        logger2.error("Failed to initialize plugin:", error);
        throw error;
      }
    }
    setupUIMessageHandler() {
      figma.ui.onmessage = async (msg) => {
        if (msg.type === "CLOSE") {
          logger2.log("\u{1F44B} Closing plugin");
          figma.closePlugin();
          return;
        }
        if (msg.type === "CONNECTION_STATUS") {
          uiMessageBridge.setConnected(msg.connected);
          if (msg.connected) {
            logger2.onConnectionRestored();
          }
          return;
        }
        const message = msg.pluginMessage || msg;
        if (message.type === "CONVERT_BASE64_TO_UINT8ARRAY_RESPONSE") {
          return;
        }
        if (message.type && message.id && this.handlers[message.type]) {
          await this.handlePluginOperation(message.type, message.payload, message.id);
        } else {
          logger2.error("Unknown message or missing handler:", message.type);
          figma.ui.postMessage(createUnknownOperationMessage(message.id, message.type));
        }
      };
    }
    // Handle operations from MCP server via UI thread
    async handlePluginOperation(operation, payload, id) {
      try {
        const handler = this.handlers[operation];
        const safePayload = !payload || typeof payload !== "object" ? {} : sanitizePayload(payload);
        const result = await handler(safePayload);
        figma.ui.postMessage(createOperationSuccessMessage(id, operation, result));
      } catch (error) {
        logger2.error(`${operation} failed:`, error.toString());
        figma.ui.postMessage(createOperationErrorMessage(id, operation, error));
      }
    }
    async start() {
      try {
        figma.showUI(__html__, { width: 320, height: 300 });
        this.setupLifecycleHandlers();
      } catch (error) {
        logger2.error("Plugin initialization failed:", error);
        figma.notify("Plugin initialization failed", { error: true });
      }
    }
    setupLifecycleHandlers() {
      figma.on("close", () => {
        logger2.log("\u{1F44B} Plugin closing...");
      });
    }
  };
  var plugin = new FigmaPlugin();
  plugin.start().catch((error) => {
    logger2.error("Fatal error starting plugin:", error);
    figma.notify("Failed to start plugin", { error: true });
  });
})();

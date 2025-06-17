# Export Workflows Guide

> **Use Cases**: Export designs for production, development handoff, marketing materials, and cross-platform applications. Generate files or return data programmatically with flexible format and quality options.

## Quick Examples

![Export Operations](images/export-workflows.png)

- "Export this component as PNG" → High-quality PNG file saved to exports folder
- "Export icons for iOS app" → Complete icon set with all required sizes
- "Get base64 data for this image" → Encoded image data for direct use
- "Export design system for developers" → Organized asset library

## Core Operations

### Basic Export Operations

#### Single Component Export
**When to use**: Individual components, specific designs, testing exports

**User instruction**: "Export this button component as a PNG file"

**What happens**:
1. AI uses `manage_exports` tool with `export_single` operation
2. Captures specified component with PNG format
3. Saves to default export directory (`~/Downloads/Figma Exports`)
4. Maintains original quality and dimensions

```yaml
# Example response
operation: manage_exports
result:
  exported: 1
  format: "PNG"
  outputDirectory: "~/Downloads/Figma Exports"
  files:
    - filename: "Button Component.png"
      path: "~/Downloads/Figma Exports/Button Component.png"
      size: "24.5KB"
      dimensions: { width: 200, height: 48 }
```

#### Bulk Export Operations
**When to use**: Multiple components, icon sets, comprehensive asset generation

**User instruction**: "Export all selected icons as SVG files"

**What happens**:
1. AI uses `export_bulk` operation with SVG format
2. Processes all selected components in batch
3. Maintains vector format for scalability
4. Organizes files with consistent naming

#### Data Export (No Files)
**When to use**: Programmatic use, API integration, direct embedding in applications

**User instruction**: "Get the base64 data for this logo instead of saving a file"

**What happens**:
1. AI uses `output: 'data'` parameter to return encoded data
2. Generates base64 string for direct use
3. Includes metadata (dimensions, format) with data
4. Returns structured data object instead of file

### Export Format Options

#### PNG Export
**When to use**: High-quality raster graphics, transparency support, web use

**User instruction**: "Export this interface design as PNG with transparency"

**What happens**:
1. AI sets format to PNG for lossless quality
2. Preserves transparency and alpha channels
3. Maintains exact pixel representation
4. Optimizes for web and print use

#### SVG Export
**When to use**: Vector graphics, scalable designs, icon systems

**User instruction**: "Export these icons as SVG to preserve vector graphics"

**What happens**:
1. AI uses SVG format for infinite scalability
2. Maintains vector paths and properties
3. Creates small file sizes for web use
4. Preserves editability in vector programs

#### JPG Export
**When to use**: Photography, reduced file sizes, non-transparent images

**User instruction**: "Export this hero image as high-quality JPG for web"

**What happens**:
1. AI applies JPG format with quality optimization
2. Reduces file size while maintaining visual quality
3. Optimizes for web loading performance
4. Removes transparency channel

#### PDF Export
**When to use**: Print materials, professional documentation, vector preservation

**User instruction**: "Export this marketing material as PDF for print"

**What happens**:
1. AI uses PDF format for print-ready output
2. Maintains vector graphics and typography
3. Preserves exact layout and spacing
4. Creates professional print files

### Advanced Export Settings

#### Scale Factor Control
**When to use**: High-density displays, responsive assets, multiple device support

**User instruction**: "Export this icon at 2x scale for retina displays"

**What happens**:
1. AI applies 2x scale factor to export dimensions
2. Doubles resolution while maintaining visual quality
3. Creates high-DPI assets for modern displays
4. Maintains vector quality at larger sizes

#### Custom Output Directories
**When to use**: Project organization, automated workflows, specific file structure

**User instruction**: "Export these components to my project assets folder"

**What happens**:
1. AI uses custom outputDirectory parameter
2. Creates organized folder structure as needed
3. Saves files to specified location
4. Maintains file naming and organization

#### Quality and Compression Settings
**When to use**: File size optimization, specific quality requirements

**User instruction**: "Export this image with medium compression for web use"

**What happens**:
1. AI applies appropriate quality settings for format
2. Balances file size with visual quality
3. Optimizes for intended use case (web, print, mobile)
4. Provides compression feedback in results

### Export Presets

#### iOS App Icon Preset
**When to use**: iOS app development, App Store submission

**User instruction**: "Export this logo for iOS app store submission"

**What happens**:
1. AI uses `ios_app_icon` preset automatically
2. Generates all required icon sizes (20px to 1024px)
3. Creates proper file organization by size
4. Ensures App Store compliance

#### Android Asset Preset
**When to use**: Android app development, multiple density support

**User instruction**: "Export these UI icons for Android app development"

**What happens**:
1. AI applies `android_assets` preset configuration
2. Creates density variants (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
3. Organizes by density folders
4. Maintains consistent visual appearance across densities

#### Web Assets Preset
**When to use**: Responsive web design, multiple device support

**User instruction**: "Export components for responsive web design"

**What happens**:
1. AI uses `web_assets` preset with multiple scales
2. Generates 1x, 2x, 3x variants for responsive design
3. Creates both PNG and SVG versions when appropriate
4. Optimizes for web performance

#### Marketing Assets Preset
**When to use**: Social media, advertising, promotional materials

**User instruction**: "Export this campaign design for social media marketing"

**What happens**:
1. AI applies `marketing_assets` preset with high quality
2. Creates optimized versions for different platforms
3. Maintains brand quality and visual impact
4. Provides various format options

#### Print-Ready Preset
**When to use**: Professional printing, high-resolution output

**User instruction**: "Export this brochure design for professional printing"

**What happens**:
1. AI uses `print_ready` preset with 300 DPI
2. Generates high-resolution PDF and PNG formats
3. Maintains print quality and color accuracy
4. Ensures professional print standards

## Advanced Workflows

### Complete App Icon Generation
**User instruction**: "Generate a complete icon set for both iOS and Android from this logo"

**What the AI does**:
1. **iOS Generation**: Uses `ios_app_icon` preset for App Store requirements
2. **Android Generation**: Applies `android_assets` preset for all densities
3. **Organization**: Creates platform-specific folder structure
4. **Quality Control**: Ensures consistent appearance across all sizes
5. **Documentation**: Provides implementation guide for developers
6. **Testing Assets**: Includes preview versions for design review

![App Icon Generation](images/app-icon-generation.png)

### Design System Asset Library
**User instruction**: "Export our complete design system for developer handoff with proper organization"

**What the AI does**:
1. **Component Export**: Uses `export_library` to gather all components
2. **Style Assets**: Exports color palettes and typography examples
3. **Icon Library**: Creates complete icon set with multiple formats
4. **Format Optimization**: Chooses optimal formats for each asset type
5. **Organization Strategy**: Uses `by_component` organization for logical structure
6. **Developer Resources**: Includes sizing guides and usage documentation

### Marketing Campaign Assets
**User instruction**: "Create all marketing assets for this campaign across social platforms and print"

**What the AI does**:
1. **Social Media Variants**: Exports optimized versions for each platform
2. **Print Materials**: Creates high-resolution assets for physical materials
3. **Web Assets**: Generates responsive versions for website use
4. **Brand Consistency**: Applies consistent quality and treatment
5. **Format Selection**: Chooses appropriate formats for each use case
6. **Asset Organization**: Creates campaign-specific folder structure

### Development Handoff Package
**User instruction**: "Prepare a complete handoff package for our development team"

**What the AI does**:
1. **Component Assets**: Exports all UI components in multiple formats
2. **Icon Systems**: Creates complete icon library with SVG and PNG versions
3. **Style Guides**: Exports visual style references and specifications
4. **Implementation Assets**: Provides code-ready assets with proper naming
5. **Documentation**: Includes asset usage guidelines and specifications
6. **Quality Assurance**: Ensures consistent quality across all assets

![Development Handoff](images/development-handoff.png)

## Organization Strategies

### File Organization Options
- **Flat Structure**: All files in single directory for simple projects
- **By Type**: Organize into folders by file type (PNG, SVG, etc.)
- **By Component**: Group related assets together by component
- **By Size**: Organize icon sets by dimensions
- **By Density**: Android-style density folder organization

### Naming Conventions
- **Descriptive Names**: Use clear, descriptive filenames
- **Consistent Patterns**: Apply naming patterns across all assets
- **Developer-Friendly**: Use names that work well in code
- **Version Control**: Include version information when needed

### Quality Standards
- **Resolution Guidelines**: Set appropriate resolution for use case
- **Format Selection**: Choose optimal format for each asset type
- **Compression Balance**: Balance file size with visual quality
- **Consistency Checks**: Ensure consistent treatment across assets

## Tips & Best Practices

### Export Planning
- **Use Case Analysis**: Choose formats based on intended use
- **Quality Requirements**: Set appropriate quality levels for context
- **File Size Consideration**: Balance quality with performance needs
- **Platform Requirements**: Follow platform-specific guidelines

### Batch Operations
- **Consistent Settings**: Apply same settings to related assets
- **Organization Strategy**: Plan folder structure before exporting
- **Naming Patterns**: Use consistent naming across batches
- **Quality Control**: Review batch results for consistency

### Data vs File Export
- **Programmatic Use**: Use data export for API integration
- **File Management**: Use file export for manual workflows
- **Performance**: Consider data size for programmatic use
- **Caching Strategy**: Plan for data caching and storage

### Format Selection Guide
- **PNG**: High quality, transparency, web/print
- **SVG**: Vector graphics, scalability, small file size
- **JPG**: Photography, smaller files, no transparency
- **PDF**: Print materials, vector preservation, professional output

## Troubleshooting

### Export Failures
**Problem**: "Exports aren't generating files"
**Solutions**:
- Check output directory permissions and accessibility
- Verify node IDs are valid and nodes exist
- Ensure file format is supported for selected content
- Check available disk space for export files

**Problem**: "Export quality is poor"
**Solutions**:
- Increase scale factor for higher resolution
- Choose lossless format (PNG) for quality-critical exports
- Adjust quality settings for JPG exports
- Verify source design quality before export

### Organization Issues
**Problem**: "Exported files aren't organized as expected"
**Solutions**:
- Review organization strategy setting (flat, by_type, by_component)
- Check file naming patterns and conventions
- Verify folder structure creation permissions
- Test with smaller batch to isolate organization issues

**Problem**: "File names aren't suitable for development use"
**Solutions**:
- Use includeId setting for unique identification
- Apply consistent naming patterns
- Remove special characters that cause issues in code
- Use developer-friendly naming conventions

### Performance Issues
**Problem**: "Large exports are taking too long"
**Solutions**:
- Break large batches into smaller groups
- Reduce scale factors where appropriate
- Choose more efficient formats (SVG vs PNG for vectors)
- Export during off-peak times for large batches

**Problem**: "Data exports are too large for programmatic use"
**Solutions**:
- Use maxDataSize parameter to limit data size
- Choose appropriate scale factors for data use
- Consider file export instead of data for large assets
- Implement progressive loading for large data sets

## Next Steps

- **[Getting Started ←](getting-started.md)**: Review basics for simple exports
- **[Design System ←](design-system.md)**: Export design system components
- **[Advanced Operations ←](advanced-operations.md)**: Export complex boolean and vector designs

---

**Remember**: Good export workflows are planned from the beginning. Consider your final use case when designing components and organizing your exports.
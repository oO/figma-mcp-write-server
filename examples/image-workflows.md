# Image Workflows Guide

> **Use Cases**: Load, manipulate, and transform images in your designs. Apply filters, smart cropping, and image replacement while maintaining design integrity and responsive behavior.

## Quick Examples

![Image Operations](images/image-workflows.png)

- "Load hero image from URL" → Image loaded and applied to design element
- "Make this image brighter and more saturated" → Color filters applied
- "Replace product photo with smart cropping" → Intelligent image replacement
- "Copy image from header to footer" → Image cloned between elements

## Core Operations

### Image Loading & Creation

#### Loading from URLs
**When to use**: Web images, stock photos, external assets that need to be brought into designs

**User instruction**: "Load this hero image from URL and create a rectangle for it"

**What happens**:
1. AI uses `manage_images` tool with `create_from_url` operation
2. Downloads image from specified URL
3. Creates new rectangle node with image applied as fill
4. Automatically sizes container to image dimensions

```yaml
# Example response
operation: manage_images
result:
  nodeId: "123:456"
  nodeName: "Hero Image"
  imageHash: "abc123hash"
  imageDimensions: { width: 1200, height: 800 }
  scaleMode: "FILL"
  appliedAt: "2024-06-16T12:00:00.000Z"
```

#### Loading from Base64 Data
**When to use**: Generated images, encoded data, or when working with image data directly

**User instruction**: "Apply this base64 image data to the selected rectangle"

**What happens**:
1. AI uses `create_from_bytes` operation with provided base64 data
2. Decodes image data and creates Figma image asset
3. Applies image to specified node as fill
4. Maintains original image quality and dimensions

#### Applying to Existing Nodes
**When to use**: Updating existing design elements, replacing placeholder images

**User instruction**: "Apply this product image to the existing card component"

**What happens**:
1. AI uses `apply_to_node` operation with target node ID
2. Loads image and applies as fill to specified element
3. Maintains existing node dimensions and properties
4. Updates fill while preserving other styling

### Image Filtering & Enhancement

#### Color Adjustments
**When to use**: Matching brand colors, improving image quality, creating mood and atmosphere

**User instruction**: "Make this hero image brighter and more saturated for better contrast"

**What happens**:
1. AI uses `update_filters` operation with exposure and saturation values
2. Applies positive exposure (+0.3) for brightness
3. Increases saturation (+0.4) for color vibrancy
4. Maintains image quality while enhancing visual impact

#### Temperature and Tint Adjustments
**When to use**: Color correction, brand matching, creating consistent visual tone

**User instruction**: "Warm up this photo and adjust the tint to match our brand colors"

**What happens**:
1. AI applies temperature filter (+0.2) for warmer tones
2. Adjusts tint as needed for brand alignment
3. Fine-tunes highlights and shadows for balance
4. Creates cohesive color palette with brand

#### Professional Photo Editing
**When to use**: Portrait editing, product photography, professional image enhancement

**User instruction**: "Edit this portrait - brighten shadows, reduce highlights, add contrast"

**What happens**:
1. AI applies shadows filter (+0.3) to brighten dark areas
2. Reduces highlights (-0.2) to recover detail
3. Increases contrast (+0.2) for visual punch
4. Balances exposure for professional look

### Smart Image Replacement

#### Preserve Container Strategy
**When to use**: Maintaining existing layout, keeping container dimensions fixed

**User instruction**: "Replace this banner image but keep the container size exactly the same"

**What happens**:
1. AI uses `smart_replace` with `preserve_container` fit strategy
2. Loads new image and fits within existing dimensions
3. Crops or scales image to fill container completely
4. Maintains layout integrity and spacing

#### Preserve Aspect Strategy
**When to use**: Maintaining image proportions, avoiding distortion

**User instruction**: "Update product photo but don't distort the aspect ratio"

**What happens**:
1. AI uses `preserve_aspect` fit strategy
2. Calculates optimal container size for new image
3. Resizes container to accommodate image proportions
4. Updates layout to maintain visual balance

#### Smart Crop Strategy
**When to use**: Focusing on important image content, intelligent cropping

**User instruction**: "Replace hero image and crop to focus on the center subject"

**What happens**:
1. AI uses `smart_crop` strategy with center alignment
2. Analyzes image content for optimal cropping
3. Positions image to highlight main subject
4. Maintains visual hierarchy and composition

#### Letterbox Strategy
**When to use**: Showing entire image, avoiding any cropping

**User instruction**: "Replace this image but show the entire photo without cropping"

**What happens**:
1. AI uses `letterbox` strategy to fit complete image
2. Adds padding/background as needed
3. Ensures no image content is lost
4. Maintains original image composition

### Image Transformations

#### Rotation Operations
**When to use**: Correcting orientation, creative layouts, directional design

**User instruction**: "Rotate this logo 90 degrees clockwise"

**What happens**:
1. AI uses `rotate` operation with 90-degree value
2. Rotates image fill within container
3. Maintains container dimensions
4. Updates image orientation appropriately

#### Scale Mode Changes
**When to use**: Changing how images fit within containers

**User instruction**: "Change this background image to tile instead of stretching"

**What happens**:
1. AI uses `change_scale_mode` with `TILE` option
2. Updates image fill behavior
3. Creates repeating pattern from image
4. Maintains image quality without stretching

#### Image Cloning
**When to use**: Copying images between elements, maintaining consistency

**User instruction**: "Copy the brand image from header to footer with same filters"

**What happens**:
1. AI uses `clone_image` operation between source and target
2. Copies image asset and all applied filters
3. Maintains filter settings on cloned image
4. Creates consistent visual treatment

## Advanced Workflows

### Hero Image Setup
**User instruction**: "Create a hero section with background image, overlay, and text content"

**What the AI does**:
1. **Container Creation**: Creates hero frame (1200x600px)
2. **Image Loading**: Loads hero image from URL with `create_from_url`
3. **Image Optimization**: Applies filters for optimal contrast and mood
4. **Overlay Creation**: Adds semi-transparent overlay for text readability
5. **Content Layer**: Creates text elements with proper hierarchy
6. **Smart Positioning**: Uses smart crop to focus on image focal point

![Hero Section Workflow](images/hero-section-workflow.png)

### Product Gallery System
**User instruction**: "Set up a product gallery with consistent image treatment and responsive behavior"

**What the AI does**:
1. **Grid Layout**: Creates responsive grid container for product cards
2. **Image Standards**: Applies consistent filters and cropping to all products
3. **Smart Replacement**: Uses preserve_aspect strategy for product photos
4. **Hover States**: Sets up image variations for interactive states
5. **Quality Optimization**: Applies professional photo editing filters
6. **Batch Processing**: Processes multiple product images with same treatment

### Brand Image System
**User instruction**: "Apply consistent brand image treatment across all marketing materials"

**What the AI does**:
1. **Brand Filter Set**: Creates signature filter combination for brand consistency
2. **Template Application**: Applies same treatment to hero images, backgrounds, and graphics
3. **Color Matching**: Adjusts temperature and tint to match brand palette
4. **Smart Cropping**: Uses consistent cropping strategy across image types
5. **Quality Standards**: Ensures professional enhancement across all images
6. **Asset Organization**: Organizes treated images for easy reuse

## Image Management Strategies

### File Organization
- **Asset Libraries**: Organize images by category and use case
- **Naming Conventions**: Use descriptive names for easy identification
- **Version Control**: Track image updates and filter applications
- **Quality Standards**: Maintain consistent resolution and format requirements

### Filter Applications
- **Brand Consistency**: Create signature filter combinations for brand identity
- **Context Adaptation**: Adjust filters based on image placement and purpose
- **Quality Enhancement**: Use filters to improve rather than dramatically alter images
- **Performance Consideration**: Balance visual quality with file size requirements

### Responsive Strategies
- **Container Planning**: Design containers that work with various aspect ratios
- **Crop Planning**: Consider how images will crop at different sizes
- **Quality Scaling**: Ensure images work at different resolutions
- **Loading Optimization**: Plan for progressive loading and placeholder states

## Tips & Best Practices

### Image Loading
- **URL Validation**: Ensure image URLs are accessible and properly formatted
- **Size Consideration**: Be mindful of large images affecting performance
- **Format Planning**: Choose appropriate formats (JPG for photos, PNG for graphics)
- **Fallback Strategy**: Plan for image loading failures

### Filter Application
- **Subtle Enhancement**: Use filters to enhance rather than dramatically alter
- **Brand Alignment**: Ensure filtered images align with brand visual identity
- **Context Sensitivity**: Adjust filters based on where images will be used
- **Quality Preservation**: Avoid over-processing that degrades image quality

### Smart Replacement
- **Strategy Selection**: Choose appropriate fit strategy for each use case
- **Layout Impact**: Consider how replacement affects surrounding layout
- **Content Analysis**: Understand image content before choosing crop strategy
- **Consistency**: Use same replacement strategy for similar image types

### Performance Optimization
- **Image Sizing**: Load images at appropriate resolution for use case
- **Filter Efficiency**: Use filters judiciously to maintain performance
- **Caching Strategy**: Consider how images will be cached and reused
- **Progressive Enhancement**: Plan for loading states and optimization

## Troubleshooting

### Loading Issues
**Problem**: "Images won't load from URLs"
**Solutions**:
- Verify URL is accessible and properly formatted
- Check image file format is supported (JPG, PNG, SVG)
- Ensure image server allows cross-origin requests
- Test URL in browser to confirm accessibility

**Problem**: "Base64 images appear corrupted"
**Solutions**:
- Verify base64 encoding is complete and properly formatted
- Check that data includes proper MIME type prefix
- Ensure base64 string doesn't contain invalid characters
- Test with smaller image to isolate encoding issues

### Filter Issues
**Problem**: "Filters aren't having visible effect"
**Solutions**:
- Check filter values are within valid range (-1.0 to +1.0)
- Verify image has sufficient dynamic range for adjustments
- Try more extreme values to test filter functionality
- Ensure image isn't already heavily processed

**Problem**: "Image quality degrades with filters"
**Solutions**:
- Use more subtle filter values
- Apply filters incrementally rather than extreme adjustments
- Check source image quality before applying filters
- Consider using different filter combinations

### Replacement Issues
**Problem**: "Smart replacement isn't cropping as expected"
**Solutions**:
- Try different fit strategies (preserve_aspect, smart_crop, letterbox)
- Adjust alignment parameters (alignmentX, alignmentY)
- Check container dimensions and aspect ratio
- Test with different source images to isolate issue

**Problem**: "Replaced images break layout"
**Solutions**:
- Use preserve_container strategy to maintain layout
- Check auto layout settings on parent containers
- Verify constraints are properly configured
- Test layout with different image aspect ratios

## Next Steps

- **[Export Workflows →](export-workflows.md)**: Export processed images for production use
- **[Advanced Operations ←](advanced-operations.md)**: Combine images with vector operations
- **[Design System ←](design-system.md)**: Integrate images with design system components

---

**Remember**: Great image workflows balance visual quality with performance. Start with good source images and enhance thoughtfully.
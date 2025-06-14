# Figma MCP Write Server - Test Suite

## 🧪 Test Setup Instructions

### Prerequisites
1. **Start MCP Server**: `npm start` (should run on port 8765)
2. **Open Figma Desktop** with a blank file
3. **Install Plugin**: Import `figma-plugin/manifest.json` in Figma
4. **Run Plugin**: Launch "Figma MCP Write Bridge" plugin
5. **Verify Connection**: Plugin UI should show "Connected" status
6. **MCP Client**: Use Claude Desktop, Cursor, or compatible MCP client

### Connection Test
```
Ask AI: "Can you check if the Figma plugin is connected?"
Expected: AI uses get_plugin_status tool and reports connection status
```

## 📋 Basic Node Operations Tests

### Test 1: Create Basic Shapes
```
Prompt: "Create a blue rectangle at position 50,50 with dimensions 100x80"
Expected MCP Call: create_node
Parameters: nodeType="rectangle", x=50, y=50, width=100, height=80, fillColor="#0000FF"
Verification: Check Figma canvas for blue rectangle at specified position
```

### Test 2: Create Circle
```
Prompt: "Make a red circle with radius 40 at coordinates 200,100"
Expected MCP Call: create_node
Parameters: nodeType="ellipse", x=200, y=100, width=80, height=80, fillColor="#FF0000"
Verification: Red circle appears on canvas
```

### Test 3: Create Frame Container
```
Prompt: "Add a white frame container 300x200 pixels at origin"
Expected MCP Call: create_node
Parameters: nodeType="frame", x=0, y=0, width=300, height=200, fillColor="#FFFFFF"
Verification: White frame container created
```

## 📝 Text Creation Tests

### Test 4: Simple Text
```
Prompt: "Create text that says 'Hello World' at position 100,200"
Expected MCP Call: create_text
Parameters: characters="Hello World", x=100, y=200
Verification: Text appears on canvas
```

### Test 5: Styled Text
```
Prompt: "Make a large heading 'Welcome' in 48px Inter Bold at 50,50"
Expected MCP Call: create_text
Parameters: characters="Welcome", x=50, y=50, fontSize=48, fontFamily="Inter", fontStyle="Bold"
Verification: Large bold text created
```

### Test 6: Mixed Text Styling
```
Prompt: "Create text 'Hello World' where 'Hello' is red and 'World' is blue"
Expected MCP Call: create_text
Parameters: characters="Hello World", styleRanges=[{start:0, end:5, fillColor:"#FF0000"}, {start:6, end:11, fillColor:"#0000FF"}]
Verification: Multi-colored text created
```

## 🎨 Style Management Tests

### Test 7: Create Paint Style
```
Prompt: "Create a paint style called 'Primary Blue' with color #007ACC"
Expected MCP Call: manage_styles
Parameters: operation="create", styleType="paint", styleName="Primary Blue", color="#007ACC"
Verification: Check Figma styles panel for new paint style
```

### Test 8: List Styles
```
Prompt: "Show me all the paint styles in this file"
Expected MCP Call: manage_styles
Parameters: operation="list", styleType="paint"
Verification: AI reports list of paint styles
```

### Test 9: Apply Style
```
Prompt: "Apply the 'Primary Blue' style to the rectangle we created earlier"
Expected MCP Call: manage_styles
Parameters: operation="apply", nodeId="<rectangle-id>", styleName="Primary Blue"
Verification: Rectangle changes to primary blue color
```

## 🏗️ Auto Layout Tests (v0.13.0 Features)

### Test 10: Enable Auto Layout
```
Prompt: "Make the frame container use vertical auto layout with 16px spacing"
Expected MCP Call: manage_auto_layout
Parameters: operation="enable", nodeId="<frame-id>", direction="vertical", spacing=16
Verification: Frame becomes auto layout container
```

### Test 11: Auto Layout Configuration
```
Prompt: "Set the auto layout to have 20px padding and center alignment"
Expected MCP Call: manage_auto_layout
Parameters: operation="configure", nodeId="<frame-id>", padding=20, alignment="center"
Verification: Auto layout properties updated
```

### Test 12: Constraints
```
Prompt: "Pin the rectangle to the left edge and stretch it vertically"
Expected MCP Call: manage_constraints
Parameters: operation="set", nodeId="<rectangle-id>", horizontal="left", vertical="stretch"
Verification: Rectangle constraints updated
```

## 🏗️ Hierarchy Management Tests

### Test 13: Group Nodes
```
Prompt: "Group the rectangle and circle together"
Expected MCP Call: manage_hierarchy
Parameters: operation="group", nodeIds=["<rect-id>", "<circle-id>"]
Verification: Nodes grouped in Figma layers panel
```

### Test 14: Ungroup
```
Prompt: "Ungroup the group we just created"
Expected MCP Call: manage_hierarchy
Parameters: operation="ungroup", nodeId="<group-id>"
Verification: Group dissolved, children moved to parent
```

### Test 15: Reorder Layers
```
Prompt: "Move the circle behind the rectangle in layer order"
Expected MCP Call: manage_hierarchy
Parameters: operation="reorder", nodeId="<circle-id>", newIndex=0
Verification: Circle appears behind rectangle
```

## 🔧 Node Management Tests

### Test 16: Update Node Properties
```
Prompt: "Change the rectangle's width to 150 and height to 100"
Expected MCP Call: update_node
Parameters: nodeId="<rectangle-id>", properties={width: 150, height: 100}
Verification: Rectangle resized
```

### Test 17: Move Node
```
Prompt: "Move the circle to position 300,150"
Expected MCP Call: manage_nodes
Parameters: operation="move", nodeId="<circle-id>", x=300, y=150
Verification: Circle moved to new position
```

### Test 18: Duplicate Node
```
Prompt: "Duplicate the rectangle and offset it by 50 pixels to the right"
Expected MCP Call: manage_nodes
Parameters: operation="duplicate", nodeId="<rectangle-id>", offsetX=50, offsetY=0
Verification: Duplicate rectangle appears with offset
```

### Test 19: Delete Node
```
Prompt: "Delete the duplicate rectangle"
Expected MCP Call: manage_nodes
Parameters: operation="delete", nodeId="<duplicate-id>"
Verification: Duplicate removed from canvas
```

## 📋 Selection Management Tests

### Test 20: Set Selection
```
Prompt: "Select the circle and the original rectangle"
Expected MCP Call: set_selection
Parameters: nodeIds=["<circle-id>", "<rectangle-id>"]
Verification: Both nodes selected in Figma
```

### Test 21: Get Selection
```
Prompt: "What nodes are currently selected?"
Expected MCP Call: get_selection
Verification: AI reports currently selected nodes
```

### Test 22: Get All Page Nodes
```
Prompt: "List all the elements on this page"
Expected MCP Call: get_page_nodes
Verification: AI reports all nodes on current page
```

## 📤 Export Tests

### Test 23: Export Node
```
Prompt: "Export the rectangle as a PNG at 2x scale"
Expected MCP Call: export_node
Parameters: nodeId="<rectangle-id>", format="PNG", scale=2
Verification: Export process initiated (check success response)
```

## 🎨 Variables & Design Tokens Tests (v0.21.0 Features)

### Test 24: Create Variable Collection
```
Prompt: "Create a variable collection called 'Colors' with Light and Dark modes"
Expected MCP Call: manage_collections
Parameters: operation="create", collectionName="Colors", modes=["Light", "Dark"]
Verification: Check Figma variables panel for new collection with modes
```

### Test 25: Add Mode to Collection
```
Prompt: "Add a 'High Contrast' mode to the Colors collection"
Expected MCP Call: manage_collections
Parameters: operation="add_mode", collectionId="<collection-id>", newModeName="High Contrast"
Verification: Collection shows new mode in variables panel
```

### Test 26: Create Color Variable
```
Prompt: "Create a color variable 'Primary Blue' with light mode #0066CC and dark mode #4A9EFF"
Expected MCP Call: manage_variables
Parameters: operation="create", collectionId="<collection-id>", variableName="Primary Blue", variableType="COLOR", modeValues={"Light": "#0066CC", "Dark": "#4A9EFF"}
Verification: Variable appears in collection with correct values per mode
```

### Test 27: Create Number Variable
```
Prompt: "Create a spacing variable 'Base Spacing' with value 16 for all modes"
Expected MCP Call: manage_variables
Parameters: operation="create", collectionId="<collection-id>", variableName="Base Spacing", variableType="FLOAT", modeValues={"Light": 16, "Dark": 16}
Verification: Number variable created with consistent values
```

### Test 28: Bind Variable to Node
```
Prompt: "Bind the Primary Blue variable to the rectangle's fill color"
Expected MCP Call: manage_variables
Parameters: operation="bind", variableId="<variable-id>", nodeId="<rectangle-id>", property="fills"
Verification: Rectangle fill is bound to variable (check in Figma properties panel)
```

### Test 29: List Variables in Collection
```
Prompt: "Show me all variables in the Colors collection"
Expected MCP Call: manage_variables
Parameters: operation="list", collectionId="<collection-id>"
Verification: AI reports list of variables with their types and values
```

### Test 30: Update Variable Value
```
Prompt: "Change the Primary Blue variable's light mode value to #007ACC"
Expected MCP Call: manage_variables
Parameters: operation="update", variableId="<variable-id>", modeValues={"Light": "#007ACC"}
Verification: Variable value updated, bound elements reflect change
```

### Test 31: Create String Variable
```
Prompt: "Create a text variable 'Button Label' with value 'Click Me' for light mode and 'Tap Here' for dark mode"
Expected MCP Call: manage_variables
Parameters: operation="create", collectionId="<collection-id>", variableName="Button Label", variableType="STRING", modeValues={"Light": "Click Me", "Dark": "Tap Here"}
Verification: String variable created with mode-specific values
```

### Test 32: Unbind Variable
```
Prompt: "Remove the variable binding from the rectangle's fill"
Expected MCP Call: manage_variables
Parameters: operation="unbind", nodeId="<rectangle-id>", property="fills"
Verification: Rectangle fill no longer bound to variable
```

### Test 33: Delete Variable
```
Prompt: "Delete the Button Label variable"
Expected MCP Call: manage_variables
Parameters: operation="delete", variableId="<variable-id>"
Verification: Variable removed from collection
```

### Test 34: Rename Collection Mode
```
Prompt: "Rename the 'High Contrast' mode to 'Accessibility'"
Expected MCP Call: manage_collections
Parameters: operation="rename_mode", collectionId="<collection-id>", modeId="<mode-id>", newModeName="Accessibility"
Verification: Mode name updated in variables panel
```

### Test 35: Delete Collection
```
Prompt: "Delete the Colors variable collection"
Expected MCP Call: manage_collections
Parameters: operation="delete", collectionId="<collection-id>"
Verification: Collection and all its variables removed
```

## 🛠️ Error Handling Tests

### Test 36: Invalid Node ID
```
Prompt: "Delete a node with ID 'invalid-id'"
Expected: Error response about invalid node ID
```

### Test 37: Plugin Disconnection
```
Action: Close Figma plugin manually
Prompt: "Create a new rectangle"
Expected: Error about plugin not connected
```

### Test 38: Invalid Parameters
```
Prompt: "Create a rectangle with negative dimensions"
Expected: Validation error or reasonable defaults applied
```

### Test 39: Invalid Variable Type
```
Prompt: "Create a variable with an invalid type"
Expected: Error about unsupported variable type
```

### Test 40: Variable Binding to Invalid Property
```
Prompt: "Bind a color variable to a text property"
Expected: Error about incompatible property binding
```

## 🏁 Test Results Checklist

### Basic Functionality ✓
- [ ] Server starts without errors
- [ ] Plugin connects successfully
- [ ] Basic node creation works
- [ ] Text creation works
- [ ] Node updates work
- [ ] Node deletion works

### Advanced Features ✓
- [ ] Style management works
- [ ] Auto layout functionality works
- [ ] Constraints work properly
- [ ] Hierarchy management works
- [ ] Selection management works
- [ ] Export functionality works
- [ ] Variable collection management works
- [ ] Variable creation and editing works
- [ ] Variable binding to nodes works
- [ ] Mode management works properly

### Error Handling ✓
- [ ] Invalid parameters handled gracefully
- [ ] Plugin disconnection detected
- [ ] Meaningful error messages provided
- [ ] Server remains stable during errors

### Performance ✓
- [ ] Operations complete in reasonable time
- [ ] No memory leaks during extended testing
- [ ] Plugin reconnects automatically
- [ ] Large operations don't freeze Figma

## 📊 Test Report Template

```
# Figma MCP Test Report
Date: [DATE]
Version: 0.13.1
Tester: [NAME]

## Test Results Summary
- Tests Passed: X/40
- Tests Failed: Y/40
- Critical Issues: Z

## Failed Tests
[List any failed tests with descriptions]

## Performance Notes
[Any performance observations]

## Recommendations
[Suggested improvements or fixes]
```

## 🚀 Automated Testing Script

For developers, create a script that:
1. Starts the MCP server
2. Connects via WebSocket to test basic connectivity
3. Sends sample MCP tool calls
4. Validates responses
5. Reports test results

This manual test suite should be run after any significant changes to verify all functionality works correctly.
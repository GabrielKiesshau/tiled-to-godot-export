### How to Export a Map from Tiled to Godot

**Assigning tilesets to their .tres files:**
1. a
2. b
3. c

**Adding warps:**
Prerequisites:
- Two rooms;
- One of them must have an area with the class **Warp**;
- The destination room data resource;
- The destination scene reference resource;

1. Place down areas and assign them the class **Warp**. Doing so should display the custom properties of a Warp, godot:collision_mask, godot:resource:target_room, godot:script and godot:var:is_fade_enabled.
2. Keep the godot:collision_mask and the godot:script as they are. But the godot:resource:target_room must point to the file that contains the reference of the room you want as destination.
3. So

**Exporting the Map:**
Prerequisites:
- All tilesets used in the map must have been exported previously;

1. In Tiled, go to **File > Export As** (or press **Ctrl + Shift + E**).
2. Choose the location where you want to save your converted map, and make sure the selected format is **Godot 4 Tilemap format (*.tscn)**.

3. For a quicker export without the file prompt, go to **File > Export** (or press **Ctrl + E**). Tiled will export your map to the last saved file name.

**Additional notes:**
1. Exporting the map will overwrite any changes made in Godot to a map with the same name.
2. There's no oval in Godot, so the ellipse in Tiled will use its width as its radius.

**Customizing Properties:**

You can customize properties for the map, layers, and objects. Here are the available customizations:

#### Map Properties:
- **`godot:type`**: Root node type, defaults to "Node2D".
- **`godot:name`**: Map name, defaults to the file name.

#### Tileset Properties:
- **`godot:res_path`**: The file path of the Godot tileset. Required.

#### Layer Properties:
- **Name**: Name of the layer.
- **`godot:groups`**: Groups this Godot object is part of. Multiple groups are allowed, separated by commas.

#### Group Layer Properties:
- **`godot:type`**: Root node type, defaults to "Node2D".

#### Object Layer Properties:
- (Specify any object-specific properties here if needed)

#### Tile Layer Properties:
- **`godot:z_index`**: The z-index of the layer. Defaults to 10.

**Object Properties:**

- **Tile:**
  - **Name**: Defaults to "Sprite2D".

- **Rectangle:**
  - **Name**: Defaults to "Area2D".
  - **`godot:collision_layer`**: The collision layer of the Area2D.
  - **`godot:collision_mask`**: The collision mask of the Area2D.

- **Polygon:**
  - **Name**: Defaults to "Area2D".
  - **`godot:collision_layer`**: The collision layer of the Area2D.
  - **`godot:collision_mask`**: The collision mask of the Area2D.

- **Ellipse:**
  - **Name**: Defaults to "Area2D".
  - **`godot:collision_layer`**: The collision layer of the Area2D.
  - **`godot:collision_mask`**: The collision mask of the Area2D.

- **Point:**
  - **Name**: Defaults to "Node2D".
  - **`godot:type`**: Defaults to "Node2D".

**Z-Index Guide:**

- **Background**: 10 to 39
- **Playable Area**: 40 to 49
- **Foreground**: 50+

**Collision Layers:**

1. Environment
2. Player
3. Enemy
4. Collectable
5. Player Projectile
6. Enemy Projectile
7. Warp
8-32: (Reserved for additional custom layers)

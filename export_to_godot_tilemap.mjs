import { getResPath, stringifyKeyValue, convertNodeToString, splitCommaSeparatedString, getTilesetColumns, getFileName, getAreaCenter, degreesToRadians } from './utils.mjs';

/*global tiled, TextFile */
class GodotTilemapExporter {
  // noinspection DuplicatedCode
  /**
   * Constructs a new instance of the tilemap exporter
   * @param {TileMap} map the tilemap to export
   * @param {string} fileName path of the file the tilemap should be exported to
   */
  constructor(map, fileName) {
    this.map = map;
    this.fileName = fileName;
    this.tilemapNodeString = "";
    this.tilesetResourceString = "";
    this.subResourcesString = "";
    this.externalResourceID = 0;
    this.subResourceID = 0;

    /**
     * Tiled doesn't have tileset ID so we create a map
     * Tileset name to generated tilesetId.
     */
    this.tilesetIndexMap = new Map();

    /**
     * Godot Tilemap has only one Tileset.
     * Each layer is Tilemap and is mapped to a single Tileset.
     * !!! Important !!
     * Do not add tiles from different tilesets in single layer.
     */
    this.layersToTilesetIndex = new Map();
  };

  write() {
    this.setTilesetsString();
    this.setTileMapsString();
    this.saveToFile();
    tiled.log(`Tilemap exported successfully to ${this.fileName}`);
  }

  /**
   * Generate a string with all tilesets in the map.
   * Godot supports several image textures per tileset but Tiled Editor doesn't.
   * Tiled editor supports only one tile sprite image per tileset.
   */
  setTilesetsString() {
    for (let index = 0; index < this.map.tilesets.length; ++index) {
      const tileset = this.map.tilesets[index];

      this.externalResourceID = index + 1;
      this.tilesetIndexMap.set(tileset.name, this.externalResourceID);
      
      // let tilesetPath = getResPath(tileset.property("godot:projectRoot"), tileset.property("godot:relativePath"), tileset.asset.fileName.replace('.tsx', '.tres'));
      let tilesetPath = tileset.property("godot:resPath");

      const externalResource = {
        type: ExternalResource.TileSet,
        id: this.externalResourceID,
        path: tilesetPath,
      };

      this.tilesetResourceString += this.createExternalResource(externalResource);
    }
  }

  /**
   * Creates the Tilemap nodes. One Tilemap per one layer from Tiled.
   */
  setTileMapsString() {
    const isIsometric = this.map.orientation === TileMap.Isometric;
    const mode = isIsometric ? 1 : undefined;
    
    for (let layerIndex = 0; layerIndex < this.map.layerCount; ++layerIndex) {
      let layer = this.map.layerAt(layerIndex);
      this.handleLayer(layer, mode, ".");
    }
  }

  /**
   * Handle exporting a single layer.
   * @param {Layer} layer - The target layer.
   * @param {number} mode - The layer mode.
   * @param {string} parentLayerPath - Path of the parent of the layer.
   */
  handleLayer(layer, mode, parentLayerPath) {
    const groups = splitCommaSeparatedString(layer.property("godot:groups"));

    if (layer.isTileLayer) {
      this.handleTileLayer(layer, mode, parentLayerPath, groups);
      return;
    }
    if (layer.isObjectLayer) {
      this.handleObjectLayer(layer, parentLayerPath, groups);
      return;
    }
    if (layer.isGroupLayer) {
      this.handleGroupLayer(layer, mode, parentLayerPath, groups);
    }
  }

  handleTileLayer(layer, mode, parentLayerPath, groups) {
    const layerDataList = this.getLayerDataList(layer);

    for (const layerData of layerDataList) {
      if (!layerData.isEmpty) {
        const layerName = layer.name || `TileMap ${layer.id}`;
        const tilesetName = layerData.tileset.name || `TileSet ${layerData.tilesetID}`;
        const tileMapName = `${layerName} - ${tilesetName}`;
        this.mapLayerToTileset(layer.name, layerData.tilesetID);
        this.tilemapNodeString += this.getTileMapTemplate(tileMapName, mode, layerData.tilesetID, layerData.poolIntArrayString, layer, parentLayerPath, groups);
      }
    }
  }

  handleObjectLayer(layer, parentLayerPath, layerGroups) {
    this.tilemapNodeString += convertNodeToString({
      name: layer.name,
      type: "Node2D",
      parent: parentLayerPath,
      groups: layerGroups,
    });

    for (const mapObject of layer.objects) {
      const mapObjectGroups = splitCommaSeparatedString(mapObject.property("godot:groups"));
      
      if (mapObject.tile) {
        this.generateTileNode(layer, parentLayerPath, mapObject, mapObjectGroups);
        continue;
      }

      this.generateNode(layer, parentLayerPath, mapObject, mapObjectGroups);
    }
  }

  handleGroupLayer(layer, mode, parentLayerPath, groups) {
    const nodeType = layer.property("godot:type") || "Node2D";
    this.tilemapNodeString += convertNodeToString(
      {
        name: layer.name,
        type: nodeType,
        parent: parentLayerPath,
        groups: groups,
      }, 
      this.merge_properties(layer.properties(), {}),
      this.meta_properties(layer.properties()),
    );

    for(let i = 0; i < layer.layerCount; ++i) { 
      this.handleLayer(layer.layers[i], mode, `${parentLayerPath}/${layer.name}`);
    }
  }

  /**
   * Generates a Tile node.
   * @param {Layer} layer - The layer containing the tile.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - An object that can be part of an ObjectGroup.
   */
  generateTileNode(layer, parentLayerPath, mapObject, groups) {
    const tilesetsIndexKey = `${mapObject.tile.tileset.name}_Image`;
    let textureResourceID = 0;

    if (!this.tilesetIndexMap.get(tilesetsIndexKey)) {
      this.externalResourceID += 1;
      textureResourceID = this.externalResourceID;
      this.tilesetIndexMap.set(tilesetsIndexKey, this.externalResourceID);

      const tilesetPath = getResPath(
        this.map.property("godot:projectRoot"),
        this.map.property("godot:relativePath"),
        mapObject.tile.tileset.image,
      );

      const externalResource = {
        type: ExternalResource.Texture,
        id: this.externalResourceID,
        path: tilesetPath,
      };

      this.tilesetResourceString += this.createExternalResource(externalResource);
    } else {
      textureResourceID = this.tilesetIndexMap.get(tilesetsIndexKey);
    }

    const tileOffset = this.getTileOffset(mapObject.tile.tileset, mapObject.tile.id);

    // Converts Tiled pivot (top left corner) to Godot pivot (center);
    const mapObjectPosition = {
      x: mapObject.x + (mapObject.tile.width / 2),
      y: mapObject.y - (mapObject.tile.height / 2),
    };

    this.tilemapNodeString += convertNodeToString(
      {
        name: mapObject.name || "Sprite2D",
        type: "Sprite2D",
        parent: `${parentLayerPath}/${layer.name}`,
        groups: groups,
      },
      this.merge_properties(
        mapObject.properties(),
        {
          position: `Vector2(${mapObjectPosition.x}, ${mapObjectPosition.y})`,
          texture: `ExtResource(${textureResourceID})`,
          region_enabled: true,
          region_rect: `Rect2(${tileOffset.x}, ${tileOffset.y}, ${mapObject.tile.width}, ${mapObject.tile.height})`,
        },
      ),
      this.meta_properties(layer.properties()),
    );
  }

  /**
   * Generates a node.
   * @param {Layer} layer - The layer containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - An object that can be part of an ObjectGroup.
   * @param {Array<string>} groups - The groups this Node belongs to.
   */
  generateNode(layer, parentLayerPath, mapObject, groups) {
    switch (mapObject.shape) {
      case MapObjectShape.Rectangle:
        this.generateRectangle(layer, parentLayerPath, mapObject, groups);
        break;
      case MapObjectShape.Polygon:
        this.generatePolygon(layer, parentLayerPath, mapObject, groups, PolygonBuildMode.Polygon);
        break;
      case MapObjectShape.Polyline:
        this.generatePolygon(layer, parentLayerPath, mapObject, groups, PolygonBuildMode.Polyline);
        break;
      case MapObjectShape.Ellipse:
        this.generateEllipse(layer, parentLayerPath, mapObject, groups);
        break;
      case MapObjectShape.Point:
        this.generatePoint(layer, parentLayerPath, mapObject, groups);
        break;
    }
  }

  /**
   * Generates a Area2D node with a rectangle shape.
   * @param {Layer} layer - The layer containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   */
  generateRectangle(layer, parentLayerPath, mapObject, groups) {
    const name = mapObject.name || "Area2D";
    const position = {x: mapObject.x, y: mapObject.y};
    const size = {
      width: mapObject.width,
      height: mapObject.height,
    };
    
    const center = getAreaCenter(position, size, mapObject.rotation);

    this.tilemapNodeString += convertNodeToString(
      {
        name: name,
        type: "Area2D",
        parent: `${parentLayerPath}/${layer.name}`,
        groups: groups,
      },
      this.merge_properties(
        mapObject.properties(),
        {
          position: `Vector2(${center.x}, ${center.y})`,
          rotation: degreesToRadians(mapObject.rotation),
          collision_layer: mapObject.property("godot:collision_layer"),
          collision_mask: mapObject.property("godot:collision_mask"),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );

    const shapeID = this.addSubResource(
      "RectangleShape2D",
      { extents: `Vector2(${size.width / 2}, ${size.height / 2})` },
    );
    
    const area2DName = mapObject.name || "Area2D";
    this.tilemapNodeString += convertNodeToString(
      {
        name: "CollisionShape2D",
        type: "CollisionShape2D",
        parent: `${parentLayerPath}/${layer.name}/${area2DName}`,
      },
      this.merge_properties(
        {},
        {
          shape: `SubResource(${shapeID})`,
        },
      ),
      {},
    );
  }
  
  /**
   * Generates a Area2D node with a polygon shape.
   * @param {Layer} layer - The layer containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {PolygonBuildMode} buildMode - Whether the mode of the polygon should be solid or just use lines for collision.
   */
  generatePolygon(layer, parentLayerPath, mapObject, groups, buildMode) {
    const name = mapObject.name || "Area2D";
    const position = {x: mapObject.x, y: mapObject.y};
    const size = {
      width: mapObject.width,
      height: mapObject.height,
    };
    
    const center = getAreaCenter(position, size, mapObject.rotation);

    this.tilemapNodeString += convertNodeToString(
      {
        name: name,
        type: "Area2D",
        parent: `${parentLayerPath}/${layer.name}`,
        groups: groups,
      }, 
      this.merge_properties(
        mapObject.properties(),
        {
          position: `Vector2(${center.x}, ${center.y})`,
          rotation: degreesToRadians(mapObject.rotation),
          collision_layer: mapObject.property("godot:collision_layer"),
          collision_mask: mapObject.property("godot:collision_mask"),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );

    let polygonPoints = mapObject.polygon.map(point => `${point.x}, ${point.y}`).join(', ');
    
    const area2DName = mapObject.name || "Area2D";
    this.tilemapNodeString += convertNodeToString(
      {
        name: "CollisionPolygon2D",
        type: "CollisionPolygon2D",
        parent: `${parentLayerPath}/${layer.name}/${area2DName}`,
      }, 
      this.merge_properties(
        {},
        {
          build_mode: buildMode,
          polygon: `PackedVector2Array(${polygonPoints})`,
        },
      ),
      {},
    );
  }

  /**
   * Generates a Area2D node with a polyline shape.
   * @param {Layer} layer - The layer containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   */
  generateEllipse(layer, parentLayerPath, mapObject, groups) {
    const name = mapObject.name || "Area2D";
    const position = {x: mapObject.x, y: mapObject.y};
    const size = {
      width: mapObject.width,
      height: mapObject.height,
    };
    const radius = mapObject.width / 2;
    
    const center = getAreaCenter(position, size, mapObject.rotation);

    this.tilemapNodeString += convertNodeToString(
      {
        name: name,
        type: "Area2D",
        parent: `${parentLayerPath}/${layer.name}`,
        groups: groups,
      }, 
      this.merge_properties(
        mapObject.properties(),
        {
          position: `Vector2(${center.x}, ${center.y})`,
          rotation: degreesToRadians(mapObject.rotation),
          collision_layer: mapObject.property("godot:collision_layer"),
          collision_mask: mapObject.property("godot:collision_mask"),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );

    const shapeID = this.addSubResource(
      "CircleShape2D",
      { radius: radius },
    );
    
    const area2DName = mapObject.name || "Area2D";
    this.tilemapNodeString += convertNodeToString(
      {
        name: "CollisionShape2D",
        type: "CollisionShape2D",
        parent: `${parentLayerPath}/${layer.name}/${area2DName}`,
      }, 
      this.merge_properties(
        {},
        {
          shape: `SubResource(${shapeID})`,
        },
      ),
      {},
    );
  }

  /**
   * Generates a Point.
   * @param {Layer} layer - The layer containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - The object representing the Node2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   */
  generatePoint(layer, parentLayerPath, mapObject, groups) {
    const name = mapObject.name || "Node2D";
    const type = mapObject.property("godot:type") || "Node2D";

    // const prefab = mapObject.property("godot:prefab");

    // var prefabDirectory = tiled.project?.property("godot:prefab_directory");
    // tiled.log(x);
    // [ext_resource type="PackedScene" uid="uid://c0a5dtnw817wl" path=`${prefabDirectory}characters/npcs/cell_naive.tscn" id="3_l2prl"]
    // [node name="NaiveCell" parent="." instance=ExtResource("3_l2prl")]
    // position = Vector2(637, 461)

    this.tilemapNodeString += convertNodeToString(
      {
        name: name,
        type: type,
        parent: `${parentLayerPath}/${layer.name}`,
        groups: groups,
      },
      this.merge_properties(
        mapObject.properties(), 
        {
          position: `Vector2(${mapObject.x}, ${mapObject.y})`,
          rotation: degreesToRadians(mapObject.rotation),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );
  }

  /**
   * Adds a new subresource to the generated file
   *
   * @param {string} type - The type of subresource
   * @param {object} contentProperties - Key-value map of properties
   * @returns {number} - The created sub resource id
   */
    addSubResource(type, contentProperties) {
      if (typeof type !== 'string') {
        throw new TypeError('type must be a string');
      }
      if (typeof contentProperties !== 'object' || contentProperties === null) {
        throw new TypeError('contentProperties must be a non-null object');
      }
  
      const id = this.subResourceID++;
      const subResourceParts = [`\n[sub_resource type="${type}" id=${id}]`];
  
      for (const [key, value] of Object.entries(contentProperties)) {
        if (value !== undefined) {
          subResourceParts.push(stringifyKeyValue(key, value, false, false, true));
        }
      }
  
      this.subResourcesString += subResourceParts.join('\n') + '\n';
      return id;
    }

  /**
   * Prepare properties for a Godot node.
   * @param {TiledObjectProperties} object_props - Properties from the layer.
   * @param {TiledObjectProperties} set_props - The base properties for the node.
   * @returns {TiledObjectProperties} - The merged property set for the node.
   */
  merge_properties(object_props, set_props) {
    for (const [key, value] of Object.entries(object_props)) {
      if(key.startsWith("godot:node:")) {
        set_props[key.substring(11)] = value;
        continue;
      }

      if(key.startsWith("godot:script")) {
      //   let externalResource = {
      //     type: ExternalResource.Script,
      //     path: value,
      //     id: "",
      //   };
      //   set_props["script"] = `ExtResource("${resourceID}")`;

        continue;
      }

      if(key.startsWith("godot:resource:")) {
      //   let externalResource = {
      //     type: ExternalResource.Resource,
      //     path: value,
      //     id: "",
      //     uid: "",
      //   };
      //   set_props[key.substring(15)] = `ExtResource("${resourceID}")`;
      }

      // let x = this.createExternalResource(ExternalResource.Script, value);
    }

    return set_props;
  }

  /**
   * Prepare the meta properties for a Godot node
   * @param {TiledObjectProperties} object_props
   * @returns {object} the meta properties
   */
  meta_properties(object_props) {
    let results = {};

    for (const [key, value] of Object.entries(object_props)) {
      if(key.startsWith("godot:meta:")) {
        results[key.substring(11)] = value;
      }
    }

    return results;
  }

  /**
   * @typedef {{
   *   tileset: Tileset,
   *   tilesetID: number?,
   *   tilesetColumns: number,
   *   layer: Layer,
   *   isEmpty: boolean,
   *   poolIntArrayString: string,
   *   parent: string
   * }} LayerData
   */

  /**
   * Creates all the tiles coordinates for a layer.
   * Each element in the retuned array corresponds to the tile coordinates for each of
   * the tilesets used in the layer.
   * @param {TileLayer} layer the target layer
   * @returns {LayerData[]} the data about the tilesets used in the target layer
   */
  getLayerDataList(layer) {
    // noinspection JSUnresolvedVariable
    let boundingRect = layer.region().boundingRect;

    const tilesetList = [];

    for (let y = boundingRect.top; y <= boundingRect.bottom; ++y) {
      for (let x = boundingRect.left; x <= boundingRect.right; ++x) {
        // noinspection JSUnresolvedVariable,JSUnresolvedFunction
        let cell = layer.cellAt(x, y);

        if (!cell.empty) {
          /**
           * Find the tileset on the list, if not found, add
           */
          const tile = layer.tileAt(x, y);

          let tileset = tilesetList.find(item => item.tileset === tile.tileset);

          if (!tileset) {
            tileset = {
              tileset: tile.tileset,
              tilesetID: null,
              columns: getTilesetColumns(tile.tileset),
              layer: layer,
              isEmpty: tile.tileset === null,
              poolIntArrayString: "",
              parent: tilesetList.length === 0 ? "." : layer.name,
            };

            tilesetList.push(tileset);
          }

          const tilesetColumns = tileset.columns;

          let tileId = cell.tileId;
          let tileGodotID = tileId;

          /** Handle Godot strange offset by rows in the tileset image **/
          if (tileId >= tilesetColumns) {
            let tileY = Math.floor(tileId / tilesetColumns);
            let tileX = (tileId % tilesetColumns);
            tileGodotID = tileX + (tileY * TileOffset);
          }

          /**
           * Godot coordinates use an offset of 65536
           * Check the README.md: Godot Tilemap Encoding & Limits
           */
          let cellID = (x >= 0 ? y : y + 1) * TileOffset + x;

          let alt = 0;
          if (cell.rotatedHexagonal120) {
            tiled.error("Hex tiles that are rotated by 120° degrees are not supported.");
          }

          if (cell.flippedHorizontally) {
            alt |= FlippedState.FlippedH;
          }

          if (cell.flippedVertically) {
            alt |= FlippedState.FlippedV;
          }

          if (cell.flippedAntiDiagonally) {
            alt |= FlippedState.Transposed;
          }

          let srcX = tileId % tilesetColumns;
          srcX *= TileOffset;
          // srcX += tilesetInfo.atlasID;
          // tiled.log(`tilesetInfo.atlasID : ${"tilesetInfo.atlasID"}`);

          let srcY = Math.floor(tileId / tilesetColumns);
          srcY += alt * TileOffset;
          
          tileset.poolIntArrayString += `${cellID}, ${srcX}, ${srcY}, `;
        }
      }
    }

    // Remove trailing commas and blank
    tilesetList.forEach(i => {
      i.poolIntArrayString = i.poolIntArrayString.replace(/,\s*$/, "");
    });

    for (let idx = 0; idx < tilesetList.length; idx++) {
      const current = tilesetList[idx];
      
      if (current.tileset === null || current.poolIntArrayString === "") {
        tiled.log(`Error: The layer ${layer.name} is empty and has been skipped!`);
        continue;
      }

      current.tilesetID = this.getTilesetIDByTileset(current.tileset);
    }

    return tilesetList;
  }

  /**
   * Find the id of a tileset by its name
   * @param {Tileset} tileset The tileset to find the id of
   * @returns {string|undefined} the id of the tileset if found, undefined otherwise
   */
  getTilesetIDByTileset(tileset) {
    return this.tilesetIndexMap.get(tileset.name);
  }

  /**
   * Calculate the X and Y offset (in pixels) for the specified tile
   * ID within the specified tileset image.
   *
   * @param {Tileset} tileset - The full Tileset object
   * @param {int} tileId - Id for the tile to extract offset for
   * @returns {object} - An object with pixel offset in the format {x: int, y: int}
   */
  getTileOffset(tileset, tileId) {
    const columnCount = getTilesetColumns(tileset);
    const row = Math.floor(tileId / columnCount);
    const col = tileId % columnCount;
    const xOffset = tileset.margin + (tileset.tileSpacing * col);
    const yOffset = tileset.margin + (tileset.tileSpacing * row);

    return {
      x: (col * tileset.tileWidth) + xOffset,
      y: (row * tileset.tileHeight) + yOffset,
    };
  }

  saveToFile() {
    const file = new TextFile(this.fileName, TextFile.WriteOnly);
    const sceneTemplate = this.getSceneTemplate();
    file.write(sceneTemplate);
    file.commit();
  }

  /**
   * Template for a scene
   * @returns {string}
   */
  getSceneTemplate() {
    const loadSteps = 2 + this.subResourceID;
    const type = this.map.property("godot:type") || "Node2D";
    const name = this.map.property("godot:name") || getFileName(this.fileName);

    return `[gd_scene load_steps=${loadSteps} format=3]

${this.tilesetResourceString}
${this.subResourcesString}
[node name="${name}" type="${type}"]
${this.tilemapNodeString}
`;
  }

  /**
   * Create an external resource
   * @returns {string}
   */
  createExternalResource(externalResource) {
    // Strip leading slashes to prevent invalid triple slashes in Godot res:// path:
    externalResource.path = externalResource.path.replace(/^\/+/, '');

    return `[ext_resource type="${externalResource.type}" path="res://${externalResource.path}" id=${externalResource.id}]`;
  }

  /**
   * Template for a tilemap node
   * @param {string} tileMapName
   * @param {number} mode
   * @param {number} tilesetID
   * @param {string} poolIntArrayString
   * @param {Layer} layer
   * @param {string} parent
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @returns {string}
   */
  getTileMapTemplate(tileMapName, mode, tilesetID, poolIntArrayString, layer, parent = ".", groups) {
    const zIndex = parseInt(layer.properties()['z_index'], 10);

    return convertNodeToString(
      {
        name: tileMapName,
        type: "TileMap",
        parent: parent,
        groups: groups,
      }, 
      this.merge_properties(
        layer.properties(),
        {
          format: 2,
          tile_set: `ExtResource(${tilesetID})`,
          // TileMap properties
          rendering_quadrant_size: undefined,//16,
          collision_animatable: undefined,//false,
          collision_visibility_mode: undefined,//0,
          navigation_visibility_mode: undefined,//0,
          // Layers properties
          cell_size: `Vector2(${layer.map.tileWidth}, ${layer.map.tileHeight})`,
          cell_custom_transform: `Transform2D(16, 0, 0, 16, 0, 0)`,
          mode: mode,
          tile_data: `PackedInt32Array(${poolIntArrayString})`,
          // layer_0/name: undefined,//"layer",
          // layer_0/enabled: undefined,//true,
          // layer_0/modulate: undefined,//`Color(1, 1, 1, ${layer.opacity})`,
          // layer_0/y_sort_enabled: undefined,//false
          // layer_0/y_sort_origin: undefined,//0
          // layer_0/z_index: undefined,//0
          // layer_0/navigation_enabled: undefined,//true
          // Node2D properties
          position: `Vector2(${layer.offset.x}, ${layer.offset.y})`,
          rotation: undefined,//0,
          scale: undefined,//`Vector2(1, 1)`,
          skew: undefined,// 0,
          // CanvasItem properties
          visible: layer.visible,
          modulate: `Color(1, 1, 1, ${layer.opacity})`,
          self_modulate: undefined,//`Color(1, 1, 1, ${layer.opacity})`,
          show_behind_parent: undefined,//false,
          top_level: undefined,//false,
          clip_children: undefined,//0,
          light_mask: undefined,//1,
          visibility_layer: undefined,//1,
          z_index: this.validateNumber(zIndex),
          z_as_relative: undefined,//false,
          y_sort_enabled: undefined,//true,
          texture_filter: undefined,//0,
          texture_repeat: undefined,//0,
        }
      ),
      this.meta_properties(layer.properties()),
    );
  }

  validateString(text)
  {
    return (typeof text === 'string') ? text : undefined;
  }

  validateNumber(number)
  {
    return (typeof number === 'number' && !isNaN(number)) ? number : undefined;
  }

  mapLayerToTileset(layerName, tilesetID) {
    this.layersToTilesetIndex[layerName] = tilesetID;
  }
}

const TileOffset = 65536;

const FlippedState = {
  FlippedH: 1 << 12,
  FlippedV: 2 << 13,
  Transposed: 4 << 14
};

const MapObjectShape = {
  Rectangle: 0,
  Polygon: 1,
  Polyline: 2,
  Ellipse: 3,
  Text: 4,
  Point: 5,
};

const PolygonBuildMode = {
  Polygon: 0,
  Polyline: 1,
};

const ExternalResource = {
  Script: "Script",
  Resource: "Resource",
  Texture: "Texture",
  TileSet: "TileSet",
};

const customTileMapFormat = {
  name: "Godot 4 Tilemap format",
  extension: "tscn",

  /**
   * Map exporter function
   * @param {TileMap} map the map to export
   * @param {string} fileName path of the file where to export the map
   * @returns {undefined}
   */
  write: function (map, fileName) {
    const exporter = new GodotTilemapExporter(map, fileName);
    exporter.write();
    return undefined;
  }
};

// noinspection JSUnresolvedFunction
tiled.registerMapFormat("Godot", customTileMapFormat);

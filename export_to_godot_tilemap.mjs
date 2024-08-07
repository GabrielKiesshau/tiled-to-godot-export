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
    this.externalResourceList = [];
    this.subResourceList = [];
    this.nodeList = [];
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

      this.tilesetIndexMap.set(tileset.name, this.externalResourceID);
      
      // let tilesetPath = getResPath(tileset.property("godot:projectRoot"), tileset.property("godot:relativePath"), tileset.asset.fileName.replace('.tsx', '.tres'));
      const tilesetPath = tileset.property("godot:resPath");
      
      const externalResource = this.createExternalResource(ExternalResource.TileSet, tilesetPath);

      this.externalResourceList.push(externalResource);
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
        
        const tilemap = this.getTileMapTemplate(tileMapName, mode, layerData.tilesetID, layerData.packedIntArrayString, layer, parentLayerPath, groups);

        this.nodeList.push(tilemap);
      }
    }
  }

  handleObjectLayer(layer, parentLayerPath, layerGroups) {
    const node = convertNodeToString({
      name: layer.name,
      type: "Node2D",
      parent: parentLayerPath,
      groups: layerGroups,
    });
    this.nodeList.push(node);

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
    const node = convertNodeToString(
      {
        name: layer.name,
        type: nodeType,
        parent: parentLayerPath,
        groups: groups,
      },
      this.merge_properties(layer.properties(), {}),
      this.meta_properties(layer.properties()),
    );
    this.nodeList.push(node);

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
      textureResourceID = this.externalResourceID;
      this.tilesetIndexMap.set(tilesetsIndexKey, this.externalResourceID);

      const tilesetPath = getResPath(
        this.map.property("godot:projectRoot"),
        this.map.property("godot:relativePath"),
        mapObject.tile.tileset.image,
      );

      const externalResource = this.createExternalResource(ExternalResource.Texture, tilesetPath);

      this.externalResourceList.push(externalResource);
    } else {
      textureResourceID = this.tilesetIndexMap.get(tilesetsIndexKey);
    }

    const tileOffset = this.getTileOffset(mapObject.tile.tileset, mapObject.tile.id);

    // Converts Tiled pivot (top left corner) to Godot pivot (center);
    const mapObjectPosition = {
      x: mapObject.x + (mapObject.tile.width / 2),
      y: mapObject.y - (mapObject.tile.height / 2),
    };

    const node = convertNodeToString(
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
          texture: `ExtResource("${textureResourceID}")`,
          region_enabled: true,
          region_rect: `Rect2(${tileOffset.x}, ${tileOffset.y}, ${mapObject.tile.width}, ${mapObject.tile.height})`,
        },
      ),
      this.meta_properties(layer.properties()),
    );
    this.nodeList.push(node);
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

    const area2DNode = convertNodeToString(
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
          rotation: degreesToRadians(this.validateNumber(mapObject.rotation)),
          collision_layer: mapObject.property("godot:collision_layer"),
          collision_mask: mapObject.property("godot:collision_mask"),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );
    this.nodeList.push(area2DNode);

    const subResource = this.createSubResource(
      SubResource.RectangleShape2D,
      { size: `Vector2(${size.width}, ${size.height})` },
    );

    this.subResourceList.push(subResource);
    
    const area2DName = mapObject.name || "Area2D";
    const collisionShapeNode = convertNodeToString(
      {
        name: "CollisionShape2D",
        type: "CollisionShape2D",
        parent: `${parentLayerPath}/${layer.name}/${area2DName}`,
      },
      this.merge_properties(
        {},
        { shape: `SubResource("${subResource.id}")` },
      ),
      {},
    );
    this.nodeList.push(collisionShapeNode);
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

    const area2DNode = convertNodeToString(
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
          rotation: degreesToRadians(this.validateNumber(mapObject.rotation)),
          collision_layer: mapObject.property("godot:collision_layer"),
          collision_mask: mapObject.property("godot:collision_mask"),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );
    this.nodeList.push(area2DNode);

    let polygonPoints = mapObject.polygon.map(point => `${point.x}, ${point.y}`).join(', ');
    
    const area2DName = mapObject.name || "Area2D";
    const collisionShapeNode = convertNodeToString(
      {
        name: "CollisionPolygon2D",
        type: "CollisionPolygon2D",
        parent: `${parentLayerPath}/${layer.name}/${area2DName}`,
      }, 
      this.merge_properties(
        {},
        {
          build_mode: this.validateNumber(buildMode),
          polygon: `PackedVector2Array(${polygonPoints})`,
        },
      ),
      {},
    );
    this.nodeList.push(collisionShapeNode);
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

    const area2DNode = convertNodeToString(
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
          rotation: degreesToRadians(this.validateNumber(mapObject.rotation)),
          collision_layer: mapObject.property("godot:collision_layer"),
          collision_mask: mapObject.property("godot:collision_mask"),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );
    this.nodeList.push(area2DNode);

    const subResource = this.createSubResource(
      SubResource.CircleShape2D,
      { radius: radius.toFixed(1) },
    );

    this.subResourceList.push(subResource);
    
    const area2DName = mapObject.name || "Area2D";
    const collisionShapeNode = convertNodeToString(
      {
        name: "CollisionShape2D",
        type: "CollisionShape2D",
        parent: `${parentLayerPath}/${layer.name}/${area2DName}`,
      }, 
      this.merge_properties(
        {},
        { shape: `SubResource("${subResource.id}")` },
      ),
      {},
    );
    this.nodeList.push(collisionShapeNode);
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

    const node = convertNodeToString(
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
          rotation: degreesToRadians(this.validateNumber(mapObject.rotation)),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );
    this.nodeList.push(node);
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
        if (value == "") {
          continue;
        }

        const externalResource = this.createExternalResource(ExternalResource.Script, value);
        set_props["script"] = `ExtResource("${externalResource.id}")`;

        this.externalResourceList.push(externalResource);
        continue;
      }

      if(key.startsWith("godot:resource:")) {
        if (value == "") {
          continue;
        }

        const externalResource = this.createExternalResource(ExternalResource.Resource, value);
        set_props[key.substring(15)] = `ExtResource("${externalResource.id}")`;

        this.externalResourceList.push(externalResource);
      }
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
   *   packedIntArrayString: string,
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
              packedIntArrayString: "",
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
          
          tileset.packedIntArrayString += `${cellID}, ${srcX}, ${srcY}, `;
        }
      }
    }

    // Remove trailing commas and blank
    tilesetList.forEach(tileset => {
      tileset.packedIntArrayString = tileset.packedIntArrayString.replace(/,\s*$/, "");
    });

    for (let idx = 0; idx < tilesetList.length; idx++) {
      const current = tilesetList[idx];
      
      if (current.tileset === null || current.packedIntArrayString === "") {
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
   * @returns {string} - Serialized scene structure.
   */
  getSceneTemplate() {
    const loadSteps = 1 + this.externalResourceList.length + this.subResourceList.length;
    const type = this.map.property("godot:type") || "Node2D";
    const name = this.map.property("godot:name") || getFileName(this.fileName);
    
    const externalResourcesString = this.formatExternalResourceList();
    const subResourcesString = this.formatSubResourceList();
    const nodeString = this.formatNodeList();

    return `[gd_scene load_steps=${loadSteps} format=3]

${externalResourcesString}
${subResourcesString}
[node name="${name}" type="${type}"]
${nodeString}
`;
  }

  /**
   * Formats the external resources list to fit Godot structure.
   *
   * @returns {string} - Serialized external resources.
   */
  formatExternalResourceList() {
    let externalResourcesString = "";

    for (const externalResource of this.externalResourceList) {
      let uid = "";
      
      if (externalResource.uid != undefined) {
        uid = `uid="${externalResource.uid}" `;
      }

      externalResourcesString += `[ext_resource type="${externalResource.type}" ${uid}path="res://${externalResource.path}" id="${externalResource.id}"]\n`;
    }

    return externalResourcesString;
  }

  /**
   * Formats the subresources list to fit Godot structure.
   *
   * @returns {string} - Serialized subresources.
   */
  formatSubResourceList() {
    let subResourcesString = "";

    for (const subResource of this.subResourceList) {
      subResourcesString += `[sub_resource type="${subResource.type}" id="${subResource.id}"]\n`;
      
      for (const [key, value] of Object.entries(subResource.properties)) {
        if (value !== undefined) {
          const keyValue = stringifyKeyValue(key, value, false, false, true);
          subResourcesString += `${keyValue}\n`;
        }
      }
      subResourcesString += "\n";
    }

    return subResourcesString;
  }

  /**
   * Formats the external resources list to fit Godot structure.
   *
   * @returns {string} - Serialized external resources.
   */
  formatNodeList() {
    return this.nodeList.join("");
  }

  /**
   * Creates an external resource.
   * 
   * @param {string} type - The type of subresource.
   * @param {string} path - Path of the external resource file.
   * @returns {object} - The created external resource.
   */
  createExternalResource(type, path) {
    if (typeof type !== 'string') {
      throw new TypeError('type must be a string');
    }

    // Strip leading slashes to prevent invalid triple slashes in Godot res:// path:
    path = path.replace(/^\/+/, '');
    const uid = undefined;
    
    const externalResource = {
      type: type,
      path: path,
      id: this.externalResourceID,
      uid: uid,
    };

    this.externalResourceID += 1;

    return externalResource;
  }

  /**
   * Creates a new subresource.
   *
   * @param {string} type - The type of subresource.
   * @param {object} contentProperties - Key-value map of properties.
   * @returns {object} - The created sub resource.
   */
  createSubResource(type, properties) {
    if (typeof type !== 'string') {
      throw new TypeError('type must be a string');
    }
    if (typeof properties !== 'object' || properties === null) {
      throw new TypeError('properties must be a non-null object');
    }

    const subResource = {
      type: type,
      id: this.subResourceID,
      properties: properties,
    };

    this.subResourceID += 1;

    return subResource;
  }

  /**
   * Template for a tilemap node
   * @param {string} tileMapName
   * @param {number} mode
   * @param {number} tilesetID
   * @param {string} packedIntArrayString
   * @param {Layer} layer
   * @param {string} parent
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @returns {string}
   */
  getTileMapTemplate(tileMapName, mode, tilesetID, packedIntArrayString, layer, parent = ".", groups) {
    const properties = layer.properties();

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
          tile_set: `ExtResource("${tilesetID}")`,
          format: 2,
          // TileMap properties
          rendering_quadrant_size: this.validateNumber(properties['rendering_quadrant_size'], 16),
          collision_animatable: this.validateBool(properties['collision_animatable']),
          collision_visibility_mode: this.validateNumber(properties['collision_visibility_mode']),
          navigation_visibility_mode: this.validateNumber(properties['navigation_visibility_mode']),
          // Layers properties
          tile_data: `PackedInt32Array(${packedIntArrayString})`,
          mode: mode,
          // cell_size: `Vector2(${layer.map.tileWidth}, ${layer.map.tileHeight})`,
          // cell_custom_transform: `Transform2D(16, 0, 0, 16, 0, 0)`,
          // layer_0/name: undefined,//"layer",
          // layer_0/enabled: undefined,//true,
          // layer_0/modulate: undefined,//`Color(1, 1, 1, ${layer.opacity})`,
          // layer_0/y_sort_enabled: undefined,//false
          // layer_0/y_sort_origin: undefined,//0
          // layer_0/z_index: undefined,//0
          // layer_0/navigation_enabled: undefined,//true
          // Node2D properties
          position: this.validateVector2(layer.offset),
          rotation: degreesToRadians(this.validateNumber(properties['rotation'])),
          // scale: this.validateVector2(properties['scale'], { x: 1, y: 1 }),
          skew: this.validateNumber(properties['skew']),
          // CanvasItem properties
          visible: this.validateBool(layer.visible, true),
          show_behind_parent: this.validateBool(properties['show_behind_parent']),
          top_level: this.validateBool(properties['top_level']),
          clip_children: this.validateNumber(properties['clip_children']),
          light_mask: this.validateNumber(properties['light_mask'], 1),
          visibility_layer: this.validateNumber(properties['visibility_layer'], 1),
          z_index: this.validateNumber(properties['z_index']),
          z_as_relative: this.validateBool(properties['z_as_relative']),
          y_sort_enabled: this.validateBool(properties['y_sort_enabled'], true),
          texture_filter: this.validateNumber(properties['texture_filter']),
          texture_repeat: this.validateNumber(properties['texture_repeat']),
        }
      ),
      this.meta_properties(layer.properties()),
    );
  }

  validateString(value, defaultValue = "")
  {
    if (typeof value === 'string' && value !== defaultValue) {
      return value;
    }
    return undefined;
  }

  validateBool(value, defaultValue = false)
  {
    if (typeof value === 'boolean' && value !== defaultValue) {
      return value;
    }
    return undefined;
  }

  validateNumber(value, defaultValue = 0)
  {
    const parsedValue = parseInt(value, 10);

    if (typeof value === 'number' && value !== defaultValue && !isNaN(parsedValue)) {
      return value;
    }
    return undefined;
  }

  validateVector2(value, defaultValue = { x: 0, y: 0 })
  {
    if (typeof value === 'object' && value.x != defaultValue.x & value.y != defaultValue.y) {
      return `Vector2(${value.x}, ${value.y})`;
    }
    return undefined;
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
  PackedScene: "PackedScene",
  Resource: "Resource",
  Script: "Script",
  Texture: "Texture",
  TileSet: "TileSet",
};

const SubResource = {
  RectangleShape2D: "RectangleShape2D",
  CircleShape2D: "CircleShape2D",
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

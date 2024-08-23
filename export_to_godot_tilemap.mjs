import { resolvePath, getUID, getFileName, getResPath, convertNodeToString, splitCommaSeparatedString, getTilesetColumns, getAreaCenter, getRotation, validateNumber, validateBool, validateVector2, roundToDecimals } from './utils.mjs';
import { ExternalResource } from './models/external_resource.mjs';
import { ExternalResourceType } from './enums/external_resource_type.mjs';
import { MapObjectShape } from './enums/map_object_shape.mjs';
import { Node as GDNode } from './models/node.mjs';
import { PolygonBuildMode } from './enums/polygon_build_mode.mjs';
import { Scene } from './models/scene.mjs';
import { SubResource } from './models/subresource.mjs';
import { SubResourceType } from './enums/subresource_type.mjs';
import { TileMapLayer } from './models/tile_map_layer.mjs';

// /**
//   * @class LayerData
//   * @property {string} name
//   * @property {Tileset} tileset
//   * @property {number?} tilesetID
//   * @property {number} tilesetColumns
//   * @property {Layer} layer
//   * @property {boolean} isEmpty
//   * @property {string} packedByteArrayString
//   * @property {string} parent
//   */
// class LayerData { }

/**
 * @class GodotTilemapExporter
 * @property {TileMap} map - 
 * @property {string} fileName 
 * @property {Vector2} scale - The scale of the node in 2D space.
 * @property {number} skew - The skew of the node.
 */
class GodotTilemapExporter {
  /**
   * Constructs a new instance of the tilemap exporter
   * @param {TileMap} map the tilemap to export
   * @param {string} fileName path of the file the tilemap should be exported to
   */
  constructor(map, fileName) {
    this.map = map;
    this.fileName = fileName;
    this.scene = new Scene();
    this.externalResourceID = 0;
    this.subResourceID = 0;

    /**
     * Tiled doesn't have tileset ID so we create a map
     * Tileset name to generated tilesetId.
     */
    this.tilesetIndexMap = new Map();

    /**
     * Godot TileMapLayer has only one Tileset.
     * Each layer is Tilemap and is mapped to a single Tileset.
     * !!! Important !!
     * Do not add tiles from different tilesets in single layer.
     */
    this.layersToTilesetIndex = new Map();
  };

  write() {
    this.determineTilesets();
    this.determineNodes();
    this.saveToFile();

    tiled.log(`Map exported successfully to ${this.fileName}`);
  }

  /**
   * Generate a string with all tilesets in the map.
   * Godot supports several image textures per tileset but Tiled Editor doesn't.
   * Tiled editor supports only one tile sprite image per tileset.
   */
  determineTilesets() {
    for (const tileset of this.map.tilesets) {
      this.tilesetIndexMap.set(tileset.name, this.externalResourceID);
      
      // let tilesetPath = getResPath(tileset.property("godot:projectRoot"), tileset.property("godot:relativePath"), tileset.asset.fileName.replace('.tsx', '.tres'));
      const tilesetPath = tileset.property("godot:resPath");

      const externalResource = this.registerExternalResource(ExternalResourceType.TileSet, tilesetPath);

      if (externalResource == null) {
        continue;
      }

      this.scene.externalResourceList.push(externalResource);
    }
  }

  /**
   * Creates the Tilemap nodes. One Tilemap per one layer from Tiled.
   */
  determineNodes() {
    const isIsometric = this.map.orientation === TileMap.Isometric;
    const mode = isIsometric ? 1 : undefined;
    
    const name = this.map.property("godot:name") || getFileName(this.fileName);
    const rootNode = new GDNode({
      name,
      owner: null,
    });
    
    for (const layer of this.map.layers) {
      // Maybe create a root node to work as parent
      this.handleLayer(layer, mode, ".", rootNode);
    }
  }

  /**
   * Handle exporting a single layer.
   * @param {Layer} layer - The target layer.
   * @param {number} mode - The layer mode.
   * @param {string} parentPath - The parent path.
   * @param {Node} parentNode - The parent node.
   */
  handleLayer(layer, mode, parentPath, node) {
    const groups = splitCommaSeparatedString(layer.property("godot:groups"));
    tiled.log(`Node ${layer.name}: ${node.name}`);
    if (layer.isTileLayer) {
      this.handleTileLayer(layer, mode, parentPath, groups, node);
      return;
    }
    if (layer.isObjectLayer) {
      this.handleObjectGroup(layer, parentPath, groups, node);
      return;
    }
    if (layer.isGroupLayer) {
      this.handleGroupLayer(layer, parentPath, groups, node);
    }
  }

  /**
   * Handle exporting a tile layer.
   * @param {TileLayer} tileLayer - The target layer.
   * @param {string} parentPath - The parent path.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {Node} owner - The owner node.
   */
  handleTileLayer(tileLayer, parentLayerPath, groups, owner) {
    const layerDataList = this.getLayerDataList(tileLayer);

    for (const layerData of layerDataList) {
      if (layerData.isEmpty) continue;

      this.mapLayerToTileset(layerData);

      const tilemapLayerNode = this.getTileMapLayerTemplate(layerData, tileLayer, parentLayerPath, groups);

      this.scene.nodeListString.push(tilemapLayerNode);

      const node = new GDNode({
        name: tileLayer.name,
        owner,
      });
      this.scene.nodeList.push(node);
    }
  }

  /**
   * Handle exporting an object group.
   * @param {ObjectGroup} objectGroup - The target layer.
   * @param {string} parentPath - The parent path.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {Node} owner - The owner node.
   */
  handleObjectGroup(objectGroup, parentLayerPath, layerGroups, owner) {
    const node = convertNodeToString({
      name: objectGroup.name,
      type: "Node2D",
      parent: parentLayerPath,
      groups: layerGroups,
    });
    this.scene.nodeListString.push(node);

    for (const mapObject of objectGroup.objects) {
      const mapObjectGroups = splitCommaSeparatedString(mapObject.property("godot:groups"));
      
      if (mapObject.tile) {
        this.generateTileNode(objectGroup, parentLayerPath, mapObject, mapObjectGroups);
        continue;
      }

      this.generateNode(objectGroup, parentLayerPath, mapObject, mapObjectGroups);

      const foo = new GDNode({
        name: mapObject.name,
        owner,
      });
      this.scene.nodeList.push(foo);
    }
  }

  /**
   * Handle exporting a group layer.
   * @param {GroupLayer} groupLayer - The target layer.
   * @param {string} parentPath - The parent path.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {Node} owner - The owner node.
   */
  handleGroupLayer(groupLayer, mode, parentLayerPath, groups, owner) {
    const nodeType = groupLayer.property("godot:type") || "Node2D";
    const nodeString = convertNodeToString(
      {
        name: groupLayer.name,
        type: nodeType,
        parent: parentLayerPath,
        groups: groups,
      },
      this.merge_properties(groupLayer.properties(), {}),
      this.meta_properties(groupLayer.properties()),
    );
    this.scene.nodeListString.push(nodeString);

    const node = new GDNode({
      name: groupLayer.name,
      owner,
    });
    this.scene.nodeList.push(node);

    for (const layer of groupLayer.layers) {
      const layerPath = parentLayerPath === "." ? groupLayer.name : `${parentLayerPath}/${groupLayer.name}`;
      this.handleLayer(layer, mode, layerPath, node);
    }
  }

  /**
   * Generates a Tile node.
   * @param {ObjectGroup} objectGroup - The group containing the tile.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - An object that can be part of an ObjectGroup.
   */
  generateTileNode(objectGroup, parentLayerPath, mapObject, groups) {
    const tilesetsIndexKey = `${mapObject.tile.tileset.name}_Image`;
    let textureResourceID = 0;

    if (!this.tilesetIndexMap.get(tilesetsIndexKey)) {
      textureResourceID = this.externalResourceID;
      this.tilesetIndexMap.set(tilesetsIndexKey, this.externalResourceID);

      const tilesetPath = getResPath(
        this.map.property("godot:projectRoot"),
        this.map.property("godot:relativePath"),
        mapObject.tile.tileset.imageFileName,
      );

      const externalResource = this.registerExternalResource(ExternalResourceType.Texture, tilesetPath);

      if (externalResource == null) {
        return;
      }

      this.scene.externalResourceList.push(externalResource);
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
        parent: `${parentLayerPath}/${objectGroup.name}`,
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
      this.meta_properties(objectGroup.properties()),
    );
    this.scene.nodeListString.push(node);
  }

  /**
   * Generates a node.
   * @param {ObjectGroup} objectGroup - The group containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - An object that can be part of an ObjectGroup.
   * @param {Array<string>} groups - The groups this Node belongs to.
   */
  generateNode(objectGroup, parentLayerPath, mapObject, groups) {
    switch (mapObject.shape) {
      case MapObjectShape.Rectangle:
        this.generateRectangle(objectGroup, parentLayerPath, mapObject, groups);
        break;
      case MapObjectShape.Polygon:
        this.generatePolygon(objectGroup, parentLayerPath, mapObject, groups, PolygonBuildMode.Polygon);
        break;
      case MapObjectShape.Polyline:
        this.generatePolygon(objectGroup, parentLayerPath, mapObject, groups, PolygonBuildMode.Polyline);
        break;
      case MapObjectShape.Ellipse:
        this.generateEllipse(objectGroup, parentLayerPath, mapObject, groups);
        break;
      case MapObjectShape.Point:
        this.generatePoint(objectGroup, parentLayerPath, mapObject, groups);
        break;
    }
  }

  /**
   * Generates a Area2D node with a rectangle shape.
   * @param {ObjectGroup} objectGroup - The group containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   */
  generateRectangle(objectGroup, parentLayerPath, mapObject, groups) {
    const name = mapObject.name || "Area2D";
    const position = { x: mapObject.x, y: mapObject.y };
    const size = {
      width: mapObject.width,
      height: mapObject.height,
    };
    
    const center = getAreaCenter(position, size, mapObject.rotation);

    const area2DNode = convertNodeToString(
      {
        name: name,
        type: "Area2D",
        parent: `${parentLayerPath}/${objectGroup.name}`,
        groups: groups,
      },
      this.merge_properties(
        mapObject.properties(),
        {
          position: `Vector2(${center.x}, ${center.y})`,
          rotation: getRotation(mapObject.rotation),
          collision_layer: mapObject.property("godot:collision_layer"),
          collision_mask: mapObject.property("godot:collision_mask"),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );
    this.scene.nodeListString.push(area2DNode);

    const subResource = this.registerSubResource(
      SubResourceType.RectangleShape2D,
      { size: `Vector2(${size.width}, ${size.height})` },
    );

    this.scene.subResourceList.push(subResource);
    
    const area2DName = mapObject.name || "Area2D";
    const collisionShapeNode = convertNodeToString(
      {
        name: "CollisionShape2D",
        type: "CollisionShape2D",
        parent: `${parentLayerPath}/${objectGroup.name}/${area2DName}`,
      },
      this.merge_properties(
        {},
        { shape: `SubResource("${subResource.id}")` },
      ),
      {},
    );
    this.scene.nodeListString.push(collisionShapeNode);
  }
  
  /**
   * Generates a Area2D node with a polygon shape.
   * @param {ObjectGroup} objectGroup - The group containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {PolygonBuildMode} buildMode - Whether the mode of the polygon should be solid or just use lines for collision.
   */
  generatePolygon(objectGroup, parentLayerPath, mapObject, groups, buildMode) {
    const name = mapObject.name || "Area2D";
    const position = { x: mapObject.x, y: mapObject.y };
    const size = {
      width: mapObject.width,
      height: mapObject.height,
    };
    
    const center = getAreaCenter(position, size, mapObject.rotation);

    const area2DNode = convertNodeToString(
      {
        name: name,
        type: "Area2D",
        parent: `${parentLayerPath}/${objectGroup.name}`,
        groups: groups,
      }, 
      this.merge_properties(
        mapObject.properties(),
        {
          position: `Vector2(${center.x}, ${center.y})`,
          rotation: getRotation(mapObject.rotation),
          collision_layer: mapObject.property("godot:collision_layer"),
          collision_mask: mapObject.property("godot:collision_mask"),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );
    this.scene.nodeListString.push(area2DNode);

    let polygonPoints = mapObject.polygon.map(point => `${point.x}, ${point.y}`).join(', ');
    
    const area2DName = mapObject.name || "Area2D";
    const collisionShapeNode = convertNodeToString(
      {
        name: "CollisionPolygon2D",
        type: "CollisionPolygon2D",
        parent: `${parentLayerPath}/${objectGroup.name}/${area2DName}`,
      }, 
      this.merge_properties(
        {},
        {
          build_mode: validateNumber(buildMode),
          polygon: `PackedVector2Array(${polygonPoints})`,
        },
      ),
      {},
    );
    this.scene.nodeListString.push(collisionShapeNode);
  }

  /**
   * Generates a Area2D node with a polyline shape.
   * @param {ObjectGroup} objectGroup - The group containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   */
  generateEllipse(objectGroup, parentLayerPath, mapObject, groups) {
    const name = mapObject.name || "Area2D";
    const position = { x: mapObject.x, y: mapObject.y };
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
        parent: `${parentLayerPath}/${objectGroup.name}`,
        groups: groups,
      }, 
      this.merge_properties(
        mapObject.properties(),
        {
          position: `Vector2(${center.x}, ${center.y})`,
          rotation: getRotation(mapObject.rotation),
          collision_layer: mapObject.property("godot:collision_layer"),
          collision_mask: mapObject.property("godot:collision_mask"),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );
    this.scene.nodeListString.push(area2DNode);

    const subResource = this.registerSubResource(
      SubResourceType.CircleShape2D,
      { radius: radius.toFixed(2).replace(/\.?0+$/, "") },
    );

    this.scene.subResourceList.push(subResource);
    
    const area2DName = mapObject.name || "Area2D";
    const collisionShapeNode = convertNodeToString(
      {
        name: "CollisionShape2D",
        type: "CollisionShape2D",
        parent: `${parentLayerPath}/${objectGroup.name}/${area2DName}`,
      }, 
      this.merge_properties(
        {},
        { shape: `SubResource("${subResource.id}")` },
      ),
      {},
    );
    this.scene.nodeListString.push(collisionShapeNode);
  }

  /**
   * Generates a Point.
   * @param {ObjectGroup} objectGroup - The group containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {MapObject} mapObject - The object representing the Node2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   */
  generatePoint(objectGroup, parentLayerPath, mapObject, groups) {
    const name = mapObject.name || "Node2D";
    const type = mapObject.property("godot:type") || "Node2D";
    const position = { x: roundToDecimals(mapObject.x), y: roundToDecimals(mapObject.y) };

    const node = convertNodeToString(
      {
        name: name,
        type: type,
        parent: `${parentLayerPath}/${objectGroup.name}`,
        groups: groups,
      },
      this.merge_properties(
        mapObject.properties(),
        {
          position: `Vector2(${position.x}, ${position.y})`,
          rotation: getRotation(mapObject.rotation),
        },
      ),
      this.meta_properties(mapObject.properties()),
    );
    this.scene.nodeListString.push(node);
  }

  /**
   * Prepare properties for a Godot node.
   * @param {TiledObjectProperties} object_props - Properties from the layer.
   * @param {TiledObjectProperties} set_props - The base properties for the node.
   * @returns {TiledObjectProperties} - The merged property set for the node.
   */
  merge_properties(object_props, set_props) {
    // Create a map for processing properties efficiently
    const propertyMap = new Map();

    // Process each entry once
    for (const [key, value] of Object.entries(object_props)) {
      if (value === "") {
        continue;
      }

      // Determine the type of property based on the key prefix
      switch (true) {
        case key.startsWith("godot:node:"):
          propertyMap.set(key, { type: 'node', value: value });
          continue;
        case key.startsWith("godot:script"):
          propertyMap.set("godot:script", { type: 'script', value: value });
          continue;
        case key.startsWith("godot:resource:"):
          propertyMap.set(key, { type: 'resource', value: value });
          continue;
        case key.startsWith("godot:var:"):
          propertyMap.set(key, { type: 'var', value: value });
          continue;
        default:
          // Ignore unsupported or unknown keys
          break;
      }
    }

    // Handle node properties
    propertyMap.forEach((entry, key) => {
      if (entry.type === 'node') {
        set_props[key.substring("godot:node:".length)] = entry.value;
      }
    });

    // Handle tilemap properties
    if (set_props['layers'] !== undefined) {
      for (const [key, value] of Object.entries(set_props['layers'][0])) {
        set_props[`layer_0/${key}`] = value;
      }
    }

    // Handle script properties
    const scriptEntry = propertyMap.get("godot:script");
    if (scriptEntry) {
      const externalResource = this.registerExternalResource(ExternalResourceType.Script, scriptEntry.value);
      
      if (externalResource == null) {
        return;
      }

      set_props["script"] = `ExtResource("${externalResource.id}")`;

      this.scene.externalResourceList.push(externalResource);
    }

    // Handle other script variables
    propertyMap.forEach((entry, key) => {
      if (entry.type === 'var') {
        set_props[key.substring("godot:var:".length)] = entry.value;
      }
    });
    
    // Handle resource properties
    propertyMap.forEach((entry, key) => {
      if (entry.type === 'resource') {
        if (entry.value == undefined || entry.value == "") {
          tiled.log("ops");
        }
        const externalResource = this.registerExternalResource(ExternalResourceType.Resource, entry.value);
        
        if (externalResource == null) {
          return;
        }

        set_props[key.substring("godot:resource:".length)] = `ExtResource("${externalResource.id}")`;

        this.scene.externalResourceList.push(externalResource);
      }
    });

    set_props['layers'] = undefined;

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
   * Creates all the tiles coordinates for a layer.
   * Each element in the retuned array corresponds to the tile coordinates for each of
   * the tilesets used in the layer.
   * @param {TileLayer} layer the target layer
   * @returns {LayerData[]} the data about the tilesets used in the target layer
   */
  getLayerDataList(layer) {
    if (layer.name != "Tile Layer 9")
      return [];
    let layerBounds = layer.region().boundingRect;

    const layerDataList = [];
    
    for (let y = layerBounds.top; y <= layerBounds.bottom; ++y) {
      for (let x = layerBounds.left; x <= layerBounds.right; ++x) {
        let cell = layer.cellAt(x, y);
        
        if (cell.empty) continue;

        const tile = layer.tileAt(x, y);

        // Determine whether this tile's tileset is already registered;
        let layerData = layerDataList.find(layer => layer.tileset === tile.tileset);
        const isTilesetRegistered = layerData !== undefined;

        if (!isTilesetRegistered) {
          const var1 = 0;
          const var2 = 0;

          layerData = {
            name: layer.name || `Layer ${layer.id}`,
            tileset: tile.tileset,
            tilesetID: null,
            tilesetColumns: getTilesetColumns(tile.tileset),
            packedByteArrayString: `${var1}, ${var2}, `,
            empty: true,
            parent: layerDataList.length === 0 ? "." : layer.name,
          };

          layerDataList.push(layerData);
        }

        const sourceID = 0;
        const tileAtlasX = tile.imageRect.x / tile.tileset.tileWidth;
        const tileAtlasY = tile.imageRect.y / tile.tileset.tileHeight;
        const alternativeTileID = 0;
        const tileFlipFlag = 0;

        layerData.packedByteArrayString += `${x}, ${0}, ${y}, ${0}, ` +
                                           `${sourceID}, ${0}, ` +
                                           `${tileAtlasX}, ${0}, ${tileAtlasY}, ${0}, ` +
                                           `${alternativeTileID}, ${tileFlipFlag}, `;
      }
    }

    // Remove trailing commas and blank
    layerDataList.forEach(layerData => {
      layerData.packedByteArrayString = layerData.packedByteArrayString.replace(/,\s*$/, "");
    });
    
    for (const layerData of layerDataList) {
      if (layerData.tileset === null || layerData.packedByteArrayString === "") {
        tiled.log(`Error: The layer ${layer.name} is empty and has been skipped!`);
        continue;
      }

      layerData.tilesetID = this.getTilesetIDByTileset(layerData.tileset);
    }

    return layerDataList;
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

    const serializedScene = this.scene.serializeToGodot(this.map, this.fileName);

    file.write(serializedScene);
    file.commit();
  }

  /**
   * Register an external resource.
   * 
   * @param {ExternalResourceType} type - The type of subresource.
   * @param {string} filePath - Path of the external resource file relative to the project.
   * @returns {ExternalResource} - The created external resource.
   */
  registerExternalResource(type, filePath) {
    if (typeof type !== 'string') {
      throw new TypeError('type must be a string');
    }

    // Strip leading slashes to prevent invalid triple slashes in Godot res:// path:
    filePath = filePath.replace(/^\/+/, '');
    const absolutePath = resolvePath(filePath);

    if (!File.exists(absolutePath)) {
      // TODO Create function to export tileset;
      // this.createExternalResource();
      return null;
    }

    const uid = getUID(absolutePath);

    const externalResource = new ExternalResource({
      type,
      path: filePath,
      id: this.externalResourceID,
      uid,
    });

    this.externalResourceID += 1;

    return externalResource;
  }

  /**
   * Registers a new subresource.
   *
   * @param {string} type - The type of subresource.
   * @param {object} contentProperties - Key-value map of properties.
   * @returns {SubResource} - The created subresource.
   */
  registerSubResource(type, properties) {
    if (typeof type !== 'string') {
      throw new TypeError('type must be a string');
    }
    if (typeof properties !== 'object' || properties === null) {
      throw new TypeError('properties must be a non-null object');
    }

    const subResource = new SubResource({
      type,
      id: this.subResourceID,
      properties,
    });

    this.subResourceID += 1;

    return subResource;
  }

  /**
   * Template for a TileMapLayer node
   * @param {LayerData} layerData
   * @param {Layer} layer
   * @param {string} parent
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @returns {string}
   */
  getTileMapLayerTemplate(layerData, layer, parent = ".", groups) {
    return convertNodeToString(
      {
        name: layerData.name,
        type: "TileMapLayer",
        parent: parent,
        groups: groups,
      }, 
      this.merge_properties(
        layer.properties(),
        {
          use_parent_material: true,
          tile_map_data: `PackedByteArray(${layerData.packedByteArrayString})`,
          tile_set: `ExtResource("${layerData.tilesetID}")`,
        }
      ),
      this.meta_properties(layer.properties()),
    );
  }

  mapLayerToTileset(layerData) {
    this.layersToTilesetIndex[layerData.name] = layerData.tilesetID;
  }
}

const FlippedState = Object.freeze({
  FlippedH: 1 << 12,
  FlippedV: 2 << 13,
  Transposed: 4 << 14
});

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

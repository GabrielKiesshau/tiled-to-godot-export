import { getResPath, stringifyKeyValue, convertNodeToString, splitCommaSeparatedString, getTilesetColumns, getFileName } from './utils.mjs';

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
    this.tileOffset = 65536;
    this.tilemapNodeString = "";
    this.tilesetResourceString = "";
    this.subResourcesString = "";
    this.externalResourceID = 0;
    this.subResourceId = 0;

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

    const id = this.subResourceId++;
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
   * Generate a string with all tilesets in the map.
   * Godot supports several image textures per tileset but Tiled Editor doesn't.
   * Tiled editor supports only one tile sprite image per tileset.
   */
  setTilesetsString() {
    // noinspection JSUnresolvedVariable
    for (let index = 0; index < this.map.tilesets.length; ++index) {
      // noinspection JSUnresolvedVariable
      const tileset = this.map.tilesets[index];
      this.externalResourceID = index + 1;
      this.tilesetIndexMap.set(tileset.name, this.externalResourceID);
      // noinspection JSUnresolvedFunction
      // let tilesetPath = getResPath(tileset.property("projectRoot"), tileset.property("relativePath"), tileset.asset.fileName.replace('.tsx', '.tres'));
      let tilesetPath = tileset.property("resPath");
      this.tilesetResourceString += this.getTilesetResourceTemplate(this.externalResourceID, tilesetPath, "TileSet");
    }
  }

  /**
   * Creates the Tilemap nodes. One Tilemap per one layer from Tiled.
   */
  setTileMapsString() {
    const isIsometric = this.map.orientation === TileMap.Isometric;
    const mode = isIsometric ? 1 : undefined
    
    // noinspection JSUnresolvedVariable
    for (let layerIndex = 0; layerIndex < this.map.layerCount; ++layerIndex) {
      // noinspection JSUnresolvedFunction
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
    // noinspection JSUnresolvedVariable
    if (layer.isTileLayer) {
      this.handleTileLayer(layer, mode, parentLayerPath);
      return;
    }
    if (layer.isObjectLayer) {
      this.handleObjectLayer(layer, mode, parentLayerPath);
      return;
    }
    if (layer.isGroupLayer) {
      this.handleGroupLayer(layer, mode, parentLayerPath);
    }
  }

  handleTileLayer(layer, mode, parentLayerPath) {
    const layerDataList = this.getLayerDataList(layer);

    for (const layerData of layerDataList) {
      if (!layerData.isEmpty) {
        const layerName = layer.name || `TileMap ${layer.id}`;
        const tilesetName = layerData.tileset.name || `TileSet ${layerData.tilesetID}`;
        const tileMapName = `${layerName} - ${tilesetName}`;
        this.mapLayerToTileset(layer.name, layerData.tilesetID);
        this.tilemapNodeString += this.getTileMapTemplate(tileMapName, mode, layerData.tilesetID, layerData.poolIntArrayString, layer, parentLayerPath);
      }
    }
  }

  handleObjectLayer(layer, mode, parentLayerPath) {
    this.tilemapNodeString += convertNodeToString({
      name: layer.name,
      type: "Node2D",
      parent: parentLayerPath,
      groups: splitCommaSeparatedString(layer.property("groups"))
    });

    for (const object of layer.objects) {
      const groups = splitCommaSeparatedString(object.property("groups"));

      if (object.tile) {
        this.generateTileNode(layer, parentLayerPath, object);
        continue;
      }
      if (object.className == "Area2D" && object.width && object.height) {
        this.generateArea2DNode(layer, parentLayerPath, object, groups);
        continue;
      }
      if (object.className == "Node2D") {
        this.generateNode2D(layer, parentLayerPath, object, groups);
      }
    }
  }

  handleGroupLayer(layer, mode, parentLayerPath) {
    const node_type = layer.property("godot:type") || "Node2D";
    this.tilemapNodeString += convertNodeToString(
      {
        name: layer.name,
        type: node_type,
        parent: parentLayerPath,
        groups: splitCommaSeparatedString(layer.property("groups"))
      }, 
      this.merge_properties(layer.properties(), {}),
      this.meta_properties(layer.properties())
    );

    for(let i = 0; i < layer.layerCount; ++i) { 
      this.handleLayer(layer.layers[i], mode, `${parentLayerPath}/${layer.name}`);
    }
  }

  /**
   * Generates a Tile node.
   * @param {Layer} layer - The layer containing the tile.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {Object} object - The object representing the tile.
   */
  generateTileNode(layer, parentLayerPath, object) {
    const tilesetsIndexKey = `${object.tile.tileset.name}_Image`;
    let textureResourceID = 0;

    if (!this.tilesetIndexMap.get(tilesetsIndexKey)) {
      this.externalResourceID += 1;
      textureResourceID = this.externalResourceID;
      this.tilesetIndexMap.set(tilesetsIndexKey, this.externalResourceID);

      // noinspection JSUnresolvedFunction
      const tilesetPath = getResPath(
        this.map.property("projectRoot"),
        this.map.property("relativePath"),
        object.tile.tileset.image,
      );
      this.tilesetResourceString += this.getTilesetResourceTemplate(this.externalResourceID, tilesetPath, "Texture");
    } else {
      textureResourceID = this.tilesetIndexMap.get(tilesetsIndexKey);
    }

    const tileOffset = this.getTileOffset(object.tile.tileset, object.tile.id);

    // Account for anchoring in Godot (corner vs. middle):
    const objectPositionX = object.x + (object.tile.width / 2);
    const objectPositionY = object.y - (object.tile.height / 2);

    this.tilemapNodeString += convertNodeToString(
      {
        name: object.name || "Sprite2D",
        type: "Sprite2D",
        parent: `${parentLayerPath}/${layer.name}`
      },
      this.merge_properties(
        object.properties(),
        {
          position: `Vector2(${objectPositionX}, ${objectPositionY})`,
          texture: `ExtResource(${textureResourceID})`,
          region_enabled: true,
          region_rect: `Rect2(${tileOffset.x}, ${tileOffset.y}, ${object.tile.width}, ${object.tile.height})`
        }
      ),
      this.meta_properties(layer.properties())
    );
  }

  /**
   * Generates an Area2D node with a rectangle shape.
   * @param {Layer} layer - The layer containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {Object} object - The object representing the Area2D.
   * @param {Array<string>} groups - The groups the Area2D belongs to.
   */
  generateArea2DNode(layer, parentLayerPath, object, groups) {
    // TODO add support for rotation
    const width = object.width / 2;
    const height = object.height / 2;
    const objectPositionX = object.x + width;
    const objectPositionY = object.y + height;

    this.tilemapNodeString += convertNodeToString(
      {
        name: object.name || "Area2D",
        type: "Area2D",
        parent: `${parentLayerPath}/${layer.name}`,
        groups: groups
      }, 
      this.merge_properties(
        object.properties(),
        {
          collision_layer: object.property("collision_layer"),
          collision_mask: object.property("collision_mask")
        }
      ),
      this.meta_properties(object.properties())
    );

    const shapeId = this.addSubResource("RectangleShape2D", {
      extents: `Vector2(${width}, ${height})`
    });
    
    const area2DName = object.name || "Area2D";
    this.tilemapNodeString += convertNodeToString(
      {
        name: "CollisionShape2D",
        type: "CollisionShape2D",
        parent: `${parentLayerPath}/${layer.name}/${area2DName}`
      }, 
      this.merge_properties(
        object.properties(),
        {
          shape: `SubResource(${shapeId})`,
          position: `Vector2(${objectPositionX}, ${objectPositionY})`,
        }
      ),
      {}
    );
  }

  /**
   * Generates a Node2D.
   * @param {Layer} layer - The layer containing the object.
   * @param {string} parentLayerPath - Path of the parent layer.
   * @param {Object} object - The object representing the Node2D.
   * @param {Array<string>} groups - The groups the Node2D belongs to.
   */
  generateNode2D(layer, parentLayerPath, object, groups) {
    this.tilemapNodeString += convertNodeToString(
      {
        name: object.name || "Node2D",
        type: "Node2D",
        parent: `${parentLayerPath}/${layer.name}`,
        groups: groups
      },
      this.merge_properties(
        object.properties(), 
        {
          position: `Vector2(${object.x}, ${object.y})`
        }
      ),
      this.meta_properties(object.properties())
    );
  }

  /**
   * Prepare properties for a Godot node.
   * @param {TiledObjectProperties} object_props - Properties from the layer.
   * @param {TiledObjectProperties} set_props - The base properties for the node.
   * @returns {TiledObjectProperties} - The merged property set for the node.
   */
  merge_properties(object_props, set_props) {
    for (const [key, value] of Object.entries(object_props)) {
      if(key.startsWith("godot:node:")){
        set_props[key.substring(11)] = value;
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
    
  saveToFile() {
    const file = new TextFile(this.fileName, TextFile.WriteOnly);
    const sceneTemplate = this.getSceneTemplate();
    file.write(sceneTemplate);
    file.commit();
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
              parent: tilesetList.length === 0 ? "." : layer.name
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
            tileGodotID = tileX + (tileY * this.tileOffset);
          }

          /**
           * Godot coordinates use an offset of 65536
           * Check the README.md: Godot Tilemap Encoding & Limits
           */
          let cellID = (x >= 0 ? y : y + 1) * this.tileOffset + x;

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
          srcX *= this.tileOffset;
          // srcX += tilesetInfo.atlasID;
          tiled.log(`tilesetInfo.atlasID : ${"tilesetInfo.atlasID"}`);

          let srcY = Math.floor(tileId / tilesetColumns);
          srcY += alt * this.tileOffset;
          
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
      y: (row * tileset.tileHeight) + yOffset
    };
  }

  /**
   * Template for a scene
   * @returns {string}
   */
  getSceneTemplate() {
    const loadSteps = 2 + this.subResourceId;
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
   * Template for a tileset resource
   * @returns {string}
   */
  getTilesetResourceTemplate(id, path, type) {
    // Strip leading slashes to prevent invalid triple slashes in Godot res:// path:
    path = path.replace(/^\/+/, '');

    return `[ext_resource type="${type}" path="res://${path}" id=${id}]`;
  }

  /**
   * Template for a tilemap node
   * @param {string} tileMapName
   * @param {number} mode
   * @param {number} tilesetID
   * @param {string} poolIntArrayString
   * @param {Layer} layer
   * @param {string} parent
   * @returns {string}
   */
  getTileMapTemplate(tileMapName, mode, tilesetID, poolIntArrayString, layer, parent = ".") {
    const groups = splitCommaSeparatedString(layer.property("groups"));
    const zIndex = parseInt(layer.properties()['z_index'], 10);

    return convertNodeToString(
      {
        name: tileMapName,
        type: "TileMap",
        parent: parent,
        groups: groups
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
      this.meta_properties(layer.properties())
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

const FlippedState = {
  FlippedH: 1 << 12,
  FlippedV: 2 << 13,
  Transposed: 4 << 14
};

const customTileMapFormat = {
  name: "Godot Tilemap format",
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

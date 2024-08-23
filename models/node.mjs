/**
 * Represents a generic node in a scene graph.
 * @class Node
 * @property {string} name - The name of the node.
 * @property {GDNode} owner - The owner of this node.
 */
export class Node {
  constructor({
    name = "Node",
    owner = null,
  } = {}) {
    this.name = name;
    this.owner = owner;
  }
}

export interface MiroShape {
  id: string;
  type: string;
  data: {
    type: string;
    content: string;
  };
  position: {
    x: number;
    y: number;
  };
  geometry: {
    width: number;
    height: number;
  };
  style?: {
    fillColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: string;
    textAlign?: string;
    textAlignVertical?: string;
  };
}

export interface MiroBoard {
  id: string;
  name: string;
  description?: string;
  viewLink: string;
  editLink: string;
}

export interface MiroConnector {
  id: string;
  type: string;
  start: {
    item: string;
  };
  end: {
    item: string;
  };
  style?: {
    strokeColor?: string;
    strokeWidth?: number;
    strokeStyle?: string;
  };
}

export interface MindMapNode {
  id: string;
  text: string;
  children?: MindMapNode[];
  position?: {
    x: number;
    y: number;
  };
}

export interface MindMapCreate {
  name: string;
  root_node: MindMapNode;
}

"use client";

import { useEffect } from "react";
import { MindMapNode } from "@/types/miro";

interface InputJsonNode {
  name: string;
  children?: InputJsonNode[];
}

interface MiroNode {
  nodeView: {
    content: string;
  };
  children: MiroNode[];
}

interface MiroMindMapProps {
  boardId: string;
  rootNode: InputJsonNode;
}

declare global {
  interface Window {
    miro: any;
  }
}

export default function MiroMindMap({ boardId, rootNode }: MiroMindMapProps) {
  useEffect(() => {
    const createMindMap = async () => {
      try {
        const miroNode = createGraphFromJson(rootNode);
        await createMindMapNode(miroNode);
      } catch (error) {
        console.error("Error creating mindmap:", error);
      }
    };

    createMindMap();
  }, [boardId, rootNode]);

  const createGraphFromJson = (json: InputJsonNode): MiroNode => {
    const visited: Record<string, MiroNode> = {};

    const walk = (node: InputJsonNode, path: string[] = []): MiroNode => {
      const key = [...path, node.name].join(" > ");

      if (!visited[key]) {
        const newNode: MiroNode = {
          nodeView: { content: node.name },
          children: [],
        };
        visited[key] = newNode;

        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            const childNode = walk(child, [...path, node.name]);
            newNode.children.push(childNode);
          }
        }
      }

      return visited[key];
    };

    return walk(json);
  };

  const createMindMapNode = async (
    node: MiroNode,
    parentId: string | null = null
  ) => {
    try {
      const mindmapNode =
        await window.miro.board.experimental.createMindmapNode({
          data: {
            nodeView: {
              data: {
                type: "text",
                content: node.nodeView.content,
              },
            },
          },
          ...(parentId && {
            parent: {
              id: parentId,
            },
          }),
        });

      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          await createMindMapNode(child, mindmapNode.id);
        }
      }

      return mindmapNode;
    } catch (error) {
      console.error("Error creating mindmap node:", error);
      throw error;
    }
  };

  return null;
}

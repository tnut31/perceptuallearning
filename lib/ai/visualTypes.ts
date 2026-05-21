export type VisualType =
  | "table"
  | "coordinate_plane"
  | "bar_graph"
  | "number_line"
  | "circle"
  | "rectangle"
  | "triangle";

export type TableVisual = {
  type: "table";
  headers: string[];
  rows: Array<Array<string | number>>;
};

export type CoordinatePlaneVisual = {
  type: "coordinate_plane";
  points: Array<[number, number]>;
};

export type BarGraphVisual = {
  type: "bar_graph";
  categories: string[];
  values: number[];
};

export type NumberLineVisual = {
  type: "number_line";
  start: number;
  end: number;
  highlight?: [number, number] | number[];
};

export type ShapeVisual = {
  type: "circle" | "rectangle" | "triangle";
  labels?: string[];
  measurements?: Record<string, string | number>;
};

export type VisualSpec =
  | TableVisual
  | CoordinatePlaneVisual
  | BarGraphVisual
  | NumberLineVisual
  | ShapeVisual;

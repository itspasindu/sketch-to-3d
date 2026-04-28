export type Point = [number, number];

export interface PolygonWithHoles {
  exterior: Point[];
  holes: Point[][];
}

export interface RoomEntry {
  type: string;
  polygons: PolygonWithHoles[];
}

export interface LayoutResponse {
  id: number;
  unitType?: string;
  scale_m_per_unit: number;
  wall_height_m: number;
  wall_thickness_m: number;
  stats: {
    area?: number;
    net_area?: number;
    neighbor?: unknown;
  };
  walls: PolygonWithHoles[];
  rooms: RoomEntry[];
  openings: {
    doors: PolygonWithHoles[];
    windows: PolygonWithHoles[];
    front_doors: PolygonWithHoles[];
  };
}
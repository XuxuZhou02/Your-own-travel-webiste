// Memory space scenes (product plan, section 4.9). Each user picks one as
// their own space; finished trip albums stand on the shelf in front of it.
//
// Positions are percentages of the 470×1024 picture, so the light
// effects line up with the window, lamp or fire in each picture.

export type SceneEffect = "rain" | "storm" | "snow" | "sun" | "leaves" | "stars";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Glow {
  x: number;
  y: number;
  size: number;
  color: string;
  /** Flicker for flames and candles; slow breathing for lamps. */
  flicker?: boolean;
}

export interface Scene {
  id: string;
  name: string;
  mood: string;
  src: string;
  effect: SceneEffect;
  /** Where the effect plays, usually the window glass (several parts when something stands in front of it). */
  areas: Rect[];
  glows: Glow[];
}

export const SCENES: Scene[] = [
  {
    id: "summer-morning",
    name: "Summer Morning",
    mood: "Sun through linen curtains, an open album on the bed",
    src: "/scenes/summer-morning.jpg",
    effect: "sun",
    areas: [{ left: 18, top: 12, width: 72, height: 58 }],
    glows: [
      { x: 50, y: 30, size: 90, color: "255, 246, 214" },
      { x: 93, y: 82, size: 26, color: "255, 200, 110", flicker: true },
    ],
  },
  {
    id: "autumn-afternoon",
    name: "Autumn Afternoon",
    mood: "Golden woods, a leather sofa, a sleeping cat",
    src: "/scenes/autumn-afternoon.jpg",
    effect: "leaves",
    areas: [{ left: 18, top: 13, width: 66, height: 37 }],
    glows: [
      { x: 50, y: 30, size: 80, color: "255, 214, 140" },
      { x: 92, y: 77, size: 26, color: "255, 200, 110", flicker: true },
    ],
  },
  {
    id: "stormy-evening",
    name: "Stormy Evening",
    mood: "Rain lashing the window, a lamp and a knit blanket",
    src: "/scenes/stormy-evening.jpg",
    effect: "storm",
    areas: [{ left: 18, top: 13, width: 70, height: 36 }],
    glows: [
      { x: 85, y: 33, size: 70, color: "255, 214, 140" },
      { x: 93, y: 80, size: 26, color: "255, 200, 110", flicker: true },
    ],
  },
  {
    id: "winter-fireplace",
    name: "Winter by the Fireplace",
    mood: "Snow outside, a crackling fire, hot cocoa",
    src: "/scenes/winter-fireplace.jpg",
    effect: "snow",
    areas: [{ left: 18, top: 13, width: 70, height: 35 }],
    glows: [
      { x: 13, y: 65, size: 70, color: "255, 150, 60", flicker: true },
      { x: 85, y: 34, size: 60, color: "255, 214, 140" },
      { x: 51, y: 68, size: 22, color: "255, 200, 110", flicker: true },
    ],
  },
  {
    id: "midnight-nostalgia",
    name: "Midnight Nostalgia",
    mood: "An amber lamp, warm milk, a cat asleep on the quilt",
    src: "/scenes/midnight-nostalgia.jpg",
    effect: "stars",
    areas: [{ left: 74, top: 22, width: 24, height: 16 }],
    glows: [{ x: 49, y: 31, size: 80, color: "255, 190, 110" }],
  },
];

export const DEFAULT_SCENE = SCENES[0].id;

export function getScene(id: string | undefined): Scene {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}

/** Spine color for each album theme. */
export const THEME_SPINE: Record<string, string> = {
  film: "#b4643c",
  mist: "#5d7d97",
  ink: "#2f2a25",
};

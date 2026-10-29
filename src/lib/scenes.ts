// Memory space scenes (product plan, section 4.9). Each user picks one as
// their own space; finished trip albums stand on the shelf in front of it.
//
// Positions are percentages of the 470×1024 illustration, so the light
// effects line up with the window, lamp or fire in each picture.

export type SceneEffect = "rain" | "snow" | "sun" | "leaves" | "stars";

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
    id: "rainy-afternoon",
    name: "Rainy Afternoon",
    mood: "Rain on the glass, a knit blanket, a warm lamp",
    src: "/scenes/rainy-afternoon.jpg",
    effect: "rain",
    areas: [{ left: 16, top: 9, width: 60, height: 45 }],
    glows: [{ x: 7, y: 37, size: 70, color: "255, 214, 140" }],
  },
  {
    id: "winter-fireplace",
    name: "Winter by the Fireplace",
    mood: "Snow outside, a crackling fire, hot cocoa",
    src: "/scenes/winter-fireplace.jpg",
    effect: "snow",
    areas: [
      { left: 17, top: 10, width: 56, height: 26 },
      { left: 17, top: 36, width: 28, height: 18 },
    ],
    glows: [
      { x: 83, y: 61, size: 70, color: "255, 150, 60", flicker: true },
      { x: 7, y: 30, size: 55, color: "255, 214, 140" },
    ],
  },
  {
    id: "slow-sunday-morning",
    name: "Slow Sunday Morning",
    mood: "Morning light, white linen, a sleeping cat",
    src: "/scenes/slow-sunday-morning.jpg",
    effect: "sun",
    areas: [{ left: 20, top: 5, width: 70, height: 60 }],
    glows: [{ x: 50, y: 25, size: 90, color: "255, 244, 214" }],
  },
  {
    id: "autumn-cabin-evening",
    name: "Autumn Cabin Evening",
    mood: "Falling leaves, string lights, a vanilla candle",
    src: "/scenes/autumn-cabin-evening.jpg",
    effect: "leaves",
    areas: [{ left: 32, top: 10, width: 55, height: 39 }],
    glows: [
      { x: 89, y: 82, size: 34, color: "255, 200, 110", flicker: true },
      { x: 50, y: 6, size: 90, color: "255, 214, 140" },
    ],
  },
  {
    id: "midnight-nostalgia",
    name: "Midnight Nostalgia",
    mood: "An amber lamp, warm milk, soft jazz",
    src: "/scenes/midnight-nostalgia.jpg",
    effect: "stars",
    areas: [{ left: 77, top: 26, width: 21, height: 15 }],
    glows: [{ x: 52, y: 37, size: 80, color: "255, 190, 110" }],
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

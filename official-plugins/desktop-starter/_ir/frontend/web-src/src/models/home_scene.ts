export interface HomeSceneModel {
  sceneId: "holographic-command-orb";
  defaults: HomeSceneDefaults;
}

export interface HomeSceneDefaults {
  particleSize: number;
  particleColor: string;
  backgroundColor: string;
  coreColor: string;
  waveSpeed: number;
  welcomeText: string;
}

export const defaultHomeScene: HomeSceneModel = {
  sceneId: "holographic-command-orb",
  defaults: {
    particleSize: 1.1, // @iwp.link views/pages/home.md::n.60d1
    particleColor: "#bfdbfe", // @iwp.link views/pages/home.md::n.f0b1
    backgroundColor: "#02040f", // @iwp.link views/pages/home.md::n.30a3
    coreColor: "#93c5fd", // @iwp.link views/pages/home.md::n.2de5
    waveSpeed: 0.74, // @iwp.link views/pages/home.md::n.67fc
    welcomeText: "Hello", // @iwp.link views/pages/home.md::n.87b9
  },
};

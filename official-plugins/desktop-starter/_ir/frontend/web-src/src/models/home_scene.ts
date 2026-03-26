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
    particleSize: 1.1, // @iwp.link views/pages/home.md::n.a6bf
    particleColor: "#bfdbfe", // @iwp.link views/pages/home.md::n.b15c
    backgroundColor: "#02040f", // @iwp.link views/pages/home.md::n.7491
    coreColor: "#93c5fd", // @iwp.link views/pages/home.md::n.dcf9
    waveSpeed: 0.74, // @iwp.link views/pages/home.md::n.2791
    welcomeText: "Hello", // @iwp.link views/pages/home.md::n.33a8
  },
};

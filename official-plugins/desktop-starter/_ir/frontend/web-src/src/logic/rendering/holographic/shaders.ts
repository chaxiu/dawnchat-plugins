export const CORE_VERTEX_SHADER = `
      uniform float uTime;
      uniform float uWaveSpeed;
      uniform vec2 uMouse;
      uniform float uMouseForce;
      uniform vec2 uClick;
      uniform float uClickPulse;
      varying float vWave;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec3 p = position;
        float t = uTime * uWaveSpeed;
        float wave = sin(t * 1.4 + p.y * 7.0 + p.x * 4.0) * 0.03;
        wave += cos(t * 1.2 + p.z * 6.0) * 0.03;
        float mouseDist = distance(p.xy, uMouse * 1.2);
        float mouseInfluence = smoothstep(1.75, 0.12, mouseDist);
        vec2 pullDir = (uMouse * 1.1) - p.xy;
        float pullLen = length(pullDir);
        if (pullLen > 0.0001) {
          vec2 pullNorm = pullDir / pullLen;
          float radial = dot(normalize(p.xy + vec2(0.0001)), pullNorm);
          float bulge = (0.045 + uMouseForce * 0.07) * mouseInfluence * (0.55 + radial * 0.45);
          p += normal * bulge;
        }
        float clickDist = distance(p.xy, uClick * 1.2);
        float clickInfluence = smoothstep(1.35, 0.05, clickDist) * uClickPulse;
        float ripple = sin((1.3 - clickDist) * 16.0 + t * 6.0) * clickInfluence * 0.075;
        p += normal * ripple;
        wave += sin(t * 3.0 + p.x * 9.8 - p.y * 8.6) * (0.06 + uMouseForce * 0.08) * mouseInfluence;
        p += normal * wave;
        vWave = wave + ripple;
        vec4 worldPos = modelMatrix * vec4(p, 1.0);
        vW = worldPos.xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

export const CORE_FRAGMENT_SHADER = `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying float vWave;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec3 v = normalize(cameraPosition - vW);
        float fresnel = pow(1.0 - max(dot(vN, v), 0.0), 2.0);
        vec3 c = mix(uColorA, uColorB, 0.5 + vWave * 8.0);
        c *= (1.05 + fresnel * 1.2);
        float alpha = 0.85;
        gl_FragColor = vec4(c, alpha);
      }
    `;

export const SHELL_VERTEX_SHADER = `
      uniform float uTime;
      uniform float uWaveSpeed;
      varying float vEdge;
      varying vec3 vW;
      void main() {
        vec3 p = position;
        float t = uTime * uWaveSpeed;
        float wave = sin(t + p.y * 4.0) * 0.04;
        p += normal * wave;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vW = wp.xyz;
        vec3 n = normalize(normalMatrix * normal);
        vec3 v = normalize(cameraPosition - wp.xyz);
        vEdge = pow(1.0 - max(dot(n, v), 0.0), 2.5);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;

export const SHELL_FRAGMENT_SHADER = `
      uniform vec3 uColor;
      varying float vEdge;
      varying vec3 vW;
      void main() {
        float strip = 0.5 + 0.5 * sin(vW.y * 12.0);
        float alpha = vEdge * (0.2 + strip * 0.1);
        gl_FragColor = vec4(uColor, alpha);
      }
    `;

export const PARTICLE_VERTEX_SHADER = `
      uniform float uTime;
      uniform float uWaveSpeed;
      uniform float uParticleSize;
      attribute float aPhase;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float t = uTime * uWaveSpeed + aPhase;
        p.y += sin(t * 1.8) * 0.08;
        p.x += cos(t * 0.9) * 0.05;
        p.z += sin(t * 1.2) * 0.05;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (10.0 * aSize * uParticleSize) * (1.0 / -mv.z);
        vAlpha = 0.36 + 0.64 * (0.5 + 0.5 * sin(t * 1.5 + aSize));
      }
    `;

export const PARTICLE_FRAGMENT_SHADER = `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float glow = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor * (1.0 + glow), glow * vAlpha);
      }
    `;

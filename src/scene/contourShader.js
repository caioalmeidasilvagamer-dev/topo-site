import * as THREE from 'three'

/**
 * Topographic contour line shader.
 *
 * Paints the terrain white and draws black contour lines wherever
 * the interpolated vertex height crosses a multiple of `uContourInterval`.
 * Every `uMajorEvery`-th line is rendered thicker (major / master contour).
 *
 * Technique:
 *   - Height is passed from the vertex shader as a varying.
 *   - In the fragment shader we compute `fract(height / interval)` which
 *     is 0 at every multiple.  Using fwidth() (screen-space derivative)
 *     we can scale the transition width so lines stay 1–2 px regardless of
 *     zoom / distance (analytic anti-aliasing without MSAA).
 *   - Major lines are detected by checking `fract(height / (interval * N))`.
 */

// ---------------------------------------------------------------------------
// Vertex Shader
// ---------------------------------------------------------------------------
export const contourVertexShader = /* glsl */ `
  uniform float uHeightScale;    // overall exaggeration applied to the mesh
  
  varying float vHeight;         // world-space Y passed to fragment
  varying vec3  vWorldPos;
  varying vec3  vNormal;

  void main() {
    // position.y already contains the displaced height (from CPU side)
    vHeight   = position.y;
    vNormal   = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// ---------------------------------------------------------------------------
// Fragment Shader
// ---------------------------------------------------------------------------
export const contourFragmentShader = /* glsl */ `
  precision highp float;

  // ---- uniforms ----
  uniform float uContourInterval;   // height step between minor lines (e.g. 0.5)
  uniform float uMajorEvery;        // every N-th contour is a major line
  uniform float uLineWidth;         // minor line half-width in "gradient units"
  uniform float uMajorWidthMult;    // multiplier for major line width (e.g. 2.5)

  // terrain base colors
  uniform vec3  uTerrainColor;      // white
  uniform vec3  uContourColor;      // black
  uniform vec3  uMajorColor;        // slightly darker black for major lines

  // ---- varyings ----
  varying float vHeight;
  varying vec3  vWorldPos;
  varying vec3  vNormal;

  // Returns 0..1 contour blending factor.
  // 0 = terrain color, 1 = contour line color.
  float contourFactor(float h, float interval, float halfWidth) {
    // normalised height within one interval period (0 at multiples)
    float f = fract(h / interval);
    // fold so both sides of 0 are captured: gives distance from nearest multiple
    float distFromLine = min(f, 1.0 - f) * interval;

    // screen-space derivative tells us how quickly height changes across 1 px
    float fw = fwidth(h);
    // smooth-step edge so the line has consistent pixel width + soft AA
    return 1.0 - smoothstep(halfWidth - fw * 0.5, halfWidth + fw * 0.5, distFromLine);
  }

  void main() {
    float h = vHeight;

    // --- minor contours ---
    float minorFactor = contourFactor(h, uContourInterval, uLineWidth);

    // --- major contours (every N-th minor) ---
    float majorInterval = uContourInterval * uMajorEvery;
    float majorFactor   = contourFactor(h, majorInterval, uLineWidth * uMajorWidthMult);

    // combine: major overrides minor where both are present
    float factor = max(minorFactor, majorFactor);

    // pick contour color: major lines are slightly bolder/darker
    vec3 lineColor = mix(uContourColor, uMajorColor, majorFactor);

    // --- subtle ambient shading so the 3-D shape reads better ---
    // simple diffuse from a top-light  (doesn't change contour look much)
    vec3 lightDir = normalize(vec3(0.4, 1.0, 0.6));
    float diff = max(dot(vNormal, lightDir), 0.0) * 0.18 + 0.82;

    vec3 base = uTerrainColor * diff;

    vec3 color = mix(base, lineColor, factor);

    gl_FragColor = vec4(color, 1.0);
  }
`

// ---------------------------------------------------------------------------
// Factory: returns a THREE.ShaderMaterial configured for contour rendering
// ---------------------------------------------------------------------------
/**
 * @param {object} opts
 * @param {number} [opts.contourInterval=0.5]   - height step between minor lines
 * @param {number} [opts.majorEvery=5]           - every N minor = 1 major
 * @param {number} [opts.lineWidth=0.06]         - minor line half-width
 * @param {number} [opts.majorWidthMult=2.2]     - major line relative width
 */
export function createContourMaterial({
  contourInterval  = 0.5,
  majorEvery       = 5,
  lineWidth        = 0.06,
  majorWidthMult   = 2.2,
} = {}) {
  return new THREE.ShaderMaterial({
    vertexShader:   contourVertexShader,
    fragmentShader: contourFragmentShader,
    uniforms: {
      uContourInterval:  { value: contourInterval },
      uMajorEvery:       { value: majorEvery },
      uLineWidth:        { value: lineWidth },
      uMajorWidthMult:   { value: majorWidthMult },
      uHeightScale:      { value: 1.0 },
      uTerrainColor:     { value: new THREE.Color(0xfafafa) },  // off-white paper
      uContourColor:     { value: new THREE.Color(0x111111) },  // near-black minor
      uMajorColor:       { value: new THREE.Color(0x000000) },  // pure black major
    },
    side: THREE.FrontSide,
  })
}

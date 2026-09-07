/**
 * Liquid Glass refraction pass.
 *
 * One transparent WebGL2 canvas layered above the sea canvas. Glass panes are
 * rounded-rect SDFs passed as uniforms; inside a pane the shader samples the
 * sea canvas (copied into a texture each frame) with thickness-driven
 * displacement, chromatic dispersion at the curved edges, and a specular rim.
 *
 * backdrop-filter cannot displace (sample-dependent refraction), and one
 * canvas per pane would multiply contexts — so a single full-screen pass with
 * pane rects as uniforms owns the effect.
 */

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uSea;
uniform vec2 uRes;
uniform vec2 uViewport;
uniform vec4 uPane;
uniform float uRadius;
uniform float uRefract;
uniform float uDisp;
out vec4 fragColor;
void main() {
  vec2 css = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 paneCenter = uPane.xy + uPane.zw * 0.5;
  vec2 local = css - paneCenter;
  vec2 halfSize = uPane.zw * 0.5;
  float cornerR = min(uRadius, min(halfSize.x, halfSize.y) * 0.5);
  vec2 q = abs(local) - (halfSize - vec2(cornerR));
  float sd = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - cornerR;
  float inside = 1.0 - smoothstep(-1.0, 1.0, sd);
  if (inside < 0.004) discard;
  float edgeDist = 0.0 - sd;
  float curve = 1.0 - smoothstep(0.0, 56.0, edgeDist);
  float thickness = pow(clamp(edgeDist / 56.0, 0.0, 1.0), 1.4);
  vec2 q2 = max(q, vec2(0.0));
  vec2 dir = length(q2) > 0.001 ? normalize(q2) * sign(max(q2.x, q2.y)) : vec2(0.0);
  vec2 uvR = clamp((css + dir * thickness * (uRefract - uDisp)) / uViewport, vec2(0.001), vec2(0.999));
  vec2 uvG = clamp((css + dir * thickness * uRefract) / uViewport, vec2(0.001), vec2(0.999));
  vec2 uvB = clamp((css + dir * thickness * (uRefract + uDisp)) / uViewport, vec2(0.001), vec2(0.999));
  vec3 refr = vec3(texture(uSea, uvR).r, texture(uSea, uvG).g, texture(uSea, uvB).b);
  float rim = smoothstep(0.7, 1.0, curve);
  vec3 outc = refr * mix(0.94, 1.0, thickness) + vec3(0.92, 0.97, 1.0) * rim * 0.12;
  fragColor = vec4(outc, inside);
}`

const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`

/** One glass pane rect in css px (top-left origin). */
export interface RefractPane {
  x: number
  y: number
  w: number
  h: number
  /** Corner radius; defaults to the pass-level option. */
  radius?: number
}

export interface RefractionPass {
  canvas: HTMLCanvasElement
  destroy(): void
}

export function createRefractionPass(
  seaCanvas: HTMLCanvasElement,
  panesProvider: () => RefractPane[],
  opts: { refract?: number; dispersion?: number; radius?: number; zIndex?: number } = {},
): RefractionPass {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = `position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:${String(opts.zIndex ?? 2)};`
  document.body.appendChild(canvas)
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false })
  if (gl === null) {
    const drop = (): void => { canvas.remove() }
    return { canvas, destroy: drop }
  }

  const makeShader = (type: number, src: string): WebGLShader => {
    const sh = gl.createShader(type)
    if (sh === null) throw new Error('[Refract] shader creation failed')
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (gl.getShaderParameter(sh, gl.COMPILE_STATUS) === false) throw new Error('[Refract] ' + String(gl.getShaderInfoLog(sh)))
    return sh
  }
  const vs = makeShader(gl.VERTEX_SHADER, VERT)
  const fs = makeShader(gl.FRAGMENT_SHADER, FRAG)
  const prog = gl.createProgram()
  if (prog === null) throw new Error('[Refract] program creation failed')
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (gl.getProgramParameter(prog, gl.LINK_STATUS) === false) throw new Error('[Refract] link: ' + String(gl.getProgramInfoLog(prog)))
  gl.useProgram(prog)
  const loc = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(prog, name)
  const uSea = loc('uSea')
  const uRes = loc('uRes')
  const uViewport = loc('uViewport')
  const uPane = loc('uPane')
  const uRadius = loc('uRadius')
  const uRefract = loc('uRefract')
  const uDisp = loc('uDisp')
  gl.uniform1i(uSea, 0)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  window.addEventListener('resize', resize)
  resize()

  let rafId = 0
  let destroyed = false
  const frame = (): void => {
    if (destroyed) return
    const panes = panesProvider()
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (panes.length > 0) {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, seaCanvas)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      for (const pane of panes) {
        gl.uniform2f(uRes, canvas.width, canvas.height)
        gl.uniform2f(uViewport, window.innerWidth, window.innerHeight)
        gl.uniform4f(uPane, pane.x, pane.y, pane.w, pane.h)
        gl.uniform1f(uRadius, pane.radius ?? opts.radius ?? 22)
        gl.uniform1f(uRefract, opts.refract ?? 20)
        gl.uniform1f(uDisp, opts.dispersion ?? 1.4)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
    }
    rafId = requestAnimationFrame(frame)
  }
  rafId = requestAnimationFrame(frame)

  return {
    canvas,
    destroy() {
      destroyed = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      canvas.remove()
    },
  }
}

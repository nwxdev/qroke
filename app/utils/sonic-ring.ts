// A single on-demand renderer. It sleeps when still, offscreen or hidden.
export function createSonicRing(canvas: HTMLCanvasElement, onLost: () => void) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true })
  if (!gl) return null
  const buffers: WebGLBuffer[] = [],
    shaders: WebGLShader[] = []
  const program = gl.createProgram()
  if (!program) return null
  function compile(type: number, source: string) {
    const shader = gl!.createShader(type)
    if (!shader) throw new Error('Shader unavailable')
    shaders.push(shader)
    gl!.shaderSource(shader, source)
    gl!.compileShader(shader)
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS))
      throw new Error('Shader compilation failed')
    return shader
  }
  try {
    gl.attachShader(
      program,
      compile(
        gl.VERTEX_SHADER,
        `attribute vec3 aPosition; attribute vec3 aNormal;
  uniform vec2 uTilt; uniform float uSpin; uniform float uScale;
  varying vec3 vNormal; varying vec3 vPosition;
  void main(){
    float cx=cos(uTilt.x),sx=sin(uTilt.x),cy=cos(uTilt.y+uSpin),sy=sin(uTilt.y+uSpin);
    mat3 rx=mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx);
    mat3 ry=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy);
    vec3 p=rx*ry*aPosition;
    vNormal=rx*ry*aNormal; vPosition=p;
    float perspective=3.6/(3.6-p.z);
    gl_Position=vec4(p.xy*perspective*uScale,-p.z*.2,1.);
  }`,
      ),
    )
    gl.attachShader(
      program,
      compile(
        gl.FRAGMENT_SHADER,
        `precision mediump float; varying vec3 vNormal; varying vec3 vPosition;
  void main(){
    vec3 n=normalize(vNormal); vec3 eye=normalize(vec3(0.,0.,4.)-vPosition);
    vec3 light=normalize(vec3(-.6,.85,1.3));
    float diffuse=max(dot(n,light),0.);
    vec3 reflected=reflect(-eye,n);
    float band=pow(.5+.5*sin(reflected.y*9.+reflected.x*2.),4.);
    float spec=pow(max(dot(reflect(-light,n),eye),0.),58.);
    float edge=pow(1.-max(dot(n,eye),0.),2.5);
    vec3 base=mix(vec3(.30,.105,.01),vec3(1.,.62,.06),.3+diffuse*.7);
    base+=vec3(.9,.67,.25)*band*.46;
    base+=vec3(1.,.92,.72)*spec*1.4;
    base+=vec3(.95,.61,.08)*edge*.5;
    gl_FragColor=vec4(base,1.);
  }`,
      ),
    )
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program linking failed')
    gl.useProgram(program)
    const positions: number[] = [],
      normals: number[] = [],
      indices: number[] = []
    const around = 64,
      tube = 20
    for (let i = 0; i <= around; i++)
      for (let j = 0; j <= tube; j++) {
        const a = (i / around) * Math.PI * 2,
          b = (j / tube) * Math.PI * 2,
          radius = 0.62 + 0.145 * Math.cos(b)
        positions.push(radius * Math.cos(a), radius * Math.sin(a), 0.145 * Math.sin(b))
        normals.push(Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b))
      }
    for (let i = 0; i < around; i++)
      for (let j = 0; j < tube; j++) {
        const a = i * (tube + 1) + j,
          b = a + tube + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    for (const [name, values] of [
      ['aPosition', positions],
      ['aNormal', normals],
    ] as const) {
      const buffer = gl.createBuffer()
      if (!buffer) throw new Error('Buffer unavailable')
      buffers.push(buffer)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW)
      const location = gl.getAttribLocation(program, name)
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0)
    }
    const element = gl.createBuffer()
    if (!element) throw new Error('Buffer unavailable')
    buffers.push(element)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, element)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
    const uTilt = gl.getUniformLocation(program, 'uTilt'),
      uSpin = gl.getUniformLocation(program, 'uSpin'),
      uScale = gl.getUniformLocation(program, 'uScale')
    gl.enable(gl.DEPTH_TEST)
    gl.clearColor(0, 0, 0, 0)
    let x = -0.2,
      y = 0.38,
      tx = x,
      ty = y,
      angle = 0,
      velocity = 0,
      kick = 0,
      frame = 0,
      last = 0,
      dirty = true,
      visible = true,
      disposed = false
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    function wake() {
      if (!disposed && !frame && visible && !document.hidden) frame = requestAnimationFrame(draw)
    }
    function draw(now: number) {
      frame = 0
      if (disposed || !visible || document.hidden) return
      const dt = Math.min((now - last) / 1000 || 0.016, 0.04)
      last = now
      const blend = media.matches ? 1 : 1 - Math.exp(-12 * dt)
      x += (tx - x) * blend
      y += (ty - y) * blend
      angle += velocity * dt
      velocity *= Math.exp(-2.8 * dt)
      kick *= Math.exp(-6 * dt)
      const moving =
        Math.abs(tx - x) + Math.abs(ty - y) > 0.0008 || Math.abs(velocity) > 0.003 || kick > 0.0005
      if (dirty || moving) {
        gl!.viewport(0, 0, canvas.width, canvas.height)
        gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT)
        gl!.uniform2f(uTilt, x, y)
        gl!.uniform1f(uSpin, angle)
        gl!.uniform1f(uScale, 1.05 + kick)
        gl!.drawElements(gl!.TRIANGLES, indices.length, gl!.UNSIGNED_SHORT, 0)
        dirty = false
      }
      if (moving) wake()
    }
    const resize = new ResizeObserver(() => {
      const size = Math.max(1, Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2)))
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size
        canvas.height = size
        dirty = true
        wake()
      }
    })
    resize.observe(canvas)
    const intersection = new IntersectionObserver((entries) => {
      visible = !!entries[0]?.isIntersecting
      if (visible) {
        dirty = true
        wake()
      } else {
        cancelAnimationFrame(frame)
        frame = 0
      }
    })
    intersection.observe(canvas)
    function visibility() {
      if (document.hidden) {
        cancelAnimationFrame(frame)
        frame = 0
      } else {
        dirty = true
        wake()
      }
    }
    function motion() {
      if (media.matches) {
        velocity = 0
        kick = 0
        tx = x = -0.2
        ty = y = 0.38
        dirty = true
      }
      wake()
    }
    document.addEventListener('visibilitychange', visibility)
    media.addEventListener('change', motion)
    function dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame)
      resize.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      media.removeEventListener('change', motion)
      canvas.removeEventListener('webglcontextlost', lost)
      for (const b of buffers) gl!.deleteBuffer(b)
      for (const s of shaders) gl!.deleteShader(s)
      gl!.deleteProgram(program)
    }
    function lost(event: Event) {
      event.preventDefault()
      dispose()
      onLost()
    }
    canvas.addEventListener('webglcontextlost', lost)
    wake()
    return {
      spin() {
        if (!media.matches) {
          velocity = 18
          kick = 0.08
        }
        dirty = true
        wake()
      },
      tilt(horizontal: number, vertical: number) {
        if (media.matches) return
        tx = -vertical * 0.8
        ty = horizontal * 1.2 + 0.25
        dirty = true
        wake()
      },
      reset() {
        tx = -0.2
        ty = 0.38
        dirty = true
        wake()
      },
      dispose,
    }
  } catch {
    for (const buffer of buffers) gl.deleteBuffer(buffer)
    for (const shader of shaders) gl.deleteShader(shader)
    gl.deleteProgram(program)
    return null
  }
}

/* Tiburon: real-time water.
   GLView renders one fragment shader full-frame into a canvas, only while the canvas is on screen.
   Three scenes use it:
     OCEAN   the hero dive: golden-hour sea with a caye on the horizon, a moving waterline as the camera
             goes under, Snell's window, sun shafts, caustic sand and marine snow down to the blue.
     SHALLOW White Tip's world: standing in knee-deep Belize water looking down at caustics on white sand.
     PLATE   a photo plate with a living water band (the rum and FIN beachfronts). */
(function () {
  'use strict';

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  const COMMON = `
precision highp float;
uniform vec2 uRes;uniform float uTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float caustic(vec2 q,float t){
  vec2 p=mod(q,6.2831853)-250.;vec2 i=p;float c=1.;
  for(int n=0;n<4;n++){float tt=t*(1.-(3.5/float(n+1)));
    i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
    c+=1./length(vec2(p.x/(sin(i.x+tt)/.005),p.y/(cos(i.y+tt)/.005)));}
  c/=4.;c=1.17-pow(c,1.4);return pow(abs(c),8.);}
`;

  const OCEAN = COMMON + `
uniform float uY;      // camera height in metres (negative = depth)
uniform float uPitch;  // radians, + looks up
uniform float uMob;    // 1 on phones: fewer octaves
const vec3 SUN=vec3(0.,.085,.996);
float waves(vec2 p,float t){
  float h=.17*sin(dot(p,vec2(.10,.92))+t*1.05);
  h+=.10*sin(dot(p,vec2(-.62,.70))*1.7+t*1.45);
  h+=.055*sin(dot(p,vec2(.88,.30))*2.9+t*2.05);
  h+=.09*(noise(p*.75+vec2(t*.28,t*.21))-.5);
  if(uMob<.5)h+=.045*(noise(p*2.2-vec2(t*.5,0.))-.5);
  return h;}
vec3 wnorm(vec2 p,float t){float e=.06,h=waves(p,t);
  return normalize(vec3(h-waves(p+vec2(e,0.),t),e,h-waves(p+vec2(0.,e),t)));}
vec3 sky(vec3 rd,float isl0){
  float y=max(rd.y,0.);
  vec3 top=vec3(.04,.20,.46),mid=vec3(.50,.58,.70),hor=vec3(1.15,.64,.30);
  vec3 c=mix(hor,mid,smoothstep(0.,.16,y));c=mix(c,top,smoothstep(.1,.55,y));
  float s=max(dot(rd,SUN),0.);
  c+=vec3(1.,.48,.18)*pow(s,5.)*.55+vec3(1.,.72,.4)*pow(s,48.)*.7+vec3(1.,.93,.8)*smoothstep(.9993,.9997,s)*2.4;
  if(isl0>.5){ // a low mangrove caye on the horizon, hazed into the glow
    float a=atan(rd.x,rd.z);
    float isl=smoothstep(-.75,-.45,a)*(1.-smoothstep(-.28,-.06,a))*(.0065+.004*noise(vec2(a*48.,1.))+.0025*noise(vec2(a*150.,2.)));
    isl+=smoothstep(.30,.42,a)*(1.-smoothstep(.46,.62,a))*(.004+.003*noise(vec2(a*64.,3.)));
    if(rd.y<isl&&rd.y>-.003)c=mix(c,vec3(.24,.16,.20),.72);}
  return c;}
vec3 above(vec3 ro,vec3 rd){
  if(rd.y>=0.)return sky(rd,1.);
  float t=-ro.y/rd.y;vec3 p=ro+rd*t;
  vec3 n=wnorm(p.xz,uTime);n=normalize(mix(n,vec3(0,1,0),clamp(t/70.,0.,.88)));
  float fr=.02+.98*pow(1.-max(dot(n,-rd),0.),5.);
  vec3 rf=reflect(rd,n);rf.y=abs(rf.y);
  vec3 deep=vec3(.02,.27,.33),lagoon=vec3(.10,.58,.56);
  vec3 w=mix(lagoon,deep,smoothstep(4.,40.,t));
  w+=vec3(.08,.30,.25)*max(waves(p.xz,uTime),0.)*1.6;
  vec3 c=mix(w,sky(rf,0.),fr);
  c+=vec3(1.,.72,.42)*pow(max(dot(rf,SUN),0.),180.)*2.4;
  c+=vec3(1.,.6,.3)*pow(max(dot(rf,SUN),0.),14.)*.18;
  return mix(c,sky(vec3(rd.x,.0,rd.z),0.),1.-exp(-t*.011));}
vec3 below(vec3 ro,vec3 rd,vec2 uv){
  float d=max(-ro.y,0.);
  vec3 shallow=vec3(.07,.55,.60),deep=vec3(.005,.085,.20),abyss=vec3(.0,.025,.07);
  vec3 base=mix(shallow,deep,smoothstep(1.,16.,d));base=mix(base,abyss,smoothstep(14.,30.,d));
  base*=.55+.75*smoothstep(-1.,1.,rd.y);
  vec3 c=base;
  if(rd.y>0.){ // the surface from below: Snell's window, total internal reflection outside it
    float t=-ro.y/rd.y;vec3 p=ro+rd*t;vec3 n=wnorm(p.xz,uTime);
    vec3 r=refract(rd,-n,1.33);
    vec3 s=dot(r,r)>0.?sky(normalize(r),0.)*1.25:base*1.2;
    c=mix(base,s,exp(-t*.075)*smoothstep(.0,.25,rd.y));
  }else{ // sand, falling away into the blue hole as we go deeper
    float fy=-7.-smoothstep(5.,12.,d)*60.;
    float t=(fy-ro.y)/rd.y;vec3 p=ro+rd*t;
    float rip=noise(p.xz*vec2(1.6,.5))*.5+noise(p.xz*4.)*.25;
    vec3 sand=vec3(.86,.80,.66)*(.75+.35*rip);
    sand*=.55+1.7*caustic(p.xz*.55,uTime*.55)*exp(-d*.05);
    c=mix(base,sand*mix(vec3(1.),shallow*1.5,.45),exp(-t*.085));
  }
  float a=rd.x/(rd.y+1.25);
  float ray=noise(vec2(a*13.,uTime*.12))*noise(vec2(a*29.+4.,uTime*.19));
  c+=vec3(.55,.9,.88)*pow(ray,1.6)*smoothstep(-.5,.7,rd.y)*.55*exp(-d*.085);
  for(int L=0;L<2;L++){ // marine snow, parallax by layer
    float sc=L==0?26.:14.;
    vec2 g=uv*sc+vec2(uTime*.02*(float(L)+1.),uTime*.035+ro.y*.9*(float(L)+.6));
    vec2 id=floor(g),f=fract(g)-.5;vec2 o=vec2(hash(id),hash(id+7.))-.5;
    float m=smoothstep(.06,0.,length(f-o*.7))*step(.55,hash(id+3.));
    c+=vec3(.7,.9,.95)*m*(L==0?.20:.32)*smoothstep(.5,3.,d);}
  return c;}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec3 ro=vec3(0.,uY+.035*sin(uTime*.9)*step(0.,uY),uTime*.55);
  vec3 rd=normalize(vec3(uv,1.55));
  float cp=cos(uPitch),sp=sin(uPitch);rd.yz=mat2(cp,sp,-sp,cp)*rd.yz;
  float rl=.012*sin(uTime*.55);rd.xy=mat2(cos(rl),sin(rl),-sin(rl),cos(rl))*rd.xy;
  vec3 q=ro+rd*.45;float hq=waves(q.xz,uTime);
  float under=step(q.y,hq);
  vec3 c=under>.5?below(vec3(ro.x,min(ro.y,-.02),ro.z),rd,uv):above(vec3(ro.x,max(ro.y,.04),ro.z),rd);
  float edge=abs(q.y-hq);c=mix(c,vec3(.85,.97,1.),smoothstep(.02,.0,edge)*.6);
  c=1.-exp(-c*1.45);
  float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,1.22);
  c*=1.-.32*dot(uv*.9,uv*.9);
  c+=(hash(gl_FragCoord.xy+fract(uTime))-.5)/180.;
  gl_FragColor=vec4(c,1.);}
`;

  const SHALLOW = COMMON + `
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  // looking down through 0.6m of water at a white sand bar
  vec2 p=uv*3.2+vec2(uTime*.04,uTime*.02);
  vec2 w=vec2(noise(p*1.3+uTime*.25),noise(p*1.3-uTime*.22+9.))-.5;
  vec2 sp=p+w*.18;
  float rip=noise(sp*vec2(2.2,.7)+3.)*.6+noise(sp*6.)*.25;
  vec3 sand=vec3(.95,.92,.84)*(.82+.22*rip);
  float ca=caustic(sp*1.25,uTime*.6)*.85+caustic(sp*1.25+1.7,uTime*.6+2.)*.35;
  vec3 tint=vec3(.55,.93,.92);
  vec3 c=sand*tint*(.78+1.1*ca);
  c=mix(c,vec3(.16,.72,.76),smoothstep(.15,1.2,length(uv*vec2(.8,1.1)))*.55);
  c+=vec3(1.)*pow(max(noise(sp*9.+uTime*.8)-.72,0.)*3.,3.)*.25; // glitter
  c=1.-exp(-c*1.35);
  c+=(hash(gl_FragCoord.xy+fract(uTime))-.5)/200.;
  gl_FragColor=vec4(c,1.);}
`;

  const PLATE = COMMON + `
uniform sampler2D uImg;uniform vec2 uImgSize;
uniform vec4 uBand;   // water band in image v: start, full, full-end, end (0 = top)
uniform float uAmp;uniform float uGlint;uniform vec2 uFocus;uniform float uZoom;
void main(){
  vec2 st=gl_FragCoord.xy/uRes;st.y=1.-st.y;
  float ra=uRes.x/uRes.y,ia=uImgSize.x/uImgSize.y;
  vec2 sc=ra>ia?vec2(1.,ia/ra):vec2(ra/ia,1.);sc/=uZoom;
  vec2 uv=clamp(uFocus,sc*.5,1.-sc*.5)+(st-.5)*sc;
  float m=smoothstep(uBand.x,uBand.y,uv.y)*(1.-smoothstep(uBand.z,uBand.w,uv.y));
  float depth=(uv.y-uBand.x)/(uBand.w-uBand.x);
  float k=mix(260.,90.,depth);
  vec2 off=vec2(sin(uv.y*k+uTime*1.3+sin(uv.x*14.+uTime*.6)*1.4)*.0016,
                sin(uv.x*38.+uTime*1.1+uv.y*60.)*.0022)*uAmp*m*(.4+depth);
  vec3 c=texture2D(uImg,uv+off).rgb;
  float g=pow(max(noise(vec2(uv.x*220.+uTime*.9,uv.y*900.-uTime*.4))-.62,0.)*2.6,3.);
  c+=uGlint*g*m*vec3(1.,.86,.62);
  gl_FragColor=vec4(c,1.);}
`;

  function GLView(canvas, frag, opts) {
    opts = opts || {};
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!gl) return null;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; } return o; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; const u = n => (n in U) ? U[n] : (U[n] = gl.getUniformLocation(pr, n));
    const view = {
      gl, u, ready: !opts.texture, visible: false, scale: opts.scale || 0.6, t0: performance.now(), frozen: false,
      set1(n, v) { gl.uniform1f(u(n), v); }, set2(n, a, b) { gl.uniform2f(u(n), a, b); },
      set4(n, a, b, c, d) { gl.uniform4f(u(n), a, b, c, d); },
      resize() {
        const r = canvas.getBoundingClientRect(), s = view.scale * Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(2, Math.round(r.width * s)), h = Math.max(2, Math.round(r.height * s));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      },
      draw(time) {
        if (!view.ready) return;
        view.resize();
        gl.uniform2f(u('uRes'), canvas.width, canvas.height);
        gl.uniform1f(u('uTime'), time);
        if (opts.before) opts.before(view, time);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
    if (opts.texture) {
      const img = new Image(); img.decoding = 'async';
      img.onload = () => {
        const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform2f(u('uImgSize'), img.naturalWidth, img.naturalHeight);
        view.ready = true; canvas.classList.add('is-live'); view.draw(view.last || 0);
      };
      img.src = opts.texture;
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => { view.visible = e.isIntersecting; }), { rootMargin: '120px' }).observe(opts.observe || canvas);
    } else view.visible = true;
    return view;
  }

  const views = [];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    const t = reduce ? 6 : now / 1000;
    for (const v of views) if (v.visible || !v.drawnOnce) { v.last = t; v.draw(t); v.drawnOnce = v.ready; }
  }
  function add(v) { if (v) { views.push(v); if (!raf) raf = requestAnimationFrame(loop); } return v; }

  window.TiburonWater = {
    ocean(canvas, observeEl, state, mobile) {
      return add(GLView(canvas, OCEAN, {
        scale: mobile ? 0.5 : 0.62, observe: observeEl,
        before(v) { v.set1('uY', state.y); v.set1('uPitch', state.pitch); v.set1('uMob', mobile ? 1 : 0); }
      }));
    },
    shallows(canvas, mobile) { return add(GLView(canvas, SHALLOW, { scale: mobile ? 0.5 : 0.55 })); },
    plate(canvas, src, cfg) {
      return add(GLView(canvas, PLATE, {
        texture: src, scale: cfg.scale || 0.9,
        before(v) {
          const b = cfg.band; v.set4('uBand', b[0], b[1], b[2], b[3]);
          v.set1('uAmp', cfg.amp); v.set1('uGlint', cfg.glint);
          const f = cfg.focus(); v.set2('uFocus', f[0], f[1]); v.set1('uZoom', cfg.zoom ? cfg.zoom() : 1);
        }
      }));
    }
  };
})();

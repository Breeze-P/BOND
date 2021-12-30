/*		v 0.2 - revised 18/10 2021 ILTP		*/
function DistortImage(_element, _imgUrl){
	var _this = this;
	var _rgbMode = _element.className.indexOf("rgb") != -1;
	var _type = "distort";
	if(_rgbMode) _type = "rgb";
	var _w = 0, _h = 0, _runTimer;
	var _rel = _element.getElementsByClassName("rel")[0] || _element;
	var _loaded = false, _inView = false;
	//Create canvas inside the element
	var _canvas = document.createElement("canvas");
	if(_type == "rgb") _canvas.className = "canvas rgb";
	else _canvas.className = "canvas";
	_canvas.width = 0, _canvas.height = 0;
	_canvas.style.visibility = "hidden";
	_element.appendChild(_canvas);

	var _renderer = new THREE.WebGLRenderer({antialias:false,canvas:_canvas});
	var _renderBack1 = new THREE.WebGLRenderTarget(1, 1);
	var _scene = new THREE.Scene(), _sceneBack = new THREE.Scene();
	var _camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	var _cameraBack = new THREE.PerspectiveCamera(45, 1, 1, 10000);
	var _clock = new THREE.Clock();
	
	var _imgEffect = new DistortImgEffect(_element);
	var _postEffect;
	if(_type == "rgb"){
		_postEffect = new PostRGBEffect(_renderBack1.texture);
		_canvas.style.opacity = 0;
	}
	else _postEffect = new PostEffect(_renderBack1.texture);

	function resized(e){
		_w = _rel.offsetWidth / 2, _h = _rel.offsetHeight / 2;//only half resolution for performance while scrolling
		_canvas.width = _w, _canvas.height = _h;
		_cameraBack.aspect = _w / _h;
	  	_cameraBack.updateProjectionMatrix();
	  	_imgEffect.resize(_w, _h);
	  	_postEffect.resize(_w, _h);
	  	_renderBack1.setSize(_w, _h);
	  	_renderer.setSize(_w, _h);
	}

	//Distort
	var _time;
	function renderDistort(){
		if(_justOpenedProject) return;
		_time = _clock.getDelta();
	  	_renderer.render(_sceneBack, _cameraBack, _renderBack1);
	  	_postEffect.render(_time);
	  	_renderer.render(_scene, _camera);
	}

	//RGB
	var _transparent = true;
	var _deltaY = 0, _prevWSY = 0;
	function renderRGB(){
		if(_justOpenedProject) return;
		_deltaY = Math.abs(GLB._windowScrollY - _prevWSY);
		_prevWSY = GLB._windowScrollY;
		_renderer.render(_sceneBack, _cameraBack, _renderBack1);
		_postEffect.render(_deltaY);
		_renderer.render(_scene, _camera);
		if(_deltaY <= 10){
			if(!_transparent){
				_transparent = true;
				_canvas.style.opacity = 0;
			}
		}
		else{
			if(_transparent){
				_transparent = false;
				_canvas.style.opacity = 1;
			}
		}
	}


	function imgLoaded(){
		_sceneBack.add(_imgEffect.obj);
		_scene.add(_postEffect.obj);
		if(_w == 0) resized();
		_loaded = true;
		if(_inView) _this.inView();
	}
	GLBEvents(_element, "imgLoaded", imgLoaded, true);
	GLBEvents(window, "LayoutUpdate", resized, true);

	//Init
	_renderer.setClearColor(0x111111, 1.0);
	_cameraBack.position.set(0, 0, 100);
	_cameraBack.lookAt(new THREE.Vector3());
	_imgEffect.init(_imgUrl);

	function pauseEffect(){
		if(_type == "rgb") gsap.ticker.remove(renderRGB);
		else gsap.ticker.remove(renderDistort);
		_canvas.style.visibility = "hidden";
		if(_inView) _runTimer = setTimeout(resumeEffectWhileInView, Math.random()*5000 + 2000);
	}
	function resumeEffectWhileInView(){
		if(_inView) _this.inView();
	}

	_this.inView = function(){
		_inView = true;
		if(!_loaded) return;
		//start rendering
		if(_type == "rgb") gsap.ticker.add(renderRGB);
		else{
			gsap.ticker.add(renderDistort);
			clearTimeout(_runTimer);
			_runTimer = setTimeout(pauseEffect, Math.random()*1200 + 250);
		}
		_canvas.style.visibility = "visible";
	}
	_this.outView = function(){
		_inView = false;
		if(_type == "rgb") gsap.ticker.remove(renderRGB);
		else gsap.ticker.remove(renderDistort);
		_canvas.style.visibility = "hidden";
	}

	_this.destroy = function(){
		_loaded = false;
		clearTimeout(_runTimer);
		GLBEvents(window, "LayoutUpdate", resized, false);
		GLBEvents(_element, "imgLoaded", imgLoaded, false);
		if(_type == "rgb") gsap.ticker.remove(renderRGB);
		else gsap.ticker.remove(renderDistort);
		_element.removeChild(_canvas);
		_imgEffect.destroy();
		_postEffect.destroy();
		_renderer.dispose();
		_renderBack1.dispose();
		_scene = null;
		_camera = null;
		_cameraBack = null;
		_clock = null;
		_imgEffect = null;
		_postEffect = null;
		_canvas = null;
		_renderer = null;
		_renderBack1 = null;
	}
}

function DistortImgEffect(_parent){
	var _this = this;
	var _loader;

	_this.uniforms = {
		resolution: {
			type: 'v2',
			value: new THREE.Vector2(1, 1)
		},
		imageResolution: {
			type: 'v2',
			value: new THREE.Vector2(1, 1)
		},
		texture: {
			type: 't',
			value: null
		}	
	}
	function imgLoaded(tex){
		if(!_parent) return;
		tex.magFilter = THREE.NearestFilter, tex.minFilter = THREE.NearestFilter;
		_this.uniforms.texture.value = tex;
		_this.obj = new THREE.Mesh(_geom, _mat);
		_parent.dispatchEvent(new GLBEvent("imgLoaded"));
	}
	_this.init = function(src){
		_loader = new THREE.TextureLoader();
		_loader.crossOrigin = '*';
		_loader.load(src, imgLoaded);
	}

	var _geom = new THREE.PlaneBufferGeometry(2, 2);
	var _mat = new THREE.RawShaderMaterial({
		uniforms: _this.uniforms,
		vertexShader: `attribute vec3 position;
		  attribute vec2 uv;
		  varying vec2 vUv;
		  void main(void) {
			vUv = uv;
			gl_Position = vec4(position, 1.0);
		  }
		`,
		fragmentShader: `precision highp float;

		  uniform vec2 resolution;
		  uniform vec2 imageResolution;
		  uniform sampler2D texture;

		  varying vec2 vUv;

		  void main(void) {
			vec2 ratio = vec2(
				min((resolution.x / resolution.y) / (imageResolution.x / imageResolution.y), 1.0),
				min((resolution.y / resolution.x) / (imageResolution.y / imageResolution.x), 1.0)
			  );

			vec2 uv = vec2(
				vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
				vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
			  );
			gl_FragColor = texture2D(texture, uv);
		  }
		`});
	_this.resize = function(_w, _h){
	 	_this.uniforms.resolution.value.set(_w, _h);
		_this.uniforms.imageResolution.value.set(_w, _h);
	}
	_this.destroy = function(){
		if(_this.obj){
			_geom.dispose();
			_mat.dispose();
			_geom = null;
			_mat = null;
			_this.obj = null;
			_loader = null;
		}
		_parent = null;
	}
}
  
function PostEffect(_texture){
	var _this = this;
	_this.uniforms = {
		time: {
			type: 'f',
			value: 0
		},
		resolution: {
			type: 'v2',
			value: new THREE.Vector2(1, 1)
		},
		texture: {
			type: 't',
			value: _texture
		}
	}
	
	var _geom = new THREE.PlaneBufferGeometry(2, 2);
	var _mat = new THREE.RawShaderMaterial({
		uniforms: _this.uniforms,
		vertexShader: `attribute vec3 position;
		  attribute vec2 uv;			
		  varying vec2 vUv;			
		  void main() {
			vUv = uv;
			gl_Position = vec4(position, 1.0);
		  }
		`,
		fragmentShader: `precision highp float;
		
		  uniform float time;
		  uniform vec2 resolution;
		  uniform sampler2D texture;
		  
		  varying vec2 vUv;
		  
		  float random(vec2 c){
			return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
		  }

		  //Modified from:
		  // Description : Array and textureless GLSL 2D/3D/4D simplex
		  //               noise functions.
		  //      Author : Ian McEwan, Ashima Arts.
		  //  Maintainer : ijm
		  //     Lastmod : 20110822 (ijm)
		  //     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
		  //               Distributed under the MIT License. See LICENSE file.
		  //               https://github.com/ashima/webgl-noise
		  //

		  vec3 mod289(vec3 x) {
			return x - floor(x * (1.0 / 289.0)) * 289.0;
		  }

		  vec4 mod289(vec4 x) {
			  return x - floor(x * (1.0 / 289.0)) * 289.0;
		  }

		  vec4 permute(vec4 x) {
			  return mod289(((x*34.0)+1.0)*x);
		  }

		  vec4 taylorInvSqrt(vec4 r)
		  {
			return 1.79284291400159 - 0.85373472095314 * r;
		  }

		  float snoise3(vec3 v)
			{
			const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
			const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

		  // First corner
			vec3 i  = floor(v + dot(v, C.yyy) );
			vec3 x0 =   v - i + dot(i, C.xxx) ;

		  // Other corners
			vec3 g = step(x0.yzx, x0.xyz);
			vec3 l = 1.0 - g;
			vec3 i1 = min( g.xyz, l.zxy );
			vec3 i2 = max( g.xyz, l.zxy );  
			vec3 x1 = x0 - i1 + C.xxx;
			vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
			vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

		  // Permutations
			i = mod289(i);
			vec4 p = permute( permute( permute(
					   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
					 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
					 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

		  // Gradients: 7x7 points over a square, mapped onto an octahedron.
		  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
			float n_ = 0.142857142857; // 1.0/7.0
			vec3  ns = n_ * D.wyz - D.xzx;

			vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

			vec4 x_ = floor(j * ns.z);
			vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

			vec4 x = x_ *ns.x + ns.yyyy;
			vec4 y = y_ *ns.x + ns.yyyy;
			vec4 h = 1.0 - abs(x) - abs(y);

			vec4 b0 = vec4( x.xy, y.xy );
			vec4 b1 = vec4( x.zw, y.zw );

			//vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
			//vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
			vec4 s0 = floor(b0)*2.0 + 1.0;
			vec4 s1 = floor(b1)*2.0 + 1.0;
			vec4 sh = -step(h, vec4(0.0));

			vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
			vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

			vec3 p0 = vec3(a0.xy,h.x);
			vec3 p1 = vec3(a0.zw,h.y);
			vec3 p2 = vec3(a1.xy,h.z);
			vec3 p3 = vec3(a1.zw,h.w);

		  //Normalise gradients
			vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
			p0 *= norm.x;
			p1 *= norm.y;
			p2 *= norm.z;
			p3 *= norm.w;

		  // Mix final noise value
			vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
			m = m * m;
			return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
			}
					
		  const float interval = 2.0;
		  
		  void main(void){
			float strength = smoothstep(interval * 0.5, interval, interval - mod(time, interval));
			vec2 shake = vec2(strength * 0.2 + 0.2) * vec2(
			  random(vec2(time)) * 2.0 - 1.0,
			  random(vec2(time * 2.0)) * 2.0 - 1.0
			) / resolution;
		  
			float y = vUv.y * resolution.y;
			float rgbWave = (
				snoise3(vec3(0.0, y * 0.01, time * 400.0)) * (2.0 + strength * 32.0)
				* snoise3(vec3(0.0, y * 0.02, time * 200.0)) * (1.0 + strength * 4.0)
				+ step(0.9995, sin(y * 0.005 + time * 1.6)) * 12.0
				+ step(0.9999, sin(y * 0.005 + time * 2.0)) * -18.0
			  ) / resolution.x;
			float rgbDiff = (6.0 + sin(time * 500.0 + vUv.y * 40.0) * (20.0 * strength + 1.0)) / resolution.x;
			float rgbUvX = vUv.x + rgbWave;
			float r = texture2D(texture, vec2(rgbUvX + rgbDiff, vUv.y) + shake).r;
			float g = texture2D(texture, vec2(rgbUvX, vUv.y) + shake).g;
			float b = texture2D(texture, vec2(rgbUvX - rgbDiff, vUv.y) + shake).b;
		  
			float bnTime = floor(time * 20.0) * 200.0;
			float noiseX = step((snoise3(vec3(0.0, vUv.x * 3.0, bnTime)) + 1.0) / 2.0, 0.12 + strength * 0.3);
			float noiseY = step((snoise3(vec3(0.0, vUv.y * 3.0, bnTime)) + 1.0) / 2.0, 0.12 + strength * 0.3);
			float bnMask = noiseX * noiseY;
			float bnUvX = vUv.x + sin(bnTime) * 0.2 + rgbWave;
			float bnR = texture2D(texture, vec2(bnUvX + rgbDiff, vUv.y)).r * bnMask;
			float bnG = texture2D(texture, vec2(bnUvX, vUv.y)).g * bnMask;
			float bnB = texture2D(texture, vec2(bnUvX - rgbDiff, vUv.y)).b * bnMask;
			vec4 blockNoise = vec4(bnR, bnG, bnB, 1.0);
		  
			float bnTime2 = floor(time * 25.0) * 300.0;
			float noiseX2 = step((snoise3(vec3(0.0, vUv.x * 2.0, bnTime2)) + 1.0) / 2.0, 0.12 + strength * 0.5);
			float noiseY2 = step((snoise3(vec3(0.0, vUv.y * 8.0, bnTime2)) + 1.0) / 2.0, 0.12 + strength * 0.3);
			float bnMask2 = noiseX2 * noiseY2;
			float bnR2 = texture2D(texture, vec2(bnUvX + rgbDiff, vUv.y)).r * bnMask2;
			float bnG2 = texture2D(texture, vec2(bnUvX, vUv.y)).g * bnMask2;
			float bnB2 = texture2D(texture, vec2(bnUvX - rgbDiff, vUv.y)).b * bnMask2;
			vec4 blockNoise2 = vec4(bnR2, bnG2, bnB2, 1.0);
					  
			gl_FragColor = vec4(r, g, b, 1.0) * (1.0 - bnMask - bnMask2) + (blockNoise + blockNoise2);
		  }
		`
	  });

	_this.obj = new THREE.Mesh(_geom, _mat);
	_this.render = function(time){
		_this.uniforms.time.value += time;
	}
	_this.resize = function(_w,_h){
		_this.uniforms.resolution.value.set(_w,_h);
	}
	_this.destroy = function(){
		_geom.dispose();
		_mat.dispose();
		_geom = null;
		_mat = null;
		_this.obj = null;
	}
}

function PostRGBEffect(_texture){
	var _this = this;
	_this.uniforms = {
		time: {
			type: 'f',
			value: 0
		},
		resolution: {
			type: 'v2',
			value: new THREE.Vector2(1, 1)
		},
		texture: {
			type: 't',
			value: _texture
		}
	}
	
	var _geom = new THREE.PlaneBufferGeometry(2, 2);
	var _mat = new THREE.RawShaderMaterial({
		uniforms: _this.uniforms,
		vertexShader: `attribute vec3 position;
		  attribute vec2 uv;			
		  varying vec2 vUv;			
		  void main() {
			vUv = uv;
			gl_Position = vec4(position, 1.0);
		  }
		`,
		fragmentShader: `precision highp float;
		
		  uniform float time;
		  uniform vec2 resolution;
		  uniform sampler2D texture;
		  
		  varying vec2 vUv;
		  
		  void main(void){
			float rgbUvX = vUv.x;
			float rgbUvY = vUv.y;
			float y = rgbUvY * resolution.y;
			float rgbDiff = sin(time);			
			float r = texture2D(texture, vec2(rgbUvX - rgbDiff*.05, rgbUvY)).r;
			float g = texture2D(texture, vec2(rgbUvX - rgbDiff*.05, rgbUvY + rgbDiff*.3)).g;
			float b = texture2D(texture, vec2(rgbUvX, rgbUvY-rgbDiff*.05)).b;
			gl_FragColor = vec4(r, g, b, 1);
		  }
		`
	  });
	  
	_this.obj = new THREE.Mesh(_geom, _mat);

	_this.render = function(_deltaY){
		_this.uniforms.time.value = _deltaY/200;
	}
	_this.resize = function(_w,_h){
		_this.uniforms.resolution.value.set(_w,_h);
	}
	_this.destroy = function(){
		_geom.dispose();
		_mat.dispose();
		_geom = null;
		_mat = null;
		_this.obj = null;
	}
}
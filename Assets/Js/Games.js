/*		v 0.5 - revised 18/11 2021 ILTP		*/
function BGGlitch(_parent, _move){
	var _this = this;
	var _me = document.createElement("canvas");
	_me.className = "bgglitch";
	var _w = GLB._vw, _h = GLB._reliableSh;
	_me.width = _w;
	_me.height = _h;
	_parent.appendChild(_me);

	var _ctx = _me.getContext('2d');
	var _timer, _renderCount = 0;

	_this.glitch = function(){
		clearTimeout(_timer);
		_ctx.clearRect(0, 0, _w, _h);
		_ctx.save();
		var _num = 6 + Math.floor(Math.random()*10);
		for(var i=0;i<_num;i++){
			if(Math.random() < .5) _ctx.fillStyle = "rgba(12,251,3,1)";//0CFB03
			else if(Math.random() < .5) _ctx.fillStyle = "rgba(12,251,3,.5)";//0CFB03
			else _ctx.fillStyle = "rgba(35,158,70,.6)";//239E46
			_ctx.translate(Math.random()*200-100,Math.random()*20-10);
			if(Math.random() < .5) _ctx.fillRect(Math.random()*100, Math.random()*GLB._reliableSh, Math.random()*GLB._vw*.5, Math.random()*50+2);
			else _ctx.fillRect(_w-Math.random()*100, Math.random()*GLB._reliableSh, Math.random()*GLB._vw*.5, Math.random()*50+2);
		}
		_ctx.restore();
		_renderCount++;
		if(_renderCount >= 5) clear();
		else{
			if(_move) gsap.set(_parent, {x:Math.random()*200-100});
			_timer = setTimeout(_this.glitch, 50 + Math.random()*50);
		}
	}
	function clear(){
		_ctx.restore();
		_ctx.clearRect(0, 0, _w, _h);
		if(_move) gsap.set(_parent, {clearProps:"x"});
		_renderCount = 0;
	}

	_this.destroy = function(){
		clearTimeout(_timer);
		_parent.removeChild(_me);
	}
}
function ImageTrail(_games){
	var _this = this;
	var _game = _games.getElementsByClassName("game")[0];
	_game.classList.add("on");
	
	var _imagesHtml = _game.getElementsByClassName("lazy");
	var _numImgs = _imagesHtml.length;
	var _images = [];
	for(var i=0;i<_numImgs;i++) _images.push(new TrailImg(_imagesHtml[i]));
	
	//Interaction
	var _touched = false;
	var _mx = 0, _my = 0, _prevmx = 0, _prevmy = 0, _dirX = 0, _dirY = 0, _releaseX = 0, _releaseY = 0, _threshold = 100, _imgIndex = 0;
	function tdown(e){
		_touched = true;
		GLBEvents(window, "touchend", tup, true);
	}
	function tup(){
		_touched = false;
		GLBEvents(window, "touchend", tup, false);
	}
	function tmoved(e){
		if(_touched){
			_mx = e.touches[0].clientX, _my = e.touches[0].clientY;
			moved(null);
			e.stopPropagation(), e.preventDefault();
		}
	}
	function moved(e){
		if(e) _mx = e.clientX, _my = e.clientY;
		_movedDist = distance(_mx,_my,_releaseX,_releaseY);
		_dirX = ((_mx-_prevmx)+_dirX)/2, _dirY = ((_my-_prevmy)+_dirY)/2;
		_prevmx = _mx, _prevmy = _my;
		
		if(_movedDist > _threshold){
			//console.log("Nu er den der");
			_releaseX = _mx, _releaseY = _my;
			_images[_imgIndex].on(_mx,_my, _dirX, _dirY);
			_imgIndex++;
			if(_imgIndex > _numImgs-1) _imgIndex = 0;
		}
	}
	function distance(x1,y1,x2,y2){
		return Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2,2));
	}

	GLBEvents(window, "mousemove", moved, true);
	if(GLB._hasTouch){
		GLBEvents(window, "touchstart", tdown, true);
		window.addEventListener("touchmove", tmoved, {passive:false});
	}

	//Change text interval
	var _title = _game.getElementsByClassName("title")[0];
	var _titleSpan = _title.getElementsByTagName("span")[0];
	var _labels = (_title.getAttribute("data-labels") || "").split(",");
	var _labelIndex = -1;
	var _numLabels = _labels.length;
	var _txtInterval = setInterval(changeTitle, 3000);
	function changeTitle(){
		gsap.to(_title, .5, {x:GLB._vw*.5, force3D:true, ease:"expo.in", onComplete:changeTitleB});
	}
	function changeTitleB(){
		_labelIndex++;
		if(_labelIndex > _numLabels-1) _labelIndex = 0;
		_titleSpan.textContent = _labels[_labelIndex];
		gsap.set(_title, {x:-GLB._vw*.5, force3D:true});
		gsap.to(_title, 1, {x:0, force3D:true, ease:"expo"});
	}
	changeTitleB();
	

	_this.destroy = function(){
		_game.classList.remove("on");
		clearInterval(_txtInterval);
		for(var i=0;i<_numImgs;i++){
			_images[i].destroy();
			_images[i] = null;
		}
		gsap.killTweensOf(_title);
		GLBEvents(window, "mousemove", moved, false);
		if(GLB._hasTouch){
			GLBEvents(window, "touchstart", tdown, false);
			window.removeEventListener("touchmove", tmoved, {passive:false});
		}
		GLBEvents(window, "touchend", tup, false);
	}
}
function TrailImg(_me){
	var _this = this;
	var _lazy = new LazyMedia(_me);

	_me.classList.add("instant");
	_me.classList.add("out");
	var _parent = _me.parentNode;
	var _max = 20, _x = 0, _y = 0, _speedX = 0, _speedY = 0, _fadeTimer;
	_this.on = function(x,y,dirx,diry){
		_speedX = dirx*1.0, _speedY = diry*1.0;
		if(_speedX > _max) _speedX = _max;
		else if(_speedX < -_max) _speedX = -_max;
		if(_speedY > _max) _speedY = _max;
		else if(_speedY < -_max) _speedY = -_max;
		_x = x, _y = y;
		gsap.killTweensOf(_me);
		gsap.set(_me, {x:_x,y:_y,scale:1,force3D:true});
		_parent.appendChild(_me);
		gsap.ticker.add(move);
		_me.classList.add("instant");
		_me.classList.remove("out");
		clearTimeout(_fadeTimer);
		_fadeTimer = setTimeout(fadeOut, 500);
	}
	function move(){
		_speedX *= .95;
		_speedY *= .95;
		_x += _speedX;
		_y += _speedY;
		gsap.set(_me, {x:_x,y:_y,force3D:true});
	}
	function fadeOut(){
		_me.classList.remove("instant");
		_me.classList.add("out");
		gsap.to(_me, .8, {scale:.25,force3D:true,ease:"cubic.inOut", onComplete:done});
	}
	function done(){
		gsap.ticker.remove(move);
		_me.classList.add("instant");
	}
	_this.destroy = function(){
		clearTimeout(_fadeTimer);
		gsap.ticker.remove(move);
		gsap.killTweensOf(_me);
		_lazy.destroy();
		_lazy = null;
	}
}
function RotatingPentagon(_games){
	var _this = this;
	var _on = true;
	var _camera, _scene, _renderer, _cube, _innerCube, _sideGeom, _textureLoader;
	var _textures = [], _materials = [], _sides = [];
	var _el = _games.getElementsByClassName("game")[1];
	_el.classList.add("on");
	var _smallestDist = 10000, _smallestId = -1, _nsmallestDist = 10000, _nsmallestId = -1;
	var _leftId = -1, _currentLeftId = -1, _rightId = -1, _currentRightId = -1;
	var _grx = _el.getElementsByClassName("servicegrx")[0];
	var _grxElements = _grx.getElementsByClassName("lazy");
	var _lazys = [];
	for(var i=0;i<5;i++) _lazys.push(new LazyMedia(_grxElements[i]));
	var _dragging = false;
	var _mxInit = 0, _mxDelta = 0, _oldDeltaX = 0, _mxDeltaSpeed = 0, _twCubeX = 0, _hoverMx = 0, _hoverMy = 0, _twHoverX = 0, _twHoverY = 0;

	var _bg = new BGGlitch(_el, true);
	var _randomGlitch = setInterval(_bg.glitch, 10000);

	function degToRad(degrees){
		return degrees * (Math.PI/180);
	}
		
	function init(){
		if(!_on) return;
		_camera = new THREE.PerspectiveCamera(45, GLB._vw / GLB._reliableSh, 64, 2048);//field of view, frustum aspect ratio, near, far
		_camera.position.set(0, 0, 1024+128);

		_scene = new THREE.Scene();
		
		_renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
		//renderer.setPixelRatio(window.devicePixelRatio);
		_renderer.setPixelRatio(1);
		_renderer.setSize(GLB._vw, GLB._reliableSh);
		
		//Build The Cube
		_cube = new THREE.Group();
		_innerCube = new THREE.Group();
		_cube.rotation.set(degToRad(-4),degToRad(-45+32),degToRad(4));
		_cube.position.x = 512;
		_textureLoader = new THREE.TextureLoader();

		//Sides
		_sideGeom = new THREE.PlaneGeometry(512, 512, 4, 4);
		for(var i=0;i<5;i++){
			var _txt = _textureLoader.load("/Assets/Grx/3d_"+(i+1)+".png");
			_textures.push(_txt);
			var _sideMat = new THREE.MeshBasicMaterial({transparent:true, map:_txt, side:THREE.FrontSide});
			_materials.push(_sideMat);
			var _side = new THREE.Group();
			var _sideImgs = new THREE.Mesh(_sideGeom, _sideMat);
			_sideImgs.position.set(0,0,352);
			_side.add(_sideImgs);
			_side.rotation.set(0,degToRad(360/5 * i),0);
			_sides.push(_sideImgs);
			_innerCube.add(_side);
		}
		_cube.add(_innerCube);
		_scene.add(_cube);

		//Add to DOM
		_el.appendChild(_renderer.domElement);

		GLBEvents(window, "LayoutUpdate", resized, true);
		resized();
		animate();
		//Interaction
		if(GLB._hasTouch){
			GLBEvents(window, "touchstart", md, true);
			window.addEventListener("touchmove", moved, {passive:false});
		}
		else GLBEvents(window, "mousemove", hovering, true);
		GLBEvents(window, "mousedown", md, true);
		//Anim in
		gsap.to(_cube.position, 2, {x:0, y:0, z:0, ease:"expo"});
		gsap.to(_cube.rotation, 2, {y:degToRad(-45), ease:"expo"});
		//Start first two
		_currentLeftId = 0;
		_currentRightId = 1;
		_grxElements[0].classList.add("l");
		_grxElements[1].classList.add("r");
	}

	function md(e){
		_dragging = true;
		if(e.type == "touchstart"){
			_mxInit = e.touches[0].clientX - _mxDelta;
			GLBEvents(window, "touchend", mup, true);
		}
		else{
			_mxInit = e.clientX - _mxDelta;
			GLBEvents(window, "mousemove", moved, true);
			GLBEvents(window, "mouseup", mup, true);
		}
		_mxDeltaSpeed = _oldDeltaX = 0;
		gsap.ticker.add(engine);
	}
	function moved(e){
		if(!_dragging) return;
		e.preventDefault(), e.stopPropagation();
		if(e.type == "touchmove") _mxDelta = e.touches[0].clientX - _mxInit;
		else _mxDelta = e.clientX - _mxInit;
		_mxDeltaSpeed = ((_mxDelta - _oldDeltaX) + _mxDeltaSpeed) / 2;
		_oldDeltaX = _mxDelta;
	}
	function mup(e){
		_dragging = false;
		GLBEvents(window, "mousemove", moved, false);
		GLBEvents(window, "mouseup", mup, false);
		GLBEvents(window, "touchend", mup, false);
		if(Math.random() > .3) _bg.glitch();
	}
	function hovering(e){
		_hoverMx = (e.clientX - GLB._vw*.5) / 200;
		_hoverMy = (e.clientY - GLB._reliableSh*.5) / 200;
	}

	function engine(){
		if(!_dragging){
			_mxDelta += _mxDeltaSpeed;
			_mxDeltaSpeed *= .95;
			if(Math.abs(_mxDeltaSpeed) <= .02){
				//console.log("stop");
				gsap.ticker.remove(engine);
			}
		}
		_twCubeX += ((_mxDelta*.2)-_twCubeX)*.1;
		
		//Nearest two sides
		var _d;
		_smallestDist = 10000, _smallestId = -1;
		for(var i=0;i<5;i++){
			_v = _sides[i].geometry.vertices[2].clone();
			_v.applyMatrix4(_sides[i].matrixWorld);
			_d = _camera.position.distanceTo(_v);
			if(_d < _smallestDist){
				_smallestDist = _d;
				_smallestId = i;
			}
		}
		//Find second smallest
		_nsmallestDist = 10000, _nsmallestId = -1;
		for(i=0;i<5;i++){
			if(i != _smallestId){
				_v = _sides[i].geometry.vertices[2].clone();
				_v.applyMatrix4(_sides[i].matrixWorld);
				_d = _camera.position.distanceTo(_v);
				if(_d < _nsmallestDist){
					_nsmallestDist = _d;
					_nsmallestId = i;
				}
			}
		}
		if(Math.abs(_smallestId - _nsmallestId) > 2){
			if(_smallestId > _nsmallestId) _leftId = _smallestId, _rightId = _nsmallestId;
			else _leftId = _nsmallestId, _rightId = _smallestId;
		}
		else{
			if(_smallestId < _nsmallestId) _leftId = _smallestId, _rightId = _nsmallestId;
			else _leftId = _nsmallestId, _rightId = _smallestId;
		}
		
		if(_leftId == _currentLeftId && _rightId == _currentRightId) return;
		if(_currentLeftId != -1) _grxElements[_currentLeftId].classList.remove("l");
		if(_currentRightId != -1) _grxElements[_currentRightId].classList.remove("r");
		_currentLeftId = _leftId;
		_currentRightId = _rightId;
		_grxElements[_leftId].classList.add("l");
		_grxElements[_rightId].classList.add("r");
		//console.log("New:", _leftId, _rightId);
	}

	function resized(e){
		var _vw = GLB._vw, _vh = GLB._reliableSh;
		_camera.aspect = _vw / _vh;
		if(GLB._isMobile){
			_innerCube.scale.set(.75,.75,.75);
			_camera.position.set(0, 0, 1024+512);
		}
		else _camera.position.set(0, 0, 1024+128);
		_camera.updateProjectionMatrix();
		_renderer.setSize(_vw, _vh);
	}
	
	function animate(){
		if(!_on) return;
		requestAnimationFrame(animate);
		_twHoverX += (_hoverMx-_twHoverX)*.05;
		_twHoverY += (_hoverMy-_twHoverY)*.05;
		_innerCube.rotation.y = degToRad(_twCubeX) + degToRad(_twHoverX);
		_innerCube.rotation.x = degToRad(_twHoverY);
		_renderer.render(_scene, _camera);
	}
	init();

	_this.destroy = function(){
		_on = false;
		clearInterval(_randomGlitch);
		_bg.destroy();
		_bg = null;
		if(!_camera) return;
		gsap.ticker.remove(engine);
		GLBEvents(window, "LayoutUpdate", resized, false);
		if(GLB._hasTouch){
			GLBEvents(window, "touchstart", md, false);
			window.removeEventListener("touchmove", moved, {passive:false});
		}
		else GLBEvents(window, "mousemove", hovering, false);
		GLBEvents(window, "mousedown", md, false);
		//Anim in
		gsap.killTweensOf(_cube.position);
		gsap.killTweensOf(_cube.rotation);
		_sideGeom.dispose();
		_renderer.dispose();
		for(var i=0;i<5;i++){
			_grxElements[i].classList.remove("l");
			_grxElements[i].classList.remove("r");
			_lazys[i].destroy();
			_lazys[i] = null;
			_textures[i].dispose();
			_materials[i].dispose();
			_sides[i] = null;
		}
		_grxElements = null;
		_sideGeom = null;
		_innerCube = null;
		_cube = null;
		_scene = null;
		_camera = null;
		_el.removeChild(_renderer.domElement);
		_renderer = null;
	}
}
function WreckingBall(_games){
	var _this = this;
    var Engine = Matter.Engine, Render = Matter.Render, Runner = Matter.Runner, Composites = Matter.Composites, MouseConstraint = Matter.MouseConstraint, Mouse = Matter.Mouse, Composite = Matter.Composite, Constraint = Matter.Constraint, Bodies = Matter.Bodies;

    // create engine
    var engine = Engine.create(), world = engine.world;
	world.gravity.y = 1.0;

    // create renderer
	var _el = _games.getElementsByClassName("game")[2];
	_el.classList.add("on");
	var render = Render.create({element:_el, engine:engine,options: {
            width:GLB._vw, height:GLB._reliableSh, showAngleIndicator:false, wireframes:false, background:"transparent"
        }
    });
    Render.run(render);

    // create runner
    var runner = Runner.create();
    Runner.run(runner, engine);

	function wall(x, y, w, h) {
		return Matter.Bodies.rectangle(x+w/2, y+h/2, w, h, {isStatic:true, render:{visible:false}});
	}
	var _walls = [wall(0, -40, GLB._vw, 40),
		wall(GLB._vw, 0, 40, GLB._reliableSh),
		wall(0, GLB._reliableSh, GLB._vw, 40),
		wall(-40, 0, 40, GLB._reliableSh)];

    
	//Logos circle/rectangle
	var _prefix = "../Assets/Grx/Logos/";
	var _clogos = ["logo_4", "logo_5", "logo_6", "logo_7", "logo_9", "logo_10", "logo_11"];
	var _rlogos = ["logo_1", "logo_2", "logo_3", "logo_8", "logo_12", "logo_13"];
	var _numLogos = _clogos.length;
	
	function getCLogo(){
		_cLogoIndex++;
		return _prefix+_clogos[_cLogoIndex]+".png";
	}
	function getRLogo(){
		_rLogoIndex++;
		return _prefix+_rlogos[_rLogoIndex]+".png";
	}
	var _cLogoIndex = -1, _rLogoIndex = -1, _radius = 70, _rectW = 200, _rectH = 50, _txtscale = 1;
	if(GLB._isMobile) _radius = 35, _rectW = 100, _rectH = 25, _txtscale = .5;
	var _circleStack, _rectStack;
	
	var _density = 0.001, _frictionAir = 0.005, _restitution = 0.001, _friction = 0.01;

	function newContent(){
		_cLogoIndex = _rLogoIndex = -1;
		_numLogos = _clogos.length;
		_circleStack = Composites.stack(0, 25, _numLogos, 1, GLB._vw/_numLogos/2, 0, function(x, y){       
            return Bodies.circle(Math.min(x,GLB._vw-100), y+Math.random()*GLB._reliableSh*.25, _radius, {
                density:_density, frictionAir:_frictionAir, restitution:_restitution, friction:_friction, render:{sprite:{texture:getCLogo(),xScale:_txtscale,yScale:_txtscale}}
            });
		});
		_numLogos = _rlogos.length;
		_rectStack = Composites.stack(0, 25, _numLogos, 1, GLB._vw/_numLogos/2, 0, function(x, y){       
				return Bodies.rectangle(Math.min(x,GLB._vw-100), y+Math.random()*GLB._reliableSh*.35, _rectW, _rectH, {
					density:_density, frictionAir:_frictionAir, restitution:_restitution, friction:_friction, render:{sprite:{texture:getRLogo(),xScale:_txtscale,yScale:_txtscale}}
				});
		});		
	}
	newContent();
	//Add to scene
	Composite.add(world, [_circleStack,_rectStack,_walls[0],_walls[1],_walls[2],_walls[3]]);
	
	//Add more after some initial play time
	function addMore(){
		newContent();
		Composite.add(world, [_circleStack,_rectStack]);
	}
	var _moreTimer;

	//Cursor following mouse
	var _cursor = Bodies.circle(0, 0, 20, {density:0.05, frictionAir:0.00001, restitution:0.00001, friction:1, isStatic:true, render:{visible:false}});
	Composite.add(world, _cursor);
	function mouseupdated(){
		if(!_mouse.position.x) return;
		Matter.Body.setVelocity(_cursor, {
			x: (_cursor.position.x - _mouse.position.x)*2, y: (_cursor.position.y - _mouse.position.y)*2
		});
		Matter.Body.setPosition(_cursor, {
			x: _mouse.position.x, y: _mouse.position.y
		});
	}
	var _mouse, _mouseConstraint;
	if(GLB._hasTouch){
		//simple drag and throw
		_mouse = Mouse.create(render.canvas);
		_mouseConstraint = MouseConstraint.create(engine, {mouse:_mouse, constraint:{stiffness:1.0, render:{visible:false}}});
		Composite.add(world, _mouseConstraint);
	}
	else{
		//push elements with cursor
		_mouse = Mouse.create(render.canvas);
    	render.mouse = _mouse; // keep the mouse in sync with rendering
		Matter.Events.on(engine, 'afterUpdate', mouseupdated);
		_moreTimer = setTimeout(addMore, 10000);
	}
	

    // fit the render viewport to the scene
    Render.lookAt(render, {min:{x:0, y:0},max:{x:GLB._vw, y:GLB._reliableSh}});
	
	var _prevW = GLB._vw, _prevH = GLB._reliableSh;
	function resized(e){
		render.options.width = GLB._vw;
		render.options.height = GLB._reliableSh;
		render.bounds.max.x = GLB._vw;
		render.bounds.max.y = GLB._reliableSh;
		render.canvas.width = GLB._vw;
		render.canvas.height = GLB._reliableSh;
		//Adjust walls
		Matter.Body.setPosition(_walls[0], {x:GLB._vw/2,y:-20});
		Matter.Body.setPosition(_walls[1], {x:GLB._vw+20,y:GLB._reliableSh/2});
		Matter.Body.setPosition(_walls[2], {x:GLB._vw/2,y:GLB._reliableSh+20});
		Matter.Body.setPosition(_walls[3], {x:-20,y:GLB._reliableSh/2});		
		//Width of top/bottom
		Matter.Body.scale(_walls[0], GLB._vw/_prevW, 1);		
		Matter.Body.scale(_walls[2], GLB._vw/_prevW, 1);
		//Height of right/left
		Matter.Body.scale(_walls[1], 1, GLB._reliableSh/_prevH);
		Matter.Body.scale(_walls[3], 1, GLB._reliableSh/_prevH);
		//
		_prevW =  GLB._vw;
		_prevH = GLB._reliableSh;
	}
	GLBEvents(window, "LayoutUpdate", resized, true);

	_this.destroy = function(){
		_el.classList.remove("on");
		GLBEvents(window, "LayoutUpdate", resized, false);
		Matter.Events.off(engine, 'afterUpdate', mouseupdated);
		Matter.World.clear(world);
		Engine.clear(engine);
		Render.stop(render);
		Runner.stop(runner);
		render.canvas.remove();
		render.canvas = null;
		render.context = null;
		render.textures = {};
		clearTimeout(_moreTimer);
	}
}
function SprayCan(_games){
	var _this = this;
	var _game = _games.getElementsByClassName("game")[3];
	_game.classList.add("on");
	var canvas = _game.getElementsByClassName("canvas")[0];
	var ctx = canvas.getContext('2d');		
	
	function resized(e){
		canvas.width = GLB._vw;
		canvas.height = GLB._reliableSh;
		/* Drawing on Paint App */
		ctx.lineWidth = 1;
		ctx.lineJoin = ctx.lineCap = "round";
		ctx.fillStyle = "#0CFB03";
	}
	GLBEvents(window, "resize", resized, true);
	resized(null);

	function bgLoaded(){
		_bgImg.img.classList.add("in");
	}
	var _bgImg = new GLBImage("/Assets/Grx/game2_bg.jpg", _game.getElementsByClassName("darkgreen")[0], 816, 1080, "bg img fade", bgLoaded, true, "");
	_bgImg.load();
	
	var mouse = {x: 0, y: 0};		
	var _touched = false;	
	var _sprayIntervalID, random_angle, random_radius, _radius = 40, density = 1000, offset, x, y;
	if(GLB._isMobile) _radius = 20, density = 500;

	function down(e){
		_touched = true;
		moved(e);
		_sprayIntervalID = setInterval(moved, 200);
	}
	function moved(e){
		if(!_touched) return;
		if(e){
			if(e.type == "touchmove") e.stopPropagation(), e.preventDefault();
			if(e.type == "mousemove" || e.type == "mousedown") mouse.x = e.clientX, mouse.y = e.clientY;
			else mouse.x = e.touches[0].clientX, mouse.y = e.touches[0].clientY;
		}
		generateSprayParticles();
	}
	function mouseup(e){
		_touched = false;
		clearInterval(_sprayIntervalID);
	}
	function getRandomOffset(radius){
		random_angle = Math.random() * (2*Math.PI);
		random_radius = Math.random() * radius;			
		return{x: Math.cos(random_angle) * random_radius, y: Math.sin(random_angle) * random_radius};
	}
	function generateSprayParticles(){
		// Particle count, or, density
		for (var i = 0; i < density; i++) {
			offset = getRandomOffset(_radius);				
			x = mouse.x + offset.x;
			y = mouse.y + offset.y;				
			ctx.fillRect(x, y, 1, 1);
		}
	}

	//Init
	_cursor.largeforgame();
	if(GLB._hasTouch){
		GLBEvents(window, "touchstart", down, true);
		window.addEventListener("touchmove", moved, {passive:false});
		GLBEvents(window, "touchend", mouseup, true);
	}
	else{
		GLBEvents(window, "mousedown", down, true);
		GLBEvents(window, "mousemove", moved, true);
		GLBEvents(window, "mouseup", mouseup, true);
	}

	_this.destroy = function(){
		_game.classList.remove("on");
		GLBEvents(window, "resize", resized, false);
		clearInterval(_sprayIntervalID);
		if(GLB._hasTouch){
			GLBEvents(window, "touchstart", down, false);
			window.removeEventListener("touchmove", moved, {passive:false});
			GLBEvents(window, "touchend", mouseup, false);
		}
		else{
			GLBEvents(window, "mousedown", down, false);
			GLBEvents(window, "mousemove", moved, false);
			GLBEvents(window, "mouseup", mouseup, false);
		}
		_bgImg.destroy();
		_bgImg = null;
		_cursor.mouseoutAsBackground();
	}
}
function Basket(_games){
	var _this = this;
	var Engine = Matter.Engine, Render = Matter.Render, Runner = Matter.Runner, Composites = Matter.Composites, MouseConstraint = Matter.MouseConstraint, Mouse = Matter.Mouse, Composite = Matter.Composite, Constraint = Matter.Constraint, Bodies = Matter.Bodies, Events = Matter.Events;

    // create engine
    var engine = Engine.create(), world = engine.world;
	world.gravity.y = 1;

    // create renderer
	var _el = _games.getElementsByClassName("game")[4];
	_el.classList.add("on");
	var render = Render.create({element:_el, engine:engine,options: {
            width:GLB._vw, height:GLB._reliableSh, showAngleIndicator:false, wireframes:false, background:"transparent"
        }
    });
    Render.run(render);
	var _bg = new BGGlitch(_el, false);

	//Scoreboard
	var _scoreboard = document.createElement("div");
	_scoreboard.className = "scoreboard";
	_scoreboard.textContent = "00";
	_el.appendChild(_scoreboard);
	var _score = 0;

	function addPoint(){
		_score++;
		if(_score < 10) _scoreboard.textContent = "0"+_score;
		else _scoreboard.textContent = _score;
		_bg.glitch();
	}

    // create runner
    var runner = Runner.create();
    Runner.run(runner, engine);
	var _cLogoIndex = -1, _radius = 70, _txtscale = 1;
	if(GLB._isMobile) _radius = 35, _txtscale = .5;

	function wall(x, y, w, h) {
		return Matter.Bodies.rectangle(x+w/2, y+h/2, w, h, {isStatic:true, render:{visible:false}});
	}
	var _walls = [wall(0, -40, GLB._vw, 40),
		wall(GLB._vw, 0, 40, GLB._reliableSh),
		wall(0, GLB._reliableSh, GLB._vw, 40),
		wall(-40, 0, 40, GLB._reliableSh)];

	function basketline(x, y, w, h) {
		return Matter.Bodies.rectangle(x+w/2, y+h/2, w, h, {isStatic:false, density:1, friction:1, restitution:1, render:{visible:false}});
	}
	//Basket (invisible walls)
	var _basket = [wall(10, GLB._reliableSh*.4, 2, 240*_txtscale), wall(210*_txtscale, GLB._reliableSh*.4, 5, 30), basketline(150*_txtscale, GLB._reliableSh*.4, 2, 160*_txtscale)];
    Matter.Body.rotate(_basket[1], .2);
	Matter.Body.rotate(_basket[2], .4);
	var _constraint = Constraint.create({
        pointA:{x:200*_txtscale, y:GLB._reliableSh*.4-150},
        bodyB: _basket[2],
        pointB:{x:0, y:-80},
        stiffness:0.05, damping:0.5, render:{visible:false}
    });
	var _constraintb = Constraint.create({
        pointA:{x:0, y:GLB._reliableSh*.4 + 400},
        bodyB: _basket[2],
        pointB:{x:0, y:80},
        stiffness:0.1, damping:0.8, render:{visible:false}
    });
	//Visible basket
	var _visibleBasket = document.createElement("div");
	_visibleBasket.className = "visibleBasket";
	var _basketImg = new GLBImage("../Assets/Grx/Basket/basket.png", _visibleBasket, null, null, "basketImg", null, false);
	_basketImg.load();
	_el.appendChild(_visibleBasket);

	var _numPairs = 0;
	var _hittest = _basket[2];
	var _time = new Date().getTime();
	function collided(e){
		var pairs = e.pairs;
		_numPairs = pairs.length;
		if(_mouseConstraint.body) return;//currently dragging
		for(var i=0; i<_numPairs; i++){
            var pair = pairs[i];
			_time = new Date().getTime();
			//Check position of other body and time since last scoring
			if(pair.bodyA == _hittest){	
				if(pair.bodyB.position.x < 200 && pair.bodyB.position.y < GLB._reliableSh*.4+160 && pair.bodyB.scoreTime && _time-pair.bodyB.scoreTime > 2000){
					pair.bodyB.scoreTime = _time;
					addPoint();
				}
			}
			else if(pair.bodyB == _hittest){
				if(pair.bodyA.position.x < 200 && pair.bodyA.position.y < GLB._reliableSh*.4+160 && pair.bodyA.scoreTime && _time-pair.bodyA.scoreTime > 2000){
					pair.bodyA.scoreTime = _time;
					addPoint();
				}
			}
        }
	}
    Events.on(engine, 'collisionEnd', collided);
	
	//Faces
	var _prefix = "../Assets/Grx/Basket/";
	var _clogos = ["adam_clementson","andy_crawford","andy_turnbull","ann_roddy","cat_hair","emma_fletcherpng","hazel_howat","holly_astbury","immi_marsh","jenni_allen","joshua_conroy","michael_stanton","nadine_thomas","nick_johnson","ollie_roddy","paul_martin","pete_evans","rachel_lloyd","selina_kavanagh","steve_verrall","tom_maylott","tom_parker"];
	var _numLogos = _clogos.length;
	
	function getCLogo(){
		_cLogoIndex++;
		return _prefix + _clogos[_cLogoIndex] + ".png";
	}
	
	var _circleStack;
	
	var _density = 0.2, _frictionAir = 0.005, _restitution = 0.8, _friction = 0.1;

	function newContent(){
		_cLogoIndex = -1;
		_numLogos = _clogos.length;
		_circleStack = Composites.stack(150, 25, _numLogos, 1, GLB._vw/_numLogos/6, 0, function(x, y){       
            return Bodies.circle(Math.min(x,GLB._vw-100), y+Math.random()*GLB._reliableSh*.25, _radius, {
                density:_density, frictionAir:_frictionAir, restitution:_restitution, friction:_friction, render:{sprite:{texture:getCLogo(),xScale:_txtscale,yScale:_txtscale}}
            });
		});		
	}
	newContent();
	//Add to scene
	Composite.add(world, [_circleStack,_walls[0],_walls[1],_walls[2],_walls[3], _basket[0], _basket[1], _basket[2], _constraint, _constraintb, _visibleBasket]);
	for(var i=0;i<_numLogos;i++){
		_circleStack.bodies[i].scoreTime = _time;
	}
	
	//simple drag and throw
	_mouse = Mouse.create(render.canvas);
	_mouseConstraint = MouseConstraint.create(engine, {mouse:_mouse, constraint:{stiffness:.5, render:{visible:false}}});
	Composite.add(world, _mouseConstraint);
	

    // fit the render viewport to the scene
    Render.lookAt(render, {min:{x:0, y:0},max:{x:GLB._vw, y:GLB._reliableSh}});
	
	var _prevW = GLB._vw, _prevH = GLB._reliableSh;
	function resized(e){
		render.options.width = GLB._vw;
		render.options.height = GLB._reliableSh;
		render.bounds.max.x = GLB._vw;
		render.bounds.max.y = GLB._reliableSh;
		render.canvas.width = GLB._vw;
		render.canvas.height = GLB._reliableSh;
		//Adjust walls
		Matter.Body.setPosition(_walls[0], {x:GLB._vw/2,y:-20});
		Matter.Body.setPosition(_walls[1], {x:GLB._vw+20,y:GLB._reliableSh/2});
		Matter.Body.setPosition(_walls[2], {x:GLB._vw/2,y:GLB._reliableSh+20});
		Matter.Body.setPosition(_walls[3], {x:-20,y:GLB._reliableSh/2});
		//Width of top/bottom
		Matter.Body.scale(_walls[0], GLB._vw/_prevW, 1);		
		Matter.Body.scale(_walls[2], GLB._vw/_prevW, 1);
		//Height of right/left
		Matter.Body.scale(_walls[1], 1, GLB._reliableSh/_prevH);
		Matter.Body.scale(_walls[3], 1, GLB._reliableSh/_prevH);
		//Move basket
		Matter.Body.setPosition(_basket[0], {x:10*_txtscale,y:GLB._reliableSh*.4+20});
		Matter.Body.setPosition(_basket[1], {x:210*_txtscale,y:GLB._reliableSh*.4+15});
		Matter.Body.setPosition(_basket[2], {x:150*_txtscale,y:GLB._reliableSh*.4+80});
		_constraint.pointA.y = GLB._reliableSh*.4-150;
		_constraintb.pointA.y = GLB._reliableSh*.4+400;
		//
		_prevW =  GLB._vw;
		_prevH = GLB._reliableSh;
	}
	GLBEvents(window, "LayoutUpdate", resized, true);

	_this.destroy = function(){
		_bg.destroy();
		_bg = null;
		GLBEvents(window, "LayoutUpdate", resized, false);
		Events.off(engine, 'collisionEnd', collided);
		Matter.World.clear(world);
		Engine.clear(engine);
		Render.stop(render);
		Runner.stop(runner);
		render.canvas.remove();
		render.canvas = null;
		render.context = null;
		render.textures = {};
		_el.removeChild(_visibleBasket);
		_el.removeChild(_scoreboard);
		_basketImg.destroy();
		_basketImg = null;
	}
}

function GameManager(){
	var _gameDOM = document.createElement("div");
	_gameDOM.className = "games";
		
	//Load html for games
	var _prefetch = new Prefetch("/games_html.html");
	function appendPage(){
		_gameDOM.innerHTML = _prefetch._content.innerHTML;
		document.body.appendChild(_gameDOM);
	}
	_prefetch.getContent(appendPage);

	//Listen for starting games
	var _alive = false;
	var _gameIsOn = false;
	function init(){
		if("Matter" in window && "THREE"){
			_alive = true;
			if(_gameIsOn) openGame();
			//console.log("Games ready");
		}
		else setTimeout(init, 100);
	}
	init();

	var _game;
	function openGame(e){
		_gameIsOn = true;
		if(!_alive) return;
		if(_flipsideGameId == 0) _game = new ImageTrail(_gameDOM);
		else if(_flipsideGameId == 1) _game = new RotatingPentagon(_gameDOM);
		else if(_flipsideGameId == 2) _game = new WreckingBall(_gameDOM);
		else if(_flipsideGameId == 3) _game = new SprayCan(_gameDOM);
		else if(_flipsideGameId == 4) _game = new Basket(_gameDOM);
		_gameDOM.classList.add("gameon");

		GLBEvents(window, "closeFlipside", closeFlipside, true);
	}
	function closeFlipside(e){
		GLBEvents(window, "closeFlipside", closeFlipside, false);
		_gameDOM.classList.remove("gameon");
		removeOld();
	}
	function removeOld(){
		if(_game){
			_game.destroy();
			_game = null;
		}
	}
	GLBEvents(window, "openGame", openGame, true);
}
new GameManager();
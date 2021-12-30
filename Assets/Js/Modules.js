/*		v 1.1 - revised 23/11 2021 ILTP		*/
//Observer util (detects in-viewport and fires load callback)
function Observer(_target, _margin, _threshold, _inCB, _outCB){
	var _this = this;
	var _observer;
	var _destroyOnIntersect = true;
	if(_outCB) _destroyOnIntersect = false;

	function intersected(entries){
		if(entries[0].isIntersecting || (entries.length > 1 && entries[1].isIntersecting)){
			if(_destroyOnIntersect){
				_observer.unobserve(_target);
				_observer = null;
			}
			_inCB.call();
		}
		else if(!_destroyOnIntersect){
			if(_outCB) _outCB.call();
		}
	}

	if(GLB._hasIntersectionObs){
		var _m = _margin * GLB._reliableSh + "px";
		_observer = new IntersectionObserver(intersected, {root:null,rootMargin:_m,threshold:_threshold});
		_observer.observe(_target);
	}
	else _inCB.call();

	_this.destroy = function(){
		if(_observer){
			_observer.unobserve(_target);
			_observer = null;
		}
	}
}
//Lazy loading image/video
function LazyMedia(_me){
	return;
	var _this = this;
		
	//Relation
	var _sizes = (_me.getAttribute("data-rel") || "").split(",");
	var _rel = document.createElement("div");
	_rel.className = "rel";
	function setRel(){
		if(GLB._isMobile) _rel.style.paddingTop = ((_sizes[3] / _sizes[2]) * 100) + "%";
		else _rel.style.paddingTop = ((_sizes[1] / _sizes[0]) * 100) + "%";
	}
	if(_sizes.length > 2) GLBEvents(window, "betweenBreakpoint", setRel, true), setRel();
	else _rel.style.paddingTop = ((_sizes[1] / _sizes[0]) * 100) + "%";
	//_me.appendChild(_rel);
	_me.insertBefore(_rel, _me.firstChild);

	//This can be either image or video
	var _urls = _me.getAttribute("data-src") || "";
	var _isVideo = (_urls.indexOf("mp4") != -1);
	var _videoType = (_me.getAttribute("data-type") || "").toLowerCase();
	if(_videoType == "youtube" || _videoType == "vimeo") _isVideo = true;
	var _media;
	if(_isVideo) _media = new Videoplayer(_me, _rel, _videoType);
	else _media = new ResponsiveImg(_me, _rel);
	
	//Load observer and fadein observer
	function inLoadView(){
		_media.inLoadView();
	}
	function outLoadView(){
		_media.outLoadView();
	}
	function inFadeView(){
		_media.inFadeView();
	}
	function outFadeView(){
		_media.outFadeView();
	}
	var _loadObserver;
	if(_isVideo) _loadObserver = new Observer(_me, .25, 0, inLoadView, outLoadView); //Loaded when they are within 1/4 screenheight away
	else _loadObserver = new Observer(_me, 2, 0, inLoadView, outLoadView); //Loaded when they are within 2 screenheights away
	var _fadeInObserver = new Observer(_me, .05, 0, inFadeView, outFadeView);

	//Used for IE object-fit
	_this.contain = function(){
		_media.contain();
	}

	_this.destroy = function(){
		GLBEvents(window, "betweenBreakpoint", setRel, false);
		_loadObserver.destroy();
		_loadObserver = null;
		_fadeInObserver.destroy();
		_fadeInObserver = null;
		_me.removeChild(_rel);
		_media.destroy();
		_media = null;
		_rel = null;
	}
}
//Shifts between mobile/desktop image
function ResponsiveImg(_el, _alternativeParent){
	var _this = this;
	var _urls = (_el.getAttribute("data-src") || "").split("|");
	var _alt = (_el.getAttribute("data-alt") || "");
	var _loadInit = false, _hasVersions = (_urls.length > 1), _animTimer;
	var _curImg, _baseImg, _mobileImg;
	var _parent = _el;
	var _isHero = _el.parentNode && _el.parentNode.className.indexOf("projecthero") != -1;
	var _loaded = false, _inView = false;
	if(_alternativeParent) _parent = _alternativeParent;
	//Effects
	var _addNoise = _el.className.indexOf("noise") != -1;
	if(_addNoise){
		if(GLB._isMobile && _el.parentNode.className == "tr para") _addNoise = false;//cancel mobile effect
	}
	var _effect, _effectTimer;
	//console.log("_addNoise", _addNoise);
	
	function createBaseImg(){
		if(!_baseImg) _baseImg = new GLBImage(_urls[0], _parent, null, null, "img fade", loaded, true, _alt);//base/desktop
		_curImg = _baseImg;
	}
	function createMImg(){
		if(!_mobileImg) _mobileImg = new GLBImage(_urls[1], _parent, null, null, "img fade", loaded, true, _alt);//mobile
		_curImg = _mobileImg;
	}
	function loaded(){
		if(GLB._isIE && GLB._ieVersion <= 11) objectFitImages(_curImg.img);
		if(_isHero && _justOpenedProject) animIn();
		else if(_inView || _loaded) clearTimeout(_animTimer), _animTimer = setTimeout(animIn, 50); //in view or loaded (because betweenBreakpoint fired)
		_loaded = true;
	}

	function animIn(){
		if(_justOpenedProject) _curImg.img.classList.add("instant");
		_curImg.img.classList.add("in");
		if(_isHero && _justOpenedProject) window.dispatchEvent(new GLBEvent("projectHeroLoaded")); //new project hero loaded
		_animTimer = setTimeout(animInOver, 850);
	}
	function animInOver(e){
		if(_curImg){
			_curImg.img.classList.add("complete");
			//Start image effects
			if(_addNoise && !_effect) addEffect();
		}
		else console.log("No curimage", _urls);
	}
	function addEffect(){
		var _curl = _urls[0];
		if(_hasVersions && GLB._isMobile) _curl = _urls[1];
		if("DistortImage" in window && "THREE" in window){
			_effect = new DistortImage(_el, _curl);
			if(_inView) _effect.inView();
		}
		else _effectTimer = setTimeout(addEffect, 100);
	}

	//Load triggered from parent
	_this.inLoadView = function(){
		if(_loadInit) return;
		_loadInit = true;
		if(_hasVersions){
			if(GLB._isMobile) createMImg();
			else createBaseImg();
			//Now start listening
			GLBEvents(window, "betweenBreakpoint", switchImg, true);
		}
		else createBaseImg(); //Load the one defined
		_curImg.load();
	}
	_this.outLoadView = function(){}
	_this.inFadeView = function(){
		_inView = true;
		//console.log("inFadeView", _loaded)
		if(_loaded) clearTimeout(_animTimer), _animTimer = setTimeout(animIn, 50); //image alrady finished loading, so it hasn't faded in yet
		if(_effect) _effect.inView();
	}
	_this.outFadeView = function(){
		_inView = false;
	}
	_this.contain = function(){
		if(!_curImg) return;
		if(GLB._isIE && GLB._ieVersion <= 11){
			//console.log("Fix object-fit", _curImg.img);
			objectFitImages(_curImg.img);
		}
	}

	function switchImg(e){
		//console.log("switchImg", _urls);
		_curImg.remove(); //Remove current
		if(GLB._isMobile) createMImg();
		else createBaseImg();
		_curImg.load();
	}
	
	_this.destroy = function(){
		//console.log("Destroy:", _urls[0])
		clearTimeout(_animTimer);
		if(_baseImg){
			_baseImg.destroy();
			_baseImg = null;
		}
		if(_mobileImg){
			_mobileImg.destroy();
			_mobileImg = null;
		}
		clearTimeout(_effectTimer);
		if(_effect){
			_effect.destroy();
			_effect = null;
		}
		_curImg = null;
		_parent = null;
		GLBEvents(window, "betweenBreakpoint", switchImg, false);
	}
}

function Videoplayer(_el, _rel, _videoType){
	var _this = this;
	var _autoplay = (_el.getAttribute("data-autoplay") || "") == "true";
	var _player;
	var _inLoadView = false, _inFadeView = false, _loadPoster = false;

	var _poster = _el.getAttribute("data-poster") || "";
	var _hasPoster = (_poster != "");
	var _posterImg, _posterCursor;
	if(_autoplay) _hasPoster = false;
		
	function createPlayer(){
		if(_videoType == "youtube") _player = new YTPlayer(_el, _rel, _autoplay); 
		else if(_videoType == "vimeo") _player = new VimeoPlayer(_el, _rel, _autoplay); 
		else _player = new ResponsiveVideo(_el, _rel, _autoplay);
		if(_inLoadView) _this.inLoadView();
		if(_inFadeView) _this.inFadeView();
		_el.parentNode.classList.add("playerloaded");
	}

	_this.inLoadView = function(){
		_inLoadView = true;
		if(_player) _player.inLoadView();
		if(_loadPoster) _loadPoster = false, _posterImg.load();
	}
	_this.outLoadView = function(){
		_inLoadView = false;
		if(_player) _player.outLoadView();
	}
	_this.inFadeView = function(){
		_inFadeView = true;
		if(_player) _player.inFadeView();
	}
	_this.outFadeView = function(){
		_inFadeView = false;
		if(_player) _player.outFadeView();
	}

	function posterLoaded(){
		_posterImg.img.classList.add("in");
		_posterImg.img.classList.add("cursorhover");
		_posterCursor = new CursorHover(_posterImg.img);
	}
	function posterClick(e){
		_posterImg.img.classList.remove("in");
		_posterImg.img.classList.add("done");
		_posterCursor.destroy();
		_posterCursor = null;
		_el.dispatchEvent(new GLBEvent("updateCursor"));
		GLBEvents(_posterImg.img, "click", posterClick, false);
		_autoplay = true;//no need to have more clicks
		createPlayer();
	}

	//Init
	if(_hasPoster){
		_posterImg = new GLBImage(_poster, _el, null, null, "img fade poster", posterLoaded, true, "Video poster");
		//_posterImg.img.setAttribute("data-icon", "play");
		_posterImg.img.setAttribute("data-cta", "PLAY VIDEO");
		GLBEvents(_posterImg.img, "click", posterClick, true);
		_loadPoster = true;
	}
	else createPlayer();
	
	_this.destroy = function(){
		if(_player){
			_player.destroy();
			_player = null;
		}
		if(_posterCursor){
			_posterCursor.destroy();
			_posterCursor = null;
		}
		if(_posterImg){
			GLBEvents(_posterImg.img, "click", posterClick, false);
			_posterImg.destroy();
			_posterImg = null;
		}
	}
}

function ResponsiveVideo(_el, _alternativeParent, _autoplay){
	var _this = this;
	var _urls = (_el.getAttribute("data-src") || "").split("|");
	var _loops = (_el.getAttribute("data-loop") || "true") == "true";
	var _loaded = false, _playing = false, _hasVersions = (_urls.length > 1);
	var _parent = _el;
	if(_alternativeParent) _parent = _alternativeParent;

	//Create one player (and change src when needed)
	var _video = document.createElement("video");
	_video.className = "img fade";
	_video.preload = "metadata";

	//If controls (custom):
	_video.muted = true;
	_video.autoplay = _autoplay;
	_video.controls = false;
	_video.loop = _loops;
	_video.setAttribute('playsinline', 'true'); // must be set before src is set or it will be ignored
	_video.playsinline = true;
	var _srcMp4 = document.createElement("source"); 
	_srcMp4.type = "video/mp4";
	
	function setSrc(e){
		if(GLB._isMobile) _srcMp4.src = _urls[1];
		else _srcMp4.src = _urls[0];
		_video.appendChild(_srcMp4);
	}
	_parent.appendChild(_video);

	function ended(e){
		window.dispatchEvent(new GLBEvent("introVideoEnded"));
	}
	if(!_loops){
		GLBEvents(_video, "ended", ended, true);
	}

	//Load triggered from parent
	_this.inLoadView = function(){
		if(!_loaded){
			_loaded = true;
			if(_hasVersions){
				setSrc();
				//Now start listening
				GLBEvents(window, "betweenBreakpoint", setSrc, true);
			}
			else{
				_srcMp4.src = _urls[0]; //Load the one defined
				_video.appendChild(_srcMp4);
			}
			_video.classList.add("in");
		}
		_playing = true, _video.play();
	}
	_this.outLoadView = function(){
		if(_playing) _playing = false, _video.pause();
	}
	_this.inFadeView = function(){
		if(GLB._safariV15 && _loops) startSafariFix();
	}
	_this.outFadeView = function(){
		if(GLB._safariV15 && _loops) stopSafariFix();
	}

	//Safari v 15.0 suddenly doesn't render videos!
	var _safariTimer, _safariToggle = "";
	function startSafariFix(){
		_safariTimer = setInterval(fixSafari, 33);
	}
	function fixSafari(){
		if(_safariToggle == "") _safariToggle = "transform";
		else _safariToggle = "";
		_video.style.willChange = _safariToggle;
	}
	function stopSafariFix(){
		clearInterval(_safariTimer);
	}

	_this.destroy = function(){
		if(GLB._safariV15 && _loops) stopSafariFix();
		GLBEvents(_video, "ended", ended, false);
		_parent.removeChild(_video);
		if(_video){
			_srcMp4.src = "";
			if(_video.contains(_srcMp4)) _video.removeChild(_srcMp4);
			_video.pause();
			_video = null;
			_srcMp4 = null;
		}
		_parent = null;
		GLBEvents(window, "betweenBreakpoint", setSrc, false);
	}
}

//Manage Youtube and Vimeo
function onYouTubeIframeAPIReady(){
	_YoutubeReady = true;
	window.dispatchEvent(GLBEvent("YoutubeAPIReady", 0));
}
function VimeoJsLoaded(){
	_vimeoReady = true;
	window.dispatchEvent(GLBEvent("VimeoAPIReady", 0));
}
var _ytCounter = 0;
var _vimeoJsAdded = false, _vimeoReady = false, _youtubeScriptAdded = false, _YoutubeReady = false;
function YTPlayer(_me, _rel, _autoplay){
	var _this = this;
	var _myId = "YoutubePlayer_"+_ytCounter;
	_ytCounter++;
	var _ytId = _me.getAttribute("data-src");
	
	_this.inLoadView = function(){}
	_this.outLoadView = function(){
		if(_ytPlayer)
		try{_ytPlayer.pauseVideo();}
		catch(e){}
	}
	_this.inFadeView = function(){}
	_this.outFadeView = function(){}

	if(!_youtubeScriptAdded){
		_youtubeScriptAdded = true;
		var _s = document.createElement('script');
		_s.src = "https://www.youtube.com/iframe_api";
		_s.defer = true, _s.async = true;		
		document.body.appendChild(_s);
	}
	
	var _ytPlayer, _playerCon;
	var _vars, _events = {'onReady': onPlayerReady,'onStateChange': onPlayerStateChange};
	
	if(_YoutubeReady) setTimeout(build, 50);
	else GLBEvents(window, "YoutubeAPIReady", build, true); //Wait until Youtube API is ready

	function build(e){
		GLBEvents(window, "YoutubeAPIReady", build, false);
		_playerCon = document.createElement("div");
		_playerCon.setAttribute("id", _myId);
		_playerCon.className = "externalvideoplayer";
		_rel.appendChild(_playerCon);
		if(_autoplay) _autoplay = 1;
		else _autoplay = 0;
		_vars = {'autoplay':_autoplay, 'fs':1, 'autohide':1, 'controls':1, 'playsinline':1, 'disablekb':1, 'html5':1, 'modestbranding':0, 'showinfo':0, 'rel':0, 'enablejsapi':1, 'iv_load_policy':3, 'origin':'https://greenroomdesign.com/'};
		_ytPlayer = new YT.Player(_myId, {videoId:_ytId, playerVars:_vars, events:_events});
	}

	function onPlayerReady(e){
		//console.log("onPlayerReady", e.data);
	}
	function onPlayerStateChange(e){
		//console.log("State", e.data);
	}
	
	_this.destroy = function(){
		GLBEvents(window, "YoutubeAPIReady", build, false);
		if(_ytPlayer){
			try{
				_ytPlayer.stopVideo();
				_ytPlayer.destroy();
				_ytPlayer = null;
			}
			catch(e){
				console.log("error Youtube", e);
			}
		}
		if(_playerCon){
			if(_rel.contains(_playerCon)) _rel.removeChild(_playerCon);
			_playerCon = null;
		}
	}
}
function VimeoPlayer(_me, _rel, _autoplay){
	var _this = this;
	var _vimeoId = _me.getAttribute("data-src");
	
	_this.inLoadView = function(){}
	_this.outLoadView = function(){
		if(_player) _player.pause();
	}
	_this.inFadeView = function(){}
	_this.outFadeView = function(){}

	//Load Vimeo API
	if(!_vimeoJsAdded){
		_vimeoJsAdded = true;
		var _vimeoJs = document.createElement('script');
		_vimeoJs.onload = VimeoJsLoaded;
		_vimeoJs.setAttribute("type","text/javascript");
		_vimeoJs.async = _vimeoJs.defer = true;
		_vimeoJs.setAttribute("src", "https://player.vimeo.com/api/player.js");
		document.body.appendChild(_vimeoJs);
	}
	
	var _playerCon, _player;
	var _myId = "vimeoplayer_" + _ytCounter;
	_ytCounter++;

	if(_vimeoReady) setTimeout(build, 50);
	else GLBEvents(window, "VimeoAPIReady", build, true);

	function build(e){
		//console.log("Vimeo ready - now build player");
		GLBEvents(window, "VimeoAPIReady", build, false);
		_playerCon = document.createElement("div");
		_playerCon.setAttribute("id", _myId);
		_playerCon.className = "externalvideoplayer";
		_rel.appendChild(_playerCon);
		//Create new player
		var _obj = {id:_vimeoId,playsinline:true,byline:false,responsive:true,loop:false,color:"008580",muted:false,autoplay:_autoplay,portrait:false};
		_player = new Vimeo.Player(_myId, _obj);
	}
	
	_this.destroy = function(){
		GLBEvents(window, "VimeoAPIReady", build, false);
		if(_player){
			try{
				_player.pause();
				_player.destroy();
				_player = null;
			}
			catch(e){
				console.log("Error disposing vimeo");
			}
		}
		if(_playerCon) _playerCon = null;
	}
}

//Intro fullscreen video
// function CustomVideoplayer(_el, _parent){
// 	var _this = this;
// 	var _urls = (_el.getAttribute("data-full") || "").split("|");
// 	if(_urls.length == 0) _urls.push(_urls[1]);//mobile version
// 	//Create one player (and change src when needed)
// 	var _me = document.createElement("div");
// 	_me.className = "customvideoplayer";
// 	var _video = document.createElement("video");
// 	_video.className = "player";
// 	//_video.preload = "metadata";
// 	_video.muted = false;
// 	_video.autoplay = true;
// 	_video.controls = false;
// 	_video.loop = false;
// 	_video.setAttribute('playsinline', 'true'); // must be set before src is set or it will be ignored
// 	_video.playsinline = true;
// 	var _srcMp4 = document.createElement("source"); 
// 	_srcMp4.type = "video/mp4";
// 	var _controls = new CustomControls(_video, _me);
	
// 	function setSrc(e){
// 		if(GLB._isMobile && _urls.length > 1) _srcMp4.src = _urls[1];
// 		else _srcMp4.src = _urls[0];
// 		_video.appendChild(_srcMp4);
// 	}
// 	GLBEvents(window, "betweenBreakpoint", setSrc, true);
// 	setSrc(null);
// 	_me.appendChild(_video);
// 	_parent.appendChild(_me);

// 	var _closeBtn;
	
// 	function close(e){
// 		e.stopPropagation();
// 		window.dispatchEvent(new GLBEvent("closeGlobalVideo"));
// 	}
// 	GLBEvents(_me, "close", close, true);


// 	_this.animIn = function(){
// 		_me.classList.add("in");
// 		_closeBtn = new CloseBtn(_me);
// 	}

// 	_this.destroy = function(){
// 		GLBEvents(_me, "close", close, false);
// 		_controls.destroy();
// 		_controls = null;
// 		if(_video){
// 			_srcMp4.src = "";
// 			if(_video.contains(_srcMp4)) _video.removeChild(_srcMp4);
// 			_video.pause();
// 			_me.removeChild(_video);
// 			_video = null;
// 			_srcMp4 = null;
// 		}
// 		if(_closeBtn){
// 			_closeBtn.destroy();
// 			_closeBtn = null;
// 		}
// 		_parent.removeChild(_me);
// 		_me = null;
// 	}
// }
function CustomControls(_video, _parent){
	var _this = this;
	var _duration = _video.duration || 0;

	var _me = document.createElement("div");
	_me.className = "controls";
	var _playPause = document.createElement("button");
	_playPause.className = "playpause";
	_me.appendChild(_playPause);
	var _togglePlayHit = document.createElement("div");
	_togglePlayHit.className = "toggleHit";
	var _progress = document.createElement("div");
	_progress.className = "progress";
	var _bar = document.createElement("div");
	_bar.className = "bar"
	_progress.appendChild(_bar);
	_me.appendChild(_progress);
	_parent.appendChild(_me);
	
	var _playing = false;
	
	GLBEvents(_playPause, "click", toggle, true);
	_parent.appendChild(_me);

	function toggle(e){
		_playing = !_playing;
		if(_playing){
			_video.play();
			_playPause.classList.add("pause");
			//Listen to video progress
			gsap.ticker.add(videoProgress);
		}
		else{
			_video.pause();
			_playPause.classList.remove("pause");
			gsap.ticker.remove(videoProgress);
		}
	}
	toggle();
	
	//Visibility of controls
	GLBEvents(_parent, "mousemove", movement, true);
	var _fadeoutTimer;
	function movement(e){
		_me.classList.add("on");
		clearTimeout(_fadeoutTimer);
		/*if(_overPPBtn) _fadeoutTimer = setTimeout(fadeOut, 4000); //slower when over the play/pause button
		else*/ _fadeoutTimer = setTimeout(fadeOut, 1000);
	}
	function fadeOut(){
		if(_playing) _me.classList.remove("on");
	}


	var _barPressed = false;
	GLBEvents(_progress, "mousedown", downBar, true);
	function downBar(e){
		if(_playing) _video.pause();
		else if(isNaN(_video.duration)) return;
		_barPressed = true;
		GLBEvents(window, "mousemove", positionBar, true);
		GLBEvents(window, "mouseup", upBar, true);
		//Listen to video progress
		gsap.ticker.add(videoProgress);
	}
	function positionBar(e){
		if(!_barPressed) return;
		var _x = e.clientX - 100;
		var _maxX = GLB._vw - 200;
		var _p = _x/_maxX;
		if(_p < 0) _p = 0;
		else if(_p > 1) _p = 1;
		_video.currentTime = _duration * _p;
	}
	function upBar(e){
		_barPressed = false;
		if(_playing) _video.play();
		else gsap.ticker.remove(videoProgress);
	}

	//var _counter = 0;
	function videoProgress(){
		_duration = _video.duration;
		_bar.style.width = (_video.currentTime/_duration*100) + "%";
		/*_counter++;
		if(_counter > 15){
			_counter = 0;
			_time.textContent = formatTime(_video.currentTime) + " / " + formatTime(_duration);//"0:23 / 4:42";
		}*/
	}
	/*function formatTime(_in){
		var _minutes = Math.floor(_in/60);
		var _seconds = Math.floor(_in%60);
		if(_seconds < 10) _seconds = "0"+_seconds;
		return _minutes + ":" + _seconds;
	}*/

	_this.destroy = function(){
		clearTimeout(_fadeoutTimer);
		gsap.ticker.remove(videoProgress);
		GLBEvents(window, "mousemove", positionBar, false);
		GLBEvents(window, "mouseup", upBar, false);
		GLBEvents(_progress, "mousedown", downBar, false);
		GLBEvents(_parent, "mousemove", movement, false);
		GLBEvents(_playPause, "click", toggle, false);
		GLBEvents(_togglePlayHit, "click", toggle, false);
		_parent.removeChild(_me);
		_me = null;
	}
}

function TxtFade(_me){
	var _this = this;
	var _multiple = (_me.className.indexOf("multiple") != -1);
	var _observer;
	function inView(){
		_me.classList.add("in");
	}
	function outView(){
		_me.classList.remove("in");
	}
	if(_multiple) _observer = new Observer(_me, 0, 0, inView, outView);
	else _observer = new Observer(_me, 0, 0, inView);
	_this.destroy = function(){
		_observer.destroy();
		_observer = null;
	}
}

var _introWasSeen = false;
var _introTime = 2;
function Intro(_me){
	var _this = this;
	var _animedOut = false;
	var _time = parseInt(_me.getAttribute("data-time") || "2");
	_introTime = _time;
	var _labels = _me.getElementsByClassName("labels")[0];
	var _introLabels = new IntroLabels(_labels, _time)
	var _imagesDiv = _me.getElementsByClassName("images")[0];
	var _imagesHtml = _imagesDiv.getElementsByClassName("lazy");
	var _numImgs = _imagesHtml.length;
	var _images = [];
	for(var i=0;i<_numImgs;i++) _images.push(new IntroImg(i, _imagesHtml[i]));
	
	var _timePerImage = _time/_numImgs;
	var _interval;
	var _intervalIndex = -1;
	function showNextImg(){
		_intervalIndex++;
		if(_intervalIndex > _numImgs-1){
			clearInterval(_interval)
			animOut();
			return;
		}
		_images[_intervalIndex].show();
	}
	
	function inView(){
		if(_animedOut) return;
		if(_skipIntro){
			animOut();
			return;
		}
		_imagesDiv.classList.add("in");
		_interval = setInterval(showNextImg, _timePerImage*1000);
		_introLabels.start();
		document.body.classList.add("introOn");
	}
	function outView(){
		clearInterval(_interval);
	}
	var _observer = new Observer(_me, 0, 0, inView, outView);

	function animOut(){
		_animedOut = true;
		gsap.to(_me, .6, {y:"-100%", force3D:true, ease:"cubic.inOut", onComplete:hide});
	}
	function hide(){
		_introWasSeen = true;
		_me.style.display = "none";
		document.body.classList.remove("introOn");
		if(_observer){
			_observer.destroy();
			_observer = null;
		}
		window.dispatchEvent(new GLBEvent("introRemoved"));
	}
	if(_introWasSeen) hide();
	
	_this.destroy = function(){
		_introWasSeen = true;
		gsap.killTweensOf(_me);
		clearInterval(_interval);
		if(_observer){
			_observer.destroy();
			_observer = null;
		}
		_introLabels.destroy();
		_introLabels = null;
	}
}
function IntroLabels(_me, _time){
	var _this = this;
	var _h = 45;
	var _wordsHtml = _me.getElementsByTagName("span");
	var _numWords = _wordsHtml.length;
	var _words = [];
	for(var i=0;i<_numWords;i++) _words.push(new IntroWord(i, _wordsHtml[i], _h));
	var _timePerWord = _time/_numWords;
	var _interval;
	var _intervalIndex = -1;

	_this.start = function(){
		_interval = setInterval(showNextWord, _timePerWord*1000);
	}
	_this.stop = function(){
		clearInterval(_interval);
	}
	function showNextWord(){
		if(_intervalIndex != -1) _words[_intervalIndex].hide();
		_intervalIndex++;
		if(_intervalIndex > _numWords-1){
			clearInterval(_interval);
			return;
		}
		_words[_intervalIndex].show();
	}

	_this.destroy = function(){
		clearInterval(_interval);
		for(var i=0;i<_numWords;i++){
			_words[i].destroy();
			_words[i] = null;
		}
	}
}
function IntroWord(_id, _me, _h){
	var _this = this;
	gsap.set(_me, {y:_h, opacity:0, force3D:true});
	
	_this.show = function(){
		gsap.to(_me, .4, {y:0, opacity:1, force3D:true, ease:"cubic"});
	}
	_this.hide = function(){
		gsap.to(_me, .4, {y:-_h, opacity:0, force3D:true, ease:"cubic"});
	}
	_this.destroy = function(){
		gsap.killTweensOf(_me);
	}
}
function IntroImg(_id, _me){
	var _this = this;

	_this.show = function(){
		_me.classList.add("in");
	}
}

//Custom scrollbars (masking text)
function Scrolltrack(_me){
	var _this = this;
	var _section = _me.parentNode;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2;
	var _scrolledLocalY = 0, _p = 0, _inView = false, _hidden = true;

	var _type = 0;
	if(_me.className.indexOf("h") != -1) _type= 1;//horizontal (offset 100vh)

	var _label = document.createElement("div");
	_label.className = "label";
	var _str = _me.textContent;
	_me.textContent = "";
	var _fullStr = "";
	for(var i=0;i<15;i++) _fullStr += _str + " ";
	_label.textContent = _fullStr;
	_me.appendChild(_label);
	var _labelMask = _label.cloneNode(true);
	_me.appendChild(_labelMask);

	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		if(_p < 0) _p = 0;
		else if(_p > 1) _p = 1;
		if(_type == 0) _labelMask.style.width = Math.round(GLB._reliableSh * _p) + "px";
		else if(_type == 1){
			//console.log(_p)
			_labelMask.style.width = Math.round(GLB._vw * _p) + "px";
		}
		if(_p == 0 || _p == 1){
			if(!_hidden){
				_hidden = true;
				_me.classList.remove("on");
			}
		}
		else if(_p > 0){
			if(_hidden){
				_hidden = false;
				_me.classList.add("on");
			}
		}
	}
	function layout(e){
		_offset = GLB.offsetY(_section);
		_height = _section.offsetHeight - GLB._reliableSh;
		if(_type == 1){
			_offset -= GLB._reliableSh;
			_height += GLB._reliableSh;
		}
		//console.log(_offset, _height);
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	var _observer = new Observer(_section, .05, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}

function AnchorMenu(_me){
	var _this = this;
	var _regions = document.getElementsByClassName("region");
	var _num = _regions.length;
	var _anchors = [];
	var _flipsideIds = [];
	var _sitescrolling = false;
	var _siteTimer;
	for(var i=0;i<_num;i++){
		_anchors.push(new AnchorItem(i, _regions[i], _me));
		_flipsideIds.push(parseInt(_regions[i].getAttribute("data-flipside") || "0"))
	}
	
	function layout(e){
		for(var i=0;i<_num;i++) _anchors[i].layout();
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	function anchorClick(e){
		e.stopPropagation();
		//Scroll to region
		var _y = GLB.offsetY(_regions[e.detail]);
		var _halfways = Math.abs((_y-GLB._windowScrollY) * .95);//jump instantly closer
		//window.scrollTo(0,_halfways);
		//gsap.to(window, .8, {scrollTo:{y:_y, autoKill:false}, ease:"strong"});
		//gsap.to(window, 6, {scrollTo:{y:_y+GLB._reliableSh*.5, autoKill:true}, ease:"quad.inOut", delay:.8});
		//gsap.to(window, .8, {scrollTo:{y:_y, autoKill:false}, ease:"strong"});
		//window.scrollTo(0, Math.min(0, _y-GLB._reliableSh*.5));
		if(e.detail == 0 || e.detail == 1 || e.detail == 6) gsap.to(window, 1.2, {scrollTo:{y:_y, autoKill:false}, ease:"cubic"});
		else if(e.detail == 4){
			//About
			window.scrollTo(0, _halfways-GLB._reliableSh*.5);
			gsap.to(window, 1.5, {scrollTo:{y:_y-GLB._reliableSh*.5, autoKill:false}, ease:"cubic"});
		}
		else if(e.detail == 2){
			//expertise
			window.scrollTo(0, _halfways);
			gsap.to(window, 2, {scrollTo:{y:_y+GLB._reliableSh*.5, autoKill:false}, ease:"expo"});
		}
		else if(e.detail == 3 || e.detail == 5){
			//projects, collab
			window.scrollTo(0, _halfways);
			gsap.to(window, 1.5, {scrollTo:{y:_y+GLB._reliableSh*1.1, autoKill:false}, ease:"cubic"});
		}
		_sitescrolling = true;
		clearTimeout(_siteTimer);
		_siteTimer = setTimeout(sitescrollover, 1150);
	}
	function sitescrollover(){
		_sitescrolling = false;
	}
	GLBEvents(_me, "anchorClick", anchorClick, true);

	//Check for region to select
	var _selectedId = -1;
	function scrolled(e){
		if(_sitescrolling) return;
		var _nearestId = -1, _nearestDist = 10000, _dist = 0;
		for(i=0;i<_num;i++){
			_dist = Math.min(Math.abs(_anchors[i]._offY - GLB._windowScrollY), Math.abs(_anchors[i]._offEndY - GLB._windowScrollY));
			if(_dist < _nearestDist) _nearestDist = _dist, _nearestId = i;
		}
		if(_selectedId != _nearestId){
			//console.log("_nearestId", _nearestId);
			if(_nearestId != -1){
				if(_selectedId != -1) _anchors[_selectedId].unselect();
				_selectedId = _nearestId;
				_flipsideGameId = _flipsideIds[_selectedId];
				_anchors[_selectedId].select();
			}
		}
	}
	GLBEvents(window, "scroll", scrolled, true);
	scrolled(null);

	//Stop listening when case sudies open
	function colorpagechange(e){
		GLBEvents(window, "scroll", scrolled, false);
	}
	GLBEvents(window, "colorpagechange", colorpagechange, true);

	//Check anchor on init
	var _hash = location.hash;
	function checkDeeplink(){
		if(_hash.indexOf("#") != -1) _hash = _hash.substr(1);
		_hash = decodeURIComponent(_hash.toLowerCase());
		//console.log("_hash", _hash);
		if(_hash != ""){
			//Find anchor (if any)
			for(var i=0;i<_num;i++){
				//console.log("Match these:",_hash,_anchors[i]._anchor)
				if(_hash == _anchors[i]._anchor){
					_me.dispatchEvent(new GLBEvent("anchorClick", i));
					return;
				}
			}
		}
	}
	if(_hash && _hash.length > 2) _siteTimer = setTimeout(checkDeeplink, 200);

	_this.destroy = function(){
		clearTimeout(_siteTimer);
		for(var i=0;i<_num;i++){
			_anchors[i].destroy();
			_anchors[i] = null;
		}
		GLBEvents(window, "LayoutUpdate", layout, false);
		GLBEvents(_me, "anchorClick", anchorClick, false);
		GLBEvents(window, "scroll", scrolled, false);
		GLBEvents(window, "colorpagechange", colorpagechange, false);
	}
}
function AnchorItem(_id, _region, _parent){
	var _this = this;
	_this._offY = 0;
	_this._offEndY = 0;
	var _str = _region.getAttribute("data-label") || "";
	_this._anchor = encodeURIComponent(_str).toLowerCase();
	_this._anchor = _this._anchor.replaceAll("%20", "-");

	var _me = document.createElement("button");
	_me.className = "anchor";
	var _rect = document.createElement("span");
	_rect.className = "rect";
	_me.appendChild(_rect);
	var _label = document.createElement("span");
	_label.className = "label";
	
	_label.textContent = _str;
	_me.appendChild(_label);
	_me.setAttribute("title", _str);
	_parent.appendChild(_me);
	var _labelW = 0;
	var _over = false, _selected = false, _animedIn = false, _outCalled = false;
	var _funcWhenAnimOver, _animinTimer;

	_this.layout = function(){
		_labelW = _label.offsetWidth;
		_this._offY = _region.offsetTop;
		_this._offEndY = _this._offY + _region.offsetHeight * .9;
	}

	_this.select = function(){
		if(_selected) return;
		if(!_over) over(null);
		window.dispatchEvent(new GLBEvent("repeatFollower"));//cursor indicator
		_selected = true;
	}
	_this.unselect = function(){
		if(!_selected) return;
		_selected = false;
		if(!_over) out(null);
	}

	function over(e){
		if(e) _over = true;
		if(_selected) return;
		if(!_animedIn){
			_funcWhenAnimOver = over;
			return;
		}
		//Scale rect
		gsap.to(_rect, .2, {scaleX:(_labelW/14), transformOrigin:"100% 0", force3D:true, ease:"cubic"});
		gsap.to(_rect, .4, {scaleX:0, transformOrigin:"100% 0", force3D:true, ease:"quad.inOut", delay:.2});
		gsap.to(_label, .4, {opacity:1, ease:"quad.inOut", delay:.2});
		if(GLB._hasTouch) GLBEvents(window, "touchstart", out, true);
	}
	function out(e){
		_over = false;
		if(_selected) return;
		_outCalled = true;
		if(!_animedIn){
			_funcWhenAnimOver = out;
			return;
		}
		gsap.killTweensOf(_rect), gsap.killTweensOf(_label);
		gsap.to(_rect, .4, {scaleX:(_labelW/14), transformOrigin:"100% 0", force3D:true, ease:"cubic.inOut"});
		gsap.to(_rect, .4, {scaleX:1, transformOrigin:"100% 0", force3D:true, ease:"cubic.inOut", delay:.4});
		gsap.set(_label, {opacity:0, delay:.4});
		if(GLB._hasTouch) GLBEvents(window, "touchstart", out, false);
	}
	function clicked(e){
		_parent.dispatchEvent(new GLBEvent("anchorClick", _id));
	}
	GLBEvents(_me, "mouseenter", over, true);
	GLBEvents(_me, "mouseleave", out, true);
	GLBEvents(_me, "click", clicked, true);

	//Anim in
	function animIn(){
		gsap.killTweensOf(_rect), gsap.killTweensOf(_label);
		if(_selected){
			//Show label
			gsap.to(_label, 1, {opacity:1, ease:"quad.inOut", delay:.2});
		}
		if(!_selected){
			//Show label
			gsap.to(_label, .5, {opacity:1, ease:"quad.inOut"});
			//Start hiding label
			var _d = (7-_id) * .1;
			gsap.to(_rect, .4, {scaleX:(_labelW/14), transformOrigin:"100% 0", force3D:true, ease:"cubic.inOut", delay:.4+_d});
			gsap.to(_rect, .4, {scaleX:1, transformOrigin:"100% 0", force3D:true, ease:"cubic.inOut", delay:.8+_d});
			gsap.set(_label, {opacity:0, delay:.8+_d});
		}
		_animinTimer = setTimeout(animInOver, 1500);
	}
	function animInOver(){
		_animedIn = true;
		if(_funcWhenAnimOver){
			if(_funcWhenAnimOver == over){
				if(_outCalled || _id > 0){
					_selected = false;
					//console.log("call over", _id)
					_funcWhenAnimOver.call();
					_selected = true;
				}
			}
			else{
				//console.log("call out", _id)
				_funcWhenAnimOver.call();
			}
			_funcWhenAnimOver = null;
		}
	}
	gsap.set(_rect, {scaleX:0, transformOrigin:"100% 0", force3D:true});
	if(_introWasSeen) _animinTimer = setTimeout(animIn, (7-_id) * 200 + 200);
	else _animinTimer = setTimeout(animIn, (7-_id) * 200 + 200 + _introTime*1000);
	
	
	_this.destroy = function(){
		clearTimeout(_animinTimer);
		GLBEvents(_me, "mouseenter", over, false);
		GLBEvents(_me, "mouseleave", out, false);
		GLBEvents(_me, "click", clicked, false);
		GLBEvents(window, "touchstart", out, false);
		gsap.killTweensOf(_rect), gsap.killTweensOf(_label);
		_parent.removeChild(_me);
		_me = null;
		_funcWhenAnimOver = null;
	}
}

//Green room intro
var _globalVideoControllers = 0;//0-2
var _introVideoOpened = false, _videoIsGlobal = false;
var _grCenterScale = 1;
function Greenroom(_me){
	var _this = this;
	var _inView = false, _hasVideo = false;
	var _c = _me.getElementsByClassName("center")[0];
	var _offset = 0, _height = GLB._reliableSh, _scrolledLocalY = 0, _p = 0, _pEase = 0;
	//Find the video to translate into this module (until scrolling out of screen)
	var _videoId = _me.getAttribute("data-bind") || "";
	var _video = document.getElementById(_videoId) || null;
	var _videoLazy = _video.getElementsByClassName("lazy")[0];
	if(_video) _hasVideo = true;
	_globalVideo.appendChild(_videoLazy), _videoIsGlobal = true;
	document.body.appendChild(_globalVideo);
	//Cursor
	_videoLazy.classList.add("cursorhover");
	//_videoLazy.setAttribute("data-icon", "play");
	_videoLazy.setAttribute("data-cta", "PLAY REEL");
	var _cursor = new CursorHover(_videoLazy);
	var _videoPlayer;
	//Title
	var _globalIntroTitle = document.createElement("div");
	_globalIntroTitle.className = "globalIntroTitle faded fadedcomplete";
	_globalIntroTitle.appendChild(_me.getElementsByClassName("title")[0]);
	document.body.appendChild(_globalIntroTitle);
	gsap.set(_globalIntroTitle, {scale:1, opacity:0, force3D:true});
	var _isInverted = false, _suspended = false;
	var _fadedTimer, _suspendTimer;
		
	//Handle video playing fullscreen
	function clickVideo(e){
		return;
		if(_introVideoOpened){
			//close if already open
			closeGlobalVideo(null);
			return;
		}
		//Move in global DOM (maybe already there)
		_introVideoOpened = true;
		_globalVideo.appendChild(_videoLazy), _videoIsGlobal = true;
		var _scale = GLB._vwOuter / (GLB._vw*.66);
		gsap.to(_globalVideo, .4, {scale:_scale, y:0, force3D:true, ease:"cubic", onComplete:createFSVideo});
		//Create videoplayer
		_videoPlayer = new CustomVideoplayer(_videoLazy, document.body);
	}
	function createFSVideo(e){
		_videoPlayer.animIn();
	}
	function closeGlobalVideo(e){
		if(!_videoPlayer || !_introVideoOpened) return;
		_videoPlayer.destroy();
		_videoPlayer = null;
		gsap.killTweensOf(_globalVideo);
		_introVideoOpened = false;
	}
	GLBEvents(_videoLazy, "click", clickVideo, true);
	GLBEvents(window, "closeGlobalVideo", closeGlobalVideo, true);

	function inView(){
		if(!_inView){
			_inView = true;
			if(GLB._hasIntersectionObs){
				gsap.ticker.add(scrolled);
				scrolled();
			}
			document.body.classList.add("invert"), _isInverted = true;
			_globalVideoControllers++;
			_globalVideo.classList.remove("hidden");
			_globalIntroTitle.classList.remove("fadedcomplete");
			clearTimeout(_fadedTimer);
			gsap.killTweensOf(_globalIntroTitle);
			if(_introWasSeen) _fadedTimer = setTimeout(fadeIntroTitle, 50);
			else GLBEvents(window, "introRemoved", fadeIntroTitle, true);
			_globalVideo.appendChild(_videoLazy), _videoIsGlobal = true;
		}
	}
	function fadeIntroTitle(e){
		GLBEvents(window, "introRemoved", fadeIntroTitle, false);
		if(!_inView) return;
		_globalIntroTitle.classList.remove("faded");
	}
	function outView(){
		if(_inView){
			_inView = false;
			gsap.ticker.remove(scrolled), _globalVideoControllers--;			
			document.body.classList.remove("invert"), _isInverted = false;
			if(_globalVideoControllers == 0) _globalVideo.classList.add("hidden");
			//Make sure title is hidden
			//gsap.set(_globalIntroTitle, {scale:1, force3D:true});
			gsap.to(_globalIntroTitle, .3, {scale:.85, force3D:true, ease:"cubic"});
			_globalIntroTitle.classList.add("faded");
			clearTimeout(_fadedTimer);
			_fadedTimer = setTimeout(faded, 1100);
		}
	}
	function faded(){
		_globalIntroTitle.classList.add("fadedcomplete");
	}

	function scrolled(){
		if(_suspended) return;
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		if(_p < 0) _p = 0;
		else if(_p > 2) _p = 2;
		_p += .1 - (_p*.1);//minimum is .1
		//console.log(_p)
		//_p -= .01
		_pEase = Quad.easeOut(_p/1.9) * .5 + (_p/1.9)*.5;
		_grCenterScale = Math.min(_p,1);
		gsap.set(_c, {scale:_grCenterScale, force3D:true});
		//console.log("_pEase", _grCenterScale, _pEase, _inView)
		if(_hasVideo && !_introVideoOpened) gsap.set(_globalVideo, {scale:_pEase, force3D:true});
		//Move title
		_p = -_scrolledLocalY / _height;
		_pEase = Quad.easeOut(_p/1.9) * .5 + (_p/1.9)*.5;
		if(_p > 1){
			if(_isInverted) document.body.classList.remove("invert"), _isInverted = false;
		}
		else if(!_isInverted) document.body.classList.add("invert"), _isInverted = true;

		//console.log(_pEase)
		gsap.set(_globalIntroTitle, {scale:_pEase+.9, opacity:1-_pEase, force3D:true});
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	function endlessscroll(e){
		clearTimeout(_suspendTimer);
		gsap.set(_c, {scale:_grCenterScale, force3D:true});
		if(GLB._windowScrollY == 0){
			_suspended = false;
			_globalIntroTitle.classList.add("faded");
			gsap.set(_globalVideo, {opacity:0, force3D:true});
			gsap.to(_globalVideo, .8, {opacity:1, force3D:true, ease:"cubic.inOut"});
		}
		else{
			//skip scaling video to 100% (to avoid quick flash)			
			_suspended = true;
			_suspendTimer = setTimeout(unsuspend, 200);
		}
	}
	function unsuspend(){
		_suspended = false;
	}
	GLBEvents(window, "endlessscroll", endlessscroll, true);
	
	var _observer = new Observer(_me, 1, 0, inView, outView);

	_this.destroy = function(){
		clearTimeout(_fadedTimer);
		clearTimeout(_suspendTimer);
		GLBEvents(window, "introRemoved", fadeIntroTitle, false);
		GLBEvents(_videoLazy, "click", clickVideo, false);
		GLBEvents(window, "closeGlobalVideo", closeGlobalVideo, false);
		gsap.killTweensOf(_globalVideo);
		gsap.killTweensOf(_globalIntroTitle);
		if(_videoIsGlobal) _globalVideo.removeChild(_videoLazy), _videoIsGlobal = false;
		if(_videoPlayer){
			_videoPlayer.destroy();
			_videoPlayer = null;
		}
		GLBEvents(window, "LayoutUpdate", layout, false);
		GLBEvents(window, "endlessscroll", endlessscroll, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
		_cursor.destroy();
		_cursor = null;
		document.body.removeChild(_globalVideo);
		document.body.removeChild(_globalIntroTitle);		
		_globalIntroTitle = null;
		_globalVideoControllers = 0;
	}
}
//Endless scroll
function GreenroomCopy(_me){
	var _this = this;
	var _inView = false;
	var _room = _me.getElementsByClassName("room")[0];
	var _c = _room.getElementsByClassName("center")[0];
	var _offset = 0, _height = GLB._reliableSh, _scrolledLocalY = 0, _p = 0, _pEase = 0, _opacity = 0;
	var _suspended = false;
	var _suspendTimer;

	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		if(_suspended) return;
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		_opacity = _p*2;
		if(_opacity < 0) _opacity = 0;
		else if(_opacity > 1) _opacity = 1;
		_opacity = Quad.easeInOut(_opacity);
		_pEase = Quad.easeIn(_p);
		_pEase *= .1;//0-.1
		_grCenterScale = _pEase;
		gsap.set(_c, {scale:_grCenterScale, force3D:true});
		gsap.set(_me, {opacity:_opacity, force3D:true});
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
	}
	GLBEvents(window, "LayoutUpdate", layout, true);

	function endlessscroll(e){
		clearTimeout(_suspendTimer);
		if(GLB._windowScrollY == 0){
			//skip scaling video to 100% (to avoid quick flash)			
			_suspended = true;
			_suspendTimer = setTimeout(unsuspend, 200);
		}
		else{
			_suspended = false;
			//console.log("endlessscroll copy:", _grCenterScale)
			gsap.set(_c, {scale:_grCenterScale, force3D:true});
		}
	}
	function unsuspend(){
		_suspended = false;
	}
	GLBEvents(window, "endlessscroll", endlessscroll, true);
		
	var _observer = new Observer(_me, .5, 0, inView, outView);

	_this.destroy = function(){
		clearTimeout(_suspendTimer);
		GLBEvents(window, "LayoutUpdate", layout, false);
		GLBEvents(window, "endlessscroll", endlessscroll, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}

//First module (title scales and body copy shows) - vertical scrollbar
function FirstM(_me){
	var _this = this;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2;
	var _scrolledLocalY = 0, _p = 0, _pEase = 0, _fillP = 0;
	var _h2 = _me.getElementsByTagName("h2")[0];
	var _h3 = _me.getElementsByTagName("h3")[0];
	var _h3on = false, _inView = false;
	var _video = _me.getElementsByClassName("video")[0];
	var _videoLazy = _video.getElementsByClassName("lazy")[0] || _globalVideo.getElementsByClassName("lazy")[0];
	var _to = "50% 50%";
	if(GLB._isMobile) _to = "50% 0%";

	function inView(){
		if(!_inView){
			_inView = true;
			if(GLB._hasIntersectionObs){
				gsap.ticker.add(scrolled);
				scrolled();
			}
			_globalVideoControllers++;
			_globalVideo.classList.remove("hidden");
		}
	}
	function outView(){
		if(_inView){
			gsap.ticker.remove(scrolled), _globalVideoControllers--;
			_inView = false;
			if(_globalVideoControllers == 0) _globalVideo.classList.add("hidden");
		}
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		if(_p < 0) _p = 0;
		else if(_p > 1) _p = 1;
		_pEase = Cubic.easeInOut(_p);

		//Scale text intro
		gsap.set(_h2, {opacity:_pEase, scale:2-_pEase, y:-(1-_pEase)*GLB._reliableSh*.5, transformOrigin:_to, force3D:true});
		_fillP = (_pEase - .5)*2;
		if(_fillP < 0) _fillP = 0;
		_h2.style["-webkit-text-stroke-color"] = "rgba(0,0,0," + (1-_pEase)*.5 + ")";
		_h2.style.color = "rgba(35,158,70," + (_fillP) + ")"; //green

		//Move video in DOM
		if(!_introVideoOpened){
			//console.log(_p, _videoIsGlobal)
			if(_p > 0){
				if(_videoIsGlobal){
					_video.appendChild(_videoLazy), _videoIsGlobal = false;
					//console.log("to local", _video, _videoLazy)
				}
			}
			else{
				if(!_videoIsGlobal){
					_globalVideo.appendChild(_videoLazy), _videoIsGlobal = true;
					//console.log("to global", _globalVideo)
				}
			}
		}
		else _videoIsGlobal = true;

		if(_p > .7){
			if(!_h3on){
				_h3on = true;
				_h3.classList.add("in");
			}			
		}
		else{
			if(_h3on){
				_h3on = false;
				_h3.classList.remove("in");
			}
		}
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
		//console.log(_offset, _height);
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}

//Expertise (circles on word wall)
function Expertise(_me){
	var _this = this;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2;
	var _scrolledLocalY = 0, _p = 0;
	var _inView = false;

	var _sectionsHtml = _me.getElementsByClassName("el");
	var _num = _sectionsHtml.length;
	var _sections = [];
	for(var i=0;i<_num;i++) _sections.push(new ExpertiseSection(i, _sectionsHtml[i], _num));
		
	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		for(var i=0;i<_num;i++) _sections[i].scrolled(_p);
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
		for(var i=0;i<_num;i++) _sections[i].layout();
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	var _observer = new Observer(_me, .05, 0, inView, outView);	

	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
		for(var i=0;i<_num;i++){
			_sections[i].destroy();
			_sections[i] = null;
		}
	}
}
function ExpertiseSection(_id, _me, _num){
	var _this = this;
	var _on = false;
	var _str = _me.getAttribute("data-label") || "BRAND";
	var _wall = document.createElement("div");
	_wall.className = "wall";
	var _fullStr = "";
	var _numWords = 16;
	if(GLB._isMobile) _numWords = 8;
	else if(GLB._hasTouch && GLB._vw < 1200) _numWords = 8;
	for(var i=0;i<_numWords;i++) _fullStr += _str + " ";
		
	var _linesHolder = document.createElement("div");
	_linesHolder.className = "lines";
	var _lines = [];
	var _numLines = 10;
	for(var i=0;i<_numLines;i++) _lines.push(new ExpertiseLine(i, _fullStr, _linesHolder));
	_wall.appendChild(_linesHolder);
	
	//Green (masked wall)
	var _linesHolderGreen = document.createElement("div");
	_linesHolderGreen.className = "lines green";
	var _innerGreenlines = document.createElement("div");
	_innerGreenlines.className = "inner";
	var _linesGreen = [];
	for(var i=0;i<_numLines;i++) _linesGreen.push(new ExpertiseLine(i, _fullStr, _innerGreenlines));
	_linesHolderGreen.appendChild(_innerGreenlines);
	_wall.appendChild(_linesHolderGreen);
	_me.appendChild(_wall);

	var _hover = _me.getElementsByClassName("hover")[0];
	_hover.classList.add("hidden");
	var _circleOutline = document.createElement("div");
	_circleOutline.className = "circleOutline";
	_hover.appendChild(_circleOutline);

	var _over = false, _hovered = false;
	var _hoverTimer;
	var _mx = 0, _my = 0, _movedDist = 0;
	function over(e){
		_over = true;
		_movedDist = 0;
		_mx = e.clientX, _my = e.clientY;
	}
	function out(e){
		_over = false;
		if(_hovered){
			_hovered = false;
			_hover.classList.remove("in");
			clearTimeout(_hoverTimer);
			_hoverTimer = setTimeout(hoverHidden, 550);
		}
	}
	function distance(x1,y1,x2,y2){
		return Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2,2));
	}
	function moved(e){
		if(_over && !_hovered){
			if(e && e.type == "mousemove") _movedDist = distance(_mx,_my,e.clientX,e.clientY);
			//console.log("_movedDist", _movedDist)
			if(GLB._hasTouch || _movedDist > 15){
				_hovered = true;
				_hover.classList.remove("hidden");
				_hover.classList.add("in");
				clearTimeout(_hoverTimer);
			}
		}
	}
	function hoverHidden(){
		_hover.classList.add("hidden");
	}
	GLBEvents(_linesHolderGreen, "mouseenter", over, true);
	GLBEvents(_linesHolderGreen, "mouseleave", out, true);
	GLBEvents(_linesHolderGreen, "touchstart", out, true);
	GLBEvents(_linesHolderGreen, "mousemove", moved, true);

	var _pPerSection = 1/_num, _localP = 0, _myPStart = _pPerSection*_id, _translateP = 0, _pEase = 0, _last = _num-1;
	_this.scrolled = function(_p){
		_translateP = _p - _myPStart;
		_localP = _translateP / _pPerSection;
		//if(_id == 0) console.log(_localP)
		if(_localP < .5){
			_translateP = Math.min(_localP, .5);
			if(GLB._isMobile) _pEase = Quad.easeOut(_translateP*2) / 2;
			else _pEase = Expo.easeOut(_translateP*2) / 2;
		}
		else{
			_translateP = (_localP-.5);
			if(GLB._isMobile) _pEase = Quad.easeIn(_translateP) + .5;
			else _pEase = Cubic.easeIn(_translateP) + .5;
		}
		/*if(GLB._isMobile){
			//Move "circle": moves green lines and countermove the lines beneath (so they seem sticky)
			gsap.set(_linesHolderGreen, {y:(1-_pEase) * GLB._reliableSh, force3D:true});
			gsap.set(_innerGreenlines, {y:-(1-_pEase) * GLB._reliableSh, force3D:true});
			//Move outline in hover overlay
			gsap.set(_circleOutline, {y:(1-_pEase) * GLB._reliableSh, force3D:true});
		}
		else{*/
			//Move "circle": moves green lines and countermove the lines beneath (so they seem sticky)
			gsap.set(_linesHolderGreen, {x:(1-_pEase) * GLB._vw, force3D:true});
			gsap.set(_innerGreenlines, {x:-(1-_pEase) * GLB._vw, force3D:true});
			//Move outline in hover overlay
			gsap.set(_circleOutline, {x:(1-_pEase) * GLB._vw, force3D:true});
		//}
		
		//Move lines
		for(var i=0;i<_numLines;i++){
			_lines[i].scrolled(_localP);
			_linesGreen[i].scrolled(_localP);
		}
		
		if((_id == 0 && _localP < 1) || (_id == _last && _localP > 0) || (_localP > 0 && _localP < 1)){
			if(!_on){
				_on = true;
				_wall.classList.add("in");
			}
		}
		else{
			if(_on){
				_on = false;
				_wall.classList.remove("in");
			}
		}
	}

	_this.layout = function(e){
		for(var i=0;i<_numLines;i++){
			_lines[i].layout();
			_linesGreen[i].layout();
		}
	}

	_this.destroy = function(){
		for(var i=0;i<_numLines;i++){
			_lines[i].destroy();
			_lines[i] = null;
			_linesGreen[i].destroy();
			_linesGreen[i] = null;
		}
		GLBEvents(_linesHolderGreen, "mouseenter", over, false);
		GLBEvents(_linesHolderGreen, "mouseleave", out, false);
		GLBEvents(_linesHolderGreen, "touchstart", out, false);
		GLBEvents(_linesHolderGreen, "mousemove", moved, false);
	}
}
function ExpertiseLine(_id, _label, _parent){
	var _this = this;
	var _me = document.createElement("div");
	_me.className = "line";
	_me.textContent = _label;
	_parent.appendChild(_me);
	var _multi = _id / 20 + .1;
	if(_id%2 == 0) _multi = -_id / 20 - .1;
	var _render = true;
	if(_id%3 == 0) _render = false;
	if(GLB._hasTouch){
		if(_id%2 == 0) _render = false;
	}
	var _counter = 0, _limitR = -GLB._vw, _x = 0;
	var _constant = (_id+1) * .1;
	if(!_render && _id != 0) gsap.set(_me, {x:-20*_id, force3D:true});//avoid same position
	
	_this.scrolled = function(_p){
		if(!_render) return;
		_counter++;
		_x = (-_p * .2) * GLB._vw * _multi - GLB._vw*.2 - _constant*_counter*_multi;
		//if(_render) _x = (-_p * .2) * GLB._vw * _multi - GLB._vw*.2;
		if(_x < _limitR) _counter = 0;
		else if(_x > 0) _counter = 0;
		gsap.set(_me, {x:_x, force3D:true});
	}

	_this.layout = function(){
		_limitR = -GLB._vw;
	}

	_this.destroy = function(){
		_parent.removeChild(_me);
		_me = null;
	}
}
//Projects (horizontal scrolling)
function Projects(_me){
	var _this = this;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2, _offX = 0, _currentBgElId = -1;
	var _scrolledLocalY = 0, _p = 0, _pEase = 0, _fillP = 0, _lastFillP = -1;
	var _inView = false;
	var _container = _me.getElementsByClassName("container")[0];
	var _titles = _container.getElementsByClassName("titles")[0];
	var _title = _titles.getElementsByClassName("title")[0];
	var _h2 = _title.getElementsByTagName("h2")[0];
	var _titleCopy = _title.cloneNode(true);
	_titleCopy.classList.add("copy");
	_titles.appendChild(_titleCopy);
	var _scroller = _container.getElementsByClassName("scroller")[0];
	var _bg = _scroller.getElementsByClassName("bg")[0];
	var _largeTitle = _scroller.getElementsByClassName("largetitle")[0];//PROJECTS
	var _casesHtml = _scroller.getElementsByClassName("case");
	var _numCases = _casesHtml.length;
	var _cases = [], _colorEls = [];
	_colorEls.push(new CasesBgColorEl(0, _largeTitle));
	for(var i=0;i<_numCases;i++){
		_cases.push(new Case(i, _casesHtml[i]));
		_colorEls.push(new CasesBgColorEl(i+1, _casesHtml[i]));
	}
	_colorEls.push(new CasesBgColorEl(0, _scroller.getElementsByClassName("outro")[0]));
	var _numColorEl = _colorEls.length;

	//Masking title
	var _maskLetters = new MaskLetters(_largeTitle);
	
	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(!_inView) return;
		gsap.ticker.remove(scrolled);
		_inView = false;
		if(!_justOpenedProject) document.body.classList.remove("invert");
		_cursor.resetColor(true);
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		if(_p < 0) _p = 0;
		else if(_p > 1) _p = 1;
		//console.log(_p)
		//_pEase = Strong.easeOut(_p);

		//Scale text intro
		var _titleP = -_scrolledLocalY / (GLB._vw/2);
		if(_titleP < 0) _titleP = 0;
		else if(_titleP > 1) _titleP = 1;
		_pEase = Cubic.easeOut(_titleP);
		gsap.set(_h2, {opacity:_pEase, scale:2-_pEase, /*y:-(1-_pEase)*GLB._reliableSh*.5,*/ transformOrigin:"50% 50%", force3D:true});
		_fillP = (_pEase - .5)*2;
		if(_fillP < 0) _fillP = 0;
		else if(_fillP > 1) _fillP = 1;
		if(_lastFillP != _fillP){
			_lastFillP = _fillP;
			_h2.style["-webkit-text-stroke-color"] = "rgba(0,0,0," + (1-_pEase)*.5 + ")";
			_h2.style.color = "rgba(36,71,69," + (_fillP) + ")"; //green
		}

		//Mask first white title
		var _introP = -(_scrolledLocalY+GLB._vwOuter*.5) / GLB._vwOuter;
		if(_introP < 0) _introP = 0;
		if(_introP <= 1) _titleCopy.style.width = _introP*GLB._vwOuter + "px";
		if(_introP > 1) gsap.set(_titles, {x:-_p*_height + GLB._vwOuter*1.5, force3D:true});
		else gsap.set(_titles, {x:0, force3D:true});

		_offX = -_p*_height;
		//Move parallax elements in cases
		for(var i=0;i<_numCases;i++) _cases[i].scrolled(_offX);
		//Find background color
		var _nearestId = -1, _nearestDist = 10000, _dist = 0;
		for(i=0;i<_numColorEl;i++){
			_dist = Math.min(Math.abs(_colorEls[i]._offX - _offX), Math.abs(_colorEls[i]._offEndX - _offX + GLB._vw));
			if(_dist < _nearestDist) _nearestDist = _dist, _nearestId = i;
		}
		if(_currentBgElId != _nearestId && !_justOpenedProject){
			//console.log("_nearestId", _nearestId);
			_currentBgElId = _nearestId;
			if(_currentBgElId != -1){
				_bg.style.backgroundColor = _colorEls[_currentBgElId]._bg;
				_cursor.color(_colorEls[_currentBgElId]._cursor, true);
				if(_currentBgElId == 0 || _currentBgElId == _numColorEl-1) document.body.classList.remove("invert");
				else document.body.classList.add("invert");
			}
		}
		//Move entire scroller (projects title and cases)
		gsap.set(_scroller, {x:_offX, force3D:true});
		_maskLetters.update(_offX);
	}

	function resized(e){
		var _scrollerW = _largeTitle.offsetWidth + _numCases * GLB._vwOuter + GLB._vwOuter*.5 + 2; //extra right side space
		_scroller.style.width = _scrollerW - 2+ "px";
		_me.style.height = GLB._vwOuter*1.5 + _scrollerW - (GLB._vwOuter - GLB._reliableSh) + GLB._vwOuter + "px";//intro + cases width
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
		for(var i=0;i<_numCases;i++) _cases[i].layout();
		for(i=0;i<_numColorEl;i++) _colorEls[i].layout();
		//console.log(_offset, _height);
	}
	GLBEvents(window, "resize", resized, true);
	GLBEvents(window, "LayoutUpdate", layout, true);
		
	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "resize", resized, false);
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
		_maskLetters.destroy();
		_maskLetters = null;
		for(var i=0;i<_numCases;i++){
			_cases[i].destroy();
			_cases[i] = null;
		}
		/*for(i=0;i<_numColorEl;i++){
			_colorEls[i].destroy();
			_colorEls[i] = null;
		}*/
	}
}
//Collab (horizontal scrolling)
function Collab(_me){
	var _this = this;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2, _offX = 0;
	var _scrolledLocalY = 0, _p = 0;
	var _inView = false;
	var _container = _me.getElementsByClassName("container")[0];
	var _scroller = _container.getElementsByClassName("scroller")[0];
	var _dragables = _container.getElementsByClassName("dragables")[0];
	//Masking title
	var _largeTitle = _scroller.getElementsByClassName("largetitle")[0];//COLLAB
	var _maskLetters = new MaskLetters(_largeTitle);

	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		_offX = -_p*_height;
		//Move entire scroller (projects title and cases)
		gsap.set(_scroller, {x:_offX, force3D:true});
		_maskLetters.update(_offX);
	}

	function resized(e){
		var _scrollerW = _dragables.offsetLeft + _dragables.offsetWidth; //extra right side space
		_scroller.style.width = _scrollerW + "px";
		_me.style.height = _scrollerW - (GLB._vwOuter - GLB._reliableSh) + GLB._vwOuter*.5 + "px";//intro + cases width
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
		//console.log(_offset, _height);
	}
	GLBEvents(window, "resize", resized, true);
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "resize", resized, false);
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
		_maskLetters.destroy();
		_maskLetters = null;
	}
}
//Frontpage case (horizontal scrolling)
function Case(_id, _me){
	var _this = this;
	var _offX = 0, _paraP = 0;
	//Parallax elements
	var _parallaxEls = _me.getElementsByClassName("para");
	var _numPara = _parallaxEls.length;
	var _paras = [];
	for(var i=0;i<_numPara;i++) _paras.push(new CaseParaEl(i, _parallaxEls[i]));

	//Duplicate the title
	var _link = _me.getElementsByTagName("a")[0];
	var _linkImg = _link.getElementsByClassName("lazy")[0];
	var _title = _link.getElementsByTagName("h4")[0];
	var _titleCopy = _title.cloneNode(true);
	_linkImg.appendChild(_titleCopy);
	var _href = _link.getAttribute("href") || "";
	var _globalCaseImg;

	function clickedLink(e){
		e.stopPropagation();
		e.preventDefault();
		GLBEvents(_link, "click", clickedLink, false);
		_linkImg.removeChild(_titleCopy);
		_globalCaseImg = new GlobalCaseImg(_link, _linkImg);

		//Set color for pagechange
		window.dispatchEvent(new GLBEvent("colorpagechange",  _me.getAttribute("data-bg")));
		_router.setUrl(_href);
	}
	GLBEvents(_link, "click", clickedLink, true);
		
	_this.scrolled = function(_x){
		//if(_id == 0) console.log(_x, _offX);
		if(Math.abs(_offX - _x) < GLB._vwOuter * 1.5){
			_paraP = (_offX - _x) / GLB._vwOuter;
			for(var i=0;i<_numPara;i++) _paras[i].scrolled(_paraP);
			//Move title(s)
			gsap.set(_title, {x:-_paraP*400, force3D:true});
			gsap.set(_titleCopy, {x:-_paraP*400, force3D:true});
		}
	}
	_this.layout = function(){
		_offX = -GLB.offsetX(_me);
	}
	_this.destroy = function(){
		GLBEvents(_link, "click", clickedLink, false);
		if(_globalCaseImg){
			_globalCaseImg.destroy();
			_globalCaseImg = null;
		}
	}
}
function CaseParaEl(_id, _me){
	var _this = this;
	var _speed = parseFloat(_me.getAttribute("data-speed") || "-.2");

	_this.scrolled = function(_paraP){
		gsap.set(_me, {x:_paraP * GLB._vw * _speed, force3D:true});
	}
}
function CasesBgColorEl(_id, _me){
	var _this = this;
	_this._offX = 0;
	_this._offEndX = 0;
	_this._bg = _me.getAttribute("data-bg");
	_this._cursor = _me.getAttribute("data-cursor");

	_this.layout = function(){
		_this._offX = -GLB.offsetX(_me);
		_this._offEndX = _this._offX - _me.offsetWidth;
	}
}

function GlobalCaseImg(_link, _linkImg){
	var _this = this;
	var _rect = _link.getBoundingClientRect(); //Measure and move image into caseOpener
	var _isMoving = true, _canBeRemoved = false;

	_linkImg.classList.add("globalCaseImg");
	gsap.set(_linkImg, {x:_rect.left, y:_rect.top, width:_rect.width, height:_rect.height, force3D:true});
	document.body.appendChild(_linkImg);

	var _newW = GLB._vw * .75;
	if(GLB._isMobile) _newW = GLB._vw - 60;
	var _newH = _newW * 9/16;
	var _x = GLB._vw * .125;
	if(GLB._isMobile) _x = 30;
	var _y = (GLB._reliableSh-_newH)/2;
	if(_y < 50) _y = 50 - GLB._reliableSh * .01;//subtract for parallax effect inside caseintro
	_justOpenedProject = true;//make sure old page isn't destroyed before this is added to case page
	gsap.to(_linkImg, .7, {x:_x, y:_y, width:_newW, height:_newH, force3D:true, ease:"cubic", onComplete:moveDone});
	
	//Listen for project image (same as this) to load
	GLBEvents(window, "projectHeroLoaded", removeMe, true);
	
	function moveDone(){
		_isMoving = false;
		if(_canBeRemoved) fadeOut();
	}
	function removeMe(e){
		GLBEvents(window, "projectHeroLoaded", removeMe, false);
		if(!_isMoving) fadeOut();
		else _canBeRemoved = true;
	}
	function fadeOut(){
		if(!_linkImg) return;
		gsap.killTweensOf(_linkImg);
		gsap.to(_linkImg, .8, {opacity:0, ease:"cubic.inOut", delay:.1, onComplete:destroyOld});
	}
	function destroyOld(){
		_justOpenedProject = false;
		window.dispatchEvent(new GLBEvent("newprojectLoaded"));
	}
	_this.destroy = function(){
		gsap.killTweensOf(_linkImg);
		document.body.removeChild(_linkImg);
		_linkImg = null;
		GLBEvents(window, "projectHeroLoaded", removeMe, false);
	}
}
//Images with optional title overlaying
function ImagesWithTitle(_me){
	var _this = this;
	var _elementsHtml = _me.getElementsByClassName("el");
	var _numEl = _elementsHtml.length;
	var _elements = [];
	for(var i=0;i<_numEl;i++){
		if(_elementsHtml[i].getElementsByClassName("title").length > 0) _elements.push(new ImageWithTitle(_elementsHtml[i]));
	}
	_numEl = _elements.length;

	_this.destroy = function(){
		for(var i=0;i<_numEl;i++){
			_elements[i].destroy();
			_elements[i] = null;
		}
	}
}
function ImageWithTitle(_me){
	var _this = this;
	var _title = _me.getElementsByClassName("title")[0];
	var _titleCopy = _title.cloneNode(true);
	var _lazy = _me.getElementsByClassName("lazy")[0];
	_lazy.appendChild(_titleCopy);
	var _h2s = _me.getElementsByTagName("h2");
	if(_h2s.length == 0) _h2s = _me.getElementsByTagName("h1");
	var _parallaxA = new Parallax(_h2s[0], _me, _h2s[1]);
	_this.destroy = function(){
		_parallaxA.destroy();
		_parallaxA = null;
		_lazy.removeChild(_titleCopy);
		_titleCopy = null;
	}
}

//Fade up word on mouseover and slowly fade down again
function MouseTrail(_me){
	var _this = this;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2;
	var _scrolledLocalY = 0, _p = 0, _pEase = 0;
	var _inView = false;
	var _wall = _me.getElementsByClassName("wall")[0];
	var _str = _wall.getAttribute("data-label") || "OBSESSED";
	var _numLines = 6;
	var _linesHolder = document.createElement("div");
	_linesHolder.className = "lines";
	var _lines = [];
	for(var i=0;i<_numLines;i++) _lines.push(new InteractiveLine(i, _str, _linesHolder));
	_wall.appendChild(_linesHolder);
	var _horiLine = _me.getElementsByClassName("hori")[0];
	var _str = _horiLine.textContent;
	var _fullStr = "";
	for(var i=0;i<15;i++) _fullStr += _str+" ";
	_horiLine.textContent = _fullStr;

	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		for(var i=0;i<_numLines;i++) _lines[i].scrolled(_p);
		gsap.set(_horiLine, {x:-_p * GLB._reliableSh, force3D:true});
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight;
		for(var i=0;i<_numLines;i++) _lines[i].layout();
		//console.log(_offset, _height);
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	var _observer = new Observer(_me, .25, 0, inView, outView);
	
	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
		for(var i=0;i<_numLines;i++){
			_lines[i].destroy();
			_lines[i] = null;
		}
	}
}
function InteractiveLine(_id, _label, _parent){
	var _this = this;
	var _me = document.createElement("div");
	_me.className = "line";
	var _numWords = 5;
	if(GLB._isMobile && GLB._vw < 640) _numWords = 3;
	else if(GLB._hasTouch && GLB._vw < 1200) _numLines = 3;
	var _words = [];
	for(var i=0;i<_numWords;i++) _words.push(new ILWord(i, _label, _me));
	_parent.appendChild(_me);
	var _multi = _id / 20 + .1;
	if(_id%2 == 0) _multi = -_id / 20 - .1;
	var _render = true;
	if(_id%3 == 0) _render = false;
	var _counter = 0, _limitR = -GLB._vw, _x = 0;
	var _constant = (_id+1) * .2;
	if(!_render && _id != 0) gsap.set(_me, {x:-100, force3D:true});//avoid same position
	
	_this.scrolled = function(_p){
		if(!_render) return;
		_counter++;
		_x = (-_p * .2) * GLB._vw * _multi - GLB._vw*.2 - _constant*_counter*_multi;
		//if(_render) _x = (-_p * .2) * GLB._vw * _multi - GLB._vw*.2;
		if(_x < _limitR) _counter = 0;
		else if(_x > 0) _counter = 0;
		gsap.set(_me, {x:_x, force3D:true});
	}

	_this.layout = function(){
		_limitR = -GLB._vw;
	}

	_this.destroy = function(){
		for(var i=0;i<_numWords;i++){
			_words[i].destroy();
			_words[i] = null;
		}
		_parent.removeChild(_me);
		_me = null;
	}
}
function ILWord(_id, _label, _parent){
	var _this = this;

	var _word = document.createElement("span");
	_word.textContent = _label;
	_parent.appendChild(_word);

	var _outTimer;

	function touched(e){
		_word.classList.add("touched");
		clearTimeout(_outTimer);
		_outTimer = setTimeout(untouched, 100);
	}
	function untouched(){
		_word.classList.remove("touched");
	}
	if(GLB._hasTouch) GLBEvents(_word, "touchstart", touched, true);
	
	_this.destroy = function(){
		_parent.removeChild(_word);
		clearTimeout(_outTimer);
		GLBEvents(_word, "touchstart", touched, false);
	}
}

//Frontpage contact module
function ContactM(_me){
	var _this = this;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2;
	var _scrolledLocalY = 0, _p = 0, _pEase = 0, _rotation = 0;
	var _inView = false;
	var _mail = _me.getElementsByClassName("mail")[0];
	//Create social wall
	var _social = _me.getElementsByClassName("social")[0];
	var _linesHtml = _social.getElementsByClassName("line");
	var _numLines = _linesHtml.length;
	var _lines = [];
	for(var i=0;i<_numLines;i++) _lines.push(new CSocialLine(i, _linesHtml[i]));
		
	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		if(GLB._isMobile) _p *= 2;
		_pEase = Cubic.easeOut(_p);
		for(var i=0;i<_numLines;i++) _lines[i].scrolled(_p);
		//gsap.set(_mail, {x:-_p * GLB._vw*1.4 + GLB._vw*.1, force3D:true});		
		_rotation = -(_pEase * 12 - 6);
		if(GLB._isMobile){
			_rotation *= .25;
			gsap.set(_mail, {x:-_p * GLB._vw*2 - GLB._vw*.25, y:Math.max(0,-_rotation*25), rotation:_rotation, force3D:true});
		}
		else gsap.set(_mail, {x:-_p * GLB._vw*2 + GLB._vw*.5, y:Math.max(0,-_rotation*25), rotation:_rotation, force3D:true});
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight;
		for(var i=0;i<_numLines;i++) _lines[i].layout();
		//console.log(_offset, _height);
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	var _observer = new Observer(_me, .25, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
		_lines = null;
	}
}
function CSocialLine(_id, _me){
	var _this = this;
	var _str = _me.textContent;
	var _fullstr = "";
	var _numWords = 8;
	if(GLB._isMobile && GLB._vw < 640) _numWords = 4;
	for(var i=0;i<_numWords;i++) _fullstr += _str + " ";
	_me.textContent = _fullstr;
	var _multi = (_id+1) * .1 + .2;
	var _offsetX = 0, _counter = 0, _x = 0, _limitR = -GLB._vw;
	if(_id%2 == 1) _multi*= -1, _offsetX = 1;
	var _constant = (_id+1) * .5;

	_this.scrolled = function(_p){
		_counter++;
		_x = (-_p * 1) * GLB._vw * _multi - GLB._vw*.2 - _constant*_counter*_multi - GLB._vw*_offsetX;
		if(_x < _limitR) _counter = 0;
		else if(_x > 0) _counter = 0;
		gsap.set(_me, {x:_x, force3D:true});
	}
	_this.layout = function(){
		//_limitR = GLB._vw - _me.offsetWidth;
		_limitR = -GLB._vw;
	}
}

//Lottie icons
function AnimatedIcon(_me){
	var _this = this;
	var _autoplay = false, _playing = false;
	var _dautoplay = _me.getAttribute("data-autoplay") || "false";
	if(_dautoplay == "true") _autoplay = true;
	var _animation, _hovertarget, _loadTimer, _observer;
	function createAnim(){
		if("lottie" in window){
			_animation = lottie.loadAnimation({container:_me,renderer:'svg',loop:false,autoplay:false,path:_me.getAttribute("data-src") || ""});
			if(_autoplay && _playing) _animation.play();
		}
		else _loadTimer = setTimeout(createAnim, 100);
	}
	createAnim();	

	function over(e){
		_animation.goToAndPlay(0);
		if(GLB._hasTouch) GLBEvents(window, "touchend", out, true);
	}
	function out(e){
		//_animation.stop();
	}
	if(_dautoplay == "hover"){
		_hovertarget = _me.parentNode || _me;
		if(GLB._hasTouch) GLBEvents(_hovertarget, "touchstart", over, true);
		GLBEvents(_hovertarget, "mouseenter", over, true);
		GLBEvents(_hovertarget, "mouseleave", out, true);
	}
	function inView(){
		if(!_autoplay) return;
		if(!_playing){
			_playing = true;
			if(_animation) _animation.play();
		}
	}
	function outView(){
		if(!_autoplay) return;
		if(_playing){
			_playing = false;
			if(_animation) _animation.stop();
		}
	}
	
	if(_autoplay) _observer = new Observer(_me, .1, 0, inView, outView); //Loaded when they are within 1/4 screenheight away

	_this.destroy = function(){
		clearTimeout(_loadTimer);
		if(_hovertarget){
			GLBEvents(_hovertarget, "touchstart", over, false);
			GLBEvents(window, "touchend", out, false);
			GLBEvents(_hovertarget, "mouseenter", over, false);
			GLBEvents(_hovertarget, "mouseleave", out, false);
			_hovertarget = null;
		}
		if(_observer){
			_observer.destroy();
			_observer = null;
		}
		if(_animation){
			_animation.destroy();
			_animation = null;
		}
	}
}

function Glitch(_me){
	var _this = this;
	var _inView = false;
	var _timer, _moveTimer, _count = 0;
	var _glitches = document.createElement("span");
	_glitches.className = "glitches";
	var _text = _me.innerHTML;
	try{
		_text = _text.replaceAll("<br>", "&#xa");
		_text = _text.replaceAll("<br/>", "&#xa");
		_text = _text.replaceAll("<br />", "&#xa");
		_glitches.setAttribute("data-text", _text);
	}
	catch(e){}
	_me.appendChild(_glitches);

	var _move = false;
	if(_me.className.indexOf("a b") != -1){
		//allow element to be moved by glitch
		_move = true;	
	}

	function inView(){
		_count = 0;
		_inView = true;
		clearTimeout(_timer);
		clearTimeout(_moveTimer);
		_timer = setTimeout(on, 1000);
	}
	function on(){
		_count++;
		_me.classList.add("on");
		if(_move){
			_me.classList.add("move");
			if(Math.random() < .5) _me.classList.add("alt");
			_moveTimer = setTimeout(unmove, 60);
		}
		_timer = setTimeout(off, Math.random()*300+200);
	}
	function off(){
		_me.classList.remove("on");
		if(_move) unmove();
		if(_inView && _count < 3) _timer = setTimeout(on, 1000);//repeat
	}
	function unmove(){
		_me.classList.remove("move");
		_me.classList.remove("alt");
	}
	function outView(){
		_inView = false;
	}
	var _observer = new Observer(_me, .5, 0, inView, outView); //Loaded when they are within 1/4 screenheight away

	_this.destroy = function(){
		_me.removeChild(_glitches);
		clearTimeout(_timer);
		clearTimeout(_moveTimer);
		_observer.destroy();
		_observer = null;
	}
}

//Two columns start and stop same position (evens out difference in height)
function ColumnScroller(_me){
	var _this = this;
	var _inView = false;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2;
	var _scrolledLocalY = 0, _p = 0;

	var _lists = _me.getElementsByClassName("list");
	var _titles = _me.getElementsByClassName("title");
	var _target, _titleA, _titleB, _active = false, _hasTitles = _titles.length > 0;
	var _heights = [], _difHeight = 0;
	if(_lists.length < 2) console.log("Error - should contain two lists");
	//For both lists we add hover images
	var _elements = [];
	var _numEl = 0;
	if(_me.className.indexOf("job") != -1){
		//no following images for jobs
	}
	else{
		for(var i=0;i<2;i++){
			var _elsHtml = _lists[i].getElementsByClassName("el");
			_numEl = _elsHtml.length;		
			for(var j=0;j<_numEl;j++) _elements.push(new HoverImageFollow(_elsHtml[j]));	
		}
	}
	_numEl = _elements.length;
	var _render = true;
	if(_numEl <= 2) _render = false;
		
	function inView(){
		_inView = true;
		if(GLB._isMobile) return;
		if(_render && GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_render && _inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		if(_p < 0) _p = 0;
		else if(_p > 1) _p = 1;
		if(_active){
			gsap.set(_target, {y:_p * Math.abs(_difHeight), force3D:true});
			if(_hasTitles){
				gsap.set(_titleA, {y:_p * _height * .5, force3D:true});
				gsap.set(_titleB, {y:_p * _height * .5, force3D:true});
			}
		}
	}
	//Smoothscroll frame order
	function updateScrollListener(e){
		gsap.ticker.remove(scrolled);
		if(_inView) inView();
	}
	GLBEvents(window, "updateScrollListeners", updateScrollListener, true);

	function layout(e){
		if(GLB._isMobile){
			_offset = _height = 100;
			gsap.ticker.remove(scrolled);
			return;
		}
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
		if(_lists.length >= 2) _active = true;
		if(_active){
			_heights[0] = _lists[0].offsetHeight;
			_heights[1] = _lists[1].offsetHeight;
			_difHeight = _heights[0] - _heights[1];
			if(!_target){
				if(_difHeight > 0) _target = _lists[1].getElementsByClassName("scroller")[0];
				else _target = _lists[0].getElementsByClassName("scroller")[0];
				if(_hasTitles) _titleA = _titles[0], _titleB = _titles[1];
			}
			//If smallest is lower than screen then just parallax
			if(_difHeight > 0){
				if(Math.min(_heights[0], _heights[1]) < GLB._reliableSh) _difHeight = -GLB._reliableSh*.5;
			}
			else{
				if(Math.min(_heights[0], _heights[1]) < GLB._reliableSh) _difHeight = GLB._reliableSh*.5;
			}
		}
		//console.log(_target, _active, _render, _offset, _height, _difHeight);
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "updateScrollListeners", updateScrollListener, false);
		GLBEvents(window, "LayoutUpdate", layout, false);
		if(_render) gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
		for(var i=0;i<_numEl;i++){
			_elements[i].destroy();
			_elements[i] = null;
		}
	}
}
function HoverImageFollow(_me){
	var _this = this;
	var _stopTimer;
	var _src = _me.getAttribute("data-img") || "/Assets/Grx/fallback.png";
	var _hoverImg = document.createElement("div");
	_hoverImg.className = "hoverimgfollow";
	var _inner = document.createElement("div");
	_inner.className = "inner";
	var _hoverColor = (_me.getAttribute("data-cursor") || "");
	var _hasHoverColor = _hoverColor != "";
	var _img = new GLBImage(_src, _inner, null, null, "img fade", loaded, true, "");//base/desktop
	_hoverImg.appendChild(_inner);
	var _loaded = false;
	document.body.appendChild(_hoverImg);
	function loaded(){
		_img.img.classList.add("in");
	}
	
	function over(e){
		if(!_loaded){
			_loaded = true;
			_img.load();
		}
		GLBEvents(window, "mousemove", mmove, true);
		GLBEvents(_me, "mousemove", firstmmove, true);
		if(_hasHoverColor) _cursor.color(_hoverColor, false);
	}
	function firstmmove(e){
		_hoverImg.classList.add("on");
		GLBEvents(_me, "mousemove", firstmmove, false);
		gsap.ticker.add(engine);
		clearTimeout(_stopTimer);
		_stopTimer = setTimeout(realIn, 50);
	}
	function realIn(){
		_hoverImg.classList.add("fadein");
	}
	function out(e){
		_hoverImg.classList.remove("fadein");
		GLBEvents(window, "mousemove", mmove, false);
		GLBEvents(_me, "mousemove", firstmmove, false);
		_stopTimer = setTimeout(realOut, 400);
		if(_hasHoverColor) _cursor.resetColor(false);
	}
	function realOut(){
		_hoverImg.classList.remove("on");
		gsap.ticker.remove(engine);
		_firstMove = true;
		gsap.killTweensOf(_this);
		_this._deltaF = 0;
	}
	if(!GLB._hasTouch){
		GLBEvents(_me, "mouseenter", over, true);
		GLBEvents(_me, "mouseleave", out, true);
	}
	
	var _prevMx = 0, _mx = 0, _my = 0, _twmx = 0, _twmy = 0, _deltaX = 0, _twDeltax = 0;
	_this._deltaF = 1;
	var _firstMove = true;
	function mmove(e){
		_mx = e.clientX, _my = e.clientY;
		if(_mx > GLB._vw * .75) _mx -= (_mx - GLB._vw * .75)*.75;
		_deltaX = (_prevMx - _mx)*.5;
		if(_deltaX < -8) _deltaX = -8;
		else if(_deltaX > 8) _deltaX = 8;
		_prevMx = _mx;
		if(_firstMove){
			_this._deltaF = _twDeltax = _deltaX = 0;
			_twmx = _prevMx = _mx, _twmy = _my;
			_firstMove = false;
		}
		else{
			_this._deltaF = 2;
			gsap.killTweensOf(_this);
			gsap.to(_this, 1, {_deltaF:0, ease:"linear"});
		}
	}
	function engine(){
		_twmx += (_mx-_twmx)*.1;
		_twmy += (_my-_twmy)*.1;
		_twDeltax += ((-_deltaX*_this._deltaF)-_twDeltax)*.05;
		gsap.set(_hoverImg, {x:_twmx, y:_twmy, rotation:_twDeltax, force3D:true});
	}	

	_this.destroy = function(){
		clearTimeout(_stopTimer);
		GLBEvents(_me, "mousemove", firstmmove, false);
		GLBEvents(window, "mousemove", mmove, false);
		GLBEvents(_me, "mouseenter", over, false);
		GLBEvents(_me, "mouseleave", out, false);
		gsap.killTweensOf(_this);
		document.body.removeChild(_hoverImg);
		_img.destroy();
		_img = null;
	}	
}

//Dragable (throwable) element (Archive and Collab on frontpage)
var _dragableZ = 1;
function Dragable(_me){
	var _this = this;
	var _img = _me.getElementsByClassName("rel")[0];
	var _mx = 0, _my = 0, _difX = 0, _difY = 0, _relX = 0, _relY = 0, _speedX = 0, _speedY = 0, _prevMx = 0, _prevMy = 0, _directionX = 1, _directionY = 1;
	var _x = 0, _y = 0, _w = 0, _h = 0, _parentY = 0, _parentW = 0, _parentH = 0;
	var _down = false;
	_dragableZ = 1;//reset

	//Cursor
	_me.classList.add("cursorhover");
	_me.setAttribute("data-icon", "drag");
	var _cursor = new CursorHover(_me);

	function down(e){
		e.stopPropagation();
		_down = true;
		_directionX = _directionY = 1;
		_speedX = _speedY = 0;
		if(e.type == "mousedown"){
			GLBEvents(window, "mousemove", move, true);
			GLBEvents(window, "mouseup", up, true);
			_mx = e.clientX, _my = e.clientY;
		}
		else{
			GLBEvents(window, "touchend", up, true);
			_mx = e.touches[0].clientX, _my = e.touches[0].clientY;
		}
		if(!GLB._isMobile) _cursor.forceIconOut();
		//Move this into body and create copy with same size
		_difX = _mx-_x - _relX, _difY = _my-_y - _relY;
		gsap.ticker.add(engine);
		_dragableZ++;
		_me.style.zIndex = _dragableZ;
		_prevMx = _mx-_x-_difX, _prevMy = _my-_y-_difY;
	}
	function move(e){
		if(!_down) return;
		if(e.type == "mousemove") _mx = e.clientX, _my = e.clientY;
		else{
			e.stopPropagation(), e.preventDefault();
			_mx = e.touches[0].clientX, _my = e.touches[0].clientY;
		}
		_relX = _mx-_x-_difX, _relY = _my-_y-_difY;
		//Check borders
		if(_relX+_x < 0) _relX = -_x;
		else if(_relX+_x+_w > _parentW) _relX = _parentW-_x-_w;
		if(_relY+_y < _parentY) _relY = -_y+_parentY;
		else if(_relY+_y+_h > _parentY+_parentH) _relY = _parentY+_parentH-_y-_h;
	}
	function up(e){
		_down = false;
		GLBEvents(window, "mousemove", move, false);
		GLBEvents(window, "mouseup", up, false);
		GLBEvents(window, "touchend", up, false);
		if(!GLB._isMobile) _cursor.resetIconHover();
	}
	function engine(){
		if(_down){
			_speedX = ((_prevMx - _relX) + _speedX)*.5;
			_speedY = ((_prevMy - _relY) + _speedY)*.5;
			_prevMx = _relX, _prevMy = _relY;
			gsap.set(_img, {x:_relX, y:_relY,force3D:true});
		}
		else{
			_speedX *= .95;
			_speedY *= .95;
			_relX -= _speedX*_directionX;
			_relY -= _speedY*_directionY;
			//Check borders
			if(_relX+_x < 0){
				_relX = -_x;
				_directionX *= -1;
			}
			else if(_relX+_x+_w > _parentW){
				_relX = _parentW-_x-_w;
				_directionX *= -1;
			}
			if(_relY+_y < _parentY){
				_relY = -_y+_parentY;
				_directionY *= -1;
			}
			else if(_relY+_y+_h > _parentY+_parentH){
				_relY = _parentY+_parentH-_y-_h;
				_directionY *= -1;
			}

			gsap.set(_img, {x:_relX, y:_relY,force3D:true});
			if(Math.abs(_speedX) < .1 && Math.abs(_speedY) < .1){
				//console.log("stop engine");
				gsap.ticker.remove(engine);
			}
		}
	}
	
	if(GLB._hasTouch){
		GLBEvents(_img, "touchstart", down, true);
		window.addEventListener("touchmove", move, {passive:false});
	}
	else GLBEvents(_img, "mousedown", down, true);
	
	function layout(e){
		_x = GLB.offsetX(_me) - _me.parentNode.offsetLeft;
		_y = GLB.offsetY(_me);
		_parentY = GLB.offsetY(_me.parentNode);
		_parentW = _me.parentNode.offsetWidth;
		_parentH = _me.parentNode.offsetHeight;
		_w = _me.offsetWidth, _h = _me.offsetHeight;
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", layout, false);
		GLBEvents(window, "mousemove", move, false);
		GLBEvents(window, "mouseup", up, false);
		GLBEvents(window, "touchend", up, false);
		gsap.ticker.remove(engine);
		if(GLB._hasTouch){
			GLBEvents(_img, "touchstart", down, false);
			window.removeEventListener("touchmove", move, {passive:false});
		}
		else GLBEvents(_img, "mousedown", down, false);
		_cursor.destroy();
		_cursor = null;
	}
}

//Cursor manager
function CursorHover(_me){
	var _this = this;
	var _label = _me.getAttribute("data-cta") || "";
	var _over = false;
	var _overF, _outF;

	//Update label
	function over(e){
		_over = true;
		_cursor.mouseoverLabel(_label);
	}
	function out(e){
		_over = false;
		_cursor.mouseoutLabel();
	}
	if(!GLB._hasTouch && _label != ""){
		_overF = over, _outF = out;
	}
	//Hide cursor on hover
	var _hider = (_me.getAttribute("data-hidecursor") || "false") == "true";
	function overH(e){
		_over = true;
		_cursor.mouseoverHide();
	}
	function outH(e){
		_over = false;
		_cursor.mouseoutHide();
	}
	if(!GLB._hasTouch && _hider){
		_overF = overH, _outF = outH;
	}
	//As background (for menu icons etc.)
	var _asBg = (_me.getAttribute("data-asbackground") || "false") == "true";
	function overBg(e){
		_over = true;
		_cursor.mouseoverAsBackground();
	}
	function outBg(e){
		_over = false;
		_cursor.mouseoutAsBackground();
	}
	if(!GLB._hasTouch && _asBg){
		_overF = overBg, _outF = outBg;
	}

	//As icon
	var _icon = _me.getAttribute("data-icon") || "false";
	var _asIcon = _icon != "false";
	function overIcon(e){
		_over = true;
		_cursor.mouseoverAsIcon(_icon);
	}
	function outIcon(e){
		_over = false;
		_cursor.mouseoutAsIcon(_icon);
	}
	_this.forceIconOut = function(){
		_cursor.mouseoverHide(_icon);
	}
	_this.resetIconHover = function(){
		if(_over) _cursor.mouseoverAsIcon(_icon);
	}
	if(!GLB._hasTouch && _asIcon){
		_overF = overIcon, _outF = outIcon;
	}

	//Setup listener
	GLBEvents(_me, "mouseenter", _overF, true);
	GLBEvents(_me, "mouseleave", _outF, true);
	GLBEvents(_me, "mousedown", _outF, true);

	//Videoplayer poster click etc.
	function updateCursor(e){
		if(_overF) _overF();
	}
	GLBEvents(_me, "updateCursor", updateCursor, true);

	_this.destroy = function(){
		if(_over && _outF) _outF();
		GLBEvents(_me, "mouseenter", _overF, false);
		GLBEvents(_me, "mouseleave", _outF, false);
		GLBEvents(_me, "mousedown", _outF, false);
		GLBEvents(_me, "updateCursor", updateCursor, false);
	}
}

//Parallax
function Parallax(_me, _optionalParent, _mirrorEl){
	var _this = this;
	var _inView = false, _layoutTimer, _scrolledLocal, _offset, _offPos;
	var _axis = 0; //0=y, 1=x
	if((_me.getAttribute("data-direction") || "") == "x") _axis = 1;
	var _speeds = (_me.getAttribute("data-speed") || "-.2,0").split(",");
	var _speed;
	if(GLB._isMobile && _speeds.length > 1) _speed = parseFloat(_speeds[1]);
	else _speed = parseFloat(_speeds[0]);
	var _target = /*_me.getElementsByClassName("lazy")[0] || */_me;
		
	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		_inView = false;
		gsap.ticker.remove(scrolled);
	}

	function scrolled(){
		if(_axis == 0){
			_scrolledLocal = _offset - GLB._windowScrollY - GLB._reliableSh*.5;//new - GLB._reliableSh*.5
		}
		else{
			_scrolledLocal = _offset - document.documentElement.scrollLeft;
		}
		
		_offPos = _scrolledLocal * _speed;
		if(_speed > 0){
			//Measure from center instead
			if(_axis == 0) _offPos = (_offset - GLB._windowScrollY) * _speed;
			else _offPos = (_offset - document.documentElement.scrollLeft) * _speed;
		}
		if(_axis == 0){
			gsap.set(_target, {y:_offPos, force3D:true});
			if(_mirrorEl) gsap.set(_mirrorEl, {y:_offPos, force3D:true});
		}
		else{
			gsap.set(_target, {x:_offPos, force3D:true});
			if(_mirrorEl) gsap.set(_mirrorEl, {x:_offPos, force3D:true});
		}
	}

	function layout(e){
		clearTimeout(_layoutTimer);
		gsap.set(_target, {clearProps:"transform"});
		if(_axis == 0) _offset = GLB.offsetY(_me);
		else _offset = _me.offsetLeft;
		if(GLB._isMobile && _speeds.length > 1) _speed = parseFloat(_speeds[1]);
		else _speed = parseFloat(_speeds[0]);
		if(_speed > 0) _offset += GLB._reliableSh/2;
	}
	function relayout(){
		layout();
		if(_inView) scrolled();
	}
    if(GLB._hasIntersectionObs){
        GLBEvents(window, "LayoutUpdate", layout, true);
		layout(null);
		_layoutTimer = setTimeout(relayout, 100);
	}
	var _observer;
	if(_optionalParent){
		if(_mirrorEl) _observer = new Observer(_optionalParent, 1, 0, inView, outView);//one of the text are pushed a lot out of the screen
		else _observer = new Observer(_optionalParent, .25, 0, inView, outView);
	}
	else _observer = new Observer(_me, .25, 0, inView, outView);

	_this.destroy = function(){
		clearTimeout(_layoutTimer);
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}

function Flipside(){
	var _this = this;
	var _me = document.createElement("div");
	_me.className = "flipside";
	var _bg = document.createElement("div");
	_bg.className = "bg";
	_me.appendChild(_bg);
	var _flipsideUi = document.createElement("div");
	_flipsideUi.className = "flipsideui";
	var _closeBtn = new CloseBtn(_flipsideUi);
	document.body.appendChild(_flipsideUi);
	document.body.appendChild(_me);

	function close(e){
		e.stopPropagation();
		window.dispatchEvent(new GLBEvent("closeFlipside"));
	}
	GLBEvents(_flipsideUi, "close", close, true);
	
	function animIn(){
		window.dispatchEvent(new GLBEvent("openGame"));
		//_me.classList.add("in");
		document.body.classList.add("flipsideon");
	}
	var _timer = setTimeout(animIn, 50);

	//Overwrite wheel event (prevent scrolling in general)
	function wheeled(e){
		e.preventDefault();
		e.stopImmediatePropagation();
	}
	if(GLB._supportsPassive) window.addEventListener("wheel", wheeled, {passive:false});
	else GLBEvents(window, "wheel", wheeled, true);
	window.dispatchEvent(new GLBEvent("redoWheelListeners"));
	
	_this.destroy = function(){
		clearTimeout(_timer);
		if(GLB._supportsPassive) window.removeEventListener("wheel", wheeled, {passive:false});
		else GLBEvents(window, "wheel", wheeled, false);
		document.body.classList.remove("flipsideon");
		document.body.removeChild(_me);
		document.body.removeChild(_flipsideUi);
		GLBEvents(_flipsideUi, "close", close, false);
		_closeBtn.destroy();
		_closeBtn = null;
		_me = null;
		_flipsideUi = null;
	}
}
function CloseBtn(_parent){
	var _this = this;
	var _me = document.createElement("button");
	_me.className = "closeBtn";
	var _icon = document.createElement("span");
	_icon.className = "icon";
	var _lineA = document.createElement("span");
	_lineA.className = "line";
	var _innerA = document.createElement("span");
	_innerA.className = "inner";
	_lineA.appendChild(_innerA);
	_icon.appendChild(_lineA);
	var _lineB = document.createElement("span");
	_lineB.className = "line";
	var _innerB = document.createElement("span");
	_innerB.className = "inner";
	_lineB.appendChild(_innerB);
	_icon.appendChild(_lineB);
	_me.appendChild(_icon);
	_me.setAttribute("title", "Back");
	_parent.appendChild(_me);
	
	function clicked(e){
		_parent.dispatchEvent(new GLBEvent("close"));
	}
	GLBEvents(_me, "click", clicked, true);
	
	gsap.set(_innerA, {scaleX:0, transformOrigin:"0 0", force3D:true});
	gsap.set(_innerB, {scaleX:0, transformOrigin:"0 0", force3D:true});

	function animIn(){
		gsap.to(_innerA, .8, {scaleX:1, transformOrigin:"0 0", force3D:true, ease:"expo.inOut"});
		gsap.to(_innerB, .9, {scaleX:1, transformOrigin:"0 0", force3D:true, ease:"expo.inOut", delay:.2});
	}
	var _timer = setTimeout(animIn, 200);

	function layout(e){
		//Match both closebtn look and h3 scaling
		var _scale = .5;
		if(GLB._vwOuter > 1000){
			_scale += (GLB._vwOuter-920)/1000 * .5;
		}
		gsap.set(_me, {scale:_scale, transformOrigin:"100% 0%"});
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	layout(null);

	_this.destroy = function(){
		GLBEvents(_me, "click", clicked, false);
		GLBEvents(window, "LayoutUpdate", layout, false);
		clearTimeout(_timer);
		gsap.killTweensOf(_innerA), gsap.killTweensOf(_innerB);
		_parent.removeChild(_me);
		_me = null;
	}
}

//Carousel for cases/blogs
function Carousel(_me){
	var _this = this;

	var _c;
	var _isEndless = _me.className.indexOf("endless") != -1;
	if(_isEndless) _c = new EndlessCarousel(_me);
	//else _c = new SimpleCarousel(_me);
	
	_this.destroy = function(){
		_c.destroy();
		_c = null;
	}
}
//not used currently
/*function SimpleCarousel(_me){
	var _this = this;
	var _scroller = _me.getElementsByClassName("scroller")[0];
	var _dragging = false, _userControlled = false;
	var _mxDown = 0, _movedMX = 0, _prevMX = 0, _speedX = 0, _threshold = 4, _scrollerXInit = 0;

	//For desktop mouse (no touch!) we add/allow click and drag
	if(GLB._hasTouch){
		GLBEvents(_me, "touchstart", td, true);
		GLBEvents(_me, "touchmove", tm, true);
	}
	else{
		GLBEvents(_me, "touchstart", touched, true); //Just to make sure mouse is cancelled
		GLBEvents(_me, "mousedown", down, true);
	}	
	GLBEvents(_scroller, "scroll", scrolled, true);

	//Detect when touch screens start interacting
	var _tx = 0;
	function td(e){
		_tx = e.touches[0].clientX;
	}
	function tm(e){
		 if(Math.abs(e.touches[0].clientX - _tx) > 20){
			 userControlled = true;
			GLBEvents(_me, "touchstart", td, false);
			GLBEvents(_me, "touchmove", tm, false);
		 }
	}
	
	function userWheeled(e){
		if(Math.abs(e.deltaX) > 1){
			_userControlled = true;
			GLBEvents(_scroller, "wheel", userWheeled, false);
		}
	}
	GLBEvents(_scroller, "wheel", userWheeled, true);

	//Slideshow (time based, no interaction)
	var _interval;
	var _lastAutoslideX;
	function inView(){
		if(GLB._isMobile || _userControlled){
			console.log("User controlled, no slideshow!");
			return;
		}
		clearInterval(_interval);
		_interval = setInterval(autoSlide, 4000);
		_lastAutoslideX = _scroller.scrollLeft;
	}
	function outView(){
		clearInterval(_interval);
	}
	var _observer = new Observer(_me, 0, 0, inView, outView);

	function autoSlide(){
		if(GLB._isMobile) return;
		if(_dragging || _scroller.scrollLeft != _lastAutoslideX) return;
		var _moveExtra = -GLB._vwOuter*.36 - 70;
		if(GLB._vwOuter < 1600.5) _moveExtra = -GLB._vwOuter*.36 - 40;
		_scrollerXInit = _scroller.scrollLeft;
		var _scrollTo = Math.max(0, _scrollerXInit-_movedMX - _moveExtra);
		var _scrollPercentage = 100 * _scroller.scrollLeft / (_scroller.scrollWidth - _scroller.clientWidth);
		if(_scrollPercentage > 95) _scrollTo = 0; //nack to first
		else{
			//Make sure it's not more than the limit
			_scrollPercentage = 100 * _scrollTo / (_scroller.scrollWidth - _scroller.clientWidth);
			if(_scrollPercentage > 100) _scrollTo = _scroller.scrollWidth - _scroller.clientWidth;
		}
		_movedMX = 0;
		gsap.killTweensOf(_scroller);
		gsap.to(_scroller, 1.5, {scrollLeft:_scrollTo, ease:"quart.inOut", onComplete:setLastUS});
	}
	function setLastUS(){
		_lastAutoslideX = _scroller.scrollLeft;
	}
	
	function touched(e){
		GLBEvents(_me, "mousedown", down, false);
	}
	var _moveCounter = 0;
	function scrolled(e){
		_moveCounter++;
		if(_moveCounter%6 == 0){
			_moveCounter = 0;
			
		}
	}

	function down(e){
		if(GLB._isMobile) return;
		clearInterval(_interval);
		gsap.killTweensOf(_scroller);
		GLBEvents(document, "mousemove", moved, true);
		GLBEvents(document, "mouseup", up, true);
		_mxDown = e.clientX;
	}
	function moved(e){
		_movedMX = e.clientX-_mxDown;
		_userControlled = true;
		if(!_dragging && Math.abs(_movedMX) > _threshold){
			//Start movement
			_dragging = true;
			_mxDown = e.clientX;
			_prevMX = _speedX = 0;
			_scrollerXInit = _scroller.scrollLeft;
			_me.classList.add("dragging");
			_userControlled = true;
			//Start measuring speed
			gsap.ticker.add(measureSpeed);
		}
		if(_dragging) _scroller.scrollLeft = _scrollerXInit-_movedMX;
	}
	function measureSpeed(){
		//Average drag speed
		_speedX += (_movedMX-_prevMX)*3;
		_speedX /= 4;
		_prevMX = _movedMX;
	}
	function up(e){
		_me.classList.remove("dragging");
		GLBEvents(document, "mousemove", moved, false);
		GLBEvents(document, "mouseup", up, false);
		gsap.ticker.remove(measureSpeed);
		if(_dragging){
			//Ease out
			var _time = .6;
			var _moveExtra = _speedX*32;
			if(Math.abs(_moveExtra) > 200) _time = 1;
			gsap.to(_scroller, _time, {scrollLeft:Math.max(0, _scrollerXInit-_movedMX - _moveExtra), ease:"cubic"});
		}
		_dragging = false;
	}

	_this.destroy = function(){
		clearInterval(_interval);
		gsap.killTweensOf(_scroller);
		GLBEvents(document, "mousemove", moved, false);
		GLBEvents(document, "mouseup", up, false);
		GLBEvents(_me, "touchstart", touched, false);
		GLBEvents(_me, "mousedown", down, false);
		GLBEvents(_me, "touchstart", td, false);
		GLBEvents(_me, "touchmove", tm, false);
		GLBEvents(_scroller, "scroll", scrolled, false);
		GLBEvents(_scroller, "wheel", userWheeled, false);
		_observer.destroy();
		_observer = null;
	}
}*/

function EndlessCarousel(_me){
	var _this = this;
	var _scroller = _me.getElementsByClassName("scroller")[0];
	var _down = false, _wasDragged = false, _dragging = false, _inView = false;
	var _initMX = 0, _nowX = 0, _deltaX = 0, _prevDeltaX = 0, _initX = 0, _scrollerX = 0, _threshold = 8, _elX = 0, _elW = 0, _totalW = 0, _limitL = 0, _limitR = 0, _index = 0, _rindex = 0, _speedX = 0;
	_this._twX = 0;
	var _elementsHtml = _scroller.getElementsByClassName("el");
	var _numEl = _elementsHtml.length;
	var _elements = [], _offsets = [];
	for(var i=0;i<_numEl;i++) _elements.push(_elementsHtml[i]), _offsets.push(0);

	function resized(e){
		_elX = _elements[0].offsetLeft;
		_elW = _elements[0].offsetWidth;
		_totalW = _elW*_numEl;
		//_limitL = -(_elW*.5 + 140);
		//_limitR = GLB._vwOuter + _elW*.5 + 140;
		_limitL = -_numEl/2*_elW;
		_limitR = _numEl/2*_elW;
		for(var i=0;i<_numEl;i++) gsap.set(_elements[i], {x:_offsets[i]*_totalW, force3D:true});
		browse(false);
		//console.log("_elW", _elX, _elW);
	}
	GLBEvents(window, "LayoutUpdate", resized, true);
	resized(null);
		
	function initDrag(e){
		_down = true;
		if(e.type == "touchstart"){
			_initMX = e.touches[0].clientX;
			GLBEvents(window, "touchend", stopDrag, true);
		}
		else{
			_initMX = e.clientX;
			GLBEvents(window, "mouseup", stopDrag, true);
		}
		_initX = _scrollerX = _this._twX;
	}
	function dragging(e){
		if(!_down) return;
		if(e.type == "touchmove") _nowX = e.touches[0].clientX;
		else _nowX = e.clientX;
		_deltaX = _nowX - _initMX;
		if(!_dragging && Math.abs(_deltaX) > _threshold){
			//Start movement
			_dragging = true;
			gsap.killTweensOf(_this);
			_initMX = _nowX;
			_deltaX = _speedX = 0;
			stopEngine();
			startEngine();
		}
		if(_dragging){
			if(e.cancelable){
				e.preventDefault();
				e.stopPropagation();
			}
			_scrollerX = _initX + _deltaX;
			_speedX = ((_deltaX-_prevDeltaX) + _speedX*2) / 3;
			_prevDeltaX = _deltaX;
		}
	}
	function stopDrag(e){
		GLBEvents(window, "touchend", stopDrag, false);
		GLBEvents(window, "mouseup", stopDrag, false);
		_down =  false;
		_wasDragged = _dragging;
		if(!_dragging) return;
		_dragging = false;
		if(Math.abs(-_elW*_index - _scrollerX) < 32){
			//Just reset
			browse(true);
			return;
		}
		else if(_speedX < 0) _index++;
		else _index--;
		browse(false);
	}

	function browse(_inout){
		_scrollerX = -_elW*_index;
		if(_inout) gsap.to(_this, 1, {_twX:_scrollerX, ease:"cubic.inOut", onUpdate:move});
		else gsap.to(_this, .8, {_twX:_scrollerX, ease:"cubic", onUpdate:move});
		//Fade neighbours
		_elements[_rindex].classList.remove("centered");
		_rindex = _index%_numEl;
		if(_index < 0) _rindex += _numEl*1000;
		_rindex = _rindex%_numEl;
		_elements[_rindex].classList.add("centered");
	}
	function check(){
		//Check for moving x in order to seem endless
		for(var i=0;i<_numEl;i++){
			var _localX = _this._twX + _elW*i + _elW*.5 + _offsets[i]*_totalW + _elX;
			if(_localX < _limitL){
				//Move to end
				_offsets[i]++;
				gsap.set(_elements[i], {x:_offsets[i]*_totalW, force3D:true});
			}
			if(_localX > _limitR){
				//Move to beginning
				_offsets[i]--;
				gsap.set(_elements[i], {x:_offsets[i]*_totalW, force3D:true});
			}
		}
	}
	function move(){
		check();
		if(_dragging) _this._twX += (_scrollerX-_this._twX)*.2;
		else if(_engineOn && Math.abs(_this._twX - _scrollerX) < .01) stopEngine();
		gsap.set(_scroller, {x:_this._twX, force3D:true});
	}
	
	var _engineOn = false;
	function startEngine(){
		if(_engineOn) return;
		_engineOn = true;
		gsap.ticker.add(move);
	}
	function stopEngine(){
		if(!_engineOn) return;
		gsap.killTweensOf(_this);
		gsap.ticker.remove(move);
		_engineOn = false;
	}
	function keyDown(e){
		if(!_inView) return;
		if(e.keyCode == 39){
			_index++;
			browse(true);
		}
		else if(e.keyCode == 37){
			_index--;
			browse(true);
		}
	}

	function overMe(e){
		_me.classList.add("mouseover");
	}
	function outMe(e){
		_me.classList.remove("mouseover");
	}
	function clickedCursor(e){
		if(_wasDragged) return;
		console.log("clickedCursor")
		if(e.clientX > GLB._vw/2) _index++;
		else _index--;
		browse(true);
	}

	function inView(){
		_inView = true;
		if(!GLB._hasTouch){
			GLBEvents(_scroller, "mouseenter", overMe, true);
			GLBEvents(_scroller, "mouseleave", outMe, true);
			GLBEvents(_scroller, "click", clickedCursor, true);
			_customCursor = true;
		}
		else _customCursor = false;
	}
	function outView(){
		_inView = false;
		_me.classList.remove("mouseover");
		GLBEvents(_scroller, "mouseenter", overMe, false);
		GLBEvents(_scroller, "mouseleave", outMe, false);
		GLBEvents(_scroller, "click", clickedCursor, false);
	}
	var _observer = new Observer(_me, 0, .5, inView, outView);

	//Init listeners
	GLBEvents(_me, "mousedown", initDrag, true);
	GLBEvents(window, "mousemove", dragging, true);
	GLBEvents(window, "keydown", keyDown, true);
	if(GLB._hasTouch){
		_me.addEventListener("touchstart", initDrag);
		window.addEventListener("touchmove", dragging, {passive:false});
	}

	_this.destroy = function(){
		_observer.destroy();
		_observer = null;
		gsap.killTweensOf(_this);
		GLBEvents(window, "LayoutUpdate", resized, false);
		gsap.ticker.remove(move);
		GLBEvents(_me, "mousedown", initDrag, false);
		GLBEvents(window, "mousemove", dragging, false);
		GLBEvents(window, "keydown", keyDown, false);
		if(GLB._hasTouch){
			_me.removeEventListener("touchstart", initDrag);
			window.removeEventListener("touchmove", dragging, {passive:false});
		}
		GLBEvents(window, "touchend", stopDrag, false);
		GLBEvents(window, "mouseup", stopDrag, false);
		GLBEvents(_scroller, "mouseenter", overMe, false);
		GLBEvents(_scroller, "mouseleave", outMe, false);
		GLBEvents(_scroller, "click", clickedCursor, false);
		_elementsHtml = null;
		_elements = null;
	}
}

//Simple background-color change when scrolling
function CaseIntro(_me){
	var _this = this;
	var _title = _me.getElementsByClassName("title")[0];
	gsap.set(_title, {y:64, opacity:0, force3D:true});
	gsap.to(_title, 1.4, {y:0, opacity:1, force3D:true, ease:"expo", delay:.8});

	//Set backgroundcolor of body and remove when scrolling down
	var _bgColor = _me.getAttribute("data-bg") || "#FFF";
	document.body.classList.add("instant");
	document.body.style.backgroundColor = _bgColor;
	document.body.classList.add("invert");
	var _colored = true;

	function scrolled(e){
		if(GLB._windowScrollY > GLB._reliableSh * .5){
			if(_colored){
				_colored = false;
				document.body.style.backgroundColor = "initial";
				document.body.classList.remove("invert");
			}
		}
		else if(!_colored){
			_colored = true;
			document.body.style.backgroundColor = _bgColor;
			document.body.classList.add("invert");
		}
	}

	function init(){
		document.body.classList.remove("instant");
		GLBEvents(window, "scroll", scrolled, true);
		scrolled(null);
	}
	var _timer = setTimeout(init, 850);

	//Make sure body is inverted
	function invertBody(e){
		document.body.classList.add("invert");
	}
	GLBEvents(window, "newprojectLoaded", invertBody, true);
	
	_this.destroy = function(){
		clearTimeout(_timer);
		document.body.classList.remove("instant");
		GLBEvents(window, "scroll", scrolled, false);
		GLBEvents(window, "newprojectLoaded", invertBody, false);
		if(_colored) document.body.style.backgroundColor = "initial";
	}
}

//Letter animations
function MaskLetters(_me){
	var _this = this;
	var _offset = GLB._vw, _distFromFixpoint = 0;
	var _splittext = new SplitText(_me, {type:"chars", charsClass:"char"});
	var _chars = _splittext.chars, _numChars = _chars.length;
	var _children = [];
	//Add span with letter inside each char
	for(var i=0;i<_numChars;i++) _children.push(new MaskLetterChar(i, _chars[i]));
	
	_this.update = function(_offX){
		_distFromFixpoint = _offX+_offset;//distance from right side of screen
		//console.log(_distFromFixpoint);
		for(var i=0;i<_numChars;i++) _children[i].update(_distFromFixpoint);
	}
	function layout(e){
		_offset = GLB.offsetX(_me);
		for(var i=0;i<_numChars;i++) _children[i].layout(_offset);
	}
	GLBEvents(window, "LayoutUpdate", layout, true);

	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", layout, false);
		for(var i=0;i<_numChars;i++) _children[i].destroy();
	}
}
function MaskLetterChar(_id, _me){
	var _this = this;
	var _offset = GLB._vw, _dist = 0, _prevX = 0, _x = 0;
	var _span = document.createElement("span");
	_span.className = "inner";
	_span.textContent = _me.textContent;
	_me.textContent = "";
	_me.appendChild(_span);

	_this.update = function(_distFromFixpoint){
		_dist = _offset+_distFromFixpoint - GLB._vw*.7;//0=left side of screen (but we add .5 screen width to start effect sooner)
		if(_dist < 0) _dist = 0;
		//console.log(_dist)
		_x = -_dist*1;
		if(_prevX == _x) return;
		_prevX = _x;
		gsap.set(_span, {x:_x, force3D:true});
	}
	_this.layout = function(_parentOffset){
		_offset = GLB.offsetX(_me) - _parentOffset;
	}
	_this.destroy = function(){
		_me.removeChild(_span);
		_span = null;
	}
}
function LetterHover(_me){
	var _this = this;
	var _children = [];
	var _active = false;
	if(!GLB._hasTouch){
		_active = true;
		var _splittext = new SplitText(_me, {type:"chars", charsClass:"char"});
		var _chars = _splittext.chars, _numChars = _chars.length;
		for(var i=0;i<_numChars;i++) _children.push(new LetterHChar(i, _chars[i]));
		GLBEvents(_me, "mouseenter", over, true);
		GLBEvents(_me, "mouseleave", out, true);
	}
	function over(e){
		for(var i=0;i<_numChars;i++) _children[i].over();
	}
	function out(e){
		for(var i=0;i<_numChars;i++) _children[i].out();
	}
	_this.destroy = function(){
		if(_active){
			GLBEvents(_me, "mouseenter", over, false);
			GLBEvents(_me, "mouseleave", out, false);
			for(var i=0;i<_numChars;i++){
				_children[i].destroy();
				_children[i] = null;
			}
		}
	}
}
function LetterHChar(_id, _me){
	var _this = this;
	var _delay = 0, _timer;
	_this.over = function(){
		//_delay = Math.random() * 300;
		_delay = _id * 20;
		clearTimeout(_timer);
		_timer = setTimeout(addClass, _delay);
	}
	function addClass(){
		_me.classList.add("hover");
	}
	_this.out = function(){
		_delay = Math.random() * 500;
		clearTimeout(_timer);
		_timer = setTimeout(removeClass, _delay);
	}
	function removeClass(){
		_me.classList.remove("hover");
	}
	_this.destroy = function(){
		clearTimeout(_timer);
	}
}

//Case study section titles
function TiltText(_me){
	var _this = this;
	var _h2 = _me.getElementsByTagName("h2")[0];
	var _str = _h2.textContent;
	var _fullstr = "";
	for(var i=0;i<3;i++) _fullstr += _str + " ";
	_h2.textContent = "";
	var _span = document.createElement("span");
	_span.style.display = "inline-block";
	_span.textContent = _fullstr;
	_h2.appendChild(_span);
	var _offset = GLB._reliableSh, _height = 200, _scrolledLocalY = 0, _p = 0;
	var _inView = false;

	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		gsap.set(_span, {x:-_p * GLB._vw*.3 - GLB._vw*.5, force3D:true});
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight;
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	var _observer = new Observer(_me, .1, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}

function SubscribeBtn(_me){
	var _this = this;
	var _icon = _me.getElementsByClassName("icon")[0];
	var _lineA = document.createElement("div");
	_lineA.className = "line";
	var _innerA = document.createElement("div");
	_innerA.className = "inner";
	_lineA.appendChild(_innerA);
	_icon.appendChild(_lineA);
	var _lineB = document.createElement("div");
	_lineB.className = "line";
	var _innerB = document.createElement("div");
	_innerB.className = "inner";
	_lineB.appendChild(_innerB);
	_icon.appendChild(_lineB);
	if(_newsletter._submitted) _me.classList.add("submitted");

	function clicked(e){
		_newsletter.openNewsletter();
		if(_newsletter._submitted) _me.classList.add("submitted");
	}
	GLBEvents(_me, "click", clicked, true);
	
	gsap.set(_innerA, {scaleX:0, transformOrigin:"0 0", force3D:true});
	gsap.set(_innerB, {scaleX:0, transformOrigin:"0 0", force3D:true});

	function animIn(){
		gsap.to(_innerA, .8, {scaleX:1, transformOrigin:"0 0", force3D:true, ease:"expo.inOut"});
		gsap.to(_innerB, .9, {scaleX:1, transformOrigin:"0 0", force3D:true, ease:"expo.inOut", delay:.2});
	}
	var _timer = setTimeout(animIn, 200);

	function newsletterOn(e){
		_me.classList.add("open");
	}
	function newsletterOff(e){
		_me.classList.remove("open");
	}
	GLBEvents(window, "newsletterOn", newsletterOn, true);
	GLBEvents(window, "newsletterOff", newsletterOff, true);
	
	function layout(e){
		//Match both closebtn look and h3 scaling
		var _scale = .5;
		if(GLB._vwOuter > 1000){
			_scale += (GLB._vwOuter-920)/1000 * .5;
		}
		gsap.set(_me, {scale:_scale, transformOrigin:"0 100%"});
	}
	GLBEvents(window, "LayoutUpdate", layout, true);

	_me.classList.add("hidden");
	var _visible = false;
	var _removeTimer;
	function scrolled(e){
		/*if(GLB._windowScrollY > GLB._reliableSh){
			if(_visible){
				_visible = false;
				_me.classList.add("hidden");
			}
		}
		else{
			if(!_visible){
				_visible = true;
				_me.classList.remove("hidden");
			}
		}*/
		clearTimeout(_removeTimer);
		_removeTimer = setTimeout(fadeOut, 1000);
		if(!_visible){
			_visible = true;
			_me.classList.remove("hidden");
		}
	}
	function fadeOut(){
		if(_visible){
			_visible = false;
			_me.classList.add("hidden");
		}
	}
	function init(){
		GLBEvents(window, "scroll", scrolled, true);
	}
	_removeTimer = setTimeout(init, 1000);
	
	_this.destroy = function(){
		clearTimeout(_removeTimer);
		GLBEvents(_me, "click", clicked, false);
		GLBEvents(window, "LayoutUpdate", layout, false);
		GLBEvents(window, "scroll", scrolled, false);
		GLBEvents(window, "newsletterOn", newsletterOn, false);
		GLBEvents(window, "newsletterOff", newsletterOff, false);
		clearTimeout(_timer);
		gsap.killTweensOf(_innerA), gsap.killTweensOf(_innerB);
	}
}
var _inlineformCount = 0;
function InlineForm(_me){
	var _this = this;
	var _pid = _me.getAttribute("data-portalid"), _fid = _me.getAttribute("data-formid");
	var _myId = "form_"+_inlineformCount
	_me.setAttribute("id", _myId);
	_inlineformCount++;
	var _timer;

	function formReady(){
		forceResize();
	}
	function formSubmitted(){
		forceResize();
	}

	function init(e){
		clearTimeout(_timer);
		if(GLB._isBot) return;
		if(!window.hbspt){
			console.log("no hbspt");
			_timer = setTimeout(init, 100)
			return;
		}
		GLBEvents(window, "hubspotReady", init, false);
		hbspt.forms.create({portalId:_pid,formId:_fid,target:"#"+_myId,onFormReady:formReady,onFormSubmitted:formSubmitted});
	}
	if(!_hubspotScriptAdded){
		LoadHubspot();
		GLBEvents(window, "hubspotReady", init, true);
	}
	else init();

	_this.destroy = function(){
		clearTimeout(_timer);
		GLBEvents(window, "hubspotReady", init, false);
	}	
}
//Manage HubSpot
var _hubspotScriptAdded = false;
function LoadHubspot(){
	_hubspotScriptAdded = true;
	var _s = document.createElement('script');
	_s.src = "//js.hsforms.net/forms/v2.js";
	_s.onload = hubspotLoaded;
	_s.defer = true, _s.async = true;
	document.body.appendChild(_s);
}
function hubspotLoaded(){
	window.dispatchEvent(new GLBEvent("hubspotReady"));
}

function Newsletter(){
	var _this = this;
	_this._submitted = false;
	var _open = false;
	var _me = document.createElement("div");
	_me.className = "newsletter";
	var _bg = document.createElement("div");
	_bg.className = "bg";	
	_me.appendChild(_bg);
	var _h3 = document.createElement("h3");
	_h3.innerHTML = "SUBSCRIBE TO <br />OUR NEWSLETTER";
	_me.appendChild(_h3);
	var _m = document.createElement("div");
	_m.className = "m";
	_m.setAttribute("id", "newsletter_2021")
	_me.appendChild(_m);

	_this.openNewsletter = function(){
		if(_open){
			closeNewsletter();
			window.dispatchEvent(new GLBEvent("newsletterOff"));
			return;
		}
		_open = true;
		document.body.appendChild(_me);
		document.body.classList.add("newsletteropen");
		if(!_hubspotScriptAdded){
			LoadHubspot();
			GLBEvents(window, "hubspotReady", init, true);
		}
		else init();
		setTimeout(animIn, 50);
	}
	function animIn(){
		_me.classList.add("in");
	}

	//Remove stylesheet
	function formReady(){
		//console.log("formReady");
		var _head = document.querySelector("head");
		var _css = _head.getElementsByTagName("style");
		try{
			var _last = _css[_css.length-1];
			var _lastId = _last.getAttribute("id");
			//console.log("_lastId", _lastId)
			if(_lastId.indexOf("58c6d15c") != -1){
				//console.log("Removing style for newsletter form");
				_head.removeChild(_last);
			}
		}
		catch(e){console.log("No css to remove");}
		//Fade in
		_m.classList.add("in");
 	}
	function formSubmitted(){
		_this._submitted = true;
		forceResize();
	}

	function init(e){
		GLBEvents(window, "hubspotReady", init, false);
		var _btn = document.getElementsByClassName("subscribeBtn")[0];
		hbspt.forms.create({portalId:_btn.getAttribute("data-portalid") || "",formId:_btn.getAttribute("data-formid") || "",target:"#newsletter_2021",onFormReady:formReady,onFormSubmitted:formSubmitted});

		if(GLB._supportsPassive) window.addEventListener("wheel", wheeled, {passive:false});
		else GLBEvents(window, "wheel", wheeled, true);
		window.dispatchEvent(new GLBEvent("redoWheelListeners"));
		window.dispatchEvent(new GLBEvent("newsletterOn"));
		GLBEvents(window, "keydown", keyDown, true);		
	}
	function keyDown(e){
		if(e.key == "Escape" && _open) _this.openNewsletter();
	}
	
	function wheeled(e){
		e.stopImmediatePropagation();
	}

	function closeNewsletter(){
		_open = false;
		GLBEvents(window, "hubspotReady", init, false);
		_m.innerHTML = "";
		_m.classList.remove("in");
		if(GLB._supportsPassive) window.removeEventListener("wheel", wheeled, {passive:false});
		else GLBEvents(window, "wheel", wheeled, false);
		GLBEvents(window, "keydown", keyDown, false);
		document.body.removeChild(_me);
		document.body.classList.remove("newsletteropen");
	}
}
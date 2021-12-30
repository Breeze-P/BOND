/*		v 0.95 - revised 8/12 2021 ILTP		*/
function Main(){
	_globalVideo = document.createElement("div");
	_globalVideo.className = "globalVideo";
	_cursor = new CustomCursor();
	_menu = new MainMenu();
	_newsletter = new Newsletter();
	_main = document.getElementsByTagName("main")[0];
	var _pageTransition = new PageTransition();
	var _scroller;
	if(GLB._hasTouch) document.body.classList.add("touch");
	//Scrolling method
	if(GLB._hasTouch || GLB._firefox){
		//no Smoothscroll (consider touch screen laptops)
	}
	else _scroller = new Smoothscroll();//has external mouse / visible scrollbar
	
	//Page management
	var _pages = [];
	_pageDiv = _main.getElementsByClassName("page")[0]; //Always the first page (SSR)
	var _activePage, _path, _prevFetch, _firstLoad = true;
	function pageChanged(e){
		_path = _router.getFullUrl();
		//Detect forms overlays (these are triggered by url change, so they are catched here)
		if(_path == "" || _path == "/") _path = "home";
		//First page is server-side rendered (and we don't need the pagetransition)
		if(_firstLoad){
			_firstLoad = false;
			buildNewPage();
			return;
		}
		loadPage(_path);
	}

	function loadPage(_path){
		GLBEvents(window, "readyForNewPage", readyForNewPage, false);
		//console.log("Load page:", _path, _pages[_path]);
		if(_prevFetch) _prevFetch.invalid();
		//Delete old (cache) content
		if(_pages[_path] != undefined){
			if(_prefetches[_path]) _prefetches[_path].dispose();
			_pages[_path] = null, _prefetches[_path] = null;
		}
		if(_prefetches[_path] == undefined) _prefetches[_path] = new Prefetch(_path); //Load or reload
		_prevFetch = _prefetches[_path];
		_prefetches[_path].getContent(appendNewPage);
	}
	
	//Callback when content is fetched
	function appendNewPage(){
		//console.log("appendNewPage", _prefetches[_path]._content);
		GLBEvents(window, "readyForNewPage", readyForNewPage, true);
		_router.newPage(_prefetches[_path]._head);//more precise Google tracking (no delay for pagetransition)
		_pageTransition.anim(_menu.isOpen());
	}
	//Callback from pagetransition
	function readyForNewPage(){
		GLBEvents(window, "readyForNewPage", readyForNewPage, false);
		if(_main.contains(_pageDiv)) _main.removeChild(_pageDiv);
		if(_activePage) _activePage.stop(), _activePage = null;
		_main.appendChild(_prefetches[_path]._content);
		buildNewPage();
	}

	function buildNewPage(){
		_pageDiv = _main.getElementsByClassName("page")[0];
		if(_pages[_path] == undefined) _pages[_path] = new PageBase(_pageDiv);
		_activePage = _pages[_path];
		_activePage.start();
		if(_scroller) _scroller.newPage();
		else{
			window.scrollTo(0,_cachedScrollY);
			GLB._windowScrollY = _cachedScrollY = 0;
		}		
		_menu.select(_path.split("/")[0]);
	}
	GLBEvents(window, "pageChange", pageChanged, true);
	pageChanged(null);
	document.body.classList.remove("noanim");
}
//Loader for all external (static) html
function Prefetch(_path){
	var _this = this;
	_this._content = "";
	_this._head = "";
	var _loaded = false;
	var _req, _callback;

	//Make sure callback is not called, because another page is now used (maybe browsing quickly)
	_this.invalid = function(){
		_callback = null;
	}
	//Define callback for load complete
	_this.getContent = function(_cb){
		_callback = _cb;
		if(_loaded && _this._content != "") doCb(); //Get from cache in Prefetch
	}
	//Worker callback (async)
	_this.parsed = function(c){
		_this._content = c;
		doCb();
	}
	_this.dispose = function(){
		_callback = null;
		_this._content = null;
		_this._head = null;
		if(_req){
			_req.abort();
			_req = null;
		}
	}

	function XHR(){
		if(window.XMLHttpRequest) _req = new XMLHttpRequest();
		else if(window.ActiveXObject) _req = new ActiveXObject("Microsoft.XMLHTTP");
		try {
			_req.onreadystatechange = ready;
			if(_path == "/games_html.html") _req.open("GET", _path, true);
			else if(_path == "home") _req.open("GET", "/", true);
			else _req.open("GET", "/" + _path + "/", true);
			_req.send();
		}
		catch (e){ }
	}
	function ready(){
		if(_loaded) return;
		if(_req.readyState != 4) return;
		//Error (but not 404), try reloading after small delay
		if(_req.status != 200 && _req.status != 404){
			console.log("Error loading content for:", _path);
			_req.abort();
			_req = null;
			setTimeout(XHR, 1000);
			return;
		}
		var _parser = new DOMParser();
		var _dom = _parser.parseFromString(_req.responseText, "text/html");
		_this._content = _dom.getElementsByClassName("page")[0];
		_this._head = _dom.head;
		
		_req.abort();
		_req = null;
		_loaded = true;
		doCb();
	}
	function doCb(){
		if(_callback) _callback.call(), _callback = null; //Callback is defined when it's needed ("invalid" is called when changing to another page)
	}
	XHR();
}

function PageTransition(){
	var _this = this;
	var _me = document.getElementsByClassName("pageTransition")[0];
	var _on = false;
	var _timeout, _time = 400;//200 for own fade, another 200 for loading subpage
	
	function establish(){
		_me.classList.add("loaded");
	}
	setTimeout(establish, 100);

	function colorpagechange(e){
		//console.log("colorpagechange", e.detail)
		_me.style.backgroundColor = e.detail;
	}
	GLBEvents(window, "colorpagechange", colorpagechange, true);
	
	_this.anim = function(_menuOpen){
		clearTimeout(_timeout);
		if(_menuOpen){
			console.log("Skipping page transition");
			animOut();
			return;
		}
		_on = true;
		document.body.appendChild(_me);
		_timeout = setTimeout(animIn, 50);
	}
	function animIn(){
		document.body.classList.add("pagechange");
		_me.classList.add("in");
		_timeout = setTimeout(animOut, _time); //Give it a little time for loading first image
	}
	function animOut(){
		window.dispatchEvent(new GLBEvent("readyForNewPage"));
		_me.classList.remove("in");
		clearTimeout(_timeout);
		_timeout = setTimeout(animOutOver, 850);
	}
	function animOutOver(){
		if(!_on) return;
		_on = false;
		document.body.removeChild(_me);
		document.body.classList.remove("pagechange");
		_me.style.backgroundColor = "#FFF";
	}
}

function MainMenu(){
	var _this = this;
	var _header = document.getElementsByTagName("header")[0];
	var _logo = new LogoAnim(_header.getElementsByClassName("logo")[0]);
	var _nav = _header.getElementsByClassName("mainmenu")[0];
	var _toggle = _header.getElementsByClassName("toggle")[0];
	var _menuTimer;
	var _open = false;

	//Menu items
	var _itemsHtml = _nav.getElementsByClassName("primary");
	var _l = _itemsHtml.length;
	var _items = [], _itemsFlat = [];
	for(var i=0;i<_l;++i){
		var _m = new MenuItem(i, _itemsHtml[i]);
		_items[_m._page] = _m;
		_itemsFlat.push(_m);
	}

	var _selectedItem;
	_this.select = function(_path){
		//Manage menu appearance
		if(GLB._isMobile && _open) toggle(null);
		if(_selectedItem == _items[_path]) return;
		if(_selectedItem) _selectedItem.unselect();
		_selectedItem = _items[_path];
		if(_selectedItem) _selectedItem.select();
	}
	_this.isOpen = function(){
		if(GLB._isMobile && _open) return true;
		return false;
	}
	
	function toggle(e){
		_open = !_open;
		clearTimeout(_menuTimer);
		if(_open){
			_header.classList.add("open");
			_header.classList.add("opening");
			_header.classList.remove("closing");
			_menuTimer = setTimeout(opened, 850);
			for(var i=0;i<_l;++i) _itemsFlat[i].animIn();
		}
		else{
			_header.classList.add("closing");
			_menuTimer = setTimeout(closed, 850);
			for(var i=0;i<_l;++i) _itemsFlat[i].animOut();
		}
	}
	function opened(){
		_header.classList.remove("opening");
	}
	function closed(){
		_header.classList.remove("open");
		_header.classList.remove("closing");
	}
	function headerClick(e){
		if(!GLB._isMobile) return;
		if(e.clientX < GLB._vwOuter*.25){
			e.stopPropagation();
			if(_open) toggle(null);
		}
	}
	GLBEvents(_toggle, "click", toggle, true);
	GLBEvents(_header, "click", headerClick, true);

	function bb(e){
		if(!GLB._isMobile){
			for(var i=0;i<_l;++i) _itemsFlat[i].resetForDesktop();
		}
	}
	GLBEvents(window, "betweenBreakpoint", bb, true);

	/*var _sections, _modMenuListeners;
	var _numSections = -1, _currentModuleId = -1;
	_this.updateBackgrounds = function(_div){
		_sections = _div.getElementsByClassName("m");
		_numSections = _sections.length;
		//Menu color
		_modMenuListeners = [];
		for(var i=0;i<_numSections;i++) _modMenuListeners.push(new ModuleMenuColor(_sections[i], "data-bg"));
		resized(null);
	}

	function scrolled(e){
		//Handle menu color
		var _nearestId = -1, _nearestDist = 10000, _dist = 0;
		for(var i=0;i<_numSections;i++){
			_dist = Math.min(Math.abs(_modMenuListeners[i]._offY - GLB._windowScrollY), Math.abs(_modMenuListeners[i]._offEndY - GLB._windowScrollY));
			if(_dist < _nearestDist) _nearestDist = _dist, _nearestId = i;
		}
		//console.log("_nearestId", _nearestId);
		if(_currentModuleId != _nearestId){
			_currentModuleId = _nearestId;
			if(_currentModuleId != -1){
				if(_modMenuListeners[_currentModuleId]._color == "dark") document.body.classList.add("dark");
				else document.body.classList.remove("dark");
				//console.log("new", _currentModuleId)
			}
		}
	}
	//GLBEvents(window, "scroll", scrolled, true);

	function resized(e){
		for(var i=0;i<_numSections;i++) _modMenuListeners[i].resized();
	}
	GLBEvents(window, "LayoutUpdate", resized, true);*/
}
function LogoAnim(_logo){
	var _logolink = new overWriteLink(_logo);
	var _cursorH = new CursorHover(_logo);
	var _splittext = new SplitText(_logo, {type:"chars"});
	var _chars = _splittext.chars, _numChars = _chars.length;
	var _timer;
	
	function over(e){
		clearTimeout(_timer);
		for(var i=0;i<_numChars;i++){
			var _x = i-_numChars*.5;
			gsap.to(_chars[i], .15+Math.random()*.1, {rotation:_x*10, x:_x*10, y:-30-Math.random()*20, opacity:0, force3D:true, ease:"linear"});
		}
		_timer = setTimeout(resetChars, 300);
	}
	function resetChars(){
		for(var i=0;i<_numChars;i++){
			gsap.set(_chars[i], {rotation:0, x:0, y:30, opacity:0, force3D:true});
			gsap.to(_chars[i], .4, {y:0, opacity:1, force3D:true, ease:"cubic", delay:i*.02});
		}
	}
	if(!GLB._isMobile && !GLB._iOS) GLBEvents(_logo, "mouseenter", over, true);
}
function MenuItem(_id, _me){
	var _this = this;
	var _link = new overWriteLink(_me);
	var _animed = false;

	var _icons = _me.getElementsByClassName("icon");
	var _l = _icons.length;
	for(var i=0;i<_l;i++) new AnimatedIcon(_icons[i]);
	
	var _cursorH = new CursorHover(_me);

	//Prefetch: removed because this site will probably have people exploring without clicking these (and caching html is possibly disabled)
	//if(!GLB._hasTouch) GLBEvents(_me, "mouseenter", prefetchPage, true);
	var _href = _me.getAttribute("href");
	var _page = _href;
	//Remove first slash
	if(_page.substr(0,1) == "/") _page = _page.substr(1);
	if(_page == "") _page = "home";
	//Remove end slash
	var _l = _page.length;
	if(_page.substr(_l-1) == "/") _page = _page.substr(0, _l-1);
	_this._page = _page;

	/*function prefetchPage(e){
		//console.log("over", _page);
		if(_prefetches[_page] == undefined) _prefetches[_page] = new Prefetch(_page);
		GLBEvents(_me, "mouseenter", prefetchPage, false);
	}*/

	_this.select = function(){
		_me.classList.add("selected");
	}
	_this.unselect = function(){
		_me.classList.remove("selected");
	}
	//Mobile toggle
	_this.animIn = function(){
		if(GLB._isMobile){
			_animed = true;
			gsap.killTweensOf(_me);
			gsap.set(_me, {y:64, scale:1, opacity:0, force3D:true});
			gsap.to(_me, .8+_id*.05, {y:0, opacity:1, force3D:true, ease:"expo", delay:_id*.05+.1, onComplete:showLabel});
		}
	}
	function showLabel(){
		_me.classList.add("showlabel");
	}
	_this.animOut = function(){
		if(GLB._isMobile){
			_animed = true;
			_me.classList.remove("showlabel");
			gsap.killTweensOf(_me);
			gsap.to(_me, .3-_id*.05, {scale:.75, opacity:0, force3D:true, ease:"quad"});
		}
	}
	_this.resetForDesktop = function(){
		if(_animed){
			_animed = false;
			_me.classList.remove("showlabel");
			gsap.killTweensOf(_me);
			gsap.set(_me, {x:0, opacity:1, force3D:true, clearProps:"all"});
		}
	}
}

/*		Router for controlling url, tracking etc. within the SPA		*/
function Router(){
	var _this = this;
	var _previousUrl = "";
	var _apiPrefix = "/", _path = "";
	var _prefix = _apiPrefix, _prefixL = _prefix.length;
	
	_this._useAPI = !!(window.history && history.pushState); //Check for History API
	if(GLB._hasTouch && (!GLB._iOS && GLB._androidVersion < 4.3 && GLB._androidVersion > 0)) _this._useAPI = false; //Detect old Android phones
	//_this._useAPI = false;//test

	//Check that deeplink (ifany) has same format
	var _firstPath = window.location.pathname;
	if(_firstPath.length > _apiPrefix.length) cleanUrl(window.location.pathname || "");

	//Respond to back/forward browser navigation
	function popstate(e){
		//Go back from case study etc.
		if(_previousUrl == "/" || _path.indexOf("our-work") != -1){
			_cachedScrollY = _cachedPageScrollY;
			_cachedPageScrollY = 0;//Reset
		}
		_previousUrl = _path;//Store previous page
		if(_previousUrl.substr(0, 1) != "/") _previousUrl = "/" + _previousUrl;
		cleanUrl(window.location.pathname || "");
		if(isSubpage("/"+_path+window.location.search, false)) return; //subpage is used in projects filters
		respondToState();
	}
	//Address was changed, get the url and dispatch global pageChange event
	function respondToState(){
		cleanUrl(window.location.pathname || "");
		window.dispatchEvent(GLBEvent("pageChange"));
	}
	//Get url withouth any prefix (e.g. www.keepit.com)
	function cleanUrl(_in){
		_in = _in.toLowerCase();
		_path = removePrefix(_in).slice(0, -1);
	}
	function removePrefix(_in){
		if(_prefixL > 0) return _in.substr(_prefixL);
		else return _in;
	}
	//Compare to previous url to see if this is "just" a subpage - because we don't want a pagetransition then
	function isSubpage(_newUrl, _setUrl){
		var _newClean = _newUrl.split("?")[0];
		if(_newClean.substr(-1) == "/") _newClean = _newClean.substr(0, _newClean.length-1);
		//console.log("NEW:", _newClean, "old", _previousUrl);
		if(_newClean != "" && _newClean == _previousUrl){
			//console.log("Same page:", _newUrl);
			//Remove end slash if there are parameters
			if(_newUrl.substr(-1) == "/" && _newUrl.indexOf("?") != -1) _newClean = _newUrl.substr(0,_newUrl.length-1);
			else _newClean = _newUrl;
			//Update history
			if(_setUrl) window.history.pushState({}, "", _newClean);
			window.dispatchEvent(GLBEvent("subpageChange"));
			return true;
		}
		return false;
	}
	
	_this.setUrl = function(_newUrl){
		//console.log("seturl", _newUrl)
		if(_newUrl.indexOf("?") == -1 && _newUrl.substr(-1) != "/" && _newUrl.indexOf("#") == -1) _newUrl += "/";//Make sure we have a trailing slash
		_previousUrl = _path;//Store previous page
		if(_previousUrl.substr(0, 1) != "/") _previousUrl = "/" + _previousUrl;
		if(_newUrl == "" || _newUrl == "/") _newUrl = _prefix;
		_cachedPageScrollY = GLB._windowScrollY;
		//console.log("store scroll", _cachedPageScrollY);
		if(isSubpage(_newUrl, true)) return;
		window.history.pushState({}, "", _newUrl);
		respondToState();
	}
	_this.getFullUrl = function(){
		return _path;
	}
	_this.getPreviousUrl = function(){
		return _previousUrl;
	}
	_this.getHash = function(){
		return window.location.hash;
	}

	
	//All pageview tracking
	function track(_p){
		if(window.location.search && window.location.search != "") _p += window.location.search; //Make sure all parameters are tracked too
		//console.log("Track url", _p);
		/* Requires correct setup in TagManager try{
			dataLayer.push({'event':'Pageview', 'pagePath':_p, 'pageTitle':document.title});
			//console.log("Succcess tracking TagManager");
		}
		catch(e){console.log("Couldn't track pageview for TagManager!");}*/
		try{
			_hsq.push(['setPath', _p]);
			_hsq.push(['trackPageView']);
			//console.log("Succcess tracking Hubspot");
		}
		catch(e){console.log("Couldn't track pageview for Hubspot!");}
	}
	
	//Modify header elements (initial page always look correct from server)
	var _canonical = document.querySelector("link[rel='canonical']"), _fbUrl = document.querySelector("meta[property='og:url']"), _fbTitle = document.querySelector("meta[property='og:title']"), _twTitle = document.querySelector("meta[name='twitter:title']");
	var _metaDesc = document.querySelector("meta[name='description']"), _twDesc = document.querySelector("meta[name='twitter:description']"), _fbDesc = document.querySelector("meta[property='og:description']");
	_this.newPage = function(_head){
		newHead(_head);
		track(getGAaPath());
	}
	function getGAaPath(){
		var _p = "/"+_path;
		if(_p != "/") _p += "/";
		return _p;
	}
	function newHead(_head){
		//Header and canonical alone (to be sure they are updated)
		var _newTitle = _head.getElementsByTagName("title")[0].textContent;
		var _newcanonical = _head.querySelector("link[rel='canonical']").getAttribute("href");
		try{
			_canonical.setAttribute("href", _newcanonical);
			document.title = _newTitle;
		}
		catch(e){}
		try{
			_fbUrl.setAttribute("content", _newcanonical);
			var _newDesc = _head.querySelector("meta[name='description']").content;
			_metaDesc.content = _newDesc;
			_twDesc.setAttribute("content", _newDesc);
			_fbDesc.setAttribute("content", _newDesc);
			_fbTitle.setAttribute("content", _newTitle);
			_twTitle.setAttribute("content", _newTitle);
		}
		catch(e){
			console.log("Error updating head");
		}
	}
	
	//Init
	respondToState(), GLBEvents(window, "popstate", popstate, true);
}

/*		Template for all pages		*/
function PageBase(_div){
	var _this = this;
	//Build custom template for the page
	//Standard modules are controlled from here (to avoid duplicate code in each page)
	var _started = false;
	
	var _modules = [["a", overWriteLink], ["lazy", LazyMedia], ["txtfade", TxtFade], ["scrolltrack", Scrolltrack], ["greenroom", Greenroom], ["intro", Intro], ["firstmodule", FirstM], ["expertise", Expertise], ["projects", Projects], ["collab", Collab], ["parallax", Parallax], ["freeimages", ImagesWithTitle], ["articleintro", ImagesWithTitle], ["mousetrail", MouseTrail], ["contact", ContactM], ["icon", AnimatedIcon], ["glitch", Glitch], ["columnscroller", ColumnScroller], ["dragable", Dragable], ["anchormenu", AnchorMenu], ["cursorhover", CursorHover], ["greenroomcopy", GreenroomCopy], ["carousel", Carousel], ["caseintro", CaseIntro], ["letterhover", LetterHover], ["tilttext", TiltText], ["subscribeBtn", SubscribeBtn], ["inlineform", InlineForm]];
	var _numModules = _modules.length;
	
	_this.start = function(){
		if(_started) return;
		_started = true;
		//Create modules
		var _el;
		for (var i = 0; i < _numModules; i++){
			if(i == 0) _el = _div.getElementsByTagName(_modules[i][0]);
			else _el = _div.getElementsByClassName(_modules[i][0]);
			var _num = _el.length;
			_modules[i][2] = _num; //Save num
			var _instances = [];
			for (var j = 0; j < _num; j++) _instances.push(new _modules[i][1](_el[j]));
			_modules[i][3] = _instances;
		}
		//Horizontal pages (process, cases)
		_scrollAxis = 0;
		//Autoscroll a little after small delay
		if((_div.getAttribute("data-autoscroll") || "false") == "true") autoscroll();
		if(_globalVideoControllers == 0) _globalVideo.classList.add("hidden");
		//Theme
		if((_div.getAttribute("data-theme") || "") == "invert") document.body.classList.add("invert");
		forceResize();
	}
	_this.stop = function(){
		if(!_started) return;
		_started = false;
		if(_justOpenedProject) GLBEvents(window, "newprojectLoaded", destroy, true);
		else destroy();
		clearTimeout(_scrollTimer);
	}
	//Stop is delayed in order for project-to-project scroll to work
	function destroy(e){
		GLBEvents(window, "newprojectLoaded", destroy, false);
		document.body.classList.remove("invert");
		//Dispose modules
		try {
			for (var i = 0; i < _numModules; i++){
				var _num = _modules[i][2];
				for (var j = 0; j < _num; j++){
					_modules[i][3][j].destroy();
					_modules[i][3][j] = null;
				}
				_modules[i][3] = null;
			}
		}
		catch (e){
			console.log("Error disposing page!", e);
		}
		_cursor.resetColor(false);
	}
}
var _scrollTimer;
function autoscroll(){
	function doScroll(){
		if(GLB._windowScrollY <= 2) gsap.to(window, 1, {scrollTo:{y:GLB._reliableSh * .1, autoKill:true}, ease:"cubic.inOut"});
	}
	clearTimeout(_scrollTimer);
	_scrollTimer = setTimeout(doScroll, 2000);
}

function CustomCursor(){
	var _this = this;

	var _me = document.createElement("div");
	_me.className = "cursor";
	var _bg = document.createElement("div");
	_bg.className = "bg";
	_me.appendChild(_bg);
	var _label = document.createElement("div");
	_label.className = "label";
	_me.appendChild(_label);
	var _icon = document.createElement("div");
	_icon.className = "icon";
	_me.appendChild(_icon);
	var _mx = 0, _my = 0, _twX = 0, _twY = 0, _twFx = 0, _twFy = 0, _scale = 1, _twS = 0;
	var _size = 150;//css size to calculate scale from
	var _over = false, _holding = false;
	var _flipside;

	//Create audio
	var _audio = document.createElement("audio");
	_audio.controls = false;
	_audio.loop = false;
	_audio.muted = false;
	_audio.autoplay = false;
	_audio.preload = "none";
	var _src = document.createElement("source");
	_src.setAttribute("type", "audio/mpeg");
	_src.setAttribute("src", "/Assets/Sounds/glitch_1.mp3");
	_audio.appendChild(_src);

	//Intro follow "Hold for flipside"
	var _introFollower = document.createElement("div");
	_introFollower.className = "introFollow";
	_introFollower.innerHTML = "HOLD FOR<br />FLIPSIDE";
	gsap.set(_introFollower, {rotation:15, opacity:0, force3D:true});
	var _followOn = false, _allowFollowAnimIn = false, _removeFollowOnDone = false;

	function startFollow(e){
		GLBEvents(window, "introRemoved", startFollow, false);
		_allowFollowAnimIn = true;
	}
	GLBEvents(window, "introRemoved", startFollow, true);

	function firstMove(e){
		document.body.appendChild(_me);
		document.body.appendChild(_introFollower);
		GLBEvents(window, "mousemove", firstMove, false);
		_twS = 0;
		_twX = _twFx = e.clientX, _twY = e.clientY;
		_twFx -= 200, _twFy = GLB._reliableSh*1.5;
		_followOn = true;
		if(_allowFollowAnimIn) animInFollow();
		GLBEvents(window, "repeatFollower", repeatFollower, true);
	}
	function animInFollow(){
		_allowFollowAnimIn = false;
		gsap.to(_introFollower, .8, {rotation:0, force3D:true, ease:"cubic", delay:.2});
		gsap.to(_introFollower, 1, {opacity:1, force3D:true, ease:"expo", delay:0, onComplete:removeFollow});
		_twFy =  GLB._reliableSh*1.5;
	}
	function removeFollow(){
		gsap.to(_introFollower, .5, {rotation:8, force3D:true, ease:"linear", delay:1, onStart:followAnimout, onComplete:followAnimoutComplete});
	}
	function followAnimout(){
		_followOn = false;
		gsap.to(_introFollower, .5, {y:GLB._reliableSh*1.5, force3D:true, ease:"cubic.in"});
	}
	function followAnimoutComplete(){
		if(_removeFollowOnDone){
			_removeFollowOnDone = false;
			if(document.body.contains(_introFollower)) document.body.removeChild(_introFollower);
		}
	}
	var _numFollowShows = 0;
	function repeatFollower(e){
		return;
		//console.log("repeatFollower", _followOn);
		if(_followOn) return;
		_numFollowShows++;
		if(_numFollowShows > 4){
			GLBEvents(window, "repeatFollower", repeatFollower, false);//only once
			_removeFollowOnDone = true;
			//console.log("Stop follow after this");
		}
		_twFx -= 200, _twFy = GLB._reliableSh*1.5;
		_followOn = true;
		_allowFollowAnimIn = true;
	}
	
	if(!GLB._hasTouch) GLBEvents(window, "mousemove", firstMove, true);
	else{
		_bg.classList.add("touchflipside");
		gsap.set(_bg, {opacity:0, x:-75, y:-75, force3D:true});
		document.body.appendChild(_bg);
	}

	function move(e){
		_mx = e.clientX, _my = e.clientY;
	}
	GLBEvents(window, "mousemove", move, true);

	function engine(){
		_twX += (_mx - _twX) * .2;
		_twY += (_my - _twY) * .2;
		gsap.set(_me, {x:_twX, y:_twY, force3D:true});
		if(_followOn){
			_twFx += (_mx - _twFx) * .1;
			_twFy += (_my - _twFy) * .1;
			gsap.set(_introFollower, {x:_twFx, y:_twFy, force3D:true});
			if(_allowFollowAnimIn) animInFollow();
		}
		_twS += (_scale - _twS) * .2;
		if(!_holding) gsap.set(_bg, {scale:_twS, force3D:true});
	}
	gsap.ticker.add(engine);

	//Manage scaling
	function defaultScale(){
		_scale = 20/_size;
	}

	//Init
	defaultScale();

	//Interaction from elements
	_this.mouseoverLabel = function(_str){
		_over = true;
		_label.textContent = _str;
		var _w = _label.offsetWidth;
		if(_w > 40 && _w < 100) _w = 100;
		_scale = (_w+40)/_size;
	}
	_this.mouseoutLabel = function(){
		_over = false;
		_label.textContent = "";
		defaultScale();
	}
	_this.mouseoverHide = function(_iconcl){
		_over = true;
		_label.textContent = "";
		_scale = 0;
		if(_iconcl) _icon.classList.remove(_iconcl);
	}
	_this.mouseoutHide = function(){
		_over = false;
		defaultScale();
	}
	_this.mouseoverAsBackground = function(){
		_over = true;
		_label.textContent = "";
		_scale = .5;
	}
	_this.mouseoutAsBackground = function(){
		_over = false;
		defaultScale();
	}
	_this.mouseoverAsIcon = function(_iconcl){
		_over = true;
		_label.textContent = "";
		_scale = .5;
		_icon.classList.add(_iconcl);
	}
	_this.mouseoutAsIcon = function(_iconcl){
		_over = false;
		_icon.classList.remove(_iconcl);
		defaultScale();
	}
	_this.largeforgame = function(){
		_over = true;
		defaultScale();
		_scale *= 3;
	}


	_this.color = function(_c, _tween){
		_bg.classList.remove("instantbg");
		if(!_tween) _bg.classList.add("instantbg");
		_bg.style.backgroundColor = _c;
		_label.style.color = "#FFF";
		//_me.classList.add("blend");
	}
	_this.resetColor = function(_tween){
		_bg.classList.remove("instantbg");
		if(!_tween) _bg.classList.add("instantbg");
		_bg.style.backgroundColor = "#0CFB03";
		_label.style.color = "#222";
	}

	//Hold for flipside
	function down(e){
		if(e.button == 2 || e.ctrlKey) return;//right-click
		if(GLB._vw != GLB._vwOuter && e.clientX > GLB._vw) return;
		if(_over || _router.getFullUrl() != "" || _flipside) return;
		GLBEvents(window, "mouseup", up, true);
		_holding = true;
		gsap.killTweensOf(_bg);
		gsap.to(_bg, .9, {opacity:1, scale:((GLB._vw*2) / _size), force3D:true, ease:"expo.in", onComplete:showFlipside});
	}
	var _txInit = 0, _tyInit = 0, _prevTx = 0, _prevTy = 0;
	function tdown(e){
		if(_router.getFullUrl() != "" || _flipside) return;
		_txInit = e.touches[0].clientX, _tyInit = e.touches[0].clientY;
		GLBEvents(window, "touchend", tup, true);
		GLBEvents(window, "touchmove", tmove, true);
		_holding = true;
		gsap.killTweensOf(_bg);
		gsap.set(_bg, {opacity:0, x:_txInit, y:_tyInit, force3D:true});
		gsap.to(_bg, .2, {opacity:1, delay:.2, force3D:true, ease:"cubic"});
		gsap.to(_bg, .9, {scale:((Math.max(GLB._vw,GLB._reliableSh)*2) / _size), delay:.2, force3D:true, ease:"expo.in", onComplete:showFlipside});
	}
	function up(e){
		GLBEvents(window, "mouseup", up, false);
		if(_flipside) _holding = false;
		else{
			gsap.killTweensOf(_bg);
			gsap.to(_bg, .2, {opacity:1, scale:20/_size, force3D:true, ease:"cubic", onComplete:isReset});
		}
	}
	function tmove(e){
		_prevTx = e.touches[0].clientX, _prevTy = e.touches[0].clientY;
		gsap.set(_bg, {x:_prevTx, y:_prevTy, force3D:true});
		var _d = distance(_prevTx,_prevTy,_txInit,_tyInit)
		if(_d > 20){
			//console.log("Moved too much for flipside");
			tup(null);
		}
	}
	function tup(e){
		GLBEvents(window, "touchend", tup, false);
		GLBEvents(window, "touchmove", tmove, false);
		
		if(_flipside) _holding = false;
		gsap.killTweensOf(_bg);
		gsap.to(_bg, .2, {opacity:0, scale:20/_size, force3D:true, ease:"cubic", onComplete:isReset});
	}
	function distance(x1,y1,x2,y2){
		return Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2,2));
	}
	function isReset(){
		_holding = false;
	}
	function showFlipside(){
		//console.log("showFlipside");
		_flipside = new Flipside();
		gsap.to(_bg, .8, {opacity:0, force3D:true, ease:"cubic.inOut", delay:.05, onComplete:resetBg});
		//Play glitch sound
		if(Math.random() < .5) _src.setAttribute("src", "/Assets/Sounds/glitch_1.mp3");
		else _src.setAttribute("src", "/Assets/Sounds/glitch_2.mp3");
		_audio.load();
		_audio.play();
	}
	function resetBg(){
		defaultScale();
		_holding = false;
		if(!GLB._hasTouch) gsap.set(_bg, {opacity:1, force3D:true});
	}
	if(GLB._hasTouch) GLBEvents(window, "touchstart", tdown, true);
	else GLBEvents(window, "mousedown", down, true);


	function closeFlipside(e){
		if(!_flipside) return;
		_flipside.destroy();
		_flipside = null;
		_holding = true;
		gsap.killTweensOf(_bg);
		gsap.set(_bg, {opacity:1, scale:((GLB._vw*2) / _size), force3D:true});
		if(GLB._hasTouch) gsap.to(_bg, 1, {opacity:0, force3D:true, ease:"expo"});
		gsap.to(_bg, 1, {scale:20/_size, force3D:true, ease:"expo", onComplete:doneFlipside});
	}
	function doneFlipside(){
		_holding = false;
	}
	GLBEvents(window, "closeFlipside", closeFlipside, true);
}

//Smooth (native) scroll
function Smoothscroll(){
	var _this = this;
	var _deltaY = 0, _whSX = 0, _whSY = 0, _twSX = 0, _twSY = 0, _windowW = GLB._vw, _windowH = GLB._reliableSh, _speed = .1;
	var sX = 0, sY = 0, pX = 0, pY = 0;	
	var _whT, _userWheeling = false, _refreshWhenStarting = false;
	var PIXEL_STEP  = 10, LINE_HEIGHT = 50;//relevant for Firefox primarily
	var _resizeTimer;

	function wheeled(e){
		nWh(e);
		e.preventDefault();
		e.stopPropagation();
		if(_scrollAxis == 1){
			if(Math.abs(_deltaY) > Math.abs(_deltaX)) _whSX += _deltaY;
			else _whSX += _deltaX;
			if(_whSX < 0) _whSX = 0;
			else if(_whSX > _windowW) _whSX = _windowW;
		}
		else{
			_whSY += _deltaY;
			if(_whSY < 0) _whSY = 0;
			else if(_whSY > _windowH) _whSY = _windowH;
		}
		
		if(!_userWheeling){
			//Need to refresh (used scrollbar)
			if(_refreshWhenStarting){
				//console.log("_refreshWhenStarting")
				_refreshWhenStarting = false;
				if(_scrollAxis == 1) _whSX = _twSX = document.documentElement.scrollLeft, _twSX += .5;//avoid instant stopping
				else _whSY = _twSY = GLB._windowScrollY, _twSY += .5;//avoid instant stopping				
			}
			gsap.ticker.add(scrollengine);
			window.dispatchEvent(new GLBEvent("updateScrollListeners"));
		}
		_userWheeling = true;
		clearTimeout(_whT);
		_whT = setTimeout(wheelOver, 1500);
	}
	function scrolled(e){
		//console.log("scrolled, _userWheeling:", _userWheeling);
		if(!_userWheeling) _refreshWhenStarting = true;
	}
	//Make sure keyboard shortcuts always work
	function keydown(e){
		var _k = e.key;
		if(_k == "End" || _k == "Home" || _k == "PageDown" || _k == "PageUp" || _k == " "){
			_userWheeling = false;
			gsap.ticker.remove(scrollengine);
		}
	}
	function wheelOver(){
		_userWheeling = false;
	}

	//Normalize wheel event		
	function nWh(e){
		if('deltaX' in e) pX = e.deltaX;
		if('deltaY' in e) pY = e.deltaY;
		else{
			// Legacy
			if ('detail'      in e) sY = e.detail;
			else if ('wheelDelta'  in e) sY = -e.wheelDelta / 120;
			else if ('wheelDeltaY' in e) sY = -e.wheelDeltaY / 120;
			else if ('wheelDeltaX' in e) sX = -e.wheelDeltaX / 120;

			// side scrolling on FF with DOMMouseScroll
			if('axis' in e && e.axis === e.HORIZONTAL_AXIS) sX = sY, sY = 0;
			pX = sX * PIXEL_STEP, pY = sY * PIXEL_STEP;
		}
				
		//Firefox (maybe others) that don't scroll in pixels
		if(!GLB._mac || GLB._firefox){
			if((pX || pY) && e.deltaMode){
				if(e.deltaMode == 1) pX *= LINE_HEIGHT, pY *= LINE_HEIGHT;
				else pX *= GLB._reliableSh, pY *= GLB._reliableSh;
			}
			else if(GLB._mac && GLB._firefox) pY *= 2;
		}
		// Fall-back if spin cannot be determined
		//if(pY && !sY){ sY = (pY < 1) ? -1 : 1;}
		_deltaX = pX, _deltaY = pY;
	}

	function scrollengine(){
		if(_scrollAxis == 1){
			_twSX += (_whSX - _twSX) * _speed;
			window.scrollTo(_twSX,0);
		}
		else{
			_twSY += (_whSY - _twSY) * _speed;
			GLB._windowScrollY = _twSY;
			window.scrollTo(0,_twSY);
			if(_isFrontpage){
				if(_twSY > GLB._reliableSh*2 && (_twSY > _windowH - 5/*-GLB._reliableSh*.95*/)){
					//console.log("Jump to top");
					GLB._windowScrollY = _whSY = _twSY = 0;
					window.dispatchEvent(new GLBEvent("endlessscroll"));
					window.scrollTo(0,_twSY);
				}
				/*else{
					//Allow scrolling from top to bottom (backwards)
					if(_whSY == 0 && _deltaY < -2){
						//var _dif = _whSY - _twSY;
						//console.log("at top", _dif, _deltaY);
						GLB._windowScrollY = _whSY = _twSY = _windowH-6;//GLB._reliableSh*.95;
						window.dispatchEvent(new GLBEvent("endlessscroll"));
						window.scrollTo(0,_twSY);						
					}
				}*/
			}
		}
		if(!_userWheeling && ((_scrollAxis == 0 && Math.abs(_twSY-_whSY) < .2) || (_scrollAxis == 1 && Math.abs(_twSX-_whSX) < .2))){
			//console.log("stop")
			gsap.ticker.remove(scrollengine);
		}
	}
	function scrollResized(e){
		clearTimeout(_resizeTimer);
		if(!GLB._isMobile){
			_windowW = document.documentElement.scrollWidth - GLB._vw;
			_windowH = document.documentElement.scrollHeight - GLB._reliableSh;
		}
	}

	if(GLB._supportsPassive) window.addEventListener("wheel", wheeled, {passive:false});
	else GLBEvents(window, "wheel", wheeled, true);
	function redoWheelListeners(e){
		if(GLB._supportsPassive){
			window.removeEventListener("wheel", wheeled, {passive:false});
			window.addEventListener("wheel", wheeled, {passive:false});
		}
		else{
			GLBEvents(window, "wheel", wheeled, false);
			GLBEvents(window, "wheel", wheeled, true);
		}
	}
	GLBEvents(window, "redoWheelListeners", redoWheelListeners, true);
	GLBEvents(window, "scroll", scrolled, true);
	GLBEvents(window, "keydown", keydown, true);
	GLBEvents(window, "LayoutUpdate", scrollResized, true);
	setTimeout(scrollResized, 100);

	var _isFrontpage = false;
	_this.newPage = function(){
		_path = _router.getFullUrl();
		//Detect forms overlays (these are triggered by url change, so they are catched here)
		if(_path == "" || _path == "/") _isFrontpage = true;
		else _isFrontpage = false;
		if(GLB._hasTouch) _isFrontpage = false;//no endless scroll on touch
		_twSX = _whSX = _twSY = _whSY = GLB._windowScrollY = _cachedScrollY;
		window.scrollTo(0,_cachedScrollY);
		_cachedScrollY = 0;//Reset for next page
		scrollResized();
		clearTimeout(_resizeTimer);
		_resizeTimer = setTimeout(scrollResized, 150);//if certain elements need js to set their height etc.
	}
}

/*		Globals		*/
var _globalVideo, _cursor, _menu, _newsletter, _main, _pageDiv, _prefetches = [];
var _scrollAxis = 0; //0=normal/vertical, 1=horizontal
var _justOpenedProject = false, _skipIntro = false;
var _cachedPageScrollY = 0, _cachedScrollY = 0, _flipsideGameId = 0;
//Init
var _router = new Router();
new Main();


//Cookie consent
/*var _siteCookie = "greenroom_website_cookie_2021=";
function Cookies(){
	//Document cookies
	var _cookiePopup;
	var _cookie = "", _btn;

	function getCookie(cname){
		var ca = (document.cookie).split(';');
		var _l = ca.length;
		for(var i = 0; i <_l; i++){
			if(ca[i].indexOf(cname) != -1){
				return unescape(ca[i].substr(ca[i].indexOf(cname)+cname.length));
			}
		}
		return "";
	}
	var _value = getCookie(_siteCookie);
	if(_value == "yes"){
		console.log("Cookie already accepted", _value);
	}
	else{
		_cookiePopup = document.createElement("div");
		_cookiePopup.className = "cookies";
		_cookiePopup.innerHTML = 'By continuing to browse this site, you accept the use of cookies to generate visit statistics. <a href="/privacy-policy/">Know more</a>';
		_btn = document.createElement("button");
		_btn.className = "closeBtn";
		_cookiePopup.appendChild(_btn);
		gsap.set(_cookiePopup, {y:"100%", force3D:false});
		document.body.appendChild(_cookiePopup);
		new overWriteLink(_cookiePopup.getElementsByTagName("a")[0]);
		GLBEvents(_btn, "click", accepted, true);
		//Hide after scrolling
		GLBEvents(window, "scroll", wscroll, true);
		//Anim in
		gsap.to(_cookiePopup, 1, {y:"0%", force3D:false, ease:"cubic.inOut"});
	}
	function accepted(e){
		GLBEvents(_btn, "click", accepted, false);
		GLBEvents(window, "scroll", wscroll, false);
		gsap.killTweensOf(_cookiePopup);
		gsap.to(_cookiePopup, .3, {y:"100%", force3D:false, ease:"quad", onComplete:removeMe});
		acceptedCookies();
	}
	function removeMe(){
		document.body.removeChild(_cookiePopup);
		_cookiePopup = null;
		_btn = null;
	}
	function wscroll(e){
		if(GLB._windowScrollY > GLB._reliableSh) accepted(null);
	}
	function acceptedCookies(){
		var d = new Date();
		d.setTime(d.getTime() + (365*24*60*60*1000));//1 year
		_cookie += _siteCookie + "yes;expires="+ d.toUTCString() + ";path=/";
		document.cookie = _cookie;
	}
}
new Cookies();*/
// new/annotation/:urn

appControllers.controller( 'imgspect', ['$scope','$injector','$routeParams','json','annotation',
function( $scope, $injector, $routeParams, json, annotation ){
	
	
	
	// SELECTORS
	
	var img = $('.imgspect img')
	
	// Canvas
	
	var frame = $( '.imgspect.frame' );
	var canvas = $( '.imgspect.frame .canvas' );
	
	// Nav
	
	var nav = $( '.imgspect.nav' );
	var drag = $( '.imgspect.nav .drag' );
	
	// Hi-Lite

    var resize = $( '.imgspect.frame .canvas .lite.temp .resize' );
    var save = $( '.imgspect.frame .canvas .lite.temp .save' );
    var cancel = $( '.imgspect.frame .canvas .lite.temp .cancel' );
	
	
	// CONFIGURATION
	
	// Current URN
	
	$scope.urn = ( $routeParams.urn == undefined ) ? null : $routeParams.urn;
	
	
	// Stores all the JSON data
	
	$scope.json = {};
	
	
	// Application state

	$scope.config = {
		lite: {
			color:'#FF0',
			opa:0.75
		}
	};	
	var orig = {};


	// Frame Size
	
	$scope.frame_w = function(){
		return frame.width();
	};
	$scope.frame_h = 600;
	
	
	// Canvas Size and position

	$scope.canvas_w = 0;
	$scope.canvas_h = 0;
	$scope.canvas_x = 0;
	$scope.canvas_y = 0;
	$scope.zoom = 1
	
	
	// Ratios
	
	$scope.wr = function(){
		var wr = $scope.frame_w() / $scope.canvas_w;
		wr = ( wr > 1 ) ? 1 : wr;
		return wr;
	}
	
	$scope.hr = function(){
		var hr = $scope.frame_h / $scope.canvas_h;
		hr = ( hr > 1 ) ? 1 : hr;
		return hr;
	}
	
	
	// Dragger Position
	
	$scope.drag_x = 0;
	$scope.drag_y = 0;
	$scope.drag_w = function(){
		return $scope.nav_w() * $scope.wr();
	}
	$scope.drag_h = function(){
		return $scope.nav_h * $scope.hr();
	}
	
	
	// Navigation Size
	
	$scope.nav_h = 300;
	$scope.nav_w = function(){
		return $scope.nav_scale() * orig.width
	}
	$scope.nav_scale = function(){
		return $scope.nav_h / orig.height
	}
	
	
	
	// SERVER COMMUNICATION
	
	// Get the item JSON
	
	json.urn( $scope.urn ).then( function( data ){
		var src = data.src[0];
		json.get( src ).then( function( data ){
			$scope.json.item = data;
			upload_json( data['this:upload']['@id'] );
		});
	});
	
	
	// get the upload JSON
	
	function upload_json( urn ){
		json.urn( urn ).then( function( data ){
			var src = data.src[0];
			json.get( src ).then( function( data ){
				$scope.json.upload = data;
				annotations( $scope.urn );
			});
		});
	}
	
	
	// get the annotations
	
	function annotations( urn ){
		annotation.by_item( urn ).then( function( data ){
			$scope.json.annotations = [];
			for ( var i=0; i<data.length; i++ ){
				var urn = data[i].urn
				var params = urn.split(',');
				$scope.json.annotations.push({ 
					urn: urn, 
					x: params[1],
					y: params[2],
					w: params[3],
					h: params[4]
				});
			}
		})
		ready();
	}
	
	
	// Start the party
	
	function ready(){
		$scope.src = $scope.json.upload['this:src'];
		start();
	}
	
	
	
	// USER INTERACTION
		
	// Once the image loads get started
		
	function start(){
		img.load( function(){
			orig.width = this.width;
			orig.height = this.height;
			
			// Start it up
			
			drag_start();
			lite_start();
			
			// Image you are no longer needed!
			
			img.detach();
			
			// Initial display
			
			dragging();
		});
	}
	
	// Convert relative coordinates
	
	$scope.to_canvas_x = function( n ){ return n*$scope.canvas_w }
	$scope.to_canvas_y = function( n ){ return n*$scope.canvas_h }
	
	$scope.to_nav_x = function( n ){ return n*$scope.nav_w() }
	$scope.to_nav_y = function( n ){ return n*$scope.nav_h }
	
	
	
	// LITE
	
	// Start the hi-liter
	
	var pressed = false;
	$( document )
	.on( 'touchstart mousedown', function(){
		pressed = true;
	})
	.on( 'touchend mouseup', function(){
		pressed = false;
	});
	
	function event_match( e ){
		return ( e.originalEvent.srcElement == canvas[0] ) ? true : false
	}
	
	// The temp_lite object
	
	function clear_pos(){ return { x:null, y:null, w:null, h:null } };
	$scope.temp_lite = clear_pos();
	
	$scope.lite_reset = function(){
		$scope.temp_lite = clear_pos();
	}
	
	$scope.lite_cancel = function(){ 
		$scope.lite_reset();
		$scope.refresh();
	}
	
	$scope.lite_clear_text = function(){
		$scope.temp_label = '';
		$scope.temp_desc = '';
	}
	$scope.lite_clear_text();
	
	
	// Stash the lite
	
	$scope.lites = [];
	$scope.lite_stash = function(){
		$scope.lites.push( angular.copy( $scope.temp_lite ) );
	}
	
	// The temp_lite points
	
	var _p1 = { x:null, y:null };
	var p1 = function( pos ){
		if ( ! angular.isDefined( pos ) ){
			return _p1
		}
		_p1.x = pos.x;
		_p1.y = pos.y;
	}
	
	var _p2 = { x:null, y:null };
	var p2 = function( pos ){
		if ( ! angular.isDefined( pos ) ){
			return _p2
		}
		_p2.x = pos.x;
		_p2.y = pos.y;
	}
	
	// Set p1 to upper-left and p2 to lower-right
	
	function point_clean(){
		p1({ x:min_x(), y:min_y() });
		p2({ x:max_x(), y:max_y() });
	}
	function min_x(){ return Math.min( p1().x, p2().x ) }
	function min_y(){ return Math.min( p1().y, p2().y ) }
	function max_x(){ return Math.max( p1().x, p2().x ) }
	function max_y(){ return Math.max( p1().y, p2().y ) }
	
	function ctrl_start(){
		save.on('touchstart click', function(e){
			$scope.lite_stash();
		});
		cancel.on('touchstart click', function(e){
			$scope.lite_cancel();
		});
	}
	
	function resize_start(){
		resize
		.on('touchstart mousedown', function(e){
			console.log( 'resize down' );
		})
		.on('touchmove mousemove', function(e){
			console.log( 'resize move' );
		})
		.on('touchend mouseup', function(e){
			console.log( 'resize up' );
		});
	}
	
	function lite_start(){
		canvas
		.on('touchstart mousedown', function(e){
			( event_match(e) ) ? lite_down( e ) : null;
		})
		.on('touchmove mousemove', function(e){
			lite_move( e );
		})
		.on('touchend mouseup', function(e){
			lite_up( e );
		});
		resize_start();
		ctrl_start();
	}
	
	function lite_pos( e ){
		p2( mouse_rel( e ) );
		$scope.temp_lite.x = min_x().toFixed(4);
		$scope.temp_lite.y = min_y().toFixed(4);
		$scope.temp_lite.w = (max_x()-$scope.temp_lite.x).toFixed(4);
		$scope.temp_lite.h = (max_y()-$scope.temp_lite.y).toFixed(4);
	}
	
	function lite_down( e ){
		p1( mouse_rel( e ) );
		console.log( 'lite_down' );
	}
	
	function lite_move( e ){
		if ( pressed ) {
			lite_pos( e );
			$scope.refresh();
		}
		console.log( 'lite_move' );
	}
	
	function lite_up( e ){
		point_clean();
		console.log( 'lite_up' );
	}
	
	function mouse_rel( e ){
		var pos = canvas.offset();
		var x = (e.pageX - pos.left);
		var y = (e.pageY - pos.top);
		return { 'x':x/$scope.canvas_w, 'y':y/$scope.canvas_h }
	}	
	
	
	
	// DRAGGER
	
	// Start the dragger
	
	function drag_start(){
		drag.draggable({
			containment:'parent',
			scroll:false,
			drag:function(){ dragging() },
			stop:function(){}
		});
	}
	
	// Move the canvas
	
	function canvas_move(){
		var pos = drag.position();
		var x =  pos.left/$scope.nav_scale();
		var y =  pos.top/$scope.nav_scale();
		$scope.canvas_x = x*-1*$scope.zoom;
		$scope.canvas_y = y*-1*$scope.zoom;
		$scope.refresh();
	}
	
	// What happens when dragger is moved
	
	function dragging(){
		$scope.canvas_w = orig.width*$scope.zoom;
		$scope.canvas_h = orig.height*$scope.zoom;
		canvas_move();
	}
	
	
	$scope.refresh = function(){
		$scope.$digest();
	}
	
}]);
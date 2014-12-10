// new/annotation/:urn

appControllers.controller( 'imgspect', ['$scope','$injector','$routeParams','json','annotation',
function( $scope, $injector, $routeParams, json, annotation ){
	
	
	
	// SELECTORS
	
	var frame = $( '.imgspect.frame' );
	var canvas = $( '.imgspect.frame .canvas' );
	var nav = $( '.imgspect.nav' );
	var drag = $( '.imgspect.nav .drag' );
	var img = $('.imgspect img')
	
	
	
	// CONFIGURATION
	
	// Current URN
	
	$scope.urn = ( $routeParams.urn == undefined ) ? null : $routeParams.urn;
	
	
	// Stores all the JSON data
	
	$scope.json = {};
	
	
	// Application state

	$scope.config = {
		lite: {
			color:'#FF00FF',
			opa:0.4
		}
	};	
	var orig = {};


	// Frame Size
	
	$scope.frame_w = function(){
		return frame.width();
	};
	$scope.frame_h = 325;
	
	
	// Canvas Size and position

	$scope.canvas_w = 900;
	$scope.canvas_h = 1100;
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
	
	$scope.nav_h = 325;
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
	
	function lite_start(){
		canvas.on('touchstart mousedown', function(e){
			lite_down( e );
		});
		canvas.on('touchmove mousemove', function(e){
			lite_move( e );
		});
		canvas.on('touchend mouseup', function(e){
			lite_up( e );
		});
		canvas.on('mouseout', function(e){
			lite_cancel();
		})
	}
	
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
	
	$scope.temp_lite = null;
	lite_cancel();
	
	function lite_down( e ){
		lite_cancel();
		p1( mouse_rel( e ) );
	}
	
	function min_x(){ return Math.min( p1().x, p2().x ) }
	
	function min_y(){ return Math.min( p1().y, p2().y ) }
	
	function max_x(){ return Math.max( p1().x, p2().x ) }
	
	function max_y(){ return Math.max( p1().y, p2().y ) }
	
	function lite_pos( e ){
		p2( mouse_rel( e ) );
		$scope.temp_lite.x = min_x().toFixed(4);
		$scope.temp_lite.y = min_y().toFixed(4);
		$scope.temp_lite.w = (max_x()-$scope.temp_lite.x).toFixed(4);
		$scope.temp_lite.h = (max_y()-$scope.temp_lite.y).toFixed(4);
		$scope.refresh();
	}
	
	function lite_move( e ){
		console.log( 'lite_move' );
		lite_pos( e );
	}
	
	function lite_up( e ){
		console.log( 'lite_up' );
		lite_pos( e );
		
		// Do something with that lite!
		
		lite_cancel();
	}
	
	function lite_cancel(){ 
		$scope.temp_lite = { x:null, y:null, w:null, h:null } 
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
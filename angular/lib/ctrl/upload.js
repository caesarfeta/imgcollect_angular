// new/upload

appControllers.controller( 'UploadNew', ['$scope','$injector','urnServ','json','stdout','user','$upload','config',
	function( $scope, $injector, urnServ, json, stdout, user, $upload, config ){
		$scope.title = "Upload New";
		$scope.stdout = "";
		$scope.form = {
			'rdf:label':'',
			'rdf:description':'',
			'this:src':''
		}
		$scope.type = 'upload';
		$injector.invoke( NewCtrl, this, { $scope: $scope } );
		$scope.change = function(key){ change(key) }
		
		
		// Once you have a fresh item URN
		
		var fresh_callback = function( urn ){
			$scope.urn = urn;
			touch();
			json.post( $scope.data_path( $scope.urn ), $scope.json ).then(
				function( data ){
					stdout.log( data );
				}
			);
		}
		
		
		function touch (){
			$scope.json['@id'] = $scope.urn;
			$scope.json['user']['@id'] = 'user:'+user.id();
			$scope.json['dateTime'] = ( new TimeStamp ).xsd();
		}
		
		
		// Update JSON when form changes
	
		function change( key ) {
			if ( key in $scope.json ) {
				$scope.json[key] = $scope.form[key];
				json_to_str( $scope.json );
			}
		}
	
	
		// Update the form with JSON data
	
		function form() {
			for ( var key in $scope.json ) {
				if ( key in $scope.form ) {
					$scope.form[key] = $scope.json[key];
				}
			}
		}
		
		
		// Turn JSON into pretty-printed string
	
		function json_to_str( data ) {
			var disp = json.disp( data );
			$scope.context = disp[0];
			$scope.json_string = disp[1];
		}
		
		
		// Save your new upload
		
		$scope.save = function(){
			
			// Retrieve a new upload URN
			
			urnServ.fresh( urnServ.base+"upload.{{ id }}", fresh_callback );
		}
		
			
		// Load the default JSON
		
		function default_json(){
			json.get( $scope.src ).then(
			function( data ){
				$scope.json = data;
				json_to_str( $scope.json );
				stdout.log( "Default JSON loaded from: "+$scope.src );
				$scope.ready = true;
			});
		}
		default_json();
		
		
		// Image Uploader
		
		$scope.file = '';
		$scope.upload_out = false;
		$scope.upload = function(){
		    $scope.upload = $upload.upload({
				url: config.imgup.url, 
				method: 'POST',
				file: $scope.file
		 	})
			.error( function( ){
				$scope.upload_out = "There was an error upload";
		 	})
			.then( function( data ){
				$scope.upload_out = "Uploaded successfully";
				exif_json( data );
				$scope.json[ 'this:src' ] = data.data.src;
				$scope.json[ 'this:orig' ] = data.data.orig;
				json_to_str( $scope.json );
		 	});
		}
		
		function exif_json( data ){
			var exif = data.data.exif;
			for ( var key in exif ) {
				$scope.json[ 'exif:'+key.toCamel() ] = exif[key];
			}
		}
		
		
		// Copy Image
	}
]);


// uploads

appControllers.controller( 'UploadListCtrl', ['$scope','$injector','$rootScope','user',
	function( $scope, $injector, $rootScope, user ){
		$scope.type = "upload";
		$scope.title = "Upload List";
		$scope.keys = [ 'urn','label','desc','user','time' ];
		
		// The fields you allow users to filter
		// are set with object keys in $scope.filter
		
		// See lib/list_ctr.js: filter()
		
		$scope.filter = {
			"rdf:label": null,
			"rdf:description": null
		}
		
		// Start once user event fires 
		
		$rootScope.$on( user.events.ok, function(){ $scope.apply_filter() });
		
		
		// Applying the filter is the same as initializing..
		
		$scope.apply_filter = function(){
			$injector.invoke( ListCtrl, this, { $scope: $scope } );
			$scope.init();
		}
		
		$scope.apply_filter();
	}
]);


// upload/:urn

appControllers.controller( 'UploadCtrl', ['$scope','$injector','resize','item',
	function( $scope, $injector, resize, item ){
		$scope.title = "Upload";
		$scope.form = {
			'rdf:label':"",
			'rdf:description':"",
			'this:keyword':[]
		};
		$injector.invoke( EditCtrl, this, { $scope: $scope } );
		$scope.init();
		
		// Resize
		
		$scope.resize = [];
		resize.get( $scope.urn ).then(
			function( data ){ $scope.resize = data }
		);
		
		// Items
		
		$scope.items = [];
		item.by_upload( $scope.urn ).then(
			function( data ){ $scope.items = data }
		);
		
	}
]);
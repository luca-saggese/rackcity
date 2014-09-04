define(function (require) 
{
	var proj4 = require('proj4');

	var scene;

	var all_features, small_roads, large_roads, buildings;
	var center_xy;

	function setup(sc)
	{
		scene = sc;
	}

	function init3D(data, center_pt) 
	{
		console.log("RackCity::init()");
		console.log(data);

		all_features = data;
		small_roads = data['small_roads'];
		large_roads = data['large_roads'];
		buildings = data['buildings'];

		//get center pt xy projection for normalizing other points
		center_xy = proj4('EPSG:4326', 'EPSG:3785', center_pt);

		//place sphere at center 
		var geometry = new THREE.SphereGeometry( 5, 32, 32 );
		var material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
		var sphere = new THREE.Mesh( geometry, material );
		scene.add( sphere );

		drawShit(small_roads, new THREE.LineBasicMaterial({
	        color: 0xffffff
	    }));

	    drawShit(large_roads, new THREE.LineBasicMaterial({
	        color: 0xffffff,
	        linewidth: 2
	    }));

	    drawBuildings(buildings, new THREE.LineBasicMaterial({
	        color: 0x000033
	    }));
	}

	function drawShit(container, material)
	{
		for(var i = 0; i < container.length; i++)
		{
			var geometry = new THREE.Geometry();
			var pts = container[i];

			for(var j = 0; j < pts.length; j++)
			{
				var latlng = [pts[j].lon, pts[j].lat];
				var pt_xy = proj4('EPSG:4326', 'EPSG:3785', latlng);  
				var vec3 = new THREE.Vector3(
		    		pt_xy[0] - center_xy[0], 
		    		0,
		    		pt_xy[1] - center_xy[1]
		    		
		    	);
			    geometry.vertices.push(vec3);
			}

			var line = new THREE.Line(geometry, material);
			scene.add(line);
		}
	}

	function drawBuildings(container, material)
	{
		var material = new THREE.PointCloudMaterial({
		  color: 0xFFFFFF,
		  size: 2
		  // map: THREE.ImageUtils.loadTexture(
		  //   "images/particle.png"
		  // ),
		  // blending: THREE.AdditiveBlending,
		  // transparent: true
		});

		for(var i = 0; i < container.length; i++)
		{
			var geometry = new THREE.Geometry();
			
			// find height or elevation
			var height = Math.round(container[i]['height']);
			if(height == null)
				height = Math.round(container[i]['ele']);
			if(height == null || height == NaN || height == undefined)
				height = 5;

			//figure out how many points in a floor
			var pts = container[i]['pts'];

			//iterate one per floor
			for(var h = 0; h < height; h++)
			{
				if(h % 2)
				{
					for(var j = 0; j < pts.length; j++)
					{
						var latlng = [pts[j].lon, pts[j].lat];
						var pt_xy = proj4('EPSG:4326', 'EPSG:3785', latlng);  

						var vec3 = new THREE.Vector3(
				    		pt_xy[0] - center_xy[0], 
				    		h * 5,
				    		pt_xy[1] - center_xy[1]	
				    	);					

					    geometry.vertices.push(vec3);
					}
				}
			}

			//draw top and bottom
			// drawBuildingOutline(pts);
			drawBuildingOutline(pts, height);

			var mesh = new THREE.PointCloud( geometry, material );

			// add it to the scene
			scene.add(mesh);
		}
	}

	function drawBuildingOutline(pts, height)
	{
		var geometry = new THREE.Geometry();

		for(var j = 0; j < pts.length; j++)
		{
			var latlng = [pts[j].lon, pts[j].lat];
			var pt_xy = proj4('EPSG:4326', 'EPSG:3785', latlng);  

			var vec3 = new THREE.Vector3(
	    		pt_xy[0] - center_xy[0], 
	    		height === undefined ? 0 : height * 5,
	    		pt_xy[1] - center_xy[1]	
	    	);					

		    geometry.vertices.push(vec3);
		}

		var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
	        color: 0xff0000
	    }));
		scene.add(line);
	}


	/**
	 * initAudio() 
	 * pass URL to start audioContext for managing visualization
	 **/
	function initAudio(url)
	{	
		console.log("RackCity::initAudio() " + url);

		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		var audioContext = new AudioContext();

		var source;
		var analyser;
		var buffer;
		var audioBuffer;

		source = audioContext.createBufferSource();
		analyser = audioContext.createAnalyser();
		analyser.smoothingTimeConstant = 0.3;
		analyser.fftSize = 1024;

		// Connect audio processing graph
		source.connect(analyser);
		analyser.connect(audioContext.destination);

		// Load asynchronously
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = "arraybuffer";

		
		
		// Create the audio graph.
		var filter = audioContext.createBiquadFilter();
		// Create and specify parameters for the low-pass filter.
		filter.type = 0; // Low-pass filter. See BiquadFilterNode docs
		filter.frequency.value = 110; // Set cutoff to 440 HZ
		filter.gain.value = -20;

				source.connect(filter);
				console.log(filter);
				filter.connect(audioContext.destination);
				

		var javascriptNode = audioContext.createScriptProcessor(4096, 1, 1);
        // connect to destination, else it isn't called
        // javascriptNode.connect(audioContext.destination);
        javascriptNode.onaudioprocess = function() {
 
	        // get the average, bincount is fftsize / 2
	        var array =  new Uint8Array(analyser.frequencyBinCount);
	        analyser.getByteFrequencyData(array);
	        var average = getAverageVolume(array)
	 
	        console.log(array);

	        // // clear the current state
	        // ctx.clearRect(0, 0, 60, 130);
	 
	        // // set the fill style
	        // ctx.fillStyle=gradient;
	 
	        // // create the meters
	        // ctx.fillRect(0,130-average,25,130);
	    }
	 
	    function getAverageVolume(array) {
	        var values = 0;
	        var average;
	 
	        var length = array.length;
	 
	        // get all the frequency amplitudes
	        for (var i = 0; i < length; i++) {
	            values += array[i];
	        }
	 
	        average = values / length;
	        return average;
	    }


		request.onload = function() {
			audioContext.decodeAudioData(request.response, function(buffer) {
				source.buffer = buffer;
				source.loop = true;
				// filter.connect(analyser);
				// analyser.connect(javascriptNode);
				// analyser.connect(audioContext.destination);
				source.start(0.0);
				// finishLoad();
			}, function(e) {
				console.log("error" + e);
			});


		};
		request.send();
	}

	// function finishLoad() {
	// 	source.buffer = audioBuffer;
	// 	source.loop = true;
	// 	source.start(0.0);
	// 	// startViz();
	// }

	function update() 
	{	

	}

	return {
		setup:setup,
		init3D:init3D,
		initAudio:initAudio,
		update:update
	};
});
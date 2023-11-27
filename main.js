import WindowManager from './WindowManager.js'



const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let cubes = [];
let links = []; // Stocker les références des lignes
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};
let sphereColors = []; 

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTime ()
{
	return (new Date().getTime() - today) / 1000.0;
}


if (new URLSearchParams(window.location.search).get("clear"))
{
	localStorage.clear();
}
else
{	
	// this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the url
	document.addEventListener("visibilitychange", () => 
	{
		if (document.visibilityState != 'hidden' && !initialized)
		{
			init();
		}
	});

	window.onload = () => {
		if (document.visibilityState != 'hidden')
		{
			init();
		}
	};
	

	function init ()
	{
		initialized = true;

		// add a short timeout because window.offsetX reports wrong values before a short period 
		setTimeout(() => {
			setupScene();
			// createParticleSystem();
			setupWindowManager();
			resize();
			updateWindowShape(false);
			render();
			window.addEventListener('resize', resize);
		}, 500)	
	}

	function setupScene ()
	{
		camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
		
		camera.position.z = 2.5;
		near = camera.position.z - .5;
		far = camera.position.z + 0.5;

		scene = new t.Scene();
		scene.background = new t.Color(0.0);
		scene.add( camera );

		var starGeometry = new THREE.Geometry();
		for (let i = 0; i < 5000; i++) {
			var star = new THREE.Vector3();
			star.x = Math.random() * 5000 - 2000;
			star.y = Math.random() * 5000 - 2000;
			star.z = Math.random() * 5000 - 2000;
			starGeometry.vertices.push(star);
			var color = new THREE.Color();
			if (Math.random() < 0.5) {
				color.setHSL(0.16, 0.5, Math.random() * 0.5 + 0.25);
			} else {
				color.setHSL(0.0, 0.0, Math.random() * 0.5 + 0.5);
			}
			starGeometry.colors.push(color);
		}
		
		var starMaterial = new THREE.PointsMaterial({
			size: 2,
			vertexColors: THREE.VertexColors
		});
		
		var starField = new THREE.Points(starGeometry, starMaterial);
		scene.add(starField);
	
		renderer = new t.WebGLRenderer({antialias: true, depthBuffer: true});
		renderer.setPixelRatio(pixR);
		
		world = new t.Object3D();
		scene.add(world);
	
		renderer.domElement.setAttribute("id", "scene");
		document.body.appendChild( renderer.domElement );

		// Lights
		var light = new THREE.AmbientLight( 0x404040 ); // soft white light
		scene.add( light );

		var directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
		directionalLight.position.set( 0, 128, 128 );
		scene.add( directionalLight );
		
	}

	function setupWindowManager ()
	{
		windowManager = new WindowManager();
		windowManager.setWinShapeChangeCallback(updateWindowShape);
		windowManager.setWinChangeCallback(windowsUpdated);

		// here you can add your custom metadata to each windows instance
		let metaData = {foo: "bar"};

		// this will init the windowmanager and add this window to the centralised pool of windows
		windowManager.init(metaData);

		// call update windows initially (it will later be called by the win change callback)
		windowsUpdated();
	}

	function windowsUpdated ()
	{
		updateNumberOfCubes();
	}

	function updateNumberOfCubes ()
	{
		let wins = windowManager.getWindows();

		cubes.forEach((c) => {
			world.remove(c);
		})

		cubes = [];

		for (let i = 0; i < wins.length; i++)
		{
			let win = wins[i];
			let hue = (i / wins.length) * 360;
			let c = new t.Color(`hsl(${hue}, 100%, 50%)`);
			
			sphereColors.push(c); // Stocker la couleur dans le tableau
			let s = 100 + i * 50;
			let radius = s / 2;

			let sphere = createComplexSphere(radius, c);
			sphere.position.x = win.shape.x + (win.shape.w * .5);
			sphere.position.y = win.shape.y + (win.shape.h * .5);
	
			world.add(sphere);
			cubes.push(sphere);

		}
		updateLinks(); // Créer ou mettre à jour les liaisons entre les cubes
	}

	function createComplexSphere(radius, color) {
		let innerSize = radius * 0.9; 
		let outerSize = radius;
		let innerColor = color;
		let outerColor = color;
	
		let complexSphere = new THREE.Group();
	
		let sphereWireframeInner = new THREE.Mesh(
			new THREE.IcosahedronGeometry(innerSize, 2),
			new THREE.MeshLambertMaterial({
				color: innerColor,
				wireframe: true,
				transparent: true,
				shininess: 0
			})
		);
		complexSphere.add(sphereWireframeInner);
	
		let sphereWireframeOuter = new THREE.Mesh(
			new THREE.IcosahedronGeometry(outerSize, 3),
			new THREE.MeshLambertMaterial({
				color: outerColor,
				wireframe: true,
				transparent: true,
				shininess: 0
			})
		);
		complexSphere.add(sphereWireframeOuter);
	
		// 创建内外玻璃球体
		let sphereGlassInner = new THREE.Mesh(
			new THREE.SphereGeometry(innerSize, 32, 32),
			new THREE.MeshPhongMaterial({
				color: innerColor,
				transparent: true,
				shininess: 25,
				opacity: 0.3
			})
		);
		complexSphere.add(sphereGlassInner);
	
		let sphereGlassOuter = new THREE.Mesh(
			new THREE.SphereGeometry(outerSize, 32, 32),
			new THREE.MeshPhongMaterial({
				color: outerColor,
				transparent: true,
				shininess: 25,
				opacity: 0.3
			})
		);
		complexSphere.add(sphereGlassOuter);
	
		// 创建粒子效果
		let particlesOuter = createParticles(outerSize, outerColor);
		complexSphere.add(particlesOuter);
	
		let particlesInner = createParticles(innerSize, innerColor);
		complexSphere.add(particlesInner);
	
		return complexSphere;
	}
	
	function createParticles(size, color) {
		let geometry = new THREE.Geometry();
		for (let i = 0; i < 10000; i++) {
			let x = -1 + Math.random() * 2;
			let y = -1 + Math.random() * 2;
			let z = -1 + Math.random() * 2;
			let d = 1 / Math.sqrt(x * x + y * y + z * z) ;
			x *= d/1.1 * size;
			y *= d/1.1 * size;
			z *= d/1.1 * size;
			geometry.vertices.push(new THREE.Vector3(x, y, z));
		}
		let material = new THREE.PointsMaterial({
			size: 0.1,
			color: color,
			transparent: true
		});
		return new THREE.Points(geometry, material);
	}
	

	function updateWindowShape (easing = true)
	{
		// storing the actual offset in a proxy that we update against in the render function
		sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};
		if (!easing) sceneOffset = sceneOffsetTarget;
	}


	function render ()
	{
		let t = getTime();

		windowManager.update();


		// calculate the new position based on the delta between current offset and new offset times a falloff value (to create the nice smoothing effect)
		let falloff = .05;
		sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
		sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);

		// set the world position to the offset
		world.position.x = sceneOffset.x;
		world.position.y = sceneOffset.y;

		let wins = windowManager.getWindows();


		// loop through all our cubes and update their positions based on current window positions
		for (let i = 0; i < cubes.length; i++)
		{
			let complexSphere = cubes[i]; 
			let win = wins[i];
			let _t = t; 

			let posTarget = {x: win.shape.x + (win.shape.w * .5), y: win.shape.y + (win.shape.h * .5)}
			
			complexSphere.position.x = complexSphere.position.x + (posTarget.x - complexSphere.position.x) * falloff;
        	complexSphere.position.y = complexSphere.position.y + (posTarget.y - complexSphere.position.y) * falloff;

        
			complexSphere.rotation.x = _t * .5; 
			complexSphere.rotation.y = _t * .3; 
			updateComplexSphere(complexSphere, t);
		};

		// updateParticles();
		updateLinks();
		renderer.render(scene, camera);
		requestAnimationFrame(render);
	}

	function updateComplexSphere(complexSphere, elapsedTime) {
		let sphereWireframeInner = complexSphere.children[0];
		let sphereWireframeOuter = complexSphere.children[1];
		let sphereGlassInner = complexSphere.children[2];
		let sphereGlassOuter = complexSphere.children[3];
		let particlesOuter = complexSphere.children[4];
		let particlesInner = complexSphere.children[5];
	
		sphereWireframeInner.rotation.x += 0.002;
		sphereWireframeInner.rotation.z += 0.002;
	  
		sphereWireframeOuter.rotation.x += 0.001;
		sphereWireframeOuter.rotation.z += 0.001;
	  
		sphereGlassInner.rotation.y += 0.005;
		sphereGlassInner.rotation.z += 0.005;
	
		sphereGlassOuter.rotation.y += 0.01;
		sphereGlassOuter.rotation.z += 0.01;
	
		particlesOuter.rotation.y += 0.0005;
		particlesInner.rotation.y -= 0.002;
	
		var innerShift = Math.abs(Math.cos(((elapsedTime + 2.5) / 20)));
		var outerShift = Math.abs(Math.cos(((elapsedTime + 5) / 10)));
	
		sphereWireframeOuter.material.color.setHSL(0, 1, outerShift);
		sphereGlassOuter.material.color.setHSL(0, 1, outerShift);
		particlesOuter.material.color.setHSL(0, 1, outerShift);
	
		sphereWireframeInner.material.color.setHSL(0.08, 1, innerShift);
		particlesInner.material.color.setHSL(0.08, 1, innerShift);
		sphereGlassInner.material.color.setHSL(0.08, 1, innerShift);
	
		sphereWireframeInner.material.opacity = Math.abs(Math.cos((elapsedTime + 0.5) / 0.9) * 0.5);
		sphereWireframeOuter.material.opacity = Math.abs(Math.cos(elapsedTime / 0.9) * 0.5);

	}
	function createComplexTube(pointA, pointB, color) {
		let tubeRadius = 30; // Rayon du tube
	
		let complexTube = new THREE.Group();
	
		let innerSize = tubeRadius * 0.9; 
		let outerSize = tubeRadius;
	
		let innerColor = color;
		let outerColor = color;
	
		let tubePath = new THREE.LineCurve3(pointA, pointB); // Chemin du tube entre les points A et B
	
		// Création des couches pour le tube
	
		let tubePath2 = new THREE.LineCurve3(pointA, pointB);
	let particlesOuter = createTubeParticlesAlongPath(tubePath2, 10, outerColor); // Augmenter le nombre de particules à 20
	complexTube.add(particlesOuter);

	let tubePath3 = new THREE.LineCurve3(pointA, pointB);
	let particlesInner = createTubeParticlesAlongPath(tubePath3, 10, innerColor); // Augmenter le nombre de particules à 20
	complexTube.add(particlesInner);


    	return complexTube;
	}

	function createTubeParticlesAlongPath(path, size, color) {
		let particlesGeometry = new THREE.Geometry();
		let particleCount = 2000; // Nombre de particules
		let segments = path.getPoints(particleCount);
	
		let material = new THREE.PointsMaterial({
			color: color,
			size: 0.2, // Taille des particules
			transparent: true,
			opacity: 0.5 // Opacité des particules
		});
	
		segments.forEach(segment => {
			let vertices = segment.clone();
			let direction = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
			vertices.add(direction.normalize().multiplyScalar(size * 0.5)); // Étendue des particules le long du chemin
	
			particlesGeometry.vertices.push(vertices);
		});
	
		return new THREE.Points(particlesGeometry, material);
	}
	
	function updateComplexTube(complexTube, elapsedTime, color) {
		let particlesOuter = complexTube.children[0];
		let particlesInner = complexTube.children[1];
	
		// Appliquer des transformations aux différentes couches du tube en fonction du temps
		// Vous pouvez utiliser la logique similaire à updateComplexSphere pour définir les couleurs et opacités en fonction du temps
	
		// Exemple de modification des couleurs des couches du tube en fonction du temps
		let innerShift = Math.abs(Math.cos(((elapsedTime + 2.5) / 20)));
		let outerShift = Math.abs(Math.cos(((elapsedTime + 5) / 10)));
	
		//tubeWireframeOuter.material.color.setHSL(0, 1, outerShift);
		//tubeGlassOuter.material.color.setHSL(0, 1, outerShift);
		particlesOuter.material.color.setHSL(0, 1, outerShift);
	
		//tubeWireframeInner.material.color.setHSL(0.08, 1, innerShift);
		particlesInner.material.color.setHSL(0.08, 1, innerShift);
		//tubeGlassInner.material.color.setHSL(0.08, 1, innerShift);
	
		//tubeWireframeInner.material.opacity = Math.abs(Math.cos((elapsedTime + 0.5) / 0.9) * 0.5);
		//tubeWireframeOuter.material.opacity = Math.abs(Math.cos(elapsedTime / 0.9) * 0.5);
	}

	function updateLinks() {
		links.forEach((tube) => {
			world.remove(tube);
		});
		links = [];
	
		for (let i = 0; i < cubes.length; i++) {
			let cubeA = cubes[i];
	
			for (let j = i + 1; j < cubes.length; j++) {
				let cubeB = cubes[j];
	
				let colorA = sphereColors[i]; // Récupérer la couleur associée au cubeA
				let colorB = sphereColors[j]; // Récupérer la couleur associée au cubeB
	
				let tubeColor = new THREE.Color();
				tubeColor.copy(colorA); // Utiliser la couleur de cubeA pour le tube
	
				let tube = createComplexTube(cubeA.position.clone(), cubeB.position.clone(), tubeColor);
	
				world.add(tube);
				links.push(tube);
	
				// Mettre à jour les couleurs et opacités du tube
				updateComplexTube(tube, getTime(), tubeColor);
			}
		}
	}
	
	
	
	// resize the renderer to fit the window size
	function resize ()
	{
		let width = window.innerWidth;
		let height = window.innerHeight
		
		camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
	}
}
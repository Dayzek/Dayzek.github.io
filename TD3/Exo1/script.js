let scene, camera, renderer, earth, controls;
const earthRadius = 5;
const markers = [];
const earthGroup = new THREE.Group();
let map;
let leafletMarkers = [];
let raycaster, mouse; 



function latLonToCartesian(lat, lon, radius = earthRadius) {
    
    const phi = (90 - lat) * (Math.PI / 180); 
    const theta = (lon + 180) * (Math.PI / 180); 

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return { x, y, z };
}


function init() {
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);

    
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 15;


    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 30;

    
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 5, 5);
    scene.add(directionalLight);

    
    const pointLight = new THREE.PointLight(0x404040, 0.5);
    pointLight.position.set(-10, -5, -5);
    scene.add(pointLight);

    
    scene.add(earthGroup);

    
    createEarth();

    
    createStars();


    window.addEventListener('resize', onWindowResize, false);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    renderer.domElement.addEventListener('click', onCanvasClick, false);


    getUserLocation();


    fetchCountries();

    initLeafletMap();


    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 1000);
}


function createEarth() {
    const geometry = new THREE.SphereGeometry(earthRadius, 64, 64);

    
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
        () => {
            console.log('Texture de la Terre chargée');
        }
    );

    const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 10
    });

    earth = new THREE.Mesh(geometry, material);

    
    earthGroup.add(earth);
}


function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1
    });

    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position',
        new THREE.Float32BufferAttribute(starsVertices, 3));

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}


function createMarker(lat, lon, color = 0xff0000, scale = 1, textureUrl = null, label = '') {
    const position = latLonToCartesian(lat, lon, earthRadius + 0.1);

    let marker;
    const geometry = new THREE.BoxGeometry(0.1 * scale, 0.1 * scale, 0.1 * scale);

    if (textureUrl) {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(textureUrl);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        marker = new THREE.Mesh(geometry, material);
    } else {
        const material = new THREE.MeshBasicMaterial({ color: color });
        marker = new THREE.Mesh(geometry, material);
    }

    marker.position.set(position.x, position.y, position.z);
    marker.userData = { lat: lat, lon: lon, label: label };

    earthGroup.add(marker);
    markers.push(marker);

    if (label) {
        console.log(`Marqueur créé pour ${label} à (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
    }

    return marker;
}


function getUserLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                console.log(`Position utilisateur: ${lat}, ${lon}`);

                
                createMarker(lat, lon, 0xff0000, 2, null, 'Vous');

                document.getElementById('user-location').innerHTML =
                    `Votre position:<br>Lat: ${lat.toFixed(4)}°<br>Lon: ${lon.toFixed(4)}°`;
            },
            (error) => {
                console.error('Erreur de géolocalisation:', error);
                document.getElementById('user-location').innerHTML =
                    'Géolocalisation non disponible';

                
                createMarker(48.8566, 2.3522, 0xff0000, 2, null, 'Paris (défaut)');
            }
        );
    } else {
        document.getElementById('user-location').innerHTML =
            'Géolocalisation non supportée';
        
        createMarker(48.8566, 2.3522, 0xff0000, 2, null, 'Paris (défaut)');
    }
}


async function fetchCountries() {
    try {

        const countryCodes = [
            'FR', 'US', 'JP', 'BR', 'AU', 'EG', 'IN', 'CA', 'ZA', 'RU', 'AR', 'GB',
            'CN', 'DE', 'IT', 'ES', 'MX', 'ID', 'NG', 'PK', 'BD', 'TR', 'IR', 'TH',
            'VN', 'PH', 'ET', 'CD', 'TZ', 'KE', 'UG', 'SD', 'DZ', 'MA', 'SA', 'IQ',
            'AF', 'PL', 'MY', 'PE', 'VE', 'NP', 'GH', 'YE', 'MZ', 'AO', 'MG', 'CM',
            'CI', 'NE', 'BF', 'ML', 'MW', 'ZM', 'SN', 'SO', 'TD', 'GN', 'RW', 'BJ',
            'TN', 'BI', 'SS', 'ER', 'LY', 'SL', 'TG', 'LR', 'MR', 'CF', 'GA', 'BW',
            'GM', 'GW', 'GQ', 'MU', 'SZ', 'DJ', 'RE', 'KM', 'CV', 'ST', 'SC', 'NL',
            'BE', 'GR', 'PT', 'CZ', 'HU', 'SE', 'AT', 'CH', 'DK', 'FI', 'NO', 'IE',
            'NZ', 'SG', 'CL', 'CO', 'EC', 'BO', 'PY', 'UY', 'CR', 'PA', 'CU', 'DO',
            'GT', 'HN', 'SV', 'NI', 'JM', 'TT', 'BS', 'BZ', 'BB', 'GY', 'SR', 'HT',
            'KR', 'TW', 'KH', 'LA', 'MM', 'KP', 'MN', 'BT', 'LK', 'JO', 'LB', 'IL',
            'PS', 'KW', 'OM', 'QA', 'BH', 'AE', 'AM', 'AZ', 'GE', 'KZ', 'UZ', 'TM',
            'KG', 'TJ', 'BY', 'UA', 'MD', 'RO', 'BG', 'RS', 'HR', 'SI', 'BA', 'MK',
            'AL', 'ME', 'LT', 'LV', 'EE', 'SK', 'IS', 'LU', 'MT', 'CY', 'FJ', 'PG',
            'SB', 'VU', 'NC', 'PF', 'WS', 'KI', 'TO', 'FM', 'PW', 'MH', 'NR', 'TV'
        ];

        for (const code of countryCodes) {
            const response = await fetch(`https://restcountries.com/v3.1/alpha/${code}`);
            const data = await response.json();

            if (data && data[0]) {
                const country = data[0];
                const lat = country.latlng[0];
                const lon = country.latlng[1];
                const flag = country.flags.png;
                const name = country.name.common;

                console.log(`Pays: ${name}, Lat: ${lat}, Lon: ${lon}`);


                createMarker(lat, lon, 0x00ff00, 1.5, flag, name);

                // Ajouter le marqueur sur la carte Leaflet
                if (map) {
                    const leafletMarker = L.circleMarker([lat, lon], {
                        radius: 3,
                        fillColor: "#00ff00",
                        color: "#000",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).addTo(map);
                    leafletMarker.bindPopup(name);
                    leafletMarker.on('click', function() {
                        rotateEarthTo(lat, lon);
                    });
                    leafletMarkers.push(leafletMarker);
                }
            }


            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('Tous les pays ont été chargés');
    } catch (error) {
        console.error('Erreur lors du chargement des pays:', error);
    }
}


function initLeafletMap() {
    map = L.map('map-container').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    map.on('click', onMapClick);
}

function onMapClick(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    console.log(`Clic sur la carte: ${lat}, ${lon}`);

    rotateEarthTo(lat, lon);

    L.marker([lat, lon]).addTo(map)
        .bindPopup(`Position: ${lat.toFixed(2)}, ${lon.toFixed(2)}`)
        .openPopup();
}

function rotateEarthTo(lat, lon) {
    console.log(`Recentrage sur lat: ${lat.toFixed(2)}, lon: ${lon.toFixed(2)}`);

    const localPosition = latLonToCartesian(lat, lon, earthRadius);

    const tempObject = new THREE.Object3D();
    tempObject.position.set(localPosition.x, localPosition.y, localPosition.z);
    earthGroup.add(tempObject);

    const worldPosition = new THREE.Vector3();
    tempObject.getWorldPosition(worldPosition);

    earthGroup.remove(tempObject);

    worldPosition.normalize();

    const cameraDistance = 15;
    const newCameraPosition = worldPosition.multiplyScalar(cameraDistance);

    camera.position.set(newCameraPosition.x, newCameraPosition.y, newCameraPosition.z);
    camera.lookAt(0, 0, 0);

    controls.target.set(0, 0, 0);
    controls.update();

    console.log(`Caméra repositionnée: x=${camera.position.x.toFixed(2)}, y=${camera.position.y.toFixed(2)}, z=${camera.position.z.toFixed(2)}`);
}

function onCanvasClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(markers);

    if (intersects.length > 0) {
        const clickedMarker = intersects[0].object;
        const userData = clickedMarker.userData;

        if (userData && userData.lat !== undefined && userData.lon !== undefined) {
            console.log(`Clic sur ${userData.label}: ${userData.lat}, ${userData.lon}`);

            map.setView([userData.lat, userData.lon], 6);

            L.marker([userData.lat, userData.lon]).addTo(map)
                .bindPopup(userData.label || 'Marqueur')
                .openPopup();
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (map) {
        map.invalidateSize();
    }
}


function animate() {
    requestAnimationFrame(animate);


    earthGroup.rotation.y += 0.001;


    controls.update();

    renderer.render(scene, camera);
}


init();
animate();

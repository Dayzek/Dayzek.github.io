// Variables globales
let scene, camera, renderer;
let userLat = null;
let userLon = null;
let userAlt = 0;
let deviceAlpha = 0; // Rotation autour de Z (compass)
let deviceBeta = 0;  // Rotation autour de X (tilt avant/arrière)
let deviceGamma = 0; // Rotation autour de Y (tilt gauche/droite)

// Objets géolocalisés (exemples)
const geoObjects = [
    { name: "Tour Eiffel", lat: 48.8584, lon: 2.2945, alt: 300 },
    { name: "Arc de Triomphe", lat: 48.8738, lon: 2.2950, alt: 50 },
    { name: "Sacré-Cœur", lat: 48.8867, lon: 2.3431, alt: 130 },
    { name: "Notre-Dame", lat: 48.8530, lon: 2.3499, alt: 90 }
];

const markers = [];

// Initialisation
async function init() {
    updateStatus("Démarrage de l'application...");

    // Initialiser la caméra vidéo
    await initCamera();

    // Initialiser Three.js
    initThreeJS();

    // Récupérer la géolocalisation
    getGeolocation();

    // Récupérer l'orientation du device
    initOrientation();

    // Lancer l'animation
    animate();
}

// Initialiser le flux de la caméra
async function initCamera() {
    try {
        updateStatus("Demande d'accès à la caméra...");

        const video = document.getElementById('camera');

        const constraints = {
            video: {
                facingMode: 'environment', // Caméra arrière
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        updateStatus("Caméra activée ✓");
    } catch (error) {
        console.error("Erreur d'accès à la caméra:", error);
        updateStatus("Erreur: Impossible d'accéder à la caméra");
    }
}

// Initialiser Three.js
function initThreeJS() {
    const canvas = document.getElementById('canvas');

    // Scène
    scene = new THREE.Scene();

    // Caméra perspective
    camera = new THREE.PerspectiveCamera(
        75, // FOV
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );
    camera.position.set(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Fond transparent

    // Gestion du redimensionnement
    window.addEventListener('resize', onWindowResize, false);

    updateStatus("Three.js initialisé ✓");
}

// Récupérer la géolocalisation
function getGeolocation() {
    if ("geolocation" in navigator) {
        updateStatus("Récupération de la position GPS...");

        navigator.geolocation.watchPosition(
            (position) => {
                userLat = position.coords.latitude;
                userLon = position.coords.longitude;
                userAlt = position.coords.altitude || 0;

                document.getElementById('location').textContent =
                    `Localisation: ${userLat.toFixed(6)}, ${userLon.toFixed(6)}`;

                // Créer les marqueurs 3D une seule fois
                if (markers.length === 0) {
                    createGeoMarkers();
                }

                // Mettre à jour les positions des marqueurs
                updateMarkerPositions();

                updateStatus("Position GPS obtenue ✓");
            },
            (error) => {
                console.error("Erreur de géolocalisation:", error);
                updateStatus("Erreur: GPS non disponible");

                // Position par défaut (Paris)
                userLat = 48.8566;
                userLon = 2.3522;
                userAlt = 35;

                if (markers.length === 0) {
                    createGeoMarkers();
                }
                updateMarkerPositions();
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    } else {
        updateStatus("Géolocalisation non supportée");
    }
}

// Initialiser l'orientation du device
function initOrientation() {
    // Pour iOS 13+, il faut demander la permission
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {

        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation, true);
                    updateStatus("Orientation device activée ✓");
                } else {
                    updateStatus("Permission orientation refusée");
                }
            })
            .catch(console.error);
    } else {
        // Pour Android et navigateurs desktop
        window.addEventListener('deviceorientation', handleOrientation, true);
        updateStatus("Écoute de l'orientation ✓");
    }
}

// Gérer les événements d'orientation
function handleOrientation(event) {
    deviceAlpha = event.alpha || 0; // Compass (0-360)
    deviceBeta = event.beta || 0;   // Tilt avant/arrière (-180 à 180)
    deviceGamma = event.gamma || 0; // Tilt gauche/droite (-90 à 90)

    document.getElementById('orientation').textContent =
        `Orientation: β=${deviceBeta.toFixed(0)}° γ=${deviceGamma.toFixed(0)}°`;

    document.getElementById('heading').textContent =
        `Direction: ${deviceAlpha.toFixed(0)}°`;

    updateCameraOrientation();
}

// Mettre à jour l'orientation de la caméra Three.js
function updateCameraOrientation() {
    if (!camera) return;

    // Convertir les angles du device en radians
    const alphaRad = THREE.MathUtils.degToRad(deviceAlpha);
    const betaRad = THREE.MathUtils.degToRad(deviceBeta);
    const gammaRad = THREE.MathUtils.degToRad(deviceGamma);

    // Appliquer les rotations à la caméra
    camera.rotation.set(
        betaRad,
        alphaRad,
        -gammaRad,
        'YXZ'
    );
}

// Créer les marqueurs 3D géolocalisés
function createGeoMarkers() {
    geoObjects.forEach(obj => {
        // Créer un marqueur 3D simple (cube + texte)
        const geometry = new THREE.BoxGeometry(20, 20, 20);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true
        });
        const marker = new THREE.Mesh(geometry, material);

        // Stocker les infos de géolocalisation
        marker.userData = {
            name: obj.name,
            lat: obj.lat,
            lon: obj.lon,
            alt: obj.alt
        };

        scene.add(marker);
        markers.push(marker);

        console.log(`Marqueur créé: ${obj.name}`);
    });
}

// Calculer la distance entre deux points GPS (en mètres)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Calculer le bearing (direction) entre deux points GPS
function calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return (θ * 180 / Math.PI + 360) % 360;
}

// Mettre à jour les positions des marqueurs
function updateMarkerPositions() {
    if (userLat === null || userLon === null) return;

    markers.forEach(marker => {
        const data = marker.userData;

        // Calculer la distance et le bearing
        const distance = calculateDistance(userLat, userLon, data.lat, data.lon);
        const bearing = calculateBearing(userLat, userLon, data.lat, data.lon);

        // Convertir bearing en radians
        const bearingRad = bearing * Math.PI / 180;

        // Position relative (échelle réduite pour affichage)
        const scale = 0.1; // 1 mètre réel = 0.1 unité 3D
        const x = Math.sin(bearingRad) * distance * scale;
        const z = -Math.cos(bearingRad) * distance * scale;
        const y = (data.alt - userAlt) * scale;

        marker.position.set(x, y, z);

        // Faire tourner le cube
        marker.rotation.x += 0.01;
        marker.rotation.y += 0.01;
    });
}

// Gestion du redimensionnement
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Boucle d'animation
function animate() {
    requestAnimationFrame(animate);

    // Mettre à jour les positions des marqueurs
    updateMarkerPositions();

    // Rendu de la scène
    renderer.render(scene, camera);
}

// Mettre à jour le statut
function updateStatus(message) {
    document.getElementById('status').textContent = `Status: ${message}`;
    console.log(message);
}

// Démarrer l'application
init();

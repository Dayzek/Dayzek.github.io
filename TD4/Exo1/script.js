// Initialisation de la carte Leaflet
const map = L.map('map').setView([43.7102, 7.2620], 13); // Nice, France

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
}).addTo(map);

// Variables pour la détection des gestes
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const gestureStatus = document.getElementById('gesture-status');

let currentGesture = 'none';
let isPinching = false;
let lastPinchCenter = null;
let zoomCooldown = false;

// Configuration de MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// Configuration de la caméra
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

camera.start();

// Fonction pour calculer la distance entre deux points
function calculateDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Fonction pour détecter si la main est ouverte
function isHandOpen(landmarks) {
    // Vérifier si tous les doigts sont étendus en calculant les distances
    const fingerTips = [8, 12, 16, 20]; // Index, majeur, annulaire, auriculaire
    const fingerMCPs = [5, 9, 13, 17]; // Articulations de base des doigts
    const wrist = landmarks[0];

    let extendedFingers = 0;

    // Pour chaque doigt, vérifier si le bout est plus loin du poignet que l'articulation de base
    for (let i = 0; i < fingerTips.length; i++) {
        const tipDistance = calculateDistance(landmarks[fingerTips[i]], wrist);
        const mcpDistance = calculateDistance(landmarks[fingerMCPs[i]], wrist);

        // Si le bout du doigt est plus loin du poignet que l'articulation, le doigt est étendu
        if (tipDistance > mcpDistance * 1.2) {
            extendedFingers++;
        }
    }

    // Pouce - vérifier si écarté de la paume
    const thumbTip = landmarks[4];
    const indexMCP = landmarks[5];
    const thumbDistance = calculateDistance(thumbTip, indexMCP);

    if (thumbDistance > 0.1) {
        extendedFingers++;
    }

    console.log('Doigts étendus:', extendedFingers); // Debug
    return extendedFingers >= 4;
}

// Fonction pour détecter si la main est fermée (poing)
function isHandClosed(landmarks) {
    const fingerTips = [8, 12, 16, 20];
    const palm = landmarks[0];

    let closedFingers = 0;

    for (let i = 0; i < fingerTips.length; i++) {
        const tip = landmarks[fingerTips[i]];
        const distance = calculateDistance(tip, palm);

        // Si le bout du doigt est proche de la paume
        if (distance < 0.15) {
            closedFingers++;
        }
    }

    return closedFingers >= 3;
}

// Fonction pour détecter le pincement (pouce et index)
function isPinchGesture(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    const thumbIndexDistance = calculateDistance(thumbTip, indexTip);

    console.log('Distance pouce-index:', thumbIndexDistance.toFixed(3)); // Debug

    // Pincement simple = pouce et index proches
    return thumbIndexDistance < 0.1;
}

// Fonction pour obtenir le centre du pincement
function getPinchCenter(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    return {
        x: (thumbTip.x + indexTip.x) / 2,
        y: (thumbTip.y + indexTip.y) / 2
    };
}

// Traitement des résultats de MediaPipe
function onResults(results) {
    // Dessiner sur le canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Dessiner les points de la main
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });

        // Détecter le geste
        detectGesture(landmarks);
    } else {
        currentGesture = 'none';
        gestureStatus.textContent = 'Aucune main détectée';
        gestureStatus.className = '';
        isPinching = false;
        lastPinchCenter = null;
    }

    canvasCtx.restore();
}

// Fonction de détection de geste
function detectGesture(landmarks) {
    const pinching = isPinchGesture(landmarks);
    const open = isHandOpen(landmarks);
    const closed = isHandClosed(landmarks);

    console.log('Gestes - Pincement:', pinching, 'Ouvert:', open, 'Fermé:', closed); // Debug

    // Priorité au pincement pour éviter les conflits
    if (pinching && !open) {
        currentGesture = 'pinch';
        gestureStatus.textContent = 'Déplacement actif';
        gestureStatus.className = 'active';

        const pinchCenter = getPinchCenter(landmarks);

        if (isPinching && lastPinchCenter) {
            // Calculer le déplacement (inversé pour un comportement naturel)
            const deltaX = (pinchCenter.x - lastPinchCenter.x) * 1000;
            const deltaY = (pinchCenter.y - lastPinchCenter.y) * 1000;

            // Déplacer la carte (mouvements inversés comme sur une vraie carte)
            const currentCenter = map.getCenter();
            const newLat = currentCenter.lat + deltaY * 0.001; // Inversé : main descend = carte monte
            const newLng = currentCenter.lng + deltaX * 0.001; // Inversé : main va à droite = carte va à droite

            map.panTo([newLat, newLng], { animate: false });
        }

        isPinching = true;
        lastPinchCenter = pinchCenter;
    } else if (open && !closed && !pinching) {
        currentGesture = 'open';
        gestureStatus.textContent = 'Main ouverte - Dézoom';
        gestureStatus.className = 'active';

        if (!zoomCooldown) {
            const currentZoom = map.getZoom();
            map.setZoom(currentZoom - 1);
            zoomCooldown = true;
            setTimeout(() => { zoomCooldown = false; }, 500);
        }

        isPinching = false;
        lastPinchCenter = null;
    } else if (closed && !open && !pinching) {
        currentGesture = 'closed';
        gestureStatus.textContent = 'Main fermée - Zoom';
        gestureStatus.className = 'active';

        if (!zoomCooldown) {
            const currentZoom = map.getZoom();
            map.setZoom(currentZoom + 1);
            zoomCooldown = true;
            setTimeout(() => { zoomCooldown = false; }, 500);
        }

        isPinching = false;
        lastPinchCenter = null;
    } else {
        currentGesture = 'none';
        gestureStatus.textContent = 'En attente...';
        gestureStatus.className = '';
        isPinching = false;
        lastPinchCenter = null;
    }
}

// Ajuster la taille du canvas
function resizeCanvas() {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
}

videoElement.addEventListener('loadedmetadata', resizeCanvas);

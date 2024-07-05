import * as THREE from 'three';


const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-window.innerWidth/2, window.innerWidth/2, window.innerHeight/2, -window.innerHeight/2, 0, 5000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a grid helper
const gridHelper = new THREE.GridHelper(2500, 125, 0x888888, 0x444444); // size, divisions, color1, color2
scene.add(gridHelper);

// Create a simple player representation (e.g., spheres)
const players_server_positions = {};
const players = {};
var local_player = {id: null, position: {x: 0, y: 0}};
var local_player_position_cache = {x: 0, y: 0};

function createPlayer(playerId, position) {
    const geometry = new THREE.SphereGeometry(20, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x9d3e3a });
    const player = new THREE.Mesh(geometry, material);
    player.position.set(position.x, 0 ,position.y);
    players_server_positions[playerId] = {x: position.x, y: position.y};
    scene.add(player);
    players[playerId] = player;
}

function updatePlayerPosition(playerId) {
    if (players[playerId]) {
        players[playerId].position.lerp(
            new THREE.Vector3(players_server_positions[playerId].x, 0, players_server_positions[playerId].y)
            , 0.1
        );
    }
}

// Set up the camera position
camera.position.set(1000, 1000, 1000);
camera.lookAt(0, 0, 0);

// Variables to store mouse position and target world position
let mouse = new THREE.Vector2();
let target = new THREE.Vector3();

// Event listener for mouse movement
window.addEventListener('mousemove', onMouseMove, false);

function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Use raycaster to convert mouse position to world coordinates
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(gridHelper);

    if (intersects.length > 0) {
        target.copy(intersects[0].point);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Move player towards target position
    const speed = 0.1; // Adjust speed as needed
    if (local_player.id) {
        players[local_player.id].position.lerp(target, speed);
        local_player.position.x = target.x;
        local_player.position.y = target.z;
    }

    // Update other players positions
    Object.keys(players_server_positions).forEach(playerId => {
        if (local_player.id && playerId !== local_player.id) {
            updatePlayerPosition(playerId);
        }
    });
    

    renderer.render(scene, camera);
}
animate();

// Establish WebSocket connection
const socket = new WebSocket('ws://luckbox-backend-40fc66018788.herokuapp.com');

socket.onopen = (event) => {
    console.log('Connected to the server');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'positions') {
        // delete players that are not in the new positions list
        Object.keys(players).forEach(playerId => {
            if (!data.positions[playerId]) {
                scene.remove(players[playerId]);
                delete players[playerId];
                // remove from players_server_positions
                delete players_server_positions[playerId];
            }
        });
        Object.keys(data.positions).forEach(playerId => {
            if (playerId === local_player.id) {
                return;
            }
            if (players_server_positions[playerId]) {
                players_server_positions[playerId].x = data.positions[playerId].x;
                players_server_positions[playerId].y = data.positions[playerId].y;
            } else {
                createPlayer(playerId, data.positions[playerId]);
            }
        });
    }
    if (data.type === 'identification') {
        console.log('Identification:', data.id)
        local_player.id = data.id; 
        local_player.position = data.position;
        createPlayer(data.id, data.position);

    }
};

setInterval(() => {
    if (local_player_position_cache.x == local_player.position.x && local_player_position_cache.y == local_player.position.y) {
        return;
    }
    const data = JSON.stringify({ type: 'position-update', position: local_player.position});
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);  
        console.log('sent', data);
    }
    local_player_position_cache.x = local_player.position.x;
    local_player_position_cache.y = local_player.position.y
}, 10);

socket.onclose = () => {
    console.log('Disconnected from the server');
};


// Handle window resize
window.addEventListener('resize', () => {
    camera.left = -window.innerWidth/2;
    camera.right = window.innerWidth/2;
    camera.top = window.innerHeight/2;
    camera.bottom = -window.innerHeight/2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
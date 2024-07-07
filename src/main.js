import * as THREE from 'three';
import { WS_URL } from '../config';
import displacementMapImage from './dunes_height.png';
import normalMapImage from './dunes_normals.png';
import { color } from 'three/examples/jsm/nodes/Nodes.js';


const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-window.innerWidth/2, window.innerWidth/2, window.innerHeight/2, -window.innerHeight/2, 0, 5000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Set up the camera position
camera.position.set(1000, 0, 1000);
camera.lookAt(0, 0, 0);
// rotate camera 90 degrees on the look axis
camera.rotation.z = Math.PI / 2;


// Load displacement and normal map textures
const displacementMap = new THREE.TextureLoader().load(displacementMapImage);
const normalMap = new THREE.TextureLoader().load(normalMapImage);

// Shader material for the dunes
const material = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 1.0 },
        displacementMap: { value: displacementMap },
        normalMap: { value: normalMap },
        color: { value: new THREE.Vector3(1, 1, 1) },
        lightDirection: { value: new THREE.Vector3(0.5, -0.5, 0.4) },
        skyColor: { value: new THREE.Vector3(134/255, 89/255, 66/255) }
    },
    vertexShader: `
        uniform float time;
        uniform sampler2D displacementMap;
        uniform sampler2D normalMap;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
            vUv = texture2D(normalMap, uv).rg;
            vNormal = texture2D(normalMap, uv).rgb;
            vec3 newPosition = position + normal * texture2D(displacementMap, uv).r * 120.0;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        uniform vec3 color;
        uniform vec3 lightDirection;
        uniform vec3 skyColor;

        void main() {
            // vec3 normal = normalize(vec3(vUv - 0.5, 1.0));
            vec3 normal = normalize(vNormal);
            vec3 nDirection = normalize(lightDirection);
            float light = dot(normal, nDirection);
            vec3 color = mix(vec3(0.0, 0.0, 0.0), color, light);
            // color = mix(color, skyColor, 1.0 - light);
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    wireframe: false
});

// turn rgb(207, 161, 110) into a vector3

material.uniforms.color.value = new THREE.Vector3(207/255, 161/255, 110/255);

// material.uniforms.lightDirection.value = new THREE.Vector3(1, 0.5, 0.5);
// material.uniforms.lightDirection.value = new THREE.Vector3(1, 1, 1);

// Shader material for the player
const playerMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 1.0 },
        displacementMap: { value: displacementMap },
        color: { value: new THREE.Vector3(1.0, 0, 0) },
        lightDirection: { value: new THREE.Vector3(1, -1, 0.5) },
    },
    vertexShader: `
        uniform float time;
        uniform sampler2D displacementMap;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
            vUv = uv;
            vNormal = normal;
            vec4 referencePosition = instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0);
            referencePosition.x += 500.0;
            referencePosition.y += 500.0;
            float displacement = texture2D(displacementMap, referencePosition.xy / 1000.0).r * 120.0;
            vec3 newPosition = position;
            newPosition.z += displacement;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(newPosition, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        uniform vec3 color;
        uniform vec3 lightDirection;


        void main() {
            vec3 normal = normalize(vNormal);
            float light = dot(normal, lightDirection);
            vec3 color = mix(vec3(0.0, 0.0, 0.0), color, light + 0.5);
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    wireframe: false
});


// Create a plane geometry for the dunes
const dunesGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100); // width, height, widthSegments, heightSegments
const dunes = new THREE.Mesh(dunesGeometry, material);
scene.add(dunes);

// Create a simple player representation (e.g., spheres)
const players_server_positions = {};
const players = {};
var local_player = {id: null, position: {x: 0, y: 0}};
var local_player_position_cache = {x: 0, y: 0};

const playerGeometry = new THREE.SphereGeometry(20, 10, 10);
const instancedGeometry = new THREE.InstancedBufferGeometry().copy(playerGeometry);

const playerMesh = new THREE.InstancedMesh(instancedGeometry, playerMaterial, 300);
playerMesh.count = 0;
scene.add(playerMesh);

// Function to add a player
function addPlayer(playerId, position) {
    console.log('Adding player:', playerId, position);
    players_server_positions[playerId] = {x: position.x, y: position.y};
    players[playerId] = {x: position.x, y: position.y};
    updatePlayerAttributes();
}

// Function to remove a player
function removePlayer(playerId) {
    console.log('Removing player:', playerId);
    delete players_server_positions[playerId];
    delete players[playerId];
    updatePlayerAttributes();
}

// Function to update the custom position attribute
function updatePlayerAttributes() {
    Object.keys(players).forEach((playerId, index) => {
        if (index >= playerMesh.count) {
            playerMesh.count++;
        }
        const matrix = new THREE.Matrix4();
        matrix.makeTranslation(
            players[playerId].x,
            players[playerId].y,
            20
        );
        playerMesh.setMatrixAt(index, matrix);
    });
    playerMesh.instanceMatrix.needsUpdate = true;
}

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
    const intersects = raycaster.intersectObject(dunes);

    if (intersects.length > 0) {
        target.copy(intersects[0].point);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    // console.log(players_server_positions)


    // Update the displacement shader time
    material.uniforms.time.value += 0.01;
    // material.uniforms.lightDirection.value = new THREE.Vector3(Math.sin(material.uniforms.time.value), Math.cos(material.uniforms.time.value), 0.5);
    // console.log(material.uniforms.lightDirection.value);    
    playerMaterial.uniforms.time.value += 0.01;



    // Update other players positions
    Object.keys(players_server_positions).forEach(playerId => {
        if (local_player.id !== playerId && players[playerId] && players_server_positions[playerId]) {
            players[playerId].x = players_server_positions[playerId].x;
            players[playerId].y = players_server_positions[playerId].y;
        }

        if (local_player.id === playerId) {
            const speed = 2;
            let direction = new THREE.Vector2(
                target.x - local_player.position.x,
                target.y - local_player.position.y
            );
            if (direction.length() < speed) {
                local_player.position.x = target.x;
                local_player.position.y = target.y;
            }
            direction.normalize();  
            local_player.position.x += direction.x * speed;
            local_player.position.y += direction.y * speed;

            players[playerId].x = local_player.position.x;
            players[playerId].y = local_player.position.y;
        }
    });

    updatePlayerAttributes();
    

    renderer.render(scene, camera);
}
animate();



// Handle window resize
window.addEventListener('resize', () => {
    camera.left = -window.innerWidth/2;
    camera.right = window.innerWidth/2;
    camera.top = window.innerHeight/2;
    camera.bottom = -window.innerHeight/2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ##############################
// #### Server communication ####
// ##############################

// Establish WebSocket connection
const socket = new WebSocket(WS_URL);

socket.onopen = (event) => {
    console.log('Connected to the server');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'positions') {
        // console.log('Positions:', data.positions)
        // delete players that are not in the new positions list
        Object.keys(players).forEach(playerId => {
            if (!data.positions[playerId]) {
                removePlayer(playerId);
                // remove from players_server_positions
                delete players_server_positions[playerId];
            }
        });
        Object.keys(data.positions).forEach(playerId => {
            // if (playerId === local_player.id) {
            //     return;
            // }
            if (players_server_positions[playerId]) {
                players_server_positions[playerId].x = data.positions[playerId].x;
                players_server_positions[playerId].y = data.positions[playerId].y;
            } else {
                addPlayer(playerId, data.positions[playerId]);
            }
        });
    }
    if (data.type === 'identification') {
        console.log('Identification:', data.id)
        local_player.id = data.id; 
        local_player.position = data.position;
        addPlayer(data.id, data.position);

    }
};

setInterval(() => {
    if (local_player_position_cache.x == local_player.position.x && local_player_position_cache.y == local_player.position.y) {
        return;
    }
    const data = JSON.stringify({ type: 'position-update', position: local_player.position});
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
    }
    local_player_position_cache.x = local_player.position.x;
    local_player_position_cache.y = local_player.position.y
}, 10);

socket.onclose = () => {
    console.log('Disconnected from the server');
};
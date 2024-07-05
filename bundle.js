/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./config.js":
/*!*******************!*\
  !*** ./config.js ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   WS_URL: () => (/* binding */ WS_URL)\n/* harmony export */ });\nvar WS_URL = 'wss://luckbox-backend-40fc66018788.herokuapp.com';\n\n//# sourceURL=webpack://dunes_front/./config.js?");

/***/ }),

/***/ "./src/main.js":
/*!*********************!*\
  !*** ./src/main.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! three */ \"./node_modules/three/build/three.module.js\");\n/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../config */ \"./config.js\");\n\n\nvar scene = new three__WEBPACK_IMPORTED_MODULE_1__.Scene();\nvar camera = new three__WEBPACK_IMPORTED_MODULE_1__.OrthographicCamera(-window.innerWidth / 2, window.innerWidth / 2, window.innerHeight / 2, -window.innerHeight / 2, 0, 5000);\nvar renderer = new three__WEBPACK_IMPORTED_MODULE_1__.WebGLRenderer();\nrenderer.setSize(window.innerWidth, window.innerHeight);\ndocument.body.appendChild(renderer.domElement);\n\n// Create a grid helper\nvar gridHelper = new three__WEBPACK_IMPORTED_MODULE_1__.GridHelper(2500, 125, 0x888888, 0x444444); // size, divisions, color1, color2\nscene.add(gridHelper);\n\n// Create a simple player representation (e.g., spheres)\nvar players_server_positions = {};\nvar players = {};\nvar local_player = {\n  id: null,\n  position: {\n    x: 0,\n    y: 0\n  }\n};\nvar local_player_position_cache = {\n  x: 0,\n  y: 0\n};\nfunction createPlayer(playerId, position) {\n  var geometry = new three__WEBPACK_IMPORTED_MODULE_1__.SphereGeometry(20, 32, 32);\n  var material = new three__WEBPACK_IMPORTED_MODULE_1__.MeshBasicMaterial({\n    color: 0x9d3e3a\n  });\n  var player = new three__WEBPACK_IMPORTED_MODULE_1__.Mesh(geometry, material);\n  player.position.set(position.x, 0, position.y);\n  players_server_positions[playerId] = {\n    x: position.x,\n    y: position.y\n  };\n  scene.add(player);\n  players[playerId] = player;\n}\nfunction updatePlayerPosition(playerId) {\n  if (players[playerId]) {\n    players[playerId].position.lerp(new three__WEBPACK_IMPORTED_MODULE_1__.Vector3(players_server_positions[playerId].x, 0, players_server_positions[playerId].y), 0.1);\n  }\n}\n\n// Set up the camera position\ncamera.position.set(1000, 1000, 1000);\ncamera.lookAt(0, 0, 0);\n\n// Variables to store mouse position and target world position\nvar mouse = new three__WEBPACK_IMPORTED_MODULE_1__.Vector2();\nvar target = new three__WEBPACK_IMPORTED_MODULE_1__.Vector3();\n\n// Event listener for mouse movement\nwindow.addEventListener('mousemove', onMouseMove, false);\nfunction onMouseMove(event) {\n  // Calculate mouse position in normalized device coordinates (-1 to +1)\n  mouse.x = event.clientX / window.innerWidth * 2 - 1;\n  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;\n\n  // Use raycaster to convert mouse position to world coordinates\n  var raycaster = new three__WEBPACK_IMPORTED_MODULE_1__.Raycaster();\n  raycaster.setFromCamera(mouse, camera);\n  var intersects = raycaster.intersectObject(gridHelper);\n  if (intersects.length > 0) {\n    target.copy(intersects[0].point);\n  }\n}\n\n// Animation loop\nfunction animate() {\n  requestAnimationFrame(animate);\n\n  // Move player towards target position\n  var speed = 0.1; // Adjust speed as needed\n  if (local_player.id) {\n    players[local_player.id].position.lerp(target, speed);\n    local_player.position.x = target.x;\n    local_player.position.y = target.z;\n  }\n\n  // Update other players positions\n  Object.keys(players_server_positions).forEach(function (playerId) {\n    if (local_player.id && playerId !== local_player.id) {\n      updatePlayerPosition(playerId);\n    }\n  });\n  renderer.render(scene, camera);\n}\nanimate();\n\n// Establish WebSocket connection\nvar socket = new WebSocket(_config__WEBPACK_IMPORTED_MODULE_0__.WS_URL);\nsocket.onopen = function (event) {\n  console.log('Connected to the server');\n};\nsocket.onmessage = function (event) {\n  var data = JSON.parse(event.data);\n  if (data.type === 'positions') {\n    // delete players that are not in the new positions list\n    Object.keys(players).forEach(function (playerId) {\n      if (!data.positions[playerId]) {\n        scene.remove(players[playerId]);\n        delete players[playerId];\n        // remove from players_server_positions\n        delete players_server_positions[playerId];\n      }\n    });\n    Object.keys(data.positions).forEach(function (playerId) {\n      if (playerId === local_player.id) {\n        return;\n      }\n      if (players_server_positions[playerId]) {\n        players_server_positions[playerId].x = data.positions[playerId].x;\n        players_server_positions[playerId].y = data.positions[playerId].y;\n      } else {\n        createPlayer(playerId, data.positions[playerId]);\n      }\n    });\n  }\n  if (data.type === 'identification') {\n    console.log('Identification:', data.id);\n    local_player.id = data.id;\n    local_player.position = data.position;\n    createPlayer(data.id, data.position);\n  }\n};\nsetInterval(function () {\n  if (local_player_position_cache.x == local_player.position.x && local_player_position_cache.y == local_player.position.y) {\n    return;\n  }\n  var data = JSON.stringify({\n    type: 'position-update',\n    position: local_player.position\n  });\n  if (socket.readyState === WebSocket.OPEN) {\n    socket.send(data);\n    console.log('sent', data);\n  }\n  local_player_position_cache.x = local_player.position.x;\n  local_player_position_cache.y = local_player.position.y;\n}, 10);\nsocket.onclose = function () {\n  console.log('Disconnected from the server');\n};\n\n// Handle window resize\nwindow.addEventListener('resize', function () {\n  camera.left = -window.innerWidth / 2;\n  camera.right = window.innerWidth / 2;\n  camera.top = window.innerHeight / 2;\n  camera.bottom = -window.innerHeight / 2;\n  camera.updateProjectionMatrix();\n  renderer.setSize(window.innerWidth, window.innerHeight);\n});\n\n//# sourceURL=webpack://dunes_front/./src/main.js?");

/***/ }),

/***/ "./node_modules/three/build/three.module.js":
/*!**************************************************!*\
  !*** ./node_modules/three/build/three.module.js ***!
  \**************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main.js");
/******/ 	
/******/ })()
;
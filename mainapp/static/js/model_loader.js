import * as THREE from 'three';
import { STLLoader } from 'stl-loader';
import { OrbitControls } from 'orbit-control';
import { visability2DToggle } from './nifti_loader.js'

const container = document.getElementById('threejs-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.z = 300;
const geometry = new THREE.BufferGeometry();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0);  // make it transparent

const controls = new OrbitControls(camera, renderer.domElement);

let colors = {};
let names = {};
let points = [];

fetch('/static/json/config.json')
    .then((response) => response.json())
    .then((json) => { colors = json['colors']; names = json['names']; });


function refreshLeftBar(scene) {
    const leftBar = document.getElementById('left-bar');
    leftBar.innerHTML = '';

    let segments = [];

    scene.traverse(function (object) {
        if (object.isMesh) {
            const id = Number(object.name.split(':')[0]);
            const segmentDiv = document.createElement('div');
            segmentDiv.className = 'segment';
            segmentDiv.id = `segment-${id}`;
            segmentDiv.style = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;';

            const span = document.createElement('span');
            span.style.fontSize = '14px';
            span.innerText = object.name;

            const button = document.createElement('button');
            button.className = 'segment-button flex items-center justify-center';
            button.id = `segment-button-${id}`;
            button.style = `height:20px; width:20px; background-color: #${colors[id]}; border: 1px solid black;`;
            button.addEventListener('click', () => visabilityToggle(object.name));

            const icon = document.createElement('div');
            icon.className = 'fas fa-eye-slash text-xs';
            icon.style.visibility = 'hidden';

            segmentDiv.appendChild(span);
            segmentDiv.appendChild(button);
            button.appendChild(icon);

            segments[id] = segmentDiv;
            // leftBar.appendChild(segmentDiv);
        }
    });

    segments.forEach(segment => {
        leftBar.appendChild(segment);
    });
}


function visabilityToggle(segmentName) {
    let segment = scene.getObjectByName(segmentName);
    segment.visible = !segment.visible;

    let id = Number(segmentName.split(':')[0]);
    let button = document.getElementById(`segment-button-${id}`);
    let icon = button.querySelector('div');
    if (segment.visible) {
        button.style.backgroundColor = `#${colors[id]}`;
        icon.style.visibility = 'hidden';
    } else {
        button.style.backgroundColor = '#dddddd';
        icon.style.visibility = 'visible';
    }

    visability2DToggle(id);
}


export function chai3d() {
    const socket = new WebSocket('ws://' + window.location.host + '/ws/message/');
    socket.onmessage = function (e) {
        const data = JSON.parse(e.data);
        console.log(data.message);

        // Split data.message using ',' and convert each element to a float
        const coords = data.message.split(",").map(item => parseFloat(item, 10) * 50);
        const newPoint = new THREE.Vector3(...coords);

        // Check if points array is empty or new point is different from the last point
        if (points.length === 0 || !newPoint.equals(points[points.length - 1])) {
            points.push(newPoint);
            geometry.setFromPoints(points);
        }

        console.log(points);

        // Adjust camera if needed, or add more visualization controls/logic
    };
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

export default function loadSTLModel(stlFiles) {
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }


    chai3d();


    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Re-setup lights as they are also cleared from the scene
    for (let i = 0; i < 4; i++) {
        const directionalLight = new THREE.DirectionalLight(0xffffff);
        if (i === 0) directionalLight.position.set(-5, 0, -5);
        if (i === 1) directionalLight.position.set(-5, 0, 5);
        if (i === 2) directionalLight.position.set(5, 0, -5);
        if (i === 3) directionalLight.position.set(5, 0, 5);

        directionalLight.name = "Directional Light " + i;

        scene.add(directionalLight);
    }

    refreshLeftBar(scene);

    const loader = new STLLoader();

    let count = 0;
    stlFiles.forEach(fileName => {
        loader.load(
            `${fileName}`,
            function (geometry) {
                const currSeg = fileName.toString().split('_').slice(-1)[0].split('.')[0];
                const material = new THREE.MeshStandardMaterial({ color: Number("0x" + colors[Number(currSeg)]) });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.name = currSeg + ": " + names[Number(currSeg)];
                scene.add(mesh);
                count++;
                if (count == stlFiles.length) {
                    refreshLeftBar(scene);
                    controls.update();
                }
            },
            (xhr) => {
                // console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            (error) => {
                console.error("An error occurred:", error);
            }
        );
    })

    window.onresize = function () {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    render();
}

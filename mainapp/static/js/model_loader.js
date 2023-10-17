import * as THREE from 'three';
import { STLLoader } from 'stl-loader';
import { OrbitControls } from 'orbit-control';

let colors = {};
let names = {};

fetch('/static/json/config.json')
    .then((response) => response.json())
    .then((json) => { colors = json['colors']; names = json['names']; });


function log() {
    console.log(colors);
}

function refreshLeftBar(scene) {
    const leftBar = document.getElementById('left-bar');
    leftBar.innerHTML = '';

    scene.traverse(function (object) {
        if (object.isMesh) {
            const id = object.name.split(':')[0];
            const segmentDiv = document.createElement('div');
            segmentDiv.className = 'segment';
            segmentDiv.id = `segment-${id}`;
            segmentDiv.style = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;';

            const span = document.createElement('span');
            span.style.fontSize = '14px';
            span.innerText = object.name;

            const button = document.createElement('button');
            button.className = 'segment-button';
            button.id = `segment-button-${id}`;
            button.style = `height:20px; width:20px; background-color: #${colors[Number(id)]}; border: 1px solid black;`;
            button.addEventListener('click', () => log());

            segmentDiv.appendChild(span);
            segmentDiv.appendChild(button);

            leftBar.appendChild(segmentDiv);
        }
    });
}

function visabilityToggle(segmentName) {
    let segment = scene.getObjectByName(segmentName);
    segment.visible = !segment.visible;
}

export default function loadSTLModel(stlFiles) {

    const container = document.getElementById('threejs-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 300;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);  // Adjust size to fit the grid item.
    renderer.setClearColor(0xeeeeee); // Set a light grey background color

    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);

    // Create 4 directional lights and add them to the scene
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
        // console.log(fileName);
        loader.load(
            `${fileName}`,
            function (geometry) {
                // console.log(fileName);
                const currSeg = fileName.toString().split('_').slice(-1)[0].split('.')[0];
                const material = new THREE.MeshStandardMaterial({ color: Number("0x" + colors[Number(currSeg)]) });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.name = currSeg + ": " + names[Number(currSeg)];
                scene.add(mesh);
                count++;
                if (count == stlFiles.length) {
                    refreshLeftBar(scene);

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
    function render() {
        requestAnimationFrame(render);
        renderer.render(scene, camera);
    }

    render();
}
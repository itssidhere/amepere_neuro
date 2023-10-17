import * as THREE from 'three';
import { STLLoader } from 'stl-loader';
import { OrbitControls } from 'orbit-control';

let colors = {};
let names = {};

fetch('/static/json/config.json')
    .then((response) => response.json())
    .then((json) => { colors = json['colors']; names = json['names']; });


function refreshLeftBar(scene)
{
    const leftBar = document.getElementById('left-bar');
    leftBar.innerHTML = '';
    
    scene.traverse(function (object) {
        const color = "color"
        if (object.isMesh)
        {
            const id = object.name.split(':')[0];
            // console.log(object.name);
            leftBar.innerHTML += 
            `<div class="segment" id="segment-${id}" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                <span style="font-size:14px">${object.name}</span>
                <button class="segment-button" id="segment-button-${id}" onclick="console.log(color)" style=" height:20px; width:20px; background-color: #${colors[Number(id)]}; border: 1px solid black;"></button>
            </div>`;
        }
    });
}

function visabilityToggle(segmentName)
{
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
            `/static/STLs/${fileName}`,
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
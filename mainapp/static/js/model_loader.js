import * as THREE from 'three';
import { STLLoader } from 'stl-loader';
import { OrbitControls } from 'orbit-control';
import { getVisability } from './nifti_loader.js';

const container = document.getElementById('threejs-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.z = 300;
const geometry = new THREE.BufferGeometry();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0);  // make it transparent
const group = new THREE.Group();
const controls = new OrbitControls(camera, renderer.domElement);

const pointGeometry = new THREE.SphereGeometry(3, 32, 32);
const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);


let colors = {};
let names = {};
let points = [];

fetch('/static/json/config.json')
    .then((response) => response.json())
    .then((json) => { colors = json['colors']; names = json['names']; });


export function updatePointObject(newPos) {
    pointMesh.position.set(newPos[0], newPos[1], newPos[2]);
}

export function visability3DToggle(id, visability) {
    let segment = scene.getObjectByName(id.toString());

    if (segment !== undefined) {
        segment.visible = visability;
    }
}


export function chai3d() {
    const socket = new WebSocket('ws://' + window.location.host + '/ws/message/');
    socket.onmessage = function (e) {
        const data = JSON.parse(e.data);
        // console.log(data.message);

        // Split data.message using ',' and convert each element to a float
        const quants = data.message.split(",").map(item => parseFloat(item, 10));
        // console.log(quants);
        if (group) {
            // camera.rotation.z = -Math.PI / 2;
            let euler = new THREE.Euler();
            const quaternion = new THREE.Quaternion();
            quaternion.set(quants[1], quants[0], quants[2], quants[3]).normalize();
            euler.setFromQuaternion(quaternion, 'XYZ');
            euler.reorder('ZYX');
            euler.y += Math.PI / 2;
            euler.x = -euler.x / 2;
            group.setRotationFromEuler(euler);

        }

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

    scene.add(new THREE.AxesHelper(100));
    scene.add(pointMesh);

    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    const loader = new STLLoader();

    let count = 0;
    stlFiles.forEach(fileName => {
        loader.load(
            `${fileName}`,
            function (geometry) {
                // const currSeg = fileName.toString().split('_').slice(-1)[0].split('.')[0];
                const currSeg = Number(fileName.replace(/^.*(\\|\/|\:)/, '').split('.')[0]);
                const material = new THREE.MeshStandardMaterial({ color: Number("0x" + colors[currSeg]) });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.name = String(currSeg);
                //scene.add(mesh);
                group.add(mesh);
                if (getVisability(currSeg) === false) {
                    mesh.visible = false;
                }
                count++;
                if (count == stlFiles.length) {
                    scene.add(group);
                    //add a delay
                    // setTimeout(function () {
                    //     group.rotation.y = Math.PI / 2;
                    // }, 350);
                    group.rotation.x = - Math.PI / 2;
                    group.rotation.z = Math.PI;
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

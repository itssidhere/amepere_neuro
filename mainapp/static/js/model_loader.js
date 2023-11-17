import * as THREE from 'three';
import { STLLoader } from 'stl-loader';
import { OrbitControls } from 'orbit-control';
import { getVisability } from './nifti_loader.js';
import { LineGeometry } from 'line-geometry';
import { LineMaterial } from 'line-material';
import { Line2 } from 'line2';

const ballJointToSkull = new THREE.Vector3(0.08778, 0.00576, 0.04068);
ballJointToSkull.multiplyScalar(1000);

const originToBallJoint = new THREE.Vector3(0.39, 0.0, 0.004);
originToBallJoint.multiplyScalar(1000);

const container = document.getElementById('threejs-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 2000);
camera.position.z = 800;
const geometry = new THREE.BufferGeometry();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0);  // make it transparent
const group = new THREE.Group();
const controls = new OrbitControls(camera, renderer.domElement);

const refPointGeometry = new THREE.SphereGeometry(3, 32, 32);
const refPointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const refPointMesh = new THREE.Mesh(refPointGeometry, refPointMaterial);

const refLineGeometry = new LineGeometry();
const refLineMaterial = new LineMaterial({ color: 0x00ff00, linewidth: 0.01 });
const refLineMesh = new Line2(refLineGeometry, refLineMaterial);

const actualLineGeometry = new LineGeometry();
const actualLineMaterial = new LineMaterial({ color: 0x00ff00, linewidth: 0.01 });
const actualLineMesh = new Line2(actualLineGeometry, actualLineMaterial);

let colors = {};
let names = {};
let points = [];

fetch('/static/json/config.json')
    .then((response) => response.json())
    .then((json) => { colors = json['colors']; names = json['names']; });


export function setPointVisability(visability) {
    refPointMesh.visible = visability;
}

export function updatePointObject(newPos) {
    refPointMesh.position.set(newPos[0], newPos[1], newPos[2]);
}

export function update3DRefLine(points) {
    refLineGeometry.setPositions(points);
    refLineGeometry.NeedsUpdate = true;
    refLineMesh.visible = true;
}

export function visability3DToggle(id, visability) {
    let segment = scene.getObjectByName(id.toString());

    if (segment !== undefined) {
        segment.visible = visability;
    }
}


export function getNeedlePosition() {
    const socket = new WebSocket('ws://' + window.location.host + '/ws/needle_message/');
    socket.onmessage = function (e) {
        const data = JSON.parse(e.data);
        // Split data.message using ',' and convert each element to a float
        const coords = data.message.split(",").map(item => parseFloat(item, 10));
        const newPoint = new THREE.Vector3(...coords);
        // Check if points array is empty or new point is different from the last point
        if (points.length === 0 || !newPoint.equals(points[points.length - 1])) {
            points.push(newPoint);
            geometry.setFromPoints(points);
            geometry.NeedsUpdate = true;
        }
    }
}

export function getSkullOrientation() {
    const socket = new WebSocket('ws://' + window.location.host + '/ws/skull_message/');
    socket.onmessage = function (e) {
        const data = JSON.parse(e.data);
        // console.log(data.message);

        // Split data.message using ',' and convert each element to a float
        const quants = data.message.split(",").map(item => parseFloat(item, 10));
        console.log(quants);
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

function rotateObjectAroundAxisQuaternion(object, axis, radians) {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(axis, radians);
    object.applyQuaternion(quaternion);
}

export default function loadSTLModel(stlFiles) {
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }


    getNeedlePosition();
    getSkullOrientation();


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

    const stlGroup = new THREE.Group();
    const referenceGroup = new THREE.Group();
    const pivot = new THREE.Group();
    
    pivot.position.set(originToBallJoint.x, originToBallJoint.y, originToBallJoint.z);
    group.position.set(ballJointToSkull.x, ballJointToSkull.y, ballJointToSkull.z);
    pivot.add(group);
    
    group.add(referenceGroup);
    group.add(stlGroup);

    scene.add(new THREE.AxesHelper(100));
    referenceGroup.add(refPointMesh);
    refPointMesh.visible = false;
    referenceGroup.add(refLineMesh);
    refLineMesh.visible = false;

    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    const loader = new STLLoader();

    let count = 0;
    // console.log(stlFiles)
    stlFiles.forEach(fileName => {
        loader.load(
            `${fileName}`,
            function (geometry) {
                const currSeg = Number(fileName.replace(/^.*(\\|\/|\:)/, '').split('.')[0]);
                const material = new THREE.MeshStandardMaterial({ color: Number("0x" + colors[currSeg]) });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.name = String(currSeg);
                stlGroup.add(mesh);
                if (getVisability(currSeg) === false) {
                    mesh.visible = false;
                }
                count++;
                if (count == stlFiles.length) {
                    rotateObjectAroundAxisQuaternion(stlGroup, new THREE.Vector3(1, 0, 0), Math.PI / 2);
                    rotateObjectAroundAxisQuaternion(stlGroup, new THREE.Vector3(0, 0, 1), Math.PI);
                    scene.add(pivot);
                    rotateObjectAroundAxisQuaternion(pivot, new THREE.Vector3(0, 1, 0), - Math.PI / 2);
                    rotateObjectAroundAxisQuaternion(pivot, new THREE.Vector3(0, 0, 1), Math.PI * 4 / 3);

                    // test();
                    // function test() {
                    //     rotateObjectAroundAxisQuaternion(pivot, new THREE.Vector3(0, 0, 1), Math.PI / 180);
                    //     setTimeout(test, 100);
                    // }
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

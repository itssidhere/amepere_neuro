import * as THREE from 'three';
import { STLLoader } from 'stl-loader';
import { OrbitControls } from 'orbit-control';
import { getVisability, addActualPoint } from './nifti_loader.js';
import { LineGeometry } from 'line-geometry';
import { LineMaterial } from 'line-material';
import { Line2 } from 'line2';

const container = document.getElementById('threejs-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 2000);
camera.position.z = 800;
const geometry = new THREE.BufferGeometry();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0);  // make it transparent
const brainGroup = new THREE.Group();
const controls = new OrbitControls(camera, renderer.domElement);

const ballJointGeometry = new THREE.SphereGeometry(10, 32, 32);
const ballJointMaterial = new THREE.MeshBasicMaterial({ color: 0xb7410e });
const ballJointMesh = new THREE.Mesh(ballJointGeometry, ballJointMaterial);

const needleGeometry = new THREE.SphereGeometry(6, 32, 32);
const needleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const needleMesh = new THREE.Mesh(needleGeometry, needleMaterial);

const refPointGeometry = new THREE.SphereGeometry(3, 32, 32);
const refPointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const refPointMesh = new THREE.Mesh(refPointGeometry, refPointMaterial);

const refLineGeometry = new LineGeometry();
const refLineMaterial = new LineMaterial({ color: 0x00ff00, linewidth: 0.01 });
const refLineMesh = new Line2(refLineGeometry, refLineMaterial);

const meaLineGeometry = new LineGeometry();
const meaLineMaterial = new LineMaterial({ color: 0x0000ff, linewidth: 0.01 });
const meaLineMesh = new Line2(meaLineGeometry, meaLineMaterial);

let colors = {};
let points = [];

fetch('/static/json/config.json')
    .then((response) => response.json())
    .then((json) => { colors = json['colors'];});


export function set3DPointVisability(visability, color = null) {
    refPointMesh.visible = visability;

    if (color !== null) {
        refPointMaterial.color.setHex(color);
    }
}

export function update3DPointObject(newPos) {
    refPointMesh.position.set(newPos[0], newPos[1], newPos[2]);
}

export function update3DLine(points, isRefLine) {
    if (isRefLine) {
        refLineGeometry.setPositions(points);
        refLineGeometry.NeedsUpdate = true;
        refLineMesh.visible = true;
    } else {
        meaLineGeometry.setPositions(points);
        meaLineGeometry.NeedsUpdate = true;
        meaLineMesh.visible = true;
    }
}

export function hide3DLine(isRefLine) {
    if (isRefLine) {
        refLineMesh.visible = false;
    } else {
        meaLineMesh.visible = false;
    }
}


export function set3DSegVisability(id, visability) {
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
            const converted = convert3Dto2DPosition(newPoint);
            addActualPoint(converted);
            needleMesh.position.set(newPoint.x, newPoint.y, newPoint.z);
            // points.push(newPoint);
            // geometry.setFromPoints(points);
            // geometry.NeedsUpdate = true;
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

        if (ballJointMesh) {
            const quaternion = new THREE.Quaternion();
            quaternion.set(quants[0], quants[1], quants[2], quants[3]).normalize();

            ballJointMesh.setRotationFromQuaternion(convertBallJointRotationtoSkullRotation(quaternion));
        }

    };
}

// let t = 0;

// function testNeedle() {
//     t = t + 10;
//     const newPoint = new THREE.Vector3(512.0137790623492 + t, 179.23385922225197 + t, 32.00000000000003 + t);
//     needleMesh.position.set(newPoint.x, newPoint.y, newPoint.z);
//     newPoint.multiplyScalar(0.001);
//     const converted = convert3Dto2DPosition(newPoint);
//     addActualPoint(converted);
//     setTimeout(testNeedle, 1000);
// }

// setTimeout(testNeedle, 5000);

// let t = 0;

// function testRot()
// {
//     t += 0.01;
//     const quaternion = new THREE.Quaternion();
//     quaternion.setFromEuler(new THREE.Euler(t, 0, 0));

//     ballJointMesh.setRotationFromQuaternion(convertBallJointRotationtoSkullRotation(quaternion));

//     setTimeout(testRot, 10);
// }

// testRot();


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

    ballJointMesh.position.set(getBallJointtoOriginTranslation().x, getBallJointtoOriginTranslation().y, getBallJointtoOriginTranslation().z);
    brainGroup.position.set(getSkulltoBallJointTranslation().x, getSkulltoBallJointTranslation().y, getSkulltoBallJointTranslation().z);
    brainGroup.rotation.setFromQuaternion(getSkulltoBallJointQuaternion());
    stlGroup.rotation.setFromQuaternion(get2Dto3DQuaternion());

    brainGroup.add(referenceGroup);
    brainGroup.add(stlGroup);
    ballJointMesh.add(brainGroup);
    scene.add(ballJointMesh);
    scene.add(needleMesh);


    scene.add(new THREE.AxesHelper(100));
    referenceGroup.add(refPointMesh);
    refPointMesh.visible = false;
    referenceGroup.add(refLineMesh);
    refLineMesh.visible = false;
    referenceGroup.add(meaLineMesh);
    meaLineMesh.visible = false;

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
                const material = new THREE.MeshStandardMaterial({ color: Number("0x" + colors[currSeg]), transparent: true, opacity: 0.8 });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.name = String(currSeg);
                stlGroup.add(mesh);
                if (getVisability(currSeg) === false) {
                    mesh.visible = false;
                }
                count++;

                if (count == stlFiles.length) {
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


function get2Dto3DQuaternion() {
    const quaternionX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const quaternionZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
    const combinedQuaternion = new THREE.Quaternion();
    combinedQuaternion.multiplyQuaternions(quaternionZ, quaternionX);
    return combinedQuaternion;
}

function getBallJointtoOriginTranslation() {
    const translation = new THREE.Vector3(0.39, 0.0, 0.004);
    translation.multiplyScalar(1000);
    return translation;
}

function getSkulltoBallJointQuaternion() {
    const quaternionY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), - Math.PI / 2);
    const quaternionZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 4 / 3);
    const combinedQuaternion = new THREE.Quaternion();
    combinedQuaternion.multiplyQuaternions(quaternionZ, quaternionY);
    return combinedQuaternion;
}

function getSkulltoBallJointTranslation() {
    const translation = new THREE.Vector3(0.06, 0.12, 0);
    translation.multiplyScalar(1000);
    return translation;
}

function convertBallJointRotationtoSkullRotation(ballJointRotation) {
    const euler = new THREE.Euler();
    euler.setFromQuaternion(ballJointRotation);
    euler.set(euler.z, euler.y, euler.x);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(euler);
    return quaternion;
}

function convert3Dto2DPosition(position) {
    let newPosition = new THREE.Vector3(position.x, position.y, position.z);
    newPosition.multiplyScalar(1000);
    newPosition = brainGroup.worldToLocal(newPosition);
    return newPosition;
}
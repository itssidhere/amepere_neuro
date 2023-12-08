import * as THREE from 'three';
import { STLLoader } from 'stl-loader';
import { OrbitControls } from 'orbit-control';
import { getVisability, addPointToLine, hideRecLine } from './nifti_loader.js';
import { LineGeometry } from 'line-geometry';
import { LineMaterial } from 'line-material';
import { Line2 } from 'line2';

// THREE.JS Setup
const container = document.getElementById('threejs-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 2000);
camera.position.z = 600;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0);
const brainGroup = new THREE.Group();
const controls = new OrbitControls(camera, renderer.domElement);

// Ball Joint
const ballJointGeometry = new THREE.SphereGeometry(10, 32, 32);
const ballJointMaterial = new THREE.MeshBasicMaterial({ color: 0xb7410e });
const ballJointMesh = new THREE.Mesh(ballJointGeometry, ballJointMaterial);

// Needle Point
const needleGeometry = new THREE.SphereGeometry(3, 32, 32);
const needleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const needleMesh = new THREE.Mesh(needleGeometry, needleMaterial);

// Helper Point (Shown when setting entry/target point and measuring)
const visPointGeometry = new THREE.SphereGeometry(3, 32, 32);
const visPointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const visPointMesh = new THREE.Mesh(visPointGeometry, visPointMaterial);

// Reference Line connecting entry and target point
const refLineGeometry = new LineGeometry();
const refLineMaterial = new LineMaterial({ color: 0x00ff00, linewidth: 0.01 });
const refLineMesh = new Line2(refLineGeometry, refLineMaterial);

// Measuring Line connecting two measureing points
const meaLineGeometry = new LineGeometry();
const meaLineMaterial = new LineMaterial({ color: 0x0000ff, linewidth: 0.01 });
const meaLineMesh = new Line2(meaLineGeometry, meaLineMaterial);

// Read config file from json
let colors = {};
fetch('/static/json/config.json')
    .then((response) => response.json())
    .then((json) => { colors = json['colors']; });

let points = [];


// current skull quaternion as string
export var currentSkullPosition = "";

// set the visability of the helper point
export function set3DPointVisability(visability, color = null) {
    visPointMesh.visible = visability;

    if (color !== null) {
        visPointMaterial.color.setHex(color);
    }
}

// replay patient position from csv file
export async function replayPatientPosition(patient, shouldDelay = true) {
    hideRecLine();
    let patientData = await fetch(`/media/recorded_data/${patient}.csv`);

    if (patientData.ok) {
        let csvText = await patientData.text();
        patientData = parseCSV(csvText);


        let firstRow = csvText.split("\n")[1].split(",");

        drawSkull(new THREE.Quaternion(parseFloat(firstRow[0]), parseFloat(firstRow[1]), parseFloat(firstRow[2]), parseFloat(firstRow[3])));

        // iterate through each row of the csv file
        for (let i = 0; i < patientData.length; i++) {
            // convert each row to a vector3
            let x = parseFloat(patientData[i]['x']);
            let y = parseFloat(patientData[i]['y']);
            let z = parseFloat(patientData[i]['z']);


            if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

            // let quants = [parseFloat(patientData[i]['q0']), parseFloat(patientData[i]['q1']), parseFloat(patientData[i]['q2']), parseFloat(patientData[i]['q3'])];
            let newPos = new THREE.Vector3(x, y, z);
            // const quaternion = new THREE.Quaternion();
            // quaternion.set(quants[0], quants[1], quants[2], quants[3]).normalize();
            drawPoint(newPos, false);
            // drawSkull(quaternion);

            if (shouldDelay) {
                await new Promise(r => setTimeout(r, 100));
            }

        }

    }
}

// parse csv file from string
function parseCSV(csvText) {
    let lines = csvText.split("\n");
    let result = [];
    let headers = lines[0].split(",");

    for (let i = 2; i < lines.length; i++) {
        let obj = {};
        let currentline = lines[i].split(",");

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j];
        }

        result.push(obj);
    }

    return result;
}

// update the helper point position
export function update3DPointObject(newPos) {
    visPointMesh.position.set(newPos[0], newPos[1], newPos[2]);
}

// update the reference line or measuring line
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

// hide the reference line or measuring line
export function hide3DLine(isRefLine) {
    if (isRefLine) {
        refLineMesh.visible = false;
    } else {
        meaLineMesh.visible = false;
    }
}

// set the visability of a segment
export function set3DSegVisability(id, visability) {
    let segment = scene.getObjectByName(id.toString());

    if (segment !== undefined) {
        segment.visible = visability;
    }
}

// Read needle position from websocket
// TO-DO: work on the offset to the needle position
const offset = new THREE.Vector3();
offset.set(0.0125, 0, 0.0125);
export function getNeedlePosition() {
    const socket = new WebSocket('ws://' + window.location.host + '/ws/needle_message/');
    socket.onmessage = function (e) {
        const data = JSON.parse(e.data);
        // Split data.message using ',' and convert each element to a float
        const coords = data.message.split(",").map(item => parseFloat(item, 10));
        const newPoint = new THREE.Vector3(coords[0], coords[1], coords[2]);
        newPoint.add(offset);
        drawPoint(newPoint, true);
    }


}


// Read skull orientation from websocket
export function getSkullOrientation() {
    const socket = new WebSocket('ws://' + window.location.host + '/ws/skull_message/');
    socket.onmessage = function (e) {
        const data = JSON.parse(e.data);
        // console.log(data.message);

        // Split data.message using ',' and convert each element to a float
        const quants = data.message.split(",").map(item => parseFloat(item, 10));
        const quaternion = new THREE.Quaternion();
        quaternion.set(quants[0], quants[1], quants[2], quants[3]).normalize();
        drawSkull(quaternion);

    };
}

// Draw a point on the screen
function drawPoint(newPoint, isActual) {
    // Check if points array is empty or new point is different from the last point
    if (points.length === 0 || !newPoint.equals(points[points.length - 1])) {
        // console.log(newPoint.x, newPoint.y, newPoint.z)
        newPoint = convertChai3Dto3DPosition(newPoint);

        if (isActual) needleMesh.position.set(newPoint.x, newPoint.y, newPoint.z);

        const converted = convert3Dto2DPosition(newPoint);
        addPointToLine(converted, isActual);
    }
}

// Draw the skull on the screen
function drawSkull(quaternion) {
    if (ballJointMesh) {
        currentSkullPosition = `${quaternion.x},${quaternion.y},${quaternion.z},${quaternion.w}`;
        ballJointMesh.setRotationFromQuaternion(convertBallJointRotationtoSkullRotation(quaternion));
    }
}

// let t = 0;

// function testNeedle() {
//     t = t - 0.01;
//     const newPoint = new THREE.Vector3(0.45, 0.16 + t / 10, 0);
//     console.log(newPoint)
//     newPoint.multiplyScalar(1000);
//     needleMesh.position.set(newPoint.x, newPoint.y, newPoint.z);

//     const converted = convert3Dto2DPosition(newPoint);
//     // addPointToLine(converted, true);
//     addPointToLine(converted, false);

//     setTimeout(testNeedle, 100);
// }

// setTimeout(testNeedle, 5000);

// let t = 0;

// function testRot()
// {
//     t -= 0.01;
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

// Load the stl model from the given file paths
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

    // Haptic scene setup
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

    // let testSphere = new THREE.SphereGeometry(10, 32, 32);
    // let testMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // let testMesh = new THREE.Mesh(testSphere, testMaterial);
    // let pos = new THREE.Vector3(0.36, 0, 0.1);
    // pos = convertChai3Dto3DPosition(pos);
    // testMesh.position.set(pos.x, pos.y, pos.z);
    // scene.add(testMesh);

    scene.add(new THREE.AxesHelper(100));
    referenceGroup.add(visPointMesh);
    visPointMesh.visible = false;
    referenceGroup.add(refLineMesh);
    refLineMesh.visible = false;
    referenceGroup.add(meaLineMesh);
    meaLineMesh.visible = false;

    const loader = new STLLoader();

    let count = 0;
    
    // load each stl file and add it to the scene
    stlFiles.forEach(fileName => {
        loader.load(
            `${fileName}`,
            function (geometry) {
                const currSeg = Number(fileName.replace(/^.*(\\|\/|\:)/, '').split('.')[0]);
                const material = new THREE.MeshStandardMaterial({ color: Number("0x" + colors[currSeg]), transparent: true, opacity: 0.95 });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.name = String(currSeg);
                stlGroup.add(mesh);
                if (getVisability(currSeg) === false) {
                    mesh.visible = false;
                }
                count++;

                // once all stl files are loaded, set the camera target to the ball joint
                if (count == stlFiles.length) {
                    controls.target = new THREE.Vector3(getBallJointtoOriginTranslation().x, getBallJointtoOriginTranslation().y, getBallJointtoOriginTranslation().z);
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


// Below are helper functions to convert between different coordinate systems
// TO-DO: Some values are not 100% accurate, need to be fixed
function get2Dto3DQuaternion() {
    const quaternionX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const quaternionZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
    const combinedQuaternion = new THREE.Quaternion();
    combinedQuaternion.multiplyQuaternions(quaternionZ, quaternionX);
    return combinedQuaternion;
}

function getBallJointtoOriginTranslation() {
    const translation = new THREE.Vector3(0.39, 0.0, 0.0);
    return convertChai3Dto3DPosition(translation);
}

function getSkulltoBallJointQuaternion() {
    const quaternionY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), - Math.PI / 2);
    const quaternionZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 7 / 6);
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
    euler.set(- euler.z, - euler.y, - euler.x);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(euler);
    return quaternion;
}

function convertChai3Dto3DPosition(position) {
    const newPosition = new THREE.Vector3(position.x, position.z, - position.y);
    newPosition.multiplyScalar(1000);
    return newPosition;

}

function convert3Dto2DPosition(position) {
    let newPosition = new THREE.Vector3(position.x, position.y, position.z);
    newPosition = brainGroup.worldToLocal(newPosition);
    return newPosition;
}
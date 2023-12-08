import * as THREE from 'three';
import { OrbitControls } from 'orbit-control';
import { set3DSegVisability, set3DPointVisability, update3DPointObject, update3DLine, hide3DLine } from './model_loader.js'
import { LineGeometry } from 'line-geometry';
import { LineMaterial } from 'line-material';
import { Line2 } from 'line2';
import { FixedSizeQueue } from './FixedSizeQueue.js';

// Read config file from json
let colors = {};
let names = {};
let visibilities = {};
fetch('/static/json/config.json')
    .then((response) => response.json())
    .then((json) => {
        colors = json['colors'];
        names = json['names'];
    });

// If visibilities is not in local storage, fetch from json and store it 
if (localStorage.getItem('visibilities') === null) {
    fetch('/static/json/visibilities.json', { cache: "no-cache" })
        .then((response) => response.json())
        .then((json) => {
            visibilities = json['visibilities'];
            localStorage.setItem('visibilities', JSON.stringify(visibilities));
        });
} else {
    visibilities = JSON.parse(localStorage.getItem('visibilities'));
}


// Adjust MRI contrast here
var contrast = 1.35;

// header: NIFTI header
// imageData: Original NIFTI image data
// segmentationData: Original NIFTI segmentation data
// typedImg: NIFTI image data, converted for visualization
// typedSeg: NIFTI segmentation data, converted for visualization
// normFactor: Normalization factor for image data
var header, imageData, segmentationData, typedImg, typedSeg, normFactor;

// THREE.js setup
const scene = new THREE.Scene();
const containers = [];
const cameras = [];
const renderers = [];
const sliders = [];
const planes = [];
const textures = [];
const segmentation_textures = [];

// Reference and Measurement Line Meshes
const refLineMeshes = [];
const meaLineMeshes = [];

// Recording Points Array and Line Meshes
const recPoints = [];
const recLineMeshes = [];

// Actual Points Array and Line Meshes
const actPoints = [];
const actLineMeshes = [];

// Helper Point (Shown when setting entry/target point and measuring)
const visPoints = [];
const currPointPos = new THREE.Vector3();
let isMouseDown = false;

// Entry and Target Point
const entryPos = new THREE.Vector3();
const targetPos = new THREE.Vector3();

// Measure Start and End Point
const measureStartPos = new THREE.Vector3();
const measureEndPos = new THREE.Vector3();

let count = 0;
let isSelectingPoint = false;
let mesauringStatus = 0;

const functionBtns = new Map();


// function testEmitter() {
//     const point = new THREE.Vector3(Math.random() * 100, Math.random() * 100, Math.random() * 100);
//     addPointToLine(point, true);

//     setTimeout(testEmitter, 3000);
// }

// setTimeout(testEmitter, 3000);

init();

function init()
{
    // Scene setup for three views
    for (let i = 0; i <= 2; i++) {
        containers.push(document.getElementById(`nifti-container-${i}`));
        cameras.push(new THREE.PerspectiveCamera(75, containers[i].clientWidth / containers[i].clientHeight, 0.1, 1000));
        cameras[i].layers.enable(i + 1);

        renderers.push(new THREE.WebGLRenderer({ antialias: true, alpha: true }));
        renderers[i].setSize(containers[i].clientWidth, containers[i].clientHeight);  // Adjust size to fit the grid item.
        renderers[i].setClearColor(0x000000); // Set a black background color

        const control = new OrbitControls(cameras[i], renderers[i].domElement);
        control.enableRotate = false;

        actPoints.push(new FixedSizeQueue(300));
        recPoints.push(new Array());
    }
}

// Initialize the buttons and the button map
function initBtn() {
    functionBtns.set("entry", document.getElementById('btn-entry'));
    functionBtns.set("target", document.getElementById('btn-target'));
    functionBtns.set("measure", document.getElementById('btn-measure'));
    functionBtns.set("record", document.getElementById('btn-record'));
    functionBtns.set("record-display", document.getElementById('btn-record-display'));

    functionBtns.get("entry").addEventListener('click', () => setRefPoint(true));
    functionBtns.get("target").addEventListener('click', () => setRefPoint(false));
    functionBtns.get("measure").addEventListener('click', measure);

    functionBtns.forEach((value, key) => {
        value.disabled = false;

        value.classList.remove('bg-gray-500');
        value.classList.add('bg-blue-500');
        value.classList.add('hover:bg-blue-700');
    });
}

// Load the NIFTI file (seg: whether to load the segmentation file)
export async function loadNIFTI2D(path, seg) {

    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }

    typedSeg = undefined;

    document.getElementById('left-bar').innerHTML = '';

    if (seg === true) {
        await readSegmentation(path.replace('.nii.gz', '_synthseg.nii.gz'));
        await readImage(path.replace('.nii.gz', '_resampled.nii.gz'));
        initBtn();
    } else {
        await readImage(path);
    }


    console.log("loadNIFTI2D done, segmentation: ", seg);
}

// Read the image file from the given path
async function readImage(path) {
    await fetch(path)
        .then(res => res.blob()) // Gets the response and returns it as a blob
        .then(file => {
            let blob = makeSlice(file, 0, file.size);
            let reader = new FileReader();

            reader.onloadend = function (evt) {
                if (evt.target.readyState === FileReader.DONE) {
                    readNIFTI(evt.target.result);
                }
            };

            reader.readAsArrayBuffer(blob);
        });

}

// Read the segmentation file from the given path
async function readSegmentation(path) {
    await fetch(path)
        .then(res => res.blob()) // Gets the response and returns it as a blob
        .then(file => {
            let blob = makeSlice(file, 0, file.size);
            let reader = new FileReader();

            reader.onloadend = function (evt) {
                if (evt.target.readyState === FileReader.DONE) {
                    let data = evt.target.result;

                    if (nifti.isCompressed(data)) {
                        data = nifti.decompress(data);
                    }

                    if (nifti.isNIFTI(data)) {
                        let segHeader = nifti.readHeader(data);
                        console.log("Segmentation", header);
                        let segImage = nifti.readImage(segHeader, data);

                        typedSeg = createTypedData(segHeader.datatypeCode, segImage);

                        displaySegmentationList();
                    }
                }
            };
            reader.readAsArrayBuffer(blob);
        });
    return;
}

// Create a typed array from the original data
function createTypedData(dataTypeCode, source) {
    let newArray;

    switch (dataTypeCode) {
        case nifti.NIFTI1.TYPE_UINT8:
            newArray = new Uint8Array(source);
            break;
        case nifti.NIFTI1.TYPE_INT16:
            newArray = new Int16Array(source);
            break;
        case nifti.NIFTI1.TYPE_INT32:
            newArray = new Int32Array(source);
            break;
        case nifti.NIFTI1.TYPE_FLOAT32:
            newArray = new Float32Array(source);
            break;
        case nifti.NIFTI1.TYPE_FLOAT64:
            newArray = new Float64Array(source);
            break;
        case nifti.NIFTI1.TYPE_INT8:
            newArray = new Int8Array(source);
            break;
        case nifti.NIFTI1.TYPE_UINT16:
            newArray = new Uint16Array(source);
            break;
        case nifti.NIFTI1.TYPE_UINT32:
            newArray = new Uint32Array(source);
            break;
        default:
            return;
    }

    return newArray;
}

// Create a slice of the file
function makeSlice(file, start, length) {
    let fileType = (typeof File);

    if (fileType === 'undefined') {
        return function () { };
    }

    if (File.prototype.slice) {
        return file.slice(start, start + length);
    }

    if (File.prototype.mozSlice) {
        return file.mozSlice(start, length);
    }

    if (File.prototype.webkitSlice) {
        return file.webkitSlice(start, length);
    }

    return null;
}

// Read the NIFTI file
function readNIFTI(data) {
    if (nifti.isCompressed(data)) {
        data = nifti.decompress(data);
    }

    if (nifti.isNIFTI(data)) {
        header = nifti.readHeader(data);
        console.log("NIFTI", header);
        let niftiImage = nifti.readImage(header, data);

        typedImg = createTypedData(header.datatypeCode, niftiImage);

        // Image normalization
        let max = 0;
        for (let i = 0; i < typedImg.length; i++) {
            if (typedImg[i] > max) max = typedImg[i];
        }
        normFactor = 255 / max;

        // Scene setup for three views
        for (let i = 0; i <= 2; i++) {
            let width, height;
            if (i === 0) { width = header.dims[1]; height = header.dims[2]; }
            else if (i === 1) { width = header.dims[1]; height = header.dims[3]; }
            else { width = header.dims[2]; height = header.dims[3]; }

            const texture_data = new Uint8Array(4 * width * height);
            textures[i] = new THREE.DataTexture(texture_data, width, height);
            const material = new THREE.MeshBasicMaterial({ map: textures[i], side: THREE.DoubleSide });
            const geometry = new THREE.PlaneGeometry(width, height);
            planes[i] = new THREE.Mesh(geometry, material);
            planes[i].layers.set(i + 1);
            planes[i].name = String(i);

            const segmentation_data = new Uint8Array(4 * width * height);
            segmentation_textures[i] = new THREE.DataTexture(segmentation_data, width, height);
            const segmentation_material = new THREE.MeshBasicMaterial({ map: segmentation_textures[i], transparent: true, opacity: 0.5, side: THREE.DoubleSide });
            const segmentation_geometry = new THREE.PlaneGeometry(width, height);
            const segmentation_mesh = new THREE.Mesh(segmentation_geometry, segmentation_material);
            segmentation_mesh.layers.set(i + 1);

            const refPointGeometry = new THREE.SphereGeometry(3, 32, 32);
            const refPointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            visPoints.push(new THREE.Mesh(refPointGeometry, refPointMaterial));
            visPoints[i].layers.set(i + 1);
            visPoints[i].visible = false;
            scene.add(visPoints[i]);

            const refLineGeometry = new LineGeometry();
            const refLineMaterial = new LineMaterial({ color: 0x00ff00, linewidth: 0.01 });
            refLineMeshes.push(new Line2(refLineGeometry, refLineMaterial));
            refLineMeshes[i].layers.set(i + 1);
            refLineMeshes[i].visible = false;
            scene.add(refLineMeshes[i]);
            refLineMeshes[i].renderOrder = 0 || 999
            refLineMeshes[i].material.depthTest = false

            const meaLineGeometry = new LineGeometry();
            const meaLineMaterial = new LineMaterial({ color: 0x0000ff, linewidth: 0.01 });
            meaLineMeshes.push(new Line2(meaLineGeometry, meaLineMaterial));
            meaLineMeshes[i].layers.set(i + 1);
            meaLineMeshes[i].visible = false;
            scene.add(meaLineMeshes[i]);
            meaLineMeshes[i].renderOrder = 0 || 999
            meaLineMeshes[i].material.depthTest = false

            const actLineGeometry = new LineGeometry();
            const actLineMaterial = new LineMaterial({ color: 0xff0000, linewidth: 0.01 });
            actLineMeshes.push(new Line2(actLineGeometry, actLineMaterial));
            actLineMeshes[i].layers.set(i + 1);
            actLineMeshes[i].visible = true;
            scene.add(actLineMeshes[i]);
            actLineMeshes[i].renderOrder = 0 || 999
            actLineMeshes[i].material.depthTest = false

            const recLineGeometry = new LineGeometry();
            const recLineMaterial = new LineMaterial({ color: 0xffff00, linewidth: 0.01 });
            recLineMeshes.push(new Line2(recLineGeometry, recLineMaterial));
            recLineMeshes[i].layers.set(i + 1);
            recLineMeshes[i].visible = false;
            scene.add(recLineMeshes[i]);
            recLineMeshes[i].renderOrder = 0 || 999
            recLineMeshes[i].material.depthTest = false

            if (i === 0) {
                const ratio = (header.pixDims[2]) / (header.pixDims[1]);
                geometry.scale(1, ratio, 1);
                segmentation_geometry.scale(1, ratio, 1);
                planes[i].rotation.x = - Math.PI / 2;
                segmentation_mesh.rotation.x = - Math.PI / 2;
                cameras[i].position.y = - Math.sqrt(Math.pow(header.dims[1] / 2, 2) + Math.pow(header.dims[2] / 2, 2));
                cameras[i].rotation.x = Math.PI / 2;
            }
            else if (i === 1) {
                const ratio = (header.pixDims[3]) / (header.pixDims[1]);
                geometry.scale(1, ratio, 1);
                segmentation_geometry.scale(1, ratio, 1);
                cameras[i].position.z = Math.sqrt(Math.pow(header.dims[1] / 2, 2) + Math.pow(header.dims[3] / 2, 2));
            }

            else if (i === 2) {
                const ratio = (header.pixDims[3]) / (header.pixDims[2]);
                geometry.scale(1, ratio, 1);
                segmentation_geometry.scale(1, ratio, 1);
                planes[i].rotation.y = Math.PI / 2;
                segmentation_mesh.rotation.y = Math.PI / 2;
                cameras[i].position.x = Math.sqrt(Math.pow(header.dims[2] / 2, 2) + Math.pow(header.dims[3] / 2, 2));
                cameras[i].rotation.y = Math.PI / 2;
            }

            scene.add(segmentation_mesh);
            scene.add(planes[i]);

            sliders[i] = document.getElementById(`nifti-slider-${i}`);
            sliders[i].max = header.dims[3 - i] - 1;
            sliders[i].value = Math.round((header.dims[3 - i] - 1) / 2);
            sliders[i].oninput = function () {
                updateSliceView(i, sliders[i].value);
            }

            containers[i].appendChild(renderers[i].domElement);

            function render() {
                requestAnimationFrame(render);
                renderers[i].render(scene, cameras[i]);
            }

            render();

            window.onresize = function () {
                cameras[i].aspect = containers[i].clientWidth / containers[i].clientHeight;
                cameras[i].updateProjectionMatrix();
                renderers[i].setSize(containers[i].clientWidth, containers[i].clientHeight);
            }
        }
        refreshDisplay();
    }
}

// Update the slice view
function updateSliceView(index, slice) {
    slice = Number(slice);

    const slider_value = Math.round(slice * header.pixDims[3 - index]);
    document.getElementById(`nifti-value-${index}`).innerHTML = slider_value + ' mm';

    let cols, rows, sliceOffset;

    if (index === 0) {
        cols = header.dims[1];
        rows = header.dims[2];
    } else if (index === 1) {
        cols = header.dims[1];
        rows = header.dims[3];
        slice = header.dims[2] - slice - 1;
    } else if (index === 2) {
        cols = header.dims[2];
        rows = header.dims[3];
    }

    sliceOffset = header.dims[1] * header.dims[2];

    imageData = new Uint8Array(4 * cols * rows);
    segmentationData = new Uint8Array(4 * cols * rows);

    // Slice the 3D MRI data
    for (let row = 0; row < rows; row++) {
        let rowOffset = row * cols;
        for (let col = 0; col < cols; col++) {
            let offset;
            if (index === 0) {
                offset = slice * sliceOffset + rowOffset + col;
            } else if (index === 1) {
                offset = col + slice * cols + row * sliceOffset;
            } else if (index === 2) {
                offset = slice + col * header.dims[1] + row * sliceOffset;
            }

            let value = typedImg[offset] * normFactor;
            value = Math.round(contrast * (value - 128) + 128);
            if (value < 0) value = 0;
            let pixelOffset = (rowOffset + col) * 4;

            imageData[pixelOffset] = value;
            imageData[pixelOffset + 1] = value;
            imageData[pixelOffset + 2] = value;
            imageData[pixelOffset + 3] = 0xFF;

            if (typedSeg === undefined) continue;

            let segValue = typedSeg[offset];
            // console.log(segValue);
            if (visibilities[Number(segValue)] === true && Number(segValue) !== 0) {
                let color = colors[Number(segValue)];
                segmentationData[pixelOffset] = parseInt(color.substring(0, 2), 16);
                segmentationData[pixelOffset + 1] = parseInt(color.substring(2, 4), 16);
                segmentationData[pixelOffset + 2] = parseInt(color.substring(4, 6), 16);
                segmentationData[pixelOffset + 3] = 0xFF;
            } else {
                segmentationData[pixelOffset] = 0x00;
                segmentationData[pixelOffset + 1] = 0x00;
                segmentationData[pixelOffset + 2] = 0x00;
                segmentationData[pixelOffset + 3] = 0x00;
            }
        }
    }

    textures[index].image.data.set(imageData);
    textures[index].needsUpdate = true;

    segmentation_textures[index].image.data.set(segmentationData);
    segmentation_textures[index].needsUpdate = true;

    containers[index].addEventListener('mousedown', (evt) => { isMouseDown = true; onMouseMove(evt) });
    containers[index].addEventListener('mousemove', onMouseMove);
    containers[index].addEventListener('mouseup', () => { isMouseDown = false; count = 0 });
}



function refreshDisplay() {
    for (let i = 0; i < 3; i++) {
        updateSliceView(i, sliders[i].value);
    }
}

// Display the segmentation list on the left bar
function displaySegmentationList() {
    const leftBar = document.getElementById('left-bar');
    leftBar.innerHTML = '';
    leftBar.appendChild(createSegmentDiv(0));

    let segmentItems = [];
    let existingSegments = [];

    for (let i = 0; i < typedSeg.length; i++) {
        if (typedSeg[i] == 0 || existingSegments.includes(typedSeg[i])) continue;
        {
            const id = Number(typedSeg[i]);
            const segmentDiv = createSegmentDiv(id);

            segmentItems[id] = segmentDiv;
            existingSegments.push(typedSeg[i]);
        }
    }

    segmentItems.forEach(segment => {
        leftBar.appendChild(segment);
    });
}

// Create a div in the list for each segmentation
function createSegmentDiv(id) {
    const segmentDiv = document.createElement('div');
    segmentDiv.className = 'segment';
    segmentDiv.id = `segment-${id}`;
    segmentDiv.style = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;';

    const span = document.createElement('span');
    span.style.fontSize = '14px';
    span.innerText = id + ': ' + names[id];

    const button = document.createElement('button');
    button.className = 'segment-button flex items-center justify-center';
    button.id = `segment-button-${id}`;
    button.style = `height:20px; width:20px; border: 1px solid black;`;
    button.addEventListener('click', () => set2DSegVisability(id));

    const icon = document.createElement('div');
    icon.className = 'fas fa-eye-slash text-xs';

    if (visibilities[id] === true) {
        button.style.backgroundColor = `#${colors[id]}`;
        icon.style.visibility = 'hidden';
    } else {
        button.style.backgroundColor = '#dddddd';
        icon.style.visibility = 'visible';
    }

    segmentDiv.appendChild(span);
    segmentDiv.appendChild(button);
    button.appendChild(icon);

    return segmentDiv;
}

// Update the segmentation div UI in the list
function updateSegmentationinList(id, visability) {
    let button = document.getElementById(`segment-button-${id}`);
    let icon = button.querySelector('div');
    if (visability === true) {
        button.style.backgroundColor = `#${colors[id]}`;
        icon.style.visibility = 'hidden';
    } else {
        button.style.backgroundColor = '#dddddd';
        icon.style.visibility = 'visible';
    }
}

// Toggle the visability of a segmentation
function set2DSegVisability(id) {
    visibilities[id] = !visibilities[id];
    refreshDisplay();
    set3DSegVisability(id, visibilities[id]);
    updateSegmentationinList(id, visibilities[id]);

    localStorage.setItem('visibilities', JSON.stringify(visibilities));
}

export function getVisability(id) {
    return visibilities[id];
}

// Set the visability of the helper point
function setPointVisability(inProgress, color) {
    for (let i = 0; i < 3; i++) {
        visPoints[i].visible = inProgress;
        visPoints[i].material.color.setHex(color);
    }

    set3DPointVisability(inProgress, color);
}

// Measure the distance between two points
function measure() {
    mesauringStatus = (mesauringStatus + 1) % 4;

    const btn = functionBtns.get("measure");

    const isMeasuring = mesauringStatus == 1 || mesauringStatus == 2;

    const measureResult = document.getElementById('measure-result');

    setBtnStatus(btn, isMeasuring);

    setPointVisability(isMeasuring, 0x0000ff);

    btn.innerText = mesauringStatus == 0 ? "Start Measuring" : mesauringStatus == 1 ? "Save Start Point" : mesauringStatus == 2 ? "Save End Point" : "Clear Measurement";

    switch (mesauringStatus) {
        case 0: // Idle
            measureResult.innerHTML = '0';
            hide3DLine(false);
            meaLineMeshes.forEach(line => {
                line.visible = false;
            });
            break;
        case 1: // Choosing Start Point
            currPointPos.set(0, 0, 0);
            setVisPointsFromPos(currPointPos);
            break;
        case 2: // Choosing End Point
            measureStartPos.copy(currPointPos);
            currPointPos.set(0, 0, 0);
            setVisPointsFromPos(currPointPos);
            console.log("measureStartPos: ", measureStartPos);
            break;
        case 3: // Finished
            measureEndPos.copy(currPointPos);
            console.log("measureEndPos: ", measureEndPos);
            const distance = measureStartPos.distanceTo(measureEndPos);
            measureResult.innerHTML = distance.toFixed(2);
            updateLine(measureStartPos, measureEndPos, false);
            break;
    }
}

// Set the reference point from current helper point position
function setRefPoint(isEntry) {
    const btn = isEntry ? functionBtns.get("entry") : functionBtns.get("target");
    isSelectingPoint = !isSelectingPoint;

    setPointVisability(isSelectingPoint, 0x00ff00);

    setBtnStatus(btn, isSelectingPoint);

    btn.innerText = isSelectingPoint ? btn.innerText.replace('Set', 'Save') : btn.innerText.replace('Save', 'Set');

    if (isSelectingPoint) {
        if (isEntry) {
            currPointPos.set(entryPos.x, entryPos.y, entryPos.z);
        } else {
            currPointPos.set(targetPos.x, targetPos.y, targetPos.z);
        }

        update3DPointObject(currPointPos);

        setVisPointsFromPos(currPointPos);

    } else {
        if (isEntry) {
            entryPos.copy(currPointPos);
            if (targetPos.x !== 0 || targetPos.y !== 0 || targetPos.z !== 0) {
                updateLine(entryPos, targetPos, true);
            }
        } else {
            targetPos.copy(currPointPos);
            if (entryPos.x !== 0 || entryPos.y !== 0 || entryPos.z !== 0) {
                updateLine(entryPos, targetPos, true);
            }
        }
    }
}

// Set button UI 
function setBtnStatus(btn, inProgress) {
    if (inProgress) {
        functionBtns.forEach((value, key) => {
            value.disabled = true;

            value.classList.remove('bg-blue-500');
            value.classList.remove('hover:bg-blue-700');
            value.classList.add('bg-gray-500');
        });

        btn.disabled = false;
        btn.classList.remove('bg-gray-500')
        btn.classList.add('bg-green-500');
        btn.classList.add('hover:bg-green-700');
    } else {
        functionBtns.forEach((value, key) => {
            value.disabled = false;

            value.classList.remove('bg-gray-500');
            value.classList.remove('bg-green-500');
            value.classList.remove('hover:bg-green-700');
            value.classList.add('bg-blue-500');
            value.classList.add('hover:bg-blue-700');
        });
    }

}

// Set the position of the helper point
function setVisPointsFromPos(pos) {
    for (let i = 0; i < 3; i++) {
        visPoints[i].position.set(pos.x, pos.y, pos.z);
        switch (i) {
            case 0:
                visPoints[i].position.y = 0;
                break;
            case 1:
                visPoints[i].position.z = 0;
                break;
            case 2:
                visPoints[i].position.x = 0;
                break;
        }
    }
}

// Add a point to the actual or recording line
export function addPointToLine(point, isActual) {
    if (isActual) {
        for (let i = 0; i < 3; i++) {
            switch (i) {
                case 0:
                    actPoints[i].push(point.x, 0, point.z);
                    break;
                case 1:
                    actPoints[i].push(point.x, point.y, 0);
                    break;
                case 2:
                    actPoints[i].push(0, point.y, point.z);
                    break;
            }

            actLineMeshes[i].geometry = new LineGeometry();
            actLineMeshes[i].geometry.setPositions(actPoints[i].queue);
            actLineMeshes[i].visible = true;
        }
    } else {
        for (let i = 0; i < 3; i++) {
            switch (i) {
                case 0:
                    recPoints[i].push(point.x, 0, point.z);
                    break;
                case 1:
                    recPoints[i].push(point.x, point.y, 0);
                    break;
                case 2:
                    recPoints[i].push(0, point.y, point.z);
                    break;
            }

            recLineMeshes[i].geometry = new LineGeometry();
            recLineMeshes[i].geometry.setPositions(recPoints[i]);
            recLineMeshes[i].visible = true;
        }
    }
}

// Hide the recording line
export function hideRecLine() {
    for (let i = 0; i < 3; i++) {
        recPoints[i] = new Array();
        recLineMeshes[i].visible = false;
    }
}

// Update the reference line or measurement line
function updateLine(entry, target, isRef) {
    let points = [];
    points.push(entry.x, entry.y, entry.z);
    points.push(target.x, target.y, target.z);

    update3DLine(points, isRef);

    let lineArray = isRef ? refLineMeshes : meaLineMeshes;

    for (let i = 0; i < 3; i++) {
        let tempPoints = [];
        switch (i) {
            case 0:
                tempPoints.push(entry.x, 0, entry.z);
                tempPoints.push(target.x, 0, target.z);
                break;
            case 1:
                tempPoints.push(entry.x, entry.y, 0);
                tempPoints.push(target.x, target.y, 0);
                break;
            case 2:
                tempPoints.push(0, entry.y, entry.z);
                tempPoints.push(0, target.y, target.z);
                break;
        }

        lineArray[i].geometry.setPositions(tempPoints);
        lineArray[i].geometry.NeedsUpdate = true;
        lineArray[i].visible = true;
    }
}

// Handle mouse events (Click and update the helper point)
function getMousePos(event) {
    if (!isSelectingPoint && !(mesauringStatus == 1 || mesauringStatus == 2)) return;

    if (count > 0) {
        count--;
        return;
    }

    count = 10;
    const containerID = Number(event.target.parentElement.id.split('-')[2]);
    const rect = document.getElementById(`nifti-container-${containerID}`).getBoundingClientRect();
    const raycaster = new THREE.Raycaster();

    let pointer = new THREE.Vector2();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.layers.set(containerID + 1);
    raycaster.setFromCamera(pointer, cameras[containerID]);

    const intersects = raycaster.intersectObject(planes[containerID]);
    if (intersects.length === 0) return;

    currPointPos.copy(intersects[0].point);

    switch (containerID) {
        case 0:
            currPointPos.y = Math.round(sliders[0].value - (header.dims[3] - 1) / 2);
            break;
        case 1:
            currPointPos.z = Math.round(sliders[1].value - (header.dims[2] - 1) / 2);
            break;
        case 2:
            currPointPos.x = Math.round(sliders[2].value - (header.dims[1] - 1) / 2);
            break;
    }

    const newSliderValues =
        [
            Math.round((header.dims[3] - 1) / 2 + currPointPos.y),
            Math.round((header.dims[2] - 1) / 2 + currPointPos.z),
            Math.round((header.dims[1] - 1) / 2 + currPointPos.x)
        ];

    const pointFloat = new Float32Array(currPointPos);
    // console.log(pointFloat);
    for (let i = 0; i < 3; i++) {
        if (sliders[i].value !== newSliderValues[i] && i !== containerID) {
            sliders[i].value = newSliderValues[i];
            sliders[i].oninput();
        }
    }

    update3DPointObject(pointFloat);

    setVisPointsFromPos(currPointPos);
}

function onMouseMove(evt) {
    if (isMouseDown) {
        getMousePos(evt);
    }
}
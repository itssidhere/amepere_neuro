import * as THREE from 'three';
import { OrbitControls } from 'orbit-control';
import { visability3DToggle, setPointVisability, updatePointObject, update3DLine } from './model_loader.js'
import { LineGeometry } from 'line-geometry';
import { LineMaterial } from 'line-material';
import { Line2 } from 'line2';

let colors = {};
let names = {};
let visibilities = {};

fetch('/static/json/config.json')
    .then((response) => response.json())
    .then((json) => {
        colors = json['colors'];
        names = json['names'];
    });


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

var header, typedImg, typedSeg;
var normFactor, contrast = 1.2;

const scene = new THREE.Scene();

const containers = [];
const cameras = [];
const renderers = [];
const sliders = [];
const texture_data = [];
const textures = [];
const meshes = [];

const segmentation_data = [];
const segmentation_textures = [];

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const refPoints = [];
const currPoint = new THREE.Vector3();

const entryPoint = new THREE.Vector3();
const targetPoint = new THREE.Vector3();

const refLineMeshes = [];

let count = 10;
let isSelectingPoint = false;

document.getElementById('btn-entry').addEventListener('click', setEntryPoint);
document.getElementById('btn-target').addEventListener('click', setTargetPoint);

function getMousePos(event) {
    if (!isSelectingPoint) return;
    if (count > 0) {
        count--;
        return;
    }
    count = 10;
    const containerID = Number(event.target.parentElement.id.split('-')[2]);

    const rect = document.getElementById(`nifti-container-${containerID}`).getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.layers.set(containerID + 1);
    raycaster.setFromCamera(pointer, cameras[containerID]);

    const intersects = raycaster.intersectObject(meshes[containerID]);
    if (intersects.length === 0) return;

    currPoint.copy(intersects[0].point);

    switch (containerID) {
        case 0:
            currPoint.y = Math.round(sliders[0].value - (header.dims[3] - 1) / 2);
            break;
        case 1:
            currPoint.z = Math.round(sliders[1].value - (header.dims[2] - 1) / 2);
            break;
        case 2:
            currPoint.x = Math.round(sliders[2].value - (header.dims[1] - 1) / 2);
            break;
    }

    const newSliderValues =
        [
            Math.round((header.dims[3] - 1) / 2 + currPoint.y),
            Math.round((header.dims[2] - 1) / 2 + currPoint.z),
            Math.round((header.dims[1] - 1) / 2 + currPoint.x)
        ];

    const pointFloat = new Float32Array(currPoint);
    // console.log(pointFloat);
    for (let i = 0; i < 3; i++) {
        if (sliders[i].value !== newSliderValues[i] && i !== containerID) {
            sliders[i].value = newSliderValues[i];
            sliders[i].oninput();
        }

        refPoints[i].position.set(pointFloat[0], pointFloat[1], pointFloat[2]);
        switch (i) {
            case 0:
                refPoints[i].position.y = 0;
                break;
            case 1:
                refPoints[i].position.z = 0;
                break;
            case 2:
                refPoints[i].position.x = 0;
                break;
        }
    }
    updatePointObject(pointFloat);
}

function updateLine(entry, target) {
    const points = [];
    points.push(entry.x, entry.y, entry.z);
    points.push(target.x, target.y, target.z);

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
        refLineMeshes[i].geometry.setPositions(tempPoints);
        refLineMeshes[i].geometry.NeedsUpdate = true;
        refLineMeshes[i].visible = true;
    }

    update3DLine(points);
}

var isMouseDown = false;

function onMouseMove(evt) {
    if (isMouseDown) {
        getMousePos(evt);
    }
}

for (let i = 0; i <= 2; i++) {
    containers.push(document.getElementById(`nifti-container-${i}`));
    cameras.push(new THREE.PerspectiveCamera(75, containers[i].clientWidth / containers[i].clientHeight, 0.1, 1000));
    cameras[i].layers.enable(i + 1);

    if (i === 0) {
        cameras[i].rotation.x = - Math.PI / 2;
    }
    else if (i === 2) {
        cameras[i].rotation.y = Math.PI / 2;
    }

    renderers.push(new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    renderers[i].setSize(containers[i].clientWidth, containers[i].clientHeight);  // Adjust size to fit the grid item.
    renderers[i].setClearColor(0x000000); // Set a black background color
}

export async function loadNIFTI2D(path, seg) {

    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }

    typedSeg = undefined;

    document.getElementById('left-bar').innerHTML = '';

    if (seg === true) {
        await readSegmentation(path.replace('.nii.gz', '_synthseg.nii.gz'));
        await readImage(path.replace('.nii.gz', '_resampled.nii.gz'));
    } else {
        await readImage(path);
    }


    console.log("loadNIFTI2D done, segmentation: ", seg);
}

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

                        typedSeg = createTypedData(segHeader.datatypeCode, segImage)

                        displaySegmentationList();
                    }
                }
            };
            reader.readAsArrayBuffer(blob);
        });
    return;
}

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

function readNIFTI(data) {
    if (nifti.isCompressed(data)) {
        data = nifti.decompress(data);
    }

    if (nifti.isNIFTI(data)) {
        header = nifti.readHeader(data);
        console.log("NIFTI", header);
        let niftiImage = nifti.readImage(header, data);

        typedImg = createTypedData(header.datatypeCode, niftiImage);

        let max = 0;

        for (let i = 0; i < typedImg.length; i++) {
            if (typedImg[i] > max) max = typedImg[i];
        }

        normFactor = 255 / max;

        // scene.add(new THREE.AxesHelper(100));

        for (let i = 0; i <= 2; i++) {
            let width, height;
            if (i === 0) { width = header.dims[1]; height = header.dims[2]; }
            else if (i === 1) { width = header.dims[1]; height = header.dims[3]; }
            else { width = header.dims[2]; height = header.dims[3]; }

            texture_data[i] = new Uint8Array(4 * width * height);
            textures[i] = new THREE.DataTexture(texture_data[i], width, height);
            const material = new THREE.MeshBasicMaterial({ map: textures[i] });
            const geometry = new THREE.PlaneGeometry(width, height);
            meshes[i] = new THREE.Mesh(geometry, material);
            meshes[i].layers.set(i + 1);
            meshes[i].name = String(i);

            segmentation_data[i] = new Uint8Array(4 * width * height);
            segmentation_textures[i] = new THREE.DataTexture(segmentation_data[i], width, height);
            const segmentation_material = new THREE.MeshBasicMaterial({ map: segmentation_textures[i], transparent: true, opacity: 0.5 });
            const segmentation_geometry = new THREE.PlaneGeometry(width, height);
            const segmentation_mesh = new THREE.Mesh(segmentation_geometry, segmentation_material);
            segmentation_mesh.layers.set(i + 1);

            const refPointGeometry = new THREE.SphereGeometry(3, 32, 32);
            const refPointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            refPoints.push(new THREE.Mesh(refPointGeometry, refPointMaterial));
            refPoints[i].layers.set(i + 1);
            refPoints[i].visible = false;
            scene.add(refPoints[i]);

            const refLineGeometry = new LineGeometry();
            const refLineMaterial = new LineMaterial({ color: 0x00ff00, linewidth: 0.01 });
            refLineMeshes.push(new Line2(refLineGeometry, refLineMaterial));
            refLineMeshes[i].layers.set(i + 1);
            refLineMeshes[i].visible = false;
            scene.add(refLineMeshes[i]);
            refLineMeshes[i].renderOrder = 0 || 999
            refLineMeshes[i].material.depthTest = false

            // cameras[i].position.set(header.qoffset_x, 0, header.qoffset_z);

            if (i === 0) {
                const ratio = (header.pixDims[2]) / (header.pixDims[1]);
                geometry.scale(1, ratio, 1);
                segmentation_geometry.scale(1, ratio, 1);
                meshes[i].rotation.x = - Math.PI / 2;
                segmentation_mesh.rotation.x = - Math.PI / 2;
                cameras[i].position.y = Math.sqrt(Math.pow(header.dims[1] / 2, 2) + Math.pow(header.dims[2] / 2, 2));
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
                meshes[i].rotation.y = Math.PI / 2;
                segmentation_mesh.rotation.y = Math.PI / 2;
                cameras[i].position.x = Math.sqrt(Math.pow(header.dims[2] / 2, 2) + Math.pow(header.dims[3] / 2, 2));
            }

            // mesh.position.set(header.qoffset_x, header.qoffset_y, header.qoffset_z);
            // segmentation_mesh.position.set(header.qoffset_x, header.qoffset_y, header.qoffset_z);

            scene.add(segmentation_mesh);
            scene.add(meshes[i]);

            sliders[i] = document.getElementById(`nifti-slider-${i}`);
            sliders[i].max = header.dims[3 - i] - 1;
            sliders[i].value = Math.round((header.dims[3 - i] - 1) / 2);
            sliders[i].oninput = function () {
                updateSliceView(i, sliders[i].value);
            }

            containers[i].appendChild(renderers[i].domElement);
            const control = new OrbitControls(cameras[i], renderers[i].domElement);
            control.enableRotate = false;
        }
        refreshDisplay();
    }
}

// Helper function to update a specific slice view
function updateSliceView(index, slice) {
    slice = Number(slice);
    let unit = ["", "m", "mm", "um"];

    const slider_value = Math.round(slice * header.pixDims[3 - index]);

    document.getElementById(`nifti-value-${index}`).innerHTML = slider_value + ' ' + unit[header.xyzt_units];

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

    let imageData = new Uint8Array(4 * cols * rows);
    let segmentationData = new Uint8Array(4 * cols * rows);

    // console.log(segmentation)

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
            if (visibilities[Number(segValue)] === true) {
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

    // console.log(texture_data[index].length, imageData.length)
    texture_data[index].set(imageData);
    textures[index].needsUpdate = true;

    segmentation_data[index].set(segmentationData);
    segmentation_textures[index].needsUpdate = true;

    containers[index].addEventListener('mousedown', (evt) => { isMouseDown = true; onMouseMove(evt) });
    containers[index].addEventListener('mousemove', onMouseMove);
    containers[index].addEventListener('mouseup', () => isMouseDown = false);

    window.onresize = function () {
        cameras[index].aspect = containers[index].clientWidth / containers[index].clientHeight;
        cameras[index].updateProjectionMatrix();
        renderers[index].setSize(containers[index].clientWidth, containers[index].clientHeight);
    }

    function render() {
        requestAnimationFrame(render);
        renderers[index].render(scene, cameras[index]);
    }

    render();
}

function refreshDisplay() {
    for (let i = 0; i < 3; i++) {
        updateSliceView(i, sliders[i].value);
    }
}

function visability2DToggle() {
    refreshDisplay();
}

function displaySegmentationList() {
    const leftBar = document.getElementById('left-bar');
    leftBar.innerHTML = '';

    let segmentItems = [];

    let existingSegments = [];

    for (let i = 0; i < typedSeg.length; i++) {
        if (typedSeg[i] == 0 || existingSegments.includes(typedSeg[i])) continue;
        {
            const id = Number(typedSeg[i]);
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
            button.addEventListener('click', () => visabilityToggle(id));

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

            segmentItems[id] = segmentDiv;
            existingSegments.push(typedSeg[i]);
        }
    }

    segmentItems.forEach(segment => {
        leftBar.appendChild(segment);
    });
}

function refreshSegmentationList(id, visability) {
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

function visabilityToggle(id) {
    visibilities[id] = !visibilities[id];

    visability2DToggle();
    visability3DToggle(id, visibilities[id]);
    refreshSegmentationList(id, visibilities[id]);

    localStorage.setItem('visibilities', JSON.stringify(visibilities));
}

export function getVisability(id) {
    return visibilities[id];
}

function setEntryPoint() {
    setPoint(true);
}

function setTargetPoint() {
    setPoint(false);
}

function setPoint(isEntry) {
    const btn = isEntry ? document.getElementById('btn-entry') : document.getElementById('btn-target');
    isSelectingPoint = !isSelectingPoint;
    setPointVisability(isSelectingPoint);
    for (let i = 0; i < 3; i++) {
        refPoints[i].visible = isSelectingPoint;
    }

    if (isSelectingPoint) {
        btn.classList.remove('bg-blue-500')
        btn.classList.remove('hover:bg-blue-700');
        btn.classList.add('bg-green-500');
        btn.classList.add('hover:bg-green-700');
        btn.innerText = btn.innerText.replace('Set', 'Save');

        if (isEntry) {
            currPoint.set(entryPoint.x, entryPoint.y, entryPoint.z);
        } else {
            currPoint.set(targetPoint.x, targetPoint.y, targetPoint.z);
        }

        updatePointObject(currPoint);
        for (let i = 0; i < 3; i++) {
            refPoints[i].position.set(currPoint.x, currPoint.y, currPoint.z);
            switch (i) {
                case 0:
                    refPoints[i].position.y = 0;
                    break;
                case 1:
                    refPoints[i].position.z = 0;
                    break;
                case 2:
                    refPoints[i].position.x = 0;
                    break;
            }
        }

    } else {
        btn.classList.remove('bg-green-500');
        btn.classList.remove('hover:bg-green-700');
        btn.classList.add('bg-blue-500')
        btn.classList.add('hover:bg-blue-700');
        btn.innerText = btn.innerText.replace('Save', 'Set');

        if (isEntry) {
            entryPoint.copy(currPoint);
            if (targetPoint.x !== 0 || targetPoint.y !== 0 || targetPoint.z !== 0) {
                updateLine(entryPoint, targetPoint);
            }
        } else {
            targetPoint.copy(currPoint);
            if (entryPoint.x !== 0 || entryPoint.y !== 0 || entryPoint.z !== 0) {
                updateLine(entryPoint, targetPoint);
            }
        }
    }
}
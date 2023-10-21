import * as THREE from 'three';
import { OrbitControls } from 'orbit-control';

let colors = {};

fetch('/static/json/config.json')
    .then((response) => response.json())
    .then((json) => { colors = json['colors']; });

var header, typedData, segmentation;
var normFactor, contrast = 1.2;

const scene = new THREE.Scene();

const containers = [];
const cameras = [];
const renderers = [];
const sliders = [];
const texture_data = [];
const textures = [];

const segmentation_data = [];
const segmentation_textures = [];
const segmentation_on = new Array(70).fill(true);


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
    scene.clear();

    if (seg === true)
    {
        await readSegmentation(path.replace('.nii.gz', '_synthseg.nii.gz'));
        await readImage(path.replace('.nii.gz', '_resampled.nii.gz'));
    } else 
    {
        await readImage(path);
    }

    
    console.log("loadNIFTI2D done, segmentation: ", seg);
}

async function readImage(path) 
{
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
                        let segImage = nifti.readImage(segHeader, data);

                        switch (segHeader.datatypeCode) {
                            case nifti.NIFTI1.TYPE_UINT8:
                                segmentation = new Uint8Array(segImage);
                                break;
                            case nifti.NIFTI1.TYPE_INT16:
                                segmentation = new Int16Array(segImage);
                                break;
                            case nifti.NIFTI1.TYPE_INT32:
                                segmentation = new Int32Array(segImage);
                                break;
                            case nifti.NIFTI1.TYPE_FLOAT32:
                                segmentation = new Float32Array(segImage);
                                break;
                            case nifti.NIFTI1.TYPE_FLOAT64:
                                segmentation = new Float64Array(segImage);
                                break;
                            case nifti.NIFTI1.TYPE_INT8:
                                segmentation = new Int8Array(segImage);
                                break;
                            case nifti.NIFTI1.TYPE_UINT16:
                                segmentation = new Uint16Array(segImage);
                                break;
                            case nifti.NIFTI1.TYPE_UINT32:
                                segmentation = new Uint32Array(segImage);
                                break;
                            default:
                                return;
                        }
                        // readImage(path.replace('_synthseg.nii.gz', '.nii.gz'));
                        // console.log(segmentation);
                    }
                }
            };
            reader.readAsArrayBuffer(blob);
        });
    return;
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
        // console.log(header);
        let niftiImage = nifti.readImage(header, data);

        switch (header.datatypeCode) {
            case nifti.NIFTI1.TYPE_UINT8:
                typedData = new Uint8Array(niftiImage);
                break;
            case nifti.NIFTI1.TYPE_INT16:
                typedData = new Int16Array(niftiImage);
                break;
            case nifti.NIFTI1.TYPE_INT32:
                typedData = new Int32Array(niftiImage);
                break;
            case nifti.NIFTI1.TYPE_FLOAT32:
                typedData = new Float32Array(niftiImage);
                break;
            case nifti.NIFTI1.TYPE_FLOAT64:
                typedData = new Float64Array(niftiImage);
                break;
            case nifti.NIFTI1.TYPE_INT8:
                typedData = new Int8Array(niftiImage);
                break;
            case nifti.NIFTI1.TYPE_UINT16:
                typedData = new Uint16Array(niftiImage);
                break;
            case nifti.NIFTI1.TYPE_UINT32:
                typedData = new Uint32Array(niftiImage);
                break;
            default:
                return;
        }

        let max = 0;

        for (let i = 0; i < typedData.length; i++) {
            if (typedData[i] > max) max = typedData[i];
        }

        normFactor = 255 / max;

        for (let i = 0; i <= 2; i++) {
            let width, height;
            if (i === 0) { width = header.dims[1]; height = header.dims[2]; }
            else if (i === 1) { width = header.dims[1]; height = header.dims[3]; }
            else { width = header.dims[2]; height = header.dims[3]; }

            texture_data[i] = new Uint8Array(4 * width * height);
            textures[i] = new THREE.DataTexture(texture_data[i], width, height);
            const material = new THREE.MeshBasicMaterial({ map: textures[i] });
            const geometry = new THREE.PlaneGeometry(width, height);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.layers.set(i + 1);

            segmentation_data[i] = new Uint8Array(4 * width * height);
            segmentation_textures[i] = new THREE.DataTexture(segmentation_data[i], width, height);
            const segmentation_material = new THREE.MeshBasicMaterial({ map: segmentation_textures[i] , transparent : true, opacity: 0.5 });
            const segmentation_geometry = new THREE.PlaneGeometry(width, height);
            const segmentation_mesh = new THREE.Mesh(segmentation_geometry, segmentation_material);
            segmentation_mesh.layers.set(i + 1);

            if (i === 0) 
            {
                geometry.scale(1, 1/header.pixDims[0], 1);
                segmentation_geometry.scale(1, 1/header.pixDims[0], 1);
                mesh.rotation.x = - Math.PI / 2;
                segmentation_mesh.rotation.x = - Math.PI / 2;
                cameras[i].position.y = Math.sqrt(Math.pow(header.dims[1] / 2, 2) + Math.pow(header.dims[2] / 2, 2));
            } 
            else if (i === 1) 
            {
                geometry.scale(1, 1 / header.pixDims[1], 1);
                segmentation_geometry.scale(1, 1 / header.pixDims[1], 1);
                cameras[i].position.z = Math.sqrt(Math.pow(header.dims[1] / 2, 2) + Math.pow(header.dims[3] / 2, 2));
            }

            else if (i === 2) {
                geometry.scale(1, 1 / header.pixDims[2], 1);
                segmentation_geometry.scale(1, 1 / header.pixDims[2], 1);
                mesh.rotation.y = Math.PI / 2;
                segmentation_mesh.rotation.y = Math.PI / 2;
                cameras[i].position.x = Math.sqrt(Math.pow(header.dims[2] / 2, 2) + Math.pow(header.dims[3] / 2, 2));
            }

            scene.add(segmentation_mesh);
            scene.add(mesh);

            sliders[i] = document.getElementById(`nifti-slider-${i}`);
            if (i === 0) { 
                sliders[i].max = header.dims[3] - 1; 
                sliders[i].value = Math.round((header.dims[3] - 1) / 2);
                sliders[i].oninput = function () {
                    displayAxial(sliders[i].value);
                }
            } else if (i === 1) {
                sliders[i].max = header.dims[1] - 1;
                sliders[i].value = Math.round((header.dims[1] - 1) / 2);
                sliders[i].oninput = function () {
                    displayCoronal(sliders[i].value);
                }
            } else if (i === 2) {
                sliders[i].max = header.dims[2] - 1;
                sliders[i].value = Math.round((header.dims[2] - 1) / 2);
                sliders[i].oninput = function () {
                    displaySagittal(sliders[i].value);
                }
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

    document.getElementById(`nifti-value-${index}`).innerHTML = slice;

    let cols, rows, sliceOffset;

    if (index === 0) {
        cols = header.dims[1];
        rows = header.dims[2];
    } else if (index === 1) {
        cols = header.dims[1];
        rows = header.dims[3];
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

            let value = typedData[offset] * normFactor;
            value = Math.round(contrast * (value - 128) + 128);
            if (value < 0) value = 0;
            let pixelOffset = (rowOffset + col) * 4;
            
            imageData[pixelOffset] = value;
            imageData[pixelOffset + 1] = value;
            imageData[pixelOffset + 2] = value;
            imageData[pixelOffset + 3] = 0xFF;

            if (segmentation === undefined) continue;
            
            let segValue = segmentation[offset];
            // console.log(segValue);
            if (segmentation_on[Number(segValue)] === true) {
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

// Now call the updateSliceView function for each slice view
function displayAxial(slice) {
    updateSliceView(0, slice);
}

function displayCoronal(slice) {
    updateSliceView(1, slice);
}

function displaySagittal(slice) {
    updateSliceView(2, slice);
}

function refreshDisplay()
{
    displayAxial(sliders[0].value);
    displayCoronal(sliders[1].value);
    displaySagittal(sliders[2].value);
}

export function visability2DToggle(id) {
    segmentation_on[id] = !segmentation_on[id];
    refreshDisplay();
}
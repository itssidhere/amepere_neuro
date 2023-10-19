import * as THREE from 'three';

const slider_value_1 = document.getElementById('nifti-value-1');
const container_1 = document.getElementById('nifti-container-1');

const slider_value_2 = document.getElementById('nifti-value-2');
const container_2 = document.getElementById('nifti-container-2');

const slider_value_3 = document.getElementById('nifti-value-3');
const container_3 = document.getElementById('nifti-container-3');

const scene = new THREE.Scene();

const camera_1 = new THREE.PerspectiveCamera(75, container_1.clientWidth / container_1.clientHeight, 0.1, 1000);
camera_1.position.z = 400;

const camera_2 = new THREE.PerspectiveCamera(75, container_1.clientWidth / container_1.clientHeight, 0.1, 1000);
camera_2.position.y = 10000;
camera_2.position.z = 400;

const camera_3 = new THREE.PerspectiveCamera(75, container_1.clientWidth / container_1.clientHeight, 0.1, 1000);
camera_3.position.y = 20000;
camera_3.position.z = 400;

const renderer_1 = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer_1.setSize(container_1.clientWidth, container_1.clientHeight);  // Adjust size to fit the grid item.
renderer_1.setClearColor(0x000000); // Set a black background color

const renderer_2 = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer_2.setSize(container_2.clientWidth, container_2.clientHeight);  // Adjust size to fit the grid item.
renderer_2.setClearColor(0x000000); // Set a black background color

const renderer_3 = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer_3.setSize(container_3.clientWidth, container_3.clientHeight);  // Adjust size to fit the grid item.
renderer_3.setClearColor(0x000000); // Set a black background color

container_1.appendChild(renderer_1.domElement);
container_2.appendChild(renderer_2.domElement);
container_3.appendChild(renderer_3.domElement);


var texture_data_1, texture_1;
var texture_data_2, texture_2;
var texture_data_3, texture_3;

var header, typedData;


export function loadNIFTI2D(path) {    
    fetch(path)
        .then(res => res.blob()) // Gets the response and returns it as a blob
        .then(file => {
            var blob = makeSlice(file, 0, file.size);
            var reader = new FileReader();

            reader.onloadend = function (evt) {
                if (evt.target.readyState === FileReader.DONE) {
                    readNIFTI(file.name, evt.target.result);
                }
            };

            reader.readAsArrayBuffer(blob);
        });
}

function makeSlice(file, start, length) {
    var fileType = (typeof File);

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

function readNIFTI(name, data) {
    var niftiImage = null;

    if (nifti.isCompressed(data)) {
        data = nifti.decompress(data);
    }

    if (nifti.isNIFTI(data)) {
        header = nifti.readHeader(data);
        // console.log(header.toFormattedString());
        niftiImage = nifti.readImage(header, data);

        // Create a geometry for the volume
        texture_data_1 = new Uint8Array(4 * header.dims[1] * header.dims[2]);
        texture_1 = new THREE.DataTexture(texture_data_1, header.dims[1], header.dims[2]);
        texture_1.flipY = true;
        const material_1 = new THREE.MeshBasicMaterial({map: texture_1});
        const geometry_1 = new THREE.PlaneGeometry(header.dims[1], header.dims[2]);
        const mesh_1 = new THREE.Mesh(geometry_1, material_1);
        scene.add(mesh_1);

        texture_data_2 = new Uint8Array(4 * header.dims[1] * header.dims[3]);
        texture_2 = new THREE.DataTexture(texture_data_2, header.dims[1], header.dims[3]);
        const material_2 = new THREE.MeshBasicMaterial({map: texture_2});
        const geometry_2 = new THREE.PlaneGeometry(header.dims[1], header.dims[3]);
        const mesh_2 = new THREE.Mesh(geometry_2, material_2);
        mesh_2.position.y = 10000;
        scene.add(mesh_2);

        texture_data_3 = new Uint8Array(4 * header.dims[2] * header.dims[3]);
        texture_3 = new THREE.DataTexture(texture_data_3, header.dims[2], header.dims[3]);
        const material_3 = new THREE.MeshBasicMaterial({map: texture_3});
        const geometry_3 = new THREE.PlaneGeometry(header.dims[2], header.dims[3]);
        const mesh_3 = new THREE.Mesh(geometry_3, material_3);
        mesh_3.position.y = 20000;
        scene.add(mesh_3);

        // convert raw data to typed array based on nifti datatype
        if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
            typedData = new Uint8Array(niftiImage);
        } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
            typedData = new Int16Array(niftiImage);
        } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
            typedData = new Int32Array(niftiImage);
        } else if (header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
            typedData = new Float32Array(niftiImage);
        } else if (header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
            typedData = new Float64Array(niftiImage);
        } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
            typedData = new Int8Array(niftiImage);
        } else if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
            typedData = new Uint16Array(niftiImage);
        } else if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
            typedData = new Uint32Array(niftiImage);
        } else {
            return;
        }
        
        const slider_1 = document.getElementById('nifti-slider-1');
        slider_1.max = header.dims[3] - 1;
        slider_1.value = Math.round((header.dims[3] - 1) / 2);
        slider_1.oninput = function () {
            displayAxial(slider_1.value);
        };

        const slider_2 = document.getElementById('nifti-slider-2');
        slider_2.max = header.dims[1] - 1;
        slider_2.value = Math.round((header.dims[1] - 1) / 2);
        slider_2.oninput = function () {
            displayCoronal(slider_2.value);
        };

        const slider_3 = document.getElementById('nifti-slider-3');
        slider_3.max = header.dims[2] - 1;
        slider_3.value = Math.round((header.dims[2] - 1) / 2);
        slider_3.oninput = function () {
            displaySagittal(slider_3.value);
        };

        displayAxial(slider_1.value);
        displayCoronal(slider_2.value);
        displaySagittal(slider_3.value);
    }
}

function displayAxial(slice) {
    slider_value_1.innerHTML = slice;

    var cols = header.dims[1];
    var rows = header.dims[2];

    // draw pixels
    let imageData = new Uint8Array(4 * cols * rows);
    let sliceOffset = cols * rows * slice;

    for (var row = 0; row < rows; row++) {
        var rowOffset = row * cols;

        for (var col = 0; col < cols; col++) {
            var offset = sliceOffset + rowOffset + col;
            var value = typedData[offset];

            imageData[(rowOffset + col) * 4] = value;
            imageData[(rowOffset + col) * 4 + 1] = value;
            imageData[(rowOffset + col) * 4 + 2] = value;
            imageData[(rowOffset + col) * 4 + 3] = 0xFF;
        }
    }

    texture_data_1.set(imageData);
    texture_1.needsUpdate = true;

    window.onresize = function () {
        camera_1.aspect = container_1.clientWidth / container_1.clientHeight;
        camera_1.updateProjectionMatrix();
        renderer_1.setSize(container_1.clientWidth, container_1.clientHeight);
    }

    function render() {
        requestAnimationFrame(render);
        renderer_1.render(scene, camera_1);
    }

    render();
}


function displayCoronal(slice) {
    slice = Number(slice);
    slider_value_2.innerHTML = slice;

    var cols = header.dims[2];
    var rows = header.dims[3];

    // draw pixels
    let imageData = new Uint8Array(4 * header.dims[2] * header.dims[3]);
    let sliceOffset = header.dims[2] * header.dims[1];

    for (var row = 0; row < rows; row++) {
        var rowOffset = row * cols;

        for (var col = 0; col < cols; col++) {
            var offset = col + slice * cols + row * sliceOffset;
            var value = typedData[offset];

            imageData[(rowOffset + col) * 4] = value;
            imageData[(rowOffset + col) * 4 + 1] = value;
            imageData[(rowOffset + col) * 4 + 2] = value;
            imageData[(rowOffset + col) * 4 + 3] = 0xFF;
        }
    }


    texture_data_2.set(imageData);
    texture_2.needsUpdate = true;

    window.onresize = function () {
        camera_2.aspect = container_2.clientWidth / container_2.clientHeight;
        camera_2.updateProjectionMatrix();
        renderer_2.setSize(container_2.clientWidth, container_2.clientHeight);
    }

    function render() {
        requestAnimationFrame(render);
        renderer_2.render(scene, camera_2);
    }

    render();
}

function displaySagittal(slice) {
    slice = Number(slice);
    slider_value_3.innerHTML = slice;

    var cols = header.dims[1];
    var rows = header.dims[3];

    // draw pixels
    let imageData = new Uint8Array(4 * header.dims[1] * header.dims[3]);
    let sliceOffset = header.dims[2] * header.dims[1];

    for (var row = 0; row < rows; row++) {
        var rowOffset = row * cols;

        for (var col = 0; col < cols; col++) {
            var offset = slice + col * header.dims[2] + row * sliceOffset;
            var value = typedData[offset];

            imageData[(rowOffset + col) * 4] = value;
            imageData[(rowOffset + col) * 4 + 1] = value;
            imageData[(rowOffset + col) * 4 + 2] = value;
            imageData[(rowOffset + col) * 4 + 3] = 0xFF;
        }
    }


    texture_data_3.set(imageData);
    texture_3.needsUpdate = true;

    window.onresize = function () {
        camera_3.aspect = container_3.clientWidth / container_3.clientHeight;
        camera_3.updateProjectionMatrix();
        renderer_3.setSize(container_3.clientWidth, container_3.clientHeight);
    }

    function render() {
        requestAnimationFrame(render);
        renderer_3.render(scene, camera_3);
    }

    render();
}


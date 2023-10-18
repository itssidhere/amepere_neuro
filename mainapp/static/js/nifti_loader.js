import * as THREE from 'three';

const slider_value = document.getElementById('nifti-value-1');
const container = document.getElementById('nifti-container-1');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.y = 50;
camera.position.z = 300;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);  // Adjust size to fit the grid item.
renderer.setClearColor(0x000000); // Set a black background color


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
    const slider = document.getElementById('nifti-slider-1');

    var niftiHeader = null,
        niftiImage = null,
        niftiExt = null;

    if (nifti.isCompressed(data)) {
        data = nifti.decompress(data);
    }

    if (nifti.isNIFTI(data)) {
        niftiHeader = nifti.readHeader(data);
        // console.log(niftiHeader.toFormattedString());
        niftiImage = nifti.readImage(niftiHeader, data);

        if (nifti.hasExtension(niftiHeader)) {
            niftiExt = nifti.readExtensionData(niftiHeader, data);
        }
        
        slider.max = niftiHeader.dims[3] - 1;
        slider.value = Math.round((niftiHeader.dims[3] - 1) / 2);
        slider.oninput = function () {
            displayMRI(slider.value, niftiHeader, niftiImage);
        };

        displayMRI(slider.value, niftiHeader, niftiImage);
    }
}

// Define a function to display the NIFTI volume
function displayMRI(slice, header, image) {
    slider_value.innerHTML = slice;

    container.innerHTML = "";

    container.appendChild(renderer.domElement);

    var cols = header.dims[1];
    var rows = header.dims[2];

    // convert raw data to typed array based on nifti datatype
    var typedData;
    if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
        typedData = new Uint8Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
        typedData = new Int16Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
        typedData = new Int32Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
        typedData = new Float32Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
        typedData = new Float64Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
        typedData = new Int8Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
        typedData = new Uint16Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
        typedData = new Uint32Array(image);
    } else {
        return;
    }


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

    const texture = new THREE.DataTexture(imageData, cols, rows);
    texture.needsUpdate = true;

    // Create a geometry for the volume
    // const texture = new THREE.Data3DTexture(image, header.dims[0], header.dims[1], header.dims[2]);
    const geometry = new THREE.PlaneGeometry(header.dims[1], header.dims[2], header.dims[3]);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

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
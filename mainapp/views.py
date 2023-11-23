from django.shortcuts import render
import os
from pathlib import Path
from .models import MriFile, StlFile
from django.http import JsonResponse
from . import mri_seg
import json
import datetime
import nibabel as nib
import numpy as np
import socketio
import subprocess
from getpass import getpass

import json

sio = socketio.Client()
# sio.connect("http://127.0.0.1:8001")


def index(request):
    model_names = MriFile.objects.all().values_list('name', flat=True)
    return render(request, "index.html", {'model_names' :  model_names})

# def index(request):
#     BASE_DIR = Path(__file__).resolve().parent
#     STL_DIR = BASE_DIR / "static" / "STLs"
#     stl_files = [f for f in os.listdir(STL_DIR) if f.endswith(".stl")]
#     model_names = MriFile.objects.all().values_list('name', flat=True)
#     return render(request, "index.html", {"stl_files": stl_files, 'model_names' :  model_names})


def uploadMriFiles(request):
    if request.method == "POST":
        uploaded_file = request.FILES.get('file')
        if uploaded_file:
            #append timestamp in milliseconds to the file name
            #change the name of the uploaded file

            file_name = str(datetime.datetime.now().microsecond) + "_" + uploaded_file.name 
            uploaded_file.name = file_name
            new_file = MriFile(file=uploaded_file, name= file_name)
            new_file.save()

            img = nib.load(new_file.file.path)

            orig_ornt = nib.io_orientation(img.affine)
            targ_ornt = nib.orientations.axcodes2ornt("LPS")
            transform = nib.orientations.ornt_transform(orig_ornt, targ_ornt)

            img_orient = img.as_reoriented(transform)

            nib.save(img_orient, new_file.file.path)
            
            # full_path = new_file.file.path
            
            return JsonResponse({"success": True, "file": file_name})
        else:
            return JsonResponse({'status': 'error', 'message': 'No file upload'})
        
    return JsonResponse({'status': 'error', 'message': 'No file upload'})

def uploadStlFiles(request):
    if request.method == "POST":
        uploaded_file = request.FILES.get('file')
        if uploaded_file:
            #append timestamp in milliseconds to the file name
            #change the name of the uploaded file

            file_name = str(datetime.datetime.now().microsecond) + "_" + uploaded_file.name 
            uploaded_file.name = file_name
            new_file = StlFile(file=uploaded_file, name= file_name)
            new_file.save()

            # purge old files in the STL database
            if StlFile.objects.count() > 1:
                oldest_file = StlFile.objects.order_by('uploaded_at').first()
                oldest_file.delete()        

            _, model_path = getStlFileFromId(file_name)
            
            return JsonResponse({"success": True, "model_path": str(model_path)})
        else:
            return JsonResponse({'status': 'error', 'message': 'No file upload'})
        
    return JsonResponse({'status': 'error', 'message': 'No file upload'})

def segment_mri(request):
    #pick the last uploaded file
    model_name = json.loads(request.body)['model_name']
    try:
        print('------------------ Segmenting MRI ------------------')
        model = MriFile.objects.get(name=model_name)
        path = model.file.path
        print("------------------", path, "------------------")
        # result = run_synthseg.apply_async( (last_uploaded_file.file.path, ) )
        OUTPUT_FOLDER = os.path.dirname(path)
        OUTPUT_FILE = path.replace(".nii.gz", "_synthseg.nii.gz")

        print(OUTPUT_FOLDER, OUTPUT_FILE)

        if os.path.exists(OUTPUT_FILE):
            print('------------------ MRI already segmented ------------------')
            return JsonResponse({'status': 'success', 'message': 'MRI already segmented'})


        mri_seg.SegmentMRI(path, OUTPUT_FOLDER)
        # print(result)

        print('------------------ Finish Segmenting MRI ------------------')

    except Exception as e:
        print(e)
        print('------------------ Error Segmenting MRI ------------------')

    return JsonResponse({'status': 'success', 'message': 'MRI segmented successfully'})


def run_3d_slicer(request):
    model_name = json.loads(request.body)['model_name']
    
    try:
        print('------------------ Running 3D Slicer ------------------')
        model = MriFile.objects.get(name=model_name)
        path = model.file.path
        OUTPUT_FILE = path.replace(".nii.gz", "_synthseg.nii.gz")
        Seg_Stl_PATH = os.path.join(os.path.dirname(os.path.realpath(__file__)), "seg_stl.py")
        Slicer_PATH = os.getenv("SLICER_PATH")

        TEMP_FILE = OUTPUT_FILE.replace(".nii.gz", "_temp.nii.gz")
        temp = nib.load(OUTPUT_FILE)
        x_offset = - 0.5 * temp.header['pixdim'][1] * temp.header['dim'][1]
        y_offset = - 0.5 * temp.header['pixdim'][2] * temp.header['dim'][2]
        z_offset = - 0.5 * temp.header['pixdim'][3] * temp.header['dim'][3]
        affine = np.array([[1, 0, 0, x_offset],
                            [0, 1, 0, y_offset],
                            [0, 0, 1, z_offset],
                            [0, 0, 0, 1]])
        temp.set_sform(affine)
        nib.save(temp, TEMP_FILE)

        if os.path.exists(OUTPUT_FILE.replace(".nii.gz", "")):
            print('------------------ 3D Slicer already run ------------------')
            return JsonResponse({'status': 'success', 'message': '3D Slicer already run'})

        # Run Slicer
        os.system(Slicer_PATH + " --no-splash --no-main-window --python-script " + Seg_Stl_PATH + " " + TEMP_FILE)
        print('------------------ Finish Running 3D Slicer ------------------')
    except Exception as e:
        print(e)
        print('------------------ Error Running 3D Slicer ------------------')

    return JsonResponse({'status': 'success', 'message': '3D Slicer run successfully'})


def get_models(request):
    #send all the model as json response
    models = MriFile.objects.all()
    #convert models to json
    data = list(models.values())
    return JsonResponse(data, safe=False)


def get_nifti(request):
    model_name = json.loads(request.body)['model_name']
    model = MriFile.objects.get(name=model_name)
    path = "media/" + model.file.name
    return JsonResponse({"success": True, "file": path})


def send_model(request):
    print("Sending model")
    body = json.loads(request.body)
    venctricle_arg = ''
    if('model_path' not in body):
        model_names = body['model_names']
        _,  model_path = getSynthsegFromId(body['model_id'])
        parenchyma_arg = ''
        for model_name in model_names:
            if int(model_name) in (4, 43):
                venctricle_arg += f" {model_path}/{model_name}.stl"
            else:
                parenchyma_arg += f" {model_path}/{model_name}.stl"
    
    else:
        parenchyma_arg = body['model_path']

    haptic_path = "/home/sid/Documents/build-evdSIM-Desktop_Qt_5_15_2_GCC_64bit-Release/evdSIM"
    command = ["sudo", "-S", haptic_path]
    command.append(venctricle_arg.strip())
    command.append(parenchyma_arg.strip())
    print(command)
    try:
        subprocess.run(
        command, stdout=subprocess.PIPE,input=getpass("password: "), encoding="ascii")
    except Exception as e:
        print(e)

    return JsonResponse({"success": True})





def get_stl_folder(request):
    model_name = json.loads(request.body)['model_name']
    MEDIA_LOCAL, STL_DIR = getSynthsegFromId(model_name)
    stl_files = [os.path.join(MEDIA_LOCAL, f) for f in os.listdir(STL_DIR) if f.endswith(".stl")]

    return JsonResponse({"success": True, "files": stl_files})



# helper functions
def getSynthsegFromId(model_name):
    BASE_DIR = Path(__file__).resolve().parent.parent
    # media folder
    folder_name = model_name.replace(".nii.gz", "_synthseg")
    MEDIA_DIR = BASE_DIR / "media"
    MEDIA_LOCAL = f"/media/mri_files/{folder_name}"
    
    STL_DIR = MEDIA_DIR.joinpath('mri_files').joinpath(folder_name)
    return MEDIA_LOCAL,STL_DIR

def getStlFileFromId(model_name):
    BASE_DIR = Path(__file__).resolve().parent.parent
    # media folder
    MEDIA_DIR = BASE_DIR / "media"
    MEDIA_LOCAL = f"/media/stl_files/{model_name}"
    
    STL_DIR = MEDIA_DIR.joinpath('stl_files').joinpath(model_name)
    return MEDIA_LOCAL,STL_DIR

    

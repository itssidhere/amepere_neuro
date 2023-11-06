from django.shortcuts import render
import os
from pathlib import Path
from .models import MriFile
from django.http import JsonResponse
from . import mri_seg
import json
import datetime
import socketio

sio = socketio.Client()
sio.connect("http://127.0.0.1:8001")


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
            
            # full_path = new_file.file.path
            
            return JsonResponse({"success": True, "file": file_name})
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
        Slicer_PATH = "/home/sid/Downloads/Slicer-5.4.0-linux-amd64/Slicer"

        if os.path.exists(OUTPUT_FILE.replace(".nii.gz", "")):
            print('------------------ 3D Slicer already run ------------------')
            return JsonResponse({'status': 'success', 'message': '3D Slicer already run'})

        # Run Slicer
        os.system(Slicer_PATH + " --no-splash --no-main-window --python-script " + Seg_Stl_PATH + " " + OUTPUT_FILE)
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
    model_path = "/home/sid/Documents/projects/ampere_neuro/media/mri_files/PATIENT_05_synthseg"
    
    sio.emit("send_model_django", model_path)
    return JsonResponse({"success": True, "file": model_path})


def get_stl_folder(request):
    model_name = json.loads(request.body)['model_name']
    BASE_DIR = Path(__file__).resolve().parent.parent
    # media folder
    folder_name = model_name.replace(".nii.gz", "_synthseg")
    MEDIA_DIR = BASE_DIR / "media"
    MEDIA_LOCAL = f"/media/mri_files/{folder_name}"
    
    STL_DIR = MEDIA_DIR.joinpath('mri_files').joinpath(folder_name)
    stl_files = [os.path.join(MEDIA_LOCAL, f) for f in os.listdir(STL_DIR) if f.endswith(".stl")]

    return JsonResponse({"success": True, "files": stl_files})
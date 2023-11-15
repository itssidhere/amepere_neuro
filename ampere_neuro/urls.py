"""
URL configuration for ampere_neuro project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from mainapp import views
from django.conf import settings
from django.conf.urls.static import static  

urlpatterns = [
    path("", views.index, name="index"),
    path("admin/", admin.site.urls),
    path("uploadMriFile/", views.uploadMriFiles, name="uploadMriFile"),
    path("uploadStlFile/", views.uploadStlFiles, name="uploadStlFile"),
    path("segmentMri/", views.segment_mri, name="segmentMri"),
    path("run3dSlicer/", views.run_3d_slicer, name="run3dSlicer"),
    path("getModels/", views.get_models, name="getModels"),
    path("getNifti/", views.get_nifti, name="getNifti"),
    path("getStlFolder/", views.get_stl_folder, name="getStlFolder"),
    path("sendModel/", views.send_model, name="sendModel"),
    path("saveVisabilities/", views.save_visabilities, name="saveVisabilities"),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from django.db import models
from django.core.files.storage import FileSystemStorage
import os
from ampere_neuro import settings

class OverwriteStorage(FileSystemStorage):
    def get_available_name(self, name: str, max_length: int | None = ...) -> str:
        
        if self.exists(name):
            os.remove(os.path.join(settings.MEDIA_ROOT, name))
        return name

# Create your models here.
class MriFile(models.Model):
    file = models.FileField(upload_to='mri_files/', storage=OverwriteStorage())
    uploaded_at = models.DateTimeField(auto_now_add=True)
    name = models.CharField(max_length=100, blank=True, primary_key=True)


    def __str__(self):
        return self.name
    

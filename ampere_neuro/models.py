from django.db import models


class Message(models.Model):
    content = models.TextField()
    timestmap = models.DateTimeField(auto_now_add=True)

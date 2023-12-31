# Generated by Django 4.2.6 on 2023-11-06 13:07

from django.db import migrations, models
import mainapp.models


class Migration(migrations.Migration):

    dependencies = [
        ('mainapp', '0004_mrifile_name'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='mrifile',
            name='id',
        ),
        migrations.AlterField(
            model_name='mrifile',
            name='file',
            field=models.FileField(storage=mainapp.models.OverwriteStorage(), upload_to='mri_files/'),
        ),
        migrations.AlterField(
            model_name='mrifile',
            name='name',
            field=models.CharField(blank=True, max_length=100, primary_key=True, serialize=False),
        ),
    ]

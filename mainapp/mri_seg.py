# python imports
import os
import sys
from argparse import ArgumentParser

synthseg_home = os.path.join(os.path.dirname(os.path.abspath(__file__)), "SynthSeg")
sys.path.append(synthseg_home)
print("---------------------------",synthseg_home)

model_dir = os.path.join(synthseg_home, 'models')
labels_dir = os.path.join(synthseg_home, 'data/labels_classes_priors')

from SynthSeg.predict_synthseg import predict


def SegmentMRI(mri_path, output_path):
    
    # parse arguments
    parser = ArgumentParser(description="SynthSeg", epilog='\n')

    # input/outputs
    parser.add_argument("--i", help="Image(s) to segment. Can be a path to an image or to a folder.")
    parser.add_argument("--o", help="Segmentation output(s). Must be a folder if --i designates a folder.")
    parser.add_argument("--parc", action="store_true", help="(optional) Whether to perform cortex parcellation.")
    parser.add_argument("--robust", action="store_true", help="(optional) Whether to use robust predictions (slower).")
    parser.add_argument("--fast", action="store_true", help="(optional) Bypass some postprocessing for faster predictions.")
    parser.add_argument("--ct", action="store_true", help="(optional) Clip intensities to [0,80] for CT scans.")
    parser.add_argument("--vol", help="(optional) Path to output CSV file with volumes (mm3) for all regions and subjects.")
    parser.add_argument("--qc", help="(optional) Path to output CSV file with qc scores for all subjects.")
    parser.add_argument("--post", help="(optional) Posteriors output(s). Must be a folder if --i designates a folder.")
    parser.add_argument("--resample", help="(optional) Resampled image(s). Must be a folder if --i designates a folder.")
    parser.add_argument("--crop", nargs='+', type=int, help="(optional) Size of 3D patches to analyse. Default is 192.")
    parser.add_argument("--threads", type=int, default=1, help="(optional) Number of cores to be used. Default is 1.")
    parser.add_argument("--cpu", action="store_true", help="(optional) Enforce running with CPU rather than GPU.")
    parser.add_argument("--v1", action="store_true", help="(optional) Use SynthSeg 1.0 (updated 25/06/22).")

    #remove the manage.py and runserver
    sys.argv.pop(0)
    sys.argv.pop(0)

    # parse commandline
    args = vars(parser.parse_args())

    # print SynthSeg version and checks boolean params for SynthSeg-robust
    if args['robust']:
        args['fast'] = True
        assert not args['v1'], 'The flag --v1 cannot be used with --robust since SynthSeg-robust only came out with 2.0.'
        version = 'SynthSeg-robust 2.0'
    else:
        version = 'SynthSeg 1.0' if args['v1'] else 'SynthSeg 2.0'
        if args['fast']:
            version += ' (fast)'
    print('\n' + version + '\n')

    # enforce CPU processing if necessary
    args['cpu'] = True
    if args['cpu']:
        print('using CPU, hiding all CUDA_VISIBLE_DEVICES')
        os.environ['CUDA_VISIBLE_DEVICES'] = '-1'

    # limit the number of threads to be used if running on CPU
    import tensorflow as tf
    if args['threads'] == 1:
        print('using 1 thread')
    else:
        print('using %s threads' % args['threads'])
    tf.config.threading.set_inter_op_parallelism_threads(args['threads'])
    tf.config.threading.set_intra_op_parallelism_threads(args['threads'])

    # path models
    if args['robust']:
        args['path_model_segmentation'] = os.path.join(model_dir, 'synthseg_robust_2.0.h5')
    else:
        args['path_model_segmentation'] = os.path.join(model_dir, 'synthseg_2.0.h5')
    args['path_model_parcellation'] = os.path.join(model_dir, 'synthseg_parc_2.0.h5')
    args['path_model_qc'] = os.path.join(model_dir, 'synthseg_qc_2.0.h5')

    # path labels
    args['labels_segmentation'] = os.path.join(labels_dir, 'synthseg_segmentation_labels_2.0.npy')
    args['labels_denoiser'] = os.path.join(labels_dir, 'synthseg_denoiser_labels_2.0.npy')
    args['labels_parcellation'] = os.path.join(labels_dir, 'synthseg_parcellation_labels.npy')
    args['labels_qc'] = os.path.join(labels_dir, 'synthseg_qc_labels_2.0.npy')
    args['names_segmentation_labels'] = os.path.join(labels_dir, 'synthseg_segmentation_names_2.0.npy')
    args['names_parcellation_labels'] = os.path.join(labels_dir, 'synthseg_parcellation_names.npy')
    args['names_qc_labels'] = os.path.join(labels_dir, 'synthseg_qc_names_2.0.npy')
    args['topology_classes'] = os.path.join(labels_dir, 'synthseg_topological_classes_2.0.npy')
    args['n_neutral_labels'] = 19

    args['i'] = mri_path
    args['o'] = output_path
    args['resample'] = output_path

    print(args)

    # run prediction
    predict(path_images=args['i'],
            path_segmentations=args['o'],
            path_model_segmentation=args['path_model_segmentation'],
            labels_segmentation=args['labels_segmentation'],
            robust=args['robust'],
            fast=args['fast'],
            v1=args['v1'],
            do_parcellation=args['parc'],
            n_neutral_labels=args['n_neutral_labels'],
            names_segmentation=args['names_segmentation_labels'],
            labels_denoiser=args['labels_denoiser'],
            path_posteriors=args['post'],
            path_resampled=args['resample'],
            path_volumes=args['vol'],
            path_model_parcellation=args['path_model_parcellation'],
            labels_parcellation=args['labels_parcellation'],
            names_parcellation=args['names_parcellation_labels'],
            path_model_qc=args['path_model_qc'],
            labels_qc=args['labels_qc'],
            path_qc_scores=args['qc'],
            names_qc=args['names_qc_labels'],
            cropping=args['crop'],
            topology_classes=args['topology_classes'],
            ct=args['ct'])
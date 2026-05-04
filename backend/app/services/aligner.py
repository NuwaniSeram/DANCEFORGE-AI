"""
aligner.py  –  Enhanced DTW Sequence Aligner
Uses FastDTW to temporally align reference and user dance sequences.
Also provides per-joint alignment paths and alignment quality score.
"""

import numpy as np
from fastdtw import fastdtw
from scipy.spatial.distance import euclidean


def _sequence_to_vectors(angles_seq: list) -> list:
    """
    Convert a list of per-frame angle dicts into a list of numeric vectors.
    Each vector = [angle_j1, angle_j2, ...] in consistent joint order.
    """
    if not angles_seq:
        return []
    joint_order = sorted(angles_seq[0].keys())
    vectors = []
    for frame in angles_seq:
        vec = [frame[j]["angle"] for j in joint_order]
        vectors.append(vec)
    return vectors, joint_order


def align_sequences(ref_angles: list, user_angles: list):
    """
    Align two angle sequences using FastDTW.

    Returns
    -------
    path : list of (ref_idx, user_idx) tuples
    alignment_score : float  [0-100]  (100 = perfect alignment)
    """
    if not ref_angles or not user_angles:
        return [], 0.0

    ref_vecs, _ = _sequence_to_vectors(ref_angles)
    usr_vecs, _ = _sequence_to_vectors(user_angles)

    ref_arr = [np.array(v) for v in ref_vecs]
    usr_arr = [np.array(v) for v in usr_vecs]

    distance, path = fastdtw(ref_arr, usr_arr, dist=euclidean)

    # Normalise: distance / path_length → lower = better alignment
    path_len = max(len(path), 1)
    norm_dist = distance / path_len
    alignment_score = max(0.0, 100.0 - norm_dist)

    return path, round(float(alignment_score), 2)


def get_aligned_frame_pairs(path: list, ref_angles: list, user_angles: list):
    """
    Return an iterable of (ref_frame_dict, user_frame_dict) aligned pairs.
    Deduplicates consecutive duplicate pairs (DTW often repeats indices).
    """
    seen = set()
    pairs = []
    for r_idx, u_idx in path:
        key = (r_idx, u_idx)
        if key in seen:
            continue
        seen.add(key)
        if r_idx < len(ref_angles) and u_idx < len(user_angles):
            pairs.append((ref_angles[r_idx], user_angles[u_idx], r_idx, u_idx))
    return pairs

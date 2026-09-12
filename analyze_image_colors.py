import os
from PIL import Image
import numpy as np

dir_path = './교과서 이미지'

def analyze_img(fname):
    fpath = os.path.join(dir_path, fname)
    with Image.open(fpath) as img:
        img_rgb = img.convert('RGB')
        arr = np.array(img_rgb)
        
        # Calculate mean RGB
        r_mean = np.mean(arr[:, :, 0])
        g_mean = np.mean(arr[:, :, 1])
        b_mean = np.mean(arr[:, :, 2])
        
        # Calculate dominant color tendency
        # Greenness: G - (R+B)/2
        # Yellowness/Orange: (R+G)/2 - B
        # Whiteness/Brightness: (R+G+B)/3
        # Cyan/Blueness: B - (R+G)/2
        
        greenness = g_mean - (r_mean + b_mean)/2.0
        yellowness = (r_mean + g_mean)/2.0 - b_mean
        brightness = (r_mean + g_mean + b_mean)/3.0
        blueness = b_mean - (r_mean + g_mean)/2.0
        
        return {
            'fname': fname,
            'size': img.size,
            'r': round(r_mean, 1),
            'g': round(g_mean, 1),
            'b': round(b_mean, 1),
            'greenness': round(greenness, 1),
            'yellowness': round(yellowness, 1),
            'brightness': round(brightness, 1),
            'blueness': round(blueness, 1)
        }

key_pages = [10, 11, 12, 13, 24, 27, 28, 30, 31, 32, 33, 35, 36, 37, 38, 42]
files = os.listdir(dir_path)

for p in key_pages:
    p_files = [f for f in files if f.startswith(f'초등_사회 6-2_1_교과서_{p}p_')]
    if not p_files:
        continue
    print(f"\n==================== Page {p}p ({len(p_files)} files) ====================")
    for f in p_files:
        info = analyze_img(f)
        print(f"  {info['fname']} ({info['size'][0]}x{info['size'][1]}): Brightness={info['brightness']}, Yellow={info['yellowness']}, Green={info['greenness']}, Blue={info['blueness']} (R:{info['r']} G:{info['g']} B:{info['b']})")

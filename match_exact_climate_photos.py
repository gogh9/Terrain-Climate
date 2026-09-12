import os
from PIL import Image
import numpy as np

img_dir = "./교과서 이미지"

def analyze_detail(fname):
    fpath = os.path.join(img_dir, fname)
    if not os.path.exists(fpath):
        return None
    with Image.open(fpath) as img:
        w, h = img.size
        arr = np.array(img.convert('RGB'))
        
        # Upper third color mean
        top_third = arr[:int(h*0.3), :, :]
        top_r = np.mean(top_third[:,:,0])
        top_g = np.mean(top_third[:,:,1])
        top_b = np.mean(top_third[:,:,2])
        
        # Lower third color mean
        bottom_third = arr[int(h*0.7):, :, :]
        bot_r = np.mean(bottom_third[:,:,0])
        bot_g = np.mean(bottom_third[:,:,1])
        bot_b = np.mean(bottom_third[:,:,2])

        # Middle third color mean
        mid_third = arr[int(h*0.3):int(h*0.7), :, :]
        mid_r = np.mean(mid_third[:,:,0])
        mid_g = np.mean(mid_third[:,:,1])
        mid_b = np.mean(mid_third[:,:,2])
        
        return {
            'fname': fname,
            'size': f"{w}x{h}",
            'ratio': round(w/h, 2),
            'top_sky': round(top_b - (top_r+top_g)/2, 1),
            'mid_green': round(mid_g - (mid_r+mid_b)/2, 1),
            'mid_yellow': round((mid_r+mid_g)/2 - mid_b, 1),
            'bot_brightness': round(np.mean(bottom_third), 1)
        }

target_files = [
    # Machu Picchu candidates (13p)
    '초등_사회 6-2_1_교과서_13p_1.jpg',
    '초등_사회 6-2_1_교과서_13p_2.jpg',
    '초등_사회 6-2_1_교과서_13p_3.jpg',
    '초등_사회 6-2_1_교과서_13p_4.jpg',
    '초등_사회 6-2_1_교과서_13p_5.jpg',
    '초등_사회 6-2_1_교과서_13p_6.jpg',
    
    # Tropical candidates (27p, 28p)
    '초등_사회 6-2_1_교과서_27p_1.jpg',
    '초등_사회 6-2_1_교과서_27p_2.jpg',
    '초등_사회 6-2_1_교과서_27p_3.jpg',
    '초등_사회 6-2_1_교과서_27p_4.jpg',
    '초등_사회 6-2_1_교과서_28p_1.jpg',
    '초등_사회 6-2_1_교과서_28p_2.jpg',
    
    # Dry candidates (27p, 30p)
    '초등_사회 6-2_1_교과서_30p_1.jpg',
    
    # Temperate candidates (31p, 32p)
    '초등_사회 6-2_1_교과서_31p_1.jpg',
    '초등_사회 6-2_1_교과서_32p_1.jpg',
    '초등_사회 6-2_1_교과서_32p_2.jpg',
    '초등_사회 6-2_1_교과서_32p_3.jpg',
    
    # Boreal candidates (33p, 34p, 42p)
    '초등_사회 6-2_1_교과서_33p_1.jpg',
    '초등_사회 6-2_1_교과서_42p_5.jpg',
    
    # Polar candidates (35p)
    '초등_사회 6-2_1_교과서_35p_1.jpg',
    '초등_사회 6-2_1_교과서_35p_2.jpg',
    '초등_사회 6-2_1_교과서_35p_3.jpg',
    '초등_사회 6-2_1_교과서_35p_4.jpg',
    '초등_사회 6-2_1_교과서_35p_5.jpg',
    '초등_사회 6-2_1_교과서_35p_6.jpg',
    
    # Highland candidates (36p, 37p)
    '초등_사회 6-2_1_교과서_36p_1.jpg',
    '초등_사회 6-2_1_교과서_36p_2.jpg',
    '초등_사회 6-2_1_교과서_36p_3.jpg',
    '초등_사회 6-2_1_교과서_36p_4.jpg',
    '초등_사회 6-2_1_교과서_36p_5.jpg',
    '초등_사회 6-2_1_교과서_37p_1.jpg',
    '초등_사회 6-2_1_교과서_37p_2.jpg',
    '초등_사회 6-2_1_교과서_37p_3.jpg',
    '초등_사회 6-2_1_교과서_37p_4.jpg',
    '초등_사회 6-2_1_교과서_37p_5.jpg'
]

for tf in target_files:
    info = analyze_detail(tf)
    if info:
        print(f"{info['fname']} ({info['size']}): Sky={info['top_sky']}, MidGreen={info['mid_green']}, MidYellow={info['mid_yellow']}, BotBright={info['bot_brightness']}")

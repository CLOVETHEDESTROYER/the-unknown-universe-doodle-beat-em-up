from PIL import Image

try:
    img = Image.open('player_walk.png')
    # Frame 1: 0, 0, 200, 327
    frame = img.crop((0, 0, 200, 327))
    frame.save('temp_reference_frame.png')
    print("Successfully cropped frame 1")
except Exception as e:
    print(f"Error: {e}")

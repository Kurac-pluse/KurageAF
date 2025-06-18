from PIL import Image

def trim_image(input_image_path, output_image_path):
    img = Image.open(input_image_path)
    img = img.convert("RGBA")  # 画像をRGBAに変換（透明度を扱うため）
    
    # 画像のバウンディングボックスを取得（非透明部分のみ）
    bbox = img.getbbox()
    
    # バウンディングボックスでトリミング
    trimmed_img = img.crop(bbox)
    
    # トリミングされた画像を保存
    trimmed_img.save(output_image_path)

# 使い方
input_image_path = "sumaho.png"  # 625x352の画像ファイル
output_image_path = "sumaho.png"
trim_image(input_image_path, output_image_path)

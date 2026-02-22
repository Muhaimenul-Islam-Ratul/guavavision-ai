from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
import cv2
import io
import os
from typing import List
from PIL import Image

# Import ML Libraries
import tensorflow as tf
from ultralytics import YOLO

app = FastAPI(title="Guava Disease AI Backend")

# Allow the React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load all trained models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

clf_model = None  # ResNet50+DenseNet121 fusion classification
det_model = None  # YOLOv8 detection
seg_model = None  # YOLOv8 segmentation

try:
    clf_path = os.path.join(BASE_DIR, "ResNet50DenseNet121_Fusion (1).h5")
    print(f"[1/3] Loading Classification model (ResNet50DenseNet121 Fusion) from: {clf_path}")
    clf_model = tf.keras.models.load_model(clf_path)
    print("      [OK] Classification model loaded successfully.")
except Exception as e:
    print(f"      [ERR] Failed to load classification model: {e}")

try:
    det_path = os.path.join(BASE_DIR, "best.pt")
    print(f"[2/3] Loading Detection model (YOLOv8) from: {det_path}")
    det_model = YOLO(det_path)
    print("      [OK] Detection model loaded successfully.")
except Exception as e:
    print(f"      [ERR] Failed to load detection model: {e}")

try:
    seg_path = os.path.join(BASE_DIR, "yolov8s-seg (1).pt")
    print(f"[3/3] Loading Segmentation model (YOLOv8-Seg) from: {seg_path}")
    seg_model = YOLO(seg_path)
    print("      [OK] Segmentation model loaded successfully.")
except Exception as e:
    print(f"      [ERR] Failed to load segmentation model: {e}")

print("\n=== Model Status ===")
print(f"  Classification (ResNet50DenseNet121_Fusion (1).h5): {'LOADED' if clf_model else 'NOT LOADED'}")
print(f"  Detection      (best.pt):        {'LOADED' if det_model else 'NOT LOADED'}")
print(f"  Segmentation   (yolov8s-seg.pt): {'LOADED' if seg_model else 'NOT LOADED'}")
print("====================\n")

CLASS_NAMES = ["Healthy", "Phytopthora", "Red rust", "Scab", "Styler and Root"]


@app.get("/")
async def root():
    return {
        "message": "GuavaVision backend is running",
        "health": "/health",
        "analyze": "/analyze",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "models": {
            "classification_resnet50_densenet121_fusion": clf_model is not None,
            "detection_best": det_model is not None,
            "segmentation_yolov8seg": seg_model is not None,
        },
    }


@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    Accepts an image and returns classification, detections, and segmentations.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload must be an image file.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image format.")

    img_array = np.array(image)
    img_height, img_width = img_array.shape[:2]

    # Classification
    if clf_model is None:
        raise HTTPException(
            status_code=503,
            detail="Classification model (ResNet50DenseNet121_Fusion (1).h5) not loaded. Check server logs.",
        )

    img_resized = cv2.resize(img_array, (224, 224))
    img_scaled = np.expand_dims(img_resized, axis=0) / 255.0

    preds = clf_model.predict(img_scaled, verbose=0)[0]
    class_labels: List[str]
    if len(preds) == len(CLASS_NAMES):
        class_labels = CLASS_NAMES
    else:
        class_labels = [f"class_{i}" for i in range(len(preds))]

    class_idx = int(np.argmax(preds))
    confidence = float(preds[class_idx])
    probabilities = [
        {"class": class_labels[i], "score": float(preds[i])}
        for i in range(len(class_labels))
    ]

    # Detection
    detections = []
    if det_model is not None:
        det_results = det_model.predict(img_array, conf=0.25)
        for r in det_results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                detections.append(
                    {
                        "label": det_model.names[cls],
                        "confidence": conf,
                        "bbox": [
                            (x1 / img_width) * 100,
                            (y1 / img_height) * 100,
                            ((x2 - x1) / img_width) * 100,
                            ((y2 - y1) / img_height) * 100,
                        ],
                    }
                )

    # Segmentation
    segmentations = []
    if seg_model is not None:
        seg_results = seg_model.predict(img_array, conf=0.25)
        for r in seg_results:
            if r.masks is not None:
                for i in range(len(r.masks)):
                    box = r.boxes[i]
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    mask_xy = r.masks.xy[i]
                    points = [
                        {
                            "x": float(pt[0] / img_width) * 100,
                            "y": float(pt[1] / img_height) * 100,
                        }
                        for pt in mask_xy
                    ]
                    segmentations.append(
                        {
                            "label": seg_model.names[cls],
                            "confidence": conf,
                            "bbox": [
                                (x1 / img_width) * 100,
                                (y1 / img_height) * 100,
                                ((x2 - x1) / img_width) * 100,
                                ((y2 - y1) / img_height) * 100,
                            ],
                            "mask_points": points,
                        }
                    )

    return {
        "classification": {
            "predicted": class_labels[class_idx],
            "confidence": confidence,
            "probabilities": probabilities,
            "model": "ResNet50DenseNet121_Fusion (1).h5",
        },
        "detections": detections,
        "segmentations": segmentations,
        "models_used": {
            "classification": "ResNet50DenseNet121_Fusion (1).h5",
            "detection": "best.pt",
            "segmentation": "yolov8s-seg (1).pt",
        },
    }


if __name__ == "__main__":
    print("Starting GuavaVision API Server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)

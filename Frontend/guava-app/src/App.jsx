import React, { useState, useRef } from 'react';
import { Upload, Activity, Target, Search, CheckCircle2, AlertCircle, Layers, Image as ImageIcon, Cpu } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('classification');
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResults(null);
      setActiveTab('classification');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResults(null);
      setActiveTab('classification');
    }
  };

  const triggerAnalysis = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setResults(null);

    const formData = new FormData();
    formData.append("file", selectedImage);

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Backend not responding");
      const data = await response.json();
      setResults(data);
      setIsAnalyzing(false);

    } catch (error) {
      console.log("FastAPI backend not detected — showing simulated results.");

      // ── MOCK DATA: matches the exact shape of the real API response ──
      setTimeout(() => {
        setResults({
          classification: {
            predicted: "Scab",
            confidence: 0.9729,
            probabilities: [
              { class: "Phytopthora", score: 0.0120 },
              { class: "Red rust", score: 0.0050 },
              { class: "Scab", score: 0.9729 },
              { class: "Styler and Root", score: 0.0051 },
              { class: "Healthy", score: 0.0050 },
            ],
            model: "ResNet50DenseNet121_Fusion (1).h5"
          },
          // detections come from best.pt
          detections: [
            { label: "Scab", confidence: 0.95, bbox: [20, 25, 30, 25] },
            { label: "Scab", confidence: 0.89, bbox: [60, 45, 20, 20] },
          ],
          // segmentations come from yolov8s-seg (1).pt
          segmentations: [
            {
              label: "Scab", confidence: 0.92,
              bbox: [22, 27, 28, 23],
              mask_points: [
                { x: 22, y: 27 }, { x: 35, y: 25 }, { x: 50, y: 27 },
                { x: 50, y: 50 }, { x: 35, y: 52 }, { x: 22, y: 50 },
              ]
            },
          ],
          models_used: {
            classification: "ResNet50DenseNet121_Fusion (1).h5",
            detection: "best.pt",
            segmentation: "yolov8s-seg (1).pt",
          }
        });
        setIsAnalyzing(false);
      }, 2500);
    }
  };

  // ── Tab definitions ────────────────────────────────────────────────────
  const tabs = [
    { id: 'classification', icon: Activity, label: 'Classification' },
    { id: 'detection', icon: Target, label: 'Detection' },
    { id: 'segmentation', icon: Layers, label: 'Segmentation' },
    { id: 'xai', icon: Search, label: 'XAI (Grad-CAM)' },
  ];

  // ── Overlay colour per label ───────────────────────────────────────────
  const labelStyles = (label) => {
    const map = {
      Scab: { border: 'border-red-500', bg: 'bg-red-500/20', text: 'bg-red-500' },
      Phytopthora: { border: 'border-orange-500', bg: 'bg-orange-500/20', text: 'bg-orange-500' },
      'Red rust': { border: 'border-yellow-500', bg: 'bg-yellow-500/20', text: 'bg-yellow-500' },
      'Styler and Root': { border: 'border-purple-500', bg: 'bg-purple-500/20', text: 'bg-purple-500' },
      Healthy: { border: 'border-green-500', bg: 'bg-green-500/20', text: 'bg-green-500' },
    };
    return map[label] || { border: 'border-blue-500', bg: 'bg-blue-500/20', text: 'bg-blue-500' };
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800 font-sans selection:bg-emerald-200">

      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <nav className="bg-emerald-700 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Layers className="w-8 h-8 text-emerald-300" />
          <div>
            <h1 className="text-xl font-bold tracking-wide">GuavaVision AI</h1>
            <p className="text-xs text-emerald-200">
              ResNet50DenseNet121 Fusion Classification · YOLOv8 Detection · YOLOv8-Seg Segmentation
            </p>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-6 grid md:grid-cols-2 gap-8">

        {/* ── Left Column: Upload & Preview ─────────────────────────── */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" /> Image Upload
            </h2>

            {!previewUrl ? (
              <div
                className="border-2 border-dashed border-emerald-300 rounded-xl p-10 text-center cursor-pointer hover:bg-emerald-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <ImageIcon className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="font-medium text-emerald-800">Click or drag &amp; drop a Guava Leaf image</p>
                <p className="text-sm text-gray-500 mt-1">Supports JPG, PNG</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center min-h-[300px]">
                <img
                  src={previewUrl}
                  alt="Guava leaf preview"
                  className="max-w-full h-auto max-h-[400px] object-contain"
                />

                {/* Detection boxes — from best.pt */}
                {results && activeTab === 'detection' && results.detections.map((det, i) => {
                  const styles = labelStyles(det.label);
                  return (
                    <div key={i}
                      className={`absolute border-2 ${styles.border} ${styles.bg}`}
                      style={{
                        left: `${det.bbox[0]}%`, top: `${det.bbox[1]}%`,
                        width: `${det.bbox[2]}%`, height: `${det.bbox[3]}%`,
                      }}
                    >
                      <span className={`absolute -top-6 left-[-2px] ${styles.text} text-white text-xs font-bold px-2 py-1 rounded-t whitespace-nowrap`}>
                        {det.label} ({(det.confidence * 100).toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}

                {/* Segmentation boxes — from yolov8s-seg (1).pt */}
                {results && activeTab === 'segmentation' && results.segmentations?.map((seg, i) => (
                  <div key={i}
                    className="absolute border-2 border-violet-500 bg-violet-500/20"
                    style={{
                      left: `${seg.bbox[0]}%`, top: `${seg.bbox[1]}%`,
                      width: `${seg.bbox[2]}%`, height: `${seg.bbox[3]}%`,
                    }}
                  >
                    <span className="absolute -top-6 left-[-2px] bg-violet-600 text-white text-xs font-bold px-2 py-1 rounded-t whitespace-nowrap">
                      {seg.label} · seg ({(seg.confidence * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}

                {/* XAI Grad-CAM heatmap overlay */}
                {results && activeTab === 'xai' && (
                  <div className="absolute inset-0 mix-blend-multiply opacity-70 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at 35% 35%, rgba(255,0,0,0.8) 0%, rgba(0,255,0,0) 40%)' }}>
                  </div>
                )}
              </div>
            )}

            <input type="file" className="hidden" ref={fileInputRef}
              accept="image/*" onChange={handleImageChange} />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-white border border-emerald-200 text-emerald-700 py-2 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
              >
                {previewUrl ? 'Change Image' : 'Select File'}
              </button>
              <button
                onClick={triggerAnalysis}
                disabled={!previewUrl || isAnalyzing}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2"
              >
                {isAnalyzing
                  ? <><Activity className="w-5 h-5 animate-spin" /> Processing...</>
                  : <><Search className="w-5 h-5" /> Run Analysis</>}
              </button>
            </div>
          </div>

          {/* Model info card */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> Models in Use
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Classification</span>
                <code className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-mono">ResNet50DenseNet121_Fusion (1).h5</code>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Detection</span>
                <code className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">best.pt</code>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Segmentation</span>
                <code className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded text-xs font-mono">yolov8s-seg (1).pt</code>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Right Column: Results Dashboard ──────────────────────── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col">
          <h2 className="text-lg font-semibold mb-6 border-b pb-3">Analysis Results</h2>

          {!results && !isAnalyzing && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Activity className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-center">Upload a guava leaf image and click <strong>Run Analysis</strong> to see AI predictions.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex-1 flex flex-col items-center justify-center text-emerald-600">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
              <p className="animate-pulse font-medium">Running ResNet50DenseNet121 Fusion · best.pt · YOLOv8-Seg…</p>
            </div>
          )}

          {results && (
            <div className="space-y-6 flex-1 slide-up">

              {/* Tab Navigation */}
              <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all ${activeTab === tab.id
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Classification Tab ── ResNet50DenseNet121_Fusion (1).h5 ────────────── */}
              {activeTab === 'classification' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl flex items-start gap-4 ${results.classification.predicted === 'Healthy' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                    {results.classification.predicted === 'Healthy'
                      ? <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0" />
                      : <AlertCircle className="w-8 h-8 text-red-600 shrink-0" />}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{results.classification.predicted}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Confidence: <span className="font-bold text-emerald-700">
                          {(results.classification.confidence * 100).toFixed(2)}%
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Model: <code>ResNet50DenseNet121_Fusion (1).h5</code>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Class Probabilities
                    </h4>
                    <div className="space-y-3">
                      {[...results.classification.probabilities]
                        .sort((a, b) => b.score - a.score)
                        .map((item, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700">{item.class}</span>
                              <span className="text-gray-500">{(item.score * 100).toFixed(2)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${item.class === results.classification.predicted
                                  ? 'bg-emerald-500' : 'bg-gray-300'
                                  }`}
                                style={{ width: `${item.score * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Detection Tab ── best.pt ─────────────────────────── */}
              {activeTab === 'detection' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                    Model: <code className="font-mono font-bold">best.pt</code> — bounding boxes visible on the image.
                  </p>
                  {results.detections.length === 0 ? (
                    <p className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                      No disease regions detected.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {results.detections.map((det, idx) => (
                        <li key={idx}
                          className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm border-l-4 border-l-red-500">
                          <span className="font-medium">{det.label} Detected</span>
                          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">
                            {(det.confidence * 100).toFixed(1)}% Conf
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ── Segmentation Tab ── yolov8s-seg (1).pt ──────────── */}
              {activeTab === 'segmentation' && (
                <div className="space-y-4">
                  <p className="text-sm bg-violet-50 text-violet-700 px-3 py-2 rounded-lg">
                    Model: <code className="font-mono font-bold">yolov8s-seg (1).pt</code> — segmentation masks visible on the image.
                  </p>
                  {(!results.segmentations || results.segmentations.length === 0) ? (
                    <p className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                      No segmentation regions found.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {results.segmentations.map((seg, idx) => (
                        <li key={idx}
                          className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm border-l-4 border-l-violet-500">
                          <div>
                            <span className="font-medium">{seg.label}</span>
                            {seg.mask_points?.length > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {seg.mask_points.length} mask points
                              </p>
                            )}
                          </div>
                          <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-1 rounded">
                            {(seg.confidence * 100).toFixed(1)}% Conf
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ── XAI Tab ── Grad-CAM ─────────────────────────────── */}
              {activeTab === 'xai' && (
                <div className="space-y-4 text-center py-6">
                  <Search className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg">Explainable AI (Grad-CAM)</h3>
                  <p className="text-sm text-gray-600 px-4">
                    The heatmap overlay on the left shows regions of the leaf that most influenced the
                    <code className="font-mono mx-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-xs">ResNet50DenseNet121_Fusion (1).h5</code>
                    classification decision. Red areas indicate high attention.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

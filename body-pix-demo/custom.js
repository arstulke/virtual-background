export const customPresets = [
  {
    preset: 0,
    foreground: null,
    background: null,

    algorithm: 'multi-person-instance',
    estimate: 'partmap',
    camera: null,
    flipHorizontal: true,
    input: {
      architecture: 'MobileNetV1',
      outputStride: 16,
      internalResolution: 'low',
      multiplier: 0.50,
      quantBytes: 2,
    },
    multiPersonDecoding: {
      maxDetections: 5,
      scoreThreshold: 0.3,
      nmsRadius: 20,
      numKeypointForMatching: 17,
      refineSteps: 10,
    },
    segmentation: {
      segmentationThreshold: 0.7,
      effect: 'mask',
      maskBackground: true,
      opacity: 0.7,
      backgroundBlurAmount: 3,
      maskBlurAmount: 0,
      edgeBlurAmount: 3,
    },
    partMap: {
      colorScale: 'rainbow',
      effect: 'partMap',
      segmentationThreshold: 0.5,
      opacity: 0.9,
      blurBodyPartAmount: 3,
      bodyPartEdgeBlurAmount: 3,
    },
    showFps: true,
  },
  {
    preset: 'Blur',
    foreground: null,
    background: null,

    algorithm: 'multi-person-instance',
    estimate: 'segmentation',
    camera: null,
    flipHorizontal: true,
    input: {
      architecture: 'ResNet50',
      outputStride: 16,
      internalResolution: 'low',
      multiplier: 1,
      quantBytes: 2,
    },
    multiPersonDecoding: {
      maxDetections: 5,
      scoreThreshold: 0.3,
      nmsRadius: 20,
      numKeypointForMatching: 17,
      refineSteps: 10,
    },
    segmentation: {
      segmentationThreshold: 0.7,
      effect: 'bokeh',
      maskBackground: true,
      opacity: 0.7,
      backgroundBlurAmount: 8,
      maskBlurAmount: 0,
      edgeBlurAmount: 15,
    },
    partMap: {
      colorScale: 'rainbow',
      effect: 'partMap',
      segmentationThreshold: 0.5,
      opacity: 0.9,
      blurBodyPartAmount: 3,
      bodyPartEdgeBlurAmount: 3,
    },
    showFps: false,
  },
  {
    preset: 'Greenscreen',
    foreground: {r: 0, g: 0, b: 0, a: 0},
    background: {r: 0, g: 255, b: 0, a: 255},

    algorithm: 'multi-person-instance',
    estimate: 'segmentation',
    camera: null,
    flipHorizontal: true,
    input: {
      architecture: 'ResNet50',
      outputStride: 16,
      internalResolution: 'low',
      multiplier: 1,
      quantBytes: 2,
    },
    multiPersonDecoding: {
      maxDetections: 5,
      scoreThreshold: 0.3,
      nmsRadius: 20,
      numKeypointForMatching: 17,
      refineSteps: 10,
    },
    segmentation: {
      segmentationThreshold: 0.4,
      effect: 'mask',
      maskBackground: true,
      opacity: 1,
      backgroundBlurAmount: 8,
      maskBlurAmount: 6,
      edgeBlurAmount: 15,
    },
    partMap: {
      colorScale: 'rainbow',
      effect: 'partMap',
      segmentationThreshold: 0.5,
      opacity: 0.9,
      blurBodyPartAmount: 3,
      bodyPartEdgeBlurAmount: 3,
    },
    showFps: false,
  },
];
export const customPresetOptions = {};
customPresets.forEach((a, index) => {
  if (a.preset) {
    customPresetOptions[a.preset] = index;
  }
});
customPresetOptions.default = 0;


function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export function mergeDeep(target, source) {
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, {[key]: {}});
        } else {
          target[key] = Object.assign({}, target[key]);
        }
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, {[key]: source[key]});
      }
    }
  }

  return target;
}

/**
 * @license
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import '@tensorflow/tfjs-backend-webgl';
import * as bodyPix from '@tensorflow-models/body-pix';
import dat from 'dat.gui';
import Stats from 'stats.js';

import {drawKeypoints, drawSkeleton, toggleLoadingUI} from './demo_util';
import * as partColorScales from './part_color_scales';
import {customPresets, customPresetOptions, mergeDeep} from './custom.js';


const stats = new Stats();

const state = {
  video: null,
  stream: null,
  net: null,
  videoConstraints: {},
  // Triggers the TensorFlow model to reload
  changingCamera: false,
  changingPreset: false,
};

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}

async function getVideoInputs() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log('enumerateDevices() not supported.');
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  const videoDevices = devices.filter((device) => device.kind === 'videoinput');

  return videoDevices;
}

function stopExistingVideoCapture() {
  if (state.video && state.video.srcObject) {
    state.video.srcObject.getTracks().forEach((track) => {
      track.stop();
    });
    state.video.srcObject = null;
  }
}

async function getDeviceIdForLabel(cameraLabel) {
  const videoInputs = await getVideoInputs();

  for (let i = 0; i < videoInputs.length; i++) {
    const videoInput = videoInputs[i];
    if (videoInput.label === cameraLabel) {
      return videoInput.deviceId;
    }
  }

  return null;
}

// on mobile, facing mode is the preferred way to select a camera.
// Here we use the camera label to determine if its the environment or
// user facing camera
function getFacingMode(cameraLabel) {
  if (!cameraLabel) {
    return 'user';
  }
  if (cameraLabel.toLowerCase().includes('back')) {
    return 'environment';
  } else {
    return 'user';
  }
}

async function getConstraints(cameraLabel) {
  let deviceId;
  let facingMode;

  if (cameraLabel) {
    deviceId = await getDeviceIdForLabel(cameraLabel);
    // on mobile, use the facing mode based on the camera.
    facingMode = isMobile() ? getFacingMode(cameraLabel) : null;
  };
  return {deviceId, facingMode};
}

/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera(cameraLabel) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const videoElement = document.getElementById('video');

  stopExistingVideoCapture();

  const videoConstraints = await getConstraints(cameraLabel);

  const stream = await navigator.mediaDevices.getUserMedia(
      {'audio': false, 'video': videoConstraints});
  videoElement.srcObject = stream;

  return new Promise((resolve) => {
    videoElement.onloadedmetadata = () => {
      videoElement.width = videoElement.videoWidth;
      videoElement.height = videoElement.videoHeight;
      resolve(videoElement);
    };
  });
}

async function loadVideo(cameraLabel) {
  try {
    state.video = await setupCamera(cameraLabel);
  } catch (e) {
    const info = document.getElementById('info');
    info.textContent = 'this browser does not support video capture,' +
        'or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }

  state.video.play();
}

let presetAtStart = 0;
try {
  const presetIndexStr = localStorage.getItem('virtual-background.preset');
  const presetIndex = parseInt(presetIndexStr, 10);
  if (presetIndex >= 0 && presetIndex < customPresets.length) {
    presetAtStart = presetIndex;
  }
} catch (error) {
}
const guiState = {
  preset: presetAtStart,
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
  showFps: !isMobile(),
};

function toCameraOptions(cameras) {
  const result = {default: null};

  cameras.forEach((camera) => {
    result[camera.label] = camera.label;
  });

  return result;
}

/**
 * Sets up dat.gui controller on the top-right of the window
 */
function setupGui(cameras) {
  const gui = new dat.GUI({width: 400});
  gui.add(guiState, 'preset', customPresetOptions)
      .onChange(async function(option) {
        loadPreset(option);
      });
  loadPreset(guiState.preset);
  gui.add(guiState, 'camera', toCameraOptions(cameras))
      .onChange(async function(cameraLabel) {
        state.changingCamera = true;
        await loadVideo(cameraLabel);
        state.changingCamera = false;
      });
  gui.add(guiState, 'showFps').onChange((showFps) => {
    updateFps(showFps);
  });
  setTimeout(() => updateFps(guiState.showFps), 1000);
}

function updateFps(showFps) {
  const el = document.getElementById(stats.dom.id);
  const isActivated = el ? true : false;
  if (showFps) {
    if (!isActivated) {
      document.body.appendChild(stats.dom);
    }
  } else {
    if (isActivated) {
      document.body.removeChild(stats.dom);
    }
  }
}

function loadPreset(presetIndex) {
  if (presetIndex) {
    presetIndex = Math.max(parseInt(presetIndex, 10), 0);
  } else {
    presetIndex = 0;
  }
  localStorage.setItem('virtual-background.preset', presetIndex);
  const preset = customPresets[presetIndex];
  state.changingPreset = true;
  mergeDeep(guiState, preset);
  updateFps(guiState.showFps);
}

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  if (guiState.showFps) {
    document.body.appendChild(stats.dom);
  }
}


async function estimateSegmentation() {
  const multiPersonSegmentation = null;
  switch (guiState.algorithm) {
    case 'multi-person-instance':
      return await state.net.segmentMultiPerson(state.video, {
        internalResolution: guiState.input.internalResolution,
        segmentationThreshold: guiState.segmentation.segmentationThreshold,
        maxDetections: guiState.multiPersonDecoding.maxDetections,
        scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
        nmsRadius: guiState.multiPersonDecoding.nmsRadius,
        numKeypointForMatching:
            guiState.multiPersonDecoding.numKeypointForMatching,
        refineSteps: guiState.multiPersonDecoding.refineSteps,
      });
    case 'person':
      return await state.net.segmentPerson(state.video, {
        internalResolution: guiState.input.internalResolution,
        segmentationThreshold: guiState.segmentation.segmentationThreshold,
        maxDetections: guiState.multiPersonDecoding.maxDetections,
        scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
        nmsRadius: guiState.multiPersonDecoding.nmsRadius,
      });
    default:
      break;
  };
  return multiPersonSegmentation;
}

async function estimatePartSegmentation() {
  switch (guiState.algorithm) {
    case 'multi-person-instance':
      return await state.net.segmentMultiPersonParts(state.video, {
        internalResolution: guiState.input.internalResolution,
        segmentationThreshold: guiState.segmentation.segmentationThreshold,
        maxDetections: guiState.multiPersonDecoding.maxDetections,
        scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
        nmsRadius: guiState.multiPersonDecoding.nmsRadius,
        numKeypointForMatching:
            guiState.multiPersonDecoding.numKeypointForMatching,
        refineSteps: guiState.multiPersonDecoding.refineSteps,
      });
    case 'person':
      return await state.net.segmentPersonParts(state.video, {
        internalResolution: guiState.input.internalResolution,
        segmentationThreshold: guiState.segmentation.segmentationThreshold,
        maxDetections: guiState.multiPersonDecoding.maxDetections,
        scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
        nmsRadius: guiState.multiPersonDecoding.nmsRadius,
      });
    default:
      break;
  };
  return multiPersonPartSegmentation;
}

function drawPoses(personOrPersonPartSegmentation, flipHorizontally, ctx) {
  if (Array.isArray(personOrPersonPartSegmentation)) {
    personOrPersonPartSegmentation.forEach((personSegmentation) => {
      let pose = personSegmentation.pose;
      if (flipHorizontally) {
        pose = bodyPix.flipPoseHorizontal(pose, personSegmentation.width);
      }
      drawKeypoints(pose.keypoints, 0.1, ctx);
      drawSkeleton(pose.keypoints, 0.1, ctx);
    });
  } else {
    personOrPersonPartSegmentation.allPoses.forEach((pose) => {
      if (flipHorizontally) {
        pose = bodyPix.flipPoseHorizontal(
            pose, personOrPersonPartSegmentation.width);
      }
      drawKeypoints(pose.keypoints, 0.1, ctx);
      drawSkeleton(pose.keypoints, 0.1, ctx);
    });
  }
}

async function loadBodyPix() {
  toggleLoadingUI(true);
  state.net = await bodyPix.load({
    architecture: guiState.input.architecture,
    outputStride: guiState.input.outputStride,
    multiplier: guiState.input.multiplier,
    quantBytes: guiState.input.quantBytes,
  });
  toggleLoadingUI(false);
}

/**
 * Feeds an image to BodyPix to estimate segmentation - this is where the
 * magic happens. This function loops with a requestAnimationFrame method.
 */
function segmentBodyInRealTime() {
  const canvas = document.getElementById('output');
  // since images are being fed from a webcam

  async function bodySegmentationFrame() {
    // if changing the model or the camera, wait a second for it to complete
    // then try again.
    if (state.changingPreset || state.changingCamera) {
      console.log('load model...');
      loadBodyPix();
      state.changingPreset = false;
    }

    // Begin monitoring code for frames per second
    stats.begin();
    stats.dom.id = 'fps-stats';

    const flipHorizontally = guiState.flipHorizontal;

    switch (guiState.estimate) {
      case 'segmentation':
        const multiPersonSegmentation = await estimateSegmentation();
        switch (guiState.segmentation.effect) {
          case 'mask':
            const ctx = canvas.getContext('2d');
            const foregroundColor = guiState.foreground ? guiState.foreground : {r: 255, g: 255, b: 255, a: 255};
            const backgroundColor = guiState.background ? guiState.background : {r: 0, g: 0, b: 0, a: 0};
            const mask = bodyPix.toMask(
                multiPersonSegmentation, foregroundColor, backgroundColor,
                true);

            bodyPix.drawMask(
                canvas, state.video, mask, guiState.segmentation.opacity,
                guiState.segmentation.maskBlurAmount, flipHorizontally);
            drawPoses(multiPersonSegmentation, flipHorizontally, ctx);
            break;
          case 'bokeh':
            bodyPix.drawBokehEffect(
                canvas, state.video, multiPersonSegmentation,
                +guiState.segmentation.backgroundBlurAmount,
                guiState.segmentation.edgeBlurAmount, flipHorizontally);
            break;
        }

        break;
      case 'partmap':
        const ctx = canvas.getContext('2d');
        const multiPersonPartSegmentation = await estimatePartSegmentation();
        const coloredPartImageData = bodyPix.toColoredPartMask(
            multiPersonPartSegmentation,
            partColorScales[guiState.partMap.colorScale]);

        const maskBlurAmount = 0;
        switch (guiState.partMap.effect) {
          case 'pixelation':
            const pixelCellWidth = 10.0;

            bodyPix.drawPixelatedMask(
                canvas, state.video, coloredPartImageData,
                guiState.partMap.opacity, maskBlurAmount, flipHorizontally,
                pixelCellWidth);
            break;
          case 'partMap':
            bodyPix.drawMask(
                canvas, state.video, coloredPartImageData, guiState.opacity,
                maskBlurAmount, flipHorizontally);
            break;
          case 'blurBodyPart':
            const blurBodyPartIds = [0, 1];
            bodyPix.blurBodyPart(
                canvas, state.video, multiPersonPartSegmentation,
                blurBodyPartIds, guiState.partMap.blurBodyPartAmount,
                guiState.partMap.edgeBlurAmount, flipHorizontally);
        }
        drawPoses(multiPersonPartSegmentation, flipHorizontally, ctx);
        break;
      default:
        break;
    }

    // End monitoring code for frames per second
    stats.end();

    requestAnimationFrame(bodySegmentationFrame);
  }

  bodySegmentationFrame();
}

/**
 * Kicks off the demo.
 */
export async function bindPage() {
  // Load the BodyPix model weights with architecture 0.75
  await loadBodyPix();
  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'inline-block';

  await loadVideo(guiState.camera);

  const cameras = await getVideoInputs();

  setupFPS();
  setupGui(cameras);

  segmentBodyInRealTime();
}


navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
// kick off the demo
bindPage();

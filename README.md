# virtual-background
This project is a fork of the [pretrained tensorflow models](https://github.com/tensorflow/tfjs-models) repo.

Changes in this fork:
- removing everything except of the [BodyPix - With a webcam demo](https://storage.googleapis.com/tfjs-models/demos/body-pix/index.html) (body-pix/demos)
- using the body-pix npm module because the local package is not in this repo anymore
- removing most of the gui controls and a adding custom control for selecting presets. presets are currently hardcoded in the custom.js file
- storing preset id in localStorage for loading the last preset at page load
## aframe-bmfont-component

*Work in progress* component based on the work done by Matt DesLauriers' [aframe-bmfont-text](https://github.com/mattdesl/aframe-bmfont-text) and Ben Pyrik' [aframe-bmfont-text-component](https://github.com/bryik/aframe-bmfont-text-component). Basically is a fork trying to mix the best part of both components. The reason to create this component is that the previous ones do a wonderful job but none of them exposes all the features from the original code they're based on: [three-bmfont-text](https://github.com/Jam3/three-bmfont-text) by Jam3, and I wanted to try to optimize it as much as possible to avoid recreating material, geometry or texture on each update (When changing opacity, color, texture, etc.), so it could be use in WebVR without compromising performance.
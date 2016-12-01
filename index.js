/* global AFRAME, THREE */
if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

var createTextGeometry = require('three-bmfont-text');
var loadBMFont = require('load-bmfont');
var path = require('path');
var assign = require('object-assign');
var createSDF = require('three-bmfont-text/shaders/sdf');
var createMSDF = require('three-bmfont-text/shaders/msdf');
var createBasic = require('three-bmfont-text/shaders/basic');

var alignments = ['left', 'right', 'center'];

AFRAME.registerComponent('bmfont-text', {
  schema: {
    scale: {default: 0.003},
    font: {default: ''},
    tabSize: {default: 4},
    anchor: {default: 'left', oneOf: alignments},
    baseline: {default: 'bottom', oneOf: alignments},
    text: {type: 'string'},
    width: {type: 'number', default: 1000},
    align: {type: 'string', default: 'left', oneOf: alignments},
    letterSpacing: {type: 'number', default: 0},
    lineHeight: {type: 'number', default: 38},
    fnt: {type: 'string', default: 'https://cdn.rawgit.com/fernandojsg/aframe-bmfont-component/master/fonts/DejaVu-sdf.fnt'},
    fntImage: {type: 'string', default: 'https://cdn.rawgit.com/fernandojsg/aframe-bmfont-component/master/fonts/DejaVu-sdf.png'},
    mode: {default: 'normal', oneOf: ['normal', 'pre', 'nowrap']},
    color: {type: 'color', default: '#000'},
    opacity: {type: 'number', default: '1.0'},
    type: {default: 'SDF', oneOf: ['SDF', 'basic', 'MSDF']},
    side: {default: 'front', oneOf: ['front', 'back', 'double']},
    transparent: {default: true},
    alphaTest: {default: 0.5},
  },

  init: function () {
    this.texture = new THREE.Texture();
    this.texture.anisotropy = 16; // ??

    this.geometry = createTextGeometry();

    this.updateMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.el.setObject3D('bmfont-text', this.mesh);
  },

  update: function (oldData) {
    var data = this.coerceData(this.data);

    // decide whether to update font, or just text data
    if (!oldData || oldData.fnt !== data.fnt) {
      // new font, will also subsequently change data & layout
      this.updateFont();
    } else if (this.currentFont) {
      // new data like change of text string
      var font = this.currentFont;
      this.geometry.update(assign({}, data, { font: font }));
      this.updateLayout(data);
    }
    // ??
    this.updateMaterial(oldData.type);

    var scale = data.scale;
    this.mesh.scale.set(scale, -scale, scale);
  },

  remove: function () {
    this.geometry.dispose();
    this.geometry = null;
    this.el.removeObject3D('bmfont-text');
  },

  coerceData: function (data) {
    // We have to coerce some data to numbers/booleans
    data = assign({}, data)
    if (typeof data.lineHeight !== 'undefined') {
      data.lineHeight = parseFloat(data.lineHeight)
      if (!isFinite(data.lineHeight)) data.lineHeight = undefined
    }
    if (typeof data.width !== 'undefined') {
      data.width = parseFloat(data.width)
      if (!isFinite(data.width)) data.width = undefined
    }
    return data
  },

  updateMaterial: function (oldType) {

    if (oldType !== this.data.type) {
      var data = {
        side: threeSideFromString(this.data.side),
        transparent: this.data.transparent,
        alphaTest: this.data.alphaTest,
        color: this.data.color,
        opacity: this.data.opacity,
        map: this.texture
      }

      var shader;
      if (this.data.type === 'SDF') {
        shader = createSDF(data);
      } else if (this.data.type === 'MSDF') {
        shader = createMSDF(data);
      } else {
        shader = createBasic(data);
      }

      this.material = new THREE.RawShaderMaterial(shader);

    } else {
      this.material.uniforms.opacity.value = this.data.opacity;
      this.material.uniforms.color.value.set(this.data.color);
      this.material.uniforms.map.value = this.texture;
    }

    if (this.mesh) {
      this.mesh.material = this.material;
    }
  },

   updateFont: function () {
     if (!this.data.fnt) {
       console.error(new TypeError('No font specified for bmfont text!'));
       return;
     }

     var geometry = this.geometry;
     var self = this;
     this.mesh.visible = false;
     loadBMFont(this.data.fnt, onLoadFont);

     var self = this;
     function onLoadFont (err, font) {
       if (err) {
         console.error(new Error('Error loading font ' + self.data.fnt +
           '\nMake sure the path is correct and that it points' +
           ' to a valid BMFont file (xml, json, fnt).\n' + err.message));
         return;
       }

       if (font.pages.length !== 1) {
         console.error(new Error('Currently only single-page bitmap fonts are supported.'));
         return;
       }
       var data = self.coerceData(self.data);

       var src = self.data.fntImage || path.dirname(data.fnt) + '/' + font.pages[0];

       geometry.update(assign({}, data, { font: font }));
       self.mesh.geometry = geometry;

       var obj3d = self.el.object3D;
       if (obj3d.children.indexOf(self.mesh) === -1) {
         self.el.object3D.add(self.mesh);
       }

       loadTexture(src, onLoadTexture);
       self.currentFont = font;
       self.updateLayout(data);
     }

     function onLoadTexture (image) {
       self.mesh.visible = true;
       if (image) {
         self.texture.image = image;
         self.texture.needsUpdate = true;
       }
     }
   },

   updateLayout: function (data) {
     var x;
     var y;
     var scale = data.scale;
     var layout = this.geometry.layout;
     var anchor = data.anchor;
     var baseline = data.baseline;

     // anchors text left/center/right
     if (anchor === 'left') {
       x = 0;
     } else if (anchor === 'right') {
       x = -layout.width;
     } else if (anchor === 'center') {
       x = -layout.width / 2;
     } else {
       throw new TypeError('invalid anchor ' + anchor);
     }

     // anchors text to top/center/bottom
     if (baseline === 'bottom') {
       y = 0;
     } else if (baseline === 'top') {
       y = -layout.height + layout.ascender;
     } else if (baseline === 'center') {
       y = -layout.height / 2;
     } else {
       throw new TypeError('invalid baseline ' + baseline);
     }

     this.mesh.position.x = scale * x;
     this.mesh.position.y = scale * y;
     this.geometry.computeBoundingSphere();
   }
});

function loadTexture (src, cb) {
  var loader = new THREE.ImageLoader()
  loader.load(src, function (image) {
    cb(image)
  }, undefined, function () {
    console.error('Could not load bmfont texture "' + src +
      '"\nMake sure it is correctly defined in the bitmap .fnt file.')
    cb(null)
  })
}

function threeSideFromString (str) {
  switch (str) {
    case 'double': return THREE.DoubleSide
    case 'front': return THREE.FrontSide
    case 'back': return THREE.BackSide
    default:
      throw new TypeError('unknown side string ' + str)
  }
}

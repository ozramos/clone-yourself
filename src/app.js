import P5 from 'p5'
const handsfree = (window.handsfree = new Handsfree({
  models: {
    head: { enabled: false },
    bodypix: {
      enabled: true
    }
  }
}))

new P5((p5) => {
  p5.setup = () => {
    // How many clones to do horizontally/vertically
    let clones = {
      x: 8,
      y: 12
    }
    let widthHeightRatio

    // Let's create some buttons and the main p5 canvas
    let startBtn = p5.createButton('Start Webcam')
    startBtn.mousePressed(() => handsfree.start())
    startBtn.class('handsfree-show-when-stopped')

    let stopBtn = p5.createButton('Stop Webcam')
    stopBtn.mousePressed(() => handsfree.stop())
    stopBtn.class('handsfree-show-when-started')

    let renderer = p5.createCanvas(600, 600)
    let $canvas = renderer.canvas
    let canvasCtx = $canvas.getContext('2d')

    // Create a canvas that'll contain our segmentation
    let $buffer = document.createElement('canvas')
    $buffer.style.display = 'none'
    let bufferCtx = $buffer.getContext('2d')
    document.body.appendChild($buffer)

    // Configure Handsfree
    let handsfree = new Handsfree({
      models: {
        head: { enabled: false },
        bodypix: {
          enabled: true
          // modelConfig: {
          //   architecture: 'MobileNetV1',
          //   outputStride: 8,
          //   multiplier: 0.5,
          //   quantBytes: 1
          // }
        }
      }
    })
    // Handsfree.disableAll()

    // Create a new "plugin"
    Handsfree.use('bodypix.clones', {
      // Set the buffer dimensions to match video stream
      // (this gets called automatically after Handsfree.use is called)
      onUse() {
        $buffer.width = handsfree.debugger.video.width
        $buffer.height = handsfree.debugger.video.height
        widthHeightRatio = $buffer.width / $buffer.height
      },

      // Create a segmentation mask, then paste onto p5 canvas a bunch of times
      // (this is called automatically every frame)
      onFrame({ body, model }) {
        if (!body.data) return

        // Create a segmentation mask, using magenta as the "green screen"
        model.bodypix.sdk.drawMask(
          $buffer,
          handsfree.debugger.video,
          model.bodypix.sdk.toMask(
            body.data,
            { r: 0, g: 0, b: 0, a: 0 },
            { r: 255, g: 0, b: 255, a: 255 }
          ),
          1,
          0,
          0
        )

        // Make all magenta pixels transparent
        let imageData = bufferCtx.getImageData(
          0,
          0,
          $buffer.width,
          $buffer.height
        )
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (
            imageData.data[i] === 255 &&
            imageData.data[i + 1] === 0 &&
            imageData.data[i + 2] === 255
          ) {
            imageData.data[i + 3] = 0
          }
        }
        bufferCtx.putImageData(imageData, 0, 0)

        // Paste the segmentation a bunch of times
        for (let row = 0; row < clones.y; row++) {
          for (let col = 0; col < clones.x; col++) {
            // Scale: make clones further down larger to give illusion of depth
            let w = $buffer.width / clones.x
            let h = w * widthHeightRatio

            // Stagger every other row
            let x = col * w - (w / 2) * (row % 2)
            let y = (row * h) / 3 - h / 2

            canvasCtx.drawImage($buffer, x, y, w, h)
          }
        }
      }
    })
  }

  p5.draw = () => {
    p5.background(255)
  }
})

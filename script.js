const video = document.getElementById('video')

let cachedDescriptors = [] // 🧠 Cached face data

// Load models and start
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(async () => {
  cachedDescriptors = loadStoredFaces()
  startVideo()
})

// Start webcam
function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => video.srcObject = stream)
    .catch(err => console.error('Camera error:', err))
}

// Reusable: Load stored faces once
function loadStoredFaces() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('face_'))
  return keys.map(key => {
    const name = key.replace('face_', '')
    const descriptor = new Float32Array(JSON.parse(localStorage.getItem(key)))
    return new faceapi.LabeledFaceDescriptors(name, [descriptor])
  })
}

// Register face
async function registerFace() {
  const name = document.getElementById('nameInput').value.trim()
  if (!name) return alert('Please enter a name.')

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) return alert('No face detected. Try again.')

  const descriptor = detection.descriptor
  localStorage.setItem('face_' + name, JSON.stringify(Array.from(descriptor)))
  cachedDescriptors = loadStoredFaces() // 🔁 Refresh cache
  alert('Face registered as: ' + name)
}

// Recognize face
async function recognizeFace() {
  if (cachedDescriptors.length === 0) {
    return alert('No registered faces found.')
  }

  const matcher = new faceapi.FaceMatcher(cachedDescriptors, 0.6)

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) return alert('No face detected.')

  const bestMatch = matcher.findBestMatch(detection.descriptor)
  alert('Result: ' + bestMatch.toString())
}

// Video play detection and canvas overlay
video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video)
  document.body.append(canvas)

  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)

  const context = canvas.getContext('2d', { willReadFrequently: true })

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()

    const resized = faceapi.resizeResults(detections, displaySize)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.clearRect(0, 0, canvas.width, canvas.height)

    faceapi.draw.drawDetections(canvas, resized)
    // Optional: add expressions
    // faceapi.draw.drawFaceExpressions(canvas, resized)
  }, 200) // ⏱ Slightly slower than 100ms for performance
})

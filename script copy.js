const video = document.getElementById('video')

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo)

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => video.srcObject = stream)
    .catch(err => console.error(err))
}

video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video)
  document.body.append(canvas)
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      // .withFaceExpressions()

    const resized = faceapi.resizeResults(detections, displaySize)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.clearRect(0, 0, canvas.width, canvas.height)

    faceapi.draw.drawDetections(canvas, resized)
    // faceapi.draw.drawFaceExpressions(canvas, resized)
  }, 100)
})

// Register face
async function registerFace() {
  const name = document.getElementById('nameInput').value.trim()
  if (!name) return alert('Please enter a name.')

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) {
    return alert('No face detected. Try again.')
  }

  const descriptor = detection.descriptor
  localStorage.setItem('face_' + name, JSON.stringify(Array.from(descriptor)))
  alert('Face registered as: ' + name)
}

// Load stored face data
function loadStoredFaces() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('face_'))
  return keys.map(key => {
    const name = key.replace('face_', '')
    const descriptor = new Float32Array(JSON.parse(localStorage.getItem(key)))
    return new faceapi.LabeledFaceDescriptors(name, [descriptor])
  })
}

// Recognize face
async function recognizeFace() {
  const stored = loadStoredFaces()
  if (stored.length === 0) {
    return alert('No registered faces found.')
  }

  const matcher = new faceapi.FaceMatcher(stored, 0.6)

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) {
    return alert('No face detected.')
  }

  const bestMatch = matcher.findBestMatch(detection.descriptor)
  alert('Result: ' + bestMatch.toString())
}

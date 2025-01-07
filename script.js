let scene, camera, renderer, visualizer, audioContext, analyser, dataArray, isPlaying = false;
let visualElements = [];
let rotationSpeed = 0;
let heightScale = 1;
let visualizationMode = 'bars';
let primaryColor = 0x00ff00;
let secondaryColor = 0x0000ff;
let orbitControls;

// Add these variables at the start of your file
let audioBuffer = null;      // Store the decoded audio buffer
let customAudioBuffer = null; // Store uploaded audio buffer
let source = null;           // Current audio source
let isDemo = false;          // Track if we're playing demo or custom audio

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('visualizer').appendChild(renderer.domElement);

    visualizer = new THREE.Group();
    scene.add(visualizer);

    initAudio();
    loadDemoSong();  // Load the demo song
    createVisualization();
    animate();

    window.addEventListener('resize', onWindowResize, false);
}

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function loadDemoSong() {
    fetch('song.mp3')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            return audioContext.decodeAudioData(arrayBuffer);
        })
        .then(buffer => {
            audioBuffer = buffer;
            console.log('Demo song loaded successfully');
            document.getElementById('playPauseButton').textContent = 'Play Demo';
        })
        .catch(error => {
            console.error('Error loading demo song:', error);
            alert('Failed to load the demo song. Please ensure song.mp3 is in the correct location.');
        });
}

function createVisualization() {
    const geometry = new THREE.BoxGeometry(0.05, 1, 0.05);
    const material = new THREE.MeshBasicMaterial({ color: primaryColor });

    for (let i = 0; i < analyser.frequencyBinCount; i++) {
        const element = new THREE.Mesh(geometry, material);
        element.position.set(i * 0.1 - (analyser.frequencyBinCount * 0.1) / 2, 0, 0);
        visualizer.add(element);
        visualElements.push(element);
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (isPlaying) {
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < visualElements.length; i++) {
            const value = dataArray[i];
            const element = visualElements[i];

            switch (visualizationMode) {
                case 'bars':
                    element.scale.y = (value / 128.0) * heightScale;
                    element.position.y = (element.scale.y / 2) - 0.5;
                    break;
                case 'circles':
                    element.scale.x = element.scale.z = (value / 128.0) * heightScale;
                    break;
                case 'wave':
                    element.position.y = Math.sin(i * 0.2 + Date.now() * 0.005) * (value / 256.0) * heightScale;
                    break;
                case 'sphere':
                    const theta = (i / visualElements.length) * Math.PI * 2;
                    const radius = 2 + (value / 256.0) * heightScale;
                    element.position.x = Math.cos(theta) * radius;
                    element.position.y = Math.sin(theta) * radius;
                    break;
            }
        }

        visualizer.rotation.y += rotationSpeed * 0.01;
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

document.getElementById('uploadButton').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                if (source) {
                    source.stop();
                    source.disconnect();
                }
                customAudioBuffer = buffer;
                source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(analyser);
                analyser.connect(audioContext.destination);
                source.start(0);
                isPlaying = true;
                isDemo = false;
                document.getElementById('playPauseButton').textContent = 'Pause';
            });
        };
        reader.readAsArrayBuffer(file);
    }
});

document.getElementById('playPauseButton').addEventListener('click', () => {
    if (!audioContext || (!audioBuffer && !customAudioBuffer)) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    if (isPlaying) {
        audioContext.suspend();
        isPlaying = false;
        document.getElementById('playPauseButton').textContent = isDemo ? 'Play Demo' : 'Play';
    } else {
        if (!source) {
            source = audioContext.createBufferSource();
            source.buffer = isDemo ? audioBuffer : customAudioBuffer;
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            source.start(0);
        }
        audioContext.resume();
        isPlaying = true;
        document.getElementById('playPauseButton').textContent = 'Pause';
    }
});

document.getElementById('resetButton').addEventListener('click', () => {
    if (source) {
        source.stop();
        source.disconnect();
        source = null;
    }
    isPlaying = false;
    isDemo = false;
    document.getElementById('playPauseButton').textContent = 'Play';
    
    // Reset visualization
    visualElements.forEach(element => {
        element.scale.set(1, 1, 1);
        element.position.y = 0;
    });
});

document.getElementById('visualizationMode').addEventListener('change', (event) => {
    visualizationMode = event.target.value;
    updateVisualizationGeometry();
});

document.getElementById('barsCount').addEventListener('input', (event) => {
    const count = parseInt(event.target.value);
    document.getElementById('barsValue').textContent = count;
    updateVisualizationCount(count);
});

document.getElementById('heightScale').addEventListener('input', (event) => {
    heightScale = parseFloat(event.target.value);
    document.getElementById('scaleValue').textContent = heightScale.toFixed(1);
});

document.getElementById('rotationSpeed').addEventListener('input', (event) => {
    rotationSpeed = parseFloat(event.target.value);
    document.getElementById('rotationValue').textContent = rotationSpeed.toFixed(1);
});

document.getElementById('primaryColor').addEventListener('input', (event) => {
    primaryColor = parseInt(event.target.value.slice(1), 16);
    updateVisualizationColors();
});

document.getElementById('secondaryColor').addEventListener('input', (event) => {
    secondaryColor = parseInt(event.target.value.slice(1), 16);
    updateVisualizationColors();
});

function updateVisualizationGeometry() {
    let geometry;
    switch (visualizationMode) {
        case 'bars':
            geometry = new THREE.BoxGeometry(0.05, 1, 0.05);
            break;
        case 'circles':
        case 'wave':
        case 'sphere':
            geometry = new THREE.SphereGeometry(0.025, 32, 32);
            break;
    }

    visualElements.forEach(element => {
        element.geometry.dispose();
        element.geometry = geometry;
    });
}

function updateVisualizationCount(count) {
    const difference = count - visualElements.length;

    if (difference > 0) {
        const geometry = visualizationMode === 'bars' ? new THREE.BoxGeometry(0.05, 1, 0.05) : new THREE.SphereGeometry(0.025, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: primaryColor });

        for (let i = 0; i < difference; i++) {
            const element = new THREE.Mesh(geometry, material);
            visualizer.add(element);
            visualElements.push(element);
        }
    } else if (difference < 0) {
        for (let i = 0; i < -difference; i++) {
            const element = visualElements.pop();
            visualizer.remove(element);
            element.geometry.dispose();
            element.material.dispose();
        }
    }

    visualElements.forEach((element, i) => {
        element.position.x = i * 0.1 - (count * 0.1) / 2;
    });
}

function updateVisualizationColors() {
    visualElements.forEach((element, i) => {
        const color = i % 2 === 0 ? primaryColor : secondaryColor;
        element.material.color.setHex(color);
    });
}

document.querySelectorAll('.preset-button').forEach(button => {
    button.addEventListener('click', () => {
        const preset = button.dataset.preset;
        applyPreset(preset);
    });
});

function applyPreset(preset) {
    switch (preset) {
        case 'energetic':
            document.getElementById('visualizationMode').value = 'bars';
            document.getElementById('barsCount').value = 64;
            document.getElementById('heightScale').value = 1.5;
            document.getElementById('rotationSpeed').value = 1;
            document.getElementById('primaryColor').value = '#ff0000';
            document.getElementById('secondaryColor').value = '#ffff00';
            break;
        case 'chill':
            document.getElementById('visualizationMode').value = 'wave';
            document.getElementById('barsCount').value = 32;
            document.getElementById('heightScale').value = 1;
            document.getElementById('rotationSpeed').value = 0.5;
            document.getElementById('primaryColor').value = '#00ffff';
            document.getElementById('secondaryColor').value = '#0000ff';
            break;
        case 'psychedelic':
            document.getElementById('visualizationMode').value = 'sphere';
            document.getElementById('barsCount').value = 128;
            document.getElementById('heightScale').value = 2;
            document.getElementById('rotationSpeed').value = 1.5;
            document.getElementById('primaryColor').value = '#ff00ff';
            document.getElementById('secondaryColor').value = '#00ff00';
            break;
    }

    // Trigger change events to update the visualization
    document.getElementById('visualizationMode').dispatchEvent(new Event('change'));
    document.getElementById('barsCount').dispatchEvent(new Event('input'));
    document.getElementById('heightScale').dispatchEvent(new Event('input'));
    document.getElementById('rotationSpeed').dispatchEvent(new Event('input'));
    document.getElementById('primaryColor').dispatchEvent(new Event('input'));
    document.getElementById('secondaryColor').dispatchEvent(new Event('input'));
}

document.getElementById('fullscreenButton').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

function toggleUI() {
    const wrapper = document.querySelector('.controls-wrapper');
    const button = document.getElementById('toggleControls');
    wrapper.classList.toggle('hidden');
    button.textContent = wrapper.classList.contains('hidden') ? 'Show UI' : 'Hide UI';
}

function handleResize() {
    const wrapper = document.querySelector('.controls-wrapper');
    const button = document.querySelector('.show-ui-button');
    
    if (window.innerWidth <= 768) {
        wrapper.classList.add('hidden');
        button.classList.add('visible');
    } else {
        wrapper.classList.remove('hidden');
        button.classList.remove('visible');
    }
}

document.getElementById('toggleControls').addEventListener('click', toggleUI);

document.querySelector('.show-ui-button').addEventListener('click', () => {
    const wrapper = document.querySelector('.controls-wrapper');
    wrapper.classList.remove('hidden');
    document.querySelector('.show-ui-button').classList.remove('visible');
});

document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h') {
        toggleUI();
    }
});

window.addEventListener('resize', handleResize);

function updateFrequencyBars() {
    if (!isPlaying || !analyser) return;

    analyser.getByteFrequencyData(dataArray);
    const bars = document.querySelectorAll('.frequency-bar div');
    const barCount = bars.length;

    for (let i = 0; i < barCount; i++) {
        const index = Math.floor(i * dataArray.length / barCount);
        const value = dataArray[index] / 255;
        bars[i].style.width = `${value * 100}%`;
    }

    requestAnimationFrame(updateFrequencyBars);
}

function applyEqualizer() {
    if (!audioContext) return;

    const bassBoost = parseFloat(document.getElementById('bassBoost').value);
    const trebleBoost = parseFloat(document.getElementById('trebleBoost').value);

    const bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 200;
    bassFilter.gain.value = (bassBoost - 1) * 10;

    const trebleFilter = audioContext.createBiquadFilter();
    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 2000;
    trebleFilter.gain.value = (trebleBoost - 1) * 10;

    source.disconnect();
    source.connect(bassFilter);
    bassFilter.connect(trebleFilter);
    trebleFilter.connect(analyser);
    analyser.connect(audioContext.destination);
}

document.getElementById('bassBoost').addEventListener('input', applyEqualizer);
document.getElementById('trebleBoost').addEventListener('input', applyEqualizer);

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
    });
});

function initMouseControls() {
    let isDragging = false;
    let previousMousePosition = {
        x: 0,
        y: 0
    };

    renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        const deltaMove = {
            x: e.offsetX - previousMousePosition.x,
            y: e.offsetY - previousMousePosition.y
        };

        if (isDragging) {
            const deltaRotationQuaternion = new THREE.Quaternion()
                .setFromEuler(new THREE.Euler(
                    toRadians(deltaMove.y * 1),
                    toRadians(deltaMove.x * 1),
                    0,
                    'XYZ'
                ));

            visualizer.quaternion.multiplyQuaternions(deltaRotationQuaternion, visualizer.quaternion);
        }

        previousMousePosition = {
            x: e.offsetX,
            y: e.offsetY
        };
    });

    renderer.domElement.addEventListener('mouseup', (e) => {
        isDragging = false;
    });

    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.01;
    });
}

function toRadians(angle) {
    return angle * (Math.PI / 180);
}

document.getElementById('resetCamera').addEventListener('click', () => {
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    visualizer.rotation.set(0, 0, 0);
});

document.getElementById('toggleOrbit').addEventListener('click', () => {
    if (orbitControls) {
        orbitControls.dispose();
        orbitControls = null;
    } else {
        orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    }
});

function switchAudio(toDemo) {
    if (source) {
        source.stop();
        source.disconnect();
    }
    isDemo = toDemo;
    source = null;
    isPlaying = false;
    document.getElementById('playPauseButton').textContent = toDemo ? 'Play Demo' : 'Play';
}

document.getElementById('demoSongButton').addEventListener('click', () => switchAudio(true));
document.getElementById('uploadButton').addEventListener('click', () => switchAudio(false));


// Initialize everything
init();
initMouseControls();
updateFrequencyBars();
handleResize();


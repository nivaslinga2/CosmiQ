document.addEventListener('DOMContentLoaded', () => {
    // --- UI Interactions ---
    const rangeInputs = ['p_prob', 'n_nodes', 'num_layers'];
    rangeInputs.forEach(id => {
        const input = document.getElementById(id);
        const valSpan = document.getElementById(`${id}_val`);
        if (input && valSpan) {
            input.addEventListener('input', (e) => {
                valSpan.textContent = e.target.value;
            });
        }
    });

    // Sidebar & Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const viewPanels = document.querySelectorAll('.view-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.dataset.tab) return;
            tabBtns.forEach(b => b.classList.remove('active'));
            viewPanels.forEach(p => p.classList.add('hidden'));
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const panel = document.getElementById(tabId);
            if (panel) panel.classList.remove('hidden');
            window.dispatchEvent(new Event('resize'));
        });
    });

    // --- Three.js Orbital Visualization Setup ---
    let scene, camera, renderer, controls;
    let globe, clouds, atmosphere, satellites = [], paths = [];
    const container = document.getElementById('orbital-viewport');

    // Texture URLs
    const TEX_EARTH = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg';
    const TEX_NORMAL = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg';
    const TEX_SPECULAR = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg';
    const TEX_CLOUDS = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png';

    function initThree() {
        if (!container) return;

        const width = container.offsetWidth || 800;
        const height = container.offsetHeight || 500;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1500);
        camera.position.set(0, 8, 15);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        const ControlsCtor = THREE.OrbitControls || window.OrbitControls;
        if (ControlsCtor) {
            controls = new ControlsCtor(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.minDistance = 7;
            controls.maxDistance = 30;
        }

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        // Sun Directional Light
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(50, 20, 50);
        scene.add(sunLight);

        // Planet Shine (Subtle blue glow on the dark side)
        const blueLight = new THREE.PointLight(0x1565C0, 1, 50);
        blueLight.position.set(-20, -10, -20);
        scene.add(blueLight);

        // --- Earth Construction ---
        const textureLoader = new THREE.TextureLoader();
        globe = new THREE.Group();

        // 1. Core Earth
        const earthGeom = new THREE.SphereGeometry(5, 64, 64);
        const earthMat = new THREE.MeshPhongMaterial({
            map: textureLoader.load(TEX_EARTH),
            normalMap: textureLoader.load(TEX_NORMAL),
            normalScale: new THREE.Vector2(0.85, 0.85),
            specularMap: textureLoader.load(TEX_SPECULAR),
            specular: new THREE.Color('grey'),
            shininess: 15
        });
        const earthMesh = new THREE.Mesh(earthGeom, earthMat);
        globe.add(earthMesh);

        // 2. Cloud Layer
        const cloudGeom = new THREE.SphereGeometry(5.1, 64, 64);
        const cloudMat = new THREE.MeshPhongMaterial({
            map: textureLoader.load(TEX_CLOUDS),
            transparent: true,
            opacity: 0.4,
            depthWrite: false
        });
        clouds = new THREE.Mesh(cloudGeom, cloudMat);
        globe.add(clouds);

        // 3. Atmosphere Glow (Outer Haze)
        const atmosGeom = new THREE.SphereGeometry(5.2, 64, 64);
        const atmosMat = new THREE.MeshBasicMaterial({
            color: 0x4285F4,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        atmosphere = new THREE.Mesh(atmosGeom, atmosMat);
        scene.add(atmosphere);

        scene.add(globe);

        // Starfield (Realistic Density)
        const starGeom = new THREE.BufferGeometry();
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
        const starPos = [];
        for (let i = 0; i < 8000; i++) {
            const r = 400 + Math.random() * 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            starPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
        }
        starGeom.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
        scene.add(new THREE.Points(starGeom, starMat));

        animate();
    }

    function createSatelliteModel() {
        const sat = new THREE.Group();

        // Body (Gold Foil)
        const bodyGeom = new THREE.BoxGeometry(0.2, 0.3, 0.2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.9, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        sat.add(body);

        // Solar Panels (Blue Silicon)
        const panelGeom = new THREE.BoxGeometry(0.6, 0.15, 0.02);
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x0D47A1, metalness: 0.5, roughness: 0.3 });

        const panelL = new THREE.Mesh(panelGeom, panelMat);
        panelL.position.x = 0.45;
        sat.add(panelL);

        const panelR = new THREE.Mesh(panelGeom, panelMat);
        panelR.position.x = -0.45;
        sat.add(panelR);

        return sat;
    }

    function animate() {
        requestAnimationFrame(animate);

        // Steady rotation for the globe
        if (globe) {
            globe.rotation.y += 0.0005;
        }
        if (clouds) clouds.rotation.y += 0.0008; // Clouds move faster

        // Real-time Orbital Propagation
        const now = new Date();
        satellites.forEach(sat => {
            if (sat.userData && sat.userData.tle) {
                try {
                    const satrec = satellite.twoline2satrec(sat.userData.tle[0], sat.userData.tle[1]);
                    const positionAndVelocity = satellite.propagate(satrec, now);
                    const positionEci = positionAndVelocity.position;

                    if (positionEci) {
                        const gmst = satellite.gstime(now);
                        const positionGd = satellite.eciToGeodetic(positionEci, gmst);

                        // Convert to XYZ for Three.js
                        const radius = (6371 + positionGd.height) / 6371 * 7.5; // Scale to our orbit shell
                        const phi = positionGd.latitude;
                        const theta = positionGd.longitude + gmst; // Adjust for Earth rotation

                        sat.position.set(
                            radius * Math.cos(phi) * Math.cos(theta),
                            radius * Math.sin(phi),
                            radius * Math.cos(phi) * Math.sin(theta)
                        );
                        sat.lookAt(0, 0, 0);
                    }
                } catch (e) {
                    // Fallback to static if propagation fails
                }
            }
        });

        // Update signals
        paths.forEach(p => {
            if (p.userData && p.userData.update) p.userData.update();
        });

        if (controls) controls.update();
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    let currentCoords = null, currentQPath = null, currentCPath = null;
    let currentNames = [], currentTles = [];
    let signalAnimations = [];

    function updateOrbitalView(coords, path, pathColor = 0x00E5FF, names = [], tles = []) {
        // Clear previous paths and signals
        paths.forEach(p => {
            scene.remove(p);
            if (p.geometry) p.geometry.dispose();
            if (p.material) p.material.dispose();
        });
        paths = [];

        // Clear sats if coords changed
        if (JSON.stringify(coords) !== JSON.stringify(currentCoords)) {
            satellites.forEach(s => scene.remove(s));
            satellites = [];
            currentCoords = coords;

            const scale = 7.5;
            const threeCoords = coords.map(c => new THREE.Vector3(c[0] * scale, c[1] * scale, c[2] * scale));

            threeCoords.forEach((pos, i) => {
                const satGroup = createSatelliteModel();
                satGroup.position.copy(pos);
                satGroup.lookAt(0, 0, 0);

                // Store TLE for propagation
                if (tles && tles[i]) {
                    satGroup.userData.tle = tles[i];
                }

                scene.add(satGroup);
                satellites.push(satGroup);

                if (names[i]) satGroup.name = names[i];

                const beacon = new THREE.PointLight(0xAECBFA, 1, 3);
                beacon.position.copy(pos);
                scene.add(beacon);
                satellites.push(beacon);
            });
        }

        const scale = 7.5;
        const threeCoords = coords.map(c => new THREE.Vector3(c[0] * scale, c[1] * scale, c[2] * scale));

        if (path && path.length > 1) {
            const fullPath = [...path, path[0]];

            for (let i = 0; i < fullPath.length - 1; i++) {
                const start = threeCoords[fullPath[i]];
                const end = threeCoords[fullPath[i + 1]];

                const curve = new THREE.QuadraticBezierCurve3(
                    start,
                    start.clone().add(end).normalize().multiplyScalar(scale + 1.2),
                    end
                );

                const points = curve.getPoints(30);
                const geometry = new THREE.BufferGeometry().setFromPoints(points);

                const material = new THREE.LineBasicMaterial({
                    color: pathColor,
                    transparent: true,
                    opacity: 0.6,
                    linewidth: 2
                });
                const line = new THREE.Line(geometry, material);
                scene.add(line);
                paths.push(line);

                // Animated Data Signal
                const signalGeom = new THREE.SphereGeometry(0.1, 12, 12);
                const signalMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const signal = new THREE.Mesh(signalGeom, signalMat);
                scene.add(signal);
                paths.push(signal);

                let t = Math.random();
                const speed = 0.005 + (Math.random() * 0.005);

                // Attach a custom update property for the main loop
                signal.userData.update = () => {
                    t += speed;
                    if (t > 1) t = 0;
                    signal.position.copy(curve.getPoint(t));
                };
            }
        }
    }

    // Handle Resize
    window.addEventListener('resize', () => {
        if (!container || !renderer) return;
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
    });

    initThree();

    // View Toggling Logic
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentCoords) return;

            document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.dataset.view;
            if (view === 'quantum') {
                updateOrbitalView(currentCoords, currentQPath, 0x00E5FF, currentNames, currentTles);
            } else if (view === 'classical') {
                updateOrbitalView(currentCoords, currentCPath, 0xFF5252, currentNames, currentTles);
            } else if (view === 'both') {
                updateOrbitalView(currentCoords, currentQPath, 0x00E5FF, currentNames, currentTles);
                // Draw classical on top
                const scale = 7.5;
                const threeCoords = currentCoords.map(c => new THREE.Vector3(c[0] * scale, c[1] * scale, c[2] * scale));
                drawPathOnly(threeCoords, currentCPath, 0xFF5252);
            }
        });
    });

    function drawPathOnly(threeCoords, path, color) {
        if (!path || path.length <= 1) return;
        const scale = 7.5;
        const fullPath = [...path, path[0]];
        for (let i = 0; i < fullPath.length - 1; i++) {
            const start = threeCoords[fullPath[i]];
            const end = threeCoords[fullPath[i + 1]];
            const curve = new THREE.QuadraticBezierCurve3(start, start.clone().add(end).normalize().multiplyScalar(scale + 1.2), end);
            const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(30));
            const material = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.4, linewidth: 1 });
            const line = new THREE.Line(geometry, material);
            scene.add(line);
            paths.push(line);
        }
    }

    // --- Run Simulation ---
    const form = document.getElementById('configForm');
    const runBtn = document.getElementById('runBtn');
    const loading = document.getElementById('loading');
    const resultsArea = document.getElementById('results-area');
    const introPlaceholder = document.getElementById('intro-placeholder');

    // --- UI Controls ---
    const sourceSelect = document.getElementById('constellation_source');
    const realTimeOptions = document.getElementById('real_time_options');

    if (sourceSelect) {
        sourceSelect.addEventListener('change', (e) => {
            if (e.target.value === 'real_time') {
                realTimeOptions.classList.remove('hidden');
            } else {
                realTimeOptions.classList.add('hidden');
            }
        });
    }

    if (runBtn) {
        console.log("Optimize Routing button initialized");
        runBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Optimizing routing...");

            const nodesVal = document.getElementById('n_nodes')?.value;
            const layersVal = document.getElementById('num_layers')?.value;
            const backendVal = document.getElementById('quantum_backend')?.value;
            const sourceVal = document.getElementById('constellation_source')?.value;
            const groupVal = document.getElementById('constellation_group')?.value;

            const data = {
                n_nodes: nodesVal || 3,
                num_layers: layersVal || 1,
                quantum_backend: backendVal || 'simulator',
                constellation_source: sourceVal || 'simulated',
                constellation_group: groupVal || 'starlink',
                classical_method: document.getElementById('classical_method')?.value || 'Greedy (Approximate)',
                seed: Math.floor(Math.random() * 1000)
            };

            const loading = document.getElementById('loading');
            const resultsArea = document.getElementById('results-area');
            const introPlaceholder = document.getElementById('intro-placeholder');

            const originalText = runBtn.innerHTML;
            runBtn.disabled = true;
            runBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> Computing Path...';

            if (loading) loading.classList.remove('hidden');
            if (resultsArea) resultsArea.classList.add('hidden');
            if (introPlaceholder) introPlaceholder.classList.add('hidden');

            try {
                const response = await fetch('/run_simulation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Simulation failed");
                console.log("Simulation complete:", result);
                displayResults(result);
            } catch (error) {
                console.error("Simulation error:", error);
                alert(`Mission Control Error: ${error.message}`);
            } finally {
                runBtn.disabled = false;
                runBtn.innerHTML = originalText;
                loading.classList.add('hidden');
            }
        });
    }


    function displayResults(data) {
        const resultsArea = document.getElementById('results-area');
        if (resultsArea) resultsArea.classList.remove('hidden');

        currentCoords = data.coords;
        currentQPath = data.q_path;
        currentCPath = data.c_path;
        currentNames = data.names || [];
        currentTles = data.tles || [];

        // Update 3D View (Default to Quantum)
        updateOrbitalView(data.coords, data.q_path, 0x00E5FF, currentNames, currentTles);
        document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
        const qBtn = document.querySelector('[data-view="quantum"]');
        if (qBtn) qBtn.classList.add('active');

        // Metrics
        const cCostVal = document.getElementById('c-cost-val');
        const cTimeVal = document.getElementById('c-time-val');
        const qCostVal = document.getElementById('q-cost-val');
        const qTimeVal = document.getElementById('q-time-val');

        if (cCostVal) cCostVal.textContent = `${data.classical_cost} ms`;
        if (cTimeVal) cTimeVal.textContent = `${data.classical_time.toFixed(4)}s`;
        if (qCostVal) qCostVal.textContent = `${data.quantum_cost} ms`;
        if (qTimeVal) qTimeVal.textContent = `${data.quantum_time.toFixed(4)}s`;

        // Calculate Delta
        const delta = ((data.quantum_cost - data.classical_cost) / data.classical_cost) * 100;
        const deltaVal = document.getElementById('delta-val');
        const deltaLabel = document.getElementById('delta-label');

        if (deltaVal) {
            deltaVal.textContent = `${Math.abs(delta).toFixed(1)}%`;
            if (delta < 0) {
                deltaVal.style.color = '#81C784';
                if (deltaLabel) deltaLabel.textContent = 'Quantum Optimization Advantage';
            } else {
                deltaVal.style.color = '#E57373';
                if (deltaLabel) deltaLabel.textContent = 'Quantum Overhead (vs Greedy)';
            }
        }

        // Plots
        const config = { responsive: true, displayModeBar: false };

        if (data.plots) {
            if (data.plots.performance) {
                Plotly.newPlot('plot-performance', data.plots.performance.data, data.plots.performance.layout, config);
            }
            if (data.plots.classical) {
                Plotly.newPlot('plot-classical', data.plots.classical.data, data.plots.classical.layout, config);
            }
            if (data.plots.quantum) {
                Plotly.newPlot('plot-quantum', data.plots.quantum.data, data.plots.quantum.layout, config);
            }
        }

        // Optimized Path Text
        const bitstringVal = document.getElementById('bitstring-val');
        if (bitstringVal) {
            const pathStr = Array.isArray(data.path) ? data.path.join(' → ') : data.path;
            bitstringVal.textContent = pathStr;
        }
    }
});

import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import helvetikerBoldFont from 'three/examples/fonts/helvetiker_bold.typeface.json';

interface HeroVisualizerProps {
    isPlaying: boolean;
    analyser?: AnalyserNode | null;
    trackTitle?: string;
}

const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
    const materials = Array.isArray(material) ? material : [material];
    for (const mat of materials) {
        const anyMat = mat as any;
        for (const key of Object.keys(anyMat)) {
            const value = anyMat[key];
            if (value && typeof value === 'object' && typeof value.dispose === 'function') {
                value.dispose();
            }
        }
        mat.dispose();
    }
};

const disposeObject3D = (root: THREE.Object3D) => {
    root.traverse((obj) => {
        const anyObj = obj as any;
        if (anyObj.geometry && typeof anyObj.geometry.dispose === 'function') {
            anyObj.geometry.dispose();
        }
        if (anyObj.material) {
            disposeMaterial(anyObj.material);
        }
    });
};

interface SceneState {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    analyser: AnalyserNode | null;
    dataArray: Uint8Array | null;
    textMesh: THREE.Mesh | null;
    haloSystem: THREE.Points | null;
    warpTrails: THREE.LineSegments | null;
    trailVelocities: Float32Array | null;
    aurora: THREE.Mesh | null;
    starSystem: THREE.Points;
    nebulaSystem: THREE.Points;
    animationId: number;
    resizeObserver: ResizeObserver | null;
    windowResizeHandler: (() => void) | null;
    isPlayingRef: boolean;
    font: Font | null;
    uniforms: {
        time: { value: number };
        bass: { value: number };
        mid: { value: number };
        high: { value: number };
    };
}

export const HeroVisualizer: React.FC<HeroVisualizerProps> = ({ isPlaying, analyser, trackTitle }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<SceneState | null>(null);
    const fontRef = useRef<Font | null>(null);
    const pendingTitleRef = useRef<string | undefined>(trackTitle);
    const mountedRef = useRef(false);
    const animationRunningRef = useRef(true);

    const updateTextMesh = useCallback((title?: string) => {
        const state = sceneRef.current;
        const font = fontRef.current;
        if (!state || !font) {
            pendingTitleRef.current = title;
            return;
        }

        const nextText = (title && title.trim()) ? title.trim() : 'DLM GEN';
        const safeText = nextText.length > 36 ? `${nextText.slice(0, 36)}…` : nextText;

        if (state.textMesh) {
            try {
                state.scene.remove(state.textMesh);
                disposeObject3D(state.textMesh);
            } catch {
                // ignore
            }
            state.textMesh = null;
        }

        const textGeo = new TextGeometry(safeText, {
            font,
            size: 5,
            depth: 1.2,
            curveSegments: 14,
            bevelEnabled: true,
            bevelThickness: 0.25,
            bevelSize: 0.2,
            bevelSegments: 4
        });
        textGeo.center();

        const textMat = new THREE.MeshStandardMaterial({
            color: 0xfff5ed,
            emissive: new THREE.Color(0xff6b6b),
            emissiveIntensity: 1.8,
            metalness: 0.4,
            roughness: 0.25,
            transparent: true,
            opacity: 0.98,
            toneMapped: false,
            depthWrite: false,
            depthTest: false
        });

        const textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.position.set(0, -1.6, -8);
        textMesh.rotation.x = -0.1;
        textMesh.renderOrder = 5;
        state.scene.add(textMesh);
        state.textMesh = textMesh;
        pendingTitleRef.current = undefined;
    }, []);


    const initScene = useCallback(() => {
        // Prevent double initialization from React StrictMode
        if (!containerRef.current || sceneRef.current || mountedRef.current) return;
        mountedRef.current = true;
        animationRunningRef.current = true;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === 0 || height === 0) {
            requestAnimationFrame(() => initScene());
            return;
        }
        const aspect = width / height;

        const createStarTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            if (!ctx) return new THREE.Texture();
            const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 32, 32);
            return new THREE.CanvasTexture(canvas);
        };

        const createNebulaTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            if (!ctx) return new THREE.Texture();
            const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.6, 'rgba(200,200,255,0.4)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 64, 64);
            return new THREE.CanvasTexture(canvas);
        };

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0b0406, 0.0022);

        const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2200);
        camera.position.z = 110;

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
            // Removed powerPreference to ensure better compatibility
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        container.appendChild(renderer.domElement);

        const uniforms = {
            time: { value: 0 },
            bass: { value: 0 },
            mid: { value: 0 },
            high: { value: 0 }
        };

        const ambient = new THREE.AmbientLight(0xffd7d0, 0.42);
        scene.add(ambient);
        const keyLight = new THREE.PointLight(0xff6b6b, 2.2, 200);
        keyLight.position.set(0, 10, 24);
        scene.add(keyLight);
        const rimLight = new THREE.PointLight(0xff9f66, 1.1, 180);
        rimLight.position.set(-30, -10, -20);
        scene.add(rimLight);

        const starCount = 4200;
        const starGeo = new THREE.BufferGeometry();
        const starPos = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);
        const starColors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            const r = 40 + Math.random() * 320;
            const theta = Math.random() * Math.PI * 2;
            const depth = (Math.random() - 0.5) * 1100;

            starPos[i3] = r * Math.cos(theta);
            starPos[i3 + 1] = r * Math.sin(theta);
            starPos[i3 + 2] = depth;

            starSizes[i] = 0.6 + Math.random() * 1.6;

            const colorType = Math.random();
            if (colorType > 0.9) {
                starColors[i3] = 1.0; starColors[i3 + 1] = 0.7; starColors[i3 + 2] = 0.6;
            } else if (colorType > 0.65) {
                starColors[i3] = 0.7; starColors[i3 + 1] = 0.85; starColors[i3 + 2] = 1.0;
            } else {
                starColors[i3] = 1.0; starColors[i3 + 1] = 1.0; starColors[i3 + 2] = 1.0;
            }
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
        starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            map: createStarTexture(),
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const starSystem = new THREE.Points(starGeo, starMaterial);
        scene.add(starSystem);

        const haloCount = 650;
        const haloGeo = new THREE.BufferGeometry();
        const haloPos = new Float32Array(haloCount * 3);
        const haloColors = new Float32Array(haloCount * 3);

        for (let i = 0; i < haloCount; i++) {
            const i3 = i * 3;
            const radius = 18 + Math.random() * 40;
            const angle = Math.random() * Math.PI * 2;
            const tilt = (Math.random() - 0.5) * 12;

            haloPos[i3] = Math.cos(angle) * radius;
            haloPos[i3 + 1] = Math.sin(angle) * radius * 0.6 + tilt;
            haloPos[i3 + 2] = (Math.random() - 0.5) * 120;

            haloColors[i3] = 0.82 + Math.random() * 0.12;
            haloColors[i3 + 1] = 0.25 + Math.random() * 0.25;
            haloColors[i3 + 2] = 0.28 + Math.random() * 0.18;
        }

        haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
        haloGeo.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));

        const haloSystem = new THREE.Points(haloGeo, new THREE.PointsMaterial({
            size: 0.8,
            vertexColors: true,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        scene.add(haloSystem);

        const nebulaCount = 60;
        const nebulaGeo = new THREE.BufferGeometry();
        const nebulaPos = new Float32Array(nebulaCount * 3);
        const nebulaColors = new Float32Array(nebulaCount * 3);
        const nebulaSizes = new Float32Array(nebulaCount);

        for (let i = 0; i < nebulaCount; i++) {
            const i3 = i * 3;
            nebulaPos[i3] = (Math.random() - 0.5) * 420;
            nebulaPos[i3 + 1] = (Math.random() - 0.5) * 220;
            nebulaPos[i3 + 2] = -140 - Math.random() * 240;

            nebulaSizes[i] = 60 + Math.random() * 120;

            const colorChoice = Math.random();
            if (colorChoice < 0.33) {
                nebulaColors[i3] = 0.75; nebulaColors[i3 + 1] = 0.18; nebulaColors[i3 + 2] = 0.18;
            } else if (colorChoice < 0.66) {
                nebulaColors[i3] = 0.62; nebulaColors[i3 + 1] = 0.22; nebulaColors[i3 + 2] = 0.32;
            } else {
                nebulaColors[i3] = 0.92; nebulaColors[i3 + 1] = 0.32; nebulaColors[i3 + 2] = 0.28;
            }
        }

        nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPos, 3));
        nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
        nebulaGeo.setAttribute('size', new THREE.BufferAttribute(nebulaSizes, 1));

        const nebulaSystem = new THREE.Points(nebulaGeo, new THREE.PointsMaterial({
            size: 70,
            vertexColors: true,
            map: createNebulaTexture(),
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        scene.add(nebulaSystem);

        const trailCount = 140;
        const trailPositions = new Float32Array(trailCount * 6);
        const trailVelocities = new Float32Array(trailCount);

        for (let i = 0; i < trailCount; i++) {
            const i6 = i * 6;
            const r = 30 + Math.random() * 260;
            const theta = Math.random() * Math.PI * 2;
            const z = (Math.random() - 0.5) * 900;
            const len = 10 + Math.random() * 24;
            trailPositions[i6] = Math.cos(theta) * r;
            trailPositions[i6 + 1] = Math.sin(theta) * r;
            trailPositions[i6 + 2] = z;
            trailPositions[i6 + 3] = trailPositions[i6];
            trailPositions[i6 + 4] = trailPositions[i6 + 1];
            trailPositions[i6 + 5] = z + len;
            trailVelocities[i] = 90 + Math.random() * 200;
        }

        const warpTrailGeo = new THREE.BufferGeometry();
        warpTrailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        const warpTrails = new THREE.LineSegments(warpTrailGeo, new THREE.LineBasicMaterial({
            color: new THREE.Color(0xff6b6b),
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        scene.add(warpTrails);

        const auroraGeo = new THREE.PlaneGeometry(420, 260, 50, 20);
        const aurora = new THREE.Mesh(auroraGeo, new THREE.MeshBasicMaterial({
            color: 0xe11d48,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        }));
        aurora.position.set(0, 10, -210);
        aurora.rotation.x = -Math.PI / 2.8;
        scene.add(aurora);

        sceneRef.current = {
            scene,
            camera,
            renderer,
            analyser: null,
            dataArray: null,
            textMesh: null,
            haloSystem,
            warpTrails,
            trailVelocities,
            aurora,
            starSystem,
            nebulaSystem,
            animationId: 0,
            resizeObserver: null,
            windowResizeHandler: null,
            isPlayingRef: isPlaying,
            font: null,
            uniforms
        };

        const handleContextLost = (e: Event) => {
            e.preventDefault?.();
            console.warn('HeroVisualizer WebGL context lost; will recreate after delay.');
            
            // Cancel current animation
            animationRunningRef.current = false;
            if (sceneRef.current) {
                cancelAnimationFrame(sceneRef.current.animationId);
            }
            
            // Schedule recreation with delay to allow GPU recovery
            setTimeout(() => {
                if (!sceneRef.current) return;
                try {
                    sceneRef.current.resizeObserver?.disconnect();
                    if (sceneRef.current.windowResizeHandler) {
                        window.removeEventListener('resize', sceneRef.current.windowResizeHandler);
                    }
                    disposeObject3D(sceneRef.current.scene);
                    sceneRef.current.scene.clear();
                    sceneRef.current.renderer.renderLists?.dispose?.();
                    sceneRef.current.renderer.dispose();
                } catch {
                    // ignore
                }
                if (containerRef.current && sceneRef.current.renderer.domElement) {
                    try {
                        containerRef.current.removeChild(sceneRef.current.renderer.domElement);
                    } catch {
                        // ignore
                    }
                }
                sceneRef.current = null;
                mountedRef.current = false;
                requestAnimationFrame(() => initScene());
            }, 100);
        };

        renderer.domElement.addEventListener('webglcontextlost', handleContextLost as any, false);

        try {
            const font = new FontLoader().parse(helvetikerBoldFont as any);
            fontRef.current = font;
            if (sceneRef.current) {
                sceneRef.current.font = font;
                updateTextMesh(pendingTitleRef.current);
            }
        } catch (err) {
            console.warn('HeroVisualizer font parse failed:', err);
        }

        const dirLight = new THREE.DirectionalLight(0xfff3e0, 1.35);
        dirLight.position.set(0, 14, 24);
        scene.add(dirLight);

        const textGlow = new THREE.PointLight(0xf43f5e, 2.1, 120);
        textGlow.position.set(0, 4, 10);
        scene.add(textGlow);

        const handleResize = () => {
            if (!containerRef.current || !sceneRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            if (w === 0 || h === 0) return;
            sceneRef.current.camera.aspect = w / h;
            sceneRef.current.camera.updateProjectionMatrix();
            sceneRef.current.renderer.setSize(w, h);
            sceneRef.current.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        };

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => handleResize());
            ro.observe(container);
            sceneRef.current.resizeObserver = ro;
        } else {
            window.addEventListener('resize', handleResize);
            sceneRef.current.windowResizeHandler = handleResize;
        }

        const clock = new THREE.Clock(true);
        clock.start();
        let smoothBass = 0, smoothMid = 0, smoothHigh = 0;
        let lastTime = performance.now();

        // Do an initial render immediately so something is visible
        renderer.render(scene, camera);

        const animate = (timestamp: number) => {
            // Always schedule next frame FIRST to ensure loop continues
            if (animationRunningRef.current && sceneRef.current) {
                sceneRef.current.animationId = requestAnimationFrame(animate);
            } else {
                return; // Stop if not running
            }
            
            const state = sceneRef.current;
            if (!state) return;

            // Skip rendering when tab is not visible to save resources
            if (document.hidden) {
                return;
            }
            
            const now = timestamp || performance.now();
            const delta = Math.max(0.016, Math.min((now - lastTime) / 1000, 0.1)); // Ensure minimum delta
            lastTime = now;
            const time = clock.getElapsedTime(); // Time since animation started

            try {
                // Use direct references from scene state
                const currentScene = state.scene;
                const currentCamera = state.camera;
                const currentRenderer = state.renderer;
                const currentAnalyser = state.analyser;
                const currentDataArray = state.dataArray;
                const currentStarSystem = state.starSystem;
                const currentNebulaSystem = state.nebulaSystem;
                const currentTextMesh = state.textMesh;
                const currentWarpTrails = state.warpTrails;
                const currentTrailVelocities = state.trailVelocities;
                const currentAurora = state.aurora;
                const currentHaloSystem = state.haloSystem;
                const currentIsPlaying = state.isPlayingRef;



                if (!currentTextMesh && fontRef.current) {
                    updateTextMesh(pendingTitleRef.current);
                }

                let bass = 0, mid = 0, high = 0;
                const hasAnalyser = currentIsPlaying && currentAnalyser && currentDataArray && currentDataArray.length > 0;
                if (hasAnalyser) {
                    currentAnalyser.getByteFrequencyData(currentDataArray);
                    const bufferLength = currentDataArray.length;
                    // Map FFT bins to perceptual bands instead of simple percentages
                    const nyquist = currentAnalyser.context.sampleRate / 2;
                    const freqToIndex = (freq: number) => Math.min(bufferLength, Math.max(1, Math.floor((freq / nyquist) * bufferLength)));

                    const bassStart = Math.max(0, freqToIndex(20) - 1);
                    const bassEnd = Math.max(bassStart + 1, freqToIndex(120));
                    const midEnd = Math.max(bassEnd + 1, freqToIndex(2000));
                    const highEnd = Math.max(midEnd + 1, freqToIndex(8000));

                    for (let i = bassStart; i < bassEnd && i < bufferLength; i++) bass += currentDataArray[i];
                    for (let i = bassEnd; i < midEnd && i < bufferLength; i++) mid += currentDataArray[i];
                    for (let i = midEnd; i < highEnd && i < bufferLength; i++) high += currentDataArray[i];

                    const bassBins = Math.max(1, Math.min(bufferLength, bassEnd) - bassStart);
                    const midBins = Math.max(1, Math.min(bufferLength, midEnd) - bassEnd);
                    const highBins = Math.max(1, Math.min(bufferLength, highEnd) - midEnd);

                    bass = bass / bassBins / 255;
                    mid = mid / midBins / 255;
                    high = high / highBins / 255;
                } else if (currentIsPlaying) {
                    bass = 0.24 + Math.sin(time * 2.6) * 0.18;
                    mid = 0.22 + Math.cos(time * 1.8) * 0.14;
                    high = 0.18 + Math.sin(time * 3.8) * 0.1;
                } else {
                    // Idle animation - significantly boosted for visibility
                    bass = 0.45 + Math.sin(time * 2.5) * 0.25;
                    mid = 0.40 + Math.cos(time * 2.0) * 0.22;
                    high = 0.35 + Math.sin(time * 2.8) * 0.18;
                }

                // Faster smoothing for more responsive animation
                smoothBass += (bass - smoothBass) * 0.3;
                smoothMid += (mid - smoothMid) * 0.3;
                smoothHigh += (high - smoothHigh) * 0.3;

                uniforms.bass.value = smoothBass;

                const warpSpeed = 120 + smoothBass * 600; // Increased base speed for more visible movement
                const starPositions = currentStarSystem.geometry.attributes.position.array as Float32Array;

                for (let i = 0; i < starPositions.length; i += 3) {
                    starPositions[i + 2] += warpSpeed * delta;
                    if (starPositions[i + 2] > 240) {
                        starPositions[i + 2] = -920;
                        const r = 50 + Math.random() * 320;
                        const theta = Math.random() * Math.PI * 2;
                        starPositions[i] = r * Math.cos(theta);
                        starPositions[i + 1] = r * Math.sin(theta);
                    }
                }
                currentStarSystem.geometry.attributes.position.needsUpdate = true;

                const starMat = currentStarSystem.material as THREE.PointsMaterial;
                starMat.size = 0.9 + smoothHigh * 1.8;
                starMat.opacity = 0.75 + smoothMid * 0.25;

                if (currentWarpTrails && currentTrailVelocities) {
                    const trailArr = currentWarpTrails.geometry.attributes.position.array as Float32Array;
                    for (let i = 0; i < currentTrailVelocities.length; i++) {
                        const i6 = i * 6;
                        const velocity = (currentTrailVelocities[i] + smoothBass * 500) * delta;
                        trailArr[i6 + 2] += velocity;
                        trailArr[i6 + 5] += velocity;
                        if (trailArr[i6 + 2] > 200) {
                            const r = 30 + Math.random() * 260;
                            const theta = Math.random() * Math.PI * 2;
                            const z = -900;
                            const len = 10 + Math.random() * 24;
                            trailArr[i6] = Math.cos(theta) * r;
                            trailArr[i6 + 1] = Math.sin(theta) * r;
                            trailArr[i6 + 2] = z;
                            trailArr[i6 + 3] = trailArr[i6];
                            trailArr[i6 + 4] = trailArr[i6 + 1];
                            trailArr[i6 + 5] = z + len;
                        }
                    }
                    currentWarpTrails.geometry.attributes.position.needsUpdate = true;
                    const mat = currentWarpTrails.material as THREE.LineBasicMaterial;
                    mat.opacity = 0.28 + smoothBass * 0.4;
                }

                currentNebulaSystem.rotation.z += 0.04 * delta;
                const nebulaMat = currentNebulaSystem.material as THREE.PointsMaterial;
                nebulaMat.opacity = 0.22 + smoothMid * 0.35;
                nebulaMat.color.setHSL(0.02 + smoothMid * 0.08, 0.78, 0.55);

                if (currentHaloSystem) {
                    currentHaloSystem.rotation.z += 0.15 * delta;
                    const haloMat = currentHaloSystem.material as THREE.PointsMaterial;
                    haloMat.size = 0.7 + smoothHigh * 1.4;
                    haloMat.opacity = 0.35 + smoothMid * 0.25;
                }

                if (currentAurora) {
                    currentAurora.rotation.z += 0.05 * delta;
                    currentAurora.scale.setScalar(1 + smoothMid * 0.3);
                    const auroraMat = currentAurora.material as THREE.MeshBasicMaterial;
                    auroraMat.opacity = 0.08 + smoothMid * 0.35;
                    auroraMat.color.setHSL(0.015 + smoothHigh * 0.05, 0.9, 0.55);
                }

                if (currentTextMesh) {
                    currentTextMesh.scale.setScalar(1 + smoothBass * 0.35);
                    currentTextMesh.position.y = -2 + Math.sin(time * 1.2) * 1.5 + smoothMid * 3;
                    currentTextMesh.rotation.y = Math.sin(time * 0.5) * 0.12;
                    const mat = currentTextMesh.material as THREE.MeshStandardMaterial;
                    mat.emissiveIntensity = 0.8 + smoothBass * 2;
                    mat.color.setHSL(0.02 + smoothHigh * 0.12, 0.8, 0.72);
                }

                // More dynamic camera movement
                currentCamera.position.x = Math.sin(time * 0.5) * (8 + smoothMid * 10);
                currentCamera.position.y = Math.cos(time * 0.4) * (6 + smoothBass * 6);
                currentCamera.position.z = 110 - smoothBass * 18;
                currentCamera.lookAt(0, 0, 40 + smoothBass * 25);

                currentRenderer.render(currentScene, currentCamera);
            } catch (e) {
                console.warn('HeroVisualizer animation error:', e);
            }
        };

        // Start the animation loop
        sceneRef.current.animationId = requestAnimationFrame(animate);

    }, [updateTextMesh]);

    // Update analyser when prop changes
    useEffect(() => {
        if (!sceneRef.current) return;
        sceneRef.current.analyser = analyser || null;
        if (analyser) {
            sceneRef.current.dataArray = new Uint8Array(analyser.frequencyBinCount);
        } else {
            sceneRef.current.dataArray = null;
        }
    }, [analyser]);

    // Update playing state so the animation can react more boldly when active
    useEffect(() => {
        if (sceneRef.current) {
            sceneRef.current.isPlayingRef = isPlaying;
        }
    }, [isPlaying]);

    // Refresh title mesh when the track changes
    useEffect(() => {
        pendingTitleRef.current = trackTitle;
        updateTextMesh(trackTitle);
    }, [trackTitle, updateTextMesh]);

    // Init Effect
    useEffect(() => {
        initScene();
        return () => {
            // Stop animation loop first
            animationRunningRef.current = false;
            
            if (sceneRef.current) {
                cancelAnimationFrame(sceneRef.current.animationId);
                sceneRef.current.resizeObserver?.disconnect();
                if (sceneRef.current.windowResizeHandler) {
                    window.removeEventListener('resize', sceneRef.current.windowResizeHandler);
                }
                try {
                    disposeObject3D(sceneRef.current.scene);
                    sceneRef.current.scene.clear();
                    sceneRef.current.renderer.renderLists?.dispose?.();
                    sceneRef.current.renderer.dispose();
                } catch (e) {
                    console.warn('HeroVisualizer cleanup failed:', e);
                } finally {
                    if (containerRef.current && sceneRef.current.renderer.domElement) {
                        try {
                            containerRef.current.removeChild(sceneRef.current.renderer.domElement);
                        } catch {
                            // Element may already be removed
                        }
                    }
                }
                sceneRef.current = null;
            }
            
            // Reset mount tracking for potential remount
            mountedRef.current = false;
        };
    }, [initScene]);

    const displayTitle = (trackTitle && trackTitle.trim()) ? trackTitle.trim() : 'DLM Gen';

    return (
        <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl shadow-red-900/25">
            {/* Direct Container for Three.js */}
            <div ref={containerRef} className="absolute inset-0 z-0" />

            {/* Overlay Gradient for integration */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none z-10" />

            <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Now playing</p>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-200 via-orange-200 to-amber-300 drop-shadow-[0_0_22px_rgba(248,113,113,0.35)] leading-tight max-w-[75%] break-words">
                            {displayTitle}
                        </h3>
                        <p className="text-xs text-white/60">Deep space reactive visualizer</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-[0.25em] text-white/80 backdrop-blur">
                            DLM Gen
                        </div>
                        <div className="px-3 py-1 rounded-full bg-red-500/10 text-[10px] uppercase tracking-[0.2em] text-red-100 border border-red-500/30">
                            Cosmic field
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">
                    <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-white/40'}`} />
                    <span>{isPlaying ? 'Audio reactive' : 'Idle orbit'}</span>
                </div>
            </div>

            {/* Optional Status Indicator */}
            {!isPlaying && (
                <div className="absolute top-4 right-4 z-20">
                    <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                </div>
            )}
        </div>
    );
};

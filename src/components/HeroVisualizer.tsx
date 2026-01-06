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
    aurora: THREE.Points | null;
    starSystem: THREE.Points;
    nebulaSystem: THREE.Points;
    orbsGroup: THREE.Group | null;
    textSpawnTime: number;
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
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            if (!ctx) return new THREE.Texture();
            
            // Clear with transparent background
            ctx.clearRect(0, 0, 64, 64);
            
            // Draw soft circular glow with proper falloff
            const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.1, 'rgba(255,255,255,0.9)');
            grad.addColorStop(0.4, 'rgba(255,255,255,0.3)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(32, 32, 32, 0, Math.PI * 2);
            ctx.fill();
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        };

        const createNebulaTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            if (!ctx) return new THREE.Texture();
            
            // Clear with transparent background
            ctx.clearRect(0, 0, 128, 128);
            
            // Draw soft organic nebula cloud
            const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(255,255,255,0.8)');
            grad.addColorStop(0.2, 'rgba(255,200,200,0.5)');
            grad.addColorStop(0.5, 'rgba(200,150,200,0.25)');
            grad.addColorStop(0.8, 'rgba(150,100,150,0.1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(64, 64, 64, 0, Math.PI * 2);
            ctx.fill();
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        };
        
        // Create organic cloud texture for aurora replacement
        const createCloudTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            if (!ctx) return new THREE.Texture();
            
            ctx.clearRect(0, 0, 256, 256);
            
            // Create multiple overlapping soft circles for organic look
            const drawSoftCircle = (x: number, y: number, r: number, alpha: number) => {
                const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
                grad.addColorStop(0, `rgba(255,100,100,${alpha})`);
                grad.addColorStop(0.3, `rgba(255,80,120,${alpha * 0.6})`);
                grad.addColorStop(0.6, `rgba(200,50,100,${alpha * 0.3})`);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            };
            
            // Scatter organic blobs
            drawSoftCircle(128, 128, 120, 0.4);
            drawSoftCircle(90, 100, 80, 0.3);
            drawSoftCircle(170, 140, 90, 0.35);
            drawSoftCircle(100, 160, 70, 0.25);
            drawSoftCircle(160, 90, 75, 0.28);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
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

        const ambient = new THREE.AmbientLight(0xffd7d0, 0.48);
        scene.add(ambient);
        const keyLight = new THREE.PointLight(0xff6b6b, 2.4, 220);
        keyLight.position.set(0, 12, 28);
        scene.add(keyLight);
        const rimLight = new THREE.PointLight(0xff9f66, 1.3, 200);
        rimLight.position.set(-35, -12, -25);
        scene.add(rimLight);
        
        // Additional rim light for orb reflections
        const orbRimLight = new THREE.PointLight(0xffaa88, 1.6, 150);
        orbRimLight.position.set(25, 8, 15);
        scene.add(orbRimLight);
        
        // Back rim light for depth and silhouette
        const backRimLight = new THREE.PointLight(0xff5566, 0.9, 180);
        backRimLight.position.set(0, -15, -40);
        scene.add(backRimLight);

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

        // Create organic nebula cloud system instead of rectangular aurora
        const cloudCount = 35;
        const cloudGeo = new THREE.BufferGeometry();
        const cloudPositions = new Float32Array(cloudCount * 3);
        const cloudColors = new Float32Array(cloudCount * 3);
        const cloudSizes = new Float32Array(cloudCount);
        const cloudOpacities = new Float32Array(cloudCount);
        
        for (let i = 0; i < cloudCount; i++) {
            const i3 = i * 3;
            // Distribute in a spherical shell behind the focal point
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI * 0.6;
            const radius = 150 + Math.random() * 120;
            
            cloudPositions[i3] = Math.cos(theta) * Math.cos(phi) * radius * 1.5;
            cloudPositions[i3 + 1] = Math.sin(phi) * radius * 0.6 + 20;
            cloudPositions[i3 + 2] = -Math.sin(theta) * Math.cos(phi) * radius - 80;
            
            cloudSizes[i] = 80 + Math.random() * 160;
            cloudOpacities[i] = 0.08 + Math.random() * 0.12;
            
            // Warm cosmic colors
            const colorChoice = Math.random();
            if (colorChoice < 0.4) {
                cloudColors[i3] = 0.9; cloudColors[i3 + 1] = 0.25; cloudColors[i3 + 2] = 0.35;
            } else if (colorChoice < 0.7) {
                cloudColors[i3] = 0.85; cloudColors[i3 + 1] = 0.35; cloudColors[i3 + 2] = 0.5;
            } else {
                cloudColors[i3] = 1.0; cloudColors[i3 + 1] = 0.45; cloudColors[i3 + 2] = 0.3;
            }
        }
        
        cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPositions, 3));
        cloudGeo.setAttribute('color', new THREE.BufferAttribute(cloudColors, 3));
        cloudGeo.setAttribute('size', new THREE.BufferAttribute(cloudSizes, 1));
        
        const aurora = new THREE.Points(cloudGeo, new THREE.PointsMaterial({
            size: 120,
            vertexColors: true,
            map: createCloudTexture(),
            transparent: true,
            opacity: 0.18,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        }));
        scene.add(aurora);

        // Create floating orbs with reflective materials
        const orbsGroup = new THREE.Group();
        const orbCount = 22;
        for (let i = 0; i < orbCount; i++) {
            const orbRadius = 0.6 + Math.random() * 1.0;
            const geo = new THREE.SphereGeometry(orbRadius, 32, 32);
            
            // Varied warm cosmic colors for each orb
            const colorChoice = Math.random();
            let orbColor, orbEmissive;
            if (colorChoice < 0.35) {
                orbColor = 0xffeedd;
                orbEmissive = new THREE.Color(0xff6b6b);
            } else if (colorChoice < 0.65) {
                orbColor = 0xfff0e6;
                orbEmissive = new THREE.Color(0xff8866);
            } else {
                orbColor = 0xffe8e0;
                orbEmissive = new THREE.Color(0xcc5555);
            }
            
            const mat = new THREE.MeshStandardMaterial({
                color: orbColor,
                emissive: orbEmissive,
                emissiveIntensity: 0.5 + Math.random() * 0.3,
                metalness: 0.65 + Math.random() * 0.2,
                roughness: 0.15 + Math.random() * 0.15,
                transparent: true,
                opacity: 0, // Start invisible, fade in later
                toneMapped: false,
            });
            
            const orb = new THREE.Mesh(geo, mat);
            
            // Distribute orbs in a sphere around the focal point
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 12 + Math.random() * 28;
            
            orb.position.set(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta) - 4,
                r * Math.cos(phi) - 18
            );
            
            // Store base position and random phase for animation
            orb.userData.basePos = orb.position.clone();
            orb.userData.phase = Math.random() * Math.PI * 2;
            orb.userData.floatSpeed = 0.3 + Math.random() * 0.4;
            orb.userData.floatAmplitude = 1.5 + Math.random() * 2;
            
            orbsGroup.add(orb);
        }
        scene.add(orbsGroup);

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
            orbsGroup,
            textSpawnTime: 0, // Will be set when text is created
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

                // Asymmetric smoothing: fast attack, slow decay for punchy response
                const bassAttack = bass > smoothBass ? 0.4 : 0.08;
                const midSmooth = mid > smoothMid ? 0.25 : 0.12;
                const highSmooth = high > smoothHigh ? 0.3 : 0.15;
                
                smoothBass += (bass - smoothBass) * bassAttack;
                smoothMid += (mid - smoothMid) * midSmooth;
                smoothHigh += (high - smoothHigh) * highSmooth;

                uniforms.bass.value = smoothBass;

                // Smoother warp speed: gentle base with music-reactive bursts
                const warpSpeed = 45 + smoothBass * 200 + smoothMid * 80;
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
                        // Smoother velocity with music reactivity
                        const baseVelocity = currentTrailVelocities[i] * 0.4;
                        const musicBoost = smoothBass * 180 + smoothMid * 60;
                        const velocity = (baseVelocity + musicBoost) * delta;
                        trailArr[i6 + 2] += velocity;
                        trailArr[i6 + 5] += velocity;
                        
                        // Dynamic trail length based on speed
                        const dynamicLen = 12 + smoothBass * 20;
                        trailArr[i6 + 5] = trailArr[i6 + 2] + dynamicLen;
                        
                        if (trailArr[i6 + 2] > 200) {
                            const r = 30 + Math.random() * 260;
                            const theta = Math.random() * Math.PI * 2;
                            const z = -900;
                            trailArr[i6] = Math.cos(theta) * r;
                            trailArr[i6 + 1] = Math.sin(theta) * r;
                            trailArr[i6 + 2] = z;
                            trailArr[i6 + 3] = trailArr[i6];
                            trailArr[i6 + 4] = trailArr[i6 + 1];
                            trailArr[i6 + 5] = z + dynamicLen;
                        }
                    }
                    currentWarpTrails.geometry.attributes.position.needsUpdate = true;
                    const mat = currentWarpTrails.material as THREE.LineBasicMaterial;
                    mat.opacity = 0.2 + smoothBass * 0.35;
                }

                // Enhanced nebula interaction with music
                // Multi-axis rotation for organic drift
                currentNebulaSystem.rotation.z += (0.02 + smoothMid * 0.04) * delta;
                currentNebulaSystem.rotation.x += (0.008 + smoothBass * 0.015) * delta;
                currentNebulaSystem.rotation.y += 0.005 * delta;
                
                const nebulaMat = currentNebulaSystem.material as THREE.PointsMaterial;
                // Opacity breathing with bass
                nebulaMat.opacity = 0.18 + smoothMid * 0.28 + smoothBass * 0.15;
                
                // Size pulsing on bass hits
                nebulaMat.size = 65 + smoothBass * 35 + smoothMid * 20;
                
                // Color breathing based on frequency - shifts through warm cosmic hues
                const hue = 0.01 + smoothHigh * 0.06 + Math.sin(time * 0.3) * 0.02;
                const saturation = 0.7 + smoothMid * 0.2;
                const lightness = 0.45 + smoothBass * 0.15;
                nebulaMat.color.setHSL(hue, saturation, lightness);
                
                // Subtle position drift based on mid frequencies
                const nebulaPositions = currentNebulaSystem.geometry.attributes.position.array as Float32Array;
                for (let i = 0; i < nebulaPositions.length; i += 3) {
                    nebulaPositions[i] += Math.sin(time * 0.5 + i) * smoothMid * 0.15 * delta * 60;
                    nebulaPositions[i + 1] += Math.cos(time * 0.4 + i * 0.5) * smoothMid * 0.1 * delta * 60;
                }
                currentNebulaSystem.geometry.attributes.position.needsUpdate = true;

                if (currentHaloSystem) {
                    // Dynamic rotation speed based on music energy
                    const haloRotSpeed = 0.08 + smoothBass * 0.15 + smoothHigh * 0.1;
                    currentHaloSystem.rotation.z += haloRotSpeed * delta;
                    currentHaloSystem.rotation.y += 0.02 * delta;
                    
                    const haloMat = currentHaloSystem.material as THREE.PointsMaterial;
                    // Pulsing size with high frequencies
                    haloMat.size = 0.6 + smoothHigh * 1.8 + smoothBass * 0.8;
                    haloMat.opacity = 0.3 + smoothMid * 0.3 + smoothHigh * 0.15;
                }

                if (currentAurora) {
                    // Gentle rotation and pulsing for organic nebula clouds
                    currentAurora.rotation.z += 0.02 * delta;
                    currentAurora.rotation.y += 0.008 * delta;
                    const auroraMat = currentAurora.material as THREE.PointsMaterial;
                    auroraMat.opacity = 0.12 + smoothMid * 0.2;
                    auroraMat.size = 100 + smoothBass * 60;
                }

                if (currentTextMesh) {
                    const mat = currentTextMesh.material as THREE.MeshStandardMaterial;
                    
                    // Smooth text animations with music reactivity
                    currentTextMesh.scale.setScalar(1 + smoothBass * 0.25);
                    currentTextMesh.position.y = -2 + Math.sin(time * 0.8) * 1.2 + smoothMid * 2;
                    currentTextMesh.rotation.y = Math.sin(time * 0.4) * 0.08;
                    
                    // Material properties with music reactivity
                    mat.emissiveIntensity = 0.8 + smoothBass * 1.5;
                    mat.opacity = 0.95;
                    mat.color.setHSL(0.02 + smoothHigh * 0.08, 0.75, 0.75);
                }

                // Animate floating orbs with gentle motion and staggered fade-in
                const currentOrbsGroup = state.orbsGroup;
                if (currentOrbsGroup) {
                    currentOrbsGroup.children.forEach((orb, i) => {
                        const mesh = orb as THREE.Mesh;
                        const userData = mesh.userData;
                        const basePos = userData.basePos as THREE.Vector3;
                        const phase = userData.phase as number;
                        const floatSpeed = userData.floatSpeed as number;
                        const floatAmplitude = userData.floatAmplitude as number;
                        
                        // Gentle floating motion with music reactivity
                        const floatOffset = Math.sin(time * floatSpeed + phase) * floatAmplitude;
                        const floatOffsetX = Math.cos(time * floatSpeed * 0.7 + phase) * floatAmplitude * 0.5;
                        const floatOffsetZ = Math.sin(time * floatSpeed * 0.5 + phase * 1.3) * floatAmplitude * 0.3;
                        
                        // Add subtle music reactivity to position
                        const bassLift = smoothBass * 2;
                        const midDrift = smoothMid * 1.5;
                        
                        mesh.position.set(
                            basePos.x + floatOffsetX + midDrift * Math.sin(phase),
                            basePos.y + floatOffset + bassLift,
                            basePos.z + floatOffsetZ
                        );
                        
                        // Gentle rotation
                        mesh.rotation.x += delta * 0.15;
                        mesh.rotation.y += delta * 0.2;
                        
                        // Gentle staggered fade-in of orbs
                        const mat = mesh.material as THREE.MeshStandardMaterial;
                        const staggerDelay = i * 0.15;
                        const orbFadeStart = 2 + staggerDelay; // Start fading in after 2 seconds
                        const orbFadeProgress = Math.max(0, Math.min(1, (time - orbFadeStart) / 3));
                        
                        mat.opacity = orbFadeProgress * (0.75 + smoothBass * 0.25);
                        mat.emissiveIntensity = (0.5 + smoothBass * 0.8) * orbFadeProgress;
                        
                        // Subtle scale pulse with music
                        const scalePulse = 1 + smoothBass * 0.15 + smoothHigh * 0.08;
                        mesh.scale.setScalar(scalePulse * orbFadeProgress);
                    });
                }

                // Subtle pendulum camera motion - always stays in front of scene
                // Gentle side-to-side sway with music reactivity
                const swayAmplitude = 12 + smoothBass * 4;
                const swayX = Math.sin(time * 0.25) * swayAmplitude;
                
                // Breathing Z motion - never goes behind text (text is at z=-8)
                const breatheZ = 95 + Math.sin(time * 0.18) * 10 - smoothBass * 8;
                
                // Vertical breathing motion synced to music
                const breatheY = Math.sin(time * 0.22) * 5 + smoothHigh * 4;
                
                // Apply camera position - always stays in front
                currentCamera.position.set(swayX, breatheY, Math.max(70, breatheZ));
                
                // Gentle look-at with subtle music reactivity
                const lookAtY = smoothBass * 3 - 1;
                currentCamera.lookAt(0, lookAtY, -10);
                
                // Very subtle roll for cinematic feel
                currentCamera.rotation.z = Math.sin(time * 0.12) * 0.015;

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
        <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-gray-900 dark:bg-black shadow-2xl shadow-red-900/25">
            {/* Direct Container for Three.js */}
            <div ref={containerRef} className="absolute inset-0 z-0" />

            {/* Overlay Gradient for integration */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 dark:from-black/80 via-transparent to-transparent pointer-events-none z-10" />

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

import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

interface HeroVisualizerProps {
    isPlaying: boolean;
    analyser?: AnalyserNode | null;
}

interface SceneState {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    analyser: AnalyserNode | null;
    dataArray: Uint8Array | null;
    textMesh: THREE.Mesh | null;
    starSystem: THREE.Points;
    nebulaSystem: THREE.Points;
    animationId: number;
    uniforms: {
        time: { value: number };
        bass: { value: number };
        mid: { value: number };
        high: { value: number };
    };
}

export const HeroVisualizer: React.FC<HeroVisualizerProps> = ({ isPlaying, analyser }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<SceneState | null>(null);

    // Helper functions moved inside initScene to prevent SSR issues


    const initScene = useCallback(() => {
        if (!containerRef.current || sceneRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        const aspect = width / height;

        // Helper functions for textures
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
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
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
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        };

        // Scene setup
        const scene = new THREE.Scene();
        // Deep space fog for depth
        scene.fog = new THREE.FogExp2(0x000000, 0.002);

        // Camera
        const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
        camera.position.z = 100;

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Shared Uniforms for shaders
        const uniforms = {
            time: { value: 0 },
            bass: { value: 0 },
            mid: { value: 0 },
            high: { value: 0 }
        };

        // --- Starfield System ---
        const starCount = 4000;
        const starGeo = new THREE.BufferGeometry();
        const starPos = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);
        const starColors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            // Spread stars in a tunnel/cylinder shape for forward motion effect
            const r = 40 + Math.random() * 300; // Radius from center
            const theta = Math.random() * Math.PI * 2;
            const depth = (Math.random() - 0.5) * 1000; // Z depth

            starPos[i3] = r * Math.cos(theta);
            starPos[i3 + 1] = r * Math.sin(theta);
            starPos[i3 + 2] = depth;

            // Random sizes
            starSizes[i] = Math.random() * 1.5;

            // Star colors (White, Blue-ish, slightly reddish for variety)
            const colorType = Math.random();
            if (colorType > 0.9) { // Red/Orange giant
                starColors[i3] = 1.0; starColors[i3 + 1] = 0.8; starColors[i3 + 2] = 0.6;
            } else if (colorType > 0.7) { // Blue dwarf
                starColors[i3] = 0.8; starColors[i3 + 1] = 0.9; starColors[i3 + 2] = 1.0;
            } else { // White/Yellow main sequence
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

        // Hacking PointsMaterial to accept custom uniforms if needed in future, 
        // but standard PointsMaterial works well for performance here.
        // We will animate positions in the loop for the "warp" effect.

        const starSystem = new THREE.Points(starGeo, starMaterial);
        scene.add(starSystem);

        // --- Nebula System ---
        const nebulaCount = 50;
        const nebulaGeo = new THREE.BufferGeometry();
        const nebulaPos = new Float32Array(nebulaCount * 3);
        const nebulaColors = new Float32Array(nebulaCount * 3);
        const nebulaSizes = new Float32Array(nebulaCount);

        for (let i = 0; i < nebulaCount; i++) {
            const i3 = i * 3;
            // Place nebulas in background
            nebulaPos[i3] = (Math.random() - 0.5) * 400;
            nebulaPos[i3 + 1] = (Math.random() - 0.5) * 200;
            nebulaPos[i3 + 2] = -100 - Math.random() * 200;

            nebulaSizes[i] = 50 + Math.random() * 100;

            const colorChoice = Math.random();
            if (colorChoice < 0.33) {
                // Purple
                nebulaColors[i3] = 0.2; nebulaColors[i3 + 1] = 0.0; nebulaColors[i3 + 2] = 0.5;
            } else if (colorChoice < 0.66) {
                // Blue
                nebulaColors[i3] = 0.0; nebulaColors[i3 + 1] = 0.2; nebulaColors[i3 + 2] = 0.6;
            } else {
                // Pink/Magenta
                nebulaColors[i3] = 0.6; nebulaColors[i3 + 1] = 0.0; nebulaColors[i3 + 2] = 0.4;
            }
        }

        nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPos, 3));
        nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
        nebulaGeo.setAttribute('size', new THREE.BufferAttribute(nebulaSizes, 1));

        const nebulaMaterial = new THREE.PointsMaterial({
            size: 60,
            vertexColors: true,
            map: createNebulaTexture(),
            transparent: true,
            opacity: 0.3, // Baseline opacity, will modulate with bass
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const nebulaSystem = new THREE.Points(nebulaGeo, nebulaMaterial);
        scene.add(nebulaSystem);

        // --- Initialize Scene State ---
        sceneRef.current = {
            scene,
            camera,
            renderer,
            analyser: null,
            dataArray: null,
            textMesh: null,
            starSystem,
            nebulaSystem,
            animationId: 0,
            uniforms
        };

        // --- 3D Text ---
        const fontLoader = new FontLoader();
        fontLoader.load(
            'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json',
            (font) => {
                if (!sceneRef.current) return;

                const textGeo = new TextGeometry('DLM MUSIC GEN', {
                    font: font,
                    size: 5,
                    depth: 1,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0.1,
                    bevelSize: 0.1,
                    bevelSegments: 3
                });

                textGeo.computeBoundingBox();
                const centerOffset = -(textGeo.boundingBox!.max.x - textGeo.boundingBox!.min.x) / 2;

                // Sci-fi metallic material
                const textMat = new THREE.MeshPhongMaterial({
                    color: 0xeeeeee,
                    emissive: 0x00ffff,
                    emissiveIntensity: 0.2,
                    specular: 0xffffff,
                    shininess: 100,
                    flatShading: false
                });

                const textMesh = new THREE.Mesh(textGeo, textMat);
                textMesh.position.x = centerOffset;
                textMesh.position.y = -2;
                textMesh.position.z = 0;
                scene.add(textMesh);
                sceneRef.current.textMesh = textMesh;

                // Add lights for the text
                const dirLight = new THREE.DirectionalLight(0xffffff, 2);
                dirLight.position.set(0, 10, 20);
                scene.add(dirLight);

                const pointLight = new THREE.PointLight(0x0088ff, 3, 50);
                pointLight.position.set(0, 5, 5);
                scene.add(pointLight);
            }
        );

        // Handle resize
        const handleResize = () => {
            if (!containerRef.current || !sceneRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            const newAspect = w / h;
            sceneRef.current.camera.aspect = newAspect;
            sceneRef.current.camera.updateProjectionMatrix();
            sceneRef.current.renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // Animation Loop
        const clock = new THREE.Clock();
        let smoothBass = 0, smoothMid = 0, smoothHigh = 0;

        const animate = () => {
            if (!sceneRef.current) return;
            const {
                scene, camera, renderer, analyser, dataArray,
                starSystem, nebulaSystem, textMesh
            } = sceneRef.current;

            const delta = clock.getDelta();
            const time = clock.getElapsedTime();

            // Audio Analysis
            let bass = 0, mid = 0, high = 0;
            if (analyser && dataArray) {
                analyser.getByteFrequencyData(dataArray);
                const bufferLength = dataArray.length;
                const bassEnd = Math.floor(bufferLength * 0.1);
                const midEnd = Math.floor(bufferLength * 0.5);

                for (let i = 0; i < bassEnd; i++) bass += dataArray[i];
                for (let i = bassEnd; i < midEnd; i++) mid += dataArray[i];
                for (let i = midEnd; i < bufferLength; i++) high += dataArray[i];

                bass = bass / bassEnd / 255;
                mid = mid / (midEnd - bassEnd) / 255;
                high = high / (bufferLength - midEnd) / 255;
            } else {
                // Idle idle breathing
                bass = 0.05 + Math.sin(time) * 0.02;
                mid = 0.05 + Math.cos(time * 0.5) * 0.02;
                high = 0;
            }

            // Smoothing
            smoothBass += (bass - smoothBass) * 0.1;
            smoothMid += (mid - smoothMid) * 0.1;
            smoothHigh += (high - smoothHigh) * 0.1;

            sceneRef.current.uniforms.bass.value = smoothBass;

            // --- Star Animation (Warp Speed) ---
            const starPositions = starSystem.geometry.attributes.position.array as Float32Array;
            // Base speed + bass boost
            const speed = 20 + smoothBass * 300;

            for (let i = 0; i < starPositions.length; i += 3) {
                starPositions[i + 2] += speed * delta;

                // Reset stars that pass camera
                if (starPositions[i + 2] > 200) {
                    starPositions[i + 2] = -800;
                    // Scramble XY slightly for variation
                    const r = 40 + Math.random() * 300;
                    const theta = Math.random() * Math.PI * 2;
                    starPositions[i] = r * Math.cos(theta);
                    starPositions[i + 1] = r * Math.sin(theta);
                }
            }
            starSystem.geometry.attributes.position.needsUpdate = true;

            // Pulse stars on bass
            (starSystem.material as THREE.PointsMaterial).size = 0.8 + smoothHigh * 1.5;

            // --- Nebula Animation ---
            nebulaSystem.rotation.z += 0.02 * delta;
            (nebulaSystem.material as THREE.PointsMaterial).opacity = 0.2 + smoothMid * 0.3;
            // Color shift on bass
            const nebulaColors = nebulaSystem.geometry.attributes.color.array as Float32Array;
            // Very subtle dynamic color shift could go here, but simple opacity pulse is cleaner

            // --- Text Animation ---
            if (textMesh) {
                textMesh.scale.setScalar(1 + smoothBass * 0.1);
                textMesh.rotation.x = Math.sin(time * 0.5) * 0.05;
                textMesh.rotation.y = Math.cos(time * 0.3) * 0.05;

                const mat = textMesh.material as THREE.MeshPhongMaterial;
                mat.emissiveIntensity = 0.2 + smoothBass * 0.8; // Glow with bass
            }

            // --- Camera Float ---
            camera.position.x = Math.sin(time * 0.2) * 5;
            camera.position.y = Math.cos(time * 0.15) * 5;
            camera.lookAt(0, 0, 50); // Look slightly ahead

            renderer.render(scene, camera);
            sceneRef.current.animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
        };

    }, []);

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

    // Init Effect
    useEffect(() => {
        initScene();
        return () => {
            if (sceneRef.current) {
                cancelAnimationFrame(sceneRef.current.animationId);
                sceneRef.current.renderer.dispose();
                sceneRef.current.scene.clear();
                if (containerRef.current && sceneRef.current.renderer.domElement) {
                    containerRef.current.removeChild(sceneRef.current.renderer.domElement);
                }
                sceneRef.current = null;
            }
        };
    }, [initScene]);

    return (
        <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl shadow-purple-900/20">
            {/* Direct Container for Three.js */}
            <div ref={containerRef} className="absolute inset-0 z-0" />

            {/* Overlay Gradient for integration */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none z-10" />

            {/* Optional Status Indicator */}
            {!isPlaying && (
                <div className="absolute top-4 right-4 z-20">
                    <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                </div>
            )}
        </div>
    );
};

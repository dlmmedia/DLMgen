import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

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

interface AnimatedLogoProps {
    isPlaying: boolean;
    analyser?: AnalyserNode | null;
}

interface SceneState {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    logoMesh: THREE.Group | null;
    particles: THREE.Points | null;
    orbiters: THREE.InstancedMesh | null;
    glowRing: THREE.Mesh | null;
    tempObject: THREE.Object3D | null;
    analyser: AnalyserNode | null;
    dataArray: Uint8Array | null;
    animationId: number;
    isPlayingRef: boolean;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ isPlaying, analyser }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<SceneState | null>(null);
    const mountedRef = useRef(false);
    const animationRunningRef = useRef(true);

    const initScene = useCallback(() => {
        // Prevent double initialization from React StrictMode
        if (!containerRef.current || sceneRef.current || mountedRef.current) return;
        mountedRef.current = true;
        animationRunningRef.current = true;

        const container = containerRef.current;
        const size = 40; // Slightly larger for more detail

        // Scene setup
        const scene = new THREE.Scene();

        // Camera - orthographic for 2D-like view
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camera.position.z = 5;

        // Renderer - use low-power mode to avoid competing with HeroVisualizer
        const renderer = new THREE.WebGLRenderer({
            antialias: false,
            alpha: true,
            powerPreference: 'low-power'
        });
        renderer.setSize(size, size);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        const canvas = renderer.domElement;
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);

        // Create logo group
        const logoGroup = new THREE.Group();

        // Create a stylized radio/wave icon using geometry
        // Main circle (outer ring)
        const outerRingGeo = new THREE.RingGeometry(1.2, 1.5, 32);
        const outerRingMat = new THREE.MeshBasicMaterial({
            color: 0x991b1b, // blood red
            transparent: true,
            opacity: 0.8
        });
        const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
        logoGroup.add(outerRing);

        // Inner circle
        const innerRingGeo = new THREE.RingGeometry(0.6, 0.9, 32);
        const innerRingMat = new THREE.MeshBasicMaterial({
            color: 0xef4444, // accent red
            transparent: true,
            opacity: 0.9
        });
        const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
        logoGroup.add(innerRing);

        // Center dot
        const centerGeo = new THREE.CircleGeometry(0.3, 16);
        const centerMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });
        const center = new THREE.Mesh(centerGeo, centerMat);
        logoGroup.add(center);

        // Wave lines (3 arcs)
        const waveLines: THREE.Mesh[] = [];
        for (let i = 0; i < 3; i++) {
            const waveGeo = new THREE.RingGeometry(1.5 + i * 0.3, 1.6 + i * 0.3, 32, 1, 0, Math.PI * 0.6);
            const waveMat = new THREE.MeshBasicMaterial({
                color: i === 0 ? 0x991b1b : i === 1 ? 0xef4444 : 0x7f1d1d,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            const wave = new THREE.Mesh(waveGeo, waveMat);
            wave.rotation.z = -Math.PI * 0.3 + i * 0.2;
            wave.position.x = -0.3;
            waveLines.push(wave);
            logoGroup.add(wave);
        }

        const glowGeo = new THREE.RingGeometry(1.65, 1.95, 64);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff7f5f,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        const glowRing = new THREE.Mesh(glowGeo, glowMat);
        glowRing.rotation.x = Math.PI / 2;
        logoGroup.add(glowRing);

        const orbCount = 16;
        const orbGeo = new THREE.SphereGeometry(0.08, 12, 12);
        const orbMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const orbiters = new THREE.InstancedMesh(orbGeo, orbMat, orbCount);
        logoGroup.add(orbiters);

        const tempObject = new THREE.Object3D();

        scene.add(logoGroup);

        // Create particles around the logo - reduced count for better performance
        const particleCount = 30;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 1.8 + Math.random() * 0.5;
            positions[i3] = Math.cos(angle) * radius;
            positions[i3 + 1] = Math.sin(angle) * radius;
            positions[i3 + 2] = (Math.random() - 0.5) * 0.5;

            // Gradient colors
            const colorChoice = Math.random();
            if (colorChoice < 0.33) {
                colors[i3] = 0.6; colors[i3 + 1] = 0.1; colors[i3 + 2] = 0.1; // dark red
            } else if (colorChoice < 0.66) {
                colors[i3] = 0.9; colors[i3 + 1] = 0.2; colors[i3 + 2] = 0.2; // bright red
            } else {
                colors[i3] = 0.5; colors[i3 + 1] = 0; colors[i3 + 2] = 0; // maroon
            }
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        // Initialize scene state
        sceneRef.current = {
            scene,
            camera,
            renderer,
            logoMesh: logoGroup,
            particles,
            orbiters,
            glowRing,
            tempObject,
            analyser: null,
            dataArray: null,
            animationId: 0,
            isPlayingRef: isPlaying
        } as SceneState;

        const handleContextLost = (e: Event) => {
            e.preventDefault?.();
            console.warn('AnimatedLogo WebGL context lost; will recreate after delay.');
            
            // Stop animation loop
            animationRunningRef.current = false;
            if (sceneRef.current) {
                cancelAnimationFrame(sceneRef.current.animationId);
            }
            
            // Schedule recreation with delay to allow GPU recovery
            setTimeout(() => {
                if (!sceneRef.current) return;
                try {
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

        // Do an initial render immediately so something is visible
        renderer.render(scene, camera);

        // Animation loop
        const clock = new THREE.Clock();
        let smoothBass = 0, smoothMid = 0, smoothHigh = 0;

        const animate = () => {
            if (!sceneRef.current) return;
            try {
                const {
                    scene, camera, renderer,
                    logoMesh, particles, orbiters, glowRing, tempObject, isPlayingRef
                } = sceneRef.current;

                const time = clock.getElapsedTime();

                let bass = 0, mid = 0, high = 0;

                const { analyser, dataArray } = sceneRef.current;
                if (isPlayingRef && analyser && dataArray && dataArray.length > 0) {
                    analyser.getByteFrequencyData(dataArray);
                    const bufferLength = dataArray.length;
                    const bassEnd = Math.max(1, Math.floor(bufferLength * 0.12));
                    const midEnd = Math.max(bassEnd + 1, Math.floor(bufferLength * 0.5));

                    for (let i = 0; i < bassEnd; i++) bass += dataArray[i];
                    for (let i = bassEnd; i < midEnd; i++) mid += dataArray[i];
                    for (let i = midEnd; i < bufferLength; i++) high += dataArray[i];

                    bass = bass / bassEnd / 255;
                    mid = mid / (midEnd - bassEnd) / 255;
                    high = high / (bufferLength - midEnd) / 255;
                } else if (isPlayingRef) {
                    // Fallback: energetic animation if analyser isn't available yet
                bass = 0.18 + Math.sin(time * 3) * 0.12 + Math.sin(time * 7) * 0.08;
                mid = 0.18 + Math.sin(time * 4) * 0.1 + Math.cos(time * 5) * 0.06;
                high = 0.12 + Math.sin(time * 6) * 0.08 + Math.sin(time * 11) * 0.04;
            } else {
                // Stronger idle motion so it's visibly alive even when paused
                bass = 0.2 + Math.sin(time * 2) * 0.12;
                mid = 0.18 + Math.sin(time * 2.6) * 0.1;
                high = 0.18 + Math.sin(time * 3.4) * 0.08;
            }

                // Smooth the values
                smoothBass += (bass - smoothBass) * 0.15;
                smoothMid += (mid - smoothMid) * 0.15;
                smoothHigh += (high - smoothHigh) * 0.15;

                // Animate logo
                if (logoMesh) {
                    // Rotation
                    logoMesh.rotation.z = time * 0.4 + smoothBass * 0.7;
                    logoMesh.rotation.x = Math.sin(time * 0.6) * (0.12 + smoothMid * 0.2);
                    logoMesh.rotation.y = Math.cos(time * 0.4) * (0.1 + smoothHigh * 0.15);

                    // Scale pulse with bass
                    const scale = 1 + smoothBass * 0.35;
                    logoMesh.scale.set(scale, scale, scale);

                    // Animate rings
                    if (logoMesh.children.length > 0) {
                        // Outer ring pulse
                        const outerRing = logoMesh.children[0] as THREE.Mesh;
                        (outerRing.material as THREE.MeshBasicMaterial).opacity = 0.6 + smoothBass * 0.4;

                        // Inner ring pulse
                        if (logoMesh.children.length > 1) {
                            const innerRing = logoMesh.children[1] as THREE.Mesh;
                            (innerRing.material as THREE.MeshBasicMaterial).opacity = 0.7 + smoothMid * 0.3;
                        }

                        // Center dot pulse
                        if (logoMesh.children.length > 2) {
                            const center = logoMesh.children[2] as THREE.Mesh;
                            const centerScale = 1 + smoothHigh * 0.5;
                            center.scale.set(centerScale, centerScale, centerScale);
                        }

                        // Wave lines animation
                        for (let i = 3; i < logoMesh.children.length; i++) {
                            const wave = logoMesh.children[i] as THREE.Mesh;
                            const waveIndex = i - 3;
                            const waveScale = 1 + (waveIndex === 0 ? smoothBass : waveIndex === 1 ? smoothMid : smoothHigh) * 0.4;
                            wave.scale.set(waveScale, waveScale, waveScale);
                            wave.rotation.z = -Math.PI * 0.3 + waveIndex * 0.2 + time * 0.2 * (waveIndex + 1);
                        }
                    }
                }

                if (glowRing) {
                    const mat = glowRing.material as THREE.MeshBasicMaterial;
                    mat.opacity = 0.3 + smoothBass * 0.45;
                    mat.color.setHSL(0.04 + smoothMid * 0.05, 0.8, 0.6);
                    const glowScale = 1.05 + smoothBass * 0.3;
                    glowRing.scale.set(glowScale, glowScale, glowScale);
                    glowRing.rotation.z = time * 0.6;
                }

                if (orbiters && tempObject) {
                    for (let i = 0; i < orbiters.count; i++) {
                        const angle = time * 1.4 + (i / orbiters.count) * Math.PI * 2;
                        const radius = 1.3 + smoothMid * 0.5 + (i % 2) * 0.15;
                        tempObject.position.set(
                            Math.cos(angle) * radius,
                            Math.sin(angle) * radius,
                            Math.sin(time * 2 + i) * 0.12
                        );
                        const s = 0.6 + smoothHigh * 1.4;
                        tempObject.scale.set(s, s, s);
                        tempObject.rotation.z = angle;
                        tempObject.updateMatrix();
                        orbiters.setMatrixAt(i, tempObject.matrix);
                    }
                    orbiters.instanceMatrix.needsUpdate = true;
                    (orbiters.material as THREE.MeshBasicMaterial).opacity = 0.5 + smoothBass * 0.4;
                }

                // Animate particles
                if (particles) {
                    const positions = particles.geometry.attributes.position.array as Float32Array;
                    const originalRadius = 1.9;

                    for (let i = 0; i < positions.length; i += 3) {
                        const angle = (i / 3 / particleCount) * Math.PI * 2;
                        const baseRadius = originalRadius + (i % 10) * 0.05;
                        const radius = baseRadius + smoothBass * 0.9 + Math.sin(time * 0.8 + i) * 0.05;

                        positions[i] = Math.cos(angle + time * 0.5) * radius;
                        positions[i + 1] = Math.sin(angle + time * 0.5) * radius;
                        positions[i + 2] = (Math.random() - 0.5) * 0.5 + Math.sin(time * 2 + i) * smoothHigh * 0.35;
                    }

                    particles.geometry.attributes.position.needsUpdate = true;
                    particles.rotation.z = time * 0.25;
                    (particles.material as THREE.PointsMaterial).opacity = 0.45 + smoothBass * 0.4;
                    (particles.material as THREE.PointsMaterial).size = 0.1 + smoothBass * 0.12;
                }

                // Subtle camera movement
                camera.position.x = Math.sin(time * 0.3) * 0.1;
                camera.position.y = Math.cos(time * 0.2) * 0.1;
                camera.lookAt(0, 0, 0);

                renderer.render(scene, camera);
            } catch (e) {
                console.warn('AnimatedLogo animation error:', e);
            }
        };

        const loop = () => {
            // Check if we should continue running
            if (!animationRunningRef.current || !sceneRef.current) {
                return;
            }
            
            // Skip rendering when tab is not visible to save resources
            if (!document.hidden) {
                animate();
            }
            
            sceneRef.current.animationId = requestAnimationFrame(loop);
        };
        loop();
    }, []);

    // Update isPlaying state in scene ref
    useEffect(() => {
        if (sceneRef.current) {
            sceneRef.current.isPlayingRef = isPlaying;
        }
    }, [isPlaying]);

    // Update analyser in scene ref
    useEffect(() => {
        if (!sceneRef.current) return;
        sceneRef.current.analyser = analyser || null;
        sceneRef.current.dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    }, [analyser]);

    // Initialize scene
    useEffect(() => {
        initScene();

        return () => {
            // Stop animation loop first
            animationRunningRef.current = false;
            
            if (sceneRef.current) {
                cancelAnimationFrame(sceneRef.current.animationId);
                try {
                    disposeObject3D(sceneRef.current.scene);
                    sceneRef.current.scene.clear();
                    sceneRef.current.renderer.renderLists?.dispose?.();
                    sceneRef.current.renderer.dispose();
                } catch (e) {
                    console.warn('AnimatedLogo cleanup failed:', e);
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

    return (
        <div
            ref={containerRef}
            className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-primary/40 relative border border-white/10"
            style={{
                background: 'linear-gradient(135deg, #0b1224, #1f2a44)'
            }}
        />
    );
};

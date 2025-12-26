import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface AnimatedLogoProps {
    isPlaying: boolean;
    audioRef?: React.RefObject<HTMLAudioElement | null>;
}

interface SceneState {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    logoMesh: THREE.Group | null;
    particles: THREE.Points | null;
    animationId: number;
    isPlayingRef: boolean;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ isPlaying, audioRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<SceneState | null>(null);

    const initScene = useCallback(() => {
        if (!containerRef.current || sceneRef.current) return;

        const container = containerRef.current;
        const size = 32; // 32x32px container

        // Scene setup
        const scene = new THREE.Scene();

        // Camera - orthographic for 2D-like view
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camera.position.z = 5;

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
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

        scene.add(logoGroup);

        // Create particles around the logo
        const particleCount = 50;
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
            animationId: 0,
            isPlayingRef: false
        };

        // Animation loop
        const clock = new THREE.Clock();
        let smoothBass = 0, smoothMid = 0, smoothHigh = 0;

        const animate = () => {
            if (!sceneRef.current) return;
            const {
                scene, camera, renderer,
                logoMesh, particles, isPlayingRef
            } = sceneRef.current;

            const time = clock.getElapsedTime();

            // Simulate audio-reactive values based on isPlaying state
            let bass = 0, mid = 0, high = 0;

            if (isPlayingRef) {
                // More energetic animation when playing
                bass = 0.2 + Math.sin(time * 3) * 0.15 + Math.sin(time * 7) * 0.1;
                mid = 0.2 + Math.sin(time * 4) * 0.12 + Math.cos(time * 5) * 0.08;
                high = 0.15 + Math.sin(time * 6) * 0.1 + Math.sin(time * 11) * 0.05;
            } else {
                // Gentle idle animation
                bass = 0.1 + Math.sin(time * 2) * 0.05;
                mid = 0.1 + Math.sin(time * 3) * 0.05;
                high = 0.1 + Math.sin(time * 4) * 0.05;
            }

            // Smooth the values
            smoothBass += (bass - smoothBass) * 0.15;
            smoothMid += (mid - smoothMid) * 0.15;
            smoothHigh += (high - smoothHigh) * 0.15;

            // Animate logo
            if (logoMesh) {
                // Rotation
                logoMesh.rotation.z = time * 0.3 + smoothBass * 0.5;

                // Scale pulse with bass
                const scale = 1 + smoothBass * 0.3;
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

            // Animate particles
            if (particles) {
                const positions = particles.geometry.attributes.position.array as Float32Array;
                const originalRadius = 1.8;

                for (let i = 0; i < positions.length; i += 3) {
                    const angle = (i / 3 / particleCount) * Math.PI * 2;
                    const baseRadius = originalRadius + (i % 10) * 0.05;
                    const radius = baseRadius + smoothBass * 0.8;

                    positions[i] = Math.cos(angle + time * 0.5) * radius;
                    positions[i + 1] = Math.sin(angle + time * 0.5) * radius;
                    positions[i + 2] = (Math.random() - 0.5) * 0.5 + Math.sin(time * 2 + i) * smoothHigh * 0.3;
                }

                particles.geometry.attributes.position.needsUpdate = true;
                particles.rotation.z = time * 0.2;
                (particles.material as THREE.PointsMaterial).opacity = 0.4 + smoothBass * 0.4;
                (particles.material as THREE.PointsMaterial).size = 0.08 + smoothBass * 0.1;
            }

            // Subtle camera movement
            camera.position.x = Math.sin(time * 0.3) * 0.1;
            camera.position.y = Math.cos(time * 0.2) * 0.1;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
            sceneRef.current.animationId = requestAnimationFrame(animate);
        };

        animate();
    }, []);

    // Update isPlaying state in scene ref
    useEffect(() => {
        if (sceneRef.current) {
            sceneRef.current.isPlayingRef = isPlaying;
        }
    }, [isPlaying]);

    // Initialize scene
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
        <div
            ref={containerRef}
            className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-primary/40 relative"
            style={{
                background: 'linear-gradient(to bottom right, #991b1b, #ef4444)'
            }}
        />
    );
};


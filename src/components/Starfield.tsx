"use client";

import React, { useEffect, useRef } from 'react';

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const stars: { x: number; y: number; z: number; o: number }[] = [];
    const numStars = 800; // Much denser for "deep space" feel
    const depth = 2000; // Far clipping plane
    let shootingStar = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 };

    // Initialize stars
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: (Math.random() - 0.5) * width * 2, // Spread wider than screen
            y: (Math.random() - 0.5) * height * 2,
            z: Math.random() * depth,
            o: Math.random(), // initial random offset for twinkling or size
        });
    }

    let animationFrameId: number;

    const render = () => {
        // Clear background with almost opaque black for trail effect? 
        // Or pure clear for crisp movement. User said "absolutely black". 
        // Let's settle for pure clearRect on black CSS background.
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const speed = 0.5; // Slow floating

        // Sort stars by Z so far ones draw first (Painter's algorithm) - optional for dots but good for overlap
        // stars.sort((a, b) => b.z - a.z); 

        for (const star of stars) {
            // Update Z - move towards camera
            star.z -= speed;

            // Reset if passed camera
            if (star.z <= 0) {
                star.z = depth;
                star.x = (Math.random() - 0.5) * width * 2;
                star.y = (Math.random() - 0.5) * height * 2;
            }

            // Project to 2D
            // Using standard perspective projection: x' = x * (focalLength / z)
            const k = 128.0 / star.z; 
            const px = star.x * k + cx;
            const py = star.y * k + cy;

            if (px >= 0 && px <= width && py >= 0 && py <= height) {
                // Size depends on Z
                const size = (1 - star.z / depth) * 2.5;
                // Brightness depends on Z
                const alpha = 1 - (star.z / depth);
                
                ctx.beginPath();
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.arc(px, py, size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Shooting Star Logic
        if (shootingStar.active) {
            shootingStar.x += shootingStar.vx;
            shootingStar.y += shootingStar.vy;
            shootingStar.life -= 0.01;

            if (shootingStar.life <= 0 || 
                shootingStar.x < 0 || shootingStar.x > width || 
                shootingStar.y < 0 || shootingStar.y > height) {
                shootingStar.active = false;
            } else {
                // Draw Streak
                const tailX = shootingStar.x - shootingStar.vx * 15; // long tail
                const tailY = shootingStar.y - shootingStar.vy * 15;
                
                const gradient = ctx.createLinearGradient(shootingStar.x, shootingStar.y, tailX, tailY);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${shootingStar.life})`);
                gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

                ctx.lineWidth = 2;
                ctx.strokeStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(shootingStar.x, shootingStar.y);
                ctx.lineTo(tailX, tailY);
                ctx.stroke();

                // Bright head
                ctx.fillStyle = "white";
                ctx.beginPath();
                ctx.arc(shootingStar.x, shootingStar.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
             // Randomly trigger shooting star (VERY rarely)
             // 60FPS. 1/3600 probability = roughly once a minute?
             if (Math.random() < 0.001) {
                 shootingStar.active = true;
                 shootingStar.life = 1.0;
                 
                 // Start from a random side (usually top or sides)
                 const side = Math.floor(Math.random() * 4);
                 if (side === 0) { // Top
                     shootingStar.x = Math.random() * width;
                     shootingStar.y = 0;
                     shootingStar.vx = (Math.random() - 0.5) * 10;
                     shootingStar.vy = Math.random() * 10 + 5;
                 } else if (side === 1) { // Right
                    shootingStar.x = width;
                    shootingStar.y = Math.random() * height;
                    shootingStar.vx = -(Math.random() * 10 + 5);
                    shootingStar.vy = (Math.random() - 0.5) * 10;
                 } else if (side === 2) { // Bottom (shooting up? rare but okay)
                    shootingStar.x = Math.random() * width;
                    shootingStar.y = height;
                    shootingStar.vx = (Math.random() - 0.5) * 10;
                    shootingStar.vy = -(Math.random() * 10 + 5);
                 } else { // Left
                    shootingStar.x = 0;
                    shootingStar.y = Math.random() * height;
                    shootingStar.vx = Math.random() * 10 + 5;
                    shootingStar.vy = (Math.random() - 0.5) * 10;
                 }
             }
        }

        animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas 
        ref={canvasRef} 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'black' }}
    />
  );
}

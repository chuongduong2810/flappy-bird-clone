/**
 * main.js — entry point. Boots the game once the DOM is ready.
 */

import { Game } from './Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  game.start().catch((err) => {
    console.error('Failed to start game:', err);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Asset load failed — serve over http://', canvas.width / 2, canvas.height / 2);
  });
});

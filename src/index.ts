import * as fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createCanvas, loadImage } from 'canvas';
import * as path from 'node:path';

interface BenchmarkResult {
  packageManager: string;
  category: string;
  time: number;
}

const packageManagers = ['npm', 'pnpm', 'yarn'];
const categories = ['install next', 'install --save-dev next', 'update', 'uninstall next'];
const yarnCategories = ['install next', 'install --dev next', 'upgrade', 'remove next'];
const composerDir = path.join(process.cwd(), 'composer');

const benchmarkResults: BenchmarkResult[] = [];

async function benchmark(packageManager: string, category: string) {
  console.log(`Starting benchmark for ${packageManager} ${category}`);
  const startTime = Date.now();

  const command = `${packageManager} ${packageManager === 'yarn' ? yarnCategories[categories.indexOf(category)].replace('next', 'next@latest') : category.replace('next', 'next@latest')}`;

  spawnSync(command, { shell: true, cwd: composerDir });

  const endTime = Date.now();
  const time = endTime - startTime;

  console.log(`Completed benchmark for ${packageManager} ${category} in ${time}ms`);
  benchmarkResults.push({ packageManager, category, time });
}

async function runBenchmarks() {
  if (!fs.existsSync(composerDir)) {
    fs.mkdirSync(composerDir);
  }

  spawnSync('npm init -y', { shell: true, cwd: composerDir });

  for (const packageManager of packageManagers) {
    for (const category of categories) {
      await benchmark(packageManager, category);
    }
  }

  const canvas = createCanvas(1600, 1200);
  const ctx = canvas.getContext('2d');

  const barHeight = 50;
  const barSpacing = 20;
  const chartHeight = canvas.height - 2 * barSpacing;
  const chartWidth = 1000;
  const xOffset = barSpacing;
  const yOffset = barSpacing;

  const maxTime = Math.max(...benchmarkResults.map(result => result.time));

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const logo = await loadImage('assets/logo.png');
  ctx.drawImage(logo, 20, 20, 100, 100);
  ctx.font = '24px Arial';
  ctx.fillStyle = 'black';
  ctx.fillText('Benchmark Results (lower = better)', 140, 50);

  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const colors: { [key: string]: string } = {
    npm: 'rgba(255, 0, 0, 0.8)',
    pnpm: 'rgba(0, 255, 0, 0.8)',
    yarn: 'rgba(0, 0, 255, 0.8)'
  };

  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xOffset, yOffset);
  ctx.lineTo(xOffset, chartHeight + yOffset);
  ctx.stroke();

  for (let i = 0; i < benchmarkResults.length; i++) {
    const result = benchmarkResults[i];
    const y = yOffset + (i % 3) * (barHeight + barSpacing) + Math.floor(i / 3) * (3 * (barHeight + barSpacing) + barSpacing);
    const barWidth = (result.time / maxTime) * chartWidth;

    ctx.fillStyle = colors[result.packageManager];
    ctx.beginPath();
    ctx.moveTo(xOffset, y);
    ctx.lineTo(xOffset + barWidth, y);
    ctx.arcTo(xOffset + barWidth + barSpacing, y, xOffset + barWidth + barSpacing, y + barHeight, 10);
    ctx.lineTo(xOffset + barWidth, y + barHeight);
    ctx.arcTo(xOffset, y + barHeight, xOffset, y, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.fillText(result.packageManager, xOffset + barWidth + barSpacing, y);
    ctx.fillText(result.category, xOffset + barWidth + barSpacing, y + 16);
    ctx.fillText(`${result.time}ms`, xOffset + barWidth + barSpacing, y + 32);
  }

  const buffer = canvas.toBuffer('image/png');

  const currentDate = new Date().toISOString().replace(/:/g, '-');
  const resultsDir = path.join('.results', currentDate);
  fs.mkdirSync(resultsDir, { recursive: true });

  const filePath = path.join(resultsDir, 'benchmark_results.png');
  fs.writeFileSync(filePath, buffer);
  console.log(`Benchmark results saved to ${filePath}`);

  fs.rmdirSync(composerDir, { recursive: true });
  fs.mkdirSync(composerDir);
}

runBenchmarks().catch(error => console.error(error));

import * as fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createCanvas } from 'canvas';
import * as path from 'node:path';

interface BenchmarkResult {
  packageManager: string;
  category: string;
  time: number;
}

const packageManagers = ['npm', 'pnpm', 'yarn'];
const categories = ['install', 'install-dev', 'update', 'uninstall'];

const benchmarkResults: BenchmarkResult[] = [];

async function benchmark(packageManager: string, category: string) {
  console.log(`Starting benchmark for ${packageManager} ${category}`);
  const startTime = Date.now();

  const command = `${packageManager} ${category}`;
  const result = spawnSync(command, { shell: true });

  const endTime = Date.now();
  const time = endTime - startTime;

  console.log(`Completed benchmark for ${packageManager} ${category} in ${time}ms`);
  benchmarkResults.push({ packageManager, category, time });
}

async function runBenchmarks() {
  for (const packageManager of packageManagers) {
    for (const category of categories) {
      await benchmark(packageManager, category);
    }
  }

  const canvas = createCanvas(1200, 800);
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

  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const colors: { [key: string]: string } = {
    npm: 'rgba(255, 0, 0, 0.8)',
    pnpm: 'rgba(0, 255, 0, 0.8)',
    yarn: 'rgba(0, 0, 255, 0.8)'
  };

  for (let i = 0; i < benchmarkResults.length; i++) {
    const result = benchmarkResults[i];
    const y = yOffset + (i % 3) * (barHeight + barSpacing) + Math.floor(i / 3) * (3 * (barHeight + barSpacing) + barSpacing);
    const barWidth = (result.time / maxTime) * chartWidth;

    ctx.fillStyle = colors[result.packageManager];
    ctx.fillRect(xOffset, y, barWidth, barHeight);

    ctx.fillStyle = 'black';
    ctx.fillText(result.packageManager, xOffset + barWidth + barSpacing, y);
    ctx.fillText(result.category, xOffset + barWidth + barSpacing, y + 16);
    ctx.fillText(`${result.time}ms`, xOffset + barWidth + barSpacing, y + 32);
  }

  const buffer = canvas.toBuffer('image/png');

  const currentDate = new Date().toISOString().split('T')[0];
  const resultsDir = path.join('.results', currentDate);
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const filePath = path.join(resultsDir, 'benchmark_results.png');
  fs.writeFileSync(filePath, buffer);
  console.log(`Benchmark results saved to ${filePath}`);
}

runBenchmarks().catch(error => console.error(error));

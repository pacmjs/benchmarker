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

  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  const barWidth = 50;
  const barSpacing = 20;
  const chartHeight = 400;
  const chartWidth = canvas.width - 2 * barSpacing;
  const xOffset = barSpacing;
  const yOffset = canvas.height - chartHeight - barSpacing;

  const maxTime = Math.max(...benchmarkResults.map(result => result.time));

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const colors: { [key: string]: string } = {
    npm: 'rgba(255, 0, 0, 0.8)',
    pnpm: 'rgba(0, 255, 0, 0.8)',
    yarn: 'rgba(0, 0, 255, 0.8)'
  };

  for (let i = 0; i < benchmarkResults.length; i++) {
    const result = benchmarkResults[i];
    const x = xOffset + (i % 3) * (barWidth + barSpacing) + Math.floor(i / 3) * (3 * (barWidth + barSpacing) + barSpacing);
    const barHeight = (result.time / maxTime) * chartHeight;

    ctx.fillStyle = colors[result.packageManager];
    ctx.fillRect(x, yOffset + chartHeight - barHeight, barWidth, barHeight);

    ctx.fillStyle = 'black';
    ctx.fillText(result.packageManager, x + barWidth / 2, yOffset + chartHeight + barSpacing);
    ctx.fillText(result.category, x + barWidth / 2, yOffset + chartHeight + barSpacing + 12);
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
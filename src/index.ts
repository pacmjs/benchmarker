import * as fs from "node:fs";
import { spawnSync } from "node:child_process";
import { createCanvas, loadImage, CanvasRenderingContext2D } from "canvas";
import * as path from "node:path";

interface BenchmarkResult {
    packageManager: string;
    category: string;
    time: number;
}

const packageManagers = ["npm", "pnpm", "yarn"];
const categories = [
    "install next",
    "install --save-dev next",
    "uninstall next",
];
const yarnCategories = ["add next", "add --dev next", "remove next"];
const containerDir = path.join(process.cwd(), "container");

const benchmarkResults: BenchmarkResult[] = [];

async function benchmark(packageManager: string, category: string) {
    console.log(`Starting benchmark for ${packageManager} ${category}`);

    const isUninstallCommand =
        category.includes("uninstall") || category.includes("remove");

    if (!isUninstallCommand && fs.existsSync(containerDir)) {
        fs.rmdirSync(containerDir, { recursive: true });
    }
    if (!isUninstallCommand) {
        fs.mkdirSync(containerDir);
        spawnSync("npm init -y", { shell: true, cwd: containerDir });
    }

    const startTime = Date.now();

    const command = `${packageManager} ${packageManager === "yarn" ? yarnCategories[categories.indexOf(category)].replace("next", "next@latest") : category.replace("next", "next@latest")}`;

    spawnSync(command, { shell: true, cwd: containerDir });

    const endTime = Date.now();
    const time = endTime - startTime;

    console.log(
        `Completed benchmark for ${packageManager} ${category} in ${time}ms`,
    );
    benchmarkResults.push({ packageManager, category, time });
}

async function runBenchmarks() {
    for (const packageManager of packageManagers) {
        for (const category of categories) {
            await benchmark(packageManager, category);
        }
    }

    const canvas = createCanvas(3840, 2160);
    const ctx = canvas.getContext("2d");

    function drawRoundedRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
    ) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius,
            y + height,
        );
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    ctx.fillStyle = "white";
    drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, 50);

    try {
        const background = await loadImage("assets/board.png");
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch (error) {
        console.error("Error loading background image:", error);
        return;
    }

    const now = new Date();
    const date = now.toLocaleDateString();
    ctx.fillStyle = "black";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(`${date}`, canvas.width - 260, 70);

    ctx.fillStyle = "black";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText("(lower = better)", canvas.width - 340, 125);

    const barHeight = 100;
    const barSpacing = 50;
    const chartWidth = canvas.width - 2 * barSpacing;
    const xOffset = barSpacing;
    const yOffset = barSpacing;

    const maxTime = Math.max(...benchmarkResults.map((result) => result.time));

    for (let i = 0; i < benchmarkResults.length; i++) {
        const result = benchmarkResults[i];
        const y = yOffset + 14 + i * (barHeight + barSpacing);

        ctx.fillStyle = "black";

        ctx.font = "bold 48px sans-serif";
        ctx.fillText(
            `${result.packageManager}`,
            xOffset - 10,
            y + barHeight / 2 + 200,
        );

        ctx.font = "bold 36px sans-serif";

        const categoryText = result.category.includes("--save-dev")
            ? result.category.replace("--save-dev", "--save-dev\n")
            : result.category;

        ctx.fillText(`${categoryText}`, xOffset - 10, y + barHeight / 2 + 250);
    }

    const maxBarWidth = chartWidth - 440;
    const cornerRadius = 20;

    for (let i = 0; i < benchmarkResults.length; i++) {
        const result = benchmarkResults[i];
        const y = yOffset + 240 + i * (barHeight + barSpacing);
        let width = (result.time / maxTime) * (maxBarWidth - 100);

        const gradient = ctx.createLinearGradient(
            xOffset + 360,
            y,
            xOffset + 360 + width,
            y,
        );
        if (benchmarkResults[i].packageManager === "npm") {
            gradient.addColorStop(0, "red");
            gradient.addColorStop(1, "darkred");
        } else if (benchmarkResults[i].packageManager === "pnpm") {
            gradient.addColorStop(0, "orange");
            gradient.addColorStop(1, "darkorange");
        } else {
            gradient.addColorStop(0, "blue");
            gradient.addColorStop(1, "darkblue");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(xOffset + 360, y);
        ctx.lineTo(xOffset + 360 + width - cornerRadius, y);
        ctx.arcTo(
            xOffset + 360 + width,
            y,
            xOffset + 360 + width,
            y + cornerRadius,
            cornerRadius,
        );
        ctx.lineTo(xOffset + 360 + width, y + barHeight - cornerRadius);
        ctx.arcTo(
            xOffset + 360 + width,
            y + barHeight,
            xOffset + 360 + width - cornerRadius,
            y + barHeight,
            cornerRadius,
        );
        ctx.lineTo(xOffset + 360, y + barHeight);
        ctx.closePath();
        ctx.fill();

        let timeText;
        if (result.time >= 1000) {
            timeText = `${(result.time / 1000).toFixed(2)} s`;
        } else {
            timeText = `${result.time} ms`;
        }

        ctx.fillStyle = "black";
        ctx.font = "bold 36px sans-serif";
        ctx.fillText(
            timeText,
            xOffset + 360 + width + 10,
            y + barHeight / 2 + 12,
        );
    }

    const buffer = canvas.toBuffer("image/png");

    const resultsBaseDir = "results";
    clearResultsDir(resultsBaseDir);

    const currentDate = new Date().toISOString().replace(/:/g, "-");
    const resultsDir = path.join(resultsBaseDir, currentDate);
    fs.mkdirSync(resultsDir, { recursive: true });

    const filePath = path.join(resultsDir, "benchmark_results.png");
    fs.writeFileSync(filePath, buffer);
    console.log(`Benchmark results saved to ${filePath}`);
}

runBenchmarks().catch((error) => console.error(error));

function clearResultsDir(resultsDir: string) {
    if (fs.existsSync(resultsDir)) {
        const files = fs.readdirSync(resultsDir);
        for (const file of files) {
            const filePath = path.join(resultsDir, file);
            if (fs.statSync(filePath).isDirectory()) {
                fs.rmdirSync(filePath, { recursive: true });
            }
        }
    }
}

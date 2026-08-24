import { watch } from "node:fs";
import { spawn } from "node:child_process";

const watchedDirectories = ["src", "tests"];
let running = false;
let rerunRequested = false;
let debounceTimer;

function runTests() {
    if (running) {
        rerunRequested = true;
        return;
    }

    running = true;
    const child =
        process.platform === "win32"
            ? spawn("cmd.exe", ["/d", "/s", "/c", "npm test"], {
                  stdio: "inherit",
              })
            : spawn("npm", ["test"], { stdio: "inherit" });

    child.on("exit", () => {
        running = false;
        if (rerunRequested) {
            rerunRequested = false;
            runTests();
        }
    });
}

function scheduleTests(_eventType, filename) {
    if (!filename?.endsWith(".ts")) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        console.log(`\nChange detected in ${filename}; rerunning tests...`);
        runTests();
    }, 100);
}

for (const directory of watchedDirectories) {
    watch(directory, { recursive: true }, scheduleTests);
}

console.log(`Watching ${watchedDirectories.join(" and ")} for TypeScript changes.`);
runTests();

import {
    startMarketEngine,
    stopMarketEngine
} from "./market-engine.js";

let isRunning = false;

export const startEngine = () => {
    if (isRunning) {
        return { status: "already_running" };
    }

    startMarketEngine();   // ▶ REAL START
    isRunning = true;

    return { status: "started" };
};

export const stopEngine = () => {
    if (!isRunning) {
        return { status: "already_stopped" };
    }

    stopMarketEngine();    // ⏹ REAL STOP (THIS WAS MISSING)
    isRunning = false;

    return { status: "stopped" };
};

export const engineStatus = () => {
    return {
        running: isRunning
    };
};

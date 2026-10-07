import Decimal from "decimal.js";
import { execute, getOne } from "../../core/db-helper.js";

import {
    lockWallet,
    getWallet,
    getOpenPositionsWithPnl,
    closeTrade,
    deletePortfolio,
    getUsersByAsset
} from "./risk.model.js";

import { calcPipDiff } from "../../utility/trading/calculations.utils.js";
import { calculatePnl } from "../../utility/trading/pnl.engine.js";
import { syncWalletSnapshot } from "../wallet.service.js";

/* =====================
   CONFIG
===================== */
const STOP_OUT_LEVEL = 50; // 50%
const ACTIVE_RISK_USERS = new Set();
const DEADLOCK_RETRY_LIMIT = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getAccountFunds(snapshot) {
    return new Decimal(snapshot?.balance ?? 0).plus(
        snapshot?.unrealizedPnl ?? 0
    );
}

function isDeadlockError(error) {
    return (
        error?.code === "ER_LOCK_DEADLOCK" ||
        error?.errno === 1213 ||
        /Deadlock found/i.test(error?.message || "")
    );
}

/* =====================
   RUN FOR ALL USERS OF ASSET
===================== */
export const runRiskEngineForAsset = async (assetId) => {
    /* 🔒 HARD BLOCK METALS AT ENTRY */
    const asset = await getOne(
        "SELECT type FROM assets WHERE id=?",
        [assetId]
    );

    if (!asset) return;

    if (asset.type === "gold" || asset.type === "silver") {
        // ❌ NEVER run risk engine for metals
        return;
    }

    const users = await getUsersByAsset(assetId);

    for (const u of users) {
        await runRiskEngineForUser(u.user_id);
    }
};

/* =====================
   CORE RISK ENGINE
===================== */
export const runRiskEngineForUser = async (userId) => {
    if (!userId || ACTIVE_RISK_USERS.has(userId)) {
        return;
    }

    ACTIVE_RISK_USERS.add(userId);

    try {
        for (let attempt = 0; attempt <= DEADLOCK_RETRY_LIMIT; attempt++) {
            try {
                await execute("START TRANSACTION");

                await lockWallet(userId);

                const wallet = await getWallet(userId);
                if (!wallet) {
                    await execute("COMMIT");
                    return;
                }

                let walletSnapshot = await syncWalletSnapshot(
                    userId,
                    wallet.balance
                );

                if (walletSnapshot.usedMargin.lte(0)) {
                    await execute("COMMIT");
                    return;
                }

                let positions = await getOpenPositionsWithPnl(userId);
                if (!positions.length) {
                    await execute("COMMIT");
                    return;
                }

                while (true) {
                    const accountFunds = getAccountFunds(walletSnapshot);
                    const equity = new Decimal(walletSnapshot.equity ?? 0);
                    const usedMargin = new Decimal(walletSnapshot.usedMargin ?? 0);
                    const marginLevel = usedMargin.gt(0)
                        ? equity.div(usedMargin).mul(100)
                        : new Decimal(Infinity);

                    const isBalanceExhausted = accountFunds.lte(0);
                    const isStopOut = usedMargin.gt(0) &&
                        marginLevel.lte(STOP_OUT_LEVEL);

                    if (!isBalanceExhausted && !isStopOut) break;

                    /* ===== FIND WORST POSITION ===== */
                    const worst = positions.sort(
                        (a, b) =>
                            new Decimal(a.unrealized_pnl)
                                .minus(b.unrealized_pnl)
                                .toNumber()
                    )[0];

                    /* ===== EXIT PRICE ===== */
                    const exitPrice = new Decimal(worst.current_price);

                    /* ===============================
                       ❌ SKIP PIP FOR METALS (CRITICAL)
                    ================================ */
                    let pipDiff = new Decimal(0);

                    if (worst.type !== "gold" && worst.type !== "silver") {
                        pipDiff = calcPipDiff(
                            new Decimal(worst.average_price),
                            exitPrice,
                            worst.side === "long" ? "buy" : "sell",
                            worst.type
                        );

                        // 🧯 SAFETY CLAMP
                        if (!pipDiff.isFinite()) pipDiff = new Decimal(0);
                        if (pipDiff.gt(100000)) pipDiff = new Decimal(100000);
                        if (pipDiff.lt(-100000)) pipDiff = new Decimal(-100000);
                    }

                    /* ===== REAL USD PNL ===== */
                    const pnlUsd = calculatePnl({
                        entryPrice: worst.average_price,
                        exitPrice: exitPrice,
                        quantity: worst.quantity,
                        side: worst.side
                    });

                    /* ===== CLOSE POSITION ===== */
                    await closeTrade(
                        worst.trade_id,
                        pnlUsd.toNumber(),
                        pipDiff.toNumber()
                    );

                    await deletePortfolio(worst.trade_id);

                    walletSnapshot = await syncWalletSnapshot(
                        userId,
                        walletSnapshot.balance.plus(pnlUsd)
                    );

                    /* ===== REFRESH POSITIONS ===== */
                    positions = await getOpenPositionsWithPnl(userId);
                    if (!positions.length) break;
                }

                await execute("COMMIT");
                return;
            } catch (e) {
                await execute("ROLLBACK");

                if (!isDeadlockError(e) || attempt === DEADLOCK_RETRY_LIMIT) {
                    throw e;
                }

                await sleep(75 * (attempt + 1));
            }
        }
    } catch (e) {
        console.error("❌ Risk Engine Error:", e.message);
    } finally {
        ACTIVE_RISK_USERS.delete(userId);
    }
};

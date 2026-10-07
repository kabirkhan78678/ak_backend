import Decimal from "decimal.js";
import { getWallet } from "../modules/user/payments/model.js";
import { syncWalletSnapshot } from "./wallet.service.js";

const STOP_OUT_LEVEL = 50; // %

const toDecimal = (value) => new Decimal(value ?? 0);

export const checkTradeBlock = async (userId) => {

    const wallet = await getWallet(userId);
    if (!wallet) throw new Error("Wallet not found");

    const walletSnapshot = await syncWalletSnapshot(userId, wallet.balance);
    if (!walletSnapshot) throw new Error("Wallet snapshot unavailable");

    const balance = toDecimal(walletSnapshot.balance);
    const usedMargin = toDecimal(walletSnapshot.usedMargin);
    const unrealizedPnl = toDecimal(walletSnapshot.unrealizedPnl);
    const accountFunds = balance.plus(unrealizedPnl);
    const availableFunds = Decimal.max(
        accountFunds.minus(usedMargin),
        0
    );

    if (accountFunds.lte(0)) {
        throw new Error("Trade blocked: Balance exhausted");
    }

    /* ===== EQUITY ===== */
    const equity =
        walletSnapshot.equity === undefined
            ? availableFunds
            : toDecimal(walletSnapshot.equity);

    if (equity.lte(0)) {
        throw new Error("Trade blocked: Equity exhausted");
    }

    /* ===== FREE MARGIN ===== */
    const freeMargin =
        walletSnapshot.freeMargin === undefined
            ? availableFunds
            : toDecimal(walletSnapshot.freeMargin);

    /* ===== MARGIN LEVEL ===== */
    if (usedMargin.gt(0)) {
        const marginLevel = equity.div(usedMargin).mul(100);
        if (marginLevel.lt(STOP_OUT_LEVEL)) {
            throw new Error("Trade blocked: Margin level too low");
        }
    }

    return {
        ...walletSnapshot,
        balance,
        usedMargin,
        freeMargin,
        unrealizedPnl,
        equity,
    };
};

import { patch } from "@web/core/utils/patch";
import { OrderSummary } from "@point_of_sale/app/screens/product_screen/order_summary/order_summary";

const QTY_EPSILON = 1e-6;

patch(OrderSummary.prototype, {
    updateSelectedOrderline(args) {
        if (!this._posQtyIncreaseRequested(args?.buffer)) {
            return super.updateSelectedOrderline(...arguments);
        }
        const run = () => this._posUpdateSelectedOrderline(args);
        this._posQtyQueue = (this._posQtyQueue || Promise.resolve()).then(run, run);
        return this._posQtyQueue;
    },

    async _posUpdateSelectedOrderline(args) {
        const blocked = await this._posQtyWouldGoNegative(args?.buffer);
        if (blocked) {
            this.numberBuffer.reset();
            return;
        }
        if (
            args?.buffer != null &&
            args.buffer !== "remove" &&
            String(this.numberBuffer.get()) !== String(args.buffer)
        ) {
            return;
        }
        return super.updateSelectedOrderline(args);
    },

    async updateQuantityNumber(newQuantity) {
        if (await this._posQtyWouldGoNegative(newQuantity, false)) {
            return false;
        }
        return super.updateQuantityNumber(...arguments);
    },

    _posQtyIncreaseRequested(rawQty) {
        if (!this.pos.config.restrict_negative_sale || this.pos.numpadMode !== "quantity") {
            return false;
        }
        const newQty = typeof rawQty === "number" ? rawQty : parseFloat(rawQty);
        if (Number.isNaN(newQty)) {
            return false;
        }
        let line = this.pos.getOrder()?.getSelectedOrderline();
        if (!line) {
            return false;
        }
        if (line.combo_parent_id) {
            line = line.combo_parent_id;
        }
        return newQty > line.qty + QTY_EPSILON;
    },

    async _posQtyWouldGoNegative(rawQty, requireQuantityMode = true) {
        if (!this.pos.config.restrict_negative_sale) {
            return false;
        }
        if (requireQuantityMode && this.pos.numpadMode !== "quantity") {
            return false;
        }
        if (rawQty === null || rawQty === undefined || rawQty === "" || rawQty === "remove") {
            return false;
        }
        const newQty = typeof rawQty === "number" ? rawQty : parseFloat(rawQty);
        if (Number.isNaN(newQty)) {
            return false;
        }
        let line = this.pos.getOrder()?.getSelectedOrderline();
        if (!line) {
            return false;
        }
        if (line.combo_parent_id) {
            line = line.combo_parent_id;
        }
        if (newQty <= line.qty + QTY_EPSILON) {
            return false;
        }
        return !(await this.pos.posCanSetLineQty(line, newQty));
    },
});

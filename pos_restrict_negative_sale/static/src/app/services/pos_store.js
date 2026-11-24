import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { OutOfStockPopup } from "@pos_restrict_negative_sale/app/components/popups/out_of_stock_popup/out_of_stock_popup";

const QTY_EPSILON = 1e-6;

patch(PosStore.prototype, {
    async setup() {
        const result = await super.setup(...arguments);
        this._wrapConfigurableStockCheck();
        return result;
    },

    async addLineToOrder(vals, order, opts = {}, configure = true) {
        if (!this.config.restrict_negative_sale) {
            return super.addLineToOrder(...arguments);
        }
        return this._posWithStockLock(() => super.addLineToOrder(vals, order, opts, configure));
    },

    async handleOrderLineConfiguration(order, values, code, vals, options, configure) {
        if (!(await this._posAllowNewLine(order, values))) {
            return false;
        }
        return super.handleOrderLineConfiguration(...arguments);
    },

    async handleComboProduct(values, order, configure = true, opts = {}) {
        const result = await super.handleComboProduct(...arguments);
        if (result === false || !opts.line || !values.combo_line_ids?.length) {
            return result;
        }
        const allowed = await this._posAllowComboEdit(opts.line, values);
        return allowed ? result : false;
    },

    _wrapConfigurableStockCheck() {
        if (this._posStockWrapped || typeof this.handleConfigurableProduct !== "function") {
            return;
        }
        const original = this.handleConfigurableProduct;
        this.handleConfigurableProduct = async (values, productTemplate, opts = {}, configure = true) => {
            const allowed = await original.call(
                this,
                values,
                productTemplate,
                opts,
                configure
            );
            if (allowed === false || !opts.line || !this.config.restrict_negative_sale) {
                return allowed;
            }
            const product = values.product_id || opts.line.product_id;
            const qty = values.qty || opts.line.qty;
            const replacement = product?.id !== opts.line.product_id?.id ? product : null;
            if (!replacement && qty <= opts.line.qty + QTY_EPSILON) {
                return allowed;
            }
            const ok = await this._posWithStockLock(
                () => this._posCanSetLineQty(opts.line, qty, replacement),
                true
            );
            return ok ? allowed : false;
        };
        this._posStockWrapped = true;
    },

    posCanSetLineQty(line, targetQty, replacementProduct = null) {
        return this._posWithStockLock(() =>
            this._posCanSetLineQty(line, targetQty, replacementProduct)
        );
    },

    async _posCanSetLineQty(line, targetQty, replacementProduct = null) {
        if (!this.config.restrict_negative_sale || !line) {
            return true;
        }
        if (line.order_id?.isRefund || line.refunded_orderline_id || targetQty < 0) {
            return true;
        }
        const checks = [];
        if (replacementProduct) {
            checks.push({ product: replacementProduct, qty: targetQty, exclude: null });
        } else if (line.combo_line_ids?.length) {
            const ratio = targetQty / (line.qty || 1);
            for (const child of line.combo_line_ids) {
                checks.push({
                    product: child.product_id,
                    qty: child.qty * ratio,
                    exclude: child,
                });
            }
        } else {
            checks.push({ product: line.product_id, qty: targetQty, exclude: line });
        }
        const tracked = checks.filter(
            (check) => this._posTracksStock(check.product) && check.qty > 0
        );
        if (!tracked.length) {
            return true;
        }
        const increasing = tracked.some((check) => {
            const current = check.exclude?.qty || 0;
            return check.qty > current + QTY_EPSILON;
        });
        if (!increasing && !replacementProduct) {
            return true;
        }
        return this._posRejectIfShort(tracked);
    },

    /**
     * Run stock checks one at a time.
     * A check that is already inside another check (the variant popup during
     * an add) must keep going. A second tap must wait until the first line exists.
     */
    async _posWithStockLock(task, reentrant = false) {
        if (reentrant && this._posStockLockHeld) {
            return task();
        }
        const previous = this._posStockChain || Promise.resolve();
        let release;
        const done = new Promise((resolve) => {
            release = resolve;
        });
        this._posStockChain = done;
        try {
            await previous.catch(() => {});
            this._posStockLockHeld = true;
            return await task();
        } finally {
            this._posStockLockHeld = false;
            release();
        }
    },

    async _posAllowNewLine(order, values) {
        if (!this.config.restrict_negative_sale) {
            return true;
        }
        if (order?.isRefund || order?.is_refund || (values.qty || 0) < 0) {
            return true;
        }
        const requests = this._posStockRequests(values);
        if (!requests.length) {
            return true;
        }
        const checks = requests.map((request) => ({
            product: request.product,
            qty: request.qty,
            exclude: null,
        }));
        return this._posRejectIfShort(checks);
    },

    async _posAllowComboEdit(line, values) {
        if (!this.config.restrict_negative_sale) {
            return true;
        }
        const currentByProduct = new Map();
        for (const child of line.combo_line_ids || []) {
            if (!child.product_id) {
                continue;
            }
            currentByProduct.set(
                child.product_id.id,
                (currentByProduct.get(child.product_id.id) || 0) + child.qty
            );
        }
        const checks = [];
        for (const request of this._posStockRequests(values)) {
            const current = currentByProduct.get(request.product.id) || 0;
            if (request.qty <= current + QTY_EPSILON) {
                continue;
            }
            checks.push({
                product: request.product,
                qty: request.qty,
                excludeQty: current,
            });
        }
        if (!checks.length) {
            return true;
        }
        return this._posWithStockLock(() => this._posRejectIfShort(checks), true);
    },

    async _posRejectIfShort(checks) {
        const qtyMap = await this._posFetchFreeQty(checks.map((check) => check.product.id));
        if (!qtyMap) {
            return true;
        }
        for (const check of checks) {
            const free = this._posReadQty(qtyMap, check.product.id);
            const already =
                check.excludeQty !== undefined
                    ? this._posDraftQty(check.product.id) - check.excludeQty
                    : this._posDraftQty(check.product.id, check.exclude);
            const remaining = free - already;
            if (check.qty > remaining + QTY_EPSILON) {
                this._posShowOutOfStock(check.product, free, Math.max(already, 0), check.qty);
                return false;
            }
        }
        return true;
    },

    _posStockRequests(values) {
        const grouped = new Map();
        const add = (product, qty) => {
            if (!this._posTracksStock(product) || !(qty > 0)) {
                return;
            }
            const current = grouped.get(product.id);
            if (current) {
                current.qty += qty;
            } else {
                grouped.set(product.id, { product, qty });
            }
        };
        const combo = values.combo_line_ids || [];
        if (combo.length) {
            for (const command of combo) {
                const data = Array.isArray(command) ? command[1] : command;
                if (data) {
                    add(data.product_id, data.qty || 0);
                }
            }
        } else {
            add(values.product_id, values.qty || 1);
        }
        return [...grouped.values()];
    },

    _posTracksStock(product) {
        if (!product) {
            return false;
        }
        if (product.is_storable || product.product_tmpl_id?.is_storable) {
            return true;
        }
        const type = product.type || product.product_tmpl_id?.type;
        return type === "product";
    },

    _posDraftQty(productId, excludeLine = null) {
        let qty = 0;
        for (const order of this.models["pos.order"].getAll()) {
            if (order.finalized || order.state !== "draft" || order.isRefund) {
                continue;
            }
            for (const line of order.lines || []) {
                if (excludeLine && line === excludeLine) {
                    continue;
                }
                if (line.refunded_orderline_id || line.combo_line_ids?.length) {
                    continue;
                }
                if (line.product_id?.id !== productId || !(line.qty > 0)) {
                    continue;
                }
                qty += line.qty;
            }
        }
        return qty;
    },

    async _posFetchFreeQty(productIds) {
        const ids = [...new Set(productIds.filter(Boolean))];
        if (!ids.length) {
            return {};
        }
        try {
            const result = await this.data.call("product.product", "get_pos_free_qty", [
                ids,
                this.config.id,
            ]);
            for (const id of ids) {
                const product = this.models["product.product"].get(id);
                const qty = this._posReadQty(result || {}, id);
                if (product && result && (id in result || String(id) in result)) {
                    product.pos_free_qty = qty;
                }
            }
            return result || {};
        } catch {
            const fallback = {};
            let found = false;
            for (const id of ids) {
                const product = this.models["product.product"].get(id);
                if (product && product.pos_free_qty !== undefined) {
                    fallback[id] = product.pos_free_qty;
                    found = true;
                }
            }
            return found ? fallback : null;
        }
    },

    _posReadQty(qtyMap, productId) {
        if (!qtyMap) {
            return 0;
        }
        if (productId in qtyMap) {
            return Number(qtyMap[productId]) || 0;
        }
        const key = String(productId);
        if (key in qtyMap) {
            return Number(qtyMap[key]) || 0;
        }
        return 0;
    },

    _posShowOutOfStock(product, freeQty, onTicket, requested) {
        if (this._posOosOpen) {
            return;
        }
        this._posOosOpen = true;
        this.dialog.add(
            OutOfStockPopup,
            {
                product,
                freeQty,
                onTicket,
                requested,
            },
            {
                onClose: () => {
                    this._posOosOpen = false;
                },
            }
        );
    },
});

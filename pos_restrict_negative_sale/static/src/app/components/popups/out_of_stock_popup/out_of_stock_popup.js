import { Component, useProps, t } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";
import { usePos } from "@point_of_sale/app/hooks/pos_hook";

export class OutOfStockPopup extends Component {
    static template = "pos_restrict_negative_sale.OutOfStockPopup";
    static components = { Dialog };
    props = useProps({
        product: t.object(),
        freeQty: t.number(),
        onTicket: t.number(),
        requested: t.number(),
        close: t.function(),
    });

    setup() {
        this.pos = usePos();
    }

    get outOfStock() {
        return this.props.freeQty <= 1e-6;
    }

    get showOnTicket() {
        return this.props.onTicket > 1e-6;
    }

    get title() {
        return this.outOfStock ? _t("Out of stock") : _t("Not enough stock");
    }

    get lead() {
        return this.outOfStock
            ? _t("This product cannot be added to the order.")
            : _t("This quantity would take the shop below zero.");
    }

    get detail() {
        if (this.outOfStock) {
            return _t("There is no quantity left in this shop.");
        }
        const left = Math.max(this.props.freeQty - this.props.onTicket, 0);
        return _t("Only %s is still available to sell.", this.formatQty(left));
    }

    get productName() {
        return this.props.product.display_name || this.props.product.name || _t("Product");
    }

    get uomName() {
        return (
            this.props.product.product_tmpl_id?.uom_id?.name ||
            this.props.product.uom_id?.name ||
            ""
        );
    }

    get imageUrl() {
        return this.props.product.getImageUrl?.() || "";
    }

    get initial() {
        return (this.productName || "?").trim().charAt(0).toUpperCase();
    }

    formatQty(value) {
        const digits =
            this.pos.models["decimal.precision"].find((dp) => dp.name === "Product Unit")?.digits ??
            2;
        const number = Number(value || 0);
        if (Number.isNaN(number)) {
            return "0";
        }
        return String(parseFloat(number.toFixed(digits)));
    }

    qtyLabel(value) {
        const qty = this.formatQty(value);
        return this.uomName ? `${qty} ${this.uomName}` : qty;
    }

    confirm() {
        this.props.close();
    }
}

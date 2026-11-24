import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { patch } from "@web/core/utils/patch";
import { eyeSummary } from "@pos_vision_lens/app/utils/vision_prescription";

patch(PosOrderline.prototype, {
    get isVisionLens() {
        return Boolean(this.product_id?.product_tmpl_id?.is_vision_lens);
    },

    get visionSummary() {
        if (!this.isVisionLens) {
            return "";
        }
        const parts = [];
        const right = eyeSummary(
            this.vision_right_sph,
            this.vision_right_cyl,
            this.vision_right_axis,
            this.vision_right_va
        );
        const left = eyeSummary(
            this.vision_left_sph,
            this.vision_left_cyl,
            this.vision_left_axis,
            this.vision_left_va
        );
        if (right) {
            parts.push(`R ${right}`);
        }
        if (left) {
            parts.push(`L ${left}`);
        }
        return parts.join(" · ");
    },

    canBeMergedWith(orderline) {
        if (this.isVisionLens || orderline.isVisionLens) {
            return false;
        }
        return super.canBeMergedWith(...arguments);
    },
});

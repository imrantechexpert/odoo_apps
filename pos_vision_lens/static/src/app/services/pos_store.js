import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { makeAwaitable } from "@point_of_sale/app/utils/make_awaitable_dialog";
import { VisionPrescriptionPopup } from "@pos_vision_lens/app/components/popups/vision_prescription_popup/vision_prescription_popup";
import {
    blankPrescription,
    prescriptionFromLine,
    prescriptionToLineValues,
} from "@pos_vision_lens/app/utils/vision_prescription";

patch(PosStore.prototype, {
    async handleOrderLineConfiguration(order, values, code, vals, options, configure) {
        const extra = await super.handleOrderLineConfiguration(...arguments);
        if (extra === false) {
            return false;
        }
        const template = values.product_tmpl_id;
        if (configure && template?.is_vision_lens) {
            const payload = await this.askVisionPrescription(
                template.display_name || template.name,
                blankPrescription()
            );
            if (payload) {
                Object.assign(values, payload);
            }
        }
        return extra;
    },

    async editVisionPrescription(line) {
        const payload = await this.askVisionPrescription(
            line.full_product_name || line.product_id?.display_name || _t("Vision prescription"),
            prescriptionFromLine(line)
        );
        if (payload) {
            line.update(payload);
        }
        return payload;
    },

    async askVisionPrescription(title, prescription) {
        const payload = await makeAwaitable(this.dialog, VisionPrescriptionPopup, {
            title: title || _t("Vision prescription"),
            prescription,
        });
        return payload ? prescriptionToLineValues(payload) : null;
    },
});

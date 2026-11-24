import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { patch } from "@web/core/utils/patch";

patch(ControlButtons.prototype, {
    get visionLensLine() {
        const line = this.pos.getOrder()?.getSelectedOrderline();
        return line?.isVisionLens ? line : null;
    },

    async openVisionPrescription() {
        const line = this.visionLensLine;
        if (line) {
            await this.pos.editVisionPrescription(line);
        }
    },
});

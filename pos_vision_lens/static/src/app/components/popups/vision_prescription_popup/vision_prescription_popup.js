import { Component, onMounted, proxy, signal, toRaw, useProps, t } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { usePos } from "@point_of_sale/app/hooks/pos_hook";
import { signatureContent } from "@pos_vision_lens/app/utils/vision_prescription";

export class VisionPrescriptionPopup extends Component {
    static template = "pos_vision_lens.VisionPrescriptionPopup";
    static components = { Dialog };
    props = useProps({
        title: t.string().optional(_t("Vision prescription")),
        prescription: t.object(),
        getPayload: t.function(),
        close: t.function(),
    });

    signatureRef = signal.ref();

    setup() {
        this.pos = usePos();
        this.notification = useService("notification");
        const prescription = { ...this.props.prescription };
        prescription.vision_signature = signatureContent(prescription.vision_signature);
        this.initialSignature = prescription.vision_signature || false;
        this.state = proxy(prescription);
        this.drawing = false;
        this.hasStroke = false;
        this.cleared = false;
        this.canvasToken = 0;
        onMounted(() => this._prepareCanvas());
    }

    valuesFor(type, current) {
        const model = this.pos.models["pos.vision.value"];
        const records = model ? model.readAll().filter((value) => value.value_type === type) : [];
        const sorted = records.sort((left, right) => {
            if (type === "va") {
                return (left.sequence || 0) - (right.sequence || 0) || left.name.localeCompare(right.name);
            }
            const leftNumber = Number(left.name);
            const rightNumber = Number(right.name);
            const leftRank = Number.isFinite(leftNumber) ? leftNumber : Number.POSITIVE_INFINITY;
            const rightRank = Number.isFinite(rightNumber) ? rightNumber : Number.POSITIVE_INFINITY;
            return leftRank - rightRank || (left.sequence || 0) - (right.sequence || 0);
        });
        if (current && !sorted.some((value) => value.name === current)) {
            return [{ id: `current-${type}-${current}`, name: current }, ...sorted];
        }
        return sorted;
    }

    stepValue(field, direction) {
        const type = field.includes("_sph") ? "sph" : "cyl";
        const options = this.valuesFor(type).map((value) => value.name);
        if (!options.length) {
            return;
        }
        const current = this.state[field];
        let index = options.indexOf(current);
        if (index === -1) {
            const zero = options.findIndex((name) => Number(name) === 0);
            index = zero === -1 ? (direction > 0 ? -1 : options.length) : zero;
        }
        const next = options[index + direction];
        if (next) {
            this.state[field] = next;
        }
    }

    cylinderNeedsAxis(value) {
        const text = String(value || "").trim();
        if (!text) {
            return false;
        }
        const number = Number(text);
        return !Number.isFinite(number) || number !== 0;
    }

    axisMissing(side) {
        return this.cylinderNeedsAxis(this.state[`vision_${side}_cyl`]) && !String(this.state[`vision_${side}_axis`] || "").trim();
    }

    missingAxisSides() {
        const missing = [];
        if (this.cylinderNeedsAxis(this.state.vision_right_cyl) && !String(this.state.vision_right_axis || "").trim()) {
            missing.push(_t("right eye"));
        }
        if (this.cylinderNeedsAxis(this.state.vision_left_cyl) && !String(this.state.vision_left_axis || "").trim()) {
            missing.push(_t("left eye"));
        }
        return missing;
    }

    confirm() {
        const missing = this.missingAxisSides();
        if (missing.length) {
            this.notification.add(
                _t("Enter the axis for the %s. A cylinder needs an axis.", missing.join(_t(" and the "))),
                { type: "danger" }
            );
            return;
        }
        let signature = this.initialSignature;
        if (this.cleared && !this.hasStroke) {
            signature = false;
        } else if (this.hasStroke) {
            const canvas = this.signatureRef();
            signature = canvas ? canvas.toDataURL("image/png").split(",")[1] : signature;
        }
        this.props.getPayload({
            ...toRaw(this.state),
            vision_signature: signature,
        });
        this.props.close();
    }

    close() {
        this.props.close();
    }

    clearSignature() {
        this.cleared = true;
        this.hasStroke = false;
        this._prepareCanvas(0, false);
    }

    onPointerDown(ev) {
        const canvas = this.signatureRef();
        if (!canvas) {
            return;
        }
        canvas.setPointerCapture(ev.pointerId);
        this.drawing = true;
        this.hasStroke = true;
        const ctx = canvas.getContext("2d");
        const point = this._point(ev, canvas);
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
    }

    onPointerMove(ev) {
        if (!this.drawing) {
            return;
        }
        const canvas = this.signatureRef();
        const ctx = canvas.getContext("2d");
        const point = this._point(ev, canvas);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
    }

    onPointerUp() {
        this.drawing = false;
    }

    _point(ev, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: ev.clientX - rect.left,
            y: ev.clientY - rect.top,
        };
    }

    _prepareCanvas(attempt = 0, drawExisting = true) {
        const canvas = this.signatureRef();
        if (!canvas) {
            return;
        }
        const token = ++this.canvasToken;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if ((!width || !height) && attempt < 8) {
            requestAnimationFrame(() => this._prepareCanvas(attempt + 1, drawExisting));
            return;
        }
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.max(width, 1) * ratio;
        canvas.height = Math.max(height, 1) * ratio;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#16324f";
        const signature = drawExisting ? this.initialSignature : false;
        if (!signature) {
            return;
        }
        const image = new Image();
        image.onload = () => {
            if (token !== this.canvasToken || this.hasStroke) {
                return;
            }
            ctx.drawImage(image, 0, 0, width, height);
        };
        image.src = `data:image/png;base64,${signature}`;
    }
}

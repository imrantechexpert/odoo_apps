const EYE_SIDES = ["right", "left"];
const EYE_KEYS = ["sph", "cyl", "axis", "va"];

export const VISION_TEXT_FIELDS = [
    "vision_right_sph",
    "vision_right_cyl",
    "vision_right_axis",
    "vision_right_va",
    "vision_left_sph",
    "vision_left_cyl",
    "vision_left_axis",
    "vision_left_va",
    "vision_advise",
];

function textValue(value) {
    return value ? String(value) : "";
}

export function blankPrescription() {
    const prescription = {
        vision_advise: "",
        vision_signature: false,
    };
    for (const side of EYE_SIDES) {
        for (const key of EYE_KEYS) {
            prescription[`vision_${side}_${key}`] = "";
        }
    }
    return prescription;
}

export function signatureContent(value) {
    if (!value) {
        return false;
    }
    let content = value;
    if (typeof value === "object") {
        content = value.content || "";
    }
    if (typeof content !== "string" || !content) {
        return false;
    }
    const marker = "base64,";
    const index = content.indexOf(marker);
    return index === -1 ? content : content.slice(index + marker.length);
}

export function prescriptionFromLine(line) {
    const prescription = blankPrescription();
    for (const field of VISION_TEXT_FIELDS) {
        prescription[field] = textValue(line[field]);
    }
    prescription.vision_signature = signatureContent(line.vision_signature);
    return prescription;
}

export function prescriptionToLineValues(prescription) {
    const values = {};
    for (const field of VISION_TEXT_FIELDS) {
        const raw = prescription[field];
        const text = typeof raw === "string" ? raw.trim() : raw;
        values[field] = text || false;
    }
    values.vision_signature = prescription.vision_signature || false;
    return values;
}

export function eyeSummary(sph, cyl, axis, va) {
    return [sph, cyl, axis, va].filter(Boolean).join(" / ");
}

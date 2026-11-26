# POS Vision Lens

Eye prescriptions on the Odoo 20 Point of Sale, for optical shops.

Sell a lens and a card opens: right eye, left eye, advise, and a signature. The card is saved on that order line.

Keywords: optic, optics, glasses, vision, pos, eye, clinic, prescription.

## What the shop gets

- A **Vision Lens** tick on the product. Only those products open the card.
- Separate boxes for the right eye and the left eye.
- **SPH** from -20.00 to +20.00, step 0.25, with minus and plus buttons.
- **CYL** from -6.00 to +6.00, step 0.25, with the same buttons.
- **V.A.** choices: 6/6, 6/9, 6/12, 6/18, 6/24, 6/36, 6/60, CF, HM.
- **AXIS** typed by the cashier. **Advise** as a note. A signature drawn on screen.
- The lists live in **Point of Sale → Configuration → Prescription Values**. Add or delete a value there. Reopen the POS session afterwards.
- The prescription on the POS order, including a Prescriptions page.
- A short receipt: logo, shop name, address, phone, order, date, customer, product lines, thank-you line.

Each lens line keeps its own card. Two lenses on one ticket do not share one prescription.

## Install

1. Copy the `pos_vision_lens` folder into your addons path.
2. Update the apps list.
3. Install **POS Vision Lens**.
4. Close the POS session and open it again.

Requires Odoo 20 and the Point of Sale app.

## Daily use

1. On the lens product, tick **Vision Lens**.
2. In the POS, add that product. The card opens.
3. Choose SPH, CYL, and V.A. Type the axis. Sign if you need to. Press **Apply**.
4. The line shows a short summary. **Prescription** opens the card again.
5. After payment, open the POS order in the backend. The Prescriptions page shows the card.

## Change a power or a V.A. value

**Point of Sale → Configuration → Prescription Values** is limited to POS managers.

- Add a row. Set the type (SPH, CYL, or V.A.) and the label, for example `+20.25`.
- Delete a row to stop offering it.
- Reopen the POS so the cashiers see the change.

Orders already saved keep the old value.

## Before you publish on the Odoo App Store

Do this in the module, then zip **only** the `pos_vision_lens` folder. `__manifest__.py` must be at the top of the zip. Leave out `__pycache__`.

Replace these in `__manifest__.py` with your real details:

- `author`
- `website`

Then add the pictures below into `static/description/`. The store page already points at these file names. Use PNG.

| File | What to capture | Size |
| --- | --- | --- |
| `icon.png` | Square Dynasol Technologies logo on a white background. | 256 × 256 |
| `banner.gif` | Wide cover. Module name and one short line, on a clean background. | about 1000 × 500 |
| `pos_card.png` | The POS card with both eyes filled in, including the minus and plus buttons. | about 1200 px wide |
| `prescription_values.png` | Prescription Values, grouped by type, showing SPH, CYL, and V.A. | about 1200 px wide |
| `backend_order.png` | A POS order open on the Prescriptions page. | about 1200 px wide |
| `receipt.png` | A printed or previewed receipt: logo, shop, customer, products, thank-you line. | about 600 px wide |

Take these from your own Odoo. Crop out other browser tabs. Use a demo company name if the shop name on the receipt should not be public.

On [apps.odoo.com](https://apps.odoo.com) create a publisher account, upload the zip, choose series **20.0**, and set the price there. The license in the module is **LGPL-3**. Buyers who download it can read and share the source. If you need a different license, change it before the first upload.

The page customers read is `static/description/index.html`.

# POS Restrict Negative Sale

Stop a Point of Sale ticket from selling stock you do not have. Odoo 20.

When the cashier taps a product, or confirms one of its variants, the shop’s free quantity is checked. If nothing is left, a window opens and the line is not added. The same window opens if the quantity on the line would pass what is left.

Services and products that do not track inventory are not blocked. A refund is not blocked.

## Install

1. Copy `pos_restrict_negative_sale` into your addons path, or clone this repository and add it to `addons_path`.
2. Update the apps list.
3. Install **POS Restrict Negative Sale**.
4. Refresh the Point of Sale. If a session is already open, reload that screen so it picks up the module.

The module needs Point of Sale with inventory (`pos_stock`, installed with Inventory).

## Turn it on

It is on for every Point of Sale as soon as the module is installed.

To switch it off for one shop:

**Point of Sale → Configuration → Settings → Product & PoS categories → Block out-of-stock sales**

The same tick is on the Point of Sale form, Configuration page.

Reload the POS screen after you change it.

## What the cashier sees

- Tapping a product with no quantity left opens the out-of-stock window. The product stays off the ticket.
- Choosing a variant checks that variant, not the whole template. One size can be sold while another size is blocked.
- Typing a higher quantity, or scanning the product again, is blocked when the extra units are not in stock.
- The window shows the product, the quantity in stock, what is already on the open tickets of this screen, and what was just requested.
- The quantity used is the free quantity in the stock location of this Point of Sale (the source location of its operation type).

Payment is checked again on the server. Two shops cannot both take the last unit: the second payment is refused.

## What is not blocked

- Services, and goods that do not track inventory.
- Refunds, and a negative quantity on a line.
- A sale made while the browser is offline and this screen has never loaded that product’s quantity. The payment is still refused once the order reaches the server and the stock is not there.

## Before you publish on the Odoo Apps store

The module icon and the wide banner are already in `static/description/`. Replace the popup picture with a real capture from your database. Reviewers expect a screenshot of the running screen, not a drawing.

Take these pictures after you have tested the module. Save them as PNG files in `static/description/` and use these names:

| File | What to capture |
| --- | --- |
| `popup.png` | The Point of Sale with the out-of-stock window open on a product whose on-hand quantity is 0. Include the product name. This file is already referenced in `static/description/index.html`. A stand-in picture is there now. Replace it. |
| `variant.png` | The variant choices, then the out-of-stock window for a variant that has no stock while another variant still has stock. Add an `<img>` for it in `index.html` once you have the file. |
| `settings.png` | Point of Sale settings, with **Block out-of-stock sales** visible. Add an `<img>` for it in `index.html` once you have the file. |

Suggested App Store summary:

> Block Point of Sale sales when a product or variant has no stock left. The cashier gets a clear window, and the line is not added.

Suggested price category: a small inventory control app for Odoo 20 Point of Sale.

The license in the manifest is LGPL-3, the same as the other shop modules in this project. Change it before publishing if this app is meant to be sold under the Odoo Proprietary License.

## Try it

1. Create a storable product, available in the Point of Sale, with on-hand quantity 0 in the shop’s stock location.
2. Open the Point of Sale and tap that product. The window opens. The ticket does not change.
3. Set the on-hand quantity to 1. Tap the product once. The line is added. Tap it again. The window opens.
4. On a product with variants, put stock on one variant only. Sell the variant that has stock. The empty variant opens the window.
5. Put quantity 2 on hand, add 1, then type 5 on the line. The window opens and the quantity stays 1.
6. Refund the product. The refund is allowed.

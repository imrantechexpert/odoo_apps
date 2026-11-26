{
    'name': 'POS Restrict Negative Sale',
    'version': '20.0.1.0.3',
    'category': 'Sales/Point of Sale',
    'summary': 'Block POS negative stock, out of stock, and oversell on product variants and inventory',
    'description': """
Stop a Point of Sale sale from driving stock below zero.
When a cashier adds a product, or one of its variants, and the shop
has nothing left to sell, an out-of-stock window opens and the line
is not added. Raising the quantity past what is left is blocked too.

Restrict a negative sale on the POS. Block zero stock, low stock, and
insufficient on-hand quantity in the shop warehouse. Inventory, barcode,
and variant checks stop overselling.
Keywords: pos, point of sale, restrict, negative, negative sale, negative stock, out of stock, stock, inventory, warehouse, quantity, qty, variant, product, block, prevent, oversell, overselling, zero stock, available, on hand, barcode, shop, cashier.
    """,
    'author': 'Dynasol Technologies',
    'website': 'https://dynasol.pk',
    'license': 'LGPL-3',
    'images': [
        'static/description/banner.gif',
        'static/description/popup.png',
    ],
    'depends': ['pos_stock'],
    'data': [
        'views/res_config_settings_views.xml',
        'views/pos_config_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_restrict_negative_sale/static/src/app/**/*',
        ],
    },
    'installable': True,
    'application': False,
}

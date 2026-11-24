{
    'name': 'POS Restrict Negative Sale',
    'version': '20.0.1.0.0',
    'category': 'Sales/Point of Sale',
    'summary': 'Block Point of Sale lines when the product or variant is out of stock',
    'description': """
Stop a Point of Sale sale from driving stock below zero.
When a cashier adds a product, or one of its variants, and the shop
has nothing left to sell, an out-of-stock window opens and the line
is not added. Raising the quantity past what is left is blocked too.
    """,
    'author': 'Dynasol Technologies',
    'website': 'https://dynasol.pk',
    'license': 'LGPL-3',
    'images': [
        'static/description/banner.png',
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
